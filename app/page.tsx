// app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      <div style={styles.backgroundOverlay}></div>

      <header
        style={{
          ...styles.header,
          background: isScrolled ? 'rgba(10, 10, 20, 0.92)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(20px)' : 'none',
          borderBottom: isScrolled ? '1px solid rgba(255, 215, 0, 0.1)' : 'none',
        }}
      >
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <div style={styles.logoIconWrapper}>
              <span style={styles.logoIcon}>✦</span>
            </div>
            <div style={styles.logoText}>
              <h1 style={styles.logoMain}>Fancy Academic</h1>
              <p style={styles.logoSub}>منصة التعليم الذكية</p>
            </div>
          </div>

          <nav style={styles.nav}>
            <button style={styles.navButton} onClick={() => router.push('/login')}>
              تسجيل الدخول
            </button>
            <button style={styles.navButtonPrimary} onClick={() => router.push('/register')}>
              انضم الآن
            </button>
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.hero}>
          <div style={styles.heroContent}>
            <div style={styles.heroBadge}>
              <span style={styles.badgeDot}></span>
              منصة تعليمية متطورة
            </div>

            <h1 style={styles.heroTitle}>
              تعلم بذكاء مع
              <span style={styles.heroHighlight}> Fancy Academic</span>
            </h1>

            <p style={styles.heroDescription}>
              منصة تعليمية ذكية تجمع لك أفضل المدرسين المتخصصين في المواد العلمية،
              مع نظام متابعة وتقييم متطور يحفزك على التفوق
            </p>

            <div style={styles.heroButtons}>
              <button style={styles.primaryButton} onClick={() => router.push('/register')}>
                ✨ ابدأ رحلتك الآن
              </button>
              <button style={styles.secondaryButton} onClick={() => router.push('/login')}>
                ← تسجيل الدخول
              </button>
            </div>

            <div style={styles.stats}>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>✦</span>
                <span style={styles.statLabel}>تجربة تعلم فريدة</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>✦</span>
                <span style={styles.statLabel}>مدرسون متخصصون</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>✦</span>
                <span style={styles.statLabel}>نظام تحفيزي متطور</span>
              </div>
            </div>
          </div>

          <div style={styles.heroImage}>
            <div style={styles.imageWrapper}>
              <div style={styles.imageContent}>
                <div style={styles.mainIcon}>📚</div>
                <p style={styles.imageText}>تعلم بذكاء، تفوق بثقة</p>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.features}>
          <div style={styles.featuresHeader}>
            <span style={styles.featuresBadge}>✦ مميزاتنا</span>
            <h2 style={styles.featuresTitle}>لماذا تختارنا؟</h2>
          </div>

          <div style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIconWrapper}>👨‍🏫</div>
              <h3 style={styles.featureTitle}>مدرسين متخصصين</h3>
              <p style={styles.featureText}>كل مادة يدرسها مدرس متخصص مع متابعة فردية</p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIconWrapper}>📖</div>
              <h3 style={styles.featureTitle}>محتوى متميز</h3>
              <p style={styles.featureText}>دروس فيديو، واجبات، امتحانات، وملفات تفاعلية</p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIconWrapper}>📊</div>
              <h3 style={styles.featureTitle}>متابعة دقيقة</h3>
              <p style={styles.featureText}>تقارير مفصلة عن تقدمك ونقاط قوتك وضعفك</p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIconWrapper}>🏆</div>
              <h3 style={styles.featureTitle}>نظام تحفيزي</h3>
              <p style={styles.featureText}>نقاط ومكافآت وشارات تحفزك على الاستمرار</p>
            </div>
          </div>
        </div>

        <div style={styles.subjectsSection}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionBadge}>✦ المواد</span>
            <h2 style={styles.sectionTitle}>مواد تعليمية متخصصة</h2>
            <p style={styles.sectionSubtitle}>
              نوفر لك مجموعة متنوعة من المواد التعليمية المتخصصة التي تلبي احتياجاتك،
              مع محتوى متكامل يضمن لك الفهم العميق والإتقان
            </p>
          </div>

          <div style={styles.subjectsGrid}>
            <div style={styles.subjectCard}>
              <div style={styles.subjectIcon}>📐</div>
              <h3 style={styles.subjectTitle}>الرياضيات</h3>
              <p style={styles.subjectDesc}>قريباً</p>
            </div>

            <div style={styles.subjectCard}>
              <div style={styles.subjectIcon}>🧪</div>
              <h3 style={styles.subjectTitle}>الكيمياء</h3>
              <p style={styles.subjectDesc}>قريباً</p>
            </div>

            <div style={styles.subjectCard}>
              <div style={styles.subjectIcon}>⚛️</div>
              <h3 style={styles.subjectTitle}>الفيزياء</h3>
              <p style={styles.subjectDesc}>قريباً</p>
            </div>

            <div style={styles.subjectCard}>
              <div style={styles.subjectIcon}>🧬</div>
              <h3 style={styles.subjectTitle}>الأحياء</h3>
              <p style={styles.subjectDesc}>قريباً</p>
            </div>
          </div>
        </div>

        <div style={styles.supportSection}>
          <div style={styles.supportCard}>
            <div style={styles.supportContent}>
              <h2 style={styles.supportTitle}>💬 تواصل مع الدعم</h2>
              <p style={styles.supportText}>
                لديك استفسار أو تحتاج مساعدة؟ فريق الدعم جاهز لمساعدتك في أي وقت
              </p>
              <a href="#" style={styles.supportButton}>
                تواصل معنا
              </a>
            </div>
          </div>
        </div>

        <div style={styles.ctaSection}>
          <div style={styles.ctaCard}>
            <div style={styles.ctaContent}>
              <h2 style={styles.ctaTitle}>ابدأ رحلتك التعليمية اليوم</h2>
              <p style={styles.ctaText}>انضم إلى Fancy Academic واستمتع بتجربة تعليمية متطورة</p>
              <button style={styles.ctaButton} onClick={() => router.push('/register')}>
                ✦ إنشاء حساب مجاني
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerTop}>
            <div style={styles.footerInfo}>
              <div style={styles.footerLogo}>
                <span style={styles.footerLogoIcon}>✦</span>
                <h3 style={styles.footerTitle}>Fancy Academic</h3>
              </div>
              <p style={styles.footerText}>
                منصة التعليم الذكية التي تجمع بين المدرسين المتخصصين والتقنيات الحديثة
              </p>
            </div>

            <div style={styles.footerLinks}>
              <h4 style={styles.footerLinksTitle}>روابط سريعة</h4>
              <Link href="/login" style={styles.footerLink}>تسجيل الدخول</Link>
              <Link href="/register" style={styles.footerLink}>إنشاء حساب</Link>
              <a href="#" style={styles.footerLink}>الدعم الفني</a>
            </div>
          </div>

          <div style={styles.footerBottom}>
            <p style={styles.copyright}>© {new Date().getFullYear()} Fancy Academic. جميع الحقوق محفوظة</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

