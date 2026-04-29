// lib/db.js
// Turso (libSQL) database client + all query helpers
// Replaces Supabase entirely — same data, faster, never pauses

import { createClient } from '@libsql/client'

function getClient() {
  const url   = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if (!url) throw new Error('TURSO_DATABASE_URL environment variable not set')
  return createClient({ url, authToken: token })
}

// ── SCHEMA ────────────────────────────────────────────────────────
// Run this once in Turso shell or via the migrate API route
export const SCHEMA = `
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
`

// ── helper: row → invoice object ──────────────────────────────────
function rowToInvoice(row) {
  if (!row) return null
  return {
    id:          row.id,
    created_at:  row.created_at,
    num:         row.num,
    date:        row.date,
    due:         row.due,
    sf:          row.sf,
    st:          row.st,
    status:      row.status,
    from_name:   row.from_name,
    from_addr:   row.from_addr,
    from_email:  row.from_email,
    from_phone:  row.from_phone,
    to_name:     row.to_name,
    to_addr:     row.to_addr,
    to_email:    row.to_email,
    to_phone:    row.to_phone,
    lines:       JSON.parse(row.lines || '[]'),
    notes:       row.notes,
    total:       row.total,
    last_emailed: row.last_emailed,
  }
}

// ── INVOICES ──────────────────────────────────────────────────────

export async function getAllInvoices() {
  const db = getClient()
  const result = await db.execute(
    'SELECT * FROM invoices ORDER BY created_at DESC'
  )
  return result.rows.map(rowToInvoice)
}

export async function getInvoiceById(id) {
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM invoices WHERE id = ?',
    args: [id],
  })
  return rowToInvoice(result.rows[0])
}

export async function insertInvoice(inv) {
  const db = getClient()
  const id = inv.id || crypto.randomUUID()
  await db.execute({
    sql: `INSERT INTO invoices
      (id, num, date, due, sf, st, status,
       from_name, from_addr, from_email, from_phone,
       to_name, to_addr, to_email, to_phone,
       lines, notes, total)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      id,
      inv.num        || '',
      inv.date       || '',
      inv.due        || '',
      inv.sf         || null,
      inv.st         || null,
      inv.status     || 'unpaid',
      inv.from_name  || '',
      inv.from_addr  || '',
      inv.from_email || '',
      inv.from_phone || '',
      inv.to_name    || '',
      inv.to_addr    || '',
      inv.to_email   || '',
      inv.to_phone   || '',
      JSON.stringify(inv.lines || []),
      inv.notes      || '',
      inv.total      || 0,
    ],
  })
  return getInvoiceById(id)
}

export async function updateInvoice(id, inv) {
  const db = getClient()
  await db.execute({
    sql: `UPDATE invoices SET
      num=?, date=?, due=?, sf=?, st=?, status=?,
      from_name=?, from_addr=?, from_email=?, from_phone=?,
      to_name=?, to_addr=?, to_email=?, to_phone=?,
      lines=?, notes=?, total=?
      WHERE id=?`,
    args: [
      inv.num        || '',
      inv.date       || '',
      inv.due        || '',
      inv.sf         || null,
      inv.st         || null,
      inv.status     || 'unpaid',
      inv.from_name  || '',
      inv.from_addr  || '',
      inv.from_email || '',
      inv.from_phone || '',
      inv.to_name    || '',
      inv.to_addr    || '',
      inv.to_email   || '',
      inv.to_phone   || '',
      JSON.stringify(inv.lines || []),
      inv.notes      || '',
      inv.total      || 0,
      id,
    ],
  })
  return getInvoiceById(id)
}

export async function deleteInvoice(id) {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM invoices WHERE id = ?', args: [id] })
}

export async function updateInvoiceStatus(id, status) {
  const db = getClient()
  await db.execute({
    sql: 'UPDATE invoices SET status = ? WHERE id = ?',
    args: [status, id],
  })
}

export async function updateLastEmailed(id) {
  const db = getClient()
  await db.execute({
    sql: 'UPDATE invoices SET last_emailed = ? WHERE id = ?',
    args: [new Date().toISOString(), id],
  })
}

// ── SCHEDULED EMAILS ─────────────────────────────────────────────

export async function insertScheduledEmail(job) {
  const db = getClient()
  const id = crypto.randomUUID()
  await db.execute({
    sql: `INSERT INTO scheduled_emails
      (id, invoice_id, recipient_email, recipient_name,
       scheduled_for, status, invoice_snapshot)
      VALUES (?,?,?,?,?,?,?)`,
    args: [
      id,
      job.invoice_id       || null,
      job.recipient_email,
      job.recipient_name   || '',
      job.scheduled_for,
      'pending',
      JSON.stringify(job.invoice_snapshot || {}),
    ],
  })
}

export async function getPendingScheduledEmails() {
  const db = getClient()
  const now = new Date().toISOString()
  const result = await db.execute({
    sql: `SELECT * FROM scheduled_emails
          WHERE status = 'pending' AND scheduled_for <= ?`,
    args: [now],
  })
  return result.rows.map(row => ({
    ...row,
    invoice_snapshot: JSON.parse(row.invoice_snapshot || '{}'),
  }))
}

export async function updateScheduledEmailStatus(id, status, extra = {}) {
  const db = getClient()
  await db.execute({
    sql: `UPDATE scheduled_emails SET status=?, sent_at=?, error=? WHERE id=?`,
    args: [status, extra.sent_at || null, extra.error || null, id],
  })
}
