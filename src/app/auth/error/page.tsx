'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const messages: Record<string, { title: string; description: string }> = {
    AccessDenied: {
      title: 'Accès refusé',
      description: 'Ton compte est en attente de validation par un admin ou a été banni.',
    },
    Configuration: {
      title: 'Erreur de configuration',
      description: 'Problème côté serveur. Contacte un administrateur.',
    },
    OAuthAccountNotLinked: {
      title: 'Compte déjà lié',
      description: 'Cet email est déjà associé à une autre méthode de connexion.',
    },
    Default: {
      title: 'Erreur de connexion',
      description: 'Une erreur inattendue est survenue. Réessaie dans quelques instants.',
    },
  };

  const msg = messages[error || 'Default'] || messages.Default;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[var(--border)] p-8 shadow-xl">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)] mb-2">{msg.title}</h1>
          <p className="text-[var(--muted)] mb-6">{msg.description}</p>
          <Link href="/auth/signin" className="btn-premium inline-block w-full py-3">
            Réessayer la connexion
          </Link>
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          <Link href="/" className="underline hover:text-[var(--gold)]">
            ← Retour à l'accueil
          </Link>
        </p>
      </div>
    </main>
  );
}

import { Suspense } from 'react';

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}