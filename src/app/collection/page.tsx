'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './collection.module.css';
import CardFrame, { CardData, CardRarity, CardType } from '@/components/card/CardFrame';

interface CollectionItem {
  card: CardData & { loreAlbum: string };
  rarity: CardRarity;
  mintNumber: number | null;
  maxMint: number | null;
  quantity: number;
  instances: string[];
  dustValue: number;
}

type FilterType = 'ALL' | CardType | CardRarity;
type ViewMode = 'owned' | 'all' | 'missing';

const RARITY_FILTERS: CardRarity[] = ['COMMUNE', 'RARE', 'ULTRA_RARE', 'SHINY', 'GOLD'];

export default function CollectionPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedCard, setSelectedCard] = useState<CollectionItem | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [missing, setMissing] = useState<CardData[]>([]);
  const [stats, setStats] = useState({ totalCards: 0, uniqueCards: 0, totalInGame: 0 });
  const [loading, setLoading] = useState(true);
  const [dusting, setDusting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/collection').then(r=>r.json()).then(d=>{
      setCollection(d.collection||[]); setAllCards(d.allCards||[]); setMissing(d.missing||[]);
      setStats({ totalCards:d.stats?.totalCards||0, uniqueCards:d.stats?.uniqueCards||0, totalInGame:d.totalInGame||0 });
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  const ownedIds = new Set(collection.map(c=> c.card.id));

  let display: { type:'owned', item: CollectionItem }[] | { type:'missing', card: CardData }[] = [];
  if (viewMode==='owned') display = collection.filter(item=>{
    if(activeFilter==='ALL') return true;
    if(item.card.type===activeFilter) return true;
    if(item.rarity===activeFilter) return true;
    return false;
  }).map(item=>({type:'owned' as const, item}));
  else if (viewMode==='missing') display = missing.filter(c=>{
    if(activeFilter==='ALL') return true;
    if((c as any).type===activeFilter) return true;
    return false;
  }).map(card=>({type:'missing' as const, card}));
  else { // all
    const ownedMap = new Map(collection.map(c=>[c.card.id, c]));
    display = allCards.filter(c=>{
      if(activeFilter!=='ALL' && (c as any).type!==activeFilter) return false;
      // for rarity filter on 'all', show only if owned with that rarity OR if filter is type
      if(RARITY_FILTERS.includes(activeFilter as any)){
        // only show owned matching rarity, plus missing not matching? simpler hide missing when rarity filter
        if(!ownedMap.has(c.id)) return false;
        const match = collection.some(col=> col.card.id===c.id && col.rarity===activeFilter);
        return match;
      }
      return true;
    }).map(c=>{
      const owned = collection.find(col=> col.card.id===c.id);
      if(owned && (activeFilter==='ALL' || owned.card.type===activeFilter || owned.rarity===activeFilter)) return {type:'owned', item:owned} as any;
      if(!owned) return {type:'missing', card:c} as any;
      return {type:'owned', item:owned} as any;
    }).filter(Boolean) as any;
  }

  const handleDust = async (instanceId: string) => {
    if(!confirm('Recycler pour poussière ?')) return;
    setDusting(instanceId);
    try{
      const r=await fetch('/api/collection/dust',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instanceId})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error);
      const fresh=await fetch('/api/collection').then(r=>r.json());
      setCollection(fresh.collection); setAllCards(fresh.allCards); setMissing(fresh.missing);
      setStats({ totalCards:fresh.stats.totalCards, uniqueCards:fresh.stats.uniqueCards, totalInGame:fresh.totalInGame });
      setSelectedCard(null); alert(`+${d.dustGained} poussière !`);
    }catch(e:any){ alert(e.message); } finally{ setDusting(null); }
  };

  if(loading) return <main className={styles.collectionPage}><header className={styles.header}><button className={styles.backBtn} onClick={()=>router.push('/')}>←</button><div className={styles.headerTitle}>Ma Collection</div></header><div className={styles.loading}>Chargement...</div></main>;

  return (
    <main className={styles.collectionPage}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={()=>router.push('/')}>←</button>
        <div className={styles.headerTitle}>Ma Collection</div>
        <div className={styles.statsBadge}>{stats.uniqueCards}/{stats.totalInGame} uniques • {stats.totalCards} cartes</div>
      </header>

      <div className={styles.content}>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          {(['all','owned','missing'] as ViewMode[]).map(m=>(
            <button key={m} onClick={()=>setViewMode(m)} className={`${styles.filterBtn} ${viewMode===m?styles.active:''}`} style={{flex:1,justifyContent:'center',display:'flex',alignItems:'center',gap:6}}>
              {m==='all'?'📚 Album':m==='owned'?'✅ Possédées':`❓ Manquantes (${missing.length})`}
            </button>
          ))}
        </div>

        <div className={styles.filters}>
          <button className={`${styles.filterBtn} ${activeFilter==='ALL'?styles.active:''}`} onClick={()=>setActiveFilter('ALL')}>Tout</button>
          <button className={`${styles.filterBtn} ${activeFilter==='PERSONNAGE'?styles.active:''}`} onClick={()=>setActiveFilter('PERSONNAGE')}>Personnages</button>
          <button className={`${styles.filterBtn} ${activeFilter==='LIEU'?styles.active:''}`} onClick={()=>setActiveFilter('LIEU')}>Lieux</button>
          {RARITY_FILTERS.map(r=> <button key={r} className={`${styles.filterBtn} ${activeFilter===r?styles.active:''}`} onClick={()=>setActiveFilter(r)}>{r==='SHINY'?'✨':''} {r}</button>)}
        </div>

        {viewMode==='missing' && missing.length>0 && (
          <div style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.18)',padding:'10px 14px',borderRadius:10,marginBottom:12,fontSize:'0.85rem'}}>
            Il te manque : <strong>{missing.map(m=> m.id).join(', ')}</strong> — {missing.length} / {stats.totalInGame}
          </div>
        )}

        <div className={styles.grid}>
          {display.length===0 ? <div className={styles.emptyState}><p>Aucune carte.</p></div> : display.map((entry:any, idx:number)=>{
            if(entry.type==='missing'){
              const c=entry.card as CardData;
              return (
                <div key={`miss-${c.id}`} className={styles.cardItem} style={{opacity:0.45, filter:'grayscale(1)'}}>
                  <div style={{position:'relative'}}>
                    <CardFrame card={c} rarity="COMMUNE" size="small" isFlipped revealPhase="C" />
                    <div style={{position:'absolute',inset:0,background:'rgba(255,255,255,0.65)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:4}}>
                      <span style={{fontSize:'1.6rem'}}>🔒</span><span style={{fontSize:'0.7rem',fontWeight:700}}>{c.id}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'center',fontSize:'0.7rem',marginTop:4,color:'var(--color-text-muted)'}}>{c.name}</div>
                </div>
              );
            } else {
              const item=entry.item as CollectionItem;
              return (
                <div key={item.instances[0]} className={styles.cardItem} onClick={()=>setSelectedCard(item)} style={{cursor:'pointer'}}>
                  {item.quantity>1 && <div className={styles.quantityBadge}>x{item.quantity}</div>}
                  <CardFrame card={item.card} rarity={item.rarity} mintNumber={item.mintNumber??undefined} maxMint={item.maxMint??undefined} size="small" isFlipped revealPhase="C" />
                  <div style={{textAlign:'center',fontSize:'0.7rem',marginTop:4}}><strong>{item.card.name}</strong> <span style={{color:'#888'}}>#{item.card.id}</span></div>
                </div>
              );
            }
          })}
        </div>
      </div>

      {selectedCard && (
        <div className={styles.modalOverlay} onClick={()=>setSelectedCard(null)}>
          <div className={styles.modalContent} onClick={e=>e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={()=>setSelectedCard(null)}>✕</button>
            <div className={styles.modalCardSide}>
              <CardFrame card={selectedCard.card} rarity={selectedCard.rarity} mintNumber={selectedCard.mintNumber??undefined} maxMint={selectedCard.maxMint??undefined} size="large" isFlipped revealPhase="C" />
            </div>
            <div className={styles.modalInfoSide}>
              <span className={styles.infoRarity}>{selectedCard.rarity.replace('_',' ')}</span>
              <h2 className={styles.infoTitle}>{selectedCard.card.name}</h2>
              <p className={styles.infoSubtitle}>{selectedCard.card.title} — {selectedCard.card.id}</p>
              <div className={styles.actionSection}>
                <div className={styles.actionDesc}>{selectedCard.card.actionDescription}</div>
                <div className={styles.actionScore}>{selectedCard.card.actionValue}</div>
              </div>
              <div className={styles.loreSection}><div className={styles.loreLabel}>📜 Lore</div><div className={styles.loreText}>{selectedCard.card.loreAlbum}</div></div>
              {selectedCard.quantity>1 && (
                <div className={styles.dustAction}>
                  <div className={styles.dustInfo}>x{selectedCard.quantity} exemplaires — recycler 1 pour {selectedCard.dustValue}✨</div>
                  <button className={styles.dustBtn} onClick={()=>handleDust(selectedCard.instances[0])} disabled={!!dusting}>{dusting?'...':'Recycler 1x'}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
