'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

// 🎡 الجوائز الافتراضية
const DEFAULT_PRIZES = [
  { label: '50 Coin', type: 'coins', value: 50, icon: '🪙', color: '#FFD700' },
  { label: '100 Coin', type: 'coins', value: 100, icon: '🪙', color: '#FFA500' },
  { label: '10 XP', type: 'xp', value: 10, icon: '⭐', color: '#10b981' },
  { label: '20 XP', type: 'xp', value: 20, icon: '⭐', color: '#059669' },
  { label: '1 Gem', type: 'gems', value: 1, icon: '💎', color: '#8b5cf6' },
  { label: 'Badge', type: 'badge', value: '🎖️', icon: '🎖️', color: '#ef4444' },
  { label: 'Replay', type: 'replay', value: 1, icon: '🔄', color: '#3b82f6' },
  { label: '5 XP', type: 'xp', value: 5, icon: '⭐', color: '#6ee7b7' },
];

export default function SpinPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [prize, setPrize] = useState<any>(null);
  const [spinCount, setSpinCount] = useState(0);
  const [prizes, setPrizes] = useState<any[]>(DEFAULT_PRIZES);
  const [maxSpins, setMaxSpins] = useState(3);
  const [rotation, setRotation] = useState(0);
  const [message, setMessage] = useState('');
  const [todaySpins, setTodaySpins] = useState(0);
  const [lastSpinDate, setLastSpinDate] = useState<string>('');

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
      console.log('🔍 بدء جلب البيانات للمستخدم:', studentId);

      const settingsDoc = await getDoc(doc(db, 'spin_settings', 'spin_settings'));
      let maxSpinsFromSettings = 3;

      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        console.log('📋 إعدادات العجلة من Firebase:', data);
        
        if (data.prizes && data.prizes.length > 0) {
          setPrizes(data.prizes);
        }
        
        if (data.maxSpins) {
          maxSpinsFromSettings = Number(data.maxSpins);
          setMaxSpins(maxSpinsFromSettings);
          console.log('✅ عدد المحاولات من الإعدادات:', maxSpinsFromSettings);
        }
      } else {
        console.log('⚠️ لا توجد إعدادات، استخدم القيم الافتراضية');
        setMaxSpins(3);
      }

      const userRef = doc(db, 'users', studentId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('👤 بيانات المستخدم:', data);
        
        const today = new Date().toISOString().split('T')[0];
        const lastSpin = data.lastSpinDate || '';
        const count = data.spinCount || 0;
        const todaySpinsCount = data.todaySpins || 0;
        
        setSpinCount(count);
        setTodaySpins(todaySpinsCount);
        setLastSpinDate(lastSpin);

        console.log(`📊 اليوم: ${today}, آخر دوران: ${lastSpin}`);
        console.log(`📊 دوران اليوم: ${todaySpinsCount}, الحد الأقصى: ${maxSpinsFromSettings}`);

        // ✅ ✅ إصلاح منطق التحقق
        let canSpinNow = false;
        
        if (lastSpin !== today) {
          // ✅ يوم جديد → يسمح بالدوران من البداية
          canSpinNow = true;
          console.log('✅ يوم جديد، يسمح بالدوران');
        } else {
          // ✅ نفس اليوم → يسمح إذا لم يصل للحد الأقصى
          canSpinNow = todaySpinsCount < maxSpinsFromSettings;
          console.log(`✅ نفس اليوم، عدد المحاولات: ${todaySpinsCount}/${maxSpinsFromSettings}`);
        }

        setCanSpin(canSpinNow);
        console.log(`🎯 حالة الدوران النهائية: ${canSpinNow ? 'مسموح ✅' : 'ممنوع ❌'}`);
        
      } else {
        console.log('⚠️ مستخدم غير موجود في Firestore');
      }
      
    } catch (error) {
      console.error('❌ خطأ في جلب البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const spin = async () => {
    if (isSpinning || !canSpin || prizes.length === 0) {
      console.log('⚠️ لا يمكن الدوران:', { isSpinning, canSpin, prizesLength: prizes.length });
      return;
    }

    console.log('🎡 بدء الدوران...');
    setIsSpinning(true);
    setPrize(null);
    setMessage('');

    const randomIndex = Math.floor(Math.random() * prizes.length);
    const selectedPrize = prizes[randomIndex];
    console.log('🎯 الجائزة المختارة:', selectedPrize);

    const segmentAngle = 360 / prizes.length;
    const targetAngle = 360 - (randomIndex * segmentAngle + segmentAngle / 2) + 90;
    const spins = 5 + Math.random() * 5;
    const totalRotation = rotation + spins * 360 + targetAngle;

    setRotation(totalRotation);

    setTimeout(async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        const newTodaySpins = (userData?.todaySpins || 0) + 1;
        const updates: any = {
          lastSpinDate: today,
          spinCount: (userData?.spinCount || 0) + 1,
          todaySpins: newTodaySpins,
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

        console.log('💾 حفظ البيانات:', updates);
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
        setTodaySpins(newTodaySpins);
        
        // ✅ ✅ إصلاح: التحقق من الوصول للحد الأقصى
        if (newTodaySpins >= maxSpins) {
          setCanSpin(false);
          console.log(`⛔ الوصول للحد الأقصى: ${newTodaySpins}/${maxSpins}`);
        } else {
          // ✅ ✅ لو لسة في محاولات، خلي الدوران مسموح
          setCanSpin(true);
          console.log(`✅ باقي محاولات: ${maxSpins - newTodaySpins}`);
        }

        setMessage(`🎉 حصلت على ${selectedPrize.icon} ${selectedPrize.label}!`);
        console.log('✅ تم الدوران بنجاح');
        
      } catch (error) {
        console.error('❌ خطأ في حفظ النتيجة:', error);
        setMessage('❌ حدث خطأ في حفظ النتيجة');
      } finally {
        setIsSpinning(false);
      }
    }, 4000);
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
          <div style={styles.spinsInfo}>
            <p style={styles.subtitle}>
              {canSpin
                ? `✅ مسموح بالدوران (${todaySpins}/${maxSpins})`
                : `⏳ انتظر غداً للدوران مرة أخرى (${todaySpins}/${maxSpins})`}
            </p>
            <p style={styles.spinCount}>🔄 إجمالي مرات الدوران: {spinCount}</p>
            
            <div style={styles.progressBar}>
              <div style={{
                ...styles.progressFill,
                width: `${(todaySpins / maxSpins) * 100}%`
              }}></div>
            </div>
            <p style={styles.progressText}>
              استهلاك المحاولات: {todaySpins} من {maxSpins}
            </p>
          </div>

          <div style={styles.wheelContainer}>
            <div style={styles.wheelWrapper}>
              <div style={styles.pointer}>▼</div>
              <div style={styles.wheel}>
                <svg
                  viewBox="0 0 200 200"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  {prizes.map((p, i) => {
                    const startAngle = (i * 360) / prizes.length;
                    const endAngle = ((i + 1) * 360) / prizes.length;
                    const midAngle = (startAngle + endAngle) / 2;
                    const radius = 90;
                    const center = 100;

                    const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
                    const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
                    const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
                    const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);

                    const textRadius = 55;
                    const tx = center + textRadius * Math.cos((midAngle * Math.PI) / 180);
                    const ty = center + textRadius * Math.sin((midAngle * Math.PI) / 180);

                    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

                    return (
                      <g key={i}>
                        <path
                          d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={p.color || '#4a4a6a'}
                          stroke="#1a1a2e"
                          strokeWidth="2"
                        />
                        <text
                          x={tx}
                          y={ty}
                          fill="#ffffff"
                          fontSize="14"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                            pointerEvents: 'none',
                          }}
                        >
                          {p.icon}
                        </text>
                        <text
                          x={tx}
                          y={ty + 20}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                            pointerEvents: 'none',
                            opacity: 0.9,
                          }}
                        >
                          {p.label}
                        </text>
                        {/* ✅ ✅ عرض القيمة على العجلة */}
                        <text
                          x={tx}
                          y={ty + 34}
                          fill="#FFD700"
                          fontSize="8"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                            pointerEvents: 'none',
                            opacity: 0.9,
                          }}
                        >
                          {p.type === 'badge' ? '🎖️' : `+${p.value}`}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* ✅ ✅ عرض الجائزة مع القيمة */}
          {prize && (
            <div style={styles.prizeDisplay}>
              <span style={styles.prizeIcon}>{prize.icon}</span>
              <span style={styles.prizeText}>
                🎉 {prize.label}
                <span style={styles.prizeValue}>
                  {prize.type === 'badge' ? '🎖️' : `+${prize.value}`}
                </span>
              </span>
            </div>
          )}

          {message && (
            <div style={{
              ...styles.message,
              background: message.includes('🎉') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              color: message.includes('🎉') ? '#34d399' : '#f87171',
              border: `1px solid ${message.includes('🎉') ? '#34d399' : '#f87171'}`,
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

          {/* ✅ ✅ قائمة الجوائز مع القيمة */}
          <div style={styles.prizesList}>
            <h4 style={styles.prizesTitle}>🎁 الجوائز المتاحة:</h4>
            <div style={styles.prizesGrid}>
              {prizes.map((p, index) => (
                <div key={index} style={{
                  ...styles.prizeItem,
                  background: p.color ? `${p.color}33` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${p.color || 'rgba(255,255,255,0.1)'}`,
                }}>
                  <span style={styles.prizeItemIcon}>{p.icon}</span>
                  <span style={styles.prizeItemLabel}>{p.label}</span>
                  <span style={styles.prizeItemValue}>
                    {p.type === 'badge' ? '🎖️' : `+${p.value}`}
                  </span>
                </div>
              ))}
            </div>
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
    background: '#0a0a14',
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
    color: 'white',
  },
  main: {
    maxWidth: '600px',
    margin: '30px auto',
    padding: '0 20px',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '20px',
    padding: '30px',
    border: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'center',
  },
  spinsInfo: {
    marginBottom: '20px',
  },
  subtitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '5px',
  },
  spinCount: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '10px',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '5px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
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
    border: '3px solid rgba(255,215,0,0.3)',
    background: '#1a1a2e',
  },
  pointer: {
    position: 'absolute',
    top: '-5px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '28px',
    color: '#FFD700',
    zIndex: 10,
    textShadow: '0 0 20px rgba(255,215,0,0.8)',
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
    flexWrap: 'wrap' as const,
  },
  prizeIcon: {
    fontSize: '28px',
  },
  prizeText: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FFD700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  prizeValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#34d399',
    background: 'rgba(16,185,129,0.15)',
    padding: '2px 12px',
    borderRadius: '20px',
    border: '1px solid rgba(16,185,129,0.2)',
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
  prizesList: {
    marginTop: '20px',
    textAlign: 'right',
  },
  prizesTitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '10px',
    textAlign: 'center',
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
    borderRadius: '20px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.8)',
  },
  prizeItemIcon: {
    fontSize: '16px',
  },
  prizeItemLabel: {
    fontSize: '12px',
  },
  prizeItemValue: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.5)',
    marginRight: '4px',
    background: 'rgba(255,255,255,0.05)',
    padding: '1px 8px',
    borderRadius: '12px',
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