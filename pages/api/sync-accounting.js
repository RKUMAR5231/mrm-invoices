// pages/api/sync-accounting.js — one-time catch-up (safe to re-run; matches by invoice number)
// Open  https://mrm-invoices.vercel.app/api/sync-accounting  once after setting the env vars.
import { getAllInvoices } from '../../lib/db.js'
import { syncInvoiceToAccounting } from '../../lib/accountingSync.js'

export default async function handler(req, res) {
  const all = await getAllInvoices()
  let synced = 0, skipped = 0; const failed = []
  for (const inv of all) {
    const r = await syncInvoiceToAccounting(inv)
    if (r.ok) synced++; else if (r.skipped) skipped++; else failed.push({ num: inv.num, error: r.error })
  }
  res.status(200).json({ synced, skipped_below_1600: skipped, failed })
}
