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
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

export default function ParentDashboard() {
  const router = useRouter();
  const [parent, setParent] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [childCourses, setChildCourses] = useState<any[]>([]);
  const [childProgress, setChildProgress] = useState<any[]>([]);
  const [showChildModal, setShowChildModal] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [studentPhone, setStudentPhone] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  // ✅ قائمة المواد (من المنصة)
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [subjectReviews, setSubjectReviews] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<any>(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  // ✅ تفاصيل الكورس
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseLessons, setCourseLessons] = useState<any[]>([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(false);

  // ✅ ✅ كورسات المرحلة
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [selectedChildForCourses, setSelectedChildForCourses] = useState<any>(null);
  const [childEnrolledCourses, setChildEnrolledCourses] = useState<string[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      if (parsed.role !== 'parent') {
        router.push('/platform');
        return;
      }
      setParent(parsed);
      loadAllData(parsed);
      loadAllCourses();
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, [router]);

  const loadAllData = async (parentData: any) => {
    try {
      console.log('🔍 جلب البيانات...');
      
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsData = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllSubjects(subjectsData);

      let childrenData = parentData.children || [];
      if (!Array.isArray(childrenData)) {
        childrenData = [];
      }

      console.log('👦 الأطفال:', childrenData);

      const childrenList: any[] = [];
      for (const child of childrenData) {
        if (typeof child === 'string') {
          console.log(`🔍 جلب بيانات الطالب ${child}`);
          const userRef = doc(db, 'users', child);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            const progressQuery = query(
              collection(db, 'student_subjects'),
              where('studentId', '==', child)
            );
            const progressSnapshot = await getDocs(progressQuery);
            const progressData = progressSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));

            const coursesQuery = query(
              collection(db, 'student_courses'),
              where('studentId', '==', child),
              where('isActive', '==', true)
            );
            const coursesSnapshot = await getDocs(coursesQuery);
            
            const coursesData = [];
            for (const courseDoc of coursesSnapshot.docs) {
              const data = courseDoc.data();
              try {
                const courseRef = doc(db, 'courses', data.courseId);
                const courseDocData = await getDoc(courseRef);
                const courseData = courseDocData.exists() ? courseDocData.data() : {};
                
                let totalLessons = 0;
                let completedLessons = 0;
                
                try {
                  const modulesQuery = query(
                    collection(db, 'modules'),
                    where('courseId', '==', data.courseId)
                  );
                  const modulesSnapshot = await getDocs(modulesQuery);
                  const modulesData = modulesSnapshot.docs.map(doc => doc.id);
                  
                  let allLessonsIds: string[] = [];
                  for (const moduleId of modulesData) {
                    const lessonsQuery = query(
                      collection(db, 'lessons'),
                      where('moduleId', '==', moduleId)
                    );
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    lessonsSnapshot.docs.forEach(doc => {
                      allLessonsIds.push(doc.id);
                    });
                  }
                  totalLessons = allLessonsIds.length;
                  
                  if (totalLessons > 0) {
                    const completedQuery = query(
                      collection(db, 'student_lessons'),
                      where('studentId', '==', child),
                      where('courseId', '==', data.courseId),
                      where('isCompleted', '==', true)
                    );
                    const completedSnapshot = await getDocs(completedQuery);
                    completedLessons = completedSnapshot.size;
                  }
                  
                } catch (e) {
                  console.log(`⚠️ خطأ في جلب محتوى الكورس ${data.courseId}:`, e);
                }
                
                coursesData.push({
                  id: courseDoc.id,
                  ...data,
                  courseName: courseData.title || 'كورس',
                  courseGrade: courseData.grade || '',
                  totalLessons: totalLessons,
                  completedLessons: completedLessons,
                  progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
                  isActive: data.isActive,
                });
              } catch (e) {
                console.log(`⚠️ خطأ في جلب تفاصيل الكورس ${data.courseId}:`, e);
                coursesData.push({
                  id: courseDoc.id,
                  ...data,
                  courseName: 'كورس',
                  courseGrade: '',
                  totalLessons: 0,
                  completedLessons: 0,
                  progress: 0,
                  isActive: data.isActive,
                });
              }
            }

            childrenList.push({
              id: child,
              name: userData.name || 'طالب',
              phone: userData.phone || '',
              grade: userData.grade || '1-prep',
              progress: progressData,
              courses: coursesData,
              points: userData.points || 0,
              level: userData.level || 1,
              streak: userData.streak || 0,
              gems: userData.gems || 0,
              xp: userData.xp || 0,
            });
          }
        }
      }

      console.log('✅ الأبناء:', childrenList);
      setChildren(childrenList);
      
      if (childrenList.length === 0) {
        setMessage('ℹ️ لم يتم ربط أي أبناء بحسابك');
      } else {
        setMessage(`✅ تم العثور على ${childrenList.length} أبناء`);
      }

    } catch (error) {
      console.error('❌ خطأ في جلب البيانات:', error);
      setMessage('❌ حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // ✅ جلب كل الكورسات في المنصة
  const loadAllCourses = async () => {
    try {
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllCourses(coursesData);
    } catch (error) {
      console.error('❌ خطأ في جلب الكورسات:', error);
    }
  };

  // ✅ جلب الكورسات المسجل فيها طالب معين
  const loadChildEnrolledCourses = async (childId: string) => {
    try {
      const enrolledQuery = query(
        collection(db, 'student_courses'),
        where('studentId', '==', childId),
        where('isActive', '==', true)
      );
      const enrolledSnapshot = await getDocs(enrolledQuery);
      const enrolledIds = enrolledSnapshot.docs.map(doc => doc.data().courseId);
      setChildEnrolledCourses(enrolledIds);
    } catch (error) {
      console.error('❌ خطأ في جلب الكورسات المسجل فيها:', error);
    }
  };

  // ✅ جلب تفاصيل الكورس (مع الوحدات والدروس)
  const loadCourseDetails = async (course: any) => {
    try {
      setLoadingCourse(true);
      setShowCourseModal(true);
      setSelectedCourse(course);
      
      console.log('🔍 جلب تفاصيل الكورس:', course.courseId);
      
      const modulesQuery = query(
        collection(db, 'modules'),
        where('courseId', '==', course.courseId)
      );
      const modulesSnapshot = await getDocs(modulesQuery);
      const modulesData = modulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      modulesData.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('📦 الوحدات:', modulesData);
      
      let allLessons: any[] = [];
      for (const module of modulesData) {
        const lessonsQuery = query(
          collection(db, 'lessons'),
          where('moduleId', '==', module.id)
        );
        const lessonsSnapshot = await getDocs(lessonsQuery);
        const lessonsData = lessonsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          moduleTitle: module.title,
          moduleOrder: module.order,
        }));
        lessonsData.sort((a, b) => (a.order || 0) - (b.order || 0));
        allLessons = [...allLessons, ...lessonsData];
      }
      
      console.log('📚 الدروس:', allLessons);
      
      const studentId = selectedChild?.id;
      if (studentId) {
        for (const lesson of allLessons) {
          const completedQuery = query(
            collection(db, 'student_lessons'),
            where('studentId', '==', studentId),
            where('lessonId', '==', lesson.id),
            where('isCompleted', '==', true)
          );
          const completedSnap = await getDocs(completedQuery);
          lesson.isCompleted = !completedSnap.empty;
          
          if (lesson.examId) {
            const examResultQuery = query(
              collection(db, 'exam_results'),
              where('studentId', '==', studentId),
              where('examId', '==', lesson.examId)
            );
            const examResultSnap = await getDocs(examResultQuery);
            if (!examResultSnap.empty) {
              const result = examResultSnap.docs[0].data();
              lesson.examCompleted = true;
              lesson.examScore = result.percentage || result.totalScore || 0;
            } else {
              lesson.examCompleted = false;
              lesson.examScore = 0;
            }
          }
          
          if (lesson.assignmentId) {
            const assignResultQuery = query(
              collection(db, 'assignment_results'),
              where('studentId', '==', studentId),
              where('assignmentId', '==', lesson.assignmentId)
            );
            const assignResultSnap = await getDocs(assignResultQuery);
            if (!assignResultSnap.empty) {
              const result = assignResultSnap.docs[0].data();
              lesson.assignmentCompleted = true;
              lesson.assignmentScore = result.score || 0;
            } else {
              lesson.assignmentCompleted = false;
              lesson.assignmentScore = 0;
            }
          }
        }
      }
      
      const totalLessons = allLessons.length;
      const completedLessons = allLessons.filter((l: any) => l.isCompleted).length;
      course.totalLessons = totalLessons;
      course.completedLessons = completedLessons;
      course.progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      
      setCourseLessons(allLessons);
      
    } catch (error) {
      console.error('❌ خطأ في جلب تفاصيل الكورس:', error);
      setMessage('❌ حدث خطأ في جلب تفاصيل الكورس');
    } finally {
      setLoadingCourse(false);
    }
  };

  // ✅ جلب تفاصيل المادة
  const loadSubjectDetails = async (subjectId: string) => {
    try {
      const subjectRef = doc(db, 'subjects', subjectId);
      const subjectDoc = await getDoc(subjectRef);
      if (!subjectDoc.exists()) {
        setMessage('⚠️ المادة غير موجودة');
        return;
      }
      const subjectData = { id: subjectDoc.id, ...subjectDoc.data() };
      setSelectedSubject(subjectData);

      const enrolledQuery = query(
        collection(db, 'student_subjects'),
        where('subjectId', '==', subjectId)
      );
      const enrolledSnap = await getDocs(enrolledQuery);
      const enrolledCount = enrolledSnap.size;

      const coursesQuery = query(
        collection(db, 'courses'),
        where('subjectId', '==', subjectId)
      );
      const coursesSnap = await getDocs(coursesQuery);
      const totalCourses = coursesSnap.size;

      const uniqueStudents = new Set();
      for (const courseDoc of coursesSnap.docs) {
        const activatedQuery = query(
          collection(db, 'student_courses'),
          where('courseId', '==', courseDoc.id),
          where('isActive', '==', true)
        );
        const activatedSnap = await getDocs(activatedQuery);
        activatedSnap.forEach(doc => {
          uniqueStudents.add(doc.data().studentId);
        });
      }
      const activatedStudents = uniqueStudents.size;

      setSubjectStats({ 
        enrolled: enrolledCount, 
        totalCourses: totalCourses,
        activated: activatedStudents
      });

      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('subjectId', '==', subjectId),
        orderBy('createdAt', 'desc')
      );
      const reviewsSnap = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubjectReviews(reviewsData);

      setShowSubjectModal(true);

    } catch (error) {
      console.error('❌ خطأ في جلب تفاصيل المادة:', error);
      setMessage('❌ حدث خطأ في جلب التفاصيل');
    }
  };

  // ✅ ربط طالب جديد
  const handleLinkStudent = async () => {
    if (!studentPhone.trim()) {
      setMessage('⚠️ من فضلك أدخل رقم هاتف الطالب');
      return;
    }

    setLinkLoading(true);
    setMessage('');

    try {
      const cleanedPhone = studentPhone.replace(/\D/g, '');
      const fullPhone = parent?.countryCode + cleanedPhone;
      
      const q = query(
        collection(db, 'users'),
        where('phone', '==', fullPhone),
        where('role', '==', 'student')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage('❌ لا يوجد طالب بهذا الرقم');
        setLinkLoading(false);
        return;
      }

      const studentDoc = snapshot.docs[0];
      const studentData = studentDoc.data();
      const studentId = studentDoc.id;

      const currentChildren = parent?.children || [];
      if (currentChildren.includes(studentId)) {
        setMessage('⚠️ هذا الطالب مرتبط بالفعل بحسابك');
        setLinkLoading(false);
        return;
      }

      await addDoc(collection(db, 'notifications'), {
        type: 'parent_request',
        parentId: parent.id,
        parentName: parent.name,
        studentId: studentId,
        studentName: studentData.name,
        status: 'pending',
        message: `👨‍👩‍👦 ولي الأمر ${parent.name} يريد ربطك بحسابه`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMessage(`✅ تم إرسال طلب الربط للطالب ${studentData.name}`);
      setStudentPhone('');
      setShowLinkForm(false);

    } catch (error) {
      console.error('❌ خطأ في ربط الطالب:', error);
      setMessage('❌ حدث خطأ في إرسال الطلب');
    } finally {
      setLinkLoading(false);
    }
  };

  const loadChildDetails = (child: any) => {
    setSelectedChild(child);
    setChildCourses(child.courses || []);
    setChildProgress(child.progress || []);
    setShowChildModal(true);
  };

  const getProgress = (child: any) => {
    if (!child.progress || child.progress.length === 0) return 0;
    const total = child.progress.length;
    const completed = child.progress.filter((p: any) => p.isActive).length;
    return Math.round((completed / total) * 100);
  };

  const getGradeLabel = (gradeValue: string) => {
    const grades: { [key: string]: string } = {
      '1-prep': 'أولى إعدادي',
      '2-prep': 'ثانية إعدادي',
      '3-prep': 'ثالثة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي',
    };
    return grades[gradeValue] || gradeValue;
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(Math.min(rating, 5)) + '☆'.repeat(Math.max(0, 5 - rating));
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 د';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} د`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours} س ${remainingMins} د`;
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
          <h1 style={styles.title}>👨‍👩‍👦 لوحة تحكم ولي الأمر</h1>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{parent?.name || 'ولي أمر'}</span>
            <span style={styles.badge}>✅ متابعة</span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {message && (
          <div style={{
            ...styles.message,
            background: message.includes('✅') ? 'rgba(16,185,129,0.1)' : 
                        message.includes('⚠️') ? 'rgba(239,68,68,0.1)' :
                        message.includes('ℹ️') ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.includes('✅') ? '#34d399' : 
                  message.includes('⚠️') ? '#f87171' :
                  message.includes('ℹ️') ? '#60a5fa' : '#f87171',
          }}>
            {message}
          </div>
        )}

        <div style={styles.welcomeCard}>
          <h2 style={styles.welcome}>مرحباً {parent?.name} 👋</h2>
          <p style={styles.description}>من هنا يمكنك متابعة أداء أبنائك وإضافة أبناء جدد.</p>
        </div>

        {/* ✅ زر ربط طالب */}
        <div style={styles.linkSection}>
          <button
            onClick={() => setShowLinkForm(!showLinkForm)}
            style={styles.linkButton}
          >
            {showLinkForm ? '✕ إلغاء' : '➕ ربط طالب جديد'}
          </button>

          {showLinkForm && (
            <div style={styles.linkForm}>
              <div style={styles.linkFormContent}>
                <label style={styles.linkLabel}>📱 رقم هاتف الطالب</label>
                <div style={styles.linkInputRow}>
                  <span style={styles.linkCountryCode}>{parent?.countryCode || '+20'}</span>
                  <input
                    type="tel"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="أدخل رقم الطالب"
                    style={styles.linkInput}
                    dir="ltr"
                  />
                </div>
                <button
                  onClick={handleLinkStudent}
                  disabled={linkLoading}
                  style={{
                    ...styles.linkSubmit,
                    opacity: linkLoading ? 0.5 : 1,
                    cursor: linkLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {linkLoading ? '⏳ جاري الإرسال...' : '📨 إرسال طلب الربط'}
                </button>
                <p style={styles.linkHint}>
                  سيتم إرسال إشعار للطالب للموافقة على الربط
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ✅ عرض الأبناء */}
        {children.length === 0 ? (
          <div style={styles.empty}>
            <span style={styles.emptyIcon}>👨‍👩‍👦</span>
            <h3 style={styles.emptyTitle}>لا يوجد أبناء مسجلين</h3>
            <p style={styles.emptyText}>لم يتم ربط أي أبناء بحسابك.</p>
            <p style={styles.emptySub}>استخدم زر "ربط طالب جديد" لإضافة ابنك.</p>
          </div>
        ) : (
          <div style={styles.childrenGrid}>
            {children.map((child) => (
              <div key={child.id} style={styles.childCard}>
                <div style={styles.childHeader}>
                  <div style={styles.childAvatar}>
                    {child.name.charAt(0)}
                  </div>
                  <div style={styles.childInfo}>
                    <h3 style={styles.childName}>{child.name}</h3>
                    <div style={styles.childTags}>
                      <span style={styles.gradeTag}>{getGradeLabel(child.grade)}</span>
                      <span style={styles.levelTag}>🎯 مستوى {child.level || 1}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.childStats}>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>📚</span>
                    <span style={styles.statValue}>{child.courses?.length || 0}</span>
                    <span style={styles.statLabel}>كورسات</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>📊</span>
                    <span style={styles.statValue}>{getProgress(child)}%</span>
                    <span style={styles.statLabel}>تقدم</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>⭐</span>
                    <span style={styles.statValue}>{child.xp || 0}</span>
                    <span style={styles.statLabel}>نقاط خبرة</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>🎯</span>
                    <span style={styles.statValue}>{child.level || 1}</span>
                    <span style={styles.statLabel}>المستوى</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>🔥</span>
                    <span style={styles.statValue}>{child.streak || 0}</span>
                    <span style={styles.statLabel}>أيام</span>
                  </div>
                </div>

                <button
                  onClick={() => loadChildDetails(child)}
                  style={styles.viewButton}
                >
                  📊 عرض التفاصيل
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ✅ قائمة المواد في المنصة */}
        <div style={styles.subjectsSection}>
          <h3 style={styles.subjectsTitle}>📚 مواد المنصة</h3>
          {allSubjects.length === 0 ? (
            <p style={styles.noSubjects}>لا توجد مواد مضافة بعد</p>
          ) : (
            <div style={styles.subjectsGrid}>
              {allSubjects.map((subject) => (
                <div key={subject.id} style={styles.subjectCard}>
                  <div style={styles.subjectCardHeader}>
                    <span style={styles.subjectCardIcon}>{subject.icon || '📚'}</span>
                    <div>
                      <h4 style={styles.subjectCardName}>{subject.name}</h4>
                      <span style={styles.subjectCardTeacher}>👨‍🏫 {subject.teacherName || 'لم يحدد'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => loadSubjectDetails(subject.id)}
                    style={styles.subjectDetailsBtn}
                  >
                    📊 تفاصيل
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ ✅ عرض كورسات المرحلة لكل ابن */}
        {children.length > 0 && allCourses.length > 0 && (
          <div style={styles.coursesByGradeSection}>
            <h3 style={styles.coursesByGradeTitle}>📚 كورسات المرحلة</h3>
            <p style={styles.coursesByGradeSub}>
              اختر ابنك لعرض الكورسات المتاحة لمرحلته
            </p>
            
            <div style={styles.childSelector}>
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => {
                    setSelectedChildForCourses(child);
                    loadChildEnrolledCourses(child.id);
                  }}
                  style={{
                    ...styles.childSelectorBtn,
                    background: selectedChildForCourses?.id === child.id 
                      ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' 
                      : 'rgba(255,255,255,0.03)',
                    border: selectedChildForCourses?.id === child.id 
                      ? '1px solid rgba(139,92,246,0.3)' 
                      : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span style={styles.childSelectorAvatar}>{child.name.charAt(0)}</span>
                  <span>{child.name}</span>
                  <span style={styles.childSelectorGrade}>({getGradeLabel(child.grade)})</span>
                </button>
              ))}
            </div>

            {selectedChildForCourses && (
              <div style={styles.coursesByGradeList}>
                <h4 style={styles.coursesByGradeChildName}>
                  📖 كورسات {selectedChildForCourses.name}
                </h4>
                
                {(() => {
                  const gradeCourses = allCourses.filter(
                    (c) => c.grade === selectedChildForCourses.grade
                  );
                  
                  if (gradeCourses.length === 0) {
                    return (
                      <p style={styles.noCoursesByGrade}>
                        لا توجد كورسات متاحة لمرحلة {getGradeLabel(selectedChildForCourses.grade)}
                      </p>
                    );
                  }
                  
                  return (
                    <div style={styles.coursesByGradeGrid}>
                      {gradeCourses.map((course) => {
                        const isEnrolled = childEnrolledCourses.includes(course.id);
                        return (
                          <div 
                            key={course.id} 
                            style={{
                              ...styles.courseByGradeCard,
                              borderColor: isEnrolled 
                                ? 'rgba(16,185,129,0.3)' 
                                : 'rgba(255,255,255,0.05)',
                              background: isEnrolled 
                                ? 'rgba(16,185,129,0.05)' 
                                : 'rgba(255,255,255,0.02)',
                            }}
                          >
                            <div style={styles.courseByGradeHeader}>
                              <span style={styles.courseByGradeIcon}>
                                {isEnrolled ? '✅' : '📚'}
                              </span>
                              <div style={styles.courseByGradeInfo}>
                                <h5 style={styles.courseByGradeName}>{course.title}</h5>
                                <span style={styles.courseByGradeCategory}>
                                  {course.category || 'عام'}
                                </span>
                              </div>
                              <span style={{
                                ...styles.courseByGradeStatus,
                                background: isEnrolled 
                                  ? 'rgba(16,185,129,0.15)' 
                                  : 'rgba(239,68,68,0.15)',
                                color: isEnrolled ? '#34d399' : '#f87171',
                              }}>
                                {isEnrolled ? '✅ مسجل' : '❌ غير مسجل'}
                              </span>
                            </div>
                            {course.description && (
                              <p style={styles.courseByGradeDesc}>{course.description}</p>
                            )}
                            <div style={styles.courseByGradeMeta}>
                              <span>📅 {new Date(course.createdAt).toLocaleDateString('ar-EG')}</span>
                              <span>👨‍🏫 {course.teacherName || 'لم يحدد'}</span>
                              <span>💰 {course.price || 0} ج.م</span>
                            </div>
                            {isEnrolled && (
                              <div style={styles.courseByGradeProgress}>
                                <span>📊 تقدم الكورس</span>
                                <div style={styles.courseByGradeProgressBar}>
                                  <div style={{
                                    ...styles.courseByGradeProgressFill,
                                    width: `${course.progress || 0}%`
                                  }} />
                                </div>
                                <span style={styles.courseByGradeProgressText}>
                                  {course.progress || 0}%
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ✅ مودال تفاصيل المادة */}
        {showSubjectModal && selectedSubject && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>
                    {selectedSubject.icon || '📚'} {selectedSubject.name}
                  </h2>
                  <p style={styles.modalSub}>
                    👨‍🏫 {selectedSubject.teacherName || 'لم يحدد'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSubjectModal(false);
                    setSelectedSubject(null);
                    setSubjectReviews([]);
                    setSubjectStats(null);
                  }}
                  style={styles.closeModal}
                >
                  ✕
                </button>
              </div>

              <div style={styles.subjectStatsSection}>
                <div style={styles.subjectStatsGrid}>
                  <div style={styles.subjectStatCard}>
                    <span style={styles.subjectStatIcon}>👥</span>
                    <div>
                      <span style={styles.subjectStatValue}>{subjectStats?.enrolled || 0}</span>
                      <span style={styles.subjectStatLabel}>طلاب مسجلين</span>
                    </div>
                  </div>
                  <div style={styles.subjectStatCard}>
                    <span style={styles.subjectStatIcon}>📚</span>
                    <div>
                      <span style={styles.subjectStatValue}>{subjectStats?.totalCourses || 0}</span>
                      <span style={styles.subjectStatLabel}>كورسات مضافة</span>
                    </div>
                  </div>
                  <div style={styles.subjectStatCard}>
                    <span style={styles.subjectStatIcon}>✅</span>
                    <div>
                      <span style={styles.subjectStatValue}>{subjectStats?.activated || 0}</span>
                      <span style={styles.subjectStatLabel}>طلاب مفعلين</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.subjectReviewsSection}>
                <h4 style={styles.subjectReviewsTitle}>💬 تعليقات الطلاب</h4>
                {subjectReviews.length === 0 ? (
                  <p style={styles.noReviews}>لا توجد تعليقات على هذه المادة</p>
                ) : (
                  <div style={styles.subjectReviewsList}>
                    {subjectReviews.map((review) => (
                      <div key={review.id} style={styles.subjectReviewCard}>
                        <div style={styles.subjectReviewHeader}>
                          <span style={styles.subjectReviewUser}>👤 {review.studentName}</span>
                          <span style={styles.subjectReviewRating}>{renderStars(review.rating)}</span>
                          <span style={styles.subjectReviewDate}>
                            {review.createdAt?.toDate?.() 
                              ? new Date(review.createdAt.toDate()).toLocaleDateString('ar-EG')
                              : ''}
                          </span>
                        </div>
                        <p style={styles.subjectReviewComment}>{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ✅ مودال تفاصيل الطفل */}
        {showChildModal && selectedChild && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>📊 تفاصيل {selectedChild.name}</h2>
                  <p style={styles.modalSub}>
                    {getGradeLabel(selectedChild.grade)} | 📚 {childCourses.length} كورسات
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowChildModal(false);
                    setSelectedChild(null);
                    setChildCourses([]);
                    setChildProgress([]);
                  }}
                  style={styles.closeModal}
                >
                  ✕
                </button>
              </div>

              <div style={styles.childProgressSection}>
                <h3 style={styles.sectionTitle}>📊 التقدم التعليمي</h3>
                <div style={styles.progressGrid}>
                  <div style={styles.progressCard}>
                    <span style={styles.progressLabel}>إجمالي التقدم</span>
                    <span style={styles.progressValue}>
                      {childProgress.length > 0 
                        ? Math.round((childProgress.filter((p: any) => p.isActive).length / childProgress.length) * 100) 
                        : 0}%
                    </span>
                    <div style={styles.progressBar}>
                      <div style={{ 
                        ...styles.progressFill, 
                        width: `${childProgress.length > 0 ? Math.round((childProgress.filter((p: any) => p.isActive).length / childProgress.length) * 100) : 0}%` 
                      }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.pointsSection}>
                <h3 style={styles.sectionTitle}>⭐ النقاط والمستوى</h3>
                <div style={styles.pointsGrid}>
                  <div style={styles.pointCard}>
                    <span style={styles.pointIcon}>⭐</span>
                    <div>
                      <span style={styles.pointValue}>{selectedChild.xp || 0}</span>
                      <span style={styles.pointLabel}>نقاط خبرة</span>
                    </div>
                  </div>
                  <div style={styles.pointCard}>
                    <span style={styles.pointIcon}>🎯</span>
                    <div>
                      <span style={styles.pointValue}>{selectedChild.level || 1}</span>
                      <span style={styles.pointLabel}>المستوى</span>
                    </div>
                  </div>
                  <div style={styles.pointCard}>
                    <span style={styles.pointIcon}>🔥</span>
                    <div>
                      <span style={styles.pointValue}>{selectedChild.streak || 0}</span>
                      <span style={styles.pointLabel}>أيام متواصلة</span>
                    </div>
                  </div>
                  <div style={styles.pointCard}>
                    <span style={styles.pointIcon}>💎</span>
                    <div>
                      <span style={styles.pointValue}>{selectedChild.gems || 0}</span>
                      <span style={styles.pointLabel}>جواهر</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ الكورسات المفتوحة مع زر عرض التفاصيل */}
              <div style={styles.coursesSection}>
                <h3 style={styles.sectionTitle}>📚 الكورسات المفتوحة</h3>
                {childCourses.length === 0 ? (
                  <p style={styles.noCourses}>لا توجد كورسات مفتوحة لهذا الطفل</p>
                ) : (
                  <div style={styles.coursesList}>
                    {childCourses.map((course) => (
                      <div key={course.id} style={styles.courseCard}>
                        <div style={styles.courseInfo}>
                          <div>
                            <span style={styles.courseTitle}>{course.courseName}</span>
                            <span style={styles.courseGrade}>
                              {course.courseGrade === '1-prep' ? 'أولى إعدادي' :
                               course.courseGrade === '2-prep' ? 'ثانية إعدادي' :
                               course.courseGrade === '3-prep' ? 'ثالثة إعدادي' :
                               course.courseGrade === '1-secondary' ? 'أولى ثانوي' :
                               course.courseGrade === '2-secondary' ? 'ثانية ثانوي' : course.courseGrade}
                            </span>
                          </div>
                        </div>
                        <div style={styles.courseProgress}>
                          <span style={styles.courseProgressText}>{course.progress || 0}%</span>
                          <div style={styles.courseProgressBar}>
                            <div style={{ 
                              ...styles.courseProgressFill, 
                              width: `${course.progress || 0}%` 
                            }} />
                          </div>
                          <span style={styles.courseProgressDetails}>
                            {course.completedLessons || 0}/{course.totalLessons || 0} درس
                          </span>
                        </div>
                        <button
                          onClick={() => loadCourseDetails(course)}
                          style={styles.courseDetailsBtn}
                          disabled={loadingCourse}
                        >
                          {loadingCourse ? '⏳ جاري التحميل...' : '📖 عرض التفاصيل'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.supportSection}>
                <h3 style={styles.sectionTitle}>💬 التواصل</h3>
                <div style={styles.supportButtons}>
                  <a
                    href="https://wa.me/message/UKASWZCU5BNLN1"
                    target="_blank"
                    style={styles.whatsappButton}
                  >
                    💬 واتساب
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ مودال تفاصيل الكورس */}
        {showCourseModal && selectedCourse && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>📖 {selectedCourse.courseName}</h2>
                  <p style={styles.modalSub}>
                    {getGradeLabel(selectedCourse.courseGrade)} | 
                    📚 {selectedCourse.totalLessons || 0} درس
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCourseModal(false);
                    setSelectedCourse(null);
                    setCourseLessons([]);
                  }}
                  style={styles.closeModal}
                >
                  ✕
                </button>
              </div>

              {/* ✅ تقدم الكورس */}
              <div style={styles.courseProgressSection}>
                <div style={styles.courseProgressBig}>
                  <span style={styles.courseProgressBigText}>{selectedCourse.progress || 0}%</span>
                  <div style={styles.courseProgressBigBar}>
                    <div style={{ 
                      ...styles.courseProgressBigFill, 
                      width: `${selectedCourse.progress || 0}%` 
                    }} />
                  </div>
                  <span style={styles.courseProgressBigDetails}>
                    {selectedCourse.completedLessons || 0}/{selectedCourse.totalLessons || 0} درس مكتمل
                  </span>
                </div>
              </div>

              {/* ✅ الوحدات والدروس */}
              <div style={styles.lessonsSection}>
                <h4 style={styles.lessonsTitle}>📚 الوحدات والدروس</h4>
                {courseLessons.length === 0 ? (
                  <p style={styles.noLessons}>لا توجد دروس في هذا الكورس</p>
                ) : (
                  <div style={styles.lessonsList}>
                    {courseLessons.map((lesson, index) => (
                      <div key={lesson.id} style={styles.lessonCard}>
                        <div style={styles.lessonHeader}>
                          <span style={styles.lessonNumber}>#{index + 1}</span>
                          <div style={styles.lessonMainInfo}>
                            <span style={styles.lessonTitle}>{lesson.title}</span>
                            {lesson.moduleTitle && (
                              <span style={styles.lessonModule}>📂 {lesson.moduleTitle}</span>
                            )}
                          </div>
                          <span style={{
                            ...styles.lessonStatus,
                            background: lesson.isCompleted ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: lesson.isCompleted ? '#34d399' : '#f87171',
                          }}>
                            {lesson.isCompleted ? '✅ مكتمل' : '⏳ لم يكتمل'}
                          </span>
                        </div>
                        <div style={styles.lessonDetails}>
                          <span>⏱️ {formatDuration(lesson.duration)}</span>
                          {lesson.examId && (
                            <span style={{
                              ...styles.lessonExamStatus,
                              color: lesson.examCompleted ? '#34d399' : '#f87171',
                            }}>
                              📝 امتحان: {lesson.examCompleted ? `✅ ${lesson.examScore}%` : '❌ لم يحل'}
                            </span>
                          )}
                          {lesson.assignmentId && (
                            <span style={{
                              ...styles.lessonAssignmentStatus,
                              color: lesson.assignmentCompleted ? '#34d399' : '#f87171',
                            }}>
                              📋 واجب: {lesson.assignmentCompleted ? `✅ ${lesson.assignmentScore}%` : '❌ لم يحل'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
    fontSize: '28px',
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
    fontSize: '18px',
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
  message: {
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
    border: '1px solid',
    fontSize: '14px',
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
  linkSection: {
    marginBottom: '25px',
  },
  linkButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    width: '100%',
  },
  linkForm: {
    marginTop: '15px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  linkFormContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  linkLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  linkInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '0 12px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  linkCountryCode: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    fontWeight: '600',
  },
  linkInput: {
    flex: 1,
    padding: '12px 0',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'white',
    fontSize: '15px',
  },
  linkSubmit: {
    padding: '12px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  linkHint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center' as const,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '24px',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '10px',
  },
  emptyText: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '10px',
  },
  emptySub: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.2)',
  },
  childrenGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  childCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.3s',
  },
  childHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '15px',
  },
  childAvatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  childTags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  gradeTag: {
    padding: '2px 10px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    borderRadius: '12px',
    fontSize: '12px',
  },
  levelTag: {
    padding: '2px 10px',
    background: 'rgba(139,92,246,0.1)',
    color: '#a78bfa',
    borderRadius: '12px',
    fontSize: '12px',
  },
  childStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px',
    marginBottom: '15px',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
  },
  statIcon: {
    fontSize: '18px',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
  },
  viewButton: {
    width: '100%',
    padding: '10px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
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
    marginBottom: '15px',
    color: 'rgba(255,255,255,0.8)',
  },
  noSubjects: {
    textAlign: 'center' as const,
    padding: '20px',
    color: 'rgba(255,255,255,0.3)',
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '15px',
  },
  subjectCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  subjectCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  subjectCardIcon: {
    fontSize: '28px',
  },
  subjectCardName: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
  },
  subjectCardTeacher: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  subjectDetailsBtn: {
    padding: '6px 16px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  subjectStatsSection: {
    marginBottom: '20px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
  },
  subjectStatsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '15px',
  },
  subjectStatCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  subjectStatIcon: {
    fontSize: '28px',
  },
  subjectStatValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFD700',
    display: 'block',
  },
  subjectStatLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  subjectReviewsSection: {
    marginTop: '15px',
  },
  subjectReviewsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: 'rgba(255,255,255,0.7)',
  },
  noReviews: {
    textAlign: 'center' as const,
    padding: '20px',
    color: 'rgba(255,255,255,0.3)',
  },
  subjectReviewsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
  subjectReviewCard: {
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  subjectReviewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const,
    marginBottom: '5px',
  },
  subjectReviewUser: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  subjectReviewRating: {
    fontSize: '16px',
  },
  subjectReviewDate: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
  },
  subjectReviewComment: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.5,
    margin: 0,
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  modalSub: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    margin: '5px 0 0 0',
  },
  closeModal: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '24px',
    cursor: 'pointer',
  },
  childProgressSection: {
    marginBottom: '20px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
  },
  progressGrid: {
    display: 'grid',
    gap: '15px',
  },
  progressCard: {
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  progressLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    display: 'block',
    marginBottom: '4px',
  },
  progressValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#FFD700',
    display: 'block',
    marginBottom: '8px',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  pointsSection: {
    marginBottom: '20px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
  },
  pointsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  pointCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  pointIcon: {
    fontSize: '24px',
  },
  pointValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#FFD700',
    display: 'block',
  },
  pointLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
  },
  coursesSection: {
    marginBottom: '20px',
  },
  coursesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  courseCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
    flexWrap: 'wrap' as const,
    gap: '10px',
  },
  courseInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: '150px',
  },
  courseTitle: {
    fontSize: '15px',
    fontWeight: '600',
    display: 'block',
  },
  courseGrade: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginRight: '8px',
  },
  courseProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '120px',
  },
  courseProgressText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFD700',
    minWidth: '40px',
  },
  courseProgressBar: {
    width: '80px',
    height: '4px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  courseProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },
  courseProgressDetails: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
  },
  courseDetailsBtn: {
    padding: '6px 16px',
    background: 'rgba(139,92,246,0.1)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  supportSection: {
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: 'rgba(255,255,255,0.8)',
  },
  supportButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  whatsappButton: {
    padding: '12px 24px',
    background: '#25D366',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '16px',
    textAlign: 'center' as const,
    transition: 'all 0.3s',
  },
  noCourses: {
    textAlign: 'center' as const,
    padding: '20px',
    color: 'rgba(255,255,255,0.3)',
  },
  // ✅ أنماط مودال تفاصيل الكورس
  courseProgressSection: {
    marginBottom: '20px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
  },
  courseProgressBig: {
    textAlign: 'center' as const,
  },
  courseProgressBigText: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#FFD700',
    display: 'block',
  },
  courseProgressBigBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  courseProgressBigFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  courseProgressBigDetails: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    display: 'block',
    marginTop: '8px',
  },
  lessonsSection: {
    marginTop: '10px',
  },
  lessonsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: 'rgba(255,255,255,0.7)',
  },
  noLessons: {
    textAlign: 'center' as const,
    padding: '20px',
    color: 'rgba(255,255,255,0.3)',
  },
  lessonsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  lessonCard: {
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  lessonHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const,
    marginBottom: '6px',
  },
  lessonNumber: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.2)',
    minWidth: '30px',
  },
  lessonMainInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: '14px',
    fontWeight: '600',
    display: 'block',
  },
  lessonModule: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
  },
  lessonStatus: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 10px',
    borderRadius: '12px',
  },
  lessonDetails: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap' as const,
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '4px',
  },
  lessonExamStatus: {
    fontSize: '12px',
  },
  lessonAssignmentStatus: {
    fontSize: '12px',
  },

  // ✅ ✅ أنماط قسم كورسات المرحلة
  coursesByGradeSection: {
    marginTop: '30px',
    padding: '25px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  coursesByGradeTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: '5px',
  },
  coursesByGradeSub: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '20px',
  },
  childSelector: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
    marginBottom: '20px',
  },
  childSelectorBtn: {
    padding: '10px 18px',
    borderRadius: '10px',
    cursor: 'pointer',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  childSelectorAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  childSelectorGrade: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  coursesByGradeList: {
    marginTop: '15px',
  },
  coursesByGradeChildName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '15px',
  },
  noCoursesByGrade: {
    textAlign: 'center' as const,
    padding: '30px',
    color: 'rgba(255,255,255,0.3)',
  },
  coursesByGradeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '15px',
  },
  courseByGradeCard: {
    padding: '18px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.02)',
    transition: 'all 0.3s',
  },
  courseByGradeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px',
  },
  courseByGradeIcon: {
    fontSize: '24px',
  },
  courseByGradeInfo: {
    flex: 1,
  },
  courseByGradeName: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    color: 'white',
  },
  courseByGradeCategory: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  courseByGradeStatus: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap' as const,
  },
  courseByGradeDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '10px',
    lineHeight: 1.5,
  },
  courseByGradeMeta: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap' as const,
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '10px',
  },
  courseByGradeProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '8px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  courseByGradeProgressBar: {
    flex: 1,
    height: '4px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  courseByGradeProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },
  courseByGradeProgressText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#FFD700',
    minWidth: '35px',
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