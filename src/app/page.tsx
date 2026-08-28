'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './home.module.css';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [stats, setStats] = useState({ unopenedPacks: 0, totalCards: 0, uniqueCards: 0, dustBalance: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated') {
      const s = session?.user as any;
      if (s?.status === 'PENDING') router.replace('/waiting-approval');
      else if (s?.status === 'BANNED') router.replace('/login');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/me')
        .then(r => r.json())
        .then(d => {
          if (d.stats) setStats({ ...d.stats, dustBalance: d.user?.dustBalance ?? (session?.user as any)?.dustBalance ?? 0 });
        })
        .catch(() => {})
        .finally(() => setLoadingStats(false));
    }
  }, [status, session]);

  if (status === 'loading') {
    return (
      <main className={styles.homePage}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
          <div className="spinner" />
        </div>
      </main>
    );
  }

  if (!session) return null;
  if ((session.user as any).status === 'PENDING' || (session.user as any).status === 'BANNED') return null;

  const user = session.user as any;
  const initials = user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase();
  const dust = loadingStats ? user.dustBalance : stats.dustBalance;
  const unopenedPacks = stats.unopenedPacks;
  const totalCards = stats.totalCards;
  const uniqueCards = stats.uniqueCards;

  return (
    <main className={styles.homePage}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerLogo}>🃏</span>
          <span className={styles.headerTitle}>La <span>Milf</span> TCG</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.dustDisplay}>
            <span className={styles.dustIcon}>✨</span>{dust}
          </div>
          <div style={{ position: 'relative' }}>
            <div className={styles.avatar} onClick={() => setShowUserMenu(!showUserMenu)}>
              {user.image ? <img src={user.image} alt={user.username} className={styles.avatarImg} /> : <div className={styles.avatarPlaceholder}>{initials}</div>}
            </div>
            {showUserMenu && (
              <div className={styles.userMenu}>
                <div className={styles.userMenuItem} style={{ fontWeight: 600, pointerEvents: 'none' }}>{user.username || user.name}</div>
                <div className={styles.userMenuItem} style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>{user.email}</div>
                <div className={styles.userMenuDivider} />
                {user.role === 'ADMIN' && <Link href="/admin" className={styles.userMenuItem}>⚙️ Administration</Link>}
                <button className={`${styles.userMenuItem} ${styles.userMenuDanger}`} onClick={() => signOut({ callbackUrl: '/login' })}>Se déconnecter</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.welcomeSection}>
          <h1 className={styles.welcomeText}>Salut {user.username || user.name} 👋</h1>
          <p className={styles.welcomeSubtext}>Prêt à découvrir tes nouvelles cartes ?</p>
        </div>

        <section className={styles.boosterSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>📦 Tes Boosters {unopenedPacks > 0 && <span className={styles.boosterCount}>{unopenedPacks}</span>}</h2>
          </div>
          {loadingStats ? <div className="spinner" /> : unopenedPacks > 0 ? (
            <div className={`${styles.boosterCard} surface`}>
              <div className={styles.boosterPackIcon}>📦</div>
              <div className={styles.boosterInfo}>
                <h3 className={styles.boosterTitle}>Booster Standard</h3>
                <p className={styles.boosterDesc}>{unopenedPacks} paquet{unopenedPacks > 1 ? 's' : ''} à ouvrir • 3 cartes par paquet</p>
              </div>
              <Link href="/open-pack" className="btn btn-primary">Ouvrir</Link>
            </div>
          ) : (
            <div className={`${styles.emptyBoosters} surface`}>
              <div className={styles.emptyIcon}>📭</div>
              <p className={styles.emptyText}>Aucun booster disponible. Un admin doit t'en distribuer !</p>
            </div>
          )}
        </section>

        <section>
          <div className={styles.quickActions}>
            <Link href="/collection" className={`${styles.quickAction} surface`}>
              <div className={styles.quickActionIcon}>🎴</div><div className={styles.quickActionLabel}>Ma Collection</div>
            </Link>
            <a href="#" className={`${styles.quickAction} surface`} style={{ opacity: 0.5, pointerEvents: 'none' }}>
              <div className={styles.quickActionIcon}>🛍️</div><div className={styles.quickActionLabel}>Boutique (bientôt)</div>
            </a>
          </div>
        </section>

        <section>
          <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>📊 Mes Stats</h2></div>
          <div className={`${styles.statsGrid} surface`}>
            <div className={styles.statItem}><div className={styles.statValue}>{totalCards}</div><div className={styles.statLabel}>Cartes</div></div>
            <div className={styles.statItem}><div className={styles.statValue}>{uniqueCards}</div><div className={styles.statLabel}>Uniques</div></div>
            <div className={styles.statItem}><div className={styles.statValue}>{dust}</div><div className={styles.statLabel}>Poussière</div></div>
          </div>
        </section>
      </div>

      <nav className={styles.bottomNav}>
        <Link href="/" className={`${styles.navItem} ${styles.navItemActive}`}><span className={styles.navIcon}>🏠</span><span className={styles.navLabel}>Accueil</span></Link>
        <Link href="/collection" className={styles.navItem}><span className={styles.navIcon}>🎴</span><span className={styles.navLabel}>Collection</span></Link>
        <Link href="/open-pack" className={styles.navItem}><span className={styles.navIcon}>📦</span><span className={styles.navLabel}>Ouvrir</span></Link>
        <span className={styles.navItem} style={{ opacity: 0.4 }}><span className={styles.navIcon}>🛍️</span><span className={styles.navLabel}>Boutique</span></span>
      </nav>
    </main>
  );
}
