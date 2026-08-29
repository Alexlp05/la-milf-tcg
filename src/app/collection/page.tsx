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
type ViewMode = 'album' | 'owned' | 'missing';

const TYPE_FILTERS: { id: CardType; label: string; icon: string }[] = [
  { id: 'PERSONNAGE', label: 'Persos', icon: '👤' },
  { id: 'LIEU', label: 'Lieux', icon: '📍' },
  { id: 'OBJET', label: 'Objets', icon: '🎒' },
  { id: 'SOUVENIR', label: 'Souvenirs', icon: '💭' },
  { id: 'REFERENCE', label: 'Refs', icon: '📖' },
];
const RARITY_FILTERS: { id: CardRarity; label: string; color: string }[] = [
  { id: 'COMMUNE', label: 'Commune', color: '#8c8c8c' },
  { id: 'RARE', label: 'Rare', color: '#4a7cc9' },
  { id: 'ULTRA_RARE', label: 'Ultra', color: '#9b59b6' },
  { id: 'SHINY', label: 'Shiny', color: '#c9a84c' },
  { id: 'GOLD', label: 'Gold', color: '#daa520' },
];

export default function CollectionPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('album');
  const [selectedCard, setSelectedCard] = useState<CollectionItem | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [missing, setMissing] = useState<CardData[]>([]);
  const [stats, setStats] = useState({ totalCards: 0, uniqueCards: 0, totalInGame: 0 });
  const [loading, setLoading] = useState(true);
  const [dusting, setDusting] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/collection').then(r=>r.json()).then(d=>{
      setCollection(d.collection||[]); setAllCards(d.allCards||[]); setMissing(d.missing||[]);
      setStats({ totalCards:d.stats?.totalCards||0, uniqueCards:d.stats?.uniqueCards||0, totalInGame:d.totalInGame||0 });
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  const progress = stats.totalInGame ? Math.round((stats.uniqueCards / stats.totalInGame) * 100) : 0;

  let display: any[] = [];
  if (viewMode==='owned') display = collection.filter(item=>{
    if(search && !`${item.card.name} ${item.card.title} ${item.card.id}`.toLowerCase().includes(search.toLowerCase())) return false;
    if(activeFilter==='ALL') return true;
    if(item.card.type===activeFilter) return true;
    if(item.rarity===activeFilter) return true;
    return false;
  }).map(item=>({type:'owned', item}));
  else if (viewMode==='missing') display = missing.filter(c=>{
    if(search && !`${c.name} ${c.title} ${c.id}`.toLowerCase().includes(search.toLowerCase())) return false;
    if(activeFilter==='ALL') return true;
    if((c as any).type===activeFilter) return true;
    return false;
  }).map(card=>({type:'missing', card}));
  else {
    // album: all cards, owned highlighted
    display = allCards.filter(c=>{
      if(search && !`${c.name} ${c.title} ${c.id}`.toLowerCase().includes(search.toLowerCase())) return false;
      if(RARITY_FILTERS.some(r=> r.id===activeFilter)){
        if(!collection.some(col=> col.card.id===c.id && col.rarity===activeFilter)) return false;
      } else if(activeFilter!=='ALL' && (c as any).type!==activeFilter) return false;
      return true;
    }).map(c=>{
      const owned = collection.find(col=> col.card.id===c.id);
      return owned ? {type:'owned', item:owned} : {type:'missing', card:c};
    });
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
      setSelectedCard(null);
    }catch(e:any){ alert(e.message); } finally{ setDusting(null); }
  };

  if(loading) return <main className={styles.collectionPage}><header className={styles.header}><button className={styles.backBtn} onClick={()=>router.push('/')}>←</button><div className={styles.headerTitle}>Ma Collection</div></header><div className={styles.loading}>Chargement Pokédex...</div></main>;

  return (
    <main className={styles.collectionPage}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={()=>router.push('/')}>←</button>
        <div className={styles.headerTitle}>Pokédex Milf</div>
        <div className={styles.statsBadge}>{stats.uniqueCards}/{stats.totalInGame}</div>
      </header>

      <div className={styles.content}>
        {/* Progress à la Pokémon */}
        <div style={{background:'white',borderRadius:16,padding:14,border:'1px solid rgba(26,22,18,0.08)',boxShadow:'0 2px 12px rgba(0,0,0,0.04)',marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <strong style={{fontFamily:'var(--font-display)'}}>{stats.uniqueCards} / {stats.totalInGame} cartes découvertes</strong>
            <span style={{fontSize:'0.8rem',color:'var(--color-text-muted)'}}>{stats.totalCards} exemplaires</span>
          </div>
          <div style={{height:10,background:'rgba(26,22,18,0.08)',borderRadius:999,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${progress}%`,background:'linear-gradient(90deg, #c9a84c, #e8d48b)',borderRadius:999,transition:'width 0.6s'}}/>
          </div>
          <div style={{fontSize:'0.75rem',color:'var(--color-text-muted)',marginTop:6,display:'flex',gap:8,flexWrap:'wrap'}}>
            {missing.length>0 ? <>Manquent : <strong>{missing.map(m=>m.id).join(', ')}</strong> — {missing.length} à trouver</> : <>🎉 Collection complète !</>}
          </div>
        </div>

        {/* Vues */}
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          {(['album','owned','missing'] as ViewMode[]).map(m=>(
            <button key={m} onClick={()=>setViewMode(m)} className={`${styles.filterBtn} ${viewMode===m?styles.active:''}`} style={{flex:1,justifyContent:'center',display:'flex',gap:6,padding:'10px 8px',fontWeight:700}}>
              {m==='album' ? `📚 Album (${stats.totalInGame})` : m==='owned' ? `✅ Possédées (${stats.uniqueCards})` : `❓ Manquantes (${missing.length})`}
            </button>
          ))}
        </div>
        <div style={{fontSize:'0.75rem',color:'var(--color-text-muted)',marginBottom:12,textAlign:'center'}}>
          {viewMode==='album' && 'Album = toutes les cartes du jeu (grisées si manquantes). Parfait pour admirer.'}
          {viewMode==='owned' && 'Seulement tes cartes obtenues.'}
          {viewMode==='missing' && 'Seulement celles qui te manquent.'}
        </div>

        {/* Recherche */}
        <input placeholder="Rechercher nom, titre, card_00x..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 14px',borderRadius:999,border:'1px solid rgba(26,22,18,0.12)',marginBottom:12,fontSize:'0.9rem'}}/>

        {/* Filtres Type */}
        <div style={{marginBottom:8}}>
          <div style={{fontSize:'0.75rem',fontWeight:700,color:'var(--color-text-muted)',marginBottom:6,letterSpacing:'0.04em'}}>TYPE</div>
          <div className={styles.filters} style={{marginBottom:0}}>
            <button className={`${styles.filterBtn} ${activeFilter==='ALL'?styles.active:''}`} onClick={()=>setActiveFilter('ALL')}>Tout</button>
            {TYPE_FILTERS.map(f=> <button key={f.id} className={`${styles.filterBtn} ${activeFilter===f.id?styles.active:''}`} onClick={()=>setActiveFilter(f.id)}>{f.icon} {f.label}</button>)}
          </div>
        </div>
        {/* Filtres Rareté */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:'0.75rem',fontWeight:700,color:'var(--color-text-muted)',marginBottom:6,letterSpacing:'0.04em'}}>RARETÉ</div>
          <div className={styles.filters}>
            {RARITY_FILTERS.map(f=> (
              <button key={f.id} className={`${styles.filterBtn} ${activeFilter===f.id?styles.active:''}`} onClick={()=>setActiveFilter(f.id)} style={activeFilter===f.id?{background:f.color,borderColor:f.color,color:'white'}:{borderColor:`${f.color}40`}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:f.color,display:'inline-block',marginRight:6}}/> {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.grid}>
          {display.length===0 ? <div className={styles.emptyState}><p>Aucune carte.</p></div> : display.map((entry:any)=>{
            if(entry.type==='missing'){
              const c=entry.card as CardData;
              return (
                <div key={`miss-${c.id}`} className={styles.cardItem} style={{opacity:0.5}}>
                  <div style={{position:'relative', filter:'grayscale(1) brightness(0.9)'}}>
                    <CardFrame card={c} rarity="COMMUNE" size="small" isFlipped revealPhase="C" />
                    <div style={{position:'absolute',inset:0,background:'rgba(248,246,242,0.72)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:2,border:'2px dashed rgba(26,22,18,0.12)'}}>
                      <span style={{fontSize:'1.4rem'}}>🔒</span><span style={{fontSize:'0.65rem',fontWeight:800}}>#{c.id}</span><span style={{fontSize:'0.6rem'}}>MANQUE</span>
                    </div>
                    <div style={{position:'absolute',top:-6,right:-6,background:'#1a1612',color:'white',fontSize:'0.6rem',padding:'2px 6px',borderRadius:999,fontWeight:700}}>{c.id}</div>
                  </div>
                  <div style={{textAlign:'center',marginTop:6}}><div style={{fontSize:'0.75rem',fontWeight:700}}>{c.name}</div><div style={{fontSize:'0.6rem',color:'var(--color-text-muted)'}}>{c.title}</div></div>
                </div>
              );
            } else {
              const item=entry.item as any;
              return (
                <div key={item.instances[0]} className={styles.cardItem} onClick={()=>setSelectedCard(item)} style={{cursor:'pointer'}}>
                  {item.quantity>1 && <div className={styles.quantityBadge}>x{item.quantity}</div>}
                  <CardFrame card={item.card} rarity={item.rarity} mintNumber={item.mintNumber??undefined} maxMint={item.maxMint??undefined} size="small" isFlipped revealPhase="C" />
                  <div style={{textAlign:'center',marginTop:6,lineHeight:1.1}}><div style={{fontSize:'0.75rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>{item.card.name} <span style={{fontSize:'0.55rem',background: RARITY_FILTERS.find(r=>r.id===item.rarity)?.color || '#888',color:'white',padding:'1px 4px',borderRadius:4}}>{item.rarity}</span></div><div style={{fontSize:'0.6rem',color:'var(--color-text-muted)'}}>{item.card.id} • {item.card.title}</div></div>
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
            <div className={styles.modalCardSide}><CardFrame card={selectedCard.card} rarity={selectedCard.rarity} mintNumber={selectedCard.mintNumber??undefined} maxMint={selectedCard.maxMint??undefined} size="large" isFlipped revealPhase="C" /></div>
            <div className={styles.modalInfoSide}>
              <span className={styles.infoRarity}>{selectedCard.rarity.replace('_',' ')}</span>
              <h2 className={styles.infoTitle}>{selectedCard.card.name}</h2>
              <p className={styles.infoSubtitle}>{selectedCard.card.title} — {selectedCard.card.id}</p>
              <div className={styles.actionSection}><div className={styles.actionDesc}>{selectedCard.card.actionDescription}</div><div className={styles.actionScore}>{selectedCard.card.actionValue}</div></div>
              <div className={styles.loreSection}><div className={styles.loreLabel}>📜 Lore</div><div className={styles.loreText}>{selectedCard.card.loreAlbum}</div></div>
              {selectedCard.quantity>1 && <div className={styles.dustAction}><div className={styles.dustInfo}>x{selectedCard.quantity} — recycler 1 pour {selectedCard.dustValue}✨</div><button className={styles.dustBtn} onClick={()=>handleDust(selectedCard.instances[0])} disabled={!!dusting}>{dusting?'...':'Recycler 1x'}</button></div>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
