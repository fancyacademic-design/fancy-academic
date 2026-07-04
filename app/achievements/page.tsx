'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ACHIEVEMENTS = [
  { id: 'first_lesson', icon: '🎓', title: 'أول درس', description: 'إنهاء أول درس', xpBonus: 10 },
  { id: 'first_exam', icon: '📝', title: 'أول امتحان', description: 'حل أول امتحان', xpBonus: 15 },
  { id: 'streak_7', icon: '🔥', title: '7 أيام متواصلة', description: 'دخول 7 أيام متتالية', xpBonus: 25 },
  { id: 'streak_30', icon: '⭐', title: '30 يوماً متواصلاً', description: 'دخول 30 يوماً متتالية', xpBonus: 50 },
  { id: 'complete_subject', icon: '📚', title: 'إنهاء مادة', description: 'إنهاء مادة كاملة', xpBonus: 40 },
  { id: 'perfect_exam', icon: '🏆', title: 'امتحان ممتاز', description: 'الحصول على 90%+ في امتحان', xpBonus: 30 },
  { id: 'boss_defeated', icon: '👾', title: 'هزيمة Boss', description: 'هزيمة أول Boss', xpBonus: 35 },
];

export default function AchievementsPage() {
  const [userId, setUserId] = useState('');
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUserId(parsed.id);
      loadAchievements(parsed.id);
    }
  }, []);

  const loadAchievements = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUnlocked(data.achievements || []);
      }
    } catch (error) {
      console.error('❌ خطأ:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <span>جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/platform" style={styles.back}>← العودة</Link>
        <h1 style={styles.title}>🏆 الإنجازات</h1>
      </header>

      <main style={styles.main}>
        <div style={styles.grid}>
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = unlocked.includes(ach.id);
            return (
              <div
                key={ach.id}
                style={{
                  ...styles.card,
                  opacity: isUnlocked ? 1 : 0.4,
                  borderColor: isUnlocked ? '#FFD700' : 'rgba(255,255,255,0.05)',
                }}
              >
                <div style={styles.cardIcon}>{ach.icon}</div>
                <h3 style={styles.cardTitle}>{ach.title}</h3>
                <p style={styles.cardDesc}>{ach.description}</p>
                <span style={styles.cardBonus}>+{ach.xpBonus} XP</span>
                {isUnlocked ? (
                  <span style={styles.unlockedBadge}>✅ مفتوح</span>
                ) : (
                  <span style={styles.lockedBadge}>🔒 مقفل</span>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a14, #1a1a2e)',
    color: 'white',
    fontFamily: '"Cairo", sans-serif',
    direction: 'rtl' as const,
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  back: {
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '20px',
    border: '2px solid rgba(255,255,255,0.05)',
    textAlign: 'center' as const,
    transition: 'all 0.3s ease',
  },
  cardIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  cardDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '10px',
  },
  cardBonus: {
    display: 'inline-block',
    padding: '4px 12px',
    background: 'rgba(255,215,0,0.1)',
    color: '#FFD700',
    borderRadius: '20px',
    fontSize: '12px',
    marginBottom: '10px',
  },
  unlockedBadge: {
    display: 'block',
    padding: '6px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    borderRadius: '8px',
    fontSize: '13px',
  },
  lockedBadge: {
    display: 'block',
    padding: '6px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    borderRadius: '8px',
    fontSize: '13px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: 'white',
    fontSize: '18px',
  },
};