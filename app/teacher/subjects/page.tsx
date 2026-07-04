'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

export default function TeacherSubjects() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      parsed.role = 'teacher';
      parsed.isApproved = true;
      setTeacher(parsed);
      
      if (parsed.id) {
        loadSubjects(parsed.id);
      } else {
        setMessage('⚠️ لا يوجد معرف للمدرس');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ خطأ:', error);
      router.push('/login');
    }
  }, [router]);

  const loadSubjects = async (teacherId: string) => {
    try {
      const q = query(
        collection(db, 'subjects'),
        where('teacherId', '==', teacherId)
      );
      const snapshot = await getDocs(q);
      
      const subjectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setSubjects(subjectsData);
      
      if (subjectsData.length === 0) {
        setMessage('ℹ️ لم يتم تعيين أي مواد لك. تواصل مع الأدمن.');
      }
    } catch (error) {
      console.error('❌ خطأ في جلب المواد:', error);
      setMessage('❌ حدث خطأ في تحميل المواد');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (subject: any) => {
    try {
      const newStatus = subject.isActive === false;
      await updateDoc(doc(db, 'subjects', subject.id), {
        isActive: newStatus,
        updatedAt: serverTimestamp(),
      });

      setSubjects(subjects.map(s => 
        s.id === subject.id ? { ...s, isActive: newStatus } : s
      ));
      
      setMessage(`✅ تم ${newStatus ? 'فتح' : 'قفل'} المادة`);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ');
    }
  };

  // ✅ ✅ رفع الصورة كـ Base64 (نفس طريقة الأسئلة)
  const uploadImageBase64 = (file: File, subjectId: string) => {
    setUploading(true);
    setMessage('⏳ جاري تحويل الصورة...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Image = event.target?.result as string;
        
        // ✅ تحديث المادة في Firebase
        await updateDoc(doc(db, 'subjects', subjectId), {
          imageUrl: base64Image,
          updatedAt: serverTimestamp(),
        });

        // ✅ تحديث القائمة
        setSubjects(subjects.map(s => 
          s.id === subjectId ? { ...s, imageUrl: base64Image } : s
        ));

        setMessage('✅ تم رفع الصورة بنجاح!');
        setShowImageModal(false);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
      } catch (error) {
        console.error('❌ خطأ في حفظ الصورة:', error);
        setMessage('❌ حدث خطأ في حفظ الصورة');
      } finally {
        setUploading(false);
      }
    };
    
    reader.onerror = () => {
      setMessage('❌ حدث خطأ في قراءة الصورة');
      setUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const deleteImage = async (subjectId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف الصورة؟')) return;

    try {
      await updateDoc(doc(db, 'subjects', subjectId), {
        imageUrl: null,
        updatedAt: serverTimestamp(),
      });

      setSubjects(subjects.map(s => 
        s.id === subjectId ? { ...s, imageUrl: null } : s
      ));

      setMessage('✅ تم حذف الصورة بنجاح!');
    } catch (error) {
      console.error('❌ خطأ في حذف الصورة:', error);
      setMessage('❌ حدث خطأ في حذف الصورة');
    }
  };

  const openImagePicker = (subject: any) => {
    setSelectedSubject(subject);
    setShowImageModal(true);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubject) return;

    if (!file.type.startsWith('image/')) {
      setMessage('❌ يرجى اختيار ملف صورة صالح');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage('❌ حجم الصورة كبير جداً (الحد الأقصى 10MB)');
      return;
    }

    uploadImageBase64(file, selectedSubject.id);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/teacher/dashboard" style={styles.backButton}>← العودة</Link>
          <h1 style={styles.title}>📚 المواد الخاصة بي</h1>
          <span style={styles.badge}>👨‍🏫 {teacher?.name}</span>
        </div>
      </header>

      <main style={styles.main}>
        {message && (
          <div style={{
            ...styles.message,
            background: message.includes('✅') ? 'rgba(16,185,129,0.1)' : 
                        message.includes('ℹ️') ? 'rgba(59,130,246,0.1)' : 
                        message.includes('⏳') ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.includes('✅') ? '#34d399' : 
                  message.includes('ℹ️') ? '#60a5fa' : 
                  message.includes('⏳') ? '#f59e0b' : '#f87171',
          }}>
            {message}
          </div>
        )}

        <div style={styles.infoBox}>
          <p>📌 هذه هي المواد التي عينها لك الأدمن.</p>
          <p style={styles.infoSub}>🆔 معرف المدرس: <strong>{teacher?.id || 'غير موجود'}</strong></p>
        </div>

        {subjects.length === 0 ? (
          <div style={styles.empty}>
            <span>📭</span>
            <p>لا توجد مواد مخصصة لك</p>
            <p style={styles.emptySub}>تواصل مع الأدمن لتعيين مواد لك</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {subjects.map((subject) => (
              <div
                key={subject.id}
                style={{
                  ...styles.card,
                  borderColor: subject.color || '#3b82f6',
                  opacity: subject.isActive === false ? 0.5 : 1,
                }}
              >
                <div style={styles.cardHeader}>
                  {subject.imageUrl ? (
                    <div style={styles.imageWrapper}>
                      <img 
                        src={subject.imageUrl} 
                        alt={subject.name}
                        style={styles.subjectImage}
                      />
                    </div>
                  ) : (
                    <div style={{ ...styles.icon, background: subject.color || '#3b82f6' }}>
                      {subject.icon || '📚'}
                    </div>
                  )}
                  <div style={styles.cardInfo}>
                    <h3 style={styles.cardTitle}>{subject.name}</h3>
                    <span style={{
                      ...styles.statusBadge,
                      background: subject.isActive !== false ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: subject.isActive !== false ? '#34d399' : '#f87171',
                    }}>
                      {subject.isActive !== false ? '✅ مفتوحة' : '🔒 مقفلة'}
                    </span>
                  </div>
                </div>

                <p style={styles.desc}>{subject.description || 'لا يوجد وصف'}</p>

                <div style={styles.actions}>
                  <button
                    onClick={() => toggleStatus(subject)}
                    style={{
                      ...styles.actionBtn,
                      background: subject.isActive !== false ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                      color: subject.isActive !== false ? '#f87171' : '#34d399',
                    }}
                  >
                    {subject.isActive !== false ? '🔒 قفل' : '🔓 فتح'}
                  </button>
                  
                  <button
                    onClick={() => openImagePicker(subject)}
                    style={{
                      ...styles.actionBtn,
                      background: 'rgba(59,130,246,0.1)',
                      color: '#60a5fa',
                    }}
                  >
                    {subject.imageUrl ? '🔄 تغيير الصورة' : '📷 رفع صورة'}
                  </button>

                  {subject.imageUrl && (
                    <button
                      onClick={() => deleteImage(subject.id)}
                      style={{
                        ...styles.actionBtn,
                        background: 'rgba(239,68,68,0.1)',
                        color: '#f87171',
                      }}
                    >
                      🗑️ حذف الصورة
                    </button>
                  )}

                  <Link
                    href={`/teacher/module/${subject.id}`}
                    style={{ ...styles.actionBtn, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', textDecoration: 'none' }}
                  >
                    📖 إدارة المحتوى
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {showImageModal && (
        <div style={styles.modalOverlay} onClick={() => setShowImageModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📷 رفع صورة للمادة</h3>
              <button style={styles.modalClose} onClick={() => setShowImageModal(false)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {uploading ? (
                <div style={styles.uploadingContainer}>
                  <div style={styles.spinner}></div>
                  <p style={styles.uploadText}>جاري تحويل الصورة وحفظها...</p>
                </div>
              ) : (
                <>
                  <p style={styles.modalText}>اختر صورة للمادة <strong>{selectedSubject?.name}</strong></p>
                  <p style={styles.modalHint}>📌 الحد الأقصى: 10MB - الصيغ المدعومة: JPG, PNG, GIF, WebP</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={styles.selectImageBtn}
                  >
                    📁 اختيار صورة
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ جميع الأنماط (نفسها)
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a14, #1a1a2e)',
    color: 'white',
    fontFamily: '"Cairo", sans-serif',
    direction: 'rtl' as const,
    padding: '20px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a14, #1a1a2e)',
    color: 'white',
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    marginBottom: '20px',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    width: '100%',
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
    flex: 1,
  },
  badge: {
    padding: '4px 12px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    borderRadius: '20px',
    fontSize: '12px',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
    border: '1px solid',
    fontSize: '14px',
  },
  infoBox: {
    padding: '16px 20px',
    background: 'rgba(59,130,246,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(59,130,246,0.1)',
    marginBottom: '20px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
  },
  infoSub: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '5px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '20px',
    border: '2px solid',
    transition: 'all 0.3s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '10px',
  },
  imageWrapper: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    overflow: 'hidden',
    flexShrink: 0,
    border: '2px solid rgba(255,255,255,0.1)',
  },
  subjectImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  desc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '15px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  actionBtn: {
    padding: '6px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    textDecoration: 'none',
    display: 'inline-block',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'rgba(255,255,255,0.3)',
    gridColumn: '1 / -1',
  },
  emptySub: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.2)',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: 'linear-gradient(135deg, #1a1a2e, #2d2d44)',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    color: '#FFD700',
  },
  modalClose: {
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 12px',
    borderRadius: '8px',
    transition: 'all 0.3s',
  },
  modalBody: {
    padding: '24px',
    textAlign: 'center' as const,
  },
  modalText: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '8px',
  },
  modalHint: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '20px',
  },
  selectImageBtn: {
    padding: '12px 30px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  uploadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '15px',
    padding: '20px 0',
  },
  uploadText: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.8)',
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