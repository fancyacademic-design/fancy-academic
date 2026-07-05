'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  setDoc
} from 'firebase/firestore';

export default function AdminStorePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('products');

  // ✅ إعدادات سعر الصرف (نقاط خبرة → جواهر)
  const [exchangeRate, setExchangeRate] = useState(10);
  const [savingRate, setSavingRate] = useState(false);

  // ✅ نموذج المنتج
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    type: 'buy_with_money', // buy_with_money أو buy_with_xp
    price: 0,
    content: '',
    isActive: true,
    order: 0,
  });

  // ✅ لا يوجد تحقق - نحمّل البيانات مباشرة
  useEffect(() => {
    // ✅ إنشاء مستخدم وهمي إن لم يكن موجود
    let userData = localStorage.getItem('currentUser');
    if (!userData) {
      const fakeUser = {
        id: 'admin_fake_id',
        name: 'Administrator',
        role: 'admin',
        isApproved: true,
        email: 'admin@fancy.com'
      };
      localStorage.setItem('currentUser', JSON.stringify(fakeUser));
      userData = JSON.stringify(fakeUser);
    }
    
    try {
      const parsed = JSON.parse(userData);
      parsed.role = 'admin';
      localStorage.setItem('currentUser', JSON.stringify(parsed));
      setUser(parsed);
    } catch (error) {
      console.error('❌ خطأ:', error);
    }
    
    loadData();
    loadExchangeRate();
  }, []);

  // ✅ جلب البيانات
  const loadData = async () => {
    try {
      setLoading(true);
      await loadProducts();
      await loadTransactions();
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // ✅ جلب المنتجات
  const loadProducts = async () => {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'store_products'), orderBy('order', 'asc'))
      );
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('❌ خطأ في جلب المنتجات:', error);
    }
  };

  // ✅ جلب المعاملات
  const loadTransactions = async () => {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'store_transactions'), orderBy('createdAt', 'desc'))
      );
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTransactions(transactionsData);
    } catch (error) {
      console.error('❌ خطأ في جلب المعاملات:', error);
    }
  };

  // ✅ جلب سعر الصرف
  const loadExchangeRate = async () => {
    try {
      const settingsRef = doc(db, 'store_settings', 'exchange_rate');
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setExchangeRate(data.xpToGems || 10);
      } else {
        await setDoc(settingsRef, {
          xpToGems: 10,
          updatedAt: serverTimestamp(),
        });
        setExchangeRate(10);
      }
    } catch (error) {
      console.error('❌ خطأ في جلب سعر الصرف:', error);
    }
  };

  // ✅ حفظ سعر الصرف
  const saveExchangeRate = async () => {
    if (exchangeRate < 1) {
      setMessage('⚠️ سعر الصرف يجب أن يكون أكبر من 0');
      return;
    }

    setSavingRate(true);
    try {
      const settingsRef = doc(db, 'store_settings', 'exchange_rate');
      await updateDoc(settingsRef, {
        xpToGems: Number(exchangeRate),
        updatedAt: serverTimestamp(),
      });
      setMessage(`✅ تم تحديث سعر الصرف: 1 جوهرة = ${exchangeRate} نقطة خبرة`);
    } catch (error) {
      console.error('❌ خطأ في حفظ سعر الصرف:', error);
      setMessage('❌ حدث خطأ في حفظ سعر الصرف');
    } finally {
      setSavingRate(false);
    }
  };

  // ✅ ✅ إضافة منتج جديد
  const addProduct = async () => {
    if (!productForm.name.trim() || !productForm.price || !productForm.content.trim()) {
      setMessage('⚠️ يرجى ملء جميع الحقول (الاسم، السعر، المحتوى)');
      return;
    }

    setProcessing(true);
    try {
      await addDoc(collection(db, 'store_products'), {
        name: productForm.name,
        description: productForm.description || '',
        type: productForm.type,
        price: Number(productForm.price),
        content: productForm.content,
        isActive: true,
        order: products.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMessage('✅ تم إضافة المنتج بنجاح');
      setShowAddProduct(false);
      resetForm();
      await loadProducts();
    } catch (error) {
      console.error('❌ خطأ في إضافة المنتج:', error);
      setMessage('❌ حدث خطأ في إضافة المنتج');
    } finally {
      setProcessing(false);
    }
  };

  // ✅ ✅ تعديل منتج
  const updateProduct = async () => {
    if (!productForm.name.trim() || !productForm.price || !productForm.content.trim()) {
      setMessage('⚠️ يرجى ملء جميع الحقول (الاسم، السعر، المحتوى)');
      return;
    }

    setProcessing(true);
    try {
      const productRef = doc(db, 'store_products', editingProduct.id);
      await updateDoc(productRef, {
        name: productForm.name,
        description: productForm.description || '',
        type: productForm.type,
        price: Number(productForm.price),
        content: productForm.content,
        isActive: productForm.isActive,
        order: Number(productForm.order),
        updatedAt: serverTimestamp(),
      });

      setMessage('✅ تم تعديل المنتج بنجاح');
      setShowEditProduct(false);
      setEditingProduct(null);
      resetForm();
      await loadProducts();
    } catch (error) {
      console.error('❌ خطأ في تعديل المنتج:', error);
      setMessage('❌ حدث خطأ في تعديل المنتج');
    } finally {
      setProcessing(false);
    }
  };

  // ✅ ✅ حذف منتج
  const deleteProduct = async (productId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
      await deleteDoc(doc(db, 'store_products', productId));
      setMessage('✅ تم حذف المنتج');
      await loadProducts();
    } catch (error) {
      console.error('❌ خطأ في حذف المنتج:', error);
      setMessage('❌ حدث خطأ في حذف المنتج');
    }
  };

  // ✅ ✅ تبديل حالة المنتج
  const toggleProductStatus = async (product: any) => {
    try {
      await updateDoc(doc(db, 'store_products', product.id), {
        isActive: !product.isActive,
        updatedAt: serverTimestamp(),
      });
      setMessage(`✅ تم ${product.isActive ? 'إيقاف' : 'تفعيل'} المنتج`);
      await loadProducts();
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage('❌ حدث خطأ');
    }
  };

  // ✅ ✅ فتح نموذج التعديل
  const openEditForm = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      type: product.type || 'buy_with_money',
      price: product.price || 0,
      content: product.content || '',
      isActive: product.isActive !== false,
      order: product.order || 0,
    });
    setShowEditProduct(true);
  };

  // ✅ ✅ إعادة تعيين النموذج
  const resetForm = () => {
    setProductForm({
      name: '',
      description: '',
      type: 'buy_with_money',
      price: 0,
      content: '',
      isActive: true,
      order: 0,
    });
  };

  // ✅ ✅ تنسيق التاريخ
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

  const getProductIcon = (type: string) => {
    if (type === 'buy_with_money') return '💰';
    return '⭐';
  };

  const getTypeLabel = (type: string) => {
    if (type === 'buy_with_money') return 'شراء بفلوس';
    if (type === 'buy_with_xp') return 'شراء بنقاط خبرة';
    return type;
  };

  const getPriceLabel = (type: string) => {
    if (type === 'buy_with_money') return 'جنيه';
    return 'نقاط خبرة';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/admin/dashboard" style={styles.backButton}>← العودة للوحة التحكم</Link>
          <h1 style={styles.title}>⚙️ إدارة المتجر</h1>
          <div style={styles.adminInfo}>
            <span style={styles.adminName}>{user?.name || 'أدمن'}</span>
            <span style={styles.adminBadge}>🔑 أدمن</span>
          </div>
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

        {/* ✅ ✅ إعدادات سعر الصرف */}
        <div style={styles.settingsSection}>
          <h3 style={styles.settingsTitle}>⚙️ إعدادات سعر الصرف</h3>
          <div style={styles.settingsContainer}>
            <div style={styles.settingsGroup}>
              <label style={styles.settingsLabel}>1 جوهرة =</label>
              <input
                type="number"
                min="1"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Math.max(1, Number(e.target.value)))}
                style={styles.settingsInput}
              />
              <span style={styles.settingsLabel}>نقطة خبرة</span>
              <button
                onClick={saveExchangeRate}
                disabled={savingRate}
                style={{
                  ...styles.settingsButton,
                  opacity: savingRate ? 0.5 : 1,
                  cursor: savingRate ? 'not-allowed' : 'pointer',
                }}
              >
                {savingRate ? '⏳ جاري الحفظ...' : '💾 حفظ السعر'}
              </button>
            </div>
            <p style={styles.settingsHint}>الطلاب سيحولون نقاط الخبرة إلى جواهر بهذا السعر</p>
          </div>
        </div>

        {/* ✅ التبويبات */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('products')}
            style={{
              ...styles.tab,
              background: activeTab === 'products' ? 'rgba(255,255,255,0.05)' : 'transparent',
              color: activeTab === 'products' ? 'white' : 'rgba(255,255,255,0.4)',
              borderBottom: activeTab === 'products' ? '2px solid #FFD700' : '2px solid transparent',
            }}
          >
            📦 المنتجات ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              ...styles.tab,
              background: activeTab === 'transactions' ? 'rgba(255,255,255,0.05)' : 'transparent',
              color: activeTab === 'transactions' ? 'white' : 'rgba(255,255,255,0.4)',
              borderBottom: activeTab === 'transactions' ? '2px solid #FFD700' : '2px solid transparent',
            }}
          >
            📊 المعاملات ({transactions.length})
          </button>
        </div>

        {/* ✅ تبويب المنتجات */}
        {activeTab === 'products' && (
          <div style={styles.tabContent}>
            <div style={styles.productsHeader}>
              <h2 style={styles.sectionTitle}>📦 جميع المنتجات</h2>
              <button
                onClick={() => {
                  setShowAddProduct(true);
                  resetForm();
                }}
                style={styles.addBtn}
              >
                ➕ إضافة منتج
              </button>
            </div>

            {/* ✅ نموذج إضافة منتج */}
            {showAddProduct && (
              <div style={styles.formContainer}>
                <h3 style={styles.formTitle}>➕ إضافة منتج جديد</h3>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label>اسم المنتج *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="مثال: مراجعة نهائية"
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label>نوع الدفع *</label>
                    <select
                      value={productForm.type}
                      onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                      style={styles.select}
                    >
                      <option value="buy_with_money">💰 شراء بفلوس</option>
                      <option value="buy_with_xp">⭐ شراء بنقاط خبرة</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label>السعر *</label>
                    <input
                      type="number"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                      placeholder="السعر"
                      style={styles.input}
                      min="1"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label>الترتيب</label>
                    <input
                      type="number"
                      value={productForm.order}
                      onChange={(e) => setProductForm({ ...productForm, order: Number(e.target.value) })}
                      placeholder="الترتيب"
                      style={styles.input}
                      min="0"
                    />
                  </div>

                  <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label>الوصف (اختياري)</label>
                    <input
                      type="text"
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="وصف المنتج"
                      style={styles.input}
                    />
                  </div>

                  <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label>📝 المحتوى (النص اللي هياخده الطالب) *</label>
                    <textarea
                      value={productForm.content}
                      onChange={(e) => setProductForm({ ...productForm, content: e.target.value })}
                      placeholder="اكتب النص اللي هيظهر للطالب بعد الشراء..."
                      style={styles.textarea}
                      rows={6}
                    />
                  </div>
                </div>

                <div style={styles.formActions}>
                  <button
                    onClick={addProduct}
                    disabled={processing}
                    style={{
                      ...styles.saveBtn,
                      opacity: processing ? 0.5 : 1,
                      cursor: processing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {processing ? '⏳ جاري الحفظ...' : '💾 حفظ المنتج'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddProduct(false);
                      resetForm();
                    }}
                    style={styles.cancelBtn}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {/* ✅ نموذج تعديل منتج */}
            {showEditProduct && editingProduct && (
              <div style={styles.formContainer}>
                <h3 style={styles.formTitle}>✏️ تعديل المنتج</h3>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label>اسم المنتج *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="اسم المنتج"
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label>نوع الدفع *</label>
                    <select
                      value={productForm.type}
                      onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                      style={styles.select}
                    >
                      <option value="buy_with_money">💰 شراء بفلوس</option>
                      <option value="buy_with_xp">⭐ شراء بنقاط خبرة</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label>السعر *</label>
                    <input
                      type="number"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                      placeholder="السعر"
                      style={styles.input}
                      min="1"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label>الترتيب</label>
                    <input
                      type="number"
                      value={productForm.order}
                      onChange={(e) => setProductForm({ ...productForm, order: Number(e.target.value) })}
                      placeholder="الترتيب"
                      style={styles.input}
                      min="0"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label>الحالة</label>
                    <select
                      value={productForm.isActive ? 'true' : 'false'}
                      onChange={(e) => setProductForm({ ...productForm, isActive: e.target.value === 'true' })}
                      style={styles.select}
                    >
                      <option value="true">✅ نشط</option>
                      <option value="false">⛔ غير نشط</option>
                    </select>
                  </div>

                  <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label>الوصف (اختياري)</label>
                    <input
                      type="text"
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="وصف المنتج"
                      style={styles.input}
                    />
                  </div>

                  <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label>📝 المحتوى (النص اللي هياخده الطالب) *</label>
                    <textarea
                      value={productForm.content}
                      onChange={(e) => setProductForm({ ...productForm, content: e.target.value })}
                      placeholder="اكتب النص اللي هيظهر للطالب بعد الشراء..."
                      style={styles.textarea}
                      rows={6}
                    />
                  </div>
                </div>

                <div style={styles.formActions}>
                  <button
                    onClick={updateProduct}
                    disabled={processing}
                    style={{
                      ...styles.saveBtn,
                      opacity: processing ? 0.5 : 1,
                      cursor: processing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {processing ? '⏳ جاري الحفظ...' : '💾 تحديث المنتج'}
                  </button>
                  <button
                    onClick={() => {
                      setShowEditProduct(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    style={styles.cancelBtn}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {/* ✅ قائمة المنتجات */}
            <div style={styles.productsList}>
              {products.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>📭</span>
                  <p>لا توجد منتجات</p>
                </div>
              ) : (
                products.map((product) => (
                  <div key={product.id} style={styles.productItem}>
                    <div style={styles.productInfo}>
                      <span style={styles.productIcon}>{getProductIcon(product.type)}</span>
                      <div style={styles.productDetails}>
                        <span style={styles.productName}>{product.name}</span>
                        <span style={styles.productType}>{getTypeLabel(product.type)}</span>
                      </div>
                      <div style={styles.productPricing}>
                        <span style={styles.productPrice}>
                          السعر: {product.price} {getPriceLabel(product.type)}
                        </span>
                      </div>
                      <span style={{
                        ...styles.productStatus,
                        color: product.isActive ? '#34d399' : '#f87171',
                      }}>
                        {product.isActive ? '✅ نشط' : '⛔ غير نشط'}
                      </span>
                      <span style={styles.productOrder}># {product.order || 0}</span>
                    </div>
                    <div style={styles.productActions}>
                      <button
                        onClick={() => openEditForm(product)}
                        style={styles.editBtn}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => toggleProductStatus(product)}
                        style={{
                          ...styles.toggleBtn,
                          background: product.isActive ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                          color: product.isActive ? '#f87171' : '#34d399',
                        }}
                      >
                        {product.isActive ? '⛔' : '✅'}
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        style={styles.deleteBtn}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ✅ تبويب المعاملات */}
        {activeTab === 'transactions' && (
          <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>📊 سجل المعاملات</h2>
            
            <div style={styles.transactionsStats}>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>{transactions.length}</span>
                <span style={styles.statLabel}>إجمالي المعاملات</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>
                  {transactions.filter(t => t.productType === 'buy_with_money').length}
                </span>
                <span style={styles.statLabel}>شراء بفلوس</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>
                  {transactions.filter(t => t.productType === 'buy_with_xp').length}
                </span>
                <span style={styles.statLabel}>شراء بنقاط خبرة</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>
                  {transactions.filter(t => t.type === 'exchange_xp_to_gems').length}
                </span>
                <span style={styles.statLabel}>تحويل خبرة → جواهر</span>
              </div>
            </div>

            <div style={styles.transactionsList}>
              {transactions.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>📊</span>
                  <p>لا توجد معاملات</p>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} style={styles.transactionItem}>
                    <div style={styles.transactionHeader}>
                      <span style={styles.transactionUser}>👤 {transaction.userName || 'طالب'}</span>
                      {transaction.type === 'exchange_xp_to_gems' ? (
                        <span style={styles.transactionProduct}>⭐ تحويل خبرة → جواهر</span>
                      ) : (
                        <span style={styles.transactionProduct}>
                          {getProductIcon(transaction.productType)} {transaction.productName}
                        </span>
                      )}
                      <span style={styles.transactionDate}>
                        {formatDate(transaction.createdAt)}
                      </span>
                    </div>
                    <div style={styles.transactionDetails}>
                      {transaction.type === 'exchange_xp_to_gems' ? (
                        <>
                          <span style={styles.transactionPrice}>⭐ {transaction.xpAmount} نقطة خبرة</span>
                          <span style={styles.transactionAmount}>💎 {transaction.gemsAmount} جواهر</span>
                          <span style={styles.transactionBalance}>سعر الصرف: 1 جوهرة = {transaction.rate} نقطة خبرة</span>
                        </>
                      ) : (
                        <>
                          <span style={styles.transactionPrice}>
                            السعر: {transaction.price} {getPriceLabel(transaction.productType)}
                          </span>
                          <span style={styles.transactionBalance}>
                            ⭐ {transaction.xpBefore} → {transaction.xpAfter}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
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
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent',
  },
  adminInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  adminName: {
    fontSize: '16px',
    fontWeight: '600',
  },
  adminBadge: {
    padding: '4px 12px',
    background: 'rgba(16,185,129,0.1)',
    color: '#34d399',
    borderRadius: '20px',
    fontSize: '12px',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
    border: '1px solid',
    fontSize: '14px',
  },
  settingsSection: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '30px',
    border: '1px solid rgba(255,215,0,0.1)',
  },
  settingsTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: '15px',
  },
  settingsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  settingsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap' as const,
  },
  settingsLabel: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
  },
  settingsInput: {
    width: '100px',
    padding: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
  },
  settingsButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  settingsHint: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
  },
  tabs: {
    display: 'flex',
    gap: '20px',
    marginBottom: '30px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    background: 'transparent',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    color: 'rgba(255,255,255,0.4)',
  },
  tabContent: {
    animation: 'fadeIn 0.3s ease',
  },
  productsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
    margin: 0,
  },
  addBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  formContainer: {
    padding: '25px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    marginBottom: '25px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: 'rgba(255,255,255,0.8)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  input: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
  },
  select: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
  },
  textarea: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    resize: 'vertical' as const,
    fontFamily: '"Cairo", sans-serif',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
  },
  saveBtn: {
    padding: '10px 30px',
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
    padding: '10px 30px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  productsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  productItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    flexWrap: 'wrap' as const,
    gap: '10px',
  },
  productInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap' as const,
    flex: 1,
  },
  productIcon: {
    fontSize: '28px',
  },
  productDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  productName: {
    fontSize: '16px',
    fontWeight: '600',
  },
  productType: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  productPricing: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
  },
  productPrice: {
    color: '#FFD700',
  },
  productStatus: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 10px',
    borderRadius: '12px',
  },
  productOrder: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.2)',
  },
  productActions: {
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    padding: '6px 12px',
    background: 'rgba(245,158,11,0.15)',
    color: '#f59e0b',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  toggleBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  deleteBtn: {
    padding: '6px 12px',
    background: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'rgba(255,255,255,0.3)',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '10px',
  },
  transactionsStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
    marginBottom: '25px',
  },
  statCard: {
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    textAlign: 'center' as const,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#FFD700',
    display: 'block',
  },
  statLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    maxHeight: '600px',
    overflowY: 'auto' as const,
  },
  transactionItem: {
    padding: '15px 20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  transactionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '10px',
    marginBottom: '8px',
  },
  transactionUser: {
    fontSize: '15px',
    fontWeight: '600',
  },
  transactionProduct: {
    fontSize: '14px',
    color: '#FFD700',
  },
  transactionDate: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  transactionDetails: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap' as const,
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  transactionPrice: {
    color: '#FFD700',
  },
  transactionAmount: {
    color: '#34d399',
  },
  transactionBalance: {
    color: 'rgba(255,255,255,0.5)',
  },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}
