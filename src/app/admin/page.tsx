'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './admin.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'PENDING' | 'APPROVED' | 'BANNED';
  role: 'PLAYER' | 'ADMIN';
  dustBalance: number;
  _count: { cards: number; boosters: number };
  createdAt: string;
  approvedAt: string | null;
}

interface CardRow {
  card: {
    id: string; name: string; title: string; type: string; overallScore: number;
    illustrationUrl: string | null; iconUrl: string | null;
    actionDescription: string; actionValue: number; loreAlbum: string;
  };
  scarcity: { rarity: string; maxSupply: number | null; currentSupply: number; remaining: number | null }[];
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'users' | 'cards'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [totals, setTotals] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sendPack, setSendPack] = useState<{ userId: string | 'all'; type: 'STANDARD' | 'PREMIUM' | 'WELCOME'; count: number } | null>(null);
  const [editingCard, setEditingCard] = useState<CardRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({ id:'', name:'', title:'', type:'PERSONNAGE', overallScore:50, illustrationUrl:'', iconUrl:'', actionDescription:'', actionValue:0, loreAlbum:'', scarcity:{ COMMUNE:'', RARE:'', ULTRA_RARE:20, SHINY:3, GOLD:1 } });

  if (status === 'loading') return <div className={styles.loading}>Chargement...</div>;
  if (!session || (session.user as any).role !== 'ADMIN') {
    return (
      <div style={{textAlign: 'center', padding: '100px 20px'}}>
        <h2>Accès Refusé</h2>
        <p>Tu n'es pas administrateur.</p>
        <button className="btn btn-primary" onClick={() => router.push('/')} style={{marginTop: '20px'}}>Retour à l'accueil</button>
      </div>
    );
  }

  useEffect(() => { fetchUsers(); fetchCards(); fetchConfig(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try { const r = await fetch('/api/admin/users'); const d = await r.json(); if (r.ok) setUsers(d.users||[]); } catch{} finally{ setLoading(false); }
  };
  const fetchCards = async () => {
    const r = await fetch('/api/admin/cards'); const d = await r.json(); if (r.ok){ setCards(d.cards||[]); setTotals(d.totals||[]); }
  };
  const fetchConfig = async () => {
    const r = await fetch('/api/admin/config'); const d = await r.json(); if (r.ok) setConfig(d);
  };

  const handleUserAction = async (userId: string, action: 'approve'|'ban'|'unban') => {
    setActionLoading(userId);
    const updates: any = {};
    if (action==='approve') updates.status='APPROVED';
    if (action==='ban') updates.status='BANNED';
    if (action==='unban') updates.status='APPROVED';
    const r = await fetch('/api/admin/users',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,...updates})});
    if (r.ok) await fetchUsers();
    setActionLoading(null);
  };

  const handleSendPack = async (userId: string|'all') => {
    if (!sendPack) return;
    setActionLoading('sendpack');
    const r = await fetch('/api/admin/boosters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:userId==='all'?undefined:userId, allUsers:userId==='all', packType:sendPack.type, count:sendPack.count})});
    if (r.ok){ await fetchUsers(); setSendPack(null); alert(`${sendPack.count} booster(s) envoyé(s) !`);} else { const e=await r.json(); alert(e.error); }
    setActionLoading(null);
  };

  const openCreate = () => {
    setForm({ id:`card_${String(cards.length+1).padStart(3,'0')}`, name:'', title:'', type:'PERSONNAGE', overallScore:50, illustrationUrl:'', iconUrl:'', actionDescription:'', actionValue:0, loreAlbum:'', scarcity:{ COMMUNE:'', RARE:'', ULTRA_RARE:20, SHINY:3, GOLD:1 }});
    setEditingCard(null); setShowCreate(true);
  };
  const openEdit = (row: CardRow) => {
    const sc: any = {}; row.scarcity.forEach(s=> sc[s.rarity]= s.maxSupply===null? '' : s.maxSupply);
    setForm({ id:row.card.id, name:row.card.name, title:row.card.title, type:row.card.type, overallScore:row.card.overallScore, illustrationUrl:row.card.illustrationUrl||'', iconUrl:row.card.iconUrl||'', actionDescription:row.card.actionDescription, actionValue:row.card.actionValue, loreAlbum:row.card.loreAlbum, scarcity:sc });
    setEditingCard(row); setShowCreate(true);
  };
  const submitCard = async () => {
    const payload: any = {
      id: form.id, name:form.name, title:form.title, type:form.type, overallScore:Number(form.overallScore),
      illustrationUrl: form.illustrationUrl||null, iconUrl: form.iconUrl||null,
      actionDescription: form.actionDescription, actionValue: Number(form.actionValue), loreAlbum: form.loreAlbum,
      scarcity: {}
    };
    for (const k of ['COMMUNE','RARE','ULTRA_RARE','SHINY','GOLD']){
      const v = form.scarcity[k];
      payload.scarcity[k] = v===''||v===null ? null : Number(v);
    }
    const method = editingCard ? 'PATCH' : 'POST';
    const body = editingCard ? { id: form.id, fields: { name:form.name, title:form.title, type:form.type, overallScore:Number(form.overallScore), illustrationUrl:form.illustrationUrl||null, iconUrl:form.iconUrl||null, actionDescription:form.actionDescription, actionValue:Number(form.actionValue), loreAlbum:form.loreAlbum }, scarcity: payload.scarcity } : payload;
    const r = await fetch('/api/admin/cards',{method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    const d = await r.json();
    if (!r.ok) alert(d.error||'Erreur'); else { setShowCreate(false); fetchCards(); }
  };
  const deleteCard = async (id: string) => {
    if (!confirm(`Supprimer ${id} ?`)) return;
    const r = await fetch(`/api/admin/cards?id=${id}`,{method:'DELETE'});
    const d = await r.json();
    if (!r.ok) alert(d.error); else fetchCards();
  };
  const saveConfig = async () => {
    if (!config) return;
    const r = await fetch('/api/admin/config',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)});
    if (r.ok) alert('Config sauvegardée'); else alert('Erreur');
  };

  return (
    <main className={styles.adminPage}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>← Retour</button>
        <h1 className={styles.headerTitle}>Administration</h1>
        <span className={styles.adminBadge}>Admin</span>
      </header>

      <div className={styles.content}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab==='users'?styles.active:''}`} onClick={()=>setActiveTab('users')}>👥 Joueurs</button>
          <button className={`${styles.tab} ${activeTab==='cards'?styles.active:''}`} onClick={()=>setActiveTab('cards')}>🎴 Cartes & Stocks</button>
        </div>

        {activeTab==='users' && (
          <>
            {sendPack && (
              <div className={styles.modalOverlay} onClick={()=>setSendPack(null)}>
                <div className={styles.modalContent} onClick={e=>e.stopPropagation()}>
                  <h3>{sendPack.userId==='all'?'Envoyer à tous':'Envoyer un booster'}</h3>
                  <div className={styles.modalField}><label>Type</label><select value={sendPack.type} onChange={e=>setSendPack({...sendPack, type:e.target.value as any})}><option value="STANDARD">Standard</option><option value="PREMIUM">Premium</option><option value="WELCOME">Bienvenue</option></select></div>
                  <div className={styles.modalField}><label>Quantité</label><input type="number" min={1} max={50} value={sendPack.count} onChange={e=>setSendPack({...sendPack,count:parseInt(e.target.value)||1})}/></div>
                  <div className={styles.modalActions}><button className={styles.cancelBtn} onClick={()=>setSendPack(null)}>Annuler</button><button className={styles.confirmBtn} onClick={()=>handleSendPack(sendPack.userId)} disabled={actionLoading==='sendpack'}>{actionLoading==='sendpack'?'Envoi...':`Envoyer`}</button></div>
                </div>
              </div>
            )}
            <div className={styles.globalActions}><div className={styles.globalActionsText}><h3>Cadeau Global</h3><p>Offrir des boosters à tous les joueurs approuvés</p></div><button className={`${styles.actionBtn} ${styles.sendPackBtn}`} onClick={()=>setSendPack({userId:'all',type:'STANDARD',count:1})}>🎁 Envoyer à tous</button></div>
            {loading ? <div className={styles.loading}>Chargement...</div> : (
              <div className={styles.tableContainer}><table className={styles.table}><thead><tr><th>Joueur</th><th>Statut</th><th>Ressources</th><th>Inscrit</th><th>Actions</th></tr></thead>
                <tbody>{users.map(u=>(
                  <tr key={u.id}><td><div className={styles.userCell}><div className={styles.userAvatar}>{u.name.charAt(0)}</div><div><span className={styles.userName}>{u.name} {u.role==='ADMIN'&&'👑'}</span><span className={styles.userEmail}>{u.email}</span></div></div></td>
                    <td><span className={`${styles.statusBadge} ${u.status==='PENDING'?styles.statusPending:u.status==='APPROVED'?styles.statusApproved:styles.statusBanned}`}>{u.status}</span></td>
                    <td><div style={{fontSize:'0.85rem'}}>📦 {u._count.boosters} | ✨ {u.dustBalance}</div></td>
                    <td style={{fontSize:'0.8rem',color:'var(--color-text-muted)'}}>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td><div className={styles.actionGroup}>
                      {u.status==='PENDING' && <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={()=>handleUserAction(u.id,'approve')}>✓ Approuver</button>}
                      {u.status==='APPROVED' && u.role!=='ADMIN' && <><button className={`${styles.actionBtn} ${styles.sendPackBtn}`} onClick={()=>setSendPack({userId:u.id,type:'STANDARD',count:1})}>+1 Pack</button><button className={`${styles.actionBtn} ${styles.banBtn}`} onClick={()=>handleUserAction(u.id,'ban')}>Bannir</button></>}
                      {u.status==='BANNED' && <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={()=>handleUserAction(u.id,'unban')}>Débannir</button>}
                    </div></td></tr>
                ))}</tbody></table></div>
            )}
          </>
        )}

        {activeTab==='cards' && (
          <>
            <div className={styles.globalActions} style={{flexDirection:'column', alignItems:'stretch', gap:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h3>📊 Stocks globaux</h3><button className={`${styles.actionBtn} ${styles.sendPackBtn}`} onClick={openCreate}>+ Nouvelle carte</button></div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {totals.map((t:any)=>(
                  <div key={t.rarity} style={{background:'white',padding:'10px 14px',borderRadius:8,border:'1px solid #eee',flex:1,minWidth:120}}>
                    <div style={{fontSize:'0.75rem',color:'#888'}}>{t.rarity}</div>
                    <div style={{fontWeight:700}}>{t._sum.currentSupply} / {t._sum.maxSupply ?? '∞'}</div>
                    <div style={{fontSize:'0.7rem',color: t._sum.maxSupply && t._sum.currentSupply>=t._sum.maxSupply ? 'red' : '#2d6b45'}}>
                      {t._sum.maxSupply===null?'illimité':`${(t._sum.maxSupply - t._sum.currentSupply)} restants`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface" style={{padding:16, marginBottom:16}}>
              <h3 style={{marginBottom:8}}>🎲 Drop rates (modifiable)</h3>
              {!config ? <div>Chargement...</div> : (
                <>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div><label style={{fontSize:'0.8rem'}}>Slots 1-2 (COMMUNE/RARE)</label>
                      <div style={{display:'flex',gap:8,marginTop:4}}>
                        <input type="number" value={config.SLOT_1_2_WEIGHTS?.COMMUNE ?? 90} onChange={e=>setConfig({...config, SLOT_1_2_WEIGHTS:{...config.SLOT_1_2_WEIGHTS, COMMUNE:Number(e.target.value)}})} style={{width:80,padding:6,border:'1px solid #ddd',borderRadius:6}}/> COMMUNE
                        <input type="number" value={config.SLOT_1_2_WEIGHTS?.RARE ?? 10} onChange={e=>setConfig({...config, SLOT_1_2_WEIGHTS:{...config.SLOT_1_2_WEIGHTS, RARE:Number(e.target.value)}})} style={{width:80,padding:6,border:'1px solid #ddd',borderRadius:6}}/> RARE
                      </div>
                    </div>
                    <div><label style={{fontSize:'0.8rem'}}>Hit (RARE/ULTRA/SHINY/GOLD)</label>
                      <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                        {['RARE','ULTRA_RARE','SHINY','GOLD'].map(k=>(
                          <label key={k} style={{fontSize:'0.75rem'}}>{k}<input type="number" value={config.SLOT_3_WEIGHTS?.[k] ?? 0} onChange={e=>setConfig({...config, SLOT_3_WEIGHTS:{...config.SLOT_3_WEIGHTS,[k]:Number(e.target.value)}})} style={{width:60,padding:6,border:'1px solid #ddd',borderRadius:6,marginLeft:4}}/></label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{marginTop:12}}><label style={{fontSize:'0.8rem'}}>Dust values</label>
                    <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                      {['COMMUNE','RARE','ULTRA_RARE','SHINY','GOLD'].map(k=>(
                        <label key={k} style={{fontSize:'0.75rem'}}>{k}<input type="number" value={config.DUST_VALUES?.[k] ?? 0} onChange={e=>setConfig({...config, DUST_VALUES:{...config.DUST_VALUES,[k]:Number(e.target.value)}})} style={{width:60,padding:6,border:'1px solid #ddd',borderRadius:6,marginLeft:4}}/></label>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{marginTop:12,padding:'8px 16px'}} onClick={saveConfig}>Sauvegarder drops</button>
                </>
              )}
            </div>

            <div className={styles.tableContainer}><table className={styles.table}><thead><tr><th>Carte</th><th>Type / Score</th><th>Lore</th><th>Stocks (restants)</th><th>Actions</th></tr></thead>
              <tbody>{cards.map(row=>(
                <tr key={row.card.id}>
                  <td><div style={{fontWeight:600}}>{row.card.name}</div><div style={{fontSize:'0.75rem',color:'#888'}}>{row.card.id} — {row.card.title}</div>{row.card.illustrationUrl && <img src={row.card.illustrationUrl} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:4,marginTop:4}}/>}</td>
                  <td><span className="badge" style={{fontSize:'0.7rem'}}>{row.card.type}</span><div style={{marginTop:4}}>Score {row.card.overallScore}</div></td>
                  <td style={{maxWidth:220,fontSize:'0.8rem'}}><div style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{row.card.loreAlbum}</div><div style={{color:'#888'}}>{row.card.actionDescription} ({row.card.actionValue})</div></td>
                  <td style={{fontSize:'0.75rem'}}>{row.scarcity.map(s=>(
                    <div key={s.rarity} style={{display:'flex',gap:6,justifyContent:'space-between',color: s.maxSupply!==null && s.remaining===0 ? 'red' : '#333'}}>
                      <span>{s.rarity}</span><span>{s.currentSupply}/{s.maxSupply??'∞'} {s.remaining!==null && `(${s.remaining})`}</span>
                    </div>
                  ))}</td>
                  <td><div className={styles.actionGroup}><button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={()=>openEdit(row)}>Éditer</button><button className={`${styles.actionBtn} ${styles.banBtn}`} onClick={()=>deleteCard(row.card.id)}>Suppr</button></div></td>
                </tr>
              ))}</tbody></table></div>

            {showCreate && (
              <div className={styles.modalOverlay} onClick={()=>setShowCreate(false)}>
                <div className={styles.modalContent} onClick={e=>e.stopPropagation()} style={{maxWidth:600, maxHeight:'90vh', overflowY:'auto'}}>
                  <h3>{editingCard?'Éditer':'Nouvelle'} carte</h3>
                  <div style={{display:'grid',gap:8,marginTop:12}}>
                    <input placeholder="ID (card_009)" value={form.id} onChange={e=>setForm({...form,id:e.target.value})} disabled={!!editingCard} style={{padding:8,border:'1px solid #ddd',borderRadius:6}}/>
                    <input placeholder="Nom" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{padding:8,border:'1px solid #ddd',borderRadius:6}}/>
                    <input placeholder="Titre" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{padding:8,border:'1px solid #ddd',borderRadius:6}}/>
                    <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{padding:8,border:'1px solid #ddd',borderRadius:6}}><option>PERSONNAGE</option><option>OBJET</option><option>LIEU</option><option>SOUVENIR</option><option>REFERENCE</option></select>
                    <input type="number" placeholder="Score 0-100" value={form.overallScore} onChange={e=>setForm({...form,overallScore:e.target.value})} style={{padding:8,border:'1px solid #ddd',borderRadius:6}}/>
                    <input placeholder="Illustration URL" value={form.illustrationUrl} onChange={e=>setForm({...form,illustrationUrl:e.target.value})} style={{padding:8,border:'1px solid #ddd',borderRadius:6}}/>
                    {/* iconUrl gardé pour compat mais caché - non utilisé visuellement */}
                    <input placeholder="Action description" value={form.actionDescription} onChange={e=>setForm({...form,actionDescription:e.target.value})} style={{padding:8,border:'1px solid #ddd',borderRadius:6}}/>
                    <input type="number" placeholder="Action value" value={form.actionValue} onChange={e=>setForm({...form,actionValue:e.target.value})} style={{padding:8,border:'1px solid #ddd',borderRadius:6}}/>
                    <textarea placeholder="Lore album" value={form.loreAlbum} onChange={e=>setForm({...form,loreAlbum:e.target.value})} style={{padding:8,border:'1px solid #ddd',borderRadius:6,minHeight:60}}/>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {['COMMUNE','RARE','ULTRA_RARE','SHINY','GOLD'].map(k=>(
                        <label key={k} style={{fontSize:'0.8rem'}}>{k} maxSupply (vide=∞)<input placeholder="vide=∞" value={form.scarcity[k]} onChange={e=>setForm({...form, scarcity:{...form.scarcity,[k]:e.target.value}})} style={{width:'100%',padding:6,border:'1px solid #ddd',borderRadius:6,marginTop:2}}/></label>
                      ))}
                    </div>
                  </div>
                  <div className={styles.modalActions} style={{marginTop:12}}><button className={styles.cancelBtn} onClick={()=>setShowCreate(false)}>Annuler</button><button className={styles.confirmBtn} onClick={submitCard}>{editingCard?'Sauvegarder':'Créer'}</button></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
