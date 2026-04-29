// pages/api/send-invoice.js
export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON body' }) }
    }

    const { invoice, recipientEmail, recipientName, scheduledFor } = body || {}
    if (!invoice)        return res.status(400).json({ error: 'Missing invoice data' })
    if (!recipientEmail) return res.status(400).json({ error: 'Missing recipient email' })

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not set in Vercel environment variables.' })

    // SCHEDULED — save to Turso for cron to send later
    if (scheduledFor) {
      const { insertScheduledEmail } = await import('../../lib/db.js')
      await insertScheduledEmail({
        invoice_id:       invoice.id || null,
        recipient_email:  recipientEmail,
        recipient_name:   recipientName || '',
        scheduled_for:    scheduledFor,
        invoice_snapshot: invoice,
      })
      return res.status(200).json({ success: true, scheduled: true })
    }

    // BUILD PRINT LINK
    const appUrl = 'https://mrm-print.vercel.app'
    const printUrl = `${appUrl}/invoice/${invoice.id}`

    // SEND EMAIL NOW
    const fromDomain  = process.env.EMAIL_DOMAIN || 'resend.dev'
    const fromAddress = fromDomain === 'resend.dev' ? 'onboarding@resend.dev' : `info@${fromDomain}`
    const invLabel    = invoice.num ? `#${invoice.num}` : ''
    const svcLabel    = (invoice.sf || invoice.st)
      ? ` \u2014 For ${invoice.sf ? fmtDate(invoice.sf) : ''}${invoice.st ? '\u2013' + fmtDate(invoice.st) : ''}`
      : ''
    const subject = `Invoice ${invLabel} from MRM Web Solutions${svcLabel}`.trim()

    let resendResponse, resendData
    try {
      resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:     `MRM Web Solutions <${fromAddress}>`,
          to:       [recipientEmail],
          cc:       ['rkumar@mrmwebsolutions.com'],
          subject,
          html:     buildEmailHTML(invoice, printUrl),
          reply_to: 'rkumar@mrmwebsolutions.com',
        }),
      })
      resendData = await resendResponse.json()
    } catch (fetchErr) {
      return res.status(500).json({ error: 'Could not reach Resend API: ' + fetchErr.message })
    }

    if (!resendResponse.ok) {
      const msg = resendData?.message || resendData?.name || JSON.stringify(resendData)
      return res.status(500).json({ error: `Resend error: ${msg}` })
    }

    // Mark invoice as emailed in Turso
    if (invoice.id) {
      try {
        const { updateLastEmailed } = await import('../../lib/db.js')
        await updateLastEmailed(invoice.id)
      } catch (_) {}
    }

    return res.status(200).json({ success: true, id: resendData.id })

  } catch (err) {
    console.error('[send-invoice] error:', err)
    return res.status(500).json({ error: err.message || 'Unknown server error' })
  }
}

