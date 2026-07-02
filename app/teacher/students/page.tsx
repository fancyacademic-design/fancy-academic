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

      // ✅ تعطيل التحقق من الصلاحية مؤقتاً
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
      
      // ✅ جلب مواد المدرس
      const subjectsQuery = query(
        collection(db, 'subjects'),
        where('teacherId', '==', teacherId)
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const subjectsData = subjectsSnapshot.docs.map(docSnap => ({  // ✅ غيرنا اسم المتغير لـ docSnap
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

      // ✅ جلب الطلاب المسجلين في مواد المدرس
      const studentIds = new Set<string>();
      const studentsList: any[] = [];

      for (const subject of subjectsData) {
        console.log(`🔍 جلب طلاب المادة: ${subject.name} (${subject.id})`);
        
        const enrolledQuery = query(
          collection(db, 'student_subjects'),
          where('subjectId', '==', subject.id)
        );
        const enrolledSnapshot = await getDocs(enrolledQuery);
        const enrolledData = enrolledSnapshot.docs.map(docSnap => docSnap.data());  // ✅ غيرنا اسم المتغير
        console.log(`👨‍🎓 طلاب ${subject.name}:`, enrolledData);
        
        for (const data of enrolledData) {
          if (!studentIds.has(data.studentId)) {
            studentIds.add(data.studentId);
            
            // ✅ جلب بيانات الطالب
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
              });
            } else {
              console.log(`⚠️ المستخدم ${data.studentId} غير موجود`);
            }
          } else {
            // ✅ إضافة المادة للطالب الموجود
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

  // ✅ جلب الكورسات المفتوحة للطالب في مادة معينة
  const loadStudentCourses = async (studentId: string, subjectId: string) => {
    try {
      console.log(`🔍 جلب كورسات المادة ${subjectId} للطالب ${studentId}`);
      
      // ✅ جلب بيانات الطالب (لمعرفة مرحلته)
      const userRef = doc(db, 'users', studentId);
      const userDoc = await getDoc(userRef);
      const studentGrade = userDoc.exists() ? userDoc.data().grade : '1-prep';
      
      console.log(`🎯 مرحلة الطالب: ${studentGrade}`);

      // ✅ جلب الكورسات (مع فلترة حسب المرحلة)
      const coursesQuery = query(
        collection(db, 'courses'),
        where('subjectId', '==', subjectId),
        where('isActive', '==', true),
        where('grade', '==', studentGrade)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      const coursesData = coursesSnapshot.docs.map(docSnap => ({  // ✅ غيرنا اسم المتغير
        id: docSnap.id,
        ...docSnap.data(),
      }));
      
      // ✅ ترتيب في الكود
      coursesData.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('📚 الكورسات المتاحة للطالب:', coursesData);
      setCourses(coursesData);

      // ✅ جلب الكورسات المفتوحة للطالب
      const openedQuery = query(
        collection(db, 'student_courses'),
        where('studentId', '==', studentId),
        where('isActive', '==', true)
      );
      const openedSnapshot = await getDocs(openedQuery);
      const openedIds = openedSnapshot.docs.map(docSnap => docSnap.data().courseId);  // ✅ غيرنا اسم المتغير
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
        for (const docSnap of snapshot.docs) {  // ✅ غيرنا اسم المتغير
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
          for (const docSnap of snapshot.docs) {  // ✅ غيرنا اسم المتغير
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

  // ✅ إرسال إشعار لطلاب مادة معينة
  const sendNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      setMessage('⚠️ من فضلك أدخل عنوان ومحتوى الإشعار');
      return;
    }

    setSendingNotification(true);
    setMessage('');

    try {
      // ✅ جلب الطلاب المسجلين في المادة
      const enrolledQuery = query(
        collection(db, 'student_subjects'),
        where('subjectId', '==', selectedSubject.id)
      );
      const enrolledSnapshot = await getDocs(enrolledQuery);
      
      let sentCount = 0;
      
      for (const docSnap of enrolledSnapshot.docs) {  // ✅ غيرنا اسم المتغير
        const data = docSnap.data();
        const studentId = data.studentId;
        
        // ✅ إرسال إشعار لكل طالب
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

        {students.length === 0 ? (
          <div style={styles.empty}>
            <span>📭</span>
            <p>لا يوجد طلاب مسجلين في موادك</p>
            <p style={styles.emptySub}>تأكد من أن الطلاب سجلوا في موادك عبر صفحة البلاتفورم</p>
          </div>
        ) : (
          <div style={styles.studentsGrid}>
            {students.map((student) => (
              <div key={student.id} style={styles.studentCard}>
                <div style={styles.studentHeader}>
                  <div style={styles.studentAvatar}>
                    {student.name.charAt(0)}
                  </div>
                  <div style={styles.studentInfo}>
                    <h3 style={styles.studentName}>{student.name}</h3>
                    <span style={styles.studentPhone}>📱 {student.phone}</span>
                    <span style={styles.studentGrade}>🎯 {student.grade}</span>
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
                  
                  {/* ✅ زر إرسال إشعارات للمادة */}
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
                    {selectedStudent.subjects.join(' - ')} | 🎯 {selectedStudent.grade}
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
                               course.grade === '2-secondary' ? 'ثانية ثانوي' : course.grade}
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

        {/* ✅ مودال إرسال إشعار للمادة */}
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
  // ✅ أنماط إرسال الإشعارات
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
  `;
  document.head.appendChild(style);
}