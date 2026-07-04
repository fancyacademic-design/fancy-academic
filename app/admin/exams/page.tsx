'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, 
  doc, getDoc, serverTimestamp, query, where, orderBy 
} from 'firebase/firestore';

export default function AdminExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  // ✅ نموذج الامتحان
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    type: 'exam',
    courseId: '',
    subjectId: '',
    grade: '1-prep',
    duration: 60,
    totalScore: 100,
    passingScore: 50,
    isActive: true,
    questions: [] as any[],
  });

  // ✅ نموذج السؤال
  const [questionForm, setQuestionForm] = useState({
    type: 'multiple_choice',
    text: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    score: 5,
  });
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  const grades = [
    { value: '1-prep', label: 'أولى إعدادي' },
    { value: '2-prep', label: 'ثانية إعدادي' },
    { value: '3-prep', label: 'ثالثة إعدادي' },
    { value: '1-secondary', label: 'أولى ثانوي' },
    { value: '2-secondary', label: 'ثانية ثانوي' },
    { value: '3-secondary', label: 'تالتة ثانوي' },
  ];

  const questionTypes = [
    { value: 'multiple_choice', label: 'اختيار من متعدد' },
    { value: 'true_false', label: 'صح / غلط' },
    { value: 'multi_select', label: 'اختيار أكثر من إجابة' },
    { value: 'short_answer', label: 'إجابة قصيرة' },
  ];

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    try {
      const parsed = JSON.parse(userData);
      setUserRole(parsed.role || '');
      
      loadData();
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const examsSnapshot = await getDocs(collection(db, 'exams'));
      const examsData = examsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      examsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB - dateA;
      });
      setExams(examsData);

      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCourses(coursesData);

      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsData = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubjects(subjectsData);

    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // ✅ إضافة سؤال للامتحان
  const addQuestionToExam = () => {
    if (!questionForm.text.trim()) {
      setMessage('⚠️ أدخل نص السؤال');
      return;
    }

    const newQuestion = {
      id: `q${examForm.questions.length + 1}`,
      type: questionForm.type,
      text: questionForm.text,
      options: questionForm.type === 'true_false' 
        ? ['صح', 'غلط'] 
        : questionForm.type === 'short_answer'
        ? []
        : questionForm.options.filter(opt => opt.trim() !== ''),
      correctAnswer: questionForm.type === 'multi_select'
        ? questionForm.correctAnswer.split(',').map(s => s.trim()).filter(s => s)
        : questionForm.correctAnswer,
      score: questionForm.score || 5,
    };

    if (editingQuestionIndex !== null) {
      const updatedQuestions = [...examForm.questions];
      updatedQuestions[editingQuestionIndex] = newQuestion;
      setExamForm({ ...examForm, questions: updatedQuestions });
      setEditingQuestionIndex(null);
    } else {
      setExamForm({ 
        ...examForm, 
        questions: [...examForm.questions, newQuestion] 
      });
    }

    setQuestionForm({ type: 'multiple_choice', text: '', options: ['', '', '', ''], correctAnswer: '', score: 5 });
    setShowQuestionForm(false);
    setMessage(`✅ تم ${editingQuestionIndex !== null ? 'تعديل' : 'إضافة'} السؤال`);
  };

  // ✅ حذف سؤال
  const removeQuestion = (index: number) => {
    const updatedQuestions = examForm.questions.filter((_, i) => i !== index);
    setExamForm({ ...examForm, questions: updatedQuestions });
  };

  // ✅ تعديل سؤال
  const editQuestion = (index: number) => {
    const q = examForm.questions[index];
    setQuestionForm({
      type: q.type,
      text: q.text,
      options: q.options || ['', '', '', ''],
      correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer || '',
      score: q.score || 5,
    });
    setEditingQuestionIndex(index);
    setShowQuestionForm(true);
  };

  // ✅ حفظ الامتحان
  const saveExam = async () => {
    if (!examForm.title.trim()) {
      setMessage('⚠️ أدخل عنوان الامتحان');
      return;
    }
    if (examForm.questions.length === 0) {
      setMessage('⚠️ أضف سؤالاً واحداً على الأقل');
      return;
    }

    try {
      const examData = {
        ...examForm,
        totalScore: examForm.questions.reduce((sum, q) => sum + (q.score || 0), 0),
        updatedAt: serverTimestamp(),
      };

      if (editingExam) {
        await updateDoc(doc(db, 'exams', editingExam.id), examData);
        setMessage('✅ تم تحديث الامتحان بنجاح');
      } else {
        examData.createdAt = serverTimestamp();
        const userData = localStorage.getItem('currentUser');
        if (userData) {
          try {
            const parsed = JSON.parse(userData);
            examData.createdBy = parsed.id || parsed.uid || 'unknown';
          } catch (e) {
            examData.createdBy = 'unknown';
          }
        }
        await addDoc(collection(db, 'exams'), examData);
        setMessage('✅ تم إضافة الامتحان بنجاح');
      }

      setShowForm(false);
      setEditingExam(null);
      setExamForm({
        title: '',
        description: '',
        type: 'exam',
        courseId: '',
        subjectId: '',
        grade: '1-prep',
        duration: 60,
        totalScore: 100,
        passingScore: 50,
        isActive: true,
        questions: [],
      });
      loadData();
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في الحفظ');
    }
  };

  // ✅ حذف امتحان
  const deleteExam = async (examId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الامتحان؟')) return;
    try {
      await deleteDoc(doc(db, 'exams', examId));
      setMessage('✅ تم حذف الامتحان');
      loadData();
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في الحذف');
    }
  };

  // ✅ عرض نتائج الامتحان
  const viewResults = async (examId: string) => {
    router.push(`/admin/exams/${examId}/results`);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/admin/dashboard" style={styles.backButton}>← لوحة التحكم</Link>
          <h1 style={styles.title}>📝 إدارة الامتحانات والواجبات</h1>
          <button onClick={() => { setShowForm(true); setEditingExam(null); }} style={styles.addButton}>
            ➕ إضافة جديد
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {message && (
          <div style={{
            ...styles.message,
            background: message.includes('✅') ? 'rgba(16,185,129,0.1)' : 
                        message.includes('⚠️') ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.includes('✅') ? '#34d399' : 
                  message.includes('⚠️') ? '#f59e0b' : '#f87171',
          }}>
            {message}
          </div>
        )}

        {/* ✅ نموذج إضافة/تعديل امتحان */}
        {showForm && (
          <div style={styles.formOverlay}>
            <div style={styles.formContainer}>
              <div style={styles.formHeader}>
                <h2>{editingExam ? '✏️ تعديل' : '➕ إضافة'} امتحان/واجب</h2>
                <button onClick={() => { setShowForm(false); setEditingExam(null); }} style={styles.closeButton}>✕</button>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label>العنوان *</label>
                  <input
                    type="text"
                    value={examForm.title}
                    onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                    placeholder="عنوان الامتحان"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>النوع</label>
                  <select
                    value={examForm.type}
                    onChange={(e) => setExamForm({ ...examForm, type: e.target.value })}
                    style={styles.select}
                  >
                    <option value="exam">امتحان</option>
                    <option value="assignment">واجب</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label>المادة</label>
                  <select
                    value={examForm.subjectId}
                    onChange={(e) => setExamForm({ ...examForm, subjectId: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">اختر المادة</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label>الكورس</label>
                  <select
                    value={examForm.courseId}
                    onChange={(e) => setExamForm({ ...examForm, courseId: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">اختر الكورس</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label>المرحلة</label>
                  <select
                    value={examForm.grade}
                    onChange={(e) => setExamForm({ ...examForm, grade: e.target.value })}
                    style={styles.select}
                  >
                    {grades.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label>المدة (دقائق)</label>
                  <input
                    type="number"
                    value={examForm.duration}
                    onChange={(e) => setExamForm({ ...examForm, duration: parseInt(e.target.value) || 0 })}
                    style={styles.input}
                    min="1"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>درجة النجاح</label>
                  <input
                    type="number"
                    value={examForm.passingScore}
                    onChange={(e) => setExamForm({ ...examForm, passingScore: parseInt(e.target.value) || 0 })}
                    style={styles.input}
                    min="0"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>الوصف</label>
                  <textarea
                    value={examForm.description}
                    onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                    placeholder="وصف الامتحان"
                    style={styles.textarea}
                    rows={2}
                  />
                </div>
              </div>

              {/* ✅ قسم الأسئلة */}
              <div style={styles.questionsSection}>
                <div style={styles.questionsHeader}>
                  <h3>📋 الأسئلة ({examForm.questions.length})</h3>
                  <button
                    onClick={() => { setShowQuestionForm(true); setEditingQuestionIndex(null); setQuestionForm({ type: 'multiple_choice', text: '', options: ['', '', '', ''], correctAnswer: '', score: 5 }); }}
                    style={styles.addQuestionButton}
                  >
                    ➕ إضافة سؤال
                  </button>
                </div>

                {examForm.questions.map((q, index) => (
                  <div key={index} style={styles.questionItem}>
                    <div style={styles.questionHeader}>
                      <span style={styles.questionNumber}>س{index + 1}</span>
                      <span style={styles.questionType}>{questionTypes.find(t => t.value === q.type)?.label || q.type}</span>
                      <span style={styles.questionScore}>{q.score} درجات</span>
                      <div style={styles.questionActions}>
                        <button onClick={() => editQuestion(index)} style={styles.editBtn}>✏️</button>
                        <button onClick={() => removeQuestion(index)} style={styles.deleteBtn}>🗑️</button>
                      </div>
                    </div>
                    <p style={styles.questionText}>{q.text}</p>
                    {q.options && q.options.length > 0 && (
                      <div style={styles.questionOptions}>
                        {q.options.map((opt, i) => (
                          <span key={i} style={styles.optionTag}>
                            {i + 1}. {opt} {Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) && '✅' : opt === q.correctAnswer && '✅'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={saveExam} style={styles.saveButton}>
                💾 حفظ الامتحان
              </button>
            </div>
          </div>
        )}

        {/* ✅ نموذج إضافة سؤال */}
        {showQuestionForm && (
          <div style={styles.questionFormOverlay}>
            <div style={styles.questionFormContainer}>
              <div style={styles.formHeader}>
                <h2>{editingQuestionIndex !== null ? '✏️ تعديل' : '➕ إضافة'} سؤال</h2>
                <button onClick={() => setShowQuestionForm(false)} style={styles.closeButton}>✕</button>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label>نوع السؤال</label>
                  <select
                    value={questionForm.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      setQuestionForm({
                        ...questionForm,
                        type,
                        options: type === 'true_false' ? ['صح', 'غلط'] : type === 'short_answer' ? [] : ['', '', '', ''],
                        correctAnswer: '',
                      });
                    }}
                    style={styles.select}
                  >
                    {questionTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label>الدرجة</label>
                  <input
                    type="number"
                    value={questionForm.score}
                    onChange={(e) => setQuestionForm({ ...questionForm, score: parseInt(e.target.value) || 0 })}
                    style={styles.input}
                    min="1"
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label>نص السؤال *</label>
                <textarea
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  placeholder="اكتب نص السؤال..."
                  style={styles.textarea}
                  rows={2}
                />
              </div>

              {questionForm.type !== 'short_answer' && questionForm.type !== 'true_false' && (
                <div style={styles.formGroup}>
                  <label>الخيارات</label>
                  {questionForm.options.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...questionForm.options];
                        newOptions[i] = e.target.value;
                        setQuestionForm({ ...questionForm, options: newOptions });
                      }}
                      placeholder={`خيار ${i + 1}`}
                      style={styles.input}
                    />
                  ))}
                </div>
              )}

              <div style={styles.formGroup}>
                <label>
                  {questionForm.type === 'multi_select' ? 'الإجابات الصحيحة (افصل بينها بفاصلة)' : 'الإجابة الصحيحة'}
                </label>
                {questionForm.type === 'true_false' ? (
                  <select
                    value={questionForm.correctAnswer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                    style={styles.select}
                  >
                    <option value="صح">صح</option>
                    <option value="غلط">غلط</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={questionForm.correctAnswer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                    placeholder={questionForm.type === 'multi_select' ? 'مثال: القاهرة, الجيزة' : 'اكتب الإجابة الصحيحة'}
                    style={styles.input}
                  />
                )}
              </div>

              <button onClick={addQuestionToExam} style={styles.saveButton}>
                {editingQuestionIndex !== null ? '💾 تحديث السؤال' : '💾 إضافة السؤال'}
              </button>
            </div>
          </div>
        )}

        {/* ✅ قائمة الامتحانات */}
        <div style={styles.examsList}>
          <h2 style={styles.sectionTitle}>📋 قائمة الامتحانات والواجبات</h2>
          <div style={styles.examsGrid}>
            {exams.map((exam) => (
              <div key={exam.id} style={styles.examCard}>
                <div style={styles.examHeader}>
                  <div style={styles.examInfo}>
                    <span style={styles.examType}>
                      {exam.type === 'exam' ? '📝 امتحان' : '📋 واجب'}
                    </span>
                    <h3 style={styles.examTitle}>{exam.title}</h3>
                  </div>
                  <span style={{
                    ...styles.examStatus,
                    background: exam.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: exam.isActive ? '#34d399' : '#f87171',
                  }}>
                    {exam.isActive ? '✅ نشط' : '⛔ غير نشط'}
                  </span>
                </div>

                <p style={styles.examDesc}>{exam.description || 'لا يوجد وصف'}</p>

                <div style={styles.examMeta}>
                  <span>📚 {subjects.find(s => s.id === exam.subjectId)?.name || 'بدون مادة'}</span>
                  <span>📖 {exam.questions?.length || 0} أسئلة</span>
                  <span>⏱️ {exam.duration} د</span>
                  <span>⭐ {exam.totalScore || 0} درجة</span>
                </div>

                <div style={styles.examActions}>
                  <button onClick={() => viewResults(exam.id)} style={styles.resultsButton}>
                    📊 النتائج
                  </button>
                  <button onClick={() => { setEditingExam(exam); setExamForm(exam); setShowForm(true); }} style={styles.editButton}>
                    ✏️ تعديل
                  </button>
                  <button onClick={() => deleteExam(exam.id)} style={styles.deleteButton}>
                    🗑️ حذف
                  </button>
                </div>
              </div>
            ))}
          </div>

          {exams.length === 0 && (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p>لا توجد امتحانات أو واجبات</p>
              <p style={styles.emptySub}>اضغط على "إضافة جديد" لإنشاء امتحان أو واجب</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const styles: any = {
  container: {
    minHeight: '100vh',
    background: '#0a0a14',
    color: 'white',
    fontFamily: '"Cairo", "Segoe UI", Tahoma, sans-serif',
    direction: 'rtl' as const,
  },
  loadingContainer: {
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
  addButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
    border: '1px solid',
    fontSize: '14px',
  },
  formOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    overflow: 'auto',
  },
  formContainer: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '24px',
    cursor: 'pointer',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
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
    // ✅ ✅ إصلاح ظهور النصوص في الـ select
    appearance: 'auto',
    '& option': {
      background: '#1a1a2e',
      color: 'white',
    },
  },
  textarea: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    resize: 'vertical' as const,
    fontFamily: '"Cairo", sans-serif',
  },
  questionsSection: {
    marginTop: '20px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  questionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  addQuestionButton: {
    padding: '6px 16px',
    background: 'rgba(16,185,129,0.15)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  questionItem: {
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    marginBottom: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  questionNumber: {
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
  },
  questionType: {
    padding: '2px 10px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    borderRadius: '12px',
    fontSize: '11px',
  },
  questionScore: {
    padding: '2px 10px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    borderRadius: '12px',
    fontSize: '11px',
  },
  questionActions: {
    display: 'flex',
    gap: '5px',
    marginRight: 'auto',
  },
  editBtn: {
    background: 'none',
    border: 'none',
    color: '#f59e0b',
    cursor: 'pointer',
    fontSize: '14px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '14px',
  },
  questionText: {
    margin: '5px 0 0 0',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
  },
  questionOptions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginTop: '5px',
  },
  optionTag: {
    padding: '2px 10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
  },
  saveButton: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '15px',
  },
  questionFormOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
    zIndex: 1001,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  questionFormContainer: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '600px',
    width: '100%',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  examsList: {
    marginTop: '30px',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  examsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  examCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  examHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  examInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  examType: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
  },
  examTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  examStatus: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
  },
  examDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    marginBottom: '10px',
  },
  examMeta: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap' as const,
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '15px',
  },
  examActions: {
    display: 'flex',
    gap: '8px',
  },
  resultsButton: {
    padding: '6px 16px',
    background: 'rgba(139,92,246,0.1)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  editButton: {
    padding: '6px 16px',
    background: 'rgba(245,158,11,0.1)',
    color: '#f59e0b',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  deleteButton: {
    padding: '6px 16px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
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
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    /* ✅ ✅ إصلاح ظهور خيارات الـ select */
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
      outline: 2px solid #8b5cf6 !important;
    }
  `;
  document.head.appendChild(style);
}