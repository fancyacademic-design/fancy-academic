'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

// 🎯 مستويات الخريطة (كل مستوى فيه مراحل = دروس)
const LEVELS = [
  {
    id: 1,
    title: '🌱 المستوى الأول - البداية',
    icon: '🌱',
    color: '#10b981',
    stages: [
      { id: 1, title: 'درس 1', icon: '📖' },
      { id: 2, title: 'درس 2', icon: '📖' },
      { id: 3, title: 'درس 3', icon: '📖' },
      { id: 4, title: 'درس 4', icon: '📖' },
      { id: 5, title: 'درس 5', icon: '📖' },
      { id: 6, title: 'Boss 1', icon: '👾' },
    ]
  },
  {
    id: 2,
    title: '⚔️ المستوى الثاني - التحدي',
    icon: '⚔️',
    color: '#3b82f6',
    stages: [
      { id: 7, title: 'درس 6', icon: '📖' },
      { id: 8, title: 'درس 7', icon: '📖' },
      { id: 9, title: 'درس 8', icon: '📖' },
      { id: 10, title: 'درس 9', icon: '📖' },
      { id: 11, title: 'درس 10', icon: '📖' },
      { id: 12, title: 'Boss 2', icon: '👾' },
    ]
  },
  {
    id: 3,
    title: '🔥 المستوى الثالث - الإتقان',
    icon: '🔥',
    color: '#f59e0b',
    stages: [
      { id: 13, title: 'درس 11', icon: '📖' },
      { id: 14, title: 'درس 12', icon: '📖' },
      { id: 15, title: 'درس 13', icon: '📖' },
      { id: 16, title: 'درس 14', icon: '📖' },
      { id: 17, title: 'درس 15', icon: '📖' },
      { id: 18, title: 'Boss 3', icon: '👾' },
    ]
  },
  {
    id: 4,
    title: '🏆 المستوى الرابع - الإحتراف',
    icon: '🏆',
    color: '#8b5cf6',
    stages: [
      { id: 19, title: 'درس 16', icon: '📖' },
      { id: 20, title: 'درس 17', icon: '📖' },
      { id: 21, title: 'درس 18', icon: '📖' },
      { id: 22, title: 'درس 19', icon: '📖' },
      { id: 23, title: 'درس 20', icon: '📖' },
      { id: 24, title: 'Boss 4', icon: '👾' },
    ]
  },
  {
    id: 5,
    title: '💎 المستوى الخامس - الأسطوري',
    icon: '💎',
    color: '#ef4444',
    stages: [
      { id: 25, title: 'درس 21', icon: '📖' },
      { id: 26, title: 'درس 22', icon: '📖' },
      { id: 27, title: 'درس 23', icon: '📖' },
      { id: 28, title: 'درس 24', icon: '📖' },
      { id: 29, title: 'درس 25', icon: '📖' },
      { id: 30, title: '🏆 البطل الأسطوري', icon: '🏆' },
    ]
  },
];

// ✅ استخراج كل المراحل من المستويات
const ALL_STAGES = LEVELS.flatMap(level => level.stages);

