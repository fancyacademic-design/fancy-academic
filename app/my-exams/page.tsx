'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc,
  orderBy
} from 'firebase/firestore';

export default function MyExamsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    try {
      const parsed = JSON.parse(userData);
      if (parsed.role !== 'student') {
        router.push('/platform');
        return;
      }
      setUser(parsed);
      loadData(parsed.id);
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, []);

  const loadData = async (studentId: string) => {
    try {
      setLoading(true);

      // ✅ 1. جلب نتائج الامتحانات للطالب
      const resultsQuery = query(
        collection(db, 'exam_results'),
        where('studentId', '==', studentId),
        orderBy('submittedAt', 'desc')
      );
      const resultsSnapshot = await getDocs(resultsQuery);
      const resultsData = resultsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setResults(resultsData);

      // ✅ 2. جلب الامتحانات
      const examsSnapshot = await getDocs(collection(db, 'exams'));
      const examsData = examsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExams(examsData);

      // ✅ 3. جلب المواد
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsData = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubjects(subjectsData);

      // ✅ 4. جلب الكورسات
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCourses(coursesData);

      // ✅ 5. جلب الوحدات
      const modulesSnapshot = await getDocs(collection(db, 'modules'));
      const modulesData = modulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setModules(modulesData);

    } catch (error) {
      console.error('❌ خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ تجميع النتائج حسب المادة
  const getResultsBySubject = () => {
    const grouped: { [key: string]: any[] } = {};
    
    results.forEach(result => {
      const exam = exams.find(e => e.id === result.examId);
      if (!exam) return;
      
      const subject = subjects.find(s => s.id === exam.subjectId);
      const subjectName = subject?.name || 'بدون مادة';
      const subjectId = subject?.id || 'no-subject';
      
      if (!grouped[subjectId]) {
        grouped[subjectId] = {
          subjectId: subjectId,
          subjectName: subjectName,
          subjectIcon: subject?.icon || '📚',
          results: [],
        };
      }
      
      grouped[subjectId].results.push({
        ...result,
        examTitle: exam.title,
        examType: exam.type || 'exam',
        courseId: exam.courseId,
        lessonId: exam.lessonId,
      });
    });
    
    return Object.values(grouped);
  };

  // ✅ جلب الكورس من الـ courseId
  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course?.title || 'كورس عام';
  };

  // ✅ جلب الوحدة من الـ lessonId
  const getModuleName = (lessonId: string) => {
    if (!lessonId) return null;
    const lesson = modules.find(m => m.id === lessonId);
    return lesson?.title || null;
  };

  const getGradeLabel = (gradeValue: string) => {
    const grades: { [key: string]: string } = {
      '1-prep': 'أولى إعدادي',
      '2-prep': 'ثانية إعدادي',
      '3-prep': 'ثالثة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي',
      '3-secondary': 'تالتة ثانوي',
    };
    return grades[gradeValue] || gradeValue;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'غير معروف';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'غير معروف';
    }
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubject(expandedSubject === subjectId ? null : subjectId);
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>جاري تحميل النتائج...</p>
      </div>
    );
  }

  const groupedResults = getResultsBySubject();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/platform" style={styles.backButton}>← العودة للمنصة</Link>
          <h1 style={styles.title}>📝 امتحاناتي وواجباتي</h1>
          <span style={styles.countBadge}>{results.length} نتيجة</span>
        </div>
      </header>

      <main style={styles.main}>
        {results.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📭</span>
            <h2 style={styles.emptyTitle}>لا توجد نتائج</h2>
            <p style={styles.emptyText}>لم تخض أي امتحان أو واجب بعد</p>
            <Link href="/platform" style={styles.emptyButton}>← العودة للمنصة</Link>
          </div>
        ) : (
          <div style={styles.resultsContainer}>
            {groupedResults.map((group) => (
              <div key={group.subjectId} style={styles.subjectCard}>
                {/* ✅ عنوان المادة */}
                <div 
                  style={styles.subjectHeader}
                  onClick={() => toggleSubject(group.subjectId)}
                >
                  <span style={styles.subjectIcon}>{group.subjectIcon}</span>
                  <span style={styles.subjectName}>{group.subjectName}</span>
                  <span style={styles.subjectCount}>({group.results.length})</span>
                  <span style={styles.subjectArrow}>
                    {expandedSubject === group.subjectId ? '▲' : '▼'}
                  </span>
                </div>

                {/* ✅ نتائج المادة */}
                {expandedSubject === group.subjectId && (
                  <div style={styles.subjectResults}>
                    {/* تجميع النتائج حسب الكورس */}
                    {(() => {
                      const courseGroups: { [key: string]: any[] } = {};
                      group.results.forEach((result: any) => {
                        const courseId = result.courseId || 'general';
                        if (!courseGroups[courseId]) {
                          courseGroups[courseId] = [];
                        }
                        courseGroups[courseId].push(result);
                      });

                      return Object.keys(courseGroups).map((courseId) => {
                        const courseResults = courseGroups[courseId];
                        const courseName = getCourseName(courseId);
                        const isGeneral = courseId === 'general';

                        return (
                          <div key={courseId} style={styles.courseSection}>
                            {/* ✅ عنوان الكورس */}
                            <div 
                              style={styles.courseHeader}
                              onClick={() => !isGeneral && toggleCourse(courseId)}
                            >
                              <span style={styles.courseIcon}>📖</span>
                              <span style={styles.courseName}>{courseName}</span>
                              <span style={styles.courseCount}>({courseResults.length})</span>
                              {!isGeneral && (
                                <span style={styles.courseArrow}>
                                  {expandedCourse === courseId ? '▲' : '▼'}
                                </span>
                              )}
                            </div>

                            {/* ✅ نتائج الكورس */}
                            {(isGeneral || expandedCourse === courseId) && (
                              <div style={styles.courseResults}>
                                {courseResults.map((result: any) => {
                                  const moduleName = getModuleName(result.lessonId);
                                  const passed = result.percentage >= 50;

                                  return (
                                    <div key={result.id} style={styles.resultCard}>
                                      <div style={styles.resultHeader}>
                                        <div style={styles.resultInfo}>
                                          <span style={styles.resultType}>
                                            {result.examType === 'exam' ? '📝' : '📋'}
                                          </span>
                                          <span style={styles.resultTitle}>
                                            {result.examTitle}
                                          </span>
                                          {moduleName && (
                                            <span style={styles.resultModule}>
                                              📂 {moduleName}
                                            </span>
                                          )}
                                        </div>
                                        <span style={{
                                          ...styles.resultStatus,
                                          background: passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                          color: passed ? '#34d399' : '#f87171',
                                        }}>
                                          {passed ? '✅ نجح' : '❌ لم ينجح'}
                                        </span>
                                      </div>

                                      <div style={styles.resultDetails}>
                                        <div style={styles.resultScore}>
                                          <span style={styles.resultPercentage}>
                                            {result.percentage}%
                                          </span>
                                          <span style={styles.resultScoreDetail}>
                                            {result.score} من {result.totalScore}
                                          </span>
                                        </div>
                                        <div style={styles.resultBar}>
                                          <div style={{
                                            ...styles.resultBarFill,
                                            width: `${result.percentage}%`,
                                            background: passed ? '#10b981' : '#ef4444',
                                          }} />
                                        </div>
                                        <div style={styles.resultMeta}>
                                          <span>📅 {formatDate(result.submittedAt)}</span>
                                          <span>⏱️ {Math.round(result.timeSpent || 0)} دقائق</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ✅ الإحصائيات السريعة */}
        {results.length > 0 && (
          <div style={styles.statsSection}>
            <h3 style={styles.statsTitle}>📊 إحصائيات سريعة</h3>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>{results.length}</span>
                <span style={styles.statLabel}>إجمالي الامتحانات</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>
                  {results.filter(r => r.percentage >= 50).length}
                </span>
                <span style={styles.statLabel}>✅ ناجح</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>
                  {results.filter(r => r.percentage < 50).length}
                </span>
                <span style={styles.statLabel}>❌ راسب</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>
                  {Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)}%
                </span>
                <span style={styles.statLabel}>📊 المتوسط</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: any = {
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  countBadge: {
    padding: '4px 12px',
    background: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
    borderRadius: '20px',
    fontSize: '13px',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'rgba(255,255,255,0.3)',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '24px',
    marginBottom: '10px',
  },
  emptyText: {
    fontSize: '16px',
    marginBottom: '20px',
  },
  emptyButton: {
    display: 'inline-block',
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  subjectCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  subjectHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px 20px',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.03)',
    transition: 'all 0.3s',
  },
  subjectIcon: {
    fontSize: '24px',
  },
  subjectName: {
    fontSize: '18px',
    fontWeight: 'bold',
    flex: 1,
  },
  subjectCount: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
  },
  subjectArrow: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.3)',
  },
  subjectResults: {
    padding: '10px 15px',
  },
  courseSection: {
    marginBottom: '10px',
    background: 'rgba(255,255,255,0.01)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  courseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 15px',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.02)',
    transition: 'all 0.3s',
  },
  courseIcon: {
    fontSize: '18px',
  },
  courseName: {
    fontSize: '15px',
    fontWeight: '600',
    flex: 1,
  },
  courseCount: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  courseArrow: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  courseResults: {
    padding: '8px 10px',
  },
  resultCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    padding: '12px 15px',
    marginBottom: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  resultInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  resultType: {
    fontSize: '18px',
  },
  resultTitle: {
    fontSize: '15px',
    fontWeight: '600',
  },
  resultModule: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    background: 'rgba(139,92,246,0.1)',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  resultStatus: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 10px',
    borderRadius: '12px',
  },
  resultDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  resultScore: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  resultPercentage: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  resultScoreDetail: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
  },
  resultBar: {
    width: '100%',
    height: '4px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  resultBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },
  resultMeta: {
    display: 'flex',
    gap: '15px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '4px',
  },
  statsSection: {
    marginTop: '30px',
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  statsTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: 'rgba(255,255,255,0.8)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  statLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '4px',
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