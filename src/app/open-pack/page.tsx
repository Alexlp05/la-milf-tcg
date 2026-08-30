'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './open-pack.module.css';
import CardFrame, { CardData, CardRarity, RevealPhase } from '@/components/card/CardFrame';

interface PulledCard {
  instanceId: string;
  card: CardData & { loreAlbum: string };
  rarity: CardRarity;
  mintNumber?: number;
  maxMint?: number;
  dustValue: number;
}
interface BoosterPack { id: string; packType: 'STANDARD' | 'PREMIUM' | 'WELCOME'; }

type PackState = 'SELECTING' | 'TEARING' | 'PILE' | 'FINISHED';

export default function OpenPackPage() {
  const router = useRouter();
  const [packState, setPackState] = useState<PackState>('SELECTING');
  const [packs, setPacks] = useState<BoosterPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pulledCards, setPulledCards] = useState<PulledCard[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([false,false,false]);
  const [phases, setPhases] = useState<RevealPhase[]>(['NONE','NONE','NONE']);
  const [active, setActive] = useState<number>(0);
  const [selectedFinished, setSelectedFinished] = useState<PulledCard | null>(null);

  useEffect(() => {
    fetch('/api/boosters/open').then(r=>r.json()).then(d=> setPacks(d.packs||[])).catch(()=>{});
  }, []);

  const handleOpenPack = async () => {
    if (!selectedPackId || packState!=='SELECTING') return;
    setLoading(true); setError(null); setPackState('TEARING');
    try {
      const r = await fetch('/api/boosters/open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({packId:selectedPackId})});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error||'Erreur');
      setPulledCards(d.cards);
      setFlipped(Array(d.cards.length).fill(false)); setPhases(Array(d.cards.length).fill('NONE')); setActive(0); setSelectedFinished(null);
      setTimeout(()=> setPackState('PILE'), 1100);
    } catch(e:any){ setError(e.message); setPackState('SELECTING'); }
    finally{ setLoading(false); }
  };

  // 1-tap : flip -> C, reste affiché jusqu'au tap suivant (contemplation ultra)
  const handlePileTap = () => {
    if (packState!=='PILE') return;
    const idx = active;
    if (phases[idx]==='C') {
      if (idx < pulledCards.length-1) setActive(idx+1);
      else setPackState('FINISHED');
      return;
    }
    if (!flipped[idx]) {
      const nf=[...flipped]; nf[idx]=true; setFlipped(nf);
      const np=[...phases]; np[idx]='C'; setPhases(np);
      // reste sur la carte jusqu'au prochain tap (pas d'auto)
    }
  };

  const packLabels: Record<string,string> = { STANDARD:'Standard', PREMIUM:'Premium', WELCOME:'Bienvenue' };

  return (
    <main className={styles.openPackPage}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={()=>router.push('/')}>←</button>
        <div className={styles.headerTitle}>Ouvrir un Booster</div>
      </header>

      <div className={styles.stage} onClick={packState==='PILE' ? handlePileTap : undefined}>
        {/* Background immersif par rareté - ne s'affiche qu'une fois révélé, ne spoil pas avant */}
        {packState==='PILE' && flipped[active] && phases[active]==='C' && (
          <div className={`${styles.rarityBg} ${styles['bg'+pulledCards[active].rarity]}`} key={active} />
        )}
        <div className={styles.spotlight} />

        {packState==='SELECTING' && (
          <div className={styles.packSelection}>
            <h2 className={styles.selectionTitle}>Choisis ton booster</h2>
            {error && <div className={styles.error}>{error}</div>}
            {packs.length===0 ? <div className={styles.emptyState}><p>Aucun booster disponible.</p><p className={styles.emptySub}>Demande à un admin via /admin</p></div> : (
              <div className={styles.packList}>
                {packs.map(p=>{
                  const typeClass = p.packType==='PREMIUM' ? styles.packPremium : p.packType==='WELCOME' ? styles.packWelcome : '';
                  const meta = p.packType==='PREMIUM' ? '2 cartes • min ULTRA' : p.packType==='WELCOME' ? '3 cartes • offert' : '3 cartes • 70% RARE';
                  const icon = p.packType==='PREMIUM' ? '👑' : p.packType==='WELCOME' ? '🎁' : '📦';
                  return (
                    <button key={p.id} className={`${styles.packOption} ${typeClass} ${selectedPackId===p.id?styles.selected:''}`} onClick={()=>setSelectedPackId(p.id)} disabled={loading}>
                      <div className={styles.optionIcon}>{icon}</div>
                      <div className={styles.optionInfo}><div className={styles.optionTitle}>{packLabels[p.packType]}</div><div className={styles.optionId}>#{p.id.slice(0,8)}</div><div className={styles.optionMeta}>{meta}</div></div>
                      {selectedPackId===p.id ? <div className={styles.checkmark}>✓</div> : <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.2)',padding:'4px 10px',borderRadius:999}}>Choisir</div>}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedPackId && <button className={styles.openBtn} onClick={handleOpenPack} disabled={loading}>{loading?'Ouverture...':'Ouvrir ce booster'}</button>}
          </div>
        )}

        {packState==='TEARING' && (
          <div className={`${styles.packContainer} ${styles.packTearing}`}>
            <div className={styles.boosterPack}><div className={styles.packLogo}>🃏</div><div className={styles.packTitle}>{selectedPackId ? packLabels[packs.find(p=>p.id===selectedPackId)?.packType || 'STANDARD'] : 'Standard'}</div><div className={styles.packInstruction}>Ouverture...</div></div>
          </div>
        )}

        {packState==='PILE' && (
          <>
            <div className={styles.pileContainer}>
              {pulledCards.map((pull,i)=>{
                const isActive = i===active;
                const isDone = phases[i]==='C';
                const isBehind = i < active;
                // pile offsets
                const offset = isBehind ? (active - i)*14 : 0;
                return (
                  <div
                    key={pull.instanceId}
                    className={`${styles.pileCard} ${isActive?styles.pileActive:''} ${isDone?styles.pileDone:''} ${isBehind?styles.pileBehind:''}`}
                    style={{
                      zIndex: isActive ? 20 : 10 - i,
                      transform: isBehind
                        ? `translateX(${-offset*8}px) translateY(${offset*2}px) rotate(${-4+ i*2}deg) scale(0.92)`
                        : isActive
                          ? `translate(-50%,-50%) scale(1.06)`
                          : `translate(-50%,-50%) translateX(${ (i-active)*18}px) rotate(${(i-active)*4}deg)`,
                      opacity: isBehind ? 0.85 : 1,
                    }}
                    onClick={e=>{ e.stopPropagation(); if(isActive) handlePileTap(); }}
                  >
                    <CardFrame
                      card={pull.card}
                      rarity={pull.rarity}
                      mintNumber={pull.mintNumber}
                      maxMint={pull.maxMint}
                      isFlipped={flipped[i]}
                      revealPhase={phases[i]}
                      onClick={isActive ? handlePileTap : undefined}
                    />
                    {isActive && flipped[i] && (
                      <div style={{position:'absolute',bottom:-10,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(6px)',color:'white',padding:'4px 10px',borderRadius:999,fontSize:'0.7rem',fontWeight:700,border:'1px solid rgba(255,255,255,0.15)',whiteSpace:'nowrap'}}>
                        {pull.rarity.replace('_',' ')} {pull.mintNumber ? `#${String(pull.mintNumber).padStart(2,'0')}/${pull.maxMint}` : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className={styles.tapHint}>
              { !flipped[active] ? 'Tape pour révéler →' : phases[active]==='C' && active < pulledCards.length-1 ? 'Carte suivante →' : phases[active]==='C' ? 'Dernière ! Tape pour terminer' : '...'}
            </div>
          </>
        )}

        {packState==='FINISHED' && (
          <>
            <div className={styles.finishedGrid}>
              {pulledCards.map(p=>(
                <div key={p.instanceId} className={styles.finishedCard} onClick={()=>setSelectedFinished(p)} style={{cursor:'pointer'}}>
                  <CardFrame card={p.card} rarity={p.rarity} mintNumber={p.mintNumber} maxMint={p.maxMint} isFlipped revealPhase="C" size="small" />
                </div>
              ))}
            </div>
            {selectedFinished && (
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}} onClick={()=>setSelectedFinished(null)}>
                <div onClick={e=>e.stopPropagation()} style={{display:'flex',gap:16,background:'var(--color-bg-primary)',borderRadius:16,padding:16,maxWidth:760,width:'100%',maxHeight:'90vh',overflow:'auto'}}>
                  <div style={{flex:1,display:'flex',justifyContent:'center'}}><CardFrame card={selectedFinished.card} rarity={selectedFinished.rarity} mintNumber={selectedFinished.mintNumber} maxMint={selectedFinished.maxMint} size="large" isFlipped revealPhase="C" /></div>
                  <div style={{flex:1,padding:12}}>
                    <div style={{fontSize:'0.75rem',fontWeight:700,background: selectedFinished.rarity==='GOLD'?'#daa520':selectedFinished.rarity==='SHINY'?'#c9a84c':selectedFinished.rarity==='ULTRA_RARE'?'#9b59b6':'#888',color:'white',display:'inline-block',padding:'4px 8px',borderRadius:999}}>{selectedFinished.rarity}</div>
                    <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.6rem',marginTop:8}}>{selectedFinished.card.name}</h2>
                    <p style={{color:'var(--color-text-secondary)',fontStyle:'italic'}}>{selectedFinished.card.title} — {selectedFinished.card.id}</p>
                    <p style={{marginTop:12,fontSize:'0.9rem'}}>{selectedFinished.card.actionDescription} <strong>({selectedFinished.card.actionValue})</strong></p>
                    <div style={{marginTop:12,background:'white',padding:12,borderRadius:8,border:'1px solid rgba(201,168,76,0.15)'}}><div style={{fontSize:'0.75rem',fontWeight:700,color:'var(--color-accent-gold-dark)'}}>📜 Lore</div><div style={{fontSize:'0.9rem',marginTop:4}}>{selectedFinished.card.loreAlbum}</div></div>
                    <button onClick={()=>setSelectedFinished(null)} style={{marginTop:12,padding:'8px 16px',borderRadius:999,border:'1px solid #ddd',background:'white',cursor:'pointer'}}>Fermer</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.controls}>
        {packState==='FINISHED' && <button className={styles.finishBtn} onClick={()=>router.push('/collection')}>Voir la collection</button>}
        {packState==='PILE' && <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.5)'}}>{active+1} / {pulledCards.length}</div>}
      </div>
    </main>
  );
}
