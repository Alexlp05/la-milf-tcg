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

interface CollectionResponse {
  collection: CollectionItem[];
  stats: {
    totalCards: number;
    uniqueCards: number;
    byRarity: Record<string, number>;
  };
}

type FilterType = 'ALL' | CardType | CardRarity;

const RARITY_FILTERS: CardRarity[] = ['COMMUNE', 'RARE', 'ULTRA_RARE', 'SHINY', 'GOLD'];

export default function CollectionPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [selectedCard, setSelectedCard] = useState<CollectionItem | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [stats, setStats] = useState({ totalCards: 0, uniqueCards: 0, byRarity: {} as Record<string, number> });
  const [loading, setLoading] = useState(true);
  const [dusting, setDusting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/collection')
      .then(res => res.json())
      .then((data: CollectionResponse) => {
        setCollection(data.collection);
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredCollection = collection.filter(item => {
    if (activeFilter === 'ALL') return true;
    if (item.card.type === activeFilter) return true;
    if (item.rarity === activeFilter) return true;
    return false;
  });

  const handleDust = async (instanceId: string) => {
    if (!confirm('Recycler cette carte pour obtenir de la poussière ? Cette action est irréversible.')) return;
    
    setDusting(instanceId);
    try {
      const res = await fetch('/api/collection/dust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      
      // Refresh collection
      const fresh = await fetch('/api/collection').then(r => r.json());
      setCollection(fresh.collection);
      setStats(fresh.stats);
      setSelectedCard(null);
      alert(`+${data.dustGained} poussière obtenue !`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDusting(null);
    }
  };

  if (loading) {
    return (
      <main className={styles.collectionPage}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => router.push('/')}>←</button>
          <div className={styles.headerTitle}>Ma Collection</div>
        </header>
        <div className={styles.loading}>Chargement de la collection...</div>
      </main>
    );
  }

  return (
    <main className={styles.collectionPage}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          ←
        </button>
        <div className={styles.headerTitle}>Ma Collection</div>
        <div className={styles.statsBadge}>
          {stats.uniqueCards} uniques ({stats.totalCards} total)
        </div>
      </header>

      <div className={styles.content}>
        {/* Filters */}
        <div className={styles.filters}>
          <button 
            className={`${styles.filterBtn} ${activeFilter === 'ALL' ? styles.active : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            Tout
          </button>
          <button 
            className={`${styles.filterBtn} ${activeFilter === 'PERSONNAGE' ? styles.active : ''}`}
            onClick={() => setActiveFilter('PERSONNAGE')}
          >
            Personnages
          </button>
          <button 
            className={`${styles.filterBtn} ${activeFilter === 'LIEU' ? styles.active : ''}`}
            onClick={() => setActiveFilter('LIEU')}
          >
            Lieux
          </button>
          {RARITY_FILTERS.map((rarity) => (
            <button
              key={rarity}
              className={`${styles.filterBtn} ${activeFilter === rarity ? styles.active : ''}`}
              onClick={() => setActiveFilter(rarity)}
            >
              {rarity === 'SHINY' ? '✨' : ''} {rarity}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {filteredCollection.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Aucune carte pour ce filtre.</p>
            </div>
          ) : (
            filteredCollection.map((item) => (
              <div 
                key={item.instances[0]} 
                className={styles.cardItem}
                onClick={() => setSelectedCard(item)}
              >
                {item.quantity > 1 && (
                  <div className={styles.quantityBadge}>x{item.quantity}</div>
                )}
<CardFrame
                card={item.card}
                rarity={item.rarity}
                mintNumber={item.mintNumber ?? undefined}
                maxMint={item.maxMint ?? undefined}
                size="small"
              />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCard && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCard(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedCard(null)}>
              ✕
            </button>
            
            {/* Card Visual Side */}
            <div className={styles.modalCardSide}>
              <CardFrame
                card={selectedCard.card}
                rarity={selectedCard.rarity}
                mintNumber={selectedCard.mintNumber ?? undefined}
                maxMint={selectedCard.maxMint ?? undefined}
                size="large"
              />
            </div>
            
            {/* Lore & Info Side */}
            <div className={styles.modalInfoSide}>
              <span className={styles.infoRarity}>{selectedCard.rarity.replace('_', ' ')}</span>
              <h2 className={styles.infoTitle}>{selectedCard.card.name}</h2>
              <p className={styles.infoSubtitle}>{selectedCard.card.title}</p>
              
              <div className={styles.actionSection}>
                <div className={styles.actionIconBox}>
                  {selectedCard.card.iconUrl ? <img src={selectedCard.card.iconUrl} alt="icon" style={{width: '100%'}}/> : '⚔️'}
                </div>
                <div className={styles.actionDesc}>
                  {selectedCard.card.actionDescription}
                </div>
                <div className={styles.actionScore}>
                  {selectedCard.card.actionValue}
                </div>
              </div>

              <div className={styles.loreSection}>
                <div className={styles.loreLabel}>
                  <span>📜</span> Le Lore
                </div>
                <div className={styles.loreText}>
                  {selectedCard.card.loreAlbum || "Aucune légende n'a encore été écrite pour cette carte."}
                </div>
              </div>
              
              {selectedCard.quantity > 1 && (
                <div className={styles.dustAction}>
                  <div className={styles.dustInfo}>
                    Tu as <strong>{selectedCard.quantity}</strong> exemplaires de cette carte.<br/>
                    Recycle les doublons pour obtenir de la poussière.
                  </div>
                  <button 
                    className={`${styles.dustBtn} ${dusting === selectedCard.instances[0] ? styles.loading : ''}`}
                    onClick={() => handleDust(selectedCard.instances[0])}
                    disabled={!!dusting}
                  >
                    {dusting === selectedCard.instances[0] ? 'Recyclage...' : 'Recycler 1x'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}