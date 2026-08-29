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
      setFlipped(Array(d.cards.length).fill(false)); setPhases(Array(d.cards.length).fill('NONE')); setActive(0); setRevealedCount(0);
      setTimeout(()=> setPackState('PILE'), 1100);
    } catch(e:any){ setError(e.message); setPackState('SELECTING'); }
    finally{ setLoading(false); }
  };

  // 1-tap simplifié : COMMUNE/RARE -> flip direct C, ULTRA/SHINY/GOLD -> flip + spin + C + auto next
  const handlePileTap = () => {
    if (packState!=='PILE') return;
    const idx = active;
    if (phases[idx]==='C') {
      if (idx < pulledCards.length-1) setActive(idx+1);
      return;
    }
    if (!flipped[idx]) {
      const nf=[...flipped]; nf[idx]=true; setFlipped(nf);
      const rarity = pulledCards[idx].rarity;
      const isWow = rarity==='ULTRA_RARE' || rarity==='SHINY' || rarity==='GOLD';
      const np=[...phases]; np[idx]='C'; setPhases(np);
      // temps d'admiration : plus long, varié selon rareté
      const delay = isWow ? (rarity==='GOLD' ? 3200 : rarity==='SHINY' ? 2800 : 2400) : 1800;
      setTimeout(()=>{
        if (idx === pulledCards.length-1) setPackState('FINISHED');
        else setActive(idx+1);
      }, delay);
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
                  </div>
                );
              })}
            </div>
            <div className={styles.tapHint}>
              { !flipped[active] ? `Tape pour révéler — ${pulledCards[active]?.rarity.replace('_',' ')}` : phases[active]==='C' && active < pulledCards.length-1 ? 'Tape pour suivante →' : phases[active]==='C' ? 'Dernière !' : 'Révélation...'}
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
