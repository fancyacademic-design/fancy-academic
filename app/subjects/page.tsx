'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function SubjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);

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
      // جلب المواد
      const subjectsSnapshot = await getDocs(collection(db, "subjects"));
      const subjectsList = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSubjects(subjectsList);

      // جلب المواد المسجل فيها الطالب
      const enrolledSnapshot = await getDocs(
        query(collection(db, "student_subjects"), where("studentId", "==", studentId))
      );
      const enrolledIds = enrolledSnapshot.docs.map(doc => doc.data().subjectId);
      setEnrolledSubjects(enrolledIds);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (subjectId: string) => {
    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, "student_subjects"), {
        studentId: user.id,
        subjectId: subjectId,
        progress: 0,
        isActive: true,
        enrolledAt: serverTimestamp()
      });
      setEnrolledSubjects([...enrolledSubjects, subjectId]);
      alert('✅ تم التسجيل في المادة بنجاح');
    } catch (error) {
      console.error(error);
      alert('❌ حدث خطأ في التسجيل');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>جاري تحميل المواد...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>📚 جميع المواد</h1>
          <button
            onClick={() => {
              localStorage.removeItem('currentUser');
              router.push('/login');
            }}
            style={styles.logoutButton}
          >
            🚪 خروج
          </button>
        </div>
      </header>

      <div style={styles.subjectsGrid}>
        {subjects.length === 0 ? (
          <div style={styles.empty}>لا توجد مواد متاحة حالياً</div>
        ) : (
          subjects.map((subject) => {
            const isEnrolled = enrolledSubjects.includes(subject.id);
            return (
              <div key={subject.id} style={styles.subjectCard}>
                <div style={styles.subjectHeader}>
                  <span style={styles.subjectIcon}>{subject.icon || '📘'}</span>
                  <div>
                    <h3 style={styles.subjectName}>{subject.name}</h3>
                    <p style={styles.subjectCode}>{subject.code}</p>
                  </div>
                </div>
                <p style={styles.subjectDescription}>{subject.description}</p>
                <div style={styles.subjectMeta}>
                  <span>👨‍🏫 {subject.teacherId || 'لم يحدد'}</span>
                  <span>📖 {subject.grade}</span>
                </div>
                {isEnrolled ? (
                  <Link href={`/subject/${subject.id}`} style={styles.enrolledButton}>
                    📖 دخول المادة
                  </Link>
                ) : (
                  <button onClick={() => handleEnroll(subject.id)} style={styles.enrollButton}>
                    ➕ تسجيل في المادة
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

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
    padding: '20px',
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
    marginBottom: '30px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
  },
  logoutButton: {
    padding: '8px 16px',
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  subjectCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    padding: '25px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    transition: 'all 0.3s',
  },
  subjectHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '15px',
  },
  subjectIcon: {
    fontSize: '36px',
  },
  subjectName: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  subjectCode: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.3)',
    margin: 0,
  },
  subjectDescription: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 1.6,
    marginBottom: '15px',
  },
  subjectMeta: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: '20px',
  },
  enrollButton: {
    display: 'inline-block',
    padding: '10px 20px',
    background: 'rgba(255, 215, 0, 0.1)',
    color: '#FFD700',
    border: '1px solid rgba(255, 215, 0, 0.2)',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  enrolledButton: {
    display: 'inline-block',
    padding: '10px 20px',
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    transition: 'all 0.3s',
  },
  empty: {
    textAlign: 'center',
    padding: '50px',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: '18px',
  },
};