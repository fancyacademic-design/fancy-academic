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
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [stats, setStats] = useState({
    subjects: 0,
    students: 0,
    activeSubjects: 0,
  });
  
  // ✅ ✅ نبذة عن المدرس
  const [aboutMe, setAboutMe] = useState('');
  const [editingAbout, setEditingAbout] = useState(false);
  const [tempAbout, setTempAbout] = useState('');
  const [savingAbout, setSavingAbout] = useState(false);
  const [aboutMessage, setAboutMessage] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    console.log('📦 userData في TeacherDashboard:', userData);

    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      console.log('👤 المستخدم:', parsed);

      parsed.role = 'teacher';
      parsed.isApproved = true;

      setUser(parsed);
      loadData(parsed.id);
      loadTeacherAbout(parsed.id);
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, [router]);

  const loadData = async (teacherId: string) => {
    try {
      // جلب المواد
      const subjectsQuery = query(
        collection(db, 'subjects'),
        where('teacherId', '==', teacherId)
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const subjectsData = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setSubjects(subjectsData);
      
      const activeSubjects = subjectsData.filter(s => s.isActive !== false).length;

      // جلب الطلاب (من student_subjects)
      const studentsQuery = query(
        collection(db, 'student_subjects'),
        where('teacherId', '==', teacherId)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setStats({
        subjects: subjectsData.length,
        students: studentsData.length,
        activeSubjects: activeSubjects,
      });

    } catch (error) {
      console.error('❌ خطأ في جلب البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ✅ جلب نبذة المدرس
  const loadTeacherAbout = async (teacherId: string) => {
    try {
      const userRef = doc(db, 'users', teacherId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.aboutTeacher) {
          setAboutMe(data.aboutTeacher);
          setTempAbout(data.aboutTeacher);
        }
      }
    } catch (error) {
      console.error('❌ خطأ في جلب نبذة المدرس:', error);
    }
  };

  // ✅ ✅ حفظ نبذة المدرس
  const saveAboutMe = async () => {
    if (!user) return;
    setSavingAbout(true);
    setAboutMessage('');

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        aboutTeacher: tempAbout,
        updatedAt: serverTimestamp(),
      });
      setAboutMe(tempAbout);
      setEditingAbout(false);
      setAboutMessage('✅ تم حفظ النبذة بنجاح');
      setTimeout(() => setAboutMessage(''), 3000);
    } catch (error) {
      console.error('❌ خطأ في حفظ النبذة:', error);
      setAboutMessage('❌ حدث خطأ في حفظ النبذة');
    } finally {
      setSavingAbout(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>👨‍🏫 لوحة تحكم المدرس</h1>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.name || 'مدرس'}</span>
            <span style={styles.badge}>✅ معتمد</span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.welcomeCard}>
          <h2 style={styles.welcome}>مرحباً {user?.name} 👋</h2>
          <p style={styles.description}>من هنا يمكنك إدارة موادك وطلابك.</p>
        </div>

        {/* ✅ ✅ مربع نبذة عني */}
        <div style={styles.aboutSection}>
          <div style={styles.aboutHeader}>
            <h3 style={styles.aboutTitle}>📝 نبذة عني</h3>
            {!editingAbout && (
              <button
                onClick={() => {
                  setEditingAbout(true);
                  setTempAbout(aboutMe);
                }}
                style={styles.editAboutBtn}
              >
                ✏️ تعديل
              </button>
            )}
          </div>

          {editingAbout ? (
            <div style={styles.aboutEditContainer}>
              <textarea
                value={tempAbout}
                onChange={(e) => setTempAbout(e.target.value)}
                placeholder="اكتب نبذة عنك لتظهر للطلاب وأولياء الأمور..."
                style={styles.aboutTextarea}
                rows={4}
              />
              <div style={styles.aboutActions}>
                <button
                  onClick={saveAboutMe}
                  disabled={savingAbout}
                  style={{
                    ...styles.saveAboutBtn,
                    opacity: savingAbout ? 0.5 : 1,
                    cursor: savingAbout ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingAbout ? '⏳ جاري الحفظ...' : '💾 حفظ النبذة'}
                </button>
                <button
                  onClick={() => {
                    setEditingAbout(false);
                    setTempAbout(aboutMe);
                  }}
                  style={styles.cancelAboutBtn}
                >
                  إلغاء
                </button>
              </div>
              {aboutMessage && (
                <p style={{
                  ...styles.aboutMessage,
                  color: aboutMessage.includes('✅') ? '#34d399' : '#f87171',
                }}>
                  {aboutMessage}
                </p>
              )}
            </div>
          ) : (
            <div style={styles.aboutDisplay}>
              {aboutMe ? (
                <p style={styles.aboutText}>{aboutMe}</p>
              ) : (
                <p style={styles.aboutEmpty}>
                  لا توجد نبذة حالياً. اضغط على "تعديل" لإضافة نبذة عنك.
                </p>
              )}
            </div>
          )}
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statIcon}>📚</span>
            <div>
              <div style={styles.statNumber}>{stats.subjects}</div>
              <div style={styles.statLabel}>إجمالي المواد</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statIcon}>✅</span>
            <div>
              <div style={styles.statNumber}>{stats.activeSubjects}</div>
              <div style={styles.statLabel}>مواد مفتوحة</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statIcon}>👨‍🎓</span>
            <div>
              <div style={styles.statNumber}>{stats.students}</div>
              <div style={styles.statLabel}>طلاب مسجلين</div>
            </div>
          </div>
        </div>

        <div style={styles.grid}>
          <Link href="/teacher/subjects" style={styles.cardLink}>
            <span style={styles.cardIcon}>📚</span>
            <span style={styles.cardTitle}>المواد الخاصة بي</span>
            <span style={styles.cardDesc}>عرض وإدارة المواد التي عينها لك الأدمن</span>
          </Link>

          <Link href="/teacher/students" style={styles.cardLink}>
            <span style={styles.cardIcon}>👨‍🎓</span>
            <span style={styles.cardTitle}>الطلاب</span>
            <span style={styles.cardDesc}>متابعة الطلاب المسجلين في موادك</span>
          </Link>

          {/* ✅ ✅ زر إدارة الامتحانات - جديد */}
          <Link href="/teacher/exams" style={styles.cardLink}>
            <span style={styles.cardIcon}>📝</span>
            <span style={styles.cardTitle}>الامتحانات</span>
            <span style={styles.cardDesc}>إدارة امتحانات موادك</span>
          </Link>
        </div>

        {/* ✅ ✅ عرض مواد المدرس مع زر إدارة الامتحانات لكل مادة */}
        {subjects.length > 0 && (
          <div style={styles.subjectsSection}>
            <h3 style={styles.subjectsTitle}>📚 موادك</h3>
            <div style={styles.subjectsGrid}>
              {subjects.map((subject) => (
                <div key={subject.id} style={styles.subjectCard}>
                  <div style={styles.subjectInfo}>
                    <span style={styles.subjectIcon}>{subject.icon || '📚'}</span>
                    <div>
                      <h4 style={styles.subjectName}>{subject.name}</h4>
                      <span style={styles.subjectStatus}>
                        {subject.isActive !== false ? '✅ نشط' : '⛔ غير نشط'}
                      </span>
                    </div>
                  </div>
                  <div style={styles.subjectActions}>
                    <Link 
                      href={`/teacher/exams?subjectId=${subject.id}`} 
                      style={styles.examsButton}
                    >
                      📝 إدارة الامتحانات
                    </Link>
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
    fontFamily: '"Cairo", "Segoe UI", sans-serif',
    direction: 'rtl' as const,
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
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userName: {
    fontSize: '16px',
    fontWeight: '600',
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
    padding: '30px 20px',
  },
  welcomeCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '25px 30px',
    marginBottom: '25px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  welcome: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  description: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '30px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  statIcon: {
    fontSize: '32px',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  cardLink: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '25px 20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
    textDecoration: 'none',
    color: 'white',
    transition: 'all 0.3s',
  },
  cardIcon: {
    fontSize: '40px',
    marginBottom: '10px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  cardDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center' as const,
  },
  
  // ✅ ✅ أنماط نبذة عني
  aboutSection: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '20px 25px',
    marginBottom: '25px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  aboutHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  aboutTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
    margin: 0,
  },
  editAboutBtn: {
    padding: '6px 16px',
    background: 'rgba(139,92,246,0.15)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  aboutDisplay: {
    padding: '10px 0',
  },
  aboutText: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: 'rgba(255,255,255,0.7)',
    margin: 0,
  },
  aboutEmpty: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.3)',
    margin: 0,
    fontStyle: 'italic',
  },
  aboutEditContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  aboutTextarea: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    resize: 'vertical' as const,
    fontFamily: '"Cairo", "Segoe UI", sans-serif',
    minHeight: '100px',
    outline: 'none',
    transition: 'border 0.3s',
  },
  aboutActions: {
    display: 'flex',
    gap: '10px',
  },
  saveAboutBtn: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  cancelAboutBtn: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  aboutMessage: {
    fontSize: '13px',
    fontWeight: '600',
    margin: 0,
  },

  // ✅ ✅ أنماط قسم المواد
  subjectsSection: {
    marginTop: '30px',
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  subjectsTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: 'rgba(255,255,255,0.8)',
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '15px',
  },
  subjectCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    flexWrap: 'wrap' as const,
    gap: '10px',
  },
  subjectInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  subjectIcon: {
    fontSize: '28px',
  },
  subjectName: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
  },
  subjectStatus: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  subjectActions: {
    display: 'flex',
    gap: '8px',
  },
  examsButton: {
    padding: '6px 14px',
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    color: 'white',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  manageButton: {
    padding: '6px 14px',
    background: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
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
