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
    fetch(`/api/invoice?id=${id}`)
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
      <Head>
        <title>Invoice {inv.num ? '#'+inv.num : ''} — MRM Web Solutions</title>
        <meta name="robots" content="noindex" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { background: #f0f2f5; color: #1a1a1a; font-family: 'Montserrat', Helvetica, Arial, sans-serif; font-size: 15px; }
          .pbar { background: #1a2540; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
          .pbtn { background: linear-gradient(135deg,#e8410a,#f07030); color: #fff; border: none; border-radius: 7px; padding: 10px 22px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
          .wrap { padding: 32px 16px 64px; }
          .doc { width: 760px; max-width: 100%; background: #fff; margin: 0 auto; padding: 50px 54px 44px; position: relative; box-shadow: 0 4px 24px rgba(0,0,0,.12); border-radius: 6px; line-height: 1.5; color: #1a1a1a; }
          .dh { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
          .dlogo { height: 62px; display: block; }
          .dfrom { margin-top: 10px; font-size: 13px; color: #666; line-height: 1.75; }
          .dibox { text-align: right; }
          .dibox h2 { font-size: 38px; font-weight: 800; color: #e8410a; letter-spacing: -.02em; line-height: 1; margin-bottom: 8px; }
          .dmeta { font-size: 11px; color: #555; line-height: 1.9; font-family: monospace; }
          .ddiv { height: 3px; background: linear-gradient(90deg,#e8410a,#f07030,rgba(240,112,48,0)); margin-bottom: 20px; border-radius: 2px; }
          .dsvc { background: #fff5f2; border-left: 4px solid #e8410a; padding: 9px 15px; margin-bottom: 20px; font-size: 11px; font-weight: 700; color: #c0300a; text-transform: uppercase; letter-spacing: .09em; font-family: monospace; border-radius: 0 5px 5px 0; }
          .dparties { display: flex; border: 1px solid #e5e0d8; border-radius: 7px; overflow: hidden; margin-bottom: 22px; }
          .dp { flex: 1; padding: 14px 18px; background: #fff; }
          .dp+.dp { border-left: 1px solid #e5e0d8; background: #fafaf8; }
          .dplbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; color: #e8410a; margin-bottom: 5px; }
          .dpname { font-weight: 700; font-size: 16px; color: #1a1a1a; margin-bottom: 2px; }
          .dpdet { font-size: 13px; color: #555; line-height: 1.8; }
          .dtbl { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .dtbl thead tr { background: #1a2540; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .dtbl th { padding: 10px 13px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .09em; color: #fff; text-align: left; }
          .dtbl th:nth-child(n+2) { text-align: right; }
          .dtbl td { padding: 10px 13px; font-size: 14px; color: #333; border-bottom: 1px solid #f0ece4; background: #fff; }
          .dtbl td:nth-child(n+2) { text-align: right; font-family: monospace; }
          .dtbl .dc { font-weight: 700; color: #1a1a1a; font-size: 14px; }
          .dtbl tbody tr:nth-child(even) td { background: #fafaf8; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .dtots { display: flex; justify-content: flex-end; margin-bottom: 20px; }
          .dtbox { width: 250px; border: 2px solid #1a2540; border-radius: 7px; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .dtrow { background: #1a2540; padding: 13px 16px; display: flex; justify-content: space-between; align-items: center; }
          .dtl { font-size: 13px; font-weight: 700; color: #fff; }
          .dtv { font-family: monospace; font-size: 20px; font-weight: 700; color: #f07030; }
          .dnotes { background: #fff8f5; border-left: 3px solid #e8410a; padding: 11px 15px; font-size: 13px; color: #444; line-height: 1.8; margin-bottom: 20px; border-radius: 0 5px 5px 0; }
          .dfoot { border-top: 2px solid #1a2540; padding-top: 16px; text-align: center; }
          .dfoot .chk { font-size: 14px; font-weight: 700; color: #1a2540; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 7px; }
          .dfoot .con { font-size: 13px; color: #555; line-height: 1.9; }
          .dfoot .con a { color: #e8410a; text-decoration: none; }
          .dfoot .ty { margin-top: 10px; font-size: 15px; font-weight: 800; color: #e8410a; letter-spacing: .07em; text-transform: uppercase; }
          .stamp { position: absolute; top: 58px; right: 48px; border: 4px solid; border-radius: 5px; padding: 5px 16px; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; transform: rotate(-15deg); opacity: .15; pointer-events: none; }
          .stamp.paid { border-color: #16a34a; color: #16a34a; }
          .stamp.unpaid { border-color: #dc2626; color: #dc2626; }
          @page {
            size: Letter;
            margin: 0.5in;
          }
          @media print {
            .pbar { display: none !important; }
            html, body { background: #fff !important; }
            .wrap { padding: 0 !important; background: #fff !important; }
            .doc { box-shadow: none !important; border-radius: 0 !important; width: 100% !important; padding: 24px 36px !important; font-size: 15px !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}</style>
      </Head>

      <div className="pbar">
        <span style={{color:'#8b96a8',fontSize:13}}>
          <strong style={{color:'#fff'}}>Invoice {inv.num ? '#'+inv.num : ''}</strong>
          {inv.to_name && <span> — {inv.to_name}</span>}
        </span>
        <button className="pbtn" onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
      </div>

      <div className="wrap">
        <div className="doc">
          {inv.status==='paid'   && <div className="stamp paid">PAID</div>}
          {inv.status==='unpaid' && <div className="stamp unpaid">UNPAID</div>}

          <div className="dh">
            <div>
              <img className="dlogo" src="/logo.jpg" alt="MRM Web Solutions" />
              <div className="dfrom" dangerouslySetInnerHTML={{__html:(fa?fa+'<br>':'')+(inv.from_email||'')+(inv.from_phone?' · '+inv.from_phone:'')}} />
            </div>
            <div className="dibox">
              <h2>INVOICE</h2>
              <div className="dmeta">
                {inv.num && <><strong>#{inv.num}</strong><br/></>}
                Date: {inv.date}<br/>Due: {inv.due}
              </div>
            </div>
          </div>

          <div className="ddiv" />

          {(inv.sf||inv.st) && (
            <div className="dsvc">
              For Services Rendered: {inv.sf?fmtDate(inv.sf):''}{inv.st?' – '+fmtDate(inv.st):''}
            </div>
          )}

          <div className="dparties">
            <div className="dp">
              <div className="dplbl">Bill From</div>
              <div className="dpname">{inv.from_name}</div>
              <div className="dpdet" dangerouslySetInnerHTML={{__html:fa}} />
            </div>
            <div className="dp">
              <div className="dplbl">Bill To</div>
              <div className="dpname">{inv.to_name}</div>
              <div className="dpdet" dangerouslySetInnerHTML={{__html:ta+(inv.to_email?'<br>'+inv.to_email:'')+(inv.to_phone?'<br>'+inv.to_phone:'')}} />
            </div>
          </div>

          <table className="dtbl">
            <thead><tr>
              <th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th>
            </tr></thead>
            <tbody>
              {(inv.lines||[]).map((l,i) => {
                const q=parseFloat(l.q)||0, r=parseFloat(l.r)||0
                return <tr key={i}>
                  <td className="dc">{l.d||'—'}</td>
                  <td>{q}</td>
                  <td>${r.toFixed(2)}</td>
                  <td>${(q*r).toFixed(2)}</td>
                </tr>
              })}
            </tbody>
          </table>

          <div className="dtots">
            <div className="dtbox">
              <div className="dtrow">
                <span className="dtl">Total Due</span>
                <span className="dtv">${(inv.total||0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {inv.notes && (
            <div className="dnotes">
              <strong>Notes / Payment Terms:</strong><br/>
              <span dangerouslySetInnerHTML={{__html:inv.notes.replace(/\n/g,'<br>')}} />
            </div>
          )}

          {/* ACH Payment Button */}
          <div style={{background:'#f0fff4',border:'1px solid #bbf7d0',borderRadius:8,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:'#14532d',marginBottom:4}}>🏦 Pay Online via ACH Bank Transfer</div>
              <div style={{fontSize:12,color:'#555',lineHeight:1.7}}>Fast, secure, and free — pay directly from your bank account. No credit card needed.</div>
            </div>
            <a href="https://melio.me/MRMWebSolutions" target="_blank"
              style={{display:'inline-block',background:'#16a34a',color:'#fff',textDecoration:'none',padding:'12px 22px',borderRadius:7,fontSize:13,fontWeight:700,fontFamily:'inherit',whiteSpace:'nowrap',marginLeft:20}}>
              Pay Now
            </a>
          </div>

          <div className="dfoot">
            <div className="chk">Make all checks payable to MRM WEB SOLUTIONS</div>
            <div className="con">
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
