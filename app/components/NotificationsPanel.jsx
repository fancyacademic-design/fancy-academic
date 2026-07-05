'use client';
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

export default function NotificationsPanel({ 
  studentId, 
  studentGrade,
  linkRequests = [],
  onAccept,
  onReject 
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!studentId) return;
    fetchNotifications();
  }, [studentId]);

  const fetchNotifications = async () => {
    try {
      console.log('🔍 جلب الإشعارات للطالب:', studentId);
      
      // ✅ 1. الإشعارات العامة (target.type = all)
      const allQuery = query(
        collection(db, "notifications"), 
        where("target.type", "==", "all"),
        orderBy("createdAt", "desc")
      );
      
      // ✅ 2. الإشعارات حسب المرحلة (target.type = grade)
      const gradeQuery = query(
        collection(db, "notifications"), 
        where("target.type", "==", "grade"), 
        where("target.grade", "==", studentGrade),
        orderBy("createdAt", "desc")
      );
      
      // ✅ 3. الإشعارات الخاصة بالطالب (target.type = student)
      const studentQuery = query(
        collection(db, "notifications"), 
        where("target.type", "==", "student"), 
        where("target.studentId", "==", studentId),
        orderBy("createdAt", "desc")
      );
      
      // ✅ 4. الإشعارات المباشرة (studentId مباشرة - من الأدمن)
      const directQuery = query(
        collection(db, "notifications"),
        where("studentId", "==", studentId),
        orderBy("createdAt", "desc")
      );
      
      // ✅ 5. طلبات الربط (type = parent_request)
      const parentRequestQuery = query(
        collection(db, "notifications"),
        where("studentId", "==", studentId),
        where("type", "==", "parent_request"),
        orderBy("createdAt", "desc")
      );
      
      const [allSnap, gradeSnap, studentSnap, directSnap, parentRequestSnap] = await Promise.all([
        getDocs(allQuery),
        getDocs(gradeQuery),
        getDocs(studentQuery),
        getDocs(directQuery),
        getDocs(parentRequestQuery)
      ]);
      
      const allNotifications = [];
      
      allSnap.forEach(doc => {
        allNotifications.push({ 
          id: doc.id, 
          ...doc.data(), 
          isLinkRequest: false,
          source: 'all'
        });
      });
      
      gradeSnap.forEach(doc => {
        const data = doc.data();
        if (!allNotifications.find(n => n.id === doc.id)) {
          allNotifications.push({ 
            id: doc.id, 
            ...data, 
            isLinkRequest: false,
            source: 'grade'
          });
        }
      });
      
      studentSnap.forEach(doc => {
        const data = doc.data();
        if (!allNotifications.find(n => n.id === doc.id)) {
          allNotifications.push({ 
            id: doc.id, 
            ...data, 
            isLinkRequest: false,
            source: 'student'
          });
        }
      });
      
      directSnap.forEach(doc => {
        const data = doc.data();
        if (!allNotifications.find(n => n.id === doc.id)) {
          allNotifications.push({ 
            id: doc.id, 
            ...data, 
            isLinkRequest: data.type === 'parent_request',
            source: 'direct'
          });
        }
      });
      
      parentRequestSnap.forEach(doc => {
        const data = doc.data();
        if (!allNotifications.find(n => n.id === doc.id)) {
          allNotifications.push({ 
            id: doc.id, 
            ...data, 
            isLinkRequest: true,
            source: 'parent_request'
          });
        }
      });
      
      allNotifications.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return timeB - timeA;
      });
      
      console.log('✅ عدد الإشعارات:', allNotifications.length);
      setNotifications(allNotifications);
      
    } catch (error) {
      console.error('❌ خطأ في جلب الإشعارات:', error);
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
    } catch (err) {
      console.error("خطأ:", err);
    }
  };

  const acceptLinkRequest = async (request) => {
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
        if (!childrenList.includes(studentId)) {
          childrenList.push(studentId);
          await updateDoc(parentRef, {
            children: childrenList,
          });
        }
      }

      setNotifications(notifications.filter(n => n.id !== request.id));
    } catch (error) {
      console.error('❌ خطأ:', error);
    }
  };

  const rejectLinkRequest = async (request) => {
    try {
      await updateDoc(doc(db, 'notifications', request.id), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });

      setNotifications(notifications.filter(n => n.id !== request.id));
    } catch (error) {
      console.error('❌ خطأ:', error);
    }
  };

  const getTypeStyle = (type) => {
    switch(type) {
      case 'success': return { background: 'rgba(16,185,129,0.1)', color: '#34d399', borderColor: '#10b981' };
      case 'warning': return { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: '#f59e0b' };
      case 'error': return { background: 'rgba(239,68,68,0.1)', color: '#f87171', borderColor: '#ef4444' };
      default: return { background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderColor: '#3b82f6' };
    }
  };

  const unreadCount = notifications.filter(n => {
    if (n.isLinkRequest || n.type === 'parent_request') return true;
    return !n.readBy?.includes(studentId);
  }).length;

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.bellButton}
      >
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <span style={styles.title}>📬 الإشعارات</span>
            <button
              onClick={() => setIsOpen(false)}
              style={styles.closeButton}
            >
              ✕
            </button>
          </div>

          <div style={styles.list}>
            {loading ? (
              <div style={styles.empty}>جاري التحميل...</div>
            ) : notifications.length === 0 ? (
              <div style={styles.empty}>لا توجد إشعارات</div>
            ) : (
              notifications.map((notif) => {
                // ✅ طلب ربط ولي الأمر
                if (notif.isLinkRequest || notif.type === 'parent_request') {
                  return (
                    <div key={notif.id} style={styles.linkRequestCard}>
                      <div style={styles.linkRequestInfo}>
                        <span style={styles.linkRequestIcon}>👤</span>
                        <div>
                          <div style={styles.linkRequestName}>{notif.parentName}</div>
                          <div style={styles.linkRequestMessage}>{notif.message || 'يريد ربطك بحسابه'}</div>
                        </div>
                      </div>
                      <div style={styles.linkRequestActions}>
                        <button
                          onClick={() => acceptLinkRequest(notif)}
                          style={styles.acceptBtn}
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => rejectLinkRequest(notif)}
                          style={styles.rejectBtn}
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  );
                }

                // ✅ إشعارات الأدمن العادية
                const isRead = notif.readBy?.includes(studentId);
                const typeStyle = getTypeStyle(notif.notificationType || notif.type);
                
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
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  bellButton: {
    position: 'relative' as const,
    background: 'none',
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
  dropdown: {
    position: 'absolute' as const,
    top: '50px',
    left: '0',
    width: '420px',
    maxHeight: '450px',
    background: '#1a1a2e',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.05)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '18px',
    cursor: 'pointer',
  },
  list: {
    maxHeight: '380px',
    overflowY: 'auto' as const,
    padding: '10px',
  },
  notifCard: {
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
  acceptBtn: {
    padding: '4px 12px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s',
  },
  rejectBtn: {
    padding: '4px 12px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '30px 20px',
    color: 'rgba(255,255,255,0.3)',
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