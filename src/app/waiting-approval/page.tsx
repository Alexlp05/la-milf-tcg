'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function WaitingApprovalPage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[var(--border)] p-8 shadow-xl">
          <div className="w-16 h-16 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)] mb-2">Compte en attente</h1>
          <p className="text-[var(--muted)] mb-6">
            Ton inscription a bien été prise en compte. Un administrateur doit valider ton compte
            avant que tu puisses ouvrir des boosters et collectionner des cartes.
          </p>
          {session?.user?.email && (
            <p className="text-sm text-[var(--muted)] mb-4 font-mono bg-[var(--bg)] px-3 py-2 rounded">
              {session.user.email}
            </p>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="btn-premium inline-block w-full py-3 border border-[var(--border)] bg-transparent hover:bg-[var(--bg)]"
          >
            Se déconnecter
          </button>
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