export default function MapPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ [key: number]: string }>({});
  const [stageProgress, setStageProgress] = useState<{ [key: number]: number }>({});
  const [stats, setStats] = useState({
    completed: 0,
    total: ALL_STAGES.length,
    progress: 0,
    coins: 0,
    xp: 0,
    level: 1,
    totalLessons: 0,
    completedLessons: 0,
    currentLevel: 1,
    enrolledCourses: 0,
    completedCourses: 0,
  });

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    setUser(parsed);
    loadRealProgress(parsed.id);
  }, [router]);

  // ✅ ✅ حساب التقدم الفعلي من الامتحانات (نفس طريقة البلاتفورم)
  const loadRealProgress = async (studentId: string) => {
    try {
      setLoading(true);

      // 1️⃣ جلب جميع الامتحانات
      const examsSnapshot = await getDocs(collection(db, 'exams'));
      const allExams = examsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log('📝 عدد الامتحانات الكلي:', allExams.length);

      // 2️⃣ جلب نتائج الطالب
      const resultsQuery = query(
        collection(db, 'exam_results'),
        where('studentId', '==', studentId)
      );
      const resultsSnapshot = await getDocs(resultsQuery);
      const studentResults = resultsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      const completedExamIds = studentResults.map(r => r.examId);
      console.log('📊 نتائج الطالب:', studentResults.length);

      // 3️⃣ جلب الكورسات المسجل فيها الطالب
      const enrolledCoursesSnapshot = await getDocs(
        query(
          collection(db, 'student_courses'),
          where('studentId', '==', studentId),
          where('isActive', '==', true)
        )
      );
      const enrolledCourses = enrolledCoursesSnapshot.docs.map(doc => ({
        id: doc.id,
        courseId: doc.data().courseId,
        progress: doc.data().progress || 0,
      }));
      console.log('📚 الكورسات المسجل فيها:', enrolledCourses.length);

      // 4️⃣ جلب المواد المسجل فيها الطالب
      const enrolledSubjectsSnapshot = await getDocs(
        query(
          collection(db, 'student_subjects'),
          where('studentId', '==', studentId)
        )
      );
      const enrolledSubjectIds = enrolledSubjectsSnapshot.docs.map(doc => doc.data().subjectId);
      console.log('📚 المواد المسجل فيها:', enrolledSubjectIds.length);

      // 5️⃣ حساب عدد الدروس المكتملة = عدد الامتحانات المكتملة
      const completedExamsCount = completedExamIds.length;
      
      // ✅ عدد الدروس الكلي = عدد الامتحانات الموجودة في المواد المسجل فيها الطالب
      let totalLessonsCount = 0;
      for (const subjectId of enrolledSubjectIds) {
        const subjectExams = allExams.filter(e => e.subjectId === subjectId);
        totalLessonsCount += subjectExams.length;
      }
      
      // ✅ الدروس المكتملة = الامتحانات المكتملة
      const completedLessonsCount = Math.min(completedExamsCount, totalLessonsCount);
      
      console.log('📊 الدروس الكلية (امتحانات):', totalLessonsCount);
      console.log('✅ الدروس المكتملة (امتحانات مكتملة):', completedLessonsCount);

      // ✅ حساب عدد الكورسات المكتملة (كل الكورسات اللي الطالب مسجل فيها وكل امتحاناتها مكتملة)
      let completedCourses = 0;
      for (const course of enrolledCourses) {
        const courseExams = allExams.filter(e => e.courseId === course.courseId);
        if (courseExams.length > 0) {
          const courseCompletedExams = courseExams.filter(e => completedExamIds.includes(e.id));
          if (courseCompletedExams.length === courseExams.length) {
            completedCourses++;
          }
        }
      }

      // ✅ عدد المراحل المتاحة = عدد الدروس الفعلية
      const totalStages = Math.min(totalLessonsCount, ALL_STAGES.length);
      
      // ✅ نسبة التقدم
      const progressPercent = totalLessonsCount > 0 
        ? Math.round((completedLessonsCount / Math.max(totalLessonsCount, 1)) * 100) 
        : 0;

      // ✅ عدد المراحل المكتملة
      const completedStages = Math.min(
        Math.round((completedLessonsCount / Math.max(totalLessonsCount, 1)) * totalStages),
        totalStages
      );

      console.log('📊 عدد المراحل المكتملة:', completedStages);

      // ✅ توزيع التقدم على المراحل
      const newProgress: { [key: number]: string } = {};
      const newStageProgress: { [key: number]: number } = {};

      ALL_STAGES.forEach((stage, index) => {
        const isBoss = stage.title.includes('Boss');
        const isEnd = stage.title.includes('البطل');
        
        if (index < completedStages) {
          newProgress[stage.id] = 'completed';
          newStageProgress[stage.id] = 100;
        } else if (index === completedStages && completedStages < totalStages) {
          newProgress[stage.id] = 'started';
          const remainingStages = totalStages - completedStages;
          const remainingModules = totalLessonsCount - completedLessonsCount;
          const progressInStage = remainingModules > 0 
            ? Math.min(100, Math.round((completedLessonsCount / totalLessonsCount) * 100)) 
            : 0;
          newStageProgress[stage.id] = Math.min(100, progressInStage);
        } else {
          newProgress[stage.id] = 'locked';
          newStageProgress[stage.id] = 0;
        }
      });

      // ✅ Boss يتفتح لو الدروس قبله مكتملة
      ALL_STAGES.forEach((stage) => {
        if (stage.title.includes('Boss')) {
          const stageIndex = ALL_STAGES.indexOf(stage);
          const prevStages = ALL_STAGES.slice(0, stageIndex);
          const allPrevCompleted = prevStages.every(s => newProgress[s.id] === 'completed');
          if (allPrevCompleted && newProgress[stage.id] !== 'completed') {
            newProgress[stage.id] = 'started';
            newStageProgress[stage.id] = 10;
          }
        }
      });

      // ✅ النهاية تتفتح لو كل المراحل مكتملة
      const allCompleted = ALL_STAGES.every(s => newProgress[s.id] === 'completed');
      if (allCompleted) {
        newProgress[ALL_STAGES[ALL_STAGES.length - 1].id] = 'completed';
        newStageProgress[ALL_STAGES[ALL_STAGES.length - 1].id] = 100;
      }

      setProgress(newProgress);
      setStageProgress(newStageProgress);

      // 6️⃣ تحديث الإحصائيات
      const completedCount = Object.values(newProgress).filter(s => s === 'completed').length;

      // ✅ حساب المستوى الحالي
      let currentLevel = 1;
      let accumulatedStages = 0;
      for (const level of LEVELS) {
        if (completedCount > accumulatedStages + level.stages.length) {
          accumulatedStages += level.stages.length;
          currentLevel = level.id + 1;
        } else {
          break;
        }
      }
      if (currentLevel > LEVELS.length) currentLevel = LEVELS.length;

      setStats(prev => ({
        ...prev,
        completed: completedCount,
        progress: progressPercent,
        totalLessons: totalLessonsCount,
        completedLessons: completedLessonsCount,
        currentLevel: currentLevel,
        enrolledCourses: enrolledCourses.length,
        completedCourses: completedCourses,
      }));

      // 7️⃣ جلب النقاط والمستوى
      const userRef = doc(db, 'users', studentId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setStats(prev => ({
          ...prev,
          coins: data.coins || 0,
          xp: data.xp || 0,
          level: data.level || 1,
        }));
      }

    } catch (error) {
      console.error('❌ خطأ في جلب التقدم:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageStatus = (stageId: number) => {
    return progress[stageId] || 'locked';
  };

  const getStageProgress = (stageId: number) => {
    return stageProgress[stageId] || 0;
  };

  const getStageIcon = (status: string) => {
    if (status === 'completed') return '✅';
    if (status === 'started') return '🟡';
    return '🔒';
  };

  const getStageStyle = (status: string) => {
    if (status === 'completed') return styles.stageCompleted;
    if (status === 'started') return styles.stageStarted;
    return styles.stageLocked;
  };

  // ✅ التحقق من أن المستوى مفتوح
  const isLevelUnlocked = (levelIndex: number) => {
    if (levelIndex === 0) return true;
    const prevLevel = LEVELS[levelIndex - 1];
    const prevStages = prevLevel.stages;
    const allPrevCompleted = prevStages.every(s => progress[s.id] === 'completed');
    return allPrevCompleted;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>جاري تحميل الخريطة...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/platform" style={styles.backButton}>← العودة للمنصة</Link>
          <h1 style={styles.title}>🗺️ الخريطة التعليمية</h1>
          <div style={styles.headerStats}>
            <span style={styles.xpBadge}>⭐ {stats.xp}</span>
            <span style={styles.levelBadge}>🎯 المستوى {stats.level}</span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* ✅ شريط التقدم العام */}
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <h2 style={styles.progressTitle}>📊 تقدمك في الرحلة</h2>
            <span style={styles.progressPercentage}>{stats.progress}%</span>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${stats.progress}%` }} />
          </div>
          <p style={styles.progressText}>
            {stats.completed} من {stats.total} مرحلة مكتملة
          </p>
          <p style={styles.progressSubText}>
            📚 {stats.completedLessons} من {stats.totalLessons} درس مكتمل • 
            🏆 {stats.completedCourses} من {stats.enrolledCourses} كورس مكتمل
          </p>
          <div style={styles.levelIndicator}>
            <span style={styles.levelIndicatorText}>
              🎯 المستوى الحالي: {stats.currentLevel} من {LEVELS.length}
            </span>
          </div>
        </div>

        {/* ✅ الخريطة - مستويات */}
        <div style={styles.mapContainer}>
          {LEVELS.map((level, levelIndex) => {
            const unlocked = isLevelUnlocked(levelIndex);
            
            return (
              <div key={level.id} style={styles.levelWrapper}>
                {/* ✅ عنوان المستوى */}
                <div style={{
                  ...styles.levelHeader,
                  borderColor: unlocked ? level.color : 'rgba(255,255,255,0.1)',
                  opacity: unlocked ? 1 : 0.5,
                }}>
                  <span style={styles.levelIcon}>{level.icon}</span>
                  <h3 style={styles.levelTitle}>{level.title}</h3>
                  {!unlocked && <span style={styles.levelLockedBadge}>🔒 مقفل</span>}
                  {unlocked && (
                    <span style={styles.levelProgressBadge}>
                      {level.stages.filter(s => progress[s.id] === 'completed').length}/{level.stages.length}
                    </span>
                  )}
                </div>

                {/* ✅ مراحل المستوى (دروس) */}
                <div style={styles.levelStages}>
                  {level.stages.map((stage, index) => {
                    const status = getStageStatus(stage.id);
                    const stageProg = getStageProgress(stage.id);
                    const isBoss = stage.title.includes('Boss');
                    const isEnd = stage.title.includes('البطل');
                    const isLast = index === level.stages.length - 1;

                    return (
                      <div key={stage.id} style={styles.stageWrapper}>
                        <div style={styles.stageCard}>
                          <div
                            style={{
                              ...styles.stageNode,
                              ...getStageStyle(status),
                              borderColor: isEnd ? '#FFD700' : level.color,
                              opacity: unlocked ? 1 : 0.3,
                            }}
                          >
                            <div style={styles.stageIcon}>{getStageIcon(status)}</div>
                            <div style={styles.stageEmoji}>{stage.icon}</div>
                            <div style={styles.stageLabel}>{stage.title}</div>
                            
                            {/* ✅ شريط تقدم المرحلة */}
                            {status !== 'locked' && status !== 'completed' && (
                              <div style={styles.stageProgressBar}>
                                <div style={{ 
                                  ...styles.stageProgressFill, 
                                  width: `${stageProg}%` 
                                }} />
                              </div>
                            )}
                            
                            {isBoss && status === 'completed' && (
                              <div style={styles.bossStar}>⭐</div>
                            )}
                          </div>

                          {!isBoss && !isEnd && status === 'completed' && (
                            <div style={styles.starsContainer}>
                              <span style={styles.star}>⭐</span>
                              <span style={styles.star}>⭐</span>
                              <span style={styles.star}>⭐</span>
                            </div>
                          )}

                          {/* ✅ زر "ابدأ" يروح للمنصة */}
                          <Link
                            href="/platform"
                            style={{
                              ...styles.stageButton,
                              opacity: (status === 'locked' || !unlocked) ? 0.3 : 1,
                              pointerEvents: (status === 'locked' || !unlocked) ? 'none' : 'auto',
                            }}
                          >
                            {status === 'completed' ? '📖 مراجعة' : '🚀 ابدأ'}
                          </Link>

                          {isEnd && status === 'completed' && (
                            <div style={styles.endBadge}>🎉 مكتمل!</div>
                          )}
                        </div>

                        {!isLast && <div style={styles.connectorLine} />}
                      </div>
                    );
                  })}
                </div>

                {/* ✅ خط فاصل بين المستويات */}
                {levelIndex < LEVELS.length - 1 && (
                  <div style={styles.levelDivider}>
                    <span style={styles.levelDividerIcon}>⬇️</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ✅ الإحصائيات السريعة */}
        <div style={styles.quickStats}>
          <div style={styles.quickStat}>
            <span style={styles.quickStatIcon}>✅</span>
            <span style={styles.quickStatNumber}>{stats.completed}</span>
            <span style={styles.quickStatLabel}>مراحل مكتملة</span>
          </div>
          <div style={styles.quickStat}>
            <span style={styles.quickStatIcon}>📖</span>
            <span style={styles.quickStatNumber}>{stats.completedLessons}</span>
            <span style={styles.quickStatLabel}>دروس مكتملة</span>
          </div>
          <div style={styles.quickStat}>
            <span style={styles.quickStatIcon}>⭐</span>
            <span style={styles.quickStatNumber}>{stats.xp}</span>
            <span style={styles.quickStatLabel}>نقاط خبرة</span>
          </div>
          <div style={styles.quickStat}>
            <span style={styles.quickStatIcon}>🎯</span>
            <span style={styles.quickStatNumber}>{stats.level}</span>
            <span style={styles.quickStatLabel}>المستوى</span>
          </div>
          <div style={styles.quickStat}>
            <span style={styles.quickStatIcon}>🏆</span>
            <span style={styles.quickStatNumber}>{stats.completedCourses}</span>
            <span style={styles.quickStatLabel}>كورسات مكتملة</span>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

const styles: any = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 100%)',
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
    background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 100%)',
    color: 'white',
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 215, 0, 0.1)',
    borderTopColor: '#FFD700',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    fontSize: '18px',
    color: 'rgba(255,255,255,0.6)',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.02)',
    backdropFilter: 'blur(10px)',
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
    transition: 'all 0.3s',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  headerStats: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  xpBadge: {
    padding: '6px 14px',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '20px',
    fontSize: '14px',
    color: '#34d399',
  },
  levelBadge: {
    padding: '6px 14px',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '20px',
    fontSize: '14px',
    color: '#a78bfa',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px',
  },
  progressSection: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '40px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  progressTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    margin: 0,
  },
  progressPercentage: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
    borderRadius: '4px',
    transition: 'width 0.8s ease',
  },
  progressText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  progressSubText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: '4px',
  },
  levelIndicator: {
    marginTop: '12px',
    padding: '10px',
    background: 'rgba(139,92,246,0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(139,92,246,0.2)',
    textAlign: 'center',
  },
  levelIndicatorText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#a78bfa',
  },
  mapContainer: {
    position: 'relative',
    padding: '20px 0',
  },
  levelWrapper: {
    marginBottom: '40px',
    animation: 'fadeInUp 0.5s ease forwards',
  },
  levelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px 20px',
    marginBottom: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    borderBottom: '3px solid',
    transition: 'all 0.3s ease',
  },
  levelIcon: {
    fontSize: '28px',
  },
  levelTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
    flex: 1,
  },
  levelLockedBadge: {
    padding: '4px 12px',
    background: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  levelProgressBadge: {
    padding: '4px 12px',
    background: 'rgba(16,185,129,0.15)',
    color: '#34d399',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  levelStages: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '0 20px',
  },
  levelDivider: {
    display: 'flex',
    justifyContent: 'center',
    padding: '10px 0',
    opacity: 0.3,
  },
  levelDividerIcon: {
    fontSize: '24px',
  },
  stageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: '300px',
  },
  connectorLine: {
    width: '2px',
    height: '20px',
    background: 'rgba(255,255,255,0.05)',
    margin: '5px 0',
  },
  stageCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.05)',
    width: '100%',
    transition: 'all 0.3s ease',
    animation: 'fadeInUp 0.5s ease forwards',
  },
  stageNode: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '15px',
    borderRadius: '14px',
    width: '100%',
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  stageCompleted: {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '2px solid #10b981',
    boxShadow: '0 0 30px rgba(16, 185, 129, 0.1)',
  },
  stageStarted: {
    background: 'rgba(255, 215, 0, 0.08)',
    border: '2px solid #FFD700',
    boxShadow: '0 0 30px rgba(255, 215, 0, 0.05)',
  },
  stageLocked: {
    background: 'rgba(255,255,255,0.02)',
    border: '2px solid rgba(255,255,255,0.05)',
    opacity: 0.5,
  },
  stageIcon: {
    fontSize: '18px',
    position: 'absolute',
    top: '-8px',
    right: '-8px',
  },
  stageEmoji: {
    fontSize: '32px',
  },
  stageLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  stageProgressBar: {
    width: '100%',
    height: '4px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '4px',
  },
  stageProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },
  bossStar: {
    position: 'absolute',
    bottom: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '14px',
    animation: 'pulse 1.5s ease infinite',
  },
  starsContainer: {
    display: 'flex',
    gap: '3px',
  },
  star: {
    fontSize: '12px',
  },
  stageButton: {
    padding: '6px 16px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    textDecoration: 'none',
    borderRadius: '50px',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
  },
  endBadge: {
    padding: '4px 12px',
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid #FFD700',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  quickStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '15px',
    marginTop: '40px',
  },
  quickStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  quickStatIcon: {
    fontSize: '28px',
    marginBottom: '5px',
  },
  quickStatNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
  },
  quickStatLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  `;
  document.head.appendChild(style);
}