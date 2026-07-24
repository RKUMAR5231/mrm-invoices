// pages/api/webhooks/resend.js
// Receives Resend webhook events. Configure a webhook in the Resend
// dashboard pointing here, subscribed to "email.opened", and set the
// signing secret it gives you as RESEND_WEBHOOK_SECRET in Vercel.
//
// Requires "Open Tracking" to be enabled for the sending domain in
// Resend (Domains -> your domain -> Configuration -> Enable tracking metrics).

import { Webhook } from 'svix'

// Signature verification needs the raw request body, so Next.js's
// built-in JSON body parser must be disabled for this route.
export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return res.status(500).json({ error: 'RESEND_WEBHOOK_SECRET not set in Vercel environment variables.' })

  const payload = await readRawBody(req)

  let event
  try {
    const wh = new Webhook(secret)
    event = wh.verify(payload, {
      'svix-id':        req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    })
  } catch (err) {
    console.error('[webhooks/resend] signature verification failed:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    if (event.type === 'email.opened') {
      await handleEmailOpened(event.data)
    }
  } catch (err) {
    console.error('[webhooks/resend] error handling event:', err)
  }

  return res.status(200).json({ received: true })
}

async function handleEmailOpened(data) {
  const emailId = data?.email_id
  if (!emailId) return

  const { getInvoiceByResendEmailId, markInvoiceOpened } = await import('../../../lib/db.js')

  const invoice = await getInvoiceByResendEmailId(emailId)
  if (!invoice) return

  // Only notify once per send — mail clients can fire repeat open events.
  const firstOpen = await markInvoiceOpened(emailId)
  if (!firstOpen) return

  await notifyInvoiceOpened(invoice)
}

async function notifyInvoiceOpened(invoice) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return

  const notifyEmail = process.env.NOTIFY_EMAIL || 'milautofin@gmail.com'
  const fromDomain   = process.env.EMAIL_DOMAIN || 'resend.dev'
  const fromAddress  = fromDomain === 'resend.dev' ? 'onboarding@resend.dev' : `info@${fromDomain}`
  const appUrl       = (process.env.NEXT_PUBLIC_APP_URL || 'https://mrm-invoices.vercel.app').replace(/\/$/, '')
  const invLabel     = invoice.num ? `#${invoice.num}` : ''

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    `MRM Invoices <${fromAddress}>`,
      to:      [notifyEmail],
      subject: `👀 Invoice ${invLabel} was opened by ${invoice.to_name || 'your client'}`,
      html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#1a1a1a">
        <p><strong>${invoice.to_name || 'Your client'}</strong> just opened invoice ${invLabel}.</p>
        <ul>
          <li>Amount: $${(invoice.total || 0).toFixed(2)}</li>
          <li>Due: ${invoice.due || '—'}</li>
          <li>Opened at: ${new Date().toLocaleString('en-US')}</li>
        </ul>
        <p><a href="${appUrl}/invoice/${invoice.id}">View invoice</a></p>
      </div>`,
    }),
  })
}
