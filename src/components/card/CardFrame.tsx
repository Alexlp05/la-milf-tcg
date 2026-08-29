'use client';

import React from 'react';
import styles from './CardFrame.module.css';

export type CardRarity = 'COMMUNE' | 'RARE' | 'ULTRA_RARE' | 'SHINY' | 'GOLD';
export type CardType = 'PERSONNAGE' | 'SOUVENIR' | 'LIEU' | 'OBJET' | 'REFERENCE';
export type RevealPhase = 'NONE' | 'A' | 'B' | 'C';
export type CardSize = 'small' | 'normal' | 'large';

export interface CardData {
  id: string;
  name: string;
  title: string;
  type: CardType;
  overallScore: number;
  illustrationUrl?: string;
  iconUrl?: string;
  actionDescription: string;
  actionValue: number;
  loreAlbum?: string;
}

export interface CardFrameProps {
  card: CardData;
  rarity: CardRarity;
  mintNumber?: number;
  maxMint?: number;
  isFlipped?: boolean;
  revealPhase?: RevealPhase;
  size?: CardSize;
  onClick?: () => void;
}

export default function CardFrame({
  card,
  rarity,
  mintNumber,
  maxMint,
  isFlipped = false,
  revealPhase = 'NONE',
  size = 'normal',
  onClick,
}: CardFrameProps) {
  const [tilt, setTilt] = React.useState({ x: 50, y: 50 });
  const [spinning, setSpinning] = React.useState(false);
  const isHolo = rarity === 'SHINY' || rarity === 'GOLD' || rarity === 'ULTRA_RARE';
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHolo || size === 'small') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTilt({ x, y });
  };
  React.useEffect(() => {
    if (isFlipped && isHolo) {
      setSpinning(true);
      const t = setTimeout(() => setSpinning(false), 1400);
      return () => clearTimeout(t);
    }
  }, [isFlipped, isHolo]);
  // Helper to get CSS classes based on rarity
  const getRarityClass = (prefix: string) => {
    switch (rarity) {
      case 'COMMUNE': return styles[`${prefix}Commune`];
      case 'RARE': return styles[`${prefix}Rare`];
      case 'ULTRA_RARE': return styles[`${prefix}UltraRare`];
      case 'SHINY': return styles[`${prefix}Shiny`];
      case 'GOLD': return styles[`${prefix}Gold`];
      default: return styles[`${prefix}Commune`];
    }
  };

  // Helper to get size class
  const getSizeClass = () => {
    switch (size) {
      case 'small': return styles.cardSmall;
      case 'large': return styles.cardLarge;
      default: return '';
    }
  };

  // Helper to get reveal phase class
  const getRevealClass = () => {
    switch (revealPhase) {
      case 'A': return styles.revealPhaseA;
      case 'B': return styles.revealPhaseB;
      case 'C': return styles.revealPhaseC;
      default: return '';
    }
  };

  const wrapperClasses = [
    styles.cardWrapper,
    isFlipped ? styles.cardFlipped : '',
    spinning ? styles.spinning : '',
    getSizeClass(),
  ].filter(Boolean).join(' ');

  const isFullBleed = rarity === 'ULTRA_RARE' || rarity === 'SHINY' || rarity === 'GOLD';
  const frontClasses = [
    styles.cardFront,
    getRevealClass(),
    (revealPhase==='C' && rarity==='ULTRA_RARE') ? styles.ultraBg : '',
    isFullBleed ? styles.isFullBleed : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={wrapperClasses}
      onClick={onClick}
      onMouseMove={handleMove}
      data-tilt={isHolo ? '1' : '0'}
      style={isHolo ? ({ ['--mx' as any]: tilt.x, ['--my' as any]: tilt.y } as React.CSSProperties) : undefined}
    >
      <div className={styles.cardInner}>
        <div className={styles.cardBack}>
          <div className={styles.cardBackLogo}>🃏</div>
        </div>

        <div className={frontClasses}>
          <div className={`${styles.cardFrame} ${getRarityClass('frame')}`} />

          {rarity === 'ULTRA_RARE' && <div className={styles.ultraOverlay} />}
          {rarity === 'SHINY' && <div className={styles.shinyOverlay} />}
          {rarity === 'GOLD' && <div className={styles.goldOverlay}><i/><i/><i/></div>}

          {/* Header (Phase A) */}
          <div className={styles.cardHeader}>
            <div className={styles.cardNameBlock}>
              <h2 className={styles.cardName}>{card.name}</h2>
              <p className={styles.cardTitle}>{card.title}</p>
            </div>
            <div className={`${styles.cardScore} ${getRarityClass('score')}`}>
              {card.overallScore}
            </div>
          </div>

          {/* Illustration (Phase C) */}
          <div className={styles.cardIllustration}>
            {card.illustrationUrl ? (
              <img src={card.illustrationUrl} alt={card.name} className={styles.illustrationImg} />
            ) : (
              <div className={styles.illustrationPlaceholder}>
                <span className={styles.placeholderIcon}>🖼️</span>
                <span>Visuel en attente</span>
              </div>
            )}
          </div>

          {/* Action (Phase B) */}
          <div className={styles.cardAction}>
            <div className={styles.actionRow}>
              <div className={styles.actionIcon}>{card.iconUrl ? <img src={card.iconUrl} alt="icon" style={{width: '100%', height: '100%'}}/> : '⚔️'}</div>
              <p className={styles.actionText}>{card.actionDescription}</p>
              <div className={styles.actionValue}>{card.actionValue}</div>
            </div>
          </div>

          {/* Footer (Phase A) */}
          <div className={styles.cardFooter}>
            <span className={styles.cardTypeBadge}>{card.type}</span>
            {(rarity === 'ULTRA_RARE' || rarity === 'SHINY' || rarity === 'GOLD') && mintNumber && maxMint ? (
              <span className={`${styles.mintNumber} ${getRarityClass('mint')}`}>
                #{String(mintNumber).padStart(2, '0')} / {String(maxMint).padStart(2, '0')}
              </span>
            ) : (
              <span className={`${styles.mintNumber} ${styles.mintCommune}`}>
                —
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
