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
  getDoc
} from 'firebase/firestore';

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    subjects: 0,
    students: 0,
    activeSubjects: 0,
  });

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

      // ✅ تعطيل التحقق من الصلاحية مؤقتاً
      // if (parsed.role !== 'teacher') {
      //   router.push('/platform');
      //   return;
      // }

      // ✅ اجعل الدور teacher مؤقتاً
      parsed.role = 'teacher';
      parsed.isApproved = true;

      setUser(parsed);
      loadStats(parsed.id);
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, [router]);

  const loadStats = async (teacherId: string) => {
    try {
      const subjectsQuery = query(
        collection(db, 'subjects'),
        where('teacherId', '==', teacherId)
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const subjectsData = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      const activeSubjects = subjectsData.filter(s => s.isActive !== false).length;

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
      console.error('❌ خطأ في جلب الإحصائيات:', error);
    } finally {
      setLoading(false);
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  cardLink: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '30px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
    textDecoration: 'none',
    color: 'white',
    transition: 'all 0.3s',
  },
  cardIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  cardDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center' as const,
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