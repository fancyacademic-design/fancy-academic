'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  addDoc
} from 'firebase/firestore';

export default function AdminMapSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [levels, setLevels] = useState<any[]>([]);
  const [rewards, setRewards] = useState({
    xpPerLesson: 10,
    gemsPerLevel: 5,
  });
  const [editingLevel, setEditingLevel] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', lessons: 5, icon: '📚' });

  // ✅ أيقونات المستويات
  const levelIcons = ['🌱', '⚔️', '🔥', '🏆', '💎', '🌟', '🎯', '🚀', '👑', '🌈'];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // ✅ جلب الإعدادات من Firebase
      const settingsRef = doc(db, 'map_settings', 'levels_config');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.levels && Array.isArray(data.levels)) {
          setLevels(data.levels);
        } else {
          setDefaultLevels();
        }
        
        // ✅ جلب إعدادات المكافآت
        if (data.rewards) {
          setRewards({
            xpPerLesson: data.rewards.xpPerLesson || 10,
            gemsPerLevel: data.rewards.gemsPerLevel || 5,
          });
        }
      } else {
        setDefaultLevels();
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعدادات:', error);
      setMessage('❌ حدث خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const setDefaultLevels = () => {
    const defaultLevels = [
      { id: 1, name: 'المستوى الأول - البداية', lessons: 5, icon: '🌱' },
      { id: 2, name: 'المستوى الثاني - التحدي', lessons: 5, icon: '⚔️' },
      { id: 3, name: 'المستوى الثالث - الإتقان', lessons: 5, icon: '🔥' },
      { id: 4, name: 'المستوى الرابع - الإحتراف', lessons: 5, icon: '🏆' },
      { id: 5, name: 'المستوى الخامس - الأسطوري', lessons: 5, icon: '💎' },
    ];
    setLevels(defaultLevels);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage('');

      // ✅ التحقق من صحة البيانات
      for (const level of levels) {
        if (level.lessons < 1) {
          setMessage(`⚠️ عدد الدروس في ${level.name} يجب أن يكون 1 على الأقل`);
          setSaving(false);
          return;
        }
        if (!level.name.trim()) {
          setMessage(`⚠️ اسم المستوى لا يمكن أن يكون فارغاً`);
          setSaving(false);
          return;
        }
      }

      if (rewards.xpPerLesson < 1) {
        setMessage('⚠️ نقاط الخبرة لكل درس يجب أن تكون 1 على الأقل');
        setSaving(false);
        return;
      }

      if (rewards.gemsPerLevel < 0) {
        setMessage('⚠️ عدد الجواهر لكل مستوى يجب أن يكون 0 أو أكثر');
        setSaving(false);
        return;
      }

      const settingsRef = doc(db, 'map_settings', 'levels_config');
      await setDoc(settingsRef, {
        levels: levels,
        rewards: {
          xpPerLesson: rewards.xpPerLesson,
          gemsPerLevel: rewards.gemsPerLevel,
        },
        updatedAt: serverTimestamp(),
        updatedBy: 'admin',
      });

      setMessage('✅ تم حفظ إعدادات الخريطة بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في حفظ الإعدادات:', error);
      setMessage('❌ حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  // ✅ إضافة مستوى جديد
  const addLevel = () => {
    const newId = levels.length > 0 ? Math.max(...levels.map(l => l.id)) + 1 : 1;
    const iconIndex = levels.length % levelIcons.length;
    setLevels([
      ...levels,
      {
        id: newId,
        name: `المستوى ${newId}`,
        lessons: 5,
        icon: levelIcons[iconIndex],
      }
    ]);
  };

  // ✅ حذف مستوى
  const deleteLevel = (index: number) => {
    if (levels.length <= 1) {
      setMessage('⚠️ لا يمكن حذف المستوى الأخير');
      return;
    }
    if (!confirm(`⚠️ هل أنت متأكد من حذف ${levels[index].name}؟`)) return;
    
    const newLevels = levels.filter((_, i) => i !== index);
    setLevels(newLevels);
    setMessage(`✅ تم حذف ${levels[index].name}`);
  };

  // ✅ تحديث مستوى
  const updateLevel = (index: number, field: string, value: any) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setLevels(newLevels);
  };

  // ✅ نقل مستوى لأعلى
  const moveLevelUp = (index: number) => {
    if (index === 0) return;
    const newLevels = [...levels];
    [newLevels[index], newLevels[index - 1]] = [newLevels[index - 1], newLevels[index]];
    setLevels(newLevels);
  };

  // ✅ نقل مستوى لأسفل
  const moveLevelDown = (index: number) => {
    if (index === levels.length - 1) return;
    const newLevels = [...levels];
    [newLevels[index], newLevels[index + 1]] = [newLevels[index + 1], newLevels[index]];
    setLevels(newLevels);
  };

  // ✅ حساب إجمالي الدروس
  const totalLessons = levels.reduce((sum, l) => sum + l.lessons, 0);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/admin" style={styles.backButton}>← العودة للوحة التحكم</Link>
          <h1 style={styles.title}>🗺️ إعدادات الخريطة التعليمية</h1>
          <span style={styles.badge}>📚 {totalLessons} درس</span>
        </div>
      </header>

      <main style={styles.main}>
        {message && (
          <div style={{
            ...styles.message,
            background: message.includes('✅') ? 'rgba(16,185,129,0.1)' : 
                        message.includes('⚠️') ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.includes('✅') ? '#34d399' : 
                  message.includes('⚠️') ? '#f59e0b' : '#f87171',
          }}>
            {message}
          </div>
        )}

        <div style={styles.infoBox}>
          <p>📌 من هنا يمكنك التحكم في الخريطة التعليمية والمكافآت.</p>
          <p style={styles.infoSub}>🔄 التغييرات هنا تؤثر على صفحة الخريطة التعليمية لدى جميع الطلاب</p>
        </div>

        {/* ✅ ✅ قسم المكافآت */}
        <div style={styles.rewardsSection}>
          <h3 style={styles.rewardsTitle}>🎁 إعدادات المكافآت</h3>
          <div style={styles.rewardsGrid}>
            <div style={styles.rewardCard}>
              <label style={styles.rewardLabel}>⭐ نقاط الخبرة لكل درس مكتمل</label>
              <div style={styles.rewardInputGroup}>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={rewards.xpPerLesson}
                  onChange={(e) => setRewards({ ...rewards, xpPerLesson: parseInt(e.target.value) || 1 })}
                  style={styles.rewardInput}
                />
                <span style={styles.rewardUnit}>نقطة خبرة</span>
              </div>
              <p style={styles.rewardHint}>سيحصل الطالب على هذه النقاط عند إكمال كل درس</p>
            </div>

            <div style={styles.rewardCard}>
              <label style={styles.rewardLabel}>💎 جواهر لكل مستوى مكتمل</label>
              <div style={styles.rewardInputGroup}>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={rewards.gemsPerLevel}
                  onChange={(e) => setRewards({ ...rewards, gemsPerLevel: parseInt(e.target.value) || 0 })}
                  style={styles.rewardInput}
                />
                <span style={styles.rewardUnit}>جوهرة</span>
              </div>
              <p style={styles.rewardHint}>سيحصل الطالب على هذه الجواهر عند إكمال كل مستوى كاملاً</p>
            </div>
          </div>
        </div>

        <div style={styles.controlsBar}>
          <button onClick={addLevel} style={styles.addLevelBtn}>
            ➕ إضافة مستوى
          </button>
          <button onClick={saveSettings} disabled={saving} style={{
            ...styles.saveBtn,
            opacity: saving ? 0.5 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
          </button>
        </div>

        <div style={styles.levelsList}>
          {levels.map((level, index) => (
            <div key={level.id} style={styles.levelCard}>
              <div style={styles.levelHeader}>
                <div style={styles.levelOrder}>#{index + 1}</div>
                <div style={styles.levelIconWrapper}>
                  <select
                    value={level.icon}
                    onChange={(e) => updateLevel(index, 'icon', e.target.value)}
                    style={styles.iconSelect}
                  >
                    {levelIcons.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={level.name}
                  onChange={(e) => updateLevel(index, 'name', e.target.value)}
                  style={styles.levelNameInput}
                  placeholder="اسم المستوى"
                />
                <div style={styles.lessonsControl}>
                  <label style={styles.lessonsLabel}>عدد الدروس:</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={level.lessons}
                    onChange={(e) => updateLevel(index, 'lessons', parseInt(e.target.value) || 1)}
                    style={styles.lessonsInput}
                  />
                </div>
                <div style={styles.levelActions}>
                  <button
                    onClick={() => moveLevelUp(index)}
                    disabled={index === 0}
                    style={{
                      ...styles.moveBtn,
                      opacity: index === 0 ? 0.3 : 1,
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ⬆️
                  </button>
                  <button
                    onClick={() => moveLevelDown(index)}
                    disabled={index === levels.length - 1}
                    style={{
                      ...styles.moveBtn,
                      opacity: index === levels.length - 1 ? 0.3 : 1,
                      cursor: index === levels.length - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => deleteLevel(index)}
                    style={styles.deleteBtn}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* ✅ معاينة المستوى */}
              <div style={styles.levelPreview}>
                <span style={styles.previewLabel}>معاينة:</span>
                <div style={styles.previewStages}>
                  {Array.from({ length: level.lessons }).map((_, i) => (
                    <span key={i} style={styles.previewStage}>
                      {i === level.lessons - 1 ? '👾' : '📖'}
                    </span>
                  ))}
                </div>
                <span style={styles.previewCount}>
                  {level.lessons} درس
                  {level.lessons > 1 ? ' (آخرهم بوس)' : ''}
                </span>
              </div>

              {/* ✅ مكافآت المستوى */}
              <div style={styles.levelRewards}>
                <span style={styles.levelRewardItem}>
                  ⭐ {level.lessons} × {rewards.xpPerLesson} = {level.lessons * rewards.xpPerLesson} نقطة خبرة
                </span>
                <span style={styles.levelRewardItem}>
                  💎 {rewards.gemsPerLevel} جوهرة عند الإكمال
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ✅ إحصائيات سريعة */}
        <div style={styles.statsSection}>
          <h3 style={styles.statsTitle}>📊 إحصائيات الخريطة</h3>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statNumber}>{levels.length}</span>
              <span style={styles.statLabel}>المستويات</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statNumber}>{totalLessons}</span>
              <span style={styles.statLabel}>إجمالي الدروس</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statNumber}>
                {levels.length > 0 ? Math.round(totalLessons / levels.length) : 0}
              </span>
              <span style={styles.statLabel}>متوسط الدروس لكل مستوى</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statNumber}>{totalLessons * rewards.xpPerLesson}</span>
              <span style={styles.statLabel}>إجمالي نقاط الخبرة</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statNumber}>{levels.length * rewards.gemsPerLevel}</span>
              <span style={styles.statLabel}>إجمالي الجواهر</span>
            </div>
          </div>
        </div>

        {/* ✅ تعليمات */}
        <div style={styles.helpSection}>
          <h4 style={styles.helpTitle}>💡 تعليمات</h4>
          <ul style={styles.helpList}>
            <li>• يمكنك تحديد عدد الدروس في كل مستوى (1-20 درس)</li>
            <li>• آخر درس في كل مستوى هو "بوس" (Boss) تلقائياً</li>
            <li>• يمكنك إضافة مستويات جديدة أو حذف مستويات موجودة</li>
            <li>• الترتيب مهم - المستويات تظهر حسب الترتيب في الخريطة</li>
            <li>• المكافآت تُمنح تلقائياً عند إكمال الدروس والمستويات</li>
            <li>• احفظ التغييرات بعد كل تعديل لتطبيقها على الخريطة</li>
          </ul>
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
    fontFamily: '"Cairo", "Segoe UI", sans-serif',
    direction: 'rtl' as const,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '15px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,215,0,0.1)',
    borderTopColor: '#FFD700',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.02)',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '10px',
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
  badge: {
    padding: '4px 12px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    borderRadius: '20px',
    fontSize: '12px',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
    border: '1px solid',
    fontSize: '14px',
  },
  infoBox: {
    padding: '16px 20px',
    background: 'rgba(59,130,246,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(59,130,246,0.1)',
    marginBottom: '20px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
  },
  infoSub: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '5px',
  },
  // ✅ ✅ أنماط المكافآت
  rewardsSection: {
    padding: '20px',
    background: 'rgba(255,215,0,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,215,0,0.1)',
    marginBottom: '20px',
  },
  rewardsTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: '15px',
  },
  rewardsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  rewardCard: {
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  rewardLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '8px',
  },
  rewardInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  rewardInput: {
    width: '80px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
  },
  rewardUnit: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
  },
  rewardHint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '6px',
  },
  controlsBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
  },
  addLevelBtn: {
    padding: '10px 20px',
    background: 'rgba(16,185,129,0.15)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  saveBtn: {
    padding: '10px 30px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  levelsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '30px',
  },
  levelCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    padding: '16px 20px',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.3s',
  },
  levelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  levelOrder: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.2)',
    minWidth: '30px',
  },
  levelIconWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  iconSelect: {
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
  },
  levelNameInput: {
    flex: 1,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '15px',
    minWidth: '150px',
  },
  lessonsControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  lessonsLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  lessonsInput: {
    width: '60px',
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  levelActions: {
    display: 'flex',
    gap: '6px',
  },
  moveBtn: {
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s',
  },
  deleteBtn: {
    padding: '4px 8px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s',
  },
  levelPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    flexWrap: 'wrap' as const,
  },
  previewLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  previewStages: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  previewStage: {
    fontSize: '16px',
  },
  previewCount: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  // ✅ ✅ مكافآت المستوى
  levelRewards: {
    display: 'flex',
    gap: '15px',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.03)',
    flexWrap: 'wrap' as const,
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  levelRewardItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statsSection: {
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    marginBottom: '20px',
  },
  statsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: 'rgba(255,255,255,0.8)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  statNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  statLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
  helpSection: {
    padding: '20px',
    background: 'rgba(139,92,246,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(139,92,246,0.1)',
  },
  helpTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#a78bfa',
  },
  helpList: {
    margin: 0,
    paddingRight: '20px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    lineHeight: 2,
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