// pages/invoice/[id].js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

function fmtDate(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${m}/${d}/${y}`
}

export default function InvoicePage() {
  const router = useRouter()
  const { id } = router.query
  const [inv, setInv] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    fetch(`/api/invoices?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (!data || data.error) setError('Invoice not found.')
        else setInv(data)
      })
      .catch(() => setError('Could not load invoice.'))
  }, [id])

  if (error) return (
    <div style={{background:'#fff',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Helvetica,sans-serif',color:'#555',textAlign:'center'}}>
      <div><div style={{fontSize:48,marginBottom:16}}>📄</div><h2>Invoice Not Found</h2></div>
    </div>
  )

  if (!inv) return (
    <div style={{background:'#fff',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Helvetica,sans-serif',color:'#555'}}>
      Loading invoice...
    </div>
  )

  const fa = (inv.from_addr||'').replace(/\n/g,'<br>')
  const ta = (inv.to_addr||'').replace(/\n/g,'<br>')

  return (
    <>
      {/* Force white background — must be first element rendered */}
      <style dangerouslySetInnerHTML={{__html: `
        html, body { background: #f0f2f5 !important; background-color: #f0f2f5 !important; color: #1a1a1a !important; }
        @media print { html, body { background: #ffffff !important; background-color: #ffffff !important; } }
      `}} />
      <Head>
        <title>Invoice {inv.num ? '#'+inv.num : ''} — MRM Web Solutions</title>
        <meta name="robots" content="noindex" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          html { background: #f0f2f5 !important; }
          body { background: #f0f2f5 !important; background-color: #f0f2f5 !important; color: #1a1a1a !important; }
          @media print {
            html, body { background: #ffffff !important; background-color: #ffffff !important; }
          }
        `}</style>
      </Head>

      <div className="print-bar">
        <span className="print-bar-text">
          <strong>Invoice {inv.num ? '#'+inv.num : ''}</strong>
          {inv.to_name && ` — ${inv.to_name}`}
        </span>
        <button className="print-btn" onClick={() => window.print()}>
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div className="inv-wrap">
        <div className="inv-doc">

          {inv.status === 'paid'   && <div className="d-stamp paid">PAID</div>}
          {inv.status === 'unpaid' && <div className="d-stamp unpaid">UNPAID</div>}

          <div className="d-hdr">
            <div>
              <img className="d-logo" src="/logo.jpg" alt="MRM Web Solutions" />
              <div className="d-from" dangerouslySetInnerHTML={{__html:(fa?fa+'<br>':'')+(inv.from_email||'')+(inv.from_phone?' · '+inv.from_phone:'')}} />
            </div>
            <div className="d-ibox">
              <h2>INVOICE</h2>
              <div className="d-meta">
                {inv.num && <><strong>#{inv.num}</strong><br/></>}
                Date: {inv.date}<br/>Due: {inv.due}
              </div>
            </div>
          </div>

          <div className="d-divider" />

          {(inv.sf||inv.st) && (
            <div className="d-svc">
              For Services Rendered: {inv.sf?fmtDate(inv.sf):''}{inv.st?' – '+fmtDate(inv.st):''}
            </div>
          )}

          <div className="d-parties">
            <div className="d-party">
              <div className="d-plbl">Bill From</div>
              <div className="d-pname">{inv.from_name}</div>
              <div className="d-pdet" dangerouslySetInnerHTML={{__html:fa}} />
            </div>
            <div className="d-party">
              <div className="d-plbl">Bill To</div>
              <div className="d-pname">{inv.to_name}</div>
              <div className="d-pdet" dangerouslySetInnerHTML={{__html:ta+(inv.to_email?'<br>'+inv.to_email:'')+(inv.to_phone?'<br>'+inv.to_phone:'')}} />
            </div>
          </div>

          <table className="d-table">
            <thead>
              <tr className="d-thead-row">
                <th className="d-th">Description</th>
                <th className="d-th-r">Qty</th>
                <th className="d-th-r">Rate</th>
                <th className="d-th-r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(inv.lines||[]).map((l,i) => {
                const q=parseFloat(l.q)||0, r=parseFloat(l.r)||0
                return (
                  <tr key={i} className={i%2===1?'d-row-even':''}>
                    <td className="d-td">{l.d||'—'}</td>
                    <td className="d-td-r">{q}</td>
                    <td className="d-td-r">${r.toFixed(2)}</td>
                    <td className="d-td-rb">${(q*r).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="d-totals">
            <div className="d-tbox">
              <span className="d-tl">Total Due</span>
              <span className="d-tv">${(inv.total||0).toFixed(2)}</span>
            </div>
          </div>

          {inv.notes && (
            <div className="d-notes">
              <strong>Notes / Payment Terms:</strong><br/>
              <span dangerouslySetInnerHTML={{__html:inv.notes.replace(/\n/g,'<br>')}} />
            </div>
          )}

          <div className="d-footer">
            <div className="checks">Make all checks payable to MRM WEB SOLUTIONS</div>
            <div className="contact">
              If you have any questions, contact <b>Rajnish Kumar</b>
              &nbsp;|&nbsp; 757-358-5249 &nbsp;|&nbsp;
              <a href="mailto:rkumar@mrmwebsolutions.com">rkumar@mrmwebsolutions.com</a>
            </div>
            <div className="ty">★ Thank You For Your Business! ★</div>
          </div>
        </div>
      </div>
    </>
  )
}
