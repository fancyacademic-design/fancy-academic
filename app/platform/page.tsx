'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import NotificationsPanel from '@/app/components/NotificationsPanel';
import SpinWheel from '@/app/components/SpinWheel';

export default function PlatformPage() {
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    opened: 0,
    completed: 0,
    progress: 0,
    points: 0,
    level: 1,
    streak: 0
  });

  const [headerOpacity, setHeaderOpacity] = useState(1);
  const whatsappLink = 'https://wa.me/message/UKASWZCU5BNLN1?src=qr';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      let newOpacity = 1 - currentScrollY / 120;
      if (newOpacity < 0) newOpacity = 0;
      if (newOpacity > 1) newOpacity = 1;
      setHeaderOpacity(newOpacity);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = localStorage.getItem('currentUser');
        if (!userData) {
          setLoading(false);
          return;
        }

        const parsedUser = JSON.parse(userData);
        let userId = parsedUser.id || parsedUser.userId || parsedUser.uid || parsedUser._id || parsedUser.phone || '';

        if (!userId) {
          console.error('لم يتم العثور على معرف مستخدم');
          setLoading(false);
          return;
        }

        setUserId(userId);

        if (parsedUser.grade && !parsedUser.year) {
          parsedUser.year = parsedUser.grade;
        }
        if (!parsedUser.year) {
          parsedUser.year = 'غير محدد';
        }

        setUser(parsedUser);

        if (parsedUser.year && userId) {
          await fetchSubjects(parsedUser.year, userId);
        }
      } catch (error) {
        console.error('خطأ في تحميل بيانات المستخدم:', error);
        setFetchError('فشل تحميل بيانات المستخدم');
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  const fetchSubjects = async (userYear: string, studentId: string) => {
    try {
      setSubjectsLoading(true);
      setFetchError(null);

      // جلب كل المواد
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const allSubjects: any[] = [];
      subjectsSnapshot.forEach((doc) => {
        allSubjects.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // جلب المواد المسجل فيها الطالب مع التقدم
      let enrolledData: any[] = [];
      try {
        const enrolledSnapshot = await getDocs(
          query(collection(db, 'student_subjects'), where('studentId', '==', studentId))
        );
        enrolledData = enrolledSnapshot.docs.map((doc) => ({
          subjectId: doc.data().subjectId,
          progress: doc.data().progress || 0,
        }));
      } catch (e) {
        console.log('لا توجد مواد مسجل فيها');
      }

      const subjectsWithStatus = allSubjects.map((subject) => {
        const enrolled = enrolledData.find((e) => e.subjectId === subject.id);
        return {
          ...subject,
          isEnrolled: !!enrolled,
          progress: enrolled?.progress || 0,
        };
      });

      setSubjects(subjectsWithStatus);

      const openedCount = subjectsWithStatus.filter((s) => s.isEnrolled).length;
      setStats({
        total: subjectsWithStatus.length,
        opened: openedCount,
        completed: 0,
        progress:
          subjectsWithStatus.length > 0
            ? Math.round((openedCount / subjectsWithStatus.length) * 100)
            : 0,
        points: 0,
        level: 1,
        streak: 0,
      });
    } catch (error: any) {
      console.error('خطأ في جلب المواد:', error);
      setFetchError(error?.message || 'فشل تحميل المواد');
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const getYearName = (yearCode: string) => {
    const yearMap: { [key: string]: string } = {
      '1-prep': 'أولى إعدادي',
      '2-prep': 'ثانية إعدادي',
      '3-prep': 'ثالثة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي',
    };
    return yearMap[yearCode] || yearCode || 'غير محدد';
  };

  const getDisplayedSubjects = () => {
    if (activeCategory === 'all') {
      return subjects;
    }
    return subjects.filter((s) => s.category === activeCategory);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>جاري تحميل المنصة...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.lockIcon}>🔒</div>
        <p style={styles.loadingText}>يجب تسجيل الدخول أولاً</p>
        <Link href="/login" style={styles.loginLink}>
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <p style={styles.loadingText}>حدث خطأ في تحميل البيانات</p>
        <p style={styles.errorText}>{fetchError}</p>
        <button onClick={() => window.location.reload()} style={styles.retryButton}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const userYear = getYearName(user.year || user.grade || '');
  const displayedSubjects = getDisplayedSubjects();

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleEnroll = async (subjectId: string) => {
    try {
      const { addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'student_subjects'), {
        studentId: user.id,
        subjectId: subjectId,
        progress: 0,
        isActive: true,
        enrolledAt: serverTimestamp(),
      });
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === subjectId ? { ...s, isEnrolled: true, progress: 0 } : s
        )
      );
      alert('✅ تم التسجيل في المادة بنجاح');
    } catch (error) {
      console.error(error);
      alert('❌ حدث خطأ في التسجيل');
    }
  };

  return (
    <div style={styles.container}>
      {isMobile && headerOpacity < 0.2 && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            position: 'fixed',
            top: '12px',
            right: '12px',
            zIndex: 1001,
            background: 'white',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '10px 14px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ☰
        </button>
      )}

      <header
        style={{
          ...styles.header,
          opacity: isMobile ? headerOpacity : 1,
          transition: 'opacity 0.1s ease-out',
        }}
      >
        <div style={styles.headerContent}>
          <div style={styles.logoSection}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={styles.menuToggle}
            >
              ☰
            </button>
            <div>
              <h1 style={styles.logo}>✨ Fancy Academic</h1>
              <p style={styles.logoSub}>منصة التعليم الذكية</p>
            </div>
          </div>

          <div style={styles.userSection}>
            <NotificationsPanel studentId={userId} studentGrade={userYear} />

            <div style={styles.userAvatar}>{user.name?.charAt(0) || 'ط'}</div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{user.name || 'طالب'}</div>
              <div style={styles.userBadge}>{userYear}</div>
            </div>
          </div>
        </div>
      </header>

      <div style={styles.mainContent}>
        {isSidebarOpen && (
          <aside
            style={{
              ...styles.sidebar,
              width: isMobile ? '250px' : '300px',
              position: 'fixed',
              top: '80px',
              right: '0',
              zIndex: 1000,
              boxShadow: '-5px 0 15px rgba(0,0,0,0.2)',
              height: 'calc(100vh - 80px)',
            }}
          >
            <button
              onClick={() => setIsSidebarOpen(false)}
              style={styles.closeSidebarButton}
            >
              ✕
            </button>

            <div style={styles.sidebarContent}>
              <div style={styles.yearCard}>
                <div style={styles.yearIcon}>📚</div>
                <div style={styles.yearInfo}>
                  <div style={styles.yearLabel}>سنتك الدراسية</div>
                  <div style={styles.yearValue}>{userYear}</div>
                </div>
              </div>

              <div style={styles.statsCard}>
                <h3 style={styles.statsTitle}>📊 إحصائياتك</h3>
                <div style={styles.statsList}>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>📚</span>
                    <div>
                      <div style={styles.statNumber}>{stats.total}</div>
                      <div style={styles.statLabel}>مواد</div>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>✅</span>
                    <div>
                      <div style={styles.statNumber}>{stats.opened}</div>
                      <div style={styles.statLabel}>مسجل فيها</div>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>📈</span>
                    <div>
                      <div style={styles.statNumber}>{stats.progress}%</div>
                      <div style={styles.statLabel}>تقدم</div>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>⭐</span>
                    <div>
                      <div style={styles.statNumber}>{stats.points}</div>
                      <div style={styles.statLabel}>نقاط</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.quickLinks}>
                <h4 style={styles.quickTitle}>روابط سريعة</h4>

                <Link href="/subjects" style={styles.quickLink}>
                  <span>📚</span>
                  <span>جميع المواد</span>
                </Link>

                <a href={whatsappLink} target="_blank" style={styles.quickLink}>
                  <span>📱</span>
                  <span>واتساب</span>
                </a>
                
<Link href="/spin" style={styles.quickLink}>
  <span>🎡</span>
  <span>عجلة الحظ</span>
</Link>

                <Link href="/bot" style={styles.quickLink}>
                  <span>🤖</span>
                  <span>المساعد الذكي</span>
                </Link>

                <Link href="/support/chat" style={styles.quickLink}>
                  <span>💬</span>
                  <span>الدعم الفني</span>
                </Link>

                <button
                  onClick={handleLogout}
                  style={{
                    ...styles.quickLink,
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    width: '100%',
                    cursor: 'pointer',
                    marginTop: '10px',
                  }}
                >
                  <span>🚪</span>
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        <main
          style={{
            ...styles.mainArea,
            padding: isMobile ? '15px' : '25px',
            width: '100%',
          }}
        >
          <div style={styles.navBar}>
            <div style={styles.breadcrumb}>
              <span>الرئيسية</span>
              {activeCategory !== 'all' && (
                <>
                  <span style={styles.breadcrumbSeparator}>/</span>
                  <span style={styles.breadcrumbActive}>{activeCategory}</span>
                </>
              )}
            </div>
          </div>

          <div style={isMobile ? styles.welcomeBannerMobile : styles.welcomeBanner}>
            <div>
              <h2 style={isMobile ? styles.welcomeTitleMobile : styles.welcomeTitle}>
                مرحباً {user.name} 👋
              </h2>
              <p style={isMobile ? styles.welcomeTextMobile : styles.welcomeText}>
                {userYear === 'ثانية ثانوي'
                  ? 'يعرض هنا مواد الكيمياء والفيزياء حسب التخصص'
                  : `هذه هي المواد المتاحة لسنتك الدراسية (${userYear})`}
              </p>
            </div>
            <div style={styles.userProgress}>
              <span style={styles.levelBadge}>🎯 المستوى {stats.level}</span>
              <span style={styles.streakBadge}>🔥 {stats.streak} يوم</span>
            </div>
          </div>

          {/* ✅ عجلة الحظ */}
          <div style={styles.spinSection}>
            <SpinWheel studentId={userId} />
          </div>

          {userYear === 'ثانية ثانوي' && (
            <div style={isMobile ? styles.categoriesBarMobile : styles.categoriesBar}>
              <button
                onClick={() => setActiveCategory('all')}
                style={{
                  ...styles.categoryButton,
                  background: activeCategory === 'all' ? '#3b82f6' : '#f3f4f6',
                  color: activeCategory === 'all' ? 'white' : '#4b5563',
                  fontSize: isMobile ? '14px' : '15px',
                  padding: isMobile ? '8px 16px' : '10px 20px',
                }}
              >
                📚 الكل
              </button>
              <button
                onClick={() => setActiveCategory('كيمياء')}
                style={{
                  ...styles.categoryButton,
                  background: activeCategory === 'كيمياء' ? '#8b5cf6' : '#f3f4f6',
                  color: activeCategory === 'كيمياء' ? 'white' : '#4b5563',
                  fontSize: isMobile ? '14px' : '15px',
                  padding: isMobile ? '8px 16px' : '10px 20px',
                }}
              >
                ⚗️ كيمياء
              </button>
              <button
                onClick={() => setActiveCategory('فيزياء')}
                style={{
                  ...styles.categoryButton,
                  background: activeCategory === 'فيزياء' ? '#ef4444' : '#f3f4f6',
                  color: activeCategory === 'فيزياء' ? 'white' : '#4b5563',
                  fontSize: isMobile ? '14px' : '15px',
                  padding: isMobile ? '8px 16px' : '10px 20px',
                }}
              >
                ⚛️ فيزياء
              </button>
            </div>
          )}

          {subjectsLoading ? (
            <div style={styles.loadingCourses}>
              <div style={styles.spinner}></div>
              <p>جاري تحميل المواد...</p>
            </div>
          ) : displayedSubjects.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <h3 style={styles.emptyTitle}>
                {userYear === 'ثانية ثانوي' && activeCategory !== 'all'
                  ? `لا توجد مواد في ${activeCategory}`
                  : 'لا توجد مواد متاحة'}
              </h3>
              <p style={styles.emptyText}>
                {userYear === 'ثانية ثانوي' && activeCategory !== 'all'
                  ? 'سيتم إضافة مواد قريباً'
                  : 'يمكنك التواصل مع الدعم لمعرفة المزيد'}
              </p>
            </div>
          ) : (
            <div style={isMobile ? styles.coursesGridMobile : styles.coursesGrid}>
              {displayedSubjects.map((subject) => (
                <div
                  key={subject.id}
                  style={isMobile ? styles.courseCardMobile : styles.courseCard}
                >
                  <div style={styles.courseHeader}>
                    <div style={styles.courseIcon}>
                      {subject.isEnrolled ? '📖' : '📚'}
                    </div>
                    <div>
                      <h3
                        style={
                          isMobile
                            ? styles.courseTitleMobile
                            : styles.courseTitle
                        }
                      >
                        {subject.name}
                      </h3>
                      {subject.grade && (
                        <span
                          style={{
                            ...styles.courseCategory,
                            background: '#e5e7eb',
                            color: '#4b5563',
                          }}
                        >
                          {subject.grade}
                        </span>
                      )}
                    </div>
                  </div>

                  <p
                    style={
                      isMobile
                        ? styles.courseDescriptionMobile
                        : styles.courseDescription
                    }
                  >
                    {subject.description || 'مادة تعليمية متخصصة'}
                  </p>

                  {/* ✅ شريط التقدم */}
                  {subject.isEnrolled && (
                    <div style={styles.progressContainer}>
                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${subject.progress || 0}%`,
                          }}
                        />
                      </div>
                      <span style={styles.progressText}>
                        {subject.progress || 0}%
                      </span>
                    </div>
                  )}

                  <div style={styles.courseMeta}>
                    <span>
                      📅{' '}
                      {new Date(subject.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                    <span>👨‍🏫 {subject.teacherId || 'لم يحدد'}</span>
                  </div>

                  <div style={styles.courseFooter}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: subject.isEnrolled ? '#d1fae5' : '#fee2e2',
                        color: subject.isEnrolled ? '#065f46' : '#991b1b',
                      }}
                    >
                      {subject.isEnrolled ? '✅ مسجل' : '🔒 غير مسجل'}
                    </span>

                    {subject.isEnrolled ? (
                      <Link href={`/subject/${subject.id}`} style={styles.courseButton}>
                        دخول المادة ←
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleEnroll(subject.id)}
                        style={styles.enrollButton}
                      >
                        ➕ تسجيل
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <footer style={styles.oldFooter}>
        <div style={isMobile ? styles.footerContentMobile : styles.footerContent}>
          <p style={styles.footerText}>
            © 2026 Fancy Academic - منصة التعليم الذكية
          </p>
          <div style={isMobile ? styles.footerLinksMobile : styles.footerLinks}>
            <span style={styles.footerLink}>سياسة الخصوصية</span>
            <span style={styles.footerLink}>الشروط والأحكام</span>
            <span style={styles.footerLink}>اتصل بنا</span>
          </div>
          <div style={styles.footerSupport}>
            <p style={styles.supportInfo}>
              تطوير:{' '}
              <a
                href="mailto:tomasmehany@gmail.com"
                style={styles.footerSupportLink}
              >
                tomasmehany@gmail.com
              </a>
            </p>
            <p style={styles.supportInfo}>
              للدعم:
              <a
                href={whatsappLink}
                target="_blank"
                style={styles.footerSupportLink}
              >
                واتساب
              </a>
            </p>
          </div>
        </div>
      </footer>

      <div style={isMobile ? styles.floatingButtonsMobile : styles.floatingButtons}>
        <Link
          href="/bot"
          style={{
            ...styles.floatingButton,
            background: 'linear-gradient(135deg, #10b981, #059669)',
          }}
          title="المساعد الذكي"
        >
          🤖
        </Link>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f9fafb',
    direction: 'rtl',
    fontFamily: '"Cairo", "Segoe UI", Tahoma, sans-serif',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    color: 'white',
    fontSize: '18px',
    marginBottom: '20px',
  },
  lockIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  errorText: {
    color: '#ffcccc',
    fontSize: '14px',
    marginBottom: '20px',
    maxWidth: '400px',
    textAlign: 'center',
  },
  retryButton: {
    padding: '12px 30px',
    background: 'white',
    color: '#667eea',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
  },
  loginLink: {
    padding: '12px 30px',
    background: 'white',
    color: '#667eea',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold',
    transition: 'all 0.3s',
  },
  header: {
    background: 'white',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  menuToggle: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#4b5563',
    padding: '5px 10px',
    borderRadius: '8px',
    transition: 'background 0.3s',
  },
  logo: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#1f2937',
    margin: 0,
  },
  logoSub: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  userAvatar: {
    width: '45px',
    height: '45px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  userInfo: {
    textAlign: 'right',
  },
  userName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
  },
  userBadge: {
    fontSize: '12px',
    color: '#3b82f6',
    fontWeight: '600',
    background: '#eff6ff',
    padding: '2px 8px',
    borderRadius: '12px',
    display: 'inline-block',
    marginTop: '4px',
  },
  mainContent: {
    position: 'relative',
    minHeight: 'calc(100vh - 140px)',
  },
  sidebar: {
    background: 'white',
    transition: 'transform 0.3s ease',
    overflowX: 'hidden',
    overflowY: 'auto',
    zIndex: 1000,
  },
  closeSidebarButton: {
    position: 'sticky',
    top: '10px',
    left: '10px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    margin: '10px 10px 0 auto',
    color: '#4b5563',
  },
  sidebarContent: {
    padding: '20px 15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
  },
  yearCard: {
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: 'white',
    borderRadius: '12px',
    padding: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  yearIcon: {
    fontSize: '28px',
    background: 'rgba(255, 255, 255, 0.2)',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearInfo: {
    flex: 1,
  },
  yearLabel: {
    fontSize: '12px',
    opacity: 0.9,
    marginBottom: '2px',
  },
  yearValue: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  statsCard: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '15px',
  },
  statsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 15px 0',
  },
  statsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statIcon: {
    fontSize: '24px',
    width: '40px',
    height: '40px',
    background: 'white',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
  },
  statNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  quickLinks: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '15px',
  },
  quickTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 12px 0',
  },
  quickLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    color: '#4b5563',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'all 0.2s',
    fontSize: '14px',
  },
  mainArea: {
    padding: '25px',
    maxWidth: '1300px',
    margin: '0 auto',
  },
  navBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#6b7280',
  },
  breadcrumbSeparator: {
    color: '#d1d5db',
  },
  breadcrumbActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  welcomeBanner: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '16px',
    padding: '20px 25px',
    color: 'white',
    marginBottom: '25px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeBannerMobile: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '16px',
    padding: '20px',
    color: 'white',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    alignItems: 'center',
    textAlign: 'center',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  welcomeTitleMobile: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
  },
  welcomeText: {
    fontSize: '16px',
    opacity: 0.95,
    margin: 0,
  },
  welcomeTextMobile: {
    fontSize: '14px',
    opacity: 0.95,
    margin: 0,
  },
  userProgress: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  levelBadge: {
    padding: '4px 12px',
    background: 'rgba(255, 215, 0, 0.2)',
    borderRadius: '20px',
    fontSize: '13px',
    color: '#FFD700',
  },
  streakBadge: {
    padding: '4px 12px',
    background: 'rgba(239, 68, 68, 0.2)',
    borderRadius: '20px',
    fontSize: '13px',
    color: '#f87171',
  },
  categoriesBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '25px',
    flexWrap: 'wrap',
  },
  categoriesBarMobile: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    overflowX: 'auto',
    padding: '5px 0',
    whiteSpace: 'nowrap',
    WebkitOverflowScrolling: 'touch',
  },
  categoryButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    animation: 'fadeIn 0.5s ease',
  },
  coursesGridMobile: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '15px',
    animation: 'fadeIn 0.5s ease',
  },
  courseCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '2px solid #f3f4f6',
    transition: 'all 0.3s',
  },
  courseCardMobile: {
    background: 'white',
    borderRadius: '12px',
    padding: '15px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f3f4f6',
    transition: 'all 0.3s',
  },
  courseHeader: {
    display: 'flex',
    gap: '15px',
    marginBottom: '15px',
  },
  courseIcon: {
    fontSize: '32px',
    background: '#f3f4f6',
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 5px 0',
  },
  courseTitleMobile: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 3px 0',
  },
  courseCategory: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '3px 10px',
    borderRadius: '20px',
    display: 'inline-block',
  },
  courseDescription: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '15px',
    lineHeight: 1.6,
  },
  courseDescriptionMobile: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px',
    lineHeight: 1.5,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  progressBar: {
    flex: 1,
    height: '6px',
    background: 'rgba(0,0,0,0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  progressText: {
    fontSize: '12px',
    color: '#FFD700',
    fontWeight: 'bold',
    minWidth: '35px',
  },
  courseMeta: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
    color: '#9ca3af',
    marginBottom: '15px',
  },
  courseFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  courseButton: {
    padding: '8px 16px',
    background: '#10b981',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  enrollButton: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  spinSection: {
    marginBottom: '30px',
  },
  loadingCourses: {
    textAlign: 'center',
    padding: '50px',
    color: '#6b7280',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '16px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '20px',
    color: '#1f2937',
    marginBottom: '10px',
  },
  emptyText: {
    color: '#6b7280',
  },
  oldFooter: {
    background: '#1f2937',
    color: 'white',
    padding: '30px 20px',
    marginTop: '40px',
  },
  footerContent: {
    maxWidth: '1600px',
    margin: '0 auto',
    textAlign: 'center',
  },
  footerContentMobile: {
    maxWidth: '1600px',
    margin: '0 auto',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  footerText: {
    color: '#d1d5db',
    marginBottom: '15px',
    fontSize: '14px',
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  footerLinksMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px',
  },
  footerLink: {
    color: '#9ca3af',
    textDecoration: 'none',
    fontSize: '13px',
    cursor: 'default',
  },
  footerSupport: {
    marginTop: '20px',
  },
  supportInfo: {
    color: '#9ca3af',
    fontSize: '12px',
    marginTop: '8px',
  },
  footerSupportLink: {
    color: '#60a5fa',
    textDecoration: 'none',
    margin: '0 5px',
  },
  floatingButtons: {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  floatingButtonsMobile: {
    position: 'fixed',
    bottom: '15px',
    left: '15px',
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  floatingButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60px',
    height: '60px',
    color: 'white',
    borderRadius: '50%',
    textDecoration: 'none',
    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
    fontSize: '26px',
    border: '2px solid white',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
};