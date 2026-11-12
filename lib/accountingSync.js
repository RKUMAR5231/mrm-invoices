// lib/accountingSync.js  (mrm-invoices)
// Pushes invoices INV-1600+ into the mrm-accounting database so it can track what is owed.
// Revenue is NOT counted from these (source='sync'); the bank deposit import is the revenue source.
// Never throws: a sync failure must not block saving/emailing an invoice.
import { createClient } from '@libsql/client'

const MIN_NUM = 1600

function acct() {
  const url = process.env.ACCOUNTING_TURSO_URL
  if (!url) return null
  return createClient({ url, authToken: process.env.ACCOUNTING_TURSO_TOKEN })
}
function numOf(inv) { return parseInt(String(inv.num || '').replace(/\D/g, '')) || 0 }

async function ensure(db) {
  const info = await db.execute('PRAGMA table_info(invoices)')
  for (const [c, d] of [['batch', 'TEXT'], ['source', 'TEXT']])
    if (!info.rows.some(r => r.name === c)) await db.execute(`ALTER TABLE invoices ADD COLUMN ${c} ${d}`)
}

async function clientIdFor(db, inv) {
  const name = (inv.to_name || '').trim()
  if (!name) return null
  const found = await db.execute({ sql: 'SELECT id FROM clients WHERE lower(company) = lower(?)', args: [name] })
  if (found.rows[0]) return found.rows[0].id
  const id = crypto.randomUUID()
  await db.execute({
    sql: 'INSERT INTO clients (id, company, email, phone, status) VALUES (?,?,?,?,?)',
    args: [id, name, inv.to_email || '', inv.to_phone || '', 'active'],
  })
  return id
}

export async function syncInvoiceToAccounting(inv) {
  try {
    if (!inv || numOf(inv) < MIN_NUM) return { skipped: true }
    const db = acct(); if (!db) return { skipped: true, reason: 'ACCOUNTING_TURSO_URL not set' }
    await ensure(db)
    const client_id = await clientIdFor(db, inv)
    const today = new Date().toISOString().slice(0, 10)
    const paid = inv.status === 'paid'
    const status = paid ? 'paid' : (inv.last_emailed ? ((inv.due && inv.due < today) ? 'overdue' : 'sent') : 'draft')
    const existing = await db.execute({ sql: 'SELECT id, paid_date FROM invoices WHERE num = ?', args: [inv.num] })
    const lines = JSON.stringify(inv.lines || [])
    if (existing.rows[0]) {
      await db.execute({
        sql: `UPDATE invoices SET client_id=?, date=?, due=?, status=?, lines=?, notes=?, total=?, paid_date=?, source='sync' WHERE id=?`,
        args: [client_id, inv.date || '', inv.due || '', status, lines, inv.notes || '', inv.total || 0,
               paid ? (existing.rows[0].paid_date || today) : null, existing.rows[0].id],
      })
    } else {
      await db.execute({
        sql: `INSERT INTO invoices (id, client_id, num, date, due, status, lines, notes, total, paid_date, source) VALUES (?,?,?,?,?,?,?,?,?,?,'sync')`,
        args: [crypto.randomUUID(), client_id, inv.num, inv.date || '', inv.due || '', status, lines, inv.notes || '', inv.total || 0, paid ? today : null],
      })
    }
    return { ok: true }
  } catch (err) {
    console.error('[accounting sync failed]', inv?.num, err.message)
    return { ok: false, error: err.message }
  }
}

export async function deleteFromAccounting(inv) {
  try {
    if (!inv || numOf(inv) < MIN_NUM) return
    const db = acct(); if (!db) return
    await db.execute({ sql: "DELETE FROM invoices WHERE num = ? AND source = 'sync'", args: [inv.num] })
  } catch (err) { console.error('[accounting sync delete failed]', err.message) }
}
