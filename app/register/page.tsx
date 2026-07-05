'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userType, setUserType] = useState('student');
  const [children, setChildren] = useState([{ name: '' }]);
  const [countryCode, setCountryCode] = useState('+20');
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

  const addChild = () => {
    setChildren([...children, { name: '' }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      const newChildren = children.filter((_, i) => i !== index);
      setChildren(newChildren);
    }
  };

  const updateChild = (index: number, field: string, value: string) => {
    const newChildren = [...children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setChildren(newChildren);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordValue !== confirmPassword) {
      setMessage('❌ كلمة السر غير متطابقة');
      return;
    }

    const digits = getCountryDigits(countryCode);
    const cleanedPhone = phoneValue.replace(/\D/g, '');
    if (cleanedPhone.length !== digits) {
      setPhoneError(`⚠️ يجب أن يكون ${digits} أرقام (الحالي: ${cleanedPhone.length})`);
      setMessage(`❌ رقم الهاتف يجب أن يكون ${digits} أرقام`);
      return;
    }

    setLoading(true);
    setMessage('🔄 جاري التحقق من البيانات...');

    try {
      const { db } = await import('@/lib/firebase');
      const { collection, addDoc, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');

      const form = e.target as HTMLFormElement;
      const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
      const parentNameInput = form.querySelector('[name="parentName"]') as HTMLInputElement;
      const parentPhoneInput = form.querySelector('[name="parentPhone"]') as HTMLInputElement;

      const fullPhone = countryCode + cleanedPhone;

      const userData: any = {
        name: nameInput?.value || 'مستخدم',
        phone: fullPhone,
        countryCode: countryCode,
        password: passwordValue,
        role: userType,
        status: userType === 'student' ? 'pending' : 'active',
        points: 0,
        level: 1,
        xp: 0,
        streak: 0,
        createdAt: new Date().toISOString(),
      };

      if (userType === 'student') {
        userData.grade = (form.querySelector('[name="grade"]') as HTMLSelectElement)?.value || '';
        userData.parentName = parentNameInput?.value || '';
        userData.parentPhone = parentPhoneInput?.value || '';
        userData.isApproved = false;
      }

      if (userType === 'parent') {
        userData.parentName = parentNameInput?.value || '';
        userData.children = children.filter(c => c.name.trim() !== '').map(c => c.name);
        userData.parentPhone = fullPhone;
        userData.isApproved = true;
      }

      if (userType === 'teacher') {
        userData.isApproved = false;
        userData.subject = '';
        userData.grade = '';
      }

      setMessage('🔍 جاري التحقق من رقم الهاتف...');
      const usersRef = collection(db, 'users');
      const phoneQuery = query(usersRef, where('phone', '==', fullPhone));
      const querySnapshot = await getDocs(phoneQuery);

      if (!querySnapshot.empty) {
        setMessage('❌ رقم الهاتف هذا مسجل بالفعل');
        setLoading(false);
        return;
      }

      setMessage('🔄 جاري إنشاء الحساب...');
      const docRef = await addDoc(collection(db, 'users'), userData);
      const userId = docRef.id;
      
      setMessage('✅ تم التسجيل بنجاح! سيتم مراجعة طلبك من قبل الأدمن.');
      
      if (userType === 'student') {
        const parentPhoneRaw = parentPhoneInput?.value || '';
        const parentPhoneCleaned = parentPhoneRaw.replace(/\D/g, '');
        const fullParentPhone = parentPhoneCleaned ? countryCode + parentPhoneCleaned : '';
        
        if (fullParentPhone) {
          try {
            const parentQuery = query(
              collection(db, 'users'),
              where('phone', '==', fullParentPhone),
              where('role', '==', 'parent')
            );
            const parentSnapshot = await getDocs(parentQuery);
            
            if (!parentSnapshot.empty) {
              const parentDoc = parentSnapshot.docs[0];
              const parentData = parentDoc.data();
              let childrenList = parentData.children || [];
              
              childrenList = childrenList.filter((child: any) => typeof child === 'string');
              
              if (!childrenList.includes(userId)) {
                childrenList.push(userId);
                await updateDoc(doc(db, 'users', parentDoc.id), {
                  children: childrenList,
                });
                console.log(`✅ تم ربط الطالب ${userId} بولي الأمر ${parentDoc.id}`);
                setMessage('✅ تم التسجيل وربط ولي الأمر بنجاح!');
              }
            } else {
              console.log(`⚠️ لا يوجد ولي أمر برقم ${fullParentPhone}`);
            }
          } catch (linkError) {
            console.error('❌ خطأ في ربط ولي الأمر:', linkError);
          }
        }
      }

      (e.target as HTMLFormElement).reset();
      setPhoneValue('');
      setPasswordValue('');
      setConfirmPassword('');
      setChildren([{ name: '' }]);

      setTimeout(() => {
        setMessage('📞 سيتواصل معك الأدمن قريباً للتفعيل');
      }, 2000);
    } catch (error: any) {
      console.error('Firebase error:', error);
      setMessage('❌ حدث خطأ في التسجيل');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  useEffect(() => {
    if (confirmPassword.length > 0) {
      setPasswordMatch(passwordValue === confirmPassword);
    } else {
      setPasswordMatch(true);
    }
  }, [passwordValue, confirmPassword]);

  if (!mounted) return null;

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      <div style={styles.backgroundOverlay}></div>

      <div style={isMobile ? styles.contentMobile : styles.content}>
        <div style={isMobile ? styles.rightPanelMobile : styles.rightPanel}>
          <div style={styles.imageWrapper}>
            <div style={styles.imageContainer}>
              <img
                src="/images/boy-register.png"
                alt="Student"
                style={styles.image}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div style={styles.imageFallback}>
                <span style={styles.fallbackIcon}>👨‍🎓</span>
              </div>
            </div>

            <div style={styles.welcomeText}>
              <h2 style={styles.welcomeTitle}>مرحباً بك في</h2>
              <h1 style={styles.platformName}>Fancy Academy</h1>
              <p style={styles.welcomeMessage}>منصة التعليم الذكية</p>
            </div>

            {!isMobile && (
              <div style={styles.rightPanelLinks}>
                <a 
                  href="https://wa.me/201080217436" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{...styles.rightLink, ...styles.greenButton}}
                >
                  <span style={styles.linkIcon}>💬</span>
                  <span>تواصل مع الدعم</span>
                </a>
                <Link href="/" style={{...styles.rightLink, ...styles.whiteButton}}>
                  <span style={styles.linkIcon}>🏠</span>
                  <span>الصفحة الرئيسية</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div style={isMobile ? styles.leftPanelMobile : styles.leftPanel}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>إنشاء حساب جديد</h2>
              <p style={styles.formSubtitle}>اختر نوع الحساب وأدخل بياناتك</p>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              {/* نوع المستخدم */}
              <div style={styles.inputGroup}>
                <label style={styles.label}><span style={styles.labelIcon}>👤</span>نوع الحساب</label>
                <div style={styles.userTypeContainer}>
                  <button type="button" onClick={() => setUserType('student')} style={{...styles.userTypeBtn, ...(userType === 'student' ? styles.userTypeActive : {})}}>
                    <span>👨‍🎓</span> طالب
                  </button>
                  <button type="button" onClick={() => setUserType('parent')} style={{...styles.userTypeBtn, ...(userType === 'parent' ? styles.userTypeActive : {})}}>
                    <span>👨‍👦</span> ولي أمر
                  </button>
                  <button type="button" onClick={() => setUserType('teacher')} style={{...styles.userTypeBtn, ...(userType === 'teacher' ? styles.userTypeActive : {})}}>
                    <span>👨‍🏫</span> مدرس
                  </button>
                </div>
              </div>

              {/* الاسم */}
              <div style={styles.inputGroup}>
                <label style={styles.label}><span style={styles.labelIcon}>👤</span>الاسم بالكامل</label>
                <input type="text" name="name" placeholder="أدخل اسمك الثلاثي" required style={styles.input} />
              </div>

              {/* رقم الهاتف */}
              <div style={styles.inputGroup}>
                <label style={styles.label}><span style={styles.labelIcon}>📱</span>رقم الهاتف <span style={styles.required}>*</span></label>
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
                        borderColor: phoneError ? '#ef4444' : isFocused ? '#8b5cf6' : 'rgba(255,255,255,0.15)',
                        boxShadow: isFocused ? '0 0 0 3px rgba(139, 92, 246, 0.15)' : 'none',
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
                    {countries.find(c => c.code === countryCode)?.name} • {getCountryDigits(countryCode)} أرقام
                  </span>
                </div>
              </div>

              {/* ===== طالب ===== */}
              {userType === 'student' && (
                <>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}><span style={styles.labelIcon}>📚</span>السنة الدراسية</label>
                    <select name="grade" required style={styles.select}>
                      <option value="" disabled selected>اختر مرحلتك الدراسية</option>
                      <option value="1-prep">📘 الصف الأول الإعدادي</option>
                      <option value="2-prep">📗 الصف الثاني الإعدادي</option>
                      <option value="3-prep">📕 الصف الثالث الإعدادي</option>
                      <option value="1-secondary">📙 الصف الأول الثانوي</option>
                      <option value="2-secondary">📔 الصف الثاني الثانوي</option>
                      <option value="3-secondary">📒 الصف الثالث الثانوي</option>
                    </select>
                  </div>
                  
                  <div style={styles.inputGroup}>
                    <label style={styles.label}><span style={styles.labelIcon}>👨‍👦</span>ولي الأمر</label>
                    <div style={styles.parentWrapper}>
                      <div style={styles.parentRow}>
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
                            name="parentPhone"
                            placeholder={`${getCountryDigits(countryCode)} أرقام`}
                            style={styles.phoneInput}
                            dir="ltr"
                          />
                        </div>
                        <input
                          type="text"
                          name="parentName"
                          placeholder="اسم ولي الأمر"
                          style={styles.parentNameInput}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ===== ولي أمر ===== */}
              {userType === 'parent' && (
                <>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}><span style={styles.labelIcon}>👤</span>اسم ولي الأمر</label>
                    <input type="text" name="parentName" placeholder="أدخل اسمك كاملاً" required style={styles.input} />
                  </div>
                  
                  <div style={styles.childrenSection}>
                    <label style={styles.label}><span style={styles.labelIcon}>👦</span>أسماء الأبناء</label>
                    {children.map((child, index) => (
                      <div key={index} style={styles.childRow}>
                        <input
                          type="text"
                          placeholder={`اسم الطالب ${index + 1}`}
                          value={child.name}
                          onChange={(e) => updateChild(index, 'name', e.target.value)}
                          style={styles.childInputOnly}
                        />
                        {children.length > 1 && (
                          <button type="button" onClick={() => removeChild(index)} style={styles.removeChildBtn}>✕</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addChild} style={styles.addChildBtn}>➕ إضافة طالب آخر</button>
                  </div>
                </>
              )}

              {/* ===== مدرس ===== */}
              {userType === 'teacher' && (
                <div style={styles.infoBox}>
                  <span style={styles.infoIcon}>ℹ️</span>
                  <span style={styles.infoText}>سيتم إضافة المواد والمراحل لاحقاً من خلال لوحة التحكم</span>
                </div>
              )}

              {/* كلمة السر */}
              <div style={styles.inputGroup}>
                <label style={styles.label}><span style={styles.labelIcon}>🔐</span>كلمة السر</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="●●●●●●●●"
                    required
                    minLength={6}
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    style={styles.passwordInput}
                  />
                  <button type="button" onClick={togglePasswordVisibility} style={styles.passwordToggle}>
                    {showPassword ? "🔒" : "👁️"}
                  </button>
                </div>
                <div style={styles.passwordStrengthContainer}>
                  <div style={styles.passwordStrength}>
                    <div style={{
                      ...styles.strengthBar,
                      width: passwordValue.length >= 6 ? '100%' : `${(passwordValue.length / 6) * 100}%`,
                      background: passwordValue.length >= 6 ? '#10b981' : passwordValue.length >= 4 ? '#f59e0b' : passwordValue.length >= 2 ? '#ef4444' : 'rgba(255,255,255,0.1)'
                    }}></div>
                  </div>
                  <span style={styles.passwordHint}>لا تقل عن 6 أحرف</span>
                </div>
              </div>

              {/* تأكيد كلمة السر */}
              <div style={styles.inputGroup}>
                <label style={styles.label}><span style={styles.labelIcon}>🔒</span>تأكيد كلمة السر</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="●●●●●●●●"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      ...styles.passwordInput,
                      borderColor: !passwordMatch && confirmPassword.length > 0 ? '#ef4444' : 'rgba(255,255,255,0.15)',
                      boxShadow: !passwordMatch && confirmPassword.length > 0 ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                    }}
                  />
                  <button type="button" onClick={toggleConfirmPasswordVisibility} style={styles.passwordToggle}>
                    {showConfirmPassword ? "🔒" : "👁️"}
                  </button>
                </div>
                {!passwordMatch && confirmPassword.length > 0 && (
                  <span style={styles.errorMessage}>كلمة السر غير متطابقة</span>
                )}
              </div>

              {/* زر التسجيل */}
              <button
                type="submit"
                style={{ ...styles.submitButton, ...(loading && styles.submitButtonLoading) }}
                disabled={loading || !passwordMatch}
              >
                {loading ? (
                  <span style={styles.buttonContent}>
                    <span style={styles.spinner}></span>
                    جاري إنشاء الحساب...
                  </span>
                ) : (
                  <span style={styles.buttonContent}>
                    <span>إنشاء حساب</span>
                    <span style={styles.buttonArrow}>✦</span>
                  </span>
                )}
              </button>
            </form>

            {message && (
              <div style={{
                ...styles.message,
                ...(message.includes('✅') && styles.messageSuccess),
                ...(message.includes('❌') && styles.messageError),
                ...(message.includes('🔍') && styles.messageInfo),
                ...(message.includes('🔄') && styles.messageInfo),
                ...(message.includes('📞') && styles.messageSuccess)
              }}>
                <span style={styles.messageIcon}>
                  {message.includes('✅') ? '✅' : message.includes('❌') ? '❌' : message.includes('🔍') ? '🔍' : message.includes('📞') ? '📞' : '🔄'}
                </span>
                <span>{message}</span>
              </div>
            )}

            <div style={styles.footer}>
              <div style={styles.loginRow}>
                <span style={styles.loginText}>لديك حساب بالفعل؟</span>
                <Link href="/login" style={styles.loginLink}>تسجيل الدخول</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isMobile && (
        <div style={styles.mobileLinks}>
          <a 
            href="https://wa.me/201080217436" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{...styles.mobileLink, ...styles.greenButtonMobile}}
          >
            <span style={styles.linkIcon}>💬</span>
            <span>تواصل مع الدعم</span>
          </a>
          <Link href="/" style={{...styles.mobileLink, ...styles.whiteButtonMobile}}>
            <span style={styles.linkIcon}>🏠</span>
            <span>الصفحة الرئيسية</span>
          </Link>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        
        /* ✅ ✅ إصلاح ظهور خيارات الـ select */
        select {
          background-color: #1a1a2e !important;
          color: white !important;
        }
        select option {
          background-color: #1a1a2e !important;
          color: white !important;
          padding: 10px !important;
        }
        select option:hover {
          background-color: #8b5cf6 !important;
          color: white !important;
        }
        select:focus {
          outline: 2px solid #8b5cf6 !important;
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
    background: 'linear-gradient(-45deg, #0a0a1a, #1a0a2e, #0d1b2a, #0a0a1a)',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(-45deg, #0a0a1a, #1a0a2e, #0d1b2a, #0a0a1a)',
    backgroundSize: '400% 400%',
    animation: 'gradientMove 20s ease infinite',
    zIndex: 0,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 30% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 60%)',
    zIndex: 1,
  },
  content: { position: 'relative', zIndex: 2, display: 'flex', minHeight: '100vh' },
  contentMobile: { position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', minHeight: '100vh' },

  rightPanel: { flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative', animation: 'fadeIn 0.8s ease-out' },
  rightPanelMobile: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', animation: 'fadeIn 0.8s ease-out' },
  imageWrapper: { maxWidth: '600px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  imageContainer: { position: 'relative', marginBottom: '30px', animation: 'float 6s ease-in-out infinite' },
  image: { width: '100%', maxWidth: '450px', margin: '0 auto', display: 'block', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))' },
  imageFallback: { width: '300px', height: '300px', margin: '0 auto', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 30px 40px rgba(0,0,0,0.3)' },
  fallbackIcon: { fontSize: '120px' },
  welcomeText: { marginBottom: '40px', color: 'white' },
  welcomeTitle: { fontSize: '28px', fontWeight: '600', marginBottom: '5px', opacity: 0.9 },
  platformName: { fontSize: '42px', fontWeight: '800', marginBottom: '15px', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  welcomeMessage: { fontSize: '18px', opacity: 0.8, lineHeight: 1.6 },

  rightPanelLinks: { display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '350px', marginTop: '20px' },
  mobileLinks: { position: 'relative', zIndex: 2, padding: '0 20px 30px 20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  mobileLink: { width: '100%', padding: '14px', borderRadius: '50px', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.3s', border: 'none', cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box' },

  rightLink: { width: '100%', padding: '16px', borderRadius: '50px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.3s', border: 'none', cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box' },

  greenButton: { background: '#25D366', color: 'white', boxShadow: '0 5px 15px rgba(37, 211, 102, 0.3)' },
  greenButtonMobile: { background: '#25D366', color: 'white', boxShadow: '0 5px 15px rgba(37, 211, 102, 0.3)' },
  whiteButton: { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' },
  whiteButtonMobile: { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' },
  linkIcon: { fontSize: '18px' },

  leftPanel: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' },
  leftPanelMobile: { flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '0 20px 20px 20px' },
  formCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: '30px',
    padding: '40px',
    width: '100%',
    maxWidth: '500px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4)',
    animation: 'fadeIn 0.8s ease-out 0.2s both',
  },
  formHeader: { textAlign: 'center', marginBottom: '30px' },
  formTitle: { fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '5px' },
  formSubtitle: { fontSize: '16px', color: 'rgba(255,255,255,0.6)' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { marginBottom: '5px' },
  label: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600', color: 'rgba(255,255,255,0.8)', fontSize: '14px' },
  labelIcon: { fontSize: '16px' },
  required: { color: '#ef4444', marginRight: '4px', fontSize: '16px' },

  input: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
    fontSize: '15px',
    transition: 'all 0.3s',
    background: 'rgba(255,255,255,0.05)',
    outline: 'none',
    boxSizing: 'border-box',
    color: 'white',
  },

  select: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
    fontSize: '15px',
    transition: 'all 0.3s',
    background: 'rgba(255,255,255,0.05)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    color: 'white',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='white' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left 16px center',
    paddingLeft: '40px',
  },

  infoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: 'rgba(139, 92, 246, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.15)',
    borderRadius: '12px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px',
  },
  infoIcon: {
    fontSize: '18px',
  },
  infoText: {
    fontSize: '14px',
  },

  passwordWrapper: { position: 'relative' },
  passwordInput: {
    width: '100%',
    padding: '14px 45px 14px 16px',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
    fontSize: '15px',
    transition: 'all 0.3s',
    background: 'rgba(255,255,255,0.05)',
    outline: 'none',
    boxSizing: 'border-box',
    color: 'white',
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
    color: 'rgba(255,255,255,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordStrengthContainer: { marginTop: '8px' },
  passwordStrength: { height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' },
  strengthBar: { height: '100%', transition: 'width 0.2s ease' },
  passwordHint: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'block' },
  errorMessage: { display: 'block', fontSize: '12px', color: '#ef4444', marginTop: '6px' },

  userTypeContainer: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  userTypeBtn: {
    flex: 1,
    padding: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.3s',
    minWidth: '80px',
    color: 'rgba(255,255,255,0.6)',
  },
  userTypeActive: {
    borderColor: '#8b5cf6',
    background: 'rgba(139, 92, 246, 0.15)',
    color: '#a78bfa',
    boxShadow: '0 0 30px rgba(139, 92, 246, 0.1)',
  },

  phoneWrapper: { display: 'flex', flexDirection: 'column', gap: '6px' },
  phoneInputContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
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
    color: 'rgba(255,255,255,0.15)',
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
  phoneErrorText: { display: 'block', fontSize: '11px', color: '#ef4444', marginTop: '4px', textAlign: 'right' },
  phoneHelper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
  },
  helperFlag: { fontSize: '14px' },
  helperText: { fontSize: '12px', color: 'rgba(255,255,255,0.35)' },

  parentWrapper: { display: 'flex', flexDirection: 'column', gap: '6px' },
  parentRow: { display: 'flex', gap: '10px', alignItems: 'center' },
  parentNameInput: {
    flex: 1,
    padding: '14px 16px',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
    fontSize: '15px',
    transition: 'all 0.3s',
    background: 'rgba(255,255,255,0.05)',
    outline: 'none',
    color: 'white',
  },

  childrenSection: { marginBottom: '5px' },
  childRow: { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' },
  
  childInputOnly: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    fontSize: '14px',
    background: 'rgba(255,255,255,0.05)',
    outline: 'none',
    color: 'white',
    minWidth: '200px',
  },
  
  childInput: {
    flex: 1,
    minWidth: '120px',
    padding: '10px 14px',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    fontSize: '14px',
    background: 'rgba(255,255,255,0.05)',
    outline: 'none',
    color: 'white',
  },
  childSelect: {
    padding: '10px 14px',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    fontSize: '14px',
    background: 'rgba(255,255,255,0.05)',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '110px',
    color: 'white',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='white' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left 12px center',
    paddingLeft: '32px',
  },
  removeChildBtn: { padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  addChildBtn: {
    padding: '10px',
    background: 'transparent',
    color: '#a78bfa',
    border: '1px dashed rgba(139, 92, 246, 0.3)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    width: '100%',
  },

  submitButton: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '10px',
    boxShadow: '0 10px 30px rgba(124, 58, 237, 0.25)',
  },
  submitButtonLoading: { opacity: 0.7 },
  buttonContent: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  buttonArrow: { fontSize: '20px' },
  spinner: { width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

  message: { marginTop: '20px', padding: '15px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500', border: '1px solid', animation: 'fadeIn 0.3s ease' },
  messageSuccess: { background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
  messageError: { background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' },
  messageInfo: { background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' },
  messageIcon: { fontSize: '20px', flexShrink: 0 },

  footer: { marginTop: '25px', textAlign: 'center' },
  loginRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  loginText: { color: 'rgba(255,255,255,0.5)', fontSize: '15px' },
  loginLink: { color: '#a78bfa', fontWeight: '700', textDecoration: 'none', fontSize: '15px' },
};