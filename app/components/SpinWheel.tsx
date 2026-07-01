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
  const [lastSpinDate, setLastSpinDate] = useState<string | null>(null);
  const [frequency, setFrequency] = useState('daily');
  const wheelRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);

  // جلب إعدادات العجلة من Firebase
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'spin_settings', 'spin_settings'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setPrizes(data.prizes || []);
          setFrequency(data.frequency || 'daily');
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
        }
      } catch (error) {
        console.error(error);
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
          const lastSpin = data.lastSpinDate;
          const spinCount = data.spinCount || 0;
          setSpinCount(spinCount);
          setLastSpinDate(lastSpin || null);

          const today = new Date().toISOString().split('T')[0];
          let canSpinNow = false;

          if (frequency === 'daily') {
            canSpinNow = lastSpin !== today;
          } else if (frequency === 'weekly') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            canSpinNow = !lastSpin || new Date(lastSpin) < weekAgo;
          } else if (frequency === 'monthly') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            canSpinNow = !lastSpin || new Date(lastSpin) < monthAgo;
          }

          setCanSpin(canSpinNow);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) checkSpinStatus();
  }, [studentId, frequency]);

  // دالة الدوران
  const spin = async () => {
    if (isSpinning || !canSpin || prizes.length === 0) return;
    setIsSpinning(true);

    // اختيار جائزة عشوائية (مع مراعاة الاحتمالات)
    const randomIndex = Math.floor(Math.random() * prizes.length);
    const selectedPrize = prizes[randomIndex];
    setPrize(selectedPrize);

    // حساب زاوية الدوران (عشوائية + ثابتة عشان تلف كذا دورة)
    const spins = 5 + Math.random() * 5; // 5-10 دورات كاملة
    const angle = 360 / prizes.length;
    const targetIndex = randomIndex;
    const totalRotation = spins * 360 + targetIndex * angle + Math.random() * angle;

    setRotation(totalRotation);
    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
    }

    // انتظار انتهاء الدوران
    await new Promise(resolve => setTimeout(resolve, 4000));

    // حفظ النتيجة في Firebase
    try {
      const today = new Date().toISOString().split('T')[0];
      const userRef = doc(db, 'users', studentId);

      // تحديث بيانات المستخدم
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      let updates: any = {
        lastSpinDate: today,
        spinCount: (userData?.spinCount || 0) + 1,
      };

      // إضافة الجائزة
      if (selectedPrize.type === 'coins') {
        updates.coins = (userData?.coins || 0) + (selectedPrize.value as number);
      } else if (selectedPrize.type === 'xp') {
        updates.xp = (userData?.xp || 0) + (selectedPrize.value as number);
      } else if (selectedPrize.type === 'gems') {
        updates.gems = (userData?.gems || 0) + (selectedPrize.value as number);
      } else if (selectedPrize.type === 'badge') {
        const badges = userData?.badges || [];
        badges.push(selectedPrize.value);
        updates.badges = badges;
      }

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

      setCanSpin(false);
      if (onSpinComplete) onSpinComplete(selectedPrize);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSpinning(false);
    }
  };

  // إعادة تعيين العجلة
  const resetWheel = () => {
    setRotation(0);
    if (wheelRef.current) {
      wheelRef.current.style.transform = 'rotate(0deg)';
    }
    setPrize(null);
  };

  if (loading) {
    return <div style={styles.loading}>⏳ جاري التحميل...</div>;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🎡 عجلة الحظ</h3>
      <p style={styles.subtitle}>
        {canSpin
          ? `اضغط على الزر للدوران! (${frequency === 'daily' ? 'يومياً' : frequency === 'weekly' ? 'أسبوعياً' : 'شهرياً'})`
          : `لقد استخدمت دورتك، عود ${frequency === 'daily' ? 'غداً' : frequency === 'weekly' ? 'الأسبوع القادم' : 'الشهر القادم'} 🎯`}
      </p>
      <p style={styles.spinCount}>🔄 عدد مرات الدوران: {spinCount}</p>

      {/* العجلة */}
      <div style={styles.wheelWrapper}>
        <div style={styles.wheelContainer}>
          <div
            ref={wheelRef}
            style={{
              ...styles.wheel,
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            {prizes.map((p, i) => {
              const angle = 360 / prizes.length;
              return (
                <div
                  key={i}
                  style={{
                    ...styles.segment,
                    background: p.color,
                    transform: `rotate(${i * angle}deg) skewY(${90 - angle}deg)`,
                    transformOrigin: 'center',
                  }}
                >
                  <div
                    style={{
                      ...styles.segmentContent,
                      transform: `skewY(${-(90 - angle)}deg)`,
                    }}
                  >
                    <span style={styles.segmentIcon}>{p.icon}</span>
                    <span style={styles.segmentLabel}>{p.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={styles.pointer}>▼</div>
        </div>

        {prize && (
          <div style={styles.prizeDisplay}>
            <span style={styles.prizeIcon}>{prize.icon}</span>
            <span style={styles.prizeText}>🎉 {prize.label}</span>
          </div>
        )}
      </div>

      <div style={styles.buttonGroup}>
        <button
          onClick={spin}
          disabled={isSpinning || !canSpin}
          style={{
            ...styles.spinButton,
            opacity: isSpinning || !canSpin ? 0.5 : 1,
            cursor: isSpinning || !canSpin ? 'not-allowed' : 'pointer',
          }}
        >
          {isSpinning ? '🌀 جاري الدوران...' : canSpin ? '🎡 دور الآن!' : '✅ انتظر'}
        </button>
        <button onClick={resetWheel} style={styles.resetButton}>
          ↺ إعادة
        </button>
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
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '5px',
  },
  spinCount: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '20px',
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
    border: '4px solid rgba(255,215,0,0.3)',
    boxShadow: '0 0 40px rgba(255,215,0,0.1)',
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transformOrigin: 'center',
    marginTop: '-30px',
    marginLeft: '-15px',
  },
  segmentIcon: {
    fontSize: '22px',
  },
  segmentLabel: {
    fontSize: '9px',
    color: 'white',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    maxWidth: '60px',
    textAlign: 'center',
    lineHeight: 1.2,
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
    background: 'rgba(255,215,0,0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(255,215,0,0.15)',
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
};