function fmtDate(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${m}/${d}/${y}`
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildEmailHTML(inv, printUrl) {
  const fromAddr = (inv.from_addr || '').replace(/\n/g, '<br>')
  const toAddr   = (inv.to_addr   || '').replace(/\n/g, '<br>')

  const svcBar = (inv.sf || inv.st)
    ? `<tr><td style="padding:0 32px 16px">
        <div style="background:#fff5f2;border-left:4px solid #e8410a;padding:10px 15px;font-size:11px;font-weight:700;color:#c0300a;text-transform:uppercase;letter-spacing:.09em;font-family:monospace;border-radius:0 5px 5px 0">
          For Services Rendered: ${inv.sf ? fmtDate(inv.sf) : ''}${inv.st ? ' &ndash; ' + fmtDate(inv.st) : ''}
        </div>
      </td></tr>`
    : ''

  const lineRows = (inv.lines || []).map(l => {
    const qty  = parseFloat(l.q) || 0
    const rate = parseFloat(l.r) || 0
    return `<tr>
      <td style="padding:10px 13px;border-bottom:1px solid #f0ece4;font-size:12px;color:#1a1a1a;font-weight:600">${esc(l.d) || '&mdash;'}</td>
      <td style="padding:10px 13px;border-bottom:1px solid #f0ece4;font-size:12px;color:#333;text-align:right">${qty}</td>
      <td style="padding:10px 13px;border-bottom:1px solid #f0ece4;font-size:12px;color:#333;text-align:right">$${rate.toFixed(2)}</td>
      <td style="padding:10px 13px;border-bottom:1px solid #f0ece4;font-size:12px;color:#333;text-align:right;font-family:monospace;font-weight:600">$${(qty * rate).toFixed(2)}</td>
    </tr>`
  }).join('')

  const notesHtml = inv.notes
    ? `<tr><td style="padding:0 32px 20px">
        <div style="background:#fff8f5;border-left:3px solid #e8410a;padding:12px 15px;font-size:11px;color:#444;line-height:1.8;border-radius:0 5px 5px 0">
          <strong>Notes / Payment Terms:</strong><br>${esc(inv.notes).replace(/\n/g, '<br>')}
        </div>
      </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${esc(inv.num || '')}</title></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 16px">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.10)">

  <tr><td style="background:#1a2540;padding:22px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><div style="font-size:20px;font-weight:800;color:#fff">MRM WEB SOLUTIONS</div>
          <div style="font-size:11px;color:#8b96a8;margin-top:3px">Professional Web Services</div></td>
      <td align="right">
        <div style="font-size:28px;font-weight:800;color:#f07030">INVOICE</div>
        ${inv.num ? `<div style="font-size:13px;color:#8b96a8;font-family:monospace">#${esc(inv.num)}</div>` : ''}
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="height:3px;background:linear-gradient(90deg,#e8410a,#f07030)"></td></tr>

  <tr><td style="background:#f8f9fb;padding:14px 32px;border-bottom:1px solid #eee">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:40px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:3px">Invoice Date</div>
        <div style="font-size:13px;color:#333;font-family:monospace">${esc(inv.date || '')}</div>
      </td>
      <td>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:3px">Due Date</div>
        <div style="font-size:13px;color:#e8410a;font-family:monospace;font-weight:700">${esc(inv.due || '')}</div>
      </td>
    </tr></table>
  </td></tr>

  ${svcBar}

  <tr><td style="padding:24px 32px 20px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="vertical-align:top;padding-right:16px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#e8410a;margin-bottom:6px">Bill From</div>
        <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${esc(inv.from_name || '')}</div>
        <div style="font-size:11px;color:#555;line-height:1.8">${fromAddr}${inv.from_email ? '<br>' + esc(inv.from_email) : ''}${inv.from_phone ? '<br>' + esc(inv.from_phone) : ''}</div>
      </td>
      <td width="50%" style="vertical-align:top;padding-left:16px;border-left:1px solid #eee">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#e8410a;margin-bottom:6px">Bill To</div>
        <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${esc(inv.to_name || '')}</div>
        <div style="font-size:11px;color:#555;line-height:1.8">${toAddr}${inv.to_email ? '<br>' + esc(inv.to_email) : ''}${inv.to_phone ? '<br>' + esc(inv.to_phone) : ''}</div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:0 32px 20px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <thead><tr style="background:#1a2540">
        <th style="padding:10px 13px;font-size:10px;font-weight:700;text-transform:uppercase;color:#fff;text-align:left">Description</th>
        <th style="padding:10px 13px;font-size:10px;font-weight:700;text-transform:uppercase;color:#fff;text-align:right">Qty</th>
        <th style="padding:10px 13px;font-size:10px;font-weight:700;text-transform:uppercase;color:#fff;text-align:right">Rate</th>
        <th style="padding:10px 13px;font-size:10px;font-weight:700;text-transform:uppercase;color:#fff;text-align:right">Amount</th>
      </tr></thead>
      <tbody>${lineRows}</tbody>
    </table>
  </td></tr>

  <tr><td style="padding:0 32px 24px" align="right">
    <table cellpadding="0" cellspacing="0" style="background:#1a2540;border-radius:7px;overflow:hidden">
    <tr>
      <td style="padding:13px 18px;font-size:13px;font-weight:700;color:#fff">Total Due</td>
      <td style="padding:13px 18px;font-family:monospace;font-size:22px;font-weight:700;color:#f07030">$${(inv.total || 0).toFixed(2)}</td>
    </tr></table>
  </td></tr>

  ${notesHtml}

  <tr><td style="padding:0 32px 24px">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="background:#f0f7ff;border:1px solid #c8dff7;border-radius:8px;padding:18px 20px">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td>
            <div style="font-size:13px;font-weight:700;color:#1a2540;margin-bottom:5px">View &amp; Print Your Invoice</div>
            <div style="font-size:11px;color:#555;line-height:1.7">Click the button to open a print-ready version. You can save it as a PDF or print it directly from your browser.</div>
          </td>
          <td style="padding-left:20px;white-space:nowrap" align="right">
            <a href="${printUrl}" target="_blank"
              style="display:inline-block;background:#e8410a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:7px;font-size:13px;font-weight:700;font-family:Helvetica,Arial,sans-serif">
              View &amp; Print
            </a>
          </td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="background:#f8f9fb;border-top:2px solid #1a2540;padding:20px 32px;text-align:center">
    <div style="font-size:12px;font-weight:700;color:#1a2540;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Make all checks payable to MRM WEB SOLUTIONS</div>
    <div style="font-size:11px;color:#555;line-height:2">Questions? Contact <strong>Rajnish Kumar</strong> &nbsp;|&nbsp; 757-358-5249 &nbsp;|&nbsp; <a href="mailto:rkumar@mrmwebsolutions.com" style="color:#e8410a;text-decoration:none">rkumar@mrmwebsolutions.com</a></div>
    <div style="margin-top:10px;font-size:13px;font-weight:800;color:#e8410a;letter-spacing:.07em;text-transform:uppercase">&starf; Thank You For Your Business! &starf;</div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
