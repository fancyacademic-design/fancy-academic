'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

export default function TeacherSubjects() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    console.log('📦 1️⃣ userData في teacher/subjects:', userData);

    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      console.log('👤 2️⃣ المستخدم:', parsed);
      console.log('🎯 3️⃣ الدور:', parsed.role);
      console.log('🆔 4️⃣ ID:', parsed.id);

      // ✅ تعطيل التحقق من الصلاحية مؤقتاً
      parsed.role = 'teacher';
      parsed.isApproved = true;

      setTeacher(parsed);
      
      if (parsed.id) {
        loadSubjects(parsed.id);
      } else {
        setMessage('⚠️ لا يوجد معرف للمدرس');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, [router]);

  const loadSubjects = async (teacherId: string) => {
    try {
      console.log('🔍 5️⃣ جلب المواد للمدرس:', teacherId);
      
      // ✅ جلب كل المواد عشان نشوف البيانات
      const allSubjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const allSubjects = allSubjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log('📚 6️⃣ كل المواد في Firebase:', allSubjects);
      console.log('📊 7️⃣ عدد كل المواد:', allSubjects.length);

      // ✅ جلب المواد الخاصة بالمدرس
      const q = query(
        collection(db, 'subjects'),
        where('teacherId', '==', teacherId)
      );
      const snapshot = await getDocs(q);
      
      const subjectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('✅ 8️⃣ مواد المدرس:', subjectsData);
      console.log('📊 9️⃣ عدد مواد المدرس:', subjectsData.length);
      
      setSubjects(subjectsData);
      
      if (subjectsData.length === 0) {
        setMessage('ℹ️ لم يتم تعيين أي مواد لك. تواصل مع الأدمن.');
      }
    } catch (error) {
      console.error('❌ خطأ في جلب المواد:', error);
      setMessage('❌ حدث خطأ في تحميل المواد');
    } finally {
      setLoading(false);
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
          <Link href="/teacher/dashboard" style={styles.backButton}>← العودة</Link>
          <h1 style={styles.title}>📚 المواد الخاصة بي</h1>
          <span style={styles.badge}>👨‍🏫 {teacher?.name}</span>
        </div>
      </header>

      <main style={styles.main}>
        {message && (
          <div style={{
            ...styles.message,
            background: message.includes('✅') ? 'rgba(16,185,129,0.1)' : 
                        message.includes('ℹ️') ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.includes('✅') ? '#34d399' : 
                  message.includes('ℹ️') ? '#60a5fa' : '#f87171',
          }}>
            {message}
          </div>
        )}

        <div style={styles.infoBox}>
          <p>📌 هذه هي المواد التي عينها لك الأدمن.</p>
          <p style={styles.infoSub}>🆔 معرف المدرس: <strong>{teacher?.id || 'غير موجود'}</strong></p>
        </div>

        {subjects.length === 0 ? (
          <div style={styles.empty}>
            <span>📭</span>
            <p>لا توجد مواد مخصصة لك</p>
            <p style={styles.emptySub}>تواصل مع الأدمن لتعيين مواد لك</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {subjects.map((subject) => (
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
                    <span style={{
                      ...styles.statusBadge,
                      background: subject.isActive !== false ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: subject.isActive !== false ? '#34d399' : '#f87171',
                    }}>
                      {subject.isActive !== false ? '✅ مفتوحة' : '🔒 مقفلة'}
                    </span>
                  </div>
                </div>

                <p style={styles.desc}>{subject.description || 'لا يوجد وصف'}</p>

                <div style={styles.actions}>
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
                  <Link
                    href={`/teacher/module/${subject.id}`}
                    style={{ ...styles.actionBtn, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', textDecoration: 'none' }}
                  >
                    📖 إدارة المحتوى
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
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
    background: 'linear-gradient(135deg, #0a0a14, #1a1a2e)',
    color: 'white',
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
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
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
  grid: {
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
    marginBottom: '10px',
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
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  desc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '15px',
  },
  actions: {
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
    textDecoration: 'none',
    display: 'inline-block',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'rgba(255,255,255,0.3)',
    gridColumn: '1 / -1',
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