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

interface BoosterPack {
  id: string;
  packType: 'STANDARD' | 'PREMIUM' | 'WELCOME';
}

type PackState = 'SELECTING' | 'TEARING' | 'DISTRIBUTED' | 'REVEALING' | 'FINISHED';

export default function OpenPackPage() {
  const router = useRouter();
  const [packState, setPackState] = useState<PackState>('SELECTING');
  const [packs, setPacks] = useState<BoosterPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track state for each of the 3 cards
  const [pulledCards, setPulledCards] = useState<PulledCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<boolean[]>([false, false, false]);
  const [revealPhases, setRevealPhases] = useState<RevealPhase[]>(['NONE', 'NONE', 'NONE']);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);

  // Fetch user's unopened packs on mount
  useEffect(() => {
    fetch('/api/boosters/open', { method: 'GET' }) // We'll add a GET endpoint or fetch from a different endpoint
      .then(res => res.json())
      .then(data => {
        if (data.packs) setPacks(data.packs);
      })
      .catch(() => {});
  }, []);

  // For now, let's fetch from a simple endpoint or use a different approach
  useEffect(() => {
    // We'll add a GET to /api/boosters/open to list packs
    fetch('/api/boosters/open?list=true')
      .then(res => res.json())
      .then(data => setPacks(data.packs || []))
      .catch(() => setPacks([]));
  }, []);

  const handleOpenPack = async () => {
    if (!selectedPackId || packState !== 'SELECTING') return;
    
    setLoading(true);
    setError(null);
    setPackState('TEARING');

    try {
      const res = await fetch('/api/boosters/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: selectedPackId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'ouverture');

      setPulledCards(data.cards);
      setFlippedCards([false, false, false]);
      setRevealPhases(['NONE', 'NONE', 'NONE']);
      setActiveCardIndex(null);
      
      // Wait for tear animation then show cards
      setTimeout(() => setPackState('DISTRIBUTED'), 1500);
    } catch (e: any) {
      setError(e.message);
      setPackState('SELECTING');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (index: number) => {
    if (packState !== 'DISTRIBUTED' && packState !== 'REVEALING') return;
    
    if (activeCardIndex !== null && activeCardIndex !== index && revealPhases[activeCardIndex] !== 'C') {
      return;
    }

    if (!flippedCards[index]) {
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
      newPhases[activeCardIndex] = 'B';
      setRevealPhases(newPhases);
    } else if (currentPhase === 'B') {
      newPhases[activeCardIndex] = 'C';
      setRevealPhases(newPhases);
      
      if (newPhases.every(p => p === 'C')) {
        setTimeout(() => setPackState('FINISHED'), 1000);
      } else {
        setActiveCardIndex(null);
      }
    }
  };

  const packTypeLabels: Record<string, string> = {
    STANDARD: 'Standard',
    PREMIUM: 'Premium',
    WELCOME: 'Bienvenue',
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

        {/* State: Select Pack */}
        {packState === 'SELECTING' && (
          <div className={styles.packSelection}>
            <h2 className={styles.selectionTitle}>Choisis ton booster</h2>
            {error && <div className={styles.error}>{error}</div>}
            {packs.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Aucun booster disponible.</p>
                <p className={styles.emptySub}>Les admins peuvent t'en donner via le panel d'administration.</p>
              </div>
            ) : (
              <div className={styles.packList}>
                {packs.map(pack => (
                  <button
                    key={pack.id}
                    className={`${styles.packOption} ${selectedPackId === pack.id ? styles.selected : ''}`}
                    onClick={() => setSelectedPackId(pack.id)}
                    disabled={loading}
                  >
                    <div className={styles.optionIcon}>🃏</div>
                    <div className={styles.optionInfo}>
                      <div className={styles.optionTitle}>{packTypeLabels[pack.packType]}</div>
                      <div className={styles.optionId}>#{pack.id.slice(0, 8)}...</div>
                    </div>
                    {selectedPackId === pack.id && <div className={styles.checkmark}>✓</div>}
                  </button>
                ))}
              </div>
            )}
            {selectedPackId && (
              <button 
                className={`${styles.openBtn} ${loading ? styles.loading : ''}`}
                onClick={handleOpenPack}
                disabled={loading}
              >
                {loading ? 'Ouverture...' : 'Ouvrir ce booster'}
              </button>
            )}
          </div>
        )}

        {/* State 1: The Pack Tearing */}
        {(packState === 'TEARING') && (
          <div className={`${styles.packContainer} ${styles.packTearing}`}>
            <div className={styles.boosterPack}>
              <div className={styles.packLogo}>🃏</div>
              <div className={styles.packTitle}>Standard</div>
              <div className={styles.packInstruction}>Ouverture en cours...</div>
            </div>
          </div>
        )}

        {/* State 2 & 3: Distributed Cards & Revealing */}
        {(packState === 'DISTRIBUTED' || packState === 'REVEALING' || packState === 'FINISHED') && (
          <div className={styles.cardsContainer}>
            {pulledCards.map((pull, i) => (
              <div 
                key={pull.instanceId} 
                className={`${styles.cardSlot} ${styles.visible}`}
                style={{
                  zIndex: activeCardIndex === i ? 50 : 1,
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