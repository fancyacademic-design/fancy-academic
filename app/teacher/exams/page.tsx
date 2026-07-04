'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, 
  doc, getDoc, serverTimestamp, query, where, orderBy 
} from 'firebase/firestore';

// ✅ ✅ الفصل بين المحتوى والصفحة الرئيسية (لحل مشكلة Suspense)
function TeacherExamsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectIdFromUrl = searchParams.get('subjectId');
  
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [teacherId, setTeacherId] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // ✅ نموذج الامتحان (من غير نوع)
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    courseId: '',
    subjectId: subjectIdFromUrl || '',
    lessonId: '',
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
    image: '',
    options: ['', ''],
    optionImages: ['', ''],
    correctAnswer: '',
    score: 5,
  });
  const [selectedCorrectOptions, setSelectedCorrectOptions] = useState<string[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [optionImageFiles, setOptionImageFiles] = useState<{ [key: number]: File | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

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
      setTeacherId(parsed.id || parsed.uid);
      parsed.role = 'teacher';
      loadData(parsed.id || parsed.uid);
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, [subjectIdFromUrl]);

  const loadModules = async (courseId: string) => {
    if (!courseId) {
      setModules([]);
      return;
    }
    try {
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
      setModules(modulesData);
    } catch (error) {
      console.error('❌ خطأ في جلب الوحدات:', error);
    }
  };

  const loadLessonsByModule = async (moduleId: string) => {
    if (!moduleId) {
      setLessons([]);
      return;
    }
    try {
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
      setLessons(lessonsData);
    } catch (error) {
      console.error('❌ خطأ في جلب الدروس:', error);
    }
  };

  const loadData = async (teacherId: string) => {
    try {
      setLoading(true);
      
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

      if (subjectIdFromUrl) {
        console.log("✅ subjectIdFromUrl موجود:", subjectIdFromUrl);
        const found = subjectsData.find(s => s.id === subjectIdFromUrl);
        if (found) {
          setSelectedSubject(found);
          localStorage.setItem('lastSubjectId', subjectIdFromUrl);
        }
        setExamForm(prev => ({ ...prev, subjectId: subjectIdFromUrl }));
      } else {
        console.warn("⚠️ لا يوجد subjectId في الرابط");
        const savedSubjectId = localStorage.getItem('lastSubjectId');
        let fallbackSubject = null;
        
        if (savedSubjectId && subjectsData.find(s => s.id === savedSubjectId)) {
          fallbackSubject = subjectsData.find(s => s.id === savedSubjectId);
          console.log("✅ استخدمت subjectId من localStorage:", savedSubjectId);
        } else if (subjectsData.length > 0) {
          fallbackSubject = subjectsData[0];
          console.log("✅ استخدمت أول مادة:", fallbackSubject.id);
        }
        
        if (fallbackSubject) {
          setSelectedSubject(fallbackSubject);
          setExamForm(prev => ({ 
            ...prev, 
            subjectId: fallbackSubject.id
          }));
          localStorage.setItem('lastSubjectId', fallbackSubject.id);
        }
      }

      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCourses(coursesData);

      let examsQuery = collection(db, 'exams');
      if (subjectIdFromUrl) {
        examsQuery = query(
          collection(db, 'exams'),
          where('subjectId', '==', subjectIdFromUrl)
        );
      }
      const examsSnapshot = await getDocs(examsQuery);
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

      if (examForm.courseId) {
        await loadModules(examForm.courseId);
      }

    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    setQuestionForm(prev => ({
      ...prev,
      options: [...prev.options, ''],
      optionImages: [...prev.optionImages, ''],
    }));
  };

  const removeOption = (index: number) => {
    if (questionForm.options.length <= 2) {
      setMessage('⚠️ يجب أن يكون على الأقل خيارين');
      return;
    }
    const newOptions = questionForm.options.filter((_, i) => i !== index);
    const newOptionImages = questionForm.optionImages.filter((_, i) => i !== index);
    setQuestionForm(prev => ({
      ...prev,
      options: newOptions,
      optionImages: newOptionImages,
    }));
  };

  const toggleCorrectOption = (option: string) => {
    if (!option.trim()) {
      setMessage('⚠️ اكتب الخيار أولاً');
      return;
    }

    if (questionForm.type === 'multiple_choice') {
      setSelectedCorrectOptions([option]);
      setQuestionForm(prev => ({ ...prev, correctAnswer: option }));
    } else if (questionForm.type === 'multi_select') {
      setSelectedCorrectOptions(prev => {
        if (prev.includes(option)) {
          const newSelected = prev.filter(o => o !== option);
          setQuestionForm(prevForm => ({ ...prevForm, correctAnswer: newSelected.join(', ') }));
          return newSelected;
        } else {
          const newSelected = [...prev, option];
          setQuestionForm(prevForm => ({ ...prevForm, correctAnswer: newSelected.join(', ') }));
          return newSelected;
        }
      });
    }
  };

  const isCorrectOption = (option: string) => {
    if (questionForm.type === 'multiple_choice') {
      return questionForm.correctAnswer === option;
    } else if (questionForm.type === 'multi_select') {
      return selectedCorrectOptions.includes(option);
    }
    return false;
  };

  const addQuestionToExam = () => {
    if (!questionForm.text.trim() && !questionForm.image) {
      setMessage('⚠️ أدخل نص السؤال أو ارفع صورة');
      return;
    }

    let correctAnswer = questionForm.correctAnswer;
    
    if (questionForm.type === 'true_false') {
      if (!questionForm.correctAnswer) {
        setMessage('⚠️ يرجى اختيار الإجابة الصحيحة (صح أو غلط)');
        return;
      }
      correctAnswer = questionForm.correctAnswer;
    }

    const newQuestion = {
      id: `q${examForm.questions.length + 1}`,
      type: questionForm.type,
      text: questionForm.text,
      image: questionForm.image || '',
      options: questionForm.type === 'true_false' 
        ? ['صح', 'غلط'] 
        : questionForm.type === 'short_answer'
        ? []
        : questionForm.options.filter(opt => opt.trim() !== ''),
      optionImages: questionForm.type === 'true_false' 
        ? ['', ''] 
        : questionForm.type === 'short_answer'
        ? []
        : questionForm.optionImages.filter((_, i) => questionForm.options[i]?.trim() !== ''),
      correctAnswer: questionForm.type === 'multi_select'
        ? selectedCorrectOptions
        : correctAnswer,
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

    resetQuestionForm();
    setShowQuestionForm(false);
    setMessage(`✅ تم ${editingQuestionIndex !== null ? 'تعديل' : 'إضافة'} السؤال`);
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      type: 'multiple_choice',
      text: '',
      image: '',
      options: ['', ''],
      optionImages: ['', ''],
      correctAnswer: '',
      score: 5,
    });
    setSelectedCorrectOptions([]);
    setImageFile(null);
    setOptionImageFiles({});
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = examForm.questions.filter((_, i) => i !== index);
    setExamForm({ ...examForm, questions: updatedQuestions });
  };

  const editQuestion = (index: number) => {
    const q = examForm.questions[index];
    setQuestionForm({
      type: q.type,
      text: q.text || '',
      image: q.image || '',
      options: q.options || ['', ''],
      optionImages: q.optionImages || ['', ''],
      correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer || '',
      score: q.score || 5,
    });
    if (Array.isArray(q.correctAnswer)) {
      setSelectedCorrectOptions(q.correctAnswer);
    } else if (q.correctAnswer) {
      setSelectedCorrectOptions([q.correctAnswer]);
    } else {
      setSelectedCorrectOptions([]);
    }
    setEditingQuestionIndex(index);
    setShowQuestionForm(true);
  };

  const saveExam = async () => {
    console.log("✅✅✅ 1. تم الضغط على زر حفظ الامتحان");
    
    if (!examForm.title.trim()) {
      setMessage('⚠️ أدخل عنوان الامتحان');
      return;
    }
    
    if (examForm.questions.length === 0) {
      setMessage('⚠️ أضف سؤالاً واحداً على الأقل');
      return;
    }
    
    let finalSubjectId = examForm.subjectId;
    
    if (!finalSubjectId) {
      if (subjects.length > 0) {
        finalSubjectId = subjects[0].id;
        setExamForm(prev => ({ ...prev, subjectId: finalSubjectId }));
        setSelectedSubject(subjects[0]);
        localStorage.setItem('lastSubjectId', finalSubjectId);
        console.log("✅✅✅ تم تعيين subjectId من المواد:", finalSubjectId);
      } else {
        setMessage('⚠️ لا توجد مواد متاحة');
        return;
      }
    }

    try {
      setUploading(true);
      setMessage('⏳ جاري حفظ الامتحان...');

      const examData = {
        title: examForm.title,
        description: examForm.description || '',
        type: 'exam',
        courseId: examForm.courseId || '',
        subjectId: finalSubjectId,
        lessonId: examForm.lessonId || '',
        grade: examForm.grade || '1-prep',
        duration: Number(examForm.duration) || 60,
        passingScore: Number(examForm.passingScore) || 50,
        isActive: true,
        questions: examForm.questions,
        totalScore: examForm.questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0),
        teacherId: teacherId,
        updatedAt: serverTimestamp(),
      };

      if (editingExam) {
        console.log("✏️ جاري تعديل الامتحان:", editingExam.id);
        const examRef = doc(db, 'exams', editingExam.id);
        await updateDoc(examRef, examData);
        setMessage('✅ تم تعديل الامتحان بنجاح!');
      } else {
        console.log("➕ جاري إضافة امتحان جديد...");
        const docRef = await addDoc(collection(db, 'exams'), {
          ...examData,
          createdAt: serverTimestamp(),
        });
        setMessage('✅ تم إضافة الامتحان بنجاح!');
        
        if (examForm.courseId) {
          try {
            const courseRef = doc(db, 'courses', examForm.courseId);
            await updateDoc(courseRef, {
              examId: docRef.id,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            console.error('❌ خطأ في تحديث الكورس:', err);
          }
        }

        if (examForm.lessonId) {
          try {
            const lessonRef = doc(db, 'lessons', examForm.lessonId);
            await updateDoc(lessonRef, {
              examId: docRef.id,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            console.error('❌ خطأ في تحديث الدرس:', err);
          }
        }
      }
      
      setShowForm(false);
      setEditingExam(null);
      setExamForm({
        title: '',
        description: '',
        courseId: '',
        subjectId: finalSubjectId || '',
        lessonId: '',
        grade: '1-prep',
        duration: 60,
        totalScore: 100,
        passingScore: 50,
        isActive: true,
        questions: [],
      });
      setSelectedModuleId('');
      setModules([]);
      setLessons([]);
      
      await loadData(teacherId);
      
    } catch (error: any) {
      console.error('❌❌❌ خطأ في الحفظ:', error);
      setMessage('❌ حدث خطأ في الحفظ: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteExam = async (examId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الامتحان؟')) return;
    
    try {
      await deleteDoc(doc(db, 'exams', examId));
      setMessage('✅ تم حذف الامتحان');
      setExams(prev => prev.filter(e => e.id !== examId));
      await loadData(teacherId);
    } catch (error: any) {
      console.error('❌ خطأ في الحذف:', error);
      setMessage('❌ حدث خطأ في الحذف: ' + error.message);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setQuestionForm(prev => ({ ...prev, image: url }));
      setMessage('✅ تم رفع الصورة');
    };
    reader.readAsDataURL(file);
  };

  const handleOptionImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const newOptionImages = [...questionForm.optionImages];
      newOptionImages[index] = url;
      setQuestionForm(prev => ({ ...prev, optionImages: newOptionImages }));
      setMessage('✅ تم رفع صورة الخيار');
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  const filteredByGrade = courses.filter(c => c.grade === examForm.grade);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/teacher/dashboard" style={styles.backButton}>← لوحة التحكم</Link>
          <h1 style={styles.title}>📝 إدارة الامتحانات</h1>
          {selectedSubject && (
            <span style={styles.subjectBadge}>📚 {selectedSubject.name}</span>
          )}
          <button 
            onClick={() => { 
              setShowForm(true); 
              setEditingExam(null); 
              const savedSubjectId = localStorage.getItem('lastSubjectId') || subjectIdFromUrl || (subjects.length > 0 ? subjects[0].id : '');
              setExamForm({
                title: '',
                description: '',
                courseId: '',
                subjectId: savedSubjectId,
                lessonId: '',
                grade: '1-prep',
                duration: 60,
                totalScore: 100,
                passingScore: 50,
                isActive: true,
                questions: [],
              });
              console.log("✅✅✅ فتح نموذج جديد بـ subjectId:", savedSubjectId);
            }} 
            style={styles.addButton}
          >
            ➕ إضافة امتحان جديد
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

        {showForm && (
          <div style={styles.formOverlay}>
            <div style={styles.formContainer}>
              <div style={styles.formHeader}>
                <h2>{editingExam ? '✏️ تعديل' : '➕ إضافة'} امتحان</h2>
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
                  <label>المرحلة *</label>
                  <select
                    value={examForm.grade}
                    onChange={(e) => {
                      const grade = e.target.value;
                      setExamForm({ 
                        ...examForm, 
                        grade: grade,
                        courseId: '',
                        lessonId: '',
                      });
                      setSelectedModuleId('');
                      setModules([]);
                      setLessons([]);
                    }}
                    style={styles.select}
                  >
                    {grades.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label>الكورس</label>
                  <select
                    value={examForm.courseId}
                    onChange={async (e) => {
                      const courseId = e.target.value;
                      setExamForm({ 
                        ...examForm, 
                        courseId: courseId,
                        lessonId: '',
                      });
                      setSelectedModuleId('');
                      setLessons([]);
                      if (courseId) {
                        await loadModules(courseId);
                      } else {
                        setModules([]);
                      }
                    }}
                    style={styles.select}
                  >
                    <option value="">مطلق (شامل للكورس)</option>
                    {filteredByGrade.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  {filteredByGrade.length === 0 && examForm.grade && (
                    <span style={styles.hint}>لا توجد كورسات في هذه المرحلة</span>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label>الوحدة (اختياري)</label>
                  <select
                    value={selectedModuleId}
                    onChange={(e) => {
                      const moduleId = e.target.value;
                      setSelectedModuleId(moduleId);
                      setExamForm({ ...examForm, lessonId: '' });
                      if (moduleId) {
                        loadLessonsByModule(moduleId);
                      } else {
                        setLessons([]);
                      }
                    }}
                    style={styles.select}
                    disabled={!examForm.courseId}
                  >
                    <option value="">بدون وحدة</option>
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label>الدرس (اختياري)</label>
                  <select
                    value={examForm.lessonId}
                    onChange={(e) => setExamForm({ ...examForm, lessonId: e.target.value })}
                    style={styles.select}
                    disabled={!selectedModuleId}
                  >
                    <option value="">بدون درس</option>
                    {lessons.map(l => (
                      <option key={l.id} value={l.id}>{l.title}</option>
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

              <div style={styles.questionsSection}>
                <div style={styles.questionsHeader}>
                  <h3>📋 الأسئلة ({examForm.questions.length})</h3>
                  <button
                    onClick={() => { setShowQuestionForm(true); setEditingQuestionIndex(null); resetQuestionForm(); }}
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
                    {q.image && <img src={q.image} alt="سؤال" style={styles.questionImage} />}
                    <p style={styles.questionText}>{q.text}</p>
                    {q.options && q.options.length > 0 && (
                      <div style={styles.questionOptions}>
                        {q.options.map((opt, i) => (
                          <span key={i} style={styles.optionTag}>
                            {q.optionImages?.[i] && <img src={q.optionImages[i]} alt="خيار" style={styles.optionImage} />}
                            {i + 1}. {opt} {Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) && '✅' : opt === q.correctAnswer && '✅'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button 
                onClick={saveExam} 
                disabled={uploading}
                style={{
                  ...styles.saveButton,
                  opacity: uploading ? 0.5 : 1,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                }}
              >
                {uploading ? '⏳ جاري الحفظ...' : editingExam ? '💾 تحديث الامتحان' : '💾 حفظ الامتحان'}
              </button>
            </div>
          </div>
        )}

        {showQuestionForm && (
          <div style={styles.questionFormOverlay}>
            <div style={styles.questionFormContainer}>
              <div style={styles.formHeader}>
                <h2>{editingQuestionIndex !== null ? '✏️ تعديل' : '➕ إضافة'} سؤال</h2>
                <button onClick={() => { setShowQuestionForm(false); resetQuestionForm(); }} style={styles.closeButton}>✕</button>
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
                        options: type === 'true_false' ? ['صح', 'غلط'] : type === 'short_answer' ? [] : ['', ''],
                        optionImages: type === 'true_false' ? ['', ''] : type === 'short_answer' ? [] : ['', ''],
                        correctAnswer: '',
                      });
                      setSelectedCorrectOptions([]);
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
                <label>صورة السؤال (اختياري)</label>
                <div style={styles.imageUploadContainer}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={styles.fileInput}
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    style={styles.uploadButton}
                  >
                    📤 رفع صورة
                  </button>
                  {questionForm.image && (
                    <div style={styles.imagePreview}>
                      <img src={questionForm.image} alt="معاينة" style={styles.previewImage} />
                      <button 
                        onClick={() => setQuestionForm(prev => ({ ...prev, image: '' }))}
                        style={styles.removeImageBtn}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label>نص السؤال * (أو ارفع صورة)</label>
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
                  <label style={styles.optionLabelText}>
                    الخيارات - اضغط على "تحديد" بجانب الخيار لتجعله إجابة صحيحة
                    {questionForm.type === 'multiple_choice' && ' (اختر واحد فقط)'}
                    {questionForm.type === 'multi_select' && ' (اختر أكثر من واحد)'}
                  </label>
                  {questionForm.options.map((opt, i) => (
                    <div key={i} style={styles.optionRow}>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...questionForm.options];
                          newOptions[i] = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOptions });
                          if (questionForm.type === 'multiple_choice' && questionForm.correctAnswer === opt) {
                            setQuestionForm(prev => ({ ...prev, correctAnswer: e.target.value }));
                            setSelectedCorrectOptions([e.target.value]);
                          }
                        }}
                        placeholder={`خيار ${i + 1}`}
                        style={styles.optionInput}
                      />
                      
                      <div style={styles.optionImageUpload}>
                        <input
                          ref={(el) => { optionFileInputRefs.current[i] = el; }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleOptionImageUpload(i, e)}
                          style={styles.fileInputSmall}
                        />
                        <button 
                          type="button" 
                          onClick={() => optionFileInputRefs.current[i]?.click()}
                          style={styles.uploadSmallBtn}
                        >
                          🖼️
                        </button>
                        {questionForm.optionImages[i] && (
                          <img src={questionForm.optionImages[i]} alt="خيار" style={styles.optionPreview} />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!opt.trim()) {
                            setMessage('⚠️ اكتب الخيار أولاً');
                            return;
                          }
                          toggleCorrectOption(opt);
                        }}
                        style={{
                          ...styles.correctToggle,
                          background: isCorrectOption(opt) 
                            ? 'rgba(16,185,129,0.2)' 
                            : 'rgba(255,255,255,0.05)',
                          borderColor: isCorrectOption(opt) 
                            ? '#10b981' 
                            : 'rgba(255,255,255,0.1)',
                          color: isCorrectOption(opt) ? '#34d399' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {isCorrectOption(opt) ? '✅ صحيح' : '⬜ تحديد'}
                      </button>
                      {questionForm.options.length > 2 && (
                        <button onClick={() => removeOption(i)} style={styles.removeOptionBtn}>✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={addOption} style={styles.addOptionBtn}>➕ إضافة خيار</button>
                  
                  {questionForm.type === 'multi_select' && selectedCorrectOptions.length > 0 && (
                    <div style={styles.correctAnswersDisplay}>
                      <span>✅ الإجابات الصحيحة: </span>
                      {selectedCorrectOptions.map((opt, i) => (
                        <span key={i} style={styles.correctAnswerTag}>{opt}</span>
                      ))}
                    </div>
                  )}
                  {questionForm.type === 'multiple_choice' && questionForm.correctAnswer && (
                    <div style={styles.correctAnswersDisplay}>
                      <span>✅ الإجابة الصحيحة: </span>
                      <span style={styles.correctAnswerTag}>{questionForm.correctAnswer}</span>
                    </div>
                  )}
                </div>
              )}

              {questionForm.type === 'true_false' && (
                <div style={styles.formGroup}>
                  <label>الإجابة الصحيحة *</label>
                  <select
                    value={questionForm.correctAnswer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">-- اختر الإجابة --</option>
                    <option value="صح">✅ صح</option>
                    <option value="غلط">❌ غلط</option>
                  </select>
                  {!questionForm.correctAnswer && (
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#f59e0b',
                      marginTop: '4px'
                    }}>
                      ⚠️ يرجى اختيار الإجابة الصحيحة قبل حفظ السؤال
                    </span>
                  )}
                </div>
              )}

              {questionForm.type === 'short_answer' && (
                <div style={styles.formGroup}>
                  <label>الإجابة الصحيحة</label>
                  <input
                    type="text"
                    value={questionForm.correctAnswer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                    placeholder="اكتب الإجابة الصحيحة"
                    style={styles.input}
                  />
                </div>
              )}

              <button onClick={addQuestionToExam} style={styles.saveButton}>
                {editingQuestionIndex !== null ? '💾 تحديث السؤال' : '💾 إضافة السؤال'}
              </button>
            </div>
          </div>
        )}

        <div style={styles.examsList}>
          <h2 style={styles.sectionTitle}>
            📋 قائمة الامتحانات
            {selectedSubject && ` - ${selectedSubject.name}`}
          </h2>
          
          {exams.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p>لا توجد امتحانات</p>
              <p style={styles.emptySub}>اضغط على "إضافة امتحان جديد" لإنشاء امتحان</p>
            </div>
          ) : (
            <div style={styles.examsGrid}>
              {exams.map((exam) => {
                const course = courses.find(c => c.id === exam.courseId);
                const lesson = lessons.find(l => l.id === exam.lessonId);
                const subject = subjects.find(s => s.id === exam.subjectId);
                
                return (
                  <div key={exam.id} style={styles.examCard}>
                    <div style={styles.examHeader}>
                      <div style={styles.examInfo}>
                        <span style={styles.examType}>📝 امتحان</span>
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
                      <span>📚 {subject?.name || 'بدون مادة'}</span>
                      <span>📖 {grades.find(g => g.value === exam.grade)?.label || exam.grade}</span>
                      {course && <span>📕 {course.title}</span>}
                      {lesson && <span>📗 {lesson.title}</span>}
                      <span>📋 {exam.questions?.length || 0} أسئلة</span>
                      <span>⏱️ {exam.duration} د</span>
                      <span>⭐ {exam.totalScore || 0} درجة</span>
                    </div>

                    <div style={styles.examActions}>
                      <button 
                        onClick={() => { 
                          setEditingExam(exam);
                          setExamForm({
                            title: exam.title || '',
                            description: exam.description || '',
                            courseId: exam.courseId || '',
                            subjectId: exam.subjectId || subjectIdFromUrl || '',
                            lessonId: exam.lessonId || '',
                            grade: exam.grade || '1-prep',
                            duration: exam.duration || 60,
                            totalScore: exam.totalScore || 100,
                            passingScore: exam.passingScore || 50,
                            isActive: exam.isActive ?? true,
                            questions: exam.questions || [],
                          });
                          
                          if (exam.courseId) {
                            loadModules(exam.courseId);
                          }
                          
                          setShowForm(true); 
                        }} 
                        style={styles.editButton}
                      >
                        ✏️ تعديل
                      </button>
                      <button 
                        onClick={() => deleteExam(exam.id)} 
                        style={styles.deleteButton}
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ✅ ✅ الصفحة الرئيسية مع Suspense
export default function ExamsPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a14, #1a1a2e)',
        color: 'white',
        fontFamily: '"Cairo", "Segoe UI", sans-serif',
      }}>
        <div style={{textAlign: 'center'}}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,215,0,0.1)',
            borderTopColor: '#FFD700',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px',
          }} />
          <p>جاري تحميل الامتحانات...</p>
        </div>
      </div>
    }>
      <TeacherExamsContent />
    </Suspense>
  );
}

// ====================== STYLES ======================
const styles: any = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a14, #1a1a2e)',
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
    flexWrap: 'wrap' as const,
    gap: '10px',
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
  subjectBadge: {
    padding: '4px 12px',
    background: 'rgba(139,92,246,0.1)',
    color: '#a78bfa',
    borderRadius: '20px',
    fontSize: '13px',
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
  hint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '4px',
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
  questionImage: {
    maxWidth: '100px',
    maxHeight: '100px',
    borderRadius: '8px',
    marginBottom: '5px',
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
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
  },
  optionImage: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    objectFit: 'cover' as const,
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
    transition: 'all 0.3s',
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
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  imageUploadContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  fileInput: {
    display: 'none',
  },
  fileInputSmall: {
    display: 'none',
  },
  uploadButton: {
    padding: '6px 14px',
    background: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.3s',
  },
  uploadSmallBtn: {
    padding: '4px 8px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.15)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s',
  },
  imagePreview: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  previewImage: {
    width: '60px',
    height: '60px',
    borderRadius: '8px',
    objectFit: 'cover' as const,
  },
  removeImageBtn: {
    position: 'absolute' as const,
    top: '-6px',
    right: '-6px',
    background: 'rgba(239,68,68,0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabelText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '8px',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '5px',
    flexWrap: 'wrap' as const,
  },
  optionInput: {
    flex: 1,
    minWidth: '120px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '13px',
  },
  optionImageUpload: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  optionPreview: {
    width: '30px',
    height: '30px',
    borderRadius: '4px',
    objectFit: 'cover' as const,
  },
  correctToggle: {
    padding: '4px 12px',
    borderRadius: '6px',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap' as const,
  },
  correctAnswersDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    padding: '8px 12px',
    background: 'rgba(16,185,129,0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(16,185,129,0.1)',
    flexWrap: 'wrap' as const,
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
  },
  correctAnswerTag: {
    padding: '2px 10px',
    background: 'rgba(16,185,129,0.15)',
    color: '#34d399',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  removeOptionBtn: {
    background: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px 6px',
  },
  addOptionBtn: {
    padding: '4px 12px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    border: '1px dashed rgba(16,185,129,0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    marginTop: '5px',
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
    gap: '10px',
    flexWrap: 'wrap' as const,
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '12px',
  },
  examActions: {
    display: 'flex',
    gap: '8px',
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
    select option {
      background-color: #1a1a2e !important;
      color: white !important;
      padding: 8px 12px !important;
    }
  `;
  document.head.appendChild(style);
}
