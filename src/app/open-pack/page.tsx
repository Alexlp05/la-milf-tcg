'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './open-pack.module.css';
import CardFrame, { CardData, CardRarity, RevealPhase } from '@/components/card/CardFrame';

// Mock data for MVP test before backend integration
const MOCK_PULLS: { card: CardData; rarity: CardRarity; mintNumber?: number; maxMint?: number }[] = [
  {
    card: {
      id: 'card_002',
      name: 'Le Kebab du Dimanche',
      title: 'Repas des Champions',
      type: 'OBJET',
      overallScore: 72,
      actionDescription: 'Restaure 30 points de dignité après une soirée.',
      actionValue: 30,
    },
    rarity: 'COMMUNE',
  },
  {
    card: {
      id: 'card_004',
      name: 'La Gifle Amicale',
      title: 'Tradition Ancestrale',
      type: 'SOUVENIR',
      overallScore: 88,
      actionDescription: "Inflige 25 dégâts d'amitié à un allié.",
      actionValue: 25,
    },
    rarity: 'PEU_COMMUNE',
  },
  {
    card: {
      id: 'card_001',
      name: 'T-Max',
      title: 'Le bouffeur de fumigène',
      type: 'PERSONNAGE',
      overallScore: 94,
      actionDescription: 'Écarte les bras dans la passion.',
      actionValue: 15,
    },
    rarity: 'SHINY',
    mintNumber: 2,
    maxMint: 3,
  },
];

type PackState = 'UNOPENED' | 'TEARING' | 'DISTRIBUTED' | 'REVEALING' | 'FINISHED';

export default function OpenPackPage() {
  const router = useRouter();
  const [packState, setPackState] = useState<PackState>('UNOPENED');
  
  // Track state for each of the 3 cards
  const [flippedCards, setFlippedCards] = useState<boolean[]>([false, false, false]);
  const [revealPhases, setRevealPhases] = useState<RevealPhase[]>(['NONE', 'NONE', 'NONE']);
  
  // Which card is currently being revealed (0, 1, or 2)
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);

  const handleOpenPack = () => {
    if (packState !== 'UNOPENED') return;
    
    setPackState('TEARING');
    
    // Simulate API call and pack tear animation
    setTimeout(() => {
      setPackState('DISTRIBUTED');
    }, 1500);
  };

  const handleCardClick = (index: number) => {
    if (packState !== 'DISTRIBUTED' && packState !== 'REVEALING') return;
    
    // Can't click if another card is currently in its sequential reveal process
    if (activeCardIndex !== null && activeCardIndex !== index && revealPhases[activeCardIndex] !== 'C') {
      return;
    }

    if (!flippedCards[index]) {
      // First click: flip the card and start Phase A (Frame + Name)
      const newFlipped = [...flippedCards];
      newFlipped[index] = true;
      setFlippedCards(newFlipped);
      
      const newPhases = [...revealPhases];
      newPhases[index] = 'A';
      setRevealPhases(newPhases);
      
      setActiveCardIndex(index);
      setPackState('REVEALING');
    }
  };

  const handleNextPhase = () => {
    if (activeCardIndex === null) return;
    
    const currentPhase = revealPhases[activeCardIndex];
    const newPhases = [...revealPhases];
    
    if (currentPhase === 'A') {
      // Move to Phase B (Stats + Action)
      newPhases[activeCardIndex] = 'B';
      setRevealPhases(newPhases);
    } else if (currentPhase === 'B') {
      // Move to Phase C (Artwork flash climax)
      newPhases[activeCardIndex] = 'C';
      setRevealPhases(newPhases);
      
      // Check if all cards are fully revealed
      if (newPhases.every(p => p === 'C')) {
        setTimeout(() => setPackState('FINISHED'), 1000);
      } else {
        // Reset active index so user can click the next card
        setActiveCardIndex(null);
      }
    }
  };

  return (
    <main className={styles.openPackPage}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          ←
        </button>
        <div className={styles.headerTitle}>Ouvrir un Booster</div>
      </header>

      {/* Stage */}
      <div className={styles.stage}>
        <div className={styles.spotlight} />

        {/* State 1: The Pack */}
        {(packState === 'UNOPENED' || packState === 'TEARING') && (
          <div 
            className={`${styles.packContainer} ${packState === 'TEARING' ? styles.packTearing : ''}`}
            onClick={handleOpenPack}
          >
            <div className={styles.boosterPack}>
              <div className={styles.packLogo}>🃏</div>
              <div className={styles.packTitle}>Standard</div>
              <div className={styles.packInstruction}>Toucher pour ouvrir</div>
            </div>
          </div>
        )}

        {/* State 2 & 3: Distributed Cards & Revealing */}
        {(packState === 'DISTRIBUTED' || packState === 'REVEALING' || packState === 'FINISHED') && (
          <div className={styles.cardsContainer}>
            {MOCK_PULLS.map((pull, i) => (
              <div 
                key={i} 
                className={`${styles.cardSlot} ${packState !== 'TEARING' ? styles.visible : ''}`}
                style={{ 
                  zIndex: activeCardIndex === i ? 50 : 1,
                  // Bring the active card forward and dim the others
                  transform: activeCardIndex === i ? 'scale(1.1) translateY(-20px)' : '',
                  opacity: (activeCardIndex !== null && activeCardIndex !== i && revealPhases[activeCardIndex] !== 'C') ? 0.4 : 1,
                  transition: 'all 0.4s ease'
                }}
              >
                <CardFrame
                  card={pull.card}
                  rarity={pull.rarity}
                  mintNumber={pull.mintNumber}
                  maxMint={pull.maxMint}
                  isFlipped={flippedCards[i]}
                  revealPhase={revealPhases[i]}
                  onClick={() => handleCardClick(i)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {packState === 'DISTRIBUTED' && flippedCards.every(f => !f) && (
          <div className={styles.instructionText}>
            Touche une carte pour la révéler...
          </div>
        )}

        {packState === 'REVEALING' && activeCardIndex !== null && revealPhases[activeCardIndex] !== 'C' && (
          <button className={styles.nextBtn} onClick={handleNextPhase}>
            Continuer la révélation
          </button>
        )}

        {packState === 'FINISHED' && (
          <button className={styles.finishBtn} onClick={() => router.push('/collection')}>
            Aller à la collection
          </button>
        )}
      </div>
    </main>
  );
}
