'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './admin.module.css';

// Mock data for MVP
const MOCK_USERS = [
  { id: '1', name: 'Maxime', email: 'maxime@example.com', status: 'PENDING', role: 'PLAYER', dust: 0, packs: 0 },
  { id: '2', name: 'Ludo', email: 'ludo@example.com', status: 'APPROVED', role: 'PLAYER', dust: 150, packs: 2 },
  { id: '3', name: 'Admin', email: 'admin@lamilf.com', status: 'APPROVED', role: 'ADMIN', dust: 9999, packs: 50 },
  { id: '4', name: 'Kévin', email: 'kevin@example.com', status: 'BANNED', role: 'PLAYER', dust: 0, packs: 0 },
];

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'users' | 'cards'>('users');
  const [users, setUsers] = useState(MOCK_USERS);

  // Auth protection (in a real app, this is also checked on the server)
  if (status === 'loading') return <div className="spinner" style={{margin: '100px auto'}}/>;
  
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

  const handleApprove = (userId: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, status: 'APPROVED' } : u));
    alert(`Utilisateur approuvé. Dans la version finale, il recevra automatiquement 3 boosters.`);
  };

  const handleBan = (userId: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, status: 'BANNED' } : u));
  };

  const handleSendPack = (userId: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, packs: u.packs + 1 } : u));
    alert("1 Booster envoyé !");
  };

  const handleSendToAll = () => {
    setUsers(users.map(u => u.status === 'APPROVED' ? { ...u, packs: u.packs + 1 } : u));
    alert("1 Booster envoyé à tous les joueurs approuvés !");
  };

  return (
    <main className={styles.adminPage}>
      {/* Header */}
      <header className={styles.header}>
        <button className="btn" onClick={() => router.push('/')} style={{padding: '8px', border: '1px solid #ddd'}}>
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
            <div className={styles.globalActions}>
              <div className={styles.globalActionsText}>
                <h3>Cadeau Global</h3>
                <p>Offrir 1 booster à tous les joueurs approuvés (pour célébrer un event par ex.)</p>
              </div>
              <button className={`${styles.actionBtn} ${styles.sendPackBtn}`} onClick={handleSendToAll}>
                🎁 Envoyer à tous
              </button>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Joueur</th>
                    <th>Statut</th>
                    <th>Ressources</th>
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
                        <span className={`${styles.statusBadge} ${
                          user.status === 'PENDING' ? styles.statusPending : 
                          user.status === 'APPROVED' ? styles.statusApproved : 
                          styles.statusBanned
                        }`}>
                          {user.status === 'PENDING' ? 'En attente' :
                           user.status === 'APPROVED' ? 'Approuvé' : 'Banni'}
                        </span>
                      </td>
                      <td>
                        <div style={{fontSize: '0.85rem'}}>
                          <div>📦 {user.packs} Boosters</div>
                          <div style={{color: 'var(--color-accent-gold-dark)'}}>✨ {user.dust} Poussière</div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.actionGroup}>
                          {user.status === 'PENDING' && (
                            <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={() => handleApprove(user.id)}>
                              ✓ Approuver
                            </button>
                          )}
                          
                          {user.status === 'APPROVED' && user.role !== 'ADMIN' && (
                            <>
                              <button className={`${styles.actionBtn} ${styles.sendPackBtn}`} onClick={() => handleSendPack(user.id)}>
                                +1 Pack
                              </button>
                              <button className={`${styles.actionBtn} ${styles.banBtn}`} onClick={() => handleBan(user.id)}>
                                Bannir
                              </button>
                            </>
                          )}
                          
                          {user.status === 'BANNED' && (
                            <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={() => handleApprove(user.id)}>
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
