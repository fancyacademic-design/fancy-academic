'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isViewingStudent, setIsViewingStudent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');

  // دالة تنسيق آخر دخول
  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) {
      return 'لم يسجل دخول بعد';
    }
    
    try {
      let date = null;
      
      if (typeof lastLogin === 'string') {
        date = new Date(lastLogin);
      }
      else if (lastLogin && typeof lastLogin === 'object' && lastLogin.seconds !== undefined) {
        date = new Date(lastLogin.seconds * 1000);
      }
      else if (lastLogin && typeof lastLogin === 'object' && typeof lastLogin.toDate === 'function') {
        date = lastLogin.toDate();
      }
      else {
        return 'تاريخ غير صالح';
      }
      
      if (!date || isNaN(date.getTime())) {
        return 'تاريخ غير صالح';
      }
      
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
    } catch (error) {
      console.error('❌ خطأ في تنسيق التاريخ:', error);
      return 'تاريخ غير صالح';
    }
  };

  // دالة للحصول على اسم المرحلة
  const getGradeName = (gradeCode) => {
    const grades = {
      '1-prep': 'أولى إعدادي',
      '2-prep': 'ثانية إعدادي',
      '3-prep': 'ثالثة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي'
    };
    return grades[gradeCode] || gradeCode || 'غير محدد';
  };

  // قائمة المراحل بالترتيب المطلوب
  const gradeOrder = [
    { code: 'all', name: '📚 كل المراحل' },
    { code: '1-prep', name: '📘 أولى إعدادي' },
    { code: '2-prep', name: '📗 ثانية إعدادي' },
    { code: '3-prep', name: '📙 ثالثة إعدادي' },
    { code: '1-secondary', name: '📕 أولى ثانوي' },
    { code: '2-secondary', name: '📓 ثانية ثانوي' }
  ];

  // فلترة الطلاب حسب المرحلة والبحث
  const getFilteredStudents = () => {
    let filtered = students;
    
    // فلترة حسب المرحلة
    if (selectedGrade !== 'all') {
      filtered = filtered.filter(s => s.grade === selectedGrade);
    }
    
    // فلترة حسب البحث
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone?.includes(searchTerm)
      );
    }
    
    return filtered;
  };

  // تجميع الطلاب حسب المرحلة
  const getStudentsByGrade = () => {
    const filtered = getFilteredStudents();
    const grouped = {};
    
    filtered.forEach(student => {
      const gradeKey = student.grade || 'unknown';
      if (!grouped[gradeKey]) {
        grouped[gradeKey] = [];
      }
      grouped[gradeKey].push(student);
    });
    
    return grouped;
  };

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userData);
    if (user.role !== 'teacher') {
      router.push('/platform');
      return;
    }
    setTeacher(user);
    fetchStudents();
  }, [router]);

  const fetchStudents = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const studentsList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.status === 'active' || s.status === 'مفعل');
      
      // ترتيب الطلاب حسب الاسم
      studentsList.sort((a, b) => a.name?.localeCompare(b.name));
      setStudents(studentsList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const viewStudent = async (student: any) => {
    try {
      await addDoc(collection(db, "teacher_logs"), {
        teacherId: teacher.id,
        teacherName: teacher.name,
        studentId: student.id,
        studentName: student.name,
        action: 'view',
        timestamp: serverTimestamp()
      });

      localStorage.setItem('impersonating', JSON.stringify({
        studentId: student.id,
        studentName: student.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
        isImpersonating: true
      }));

      router.push(`/platform?impersonate=${student.id}`);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ في الدخول لحساب الطالب');
    }
  };

  const exitStudentView = () => {
    setIsViewingStudent(false);
    setSelectedStudent(null);
  };

  const studentsByGrade = getStudentsByGrade();
  const totalFiltered = getFilteredStudents().length;

  if (loading) {
    return <div style={styles.loading}>⏳ جاري تحميل الطلاب...</div>;
  }

  if (isViewingStudent && selectedStudent) {
    return (
      <div style={styles.container}>
        <div style={styles.impersonationBar}>
          <span>👁️ أنت تشاهد حساب: <strong>{selectedStudent.name}</strong></span>
          <span style={styles.lastLogin}>📅 آخر دخول للطالب: {formatLastLogin(selectedStudent.lastLogin)}</span>
          <button onClick={exitStudentView} style={styles.exitButton}>🚪 الخروج من حساب الطالب</button>
        </div>

        <div style={styles.studentDashboard}>
          <h2 style={styles.sectionTitle}>📊 تقدم {selectedStudent.name}</h2>
          <p style={styles.infoText}>📍 أنت الآن تشاهد حساب الطالب كمعلم. يمكنك رؤية كل ما يراه الطالب.</p>
          <Link href={`/platform?impersonate=${selectedStudent.id}`} style={styles.viewPlatformButton}>
            🚀 الذهاب لمنصة الطالب
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>👨‍🏫 لوحة تحكم المستر</h1>
        <p style={styles.subtitle}>مرحباً مستر بيشوي {teacher?.name}</p>
        <button onClick={() => {
          localStorage.removeItem('currentUser');
          localStorage.removeItem('impersonating');
          router.push('/login');
        }} style={styles.logoutButton}>🚪 تسجيل الخروج</button>
      </header>

      <div style={styles.main}>
        {/* شريط البحث */}
        <div style={styles.searchSection}>
          <input
            type="text"
            placeholder="🔍 بحث باسم الطالب أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <span style={styles.studentCount}>👥 {totalFiltered} طالب</span>
        </div>

        {/* أزرار المراحل */}
        <div style={styles.gradeButtons}>
          {gradeOrder.map(grade => (
            <button
              key={grade.code}
              onClick={() => setSelectedGrade(grade.code)}
              style={{
                ...styles.gradeButton,
                background: selectedGrade === grade.code ? '#3b82f6' : 'white',
                color: selectedGrade === grade.code ? 'white' : '#4b5563',
                borderColor: selectedGrade === grade.code ? '#3b82f6' : '#e5e7eb'
              }}
            >
              {grade.name}
            </button>
          ))}
        </div>

        {/* عرض الطلاب حسب المرحلة */}
        {totalFiltered === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📭</div>
            <p>لا يوجد طلاب في هذه المرحلة</p>
          </div>
        ) : (
          <div style={styles.gradesContainer}>
            {Object.keys(studentsByGrade).map(gradeKey => {
              const gradeStudents = studentsByGrade[gradeKey];
              const gradeName = getGradeName(gradeKey);
              
              return (
                <div key={gradeKey} style={styles.gradeSection}>
                  <div style={styles.gradeHeader}>
                    <h2 style={styles.gradeTitle}>📚 {gradeName}</h2>
                    <span style={styles.gradeCount}>{gradeStudents.length} طالب</span>
                  </div>
                  
                  <div style={styles.studentsGrid}>
                    {gradeStudents.map(student => (
                      <div key={student.id} style={styles.studentCard}>
                        <div style={styles.studentAvatar}>👤</div>
                        <div style={styles.studentInfo}>
                          <div style={styles.studentName}>{student.name}</div>
                          <div style={styles.studentPhone}>📱 {student.phone}</div>
                          <div style={styles.studentLastLogin}>📅 آخر دخول: {formatLastLogin(student.lastLogin)}</div>
                        </div>
                        <button onClick={() => viewStudent(student)} style={styles.viewButton}>
                          👁️ دخول
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: any = {
  container: { 
    minHeight: '100vh', 
    background: '#f8fafc', 
    direction: 'rtl', 
    fontFamily: 'Cairo, sans-serif' 
  },
  loading: { 
    textAlign: 'center', 
    padding: '50px', 
    fontSize: '20px',
    color: '#3b82f6' 
  },
  header: { 
    background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', 
    color: 'white', 
    padding: '30px', 
    textAlign: 'center', 
    position: 'relative' 
  },
  title: { 
    fontSize: '32px', 
    marginBottom: '10px' 
  },
  subtitle: { 
    fontSize: '18px', 
    opacity: 0.9 
  },
  logoutButton: { 
    position: 'absolute', 
    top: '20px', 
    left: '20px', 
    background: '#ef4444', 
    color: 'white', 
    border: 'none', 
    padding: '8px 16px', 
    borderRadius: '8px', 
    cursor: 'pointer' 
  },
  main: { 
    maxWidth: '1200px', 
    margin: '30px auto', 
    padding: '0 20px' 
  },
  searchSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  searchInput: { 
    flex: 1,
    padding: '12px 16px', 
    border: '2px solid #e5e7eb', 
    borderRadius: '12px', 
    fontSize: '15px',
    minWidth: '200px',
    outline: 'none',
    transition: 'all 0.3s',
    '&:focus': {
      borderColor: '#3b82f6'
    }
  },
  studentCount: {
    fontSize: '14px',
    color: '#6b7280',
    background: '#f3f4f6',
    padding: '6px 14px',
    borderRadius: '20px',
    whiteSpace: 'nowrap'
  },
  gradeButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '25px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e5e7eb'
  },
  gradeButton: {
    padding: '8px 18px',
    border: '2px solid',
    borderRadius: '30px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }
  },
  gradesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },
  gradeSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e5e7eb'
  },
  gradeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e5e7eb'
  },
  gradeTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  gradeCount: {
    fontSize: '13px',
    color: '#6b7280',
    background: '#f3f4f6',
    padding: '4px 12px',
    borderRadius: '20px'
  },
  studentsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
    gap: '12px' 
  },
  studentCard: { 
    background: '#f9fafb', 
    borderRadius: '12px', 
    padding: '14px 16px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    border: '1px solid #e5e7eb',
    transition: 'all 0.3s',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      borderColor: '#3b82f6'
    }
  },
  studentAvatar: { 
    width: '42px', 
    height: '42px', 
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
    borderRadius: '50%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: '18px', 
    color: 'white',
    flexShrink: 0
  },
  studentInfo: { 
    flex: 1,
    minWidth: 0
  },
  studentName: { 
    fontSize: '15px', 
    fontWeight: 'bold',
    marginBottom: '2px',
    color: '#1f2937'
  },
  studentPhone: { 
    fontSize: '12px', 
    color: '#6b7280' 
  },
  studentLastLogin: { 
    fontSize: '12px', 
    color: '#10b981', 
    marginTop: '2px' 
  },
  viewButton: { 
    padding: '6px 14px', 
    background: '#3b82f6', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
    whiteSpace: 'nowrap',
    transition: 'all 0.3s',
    '&:hover': {
      background: '#2563eb',
      transform: 'scale(1.02)'
    }
  },
  empty: { 
    textAlign: 'center', 
    padding: '50px', 
    color: '#9ca3af',
    background: 'white',
    borderRadius: '16px'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '10px'
  },
  impersonationBar: { 
    background: '#fef3c7', 
    padding: '15px 20px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    flexWrap: 'wrap', 
    gap: '15px', 
    borderBottom: '2px solid #f59e0b' 
  },
  lastLogin: { 
    background: '#d1fae5', 
    padding: '4px 12px', 
    borderRadius: '20px', 
    color: '#065f46' 
  },
  exitButton: { 
    padding: '8px 16px', 
    background: '#ef4444', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  studentDashboard: { 
    padding: '20px' 
  },
  sectionTitle: { 
    fontSize: '24px', 
    fontWeight: 'bold', 
    marginBottom: '20px' 
  },
  infoText: { 
    color: '#6b7280', 
    marginBottom: '20px' 
  },
  viewPlatformButton: { 
    display: 'inline-block', 
    padding: '12px 24px', 
    background: '#10b981', 
    color: 'white', 
    borderRadius: '10px', 
    textDecoration: 'none', 
    fontWeight: 'bold' 
  }
};