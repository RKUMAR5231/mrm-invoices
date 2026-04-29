// pages/api/invoices.js
// GET all invoices, POST new invoice

import {
  getAllInvoices, getInvoiceById, insertInvoice, updateInvoice,
  deleteInvoice, updateInvoiceStatus, updateLastEmailed
} from '../../lib/db.js'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { id } = req.query
      if (id) {
        const invoice = await getInvoiceById(id)
        if (!invoice) return res.status(404).json({ error: 'Not found' })
        return res.status(200).json(invoice)
      }
      const invoices = await getAllInvoices()
      return res.status(200).json(invoices)
    }

    if (req.method === 'POST') {
      const inv = req.body
      if (!inv) return res.status(400).json({ error: 'Missing invoice data' })
      const created = await insertInvoice(inv)
      return res.status(201).json(created)
    }

    if (req.method === 'PUT') {
      const { id, ...inv } = req.body
      if (!id) return res.status(400).json({ error: 'Missing id' })
      const updated = await updateInvoice(id, inv)
      return res.status(200).json(updated)
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'Missing id' })
      await deleteInvoice(id)
      return res.status(200).json({ success: true })
    }

    if (req.method === 'PATCH') {
      const { id, status, last_emailed } = req.body
      if (!id) return res.status(400).json({ error: 'Missing id' })
      if (status)       await updateInvoiceStatus(id, status)
      if (last_emailed) await updateLastEmailed(id)
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('[invoices api]', err)
    return res.status(500).json({ error: err.message })
  }
}