const styles: any = {
  container: {
    minHeight: '100vh',
    background: '#0a0a14',
    fontFamily: '"Cairo", "Segoe UI", Tahoma, sans-serif',
    direction: 'rtl',
    position: 'relative',
    overflowX: 'hidden',
    color: '#ffffff',
  },
  background: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(-45deg, #0a0a14, #1a0a2e, #0d1b2a, #0a0a14)',
    backgroundSize: '400% 400%',
    animation: 'gradientMove 20s ease infinite',
    zIndex: 0,
  },
  backgroundOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 30% 50%, rgba(255, 215, 0, 0.05) 0%, transparent 60%)',
    zIndex: 1,
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '15px 20px',
    transition: 'all 0.4s ease',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIconWrapper: {
    width: '42px',
    height: '42px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'float 3s ease-in-out infinite',
    boxShadow: '0 0 30px rgba(255, 215, 0, 0.15)',
  },
  logoIcon: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#0a0a14',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoMain: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'white',
    margin: 0,
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: '10px',
    color: '#FFD700',
    margin: 0,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  nav: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  navButton: {
    padding: '8px 18px',
    background: 'transparent',
    color: 'white',
    border: '1px solid rgba(255, 215, 0, 0.2)',
    borderRadius: '50px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '14px',
  },
  navButtonPrimary: {
    padding: '8px 18px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '50px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '14px',
    boxShadow: '0 4px 20px rgba(255, 215, 0, 0.2)',
  },
  main: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '60px',
    alignItems: 'center',
    marginBottom: '80px',
    minHeight: 'calc(100vh - 200px)',
  },
  heroContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    background: 'rgba(255, 215, 0, 0.08)',
    border: '1px solid rgba(255, 215, 0, 0.15)',
    borderRadius: '50px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#FFD700',
    width: 'fit-content',
  },
  badgeDot: {
    width: '6px',
    height: '6px',
    background: '#FFD700',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'pulse 2s infinite',
  },
  heroTitle: {
    fontSize: '52px',
    fontWeight: '800',
    lineHeight: 1.1,
    margin: 0,
  },
  heroHighlight: {
    display: 'block',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroDescription: {
    fontSize: '17px',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 1.8,
    maxWidth: '500px',
  },
  heroButtons: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    marginTop: '10px',
  },
  primaryButton: {
    padding: '14px 30px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 4px 25px rgba(255, 215, 0, 0.25)',
    transition: 'all 0.3s',
  },
  secondaryButton: {
    padding: '14px 30px',
    background: 'transparent',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.3s',
  },
  stats: {
    display: 'flex',
    gap: '40px',
    marginTop: '10px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#FFD700',
  },
  statLabel: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  heroImage: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    maxWidth: '450px',
    padding: '30px',
    position: 'relative',
  },
  imageContent: {
    position: 'relative',
    textAlign: 'center',
    padding: '40px 20px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '30px',
    border: '1px solid rgba(255, 215, 0, 0.05)',
    backdropFilter: 'blur(10px)',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainIcon: {
    fontSize: '72px',
    marginBottom: '15px',
  },
  imageText: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  features: {
    marginBottom: '80px',
  },
  featuresHeader: {
    textAlign: 'center',
    marginBottom: '50px',
  },
  featuresBadge: {
    display: 'inline-block',
    padding: '6px 14px',
    background: 'rgba(255, 215, 0, 0.08)',
    border: '1px solid rgba(255, 215, 0, 0.15)',
    borderRadius: '50px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: '15px',
  },
  featuresTitle: {
    fontSize: '36px',
    fontWeight: '800',
    margin: 0,
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '25px',
  },
  featureCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '30px 20px',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    textAlign: 'center',
    transition: 'all 0.3s',
  },
  featureIconWrapper: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '15px',
  },
  featureTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '10px',
  },
  featureText: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 1.6,
  },
  subjectsSection: {
    marginBottom: '80px',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  sectionBadge: {
    display: 'inline-block',
    padding: '6px 14px',
    background: 'rgba(255, 215, 0, 0.08)',
    border: '1px solid rgba(255, 215, 0, 0.15)',
    borderRadius: '50px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: '15px',
  },
  sectionTitle: {
    fontSize: '36px',
    fontWeight: '800',
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.4)',
    maxWidth: '600px',
    margin: '10px auto 0',
    lineHeight: 1.8,
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
  },
  subjectCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '30px 20px',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    textAlign: 'center',
    transition: 'all 0.3s',
  },
  subjectIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '15px',
  },
  subjectTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  subjectDesc: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.3)',
    marginBottom: '0',
  },
  supportSection: {
    marginBottom: '60px',
  },
  supportCard: {
    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 107, 0, 0.03))',
    padding: '40px 30px',
    borderRadius: '24px',
    border: '1px solid rgba(255, 215, 0, 0.08)',
    textAlign: 'center',
  },
  supportContent: {
    maxWidth: '500px',
    margin: '0 auto',
  },
  supportTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '15px',
  },
  supportText: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: '25px',
    lineHeight: 1.8,
  },
  supportButton: {
    display: 'inline-block',
    padding: '12px 32px',
    background: 'rgba(255, 215, 0, 0.1)',
    color: '#FFD700',
    border: '1px solid rgba(255, 215, 0, 0.2)',
    borderRadius: '50px',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  ctaSection: {
    marginBottom: '40px',
  },
  ctaCard: {
    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 107, 0, 0.05))',
    padding: '50px 30px',
    borderRadius: '30px',
    border: '1px solid rgba(255, 215, 0, 0.05)',
    textAlign: 'center',
  },
  ctaContent: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  ctaTitle: {
    fontSize: '32px',
    fontWeight: '800',
    marginBottom: '15px',
  },
  ctaText: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: '25px',
  },
  ctaButton: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #FFD700, #FF6B00)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 25px rgba(255, 215, 0, 0.2)',
    transition: 'all 0.3s',
  },
  footer: {
    background: 'rgba(0, 0, 0, 0.3)',
    padding: '40px 20px 20px',
    borderTop: '1px solid rgba(255, 215, 0, 0.05)',
    position: 'relative',
    zIndex: 2,
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  footerTop: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '40px',
    marginBottom: '30px',
  },
  footerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  footerLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  footerLogoIcon: {
    fontSize: '18px',
    color: '#FFD700',
    fontWeight: 'bold',
  },
  footerTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
  },
  footerText: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 1.6,
    maxWidth: '400px',
  },
  footerLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  footerLinksTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '5px',
  },
  footerLink: {
    color: 'rgba(255, 255, 255, 0.4)',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'all 0.3s',
  },
  footerBottom: {
    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
    paddingTop: '20px',
    textAlign: 'center',
  },
  copyright: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.2)',
  },
};