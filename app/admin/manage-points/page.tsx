'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  addDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';

export default function AdminManagePoints() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  
  // ✅ ✅ فلترة حسب المرحلة
  const [filterGrade, setFilterGrade] = useState('all');

  // ✅ ✅ قائمة المراحل
  const grades = [
    { value: 'all', label: '📚 الكل' },
    { value: '1-prep', label: 'أولى إعدادي' },
    { value: '2-prep', label: 'ثانية إعدادي' },
    { value: '3-prep', label: 'ثالثة إعدادي' },
    { value: '1-secondary', label: 'أولى ثانوي' },
    { value: '2-secondary', label: 'ثانية ثانوي' },
    { value: '3-secondary', label: 'تالتة ثانوي' },
  ];

  // ✅ نموذج التعديل
  const [editForm, setEditForm] = useState({
    type: 'add', // add, subtract
    field: 'gems', // gems, xp
    amount: 0,
    reason: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // ✅ ترتيب حسب التاريخ
      usersData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('❌ خطأ في جلب المستخدمين:', error);
      setMessage('❌ حدث خطأ في جلب المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  // ✅ ✅ البحث عن المستخدمين مع فلترة المرحلة
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters(term, filterRole, filterGrade);
  };

  // ✅ ✅ فلترة حسب الدور
  const handleFilterRole = (role: string) => {
    setFilterRole(role);
    applyFilters(searchTerm, role, filterGrade);
  };

  // ✅ ✅ فلترة حسب المرحلة
  const handleFilterGrade = (grade: string) => {
    setFilterGrade(grade);
    applyFilters(searchTerm, filterRole, grade);
  };

  // ✅ ✅ تطبيق جميع الفلاتر
  const applyFilters = (search: string, role: string, grade: string) => {
    let filtered = users;
    
    // ✅ فلترة حسب الدور
    if (role !== 'all') {
      filtered = filtered.filter(u => u.role === role);
    }
    
    // ✅ ✅ فلترة حسب المرحلة (لطلاب بس)
    if (grade !== 'all') {
      filtered = filtered.filter(u => u.grade === grade);
    }
    
    // ✅ فلترة حسب البحث
    if (search) {
      filtered = filtered.filter(user => {
        const nameMatch = user.name?.toLowerCase().includes(search.toLowerCase());
        const phoneMatch = user.phone?.includes(search);
        const idMatch = user.id?.includes(search);
        return nameMatch || phoneMatch || idMatch;
      });
    }
    
    setFilteredUsers(filtered);
  };

  // ✅ ✅ فتح مودال التعديل
  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setEditForm({
      type: 'add',
      field: 'gems',
      amount: 0,
      reason: '',
    });
    setShowModal(true);
    setMessage('');
  };

  // ✅ ✅ تنفيذ التعديل
  const handleEdit = async () => {
    if (!selectedUser) return;
    if (editForm.amount <= 0) {
      setMessage('⚠️ يجب أن تكون القيمة أكبر من 0');
      return;
    }
    if (!editForm.reason.trim()) {
      setMessage('⚠️ من فضلك أدخل سبب التعديل');
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const userRef = doc(db, 'users', selectedUser.id);
      const currentValue = selectedUser[editForm.field] || 0;
      const newValue = editForm.type === 'add' 
        ? currentValue + editForm.amount 
        : currentValue - editForm.amount;

      if (newValue < 0) {
        setMessage(`⚠️ لا يمكن أن يكون ${editForm.field === 'gems' ? 'الجواهر' : 'نقاط الخبرة'} أقل من 0`);
        setProcessing(false);
        return;
      }

      // ✅ تحديث المستخدم
      await updateDoc(userRef, {
        [editForm.field]: newValue,
        updatedAt: serverTimestamp(),
      });

      // ✅ تسجيل العملية
      await addDoc(collection(db, 'points_transactions'), {
        userId: selectedUser.id,
        userName: selectedUser.name,
        field: editForm.field,
        type: editForm.type,
        amount: editForm.amount,
        before: currentValue,
        after: newValue,
        reason: editForm.reason,
        adminId: 'admin',
        createdAt: serverTimestamp(),
      });

      // ✅ تحديث الـ UI
      const updatedUsers = users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, [editForm.field]: newValue }
          : u
      );
      setUsers(updatedUsers);
      applyFilters(searchTerm, filterRole, filterGrade);

      setMessage(`✅ تم ${editForm.type === 'add' ? 'إضافة' : 'خصم'} ${editForm.amount} ${editForm.field === 'gems' ? 'جواهر' : 'نقاط خبرة'} لـ ${selectedUser.name}`);
      
      setSelectedUser({ ...selectedUser, [editForm.field]: newValue });
      
      setTimeout(() => {
        setShowModal(false);
        setSelectedUser(null);
      }, 2000);

    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في التعديل');
    } finally {
      setProcessing(false);
    }
  };

  // ✅ ✅ جلب سجل العمليات لطالب
  const loadUserTransactions = async (userId: string) => {
    try {
      const q = query(
        collection(db, 'points_transactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTransactions(transactionsData);
      setShowTransactions(true);
    } catch (error) {
      console.error('❌ خطأ في جلب السجل:', error);
      setMessage('❌ حدث خطأ في جلب السجل');
    }
  };

  const getRoleLabel = (role: string) => {
    const roles: { [key: string]: string } = {
      'student': 'طالب',
      'teacher': 'مدرس',
      'parent': 'ولي أمر',
      'admin': 'أدمن',
    };
    return roles[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'student': '#34d399',
      'teacher': '#60a5fa',
      'parent': '#f59e0b',
      'admin': '#f87171',
    };
    return colors[role] || '#6b7280';
  };

  const getGradeLabel = (gradeValue: string) => {
    const gradesMap: { [key: string]: string } = {
      '1-prep': 'أولى إعدادي',
      '2-prep': 'ثانية إعدادي',
      '3-prep': 'ثالثة إعدادي',
      '1-secondary': 'أولى ثانوي',
      '2-secondary': 'ثانية ثانوي',
      '3-secondary': 'تالتة ثانوي',
    };
    return gradesMap[gradeValue] || gradeValue;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'غير معروف';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'غير معروف';
    }
  };

  // ✅ ✅ إحصائيات حسب المراحل
  const getGradeStats = () => {
    const stats: { [key: string]: number } = {};
    grades.forEach(g => {
      if (g.value !== 'all') {
        stats[g.value] = users.filter(u => u.role === 'student' && u.grade === g.value).length;
      }
    });
    return stats;
  };

  const gradeStats = getGradeStats();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>جاري تحميل المستخدمين...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/admin" style={styles.backButton}>← العودة للوحة التحكم</Link>
          <h1 style={styles.title}>⚙️ إدارة النقاط والجواهر</h1>
          <span style={styles.badge}>👥 {users.length} مستخدم</span>
        </div>
      </header>

      <main style={styles.main}>
        {message && (
          <div style={{
            ...styles.message,
            background: message.includes('✅') ? 'rgba(16,185,129,0.1)' : 
                        message.includes('⚠️') ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.includes('✅') ? '#34d399' : 
                  message.includes('⚠️') ? '#f59e0b' : '#f87171',
          }}>
            {message}
          </div>
        )}

        <div style={styles.infoBox}>
          <p>📌 من هنا يمكنك إدارة نقاط الخبرة والجواهر لجميع المستخدمين.</p>
          <p style={styles.infoSub}>🔍 ابحث عن مستخدم ثم اختر إضافة أو خصم</p>
        </div>

        {/* ✅ ✅ شريط الفلترة حسب المرحلة */}
        <div style={styles.gradeFilterSection}>
          <h4 style={styles.gradeFilterTitle}>📚 تصفية حسب المرحلة</h4>
          <div style={styles.gradeFilterButtons}>
            {grades.map((grade) => (
              <button
                key={grade.value}
                onClick={() => handleFilterGrade(grade.value)}
                style={{
                  ...styles.gradeFilterBtn,
                  background: filterGrade === grade.value ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                  color: filterGrade === grade.value ? 'white' : 'rgba(255,255,255,0.6)',
                  borderColor: filterGrade === grade.value ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
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

        {/* ✅ شريط البحث والفلترة */}
        <div style={styles.searchSection}>
          <div style={styles.searchBar}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="🔍 ابحث بالاسم، رقم الهاتف، أو المعرف..."
              style={styles.searchInput}
            />
          </div>
          <div style={styles.filterBar}>
            <button
              onClick={() => handleFilterRole('all')}
              style={{
                ...styles.filterBtn,
                background: filterRole === 'all' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                color: filterRole === 'all' ? 'white' : 'rgba(255,255,255,0.6)',
              }}
            >
              👥 الكل
            </button>
            <button
              onClick={() => handleFilterRole('student')}
              style={{
                ...styles.filterBtn,
                background: filterRole === 'student' ? '#10b981' : 'rgba(255,255,255,0.05)',
                color: filterRole === 'student' ? 'white' : 'rgba(255,255,255,0.6)',
              }}
            >
              👨‍🎓 طلاب
            </button>
            <button
              onClick={() => handleFilterRole('teacher')}
              style={{
                ...styles.filterBtn,
                background: filterRole === 'teacher' ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                color: filterRole === 'teacher' ? 'white' : 'rgba(255,255,255,0.6)',
              }}
            >
              👨‍🏫 مدرسين
            </button>
            <button
              onClick={() => handleFilterRole('parent')}
              style={{
                ...styles.filterBtn,
                background: filterRole === 'parent' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                color: filterRole === 'parent' ? 'white' : 'rgba(255,255,255,0.6)',
              }}
            >
              👨‍👩‍👦 ولي أمر
            </button>
          </div>
        </div>

        {/* ✅ ✅ إحصائيات سريعة */}
        <div style={styles.quickStats}>
          <div style={styles.quickStatCard}>
            <span style={styles.quickStatNumber}>{filteredUsers.length}</span>
            <span style={styles.quickStatLabel}>مستخدمين معروضين</span>
          </div>
          <div style={styles.quickStatCard}>
            <span style={styles.quickStatNumber}>
              {filteredUsers.reduce((sum, u) => sum + (u.xp || 0), 0)}
            </span>
            <span style={styles.quickStatLabel}>إجمالي نقاط الخبرة</span>
          </div>
          <div style={styles.quickStatCard}>
            <span style={styles.quickStatNumber}>
              {filteredUsers.reduce((sum, u) => sum + (u.gems || 0), 0)}
            </span>
            <span style={styles.quickStatLabel}>إجمالي الجواهر</span>
          </div>
        </div>

        {/* ✅ قائمة المستخدمين */}
        <div style={styles.usersGrid}>
          {filteredUsers.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🔍</span>
              <p>لا يوجد مستخدمين مطابقين للبحث</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} style={styles.userCard}>
                <div style={styles.userHeader}>
                  <div style={styles.userAvatar}>
                    {user.name?.charAt(0) || '?'}
                  </div>
                  <div style={styles.userInfo}>
                    <h3 style={styles.userName}>{user.name || 'مستخدم'}</h3>
                    <span style={styles.userPhone}>📱 {user.phone || 'لا يوجد'}</span>
                    <span style={{
                      ...styles.userRole,
                      background: `${getRoleColor(user.role)}20`,
                      color: getRoleColor(user.role),
                    }}>
                      {getRoleLabel(user.role)}
                    </span>
                    {user.grade && (
                      <span style={styles.userGrade}>🎯 {getGradeLabel(user.grade)}</span>
                    )}
                  </div>
                </div>

                <div style={styles.userPoints}>
                  <div style={styles.pointItem}>
                    <span style={styles.pointIcon}>⭐</span>
                    <div>
                      <span style={styles.pointValue}>{user.xp || 0}</span>
                      <span style={styles.pointLabel}>نقاط خبرة</span>
                    </div>
                  </div>
                  <div style={styles.pointItem}>
                    <span style={styles.pointIcon}>💎</span>
                    <div>
                      <span style={styles.pointValue}>{user.gems || 0}</span>
                      <span style={styles.pointLabel}>جواهر</span>
                    </div>
                  </div>
                </div>

                <div style={styles.userActions}>
                  <button
                    onClick={() => openEditModal(user)}
                    style={styles.editBtn}
                  >
                    ✏️ تعديل الرصيد
                  </button>
                  <button
                    onClick={() => loadUserTransactions(user.id)}
                    style={styles.historyBtn}
                  >
                    📜 السجل
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ✅ ✅ مودال تعديل الرصيد */}
        {showModal && selectedUser && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>✏️ تعديل رصيد {selectedUser.name}</h2>
                  <p style={styles.modalSub}>
                    📱 {selectedUser.phone || 'لا يوجد'} • 
                    ⭐ {selectedUser.xp || 0} XP • 
                    💎 {selectedUser.gems || 0} جواهر
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedUser(null);
                  }}
                  style={styles.closeModal}
                >
                  ✕
                </button>
              </div>

              <div style={styles.editForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>نوع العملية</label>
                  <div style={styles.typeButtons}>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, type: 'add' })}
                      style={{
                        ...styles.typeBtn,
                        background: editForm.type === 'add' ? '#10b981' : 'rgba(255,255,255,0.05)',
                        color: editForm.type === 'add' ? 'white' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      ➕ إضافة
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, type: 'subtract' })}
                      style={{
                        ...styles.typeBtn,
                        background: editForm.type === 'subtract' ? '#ef4444' : 'rgba(255,255,255,0.05)',
                        color: editForm.type === 'subtract' ? 'white' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      ➖ خصم
                    </button>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>نوع الرصيد</label>
                  <div style={styles.fieldButtons}>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, field: 'gems' })}
                      style={{
                        ...styles.fieldBtn,
                        background: editForm.field === 'gems' ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                        color: editForm.field === 'gems' ? 'white' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      💎 جواهر
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, field: 'xp' })}
                      style={{
                        ...styles.fieldBtn,
                        background: editForm.field === 'xp' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                        color: editForm.field === 'xp' ? 'white' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      ⭐ نقاط خبرة
                    </button>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>الكمية</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: parseInt(e.target.value) || 0 })}
                    style={styles.amountInput}
                    placeholder="أدخل الكمية"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>سبب التعديل</label>
                  <input
                    type="text"
                    value={editForm.reason}
                    onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                    style={styles.reasonInput}
                    placeholder="مثال: مكافأة، خصم، تعديل يدوي..."
                  />
                </div>

                <div style={styles.formActions}>
                  <button
                    onClick={handleEdit}
                    disabled={processing}
                    style={{
                      ...styles.submitBtn,
                      opacity: processing ? 0.5 : 1,
                      cursor: processing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {processing ? '⏳ جاري التنفيذ...' : '✅ تنفيذ التعديل'}
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedUser(null);
                    }}
                    style={styles.cancelBtn}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ ✅ مودال سجل العمليات */}
        {showTransactions && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>📜 سجل العمليات</h2>
                  <p style={styles.modalSub}>آخر 50 عملية</p>
                </div>
                <button
                  onClick={() => {
                    setShowTransactions(false);
                    setTransactions([]);
                  }}
                  style={styles.closeModal}
                >
                  ✕
                </button>
              </div>

              <div style={styles.transactionsList}>
                {transactions.length === 0 ? (
                  <div style={styles.emptyState}>
                    <span style={styles.emptyIcon}>📭</span>
                    <p>لا توجد عمليات مسجلة</p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} style={styles.transactionItem}>
                      <div style={styles.transactionHeader}>
                        <span style={{
                          ...styles.transactionType,
                          color: transaction.type === 'add' ? '#34d399' : '#f87171',
                        }}>
                          {transaction.type === 'add' ? '➕ إضافة' : '➖ خصم'}
                        </span>
                        <span style={styles.transactionField}>
                          {transaction.field === 'gems' ? '💎 جواهر' : '⭐ نقاط خبرة'}
                        </span>
                        <span style={styles.transactionAmount}>
                          {transaction.type === 'add' ? '+' : '-'}{transaction.amount}
                        </span>
                      </div>
                      <div style={styles.transactionDetails}>
                        <span>قبل: {transaction.before} → بعد: {transaction.after}</span>
                        <span style={styles.transactionReason}>📝 {transaction.reason || 'بدون سبب'}</span>
                        <span style={styles.transactionDate}>{formatDate(transaction.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a14, #1a1a2e)',
    color: 'white',
    fontFamily: '"Cairo", "Segoe UI", sans-serif',
    direction: 'rtl' as const,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
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
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.02)',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '10px',
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
    padding: '20px',
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
  // ✅ ✅ أنماط فلترة المراحل
  gradeFilterSection: {
    padding: '15px',
    background: 'rgba(139,92,246,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(139,92,246,0.1)',
    marginBottom: '15px',
  },
  gradeFilterTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '10px',
  },
  gradeFilterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  gradeFilterBtn: {
    padding: '6px 14px',
    border: '1px solid',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  gradeCount: {
    fontSize: '11px',
    opacity: 0.6,
  },
  quickStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '15px',
  },
  quickStatCard: {
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    textAlign: 'center' as const,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  quickStatNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#FFD700',
    display: 'block',
  },
  quickStatLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
  searchSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginBottom: '20px',
  },
  searchBar: {
    display: 'flex',
    gap: '10px',
  },
  searchInput: {
    flex: 1,
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '15px',
  },
  filterBar: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  filterBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  usersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '15px',
  },
  userCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  userHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  userAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: 0,
  },
  userPhone: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  userRole: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
  },
  userGrade: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
    marginLeft: '6px',
  },
  userPoints: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '12px',
  },
  pointItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  pointIcon: {
    fontSize: '20px',
  },
  pointValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FFD700',
    display: 'block',
  },
  pointLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
  userActions: {
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    flex: 1,
    padding: '8px',
    background: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  historyBtn: {
    padding: '8px 12px',
    background: 'rgba(139,92,246,0.1)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center' as const,
    padding: '40px',
    color: 'rgba(255,255,255,0.3)',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '10px',
  },
  // ✅ أنماط المودال
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '25px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
  },
  modalSub: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    margin: '5px 0 0 0',
  },
  closeModal: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '24px',
    cursor: 'pointer',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
  },
  typeButtons: {
    display: 'flex',
    gap: '10px',
  },
  typeBtn: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  fieldButtons: {
    display: 'flex',
    gap: '10px',
  },
  fieldBtn: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  amountInput: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
  },
  reasonInput: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  submitBtn: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  cancelBtn: {
    padding: '12px 20px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  // ✅ أنماط سجل العمليات
  transactionsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  transactionItem: {
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  transactionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '6px',
  },
  transactionType: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  transactionField: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
  },
  transactionAmount: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  transactionDetails: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  transactionReason: {
    color: 'rgba(255,255,255,0.5)',
  },
  transactionDate: {
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