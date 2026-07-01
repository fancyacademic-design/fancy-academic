'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-auth';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';

export default function SendNotificationPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // بيانات الإشعار
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('info');
  const [targetType, setTargetType] = useState('all'); // all, grade, student
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [students, setStudents] = useState([]);
  
  // تحميل قائمة الطلاب
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const studentsList = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === 'active' || data.status === 'مفعل') {
            studentsList.push({
              id: doc.id,
              name: data.name,
              grade: data.grade
            });
          }
        });
        setStudents(studentsList);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !body.trim()) {
      setError('❌ العنوان والمحتوى مطلوبان');
      return;
    }
    
    if (targetType === 'grade' && !selectedGrade) {
      setError('❌ الرجاء اختيار الصف الدراسي');
      return;
    }
    
    if (targetType === 'student' && !selectedStudent) {
      setError('❌ الرجاء اختيار الطالب');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      // بناء بيانات الهدف
      let target = { type: targetType };
      
      if (targetType === 'grade') {
        target.grade = selectedGrade;
        target.gradeName = getGradeName(selectedGrade);
      } else if (targetType === 'student') {
        const student = students.find(s => s.id === selectedStudent);
        target.studentId = selectedStudent;
        target.studentName = student?.name || 'طالب';
      }
      
      // حفظ الإشعار في قاعدة البيانات
      await addDoc(collection(db, "notifications"), {
        title: title.trim(),
        body: body.trim(),
        type: type,
        target: target,
        sender: "أدمن المنصة",
        isRead: false,
        readBy: [],
        createdAt: serverTimestamp()
      });
      
      setMessage(`✅ تم إرسال الإشعار بنجاح إلى ${getTargetText()}`);
      setTitle('');
      setBody('');
      setType('info');
      
    } catch (err) {
      console.error(err);
      setError('❌ حدث خطأ في إرسال الإشعار');
    } finally {
      setLoading(false);
    }
  };
  
  const getGradeName = (gradeCode) => {
    const grades = {
      '1-prep': 'أولى إعدادي',
      '2-prep': 'ثانية إعدادي',
      '3-prep': 'ثالثة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي'
    };
    return grades[gradeCode] || gradeCode;
  };
  
  const getTargetText = () => {
    switch(targetType) {
      case 'all': return 'جميع الطلاب';
      case 'grade': return `طلاب ${getGradeName(selectedGrade)}`;
      case 'student': {
        const student = students.find(s => s.id === selectedStudent);
        return `الطالب ${student?.name || 'غير معروف'}`;
      }
      default: return '';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/admin" style={styles.backButton}>← العودة للأدمن</Link>
        <h1 style={styles.title}>🔔 إرسال إشعارات</h1>
        <p style={styles.subtitle}>إرسال إشعارات للطلاب (فردي / صف / الكل)</p>
      </div>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        {message && <div style={styles.successMessage}>{message}</div>}
        {error && <div style={styles.errorMessage}>{error}</div>}
        
        {/* عنوان الإشعار */}
        <div style={styles.field}>
          <label style={styles.label}>عنوان الإشعار *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: درس جديد تم إضافته"
            style={styles.input}
            maxLength="100"
          />
        </div>
        
        {/* محتوى الإشعار */}
        <div style={styles.field}>
          <label style={styles.label}>محتوى الإشعار *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="محتوى الإشعار..."
            style={styles.textarea}
            rows={4}
            maxLength="500"
          />
        </div>
        
        {/* نوع الإشعار */}
        <div style={styles.field}>
          <label style={styles.label}>نوع الإشعار</label>
          <div style={styles.typeButtons}>
            <button
              type="button"
              onClick={() => setType('info')}
              style={{...styles.typeBtn, ...(type === 'info' ? styles.typeBtnActive : {}), background: type === 'info' ? '#3b82f6' : '#f3f4f6', color: type === 'info' ? 'white' : '#4b5563'}}
            >
              ℹ️ معلومات
            </button>
            <button
              type="button"
              onClick={() => setType('success')}
              style={{...styles.typeBtn, ...(type === 'success' ? styles.typeBtnActive : {}), background: type === 'success' ? '#10b981' : '#f3f4f6', color: type === 'success' ? 'white' : '#4b5563'}}
            >
              ✅ نجاح
            </button>
            <button
              type="button"
              onClick={() => setType('warning')}
              style={{...styles.typeBtn, ...(type === 'warning' ? styles.typeBtnActive : {}), background: type === 'warning' ? '#f59e0b' : '#f3f4f6', color: type === 'warning' ? 'white' : '#4b5563'}}
            >
              ⚠️ تنبيه
            </button>
            <button
              type="button"
              onClick={() => setType('error')}
              style={{...styles.typeBtn, ...(type === 'error' ? styles.typeBtnActive : {}), background: type === 'error' ? '#ef4444' : '#f3f4f6', color: type === 'error' ? 'white' : '#4b5563'}}
            >
              ❌ خطأ
            </button>
          </div>
        </div>
        
        {/* جهة الإرسال */}
        <div style={styles.field}>
          <label style={styles.label}>إرسال إلى</label>
          <div style={styles.targetButtons}>
            <button
              type="button"
              onClick={() => setTargetType('all')}
              style={{...styles.targetBtn, ...(targetType === 'all' ? styles.targetBtnActive : {})}}
            >
              🌍 جميع الطلاب
            </button>
            <button
              type="button"
              onClick={() => setTargetType('grade')}
              style={{...styles.targetBtn, ...(targetType === 'grade' ? styles.targetBtnActive : {})}}
            >
              📚 طلاب صف دراسي
            </button>
            <button
              type="button"
              onClick={() => setTargetType('student')}
              style={{...styles.targetBtn, ...(targetType === 'student' ? styles.targetBtnActive : {})}}
            >
              👤 طالب محدد
            </button>
          </div>
        </div>
        
        {/* اختيار الصف */}
        {targetType === 'grade' && (
          <div style={styles.field}>
            <label style={styles.label}>اختر الصف الدراسي</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              style={styles.select}
            >
              <option value="">-- اختر الصف --</option>
              <option value="1-prep">أولى إعدادي</option>
              <option value="2-prep">ثانية إعدادي</option>
              <option value="3-prep">ثالثة إعدادي</option>
              <option value="1-secondary">أولى ثانوي</option>
              <option value="2-secondary">ثانية ثانوي</option>
            </select>
          </div>
        )}
        
        {/* اختيار طالب محدد */}
        {targetType === 'student' && (
          <div style={styles.field}>
            <label style={styles.label}>اختر الطالب</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              style={styles.select}
            >
              <option value="">-- اختر الطالب --</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} - {getGradeName(student.grade)}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* معاينة الإشعار */}
        <div style={styles.preview}>
          <div style={styles.previewTitle}>📱 معاينة الإشعار</div>
          <div style={{
            ...styles.previewCard,
            borderRight: `4px solid ${type === 'info' ? '#3b82f6' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#ef4444'}`
          }}>
            <div style={styles.previewHeader}>
              <span style={styles.previewType}>
                {type === 'info' && 'ℹ️ معلومات'}
                {type === 'success' && '✅ نجاح'}
                {type === 'warning' && '⚠️ تنبيه'}
                {type === 'error' && '❌ خطأ'}
              </span>
              <span style={styles.previewTarget}>{getTargetText()}</span>
            </div>
            <h3 style={styles.previewTitleText}>{title || 'عنوان الإشعار'}</h3>
            <p style={styles.previewBody}>{body || 'محتوى الإشعار س يظهر هنا...'}</p>
          </div>
        </div>
        
        {/* زر الإرسال */}
        <button
          type="submit"
          disabled={loading}
          style={styles.submitButton}
        >
          {loading ? 'جاري الإرسال...' : '🔔 إرسال الإشعار'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    direction: 'rtl',
    fontFamily: '"Cairo", sans-serif',
    background: '#f8fafc',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '30px'
  },
  backButton: {
    display: 'inline-block',
    marginBottom: '15px',
    color: '#3b82f6',
    textDecoration: 'none'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '5px'
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '14px'
  },
  form: {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  field: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.3s'
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '15px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  typeButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  typeBtn: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s'
  },
  typeBtnActive: {
    transform: 'scale(1.02)'
  },
  targetButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  targetBtn: {
    flex: 1,
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    background: 'white',
    color: '#4b5563',
    transition: 'all 0.3s'
  },
  targetBtnActive: {
    borderColor: '#3b82f6',
    background: '#eff6ff',
    color: '#2563eb'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '15px',
    background: 'white'
  },
  preview: {
    marginTop: '25px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0'
  },
  previewTitle: {
    fontWeight: '600',
    marginBottom: '12px',
    color: '#374151'
  },
  previewCard: {
    background: '#f9fafb',
    padding: '16px',
    borderRadius: '16px',
    borderRight: '4px solid #3b82f6'
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '12px'
  },
  previewType: {
    color: '#6b7280'
  },
  previewTarget: {
    color: '#9ca3af'
  },
  previewTitleText: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#1f2937'
  },
  previewBody: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5'
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'all 0.3s'
  },
  successMessage: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  errorMessage: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '20px',
    textAlign: 'center'
  }
};