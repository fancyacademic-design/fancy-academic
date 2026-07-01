'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminSidebar() {
  const pathname = usePathname()
  
  const menuItems = [
    {
      title: 'لوحة التحكم',
      icon: '🏠',
      path: '/admin',
      description: 'نظرة عامة على المنصة'
    },
    {
      title: 'إدارة الطلاب',
      icon: '👨‍🎓',
      path: '/admin/students',
      description: 'قبول/رفض وتفعيل الطلاب'
    },
    {
      title: 'إدارة الكورسات',
      icon: '📚',
      path: '/admin/courses',
      description: 'إضافة وتعديل الكورسات'
    },
    {
      title: 'إدارة الفيديوهات',
      icon: '🎬',
      path: '/admin/videos',
      description: 'إضافة الدروس والمحتوى'
    },
    {
      title: 'دعم الطلاب',
      icon: '💬',
      path: '/admin/support-chat',
      description: 'محادثات الدعم الفني'
    },
    {
      title: 'المدفوعات',
      icon: '💰',
      path: '/admin/payments',
      description: 'متابعة المدفوعات والإيصالات'
    },
    {
      title: 'الإحصائيات',
      icon: '📊',
      path: '/admin/stats',
      description: 'تقارير وإحصائيات المنصة'
    },
    {
      title: 'الإعدادات',
      icon: '⚙️',
      path: '/admin/settings',
      description: 'إعدادات المنصة العامة'
    }
  ]

  return (
    <div style={styles.sidebar}>
      {/* الهيدر */}
      <div style={styles.header}>
        <h2 style={styles.title}>👨‍💼 أدمن توماس</h2>
        <p style={styles.subtitle}>علمني العلوم مستر بيشوي</p>
      </div>

      {/* القائمة */}
      <nav style={styles.nav}>
        {menuItems.map(item => {
          const isActive = pathname === item.path
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
              style={{
                ...styles.menuItem,
                background: isActive ? '#3b82f6' : 'transparent',
                color: isActive ? 'white' : '#4b5563'
              }}
            >
              <div style={styles.menuIcon}>{item.icon}</div>
              <div style={styles.menuContent}>
                <div style={styles.menuTitle}>{item.title}</div>
                <div style={{
                  ...styles.menuDescription,
                  color: isActive ? 'rgba(255,255,255,0.8)' : '#9ca3af'
                }}>
                  {item.description}
                </div>
              </div>
              {isActive && (
                <div style={styles.activeIndicator}>▶</div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* الفوتر */}
      <div style={styles.footer}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>ت</div>
          <div style={styles.userDetails}>
            <div style={styles.userName}>توماس مهني</div>
            <div style={styles.userRole}>مدير المنصة</div>
          </div>
        </div>
        
        <Link href="/after-login" style={styles.backLink}>
          ← العودة للمنصة
        </Link>
      </div>
    </div>
  )
}

const styles: any = {
  sidebar: {
    width: '280px',
    background: 'white',
    height: '100vh',
    position: 'fixed',
    right: 0,
    top: 0,
    boxShadow: '2px 0 20px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000
  },
  header: {
    padding: '30px 20px',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(to right, #1e3a8a, #3b82f6)',
    color: 'white'
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  subtitle: {
    fontSize: '14px',
    opacity: 0.8
  },
  nav: {
    flex: 1,
    padding: '20px 0',
    overflowY: 'auto'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px 20px',
    margin: '5px 10px',
    borderRadius: '10px',
    textDecoration: 'none',
    transition: 'all 0.3s',
    position: 'relative'
  },
  menuIcon: {
    fontSize: '24px',
    marginLeft: '10px'
  },
  menuContent: {
    flex: 1
  },
  menuTitle: {
    fontSize: '15px',
    fontWeight: '600',
    marginBottom: '3px'
  },
  menuDescription: {
    fontSize: '12px'
  },
  activeIndicator: {
    color: 'white',
    fontSize: '12px'
  },
  footer: {
    padding: '20px',
    borderTop: '1px solid #e5e7eb',
    background: '#f9fafb'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
    marginLeft: '10px'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },
  userRole: {
    fontSize: '12px',
    color: '#6b7280'
  },
  backLink: {
    display: 'block',
    textAlign: 'center',
    padding: '10px',
    background: '#e5e7eb',
    color: '#4b5563',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.3s'
  }
}