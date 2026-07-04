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

export default function TeacherStudents() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [openedCourses, setOpenedCourses] = useState<string[]>([]);
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  
  // ✅ حالة إرسال الإشعارات
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationType, setNotificationType] = useState('info');
  const [sendingNotification, setSendingNotification] = useState(false);

  // ✅ ✅ فلترة المراحل (تم شيل فلترة المادة)
  const [filterGrade, setFilterGrade] = useState('all');

  // ✅ ✅ إرسال إشعار لمرحلة كاملة
  const [showGradeNotificationModal, setShowGradeNotificationModal] = useState(false);
  const [selectedGradeForNotification, setSelectedGradeForNotification] = useState('');

  // ✅ ✅ حالة عرض تفاصيل تقدم الطالب
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [studentProgress, setStudentProgress] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // ✅ ✅ قائمة المراحل
  const grades = [
    { value: 'all', label: '📚 الكل' },
    { value: '1-prep', label: 'أولى إعدادي' },
    { value: '2-prep', label: 'ثانية إعدادي' },
    { value: '3-prep', label: 'ثالثة إعدادي' },
    { value: '1-secondary', label: 'أولى ثانوي' },
    { value: '2-secondary', label: 'ثانية ثانوي' },
    { value: '3-secondary', label: 'تالتة ثانوي' },
  ];

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    console.log('📦 userData في teacher/students:', userData);

    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      console.log('👤 المستخدم:', parsed);

      parsed.role = 'teacher';
      parsed.isApproved = true;

      setTeacher(parsed);
      loadData(parsed.id);
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, [router]);

  const loadData = async (teacherId: string) => {
    try {
      console.log('🔍 جلب مواد المدرس:', teacherId);
      
      const subjectsQuery = query(
        collection(db, 'subjects'),
        where('teacherId', '==', teacherId)
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const subjectsData = subjectsSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      
      console.log('📚 مواد المدرس:', subjectsData);
      console.log('📊 عدد المواد:', subjectsData.length);
      setSubjects(subjectsData);

      if (subjectsData.length === 0) {
        setMessage('⚠️ لا توجد مواد مخصصة لك. تواصل مع الأدمن.');
        setLoading(false);
        return;
      }

      const studentIds = new Set<string>();
      const studentsList: any[] = [];

      for (const subject of subjectsData) {
        console.log(`🔍 جلب طلاب المادة: ${subject.name} (${subject.id})`);
        
        const enrolledQuery = query(
          collection(db, 'student_subjects'),
          where('subjectId', '==', subject.id)
        );
        const enrolledSnapshot = await getDocs(enrolledQuery);
        const enrolledData = enrolledSnapshot.docs.map(docSnap => docSnap.data());
        console.log(`👨‍🎓 طلاب ${subject.name}:`, enrolledData);
        
        for (const data of enrolledData) {
          if (!studentIds.has(data.studentId)) {
            studentIds.add(data.studentId);
            
            const userRef = doc(db, 'users', data.studentId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log(`👤 بيانات الطالب:`, userData);
              studentsList.push({
                id: data.studentId,
                name: userData.name || 'طالب',
                phone: userData.phone || '',
                grade: userData.grade || '',
                subjects: [subject.name],
                subjectIds: [subject.id],
                enrolledAt: data.enrolledAt,
                xp: userData.xp || 0,
                level: userData.level || 1,
                gems: userData.gems || 0,
                streak: userData.streak || 0,
              });
            } else {
              console.log(`⚠️ المستخدم ${data.studentId} غير موجود`);
            }
          } else {
            const existing = studentsList.find(s => s.id === data.studentId);
            if (existing && !existing.subjectIds.includes(subject.id)) {
              existing.subjects.push(subject.name);
              existing.subjectIds.push(subject.id);
            }
          }
        }
      }

      console.log('✅ قائمة الطلاب النهائية:', studentsList);
      setStudents(studentsList);
      setFilteredStudents(studentsList);
      
      if (studentsList.length === 0) {
        setMessage('ℹ️ لا يوجد طلاب مسجلين في موادك');
      }

    } catch (error) {
      console.error('❌ خطأ في loadData:', error);
      setMessage('❌ حدث خطأ في تحميل البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ✅ فلترة الطلاب حسب المرحلة فقط
  const applyFilters = () => {
    let filtered = [...students];
    
    // ✅ فلترة حسب المرحلة
    if (filterGrade !== 'all') {
      filtered = filtered.filter(s => s.grade === filterGrade);
    }
    
    setFilteredStudents(filtered);
  };

  // ✅ ✅ تغيير فلترة المرحلة
  const handleFilterGrade = (grade: string) => {
    setFilterGrade(grade);
    setTimeout(applyFilters, 100);
  };

  // ✅ ✅ إحصائيات المراحل
  const getGradeStats = () => {
    const stats: { [key: string]: number } = {};
    grades.forEach(g => {
      if (g.value !== 'all') {
        stats[g.value] = students.filter(s => s.grade === g.value).length;
      }
    });
    return stats;
  };

  const gradeStats = getGradeStats();

  // ✅ ✅ إرسال إشعار لمرحلة كاملة (طلاب المادة فقط)
  const sendGradeNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      setMessage('⚠️ من فضلك أدخل عنوان ومحتوى الإشعار');
      return;
    }

    if (!selectedGradeForNotification) {
      setMessage('⚠️ من فضلك اختر المرحلة');
      return;
    }

    setSendingNotification(true);
    setMessage('');

    try {
      // ✅ جلب الطلاب في المرحلة المحددة والموجودين في مواد المدرس
      const studentsInGrade = students.filter(s => s.grade === selectedGradeForNotification);
      
      if (studentsInGrade.length === 0) {
        setMessage(`⚠️ لا يوجد طلاب في هذه المرحلة مسجلين في موادك`);
        setSendingNotification(false);
        return;
      }

      let sentCount = 0;
      
      for (const student of studentsInGrade) {
        await addDoc(collection(db, 'notifications'), {
          title: notificationTitle.trim(),
          body: notificationBody.trim(),
          type: notificationType,
          target: {
            type: 'student',
            studentId: student.id,
          },
          studentId: student.id,
          sender: teacher.name || 'المدرس',
          notificationType: notificationType,
          readBy: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        sentCount++;
      }

      setMessage(`✅ تم إرسال الإشعار إلى ${sentCount} طالب في ${getGradeLabel(selectedGradeForNotification)}`);
      setNotificationTitle('');
      setNotificationBody('');
      setNotificationType('info');
      setShowGradeNotificationModal(false);
      setSelectedGradeForNotification('');
      
    } catch (error) {
      console.error('❌ خطأ في إرسال الإشعار:', error);
      setMessage('❌ حدث خطأ في إرسال الإشعار: ' + error.message);
    } finally {
      setSendingNotification(false);
    }
  };

  const getGradeLabel = (gradeValue: string) => {
    const gradesMap: { [key: string]: string } = {
      '1-prep': 'أولى إعدادي',
      '2-prep': 'ثانية إعدادي',
      '3-prep': 'ثالثة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي',
      '3-secondary': 'تالتة ثانوي',
    };
    return gradesMap[gradeValue] || gradeValue;
  };

  // ✅ ✅ الدروس المكتملة = الامتحانات المكتملة (نفس الرقم)
  const loadStudentProgress = async (studentId: string, studentName: string) => {
    try {
      setLoadingProgress(true);
      setShowProgressModal(true);
      
      console.log('🔍 ===== بدء جلب تقدم الطالب =====');
      console.log(`👤 الطالب: ${studentName} (${studentId})`);
      
      // ✅ 1. جلب المواد المسجل فيها الطالب
      const enrolledSubjectsQuery = query(
        collection(db, 'student_subjects'),
        where('studentId', '==', studentId)
      );
      const enrolledSubjectsSnap = await getDocs(enrolledSubjectsQuery);
      const enrolledSubjects = enrolledSubjectsSnap.docs.map(docSnap => ({
        id: docSnap.id,
        subjectId: docSnap.data().subjectId,
        progress: docSnap.data().progress || 0,
      }));
      
      console.log(`📚 المواد المسجل فيها الطالب (كلها):`, enrolledSubjects);
      
      // ✅ ✅ فلترة المواد: بس اللي المدرس عنده
      const teacherSubjectIds = subjects.map(s => s.id);
      console.log(`🆔 مواد المدرس IDs:`, teacherSubjectIds);
      
      const filteredEnrolledSubjects = enrolledSubjects.filter(s => 
        teacherSubjectIds.includes(s.subjectId)
      );
      
      console.log(`📚 المواد المسجل فيها الطالب (بعد الفلترة):`, filteredEnrolledSubjects);
      
      if (filteredEnrolledSubjects.length === 0) {
        console.log('⚠️ الطالب غير مسجل في أي مادة من مواد المدرس');
        setStudentProgress({
          studentId: studentId,
          studentName: studentName,
          subjects: [],
          overallProgress: 0,
          totalExams: 0,
          completedExams: 0,
          totalLessons: 0,
          completedLessons: 0,
          openedCourses: 0,
          xp: 0,
          level: 1,
          gems: 0,
          streak: 0,
          grade: '',
          message: 'الطالب غير مسجل في أي مادة من موادك',
        });
        setLoadingProgress(false);
        return;
      }
      
      // ✅ 2. جلب جميع الامتحانات
      const examsSnapshot = await getDocs(collection(db, 'exams'));
      const allExams = examsSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      console.log(`📝 عدد الامتحانات الكلي:`, allExams.length);
      
      // ✅ 3. جلب نتائج الطالب (الامتحانات المكتملة)
      const resultsQuery = query(
        collection(db, 'exam_results'),
        where('studentId', '==', studentId)
      );
      const resultsSnap = await getDocs(resultsQuery);
      const studentResults = resultsSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      const completedExamIds = studentResults.map(r => r.examId);
      console.log(`📊 عدد الامتحانات المكتملة:`, completedExamIds.length);
      
      // ✅ 4. جلب جميع الدروس في مواد المدرس
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const allCourses = coursesSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      
      // ✅ 5. جلب بيانات المواد (الأسماء)
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const allSubjects = subjectsSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      
      // ✅ 6. جلب الكورسات المفتوحة للطالب
      const openedCoursesQuery = query(
        collection(db, 'student_courses'),
        where('studentId', '==', studentId),
        where('isActive', '==', true)
      );
      const openedCoursesSnap = await getDocs(openedCoursesQuery);
      const openedCourseIds = openedCoursesSnap.docs.map(docSnap => docSnap.data().courseId);
      console.log(`🎓 عدد الكورسات المفتوحة:`, openedCourseIds.length);
      
      // ✅ 7. ✅ ✅ حساب التقدم لكل مادة
      const subjectsProgress = await Promise.all(filteredEnrolledSubjects.map(async (enrolled) => {
        const subject = allSubjects.find(s => s.id === enrolled.subjectId);
        const subjectName = subject?.name || 'مادة غير معروفة';
        
        console.log(`📖 حساب تقدم المادة: ${subjectName}`);
        
        // ✅ جلب جميع الامتحانات في هذه المادة
        const subjectExams = allExams.filter(e => e.subjectId === enrolled.subjectId);
        console.log(`   📝 عدد الامتحانات في المادة:`, subjectExams.length);
        
        const totalExams = subjectExams.length;
        let completedExamsCount = 0;
        
        subjectExams.forEach(exam => {
          if (completedExamIds.includes(exam.id)) {
            completedExamsCount++;
          }
        });
        
        const progressPercent = totalExams > 0 
          ? Math.round((completedExamsCount / totalExams) * 100) 
          : 0;
        
        console.log(`   📊 تقدم ${subjectName}: ${progressPercent}% (${completedExamsCount}/${totalExams} امتحان)`);
        
        // ✅ ✅ ✅ الدروس المكتملة = الامتحانات المكتملة (نفس الرقم)
        const completedLessonsCount = completedExamsCount;
        const totalLessons = totalExams;
        
        return {
          subjectId: enrolled.subjectId,
          subjectName: subjectName,
          progress: progressPercent,
          totalExams: totalExams,
          completedExams: completedExamsCount,
          totalLessons: totalLessons,
          completedLessons: completedLessonsCount,
          isEnrolled: true,
        };
      }));
      
      // ✅ 8. حساب الإحصائيات العامة
      const totalExamsAll = subjectsProgress.reduce((sum, s) => sum + s.totalExams, 0);
      const completedExamsAll = subjectsProgress.reduce((sum, s) => sum + s.completedExams, 0);
      const totalLessonsAll = subjectsProgress.reduce((sum, s) => sum + s.totalLessons, 0);
      const completedLessonsAll = subjectsProgress.reduce((sum, s) => sum + s.completedLessons, 0);
      
      const overallProgress = totalExamsAll > 0 
        ? Math.round((completedExamsAll / totalExamsAll) * 100) 
        : 0;
      
      // ✅ 9. جلب بيانات المستخدم
      const userRef = doc(db, 'users', studentId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      const progressData = {
        studentId: studentId,
        studentName: studentName,
        subjects: subjectsProgress,
        overallProgress: overallProgress,
        totalExams: totalExamsAll,
        completedExams: completedExamsAll,
        totalLessons: totalLessonsAll,
        completedLessons: completedLessonsAll,
        openedCourses: openedCourseIds.length,
        xp: userData.xp || 0,
        level: userData.level || 1,
        gems: userData.gems || 0,
        streak: userData.streak || 0,
        grade: userData.grade || '',
      };
      
      setStudentProgress(progressData);
      console.log('📊 تقدم الطالب النهائي:', progressData);
      
    } catch (error) {
      console.error('❌ خطأ في جلب تقدم الطالب:', error);
      setMessage('❌ حدث خطأ في جلب تقدم الطالب');
    } finally {
      setLoadingProgress(false);
    }
  };

  // ✅ جلب الكورسات المفتوحة للطالب في مادة معينة
  const loadStudentCourses = async (studentId: string, subjectId: string) => {
    try {
      console.log(`🔍 جلب كورسات المادة ${subjectId} للطالب ${studentId}`);
      
      const userRef = doc(db, 'users', studentId);
      const userDoc = await getDoc(userRef);
      const studentGrade = userDoc.exists() ? userDoc.data().grade : '1-prep';
      
      console.log(`🎯 مرحلة الطالب: ${studentGrade}`);

      const coursesQuery = query(
        collection(db, 'courses'),
        where('subjectId', '==', subjectId),
        where('isActive', '==', true),
        where('grade', '==', studentGrade)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      const coursesData = coursesSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      
      coursesData.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('📚 الكورسات المتاحة للطالب:', coursesData);
      setCourses(coursesData);

      const openedQuery = query(
        collection(db, 'student_courses'),
        where('studentId', '==', studentId),
        where('isActive', '==', true)
      );
      const openedSnapshot = await getDocs(openedQuery);
      const openedIds = openedSnapshot.docs.map(docSnap => docSnap.data().courseId);
      console.log('✅ الكورسات المفتوحة:', openedIds);
      setOpenedCourses(openedIds);

      setShowCoursesModal(true);
    } catch (error) {
      console.error('❌ خطأ في loadStudentCourses:', error);
      setMessage('❌ حدث خطأ في جلب الكورسات: ' + error.message);
    }
  };

  // ✅ فتح/قفل كورس للطالب
  const toggleCourse = async (courseId: string, currentStatus: boolean) => {
    try {
      const studentId = selectedStudent.id;
      
      if (currentStatus) {
        const q = query(
          collection(db, 'student_courses'),
          where('studentId', '==', studentId),
          where('courseId', '==', courseId)
        );
        const snapshot = await getDocs(q);
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
        }
        setOpenedCourses(openedCourses.filter(id => id !== courseId));
        setMessage(`✅ تم قفل الكورس للطالب`);
      } else {
        await addDoc(collection(db, 'student_courses'), {
          studentId: studentId,
          courseId: courseId,
          isActive: true,
          openedAt: serverTimestamp(),
        });
        setOpenedCourses([...openedCourses, courseId]);
        setMessage(`✅ تم فتح الكورس للطالب`);
      }
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ: ' + error.message);
    }
  };

  // ✅ فتح كل الكورسات لطالب
  const openAllCourses = async () => {
    if (!confirm(`⚠️ هل أنت متأكد من فتح كل الكورسات للطالب ${selectedStudent?.name}؟`)) return;

    try {
      const studentId = selectedStudent.id;
      for (const course of courses) {
        if (!openedCourses.includes(course.id)) {
          await addDoc(collection(db, 'student_courses'), {
            studentId: studentId,
            courseId: course.id,
            isActive: true,
            openedAt: serverTimestamp(),
          });
        }
      }
      
      const allCourseIds = courses.map(c => c.id);
      setOpenedCourses(allCourseIds);
      setMessage(`✅ تم فتح كل الكورسات للطالب ${selectedStudent?.name}`);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ: ' + error.message);
    }
  };

  // ✅ قفل كل الكورسات لطالب
  const closeAllCourses = async () => {
    if (!confirm(`⚠️ هل أنت متأكد من قفل كل الكورسات للطالب ${selectedStudent?.name}؟`)) return;

    try {
      const studentId = selectedStudent.id;
      for (const course of courses) {
        if (openedCourses.includes(course.id)) {
          const q = query(
            collection(db, 'student_courses'),
            where('studentId', '==', studentId),
            where('courseId', '==', course.id)
          );
          const snapshot = await getDocs(q);
          for (const docSnap of snapshot.docs) {
            await deleteDoc(docSnap.ref);
          }
        }
      }
      
      setOpenedCourses([]);
      setMessage(`✅ تم قفل كل الكورسات للطالب ${selectedStudent?.name}`);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ: ' + error.message);
    }
  };

  // ✅ إرسال إشعار لطلاب مادة معينة (موجود)
  const sendNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      setMessage('⚠️ من فضلك أدخل عنوان ومحتوى الإشعار');
      return;
    }

    setSendingNotification(true);
    setMessage('');

    try {
      const enrolledQuery = query(
        collection(db, 'student_subjects'),
        where('subjectId', '==', selectedSubject.id)
      );
      const enrolledSnapshot = await getDocs(enrolledQuery);
      
      let sentCount = 0;
      
      for (const docSnap of enrolledSnapshot.docs) {
        const data = docSnap.data();
        const studentId = data.studentId;
        
        await addDoc(collection(db, 'notifications'), {
          title: notificationTitle.trim(),
          body: notificationBody.trim(),
          type: notificationType,
          target: {
            type: 'student',
            studentId: studentId,
          },
          studentId: studentId,
          sender: teacher.name || 'المدرس',
          notificationType: notificationType,
          readBy: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        sentCount++;
      }

      setMessage(`✅ تم إرسال الإشعار إلى ${sentCount} طالب في مادة ${selectedSubject.name}`);
      setNotificationTitle('');
      setNotificationBody('');
      setNotificationType('info');
      setShowNotificationModal(false);
      
    } catch (error) {
      console.error('❌ خطأ في إرسال الإشعار:', error);
      setMessage('❌ حدث خطأ في إرسال الإشعار: ' + error.message);
    } finally {
      setSendingNotification(false);
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
          <h1 style={styles.title}>👨‍🎓 إدارة الطلاب</h1>
          <span style={styles.badge}>📚 {subjects.length} مواد</span>
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

        <div style={styles.infoBox}>
          <p>📌 هذه قائمة الطلاب المسجلين في موادك. يمكنك فتح الكورسات لكل طالب.</p>
          <p style={styles.infoSub}>🆔 معرف المدرس: <strong>{teacher?.id || 'غير موجود'}</strong></p>
        </div>

        {/* ✅ ✅ فلترة المراحل (تم شيل فلترة المادة) */}
        <div style={styles.gradeFilterSection}>
          <div style={styles.filterHeader}>
            <span style={styles.filterTitle}>📚 تصفية حسب المرحلة</span>
            <button
              onClick={() => {
                setShowGradeNotificationModal(true);
              }}
              style={styles.gradeNotifyBtn}
            >
              📨 إشعار لمرحلة
            </button>
          </div>
          <div style={styles.gradeFilterButtons}>
            {grades.map((grade) => (
              <button
                key={grade.value}
                onClick={() => handleFilterGrade(grade.value)}
                style={{
                  ...styles.gradeFilterBtn,
                  background: filterGrade === grade.value ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                  color: filterGrade === grade.value ? 'white' : 'rgba(255,255,255,0.6)',
                  borderColor: filterGrade === grade.value ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                }}
              >
                {grade.label}
                {grade.value !== 'all' && (
                  <span style={styles.gradeCount}>({gradeStats[grade.value] || 0})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ ✅ إحصائيات سريعة */}
        <div style={styles.quickStats}>
          <div style={styles.quickStatCard}>
            <span style={styles.quickStatNumber}>{filteredStudents.length}</span>
            <span style={styles.quickStatLabel}>طلاب معروضين</span>
          </div>
          <div style={styles.quickStatCard}>
            <span style={styles.quickStatNumber}>
              {filteredStudents.reduce((sum, s) => sum + (s.xp || 0), 0)}
            </span>
            <span style={styles.quickStatLabel}>إجمالي نقاط الخبرة</span>
          </div>
          <div style={styles.quickStatCard}>
            <span style={styles.quickStatNumber}>
              {filteredStudents.reduce((sum, s) => sum + (s.gems || 0), 0)}
            </span>
            <span style={styles.quickStatLabel}>إجمالي الجواهر</span>
          </div>
        </div>

        {/* ✅ قائمة الطلاب */}
        {filteredStudents.length === 0 ? (
          <div style={styles.empty}>
            <span>📭</span>
            <p>لا يوجد طلاب مطابقين للفلترة</p>
            <p style={styles.emptySub}>جرب تغيير الفلترة أو التأكد من تسجيل الطلاب</p>
          </div>
        ) : (
          <div style={styles.studentsGrid}>
            {filteredStudents.map((student) => (
              <div key={student.id} style={styles.studentCard}>
                <div style={styles.studentHeader}>
                  <div style={styles.studentAvatar}>
                    {student.name.charAt(0)}
                  </div>
                  <div style={styles.studentInfo}>
                    <h3 style={styles.studentName}>{student.name}</h3>
                    <span style={styles.studentPhone}>📱 {student.phone}</span>
                    <span style={styles.studentGrade}>🎯 {getGradeLabel(student.grade)}</span>
                  </div>
                </div>

                <div style={styles.studentSubjects}>
                  {student.subjects.map((subject: string, idx: number) => (
                    <span key={idx} style={styles.subjectTag}>
                      📚 {subject}
                    </span>
                  ))}
                </div>

                <div style={styles.studentActions}>
                  <button
                    onClick={() => {
                      setSelectedStudent(student);
                      const subject = subjects.find(s => student.subjectIds.includes(s.id));
                      setSelectedSubject(subject);
                      loadStudentCourses(student.id, student.subjectIds[0]);
                    }}
                    style={styles.openCoursesBtn}
                  >
                    🎓 فتح الكورسات
                  </button>
                  
                  <button
                    onClick={() => loadStudentProgress(student.id, student.name)}
                    style={styles.progressBtn}
                  >
                    📊 تفاصيل التقدم
                  </button>
                  
                  <button
                    onClick={() => {
                      const subject = subjects.find(s => student.subjectIds.includes(s.id));
                      setSelectedSubject(subject);
                      setShowNotificationModal(true);
                    }}
                    style={styles.notifyBtn}
                  >
                    📨 إشعار للمادة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ✅ مودال الكورسات */}
        {showCoursesModal && selectedStudent && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>🎓 كورسات {selectedStudent.name}</h2>
                  <p style={styles.modalSub}>
                    {selectedStudent.subjects.join(' - ')} | 🎯 {getGradeLabel(selectedStudent.grade)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCoursesModal(false);
                    setSelectedStudent(null);
                    setCourses([]);
                    setOpenedCourses([]);
                  }}
                  style={styles.closeModal}
                >
                  ✕
                </button>
              </div>

              <div style={styles.modalActions}>
                <button
                  onClick={openAllCourses}
                  style={styles.openAllBtn}
                >
                  ✅ فتح الكل
                </button>
                <button
                  onClick={closeAllCourses}
                  style={styles.closeAllBtn}
                >
                  🔒 قفل الكل
                </button>
              </div>

              <div style={styles.coursesList}>
                {courses.length === 0 ? (
                  <p style={styles.noCourses}>لا توجد كورسات متاحة لمرحلة هذا الطالب</p>
                ) : (
                  courses.map((course) => {
                    const isOpened = openedCourses.includes(course.id);
                    return (
                      <div key={course.id} style={styles.courseItem}>
                        <div style={styles.courseInfo}>
                          <span style={styles.courseOrder}>#{course.order}</span>
                          <div>
                            <span style={styles.courseTitle}>{course.title}</span>
                            <span style={styles.courseGrade}>
                              {course.grade === '1-prep' ? 'أولى إعدادي' :
                               course.grade === '2-prep' ? 'ثانية إعدادي' :
                               course.grade === '3-prep' ? 'ثالثة إعدادي' :
                               course.grade === '1-secondary' ? 'أولى ثانوي' :
                               course.grade === '2-secondary' ? 'ثانية ثانوي' :
                               course.grade === '3-secondary' ? 'ثالثة ثانوي' : course.grade}
                            </span>
                            {course.price > 0 && (
                              <span style={styles.coursePrice}>💰 {course.price} ج.م</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleCourse(course.id, isOpened)}
                          style={{
                            ...styles.toggleBtn,
                            background: isOpened ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            color: isOpened ? '#f87171' : '#34d399',
                          }}
                        >
                          {isOpened ? '🔒 قفل' : '✅ فتح'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ✅ ✅ مودال تفاصيل تقدم الطالب */}
        {showProgressModal && studentProgress && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>📊 تقدم {studentProgress.studentName}</h2>
                  <p style={styles.modalSub}>
                    🎯 {getGradeLabel(studentProgress.grade)} • ⭐ {studentProgress.xp} نقطة • 🎯 المستوى {studentProgress.level}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowProgressModal(false);
                    setStudentProgress(null);
                  }}
                  style={styles.closeModal}
                >
                  ✕
                </button>
              </div>

              {/* ✅ الإحصائيات العامة */}
              <div style={styles.progressStats}>
                <div style={styles.progressStatCard}>
                  <span style={styles.progressStatNumber}>{studentProgress.overallProgress}%</span>
                  <span style={styles.progressStatLabel}>التقدم الإجمالي</span>
                </div>
                <div style={styles.progressStatCard}>
                  <span style={styles.progressStatNumber}>{studentProgress.completedExams}/{studentProgress.totalExams}</span>
                  <span style={styles.progressStatLabel}>امتحانات مكتملة</span>
                </div>
                <div style={styles.progressStatCard}>
                  <span style={styles.progressStatNumber}>{studentProgress.completedLessons}/{studentProgress.totalLessons}</span>
                  <span style={styles.progressStatLabel}>دروس مكتملة</span>
                </div>
                <div style={styles.progressStatCard}>
                  <span style={styles.progressStatNumber}>{studentProgress.openedCourses}</span>
                  <span style={styles.progressStatLabel}>كورسات مفتوحة</span>
                </div>
              </div>

              {/* ✅ التقدم في كل مادة */}
              <h3 style={styles.progressSubTitle}>📚 التقدم في المواد</h3>
              <div style={styles.progressSubjectsList}>
                {studentProgress.subjects.length === 0 ? (
                  <p style={styles.noCourses}>لا توجد مواد مسجل فيها الطالب</p>
                ) : (
                  studentProgress.subjects.map((subject: any) => (
                    <div key={subject.subjectId} style={styles.progressSubjectItem}>
                      <div style={styles.progressSubjectHeader}>
                        <span style={styles.progressSubjectName}>{subject.subjectName}</span>
                        <span style={styles.progressSubjectPercent}>{subject.progress}%</span>
                      </div>
                      <div style={styles.progressSubjectBar}>
                        <div style={{ ...styles.progressSubjectFill, width: `${subject.progress}%` }} />
                      </div>
                      <div style={styles.progressSubjectDetails}>
                        <span>📝 {subject.completedExams}/{subject.totalExams} امتحان</span>
                        <span>📖 {subject.completedLessons}/{subject.totalLessons} درس</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ✅ النقاط والإحصائيات */}
              <div style={styles.progressPoints}>
                <div style={styles.progressPointItem}>
                  <span>⭐</span>
                  <span>{studentProgress.xp} نقطة خبرة</span>
                </div>
                <div style={styles.progressPointItem}>
                  <span>🎯</span>
                  <span>المستوى {studentProgress.level}</span>
                </div>
                <div style={styles.progressPointItem}>
                  <span>💎</span>
                  <span>{studentProgress.gems} جواهر</span>
                </div>
                <div style={styles.progressPointItem}>
                  <span>🔥</span>
                  <span>{studentProgress.streak} أيام متواصلة</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ مودال إرسال إشعار لمادة */}
        {showNotificationModal && selectedSubject && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>📨 إرسال إشعار لطلاب {selectedSubject.name}</h2>
                  <p style={styles.modalSub}>
                    سيتم إرسال الإشعار لجميع الطلاب المسجلين في هذه المادة
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    setSelectedSubject(null);
                    setNotificationTitle('');
                    setNotificationBody('');
                  }}
                  style={styles.closeModal}
                >
                  ✕
                </button>
              </div>

              <div style={styles.notificationForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>📝 عنوان الإشعار</label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="أدخل عنوان الإشعار"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>📄 محتوى الإشعار</label>
                  <textarea
                    value={notificationBody}
                    onChange={(e) => setNotificationBody(e.target.value)}
                    placeholder="أدخل محتوى الإشعار"
                    style={styles.textarea}
                    rows={3}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>🎨 نوع الإشعار</label>
                  <div style={styles.typeButtons}>
                    <button
                      type="button"
                      onClick={() => setNotificationType('info')}
                      style={{
                        ...styles.typeBtn,
                        background: notificationType === 'info' ? '#3b82f6' : '#f3f4f6',
                        color: notificationType === 'info' ? 'white' : '#4b5563',
                      }}
                    >
                      ℹ️ معلومات
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationType('success')}
                      style={{
                        ...styles.typeBtn,
                        background: notificationType === 'success' ? '#10b981' : '#f3f4f6',
                        color: notificationType === 'success' ? 'white' : '#4b5563',
                      }}
                    >
                      ✅ نجاح
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationType('warning')}
                      style={{
                        ...styles.typeBtn,
                        background: notificationType === 'warning' ? '#f59e0b' : '#f3f4f6',
                        color: notificationType === 'warning' ? 'white' : '#4b5563',
                      }}
                    >
                      ⚠️ تنبيه
                    </button>
                  </div>
                </div>

                <button
                  onClick={sendNotification}
                  disabled={sendingNotification}
                  style={{
                    ...styles.sendNotificationBtn,
                    opacity: sendingNotification ? 0.5 : 1,
                    cursor: sendingNotification ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sendingNotification ? '⏳ جاري الإرسال...' : '📨 إرسال الإشعار'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ ✅ مودال إرسال إشعار لمرحلة كاملة */}
        {showGradeNotificationModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>📨 إرسال إشعار لمرحلة كاملة</h2>
                  <p style={styles.modalSub}>
                    سيتم إرسال الإشعار لجميع الطلاب في المرحلة المختارة (المسجلين في موادك فقط)
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowGradeNotificationModal(false);
                    setSelectedGradeForNotification('');
                    setNotificationTitle('');
                    setNotificationBody('');
                  }}
                  style={styles.closeModal}
                >
                  ✕
                </button>
              </div>

              <div style={styles.notificationForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>🎯 اختر المرحلة</label>
                  <select
                    value={selectedGradeForNotification}
                    onChange={(e) => setSelectedGradeForNotification(e.target.value)}
                    style={{
                      ...styles.select,
                      color: 'white',
                      backgroundColor: '#1a1a2e',
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <option value="">-- اختر المرحلة --</option>
                    {grades.filter(g => g.value !== 'all').map(grade => (
                      <option key={grade.value} value={grade.value}>
                        {grade.label} ({gradeStats[grade.value] || 0} طالب)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>📝 عنوان الإشعار</label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="أدخل عنوان الإشعار"
                    style={{
                      ...styles.input,
                      color: 'white',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>📄 محتوى الإشعار</label>
                  <textarea
                    value={notificationBody}
                    onChange={(e) => setNotificationBody(e.target.value)}
                    placeholder="أدخل محتوى الإشعار"
                    style={{
                      ...styles.textarea,
                      color: 'white',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                    rows={3}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>🎨 نوع الإشعار</label>
                  <div style={styles.typeButtons}>
                    <button
                      type="button"
                      onClick={() => setNotificationType('info')}
                      style={{
                        ...styles.typeBtn,
                        background: notificationType === 'info' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                        color: notificationType === 'info' ? 'white' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      ℹ️ معلومات
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationType('success')}
                      style={{
                        ...styles.typeBtn,
                        background: notificationType === 'success' ? '#10b981' : 'rgba(255,255,255,0.05)',
                        color: notificationType === 'success' ? 'white' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      ✅ نجاح
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationType('warning')}
                      style={{
                        ...styles.typeBtn,
                        background: notificationType === 'warning' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                        color: notificationType === 'warning' ? 'white' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      ⚠️ تنبيه
                    </button>
                  </div>
                </div>

                <button
                  onClick={sendGradeNotification}
                  disabled={sendingNotification}
                  style={{
                    ...styles.sendNotificationBtn,
                    opacity: sendingNotification ? 0.5 : 1,
                    cursor: sendingNotification ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sendingNotification ? '⏳ جاري الإرسال...' : '📨 إرسال الإشعار للمرحلة'}
                </button>
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
  // ✅ ✅ أنماط الفلترة
  gradeFilterSection: {
    padding: '15px',
    background: 'rgba(139,92,246,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(139,92,246,0.1)',
    marginBottom: '15px',
  },
  filterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap' as const,
    gap: '10px',
  },
  filterTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  gradeNotifyBtn: {
    padding: '6px 16px',
    background: 'rgba(139,92,246,0.15)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  gradeFilterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  gradeFilterBtn: {
    padding: '6px 14px',
    border: '1px solid',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  gradeCount: {
    fontSize: '11px',
    opacity: 0.6,
  },
  quickStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '15px',
  },
  quickStatCard: {
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    textAlign: 'center' as const,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  quickStatNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#FFD700',
    display: 'block',
  },
  quickStatLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
  studentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  studentCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  studentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '12px',
  },
  studentAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  studentPhone: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
  },
  studentGrade: {
    fontSize: '12px',
    color: '#60a5fa',
    background: 'rgba(59,130,246,0.1)',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  studentSubjects: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginBottom: '15px',
  },
  subjectTag: {
    padding: '4px 12px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    borderRadius: '20px',
    fontSize: '12px',
  },
  studentActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  openCoursesBtn: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    flex: 1,
  },
  progressBtn: {
    padding: '8px 20px',
    background: 'rgba(16,185,129,0.15)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    flex: 1,
  },
  notifyBtn: {
    padding: '8px 20px',
    background: 'rgba(139,92,246,0.1)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    flex: 1,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'rgba(255,255,255,0.3)',
  },
  emptySub: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.2)',
    marginTop: '5px',
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
    padding: '25px',
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
    fontSize: '22px',
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
  modalActions: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  openAllBtn: {
    padding: '8px 20px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    flex: 1,
  },
  closeAllBtn: {
    padding: '8px 20px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    flex: 1,
  },
  coursesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  courseItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  courseInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  courseOrder: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.2)',
    minWidth: '30px',
  },
  courseTitle: {
    fontSize: '15px',
    fontWeight: '500',
  },
  courseGrade: {
    padding: '2px 8px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    borderRadius: '12px',
    fontSize: '11px',
    marginRight: '8px',
  },
  coursePrice: {
    padding: '2px 8px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    borderRadius: '12px',
    fontSize: '11px',
    marginRight: '8px',
  },
  toggleBtn: {
    padding: '6px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  noCourses: {
    textAlign: 'center' as const,
    padding: '30px',
    color: 'rgba(255,255,255,0.3)',
  },
  // ✅ أنماط مودال التقدم
  progressStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  progressStatCard: {
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
    textAlign: 'center' as const,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  progressStatNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFD700',
    display: 'block',
  },
  progressStatLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
  progressSubTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: 'rgba(255,255,255,0.8)',
  },
  progressSubjectsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '20px',
    maxHeight: '250px',
    overflowY: 'auto' as const,
  },
  progressSubjectItem: {
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  progressSubjectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  progressSubjectName: {
    fontSize: '15px',
    fontWeight: '600',
  },
  progressSubjectPercent: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  progressSubjectBar: {
    width: '100%',
    height: '4px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressSubjectFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },
  progressSubjectDetails: {
    display: 'flex',
    gap: '15px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  progressPoints: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  progressPointItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
  },
  // ✅ أنماط إرسال الإشعارات - مع ألوان ثابتة
  notificationForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
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
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
  },
  textarea: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  typeButtons: {
    display: 'flex',
    gap: '8px',
  },
  typeBtn: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  sendNotificationBtn: {
    padding: '12px',
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '10px',
  },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    select option {
      background-color: #1a1a2e !important;
      color: white !important;
      padding: 8px 12px !important;
    }
  `;
  document.head.appendChild(style);
}