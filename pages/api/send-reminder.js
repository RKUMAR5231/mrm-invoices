// pages/api/send-reminder.js
// Sends a payment reminder email using selected template via IONOS SMTP

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { invoice, recipientEmail, recipientName, template, customMessage } = req.body || {}
    if (!invoice)        return res.status(400).json({ error: 'Missing invoice' })
    if (!recipientEmail) return res.status(400).json({ error: 'Missing recipient email' })
    if (!template)       return res.status(400).json({ error: 'Missing template' })

    const SMTP_USER = process.env.IONOS_SMTP_USER
    const SMTP_PASS = process.env.IONOS_SMTP_PASS
    if (!SMTP_USER || !SMTP_PASS) return res.status(500).json({ error: 'IONOS SMTP credentials not set' })

    const appUrl   = 'https://mrm-print.vercel.app'
    const printUrl = `${appUrl}/invoice/${invoice.id}`

    function fmtDate(s) {
      if (!s) return ''
      const [y, m, d] = s.split('-')
      return `${m}/${d}/${y}`
    }

    const clientName = recipientName || invoice.to_name || 'Valued Client'
    const amount     = `$${(invoice.total || 0).toFixed(2)}`
    const dueDate    = fmtDate(invoice.due)
    const invNum     = invoice.num || ''

    // ── EMAIL TEMPLATES ──
    const templates = {
      friendly: {
        subject: `Friendly Reminder: Invoice ${invNum} — MRM Web Solutions`,
        body: `
          <p style="font-size:15px;color:#1a1a1a;margin-bottom:20px">Dear <strong>${clientName}</strong>,</p>
          <p style="font-size:14px;color:#444;line-height:1.9;margin-bottom:20px">
            I hope you're doing well! I wanted to send a friendly reminder that Invoice <strong>${invNum}</strong>
            for <strong>${amount}</strong> was due on <strong>${dueDate}</strong>.
          </p>
          <p style="font-size:14px;color:#444;line-height:1.9;margin-bottom:20px">
            If you've already sent payment, please disregard this message — and thank you!
            If not, we'd appreciate payment at your earliest convenience.
          </p>
          <p style="font-size:14px;color:#444;line-height:1.9;margin-bottom:20px">
            Please don't hesitate to reach out if you have any questions.
          </p>`
      },
      followup: {
        subject: `Follow Up: Invoice ${invNum} Payment — MRM Web Solutions`,
        body: `
          <p style="font-size:15px;color:#1a1a1a;margin-bottom:20px">Dear <strong>${clientName}</strong>,</p>
          <p style="font-size:14px;color:#444;line-height:1.9;margin-bottom:20px">
            I'm following up on Invoice <strong>${invNum}</strong> for <strong>${amount}</strong>
            which was due on <strong>${dueDate}</strong>. We have not yet received payment for this invoice.
          </p>
          <p style="font-size:14px;color:#444;line-height:1.9;margin-bottom:20px">
            Could you please let us know the status of this payment or when we can expect to receive it?
            We value our working relationship and want to make sure everything is in order on your end.
          </p>
          <p style="font-size:14px;color:#444;line-height:1.9;margin-bottom:20px">
            If there is an issue with the invoice or our services, please let me know and we can discuss.
          </p>`
      },
      urgent: {
        subject: `URGENT: Invoice ${invNum} — Immediate Payment Required`,
        body: `
          <p style="font-size:15px;color:#1a1a1a;margin-bottom:20px">Dear <strong>${clientName}</strong>,</p>
          <p style="font-size:14px;color:#444;line-height:1.9;margin-bottom:20px">
            This is an urgent notice regarding Invoice <strong>${invNum}</strong> for <strong>${amount}</strong>
            which was due on <strong>${dueDate}</strong> and remains unpaid.
          </p>
          <p style="font-size:14px;color:#444;line-height:1.9;margin-bottom:20px">
            Despite previous reminders, we have not received payment. We ask that you please arrange
            immediate payment to avoid any interruption to our services.
          </p>
          <p style="font-size:14px;color:#444;line-height:1.9;margin-bottom:20px">
            Please contact me directly at <a href="tel:757-358-5249" style="color:#e8410a">757-358-5249</a>
            if you need to discuss payment arrangements.
          </p>`
      },
      custom: {
        subject: `Invoice ${invNum} — MRM Web Solutions`,
        body: `
          <p style="font-size:15px;color:#1a1a1a;margin-bottom:20px">Dear <strong>${clientName}</strong>,</p>
          <p style="font-size:14px;color:#444;line-height:1.9;margin-bottom:20px">
            ${(customMessage || '').replace(/\n/g, '<br>')}
          </p>`
      }
    }

    const tmpl = templates[template] || templates.friendly

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 16px">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.10)">

  <tr><td style="background:#1a2540;padding:22px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><div style="font-size:20px;font-weight:800;color:#fff">MRM WEB SOLUTIONS</div>
          <div style="font-size:11px;color:#8b96a8;margin-top:3px">Professional Web Services</div></td>
      <td align="right"><div style="font-size:16px;font-weight:700;color:#f07030">PAYMENT REMINDER</div></td>
    </tr></table>
  </td></tr>

  <tr><td style="height:3px;background:linear-gradient(90deg,#e8410a,#f07030)"></td></tr>

  <!-- Invoice summary box -->
  <tr><td style="padding:24px 32px 20px">
    <div style="background:#f8f9fb;border:1px solid #e5e0d8;border-radius:8px;padding:18px 22px;margin-bottom:24px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;padding-bottom:4px">Invoice</td>
          <td align="right" style="font-size:15px;font-weight:700;color:#1a1a1a">${invNum}</td>
        </tr>
        <tr><td colspan="2" style="height:8px"></td></tr>
        <tr>
          <td style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;padding-bottom:4px">Amount Due</td>
          <td align="right" style="font-size:22px;font-weight:800;color:#e8410a;font-family:monospace">${amount}</td>
        </tr>
        <tr><td colspan="2" style="height:8px"></td></tr>
        <tr>
          <td style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;padding-bottom:4px">Due Date</td>
          <td align="right" style="font-size:14px;font-weight:700;color:#dc2626">${dueDate}</td>
        </tr>
      </table>
    </div>

    ${tmpl.body}

    <!-- View & Print button -->
    <table cellpadding="0" cellspacing="0" style="margin-top:24px;margin-bottom:8px">
      <tr>
        <td style="background:#e8410a;border-radius:7px;padding:13px 28px">
          <a href="${printUrl}" target="_blank" style="color:#fff;text-decoration:none;font-size:14px;font-weight:700;font-family:Helvetica,sans-serif">
            View &amp; Print Invoice
          </a>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="background:#f8f9fb;border-top:2px solid #1a2540;padding:20px 32px;text-align:center">
    <div style="font-size:12px;font-weight:700;color:#1a2540;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Make all checks payable to MRM WEB SOLUTIONS</div>
    <div style="font-size:11px;color:#555;line-height:2">
      Questions? Contact <strong>Rajnish Kumar</strong> &nbsp;|&nbsp; 757-358-5249 &nbsp;|&nbsp;
      <a href="mailto:rkumar@mrmwebsolutions.com" style="color:#e8410a;text-decoration:none">rkumar@mrmwebsolutions.com</a>
    </div>
    <div style="margin-top:10px;font-size:13px;font-weight:800;color:#e8410a;letter-spacing:.07em;text-transform:uppercase">&starf; Thank You For Your Business! &starf;</div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      host:   'smtp.ionos.com',
      port:   465,
      secure: true,
      auth:   { user: SMTP_USER, pass: SMTP_PASS },
    })

    await transporter.sendMail({
      from:    `"MRM Web Solutions" <${SMTP_USER}>`,
      to:      recipientEmail,
      cc:      SMTP_USER,
      replyTo: SMTP_USER,
      subject: tmpl.subject,
      html,
    })

    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('[send-reminder]', err)
    return res.status(500).json({ error: err.message || 'Unknown error' })
  }
}
