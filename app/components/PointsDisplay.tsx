// app/components/PointsDisplay.tsx
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getUserStats } from '@/lib/rewards';

interface PointsDisplayProps {
  userId: string;
  onLevelUp?: (newLevel: number) => void;
}

export default function PointsDisplay({ userId, onLevelUp }: PointsDisplayProps) {
  const [stats, setStats] = useState({
    xp: 0,
    coins: 0,
    level: 1,
    streak: 0,
    gems: 0,
    nextLevelXP: 100,
    levelProgress: 0,
  });
  const [loading, setLoading] = useState(true);
  const [prevLevel, setPrevLevel] = useState(1);

  useEffect(() => {
    if (!userId) return;

    // ✅ تحميل البيانات أول مرة
    const loadStats = async () => {
      const data = await getUserStats(userId);
      if (data) {
        setStats({
          xp: data.xp,
          coins: data.coins,
          level: data.level,
          streak: data.streak,
          gems: data.gems,
          nextLevelXP: data.nextLevelXP,
          levelProgress: data.levelProgress,
        });
        setPrevLevel(data.level);
        setLoading(false);
      }
    };
    loadStats();

    // ✅ استماع لتحديثات المستخدم في الوقت الفعلي
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const xp = data.xp || 0;
        const level = data.level || 1;
        const nextLevelXP = level * 100;
        const levelProgress = ((xp - (level - 1) * 100) / 100) * 100;

        // ✅ التحقق من رفع المستوى
        if (level > prevLevel && onLevelUp) {
          onLevelUp(level);
        }
        setPrevLevel(level);

        setStats({
          xp,
          coins: data.coins || 0,
          level,
          streak: data.streak || 0,
          gems: data.gems || 0,
          nextLevelXP,
          levelProgress: Math.min(Math.round(levelProgress), 100),
        });
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [userId, onLevelUp]);

  if (loading) {
    return (
      <div style={styles.container}>
        <span style={styles.loading}>⏳</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* ✅ شريط المستوى */}
      <div style={styles.levelSection}>
        <div style={styles.levelInfo}>
          <span style={styles.levelBadge}>🎯 المستوى {stats.level}</span>
          <span style={styles.xpText}>
            {stats.xp} / {stats.nextLevelXP} XP
          </span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${stats.levelProgress}%`,
            }}
          />
        </div>
      </div>

      {/* ✅ النقاط السريعة */}
      <div style={styles.badges}>
        <div style={styles.badge}>
          <span style={styles.badgeIcon}>⭐</span>
          <span style={styles.badgeValue}>{stats.xp}</span>
        </div>
        <div style={styles.badge}>
          <span style={styles.badgeIcon}>🔥</span>
          <span style={styles.badgeValue}>{stats.streak}</span>
        </div>
        <div style={styles.badge}>
          <span style={styles.badgeIcon}>💎</span>
          <span style={styles.badgeValue}>{stats.gems}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    minWidth: '200px',
  },
  levelSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  levelInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadge: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  xpText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },
  badges: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-around',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  badgeIcon: {
    fontSize: '16px',
  },
  badgeValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
  },
  loading: {
    fontSize: '20px',
    color: 'rgba(255,255,255,0.3)',
  },
};