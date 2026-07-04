// app/components/SpinWheel.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface Prize {
  label: string;
  type: string;
  value: number | string;
  icon: string;
  color: string;
}

interface SpinWheelProps {
  studentId: string;
  onSpinComplete?: (prize: any) => void;
}

export default function SpinWheel({ studentId, onSpinComplete }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [loading, setLoading] = useState(true);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinCount, setSpinCount] = useState(0);
  const [todaySpins, setTodaySpins] = useState(0);
  const [maxSpins, setMaxSpins] = useState(3);
  const [lastSpinDate, setLastSpinDate] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [message, setMessage] = useState('');

  // جلب إعدادات العجلة من Firebase
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'spin_settings', 'spin_settings'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setPrizes(data.prizes || []);
          if (data.maxSpins) {
            setMaxSpins(Number(data.maxSpins));
          }
        } else {
          // إعدادات افتراضية
          setPrizes([
            { label: '50 Coin', type: 'coins', value: 50, icon: '🪙', color: '#FFD700' },
            { label: '100 Coin', type: 'coins', value: 100, icon: '🪙', color: '#FFA500' },
            { label: '10 XP', type: 'xp', value: 10, icon: '⭐', color: '#10b981' },
            { label: '20 XP', type: 'xp', value: 20, icon: '⭐', color: '#059669' },
            { label: '1 Gem', type: 'gems', value: 1, icon: '💎', color: '#8b5cf6' },
            { label: 'Badge', type: 'badge', value: '🎖️', icon: '🎖️', color: '#ef4444' },
            { label: 'Replay', type: 'replay', value: 1, icon: '🔄', color: '#3b82f6' },
            { label: '5 XP', type: 'xp', value: 5, icon: '⭐', color: '#6ee7b7' },
          ]);
          setMaxSpins(3);
        }
      } catch (error) {
        console.error('❌ خطأ في جلب الإعدادات:', error);
      }
    };
    fetchSettings();
  }, []);

  // التحقق من إمكانية الدوران
  useEffect(() => {
    const checkSpinStatus = async () => {
      if (!studentId) return;
      try {
        const userRef = doc(db, 'users', studentId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          const lastSpin = data.lastSpinDate || null;
          const count = data.spinCount || 0;
          const todaySpinsCount = data.todaySpins || 0;
          
          setSpinCount(count);
          setTodaySpins(todaySpinsCount);
          setLastSpinDate(lastSpin);

          const today = new Date().toISOString().split('T')[0];
          let canSpinNow = false;

          // ✅ نفس منطق الصفحة الرئيسية
          if (lastSpin !== today) {
            canSpinNow = true;
          } else {
            canSpinNow = todaySpinsCount < maxSpins;
          }

          setCanSpin(canSpinNow);
          console.log(`🎯 حالة الدوران: ${canSpinNow ? 'مسموح ✅' : 'ممنوع ❌'} (${todaySpinsCount}/${maxSpins})`);
        }
      } catch (error) {
        console.error('❌ خطأ في التحقق:', error);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) checkSpinStatus();
  }, [studentId, maxSpins]);

  // دالة الدوران
  const spin = async () => {
    if (isSpinning || !canSpin || prizes.length === 0) {
      console.log('⚠️ لا يمكن الدوران');
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

    // انتظار انتهاء الدوران
    setTimeout(async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const userRef = doc(db, 'users', studentId);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        const newTodaySpins = (userData?.todaySpins || 0) + 1;
        const updates: any = {
          lastSpinDate: today,
          spinCount: (userData?.spinCount || 0) + 1,
          todaySpins: newTodaySpins,
        };

        // إضافة الجائزة
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

        // تسجيل في spin_history
        await addDoc(collection(db, 'spin_history'), {
          studentId: studentId,
          prize: selectedPrize.label,
          prizeType: selectedPrize.type,
          prizeValue: selectedPrize.value,
          spinDate: today,
          createdAt: serverTimestamp(),
        });

        setPrize(selectedPrize);
        setTodaySpins(newTodaySpins);
        setMessage(`🎉 حصلت على ${selectedPrize.icon} ${selectedPrize.label}!`);

        // ✅ التحقق من الوصول للحد الأقصى
        if (newTodaySpins >= maxSpins) {
          setCanSpin(false);
          console.log(`⛔ الوصول للحد الأقصى: ${newTodaySpins}/${maxSpins}`);
        } else {
          setCanSpin(true);
          console.log(`✅ باقي محاولات: ${maxSpins - newTodaySpins}`);
        }

        if (onSpinComplete) onSpinComplete(selectedPrize);
      } catch (error) {
        console.error('❌ خطأ في حفظ النتيجة:', error);
        setMessage('❌ حدث خطأ في حفظ النتيجة');
      } finally {
        setIsSpinning(false);
      }
    }, 4000);
  };

  // إعادة تعيين العجلة
  const resetWheel = () => {
    setRotation(0);
    setPrize(null);
    setMessage('');
  };

  if (loading) {
    return <div style={styles.loading}>⏳ جاري التحميل...</div>;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🎡 عجلة الحظ</h3>
      
      {/* ✅ عرض حالة المحاولات */}
      <div style={styles.spinsInfo}>
        <p style={styles.subtitle}>
          {canSpin
            ? `✅ مسموح بالدوران (${todaySpins}/${maxSpins})`
            : `⏳ انتظر غداً للدوران مرة أخرى (${todaySpins}/${maxSpins})`}
        </p>
        <p style={styles.spinCount}>🔄 إجمالي مرات الدوران: {spinCount}</p>
        
        {/* شريط التقدم */}
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

      {/* 🎡 العجلة - SVG */}
      <div style={styles.wheelWrapper}>
        <div style={styles.wheelContainer}>
          <div style={styles.pointer}>▼</div>
          <div style={styles.wheel}>
            <svg
              viewBox="0 0 200 200"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
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
                    {/* أيقونة الجائزة */}
                    <text
                      x={tx}
                      y={ty - 5}
                      fill="#ffffff"
                      fontSize="16"
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
                    {/* اسم الجائزة */}
                    <text
                      x={tx}
                      y={ty + 18}
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
                    {/* ✅ ✅ قيمة الجائزة (ظاهرة على العجلة) */}
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

        {/* عرض الجائزة بعد الدوران */}
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
      </div>

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

      {/* قائمة الجوائز */}
      <div style={styles.prizesList}>
        <p style={styles.prizesTitle}>🎁 الجوائز المتاحة:</p>
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
    </div>
  );
}

