'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { 
  collection, getDocs, updateDoc, doc, addDoc, 
  deleteDoc, query, where, orderBy, serverTimestamp 
} from 'firebase/firestore'
import Link from 'next/link'

// ✅ بيانات تسجيل الدخول الجديدة
const ADMIN_EMAIL = "mrfady@fancy"
const ADMIN_PASSWORD = "MrFady@2030"
const AUTH_KEY = 'admin_authenticated'

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showPassword, setShowPassword] = useState(false)
  
  // ✅ ✅ إحصائيات لوحة التحكم
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    activeToday: 0,
  })
  const [recentUsers, setRecentUsers] = useState<any[]>([])

  // تحقق عند تحميل الصفحة
  useEffect(() => {
    const authStatus = localStorage.getItem(AUTH_KEY)
    if (authStatus === 'true') {
      setIsAuthenticated(true)
      loadAdminStats()
    }
    setLoading(false)
  }, [])

  // ✅ ✅ جلب إحصائيات الأدمن
  const loadAdminStats = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      const today = new Date().toDateString()
      
      setStats({
        totalUsers: users.length,
        totalStudents: users.filter(u => u.role === 'student').length,
        totalTeachers: users.filter(u => u.role === 'teacher').length,
        totalParents: users.filter(u => u.role === 'parent').length,
        activeToday: users.filter(u => u.lastVisitDate === today).length,
      })
      
      // ✅ أحدث المستخدمين
      const sorted = users.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      })
      setRecentUsers(sorted.slice(0, 5))
      
    } catch (error) {
      console.error('❌ خطأ في جلب الإحصائيات:', error)
    }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    
    if (loginForm.email === ADMIN_EMAIL && loginForm.password === ADMIN_PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true')
      setIsAuthenticated(true)
      setLoginError('')
      loadAdminStats()
    } else {
      setLoginError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY)
    setIsAuthenticated(false)
    setLoginForm({ email: '', password: '' })
  }

  // ✅ الأزرار الجديدة
  const tabs = [
    { id: 'dashboard', name: '🏠 لوحة التحكم' },
    { id: 'students', name: '👨‍🎓 الطلاب' },
    { id: 'courses', name: '📚 الكورسات' },
    { id: 'open-course', name: '🎓 فتح كورس' },
    { id: 'videos', name: '🎬 الفيديوهات' },
    { id: 'upgrade', name: '🚀 ترقية المراحل' },
  ]

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
            <p style={styles.loginSubtitle}>منصة Fancy Academy</p>
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
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  style={styles.passwordInput}
                  placeholder="أدخل كلمة المرور"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                >
                  {showPassword ? '🔒' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" style={styles.loginButton}>
              🔐 تسجيل الدخول
            </button>

            <div style={styles.loginHint}>
              <p>بيانات الدخول:</p>
              <p><strong>البريد:</strong> mrfady@fancy</p>
              <p><strong>كلمة المرور:</strong> MrFady@2030</p>
              <p style={styles.warningText}>⚠️ تأكد من كتابة الحروف الكبيرة والصغيرة</p>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.title}>👨‍💼 لوحة تحكم الأدمن</h1>
            <p style={styles.subtitle}>Fancy Academy</p>
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
        
        {/* ✅ الأزرار */}
        <div style={styles.adminActions}>
          <Link href="/admin/send-notification" style={styles.notificationButton}>
            🔔 إشعارات
          </Link>
          <Link href="/admin/bot-monitor" style={styles.botMonitorButton}>
            🤖 مراقبة البوت
          </Link>
          <Link href="/platform" style={styles.backButton}>
            ← عرض المنصة
          </Link>
          <Link href="/admin/open-course" style={styles.specialButton}>
            🎓 فتح كورس لطالب
          </Link>
          <Link href="/admin/spin" style={styles.spinButton}>
            🎡 إدارة العجلة
          </Link>
          <Link href="/admin/map-settings" style={styles.mapSettingsBtn}>
            🗺️ إعدادات الخريطة
          </Link>
          <Link href="/admin/manage-points" style={styles.pointsButton}>
            ⭐ إدارة النقاط والجواهر
          </Link>
          <Link href="/admin/subjects" style={styles.subjectsButton}>
            📚 إدارة المواد
          </Link>
          <Link href="/admin/store" style={styles.storeButton}>
            🛒 إدارة المتجر
          </Link>
        </div>
      </div>

      <div style={styles.content}>
        {activeTab === 'dashboard' && (
          <div style={styles.tabContent}>
            <h2 style={styles.tabTitle}>🏠 لوحة التحكم الرئيسية</h2>
            
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{stats.totalUsers}</div>
                <div style={styles.statLabel}>إجمالي المستخدمين</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{stats.totalStudents}</div>
                <div style={styles.statLabel}>طلاب</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{stats.totalTeachers}</div>
                <div style={styles.statLabel}>مدرسين</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{stats.totalParents}</div>
                <div style={styles.statLabel}>أولياء أمور</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{stats.activeToday}</div>
                <div style={styles.statLabel}>نشط اليوم</div>
              </div>
            </div>

            <h3 style={styles.recentTitle}>🕐 آخر المستخدمين</h3>
            <div style={styles.recentUsers}>
              {recentUsers.length === 0 ? (
                <p style={styles.noRecent}>لا يوجد مستخدمين</p>
              ) : (
                recentUsers.map((user) => (
                  <div key={user.id} style={styles.recentUserItem}>
                    <div style={styles.recentUserInfo}>
                      <span style={styles.recentUserAvatar}>
                        {user.name?.charAt(0) || '?'}
                      </span>
                      <div>
                        <div style={styles.recentUserName}>{user.name || 'مستخدم'}</div>
                        <div style={styles.recentUserDetails}>
                          <span>{user.phone || 'لا يوجد'}</span>
                          <span style={styles.recentUserRole}>{user.role || 'طالب'}</span>
                          <span style={styles.recentUserDate}>
                            {user.lastVisitDate ? `آخر دخول: ${user.lastVisitDate}` : 'لم يدخل بعد'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'students' && <StudentsTab />}
        {activeTab === 'courses' && <CoursesTab />}
        {activeTab === 'open-course' && <OpenCourseTab />}
        {activeTab === 'videos' && <VideosTab />}
        {activeTab === 'upgrade' && <UpgradeTab />}
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
        اختر المرحلة التي تريد ترقية طلابها إلى المرحلة التالية
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
// StudentsTab المعدل مع فلترة حسب نوع الحساب + زر الدخول السريع للطلاب فقط + فلترة المراحل
// ============================================
function StudentsTab() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [activeView, setActiveView] = useState('pending')
  const [userRole, setUserRole] = useState('all')
  
  // ✅ ✅ فلترة المراحل
  const [filterGrade, setFilterGrade] = useState('all')
  
  // ✅ ✅ قائمة المراحل
  const grades = [
    { value: 'all', label: '📚 الكل' },
    { value: '1-prep', label: 'أولى إعدادي' },
    { value: '2-prep', label: 'ثانية إعدادي' },
    { value: '3-prep', label: 'ثالثة إعدادي' },
    { value: '1-secondary', label: 'أولى ثانوي' },
    { value: '2-secondary', label: 'ثانية ثانوي' },
    { value: '3-secondary', label: 'تالتة ثانوي' },
  ]

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) {
      return '❌ لم يسجل دخول بعد';
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
        return '❌ تاريخ غير صالح';
      }
      
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

  const fetchUsers = async () => {
    try {
      setLoading(true)
      console.log('🔍 جاري جلب المستخدمين...')
      
      const querySnapshot = await getDocs(collection(db, "users"))
      const usersList: any[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        
        let lastLogin = data.lastLogin || null;
        
        if (typeof lastLogin === 'string' && (lastLogin.includes('لم يسجل') || lastLogin.includes('يسجل'))) {
          lastLogin = null;
        }
        
        // ✅ ✅ تخزين lastVisitDate كـ string عشان يظهر
        let lastVisitDate = data.lastVisitDate || null;
        
        usersList.push({
          id: doc.id,
          name: data.name || 'غير معروف',
          phone: data.phone || 'بدون رقم',
          grade: data.grade || 'غير محدد',
          role: data.role || 'student',
          status: data.status || 'pending',
          createdAt: data.createdAt || new Date().toISOString(),
          activatedAt: data.activatedAt || null,
          lastLogin: lastLogin,
          lastVisitDate: lastVisitDate,
          isApproved: data.isApproved || false,
          parentPhone: data.parentPhone || '',
        })
      })
      
      console.log('📊 عدد المستخدمين:', usersList.length)
      setUsers(usersList)
      setMessage(`✅ تم تحميل ${usersList.length} مستخدم`)
    } catch (error) {
      console.error('❌ خطأ:', error)
      setMessage('❌ حدث خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  };

  const activateUser = async (userId: string, userName: string) => {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, { 
        status: 'active',
        activatedAt: new Date().toISOString()
      })
      setMessage(`✅ تم تفعيل حساب ${userName}`)
      fetchUsers()
    } catch (error) {
      setMessage('❌ حدث خطأ في التفعيل')
    }
  }

  const rejectUser = async (userId: string, userName: string) => {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, { status: 'rejected' })
      setMessage(`❌ تم رفض حساب ${userName}`)
      fetchUsers()
    } catch (error) {
      setMessage('❌ حدث خطأ في الرفض')
    }
  }

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${userName}"؟`)) return
    
    try {
      await deleteDoc(doc(db, "users", userId))
      setMessage(`✅ تم حذف "${userName}"`)
      fetchUsers()
    } catch (error) {
      setMessage('❌ حدث خطأ في الحذف')
    }
  }

  // ✅ ✅ الدخول السريع لحساب الطالب (للطلاب فقط)
  const quickAccess = (user: any) => {
    if (user.role !== 'student') {
      setMessage('⚠️ الدخول السريع متاح للطلاب فقط');
      return;
    }
    
    // حفظ بيانات المستخدم في localStorage مؤقتاً
    localStorage.setItem('currentUser', JSON.stringify({
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      grade: user.grade,
      isAdminAccess: true,
      adminAccessAt: new Date().toISOString(),
    }))
    // التوجيه للمنصة
    window.location.href = '/platform'
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // ✅ فلترة المستخدمين حسب الحالة والدور والمرحلة
  const getFilteredUsers = () => {
    let filtered = users
    
    // فلترة حسب الحالة
    if (activeView === 'pending') {
      filtered = filtered.filter(u => u.status === 'pending')
    } else if (activeView === 'active') {
      filtered = filtered.filter(u => u.status === 'active')
    } else if (activeView === 'rejected') {
      filtered = filtered.filter(u => u.status === 'rejected')
    }
    
    // ✅ فلترة حسب الدور
    if (userRole !== 'all') {
      filtered = filtered.filter(u => u.role === userRole)
    }
    
    // ✅ ✅ فلترة حسب المرحلة (للطلاب بس)
    if (filterGrade !== 'all') {
      filtered = filtered.filter(u => u.grade === filterGrade)
    }
    
    return filtered
  }

  const filteredUsers = getFilteredUsers()
  const pendingUsers = users.filter(u => u.status === 'pending')
  const activeUsers = users.filter(u => u.status === 'active')
  const rejectedUsers = users.filter(u => u.status === 'rejected')

  // ✅ ✅ إحصائيات المراحل
  const getGradeStats = () => {
    const stats: { [key: string]: number } = {};
    const activeStudents = users.filter(u => u.role === 'student' && u.status === 'active');
    grades.forEach(g => {
      if (g.value !== 'all') {
        stats[g.value] = activeStudents.filter(s => s.grade === g.value).length;
      }
    });
    return stats;
  };

  const gradeStats = getGradeStats();

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
    const gradesMap: { [key: string]: string } = {
      '1-prep': 'أولى إعدادي',
      '2-prep': 'ثانية إعدادي',
      '3-prep': 'ثالثة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي'
    }
    return gradesMap[gradeCode] || gradeCode
  }

  const getRoleLabel = (role: string) => {
    const roles: { [key: string]: string } = {
      'student': 'طالب',
      'teacher': 'مدرس',
      'parent': 'ولي أمر',
      'admin': 'أدمن'
    }
    return roles[role] || role
  }

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <h2 style={styles.tabTitle}>👨‍🎓 إدارة المستخدمين</h2>
        <button onClick={fetchUsers} style={styles.refreshButton}>
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
          onClick={() => setActiveView('pending')}
          style={{
            ...styles.viewTabButton,
            background: activeView === 'pending' ? '#3b82f6' : '#f3f4f6',
            color: activeView === 'pending' ? 'white' : '#4b5563'
          }}
        >
          ⏳ المعلقين ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveView('active')}
          style={{
            ...styles.viewTabButton,
            background: activeView === 'active' ? '#10b981' : '#f3f4f6',
            color: activeView === 'active' ? 'white' : '#4b5563'
          }}
        >
          ✅ المفعلين ({activeUsers.length})
        </button>
        <button
          onClick={() => setActiveView('rejected')}
          style={{
            ...styles.viewTabButton,
            background: activeView === 'rejected' ? '#ef4444' : '#f3f4f6',
            color: activeView === 'rejected' ? 'white' : '#4b5563'
          }}
        >
          ❌ المرفوضين ({rejectedUsers.length})
        </button>
      </div>

      {/* ✅ فلترة حسب الدور */}
      <div style={styles.roleFilter}>
        <span style={styles.roleFilterLabel}>🔍 تصفية حسب الدور:</span>
        <div style={styles.roleFilterButtons}>
          <button
            onClick={() => setUserRole('all')}
            style={{
              ...styles.roleFilterBtn,
              background: userRole === 'all' ? '#3b82f6' : '#f3f4f6',
              color: userRole === 'all' ? 'white' : '#4b5563'
            }}
          >
            👥 الكل
          </button>
          <button
            onClick={() => setUserRole('student')}
            style={{
              ...styles.roleFilterBtn,
              background: userRole === 'student' ? '#10b981' : '#f3f4f6',
              color: userRole === 'student' ? 'white' : '#4b5563'
            }}
          >
            👨‍🎓 طلاب
          </button>
          <button
            onClick={() => setUserRole('teacher')}
            style={{
              ...styles.roleFilterBtn,
              background: userRole === 'teacher' ? '#8b5cf6' : '#f3f4f6',
              color: userRole === 'teacher' ? 'white' : '#4b5563'
            }}
          >
            👨‍🏫 مدرسين
          </button>
          <button
            onClick={() => setUserRole('parent')}
            style={{
              ...styles.roleFilterBtn,
              background: userRole === 'parent' ? '#f59e0b' : '#f3f4f6',
              color: userRole === 'parent' ? 'white' : '#4b5563'
            }}
          >
            👨‍👩‍👦 ولي أمر
          </button>
        </div>
      </div>

      {/* ✅ ✅ فلترة المراحل (للطلاب فقط) - التصميم الجديد الواضح */}
      <div style={styles.gradeFilterSection}>
        <span style={styles.gradeFilterLabel}>📚 تصفية حسب المرحلة:</span>
        <div style={styles.gradeFilterButtons}>
          {grades.map((grade) => (
            <button
              key={grade.value}
              onClick={() => setFilterGrade(grade.value)}
              style={{
                ...styles.gradeFilterBtn,
                background: filterGrade === grade.value ? '#8b5cf6' : 'rgba(255,255,255,0.08)',
                color: filterGrade === grade.value ? 'white' : '#e5e7eb',
                borderColor: filterGrade === grade.value ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.15)',
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

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{pendingUsers.length}</div>
          <div style={styles.statLabel}>معلقين</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{activeUsers.length}</div>
          <div style={styles.statLabel}>مفعلين</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{rejectedUsers.length}</div>
          <div style={styles.statLabel}>مرفوضين</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{users.length}</div>
          <div style={styles.statLabel}>إجمالي</div>
        </div>
      </div>

      {/* عرض المستخدمين */}
      <>
        <h3 style={styles.sectionTitle}>
          {activeView === 'pending' && '⏳ المعلقين'}
          {activeView === 'active' && '✅ المفعلين'}
          {activeView === 'rejected' && '❌ المرفوضين'}
          {userRole !== 'all' && ` - ${getRoleLabel(userRole)}`}
          {filterGrade !== 'all' && ` - ${getGradeName(filterGrade)}`}
          ({filteredUsers.length})
        </h3>
        {loading ? (
          <p style={styles.loadingText}>جاري تحميل البيانات...</p>
        ) : filteredUsers.length === 0 ? (
          <p style={styles.emptyText}>لا توجد بيانات</p>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>الاسم</th>
                  <th style={styles.th}>رقم الهاتف</th>
                  <th style={styles.th}>الدور</th>
                  <th style={styles.th}>المرحلة</th>
                  <th style={styles.th}>تاريخ التسجيل</th>
                  {activeView === 'active' && <th style={styles.th}>آخر دخول</th>}
                  <th style={styles.th}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{user.name}</strong>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.phoneNumber}>{user.phone}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.roleBadge,
                        background: user.role === 'student' ? '#dbeafe' : 
                                   user.role === 'teacher' ? '#ede9fe' : 
                                   user.role === 'parent' ? '#fef3c7' : '#e5e7eb',
                        color: user.role === 'student' ? '#1e40af' : 
                               user.role === 'teacher' ? '#5b21b6' : 
                               user.role === 'parent' ? '#92400e' : '#4b5563'
                      }}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.gradeBadge}>{getGradeName(user.grade)}</span>
                    </td>
                    <td style={styles.td}>
                      {formatDate(user.createdAt)}
                    </td>
                    {activeView === 'active' && (
                      <td style={styles.td}>
                        <span style={{
                          background: user.lastVisitDate ? '#d1fae5' : '#fee2e2',
                          color: user.lastVisitDate ? '#065f46' : '#991b1b',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          display: 'inline-block',
                          fontSize: '13px',
                          fontWeight: 'bold'
                        }}>
                          {user.lastVisitDate ? `✅ ${user.lastVisitDate}` : '❌ لم يدخل بعد'}
                        </span>
                      </td>
                    )}
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        {activeView !== 'active' && (
                          <button onClick={() => activateUser(user.id, user.name)} style={styles.activateBtn}>
                            ✅ قبول
                          </button>
                        )}
                        {activeView !== 'rejected' && activeView !== 'pending' && (
                          <button 
                            onClick={() => {
                              if (confirm(`هل تريد إلغاء تفعيل ${user.name}؟`)) {
                                updateDoc(doc(db, "users", user.id), { status: 'pending' })
                                  .then(() => {
                                    setMessage(`✅ تم إلغاء تفعيل ${user.name}`)
                                    fetchUsers()
                                  })
                              }
                            }}
                            style={styles.deactivateBtn}
                          >
                            ⏸️ إلغاء التفعيل
                          </button>
                        )}
                        {activeView !== 'rejected' && activeView !== 'active' && (
                          <button onClick={() => rejectUser(user.id, user.name)} style={styles.rejectBtn}>
                            ❌ رفض
                          </button>
                        )}
                        {/* ✅ ✅ زر الدخول السريع - للطلاب المفعلين فقط */}
                        {activeView === 'active' && user.role === 'student' && (
                          <button 
                            onClick={() => quickAccess(user)}
                            style={styles.quickAccessBtn}
                            title="دخول سريع لحساب الطالب"
                          >
                            🚀 دخول
                          </button>
                        )}
                        <button 
                          onClick={() => deleteUser(user.id, user.name)}
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
        isActive: !currentStatus      })
      
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
// Styles
// ============================================
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
  passwordWrapper: {
    position: 'relative',
    width: '100%'
  },
  passwordInput: {
    width: '100%',
    padding: '15px 45px 15px 15px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    fontSize: '16px',
    background: 'white',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6'
    }
  },
  passwordToggle: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    color: '#6b7280'
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
  spinButton: {
    padding: '10px 20px',
    background: '#f59e0b',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  mapSettingsBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '14px',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
    }
  },
  pointsButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '14px',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)'
    }
  },
  subjectsButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '14px',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)'
    }
  },
  storeButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '14px',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(255, 215, 0, 0.4)'
    }
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
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
  recentTitle: {
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#1f2937',
    marginBottom: '15px'
  },
  recentUsers: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  recentUserItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    flexWrap: 'wrap' as const,
    gap: '10px'
  },
  recentUserInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  recentUserAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  recentUserName: {
    fontWeight: 'bold',
    color: '#1f2937'
  },
  recentUserDetails: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    fontSize: '13px',
    color: '#6b7280'
  },
  recentUserRole: {
    padding: '2px 8px',
    background: '#e5e7eb',
    borderRadius: '12px',
    fontSize: '11px'
  },
  recentUserDate: {
    color: '#9ca3af'
  },
  noRecent: {
    textAlign: 'center' as const,
    padding: '30px',
    color: '#9ca3af'
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
  roleFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
    marginBottom: '20px',
    padding: '12px',
    background: '#f9fafb',
    borderRadius: '8px'
  },
  roleFilterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4b5563'
  },
  roleFilterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const
  },
  roleFilterBtn: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s'
  },
  roleBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600' as const
  },
  phoneNumber: {
    direction: 'ltr' as const,
    display: 'inline-block',
    fontFamily: 'monospace',
    background: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  gradeBadge: {
    background: '#f3f4f6',
    color: '#4b5563',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600' as const
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
  },
  gradeStatsSection: {
    marginTop: '40px',
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '10px',
    border: '2px solid #e5e7eb'
  },
  // ✅ ✅ أنماط فلترة المراحل - واضحة ومضاءة (معدلة)
  gradeFilterSection: {
    padding: '12px 16px',
    background: '#1f2937', // ✅ خلفية غامقة بدلاً من الشفافة
    borderRadius: '10px',
    marginBottom: '15px',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  gradeFilterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e5e7eb', // ✅ لون فاتح للوضوح
    minWidth: '120px',
  },
  gradeFilterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  gradeFilterBtn: {
    padding: '8px 18px',
    border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.08)', // ✅ خلفية شفافة فاتحة
    color: '#e5e7eb', // ✅ لون فاتح
    borderColor: 'rgba(255,255,255,0.15)',
    '&:hover': {
      background: 'rgba(255,255,255,0.15)',
    }
  },
  gradeCount: {
    fontSize: '11px',
    opacity: 0.7,
    background: 'rgba(255,255,255,0.08)',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  quickAccessBtn: {
    padding: '6px 14px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
    '&:hover': {
      background: '#2563eb'
    }
  },
}
