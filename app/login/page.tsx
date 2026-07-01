'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/firebase-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [countryCode, setCountryCode] = useState('+20');
  const [phoneValue, setPhoneValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const countries = [
    { code: '+20', name: '🇪🇬 مصر', digits: 10 },
    { code: '+966', name: '🇸🇦 السعودية', digits: 9 },
    { code: '+971', name: '🇦🇪 الإمارات', digits: 9 },
    { code: '+962', name: '🇯🇴 الأردن', digits: 9 },
    { code: '+961', name: '🇱🇧 لبنان', digits: 8 },
    { code: '+970', name: '🇵🇸 فلسطين', digits: 9 },
    { code: '+963', name: '🇸🇾 سوريا', digits: 9 },
    { code: '+964', name: '🇮🇶 العراق', digits: 10 },
    { code: '+965', name: '🇰🇼 الكويت', digits: 8 },
    { code: '+974', name: '🇶🇦 قطر', digits: 8 },
    { code: '+968', name: '🇴🇲 عُمان', digits: 8 },
    { code: '+973', name: '🇧🇭 البحرين', digits: 8 },
    { code: '+218', name: '🇱🇾 ليبيا', digits: 10 },
    { code: '+216', name: '🇹🇳 تونس', digits: 8 },
    { code: '+213', name: '🇩🇿 الجزائر', digits: 9 },
    { code: '+212', name: '🇲🇦 المغرب', digits: 9 },
    { code: '+222', name: '🇲🇷 موريتانيا', digits: 8 },
    { code: '+249', name: '🇸🇩 السودان', digits: 9 },
    { code: '+252', name: '🇸🇴 الصومال', digits: 8 },
    { code: '+967', name: '🇾🇪 اليمن', digits: 9 },
  ];

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getCountryDigits = (code: string) => {
    const country = countries.find(c => c.code === code);
    return country ? country.digits : 10;
  };

  const validatePhone = (value: string) => {
    const digits = getCountryDigits(countryCode);
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) {
      setPhoneError('');
      return true;
    }
    if (cleaned.length < digits) {
      setPhoneError(`⚠️ يجب أن يكون ${digits} أرقام (الحالي: ${cleaned.length})`);
      return false;
    }
    if (cleaned.length > digits) {
      setPhoneError(`⚠️ لا يزيد عن ${digits} أرقام (الحالي: ${cleaned.length})`);
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '');
    const digits = getCountryDigits(countryCode);
    if (cleaned.length <= digits) {
      setPhoneValue(cleaned);
      e.target.value = cleaned;
      validatePhone(cleaned);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    setPhoneValue('');
    setPhoneError('');
    const phoneInput = document.querySelector('input[name="phone"]') as HTMLInputElement;
    if (phoneInput) phoneInput.value = '';
  };

  const checkTeacher = async (phone: string, password: string) => {
    try {
      const q = query(collection(db, 'teachers'), where('phone', '==', phone));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      const data = doc.data();
      if (data.password === password && data.status === 'active') {
        return { id: doc.id, ...data };
      }
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const digits = getCountryDigits(countryCode);
    const cleanedPhone = phoneValue.replace(/\D/g, '');
    if (cleanedPhone.length !== digits) {
      setPhoneError(`⚠️ يجب أن يكون ${digits} أرقام (الحالي: ${cleanedPhone.length})`);
      setError(`❌ رقم الهاتف يجب أن يكون ${digits} أرقام`);
      setLoading(false);
      return;
    }

    const fullPhone = countryCode + cleanedPhone;

    try {
      // التحقق من الطالب أولاً
      const studentResult = await loginUser(fullPhone, passwordValue);

      if (studentResult.success) {
        console.log('✅ تسجيل دخول طالب:', studentResult.user.name);
        localStorage.setItem('currentUser', JSON.stringify({
          ...studentResult.user,
          role: 'student',
        }));
        setTimeout(() => {
          window.location.href = '/platform';
        }, 500);
        setLoading(false);
        return;
      }

      // التحقق من المعلم
      const teacher = await checkTeacher(fullPhone, passwordValue);
      if (teacher) {
        console.log('✅ تسجيل دخول معلم:', teacher.name);
        localStorage.setItem('currentUser', JSON.stringify({
          id: teacher.id,
          name: teacher.name,
          phone: teacher.phone,
          role: 'teacher',
        }));
        setTimeout(() => {
          window.location.href = '/teacher/dashboard';
        }, 500);
        setLoading(false);
        return;
      }

      setError('❌ رقم الهاتف أو كلمة السر غير صحيحة');
    } catch (error: any) {
      console.error('🔥 خطأ:', error);
      setError('❌ حدث خطأ في الخادم. حاول مرة أخرى.');
    }
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      <div style={styles.backgroundOverlay}></div>

      <div style={isMobile ? styles.contentMobile : styles.content}>
        {/* الجهة اليمنى */}
        <div style={isMobile ? styles.rightPanelMobile : styles.rightPanel}>
          <div style={styles.imageWrapper}>
            <div style={styles.imageContainer}>
              <img
                src="/images/boy-login.png"
                alt="Student"
                style={styles.image}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div style={styles.imageFallback}>
                <span style={styles.fallbackIcon}>👨‍🎓</span>
              </div>
            </div>

            <div style={styles.welcomeText}>
              <h2 style={styles.welcomeTitle}>مرحباً بعودتك!</h2>
              <h1 style={styles.platformName}>Fancy Academic</h1>
              <p style={styles.welcomeMessage}>منصة التعليم الذكية - تفوقك يبدأ من هنا</p>
            </div>

            {!isMobile && (
              <div style={styles.quickLinks}>
                <Link href="/register" style={styles.quickLink}>
                  <span style={styles.quickIcon}>✨</span>
                  <span>مشترك جديد؟</span>
                </Link>
                <button
                  onClick={() => window.open('https://wa.me/message/UKASWZCU5BNLN1?src=qr', '_blank')}
                  style={styles.quickLink}
                >
                  <span style={styles.quickIcon}>💬</span>
                  <span>تواصل مع الدعم</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* الجهة اليسرى */}
        <div style={isMobile ? styles.leftPanelMobile : styles.leftPanel}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>تسجيل الدخول</h2>
              <p style={styles.formSubtitle}>أدخل بياناتك للوصول إلى حسابك</p>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>📱</span>
                  رقم الهاتف
                  <span style={styles.required}>*</span>
                </label>
                <div style={styles.phoneWrapper}>
                  <div style={styles.phoneInputContainer}>
                    <select
                      value={countryCode}
                      onChange={handleCountryChange}
                      style={styles.countrySelect}
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.code}
                        </option>
                      ))}
                    </select>
                    <span style={styles.countrySeparator}>|</span>
                    <input
                      type="tel"
                      name="phone"
                      placeholder={`${getCountryDigits(countryCode)} أرقام`}
                      required
                      value={phoneValue}
                      onChange={handlePhoneChange}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      style={{
                        ...styles.phoneInput,
                        borderColor: phoneError
                          ? '#ef4444'
                          : isFocused
                          ? '#8b5cf6'
                          : 'rgba(255,255,255,0.15)',
                        boxShadow: isFocused
                          ? '0 0 0 3px rgba(139, 92, 246, 0.15)'
                          : 'none',
                      }}
                      dir="ltr"
                    />
                  </div>
                  {phoneError && (
                    <span style={styles.phoneErrorText}>{phoneError}</span>
                  )}
                </div>
                <div style={styles.phoneHelper}>
                  <span style={styles.helperFlag}>🌍</span>
                  <span style={styles.helperText}>
                    {countries.find((c) => c.code === countryCode)?.name} •{' '}
                    {getCountryDigits(countryCode)} أرقام
                  </span>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>🔐</span>
                  كلمة السر
                </label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    placeholder="●●●●●●●●"
                    required
                    minLength={6}
                    style={styles.passwordInput}
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

              <div style={styles.forgotHint}>
                <span style={styles.forgotIcon}>❓</span>
                <span>تأكد من كتابة كلمة السر بنفس النمط الذي اخترته</span>
              </div>

              {error && (
                <div
                  style={{
                    ...styles.message,
                    ...(error.includes('✅') && styles.messageSuccess),
                    ...(error.includes('❌') && styles.messageError),
                  }}
                >
                  <span style={styles.messageIcon}>
                    {error.includes('✅') ? '✅' : '⚠️'}
                  </span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  ...(loading && styles.submitButtonLoading),
                }}
                disabled={loading}
              >
                {loading ? (
                  <span style={styles.buttonContent}>
                    <span style={styles.spinner}></span>
                    جاري تسجيل الدخول...
                  </span>
                ) : (
                  <span style={styles.buttonContent}>
                    <span>دخول إلى حسابي</span>
                    <span style={styles.buttonArrow}>✦</span>
                  </span>
                )}
              </button>
            </form>

            <div style={styles.footer}>
              <div style={styles.loginRow}>
                <span style={styles.loginText}>ليس لديك حساب؟</span>
                <Link href="/register" style={styles.loginLink}>
                  إنشاء حساب جديد
                </Link>
              </div>

              <Link href="/" style={styles.homeLink}>
                <span style={styles.homeIcon}>🏠</span>
                <span>العودة للصفحة الرئيسية</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {isMobile && (
        <div style={styles.mobileQuickLinks}>
          <Link href="/register" style={styles.quickLink}>
            <span style={styles.quickIcon}>✨</span>
            <span>مشترك جديد؟</span>
          </Link>
          <button
            onClick={() => window.open('https://wa.me/message/UKASWZCU5BNLN1?src=qr', '_blank')}
            style={styles.quickLink}
          >
            <span style={styles.quickIcon}>💬</span>
            <span>تواصل مع الدعم</span>
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes gradientMove {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}

const styles: any = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '"Cairo", "Segoe UI", Tahoma, sans-serif',
    direction: 'rtl',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(-45deg, #0b1120, #1a1f35, #1e1b4b, #0f172a)',
    backgroundSize: '400% 400%',
    animation: 'gradientMove 15s ease infinite',
    zIndex: 0,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 30% 50%, rgba(37,99,235,0.15) 0%, transparent 60%)',
    zIndex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    minHeight: '100vh',
  },
  contentMobile: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  rightPanel: {
    flex: '1.2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    position: 'relative',
    animation: 'fadeIn 0.8s ease-out',
  },
  rightPanelMobile: {
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    animation: 'fadeIn 0.8s ease-out',
  },
  imageWrapper: {
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: '30px',
    animation: 'float 6s ease-in-out infinite',
  },
  image: {
    width: '100%',
    maxWidth: '450px',
    margin: '0 auto',
    display: 'block',
    filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))',
  },
  imageFallback: {
    width: '300px',
    height: '300px',
    margin: '0 auto',
    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 30px 40px rgba(0,0,0,0.3)',
  },
  fallbackIcon: {
    fontSize: '120px',
  },
  welcomeText: {
    marginBottom: '30px',
    color: 'white',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '5px',
    opacity: 0.9,
  },
  platformName: {
    fontSize: '42px',
    fontWeight: '800',
    marginBottom: '15px',
    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  welcomeMessage: {
    fontSize: '18px',
    opacity: 0.8,
    lineHeight: 1.6,
  },
  quickLinks: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
  },
  mobileQuickLinks: {
    position: 'relative',
    zIndex: 2,
    padding: '0 20px 30px 20px',
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  quickLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 20px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '50px',
    color: 'white',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.3s',
  },
  quickIcon: {
    fontSize: '18px',
  },
  leftPanel: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  leftPanelMobile: {
    flex: '1',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '0 20px 20px 20px',
  },
  formCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '40px',
    padding: '40px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 30px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    animation: 'fadeIn 0.8s ease-out 0.2s both',
  },
  formHeader: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  formTitle: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '5px',
  },
  formSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    marginBottom: '5px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px',
  },
  labelIcon: {
    fontSize: '16px',
  },
  required: {
    color: '#ef4444',
    marginRight: '4px',
    fontSize: '16px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '16px',
    fontSize: '15px',
    transition: 'all 0.3s',
    background: '#f9fafb',
    outline: 'none',
    boxSizing: 'border-box',
  },
  hint: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '6px',
  },
  phoneWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  phoneInputContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    overflow: 'hidden',
    transition: 'all 0.3s',
  },
  countrySelect: {
    padding: '14px 8px 14px 4px',
    border: 'none',
    background: 'transparent',
    fontSize: '14px',
    fontWeight: '600',
    color: '#a78bfa',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '60px',
    textAlign: 'center',
  },
  countrySeparator: {
    color: 'rgba(255, 255, 255, 0.15)',
    fontSize: '18px',
    fontWeight: '300',
  },
  phoneInput: {
    flex: 1,
    padding: '14px 12px',
    border: 'none',
    background: 'transparent',
    fontSize: '15px',
    outline: 'none',
    color: 'white',
    minWidth: '100px',
  },
  phoneErrorText: {
    display: 'block',
    fontSize: '11px',
    color: '#ef4444',
    marginTop: '4px',
    textAlign: 'right',
  },
  phoneHelper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
  },
  helperFlag: {
    fontSize: '14px',
  },
  helperText: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.35)',
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    width: '100%',
    padding: '14px 45px 14px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '16px',
    fontSize: '15px',
    transition: 'all 0.3s',
    background: '#f9fafb',
    outline: 'none',
    boxSizing: 'border-box',
  },
  passwordToggle: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotHint: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '-5px',
    marginBottom: '5px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  forgotIcon: {
    fontSize: '14px',
  },
  message: {
    padding: '15px 20px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: '500',
    border: '1px solid',
    animation: 'fadeIn 0.3s ease',
  },
  messageSuccess: {
    background: '#ecfdf5',
    borderColor: '#a7f3d0',
    color: '#065f46',
  },
  messageError: {
    background: '#fef2f2',
    borderColor: '#fecaca',
    color: '#991b1b',
  },
  messageIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '10px',
    boxShadow: '0 10px 20px rgba(37, 99, 235, 0.3)',
  },
  submitButtonLoading: {
    opacity: 0.8,
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  buttonArrow: {
    fontSize: '20px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  footer: {
    marginTop: '25px',
    textAlign: 'center',
  },
  loginRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '15px',
  },
  loginText: {
    color: '#4b5563',
    fontSize: '15px',
  },
  loginLink: {
    color: '#2563eb',
    fontWeight: '700',
    textDecoration: 'none',
    fontSize: '15px',
    transition: 'all 0.2s',
  },
  homeLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
    padding: '10px',
    borderRadius: '12px',
    transition: 'all 0.2s',
  },
  homeIcon: {
    fontSize: '16px',
  },
};