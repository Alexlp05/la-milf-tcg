'use client';

import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import styles from './home.module.css';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Not authenticated → redirect to login
  if (status === 'loading') {
    return (
      <main className={styles.homePage}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
          <div className="spinner" />
        </div>
      </main>
    );
  }

  if (!session) {
    redirect('/login');
  }

  if (session.user.status === 'PENDING') {
    redirect('/login');
  }

  if (session.user.status === 'BANNED') {
    redirect('/login');
  }

  const user = session.user;
  const initials = user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase();

  // Mock data for now (will be replaced with API calls)
  const unopenedPacks = 3;
  const totalCards = 0;
  const uniqueCards = 0;

  return (
    <main className={styles.homePage}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerLogo}>🃏</span>
          <span className={styles.headerTitle}>
            La <span>Milf</span> TCG
          </span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.dustDisplay}>
            <span className={styles.dustIcon}>✨</span>
            {user.dustBalance}
          </div>
          <div style={{ position: 'relative' }}>
            <div
              className={styles.avatar}
              onClick={() => setShowUserMenu(!showUserMenu)}
              id="user-avatar"
            >
              {user.image ? (
                <img src={user.image} alt={user.username} className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarPlaceholder}>{initials}</div>
              )}
            </div>

            {showUserMenu && (
              <div className={styles.userMenu}>
                <div className={styles.userMenuItem} style={{ fontWeight: 600, pointerEvents: 'none' }}>
                  {user.username}
                </div>
                <div className={styles.userMenuItem} style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>
                  {user.email}
                </div>
                <div className={styles.userMenuDivider} />
                {user.role === 'ADMIN' && (
                  <a href="/admin" className={styles.userMenuItem}>
                    ⚙️ Administration
                  </a>
                )}
                <button
                  className={`${styles.userMenuItem} ${styles.userMenuDanger}`}
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className={styles.content}>
        {/* Welcome */}
        <div className={styles.welcomeSection}>
          <h1 className={styles.welcomeText}>
            Salut {user.username} 👋
          </h1>
          <p className={styles.welcomeSubtext}>
            Prêt à découvrir tes nouvelles cartes ?
          </p>
        </div>

        {/* Boosters */}
        <section className={styles.boosterSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              📦 Tes Boosters
              {unopenedPacks > 0 && (
                <span className={styles.boosterCount}>{unopenedPacks}</span>
              )}
            </h2>
          </div>

          {unopenedPacks > 0 ? (
            <div className={`${styles.boosterCard} surface`}>
              <div className={styles.boosterPackIcon}>📦</div>
              <div className={styles.boosterInfo}>
                <h3 className={styles.boosterTitle}>Booster Standard</h3>
                <p className={styles.boosterDesc}>
                  {unopenedPacks} paquet{unopenedPacks > 1 ? 's' : ''} à ouvrir • 3 cartes par paquet
                </p>
              </div>
              <button className="btn btn-primary" id="open-booster-btn">
                Ouvrir
              </button>
            </div>
          ) : (
            <div className={`${styles.emptyBoosters} surface`}>
              <div className={styles.emptyIcon}>📭</div>
              <p className={styles.emptyText}>
                Aucun booster disponible. Gagne de la poussière pour en acheter dans la boutique !
              </p>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <div className={styles.quickActions}>
            <a href="/collection" className={`${styles.quickAction} surface`}>
              <div className={styles.quickActionIcon}>🎴</div>
              <div className={styles.quickActionLabel}>Ma Collection</div>
            </a>
            <a href="/shop" className={`${styles.quickAction} surface`}>
              <div className={styles.quickActionIcon}>🛍️</div>
              <div className={styles.quickActionLabel}>Boutique</div>
            </a>
          </div>
        </section>

        {/* Stats */}
        <section>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>📊 Mes Stats</h2>
          </div>
          <div className={`${styles.statsGrid} surface`}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{totalCards}</div>
              <div className={styles.statLabel}>Cartes</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{uniqueCards}</div>
              <div className={styles.statLabel}>Uniques</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{user.dustBalance}</div>
              <div className={styles.statLabel}>Poussière</div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Navigation */}
      <nav className={styles.bottomNav}>
        <a href="/" className={`${styles.navItem} ${styles.navItemActive}`} id="nav-home">
          <span className={styles.navIcon}>🏠</span>
          <span className={styles.navLabel}>Accueil</span>
        </a>
        <a href="/collection" className={styles.navItem} id="nav-collection">
          <span className={styles.navIcon}>🎴</span>
          <span className={styles.navLabel}>Collection</span>
        </a>
        <a href="/open-pack" className={styles.navItem} id="nav-open">
          <span className={styles.navIcon}>📦</span>
          <span className={styles.navLabel}>Ouvrir</span>
        </a>
        <a href="/shop" className={styles.navItem} id="nav-shop">
          <span className={styles.navIcon}>🛍️</span>
          <span className={styles.navLabel}>Boutique</span>
        </a>
      </nav>
    </main>
  );
}
