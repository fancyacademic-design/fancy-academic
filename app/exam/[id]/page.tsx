'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  const [showStartPage, setShowStartPage] = useState(true);
  const [examStarted, setExamStarted] = useState(false);
  const [existingResult, setExistingResult] = useState<any>(null);
  const [canRetake, setCanRetake] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);

  // ✅ ✅ آلة حاسبة علمية
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('0');
  const [calcResult, setCalcResult] = useState('');
  const [calcHistory, setCalcHistory] = useState<string[]>([]);
  const [isRadians, setIsRadians] = useState(true);

  // ✅ ref للعداد
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const loadExam = async () => {
      if (!examId || !user) return;
      try {
        setLoading(true);
        
        console.log("🔍 جلب الامتحان بـ ID:", examId);
        
        const examRef = doc(db, 'exams', examId);
        const examSnap = await getDoc(examRef);
        
        console.log("📝 هل الامتحان موجود؟", examSnap.exists());
        
        if (!examSnap.exists()) {
          setError('⚠️ الامتحان غير موجود');
          setLoading(false);
          return;
        }
        
        const examData = { id: examSnap.id, ...examSnap.data() };
        console.log("✅ تم جلب الامتحان:", examData.title);
        setExam(examData);
        
        if (examData.courseId) {
          setCourseId(examData.courseId);
        }

        // ✅ جلب النتيجة السابقة
        const resultQuery = query(
          collection(db, 'exam_results'),
          where('examId', '==', examId),
          where('studentId', '==', user.id)
        );
        const resultSnap = await getDocs(resultQuery);
        
        if (!resultSnap.empty) {
          const lastResult = resultSnap.docs[resultSnap.docs.length - 1].data();
          setExistingResult(lastResult);
          
          if (lastResult.percentage >= 50) {
            setCanRetake(false);
            setShowStartPage(false);
            setExamStarted(false);
            setSubmitted(true);
            setResult({
              score: lastResult.score,
              totalScore: lastResult.totalScore,
              percentage: lastResult.percentage,
              passed: true,
            });
          } else {
            setCanRetake(true);
            setShowStartPage(true);
          }
        } else {
          setCanRetake(true);
          setShowStartPage(true);
        }
        
        setTimeLeft(examData.duration * 60);
        
      } catch (error) {
        console.error('❌ خطأ:', error);
        setError('❌ حدث خطأ في تحميل الامتحان');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      loadExam();
    }
  }, [examId, user]);

  // ✅ ✅ العداد
  useEffect(() => {
    if (!examStarted || timeLeft <= 0 || submitted) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [examStarted, submitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const gradeExam = () => {
    let totalScore = 0;
    let earnedScore = 0;
    const results: any = {};

    exam.questions.forEach((q: any) => {
      totalScore += q.score || 0;
      const userAnswer = answers[q.id];
      let isCorrect = false;

      if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
        results[q.id] = { userAnswer: null, isCorrect: false, score: 0 };
        return;
      }

      try {
        if (q.type === 'multiple_choice') {
          isCorrect = userAnswer === q.correctAnswer;
        } else if (q.type === 'true_false') {
          const userAnswerClean = String(userAnswer).trim().toLowerCase();
          const correctAnswerClean = String(q.correctAnswer).trim().toLowerCase();
          isCorrect = userAnswerClean === correctAnswerClean;
        } else if (q.type === 'multi_select') {
          const correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
          const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
          const sortedCorrect = [...correctAnswers].sort();
          const sortedUser = [...userAnswers].sort();
          isCorrect = JSON.stringify(sortedCorrect) === JSON.stringify(sortedUser);
        } else if (q.type === 'short_answer') {
          const userAnswerClean = String(userAnswer).trim().toLowerCase();
          const correctAnswerClean = String(q.correctAnswer).trim().toLowerCase();
          isCorrect = userAnswerClean === correctAnswerClean;
        }
      } catch (err) {
        console.error('❌ خطأ في تصحيح السؤال:', q.id, err);
        isCorrect = false;
      }

      if (isCorrect) {
        earnedScore += q.score || 0;
      }
      results[q.id] = { userAnswer, isCorrect, score: isCorrect ? q.score : 0 };
    });

    const percentage = Math.round((earnedScore / totalScore) * 100);
    const passed = percentage >= (exam.passingScore || 50);

    return {
      score: earnedScore,
      totalScore: totalScore,
      percentage: percentage,
      passed: passed,
      results: results,
    };
  };

  // ✅ ✅ التقديم
  const handleSubmit = async () => {
    if (submitted || submitting) {
      console.log('⏳ تم التقديم بالفعل');
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!exam || !exam.questions) {
      setError('❌ لا يوجد امتحان للتقديم');
      return;
    }

    const hasEmptyAnswers = exam.questions.some((q: any) => 
      answers[q.id] === undefined || 
      answers[q.id] === null || 
      answers[q.id] === ''
    );

    if (hasEmptyAnswers) {
      if (!confirm('⚠️ لم تجب على جميع الأسئلة. هل تريد التقديم؟')) {
        if (examStarted && timeLeft > 0 && !submitted) {
          timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 1) {
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                handleSubmit();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
        return;
      }
    }

    setSubmitting(true);
    
    try {
      const grading = gradeExam();

      await addDoc(collection(db, 'exam_results'), {
        examId: examId,
        studentId: user.id,
        studentName: user.name || 'طالب',
        answers: answers,
        score: grading.score,
        totalScore: grading.totalScore,
        percentage: grading.percentage,
        passed: grading.passed,
        timeSpent: exam.duration - (timeLeft / 60),
        submittedAt: serverTimestamp(),
        status: 'completed',
      });

      setResult(grading);
      setSubmitted(true);
      setExamStarted(false);
      setShowStartPage(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
    } catch (error) {
      console.error('❌ خطأ في التقديم:', error);
      setError('❌ حدث خطأ في التقديم، حاول مرة أخرى');
      
      if (examStarted && timeLeft > 0 && !submitted) {
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              handleSubmit();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startExam = () => {
    if (!canRetake) return;
    setShowStartPage(false);
    setExamStarted(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const getBackLink = () => {
    if (courseId) {
      return `/course/${courseId}`;
    }
    return '/platform';
  };

  // ✅ ✅ دوال الآلة الحاسبة
  const calcAppend = (value: string) => {
    if (calcInput === '0' && value !== '.' && value !== '(') {
      setCalcInput(value);
    } else {
      setCalcInput(prev => prev + value);
    }
  };

  const calcClear = () => {
    setCalcInput('0');
    setCalcResult('');
  };

  const calcBackspace = () => {
    setCalcInput(prev => prev.slice(0, -1) || '0');
  };

  const calcCalculate = () => {
    try {
      let expression = calcInput
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, `(${Math.PI})`)
        .replace(/e(?![xp])/g, `(${Math.E})`)
        .replace(/sin\(/g, `Math.sin(${isRadians ? '' : 'Math.PI/180*'}`)
        .replace(/cos\(/g, `Math.cos(${isRadians ? '' : 'Math.PI/180*'}`)
        .replace(/tan\(/g, `Math.tan(${isRadians ? '' : 'Math.PI/180*'}`)
        .replace(/log\(/g, `Math.log10(`)
        .replace(/ln\(/g, `Math.log(`)
        .replace(/√\(/g, `Math.sqrt(`)
        .replace(/²/g, `**2`)
        .replace(/³/g, `**3`);
      
      const openParens = (expression.match(/\(/g) || []).length;
      const closeParens = (expression.match(/\)/g) || []).length;
      for (let i = 0; i < openParens - closeParens; i++) {
        expression += ')';
      }
      
      const result = Function(`"use strict"; return (${expression})`)();
      
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(8);
        setCalcResult(formatted);
        setCalcHistory(prev => [...prev, `${calcInput} = ${formatted}`]);
        setCalcInput(formatted);
      } else {
        setCalcResult('خطأ');
      }
    } catch (error) {
      setCalcResult('خطأ');
    }
  };

  const calcScientific = (func: string) => {
    const value = parseFloat(calcInput) || 0;
    let result = 0;
    switch (func) {
      case 'sin':
        result = isRadians ? Math.sin(value) : Math.sin(value * Math.PI / 180);
        break;
      case 'cos':
        result = isRadians ? Math.cos(value) : Math.cos(value * Math.PI / 180);
        break;
      case 'tan':
        result = isRadians ? Math.tan(value) : Math.tan(value * Math.PI / 180);
        break;
      case 'log':
        result = Math.log10(value);
        break;
      case 'ln':
        result = Math.log(value);
        break;
      case 'sqrt':
        result = Math.sqrt(value);
        break;
      case 'square':
        result = value * value;
        break;
      case 'cube':
        result = value * value * value;
        break;
      case 'inv':
        result = 1 / value;
        break;
      case 'factorial':
        result = factorial(value);
        break;
      default:
        return;
    }
    if (isFinite(result)) {
      const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(8);
      setCalcResult(formatted);
      setCalcHistory(prev => [...prev, `${func}(${calcInput}) = ${formatted}`]);
      setCalcInput(formatted);
    }
  };

  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n <= 1) return 1;
    return n * factorial(n - 1);
  };

  const toggleRadians = () => {
    setIsRadians(!isRadians);
  };

  const getUniqueKey = (id: string, index: number) => {
    return `${id}-${index}`;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>جاري تحميل الامتحان...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>{error}</h2>
        <Link href={getBackLink()} style={styles.backLink}>← العودة</Link>
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={styles.errorContainer}>
        <h2>⚠️ الامتحان غير موجود</h2>
        <Link href={getBackLink()} style={styles.backLink}>← العودة</Link>
      </div>
    );
  }

  // ✅ صفحة النتيجة
  if (submitted && result) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href={getBackLink()} style={styles.backButton}>← العودة</Link>
            <h1 style={styles.title}>📊 نتيجة الامتحان</h1>
          </div>
        </header>
        <main style={styles.main}>
          <div style={styles.resultContainer}>
            <div style={{
              ...styles.resultCard,
              borderColor: result.passed ? '#10b981' : '#ef4444',
            }}>
              <div style={styles.resultIcon}>
                {result.passed ? '🎉' : '😢'}
              </div>
              <h2 style={styles.resultTitle}>
                {result.passed ? 'مبروك! لقد اجتزت الامتحان' : 'للأسف، لم تجتز الامتحان'}
              </h2>
              <div style={styles.resultScore}>
                <span style={styles.resultNumber}>{result.percentage}%</span>
                <span style={styles.resultDetails}>
                  {result.score} من {result.totalScore} درجة
                </span>
              </div>
              <div style={styles.resultBar}>
                <div style={{
                  ...styles.resultBarFill,
                  width: `${result.percentage}%`,
                  background: result.passed ? '#10b981' : '#ef4444',
                }} />
              </div>
              {result.passed && (
                <p style={styles.resultNote}>✅ لقد اجتزت الامتحان بنجاح، لا يمكنك إعادته</p>
              )}
              {!result.passed && (
                <p style={styles.resultNote}>❌ لم تجتز الامتحان، يمكنك المحاولة مرة أخرى</p>
              )}
              <Link href={getBackLink()} style={styles.doneButton}>
                🏠 العودة
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ✅ صفحة البداية
  if (showStartPage) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href={getBackLink()} style={styles.backButton}>← العودة</Link>
            <h1 style={styles.title}>{exam.type === 'exam' ? '📝' : '📋'} {exam.title}</h1>
          </div>
        </header>
        <main style={styles.main}>
          <div style={styles.startPage}>
            <div style={styles.startCard}>
              <div style={styles.startIcon}>📖</div>
              <h2 style={styles.startTitle}>{exam.title}</h2>
              
              <div style={styles.startDetails}>
                <div style={styles.startDetail}>
                  <span style={styles.startDetailIcon}>📝</span>
                  <span>{exam.questions?.length || 0} أسئلة</span>
                </div>
                <div style={styles.startDetail}>
                  <span style={styles.startDetailIcon}>⏱️</span>
                  <span>{exam.duration} دقائق</span>
                </div>
                <div style={styles.startDetail}>
                  <span style={styles.startDetailIcon}>⭐</span>
                  <span>{exam.totalScore || 0} درجة</span>
                </div>
                <div style={styles.startDetail}>
                  <span style={styles.startDetailIcon}>🎯</span>
                  <span>النجاح: {exam.passingScore || 50}%</span>
                </div>
              </div>

              {exam.description && (
                <p style={styles.startDescription}>{exam.description}</p>
              )}

              {existingResult && existingResult.percentage < 50 && (
                <div style={styles.retakeMessage}>
                  ⚠️ لقد حصلت على {existingResult.percentage}% في المحاولة السابقة، يمكنك إعادة المحاولة
                </div>
              )}

              {!canRetake && existingResult && existingResult.percentage >= 50 && (
                <div style={styles.passedMessage}>
                  ✅ لقد اجتزت هذا الامتحان مسبقاً، لا يمكنك إعادته
                </div>
              )}

              <button 
                onClick={startExam}
                disabled={!canRetake}
                style={{
                  ...styles.startButton,
                  opacity: canRetake ? 1 : 0.5,
                  cursor: canRetake ? 'pointer' : 'not-allowed',
                }}
              >
                {canRetake ? '🚀 ابدأ الامتحان' : '🔒 غير مسموح'}
              </button>

              <div style={styles.startNote}>
                <span>📌</span>
                <span>تأكد من أنك جاهز، لا يمكن إيقاف الوقت بعد البدء</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ✅ صفحة الامتحان
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href={getBackLink()} style={styles.backButton}>← العودة</Link>
          <h1 style={styles.title}>{exam.type === 'exam' ? '📝' : '📋'} {exam.title}</h1>
          <div style={styles.headerRight}>
            <div style={styles.timer}>⏱️ {formatTime(timeLeft)}</div>
            <button 
              onClick={() => setShowCalculator(!showCalculator)}
              style={styles.calcToggleButton}
              title="فتح الآلة الحاسبة"
            >
              🧮
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.examInfo}>
          <p>{exam.description || 'لا يوجد وصف'}</p>
          <div style={styles.examMeta}>
            <span>📚 {exam.subjectId || 'بدون مادة'}</span>
            <span>📖 {exam.questions?.length || 0} أسئلة</span>
            <span>⭐ {exam.totalScore || 0} درجة</span>
            <span>⏱️ {exam.duration} دقائق</span>
          </div>
        </div>

        <div style={styles.questionsContainer}>
          {exam.questions?.map((q: any, index: number) => {
            const uniqueKey = getUniqueKey(q.id, index);
            
            return (
              <div key={uniqueKey} style={styles.questionCard}>
                <div style={styles.questionHeader}>
                  <span style={styles.questionNumber}>سؤال {index + 1}</span>
                  <span style={styles.questionScore}>{q.score} درجات</span>
                  <span style={styles.questionType}>
                    {q.type === 'multiple_choice' ? 'اختيار من متعدد' : 
                     q.type === 'true_false' ? 'صح/غلط' : 
                     q.type === 'multi_select' ? 'اختيار أكثر من إجابة' : 'إجابة قصيرة'}
                  </span>
                </div>
                
                {q.image && (
                  <div style={styles.questionImageContainer}>
                    <img src={q.image} alt="سؤال" style={styles.questionImageLarge} />
                  </div>
                )}
                
                <p style={styles.questionText}>{q.text}</p>

                {q.type === 'multiple_choice' && (
                  <div style={styles.optionsContainer}>
                    {q.options?.map((opt: string, optIndex: number) => {
                      const optKey = `${uniqueKey}-opt-${optIndex}`;
                      return (
                        <label key={optKey} style={styles.optionLabel}>
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            onChange={() => handleAnswerChange(q.id, opt)}
                            checked={answers[q.id] === opt}
                            style={styles.radio}
                          />
                          {q.optionImages?.[optIndex] && (
                            <div style={styles.optionImageWrapper}>
                              <img src={q.optionImages[optIndex]} alt="خيار" style={styles.optionImageLarge} />
                            </div>
                          )}
                          {opt && <span style={styles.optionText}>{opt}</span>}
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === 'true_false' && (
                  <div style={styles.optionsContainer}>
                    {['صح', 'غلط'].map((opt, optIndex) => {
                      const optKey = `${uniqueKey}-tf-${optIndex}`;
                      return (
                        <label key={optKey} style={styles.optionLabel}>
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            onChange={() => handleAnswerChange(q.id, opt)}
                            checked={answers[q.id] === opt}
                            style={styles.radio}
                          />
                          {q.optionImages?.[optIndex] && (
                            <div style={styles.optionImageWrapper}>
                              <img src={q.optionImages[optIndex]} alt="خيار" style={styles.optionImageLarge} />
                            </div>
                          )}
                          <span style={styles.optionText}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === 'multi_select' && (
                  <div style={styles.optionsContainer}>
                    {q.options?.map((opt: string, optIndex: number) => {
                      const optKey = `${uniqueKey}-ms-${optIndex}`;
                      return (
                        <label key={optKey} style={styles.optionLabel}>
                          <input
                            type="checkbox"
                            name={q.id}
                            value={opt}
                            onChange={(e) => {
                              const current = answers[q.id] || [];
                              const newAnswers = e.target.checked
                                ? [...current, opt]
                                : current.filter((v: string) => v !== opt);
                              handleAnswerChange(q.id, newAnswers);
                            }}
                            checked={(answers[q.id] || []).includes(opt)}
                            style={styles.checkbox}
                          />
                          {q.optionImages?.[optIndex] && (
                            <div style={styles.optionImageWrapper}>
                              <img src={q.optionImages[optIndex]} alt="خيار" style={styles.optionImageLarge} />
                            </div>
                          )}
                          {opt && <span style={styles.optionText}>{opt}</span>}
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === 'short_answer' && (
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="اكتب إجابتك هنا..."
                    style={styles.shortAnswerInput}
                  />
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || submitted}
          style={{
            ...styles.submitButton,
            opacity: (submitting || submitted) ? 0.5 : 1,
            cursor: (submitting || submitted) ? 'not-allowed' : 'pointer',
          }}
        >
          {submitted ? '✅ تم التقديم' : 
           submitting ? '⏳ جاري التقديم...' : 
           '📨 تقديم الامتحان'}
        </button>
      </main>

      {/* ✅ ✅ نافذة الآلة الحاسبة */}
      {showCalculator && examStarted && (
        <div style={styles.calculatorOverlay} onClick={() => setShowCalculator(false)}>
          <div style={styles.calculatorContainer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.calculatorHeader}>
              <span style={styles.calculatorTitle}>🧮 آلة حاسبة علمية</span>
              <button 
                onClick={() => setShowCalculator(false)}
                style={styles.calculatorClose}
                title="إغلاق الآلة الحاسبة"
              >
                ✕
              </button>
            </div>
            
            <div style={styles.calculatorDisplay}>
              <div style={styles.calculatorHistory}>
                {calcHistory.slice(-3).map((h, i) => (
                  <div key={i} style={styles.calculatorHistoryItem}>{h}</div>
                ))}
              </div>
              <div style={styles.calculatorInput}>{calcInput}</div>
              {calcResult && (
                <div style={styles.calculatorResult}>={calcResult}</div>
              )}
            </div>

            <div style={styles.calculatorButtons}>
              <div style={styles.calcRow}>
                <button onClick={() => calcScientific('sin')} style={styles.calcSciBtn}>sin</button>
                <button onClick={() => calcScientific('cos')} style={styles.calcSciBtn}>cos</button>
                <button onClick={() => calcScientific('tan')} style={styles.calcSciBtn}>tan</button>
                <button onClick={toggleRadians} style={{
                  ...styles.calcSciBtn,
                  background: isRadians ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)',
                  borderColor: isRadians ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                }}>
                  {isRadians ? 'RAD' : 'DEG'}
                </button>
              </div>

              <div style={styles.calcRow}>
                <button onClick={() => calcScientific('log')} style={styles.calcSciBtn}>log</button>
                <button onClick={() => calcScientific('ln')} style={styles.calcSciBtn}>ln</button>
                <button onClick={() => calcScientific('sqrt')} style={styles.calcSciBtn}>√</button>
                <button onClick={() => calcScientific('square')} style={styles.calcSciBtn}>x²</button>
              </div>

              <div style={styles.calcRow}>
                <button onClick={() => calcScientific('cube')} style={styles.calcSciBtn}>x³</button>
                <button onClick={() => calcScientific('inv')} style={styles.calcSciBtn}>1/x</button>
                <button onClick={() => calcScientific('factorial')} style={styles.calcSciBtn}>x!</button>
                <button onClick={() => calcAppend('π')} style={styles.calcSciBtn}>π</button>
              </div>

              <div style={styles.calcRow}>
                <button onClick={calcClear} style={styles.calcClearBtn}>AC</button>
                <button onClick={calcBackspace} style={styles.calcBtn}>⌫</button>
                <button onClick={() => calcAppend('(')} style={styles.calcBtn}>(</button>
                <button onClick={() => calcAppend(')')} style={styles.calcBtn}>)</button>
              </div>

              <div style={styles.calcRow}>
                <button onClick={() => calcAppend('7')} style={styles.calcBtn}>7</button>
                <button onClick={() => calcAppend('8')} style={styles.calcBtn}>8</button>
                <button onClick={() => calcAppend('9')} style={styles.calcBtn}>9</button>
                <button onClick={() => calcAppend('÷')} style={styles.calcOpBtn}>÷</button>
              </div>

              <div style={styles.calcRow}>
                <button onClick={() => calcAppend('4')} style={styles.calcBtn}>4</button>
                <button onClick={() => calcAppend('5')} style={styles.calcBtn}>5</button>
                <button onClick={() => calcAppend('6')} style={styles.calcBtn}>6</button>
                <button onClick={() => calcAppend('×')} style={styles.calcOpBtn}>×</button>
              </div>

              <div style={styles.calcRow}>
                <button onClick={() => calcAppend('1')} style={styles.calcBtn}>1</button>
                <button onClick={() => calcAppend('2')} style={styles.calcBtn}>2</button>
                <button onClick={() => calcAppend('3')} style={styles.calcBtn}>3</button>
                <button onClick={() => calcAppend('-')} style={styles.calcOpBtn}>-</button>
              </div>

              <div style={styles.calcRow}>
                <button onClick={() => calcAppend('0')} style={styles.calcBtn}>0</button>
                <button onClick={() => calcAppend('.')} style={styles.calcBtn}>.</button>
                <button onClick={calcCalculate} style={styles.calcEqualsBtn}>=</button>
                <button onClick={() => calcAppend('+')} style={styles.calcOpBtn}>+</button>
              </div>
            </div>

            <div style={styles.calculatorFooter}>
              <span style={styles.calculatorHint}>💡 استخدم الأقواس للعمليات المركبة</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

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
  errorContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '20px',
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
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
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
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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
  timer: {
    padding: '8px 16px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  calcToggleButton: {
    padding: '10px 16px',
    background: 'rgba(59,130,246,0.15)',
    color: '#ffffff',
    border: '1px solid rgba(59,130,246,0.3)',
    borderRadius: '8px',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  examInfo: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '25px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  examMeta: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap' as const,
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '10px',
  },
  questionsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    marginBottom: '30px',
  },
  questionCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const,
    marginBottom: '10px',
  },
  questionNumber: {
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
  },
  questionScore: {
    padding: '2px 10px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    borderRadius: '12px',
    fontSize: '12px',
  },
  questionType: {
    padding: '2px 10px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    borderRadius: '12px',
    fontSize: '12px',
  },
  questionImageContainer: {
    width: '100%',
    marginBottom: '10px',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  questionImageLarge: {
    width: '100%',
    maxHeight: '400px',
    objectFit: 'contain' as const,
    borderRadius: '8px',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  questionText: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.9)',
    margin: '0 0 15px 0',
    lineHeight: 1.6,
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '8px',
    transition: 'all 0.2s',
    flexWrap: 'wrap' as const,
  },
  optionImageWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: '10px',
    overflow: 'hidden',
    flexShrink: 0,
    border: '2px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  optionImageLarge: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  optionText: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.8)',
  },
  radio: {
    width: '18px',
    height: '18px',
    accentColor: '#3b82f6',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#3b82f6',
    cursor: 'pointer',
  },
  shortAnswerInput: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '15px',
    fontFamily: '"Cairo", sans-serif',
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  startPage: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
  startCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center' as const,
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 0 60px rgba(0,0,0,0.2)',
  },
  startIcon: {
    fontSize: '64px',
    marginBottom: '15px',
  },
  startTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  startDetails: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '20px',
  },
  startDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
  },
  startDetailIcon: {
    fontSize: '18px',
  },
  startDescription: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '20px',
    lineHeight: 1.6,
  },
  retakeMessage: {
    padding: '12px 16px',
    background: 'rgba(245,158,11,0.1)',
    color: '#f59e0b',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    border: '1px solid rgba(245,158,11,0.2)',
  },
  passedMessage: {
    padding: '12px 16px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    border: '1px solid rgba(16,185,129,0.2)',
  },
  startButton: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginBottom: '15px',
  },
  startNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
  },
  resultContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
  resultCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center' as const,
    border: '3px solid',
    boxShadow: '0 0 60px rgba(0,0,0,0.2)',
  },
  resultIcon: {
    fontSize: '64px',
    marginBottom: '15px',
  },
  resultTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  resultScore: {
    marginBottom: '20px',
  },
  resultNumber: {
    fontSize: '48px',
    fontWeight: 'bold',
    display: 'block',
  },
  resultDetails: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    display: 'block',
    marginTop: '5px',
  },
  resultBar: {
    width: '100%',
    height: '8px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '25px',
  },
  resultBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 1s ease',
  },
  resultNote: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '20px',
  },
  doneButton: {
    display: 'inline-block',
    padding: '12px 30px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  calculatorOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(10px)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  calculatorContainer: {
    background: '#1a1a2e',
    borderRadius: '24px',
    padding: '30px',
    maxWidth: '420px',
    width: '100%',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
    animation: 'fadeIn 0.3s ease',
  },
  calculatorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  calculatorTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)',
  },
  calculatorClose: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '50%',
    color: '#f87171',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '6px 12px',
    transition: 'all 0.3s',
  },
  calculatorDisplay: {
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '12px',
    padding: '18px',
    marginBottom: '20px',
    minHeight: '90px',
    textAlign: 'left' as const,
    direction: 'ltr',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  calculatorHistory: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    minHeight: '30px',
  },
  calculatorHistoryItem: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.2)',
    padding: '2px 0',
  },
  calculatorInput: {
    fontSize: '30px',
    fontWeight: 'bold',
    color: 'white',
    wordBreak: 'break-all',
  },
  calculatorResult: {
    fontSize: '22px',
    color: '#FFD700',
    marginTop: '4px',
  },
  calculatorButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  calcRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: '8px',
  },
  calcBtn: {
    padding: '14px 0',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
  },
  calcSciBtn: {
    padding: '10px 0',
    background: 'rgba(59,130,246,0.12)',
    border: '1px solid rgba(59,130,246,0.15)',
    borderRadius: '10px',
    color: '#93bbfc',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
  },
  calcOpBtn: {
    padding: '14px 0',
    background: 'rgba(245,158,11,0.12)',
    border: '1px solid rgba(245,158,11,0.15)',
    borderRadius: '10px',
    color: '#fbbf24',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
  },
  calcClearBtn: {
    padding: '14px 0',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: '10px',
    color: '#f87171',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
  },
  calcEqualsBtn: {
    padding: '14px 0',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    border: 'none',
    borderRadius: '10px',
    color: '#0a0a14',
    fontSize: '24px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
  },
  calculatorFooter: {
    marginTop: '15px',
    textAlign: 'center' as const,
  },
  calculatorHint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.25)',
  },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}