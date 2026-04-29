import { useState, useEffect } from 'react'
import Head from 'next/head'

const LOGO = '/logo.jpg'

// ── helpers ──────────────────────────────────────────────────────
function fmtDate(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${m}/${d}/${y}`
}
function today() { return new Date().toISOString().slice(0, 10) }
function daysOut(n) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function addMonth(s) {
  if (!s) return ''
  const d = new Date(s + 'T00:00:00')
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}
function blank() {
  return {
    id: null, num: '', date: today(), due: daysOut(30),
    sf: '', st: '', status: 'unpaid',
    from_name: 'MRM Web Solutions', from_addr: '',
    from_email: 'rkumar@mrmwebsolutions.com', from_phone: '757-358-5249',
    to_name: '', to_addr: '', to_email: '', to_phone: '',
    lines: [{ d: '', q: 1, r: '' }],
    notes: 'Payment due within 30 days. Thank you for your business!',
    total: 0
  }
}
function calcTotal(lines) {
  return lines.reduce((s, l) => s + (parseFloat(l.q) || 0) * (parseFloat(l.r) || 0), 0)
}
function nextNum(invoices) {
  const nums = invoices.map(i => parseInt((i.num || '').replace(/\D/g, '')) || 0)
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return 'INV-' + String(next).padStart(3, '0')
}

// ── InvoiceDoc ────────────────────────────────────────────────────
function InvoiceDoc({ inv }) {
  const fa = (inv.from_addr || '').replace(/\n/g, '<br>')
  const ta = (inv.to_addr   || '').replace(/\n/g, '<br>')
  const svcBar = (inv.sf || inv.st)
    ? `For Services Rendered: ${inv.sf ? fmtDate(inv.sf) : ''}${inv.st ? ' \u2013 ' + fmtDate(inv.st) : ''}`
    : null
  return (
    <div className="inv-doc">
      {inv.status === 'paid'   && <div className="d-stamp paid">PAID</div>}
      {inv.status === 'unpaid' && <div className="d-stamp unpaid">UNPAID</div>}
      <div className="d-hdr">
        <div>
          <img className="d-logo" src={LOGO} alt="MRM Web Solutions" />
          <div className="d-from" dangerouslySetInnerHTML={{
            __html: (fa ? fa + '<br>' : '') + (inv.from_email || '') + (inv.from_phone ? ' &middot; ' + inv.from_phone : '')
          }} />
        </div>
        <div className="d-ibox">
          <h2>INVOICE</h2>
          <div className="d-meta">
            {inv.num && <><strong>#{inv.num}</strong><br /></>}
            Date: {inv.date}<br />Due: {inv.due}
          </div>
        </div>
      </div>
      <div className="d-divider" />
      {svcBar && <div className="d-svc">&#128197; {svcBar}</div>}
      <div className="d-parties">
        <div className="d-party">
          <div className="d-plbl">Bill From</div>
          <div className="d-pname">{inv.from_name}</div>
          <div className="d-pdet" dangerouslySetInnerHTML={{ __html: fa }} />
        </div>
        <div className="d-party">
          <div className="d-plbl">Bill To</div>
          <div className="d-pname">{inv.to_name}</div>
          <div className="d-pdet" dangerouslySetInnerHTML={{
            __html: ta + (inv.to_email ? '<br>' + inv.to_email : '') + (inv.to_phone ? '<br>' + inv.to_phone : '')
          }} />
        </div>
      </div>
      <table className="d-table">
        <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          {(inv.lines || []).map((l, i) => (
            <tr key={i}>
              <td className="dc">{l.d || '\u2014'}</td>
              <td>{l.q}</td>
              <td>${parseFloat(l.r || 0).toFixed(2)}</td>
              <td>${((parseFloat(l.q)||0)*(parseFloat(l.r)||0)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="d-totals">
        <div className="d-tbox">
          <div className="d-trow">
            <span className="tl">Total Due</span>
            <span className="tv">${(inv.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
      {inv.notes && (
        <div className="d-notes">
          <strong>Notes / Payment Terms:</strong><br />
          <span dangerouslySetInnerHTML={{ __html: inv.notes.replace(/\n/g, '<br>') }} />
        </div>
      )}
      <div className="d-footer">
        <div className="checks">Make all checks payable to MRM WEB SOLUTIONS</div>
        <div className="contact">
          If you have any questions concerning this invoice, contact{' '}
          <b>Rajnish Kumar</b> &nbsp;|&nbsp; 757-358-5249 &nbsp;|&nbsp;
          <a href="mailto:rkumar@mrmwebsolutions.com">rkumar@mrmwebsolutions.com</a>
        </div>
        <div className="ty">&#9733; Thank You For Your Business! &#9733;</div>
      </div>
    </div>
  )
}

// ── Email Modal ───────────────────────────────────────────────────
function EmailModal({ inv, onClose }) {
  const [to,        setTo]        = useState(inv.to_email || '')
  const [name,      setName]      = useState(inv.to_name  || '')
  const [sendWhen,  setSendWhen]  = useState('now')
  const [schedDate, setSchedDate] = useState(today())
  const [schedTime, setSchedTime] = useState('09:00')
  const [sending,   setSending]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [err,       setErr]       = useState('')

  async function send() {
    if (!to) { setErr('Please enter a recipient email address.'); return }
    setSending(true); setErr('')
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: inv,
          recipientEmail: to,
          recipientName: name,
          scheduledFor: sendWhen === 'schedule' ? `${schedDate}T${schedTime}:00` : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setDone(true)
    } catch (e) {
      setErr(e.message)
    }
    setSending(false)
  }

  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-hd">
          <span>&#128231; Email Invoice {inv.num ? '#' + inv.num : ''}</span>
          <button className="modal-close" onClick={onClose}>&#10005;</button>
        </div>
        {done ? (
          <div className="modal-success">
            {sendWhen === 'schedule'
              ? `Scheduled! Invoice will be emailed on ${fmtDate(schedDate)} at ${schedTime}.`
              : `Invoice emailed to ${to} successfully!`}
            <br /><br />
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            {err && <div className="error-msg">{err}</div>}
            <div className="fld">
              <label>Recipient Email *</label>
              <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="client@example.com" autoFocus />
            </div>
            <div className="fld">
              <label>Recipient Name (optional)</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Client Name" />
            </div>
            <div className="fld">
              <label>When to Send</label>
              <div className="send-when-row">
                <button className={`send-when-btn${sendWhen === 'now' ? ' active' : ''}`} onClick={() => setSendWhen('now')}>
                  &#9889; Send Now
                </button>
                <button className={`send-when-btn${sendWhen === 'schedule' ? ' active' : ''}`} onClick={() => setSendWhen('schedule')}>
                  &#128197; Schedule for Later
                </button>
              </div>
            </div>
            {sendWhen === 'schedule' && (
              <div className="g2">
                <div className="fld">
                  <label>Send on Date</label>
                  <input type="date" value={schedDate} min={today()} onChange={e => setSchedDate(e.target.value)} />
                </div>
                <div className="fld">
                  <label>Send at Time</label>
                  <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
                </div>
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.7 }}>
              The client will receive a professionally formatted email with your logo, invoice details, and payment info.
            </div>
            <button className="btn btn-red" style={{ width: '100%', justifyContent: 'center' }} onClick={send} disabled={sending}>
              {sending ? 'Sending...' : sendWhen === 'schedule' ? '&#128197; Schedule Email' : '&#128231; Send Email Now'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────
export default function Home() {
  const [tab,       setTab]       = useState('list')
  const [invoices,  setInvoices]  = useState([])
  const [form,      setForm]      = useState(blank())
  const [preview,   setPreview]   = useState(null)
  const [emailInv,  setEmailInv]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('')
  const [toastMsg,  setToastMsg]  = useState('')
  const [toastOn,   setToastOn]   = useState(false)
  const [scheduled, setScheduled] = useState([])
  const [schedLoading, setSchedLoading] = useState(false)

  useEffect(() => { fetchInvoices(); fetchScheduled() }, [])

  async function fetchInvoices() {
    setLoading(true)
    try {
      const res = await fetch('/api/invoices')
      const data = await res.json()
      if (!res.ok) setError('Could not load invoices: ' + (data.error || 'Unknown error'))
      else setInvoices(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Could not load invoices: ' + err.message)
    }
    setLoading(false)
  }

  async function fetchScheduled() {
    setSchedLoading(true)
    try {
      const res = await fetch('/api/scheduled')
      const data = await res.json()
      setScheduled(Array.isArray(data) ? data : [])
    } catch (_) {}
    setSchedLoading(false)
  }

  function toast(msg) {
    setToastMsg(msg); setToastOn(true)
    setTimeout(() => setToastOn(false), 2800)
  }

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })) }
  function setLine(i, key, val) {
    setForm(f => {
      const lines = f.lines.map((l, idx) => idx === i ? { ...l, [key]: val } : l)
      return { ...f, lines, total: calcTotal(lines) }
    })
  }
  function addLine() {
    setForm(f => { const lines = [...f.lines, { d: '', q: 1, r: '' }]; return { ...f, lines } })
  }
  function removeLine(i) {
    setForm(f => { const lines = f.lines.filter((_, idx) => idx !== i); return { ...f, lines } })
  }

  function newInvoice() {
    setError(''); setForm({ ...blank(), num: nextNum(invoices) }); setTab('edit')
  }

  // ── DUPLICATE INVOICE ── auto-advances service period by 1 month
  function duplicateInvoice(inv) {
    setError('')
    setForm({
      ...inv,
      id:     null,
      num:    nextNum(invoices),
      date:   today(),
      due:    daysOut(30),
      sf:     addMonth(inv.sf),
      st:     addMonth(inv.st),
      status: 'unpaid',
      total:  calcTotal(inv.lines || []),
    })
    setTab('edit')
    toast('Duplicated! Service dates advanced 1 month. Review and save.')
  }

  async function saveInvoice(statusOverride) {
    setSaving(true); setError('')
    const inv = { ...form, status: statusOverride || form.status, total: calcTotal(form.lines) }
    const payload = {
      num: inv.num, date: inv.date, due: inv.due,
      sf: inv.sf || null, st: inv.st || null, status: inv.status,
      from_name: inv.from_name, from_addr: inv.from_addr,
      from_email: inv.from_email, from_phone: inv.from_phone,
      to_name: inv.to_name, to_addr: inv.to_addr,
      to_email: inv.to_email, to_phone: inv.to_phone,
      lines: inv.lines, notes: inv.notes, total: inv.total
    }
    const res = inv.id
      ? await fetch('/api/invoices', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id: inv.id, ...payload}) })
      : await fetch('/api/invoices', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const result = await res.json()
    if (!res.ok) { setError(result.error || 'Save failed'); setSaving(false); return }
    toast(statusOverride === 'draft' ? 'Draft saved!' : 'Invoice saved!')
    await fetchInvoices(); setSaving(false); setTab('list')
  }

  function editInvoice(inv) { setError(''); setForm({ ...inv }); setTab('edit') }

  async function cancelScheduled(id) {
    if (!confirm('Cancel this scheduled email?')) return
    await fetch(`/api/scheduled?id=${id}`, { method: 'DELETE' })
    toast('Scheduled email cancelled')
    fetchScheduled()
  }

  async function deleteInvoice(id) {
    if (!confirm('Delete this invoice permanently?')) return
    await fetch(`/api/invoices?id=${id}`, { method: 'DELETE' })
    toast('Invoice deleted'); await fetchInvoices()
  }

  async function togglePaid(inv) {
    const ns = inv.status === 'paid' ? 'unpaid' : 'paid'
    await fetch('/api/invoices', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: inv.id, status: ns }) })
    toast(ns === 'paid' ? 'Marked as Paid' : 'Marked as Unpaid')
    await fetchInvoices()
  }

  function doPrint() {
    const zone = document.getElementById('print-zone')
    zone.innerHTML = document.getElementById('preview-doc').innerHTML
    zone.style.display = 'block'
    setTimeout(() => {
      window.print()
      setTimeout(() => { zone.style.display = 'none'; zone.innerHTML = '' }, 1000)
    }, 100)
  }

  function isOverdue(inv) {
    return inv.status === 'unpaid' && inv.due && inv.due < today()
  }

  const displayed = invoices.filter(inv => {
    const q = search.toLowerCase()
    return (!q || (inv.to_name||'').toLowerCase().includes(q) || (inv.num||'').toLowerCase().includes(q))
        && (!filter || inv.status === filter)
  })

  const totalBilled  = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
  const totalUnpaid  = invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + (i.total || 0), 0)
  const overdueCount = invoices.filter(i => isOverdue(i)).length
  const svcLabel = (form.sf || form.st)
    ? `FOR ${form.sf ? fmtDate(form.sf) : ''}${form.st ? ' \u2013 ' + fmtDate(form.st) : ''}` : null

  return (
    <>
      <Head><title>MRM Web Solutions \u2013 Invoices</title></Head>
      <style dangerouslySetInnerHTML={{__html: 'body{background:#0d1117 !important;color:#e8edf5 !important}'}} />
      <div id="print-zone" style={{ display: 'none' }} />
      <div className={`toast${toastOn ? ' show' : ''}`}>{toastMsg}</div>
      {emailInv && <EmailModal inv={emailInv} onClose={() => setEmailInv(null)} />}

      <header className="app-header">
        <div className="hdr-logo">
          <img src={LOGO} alt="MRM Web Solutions" />
          <span>Invoice Manager</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setTab('list')}>All Invoices</button>
          <button className="btn btn-red" onClick={newInvoice}>+ New Invoice</button>
        </div>
      </header>

      <nav className="tabs">
        {[['list','Invoices'],['edit','Editor'],['scheduled','Scheduled'],['settings','Settings']].map(([t, label]) => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{label}</button>
        ))}
      </nav>

      {/* LIST */}
      <div className={`page${tab === 'list' ? ' active' : ''}`}>
        <div className="stats">
          <div className="stat"><div className="stat-lbl">Total Invoices</div><div className="stat-val">{invoices.length}</div></div>
          <div className="stat"><div className="stat-lbl">Total Billed</div><div className="stat-val c-or">${totalBilled.toFixed(2)}</div></div>
          <div className="stat"><div className="stat-lbl">Collected</div><div className="stat-val c-gr">${totalPaid.toFixed(2)}</div></div>
          <div className="stat">
            <div className="stat-lbl">
              Outstanding {overdueCount > 0 && <span className="overdue-pill">{overdueCount} overdue</span>}
            </div>
            <div className={`stat-val${overdueCount > 0 ? ' c-rd' : ''}`}>${totalUnpaid.toFixed(2)}</div>
          </div>
        </div>

        <div className="list-bar">
          <div><div className="ph">Invoices</div></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="srch"><input placeholder="Search client or #..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 120 }}>
              <option value="">All</option><option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option><option value="draft">Draft</option>
            </select>
            <button className="btn btn-red" onClick={newInvoice}>+ New Invoice</button>
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {loading ? <div className="loading">Loading invoices...</div>
        : displayed.length === 0 ? (
          <div className="empty">
            <div className="eico">&#128203;</div>
            <h3>No invoices yet</h3>
            <p>Click "+ New Invoice" to get started.</p>
          </div>
        ) : (
          <div className="inv-list">
            {displayed.map(inv => (
              <div className={`inv-row${isOverdue(inv) ? ' overdue' : ''}`} key={inv.id}>
                <div className="inv-no">
                  {inv.num || '#\u2014'}
                  {isOverdue(inv) && <span className="overdue-tag">OVERDUE</span>}
                </div>
                <div>
                  <div className="inv-cli">{inv.to_name || 'No client'}</div>
                  <div className="inv-sub">
                    Due: {inv.due || '\u2014'}
                    {inv.sf && ` \u00b7 FOR ${fmtDate(inv.sf)}${inv.st ? '\u2013' + fmtDate(inv.st) : ''}`}
                  </div>
                  {inv.last_emailed && (
                    <div style={{fontSize:10,color:'#22c55e',marginTop:2,fontFamily:'monospace'}}>
                      &#128231; Emailed {new Date(inv.last_emailed).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </div>
                  )}
                </div>
                <span className={`badge b-${inv.status}`}>{inv.status}</span>
                <div className="inv-amt">${(inv.total || 0).toFixed(2)}</div>
                <div className="inv-acts">
                  <button className="btn btn-ghost btn-sm" title="Preview"   onClick={() => setPreview(inv)}>&#128065;</button>
                  <button className="btn btn-ghost btn-sm" title="Email"     onClick={() => setEmailInv(inv)}>&#128231;</button>
                  <button className="btn btn-ghost btn-sm" title={inv.status==='paid'?'Mark Unpaid':'Mark Paid'} onClick={() => togglePaid(inv)}>{inv.status==='paid'?'&#8617;':'&#10003;'}</button>
                  <button className="btn btn-ghost btn-sm" title="Duplicate" onClick={() => duplicateInvoice(inv)}>&#10697;</button>
                  <button className="btn btn-ghost btn-sm" title="Edit"      onClick={() => editInvoice(inv)}>&#9999;&#65039;</button>
                  <button className="btn btn-danger btn-sm" title="Delete"   onClick={() => deleteInvoice(inv.id)}>&#128465;</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDITOR */}
      <div className={`page${tab === 'edit' ? ' active' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div className="ph">{form.id ? 'Edit Invoice' : 'New Invoice'}</div>
            <div className="psub">{form.id ? `Editing ${form.num}` : 'Fill in the details below'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => saveInvoice('draft')} disabled={saving}>Save Draft</button>
            <button className="btn btn-ghost" onClick={() => setPreview(form)}>&#128065; Preview</button>
            {form.id && <button className="btn btn-ghost" onClick={() => setEmailInv(form)}>&#128231; Email</button>}
            <button className="btn btn-red" onClick={() => saveInvoice('unpaid')} disabled={saving}>
              {saving ? 'Saving...' : '&#128190; Save Invoice'}
            </button>
          </div>
        </div>
        {error && <div className="error-msg">{error}</div>}

        <div className="card">
          <div className="card-hd"><span className="ico">&#128196;</span> Invoice Details</div>
          <div className="g5">
            <div className="fld"><label>Invoice #</label><input value={form.num} onChange={e => setF('num', e.target.value)} placeholder="INV-001" /></div>
            <div className="fld"><label>Date</label><input type="date" value={form.date} onChange={e => setF('date', e.target.value)} /></div>
            <div className="fld"><label>Due Date</label><input type="date" value={form.due} onChange={e => setF('due', e.target.value)} /></div>
            <div className="fld"><label>Service From</label><input type="date" value={form.sf} onChange={e => setF('sf', e.target.value)} /></div>
            <div className="fld"><label>Service To</label><input type="date" value={form.st} onChange={e => setF('st', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: -4 }}>
            {svcLabel && <div className="svc-badge">&#128197; {svcLabel}</div>}
            <div className="fld" style={{ margin: '0 0 0 auto', minWidth: 130 }}>
              <label>Status</label>
              <select value={form.status} onChange={e => setF('status', e.target.value)}>
                <option value="unpaid">Unpaid</option>
                <option value="draft">Draft</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </div>

        <div className="g2">
          <div className="card">
            <div className="card-hd"><span className="ico">&#127962;</span> Bill From</div>
            <div className="fld"><label>Business Name</label><input value={form.from_name} onChange={e => setF('from_name', e.target.value)} /></div>
            <div className="fld"><label>Address</label><textarea rows={2} value={form.from_addr} onChange={e => setF('from_addr', e.target.value)} /></div>
            <div className="fld"><label>Email</label><input type="email" value={form.from_email} onChange={e => setF('from_email', e.target.value)} /></div>
            <div className="fld"><label>Phone</label><input type="tel" value={form.from_phone} onChange={e => setF('from_phone', e.target.value)} /></div>
          </div>
          <div className="card">
            <div className="card-hd"><span className="ico">&#128100;</span> Bill To (Client)</div>
            <div className="fld"><label>Client / Company</label><input value={form.to_name} onChange={e => setF('to_name', e.target.value)} placeholder="Client Name" /></div>
            <div className="fld"><label>Address</label><textarea rows={2} value={form.to_addr} onChange={e => setF('to_addr', e.target.value)} /></div>
            <div className="fld"><label>Email</label><input type="email" value={form.to_email} onChange={e => setF('to_email', e.target.value)} /></div>
            <div className="fld"><label>Phone</label><input type="tel" value={form.to_phone} onChange={e => setF('to_phone', e.target.value)} /></div>
          </div>
        </div>

        <div className="card">
          <div className="card-hd"><span className="ico">&#9997;&#65039;</span> Line Items</div>
          <div className="li-hdr"><span>Description</span><span>Qty</span><span>Rate ($)</span><span>Amount</span><span></span></div>
          {form.lines.map((line, i) => (
            <div className="li-row" key={i}>
              <input placeholder="Description..." value={line.d} onChange={e => setLine(i, 'd', e.target.value)} />
              <input type="number" value={line.q} min="0" step="any" style={{ textAlign:'center' }} onChange={e => setLine(i, 'q', e.target.value)} />
              <input type="number" value={line.r} min="0" step="0.01" placeholder="0.00" onChange={e => setLine(i, 'r', e.target.value)} />
              <div className="li-tot">${((parseFloat(line.q)||0)*(parseFloat(line.r)||0)).toFixed(2)}</div>
              <button className="li-rm" onClick={() => removeLine(i)}>&times;</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={addLine}>+ Add Item</button>
        </div>

        <div className="card">
          <div className="g2" style={{ alignItems: 'flex-start' }}>
            <div className="fld"><label>Notes / Payment Terms</label><textarea value={form.notes} onChange={e => setF('notes', e.target.value)} /></div>
            <div>
              <div className="tot-box">
                <div className="tot-row">
                  <span className="tot-lbl">Total Due</span>
                  <span className="tot-val">${calcTotal(form.lines).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SETTINGS */}
      <div className={`page${tab === 'settings' ? ' active' : ''}`}>
        <div className="ph">Settings &amp; Info</div>
        <div className="psub">MRM Web Solutions Invoice System</div>
        <div className="card">
          <div className="card-hd"><span className="ico">&#9889;</span> Active Features</div>
          <div className="feature-list">
            <div className="feature-item">&#128274; <strong>Password Protection</strong> — Browser login required to access this app</div>
            <div className="feature-item">&#128231; <strong>Email Invoices</strong> — Send now or schedule for a future date via Resend</div>
            <div className="feature-item">&#10697; <strong>Duplicate Invoice</strong> — Clone any invoice; service dates auto-advance 1 month</div>
            <div className="feature-item">&#128308; <strong>Overdue Detection</strong> — Past-due unpaid invoices highlighted automatically</div>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="ico">&#128202;</span> Database Summary</div>
          <div className="stats" style={{ marginBottom: 0 }}>
            <div className="stat"><div className="stat-lbl">Total Invoices</div><div className="stat-val">{invoices.length}</div></div>
            <div className="stat"><div className="stat-lbl">Total Billed</div><div className="stat-val c-or">${totalBilled.toFixed(2)}</div></div>
            <div className="stat"><div className="stat-lbl">Collected</div><div className="stat-val c-gr">${totalPaid.toFixed(2)}</div></div>
            <div className="stat"><div className="stat-lbl">Outstanding</div><div className="stat-val c-rd">${totalUnpaid.toFixed(2)}</div></div>
          </div>
        </div>
      </div>

      {/* SCHEDULED PAGE */}
      <div className={`page${tab === 'scheduled' ? ' active' : ''}`}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
          <div><div className="ph">Scheduled Emails</div><div className="psub">Emails queued to send automatically</div></div>
          <button className="btn btn-ghost btn-sm" onClick={fetchScheduled}>&#8635; Refresh</button>
        </div>
        {schedLoading ? (
          <div className="loading">Loading...</div>
        ) : scheduled.length === 0 ? (
          <div className="empty">
            <div className="eico">&#128197;</div>
            <h3>No scheduled emails</h3>
            <p>When you schedule an invoice email, it will appear here.</p>
          </div>
        ) : (
          <div className="inv-list">
            {scheduled.map(job => (
              <div className="inv-row" key={job.id} style={{gridTemplateColumns:'1fr 1fr 140px 100px auto'}}>
                <div>
                  <div className="inv-cli">{job.recipient_name || job.recipient_email}</div>
                  <div className="inv-sub">{job.recipient_email}</div>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>{job.invoice_num || 'Invoice'}</div>
                  <div className="inv-sub">Invoice amount: ${parseFloat(job.invoice_total||0).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:2}}>Sends on</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--text)'}}>
                    {new Date(job.scheduled_for).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                  </div>
                  <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--orange)'}}>
                    {new Date(job.scheduled_for).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
                <span className={`badge${job.status==='sent'?' b-paid':job.status==='failed'?' b-unpaid':' b-draft'}`}>
                  {job.status}
                </span>
                <div className="inv-acts">
                  {job.status === 'pending' && (
                    <button className="btn btn-danger btn-sm" title="Cancel" onClick={() => cancelScheduled(job.id)}>&#10005; Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PREVIEW OVERLAY */}
      {preview && (
        <div className="overlay active">
          <div className="ov-bar">
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>&#10005; Close</button>
            <button className="btn btn-ghost" onClick={() => { setEmailInv(preview); setPreview(null) }}>&#128231; Email</button>
            <button className="btn btn-red"   onClick={doPrint}>&#128424; Print / Save PDF</button>
          </div>
          <div id="preview-doc"><InvoiceDoc inv={preview} /></div>
        </div>
      )}
    </>
  )
}