const styles: any = {
  container: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '20px',
    padding: '25px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.08)',
    maxWidth: '500px',
    margin: '0 auto',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '5px',
  },
  spinsInfo: {
    marginBottom: '20px',
  },
  subtitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '5px',
  },
  spinCount: {
    fontSize: '12px',
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
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: 'rgba(255,255,255,0.5)',
  },
  wheelWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
  },
  wheelContainer: {
    position: 'relative',
    width: '280px',
    height: '280px',
    margin: '0 auto',
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
    top: '-15px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '30px',
    color: '#FFD700',
    zIndex: 10,
    filter: 'drop-shadow(0 2px 8px rgba(255,215,0,0.5))',
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
    minHeight: '50px',
    width: '100%',
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
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#34d399',
    background: 'rgba(16,185,129,0.15)',
    padding: '2px 10px',
    borderRadius: '20px',
    border: '1px solid rgba(16,185,129,0.2)',
  },
  message: {
    padding: '10px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    width: '100%',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginTop: '20px',
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
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '50px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  prizesList: {
    marginTop: '20px',
    textAlign: 'right',
  },
  prizesTitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '10px',
    textAlign: 'center',
  },
  prizesGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    justifyContent: 'center',
  },
  prizeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.8)',
  },
  prizeItemIcon: {
    fontSize: '14px',
  },
  prizeItemLabel: {
    fontSize: '11px',
  },
  prizeItemValue: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.05)',
    padding: '1px 6px',
    borderRadius: '10px',
  },
};