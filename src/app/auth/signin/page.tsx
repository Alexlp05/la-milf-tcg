'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--text)] mb-2">
            La Milf TCG
          </h1>
          <p className="text-[var(--muted)] text-lg">Connecte-toi pour ouvrir tes boosters</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[var(--border)] p-8 shadow-xl">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error === 'AccessDenied' && 'Accès refusé. Ton compte est en attente de validation ou banni.'}
              {error === 'Configuration' && 'Erreur de configuration. Contacte un admin.'}
              {error === 'OAuthAccountNotLinked' && 'Ce compte est déjà lié à une autre méthode de connexion.'}
              {error === 'EmailSignIn' && 'Erreur lors de la connexion par email.'}
              {error === 'Callback' && 'Erreur lors du callback OAuth.'}
              {error === 'OAuthCallback' && 'Erreur OAuth. Réessaie.'}
              {error === 'Default' && 'Une erreur est survenue. Réessaie.'}
            </div>
          )}

          <button
            onClick={() => signIn('google', { callbackUrl })}
            className="w-full btn-premium py-4 text-lg flex items-center justify-center gap-3"
            type="button"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuer avec Google
          </button>

          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            En te connectant, tu acceptes nos{' '}
            <Link href="/terms" className="underline hover:text-[var(--gold)]">
              Conditions
            </Link>{' '}
            et{' '}
            <Link href="/privacy" className="underline hover:text-[var(--gold)]">
              Politique de confidentialité
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          Besoin d&apos;aide ? <Link href="/contact" className="underline hover:text-[var(--gold)]">Contacte-nous</Link>
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <SignInContent />
    </Suspense>
  );
}