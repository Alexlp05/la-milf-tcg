'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import styles from './login.module.css';

export default function LoginPage() {
  const { data: session, status } = useSession();

  // Loading state
  if (status === 'loading') {
    return (
      <main className={styles.loginPage}>
        <div className={styles.loginCard + ' surface-elevated'}>
          <div className={styles.brand}>
            <div className={styles.logoIcon}>🃏</div>
            <h1 className={styles.brandName}>
              La <span>Milf</span> TCG
            </h1>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        </div>
      </main>
    );
  }

  // User is logged in but PENDING approval
  if (session?.user?.status === 'PENDING') {
    return (
      <main className={styles.loginPage}>
        {/* Decorative floating cards */}
        <div className={`${styles.floatingCard} ${styles.floatingCard1}`} />
        <div className={`${styles.floatingCard} ${styles.floatingCard2}`} />
        <div className={`${styles.floatingCard} ${styles.floatingCard3}`} />

        <div className={styles.pendingCard + ' surface-elevated'}>
          <div className={styles.pendingIcon}>⏳</div>
          <h2 className={styles.pendingTitle}>En attente d&apos;approbation</h2>
          <p className={styles.pendingText}>
            Ton compte a bien été créé ! Un admin doit maintenant valider ton accès.
            <br />
            Reviens vérifier dans quelques minutes. 😉
          </p>
          <p className={styles.pendingText} style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Connecté en tant que <strong>{session.user.email}</strong>
          </p>
          <button
            className={styles.signOutLink}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Se déconnecter
          </button>
        </div>
      </main>
    );
  }

  // User is BANNED
  if (session?.user?.status === 'BANNED') {
    return (
      <main className={styles.loginPage}>
        <div className={styles.loginCard + ' surface-elevated'}>
          <div className={styles.pendingIcon}>🚫</div>
          <h2 className={styles.pendingTitle}>Accès refusé</h2>
          <p className={styles.pendingText}>
            Ton compte a été suspendu. Contacte un admin si tu penses que c&apos;est une erreur.
          </p>
          <button
            className={styles.signOutLink}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Se déconnecter
          </button>
        </div>
      </main>
    );
  }

  // Not logged in → show login form
  return (
    <main className={styles.loginPage}>
      {/* Decorative floating cards */}
      <div className={`${styles.floatingCard} ${styles.floatingCard1}`} />
      <div className={`${styles.floatingCard} ${styles.floatingCard2}`} />
      <div className={`${styles.floatingCard} ${styles.floatingCard3}`} />

      <div className={styles.loginCard + ' surface-elevated'}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>🃏</div>
          <h1 className={styles.brandName}>
            La <span>Milf</span> TCG
          </h1>
          <p className={styles.brandTagline}>
            Collecte tes potes en cartes épiques
          </p>
        </div>

        <div className={styles.divider}>connexion</div>

        <button
          className={styles.googleBtn}
          onClick={() => signIn('google', { callbackUrl: '/' })}
          id="google-signin-btn"
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continuer avec Google
        </button>

        <p className={styles.infoText}>
          <strong>Accès sur invitation.</strong> Après connexion, un admin devra approuver ton compte avant que tu puisses accéder aux boosters.
        </p>
      </div>
    </main>
  );
}
