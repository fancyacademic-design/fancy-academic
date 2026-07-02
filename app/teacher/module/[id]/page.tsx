'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';

export default function TeacherModuleManagement() {
  const router = useRouter();
  const params = useParams();
  const subjectId = params.id as string;

  const [subject, setSubject] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);

  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    grade: '1-prep',
    price: 0,
    order: 1,
    isActive: true,
  });

  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    order: 1,
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    duration: 30,
    order: 1,
  });

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);

  const grades = [
    { value: '1-prep', label: 'أولى إعدادي' },
    { value: '2-prep', label: 'ثانية إعدادي' },
    { value: '3-prep', label: 'ثالثة إعدادي' },
    { value: '1-secondary', label: 'أولى ثانوي' },
    { value: '2-secondary', label: 'ثانية ثانوي' },
  ];

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      parsed.role = 'teacher';
      parsed.isApproved = true;
      loadData();
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, [subjectId]);

  const loadData = async () => {
    try {
      console.log('🔍 جلب بيانات المادة:', subjectId);
      
      const subjectRef = doc(db, 'subjects', subjectId);
      const subjectSnap = await getDoc(subjectRef);
      if (subjectSnap.exists()) {
        setSubject({ id: subjectSnap.id, ...subjectSnap.data() });
        console.log('✅ المادة:', subjectSnap.data().name);
      }

      // ✅ جلب الكورسات (من غير orderBy)
      const coursesQuery = query(
        collection(db, 'courses'),
        where('subjectId', '==', subjectId)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      coursesData.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('✅ عدد الكورسات:', coursesData.length);
      setCourses(coursesData);

    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // ✅ جلب الوحدات (من غير orderBy)
  const loadModules = async (courseId: string) => {
    try {
      console.log('🔍 جلب الوحدات للكورس:', courseId);
      
      const modulesQuery = query(
        collection(db, 'modules'),
        where('courseId', '==', courseId)
      );
      const modulesSnapshot = await getDocs(modulesQuery);
      const modulesData = modulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      modulesData.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('✅ عدد الوحدات:', modulesData.length);
      setModules(modulesData);
    } catch (error) {
      console.error('❌ خطأ في جلب الوحدات:', error);
      setMessage('❌ حدث خطأ في جلب الوحدات');
    }
  };

  // ✅ جلب الدروس (من غير orderBy)
  const loadLessons = async (moduleId: string) => {
    try {
      console.log('🔍 جلب الدروس للوحدة:', moduleId);
      
      const lessonsQuery = query(
        collection(db, 'lessons'),
        where('moduleId', '==', moduleId)
      );
      const lessonsSnapshot = await getDocs(lessonsQuery);
      const lessonsData = lessonsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      lessonsData.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('✅ عدد الدروس:', lessonsData.length);
      setLessons(lessonsData);
    } catch (error) {
      console.error('❌ خطأ في جلب الدروس:', error);
      setMessage('❌ حدث خطأ في جلب الدروس');
    }
  };

  // ➕ إضافة كورس
  const handleAddCourse = async () => {
    if (!courseForm.title.trim()) {
      setMessage('⚠️ أدخل عنوان الكورس');
      return;
    }

    setSaving(true);
    try {
      const newCourse = {
        subjectId: subjectId,
        subjectName: subject?.name || '',
        title: courseForm.title,
        description: courseForm.description || '',
        grade: courseForm.grade,
        price: courseForm.price || 0,
        order: courseForm.order || courses.length + 1,
        isActive: courseForm.isActive,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('📝 إضافة كورس:', newCourse);
      const docRef = await addDoc(collection(db, 'courses'), newCourse);
      console.log('✅ تم إضافة الكورس بـ ID:', docRef.id);
      
      setCourses([...courses, { id: docRef.id, ...newCourse }]);
      setMessage(`✅ تم إضافة الكورس "${courseForm.title}"`);
      setCourseForm({ title: '', description: '', grade: '1-prep', price: 0, order: courses.length + 2, isActive: true });
      setShowCourseForm(false);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 🗑️ حذف كورس
  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الكورس وجميع محتوياته؟')) return;

    try {
      const modulesSnapshot = await getDocs(
        query(collection(db, 'modules'), where('courseId', '==', courseId))
      );
      for (const moduleDoc of modulesSnapshot.docs) {
        const lessonsSnapshot = await getDocs(
          query(collection(db, 'lessons'), where('moduleId', '==', moduleDoc.id))
        );
        for (const lessonDoc of lessonsSnapshot.docs) {
          await deleteDoc(doc(db, 'lessons', lessonDoc.id));
        }
        await deleteDoc(doc(db, 'modules', moduleDoc.id));
      }

      await deleteDoc(doc(db, 'courses', courseId));
      setCourses(courses.filter(c => c.id !== courseId));
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
        setModules([]);
      }
      setMessage('✅ تم حذف الكورس وجميع محتوياته');
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ');
    }
  };

  // ➕ إضافة وحدة
  const handleAddModule = async () => {
    if (!moduleForm.title.trim()) {
      setMessage('⚠️ أدخل عنوان الوحدة');
      return;
    }

    setSaving(true);
    try {
      const newModule = {
        courseId: selectedCourse.id,
        title: moduleForm.title,
        description: moduleForm.description || '',
        order: moduleForm.order || modules.length + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('📝 إضافة وحدة:', newModule);
      const docRef = await addDoc(collection(db, 'modules'), newModule);
      console.log('✅ تم إضافة الوحدة بـ ID:', docRef.id);
      
      setModules([...modules, { id: docRef.id, ...newModule }]);
      setMessage('✅ تم إضافة الوحدة');
      setModuleForm({ title: '', description: '', order: modules.length + 2 });
      setShowModuleForm(false);
    } catch (error) {
      console.error('❌ خطأ في إضافة الوحدة:', error);
      setMessage('❌ حدث خطأ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 🗑️ حذف وحدة
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذه الوحدة وجميع دروسها؟')) return;

    try {
      const lessonsSnapshot = await getDocs(
        query(collection(db, 'lessons'), where('moduleId', '==', moduleId))
      );
      for (const lessonDoc of lessonsSnapshot.docs) {
        await deleteDoc(doc(db, 'lessons', lessonDoc.id));
      }

      await deleteDoc(doc(db, 'modules', moduleId));
      setModules(modules.filter(m => m.id !== moduleId));
      if (selectedModule?.id === moduleId) {
        setSelectedModule(null);
        setLessons([]);
      }
      setMessage('✅ تم حذف الوحدة والدروس');
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ');
    }
  };

  // ➕ إضافة درس
  const handleAddLesson = async () => {
    if (!lessonForm.title.trim()) {
      setMessage('⚠️ أدخل عنوان الدرس');
      return;
    }

    setSaving(true);
    try {
      const newLesson = {
        moduleId: selectedModule.id,
        title: lessonForm.title,
        description: lessonForm.description || '',
        videoUrl: lessonForm.videoUrl || '',
        duration: lessonForm.duration || 30,
        order: lessonForm.order || lessons.length + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('📝 إضافة درس:', newLesson);
      const docRef = await addDoc(collection(db, 'lessons'), newLesson);
      console.log('✅ تم إضافة الدرس بـ ID:', docRef.id);
      
      setLessons([...lessons, { id: docRef.id, ...newLesson }]);
      setMessage('✅ تم إضافة الدرس');
      setLessonForm({ title: '', description: '', videoUrl: '', duration: 30, order: lessons.length + 2 });
      setShowLessonForm(false);
    } catch (error) {
      console.error('❌ خطأ في إضافة الدرس:', error);
      setMessage('❌ حدث خطأ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 🗑️ حذف درس
  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الدرس؟')) return;

    try {
      await deleteDoc(doc(db, 'lessons', lessonId));
      setLessons(lessons.filter(l => l.id !== lessonId));
      setMessage('✅ تم حذف الدرس');
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ');
    }
  };

  const getGradeLabel = (gradeValue: string) => {
    const grade = grades.find(g => g.value === gradeValue);
    return grade ? grade.label : gradeValue;
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
          <Link href="/teacher/subjects" style={styles.backButton}>← العودة للمواد</Link>
          <h1 style={styles.title}>📚 إدارة المحتوى</h1>
          <span style={styles.badge}>{subject?.name || 'مادة'}</span>
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

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>📖 الكورسات</h2>
            <button
              onClick={() => setShowCourseForm(!showCourseForm)}
              style={styles.addButton}
            >
              {showCourseForm ? '✕ إلغاء' : '➕ إضافة كورس'}
            </button>
          </div>

          {showCourseForm && (
            <div style={styles.formCard}>
              <h3 style={styles.formTitle}>➕ إضافة كورس جديد</h3>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>عنوان الكورس *</label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    placeholder="مثال: الرياضيات - الفصل الأول"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>المرحلة الدراسية *</label>
                  <select
                    value={courseForm.grade}
                    onChange={(e) => setCourseForm({ ...courseForm, grade: e.target.value })}
                    style={styles.select}
                  >
                    {grades.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>السعر (جنيه)</label>
                  <input
                    type="number"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm({ ...courseForm, price: parseInt(e.target.value) || 0 })}
                    placeholder="مثال: 100"
                    style={styles.input}
                    min="0"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>الترتيب</label>
                  <input
                    type="number"
                    value={courseForm.order}
                    onChange={(e) => setCourseForm({ ...courseForm, order: parseInt(e.target.value) || 1 })}
                    placeholder="الترتيب"
                    style={styles.input}
                    min="1"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>الوصف</label>
                  <input
                    type="text"
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    placeholder="وصف الكورس"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>الحالة</label>
                  <div style={styles.switchContainer}>
                    <button
                      onClick={() => setCourseForm({ ...courseForm, isActive: true })}
                      style={{
                        ...styles.switchButton,
                        background: courseForm.isActive ? '#10b981' : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      ✅ نشط
                    </button>
                    <button
                      onClick={() => setCourseForm({ ...courseForm, isActive: false })}
                      style={{
                        ...styles.switchButton,
                        background: !courseForm.isActive ? '#ef4444' : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      ⛔ غير نشط
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddCourse}
                disabled={saving}
                style={styles.saveButton}
              >
                {saving ? '⏳ جاري الحفظ...' : '💾 إضافة الكورس'}
              </button>
            </div>
          )}

          {courses.length === 0 ? (
            <div style={styles.empty}>لا توجد كورسات في هذه المادة</div>
          ) : (
            <div style={styles.coursesGrid}>
              {courses.map((course) => (
                <div key={course.id} style={styles.courseCard}>
                  <div style={styles.courseHeader}>
                    <div style={styles.courseInfo}>
                      <span style={styles.courseOrder}>#{course.order}</span>
                      <div>
                        <h3 style={styles.courseTitle}>{course.title}</h3>
                        <div style={styles.courseTags}>
                          <span style={styles.gradeTag}>{getGradeLabel(course.grade)}</span>
                          {course.price > 0 && (
                            <span style={styles.priceTag}>💰 {course.price} ج.م</span>
                          )}
                          <span style={{
                            ...styles.statusTag,
                            background: course.isActive !== false ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: course.isActive !== false ? '#34d399' : '#f87171',
                          }}>
                            {course.isActive !== false ? '✅ نشط' : '⛔ غير نشط'}
                          </span>
                        </div>
                        <p style={styles.courseDesc}>{course.description || 'لا يوجد وصف'}</p>
                      </div>
                    </div>
                    <div style={styles.courseActions}>
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          loadModules(course.id);
                          setSelectedModule(null);
                          setLessons([]);
                          setShowModuleForm(false);
                          setShowLessonForm(false);
                        }}
                        style={styles.manageBtn}
                      >
                        📝 الوحدات
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        style={styles.deleteBtn}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {selectedCourse?.id === course.id && (
                    <div style={styles.subSection}>
                      <div style={styles.subSectionHeader}>
                        <h4>📂 الوحدات</h4>
                        <button
                          onClick={() => setShowModuleForm(!showModuleForm)}
                          style={styles.addSubButton}
                        >
                          {showModuleForm ? '✕' : '➕ إضافة وحدة'}
                        </button>
                      </div>

                      {showModuleForm && (
                        <div style={styles.subForm}>
                          <div style={styles.subFormGrid}>
                            <input
                              type="text"
                              value={moduleForm.title}
                              onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                              placeholder="عنوان الوحدة *"
                              style={styles.input}
                            />
                            <input
                              type="text"
                              value={moduleForm.description}
                              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                              placeholder="وصف الوحدة"
                              style={styles.input}
                            />
                            <input
                              type="number"
                              value={moduleForm.order}
                              onChange={(e) => setModuleForm({ ...moduleForm, order: parseInt(e.target.value) || 1 })}
                              placeholder="الترتيب"
                              style={styles.input}
                              min="1"
                            />
                          </div>
                          <button
                            onClick={handleAddModule}
                            disabled={saving}
                            style={styles.saveButton}
                          >
                            {saving ? '⏳ جاري الحفظ...' : '💾 إضافة الوحدة'}
                          </button>
                        </div>
                      )}

                      {modules.length === 0 ? (
                        <p style={styles.emptySub}>لا توجد وحدات في هذا الكورس</p>
                      ) : (
                        <div style={styles.modulesList}>
                          {modules.map((module) => (
                            <div key={module.id} style={styles.moduleItem}>
                              <div style={styles.moduleInfo}>
                                <span style={styles.moduleOrder}>#{module.order}</span>
                                <div>
                                  <span style={styles.moduleTitle}>{module.title}</span>
                                  <span style={styles.moduleDesc}>{module.description || ''}</span>
                                </div>
                              </div>
                              <div style={styles.moduleActions}>
                                <button
                                  onClick={() => {
                                    setSelectedModule(module);
                                    loadLessons(module.id);
                                    setShowLessonForm(false);
                                  }}
                                  style={styles.manageSubBtn}
                                >
                                  📝 الدروس
                                </button>
                                <button
                                  onClick={() => handleDeleteModule(module.id)}
                                  style={styles.deleteSubBtn}
                                >
                                  🗑️
                                </button>
                              </div>

                              {selectedModule?.id === module.id && (
                                <div style={styles.subSubSection}>
                                  <div style={styles.subSubHeader}>
                                    <h5>📹 الدروس</h5>
                                    <button
                                      onClick={() => setShowLessonForm(!showLessonForm)}
                                      style={styles.addSubButton}
                                    >
                                      {showLessonForm ? '✕' : '➕ إضافة درس'}
                                    </button>
                                  </div>

                                  {showLessonForm && (
                                    <div style={styles.subForm}>
                                      <div style={styles.subFormGrid}>
                                        <input
                                          type="text"
                                          value={lessonForm.title}
                                          onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                                          placeholder="عنوان الدرس *"
                                          style={styles.input}
                                        />
                                        <input
                                          type="text"
                                          value={lessonForm.description}
                                          onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                                          placeholder="وصف الدرس"
                                          style={styles.input}
                                        />
                                        <input
                                          type="text"
                                          value={lessonForm.videoUrl}
                                          onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                                          placeholder="رابط الفيديو"
                                          style={styles.input}
                                        />
                                        <input
                                          type="number"
                                          value={lessonForm.duration}
                                          onChange={(e) => setLessonForm({ ...lessonForm, duration: parseInt(e.target.value) || 30 })}
                                          placeholder="المدة (دقائق)"
                                          style={styles.input}
                                          min="1"
                                        />
                                        <input
                                          type="number"
                                          value={lessonForm.order}
                                          onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 1 })}
                                          placeholder="الترتيب"
                                          style={styles.input}
                                          min="1"
                                        />
                                      </div>
                                      <button
                                        onClick={handleAddLesson}
                                        disabled={saving}
                                        style={styles.saveButton}
                                      >
                                        {saving ? '⏳ جاري الحفظ...' : '💾 إضافة الدرس'}
                                      </button>
                                    </div>
                                  )}

                                  {lessons.length === 0 ? (
                                    <p style={styles.emptySub}>لا توجد دروس في هذه الوحدة</p>
                                  ) : (
                                    <div style={styles.lessonsList}>
                                      {lessons.map((lesson) => (
                                        <div key={lesson.id} style={styles.lessonItem}>
                                          <div style={styles.lessonInfo}>
                                            <span style={styles.lessonOrder}>#{lesson.order}</span>
                                            <span style={styles.lessonTitle}>{lesson.title}</span>
                                            {lesson.videoUrl && (
                                              <span style={styles.lessonVideo}>▶️ فيديو</span>
                                            )}
                                            <span style={styles.lessonDuration}>{lesson.duration || 0} د</span>
                                          </div>
                                          <button
                                            onClick={() => handleDeleteLesson(lesson.id)}
                                            style={styles.deleteSubBtn}
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
  section: {
    marginBottom: '30px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: 0,
  },
  addButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  formCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: 'rgba(255,255,255,0.8)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
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
  },
  switchContainer: {
    display: 'flex',
    gap: '10px',
  },
  switchButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s',
    color: 'white',
    fontSize: '13px',
  },
  saveButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    marginTop: '15px',
  },
  coursesGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  courseCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  courseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flex: 1,
  },
  courseOrder: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.1)',
    minWidth: '40px',
  },
  courseTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  courseTags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginTop: '4px',
  },
  gradeTag: {
    padding: '2px 10px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    borderRadius: '20px',
    fontSize: '11px',
  },
  priceTag: {
    padding: '2px 10px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    borderRadius: '20px',
    fontSize: '11px',
  },
  statusTag: {
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '11px',
  },
  courseDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    margin: '5px 0 0 0',
  },
  courseActions: {
    display: 'flex',
    gap: '8px',
  },
  manageBtn: {
    padding: '6px 16px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  deleteBtn: {
    padding: '6px 12px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  subSection: {
    marginTop: '15px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.03)',
  },
  subSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  addSubButton: {
    padding: '4px 12px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  subForm: {
    marginBottom: '15px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  subFormGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '10px',
    marginBottom: '10px',
  },
  modulesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  moduleItem: {
    padding: '12px 15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  moduleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  moduleOrder: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.2)',
    minWidth: '30px',
  },
  moduleTitle: {
    fontSize: '15px',
    fontWeight: '500',
  },
  moduleDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    marginRight: '10px',
  },
  moduleActions: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
  },
  manageSubBtn: {
    padding: '4px 12px',
    background: 'rgba(139,92,246,0.1)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  deleteSubBtn: {
    padding: '4px 10px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  subSubSection: {
    marginTop: '10px',
    padding: '10px 15px',
    background: 'rgba(255,255,255,0.01)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.03)',
  },
  subSubHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  lessonsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  lessonItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  lessonInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  lessonOrder: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.2)',
    minWidth: '25px',
  },
  lessonTitle: {
    fontSize: '14px',
    fontWeight: '500',
  },
  lessonVideo: {
    padding: '2px 8px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    borderRadius: '4px',
    fontSize: '11px',
  },
  lessonDuration: {
    padding: '2px 8px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.3)',
    borderRadius: '4px',
    fontSize: '11px',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '30px',
    color: 'rgba(255,255,255,0.3)',
  },
  emptySub: {
    textAlign: 'center' as const,
    padding: '15px',
    color: 'rgba(255,255,255,0.2)',
    fontSize: '13px',
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