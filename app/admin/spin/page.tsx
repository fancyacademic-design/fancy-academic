// app/admin/spin/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';

export default function AdminSpinSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({
    isActive: true,
    frequency: 'daily',
    maxSpins: 1,
    prizes: [
      { label: '50 Coin', type: 'coins', value: 50, icon: '🪙', color: '#FFD700' },
      { label: '100 Coin', type: 'coins', value: 100, icon: '🪙', color: '#FFA500' },
      { label: '10 XP', type: 'xp', value: 10, icon: '⭐', color: '#10b981' },
      { label: '20 XP', type: 'xp', value: 20, icon: '⭐', color: '#059669' },
      { label: '1 Gem', type: 'gems', value: 1, icon: '💎', color: '#8b5cf6' },
      { label: 'Badge', type: 'badge', value: '🎖️', icon: '🎖️', color: '#ef4444' },
      { label: 'Replay', type: 'replay', value: 1, icon: '🔄', color: '#3b82f6' },
      { label: '5 XP', type: 'xp', value: 5, icon: '⭐', color: '#6ee7b7' },
    ],
  });

  // ✅ useEffect من غير router
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      console.log('📥 جلب الإعدادات...');
      const docRef = doc(db, 'spin_settings', 'spin_settings');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('✅ الإعدادات موجودة:', data);
        setSettings({
          isActive: data.isActive ?? true,
          frequency: data.frequency ?? 'daily',
          maxSpins: data.maxSpins ?? 1,
          prizes: data.prizes || settings.prizes,
        });
      } else {
        console.log('📝 لا توجد إعدادات، بنحفظ الافتراضية');
        await setDoc(docRef, {
          ...settings,
          createdAt: serverTimestamp(),
        });
        console.log('✅ تم حفظ الإعدادات الافتراضية');
      }
    } catch (error) {
      console.error('❌ خطأ في جلب الإعدادات:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      console.log('💾 حفظ الإعدادات...', settings);
      
      const docRef = doc(db, 'spin_settings', 'spin_settings');
      await setDoc(docRef, {
        isActive: settings.isActive,
        frequency: settings.frequency,
        maxSpins: settings.maxSpins,
        prizes: settings.prizes,
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ تم الحفظ بنجاح');
      setMessage('✅ تم حفظ الإعدادات بنجاح');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('❌ خطأ في الحفظ:', error);
      setMessage('❌ حدث خطأ في حفظ الإعدادات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addPrize = () => {
    setSettings({
      ...settings,
      prizes: [
        ...settings.prizes,
        { label: 'جائزة جديدة', type: 'coins', value: 10, icon: '🎁', color: '#FFD700' },
      ],
    });
  };

  const removePrize = (index: number) => {
    const newPrizes = settings.prizes.filter((_, i) => i !== index);
    setSettings({ ...settings, prizes: newPrizes });
  };

  const updatePrize = (index: number, field: string, value: any) => {
    const newPrizes = [...settings.prizes];
    newPrizes[index] = { ...newPrizes[index], [field]: value };
    setSettings({ ...settings, prizes: newPrizes });
  };

  if (loading) {
    return <div style={styles.loading}>⏳ جاري التحميل...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/admin" style={styles.backButton}>← العودة للأدمن</Link>
        <h1 style={styles.title}>🎡 إعدادات عجلة الحظ</h1>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          background: message.includes('✅') ? '#d1fae5' : '#fee2e2',
          color: message.includes('✅') ? '#065f46' : '#991b1b',
        }}>
          {message}
        </div>
      )}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>⚙️ الإعدادات العامة</h3>

        <div style={styles.settingItem}>
          <label style={styles.label}>حالة العجلة</label>
          <button
            onClick={() => setSettings({ ...settings, isActive: !settings.isActive })}
            style={{
              ...styles.toggleButton,
              background: settings.isActive ? '#10b981' : '#ef4444',
            }}
          >
            {settings.isActive ? '✅ مفعلة' : '❌ معطلة'}
          </button>
        </div>

        <div style={styles.settingItem}>
          <label style={styles.label}>تكرار الدوران</label>
          <select
            value={settings.frequency}
            onChange={(e) => setSettings({ ...settings, frequency: e.target.value })}
            style={styles.select}
          >
            <option value="daily">يومياً</option>
            <option value="weekly">أسبوعياً</option>
            <option value="monthly">شهرياً</option>
          </select>
        </div>

        <div style={styles.settingItem}>
          <label style={styles.label}>عدد مرات الدوران المسموحة</label>
          <div style={styles.spinCountContainer}>
            <button
              onClick={() => setSettings({ ...settings, maxSpins: Math.max(1, settings.maxSpins - 1) })}
              style={styles.spinCountButton}
            >
              −
            </button>
            <span style={styles.spinCountDisplay}>{settings.maxSpins}</span>
            <button
              onClick={() => setSettings({ ...settings, maxSpins: settings.maxSpins + 1 })}
              style={styles.spinCountButton}
            >
              +
            </button>
          </div>
          <span style={styles.spinCountHint}>عدد مرات التي يمكن للطالب الدوران فيها {settings.frequency === 'daily' ? 'في اليوم' : settings.frequency === 'weekly' ? 'في الأسبوع' : 'في الشهر'}</span>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🎁 الجوائز</h3>

        <div style={styles.prizesList}>
          {settings.prizes.map((prize, index) => (
            <div key={index} style={styles.prizeCard}>
              <div style={styles.prizeHeader}>
                <span style={styles.prizeIcon}>{prize.icon}</span>
                <input
                  type="text"
                  value={prize.label}
                  onChange={(e) => updatePrize(index, 'label', e.target.value)}
                  style={styles.prizeInput}
                  placeholder="اسم الجائزة"
                />
                <button onClick={() => removePrize(index)} style={styles.removeButton}>✕</button>
              </div>
              <div style={styles.prizeFields}>
                <select
                  value={prize.type}
                  onChange={(e) => updatePrize(index, 'type', e.target.value)}
                  style={styles.prizeSelect}
                >
                  <option value="coins">🪙 Coins</option>
                  <option value="xp">⭐ XP</option>
                  <option value="gems">💎 Gems</option>
                  <option value="badge">🎖️ Badge</option>
                  <option value="replay">🔄 Replay</option>
                </select>
                <input
                  type="text"
                  value={prize.value}
                  onChange={(e) => updatePrize(index, 'value', e.target.value)}
                  style={styles.prizeInputSmall}
                  placeholder="القيمة"
                />
                <input
                  type="color"
                  value={prize.color}
                  onChange={(e) => updatePrize(index, 'color', e.target.value)}
                  style={styles.colorPicker}
                />
              </div>
            </div>
          ))}
        </div>

        <button onClick={addPrize} style={styles.addButton}>➕ إضافة جائزة</button>
      </div>

      <button onClick={saveSettings} style={styles.saveButton} disabled={loading}>
        💾 حفظ الإعدادات
      </button>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: any = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    direction: 'rtl',
    fontFamily: 'Cairo, sans-serif',
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    color: '#6b7280',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px',
  },
  backButton: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
  },
  message: {
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#1f2937',
  },
  settingItem: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#374151',
  },
  toggleButton: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
  },
  spinCountContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginTop: '8px',
  },
  spinCountButton: {
    width: '40px',
    height: '40px',
    background: '#f3f4f6',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#374151',
  },
  spinCountDisplay: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    minWidth: '40px',
    textAlign: 'center',
  },
  spinCountHint: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '6px',
  },
  prizesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  prizeCard: {
    background: '#f9fafb',
    borderRadius: '10px',
    padding: '15px',
    border: '1px solid #e5e7eb',
  },
  prizeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  prizeIcon: {
    fontSize: '24px',
  },
  prizeInput: {
    flex: 1,
    padding: '8px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
  },
  prizeInputSmall: {
    flex: 1,
    padding: '8px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    minWidth: '80px',
  },
  prizeSelect: {
    padding: '8px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    minWidth: '120px',
  },
  colorPicker: {
    width: '40px',
    height: '40px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '2px',
    cursor: 'pointer',
  },
  prizeFields: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  removeButton: {
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  addButton: {
    padding: '10px 20px',
    background: 'transparent',
    color: '#3b82f6',
    border: '2px dashed #3b82f6',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    width: '100%',
    marginTop: '10px',
  },
  saveButton: {
    width: '100%',
    padding: '14px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
};