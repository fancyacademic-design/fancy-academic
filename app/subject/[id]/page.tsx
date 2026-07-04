'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
  orderBy
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function SubjectPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = params.id as string;

  const [subject, setSubject] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [openedCourses, setOpenedCourses] = useState<string[]>([]);

  // ✅ عدد المسجلين والمفعلين
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [activatedCount, setActivatedCount] = useState(0);

  // ✅ الآراء والتعليقات
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);

  // ✅ ✅ إحصائيات التقييمات
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<{ [key: number]: number }>({});

  // ✅ ✅ نبذة عن المدرس
  const [teacherAbout, setTeacherAbout] = useState('');
  const [loadingAbout, setLoadingAbout] = useState(false);

  // ✅ ✅ التقدم المحسوب من الامتحانات
  const [examProgress, setExamProgress] = useState(0);

  // ✅ التحقق من حجم الشاشة
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    setUser(parsed);
    loadSubject(parsed.id);
  }, [subjectId]);

  // ✅ ✅ جلب نبذة المدرس
  const loadTeacherAbout = async (teacherId: string) => {
    if (!teacherId) return;
    setLoadingAbout(true);
    try {
      const userRef = doc(db, 'users', teacherId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.aboutTeacher) {
          setTeacherAbout(data.aboutTeacher);
          console.log('✅ تم جلب نبذة المدرس:', data.aboutTeacher);
        } else {
          console.log('ℹ️ لا توجد نبذة للمدرس');
        }
      }
    } catch (error) {
      console.error('❌ خطأ في جلب نبذة المدرس:', error);
    } finally {
      setLoadingAbout(false);
    }
  };

  // ✅ ✅ ✅ الحل النهائي - حساب التقدم من الامتحانات مباشرة (من غير دروس)
  const calculateExamProgress = async (studentId: string, subjectId: string) => {
    try {
      console.log('🔍 ===== بدء حساب التقدم (طريقة مباشرة) =====');
      console.log('📌 subjectId:', subjectId);
      
      // ✅ 1. جلب جميع الامتحانات في المادة
      const examsQuery = query(
        collection(db, 'exams'),
        where('subjectId', '==', subjectId)
      );
      const examsSnap = await getDocs(examsQuery);
      const examsData = examsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log('📝 عدد الامتحانات في المادة:', examsData.length);
      
      if (examsData.length === 0) {
        console.log('⚠️ لا توجد امتحانات في هذه المادة');
        setProgress(0);
        return 0;
      }
      
      // ✅ 2. جلب الامتحانات المكتملة للطالب
      const resultsQuery = query(
        collection(db, 'exam_results'),
        where('studentId', '==', studentId)
      );
      const resultsSnap = await getDocs(resultsQuery);
      const completedExamIds = resultsSnap.docs.map(doc => doc.data().examId);
      console.log('📝 الامتحانات المكتملة للطالب:', completedExamIds);

      // ✅ 3. حساب التقدم
      let totalExams = examsData.length;
      let completedExams = 0;

      examsData.forEach(exam => {
        if (completedExamIds.includes(exam.id)) {
          completedExams++;
        }
      });

      console.log(`📊 النتيجة: ${completedExams}/${totalExams} امتحان مكتمل`);
      const examProgress = totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0;
      console.log('📊 النسبة المئوية:', examProgress, '%');
      
      setExamProgress(examProgress);
      setProgress(examProgress);

      // ✅ 4. تحديث التقدم في student_subjects
      const enrolledQuery = query(
        collection(db, 'student_subjects'),
        where('studentId', '==', studentId),
        where('subjectId', '==', subjectId)
      );
      const enrolledSnap = await getDocs(enrolledQuery);
      if (!enrolledSnap.empty) {
        const docRef = doc(db, 'student_subjects', enrolledSnap.docs[0].id);
        await updateDoc(docRef, {
          progress: examProgress,
          updatedAt: serverTimestamp(),
        });
        console.log('✅ تم تحديث التقدم في Firebase:', examProgress);
      } else {
        console.log('⚠️ الطالب غير مسجل في المادة');
      }

      return examProgress;

    } catch (error) {
      console.error('❌ خطأ في حساب التقدم من الامتحانات:', error);
      return 0;
    }
  };

  // ✅ جلب بيانات المادة والكورسات
  const loadSubject = async (studentId: string) => {
    try {
      setLoading(true);
      
      const subjectRef = doc(db, 'subjects', subjectId);
      const subjectDoc = await getDoc(subjectRef);
      
      if (!subjectDoc.exists()) {
        router.push('/platform');
        return;
      }

      const subjectData = { id: subjectDoc.id, ...subjectDoc.data() };
      setSubject(subjectData);

      // ✅ جلب نبذة المدرس
      if (subjectData.teacherId) {
        await loadTeacherAbout(subjectData.teacherId);
      }

      // ✅ جلب الكورسات
      const coursesQuery = query(
        collection(db, 'courses'),
        where('subjectId', '==', subjectId),
        where('isActive', '==', true)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      let coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ✅ فلترة حسب مرحلة الطالب
      const studentGrade = user?.grade || '1-prep';
      coursesData = coursesData.filter(course => course.grade === studentGrade);
      coursesData.sort((a, b) => (a.order || 0) - (b.order || 0));

      // ✅ جلب عدد الدروس لكل كورس
      for (const course of coursesData) {
        const lessonsQuery = query(
          collection(db, 'lessons'),
          where('courseId', '==', course.id)
        );
        const lessonsSnapshot = await getDocs(lessonsQuery);
        course.lessonsCount = lessonsSnapshot.size;
      }

      // ✅ جلب الكورسات المفتوحة للطالب
      const openedSnapshot = await getDocs(
        query(
          collection(db, 'student_courses'),
          where('studentId', '==', studentId),
          where('isActive', '==', true)
        )
      );
      const openedIds = openedSnapshot.docs.map(doc => doc.data().courseId);
      setOpenedCourses(openedIds);

      coursesData = coursesData.map(course => ({
        ...course,
        isOpened: openedIds.includes(course.id),
      }));

      setCourses(coursesData);

      // ✅ التحقق من التسجيل
      const enrolledSnapshot = await getDocs(
        query(
          collection(db, 'student_subjects'),
          where('studentId', '==', studentId),
          where('subjectId', '==', subjectId)
        )
      );
      
      const isEnrolledNow = !enrolledSnapshot.empty || subjectData.isGlobal === true;
      setIsEnrolled(isEnrolledNow);

      // ✅ ✅ حساب التقدم من الامتحانات (الطريقة المباشرة)
      if (isEnrolledNow) {
        console.log('✅ الطالب مسجل في المادة، نحسب التقدم...');
        await calculateExamProgress(studentId, subjectId);
      } else {
        console.log('⚠️ الطالب غير مسجل في المادة');
      }

      // ✅ جلب التعليقات والتقييمات
      await loadReviews();

      // ✅ جلب الإحصائيات
      await loadCounts();

    } catch (error) {
      console.error('❌ خطأ في تحميل المادة:', error);
      setMessage('❌ حدث خطأ في تحميل المادة');
    } finally {
      setLoading(false);
    }
  };

  // ✅ جلب عدد المسجلين والمفعلين
  const loadCounts = async () => {
    try {
      // ✅ عدد المسجلين في المادة
      const enrolledQuery = query(
        collection(db, 'student_subjects'),
        where('subjectId', '==', subjectId)
      );
      const enrolledSnap = await getDocs(enrolledQuery);
      setEnrolledCount(enrolledSnap.size);

      // ✅ عدد الطلاب المفعل لهم كورسات في المادة
      const coursesQuery = query(
        collection(db, 'courses'),
        where('subjectId', '==', subjectId)
      );
      const coursesSnap = await getDocs(coursesQuery);
      const courseIds = coursesSnap.docs.map(doc => doc.id);
      
      let activated = 0;
      for (const courseId of courseIds) {
        const activatedQuery = query(
          collection(db, 'student_courses'),
          where('courseId', '==', courseId),
          where('isActive', '==', true)
        );
        const activatedSnap = await getDocs(activatedQuery);
        activated += activatedSnap.size;
      }
      setActivatedCount(activated);

    } catch (error) {
      console.error('❌ خطأ في جلب الإحصائيات:', error);
    }
  };

  // ✅ ✅ جلب الآراء والتعليقات مع حساب الإحصائيات (من 5 نجوم)
  const loadReviews = async () => {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('subjectId', '==', subjectId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReviews(reviewsData);

      // ✅ ✅ حساب متوسط التقييم من 5
      if (reviewsData.length > 0) {
        const totalRating = reviewsData.reduce((sum, r) => sum + (r.rating || 0), 0);
        const avg = totalRating / reviewsData.length;
        setAvgRating(Math.round(avg * 10) / 10);
        setRatingCount(reviewsData.length);

        // ✅ ✅ توزيع التقييمات
        const distribution: { [key: number]: number } = {};
        reviewsData.forEach(r => {
          const rating = Math.round(r.rating || 0);
          distribution[rating] = (distribution[rating] || 0) + 1;
        });
        setRatingDistribution(distribution);
      } else {
        setAvgRating(0);
        setRatingCount(0);
        setRatingDistribution({});
      }
    } catch (error) {
      console.error('❌ خطأ في جلب التعليقات:', error);
    }
  };

  // ✅ إضافة تعليق جديد
  const addReview = async () => {
    if (!newReview.comment.trim()) {
      setMessage('⚠️ من فضلك اكتب تعليقك');
      return;
    }

    if (!user) {
      setMessage('⚠️ يجب تسجيل الدخول أولاً');
      return;
    }

    setReviewLoading(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        subjectId: subjectId,
        studentId: user.id,
        studentName: user.name || 'طالب',
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: serverTimestamp(),
      });

      setNewReview({ rating: 5, comment: '' });
      setMessage('✅ تم إضافة تعليقك بنجاح!');
      await loadReviews();
    } catch (error) {
      console.error('❌ خطأ في إضافة التعليق:', error);
      setMessage('❌ حدث خطأ في إضافة التعليق');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      await addDoc(collection(db, 'student_subjects'), {
        studentId: user.id,
        subjectId: subjectId,
        progress: 0,
        isActive: true,
        enrolledAt: serverTimestamp(),
      });
      setIsEnrolled(true);
      setProgress(0);
      setMessage('✅ تم التسجيل في المادة بنجاح!');
      loadCounts();
      
      // ✅ بعد التسجيل، نحسب التقدم من الامتحانات
      console.log('🔄 بعد التسجيل، نحسب التقدم...');
      await calculateExamProgress(user.id, subjectId);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في التسجيل');
    }
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

  // ✅ ✅ عرض النجوم المتقفلة (من 5)
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '⭐';
    if (hasHalf) stars += '🌟';
    for (let i = 0; i < emptyStars; i++) stars += '☆';
    
    return stars;
  };

  // ✅ ✅ عرض شريط توزيع التقييمات
  const renderRatingBar = (rating: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div key={rating} style={styles.ratingBarRow}>
        <span style={styles.ratingBarLabel}>{rating} ⭐</span>
        <div style={styles.ratingBarTrack}>
          <div style={{ ...styles.ratingBarFill, width: `${percentage}%` }} />
        </div>
        <span style={styles.ratingBarCount}>{count}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={isMobile ? {fontSize: '14px'} : {}}>جاري تحميل المادة...</p>
      </div>
    );
  }

  if (!subject) {
    return (
      <div style={styles.loadingContainer}>
        <p>⚠️ المادة غير موجودة</p>
        <Link href="/platform" style={styles.backLink}>← العودة للمنصة</Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={isMobile ? styles.headerContentMobile : styles.headerContent}>
          <Link href="/platform" style={isMobile ? {...styles.backButton, fontSize: '12px'} : styles.backButton}>← العودة للمنصة</Link>
          <div style={styles.headerInfo}>
            <span style={isMobile ? {...styles.subjectIcon, fontSize: '20px'} : styles.subjectIcon}>{subject.icon || '📚'}</span>
            <h1 style={isMobile ? {...styles.title, fontSize: '18px'} : styles.title}>{subject.name}</h1>
          </div>
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

        {/* ✅ معلومات المادة */}
        <div style={isMobile ? styles.subjectInfoCardMobile : styles.subjectInfoCard}>
          <div style={isMobile ? styles.subjectInfoHeaderMobile : styles.subjectInfoHeader}>
            <div style={{ 
              ...(isMobile ? styles.subjectIconLargeMobile : styles.subjectIconLarge), 
              background: subject.color || '#3b82f6' 
            }}>
              {subject.icon || '📚'}
            </div>
            <div style={styles.subjectInfoText}>
              <h2 style={isMobile ? {...styles.subjectName, fontSize: '18px'} : styles.subjectName}>{subject.name}</h2>
              <p style={isMobile ? {...styles.subjectDescription, fontSize: '13px'} : styles.subjectDescription}>{subject.description || 'لا يوجد وصف'}</p>
              <div style={isMobile ? styles.subjectMetaMobile : styles.subjectMeta}>
                <span style={isMobile ? {fontSize: '11px'} : {}}>📚 {courses.length} كورسات</span>
                <span style={isMobile ? {fontSize: '11px'} : {}}>👨‍🏫 {subject.teacherName || 'لم يحدد'}</span>
                <span style={isMobile ? {fontSize: '11px'} : {}}>👥 {enrolledCount} طالب</span>
              </div>
            </div>
          </div>

          {/* ✅ ✅ نبذة عن المدرس */}
          {loadingAbout ? (
            <div style={isMobile ? styles.teacherAboutMobile : styles.teacherAbout}>
              <p style={{color: 'rgba(255,255,255,0.3)', fontSize: '13px'}}>⏳ جاري تحميل نبذة المدرس...</p>
            </div>
          ) : teacherAbout ? (
            <div style={isMobile ? styles.teacherAboutMobile : styles.teacherAbout}>
              <div style={styles.teacherAboutHeader}>
                <span style={styles.teacherAboutIcon}>👨‍🏫</span>
                <span style={styles.teacherAboutTitle}>نبذة عن المدرس</span>
              </div>
              <p style={isMobile ? {...styles.teacherAboutText, fontSize: '13px'} : styles.teacherAboutText}>{teacherAbout}</p>
            </div>
          ) : null}

          {isEnrolled && (
            <div style={styles.progressSection}>
              <div style={styles.progressHeader}>
                <span style={isMobile ? {...styles.progressLabel, fontSize: '12px'} : styles.progressLabel}>📊 تقدمك في المادة</span>
                <span style={isMobile ? {...styles.progressPercentage, fontSize: '16px'} : styles.progressPercentage}>{progress}%</span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
              <div style={styles.progressHint}>
                <span style={styles.progressHintText}>✅ التقدم يحسب من الامتحانات المكتملة</span>
              </div>
            </div>
          )}

          {!isEnrolled && (
            <button onClick={handleEnroll} style={isMobile ? {...styles.enrollButton, fontSize: '14px', padding: '10px 20px'} : styles.enrollButton}>
              ➕ التسجيل في المادة
            </button>
          )}
        </div>

        {/* ✅ قائمة الكورسات - ألوان ثابتة */}
        <h2 style={isMobile ? {...styles.sectionTitle, fontSize: '18px'} : styles.sectionTitle}>📖 الكورسات المتاحة</h2>
        
        {courses.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={isMobile ? {...styles.emptyIcon, fontSize: '40px'} : styles.emptyIcon}>📭</span>
            <p style={isMobile ? {fontSize: '14px'} : {}}>لا توجد كورسات متاحة لمرحلتك</p>
            <p style={isMobile ? {...styles.emptySub, fontSize: '12px'} : styles.emptySub}>سيتم إضافة كورسات قريباً</p>
          </div>
        ) : (
          <div style={isMobile ? styles.coursesGridMobile : styles.coursesGrid}>
            {courses.map((course) => (
              <Link
                key={course.id}
                href={course.isOpened ? `/course/${course.id}` : '#'}
                style={{
                  ...(isMobile ? styles.courseCardMobile : styles.courseCard),
                  borderColor: course.isOpened ? '#10b981' : 'rgba(255,255,255,0.05)',
                  opacity: course.isOpened ? 1 : 0.5,
                  cursor: course.isOpened ? 'pointer' : 'default',
                  textDecoration: 'none',
                }}
                onClick={(e) => {
                  if (!course.isOpened) {
                    e.preventDefault();
                    setMessage('🔒 هذا الكورس مقفل. تواصل مع المدرس لفتحه.');
                  }
                }}
              >
                <div style={isMobile ? styles.courseIconWrapperMobile : styles.courseIconWrapper}>
                  <span style={isMobile ? {...styles.courseIcon, fontSize: '18px'} : styles.courseIcon}>📘</span>
                </div>

                <div style={styles.courseContent}>
                  <div style={isMobile ? styles.courseHeaderMobile : styles.courseHeader}>
                    <h3 style={isMobile ? {...styles.courseTitle, fontSize: '14px'} : styles.courseTitle}>{course.title}</h3>
                    <span style={{
                      ...styles.courseStatus,
                      background: course.isOpened ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: course.isOpened ? '#34d399' : '#f87171',
                      fontSize: isMobile ? '10px' : '12px',
                      padding: isMobile ? '2px 8px' : '2px 10px',
                    }}>
                      {course.isOpened ? '✅ مفتوح' : '🔒 مقفل'}
                    </span>
                  </div>

                  <p style={isMobile ? {...styles.courseDesc, fontSize: '11px', WebkitLineClamp: 1} : styles.courseDesc}>{course.description || 'لا يوجد وصف'}</p>

                  <div style={isMobile ? styles.courseFooterMobile : styles.courseFooter}>
                    <div style={isMobile ? styles.courseTagsMobile : styles.courseTags}>
                      <span style={isMobile ? {...styles.gradeTag, fontSize: '9px', padding: '1px 8px'} : styles.gradeTag}>{getGradeLabel(course.grade)}</span>
                      {course.price > 0 && (
                        <span style={isMobile ? {...styles.priceTag, fontSize: '9px', padding: '1px 8px'} : styles.priceTag}>💰 {course.price} ج.م</span>
                      )}
                      <span style={isMobile ? {...styles.lessonsTag, fontSize: '9px', padding: '1px 8px'} : styles.lessonsTag}>📖 {course.lessonsCount || 0}</span>
                    </div>
                    {course.isOpened && (
                      <span style={isMobile ? {...styles.enterArrow, fontSize: '11px'} : styles.enterArrow}>← دخول</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ✅ ✅ قسم الآراء والتعليقات - مع إحصائيات التقييم (من 5 نجوم) */}
        <div style={isMobile ? styles.reviewsSectionMobile : styles.reviewsSection}>
          <h2 style={isMobile ? {...styles.reviewsTitle, fontSize: '18px'} : styles.reviewsTitle}>💬 الآراء والتعليقات</h2>
          
          {/* ✅ ✅ إحصائيات التقييم */}
          <div style={isMobile ? styles.ratingStatsMobile : styles.ratingStats}>
            <div style={styles.ratingSummary}>
              <span style={isMobile ? {...styles.avgRatingNumber, fontSize: '32px'} : styles.avgRatingNumber}>
                {avgRating > 0 ? avgRating : '?'}
              </span>
              <span style={isMobile ? {...styles.avgRatingLabel, fontSize: '12px'} : styles.avgRatingLabel}>
                من 5
              </span>
              <div style={styles.ratingStars}>
                <span style={isMobile ? {fontSize: '18px'} : {fontSize: '20px'}}>
                  {avgRating > 0 ? renderStars(avgRating) : '☆☆☆☆☆'}
                </span>
              </div>
              <span style={isMobile ? {...styles.ratingCount, fontSize: '12px'} : styles.ratingCount}>
                {ratingCount} تقييم
              </span>
            </div>

            <div style={isMobile ? styles.ratingDistributionMobile : styles.ratingDistribution}>
              {[5, 4, 3, 2, 1].map(rating => (
                renderRatingBar(rating, ratingDistribution[rating] || 0, ratingCount)
              ))}
            </div>
          </div>
          
          {/* ✅ نموذج إضافة تعليق */}
          {user && (
            <div style={isMobile ? styles.reviewFormMobile : styles.reviewForm}>
              <div style={isMobile ? styles.reviewRatingMobile : styles.reviewRating}>
                <label style={isMobile ? {fontSize: '13px'} : {}}>⭐ تقييمك:</label>
                <div style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      style={{
                        ...styles.starButton,
                        color: star <= newReview.rating ? '#FFD700' : 'rgba(255,255,255,0.2)',
                        fontSize: isMobile ? '20px' : '24px',
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                placeholder="اكتب تعليقك عن المادة..."
                style={isMobile ? {...styles.reviewTextarea, fontSize: '13px', padding: '10px'} : styles.reviewTextarea}
                rows={isMobile ? 2 : 3}
              />
              <button
                onClick={addReview}
                disabled={reviewLoading}
                style={{
                  ...styles.reviewSubmit,
                  opacity: reviewLoading ? 0.5 : 1,
                  cursor: reviewLoading ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '14px' : '16px',
                  padding: isMobile ? '8px 20px' : '10px 24px',
                }}
              >
                {reviewLoading ? '⏳ جاري الإرسال...' : '📨 إرسال التعليق'}
              </button>
            </div>
          )}

          {/* ✅ عرض التعليقات - مع key */}
          <div style={styles.reviewsList}>
            {reviews.length === 0 ? (
              <div style={isMobile ? {...styles.noReviews, fontSize: '13px'} : styles.noReviews}>
                لا توجد تعليقات بعد. كن أول من يكتب تعليقاً!
              </div>
            ) : (
              reviews.map((review) => (
                <div 
                  key={review.id}
                  style={isMobile ? styles.reviewCardMobile : styles.reviewCard}
                >
                  <div style={isMobile ? styles.reviewHeaderMobile : styles.reviewHeader}>
                    <span style={isMobile ? {...styles.reviewUser, fontSize: '13px'} : styles.reviewUser}>
                      👤 {review.studentName}
                    </span>
                    <span style={isMobile ? {...styles.reviewRating, fontSize: '15px'} : styles.reviewRating}>
                      {renderStars(review.rating)}
                    </span>
                    <span style={isMobile ? {...styles.reviewDate, fontSize: '10px'} : styles.reviewDate}>
                      {review.createdAt?.toDate?.() 
                        ? new Date(review.createdAt.toDate()).toLocaleDateString('ar-EG')
                        : ''}
                    </span>
                  </div>
                  <p style={isMobile ? {...styles.reviewComment, fontSize: '13px'} : styles.reviewComment}>
                    {review.comment}
                  </p>
                </div>
              ))
            )}
          </div>
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
  backLink: {
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    fontSize: '14px',
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
  headerContentMobile: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '0 5px',
  },
  backButton: {
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    fontSize: '14px',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  subjectIcon: {
    fontSize: '28px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '25px 20px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
    border: '1px solid',
    fontSize: '14px',
  },
  subjectInfoCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '30px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  subjectInfoCardMobile: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  subjectInfoHeader: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
  },
  subjectInfoHeaderMobile: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  subjectIconLarge: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    flexShrink: 0,
  },
  subjectIconLargeMobile: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
  },
  subjectInfoText: {
    flex: 1,
  },
  subjectName: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
  },
  subjectDescription: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.5)',
    margin: '0 0 10px 0',
  },
  subjectMeta: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    flexWrap: 'wrap' as const,
  },
  subjectMetaMobile: {
    display: 'flex',
    gap: '10px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    flexWrap: 'wrap' as const,
  },
  
  // ✅ ✅ أنماط نبذة عن المدرس
  teacherAbout: {
    marginTop: '15px',
    padding: '15px 20px',
    background: 'rgba(139,92,246,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(139,92,246,0.1)',
  },
  teacherAboutMobile: {
    marginTop: '12px',
    padding: '12px 14px',
    background: 'rgba(139,92,246,0.05)',
    borderRadius: '10px',
    border: '1px solid rgba(139,92,246,0.1)',
  },
  teacherAboutHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  teacherAboutIcon: {
    fontSize: '18px',
  },
  teacherAboutTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(139,92,246,0.8)',
  },
  teacherAboutText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.8,
    margin: 0,
  },

  progressSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  progressLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
  },
  progressPercentage: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FFD700',
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
  progressHint: {
    marginTop: '6px',
    textAlign: 'center' as const,
  },
  progressHintText: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
  },
  enrollButton: {
    marginTop: '20px',
    padding: '12px 30px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: 'rgba(255,255,255,0.8)',
  },
  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  coursesGridMobile: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px',
  },
  courseCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '14px',
    padding: '18px 20px',
    border: '2px solid',
    transition: 'all 0.25s ease',
  },
  courseCardMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '12px 14px',
    border: '2px solid',
    transition: 'all 0.25s ease',
  },
  courseIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'rgba(59,130,246,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  courseIconWrapperMobile: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(59,130,246,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  courseIcon: {
    fontSize: '24px',
  },
  courseContent: {
    flex: 1,
    minWidth: 0,
  },
  courseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  courseHeaderMobile: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
    gap: '8px',
  },
  courseTitle: {
    fontSize: '17px',
    fontWeight: '600',
    color: 'white',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  courseStatus: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 10px',
    borderRadius: '20px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  courseDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.45)',
    margin: '4px 0 10px 0',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  courseFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseFooterMobile: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '5px',
  },
  courseTags: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  courseTagsMobile: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap' as const,
  },
  gradeTag: {
    padding: '2px 10px',
    background: 'rgba(59,130,246,0.08)',
    color: '#60a5fa',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
  },
  priceTag: {
    padding: '2px 10px',
    background: 'rgba(16,185,129,0.08)',
    color: '#34d399',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
  },
  lessonsTag: {
    padding: '2px 10px',
    background: 'rgba(139,92,246,0.08)',
    color: '#a78bfa',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
  },
  enterArrow: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'rgba(255,255,255,0.3)',
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
  
  // ✅ ✅ أنماط قسم الآراء والتعليقات
  reviewsSection: {
    marginTop: '40px',
    padding: '25px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  reviewsSectionMobile: {
    marginTop: '30px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  reviewsTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: 'rgba(255,255,255,0.8)',
  },
  
  // ✅ ✅ أنماط إحصائيات التقييم
  ratingStats: {
    display: 'flex',
    gap: '30px',
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
    flexWrap: 'wrap' as const,
  },
  ratingStatsMobile: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
    marginBottom: '15px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  ratingSummary: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '120px',
  },
  avgRatingNumber: {
    fontSize: '40px',
    fontWeight: 'bold',
    color: '#FFD700',
    lineHeight: 1,
  },
  avgRatingLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '2px',
  },
  ratingStars: {
    marginTop: '4px',
  },
  ratingCount: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '4px',
  },
  ratingDistribution: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    minWidth: '200px',
  },
  ratingDistributionMobile: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  ratingBarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  ratingBarLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    minWidth: '45px',
  },
  ratingBarTrack: {
    flex: 1,
    height: '6px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  ratingBarCount: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    minWidth: '30px',
    textAlign: 'center' as const,
  },

  reviewForm: {
    marginBottom: '25px',
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  reviewFormMobile: {
    marginBottom: '15px',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  reviewRating: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '10px',
  },
  reviewRatingMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  starsContainer: {
    display: 'flex',
    gap: '5px',
  },
  starButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: '0 2px',
  },
  reviewTextarea: {
    width: '100%',
    padding: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    resize: 'vertical' as const,
    marginBottom: '10px',
    fontFamily: '"Cairo", sans-serif',
  },
  reviewSubmit: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  reviewsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  reviewCard: {
    padding: '16px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  reviewCardMobile: {
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  reviewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
    marginBottom: '8px',
  },
  reviewHeaderMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginBottom: '6px',
  },
  reviewUser: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  reviewRating: {
    fontSize: '18px',
  },
  reviewDate: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  reviewComment: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.6,
    margin: 0,
  },
  noReviews: {
    textAlign: 'center' as const,
    padding: '30px',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '14px',
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