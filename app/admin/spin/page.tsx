'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminSpinSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [prizes, setPrizes] = useState<any[]>([
    { label: '50 Coin', type: 'coins', value: 50, icon: '🪙', color: '#FFD700' },
    { label: '100 Coin', type: 'coins', value: 100, icon: '🪙', color: '#FFA500' },
    { label: '10 XP', type: 'xp', value: 10, icon: '⭐', color: '#10b981' },
    { label: '20 XP', type: 'xp', value: 20, icon: '⭐', color: '#059669' },
    { label: '1 Gem', type: 'gems', value: 1, icon: '💎', color: '#8b5cf6' },
    { label: 'Badge', type: 'badge', value: '🎖️', icon: '🎖️', color: '#ef4444' },
    { label: 'Replay', type: 'replay', value: 1, icon: '🔄', color: '#3b82f6' },
    { label: '5 XP', type: 'xp', value: 5, icon: '⭐', color: '#6ee7b7' },
  ]);
  const [frequency, setFrequency] = useState('daily');
  const [maxSpins, setMaxSpins] = useState(3);
  const [customType, setCustomType] = useState('');

  // ✅ لا يوجد تحقق - نحمّل البيانات مباشرة
  useEffect(() => {
    // ✅ إنشاء مستخدم وهمي إن لم يكن موجود
    let userData = localStorage.getItem('currentUser');
    if (!userData) {
      const fakeUser = {
        id: 'admin_fake_id',
        name: 'Administrator',
        role: 'admin',
        isApproved: true,
        email: 'admin@fancy.com'
      };
      localStorage.setItem('currentUser', JSON.stringify(fakeUser));
      userData = JSON.stringify(fakeUser);
    }
    
    try {
      const parsed = JSON.parse(userData);
      parsed.role = 'admin';
      localStorage.setItem('currentUser', JSON.stringify(parsed));
    } catch (error) {
      console.error('❌ خطأ:', error);
    }
    
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'spin_settings', 'spin_settings'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.prizes && data.prizes.length > 0) {
          setPrizes(data.prizes);
        }
        if (data.frequency) setFrequency(data.frequency);
        if (data.maxSpins) setMaxSpins(data.maxSpins);
        setMessage('✅ تم تحميل الإعدادات');
      } else {
        setMessage('ℹ️ تم استخدام الإعدادات الافتراضية');
      }
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'spin_settings', 'spin_settings'), {
        prizes: prizes,
        frequency: frequency,
        maxSpins: maxSpins,
        updatedAt: serverTimestamp(),
      });
      setMessage('✅ تم حفظ الإعدادات بنجاح!');
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // ➕ إضافة جائزة
  const addPrize = () => {
    const colors = ['#FFD700', '#FFA500', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6', '#f472b6', '#14b8a6'];
    setPrizes([...prizes, {
      label: `جائزة ${prizes.length + 1}`,
      type: 'coins',
      value: 10,
      icon: '🎁',
      color: colors[prizes.length % colors.length],
    }]);
  };

  // 🗑️ حذف جائزة
  const removePrize = (index: number) => {
    if (prizes.length <= 2) {
      setMessage('⚠️ يجب أن يكون على الأقل جائزتين');
      return;
    }
    const newPrizes = [...prizes];
    newPrizes.splice(index, 1);
    setPrizes(newPrizes);
  };

  // ✏️ تحديث جائزة
  const updatePrize = (index: number, field: string, value: any) => {
    const newPrizes = [...prizes];
    newPrizes[index] = { ...newPrizes[index], [field]: value };
    setPrizes(newPrizes);
  };

  // ✅ ✅ إضافة نوع مخصص
  const handleCustomTypeAdd = () => {
    if (!customType.trim()) {
      setMessage('⚠️ الرجاء كتابة النوع المخصص');
      return;
    }
    const colors = ['#FFD700', '#FFA500', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6', '#f472b6', '#14b8a6'];
    setPrizes([...prizes, {
      label: customType.trim(),
      type: 'custom',
      value: customType.trim(),
      icon: '🎁',
      color: colors[prizes.length % colors.length],
    }]);
    setCustomType('');
    setMessage(`✅ تم إضافة النوع المخصص: ${customType.trim()}`);
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
          <Link href="/admin/dashboard" style={styles.backButton}>← لوحة التحكم</Link>
          <h1 style={styles.title}>⚙️ إعدادات عجلة الحظ</h1>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          {/* 📨 رسالة الحالة */}
          {message && (
            <div style={{
              ...styles.message,
              background: message.includes('✅') ? '#d1fae5' : message.includes('⚠️') ? '#fef3c7' : '#fee2e2',
              color: message.includes('✅') ? '#065f46' : message.includes('⚠️') ? '#92400e' : '#991b1b',
            }}>
              {message}
            </div>
          )}

          {/* ⚙️ الإعدادات العامة */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📋 الإعدادات العامة</h3>
            <div style={styles.settingsGrid}>
              <div style={styles.settingItem}>
                <label style={styles.label}>📅 التردد</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  style={styles.select}
                >
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                  <option value="monthly">شهري</option>
                </select>
              </div>

              <div style={styles.settingItem}>
                <label style={styles.label}>🔄 عدد المحاولات</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxSpins}
                  onChange={(e) => setMaxSpins(Number(e.target.value))}
                  style={styles.input}
                />
                <small style={styles.helperText}>من 1 إلى 10 محاولات</small>
              </div>
            </div>
          </div>

          {/* 🎁 قائمة الجوائز */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🎁 الجوائز</h3>
            <p style={styles.sectionSubtitle}>أضف أو عدل الجوائز المعروضة في العجلة</p>

            {prizes.map((prize, index) => (
              <div key={index} style={styles.prizeCard}>
                <div style={styles.prizeHeader}>
                  <span style={styles.prizeNumber}>#{index + 1}</span>
                  <button
                    onClick={() => removePrize(index)}
                    style={styles.removeButton}
                    title="حذف الجائزة"
                  >
                    ✕
                  </button>
                </div>

                <div style={styles.prizeFields}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.labelSmall}>الأيقونة</label>
                    <input
                      type="text"
                      value={prize.icon}
                      onChange={(e) => updatePrize(index, 'icon', e.target.value)}
                      style={styles.inputSmall}
                      maxLength={2}
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.labelSmall}>الاسم</label>
                    <input
                      type="text"
                      value={prize.label}
                      onChange={(e) => updatePrize(index, 'label', e.target.value)}
                      style={styles.inputSmall}
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.labelSmall}>النوع</label>
                    <select
                      value={prize.type}
                      onChange={(e) => updatePrize(index, 'type', e.target.value)}
                      style={styles.selectSmall}
                    >
                      <option value="coins">🪙 عملات</option>
                      <option value="xp">⭐ نقاط خبرة</option>
                      <option value="gems">💎 جواهر</option>
                      <option value="badge">🎖️ شارة</option>
                      <option value="replay">🔄 إعادة</option>
                      <option value="custom">🎁 مخصص</option>
                    </select>
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.labelSmall}>القيمة</label>
                    <input
                      type="text"
                      value={prize.value}
                      onChange={(e) => updatePrize(index, 'value', e.target.value)}
                      style={styles.inputSmall}
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.labelSmall}>اللون</label>
                    <input
                      type="color"
                      value={prize.color || '#4a4a6a'}
                      onChange={(e) => updatePrize(index, 'color', e.target.value)}
                      style={styles.colorPicker}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* ✅ ✅ إضافة نوع مخصص */}
            <div style={styles.customTypeSection}>
              <div style={styles.customTypeRow}>
                <input
                  type="text"
                  placeholder="اكتب نوع مخصص (مثال: هدية، كتاب، الخ)"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  style={styles.customTypeInput}
                />
                <button
                  onClick={handleCustomTypeAdd}
                  style={styles.customTypeButton}
                >
                  ➕ إضافة
                </button>
              </div>
              <small style={styles.helperText}>اكتب أي نص تريده وأضفه كجائزة مخصصة</small>
            </div>

            <button onClick={addPrize} style={styles.addButton}>
              ➕ إضافة جائزة جديدة
            </button>
          </div>

          {/* 💾 حفظ الإعدادات */}
          <div style={styles.buttonGroup}>
            <button
              onClick={saveSettings}
              disabled={saving}
              style={{
                ...styles.saveButton,
                opacity: saving ? 0.5 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? '💾 جاري الحفظ...' : '💾 حفظ الإعدادات'}
            </button>
          </div>

          {/* 👁️ معاينة سريعة */}
          <div style={styles.previewSection}>
            <h4 style={styles.previewTitle}>👁️ معاينة العجلة</h4>
            <div style={styles.previewWheel}>
              <svg viewBox="0 0 100 100" style={{ width: '120px', height: '120px' }}>
                {prizes.map((p, i) => {
                  const startAngle = (i * 360) / prizes.length;
                  const endAngle = ((i + 1) * 360) / prizes.length;
                  const radius = 45;
                  const center = 50;

                  const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
                  const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
                  const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
                  const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);

                  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

                  return (
                    <path
                      key={i}
                      d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={p.color || '#4a4a6a'}
                      stroke="#0a0a14"
                      strokeWidth="0.5"
                    />
                  );
                })}
              </svg>
              <p style={styles.previewText}>
                {prizes.length} جائزة • {maxSpins} محاولات • {frequency === 'daily' ? 'يومي' : frequency === 'weekly' ? 'أسبوعي' : 'شهري'}
              </p>
            </div>
          </div>

          <Link href="/admin" style={styles.backLink}>← العودة للوحة التحكم</Link>
        </div>
      </main>

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
    maxWidth: '900px',
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
    maxWidth: '900px',
    margin: '30px auto',
    padding: '0 20px',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '20px',
    padding: '30px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  message: {
    padding: '12px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '5px',
    color: 'rgba(255,255,255,0.8)',
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '15px',
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  settingItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
  },
  select: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='white' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left 12px center',
    paddingLeft: '35px',
  },
  input: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
  },
  helperText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  prizeCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  prizeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  prizeNumber: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  removeButton: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 8px',
  },
  prizeFields: {
    display: 'grid',
    gridTemplateColumns: '0.7fr 1.5fr 1fr 1fr 0.5fr',
    gap: '10px',
    alignItems: 'end',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  labelSmall: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
  inputSmall: {
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '13px',
    width: '100%',
  },
  selectSmall: {
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '13px',
    width: '100%',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='white' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left 8px center',
    paddingLeft: '28px',
  },
  colorPicker: {
    padding: '2px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    width: '40px',
    height: '34px',
    cursor: 'pointer',
  },
  customTypeSection: {
    marginBottom: '15px',
    padding: '15px',
    background: 'rgba(139, 92, 246, 0.05)',
    borderRadius: '12px',
    border: '1px dashed rgba(139, 92, 246, 0.2)',
  },
  customTypeRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  customTypeInput: {
    flex: 1,
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
  },
  customTypeButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap',
  },
  addButton: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px dashed rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.3s',
  },
  buttonGroup: {
    textAlign: 'center',
    marginTop: '20px',
  },
  saveButton: {
    padding: '14px 40px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '50px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  previewSection: {
    marginTop: '30px',
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
  },
  previewTitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '10px',
  },
  previewWheel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  previewText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  backLink: {
    display: 'block',
    marginTop: '20px',
    color: 'rgba(255,255,255,0.3)',
    textDecoration: 'none',
    fontSize: '14px',
    textAlign: 'center',
  },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    select {
      background-color: #1a1a2e !important;
      color: white !important;
    }
    select option {
      background-color: #1a1a2e !important;
      color: white !important;
      padding: 8px !important;
    }
    select option:hover {
      background-color: #8b5cf6 !important;
      color: white !important;
    }
  `;
  document.head.appendChild(style);
}
