// pages/api/migrate.js
// Run ONCE to create database tables in Turso
// Visit: https://your-app.vercel.app/api/migrate?secret=YOUR_CRON_SECRET

export default async function handler(req, res) {
  // Protect with your CRON_SECRET so only you can run it
  const { secret } = req.query
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { createClient } = await import('@libsql/client')
    const db = createClient({
      url:       process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS invoices (
        id           TEXT PRIMARY KEY,
        created_at   TEXT DEFAULT (datetime('now')),
        num          TEXT,
        date         TEXT,
        due          TEXT,
        sf           TEXT,
        st           TEXT,
        status       TEXT DEFAULT 'unpaid',
        from_name    TEXT,
        from_addr    TEXT,
        from_email   TEXT,
        from_phone   TEXT,
        to_name      TEXT,
        to_addr      TEXT,
        to_email     TEXT,
        to_phone     TEXT,
        lines        TEXT DEFAULT '[]',
        notes        TEXT,
        total        REAL DEFAULT 0,
        last_emailed TEXT
      );

      CREATE TABLE IF NOT EXISTS scheduled_emails (
        id               TEXT PRIMARY KEY,
        created_at       TEXT DEFAULT (datetime('now')),
        invoice_id       TEXT,
        recipient_email  TEXT NOT NULL,
        recipient_name   TEXT,
        scheduled_for    TEXT NOT NULL,
        status           TEXT DEFAULT 'pending',
        sent_at          TEXT,
        error            TEXT,
        invoice_snapshot TEXT
      );
    `)

    return res.status(200).json({
      success: true,
      message: 'Tables created successfully! Your Turso database is ready.',
    })
  } catch (err) {
    console.error('[migrate]', err)
    return res.status(500).json({ error: err.message })
  }
}
