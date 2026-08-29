'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './shop.module.css';

export default function ShopPage(){
  const router = useRouter();
  const { status } = useSession();
  const [dust, setDust] = useState<number>(0);
  const [costs, setCosts] = useState({ STANDARD:100, PREMIUM:500 });
  const [buying, setBuying] = useState<string|null>(null);

  useEffect(()=>{
    fetch('/api/me').then(r=>r.json()).then(d=> setDust(d.user?.dustBalance ?? 0)).catch(()=>{});
    fetch('/api/shop/buy').then(r=>r.json()).then(d=> setCosts(d)).catch(()=>{});
  },[]);

  const buy = async (type:'STANDARD'|'PREMIUM')=>{
    setBuying(type);
    const r = await fetch('/api/shop/buy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({packType:type,count:1})});
    const d = await r.json();
    if (!r.ok) alert(d.error); else { setDust(d.dustBalance); alert(`${d.packs} booster ${type} acheté pour ${d.cost} poussière !`); }
    setBuying(null);
  };

  if (status==='loading') return <div style={{display:'flex',justifyContent:'center',padding:100}}><div className="spinner"/></div>;
  if (status==='unauthenticated') { router.replace('/login'); return null; }

  return (
    <main className={styles.shopPage}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={()=>router.push('/')}>←</button>
        <h1 className={styles.headerTitle}>Boutique</h1>
        <div className={styles.dustBadge}>✨ {dust}</div>
      </header>
      <div className={styles.content}>
        <p className={styles.hint}>Dépense ta poussière obtenue en recyclant des doublons.</p>
        <div className={styles.grid}>
          <div className={`${styles.shopCard} ${styles.standard}`}>
            <div className={styles.cardIcon}>📦</div>
            <h3>Booster Standard</h3>
            <p>3 cartes — 90% COMMUNE / 10% RARE + Hit 70/20/8/2</p>
            <div className={styles.price}>✨ {costs.STANDARD}</div>
            <button className={`btn btn-primary ${styles.buyBtn}`} onClick={()=>buy('STANDARD')} disabled={buying==='STANDARD' || dust < costs.STANDARD}>{buying==='STANDARD'?'Achat...': dust < costs.STANDARD ? 'Pas assez' : 'Acheter 1'}</button>
          </div>
          <div className={`${styles.shopCard} ${styles.premium}`}>
            <div className={styles.cardIcon}>👑</div>
            <h3>Booster Premium</h3>
            <p>2 cartes — min ULTRA_RARE (60/30/10) + holo garanti</p>
            <div className={styles.price}>✨ {costs.PREMIUM}</div>
            <button className={`btn btn-primary ${styles.buyBtn}`} onClick={()=>buy('PREMIUM')} disabled={buying==='PREMIUM' || dust < costs.PREMIUM}>{buying==='PREMIUM'?'Achat...': dust < costs.PREMIUM ? 'Pas assez' : 'Acheter 1'}</button>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.linkBtn} onClick={()=>router.push('/open-pack')}>Ouvrir mes boosters →</button>
          <button className={styles.linkBtn} onClick={()=>router.push('/collection')}>Voir collection →</button>
        </div>
      </div>
    </main>
  );
}
