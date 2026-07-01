'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { getFullCourseContent } from '@/lib/firebase-course-structure'
import Link from 'next/link'

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [directLessons, setDirectLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [activeLesson, setActiveLesson] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [player, setPlayer] = useState<any>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)

  const SUPPORT_LINKS = {
    whatsapp: "https://wa.me/message/UKASWZCU5BNLN1",
    telegram: "https://t.me/AskMrBishoy_bot"
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  const expandAllModules = () => {
    const allIds = new Set(modules.map(m => m.id))
    setExpandedModules(allIds)
  }

  const collapseAllModules = () => {
    setExpandedModules(new Set())
  }

  const extractVideoId = (url: string) => {
    try {
      if (url.includes('youtu.be/')) {
        return url.split('youtu.be/')[1]?.split('?')[0];
      } 
      else if (url.includes('youtube.com/watch') && url.includes('v=')) {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('v');
      }
      else if (url.includes('youtube.com/embed/')) {
        return url.split('embed/')[1]?.split('?')[0];
      }
      return null;
    } catch {
      return null;
    }
  };

  const isValidVideoUrl = (url: string) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const togglePlayPause = () => {
    if (!player) return;
    try {
      if (isPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('❌ خطأ في التشغيل/الإيقاف:', error);
    }
  };

  const toggleMute = () => {
    if (!player) return;
    try {
      if (isMuted) {
        player.unMute();
      } else {
        player.mute();
      }
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('❌ خطأ في التحكم بالصوت:', error);
    }
  };

  const changePlaybackRate = (speed: number) => {
    if (!player) return;
    try {
      player.setPlaybackRate(speed);
      setPlaybackRate(speed);
    } catch (error) {
      console.error('❌ خطأ في تغيير السرعة:', error);
    }
  };

  const seekForward = () => {
    if (!player) return;
    try {
      const newTime = Math.min(currentTime + 10, duration);
      player.seekTo(newTime, true);
      setCurrentTime(newTime);
    } catch (error) {
      console.error('❌ خطأ في التقدم:', error);
    }
  };

  const seekBackward = () => {
    if (!player) return;
    try {
      const newTime = Math.max(currentTime - 10, 0);
      player.seekTo(newTime, true);
      setCurrentTime(newTime);
    } catch (error) {
      console.error('❌ خطأ في التأخر:', error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!player) return;
    try {
      const newTime = parseFloat(e.target.value);
      player.seekTo(newTime, true);
      setCurrentTime(newTime);
    } catch (error) {
      console.error('❌ خطأ في الانتقال:', error);
    }
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        setIsPlayerReady(true);
        return;
      }
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => setIsPlayerReady(true);
    };
    loadYouTubeAPI();
  }, []);

  useEffect(() => {
    if (!isPlayerReady || !activeLesson?.videoUrl || !playerContainerRef.current) return;
    
    const videoId = extractVideoId(activeLesson.videoUrl);
    if (!videoId) return;
    
    if (player && player.destroy) player.destroy();
    
    const newPlayer = new window.YT.Player(playerContainerRef.current, {
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
        origin: window.location.origin
      },
      events: {
        onReady: (event: any) => {
          setPlayer(event.target);
          setDuration(event.target.getDuration());
          const interval = setInterval(() => {
            if (event.target && event.target.getCurrentTime) {
              setCurrentTime(event.target.getCurrentTime());
            }
          }, 500);
          return () => clearInterval(interval);
        },
        onStateChange: (event: any) => setIsPlaying(event.data === 1),
        onPlaybackRateChange: (event: any) => setPlaybackRate(event.target.getPlaybackRate())
      }
    });
    setPlayer(newPlayer);
    return () => { if (newPlayer && newPlayer.destroy) newPlayer.destroy(); };
  }, [isPlayerReady, activeLesson]);

  useEffect(() => {
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error('❌ خطأ في تحويل بيانات المستخدم:', error)
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!user || !params.id) return
      try {
        setLoading(true)
        const courseRef = doc(db, "courses", params.id as string)
        const courseSnap = await getDoc(courseRef)
        if (!courseSnap.exists()) {
          router.push('/platform')
          return
        }
        setCourse({ id: courseSnap.id, ...courseSnap.data() })

        const accessQuery = query(
          collection(db, "student_courses"),
          where("studentId", "==", user.id || user.userId || user.uid || 'unknown'),
          where("courseId", "==", params.id),
          where("isActive", "==", true)
        )
        const accessSnap = await getDocs(accessQuery)
        
        if (accessSnap.empty) {
          setHasAccess(false)
        } else {
          setHasAccess(true)
          const content = await getFullCourseContent(params.id as string)
          console.log('🔥 محتوى الكورس كامل:', content)
          console.log('📦 الوحدات:', content.modules)
          console.log('📚 الدروس المباشرة:', content.directLessons)
          setModules(content.modules)
          setDirectLessons(content.directLessons)
          
          if (content.modules.length > 0) {
            setExpandedModules(new Set([content.modules[0].id]))
            if (content.modules[0].lessons?.length > 0) {
              setActiveLesson(content.modules[0].lessons[0])
            }
          } else if (content.directLessons.length > 0) {
            setActiveLesson(content.directLessons[0])
          }
        }
      } catch (error) {
        console.error('❌ خطأ في جلب بيانات الكورس:', error)
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchCourseData()
  }, [params.id, user, router])

  const getAllLessonsForList = () => {
    const allLessons: any[] = []
    modules.forEach(module => {
      module.lessons?.forEach((lesson: any) => {
        allLessons.push({ ...lesson, moduleTitle: module.title, type: 'module' })
      })
    })
    directLessons.forEach(lesson => {
      allLessons.push({ ...lesson, moduleTitle: null, type: 'direct' })
    })
    return allLessons
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loader}>⏳</div>
        <p style={styles.loadingText}>جاري تحميل الكورس...</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>❌</div>
        <h2 style={styles.errorTitle}>الكورس غير موجود</h2>
        <Link href="/platform" style={styles.backLink}>← العودة للمنصة</Link>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/platform" style={styles.backButton}>← العودة للمنصة</Link>
            <h1 style={styles.title}>🎓 علمني العلوم مستر بيشوي</h1>
          </div>
        </header>
        <main style={styles.main}>
          <div style={styles.accessDenied}>
            <div style={styles.lockIcon}>🔒</div>
            <h2 style={styles.accessTitle}>الكورس مقفل</h2>
            <p style={styles.accessText}>ليس لديك صلاحية للوصول لكورس <strong>{course.title}</strong></p>
            <div style={styles.contactButtons}>
              <Link href="/bot" style={styles.botButton}>
                🤖 المساعد الذكي
              </Link>
              <a href={SUPPORT_LINKS.telegram} target="_blank" style={styles.telegramButton}>📱 بوت التيلجرام</a>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const allLessons = getAllLessonsForList()

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/platform" style={styles.backButton}>← العودة للمنصة</Link>
          <h1 style={styles.title}>🎓 علمني العلوم مستر بيشوي</h1>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.courseHeader}>
          <h1 style={styles.courseTitle}>{course.title}</h1>
          <p style={styles.courseDescription}>{course.description || 'لا يوجد وصف'}</p>
          <div style={styles.courseMeta}>
            <span style={styles.metaItem}> {course.grade}</span>
            <span style={styles.metaItem}>📖 {allLessons.length} درس</span>
            <span style={styles.metaItem}>📚 {modules.length} وحدة</span>
          </div>
        </div>

        {allLessons.length === 0 ? (
          <div style={styles.emptyLessons}>
            <div style={styles.emptyIcon}>📚</div>
            <h3 style={styles.emptyTitle}>لا توجد دروس بعد</h3>
            <p style={styles.emptyText}>لم يتم إضافة دروس لهذا الكورس بعد. سيتم إضافتها قريباً.</p>
            <div style={isMobile ? styles.contactButtonsMobile : styles.contactButtons}>
              <Link href="/bot" style={styles.botButton}>
                🤖 المساعد الذكي
              </Link>
              <a href={SUPPORT_LINKS.whatsapp} target="_blank" style={styles.whatsappButton}>💬 تواصل على واتساب</a>
            </div>
          </div>
        ) : (
          <div style={styles.content}>
            {/* Video Section */}
            <div style={styles.videoSection}>
              <div style={styles.videoPlayer}>
                {activeLesson?.videoUrl && isValidVideoUrl(activeLesson.videoUrl) ? (
                  <div ref={videoContainerRef} style={styles.videoContainer} onMouseMove={resetControlsTimeout}>
                    <div style={styles.videoWrapper}>
                      <div ref={playerContainerRef} style={{ width: '100%', height: '100%' }} />
                      <div style={styles.protectionOverlay} onClick={togglePlayPause} onContextMenu={(e) => { e.preventDefault(); alert('ممنوع النسخ'); }} />
                      {showControls && (
                        <div style={styles.customControls}>
                          <div style={styles.progressBarContainer}>
                            <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} style={styles.progressBar} />
                            <div style={styles.timeDisplay}>
                              <span>{formatTime(currentTime)}</span>
                              <span>/</span>
                              <span>{formatTime(duration)}</span>
                            </div>
                          </div>
                          <div style={styles.controlsRow}>
                            <div style={styles.controlsLeft}>
                              <button style={styles.controlButton} onClick={togglePlayPause}>{isPlaying ? '⏸️' : '▶️'}</button>
                              <button style={styles.seekButton} onClick={seekBackward}>⏪ 10s</button>
                              <button style={styles.controlButton} onClick={toggleMute}>{isMuted ? '🔇' : '🔊'}</button>
                              <button style={styles.seekButton} onClick={seekForward}>10s ⏩</button>
                              <select value={playbackRate} onChange={(e) => changePlaybackRate(parseFloat(e.target.value))} style={styles.speedSelect}>
                                <option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1">1x</option>
                                <option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="1.75">1.75x</option><option value="2">2x</option>
                              </select>
                            </div>
                            <button style={styles.fullscreenButton} onClick={toggleFullscreen}>⛶</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={styles.videoPlaceholder}>
                    <div style={styles.placeholderIcon}>🎬</div>
                    <p style={styles.placeholderText}>اختر درساً لعرض الفيديو</p>
                  </div>
                )}
                {activeLesson && (
                  <div style={styles.currentLessonInfo}>
                    <h2 style={styles.currentLessonTitle}>{activeLesson.title}</h2>
                    {activeLesson.description && <p style={styles.currentLessonDesc}>{activeLesson.description}</p>}
                    <div style={styles.lessonMeta}>
                      {activeLesson.moduleTitle && <span style={styles.lessonDuration}>📚 {activeLesson.moduleTitle}</span>}
                      <span style={styles.currentSpeedBadge}>السرعة: {playbackRate}x</span>
                    </div>
                  </div>
                )}
              </div>
              {activeLesson && (
                <div style={styles.actionsBar}>
                  {activeLesson.assignmentLink && <a href={activeLesson.assignmentLink} target="_blank" style={styles.actionButton}>📝 الواجب</a>}
                  {activeLesson.examLink && <a href={activeLesson.examLink} target="_blank" style={styles.actionButton}>📊 الامتحان</a>}
                </div>
              )}
            </div>

            {/* Lessons List Section */}
            <div style={styles.lessonsSection}>
              <div style={styles.lessonsHeader}>
                <h2 style={styles.lessonsTitle}>📖 محتوى الكورس</h2>
                <div style={styles.expandButtons}>
                  <button onClick={expandAllModules} style={styles.expandButton}> توسيع الكل</button>
                  <button onClick={collapseAllModules} style={styles.collapseButton}> طي الكل</button>
                </div>
              </div>

              <div style={styles.lessonsList}>
                {modules.map(module => (
                  <div key={module.id} style={styles.moduleItem}>
                    <div onClick={() => toggleModule(module.id)} style={styles.moduleHeader}>
                      <span style={styles.moduleIcon}>{expandedModules.has(module.id) ? '📚' : '📚'}</span>
                      <div style={styles.moduleInfo}>
                        <span style={styles.moduleTitle}>{module.title}</span>
                        <span style={styles.moduleCount}>{module.lessons?.length || 0} دروس</span>
                      </div>
                      <span style={styles.moduleArrow}>{expandedModules.has(module.id) ? '▲' : '▼'}</span>
                    </div>
                    {expandedModules.has(module.id) && (
                      <div style={styles.moduleLessons}>
                        {module.lessons?.map((lesson: any, idx: number) => (
                          <div key={lesson.id} onClick={() => setActiveLesson(lesson)} style={{ ...styles.lessonItem, background: activeLesson?.id === lesson.id ? '#f0f9ff' : 'white', borderColor: activeLesson?.id === lesson.id ? '#3b82f6' : '#e5e7eb' }}>
                            <div style={styles.lessonNumber}>{idx + 1}</div>
                            <div style={styles.lessonContent}>
                              <div style={styles.lessonTitleSmall}>{lesson.title}</div>
                              {lesson.description && <div style={styles.lessonDescSmall}>{lesson.description.substring(0, 60)}...</div>}
                            </div>
                          </div>
                        ))}
                        {(!module.lessons || module.lessons.length === 0) && (
                          <div style={{padding: '15px', textAlign: 'center', color: '#9ca3af'}}>📭 لا توجد دروس في هذه الوحدة بعد</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {directLessons.length > 0 && (
                  <div style={styles.directSection}>
                    <div style={styles.directHeader}>
                      <span style={styles.directIcon}>📖</span>
                      <span style={styles.directTitle}>دروس مباشرة</span>
                    </div>
                    <div style={styles.directLessons}>
                      {directLessons.map((lesson: any, idx: number) => (
                        <div key={lesson.id} onClick={() => setActiveLesson(lesson)} style={{ ...styles.lessonItem, background: activeLesson?.id === lesson.id ? '#f0f9ff' : 'white', borderColor: activeLesson?.id === lesson.id ? '#3b82f6' : '#e5e7eb' }}>
                          <div style={styles.lessonNumber}>{idx + 1}</div>
                          <div style={styles.lessonContent}>
                            <div style={styles.lessonTitleSmall}>{lesson.title}</div>
                            {lesson.description && <div style={styles.lessonDescSmall}>{lesson.description.substring(0, 60)}...</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.supportSection}>
                <h3 style={styles.supportTitle}>💬 لديك سؤال؟</h3>
                <div style={styles.supportButtons}>
                  <Link href="/bot" style={styles.botButton}>
                    🤖 المساعد الذكي
                  </Link>
                  <a href={SUPPORT_LINKS.telegram} target="_blank" style={styles.telegramSupportButton}>📱 تواصل عبر بوت التليجرام</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p style={styles.footerText}>© {new Date().getFullYear()} علمني العلوم مستر بيشوي - منصة التعليم الإلكتروني</p>
        </div>
      </footer>
    </div>
  )
}

const styles: any = {
  container: { minHeight: '100vh', background: '#f8fafc', direction: 'rtl', fontFamily: '"Segoe UI", Tahoma, sans-serif' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  loader: { fontSize: '3rem', marginBottom: '20px' },
  loadingText: { color: 'white', fontSize: '18px' },
  errorContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' },
  errorIcon: { fontSize: '4rem', color: '#ef4444', marginBottom: '20px' },
  errorTitle: { fontSize: '28px', color: '#1f2937', marginBottom: '10px' },
  backLink: { padding: '12px 24px', background: '#3b82f6', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' },
  header: { background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100 },
  headerContent: { maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', padding: '20px 0' },
  backButton: { color: '#3b82f6', textDecoration: 'none', fontWeight: '600', marginLeft: '20px' },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 },
  main: { maxWidth: '1400px', margin: '30px auto', padding: '0 20px' },
  accessDenied: { background: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' },
  lockIcon: { fontSize: '4rem', color: '#ef4444', marginBottom: '20px' },
  accessTitle: { fontSize: '28px', color: '#1f2937', marginBottom: '15px' },
  accessText: { fontSize: '18px', color: '#4b5563', marginBottom: '30px' },
  courseHeader: { background: 'white', borderRadius: '12px', padding: '30px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  courseTitle: { fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '15px' },
  courseDescription: { fontSize: '18px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.6 },
  courseMeta: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
  metaItem: { background: '#f3f4f6', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', color: '#4b5563' },
  emptyLessons: { background: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center' },
  emptyIcon: { fontSize: '4rem', color: '#9ca3af', marginBottom: '20px' },
  emptyTitle: { fontSize: '24px', color: '#1f2937', marginBottom: '15px' },
  emptyText: { fontSize: '16px', color: '#6b7280', marginBottom: '30px' },
  content: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' },
  videoSection: { display: 'flex', flexDirection: 'column', gap: '25px' },
  videoPlayer: { background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  videoContainer: { width: '100%', height: '450px', overflow: 'hidden', position: 'relative', background: '#000' },
  videoWrapper: { position: 'relative', width: '100%', height: '100%' },
  protectionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer', background: 'transparent', zIndex: 2 },
  customControls: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '20px', zIndex: 3 },
  progressBarContainer: { width: '100%', marginBottom: '15px' },
  progressBar: { width: '100%', height: '6px', WebkitAppearance: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', outline: 'none', cursor: 'pointer' },
  timeDisplay: { display: 'flex', justifyContent: 'space-between', color: 'white', fontSize: '13px', marginTop: '8px' },
  controlsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  controlsLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  controlButton: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', minWidth: '40px' },
  seekButton: { background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  speedSelect: { background: 'rgba(0,0,0,0.7)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', padding: '6px 10px', fontSize: '13px', cursor: 'pointer' },
  fullscreenButton: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  videoPlaceholder: { width: '100%', height: '450px', background: '#1f2937', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' },
  placeholderIcon: { fontSize: '4rem', marginBottom: '20px' },
  placeholderText: { fontSize: '20px', fontWeight: '600' },
  currentLessonInfo: { padding: '20px', borderTop: '1px solid #e5e7eb' },
  currentLessonTitle: { fontSize: '22px', fontWeight: 'bold', color: '#1f2937', marginBottom: '10px' },
  currentLessonDesc: { color: '#6b7280', marginBottom: '15px', lineHeight: 1.6 },
  lessonMeta: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
  lessonDuration: { color: '#6b7280', fontSize: '14px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' },
  currentSpeedBadge: { background: '#10b981', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  actionsBar: { display: 'flex', gap: '15px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  actionButton: { flex: 1, padding: '15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', textDecoration: 'none', textAlign: 'center' },
  lessonsSection: { display: 'flex', flexDirection: 'column', gap: '25px' },
  lessonsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
  lessonsTitle: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 },
  expandButtons: { display: 'flex', gap: '10px' },
  expandButton: { padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  collapseButton: { padding: '8px 16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  lessonsList: { display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto' },
  moduleItem: { background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' },
  moduleHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 20px', cursor: 'pointer', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  moduleIcon: { fontSize: '24px' },
  moduleInfo: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  moduleTitle: { fontSize: '16px', fontWeight: '600', color: '#1f2937' },
  moduleCount: { fontSize: '12px', color: '#6b7280', background: '#e5e7eb', padding: '2px 8px', borderRadius: '12px' },
  moduleArrow: { fontSize: '12px', color: '#6b7280' },
  moduleLessons: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  directSection: { background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' },
  directHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  directIcon: { fontSize: '24px' },
  directTitle: { fontSize: '16px', fontWeight: '600', color: '#1f2937' },
  directLessons: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  lessonItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', border: '2px solid', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.3s' },
  lessonNumber: { width: '30px', height: '30px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 },
  lessonContent: { flex: 1 },
  lessonTitleSmall: { fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' },
  lessonDescSmall: { fontSize: '12px', color: '#6b7280' },
  supportSection: { background: 'white', padding: '25px', borderRadius: '12px', textAlign: 'center' },
  supportTitle: { fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '15px' },
  supportButtons: { display: 'flex', flexDirection: 'column', gap: '15px' },
  // Updated Button Styles
  botButton: { padding: '15px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '16px', textAlign: 'center', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' },
  whatsappButton: { padding: '15px', background: '#25D366', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '16px', textAlign: 'center' },
  telegramButton: { padding: '15px', background: 'rgb(40, 22, 56)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '16px', textAlign: 'center' },
  whatsappSupportButton: { padding: '15px', background: '#25D366', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' },
  telegramSupportButton: { padding: '15px', background: '#0088cc', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' },
  
  contactButtons: { display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  contactButtonsMobile: { display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'stretch' },
  footer: { background: '#1f2937', marginTop: '50px', padding: '30px 0' },
  footerContent: { maxWidth: '1400px', margin: '0 auto', padding: '0 20px', textAlign: 'center' },
  footerText: { color: '#d1d5db', fontSize: '14px' }
}