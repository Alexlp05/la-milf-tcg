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
  const [revealedCount, setRevealedCount] = useState(0);

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
      setFlipped([false,false,false]); setPhases(['NONE','NONE','NONE']); setActive(0); setRevealedCount(0);
      setTimeout(()=> setPackState('PILE'), 1100);
    } catch(e:any){ setError(e.message); setPackState('SELECTING'); }
    finally{ setLoading(false); }
  };

  const handleStageTap = () => {
    if (packState!=='PILE') return;
    const idx = active;
    if (idx >= pulledCards.length) return;
    if (!flipped[idx]) {
      const nf=[...flipped]; nf[idx]=true; setFlipped(nf);
      const np=[...phases]; np[idx]='A'; setPhases(np);
    } else {
      const cur = phases[idx];
      const np=[...phases];
      if (cur==='A') { np[idx]='B'; setPhases(np); }
      else if (cur==='B') {
        np[idx]='C'; setPhases(np);
        // wow background for ultra/shiny/gold
        setTimeout(()=> {
          if (revealedCount+1 >= pulledCards.length) setPackState('FINISHED');
          else { setActive(idx+1); setRevealedCount(c=>c+1); }
        }, 700);
        if (cur==='B') setRevealedCount(c=> c); // keep
      } else if (cur==='C') {
        // already revealed, go next
        if (idx+1 < pulledCards.length) { setActive(idx+1); }
      }
    }
  };

  // tap progression: A -> B -> C via same tap. Simplify: second tap goes B, third tap goes C and advances pile
  const handlePileTap = () => {
    if (packState!=='PILE') return;
    const idx = active;
    const cur = phases[idx];
    if (!flipped[idx]) {
      const nf=[...flipped]; nf[idx]=true; setFlipped(nf);
      const np=[...phases]; np[idx]='A'; setPhases(np);
    } else if (cur==='A') {
      const np=[...phases]; np[idx]='B'; setPhases(np);
    } else if (cur==='B') {
      const np=[...phases]; np[idx]='C'; setPhases(np);
      setTimeout(()=>{
        if (idx === pulledCards.length-1) setPackState('FINISHED');
        else setActive(idx+1);
      }, 650);
    } else if (cur==='C') {
      if (idx < pulledCards.length-1) setActive(idx+1);
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
        <div className={styles.spotlight} />

        {packState==='SELECTING' && (
          <div className={styles.packSelection}>
            <h2 className={styles.selectionTitle}>Choisis ton booster</h2>
            {error && <div className={styles.error}>{error}</div>}
            {packs.length===0 ? <div className={styles.emptyState}><p>Aucun booster disponible.</p><p className={styles.emptySub}>Demande à un admin via /admin</p></div> : (
              <div className={styles.packList}>
                {packs.map(p=>(
                  <button key={p.id} className={`${styles.packOption} ${selectedPackId===p.id?styles.selected:''}`} onClick={()=>setSelectedPackId(p.id)} disabled={loading}>
                    <div className={styles.optionIcon}>🃏</div>
                    <div className={styles.optionInfo}><div className={styles.optionTitle}>{packLabels[p.packType]}</div><div className={styles.optionId}>#{p.id.slice(0,8)}</div></div>
                    {selectedPackId===p.id && <div className={styles.checkmark}>✓</div>}
                  </button>
                ))}
              </div>
            )}
            {selectedPackId && <button className={styles.openBtn} onClick={handleOpenPack} disabled={loading}>{loading?'Ouverture...':'Ouvrir ce booster'}</button>}
          </div>
        )}

        {packState==='TEARING' && (
          <div className={`${styles.packContainer} ${styles.packTearing}`}>
            <div className={styles.boosterPack}><div className={styles.packLogo}>🃏</div><div className={styles.packTitle}>Standard</div><div className={styles.packInstruction}>Ouverture...</div></div>
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
                  </div>
                );
              })}
            </div>
            <div className={styles.tapHint}>
              { !flipped[active] ? 'Tape pour révéler →' : phases[active]==='A' ? 'Tape → stats' : phases[active]==='B' ? 'Tape → illustration ✨' : active < pulledCards.length-1 ? 'Tape pour carte suivante' : 'Dernière carte !'}
            </div>
          </>
        )}

        {packState==='FINISHED' && (
          <div className={styles.finishedGrid}>
            {pulledCards.map(p=>(
              <div key={p.instanceId} className={styles.finishedCard}>
                <CardFrame card={p.card} rarity={p.rarity} mintNumber={p.mintNumber} maxMint={p.maxMint} isFlipped revealPhase="C" size="small" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.controls}>
        {packState==='FINISHED' && <button className={styles.finishBtn} onClick={()=>router.push('/collection')}>Voir la collection</button>}
        {packState==='PILE' && <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.5)'}}>{active+1} / {pulledCards.length}</div>}
      </div>
    </main>
  );
}
