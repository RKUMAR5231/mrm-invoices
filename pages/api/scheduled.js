// pages/api/scheduled.js
// GET all scheduled emails, DELETE to cancel one

export default async function handler(req, res) {
  try {
    const { createClient } = await import('@libsql/client')
    const db = createClient({
      url:       process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

    if (req.method === 'GET') {
      const result = await db.execute(
        `SELECT
           se.id,
           se.recipient_email,
           se.recipient_name,
           se.scheduled_for,
           se.status,
           se.sent_at,
           se.error,
           json_extract(se.invoice_snapshot, '$.num')   AS invoice_num,
           json_extract(se.invoice_snapshot, '$.total') AS invoice_total
         FROM scheduled_emails se
         ORDER BY se.scheduled_for DESC`
      )
      return res.status(200).json(result.rows)
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'Missing id' })
      await db.execute({
        sql: `DELETE FROM scheduled_emails WHERE id = ? AND status = 'pending'`,
        args: [id],
      })
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (err) {
    console.error('[scheduled api]', err)
    return res.status(500).json({ error: err.message })
  }
}
