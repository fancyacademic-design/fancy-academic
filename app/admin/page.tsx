'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { 
  collection, getDocs, updateDoc, doc, addDoc, 
  deleteDoc, query, where, orderBy, serverTimestamp 
} from 'firebase/firestore'
import Link from 'next/link'

// بيانات تسجيل الدخول - حسب طلبك
const ADMIN_EMAIL = "tomasmehany@almny"
const ADMIN_PASSWORD = "Tomasmehany@2009"
const AUTH_KEY = 'admin_authenticated'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState('students')
  
  // تحقق عند تحميل الصفحة
  useEffect(() => {
    const authStatus = localStorage.getItem(AUTH_KEY)
    if (authStatus === 'true') {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = (e) => {
    e.preventDefault()
    
    if (loginForm.email === ADMIN_EMAIL && loginForm.password === ADMIN_PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true')
      setIsAuthenticated(true)
      setLoginError('')
    } else {
      setLoginError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY)
    setIsAuthenticated(false)
    setLoginForm({ email: '', password: '' })
  }

  // صفحة الدخول
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>جاري التحميل...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <h1 style={styles.loginTitle}>👨‍💼 دخول الأدمن</h1>
            <p style={styles.loginSubtitle}>منصة علمني العلوم - توماس مهني</p>
          </div>

          <form onSubmit={handleLogin} style={styles.loginForm}>
            {loginError && (
              <div style={styles.errorMessage}>
                ❌ {loginError}
              </div>
            )}
            
            <div style={styles.formGroup}>
              <label style={styles.label}>البريد الإلكتروني</label>
              <input
                type="text"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                style={styles.input}
                placeholder="admin@.com"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>كلمة المرور</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                style={styles.input}
                placeholder="0000000000000000"
                required
              />
            </div>

            <button type="submit" style={styles.loginButton}>
              🔐 تسجيل الدخول
            </button>

            <div style={styles.loginHint}>
              <p>بأمثلة الدخول:</p>
              <p><strong>البريد:</strong> admin@.com</p>
              <p><strong>كلمة المرور:</strong> 00000000000</p>
              <p style={styles.warningText}>⚠️ تأكد من كتابة الحروف الكبيرة والصغيرة</p>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // صفحة الأدمن الرئيسية بعد الدخول
  const tabs = [
    { id: 'dashboard', name: 'لوحة التحكم', icon: '🏠' },
    { id: 'students', name: 'الطلاب', icon: '👨‍🎓' },
    { id: 'courses', name: 'الكورسات', icon: '📚' },
    { id: 'open-course', name: 'فتح كورس', icon: '🎓' },
    { id: 'videos', name: 'الفيديوهات', icon: '🎬' },
    { id: 'upgrade', name: 'ترقية المراحل', icon: '🚀' },
    { id: 'teacher-logs', name: 'سجل المعلمين', icon: '👨‍🏫' },
    { id: 'settings', name: 'الإعدادات', icon: '⚙️' }
  ]
  
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.title}>👨‍💼 لوحة تحكم الأدمن</h1>
            <p style={styles.subtitle}>علمني العلوم مستر بيشوي</p>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 تسجيل الخروج
          </button>
        </div>
      </header>

      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabButton,
                background: activeTab === tab.id ? '#3b82f6' : 'white',
                color: activeTab === tab.id ? 'white' : '#4b5563'
              }}
            >
              <span style={styles.tabIcon}>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>
        
        {/* ✅ الأزرار الجديدة - أدوات الإدارة */}
        <div style={styles.adminActions}>
          <Link href="/admin/send-notification" style={styles.notificationButton}>
            🔔 إشعارات
          </Link>
          <Link href="/admin/bot-monitor" style={styles.botMonitorButton}>
            🤖 مراقبة البوت
          </Link>
          <Link href="/admin/support-chat" style={styles.supportChatButton}>
            💬 رسائل الدعم
          </Link>
          <Link href="/platform" style={styles.backButton}>
            ← عرض المنصة
          </Link>
          <Link href="/admin/open-course" style={styles.specialButton}>
            🎓 فتح كورس لطالب
          </Link>
        </div>
      </div>

      <div style={styles.content}>
        {activeTab === 'dashboard' && (
          <div style={styles.tabContent}>
            <h2 style={styles.tabTitle}>🏠 لوحة التحكم الرئيسية</h2>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>0</div>
                <div style={styles.statLabel}>طلاب مفعلين</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>0</div>
                <div style={styles.statLabel}>كورسات</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>0</div>
                <div style={styles.statLabel}>دروس</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>0 ج.م</div>
                <div style={styles.statLabel}>إجمالي الإيرادات</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && <StudentsTab />}
        {activeTab === 'courses' && <CoursesTab />}
        {activeTab === 'open-course' && <OpenCourseTab />}
        {activeTab === 'videos' && <VideosTab />}
        {activeTab === 'upgrade' && <UpgradeTab />}
        {activeTab === 'teacher-logs' && <TeacherLogs />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

// ============================================
// UpgradeTab - ترقية المراحل
// ============================================
function UpgradeTab() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [message, setMessage] = useState('')

  const gradeOrder = [
    { code: '1-prep', name: 'أولى إعدادي' },
    { code: '2-prep', name: 'ثانية إعدادي' },
    { code: '3-prep', name: 'ثالثة إعدادي' },
    { code: '1-secondary', name: 'أولى ثانوي' },
    { code: '2-secondary', name: 'ثانية ثانوي' }
  ]

  const fetchStudents = async () => {
  try {
    setLoading(true)
    const snapshot = await getDocs(collection(db, "users"))
    const studentsList = []
    snapshot.forEach(doc => {
      const data = doc.data()
      // خلي الفلترة واسعة عشان نشوف كل الطلاب
      if (data.status === 'active' || data.status === 'مفعل' || data.status === 'نشط') {
        studentsList.push({
          id: doc.id,
          name: data.name,
          grade: data.grade,
          status: data.status
        })
      }
    })
    console.log('📊 عدد الطلاب:', studentsList.length)
    console.log('📊 الطلاب:', studentsList)
    setStudents(studentsList)
  } catch (error) {
    console.error(error)
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
    fetchStudents()
  }, [])

  const getGradeName = (gradeCode) => {
    const grades = {
      '1-prep': 'أولى إعدادي',
      '2-prep': 'ثانية إعدادي',
      '3-prep': 'ثالثة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي'
    }
    return grades[gradeCode] || gradeCode
  }

  const getGradeCount = (gradeCode) => {
    return students.filter(s => s.grade === gradeCode).length
  }

  const handleUpgrade = async (fromGrade) => {
  const currentIndex = gradeOrder.findIndex(g => g.code === fromGrade)
  if (currentIndex === gradeOrder.length - 1) {
    alert('⚠️ هذه هي أعلى مرحلة، لا يمكن الترقية')
    return
  }

  const toGrade = gradeOrder[currentIndex + 1]
  const fromName = getGradeName(fromGrade)
  const toName = getGradeName(toGrade.code)

  // ✅ جيب طلاب المرحلة الحالية
  const studentsToUpgrade = students.filter(s => s.grade === fromGrade)
  console.log(`🔍 طلاب ${fromName}:`, studentsToUpgrade.length, studentsToUpgrade)

  if (studentsToUpgrade.length === 0) {
    setMessage(`❌ لا يوجد طلاب في ${fromName}`)
    return
  }

  if (!confirm(`⚠️ هل أنت متأكد من ترقية ${studentsToUpgrade.length} طالب من ${fromName} إلى ${toName}؟\n\nهذا الإجراء لا يمكن التراجع عنه!`)) {
    return
  }

  setUpgrading(true)
  setMessage('')

  try {
    let updated = 0
    for (const student of studentsToUpgrade) {
      try {
        console.log(`🔄 ترقية ${student.name} (${student.grade}) → ${toGrade.code}`)
        await updateDoc(doc(db, "users", student.id), {
          grade: toGrade.code,
          year: toGrade.code,
          updatedAt: serverTimestamp()
        })
        updated++
      } catch (err) {
        console.error(`❌ خطأ في ترقية ${student.name}:`, err)
      }
    }

    setMessage(`✅ تم ترقية ${updated} طالب من ${fromName} إلى ${toName}`)
    await fetchStudents()
  } catch (error) {
    console.error(error)
    setMessage('❌ حدث خطأ في الترقية')
  } finally {
    setUpgrading(false)
  }
}
  if (loading) {
    return <div style={styles.loadingText}>جاري التحميل...</div>
  }

  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>🚀 ترقية المراحل الدراسية</h2>
      <p style={styles.upgradeDesc}>
        اختر المرحلة التي تريد ترقية طلابها إلى المرحلة التالية (مثلاً: أولى إعدادي → ثانية إعدادي)
      </p>

      {message && (
        <div style={{
          ...styles.message,
          background: message.includes('✅') ? '#d1fae5' : '#fee2e2',
          color: message.includes('✅') ? '#065f46' : '#991b1b'
        }}>
          {message}
        </div>
      )}

      <div style={styles.upgradeGrid}>
        {gradeOrder.map((grade, index) => {
          const count = getGradeCount(grade.code)
          const isLast = index === gradeOrder.length - 1
          
          return (
            <div key={grade.code} style={styles.upgradeCard}>
              <div style={styles.upgradeCardHeader}>
                <span style={styles.upgradeIcon}>📚</span>
                <div>
                  <h3 style={styles.upgradeCardTitle}>{grade.name}</h3>
                  <span style={styles.upgradeCount}>{count} طالب</span>
                </div>
              </div>
              
              {isLast ? (
                <div style={styles.upgradeDisabled}>
                  ⏳ أعلى مرحلة
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(grade.code)}
                  disabled={upgrading || count === 0}
                  style={{
                    ...styles.upgradeButton,
                    opacity: (upgrading || count === 0) ? 0.5 : 1,
                    cursor: (upgrading || count === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {upgrading ? '⏳ جاري الترقية...' : `🚀 ترقية إلى ${gradeOrder[index + 1].name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// TeacherLogs - سجل دخول المعلمين
// ============================================
function TeacherLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, "teacher_logs"), orderBy("timestamp", "desc"))
        const querySnapshot = await getDocs(q)
        const logsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setLogs(logsList)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  if (loading) return <div style={styles.loadingText}>جاري التحميل...</div>

  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>👨‍🏫 سجل دخول المعلمين</h2>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>المعلم</th>
              <th style={styles.th}>الطالب</th>
              <th style={styles.th}>الإجراء</th>
              <th style={styles.th}>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={log.id} style={styles.tr}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={styles.td}>{log.teacherName}</td>
                <td style={styles.td}>{log.studentName}</td>
                <td style={styles.td}>{log.action === 'view' ? '👁️ مشاهدة' : log.action}</td>
                <td style={styles.td}>{new Date(log.timestamp?.seconds * 1000).toLocaleString('ar-EG')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================
// StudentsTab المعدل مع آخر دخول
// ============================================
function StudentsTab() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [activeStudentView, setActiveStudentView] = useState('pending')

  const formatLastLogin = (lastLogin) => {
  if (!lastLogin) {
    return '❌ لم يسجل دخول بعد';
  }
  
  try {
    let date = null;
    
    // 1️⃣ لو هو نص (string)
    if (typeof lastLogin === 'string') {
      date = new Date(lastLogin);
    }
    // 2️⃣ لو هو Timestamp من Firebase (obiect فيه seconds)
    else if (lastLogin && typeof lastLogin === 'object' && lastLogin.seconds !== undefined) {
      date = new Date(lastLogin.seconds * 1000);
    }
    // 3️⃣ لو هو Timestamp مع toDate()
    else if (lastLogin && typeof lastLogin === 'object' && typeof lastLogin.toDate === 'function') {
      date = lastLogin.toDate();
    }
    // 4️⃣ لو حاجة تانية
    else {
      return '❌ تاريخ غير صالح';
    }
    
    // التحقق من صحة التاريخ
    if (!date || isNaN(date.getTime())) {
      return '❌ تاريخ غير صالح';
    }
    
    return `✅ ${date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    
  } catch (error) {
    console.error('❌ خطأ في تنسيق التاريخ:', error);
    return '❌ تاريخ غير صالح';
  }
};
  const fetchStudents = async () => {
  try {
    setLoading(true)
    console.log('🔍 جاري جلب الطلاب...')
    
    const querySnapshot = await getDocs(collection(db, "users"))
    const studentsList: any[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      
      // تأكد من وجود lastLogin
      let lastLogin = data.lastLogin || null;
      
      // لو lastLogin نص "لم يسجل" حوله لـ null
      if (typeof lastLogin === 'string' && (lastLogin.includes('لم يسجل') || lastLogin.includes('يسجل'))) {
        lastLogin = null;
      }
      
      studentsList.push({
        id: doc.id,
        name: data.name || 'غير معروف',
        phone: data.phone || 'بدون رقم',
        grade: data.grade || 'غير محدد',
        status: data.status || 'pending',
        createdAt: data.createdAt || new Date().toISOString(),
        activatedAt: data.activatedAt || null,
        lastLogin: lastLogin
      })
    })
    
    console.log('📊 عدد الطلاب:', studentsList.length)
    setStudents(studentsList)
    setMessage(`✅ تم تحميل ${studentsList.length} طالب`)
  } catch (error) {
    console.error('❌ خطأ:', error)
    setMessage('❌ حدث خطأ في جلب البيانات')
  } finally {
    setLoading(false)
  }
};

  const activateStudent = async (studentId: string, studentName: string) => {
    try {
      const studentRef = doc(db, "users", studentId)
      await updateDoc(studentRef, { 
        status: 'active',
        activatedAt: new Date().toISOString()
      })
      setMessage(`✅ تم تفعيل حساب ${studentName}`)
      fetchStudents()
    } catch (error) {
      setMessage('❌ حدث خطأ في التفعيل')
    }
  }

  const rejectStudent = async (studentId: string, studentName: string) => {
    try {
      const studentRef = doc(db, "users", studentId)
      await updateDoc(studentRef, { status: 'rejected' })
      setMessage(`❌ تم رفض حساب ${studentName}`)
      fetchStudents()
    } catch (error) {
      setMessage('❌ حدث خطأ في الرفض')
    }
  }

  const deleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`هل أنت متأكد من حذف الطالب "${studentName}"؟`)) return
    
    try {
      await deleteDoc(doc(db, "users", studentId))
      setMessage(`✅ تم حذف الطالب "${studentName}"`)
      fetchStudents()
    } catch (error) {
      setMessage('❌ حدث خطأ في حذف الطالب')
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const pendingStudents = students.filter(s => s.status === 'pending')
  const activeStudents = students.filter(s => s.status === 'active')
  const rejectedStudents = students.filter(s => s.status === 'rejected')

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'غير معروف'
    }
  }

  const getGradeName = (gradeCode: string) => {
    const grades: { [key: string]: string } = {
      '1-prep': 'أولى إعدادي',
      '2-prep': 'ثانية إعدادي',
      '3-prep': 'ثالثة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي'
    }
    return grades[gradeCode] || gradeCode
  }

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <h2 style={styles.tabTitle}>👨‍🎓 إدارة الطلاب</h2>
        <button onClick={fetchStudents} style={styles.refreshButton}>
          🔄 تحديث
        </button>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          background: message.startsWith('✅') ? '#d4fae5' : '#fee2e2',
          color: message.startsWith('✅') ? '#065f46' : '#991b1b'
        }}>
          {message}
        </div>
      )}

      <div style={styles.viewTabs}>
        <button
          onClick={() => setActiveStudentView('pending')}
          style={{
            ...styles.viewTabButton,
            background: activeStudentView === 'pending' ? '#3b82f6' : '#f3f4f6',
            color: activeStudentView === 'pending' ? 'white' : '#4b5563'
          }}
        >
          ⏳ الطلبات المعلقة ({pendingStudents.length})
        </button>
        <button
          onClick={() => setActiveStudentView('active')}
          style={{
            ...styles.viewTabButton,
            background: activeStudentView === 'active' ? '#10b981' : '#f3f4f6',
            color: activeStudentView === 'active' ? 'white' : '#4b5563'
          }}
        >
          ✅ الطلاب المفعلين ({activeStudents.length})
        </button>
        <button
          onClick={() => setActiveStudentView('rejected')}
          style={{
            ...styles.viewTabButton,
            background: activeStudentView === 'rejected' ? '#ef4444' : '#f3f4f6',
            color: activeStudentView === 'rejected' ? 'white' : '#4b5563'
          }}
        >
          ❌ الطلاب المرفوضين ({rejectedStudents.length})
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{pendingStudents.length}</div>
          <div style={styles.statLabel}>طلبات معلقة</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{activeStudents.length}</div>
          <div style={styles.statLabel}>طلاب مفعلين</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{rejectedStudents.length}</div>
          <div style={styles.statLabel}>طلاب مرفوضين</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{students.length}</div>
          <div style={styles.statLabel}>إجمالي الطلاب</div>
        </div>
      </div>

      {/* عرض الطلبات المعلقة */}
      {activeStudentView === 'pending' && (
        <>
          <h3 style={styles.sectionTitle}>⏳ طلبات التسجيل المعلقة</h3>
          {loading ? (
            <p style={styles.loadingText}>جاري تحميل البيانات...</p>
          ) : pendingStudents.length === 0 ? (
            <p style={styles.emptyText}>لا توجد طلبات معلقة</p>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>الاسم</th>
                    <th style={styles.th}>رقم الهاتف</th>
                    <th style={styles.th}>الصف</th>
                    <th style={styles.th}>تاريخ التسجيل</th>
                    <th style={styles.th}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingStudents.map(student => (
                    <tr key={student.id} style={styles.tr}>
                      <td style={styles.td}>
                        <strong>{student.name}</strong>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.phoneNumber}>{student.phone}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.gradeBadge}>{getGradeName(student.grade)}</span>
                      </td>
                      <td style={styles.td}>
                        {formatDate(student.createdAt)}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button onClick={() => activateStudent(student.id, student.name)} style={styles.activateBtn}>
                            ✅ قبول
                          </button>
                          <button onClick={() => rejectStudent(student.id, student.name)} style={styles.rejectBtn}>
                            ❌ رفض
                          </button>
                          <button 
                            onClick={() => deleteStudent(student.id, student.name)}
                            style={styles.deleteBtn}
                          >
                            🗑️ حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* عرض الطلاب المفعلين - مع آخر دخول */}
      {activeStudentView === 'active' && (
        <>
          <h3 style={styles.sectionTitle}>✅ الطلاب المفعلين</h3>
          {loading ? (
            <p style={styles.loadingText}>جاري تحميل البيانات...</p>
          ) : activeStudents.length === 0 ? (
            <p style={styles.emptyText}>لا توجد طلاب مفعلين</p>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>الاسم</th>
                    <th style={styles.th}>رقم الهاتف</th>
                    <th style={styles.th}>الصف</th>
                    <th style={styles.th}>تاريخ التفعيل</th>
                    <th style={styles.th}>آخر دخول</th>
                    <th style={styles.th}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudents.map(student => (
                    <tr key={student.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.studentInfo}>
                          <div style={styles.studentAvatar}>
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <strong>{student.name}</strong>
                            <div style={styles.studentId}>ID: {student.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                       </td>
                      <td style={styles.td}>
                        <span style={styles.phoneNumber}>{student.phone}</span>
                       </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.gradeBadge,
                          background: '#dbeafe',
                          color: '#1e40af'
                        }}>
                          {getGradeName(student.grade)}
                        </span>
                       </td>
                      <td style={styles.td}>
                        {student.activatedAt ? formatDate(student.activatedAt) : 'غير معروف'}
                       </td>
                      <td style={styles.td}>
                        <span style={{
                          background: student.lastLogin ? '#d1fae5' : '#fee2e2',
                          color: student.lastLogin ? '#065f46' : '#991b1b',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          display: 'inline-block',
                          fontSize: '13px',
                          fontWeight: 'bold'
                        }}>
                         {formatLastLogin(student.lastLogin)}
                        </span>
                       </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <Link 
                            href={`/admin/open-course?studentId=${student.id}`}
                            style={styles.openCourseBtn}
                          >
                            🎓 فتح كورس
                          </Link>
                          <button 
                            onClick={() => {
                              if (confirm(`هل تريد إلغاء تفعيل ${student.name}؟`)) {
                                updateDoc(doc(db, "users", student.id), { status: 'pending' })
                                  .then(() => {
                                    setMessage(`✅ تم إلغاء تفعيل ${student.name}`)
                                    fetchStudents()
                                  })
                              }
                            }}
                            style={styles.deactivateBtn}
                          >
                            ⏸️ إلغاء التفعيل
                          </button>
                          <button 
                            onClick={() => deleteStudent(student.id, student.name)}
                            style={styles.deleteBtn}
                          >
                            🗑️ حذف
                          </button>
                        </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* عرض الطلاب المرفوضين */}
      {activeStudentView === 'rejected' && (
        <>
          <h3 style={styles.sectionTitle}>❌ الطلاب المرفوضين</h3>
          {loading ? (
            <p style={styles.loadingText}>جاري تحميل البيانات...</p>
          ) : rejectedStudents.length === 0 ? (
            <p style={styles.emptyText}>لا توجد طلاب مرفوضين</p>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>الاسم</th>
                    <th style={styles.th}>رقم الهاتف</th>
                    <th style={styles.th}>الصف</th>
                    <th style={styles.th}>تاريخ الرفض</th>
                    <th style={styles.th}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedStudents.map(student => (
                    <tr key={student.id} style={styles.tr}>
                      <td style={styles.td}>
                        <strong style={{ color: '#ef4444' }}>{student.name}</strong>
                       </td>
                      <td style={styles.td}>{student.phone}</td>
                      <td style={styles.td}>{getGradeName(student.grade)}</td>
                      <td style={styles.td}>{formatDate(student.createdAt)}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button onClick={() => activateStudent(student.id, student.name)} style={styles.activateBtn}>
                            ✅ إعادة القبول
                          </button>
                          <button onClick={() => deleteStudent(student.id, student.name)} style={styles.deleteBtn}>
                            🗑️ حذف نهائي
                          </button>
                        </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// CoursesTab
// ============================================
function CoursesTab() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    grade: '1-prep',
    category: '',
    price: 100,
    isActive: true
  })
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [activeGrade, setActiveGrade] = useState<string>('all')
  const secondSecondaryCategories = ['كيمياء', 'فيزياء']

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const querySnapshot = await getDocs(collection(db, "courses"))
      const coursesList: any[] = []
      
      querySnapshot.forEach((doc) => {
        coursesList.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      setCourses(coursesList)
      setMessage(`✅ تم تحميل ${coursesList.length} كورس`)
    } catch (error) {
      console.error('❌ خطأ في جلب الكورسات:', error)
      setMessage('❌ حدث خطأ في جلب الكورسات')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCourse.title.trim()) {
      setMessage('❌ عنوان الكورس مطلوب')
      return
    }

    if (newCourse.grade === '2-secondary' && !newCourse.category) {
      setMessage('❌ يجب اختيار الفولدر (كيمياء أو فيزياء) لتانية ثانوي')
      return
    }

    try {
      const courseData: any = {
        title: newCourse.title,
        description: newCourse.description,
        grade: newCourse.grade,
        price: Number(newCourse.price),
        isActive: newCourse.isActive,
        createdAt: new Date().toISOString(),
        lessons: 0,
        studentsEnrolled: 0
      }
      
      if (newCourse.grade === '2-secondary' && newCourse.category) {
        courseData.category = newCourse.category
      }
      
      await addDoc(collection(db, "courses"), courseData)
      
      setMessage(`✅ تم إضافة كورس "${newCourse.title}" بنجاح`)
      setNewCourse({ title: '', description: '', grade: '1-prep', category: '', price: 100, isActive: true })
      fetchCourses()
      
    } catch (error: any) {
      console.error('❌ خطأ في إضافة الكورس:', error)
      setMessage('❌ حدث خطأ في إضافة الكورس')
    }
  }

  const handleEditCourse = (course: any) => {
    setEditingCourse(course)
    setNewCourse({
      title: course.title,
      description: course.description || '',
      grade: course.grade || '1-prep',
      category: course.category || '',
      price: course.price || 100,
      isActive: course.isActive !== false
    })
  }

  const handleUpdateCourse = async () => {
    if (!editingCourse || !newCourse.title.trim()) return

    if (newCourse.grade === '2-secondary' && !newCourse.category) {
      setMessage('❌ يجب اختيار الفولدر (كيمياء أو فيزياء) لتانية ثانوي')
      return
    }

    try {
      const updateData: any = {
        title: newCourse.title,
        description: newCourse.description,
        grade: newCourse.grade,
        price: Number(newCourse.price),
        isActive: newCourse.isActive,
        updatedAt: new Date().toISOString()
      }
      
      if (newCourse.grade === '2-secondary') {
        updateData.category = newCourse.category
      } else {
        updateData.category = ''
      }
      
      await updateDoc(doc(db, "courses", editingCourse.id), updateData)
      
      setMessage(`✅ تم تحديث كورس "${newCourse.title}"`)
      setEditingCourse(null)
      setNewCourse({ title: '', description: '', grade: '1-prep', category: '', price: 100, isActive: true })
      fetchCourses()
      
    } catch (error) {
      setMessage('❌ حدث خطأ في تحديث الكورس')
    }
  }

  const deleteCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`هل أنت متأكد من حذف كورس "${courseTitle}"؟`)) return
    
    try {
      await deleteDoc(doc(db, "courses", courseId))
      setMessage(`✅ تم حذف كورس "${courseTitle}"`)
      fetchCourses()
    } catch (error) {
      setMessage('❌ حدث خطأ في حذف الكورس')
    }
  }

  const toggleCourseStatus = async (courseId: string, courseTitle: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "courses", courseId), {
        isActive: !currentStatus
      })
      
      setMessage(`✅ تم ${!currentStatus ? 'تفعيل' : 'إيقاف'} كورس "${courseTitle}"`)
      fetchCourses()
    } catch (error) {
      setMessage('❌ حدث خطأ في تغيير حالة الكورس')
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const getGradeName = (gradeCode: string) => {
    const grades: { [key: string]: string } = {
      '1-prep': 'أولى إعدادي',
      '2-prep': 'ثانية إعدادي',
      '3-prep': 'ثالثة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي',
      'all': 'كل الكورسات'
    }
    return grades[gradeCode] || gradeCode
  }

  const getFilteredCourses = () => {
    if (activeGrade === 'all') {
      return courses
    }
    return courses.filter(course => course.grade === activeGrade)
  }

  const getCoursesByGradeAndCategory = () => {
    const filtered = getFilteredCourses()
    
    if (activeGrade !== '2-secondary') {
      return { [getGradeName(activeGrade)]: filtered }
    }
    
    const categories: { [key: string]: any[] } = {}
    secondSecondaryCategories.forEach(category => {
      categories[category] = []
    })
    categories['أخرى'] = []
    
    filtered.forEach(course => {
      if (course.category && secondSecondaryCategories.includes(course.category)) {
        if (!categories[course.category]) {
          categories[course.category] = []
        }
        categories[course.category].push(course)
      } else {
        categories['أخرى'].push(course)
      }
    })
    
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) {
        delete categories[key]
      }
    })
    
    return categories
  }

  const getGradeStats = () => {
    const stats: { [key: string]: number } = {
      'all': courses.length,
      '1-prep': courses.filter(c => c.grade === '1-prep').length,
      '2-prep': courses.filter(c => c.grade === '2-prep').length,
      '3-prep': courses.filter(c => c.grade === '3-prep').length,
      '1-secondary': courses.filter(c => c.grade === '1-secondary').length,
      '2-secondary': courses.filter(c => c.grade === '2-secondary').length
    }
    return stats
  }

  const gradeStats = getGradeStats()
  const filteredCourses = getFilteredCourses()
  const categorizedCourses = getCoursesByGradeAndCategory()
  const isSecondSecondary = activeGrade === '2-secondary'

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <h2 style={styles.tabTitle}>📚 إدارة الكورسات</h2>
        <button onClick={fetchCourses} style={styles.refreshButton}>
          🔄 تحديث القائمة
        </button>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          background: message.startsWith('✅') ? '#d4fae5' : '#fee2e2',
          color: message.startsWith('✅') ? '#065f46' : '#991b1b'
        }}>
          {message}
        </div>
      )}

      <div style={styles.viewTabs}>
        <button
          onClick={() => setActiveGrade('all')}
          style={{
            ...styles.viewTabButton,
            background: activeGrade === 'all' ? '#3b82f6' : '#f3f4f6',
            color: activeGrade === 'all' ? 'white' : '#4b5563'
          }}
        >
          📚 الكل ({gradeStats.all})
        </button>
        <button
          onClick={() => setActiveGrade('1-prep')}
          style={{
            ...styles.viewTabButton,
            background: activeGrade === '1-prep' ? '#10b981' : '#f3f4f6',
            color: activeGrade === '1-prep' ? 'white' : '#4b5563'
          }}
        >
          🏫 أولى إعدادي ({gradeStats['1-prep']})
        </button>
        <button
          onClick={() => setActiveGrade('2-prep')}
          style={{
            ...styles.viewTabButton,
            background: activeGrade === '2-prep' ? '#0ea5e9' : '#f3f4f6',
            color: activeGrade === '2-prep' ? 'white' : '#4b5563'
          }}
        >
          🏫 ثانية إعدادي ({gradeStats['2-prep']})
        </button>
        <button
          onClick={() => setActiveGrade('3-prep')}
          style={{
            ...styles.viewTabButton,
            background: activeGrade === '3-prep' ? '#8b5cf6' : '#f3f4f6',
            color: activeGrade === '3-prep' ? 'white' : '#4b5563'
          }}
        >
          🏫 ثالثة إعدادي ({gradeStats['3-prep']})
        </button>
        <button
          onClick={() => setActiveGrade('1-secondary')}
          style={{
            ...styles.viewTabButton,
            background: activeGrade === '1-secondary' ? '#f59e0b' : '#f3f4f6',
            color: activeGrade === '1-secondary' ? 'white' : '#4b5563'
          }}
        >
          🎓 أولى ثانوي ({gradeStats['1-secondary']})
        </button>
        <button
          onClick={() => setActiveGrade('2-secondary')}
          style={{
            ...styles.viewTabButton,
            background: activeGrade === '2-secondary' ? '#ef4444' : '#f3f4f6',
            color: activeGrade === '2-secondary' ? 'white' : '#4b5563'
          }}
        >
          🎓 ثانية ثانوي ({gradeStats['2-secondary']})
        </button>
      </div>

      <div style={styles.formSection}>
        <h3 style={styles.sectionTitle}>
          {editingCourse ? '✏️ تعديل كورس' : '➕ إضافة كورس جديد'}
        </h3>
        <form onSubmit={editingCourse ? handleUpdateCourse : handleAddCourse} style={styles.form}>
          <div style={styles.formRow}>
            <input
              type="text"
              placeholder="عنوان الكورس *"
              value={newCourse.title}
              onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
              style={styles.input}
              required
            />
            <select
              value={newCourse.grade}
              onChange={(e) => {
                const selectedGrade = e.target.value
                setNewCourse({
                  ...newCourse, 
                  grade: selectedGrade,
                  category: selectedGrade === '2-secondary' ? newCourse.category : ''
                })
              }}
              style={styles.input}
            >
              <option value="">اختر المرحلة</option>
              <option value="1-prep">أولى إعدادي</option>
              <option value="2-prep">ثانية إعدادي</option>
              <option value="3-prep">ثالثة إعدادي</option>
              <option value="1-secondary">أولى ثانوي</option>
              <option value="2-secondary">ثانية ثانوي</option>
            </select>
          </div>
          
          {newCourse.grade === '2-secondary' && (
            <div style={styles.formRow}>
              <select
                value={newCourse.category}
                onChange={(e) => setNewCourse({...newCourse, category: e.target.value})}
                style={styles.input}
                required
              >
                <option value="">اختر الفولدر لتانية ثانوي *</option>
                {secondSecondaryCategories.map((category, index) => (
                  <option key={index} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="السعر (جنيه)"
                value={newCourse.price}
                onChange={(e) => setNewCourse({...newCourse, price: parseInt(e.target.value) || 0})}
                style={styles.input}
                min="0"
              />
            </div>
          )}
          
          {newCourse.grade !== '2-secondary' && (
            <div style={styles.formRow}>
              <input
                type="number"
                placeholder="السعر (جنيه)"
                value={newCourse.price}
                onChange={(e) => setNewCourse({...newCourse, price: parseInt(e.target.value) || 0})}
                style={styles.input}
                min="0"
              />
              <div style={styles.inputPlaceholder}></div>
            </div>
          )}
          
          <div style={styles.formRow}>
            <textarea
              placeholder="وصف الكورس"
              value={newCourse.description}
              onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
              style={styles.textarea}
              rows={3}
            />
          </div>
          
          <div style={styles.formRow}>
            <div style={styles.checkboxGroup}>
              <input
                type="checkbox"
                checked={newCourse.isActive}
                onChange={(e) => setNewCourse({...newCourse, isActive: e.target.checked})}
                style={styles.checkbox}
                id="isActive"
              />
              <label htmlFor="isActive" style={styles.checkboxLabel}>
                كورس نشط
              </label>
            </div>
          </div>
          
          <div style={styles.formRow}>
            {editingCourse ? (
              <>
                <button type="submit" style={styles.updateButton}>
                  ✅ تحديث الكورس
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setEditingCourse(null)
                    setNewCourse({ title: '', description: '', grade: '1-prep', category: '', price: 100, isActive: true })
                  }}
                  style={styles.cancelButton}
                >
                  ❌ إلغاء التعديل
                </button>
              </>
            ) : (
              <button type="submit" style={styles.addButton} disabled={!newCourse.title.trim()}>
                ✅ إضافة الكورس
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={styles.listSection}>
        <div style={styles.coursesHeader}>
          <h3 style={styles.sectionTitle}>
            {activeGrade === 'all' ? '📖 كل الكورسات' : `📖 كورسات ${getGradeName(activeGrade)}`} 
            ({filteredCourses.length} كورس)
          </h3>
          <div style={styles.coursesStats}>
            <span style={styles.statBadge}>✅ مفعل: {filteredCourses.filter(c => c.isActive).length}</span>
            <span style={styles.statBadge}>⏸️ غير مفعل: {filteredCourses.filter(c => !c.isActive).length}</span>
          </div>
        </div>
        
        {loading ? (
          <p style={styles.loadingText}>جاري تحميل الكورسات...</p>
        ) : filteredCourses.length === 0 ? (
          <p style={styles.emptyText}>
            {activeGrade === 'all' 
              ? 'لا توجد كورسات بعد. أضف كورساً جديداً!' 
              : `لا توجد كورسات لـ ${getGradeName(activeGrade)} بعد. أضف كورساً جديداً لهذه المرحلة!`}
          </p>
        ) : (
          <>
            {Object.keys(categorizedCourses).map(category => (
              <div key={category} style={styles.categorySection}>
                <h4 style={styles.categoryTitle}>
                  {isSecondSecondary ? (
                    category === 'أخرى' ? '📁 كورسات أخرى (ثانية ثانوي)' : `📁 ${category} (ثانية ثانوي)`
                  ) : (
                    `📚 ${getGradeName(activeGrade)}`
                  )}
                  ({categorizedCourses[category].length} كورس)
                </h4>
                <div style={styles.coursesGrid}>
                  {categorizedCourses[category].map(course => (
                    <div key={course.id} style={styles.courseCard}>
                      <div style={styles.courseHeader}>
                        <div>
                          <h4 style={styles.courseCardTitle}>{course.title}</h4>
                          <div style={styles.courseBadges}>
                            <span style={{
                              ...styles.statusBadge,
                              background: course.isActive ? '#d1fae5' : '#fee2e2',
                              color: course.isActive ? '#065f46' : '#991b1b'
                            }}>
                              {course.isActive ? '✅ نشط' : '❌ غير نشط'}
                            </span>
                            <span style={styles.gradeBadge}>
                              {getGradeName(course.grade)}
                            </span>
                            {course.category && course.grade === '2-secondary' && (
                              <span style={{
                                ...styles.categoryBadge,
                                background: '#f0f9ff',
                                color: '#0369a1'
                              }}>
                                📁 {course.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={styles.coursePrice}>
                          {course.price || 0} ج.م
                        </div>
                      </div>
                      
                      {course.description && (
                        <p style={styles.courseCardDesc}>{course.description}</p>
                      )}
                      
                      <div style={styles.courseCardInfo}>
                        <span>📅 {new Date(course.createdAt).toLocaleDateString('ar-EG')}</span>
                        <span>👥 {course.studentsEnrolled || 0} طالب</span>
                      </div>
                      
                      <div style={styles.courseCardActions}>
                        <button 
                          onClick={() => handleEditCourse(course)}
                          style={styles.editButton}
                        >
                          ✏️ تعديل
                        </button>
                        <button 
                          onClick={() => toggleCourseStatus(course.id, course.title, course.isActive)}
                          style={course.isActive ? styles.deactivateButton : styles.activateButton}
                        >
                          {course.isActive ? '⏸️ إيقاف' : '▶️ تفعيل'}
                        </button>
                        <Link href={`/admin/course/${course.id}/lessons`} style={styles.lessonsButton}>
                          📝 الدروس
                        </Link>
                        <button 
                          onClick={() => deleteCourse(course.id, course.title)}
                          style={styles.deleteButton}
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        
        <div style={styles.gradeStatsSection}>
          <h4 style={styles.sectionTitle}>📊 إحصائيات المراحل</h4>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{gradeStats['1-prep']}</div>
              <div style={styles.statLabel}>أولى إعدادي</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{gradeStats['2-prep']}</div>
              <div style={styles.statLabel}>ثانية إعدادي</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{gradeStats['3-prep']}</div>
              <div style={styles.statLabel}>ثالثة إعدادي</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{gradeStats['1-secondary']}</div>
              <div style={styles.statLabel}>أولى ثانوي</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{gradeStats['2-secondary']}</div>
              <div style={styles.statLabel}>ثانية ثانوي</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{gradeStats.all}</div>
              <div style={styles.statLabel}>إجمالي الكورسات</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// OpenCourseTab
// ============================================
function OpenCourseTab() {
  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>🎓 فتح كورس للطلاب</h2>
      
      <div style={styles.redirectCard}>
        <div style={styles.redirectIcon}>🚀</div>
        <div>
          <h3 style={styles.redirectTitle}>صفحة فتح الكورس</h3>
          <p style={styles.redirectText}>
            هذه الصفحة تحتوي على أدوات متقدمة لفتح الكورسات للطلاب بشكل فردي أو جماعي.
          </p>
          <Link href="/admin/open-course" style={styles.redirectButton}>
            الذهاب لصفحة فتح الكورس المتقدمة →
          </Link>
        </div>
      </div>
      
      <div style={styles.quickActions}>
        <h3 style={styles.quickTitle}>إجراءات سريعة:</h3>
        <div style={styles.quickGrid}>
          <div style={styles.quickCard}>
            <div style={styles.quickIcon}>👨‍🎓</div>
            <h4>فتح كورس لطالب</h4>
            <p>اختر طالباً وكورساً لفتحه</p>
          </div>
          
          <div style={styles.quickCard}>
            <div style={styles.quickIcon}>📦</div>
            <h4>فتح جماعي</h4>
            <p>فتح كورس لكل الطلاب</p>
          </div>
          
          <div style={styles.quickCard}>
            <div style={styles.quickIcon}>📊</div>
            <h4>تقارير الفتح</h4>
            <p>عرض الكورسات المفتوحة</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// VideosTab
// ============================================
function VideosTab() {
  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>🎬 إدارة الفيديوهات</h2>
      <p>هنا يمكنك إضافة الدروس والفيديوهات للكورسات</p>
      
      <div style={styles.videosSection}>
        <div style={styles.videoCard}>
          <h3>📹 إدارة الفيديوهات الكاملة</h3>
          <p>لإضافة وتعديل وحذف الدروس والفيديوهات بشكل متقدم</p>
          <Link href="/admin/videos" style={styles.linkButton}>
            الذهاب لصفحة الفيديوهات الكاملة →
          </Link>
        </div>
        
        <div style={styles.videoCard}>
          <h3>🎥 إضافة فيديو سريع</h3>
          <p>إضافة فيديو جديد لأي كورس</p>
          <button style={styles.quickAddButton}>
            ➕ إضافة فيديو جديد
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// SettingsTab
// ============================================
function SettingsTab() {
  const [settings, setSettings] = useState({
    platformName: 'علمني العلوم مستر بيشوي',
    adminName: 'الدعم الفني',
    supportPhone: '0123456789',
    whatsappLink: 'https://wa.me/20123456789'
  })

  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>⚙️ إعدادات المنصة</h2>
      
      <div style={styles.settingsForm}>
        <div style={styles.settingItem}>
          <label style={styles.settingLabel}>اسم المنصة</label>
          <input
            type="text"
            value={settings.platformName}
            onChange={(e) => setSettings({...settings, platformName: e.target.value})}
            style={styles.settingInput}
          />
        </div>
        
        <div style={styles.settingItem}>
          <label style={styles.settingLabel}>اسم الأدمن</label>
          <input
            type="text"
            value={settings.adminName}
            onChange={(e) => setSettings({...settings, adminName: e.target.value})}
            style={styles.settingInput}
          />
        </div>
        
        <div style={styles.settingItem}>
          <label style={styles.settingLabel}>رقم الدعم</label>
          <input
            type="tel"
            value={settings.supportPhone}
            onChange={(e) => setSettings({...settings, supportPhone: e.target.value})}
            style={styles.settingInput}
          />
        </div>
        
        <div style={styles.settingItem}>
          <label style={styles.settingLabel}>رابط واتساب</label>
          <input
            type="url"
            value={settings.whatsappLink}
            onChange={(e) => setSettings({...settings, whatsappLink: e.target.value})}
            style={styles.settingInput}
          />
        </div>
        
        <button style={styles.saveButton}>
          💾 حفظ الإعدادات
        </button>
      </div>
    </div>
  )
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    fontFamily: 'Arial, sans-serif',
    direction: 'rtl' as const
  },
  loadingText: {
    fontSize: '20px',
    color: '#3b82f6'
  },
  loginContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    direction: 'rtl' as const
  },
  loginCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    textAlign: 'center' as const
  },
  loginHeader: {
    marginBottom: '30px'
  },
  loginTitle: {
    fontSize: '28px',
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: '10px'
  },
  loginSubtitle: {
    color: '#666',
    fontSize: '16px'
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px'
  },
  errorMessage: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '15px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold' as const
  },
  formGroup: {
    textAlign: 'right' as const
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#333',
    fontWeight: '600' as const,
    fontSize: '16px'
  },
  input: {
    width: '100%',
    padding: '15px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    fontSize: '16px',
    background: 'white',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6'
    }
  },
  inputPlaceholder: {
    width: '100%',
    padding: '15px',
    border: '2px solid transparent',
    borderRadius: '10px',
    fontSize: '16px',
    background: 'transparent'
  },
  loginButton: {
    padding: '16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    transition: 'background 0.3s',
    marginTop: '10px',
    '&:hover': {
      background: '#2563eb'
    }
  },
  loginHint: {
    marginTop: '30px',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#666',
    textAlign: 'center' as const
  },
  warningText: {
    color: '#dc2626',
    fontWeight: 'bold' as const,
    marginTop: '10px'
  },
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: 'Arial, sans-serif',
    direction: 'rtl' as const
  },
  header: {
    background: 'linear-gradient(to right, #1e3a8a, #3b82f6)',
    color: 'white',
    padding: '25px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  logoutButton: {
    padding: '10px 20px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600' as const,
    fontSize: '14px',
    '&:hover': {
      background: '#dc2626'
    }
  },
  title: {
    fontSize: '32px',
    marginBottom: '10px',
    fontWeight: 'bold' as const
  },
  subtitle: {
    fontSize: '18px',
    opacity: 0.9
  },
  tabsContainer: {
    background: 'white',
    padding: '15px 25px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    borderBottom: '1px solid #e5e7eb',
    flexWrap: 'wrap' as const,
    gap: '15px'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto' as const
  },
  tabButton: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600' as const,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.3s',
    minWidth: '120px',
    justifyContent: 'center'
  },
  tabIcon: {
    fontSize: '18px'
  },
  adminActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap' as const
  },
  backButton: {
    padding: '10px 20px',
    background: '#e5e7eb',
    color: '#4b5563',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '14px'
  },
  specialButton: {
    padding: '10px 20px',
    background: '#10b981',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '14px'
  },
  notificationButton: {
    padding: '10px 20px',
    background: '#f59e0b',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  botMonitorButton: {
    padding: '10px 20px',
    background: '#8b5cf6',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  supportChatButton: {
    padding: '10px 20px',
    background: '#ec4899',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  content: {
    maxWidth: '1400px',
    margin: '30px auto',
    padding: '0 25px'
  },
  tabContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px'
  },
  tabTitle: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: '#1f2937',
    marginBottom: '20px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: '#f0f9ff',
    borderRadius: '10px',
    padding: '20px',
    textAlign: 'center' as const,
    border: '2px solid #bae6fd'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold' as const,
    color: '#0369a1',
    marginBottom: '10px'
  },
  statLabel: {
    color: '#0c4a6e',
    fontSize: '14px'
  },
  refreshButton: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600' as const
  },
  message: {
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '25px',
    textAlign: 'center' as const,
    fontWeight: 'bold' as const,
    fontSize: '16px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #e5e7eb'
  },
  loadingText: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#6b7280'
  },
  emptyText: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#9ca3af',
    background: '#f9fafb',
    borderRadius: '8px'
  },
  tableContainer: {
    overflowX: 'auto' as const
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  th: {
    background: '#f3f4f6',
    padding: '15px',
    textAlign: 'right' as const,
    borderBottom: '2px solid #e5e7eb',
    color: '#374151',
    fontWeight: '600' as const
  },
  tr: {
    borderBottom: '1px solid #e5e7eb'
  },
  td: {
    padding: '15px',
    textAlign: 'right' as const,
    color: '#4b5563'
  },
  actions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const
  },
  activateBtn: {
    padding: '8px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600' as const
  },
  rejectBtn: {
    padding: '8px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600' as const
  },
  formSection: {
    background: '#f9fafb',
    borderRadius: '10px',
    padding: '25px',
    marginBottom: '30px',
    border: '1px solid #e5e7eb'
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    alignItems: 'center'
  },
  textarea: {
    padding: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    background: 'white',
    resize: 'vertical' as const,
    minHeight: '100px',
    gridColumn: 'span 2',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6'
    }
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer'
  },
  checkboxLabel: {
    fontSize: '16px',
    color: '#374151',
    cursor: 'pointer'
  },
  addButton: {
    padding: '14px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    transition: 'background 0.3s',
    gridColumn: 'span 2',
    '&:hover:not(:disabled)': {
      background: '#059669'
    },
    '&:disabled': {
      background: '#9ca3af',
      cursor: 'not-allowed'
    }
  },
  updateButton: {
    padding: '14px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    '&:hover': {
      background: '#2563eb'
    }
  },
  cancelButton: {
    padding: '14px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    '&:hover': {
      background: '#dc2626'
    }
  },
  listSection: {
    marginTop: '30px'
  },
  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '25px'
  },
  courseCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '25px',
    transition: 'all 0.3s',
    '&:hover': {
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
      borderColor: '#3b82f6'
    }
  },
  courseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  courseCardTitle: {
    fontSize: '20px',
    fontWeight: 'bold' as const,
    color: '#1f2937',
    margin: '0 0 10px 0'
  },
  courseBadges: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600' as const
  },
  gradeBadge: {
    background: '#f3f4f6',
    color: '#4b5563',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600' as const
  },
  categoryBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600' as const
  },
  coursePrice: {
    background: '#f0f9ff',
    color: '#0369a1',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '18px',
    fontWeight: 'bold' as const
  },
  courseCardDesc: {
    color: '#6b7280',
    fontSize: '15px',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  courseCardInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#4b5563'
  },
  courseCardActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const
  },
  editButton: {
    padding: '8px 16px',
    background: '#f3f4f6',
    color: '#4b5563',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    '&:hover': {
      background: '#e5e7eb'
    }
  },
  activateButton: {
    padding: '8px 16px',
    background: '#d1fae5',
    color: '#065f46',
    border: '1px solid #a7f3d0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    '&:hover': {
      background: '#a7f3d0'
    }
  },
  deactivateButton: {
    padding: '8px 16px',
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    '&:hover': {
      background: '#fecaca'
    }
  },
  lessonsButton: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    '&:hover': {
      background: '#2563eb'
    }
  },
  deleteButton: {
    padding: '8px 16px',
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    '&:hover': {
      background: '#fecaca'
    }
  },
  viewTabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '25px',
    flexWrap: 'wrap' as const
  },
  viewTabButton: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600' as const,
    fontSize: '14px',
    transition: 'all 0.3s',
    flex: 1,
    minWidth: '150px',
    textAlign: 'center' as const
  },
  phoneNumber: {
    direction: 'ltr' as const,
    display: 'inline-block',
    fontFamily: 'monospace',
    background: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  deleteBtn: {
    padding: '6px 12px',
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600' as const
  },
  deactivateBtn: {
    padding: '6px 12px',
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fde68a',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600' as const
  },
  openCourseBtn: {
    padding: '6px 12px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600' as const,
    textDecoration: 'none',
    display: 'inline-block'
  },
  studentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  studentAvatar: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 'bold' as const
  },
  studentId: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '2px'
  },
  categorySection: {
    marginBottom: '30px',
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '10px'
  },
  categoryTitle: {
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#1f2937',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #e5e7eb'
  },
  coursesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
    gap: '15px'
  },
  coursesStats: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const
  },
  statBadge: {
    background: '#f3f4f6',
    color: '#4b5563',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600' as const
  },
  redirectCard: {
    background: 'linear-gradient(to right, #f0f9ff, #dbeafe)',
    borderRadius: '12px',
    padding: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '25px',
    marginBottom: '30px'
  },
  redirectIcon: {
    fontSize: '48px'
  },
  redirectTitle: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: '#1e40af',
    marginBottom: '10px'
  },
  redirectText: {
    fontSize: '16px',
    color: '#374151',
    marginBottom: '20px'
  },
  redirectButton: {
    padding: '12px 24px',
    background: '#1e40af',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold' as const,
    fontSize: '16px',
    display: 'inline-block'
  },
  quickActions: {
    marginTop: '40px'
  },
  quickTitle: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: '20px'
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  quickCard: {
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    padding: '25px',
    textAlign: 'center' as const,
    transition: 'all 0.3s',
    '&:hover': {
      borderColor: '#3b82f6',
      transform: 'translateY(-5px)'
    }
  },
  quickIcon: {
    fontSize: '40px',
    marginBottom: '15px'
  },
  videosSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '25px',
    marginTop: '30px'
  },
  videoCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center' as const
  },
  linkButton: {
    display: 'inline-block',
    padding: '12px 24px',
    background: '#3b82f6',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    marginTop: '20px'
  },
  quickAddButton: {
    padding: '12px 24px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600' as const,
    marginTop: '20px'
  },
  settingsForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '25px',
    maxWidth: '600px'
  },
  settingItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  settingLabel: {
    fontWeight: '600' as const,
    color: '#374151',
    fontSize: '16px'
  },
  settingInput: {
    padding: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    background: 'white',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6'
    }
  },
  saveButton: {
    padding: '16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    marginTop: '20px',
    '&:hover': {
      background: '#059669'
    }
  },
  gradeStatsSection: {
    marginTop: '40px',
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '10px',
    border: '2px solid #e5e7eb'
  },
  // ✅ أنماط ترقية المراحل
  upgradeDesc: {
    color: '#6b7280',
    marginBottom: '25px',
    fontSize: '15px'
  },
  upgradeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  upgradeCard: {
    background: '#f9fafb',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    transition: 'all 0.3s',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  upgradeCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  upgradeIcon: {
    fontSize: '32px'
  },
  upgradeCardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0
  },
  upgradeCount: {
    fontSize: '13px',
    color: '#6b7280'
  },
  upgradeButton: {
    padding: '12px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    width: '100%',
    '&:hover': {
      background: '#2563eb'
    }
  },
  upgradeDisabled: {
    padding: '12px',
    background: '#e5e7eb',
    color: '#9ca3af',
    borderRadius: '10px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 'bold'
  }
}