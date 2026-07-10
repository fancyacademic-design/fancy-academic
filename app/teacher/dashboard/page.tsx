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
  addDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
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

  // ✅ ✅ قسم البث المباشر
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [showLiveForm, setShowLiveForm] = useState(false);
  const [editingLive, setEditingLive] = useState<any>(null);
  const [liveForm, setLiveForm] = useState({
    title: '',
    description: '',
    subjectId: '',
    grade: '',
    link: '',
    openToAll: true,
    selectedStudents: [] as string[],
    scheduledTime: '',
    isVisible: true,
  });
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [savingLive, setSavingLive] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');

  // ✅ ✅ قائمة المراحل الكاملة
  const grades = [
    { value: '1-prep', label: 'أولى إعدادي' },
    { value: '2-prep', label: 'ثانية إعدادي' },
    { value: '3-prep', label: 'ثالثة إعدادي' },
    { value: '1-secondary', label: 'أولى ثانوي' },
    { value: '2-secondary', label: 'ثانية ثانوي' },
    { value: '3-secondary', label: 'تالتة ثانوي' },
  ];

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

      const userId = parsed.id || parsed.uid || parsed.userId;
      console.log('🆔 ID المستخدم:', userId);

      if (!userId) {
        console.error('❌ لا يوجد معرف للمستخدم');
        router.push('/login');
        return;
      }

      setUser(parsed);
      loadData(userId);
      loadTeacherAbout(userId);
      loadLiveStreams(userId);
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, [router]);

  // ✅ ✅ دالة لجلب اسم المرحلة
  const getGradeLabel = (gradeValue: string) => {
    if (!gradeValue) return 'بدون مرحلة';
    const found = grades.find(g => g.value === gradeValue);
    return found?.label || gradeValue;
  };

  // ✅ ✅ ✅ جلب البيانات (معدلة - تجلب الطلاب من جميع المواد)
  const loadData = async (teacherId: string) => {
    try {
      console.log('🔍 بدء جلب البيانات للمدرس:', teacherId);
      
      // ✅ جلب المواد
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

      // ✅ ✅ ✅ جلب الطلاب من جميع مواد المدرس (باستخدام subjectId)
      const allStudents: any[] = [];
      const studentIdsSet = new Set<string>();

      for (const subject of subjectsData) {
        const studentsQuery = query(
          collection(db, 'student_subjects'),
          where('subjectId', '==', subject.id)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log(`👨‍🎓 طلاب مادة ${subject.name}:`, studentsData.length);

        // ✅ جمع معرفات الطلاب (منع التكرار)
        for (const s of studentsData) {
          if (!studentIdsSet.has(s.studentId)) {
            studentIdsSet.add(s.studentId);
            
            // ✅ جلب بيانات الطالب من users
            const userRef = doc(db, 'users', s.studentId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const grade = userData.grade || userData.year || '';
              allStudents.push({
                id: s.studentId,
                name: userData.name || 'طالب',
                grade: grade,
                phone: userData.phone || '',
                email: userData.email || '',
              });
            }
          }
        }
      }

      console.log('📊 جميع الطلاب:', allStudents);
      setStudentsList(allStudents);

      // ✅ ✅ حساب عدد الطلاب الفريدين
      const uniqueStudentsCount = studentIdsSet.size;

      setStats({
        subjects: subjectsData.length,
        students: uniqueStudentsCount,
        activeSubjects: activeSubjects,
      });

      console.log('📊 إحصائيات:', {
        subjects: subjectsData.length,
        students: uniqueStudentsCount,
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

  // ✅ ✅ جلب البثوث المباشرة
  const loadLiveStreams = async (teacherId: string) => {
    try {
      const streamsQuery = query(
        collection(db, 'live_streams'),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc')
      );
      const streamsSnapshot = await getDocs(streamsQuery);
      const streamsData = streamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLiveStreams(streamsData);
    } catch (error) {
      console.error('❌ خطأ في جلب البثوث:', error);
    }
  };

  // ✅ ✅ إضافة/تحديث بث مباشر
  const saveLiveStream = async () => {
    if (!user) return;
    if (!liveForm.title.trim()) {
      setLiveMessage('⚠️ يرجى إدخال عنوان البث');
      return;
    }
    if (!liveForm.subjectId) {
      setLiveMessage('⚠️ يرجى اختيار المادة');
      return;
    }
    if (!liveForm.grade) {
      setLiveMessage('⚠️ يرجى اختيار المرحلة');
      return;
    }
    if (!liveForm.link.trim()) {
      setLiveMessage('⚠️ يرجى إدخال رابط البث');
      return;
    }
    if (!liveForm.scheduledTime) {
      setLiveMessage('⚠️ يرجى تحديد وقت الفتح');
      return;
    }

    setSavingLive(true);
    setLiveMessage('');

    try {
      const streamData = {
        title: liveForm.title,
        description: liveForm.description || '',
        subjectId: liveForm.subjectId,
        teacherId: user.id,
        grade: liveForm.grade,
        link: liveForm.link,
        openToAll: liveForm.openToAll,
        selectedStudents: liveForm.openToAll ? [] : liveForm.selectedStudents,
        scheduledTime: new Date(liveForm.scheduledTime),
        isVisible: liveForm.isVisible,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (editingLive) {
        await updateDoc(doc(db, 'live_streams', editingLive.id), streamData);
        setLiveMessage('✅ تم تحديث البث بنجاح');
      } else {
        await addDoc(collection(db, 'live_streams'), {
          ...streamData,
          createdAt: serverTimestamp(),
        });
        setLiveMessage('✅ تم إضافة البث بنجاح');
      }

      setShowLiveForm(false);
      setEditingLive(null);
      resetLiveForm();
      await loadLiveStreams(user.id);
      
      setTimeout(() => setLiveMessage(''), 3000);
    } catch (error) {
      console.error('❌ خطأ في حفظ البث:', error);
      setLiveMessage('❌ حدث خطأ في حفظ البث');
    } finally {
      setSavingLive(false);
    }
  };

  // ✅ ✅ حذف بث مباشر
  const deleteLiveStream = async (streamId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا البث؟')) return;
    try {
      await deleteDoc(doc(db, 'live_streams', streamId));
      setLiveMessage('✅ تم حذف البث بنجاح');
      await loadLiveStreams(user.id);
      setTimeout(() => setLiveMessage(''), 3000);
    } catch (error) {
      console.error('❌ خطأ في حذف البث:', error);
      setLiveMessage('❌ حدث خطأ في حذف البث');
    }
  };

  // ✅ ✅ تبديل حالة الإظهار
  const toggleVisibility = async (stream: any) => {
    try {
      await updateDoc(doc(db, 'live_streams', stream.id), {
        isVisible: !stream.isVisible,
        updatedAt: serverTimestamp(),
      });
      setLiveMessage(`✅ تم ${stream.isVisible ? 'إخفاء' : 'إظهار'} البث`);
      await loadLiveStreams(user.id);
      setTimeout(() => setLiveMessage(''), 3000);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setLiveMessage('❌ حدث خطأ');
    }
  };

  // ✅ ✅ إعادة تعيين نموذج البث
  const resetLiveForm = () => {
    setLiveForm({
      title: '',
      description: '',
      subjectId: '',
      grade: '',
      link: '',
      openToAll: true,
      selectedStudents: [],
      scheduledTime: '',
      isVisible: true,
    });
  };

  // ✅ ✅ فتح نموذج التعديل
  const editLiveStream = (stream: any) => {
    const scheduledTime = stream.scheduledTime?.toDate?.() || new Date(stream.scheduledTime);
    setLiveForm({
      title: stream.title || '',
      description: stream.description || '',
      subjectId: stream.subjectId || '',
      grade: stream.grade || '',
      link: stream.link || '',
      openToAll: stream.openToAll !== false,
      selectedStudents: stream.selectedStudents || [],
      scheduledTime: scheduledTime.toISOString().slice(0, 16),
      isVisible: stream.isVisible !== false,
    });
    setEditingLive(stream);
    setShowLiveForm(true);
  };

  // ✅ ✅ الحصول على اسم المادة
  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'بدون مادة';
  };

  // ✅ ✅ تنسيق التاريخ
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

  // ✅ ✅ التحقق من وقت البث (مفتوح أم لا)
  const isStreamOpen = (scheduledTime: any) => {
    try {
      const date = scheduledTime.toDate ? scheduledTime.toDate() : new Date(scheduledTime);
      return new Date() >= date;
    } catch {
      return false;
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
          <p style={styles.description}>من هنا يمكنك إدارة موادك وطلابك والبثوث المباشرة.</p>
        </div>

        {/* ✅ ✅ نبذة عني */}
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

        {/* ✅ ✅ قسم البث المباشر */}
        <div style={styles.liveSection}>
          <div style={styles.liveHeader}>
            <h3 style={styles.liveTitle}>📺 إدارة البث المباشر</h3>
            <button
              onClick={() => {
                setShowLiveForm(!showLiveForm);
                if (!showLiveForm) {
                  resetLiveForm();
                  setEditingLive(null);
                }
              }}
              style={styles.addLiveBtn}
            >
              {showLiveForm ? '✕ إلغاء' : '➕ إضافة بث جديد'}
            </button>
          </div>

          {liveMessage && (
            <div style={{
              ...styles.liveMessage,
              background: liveMessage.includes('✅') ? 'rgba(16,185,129,0.1)' : 
                          liveMessage.includes('⚠️') ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
              color: liveMessage.includes('✅') ? '#34d399' : 
                    liveMessage.includes('⚠️') ? '#f59e0b' : '#f87171',
            }}>
              {liveMessage}
            </div>
          )}

          {showLiveForm && (
            <div style={styles.liveFormContainer}>
              <h4 style={styles.liveFormTitle}>
                {editingLive ? '✏️ تعديل البث' : '➕ إضافة بث مباشر جديد'}
              </h4>
              
              <div style={styles.liveFormGrid}>
                {/* ✅ عنوان البث */}
                <div style={styles.liveFormGroup}>
                  <label style={styles.liveLabel}>عنوان البث *</label>
                  <input
                    type="text"
                    value={liveForm.title}
                    onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })}
                    placeholder="مثال: مراجعة نهائية"
                    style={styles.liveInput}
                  />
                </div>

                {/* ✅ المادة */}
                <div style={styles.liveFormGroup}>
                  <label style={styles.liveLabel}>المادة *</label>
                  <select
                    value={liveForm.subjectId}
                    onChange={(e) => {
                      const subjectId = e.target.value;
                      const subject = subjects.find(s => s.id === subjectId);
                      setLiveForm({
                        ...liveForm,
                        subjectId: subjectId,
                        grade: subject?.grade || '',
                      });
                    }}
                    style={styles.liveSelect}
                  >
                    <option value="">اختر المادة</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* ✅ ✅ المرحلة - قائمة بكل المراحل */}
                <div style={styles.liveFormGroup}>
                  <label style={styles.liveLabel}>المرحلة *</label>
                  <select
                    value={liveForm.grade}
                    onChange={(e) => setLiveForm({ ...liveForm, grade: e.target.value })}
                    style={styles.liveSelect}
                  >
                    <option value="">اختر المرحلة</option>
                    {grades.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                {/* ✅ رابط البث */}
                <div style={styles.liveFormGroup}>
                  <label style={styles.liveLabel}>رابط البث * (مخفي عن الطلاب)</label>
                  <input
                    type="text"
                    value={liveForm.link}
                    onChange={(e) => setLiveForm({ ...liveForm, link: e.target.value })}
                    placeholder="https://www.youtube.com/live/..."
                    style={styles.liveInput}
                  />
                </div>

                {/* ✅ وقت الفتح */}
                <div style={styles.liveFormGroup}>
                  <label style={styles.liveLabel}>وقت الفتح *</label>
                  <input
                    type="datetime-local"
                    value={liveForm.scheduledTime}
                    onChange={(e) => setLiveForm({ ...liveForm, scheduledTime: e.target.value })}
                    style={styles.liveInput}
                  />
                </div>

                {/* ✅ الرؤية */}
                <div style={styles.liveFormGroup}>
                  <label style={styles.liveLabel}>الرؤية</label>
                  <select
                    value={liveForm.isVisible ? 'true' : 'false'}
                    onChange={(e) => setLiveForm({ ...liveForm, isVisible: e.target.value === 'true' })}
                    style={styles.liveSelect}
                  >
                    <option value="true">👁️ ظاهر للطلاب</option>
                    <option value="false">🚫 مخفي عن الطلاب</option>
                  </select>
                </div>

                {/* ✅ الوصف */}
                <div style={{...styles.liveFormGroup, gridColumn: '1 / -1'}}>
                  <label style={styles.liveLabel}>الوصف</label>
                  <textarea
                    value={liveForm.description}
                    onChange={(e) => setLiveForm({ ...liveForm, description: e.target.value })}
                    placeholder="وصف البث..."
                    style={styles.liveTextarea}
                    rows={2}
                  />
                </div>

                {/* ✅ ✅ اختيار المستهدفين */}
                <div style={{...styles.liveFormGroup, gridColumn: '1 / -1'}}>
                  <label style={styles.liveLabel}>المستهدفين</label>
                  <div style={styles.targetOptions}>
                    <button
                      type="button"
                      onClick={() => setLiveForm({ ...liveForm, openToAll: true, selectedStudents: [] })}
                      style={{
                        ...styles.targetBtn,
                        background: liveForm.openToAll ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                        borderColor: liveForm.openToAll ? '#10b981' : 'rgba(255,255,255,0.1)',
                        color: liveForm.openToAll ? '#34d399' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      👥 جميع طلاب المرحلة
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveForm({ ...liveForm, openToAll: false, selectedStudents: [] })}
                      style={{
                        ...styles.targetBtn,
                        background: !liveForm.openToAll ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                        borderColor: !liveForm.openToAll ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                        color: !liveForm.openToAll ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      🎯 طلاب محددين
                    </button>
                  </div>
                </div>

                {/* ✅ ✅ اختيار طلاب محددين */}
                {!liveForm.openToAll && (
                  <div style={{...styles.liveFormGroup, gridColumn: '1 / -1'}}>
                    <label style={styles.liveLabel}>اختر الطلاب المستهدفين</label>
                    <div style={styles.studentsCheckboxGrid}>
                      {studentsList
                        .filter(student => {
                          if (!liveForm.grade) return true;
                          return student.grade === liveForm.grade;
                        })
                        .map((student) => (
                          <label key={student.id} style={styles.studentCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={liveForm.selectedStudents.includes(student.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setLiveForm({
                                    ...liveForm,
                                    selectedStudents: [...liveForm.selectedStudents, student.id],
                                  });
                                } else {
                                  setLiveForm({
                                    ...liveForm,
                                    selectedStudents: liveForm.selectedStudents.filter(id => id !== student.id),
                                  });
                                }
                              }}
                              style={styles.liveCheckbox}
                            />
                            {student.name} 
                            {student.grade && ` (${getGradeLabel(student.grade)})`}
                          </label>
                        ))}
                      {studentsList.filter(s => s.grade === liveForm.grade || !liveForm.grade).length === 0 && (
                        <p style={styles.noStudentsText}>
                          {liveForm.grade 
                            ? `⚠️ لا يوجد طلاب في مرحلة ${getGradeLabel(liveForm.grade)}`
                            : '⚠️ يرجى اختيار المرحلة أولاً'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.liveFormActions}>
                <button
                  onClick={saveLiveStream}
                  disabled={savingLive}
                  style={{
                    ...styles.saveLiveBtn,
                    opacity: savingLive ? 0.5 : 1,
                    cursor: savingLive ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingLive ? '⏳ جاري الحفظ...' : editingLive ? '💾 تحديث البث' : '💾 إضافة البث'}
                </button>
                <button
                  onClick={() => {
                    setShowLiveForm(false);
                    setEditingLive(null);
                    resetLiveForm();
                  }}
                  style={styles.cancelLiveBtn}
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* ✅ قائمة البثوث */}
          <div style={styles.liveStreamsList}>
            {liveStreams.length === 0 ? (
              <div style={styles.emptyLive}>
                <span>📺</span>
                <p>لا توجد بثوث مباشرة</p>
                <p style={styles.emptySub}>اضغط على "إضافة بث جديد" لإنشاء بث</p>
              </div>
            ) : (
              liveStreams.map((stream) => {
                const isOpen = isStreamOpen(stream.scheduledTime);
                const subjectName = getSubjectName(stream.subjectId);
                const gradeLabel = getGradeLabel(stream.grade);
                
                return (
                  <div key={stream.id} style={{
                    ...styles.liveStreamCard,
                    opacity: stream.isVisible ? 1 : 0.5,
                    borderColor: isOpen ? '#10b981' : '#f59e0b',
                  }}>
                    <div style={styles.liveStreamHeader}>
                      <div style={styles.liveStreamInfo}>
                        <span style={styles.liveStreamIcon}>📺</span>
                        <div>
                          <h4 style={styles.liveStreamTitle}>{stream.title}</h4>
                          <div style={styles.liveStreamMeta}>
                            <span>📚 {subjectName}</span>
                            <span>📖 {gradeLabel}</span>
                            <span>📅 {formatDate(stream.scheduledTime)}</span>
                            <span style={{
                              ...styles.liveStreamStatus,
                              background: isOpen ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                              color: isOpen ? '#34d399' : '#f59e0b',
                            }}>
                              {isOpen ? '🟢 مفتوح الآن' : '⏳ سيُفتح قريباً'}
                            </span>
                            <span style={{
                              ...styles.liveStreamStatus,
                              background: stream.isVisible ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                              color: stream.isVisible ? '#60a5fa' : '#f87171',
                            }}>
                              {stream.isVisible ? '👁️ ظاهر' : '🚫 مخفي'}
                            </span>
                            {!stream.openToAll && (
                              <span style={{
                                ...styles.liveStreamStatus,
                                background: 'rgba(139,92,246,0.15)',
                                color: '#a78bfa',
                              }}>
                                👤 {stream.selectedStudents?.length || 0} طالب
                              </span>
                            )}
                            {stream.openToAll && (
                              <span style={{
                                ...styles.liveStreamStatus,
                                background: 'rgba(16,185,129,0.1)',
                                color: '#34d399',
                              }}>
                                👥 جميع الطلاب
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={styles.liveStreamActions}>
                        <button
                          onClick={() => toggleVisibility(stream)}
                          style={{
                            ...styles.liveActionBtn,
                            background: stream.isVisible ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            color: stream.isVisible ? '#f87171' : '#34d399',
                          }}
                        >
                          {stream.isVisible ? '🚫 إخفاء' : '👁️ إظهار'}
                        </button>
                        <button
                          onClick={() => editLiveStream(stream)}
                          style={{ ...styles.liveActionBtn, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          onClick={() => deleteLiveStream(stream.id)}
                          style={{ ...styles.liveActionBtn, background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </div>
                    {stream.description && (
                      <p style={styles.liveStreamDesc}>{stream.description}</p>
                    )}
                    {isOpen && stream.isVisible && (
                      <div style={styles.liveStreamLink}>
                        <span>🔗 رابط البث (للطلاب فقط):</span>
                        <a href={stream.link} target="_blank" style={styles.liveStreamLinkBtn}>
                          🚀 دخول البث
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
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

          <Link href="/teacher/exams" style={styles.cardLink}>
            <span style={styles.cardIcon}>📝</span>
            <span style={styles.cardTitle}>الامتحانات</span>
            <span style={styles.cardDesc}>إدارة امتحانات موادك</span>
          </Link>
        </div>

        {/* ✅ ✅ عرض مواد المدرس */}
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

// ✅ ✅ جميع الأنماط
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

  liveSection: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '20px 25px',
    marginBottom: '25px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  liveHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  liveTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
    margin: 0,
  },
  addLiveBtn: {
    padding: '8px 18px',
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  liveMessage: {
    padding: '10px 16px',
    borderRadius: '8px',
    marginBottom: '15px',
    border: '1px solid',
    fontSize: '14px',
  },
  liveFormContainer: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  liveFormTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: 'rgba(255,255,255,0.8)',
  },
  liveFormGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  liveFormGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  liveLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
  },
  liveInput: {
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    '&:focus': {
      outline: 'none',
      borderColor: 'rgba(139,92,246,0.5)',
    },
  },
  liveSelect: {
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    appearance: 'none',
    '&:focus': {
      outline: 'none',
      borderColor: 'rgba(139,92,246,0.5)',
    },
  },
  liveTextarea: {
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    resize: 'vertical' as const,
    fontFamily: '"Cairo", sans-serif',
    '&:focus': {
      outline: 'none',
      borderColor: 'rgba(139,92,246,0.5)',
    },
  },
  liveCheckbox: {
    width: '18px',
    height: '18px',
    accentColor: '#8b5cf6',
    cursor: 'pointer',
  },
  targetOptions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  targetBtn: {
    padding: '8px 20px',
    borderRadius: '8px',
    border: '2px solid',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    borderColor: 'rgba(255,255,255,0.1)',
    '&:hover': {
      transform: 'scale(1.02)',
    },
  },
  studentsCheckboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto' as const,
    padding: '10px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  studentCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
  },
  noStudentsText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    gridColumn: '1 / -1',
    textAlign: 'center' as const,
  },
  liveFormActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
  },
  saveLiveBtn: {
    padding: '8px 24px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  cancelLiveBtn: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  liveStreamsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginTop: '10px',
  },
  emptyLive: {
    textAlign: 'center' as const,
    padding: '30px 20px',
    color: 'rgba(255,255,255,0.3)',
  },
  emptySub: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.2)',
  },
  liveStreamCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    padding: '16px 20px',
    border: '2px solid rgba(255,255,255,0.05)',
    transition: 'all 0.3s',
  },
  liveStreamHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    gap: '10px',
  },
  liveStreamInfo: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  liveStreamIcon: {
    fontSize: '28px',
  },
  liveStreamTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  liveStreamMeta: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  liveStreamStatus: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
  },
  liveStreamActions: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  liveActionBtn: {
    padding: '4px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  liveStreamDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    margin: '8px 0 0 40px',
  },
  liveStreamLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    flexWrap: 'wrap' as const,
  },
  liveStreamLinkBtn: {
    padding: '4px 16px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },

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
    '&:focus': {
      borderColor: 'rgba(139,92,246,0.5)',
    },
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
  subjectsSection: {
    marginTop: '10px',
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
  actionBtn: {
    padding: '6px 14px',
    background: 'rgba(139,92,246,0.1)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.2)',
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
    select {
      background-color: rgba(255,255,255,0.05) !important;
      color: white !important;
    }
    select option {
      background-color: #1a1a2e !important;
      color: white !important;
      padding: 8px 12px !important;
    }
    select option:hover {
      background-color: #8b5cf6 !important;
      color: white !important;
    }
    select:focus {
      outline: none !important;
      border-color: rgba(139,92,246,0.5) !important;
    }
  `;
  document.head.appendChild(style);
}
