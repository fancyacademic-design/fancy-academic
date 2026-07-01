'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export default function NotificationsPanel({ studentId, studentGrade }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (studentId) {
      fetchNotifications();
    }
  }, [studentId]);

  const fetchNotifications = async () => {
    try {
      // جلب الإشعارات المستهدفة لهذا الطالب
      const allQuery = query(collection(db, "notifications"), where("target.type", "==", "all"));
      const gradeQuery = query(collection(db, "notifications"), where("target.type", "==", "grade"), where("target.grade", "==", studentGrade));
      const studentQuery = query(collection(db, "notifications"), where("target.type", "==", "student"), where("target.studentId", "==", studentId));
      
      const [allSnap, gradeSnap, studentSnap] = await Promise.all([
        getDocs(allQuery),
        getDocs(gradeQuery),
        getDocs(studentQuery)
      ]);
      
      const allNotifications = [];
      
      allSnap.forEach(doc => allNotifications.push({ id: doc.id, ...doc.data() }));
      gradeSnap.forEach(doc => allNotifications.push({ id: doc.id, ...doc.data() }));
      studentSnap.forEach(doc => allNotifications.push({ id: doc.id, ...doc.data() }));
      
      // ترتيب من الأحدث للأقدم
      allNotifications.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return timeB - timeA;
      });
      
      // حساب عدد غير المقروءة
      const unread = allNotifications.filter(n => !n.readBy?.includes(studentId)).length;
      setUnreadCount(unread);
      
      setNotifications(allNotifications);
    } catch (err) {
      console.error("خطأ في جلب الإشعارات:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const notifRef = doc(db, "notifications", notificationId);
      await updateDoc(notifRef, {
        readBy: [...(notifications.find(n => n.id === notificationId)?.readBy || []), studentId]
      });
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId 
          ? { ...n, readBy: [...(n.readBy || []), studentId] }
          : n
      ));
      setUnreadCount(prev => prev - 1);
    } catch (err) {
      console.error("خطأ في تحديث حالة القراءة:", err);
    }
  };

  const getTypeStyle = (type) => {
    switch(type) {
      case 'success': return { background: '#d1fae5', color: '#065f46', borderColor: '#10b981' };
      case 'warning': return { background: '#fed7aa', color: '#92400e', borderColor: '#f59e0b' };
      case 'error': return { background: '#fee2e2', color: '#991b1b', borderColor: '#ef4444' };
      default: return { background: '#dbeafe', color: '#1e40af', borderColor: '#3b82f6' };
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowPanel(!showPanel)}
        style={styles.notifButton}
      >
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
      
      {showPanel && (
        <>
          <div style={styles.overlay} onClick={() => setShowPanel(false)} />
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>🔔 الإشعارات</h3>
              <button onClick={() => setShowPanel(false)} style={styles.closeBtn}>✕</button>
            </div>
            
            <div style={styles.panelContent}>
              {loading ? (
                <div style={styles.loading}>جاري التحميل...</div>
              ) : notifications.length === 0 ? (
                <div style={styles.empty}>لا توجد إشعارات جديدة</div>
              ) : (
                notifications.map(notif => {
                  const isRead = notif.readBy?.includes(studentId);
                  const typeStyle = getTypeStyle(notif.type);
                  
                  return (
                    <div 
                      key={notif.id} 
                      style={{...styles.notifCard, ...typeStyle, opacity: isRead ? 0.6 : 1}}
                      onClick={() => !isRead && markAsRead(notif.id)}
                    >
                      <div style={styles.notifHeader}>
                        <span style={styles.notifTitle}>{notif.title}</span>
                        <span style={styles.notifTime}>
                          {notif.createdAt?.toDate?.() 
                            ? new Date(notif.createdAt.toDate()).toLocaleString('ar-EG')
                            : new Date(notif.createdAt).toLocaleString('ar-EG')}
                        </span>
                      </div>
                      <p style={styles.notifBody}>{notif.body}</p>
                      {!isRead && <div style={styles.unreadDot}>جديد</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

const styles = {
  notifButton: {
    position: 'relative',
    background: 'transparent',
    border: 'none',
    fontSize: '22px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    transition: 'all 0.3s',
    marginLeft: '10px'
  },
  badge: {
    position: 'absolute',
    top: '0',
    right: '0',
    background: '#ef4444',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '20px',
    minWidth: '18px'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 998
  },
  panel: {
    position: 'fixed',
    top: '80px',
    left: '20px',
    width: '380px',
    maxWidth: 'calc(100% - 40px)',
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    zIndex: 999,
    overflow: 'hidden',
    direction: 'rtl'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc'
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#64748b'
  },
  panelContent: {
    maxHeight: '500px',
    overflowY: 'auto'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8'
  },
  notifCard: {
    padding: '15px 20px',
    borderBottom: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  notifHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '5px'
  },
  notifTitle: {
    fontWeight: 'bold',
    fontSize: '15px'
  },
  notifTime: {
    fontSize: '11px',
    opacity: 0.6
  },
  notifBody: {
    fontSize: '13px',
    lineHeight: '1.5',
    margin: 0
  },
  unreadDot: {
    display: 'inline-block',
    marginTop: '8px',
    fontSize: '10px',
    background: '#3b82f6',
    color: 'white',
    padding: '2px 10px',
    borderRadius: '20px'
  }
};