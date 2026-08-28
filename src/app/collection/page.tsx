'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './collection.module.css';
import CardFrame, { CardData, CardRarity, CardType } from '@/components/card/CardFrame';

// Mock data for MVP
const MOCK_COLLECTION: { instanceId: string; card: CardData; rarity: CardRarity; mintNumber?: number; maxMint?: number; quantity: number }[] = [
  {
    instanceId: 'inst_1',
    card: {
      id: 'card_001',
      name: 'T-Max',
      title: 'Le bouffeur de fumigène',
      type: 'PERSONNAGE',
      overallScore: 94,
      actionDescription: 'Écarte les bras dans la passion.',
      actionValue: 15,
      // We extend CardData in the frontend to include lore just for display if needed
    } as CardData & { loreAlbum?: string },
    rarity: 'SHINY',
    mintNumber: 2,
    maxMint: 3,
    quantity: 1,
  },
  {
    instanceId: 'inst_2',
    card: {
      id: 'card_002',
      name: 'Le Kebab du Dimanche',
      title: 'Repas des Champions',
      type: 'OBJET',
      overallScore: 72,
      actionDescription: 'Restaure 30 points de dignité.',
      actionValue: 30,
    } as CardData,
    rarity: 'COMMUNE',
    quantity: 4,
  },
  {
    instanceId: 'inst_3',
    card: {
      id: 'card_004',
      name: 'La Gifle Amicale',
      title: 'Tradition Ancestrale',
      type: 'SOUVENIR',
      overallScore: 88,
      actionDescription: "Inflige 25 dégâts d'amitié.",
      actionValue: 25,
    } as CardData,
    rarity: 'PEU_COMMUNE',
    quantity: 2,
  },
];

// Add lore to mock data for the detail view
MOCK_COLLECTION[0].card['loreAlbum' as keyof CardData] = "Les savants disent qu'il n'existe pas meilleur crâne rasé que celui de Ludo.";
MOCK_COLLECTION[1].card['loreAlbum' as keyof CardData] = "Certains disent que ce kebab a sauvé plus de vies que la Croix-Rouge.";
MOCK_COLLECTION[2].card['loreAlbum' as keyof CardData] = "La gifle amicale est un rituel sacré. La recevoir, c'est être accepté.";

type FilterType = 'ALL' | CardType | CardRarity;

export default function CollectionPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [selectedCard, setSelectedCard] = useState<typeof MOCK_COLLECTION[0] | null>(null);

  // In a real app, we'd filter the actual DB results
  const filteredCollection = MOCK_COLLECTION;

  const totalCards = MOCK_COLLECTION.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueCards = MOCK_COLLECTION.length;

  const handleDust = () => {
    alert("Fonctionnalité de recyclage (Dusting) bientôt disponible !");
  };

  return (
    <main className={styles.collectionPage}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          ←
        </button>
        <div className={styles.headerTitle}>Ma Collection</div>
        <div className={styles.statsBadge}>
          {uniqueCards} uniques ({totalCards} total)
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
          <button 
            className={`${styles.filterBtn} ${activeFilter === 'SHINY' ? styles.active : ''}`}
            onClick={() => setActiveFilter('SHINY')}
          >
            ✨ Brillant
          </button>
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {filteredCollection.map((item) => (
            <div 
              key={item.instanceId} 
              className={styles.cardItem}
              onClick={() => setSelectedCard(item)}
            >
              {item.quantity > 1 && (
                <div className={styles.quantityBadge}>x{item.quantity}</div>
              )}
              <CardFrame
                card={item.card}
                rarity={item.rarity}
                mintNumber={item.mintNumber}
                maxMint={item.maxMint}
                size="small"
              />
            </div>
          ))}
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
                mintNumber={selectedCard.mintNumber}
                maxMint={selectedCard.maxMint}
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
                  {(selectedCard.card as any).loreAlbum || "Aucune légende n'a encore été écrite pour cette carte."}
                </div>
              </div>
              
              {selectedCard.quantity > 1 && (
                <div className={styles.dustAction}>
                  <div className={styles.dustInfo}>
                    Tu as <strong>{selectedCard.quantity}</strong> exemplaires de cette carte.<br/>
                    Recycle les doublons pour obtenir de la poussière.
                  </div>
                  <button className={styles.dustBtn} onClick={handleDust}>
                    Recycler 1x
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
