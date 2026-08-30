'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TradesPage(){
  const router = useRouter();
  const [trades, setTrades] = useState<any[]>([]);
  const [fee, setFee] = useState(500);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'incoming'|'outgoing'|'all'>('incoming');
  const [form, setForm] = useState({ toEmail:'', offeredId:'', requestedId:'' });
  const [myCards, setMyCards] = useState<any[]>([]);

  const load = async()=>{
    const r=await fetch('/api/trades'); const d=await r.json();
    if(r.ok){ setTrades(d.trades); setFee(d.fee); }
    setLoading(false);
  };
  const loadMyCards = async()=>{
    const r=await fetch('/api/collection'); const d=await r.json();
    if(r.ok) setMyCards(d.collection||[]);
  };
  useEffect(()=>{ load(); loadMyCards(); },[]);

  const propose = async()=>{
    const r=await fetch('/api/trades',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ toEmail: form.toEmail, offeredInstanceId: form.offeredId, requestedInstanceId: form.requestedId||null })});
    const d=await r.json();
    if(!r.ok) alert(d.error); else { alert(`Offre envoyée ! Frais ${fee} poussière (brûlés à l'acceptation)`); setForm({toEmail:'',offeredId:'',requestedId:''}); load(); }
  };
  const act = async(id:string, action:string)=>{
    const r=await fetch(`/api/trades/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
    const d=await r.json();
    if(!r.ok) alert(d.error); else load();
  };

  const incoming = trades.filter(t=> t.toUserId && t.status==='PENDING' && typeof window!== 'undefined'); // filtered client side by me check via API? API returns all, we filter by status
  // Simpler: use trades where from vs to via session? We'll just show all and label
  const filtered = tab==='all' ? trades : trades.filter(t=> tab==='incoming' ? true : true); // placeholder, server already filters by me, incoming = to me pending

  return (
    <main style={{minHeight:'100dvh',background:'var(--color-bg-primary)',paddingBottom:40}}>
      <header style={{display:'flex',alignItems:'center',gap:12,padding:'16px 20px',background:'rgba(255,255,255,0.9)',borderBottom:'1px solid #eee',position:'sticky',top:0}}>
        <button onClick={()=>router.push('/')} style={{width:40,height:40,borderRadius:'50%',border:'1px solid #ddd',background:'white'}}>←</button>
        <h1 style={{flex:1,fontFamily:'var(--font-display)',fontWeight:800}}>Échanges</h1>
        <span style={{background:'linear-gradient(135deg,#c9a84c,#e8d48b)',color:'white',padding:'6px 12px',borderRadius:999,fontSize:'0.8rem',fontWeight:700}}>Frais {fee} ✨</span>
      </header>

      <div style={{maxWidth:900,margin:'0 auto',padding:16}}>
        <div style={{background:'white',borderRadius:16,padding:16,border:'1px solid #eee',marginBottom:16}}>
          <h3 style={{marginBottom:8}}>Proposer un échange</h3>
          <p style={{fontSize:'0.8rem',color:'#888',marginBottom:12}}>Tu offres une de tes cartes à un joueur (par email). Si vous convenez d'un 1-pour-1, renseigne aussi l'ID de sa carte. Le proposant paie <strong>{fee} poussière</strong> brûlée à l'acceptation — ça force à recycler.</p>
          <div style={{display:'grid',gap:8}}>
            <input placeholder="Email du destinataire" value={form.toEmail} onChange={e=>setForm({...form,toEmail:e.target.value})} style={{padding:10,border:'1px solid #ddd',borderRadius:8}}/>
            <select value={form.offeredId} onChange={e=>setForm({...form,offeredId:e.target.value})} style={{padding:10,border:'1px solid #ddd',borderRadius:8}}>
              <option value="">— Ta carte à offrir —</option>
              {myCards.map((c:any)=> <option key={c.instances[0]} value={c.instances[0]}>{c.card.name} {c.rarity} x{c.quantity} — {c.card.id}</option>)}
            </select>
            <input placeholder="ID instance demandée (optionnel, demande son instanceId)" value={form.requestedId} onChange={e=>setForm({...form,requestedId:e.target.value})} style={{padding:10,border:'1px dashed #c9a84c',borderRadius:8}}/>
            <button onClick={propose} style={{padding:12,borderRadius:10,background:'linear-gradient(135deg,#c9a84c,#8b7634)',color:'white',fontWeight:800,border:'none',cursor:'pointer'}}>Envoyer l'offre ({fee} ✨ à l'acceptation)</button>
          </div>
          <p style={{fontSize:'0.7rem',color:'#888',marginTop:8}}>Astuce : le destinataire voit tes cartes dans Admin → Voir collection pour copier son instanceId, ou demande-lui.</p>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:12}}>
          {(['all','incoming','outgoing'] as const).map(t=> <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'10px',borderRadius:999,border:'1px solid #ddd',background: tab===t?'#1a1612':'white',color:tab===t?'white':'#333',fontWeight:700}}>{t==='all'?'Tous':t==='incoming'?'Reçus':'Envoyés'}</button>)}
        </div>

        {loading ? <div style={{textAlign:'center',padding:40}}>Chargement...</div> : trades.length===0 ? <div style={{textAlign:'center',padding:40,color:'#888'}}>Aucun échange</div> : (
          <div style={{display:'grid',gap:12}}>
            {trades.map(t=>(
              <div key={t.id} style={{background:'white',borderRadius:14,padding:14,border:'1px solid #eee',display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'0.7rem',padding:'4px 8px',borderRadius:999,background: t.status==='PENDING'?'#fef3c7':t.status==='ACCEPTED'?'#d1fae5':'#fee2e2',fontWeight:700}}>{t.status}</span>
                  <span style={{fontSize:'0.7rem',color:'#888'}}>{new Date(t.createdAt).toLocaleDateString('fr-FR')} • {t.dustFee} ✨</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center'}}>
                  <div style={{background:'#f8f6f2',padding:8,borderRadius:8,textAlign:'center'}}>
                    <div style={{fontSize:'0.7rem',color:'#888'}}>Tu offres</div><div style={{fontWeight:700,fontSize:'0.85rem'}}>{t.offered ? `${t.offered.card.name} ${t.offered.pulledRarity}` : t.offeredInstanceId.slice(0,8)}</div><div style={{fontSize:'0.7rem',color:'#888'}}>{t.offered?.card.id}</div>
                  </div>
                  <div>⇄</div>
                  <div style={{background:'#f8f6f2',padding:8,borderRadius:8,textAlign:'center'}}>
                    <div style={{fontSize:'0.7rem',color:'#888'}}>Tu veux</div><div style={{fontWeight:700,fontSize:'0.85rem'}}>{t.requested ? `${t.requested.card.name} ${t.requested.pulledRarity}` : 'Don (rien)'}</div>
                  </div>
                </div>
                <div style={{fontSize:'0.7rem',color:'#888'}}>De {t.fromUserId.slice(0,8)} → à {t.toUserId.slice(0,8)}</div>
                {t.status==='PENDING' && (
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>act(t.id,'accept')} style={{flex:1,padding:'8px',borderRadius:8,background:'#10b981',color:'white',fontWeight:700,border:'none',cursor:'pointer'}}>Accepter (reçoit, donne, brûle {t.dustFee})</button>
                    <button onClick={()=>act(t.id,'reject')} style={{flex:1,padding:'8px',borderRadius:8,background:'#ef4444',color:'white',border:'none',cursor:'pointer'}}>Refuser</button>
                    <button onClick={()=>act(t.id,'cancel')} style={{padding:'8px',borderRadius:8,background:'white',border:'1px solid #ddd'}}>Annuler</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
