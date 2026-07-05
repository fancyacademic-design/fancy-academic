'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';

const COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1', '#f472b6', '#84cc16'];
const ICONS = ['📐', '🔬', '📖', '⚗️', '⚛️', '🧮', '🌍', '📚', '🎯', '💡', '🧪', '📝'];

export default function AdminSubjects() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    teacherId: '',
    icon: '📚',
    color: '#3b82f6',
    isActive: true,
  });

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    console.log('📦 userData في admin/subjects:', userData);

    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      console.log('👤 المستخدم:', parsed);
      console.log('🎯 الدور:', parsed.role);

      // ✅ تعطيل التحقق من الصلاحية مؤقتاً
      // if (parsed.role !== 'admin') {
      //   router.push('/platform');
      //   return;
      // }

      // ✅ اجعل الدور admin مؤقتاً
      parsed.role = 'admin';

      loadData();
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, [router]);

  const loadData = async () => {
    try {
      // ✅ جلب كل المدرسين (حتى غير المعتمدين)
      const teachersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'teacher')
        // ✅ تم إزالة شرط isApproved
      );
      const teachersSnapshot = await getDocs(teachersQuery);
      const teachersData = teachersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeachers(teachersData);
      console.log('✅ تم جلب المدرسين:', teachersData.length);

      // ✅ جلب المواد مع المدرسين
      const subjectsSnapshot = await getDocs(
        query(collection(db, 'subjects'), orderBy('createdAt', 'desc'))
      );
      const subjectsData = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubjects(subjectsData);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      setMessage('⚠️ من فضلك أدخل اسم المادة');
      return;
    }
    if (!form.teacherId) {
      setMessage('⚠️ من فضلك اختر مدرس للمادة');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const teacher = teachers.find(t => t.id === form.teacherId);
      
      const newSubject = {
        name: form.name,
        description: form.description || '',
        teacherId: form.teacherId,
        teacherName: teacher?.name || 'مدرس',
        icon: form.icon,
        color: form.color,
        isActive: form.isActive,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'subjects'), newSubject);
      setSubjects([{ id: docRef.id, ...newSubject }, ...subjects]);
      setMessage('✅ تم إضافة المادة للمدرس بنجاح!');
      setForm({ name: '', description: '', teacherId: '', icon: '📚', color: '#3b82f6', isActive: true });
      setShowForm(false);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في إضافة المادة');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!form.name.trim()) {
      setMessage('⚠️ من فضلك أدخل اسم المادة');
      return;
    }
    if (!form.teacherId) {
      setMessage('⚠️ من فضلك اختر مدرس للمادة');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const teacher = teachers.find(t => t.id === form.teacherId);
      const subjectRef = doc(db, 'subjects', editingId!);
      
      await updateDoc(subjectRef, {
        name: form.name,
        description: form.description || '',
        teacherId: form.teacherId,
        teacherName: teacher?.name || 'مدرس',
        icon: form.icon,
        color: form.color,
        isActive: form.isActive,
        updatedAt: serverTimestamp(),
      });

      setSubjects(subjects.map(s => 
        s.id === editingId ? { ...s, ...form, teacherName: teacher?.name || 'مدرس' } : s
      ));
      setMessage('✅ تم تحديث المادة بنجاح!');
      setForm({ name: '', description: '', teacherId: '', icon: '📚', color: '#3b82f6', isActive: true });
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في تحديث المادة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذه المادة؟')) return;

    try {
      await deleteDoc(doc(db, 'subjects', id));
      setSubjects(subjects.filter(s => s.id !== id));
      setMessage('✅ تم حذف المادة بنجاح');
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في حذف المادة');
    }
  };

  const toggleStatus = async (subject: any) => {
    try {
      const newStatus = subject.isActive === false;
      await updateDoc(doc(db, 'subjects', subject.id), {
        isActive: newStatus,
        updatedAt: serverTimestamp(),
      });

      setSubjects(subjects.map(s => 
        s.id === subject.id ? { ...s, isActive: newStatus } : s
      ));
      setMessage(`✅ تم ${newStatus ? 'فتح' : 'قفل'} المادة`);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ');
    }
  };

  const handleEdit = (subject: any) => {
    setForm({
      name: subject.name || '',
      description: subject.description || '',
      teacherId: subject.teacherId || '',
      icon: subject.icon || '📚',
      color: subject.color || '#3b82f6',
      isActive: subject.isActive !== false,
    });
    setEditingId(subject.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
         
          <h1 style={styles.title}>📚 إدارة المواد</h1>
          <span style={styles.badge}>👨‍🏫 تعيين للمدرسين</span>
        </div>
      </header>

      <main style={styles.main}>
        {message && (
          <div style={{
            ...styles.message,
            background: message.includes('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.includes('✅') ? '#34d399' : '#f87171',
          }}>
            {message}
          </div>
        )}

        <div style={styles.toolbar}>
          <button
            onClick={() => {
              setForm({ name: '', description: '', teacherId: '', icon: '📚', color: '#3b82f6', isActive: true });
              setEditingId(null);
              setShowForm(!showForm);
            }}
            style={styles.addButton}
          >
            {showForm ? '✕ إلغاء' : '➕ تعيين مادة لمدرس'}
          </button>
        </div>

        {showForm && (
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>
              {editingId ? '✏️ تعديل المادة' : '➕ تعيين مادة جديدة لمدرس'}
            </h3>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>اسم المادة *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: الرياضيات"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>المدرس المسؤول *</label>
                <select
                  value={form.teacherId}
                  onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                  style={styles.select}
                >
                  <option value="">اختر المدرس</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name || 'مدرس'} - {teacher.phone || 'بدون رقم'} 
                      {teacher.isApproved ? ' ✅' : ' ⏳'}
                    </option>
                  ))}
                </select>
                {teachers.length === 0 && (
                  <p style={styles.hint}>⚠️ لا يوجد مدرسين. أضف مدرساً أولاً في Firebase.</p>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>الوصف</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="وصف المادة"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>الأيقونة</label>
                <div style={styles.iconGrid}>
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setForm({ ...form, icon })}
                      style={{
                        ...styles.iconButton,
                        background: form.icon === icon ? form.color : 'rgba(255,255,255,0.05)',
                        borderColor: form.icon === icon ? form.color : 'transparent',
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>اللون</label>
                <div style={styles.colorGrid}>
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      style={{
                        ...styles.colorButton,
                        background: color,
                        borderColor: form.color === color ? 'white' : 'transparent',
                        borderWidth: form.color === color ? '3px' : '0',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>الحالة</label>
                <div style={styles.switchContainer}>
                  <button
                    onClick={() => setForm({ ...form, isActive: true })}
                    style={{
                      ...styles.switchButton,
                      background: form.isActive ? '#10b981' : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    ✅ مفتوحة
                  </button>
                  <button
                    onClick={() => setForm({ ...form, isActive: false })}
                    style={{
                      ...styles.switchButton,
                      background: !form.isActive ? '#ef4444' : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    🔒 مقفلة
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.formActions}>
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                disabled={saving}
                style={{
                  ...styles.saveButton,
                  opacity: saving ? 0.5 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? '⏳ جاري الحفظ...' : editingId ? '💾 تحديث' : '💾 إضافة'}
              </button>
              <button
                onClick={() => {
                  setForm({ name: '', description: '', teacherId: '', icon: '📚', color: '#3b82f6', isActive: true });
                  setEditingId(null);
                  setShowForm(false);
                }}
                style={styles.cancelButton}
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        <div style={styles.subjectsGrid}>
          {subjects.length === 0 ? (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>📭</span>
              <p>لا توجد مواد</p>
              <p style={styles.emptySub}>اضغط على "تعيين مادة لمدرس" للبدء</p>
            </div>
          ) : (
            subjects.map((subject) => (
              <div
                key={subject.id}
                style={{
                  ...styles.card,
                  borderColor: subject.color || '#3b82f6',
                  opacity: subject.isActive === false ? 0.5 : 1,
                }}
              >
                <div style={styles.cardHeader}>
                  <div style={{ ...styles.icon, background: subject.color || '#3b82f6' }}>
                    {subject.icon || '📚'}
                  </div>
                  <div style={styles.cardInfo}>
                    <h3 style={styles.cardTitle}>{subject.name}</h3>
                    <div style={styles.cardBadges}>
                      <span style={styles.teacherBadge}>👨‍🏫 {subject.teacherName || 'بدون مدرس'}</span>
                      <span style={{
                        ...styles.statusBadge,
                        background: subject.isActive !== false ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: subject.isActive !== false ? '#34d399' : '#f87171',
                      }}>
                        {subject.isActive !== false ? '✅ مفتوحة' : '🔒 مقفلة'}
                      </span>
                    </div>
                  </div>
                </div>

                <p style={styles.desc}>{subject.description || 'لا يوجد وصف'}</p>

                <div style={styles.cardActions}>
                  <button
                    onClick={() => toggleStatus(subject)}
                    style={{
                      ...styles.actionBtn,
                      background: subject.isActive !== false ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                      color: subject.isActive !== false ? '#f87171' : '#34d399',
                    }}
                  >
                    {subject.isActive !== false ? '🔒 قفل' : '🔓 فتح'}
                  </button>
                  <button
                    onClick={() => handleEdit(subject)}
                    style={{ ...styles.actionBtn, background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    style={{ ...styles.actionBtn, background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            ))
          )}
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
    padding: '20px',
  },
  loading: {
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    marginBottom: '20px',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    width: '100%',
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
    flex: 1,
  },
  badge: {
    padding: '4px 12px',
    background: 'rgba(139,92,246,0.1)',
    color: '#a78bfa',
    borderRadius: '20px',
    fontSize: '12px',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
    border: '1px solid',
    fontSize: '14px',
  },
  toolbar: {
    marginBottom: '20px',
  },
  addButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  formCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '25px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: 'rgba(255,255,255,0.8)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  input: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
  },
  select: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
  },
  hint: {
    fontSize: '12px',
    color: '#f87171',
    marginTop: '5px',
  },
  iconGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  iconButton: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: '2px solid transparent',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  colorButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  switchContainer: {
    display: 'flex',
    gap: '10px',
  },
  switchButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s',
    color: 'white',
    fontSize: '13px',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
  },
  saveButton: {
    padding: '10px 30px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '50px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '20px',
    border: '2px solid',
    transition: 'all 0.3s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '12px',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  cardBadges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginTop: '4px',
  },
  teacherBadge: {
    padding: '2px 10px',
    background: 'rgba(139,92,246,0.1)',
    color: '#a78bfa',
    borderRadius: '20px',
    fontSize: '11px',
  },
  statusBadge: {
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  desc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '15px',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  actionBtn: {
    padding: '6px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'rgba(255,255,255,0.3)',
    gridColumn: '1 / -1',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '10px',
  },
  emptySub: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.2)',
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