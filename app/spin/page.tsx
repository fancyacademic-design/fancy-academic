'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function SpinPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [prize, setPrize] = useState<any>(null);
  const [spinCount, setSpinCount] = useState(0);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [frequency, setFrequency] = useState('daily');
  const [maxSpins, setMaxSpins] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [message, setMessage] = useState('');
  const [todaySpins, setTodaySpins] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role !== 'student') {
      router.push('/login');
      return;
    }
    setUser(parsed);
    fetchData(parsed.id);
  }, [router]);

  const fetchData = async (studentId: string) => {
    try {
      // جلب إعدادات العجلة
      const settingsDoc = await getDoc(doc(db, 'spin_settings', 'spin_settings'));
      let prizesData = [];
      let frequencyData = 'daily';
      let maxSpinsData = 1;

      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        prizesData = data.prizes || [];
        frequencyData = data.frequency || 'daily';
        maxSpinsData = data.maxSpins || 1;
        setPrizes(prizesData);
        setFrequency(frequencyData);
        setMaxSpins(maxSpinsData);
        console.log('✅ الجوائز المحملة:', prizesData);
      } else {
        // إعدادات افتراضية
        const defaultPrizes = [
          { label: '50 Coin', type: 'coins', value: 50, icon: '🪙', color: '#FFD700' },
          { label: '100 Coin', type: 'coins', value: 100, icon: '🪙', color: '#FFA500' },
          { label: '10 XP', type: 'xp', value: 10, icon: '⭐', color: '#10b981' },
          { label: '20 XP', type: 'xp', value: 20, icon: '⭐', color: '#059669' },
          { label: '1 Gem', type: 'gems', value: 1, icon: '💎', color: '#8b5cf6' },
          { label: 'Badge', type: 'badge', value: '🎖️', icon: '🎖️', color: '#ef4444' },
          { label: 'Replay', type: 'replay', value: 1, icon: '🔄', color: '#3b82f6' },
          { label: '5 XP', type: 'xp', value: 5, icon: '⭐', color: '#6ee7b7' },
        ];
        setPrizes(defaultPrizes);
      }

      // جلب حالة المستخدم
      const userRef = doc(db, 'users', studentId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        const lastSpin = data.lastSpinDate;
        const count = data.spinCount || 0;
        const todaySpinsCount = data.todaySpins || 0;
        setSpinCount(count);
        setTodaySpins(todaySpinsCount);

        const today = new Date().toISOString().split('T')[0];
        let canSpinNow = false;

        if (frequencyData === 'daily') {
          canSpinNow = lastSpin !== today || todaySpinsCount < maxSpinsData;
        } else if (frequencyData === 'weekly') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          canSpinNow = !lastSpin || new Date(lastSpin) < weekAgo;
        } else if (frequencyData === 'monthly') {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          canSpinNow = !lastSpin || new Date(lastSpin) < monthAgo;
        }

        setCanSpin(canSpinNow);
      }
    } catch (error) {
      console.error('❌ خطأ في جلب البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const spin = async () => {
    if (isSpinning || !canSpin || prizes.length === 0) {
      console.log('⚠️ لا يمكن الدوران');
      return;
    }
    
    setIsSpinning(true);
    setPrize(null);
    setMessage('');

    const randomIndex = Math.floor(Math.random() * prizes.length);
    const selectedPrize = prizes[randomIndex];
    console.log('🎯 الجائزة المختارة:', selectedPrize);

    const spins = 5 + Math.random() * 5;
    const angle = 360 / prizes.length;
    const totalRotation = spins * 360 + randomIndex * angle + Math.random() * angle;
    setRotation(totalRotation);

    await new Promise(resolve => setTimeout(resolve, 4000));

    try {
      const today = new Date().toISOString().split('T')[0];
      const userRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      let updates: any = {
        lastSpinDate: today,
        spinCount: (userData?.spinCount || 0) + 1,
        todaySpins: (userData?.todaySpins || 0) + 1,
      };

      if (selectedPrize.type === 'coins') {
        updates.coins = (userData?.coins || 0) + Number(selectedPrize.value);
      } else if (selectedPrize.type === 'xp') {
        updates.xp = (userData?.xp || 0) + Number(selectedPrize.value);
      } else if (selectedPrize.type === 'gems') {
        updates.gems = (userData?.gems || 0) + Number(selectedPrize.value);
      } else if (selectedPrize.type === 'badge') {
        const badges = userData?.badges || [];
        badges.push(selectedPrize.value);
        updates.badges = badges;
      }

      await updateDoc(userRef, updates);

      await addDoc(collection(db, 'spin_history'), {
        studentId: user.id,
        prize: selectedPrize.label,
        prizeType: selectedPrize.type,
        prizeValue: selectedPrize.value,
        spinDate: today,
        createdAt: serverTimestamp(),
      });

      setPrize(selectedPrize);
      setTodaySpins(prev => prev + 1);
      if (todaySpins + 1 >= maxSpins) {
        setCanSpin(false);
      }
      setMessage(`🎉 حصلت على ${selectedPrize.icon} ${selectedPrize.label}!`);
    } catch (error) {
      console.error('❌ خطأ في حفظ النتيجة:', error);
      setMessage('❌ حدث خطأ في حفظ النتيجة');
    } finally {
      setIsSpinning(false);
    }
  };

  const resetWheel = () => {
    setRotation(0);
    setPrize(null);
    setMessage('');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/platform" style={styles.backButton}>← العودة</Link>
          <h1 style={styles.title}>🎡 عجلة الحظ</h1>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <p style={styles.subtitle}>
            {canSpin
              ? `اضغط للدوران! (${todaySpins}/${maxSpins} مرات اليوم)`
              : `⏳ انتظر غداً للدوران مرة أخرى`}
          </p>
          <p style={styles.spinCount}>🔄 إجمالي مرات الدوران: {spinCount}</p>

          {/* قائمة الجوائز المعروضة */}
          <div style={styles.prizesList}>
            <h4 style={styles.prizesTitle}>🎁 الجوائز المتاحة:</h4>
            <div style={styles.prizesGrid}>
              {prizes.map((p, index) => (
                <div key={index} style={styles.prizeItem}>
                  <span style={styles.prizeItemIcon}>{p.icon}</span>
                  <span style={styles.prizeItemLabel}>{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* العجلة */}
          <div style={styles.wheelContainer}>
            <div style={styles.wheelWrapper}>
              <div
                style={{
                  ...styles.wheel,
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                }}
              >
                {prizes.length > 0 ? (
                  prizes.map((p, i) => {
                    const angle = 360 / prizes.length;
                    return (
                      <div
                        key={i}
                        style={{
                          ...styles.segment,
                          background: p.color || '#333',
                          transform: `rotate(${i * angle}deg) skewY(${90 - angle}deg)`,
                        }}
                      >
                        <div style={{ ...styles.segmentContent, transform: `skewY(${-(90 - angle)}deg)` }}>
                          <span style={styles.segmentIcon}>{p.icon || '🎁'}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.noPrizes}>لا توجد جوائز</div>
                )}
              </div>
              <div style={styles.pointer}>▼</div>
            </div>
          </div>

          {prize && (
            <div style={styles.prizeDisplay}>
              <span style={styles.prizeIcon}>{prize.icon}</span>
              <span style={styles.prizeText}>🎉 {prize.label}</span>
            </div>
          )}

          {message && (
            <div style={{
              ...styles.message,
              background: message.includes('🎉') ? '#d1fae5' : '#fee2e2',
              color: message.includes('🎉') ? '#065f46' : '#991b1b',
            }}>
              {message}
            </div>
          )}

          <div style={styles.buttonGroup}>
            <button
              onClick={spin}
              disabled={isSpinning || !canSpin || prizes.length === 0}
              style={{
                ...styles.spinButton,
                opacity: isSpinning || !canSpin || prizes.length === 0 ? 0.5 : 1,
                cursor: isSpinning || !canSpin || prizes.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {isSpinning ? '🌀 جاري الدوران...' : canSpin ? '🎡 دور الآن!' : '⏳ انتظر'}
            </button>
            <button onClick={resetWheel} style={styles.resetButton}>
              ↺ إعادة
            </button>
          </div>

          {prizes.length === 0 && (
            <p style={styles.noPrizesText}>⚠️ لا توجد جوائز. تواصل مع الأدمن.</p>
          )}

          <Link href="/platform" style={styles.backLink}>← العودة للمنصة</Link>
        </div>
      </main>
    </div>
  );
}

const styles: any = {
  container: {
    minHeight: '100vh',
    background: '#0a0a14',
    fontFamily: '"Cairo", "Segoe UI", Tahoma, sans-serif',
    direction: 'rtl',
    color: 'white',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a14',
    color: 'white',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 215, 0, 0.1)',
    borderTopColor: '#FFD700',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '15px',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  headerContent: {
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  backButton: {
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    fontSize: '14px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  main: {
    maxWidth: '600px',
    margin: '30px auto',
    padding: '0 20px',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '20px',
    padding: '30px',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '5px',
  },
  spinCount: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '15px',
  },
  prizesList: {
    marginBottom: '20px',
    textAlign: 'right',
  },
  prizesTitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '10px',
  },
  prizesGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
  },
  prizeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '20px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
  },
  prizeItemIcon: {
    fontSize: '16px',
  },
  prizeItemLabel: {
    fontSize: '12px',
  },
  wheelContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  wheelWrapper: {
    position: 'relative',
    width: '280px',
    height: '280px',
  },
  wheel: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '3px solid rgba(255,215,0,0.2)',
  },
  segment: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: '50%',
    transformOrigin: 'bottom right',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '-25px',
    marginLeft: '-10px',
  },
  segmentIcon: {
    fontSize: '28px',
  },
  noPrizes: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '16px',
  },
  pointer: {
    position: 'absolute',
    top: '-10px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '28px',
    color: '#FFD700',
    zIndex: 10,
  },
  prizeDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '12px 20px',
    background: 'rgba(255,215,0,0.08)',
    borderRadius: '12px',
    border: '1px solid rgba(255,215,0,0.12)',
    marginBottom: '15px',
    minHeight: '50px',
  },
  prizeIcon: {
    fontSize: '28px',
  },
  prizeText: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  message: {
    padding: '12px',
    borderRadius: '10px',
    marginBottom: '15px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  spinButton: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  resetButton: {
    padding: '12px 20px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.4)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '50px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  noPrizesText: {
    fontSize: '14px',
    color: '#ef4444',
    marginTop: '15px',
  },
  backLink: {
    display: 'block',
    marginTop: '20px',
    color: 'rgba(255,255,255,0.3)',
    textDecoration: 'none',
    fontSize: '14px',
  },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}