// pages/api/cron/send-scheduled.js
// Runs daily at 9am — sends any scheduled emails due today

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { getPendingScheduledEmails, updateScheduledEmailStatus } = await import('../../../lib/db.js')
    const pending = await getPendingScheduledEmails()

    if (!pending.length) {
      return res.status(200).json({ sent: 0, message: 'No emails due' })
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const fromDomain    = process.env.EMAIL_DOMAIN || 'resend.dev'
    const fromAddress   = fromDomain === 'resend.dev' ? 'onboarding@resend.dev' : `info@${fromDomain}`
    const appUrl        = (process.env.NEXT_PUBLIC_APP_URL || 'https://mrm-invoices.vercel.app').replace(/\/$/, '')

    let sent = 0, failed = 0

    for (const job of pending) {
      try {
        const inv      = job.invoice_snapshot
        const printUrl = inv.id ? `${appUrl}/invoice/${inv.id}` : appUrl

        const response = await fetch('https://api.resend.com/emails', {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            from:     `MRM Web Solutions <${fromAddress}>`,
            to:       [job.recipient_email],
            subject:  `Invoice ${inv.num || ''} from MRM Web Solutions`,
            reply_to: 'rkumar@mrmwebsolutions.com',
            html:     buildSimpleEmail(inv, printUrl),
          }),
        })

        if (response.ok) {
          await updateScheduledEmailStatus(job.id, 'sent', { sent_at: new Date().toISOString() })
          sent++
        } else {
          const err = await response.json()
          await updateScheduledEmailStatus(job.id, 'failed', { error: err.message })
          failed++
        }
      } catch (err) {
        await updateScheduledEmailStatus(job.id, 'failed', { error: err.message })
        failed++
      }
    }

    return res.status(200).json({ sent, failed, total: pending.length })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function buildSimpleEmail(inv, printUrl) {
  return `<!DOCTYPE html><html><body style="font-family:Helvetica,sans-serif;background:#f0f2f5;padding:32px 16px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden">
    <div style="background:#1a2540;padding:20px 28px;color:#fff">
      <b style="font-size:18px">MRM WEB SOLUTIONS</b>
      <span style="float:right;font-size:22px;color:#f07030;font-weight:800">INVOICE ${inv.num || ''}</span>
    </div>
    <div style="padding:24px 28px">
      <p style="margin-bottom:16px">Dear ${inv.to_name || 'Client'},</p>
      <p style="margin-bottom:24px">Please find your invoice for <b>$${(inv.total||0).toFixed(2)}</b> due on <b>${inv.due||''}</b>.</p>
      <a href="${printUrl}" style="display:inline-block;background:#e8410a;color:#fff;padding:12px 24px;border-radius:7px;text-decoration:none;font-weight:700">View &amp; Print Invoice</a>
    </div>
    <div style="background:#f8f9fb;border-top:2px solid #1a2540;padding:16px 28px;text-align:center;font-size:11px;color:#555">
      Make all checks payable to MRM WEB SOLUTIONS &nbsp;|&nbsp; Rajnish Kumar &nbsp;|&nbsp; 757-358-5249
    </div>
  </div>
</body></html>`
}
