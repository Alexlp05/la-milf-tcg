'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './admin.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'PENDING' | 'APPROVED' | 'BANNED';
  role: 'PLAYER' | 'ADMIN';
  dustBalance: number;
  _count: { cards: number; boosters: number };
  createdAt: string;
  approvedAt: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'users' | 'cards'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sendPack, setSendPack] = useState<{ userId: string | 'all'; type: 'STANDARD' | 'PREMIUM' | 'WELCOME'; count: number } | null>(null);

  // Auth protection
  if (status === 'loading') return <div className={styles.loading}>Chargement...</div>;
  
  if (!session || session.user.role !== 'ADMIN') {
    return (
      <div style={{textAlign: 'center', padding: '100px 20px'}}>
        <h2>Accès Refusé</h2>
        <p>Tu n'es pas administrateur.</p>
        <button className="btn btn-primary" onClick={() => router.push('/')} style={{marginTop: '20px'}}>
          Retour à l'accueil
        </button>
      </div>
    );
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'approve' | 'ban' | 'unban') => {
    setActionLoading(userId);
    try {
      const updates: { status?: string; role?: string } = {};
      if (action === 'approve') updates.status = 'APPROVED';
      if (action === 'ban') updates.status = 'BANNED';
      if (action === 'unban') updates.status = 'APPROVED';

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });

      if (!res.ok) throw new Error('Erreur');
      await fetchUsers();
    } catch (e) {
      alert('Erreur lors de la mise à jour');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendPack = async (userId: string | 'all') => {
    if (!sendPack) return;
    setActionLoading('sendpack');
    try {
      const res = await fetch('/api/admin/boosters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId === 'all' ? undefined : userId,
          allUsers: userId === 'all',
          packType: sendPack.type,
          count: sendPack.count,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      await fetchUsers();
      setSendPack(null);
      alert(`${sendPack.count} booster(s) ${sendPack.type} envoyé(s) !`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openSendPackModal = (userId: string | 'all') => {
    setSendPack({ userId, type: 'STANDARD', count: 1 });
  };

  const statusLabels: Record<string, string> = {
    PENDING: 'En attente',
    APPROVED: 'Approuvé',
    BANNED: 'Banni',
  };

  const statusStyles: Record<string, string> = {
    PENDING: styles.statusPending,
    APPROVED: styles.statusApproved,
    BANNED: styles.statusBanned,
  };

  return (
    <main className={styles.adminPage}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          ← Retour
        </button>
        <h1 className={styles.headerTitle}>Administration</h1>
        <span className={styles.adminBadge}>Admin</span>
      </header>

      <div className={styles.content}>
        {/* Tabs */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Joueurs
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'cards' ? styles.active : ''}`}
            onClick={() => setActiveTab('cards')}
          >
            🎴 Base de données (Bientôt)
          </button>
        </div>

        {activeTab === 'users' && (
          <>
            {/* Send Pack Modal */}
            {sendPack && (
              <div className={styles.modalOverlay} onClick={() => setSendPack(null)}>
                <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                  <h3>{sendPack.userId === 'all' ? 'Envoyer à tous' : 'Envoyer un booster'}</h3>
                  <div className={styles.modalField}>
                    <label>Type</label>
                    <select
                      value={sendPack.type}
                      onChange={e => setSendPack({ ...sendPack, type: e.target.value as any })}
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="PREMIUM">Premium</option>
                      <option value="WELCOME">Bienvenue</option>
                    </select>
                  </div>
                  <div className={styles.modalField}>
                    <label>Quantité</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={sendPack.count}
                      onChange={e => setSendPack({ ...sendPack, count: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={() => setSendPack(null)}>Annuler</button>
                    <button 
                      className={`${styles.confirmBtn} ${actionLoading === 'sendpack' ? styles.loading : ''}`}
                      onClick={() => handleSendPack(sendPack.userId)}
                      disabled={actionLoading === 'sendpack'}
                    >
                      {actionLoading === 'sendpack' ? 'Envoi...' : `Envoyer ${sendPack.count} booster(s)`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.globalActions}>
              <div className={styles.globalActionsText}>
                <h3>Cadeau Global</h3>
                <p>Offrir des boosters à tous les joueurs approuvés</p>
              </div>
              <button className={`${styles.actionBtn} ${styles.sendPackBtn}`} onClick={() => openSendPackModal('all')}>
                🎁 Envoyer à tous
              </button>
            </div>

            {loading ? (
              <div className={styles.loading}>Chargement des joueurs...</div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Joueur</th>
                      <th>Statut</th>
                      <th>Ressources</th>
                      <th>Inscrit le</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className={styles.userCell}>
                            <div className={styles.userAvatar}>{user.name.charAt(0)}</div>
                            <div>
                              <span className={styles.userName}>
                                {user.name} {user.role === 'ADMIN' && '👑'}
                              </span>
                              <span className={styles.userEmail}>{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${statusStyles[user.status]}`}>
                            {statusLabels[user.status]}
                          </span>
                        </td>
                        <td>
                          <div style={{fontSize: '0.85rem'}}>
                            <div>📦 {user._count.boosters} Boosters</div>
                            <div style={{color: 'var(--color-accent-gold-dark)'}}>✨ {user.dustBalance} Poussière</div>
                          </div>
                        </td>
                        <td>
                          <span style={{fontSize: '0.8rem', color: 'var(--color-text-muted)'}}>
                            {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionGroup}>
                            {user.status === 'PENDING' && (
                              <button 
                                className={`${styles.actionBtn} ${styles.approveBtn}`}
                                onClick={() => handleUserAction(user.id, 'approve')}
                                disabled={actionLoading === user.id}
                              >
                                {actionLoading === user.id ? '...' : '✓ Approuver'}
                              </button>
                            )}
                            
                            {user.status === 'APPROVED' && user.role !== 'ADMIN' && (
                              <>
                                <button 
                                  className={`${styles.actionBtn} ${styles.sendPackBtn}`}
                                  onClick={() => openSendPackModal(user.id)}
                                  disabled={actionLoading === user.id}
                                >
                                  +1 Pack
                                </button>
                                <button 
                                  className={`${styles.actionBtn} ${styles.banBtn}`}
                                  onClick={() => handleUserAction(user.id, 'ban')}
                                  disabled={actionLoading === user.id}
                                >
                                  Bannir
                                </button>
                              </>
                            )}
                            
                            {user.status === 'BANNED' && (
                              <button 
                                className={`${styles.actionBtn} ${styles.approveBtn}`}
                                onClick={() => handleUserAction(user.id, 'unban')}
                                disabled={actionLoading === user.id}
                              >
                                Débannir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'cards' && (
          <div className="surface" style={{padding: '40px', textAlign: 'center'}}>
            <h2 style={{marginBottom: '10px'}}>Gestion des Cartes</h2>
            <p style={{color: 'var(--color-text-secondary)'}}>
              Cette section permettra de voir la liste complète des cartes, de modifier leur lore, 
              et de surveiller le nombre de cartes numérotées restantes en circulation.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}