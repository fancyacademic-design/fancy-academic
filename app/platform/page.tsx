'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

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
  const [message, setMessage] = useState('');
  
  // ✅ إحصائيات الطالب
  const [stats, setStats] = useState({
    total: 0,
    opened: 0,
    completed: 0,
    progress: 0,
    xp: 0,
    level: 1,
    streak: 0,
    gems: 0,
    freezes: 0,
  });

  // ✅ طلبات الربط
  const [linkRequests, setLinkRequests] = useState<any[]>([]);
  
  // ✅ الإشعارات
  const [notifications, setNotifications] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [headerOpacity, setHeaderOpacity] = useState(1);
  const whatsappLink = 'https://wa.me/201080217436';

  // ✅ التحقق من حجم الشاشة
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

  // ✅ تأثير التمرير للهواتف
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

  // ✅ تحميل بيانات المستخدم
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

        await fetchUserStats(userId);
        await fetchLinkRequests(userId);
        await fetchNotifications(userId);

        if (parsedUser.year && userId) {
          await fetchSubjects(parsedUser.year, userId);
        }

        await updateDailyStreak(userId);

      } catch (error) {
        console.error('خطأ في تحميل بيانات المستخدم:', error);
        setFetchError('فشل تحميل بيانات المستخدم');
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  // ✅ جلب إحصائيات المستخدم
  const fetchUserStats = async (studentId: string) => {
    try {
      const userRef = doc(db, 'users', studentId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setStats(prev => ({
          ...prev,
          xp: data.xp || 0,
          level: data.level || 1,
          streak: data.streak || 0,
          gems: data.gems || 0,
          freezes: data.freezes || 0,
        }));
      }
    } catch (error) {
      console.error('❌ خطأ في جلب إحصائيات المستخدم:', error);
    }
  };

  // ✅ تحديث الحضور اليومي
  const updateDailyStreak = async (studentId: string) => {
    try {
      const userRef = doc(db, 'users', studentId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return;
      
      const data = userDoc.data();
      const today = new Date().toDateString();
      const lastVisit = data.lastVisitDate || '';
      const currentStreak = data.streak || 0;
      const currentFreezes = data.freezes || 0;
      
      if (lastVisit === today) {
        return;
      }
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      
      let newStreak = currentStreak;
      let newFreezes = currentFreezes;
      
      if (lastVisit === yesterdayStr) {
        newStreak = currentStreak + 1;
        if (newStreak % 10 === 0 && newFreezes < 3) {
          newFreezes = Math.min(newFreezes + 1, 3);
        }
      } else if (lastVisit !== today && lastVisit !== yesterdayStr) {
        if (currentFreezes > 0) {
          newFreezes = currentFreezes - 1;
        } else {
          newStreak = 0;
        }
      }
      
      await updateDoc(userRef, {
        streak: newStreak,
        freezes: newFreezes,
        lastVisitDate: today,
        lastUpdated: serverTimestamp(),
      });
      
      setStats(prev => ({
        ...prev,
        streak: newStreak,
        freezes: newFreezes,
      }));
      
    } catch (error) {
      console.error('❌ خطأ في تحديث الحضور اليومي:', error);
    }
  };

  // ✅ جلب طلبات الربط
  const fetchLinkRequests = async (studentId: string) => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('studentId', '==', studentId),
        where('type', '==', 'parent_request'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLinkRequests(requests);
    } catch (error) {
      console.error('❌ خطأ في جلب طلبات الربط:', error);
    }
  };

  // ✅ جلب الإشعارات
  const fetchNotifications = async (studentId: string) => {
    try {
      const allQuery = query(
        collection(db, "notifications"), 
        where("target.type", "==", "all"),
        orderBy("createdAt", "desc")
      );
      
      const gradeQuery = query(
        collection(db, "notifications"), 
        where("target.type", "==", "grade"), 
        where("target.grade", "==", user?.grade || '1-prep'),
        orderBy("createdAt", "desc")
      );
      
      const studentQuery = query(
        collection(db, "notifications"), 
        where("target.type", "==", "student"), 
        where("target.studentId", "==", studentId),
        orderBy("createdAt", "desc")
      );
      
      const directQuery = query(
        collection(db, "notifications"),
        where("studentId", "==", studentId),
        orderBy("createdAt", "desc")
      );
      
      const [allSnap, gradeSnap, studentSnap, directSnap] = await Promise.all([
        getDocs(allQuery),
        getDocs(gradeQuery),
        getDocs(studentQuery),
        getDocs(directQuery)
      ]);
      
      const allNotifications = [];
      
      allSnap.forEach(doc => {
        allNotifications.push({ id: doc.id, ...doc.data() });
      });
      
      gradeSnap.forEach(doc => {
        if (!allNotifications.find(n => n.id === doc.id)) {
          allNotifications.push({ id: doc.id, ...doc.data() });
        }
      });
      
      studentSnap.forEach(doc => {
        if (!allNotifications.find(n => n.id === doc.id)) {
          allNotifications.push({ id: doc.id, ...doc.data() });
        }
      });
      
      directSnap.forEach(doc => {
        if (!allNotifications.find(n => n.id === doc.id)) {
          allNotifications.push({ id: doc.id, ...doc.data() });
        }
      });
      
      allNotifications.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return timeB - timeA;
      });
      
      const normalNotifications = allNotifications.filter(n => n.type !== 'parent_request');
      
      setNotifications(normalNotifications);
      
      const allCombined = [...normalNotifications, ...linkRequests];
      allCombined.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return timeB - timeA;
      });
      setAllNotifications(allCombined);
      updateUnreadCount(allCombined, studentId);
      
    } catch (error) {
      console.error('❌ خطأ في جلب الإشعارات:', error);
    }
  };

  const updateUnreadCount = (notificationsList: any[], studentId: string) => {
    const count = notificationsList.filter(n => {
      if (n.type === 'parent_request') return true;
      return !n.readBy?.includes(studentId);
    }).length;
    setUnreadCount(count);
  };

  const handleOpenNotifications = () => {
    setShowNotificationPanel(!showNotificationPanel);
    if (!showNotificationPanel) {
      setUnreadCount(0);
    }
  };

  // ✅ الموافقة على طلب الربط
  const acceptLinkRequest = async (request: any) => {
    try {
      await updateDoc(doc(db, 'notifications', request.id), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });

      const parentRef = doc(db, 'users', request.parentId);
      const parentDoc = await getDoc(parentRef);
      if (parentDoc.exists()) {
        const parentData = parentDoc.data();
        const childrenList = parentData.children || [];
        if (!childrenList.includes(userId)) {
          childrenList.push(userId);
          await updateDoc(parentRef, {
            children: childrenList,
          });
        }
      }

      setLinkRequests(linkRequests.filter(r => r.id !== request.id));
      setMessage(`✅ تم ربطك بـ ${request.parentName} بنجاح!`);

    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في الموافقة');
    }
  };

  // ✅ رفض طلب الربط
  const rejectLinkRequest = async (request: any) => {
    try {
      await updateDoc(doc(db, 'notifications', request.id), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });

      setLinkRequests(linkRequests.filter(r => r.id !== request.id));
      setMessage(`❌ تم رفض طلب الربط من ${request.parentName}`);

    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في الرفض');
    }
  };

  // ✅ علامة كـ "مقروء"
  const markAsRead = async (notificationId: string) => {
    try {
      const notifRef = doc(db, "notifications", notificationId);
      await updateDoc(notifRef, {
        readBy: [...(notifications.find(n => n.id === notificationId)?.readBy || []), userId]
      });
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId 
          ? { ...n, readBy: [...(n.readBy || []), userId] }
          : n
      ));
      
      const updatedAll = allNotifications.map(n => 
        n.id === notificationId 
          ? { ...n, readBy: [...(n.readBy || []), userId] }
          : n
      );
      updateUnreadCount(updatedAll, userId);
      
    } catch (err) {
      console.error("خطأ:", err);
    }
  };

  // ✅ جلب المواد
  const fetchSubjects = async (userYear: string, studentId: string) => {
    try {
      setSubjectsLoading(true);
      setFetchError(null);

      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const allSubjects: any[] = [];
      
      for (const doc of subjectsSnapshot.docs) {
        const data = doc.data();
        
        let teacherName = data.teacherName || 'لم يحدد';
        
        if (data.teacherId && !data.teacherName) {
          try {
            const teacherRef = doc(db, 'users', data.teacherId);
            const teacherDoc = await getDoc(teacherRef);
            if (teacherDoc.exists()) {
              teacherName = teacherDoc.data().name || 'لم يحدد';
            }
          } catch (e) {
            console.log('❌ خطأ في جلب اسم المدرس:', e);
          }
        }
        
        allSubjects.push({
          id: doc.id,
          ...data,
          teacherName: teacherName,
        });
      }

      let enrolledSubjects: string[] = [];
      try {
        const enrolledSnapshot = await getDocs(
          query(collection(db, 'student_subjects'), where('studentId', '==', studentId))
        );
        enrolledSubjects = enrolledSnapshot.docs.map((doc) => doc.data().subjectId);
      } catch (e) {
        console.log('لا توجد مواد مسجل فيها');
      }

      let allExams: any[] = [];
      try {
        const examsSnapshot = await getDocs(collection(db, 'exams'));
        allExams = examsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (e) {
        console.log('❌ خطأ في جلب الامتحانات:', e);
      }

      let studentResults: any[] = [];
      try {
        const resultsQuery = query(
          collection(db, 'exam_results'),
          where('studentId', '==', studentId)
        );
        const resultsSnapshot = await getDocs(resultsQuery);
        studentResults = resultsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (e) {
        console.log('❌ خطأ في جلب نتائج الطالب:', e);
      }

      const subjectsWithStatus = await Promise.all(allSubjects.map(async (subject) => {
        const isEnrolled = enrolledSubjects.includes(subject.id);
        
        let totalExams = 0;
        let completedExams = 0;

        if (isEnrolled) {
          const subjectExams = allExams.filter(exam => exam.subjectId === subject.id);
          totalExams = subjectExams.length;
          
          subjectExams.forEach(exam => {
            const result = studentResults.find(r => r.examId === exam.id);
            if (result) {
              completedExams++;
            }
          });
        }
        
        const progress = totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0;

        return {
          ...subject,
          isEnrolled: isEnrolled,
          progress: progress,
        };
      }));

      setSubjects(subjectsWithStatus);

      const enrolledSubjectsList = subjectsWithStatus.filter(s => s.isEnrolled);
      const openedCount = enrolledSubjectsList.length;
      
      let realProgress = 0;
      if (enrolledSubjectsList.length > 0) {
        const totalProgress = enrolledSubjectsList.reduce((sum, s) => sum + (s.progress || 0), 0);
        realProgress = Math.round(totalProgress / enrolledSubjectsList.length);
      }

      setStats(prev => ({
        ...prev,
        total: subjectsWithStatus.length,
        opened: openedCount,
        progress: realProgress,
      }));

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
      '3-prep': 'تالتة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي',
      '3-secondary': 'تالتة ثانوي',
    };
    return yearMap[yearCode] || yearCode || 'غير محدد';
  };

  const getDisplayedSubjects = () => {
    if (activeCategory === 'all') {
      return subjects;
    }
    return subjects.filter((s) => s.category === activeCategory);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
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

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'success': return { background: 'rgba(16,185,129,0.1)', color: '#34d399', borderColor: '#10b981' };
      case 'warning': return { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: '#f59e0b' };
      case 'error': return { background: 'rgba(239,68,68,0.1)', color: '#f87171', borderColor: '#ef4444' };
      default: return { background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderColor: '#3b82f6' };
    }
  };

  return (
    <div style={styles.container}>
      {/* ✅ الهيدر */}
      <header
        style={{
          ...styles.header,
          opacity: isMobile ? headerOpacity : 1,
          transition: 'opacity 0.1s ease-out',
        }}
      >
        <div style={isMobile ? styles.headerContentMobile : styles.headerContent}>
          <div style={styles.logoSection}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={isMobile ? {...styles.menuToggle, fontSize: '20px'} : styles.menuToggle}
            >
              ☰
            </button>
            <div>
              <h1 style={isMobile ? {...styles.logo, fontSize: '18px'} : styles.logo}>✨ Fancy Academy</h1>
              <p style={isMobile ? {...styles.logoSub, fontSize: '10px'} : styles.logoSub}>منصة التعليم الذكية</p>
            </div>
          </div>

          <div style={isMobile ? styles.userSectionMobile : styles.userSection}>
            <button 
              onClick={handleOpenNotifications}
              style={isMobile ? {...styles.notifButton, fontSize: '20px'} : styles.notifButton}
            >
              🔔
              {unreadCount > 0 && (
                <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            <div style={isMobile ? styles.statsBadgesMobile : styles.statsBadges}>
              <span style={isMobile ? {...styles.xpBadge, fontSize: '10px', padding: '2px 8px'} : styles.xpBadge}>⭐ {stats.xp}</span>
              <span style={isMobile ? {...styles.levelBadge, fontSize: '10px', padding: '2px 8px'} : styles.levelBadge}>🎯 {stats.level}</span>
              <span style={isMobile ? {...styles.gemBadge, fontSize: '10px', padding: '2px 8px'} : styles.gemBadge}>💎 {stats.gems}</span>
              <span style={isMobile ? {...styles.streakBadge, fontSize: '10px', padding: '2px 8px'} : styles.streakBadge}>
                🔥 {stats.streak}
                {stats.freezes > 0 && (
                  <span style={styles.freezeBadge}> ❄️{stats.freezes}</span>
                )}
              </span>
            </div>

            <div style={isMobile ? {...styles.userAvatar, width: '35px', height: '35px', fontSize: '14px'} : styles.userAvatar}>
              {user.name?.charAt(0) || 'ط'}
            </div>
            <div style={isMobile ? styles.userInfoMobile : styles.userInfo}>
              <div style={isMobile ? {...styles.userName, fontSize: '13px'} : styles.userName}>{user.name || 'طالب'}</div>
              <div style={isMobile ? {...styles.userBadge, fontSize: '10px'} : styles.userBadge}>{userYear}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ✅ صندوق الإشعارات */}
      {showNotificationPanel && (
        <>
          <div style={styles.overlay} onClick={() => setShowNotificationPanel(false)} />
          <div style={isMobile ? {...styles.notificationPanel, width: 'calc(100% - 20px)', left: '10px', top: '70px'} : styles.notificationPanel}>
            <div style={styles.panelHeader}>
              <h3 style={isMobile ? {...styles.panelTitle, fontSize: '16px'} : styles.panelTitle}>🔔 الإشعارات</h3>
              <button onClick={() => setShowNotificationPanel(false)} style={styles.closeBtn}>✕</button>
            </div>
            
            <div style={styles.panelContent}>
              {allNotifications.length === 0 ? (
                <div style={styles.empty}>لا توجد إشعارات</div>
              ) : (
                allNotifications.map((item) => {
                  if (item.type === 'parent_request') {
                    return (
                      <div key={item.id} style={styles.linkRequestCard}>
                        <div style={styles.linkRequestInfo}>
                          <span style={styles.linkRequestIcon}>👤</span>
                          <div>
                            <div style={styles.linkRequestName}>{item.parentName}</div>
                            <div style={styles.linkRequestMessage}>{item.message || 'يريد ربطك بحسابه'}</div>
                          </div>
                        </div>
                        <div style={styles.linkRequestActions}>
                          <button
                            onClick={() => acceptLinkRequest(item)}
                            style={styles.acceptButton}
                          >
                            ✅ موافقة
                          </button>
                          <button
                            onClick={() => rejectLinkRequest(item)}
                            style={styles.rejectButton}
                          >
                            ❌ رفض
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const isRead = item.readBy?.includes(userId);
                  const typeStyle = getTypeStyle(item.notificationType || item.type);
                  
                  return (
                    <div 
                      key={item.id} 
                      style={{...styles.notificationItem, ...typeStyle, opacity: isRead ? 0.6 : 1}}
                      onClick={() => !isRead && markAsRead(item.id)}
                    >
                      <div style={styles.notifHeader}>
                        <span style={isMobile ? {...styles.notifTitle, fontSize: '13px'} : styles.notifTitle}>{item.title}</span>
                        <span style={isMobile ? {...styles.notifTime, fontSize: '10px'} : styles.notifTime}>
                          {item.createdAt?.toDate?.() 
                            ? new Date(item.createdAt.toDate()).toLocaleString('ar-EG')
                            : new Date(item.createdAt).toLocaleString('ar-EG')}
                        </span>
                      </div>
                      <p style={isMobile ? {...styles.notifBody, fontSize: '12px'} : styles.notifBody}>{item.body}</p>
                      {!isRead && <div style={styles.unreadDot}>جديد</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      <div style={styles.mainContent}>
        {/* ✅ السايدبار */}
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
                    <span style={styles.statIcon}>⭐</span>
                    <div>
                      <div style={styles.statNumber}>{stats.xp}</div>
                      <div style={styles.statLabel}>نقاط خبرة</div>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>🎯</span>
                    <div>
                      <div style={styles.statNumber}>{stats.level}</div>
                      <div style={styles.statLabel}>المستوى</div>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>🔥</span>
                    <div>
                      <div style={styles.statNumber}>{stats.streak}</div>
                      <div style={styles.statLabel}>حماس يومي</div>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>💎</span>
                    <div>
                      <div style={styles.statNumber}>{stats.gems}</div>
                      <div style={styles.statLabel}>جواهر</div>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>❄️</span>
                    <div>
                      <div style={styles.statNumber}>{stats.freezes}</div>
                      <div style={styles.statLabel}>تجميدات</div>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>📚</span>
                    <div>
                      <div style={styles.statNumber}>{stats.total}</div>
                      <div style={styles.statLabel}>مواد</div>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>📈</span>
                    <div>
                      <div style={styles.statNumber}>{stats.progress}%</div>
                      <div style={styles.statLabel}>تقدم تعليمي</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.quickLinks}>
                <h4 style={styles.quickTitle}>روابط سريعة</h4>

                <Link href="/map" style={styles.quickLink}>
                  <span>🗺️</span>
                  <span>الخريطة التعليمية</span>
                </Link>

                <Link href="/my-exams" style={styles.quickLink}>
                  <span>📝</span>
                  <span>امتحاناتي وواجباتي</span>
                </Link>

                <Link href="/spin" style={styles.quickLink}>
                  <span>🎡</span>
                  <span>عجلة الحظ</span>
                </Link>

                <Link href="/bot" style={styles.quickLink}>
                  <span>🤖</span>
                  <span>المساعد الذكي</span>
                </Link>

                <Link href="/store" style={styles.quickLink}>
                  <span>🛒</span>
                  <span>المتجر</span>
                </Link>

                <a href={whatsappLink} target="_blank" style={styles.quickLink}>
                  <span>📱</span>
                  <span>واتساب</span>
                </a>

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
          {message && (
            <div style={{
              ...styles.messageBox,
              background: message.includes('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: message.includes('✅') ? '#34d399' : '#f87171',
            }}>
              {message}
            </div>
          )}

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
                {userYear === 'ثانية ثانوي' || userYear === 'تالتة ثانوي'
                  ? 'يعرض هنا المواد حسب التخصص'
                  : `هذه هي المواد المتاحة لسنتك الدراسية (${userYear})`}
              </p>
            </div>
            <div style={styles.userProgress}>
              <span style={styles.levelBadge}>🎯 المستوى {stats.level}</span>
              <span style={styles.streakBadge}>
                🔥 {stats.streak} يوم
                {stats.freezes > 0 && (
                  <span style={styles.freezeBadge}> ❄️{stats.freezes}</span>
                )}
              </span>
            </div>
          </div>

          {(userYear === 'ثانية ثانوي' || userYear === 'تالتة ثانوي') && (
            <div style={isMobile ? styles.categoriesBarMobile : styles.categoriesBar}>
              <button
                onClick={() => setActiveCategory('all')}
                style={{
                  ...styles.categoryButton,
                  background: activeCategory === 'all' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                  color: activeCategory === 'all' ? 'white' : 'rgba(255,255,255,0.6)',
                  fontSize: isMobile ? '12px' : '15px',
                  padding: isMobile ? '6px 12px' : '10px 20px',
                }}
              >
                📚 الكل
              </button>
              <button
                onClick={() => setActiveCategory('كيمياء')}
                style={{
                  ...styles.categoryButton,
                  background: activeCategory === 'كيمياء' ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                  color: activeCategory === 'كيمياء' ? 'white' : 'rgba(255,255,255,0.6)',
                  fontSize: isMobile ? '12px' : '15px',
                  padding: isMobile ? '6px 12px' : '10px 20px',
                }}
              >
                ⚗️ كيمياء
              </button>
              <button
                onClick={() => setActiveCategory('فيزياء')}
                style={{
                  ...styles.categoryButton,
                  background: activeCategory === 'فيزياء' ? '#ef4444' : 'rgba(255,255,255,0.05)',
                  color: activeCategory === 'فيزياء' ? 'white' : 'rgba(255,255,255,0.6)',
                  fontSize: isMobile ? '12px' : '15px',
                  padding: isMobile ? '6px 12px' : '10px 20px',
                }}
              >
                ⚛️ فيزياء
              </button>
              <button
                onClick={() => setActiveCategory('أحياء')}
                style={{
                  ...styles.categoryButton,
                  background: activeCategory === 'أحياء' ? '#10b981' : 'rgba(255,255,255,0.05)',
                  color: activeCategory === 'أحياء' ? 'white' : 'rgba(255,255,255,0.6)',
                  fontSize: isMobile ? '12px' : '15px',
                  padding: isMobile ? '6px 12px' : '10px 20px',
                }}
              >
                🧬 أحياء
              </button>
              <button
                onClick={() => setActiveCategory('جيولوجيا')}
                style={{
                  ...styles.categoryButton,
                  background: activeCategory === 'جيولوجيا' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                  color: activeCategory === 'جيولوجيا' ? 'white' : 'rgba(255,255,255,0.6)',
                  fontSize: isMobile ? '12px' : '15px',
                  padding: isMobile ? '6px 12px' : '10px 20px',
                }}
              >
                🌍 جيولوجيا
              </button>
            </div>
          )}

          {subjectsLoading ? (
            <div style={styles.loadingCourses}>
              <div style={styles.spinner}></div>
              <p style={isMobile ? {...styles.loadingText, fontSize: '14px'} : styles.loadingText}>جاري تحميل المواد...</p>
            </div>
          ) : displayedSubjects.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <h3 style={isMobile ? {...styles.emptyTitle, fontSize: '18px'} : styles.emptyTitle}>
                {(userYear === 'ثانية ثانوي' || userYear === 'تالتة ثانوي') && activeCategory !== 'all'
                  ? `لا توجد مواد في ${activeCategory}`
                  : 'لا توجد مواد متاحة'}
              </h3>
              <p style={isMobile ? {...styles.emptyText, fontSize: '13px'} : styles.emptyText}>
                {(userYear === 'ثانية ثانوي' || userYear === 'تالتة ثانوي') && activeCategory !== 'all'
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
                  {/* ✅ الصورة - تغطي المربع بالكامل */}
                  <div style={styles.imageContainer}>
                    {subject.imageUrl ? (
                      <div style={isMobile ? styles.subjectImageWrapperMobile : styles.subjectImageWrapper}>
                        <img 
                          src={subject.imageUrl} 
                          alt={subject.name}
                          style={isMobile ? styles.subjectImageMobile : styles.subjectImage}
                        />
                      </div>
                    ) : (
                      <div style={isMobile ? styles.subjectImagePlaceholderMobile : styles.subjectImagePlaceholder}>
                        <span style={isMobile ? {...styles.placeholderIcon, fontSize: '32px'} : styles.placeholderIcon}>
                          {subject.isEnrolled ? '📖' : '📚'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ✅ اسم المادة تحت الصورة */}
                  <h3 style={isMobile ? styles.courseTitleMobile : styles.courseTitle}>
                    {subject.name}
                  </h3>

                  {subject.grade && (
                    <span
                      style={{
                        ...styles.courseCategory,
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: isMobile ? '10px' : '12px',
                        display: 'inline-block',
                        marginBottom: '8px',
                      }}
                    >
                      {subject.grade}
                    </span>
                  )}

                  {/* ✅ الوصف */}
                  <p style={isMobile ? styles.courseDescriptionMobile : styles.courseDescription}>
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

                  {/* ✅ التاريخ والمدرس */}
                  <div style={isMobile ? styles.courseMetaMobile : styles.courseMeta}>
                    <span style={isMobile ? {fontSize: '11px'} : {}}>📅 {new Date(subject.createdAt).toLocaleDateString('ar-EG')}</span>
                    <span style={isMobile ? {fontSize: '11px'} : {}}>👨‍🏫 {subject.teacherName || 'لم يحدد'}</span>
                  </div>

                  {/* ✅ الأزرار */}
                  <div style={isMobile ? styles.courseFooterMobile : styles.courseFooter}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: subject.isEnrolled ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: subject.isEnrolled ? '#34d399' : '#f87171',
                        fontSize: isMobile ? '11px' : '13px',
                        padding: isMobile ? '4px 10px' : '6px 12px',
                      }}
                    >
                      {subject.isEnrolled ? '✅ مسجل' : '🔒 غير مسجل'}
                    </span>

                    {subject.isEnrolled ? (
                      <Link href={`/subject/${subject.id}`} style={isMobile ? {...styles.courseButton, fontSize: '12px', padding: '6px 12px'} : styles.courseButton}>
                        دخول المادة ←
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleEnroll(subject.id)}
                        style={isMobile ? {...styles.enrollButton, fontSize: '12px', padding: '6px 12px'} : styles.enrollButton}
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

      {/* ✅ الفوتر */}
      <footer style={styles.oldFooter}>
        <div style={isMobile ? styles.footerContentMobile : styles.footerContent}>
          <p style={isMobile ? {...styles.footerText, fontSize: '12px'} : styles.footerText}>
            © 2026 Fancy Academy - منصة التعليم الذكية
          </p>
          <div style={isMobile ? styles.footerLinksMobile : styles.footerLinks}>
            <span style={isMobile ? {...styles.footerLink, fontSize: '11px'} : styles.footerLink}>سياسة الخصوصية</span>
            <span style={isMobile ? {...styles.footerLink, fontSize: '11px'} : styles.footerLink}>الشروط والأحكام</span>
            <span style={isMobile ? {...styles.footerLink, fontSize: '11px'} : styles.footerLink}>اتصل بنا</span>
          </div>
          <div style={styles.footerSupport}>
            <p style={isMobile ? {...styles.supportInfo, fontSize: '10px'} : styles.supportInfo}>
              تطوير:{' '}
              <a
                href="mailto:tomasmehany@gmail.com"
                style={styles.footerSupportLink}
              >
                TM
              </a>
            </p>
            <p style={isMobile ? {...styles.supportInfo, fontSize: '10px'} : styles.supportInfo}>
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
            width: isMobile ? '50px' : '60px',
            height: isMobile ? '50px' : '60px',
            fontSize: isMobile ? '22px' : '26px',
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

// ✅ جميع الأنماط
const styles: any = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 100%)',
    direction: 'rtl',
    fontFamily: '"Cairo", "Segoe UI", Tahoma, sans-serif',
    color: 'white',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 100%)',
    color: 'white',
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 215, 0, 0.1)',
    borderTopColor: '#FFD700',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
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
    color: '#f87171',
    fontSize: '14px',
    marginBottom: '20px',
    maxWidth: '400px',
    textAlign: 'center',
  },
  retryButton: {
    padding: '12px 30px',
    background: '#FFD700',
    color: '#0a0a14',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
  },
  loginLink: {
    padding: '12px 30px',
    background: '#FFD700',
    color: '#0a0a14',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold',
    transition: 'all 0.3s',
  },
  header: {
    background: 'rgba(255,255,255,0.02)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
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
  headerContentMobile: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '10px 15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  menuToggle: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.6)',
    padding: '5px 10px',
    borderRadius: '8px',
    transition: 'background 0.3s',
  },
  logo: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'white',
    margin: 0,
  },
  logoSub: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    margin: 0,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  userSectionMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  notifButton: {
    position: 'relative' as const,
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    transition: 'all 0.3s',
    color: 'rgba(255,255,255,0.8)',
  },
  badge: {
    position: 'absolute' as const,
    top: '0',
    right: '0',
    background: '#ef4444',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '50%',
    minWidth: '18px',
    textAlign: 'center' as const,
  },
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 998,
  },
  notificationPanel: {
    position: 'fixed' as const,
    top: '80px',
    left: '20px',
    width: '420px',
    maxWidth: 'calc(100% - 40px)',
    maxHeight: 'calc(100vh - 120px)',
    background: '#1a1a2e',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    zIndex: 999,
    overflow: 'hidden',
    direction: 'rtl' as const,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.02)',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    color: 'white',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.5)',
  },
  panelContent: {
    maxHeight: 'calc(100vh - 200px)',
    overflowY: 'auto' as const,
    padding: '10px',
  },
  linkRequestCard: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(139,92,246,0.2)',
    background: 'rgba(139,92,246,0.05)',
    marginBottom: '8px',
  },
  linkRequestInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  linkRequestIcon: {
    fontSize: '28px',
  },
  linkRequestName: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: 'white',
  },
  linkRequestMessage: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
  },
  linkRequestActions: {
    display: 'flex',
    gap: '8px',
  },
  acceptButton: {
    padding: '6px 16px',
    background: 'rgba(16,185,129,0.15)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  rejectButton: {
    padding: '6px 16px',
    background: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  notificationItem: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  notifHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
    flexWrap: 'wrap' as const,
    gap: '5px',
  },
  notifTitle: {
    fontWeight: 'bold',
    fontSize: '15px',
    color: 'white',
  },
  notifTime: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
  },
  notifBody: {
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '0 0 8px 0',
    color: 'rgba(255,255,255,0.6)',
  },
  unreadDot: {
    display: 'inline-block',
    fontSize: '10px',
    background: '#3b82f6',
    color: 'white',
    padding: '2px 10px',
    borderRadius: '20px',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '30px 20px',
    color: 'rgba(255,255,255,0.3)',
  },
  messageBox: {
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
    border: '1px solid',
    fontSize: '14px',
  },
  statsBadges: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  statsBadgesMobile: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  xpBadge: {
    padding: '4px 10px',
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  levelBadge: {
    padding: '4px 10px',
    background: 'rgba(139, 92, 246, 0.15)',
    color: '#a78bfa',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  gemBadge: {
    padding: '4px 10px',
    background: 'rgba(139, 92, 246, 0.15)',
    color: '#a78bfa',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  streakBadge: {
    padding: '4px 10px',
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  freezeBadge: {
    padding: '2px 6px',
    background: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    borderRadius: '12px',
    fontSize: '11px',
    marginLeft: '4px',
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
  userInfoMobile: {
    textAlign: 'right',
    display: 'none',
  },
  userName: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'white',
  },
  userBadge: {
    fontSize: '12px',
    color: '#60a5fa',
    fontWeight: '600',
    background: 'rgba(59, 130, 246, 0.15)',
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
    background: 'rgba(20, 20, 40, 0.95)',
    backdropFilter: 'blur(10px)',
    transition: 'transform 0.3s ease',
    overflowX: 'hidden',
    overflowY: 'auto',
    zIndex: 1000,
    borderLeft: '1px solid rgba(255,255,255,0.05)',
  },
  closeSidebarButton: {
    position: 'sticky',
    top: '10px',
    left: '10px',
    background: 'rgba(255,255,255,0.05)',
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
    color: 'rgba(255,255,255,0.6)',
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
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    padding: '15px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  statsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    margin: '0 0 15px 0',
  },
  statsList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    textAlign: 'center',
    padding: '8px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  statIcon: {
    fontSize: '20px',
  },
  statNumber: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
  },
  quickLinks: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    padding: '15px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  quickTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    margin: '0 0 12px 0',
  },
  quickLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    color: 'rgba(255,255,255,0.6)',
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
    color: 'rgba(255,255,255,0.4)',
  },
  breadcrumbSeparator: {
    color: 'rgba(255,255,255,0.2)',
  },
  breadcrumbActive: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  welcomeBanner: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
    borderRadius: '16px',
    padding: '20px 25px',
    color: 'white',
    marginBottom: '25px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  welcomeBannerMobile: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
    borderRadius: '12px',
    padding: '15px',
    color: 'white',
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'center',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  welcomeTitleMobile: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
  },
  welcomeText: {
    fontSize: '16px',
    opacity: 0.7,
    margin: 0,
  },
  welcomeTextMobile: {
    fontSize: '13px',
    opacity: 0.7,
    margin: 0,
  },
  userProgress: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  categoriesBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '25px',
    flexWrap: 'wrap',
  },
  categoriesBarMobile: {
    display: 'flex',
    gap: '6px',
    marginBottom: '15px',
    overflowX: 'auto',
    padding: '5px 0',
    whiteSpace: 'nowrap',
    WebkitOverflowScrolling: 'touch',
  },
  categoryButton: {
    padding: '10px 20px',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    animation: 'fadeIn 0.5s ease',
  },
  coursesGridMobile: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    animation: 'fadeIn 0.5s ease',
  },
  courseCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.3s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center' as const,
  },
  courseCardMobile: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    padding: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.3s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center' as const,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: '1/1',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '10px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  subjectImageWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  subjectImageWrapperMobile: {
    width: '100%',
    height: '100%',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  subjectImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  },
  subjectImageMobile: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  },
  subjectImagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
  },
  subjectImagePlaceholderMobile: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
  },
  placeholderIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  courseTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'white',
    margin: '0 0 4px 0',
  },
  courseTitleMobile: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'white',
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
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '10px',
    lineHeight: 1.5,
    width: '100%',
  },
  courseDescriptionMobile: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '8px',
    lineHeight: 1.4,
    width: '100%',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
    width: '100%',
  },
  progressBar: {
    flex: 1,
    height: '5px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  progressText: {
    fontSize: '11px',
    color: '#FFD700',
    fontWeight: 'bold',
    minWidth: '30px',
  },
  courseMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  courseMetaMobile: {
    display: 'flex',
    gap: '8px',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  courseFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: '8px',
  },
  courseFooterMobile: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: '6px',
    flexWrap: 'wrap',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap' as const,
  },
  courseButton: {
    padding: '6px 14px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap' as const,
  },
  enrollButton: {
    padding: '6px 14px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap' as const,
  },
  loadingCourses: {
    textAlign: 'center',
    padding: '50px',
    color: 'rgba(255,255,255,0.4)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.05)',
    borderTopColor: '#FFD700',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '20px',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '10px',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
  },
  oldFooter: {
    background: 'rgba(0,0,0,0.3)',
    color: 'white',
    padding: '30px 20px',
    marginTop: '40px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
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
    gap: '10px',
  },
  footerText: {
    color: 'rgba(255,255,255,0.3)',
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
    gap: '5px',
    marginBottom: '10px',
  },
  footerLink: {
    color: 'rgba(255,255,255,0.2)',
    textDecoration: 'none',
    fontSize: '13px',
    cursor: 'default',
  },
  footerSupport: {
    marginTop: '20px',
  },
  supportInfo: {
    color: 'rgba(255,255,255,0.2)',
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
    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
    fontSize: '26px',
    border: '2px solid rgba(255,255,255,0.1)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
