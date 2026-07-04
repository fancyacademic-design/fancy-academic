'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  orderBy,
  setDoc
} from 'firebase/firestore';

export default function StorePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [gems, setGems] = useState(0);
  const [xp, setXp] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showContent, setShowContent] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState(10);
  const [exchangeAmount, setExchangeAmount] = useState(1);
  const [exchangeLoading, setExchangeLoading] = useState(false);

  // ✅ جلب بيانات المستخدم
  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    setUser(parsed);
    loadUserData(parsed.id);
    loadProducts();
    loadExchangeRate();
  }, []);

  // ✅ جلب بيانات المستخدم
  const loadUserData = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setGems(data.gems || 0);
        setXp(data.xp || 0);
        console.log('✅ جواهر:', data.gems, 'نقاط خبرة:', data.xp);
      }
    } catch (error) {
      console.error('❌ خطأ:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ جلب المنتجات النشطة
  const loadProducts = async () => {
    try {
      const q = query(
        collection(db, 'store_products'),
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('❌ خطأ في جلب المنتجات:', error);
    }
  };

  // ✅ جلب سعر الصرف (نقاط خبرة → جواهر)
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

  // ✅ ✅ تحويل نقاط خبرة → جواهر
  const handleExchange = async () => {
    if (exchangeLoading) return;
    
    const neededXp = exchangeAmount * exchangeRate;
    
    if (xp < neededXp) {
      setMessage(`⚠️ رصيد نقاط الخبرة غير كافٍ! لديك ${xp} نقطة`);
      return;
    }

    if (!confirm(`⚠️ هل أنت متأكد من تحويل ${neededXp} نقطة خبرة إلى ${exchangeAmount} جواهر؟`)) return;

    setExchangeLoading(true);
    setMessage('');

    try {
      const userRef = doc(db, 'users', user.id);
      const newXp = xp - neededXp;
      const newGems = gems + exchangeAmount;

      await updateDoc(userRef, {
        gems: newGems,
        xp: newXp,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'store_transactions'), {
        userId: user.id,
        userName: user.name || 'طالب',
        type: 'exchange_xp_to_gems',
        xpAmount: neededXp,
        gemsAmount: exchangeAmount,
        rate: exchangeRate,
        xpBefore: xp,
        xpAfter: newXp,
        gemsBefore: gems,
        gemsAfter: newGems,
        createdAt: serverTimestamp(),
      });

      setGems(newGems);
      setXp(newXp);
      setMessage(`✅ تم تحويل ${neededXp} نقطة خبرة إلى ${exchangeAmount} جواهر بنجاح!`);
      setExchangeAmount(1);

    } catch (error) {
      console.error('❌ خطأ في التحويل:', error);
      setMessage('❌ حدث خطأ في عملية التحويل');
    } finally {
      setExchangeLoading(false);
    }
  };

  // ✅ ✅ تنفيذ عملية الشراء
  const handlePurchase = async (product: any) => {
    if (processing) return;
    
    if (product.type === 'buy_with_xp') {
      if (xp < product.price) {
        setMessage(`⚠️ رصيد نقاط الخبرة غير كافٍ! لديك ${xp} نقطة`);
        return;
      }
    }

    if (!confirm(`⚠️ هل أنت متأكد من شراء "${product.name}"؟`)) return;

    setProcessing(true);
    setMessage('');

    try {
      const userRef = doc(db, 'users', user.id);
      let newXp = xp;

      if (product.type === 'buy_with_xp') {
        newXp = xp - product.price;
      }

      await updateDoc(userRef, {
        xp: newXp,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'store_transactions'), {
        userId: user.id,
        userName: user.name || 'طالب',
        productId: product.id,
        productName: product.name,
        productType: product.type,
        price: product.price,
        xpBefore: xp,
        xpAfter: newXp,
        createdAt: serverTimestamp(),
      });

      setXp(newXp);
      setShowContent(product);
      setMessage(`✅ تم شراء "${product.name}" بنجاح!`);

    } catch (error) {
      console.error('❌ خطأ في الشراء:', error);
      setMessage('❌ حدث خطأ في عملية الشراء');
    } finally {
      setProcessing(false);
    }
  };

  const closeContent = () => {
    setShowContent(null);
  };

  const getProductIcon = (type: string) => {
    if (type === 'buy_with_money') return '💰';
    return '⭐';
  };

  const getProductColor = (type: string) => {
    if (type === 'buy_with_money') return 'linear-gradient(135deg, #10b981, #059669)';
    return 'linear-gradient(135deg, #f59e0b, #d97706)';
  };

  const getPriceLabel = (type: string) => {
    if (type === 'buy_with_money') return 'جنيه';
    return 'نقاط خبرة';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>جاري تحميل المتجر...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/platform" style={styles.backButton}>← العودة للمنصة</Link>
          <h1 style={styles.title}>🛒 المتجر</h1>
          <div style={styles.balanceContainer}>
            <span style={styles.balanceItem}>💎 {gems}</span>
            <span style={styles.balanceItem}>⭐ {xp}</span>
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

        <div style={styles.balanceCard}>
          <div style={styles.balanceGrid}>
            <div style={styles.balanceBox}>
              <span style={styles.balanceIcon}>💎</span>
              <div>
                <span style={styles.balanceValue}>{gems}</span>
                <span style={styles.balanceLabel}>جواهر</span>
              </div>
            </div>
            <div style={styles.balanceBox}>
              <span style={styles.balanceIcon}>⭐</span>
              <div>
                <span style={styles.balanceValue}>{xp}</span>
                <span style={styles.balanceLabel}>نقاط خبرة</span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.exchangeSection}>
          <h3 style={styles.exchangeTitle}>⭐ تحويل نقاط الخبرة إلى جواهر</h3>
          <p style={styles.exchangeDesc}>سعر الصرف: 1 جوهرة = {exchangeRate} نقطة خبرة</p>
          <div style={styles.exchangeContainer}>
            <div style={styles.exchangeInputGroup}>
              <label style={styles.exchangeLabel}>عدد الجواهر المطلوبة:</label>
              <input
                type="number"
                min="1"
                value={exchangeAmount}
                onChange={(e) => setExchangeAmount(Math.max(1, Number(e.target.value)))}
                style={styles.exchangeInput}
              />
              <span style={styles.exchangeInfo}>
                = {exchangeAmount * exchangeRate} ⭐
              </span>
            </div>
            <button
              onClick={handleExchange}
              disabled={exchangeLoading}
              style={{
                ...styles.exchangeButton,
                opacity: exchangeLoading ? 0.5 : 1,
                cursor: exchangeLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {exchangeLoading ? '⏳ جاري التحويل...' : '🔄 تحويل'}
            </button>
          </div>
        </div>

        <h2 style={styles.productsTitle}>📦 المنتجات المتاحة</h2>
        <div style={styles.productsGrid}>
          {products.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🛒</span>
              <p>لا توجد منتجات متاحة حالياً</p>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} style={styles.productCard}>
                <div style={styles.productHeader}>
                  <span style={styles.productIcon}>{getProductIcon(product.type)}</span>
                  <div>
                    <h3 style={styles.productName}>{product.name}</h3>
                    {product.description && (
                      <p style={styles.productDesc}>{product.description}</p>
                    )}
                  </div>
                </div>

                <div style={styles.productDetails}>
                  <div style={styles.productPrice}>
                    <span style={styles.priceLabel}>السعر:</span>
                    <span style={styles.priceValue}>
                      {product.price} {getPriceLabel(product.type)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handlePurchase(product)}
                  disabled={processing}
                  style={{
                    ...styles.buyButton,
                    background: getProductColor(product.type),
                    opacity: processing ? 0.5 : 1,
                    cursor: processing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {processing ? '⏳ جاري...' : '🛒 شراء'}
                </button>
              </div>
            ))
          )}
        </div>

        {showContent && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>📄 {showContent.name}</h2>
                <button onClick={closeContent} style={styles.modalClose}>✕</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.contentBox}>
                  {showContent.content ? (
                    <p style={styles.contentText}>{showContent.content}</p>
                  ) : (
                    <p style={styles.contentEmpty}>لا يوجد محتوى مرفق بهذا المنتج</p>
                  )}
                </div>
                <button onClick={closeContent} style={styles.modalButton}>
                  ✅ تم المشاهدة
                </button>
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
  balanceContainer: {
    display: 'flex',
    gap: '15px',
  },
  balanceItem: {
    padding: '6px 16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '20px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: '1px solid rgba(255,255,255,0.05)',
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
  balanceCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '30px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  balanceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  balanceBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  balanceIcon: {
    fontSize: '32px',
  },
  balanceValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    display: 'block',
    color: '#FFD700',
  },
  balanceLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
  },
  exchangeSection: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '30px',
    border: '1px solid rgba(255,215,0,0.1)',
  },
  exchangeTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: '5px',
  },
  exchangeDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '20px',
  },
  exchangeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap' as const,
  },
  exchangeInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    flexWrap: 'wrap' as const,
  },
  exchangeLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
  },
  exchangeInput: {
    width: '100px',
    padding: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
  },
  exchangeInfo: {
    fontSize: '14px',
    color: '#60a5fa',
    fontWeight: '600',
  },
  exchangeButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    minWidth: '120px',
  },
  productsTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: 'rgba(255,255,255,0.8)',
  },
  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  productCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.3s',
  },
  productHeader: {
    display: 'flex',
    gap: '15px',
    marginBottom: '15px',
  },
  productIcon: {
    fontSize: '32px',
    width: '50px',
    height: '50px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  productDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    margin: 0,
  },
  productDetails: {
    display: 'flex',
    gap: '20px',
    padding: '15px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
    marginBottom: '15px',
  },
  productPrice: {
    flex: 1,
  },
  priceLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    display: 'block',
  },
  priceValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  buyButton: {
    width: '100%',
    padding: '12px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'rgba(255,255,255,0.3)',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '10px',
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modalContent: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: 0,
    color: '#FFD700',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '24px',
    cursor: 'pointer',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  contentBox: {
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    minHeight: '100px',
  },
  contentText: {
    fontSize: '16px',
    lineHeight: 1.8,
    color: 'rgba(255,255,255,0.8)',
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
  },
  contentEmpty: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center' as const,
  },
  modalButton: {
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