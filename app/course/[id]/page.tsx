'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { 
  doc, getDoc, collection, query, where, getDocs, 
  addDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore'
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
  
  const [courseExamId, setCourseExamId] = useState<string | null>(null);
  const [courseAssignmentId, setCourseAssignmentId] = useState<string | null>(null);
  const [lessonExamIds, setLessonExamIds] = useState<{ [key: string]: string }>({});
  const [lessonAssignmentIds, setLessonAssignmentIds] = useState<{ [key: string]: string }>({});
  
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)

  const SUPPORT_LINKS = {
    whatsapp: "https://wa.me/201080217436"
  }

  const PLATFORM_NAME = "Fancy Academy 🎓"

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
    
    if (player) {
      try {
        if (player.pauseVideo) player.pauseVideo();
        if (player.destroy) player.destroy();
      } catch (e) {
        console.log('⚠️ اللاعب تم تدميره بالفعل');
      }
      setPlayer(null);
      setIsPlaying(false);
    }
    
    if (playerContainerRef.current) {
      while (playerContainerRef.current.firstChild) {
        try {
          playerContainerRef.current.removeChild(playerContainerRef.current.firstChild);
        } catch (e) {
          break;
        }
      }
    }
    
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
          setCurrentTime(0);
          const interval = setInterval(() => {
            if (event.target && event.target.getCurrentTime) {
              setCurrentTime(event.target.getCurrentTime());
            }
          }, 500);
          return () => clearInterval(interval);
        },
        onStateChange: (event: any) => {
          setIsPlaying(event.data === 1);
          
          if (event.data === 0) {
            const lessonId = activeLesson?.id;
            const courseId = params.id as string;
            if (lessonId && courseId) {
              markLessonAsCompleted(lessonId, courseId);
            }
          }
        },
        onPlaybackRateChange: (event: any) => setPlaybackRate(event.target.getPlaybackRate())
      }
    });
    setPlayer(newPlayer);
    
    return () => {
      if (newPlayer && newPlayer.destroy) {
        try {
          newPlayer.destroy();
        } catch (e) {
          console.log('⚠️ تم تدمير اللاعب بأمان');
        }
      }
    };
  }, [isPlayerReady, activeLesson]);

  useEffect(() => {
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, []);

  const markLessonAsCompleted = async (lessonId: string, courseId: string) => {
    if (!user) return;
    try {
      const existingQuery = query(
        collection(db, 'student_lessons'),
        where('studentId', '==', user.id),
        where('lessonId', '==', lessonId)
      );
      const existingSnap = await getDocs(existingQuery);
      if (!existingSnap.empty) return;
      
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      const subjectId = courseSnap.data()?.subjectId;
      
      await addDoc(collection(db, 'student_lessons'), {
        studentId: user.id,
        lessonId: lessonId,
        courseId: courseId,
        isCompleted: true,
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      
      if (subjectId) {
        await updateSubjectProgress(user.id, subjectId);
      }
    } catch (error) {
      console.error('❌ خطأ في تسجيل إكمال الدرس:', error);
    }
  };

  const updateSubjectProgress = async (studentId: string, subjectId: string) => {
    try {
      const lessonsQuery = query(
        collection(db, 'lessons'),
        where('subjectId', '==', subjectId)
      );
      const lessonsSnap = await getDocs(lessonsQuery);
      const totalLessons = lessonsSnap.size;
      if (totalLessons === 0) return;
      
      const completedQuery = query(
        collection(db, 'student_lessons'),
        where('studentId', '==', studentId),
        where('isCompleted', '==', true)
      );
      const completedSnap = await getDocs(completedQuery);
      const completedIds = new Set(completedSnap.docs.map(d => d.data().lessonId));
      
      let completedInSubject = 0;
      for (const doc of lessonsSnap.docs) {
        if (completedIds.has(doc.id)) {
          completedInSubject++;
        }
      }
      
      const progress = Math.round((completedInSubject / totalLessons) * 100);
      
      const subjectProgressQuery = query(
        collection(db, 'student_subjects'),
        where('studentId', '==', studentId),
        where('subjectId', '==', subjectId)
      );
      const subjectProgressSnap = await getDocs(subjectProgressQuery);
      
      if (!subjectProgressSnap.empty) {
        const docRef = doc(db, 'student_subjects', subjectProgressSnap.docs[0].id);
        await updateDoc(docRef, {
          progress: progress,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث تقدم المادة:', error);
    }
  };

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
        const courseData = { id: courseSnap.id, ...courseSnap.data() }
        setCourse(courseData)
        
        if (courseData.examId && courseData.examId.trim() !== '') {
          setCourseExamId(courseData.examId);
        }
        if (courseData.assignmentId && courseData.assignmentId.trim() !== '') {
          setCourseAssignmentId(courseData.assignmentId);
        }

        const accessQuery = query(
          collection(db, "student_courses"),
          where("studentId", "==", user.id || user.userId || user.uid || 'unknown'),
          where("courseId", "==", params.id),
          where("isActive", "==", true)
        )
        const accessSnap = await getDocs(accessQuery)
        
        if (accessSnap.empty) {
          setHasAccess(false)
          setLoading(false)
          return
        }
        
        setHasAccess(true)

        const modulesQuery = query(
          collection(db, "modules"),
          where("courseId", "==", params.id)
        )
        const modulesSnap = await getDocs(modulesQuery)
        
        const modulesData = await Promise.all(
          modulesSnap.docs.map(async (doc) => {
            const moduleData = { id: doc.id, ...doc.data() }
            
            const lessonsQuery = query(
              collection(db, "lessons"),
              where("moduleId", "==", doc.id)
            )
            const lessonsSnap = await getDocs(lessonsQuery)
            const lessonsData = lessonsSnap.docs.map(l => {
              const data = { id: l.id, ...l.data() };
              
              // ✅ نضيف الـ IDs للـ lesson نفسه
              if (data.examId && data.examId.trim() !== '') {
                data._examId = data.examId;
              }
              if (data.assignmentId && data.assignmentId.trim() !== '') {
                data._assignmentId = data.assignmentId;
              }
              
              return data;
            })
            
            lessonsData.forEach((lesson: any) => {
              if (lesson.examId && lesson.examId.trim() !== '') {
                setLessonExamIds(prev => ({
                  ...prev,
                  [lesson.id]: lesson.examId
                }));
              }
              if (lesson.assignmentId && lesson.assignmentId.trim() !== '') {
                setLessonAssignmentIds(prev => ({
                  ...prev,
                  [lesson.id]: lesson.assignmentId
                }));
              }
            });
            
            lessonsData.sort((a, b) => (a.order || 0) - (b.order || 0))
            
            return { ...moduleData, lessons: lessonsData }
          })
        )
        
        modulesData.sort((a, b) => (a.order || 0) - (b.order || 0))
        setModules(modulesData)

        const directLessonsQuery = query(
          collection(db, "lessons"),
          where("courseId", "==", params.id),
          where("moduleId", "==", "")
        )
        const directLessonsSnap = await getDocs(directLessonsQuery)
        const directLessonsData = directLessonsSnap.docs.map(l => {
          const data = { id: l.id, ...l.data() };
          
          // ✅ نضيف الـ IDs للـ lesson نفسه
          if (data.examId && data.examId.trim() !== '') {
            data._examId = data.examId;
          }
          if (data.assignmentId && data.assignmentId.trim() !== '') {
            data._assignmentId = data.assignmentId;
          }
          
          return data;
        })
        
        directLessonsData.forEach((lesson: any) => {
          if (lesson.examId && lesson.examId.trim() !== '') {
            setLessonExamIds(prev => ({
              ...prev,
              [lesson.id]: lesson.examId
            }));
          }
          if (lesson.assignmentId && lesson.assignmentId.trim() !== '') {
            setLessonAssignmentIds(prev => ({
              ...prev,
              [lesson.id]: lesson.assignmentId
            }));
          }
        });
        
        directLessonsData.sort((a, b) => (a.order || 0) - (b.order || 0))
        setDirectLessons(directLessonsData)

        if (modulesData.length > 0 && modulesData[0].lessons?.length > 0) {
          setActiveLesson(modulesData[0].lessons[0])
          setExpandedModules(new Set([modulesData[0].id]))
        } else if (directLessonsData.length > 0) {
          setActiveLesson(directLessonsData[0])
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

  // ✅ ✅ ✅ الحل النهائي - الامتحان
  const getExamLink = (lesson: any) => {
    // نجيب الـ examId من الدرس مباشرة أو من courseExamId
    const examId = lesson?.examId || lesson?._examId || courseExamId;
    
    // لو مش موجود أو فاضي → نرجع null والزرار مش بيظهر
    if (!examId || examId.trim() === '') {
      return null;
    }
    
    return `/exam/${examId}`;
  }

  // ✅ ✅ ✅ الحل النهائي - الواجب
  const getAssignmentLink = (lesson: any) => {
    const assignmentId = lesson?.assignmentId || lesson?._assignmentId || courseAssignmentId;
    
    if (!assignmentId || assignmentId.trim() === '') {
      return null;
    }
    
    return `/assignment/${assignmentId}`;
  }

  const handleLessonChange = (lesson: any) => {
    if (lesson.id === activeLesson?.id) return;
    
    if (player) {
      try {
        if (player.pauseVideo) player.pauseVideo();
        if (player.destroy) player.destroy();
      } catch (e) {}
      setPlayer(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
    
    if (playerContainerRef.current) {
      try {
        while (playerContainerRef.current.firstChild) {
          playerContainerRef.current.removeChild(playerContainerRef.current.firstChild);
        }
      } catch (e) {}
    }
    
    setActiveLesson(lesson);
  };

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
            <h1 style={styles.title}>{PLATFORM_NAME}</h1>
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
              <a href={SUPPORT_LINKS.whatsapp} target="_blank" style={styles.whatsappButton}>💬 تواصل عبر واتساب</a>
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
          <h1 style={styles.title}>{PLATFORM_NAME}</h1>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.courseHeader}>
          <h1 style={styles.courseTitle}>{course.title}</h1>
          <p style={styles.courseDescription}>{course.description || 'لا يوجد وصف'}</p>
          <div style={styles.courseMeta}>
            <span style={styles.metaItem}>📚 {modules.length} وحدات</span>
            <span style={styles.metaItem}>📖 {allLessons.length} دروس</span>
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
              <a href={SUPPORT_LINKS.whatsapp} target="_blank" style={styles.whatsappButton}>💬 تواصل عبر واتساب</a>
            </div>
          </div>
        ) : (
          <div style={isMobile ? styles.contentMobile : styles.content}>
            <div style={styles.videoSection}>
              <div style={styles.videoPlayer}>
                {activeLesson?.videoUrl && isValidVideoUrl(activeLesson.videoUrl) ? (
                  <div ref={videoContainerRef} style={isMobile ? styles.videoContainerMobile : styles.videoContainer} onMouseMove={resetControlsTimeout}>
                    <div style={styles.videoWrapper}>
                      <div ref={playerContainerRef} style={{ width: '100%', height: '100%' }} />
                      <div style={styles.protectionOverlay} onClick={togglePlayPause} onContextMenu={(e) => { e.preventDefault(); alert('ممنوع النسخ'); }} />
                      {showControls && (
                        <div style={isMobile ? styles.customControlsMobile : styles.customControls}>
                          <div style={styles.progressBarContainer}>
                            <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} style={isMobile ? styles.progressBarMobile : styles.progressBar} />
                            <div style={isMobile ? styles.timeDisplayMobile : styles.timeDisplay}>
                              <span>{formatTime(currentTime)}</span>
                              <span>/</span>
                              <span>{formatTime(duration)}</span>
                            </div>
                          </div>
                          <div style={isMobile ? styles.controlsRowMobile : styles.controlsRow}>
                            <div style={isMobile ? styles.controlsLeftMobile : styles.controlsLeft}>
                              <button style={isMobile ? styles.controlButtonMobile : styles.controlButton} onClick={togglePlayPause}>{isPlaying ? '⏸️' : '▶️'}</button>
                              <button style={isMobile ? styles.seekButtonMobile : styles.seekButton} onClick={seekBackward}>⏪ 10s</button>
                              <button style={isMobile ? styles.controlButtonMobile : styles.controlButton} onClick={toggleMute}>{isMuted ? '🔇' : '🔊'}</button>
                              <button style={isMobile ? styles.seekButtonMobile : styles.seekButton} onClick={seekForward}>10s ⏩</button>
                              <select value={playbackRate} onChange={(e) => changePlaybackRate(parseFloat(e.target.value))} style={isMobile ? styles.speedSelectMobile : styles.speedSelect}>
                                <option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1">1x</option>
                                <option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="1.75">1.75x</option><option value="2">2x</option>
                              </select>
                            </div>
                            <button style={isMobile ? styles.fullscreenButtonMobile : styles.fullscreenButton} onClick={toggleFullscreen}>⛶</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={isMobile ? styles.videoPlaceholderMobile : styles.videoPlaceholder}>
                    <div style={styles.placeholderIcon}>🎬</div>
                    <p style={isMobile ? styles.placeholderTextMobile : styles.placeholderText}>اختر درساً لعرض الفيديو</p>
                  </div>
                )}
                {activeLesson && (
                  <div style={isMobile ? styles.currentLessonInfoMobile : styles.currentLessonInfo}>
                    <h2 style={isMobile ? styles.currentLessonTitleMobile : styles.currentLessonTitle}>{activeLesson.title}</h2>
                    {activeLesson.description && <p style={isMobile ? styles.currentLessonDescMobile : styles.currentLessonDesc}>{activeLesson.description}</p>}
                    <div style={styles.lessonMeta}>
                      {activeLesson.moduleTitle && <span style={isMobile ? styles.lessonDurationMobile : styles.lessonDuration}>📚 {activeLesson.moduleTitle}</span>}
                      <span style={isMobile ? styles.currentSpeedBadgeMobile : styles.currentSpeedBadge}>السرعة: {playbackRate}x</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ✅✅✅ أزرار الواجب والامتحان - الحل النهائي */}
              {activeLesson && (
                <div style={isMobile ? styles.actionsBarMobile : styles.actionsBar}>
                  {/* ✅ زر الواجب */}
                  {getAssignmentLink(activeLesson) ? (
                    <Link 
                      href={getAssignmentLink(activeLesson)} 
                      style={isMobile ? {...styles.actionButtonMobile, background: '#10b981'} : {...styles.actionButton, background: '#10b981'}}
                    >
                      📝 الواجب
                    </Link>
                  ) : null}
                  
                  {/* ✅ زر الامتحان */}
                  {getExamLink(activeLesson) ? (
                    <Link 
                      href={getExamLink(activeLesson)} 
                      style={isMobile ? {...styles.actionButtonMobile, background: '#8b5cf6'} : {...styles.actionButton, background: '#8b5cf6'}}
                    >
                      📝 الامتحان
                    </Link>
                  ) : null}
                  
                  {/* ✅ لو مفيش حاجة */}
                  {!getAssignmentLink(activeLesson) && !getExamLink(activeLesson) && (
                    <div style={isMobile ? styles.noActionsMobile : styles.noActions}>
                      📌 لا يوجد واجب أو امتحان لهذا الدرس
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={isMobile ? styles.lessonsSectionMobile : styles.lessonsSection}>
              <div style={isMobile ? styles.lessonsHeaderMobile : styles.lessonsHeader}>
                <h2 style={isMobile ? styles.lessonsTitleMobile : styles.lessonsTitle}>📖 محتوى الكورس</h2>
                <div style={styles.expandButtons}>
                  <button onClick={expandAllModules} style={isMobile ? styles.expandButtonMobile : styles.expandButton}> توسيع الكل</button>
                  <button onClick={collapseAllModules} style={isMobile ? styles.collapseButtonMobile : styles.collapseButton}> طي الكل</button>
                </div>
              </div>

              <div style={isMobile ? styles.lessonsListMobile : styles.lessonsList}>
                {modules.map(module => (
                  <div key={module.id} style={isMobile ? styles.moduleItemMobile : styles.moduleItem}>
                    <div onClick={() => toggleModule(module.id)} style={isMobile ? styles.moduleHeaderMobile : styles.moduleHeader}>
                      <span style={styles.moduleIcon}>📚</span>
                      <div style={styles.moduleInfo}>
                        <span style={isMobile ? styles.moduleTitleMobile : styles.moduleTitle}>{module.title}</span>
                        <span style={isMobile ? styles.moduleCountMobile : styles.moduleCount}>{module.lessons?.length || 0} دروس</span>
                      </div>
                      <span style={isMobile ? styles.moduleArrowMobile : styles.moduleArrow}>{expandedModules.has(module.id) ? '▲' : '▼'}</span>
                    </div>
                    {expandedModules.has(module.id) && (
                      <div style={isMobile ? styles.moduleLessonsMobile : styles.moduleLessons}>
                        {module.lessons?.map((lesson: any, idx: number) => (
                          <div 
                            key={lesson.id} 
                            onClick={() => handleLessonChange(lesson)} 
                            style={{ 
                              ...(isMobile ? styles.lessonItemMobile : styles.lessonItem), 
                              background: activeLesson?.id === lesson.id ? '#f0f9ff' : 'white', 
                              borderColor: activeLesson?.id === lesson.id ? '#3b82f6' : '#e5e7eb' 
                            }}
                          >
                            <div style={isMobile ? styles.lessonNumberMobile : styles.lessonNumber}>{idx + 1}</div>
                            <div style={styles.lessonContent}>
                              <div style={isMobile ? styles.lessonTitleSmallMobile : styles.lessonTitleSmall}>{lesson.title}</div>
                              {lesson.description && <div style={isMobile ? styles.lessonDescSmallMobile : styles.lessonDescSmall}>{lesson.description.substring(0, 60)}...</div>}
                            </div>
                            <div style={styles.lessonBadges}>
                              {lesson.assignmentId && lesson.assignmentId.trim() !== '' && (
                                <span style={isMobile ? styles.assignmentBadgeMobile : styles.assignmentBadge}>📝 واجب</span>
                              )}
                              {lesson.examId && lesson.examId.trim() !== '' && (
                                <span style={isMobile ? styles.examBadgeMobile : styles.examBadge}>📊 امتحان</span>
                              )}
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
                  <div style={isMobile ? styles.directSectionMobile : styles.directSection}>
                    <div style={isMobile ? styles.directHeaderMobile : styles.directHeader}>
                      <span style={styles.directIcon}>📖</span>
                      <span style={isMobile ? styles.directTitleMobile : styles.directTitle}>دروس مباشرة</span>
                    </div>
                    <div style={isMobile ? styles.directLessonsMobile : styles.directLessons}>
                      {directLessons.map((lesson: any, idx: number) => (
                        <div 
                          key={lesson.id} 
                          onClick={() => handleLessonChange(lesson)} 
                          style={{ 
                            ...(isMobile ? styles.lessonItemMobile : styles.lessonItem), 
                            background: activeLesson?.id === lesson.id ? '#f0f9ff' : 'white', 
                            borderColor: activeLesson?.id === lesson.id ? '#3b82f6' : '#e5e7eb' 
                          }}
                        >
                          <div style={isMobile ? styles.lessonNumberMobile : styles.lessonNumber}>{idx + 1}</div>
                          <div style={styles.lessonContent}>
                            <div style={isMobile ? styles.lessonTitleSmallMobile : styles.lessonTitleSmall}>{lesson.title}</div>
                            {lesson.description && <div style={isMobile ? styles.lessonDescSmallMobile : styles.lessonDescSmall}>{lesson.description.substring(0, 60)}...</div>}
                          </div>
                          <div style={styles.lessonBadges}>
                            {lesson.assignmentId && lesson.assignmentId.trim() !== '' && (
                              <span style={isMobile ? styles.assignmentBadgeMobile : styles.assignmentBadge}>📝 واجب</span>
                            )}
                            {lesson.examId && lesson.examId.trim() !== '' && (
                              <span style={isMobile ? styles.examBadgeMobile : styles.examBadge}>📊 امتحان</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={isMobile ? styles.supportSectionMobile : styles.supportSection}>
                <h3 style={isMobile ? styles.supportTitleMobile : styles.supportTitle}>💬 لديك سؤال؟</h3>
                <div style={isMobile ? styles.supportButtonsMobile : styles.supportButtons}>
                  <Link href="/bot" style={isMobile ? styles.botButtonMobile : styles.botButton}>
                    🤖 المساعد الذكي
                  </Link>
                  <a href={SUPPORT_LINKS.whatsapp} target="_blank" style={isMobile ? styles.whatsappSupportButtonMobile : styles.whatsappSupportButton}>💬 تواصل عبر واتساب</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p style={styles.footerText}>© {new Date().getFullYear()} {PLATFORM_NAME}</p>
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
  contentMobile: { display: 'flex', flexDirection: 'column', gap: '20px' },
  
  videoSection: { display: 'flex', flexDirection: 'column', gap: '25px' },
  videoPlayer: { background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  videoContainer: { width: '100%', height: '450px', overflow: 'hidden', position: 'relative', background: '#000' },
  videoContainerMobile: { width: '100%', height: '250px', overflow: 'hidden', position: 'relative', background: '#000' },
  videoWrapper: { position: 'relative', width: '100%', height: '100%' },
  protectionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer', background: 'transparent', zIndex: 2 },
  customControls: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '20px', zIndex: 3 },
  customControlsMobile: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '10px', zIndex: 3 },
  progressBarContainer: { width: '100%', marginBottom: '15px' },
  progressBar: { width: '100%', height: '6px', WebkitAppearance: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', outline: 'none', cursor: 'pointer' },
  progressBarMobile: { width: '100%', height: '4px', WebkitAppearance: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', outline: 'none', cursor: 'pointer' },
  timeDisplay: { display: 'flex', justifyContent: 'space-between', color: 'white', fontSize: '13px', marginTop: '8px' },
  timeDisplayMobile: { display: 'flex', justifyContent: 'space-between', color: 'white', fontSize: '10px', marginTop: '4px' },
  controlsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  controlsRowMobile: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '5px' },
  controlsLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  controlsLeftMobile: { display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' },
  controlButton: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', minWidth: '40px' },
  controlButtonMobile: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', minWidth: '32px' },
  seekButton: { background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  seekButtonMobile: { background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' },
  speedSelect: { background: 'rgba(0,0,0,0.7)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', padding: '6px 10px', fontSize: '13px', cursor: 'pointer' },
  speedSelectMobile: { background: 'rgba(0,0,0,0.7)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', padding: '4px 6px', fontSize: '11px', cursor: 'pointer' },
  fullscreenButton: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  fullscreenButtonMobile: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  videoPlaceholder: { width: '100%', height: '450px', background: '#1f2937', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' },
  videoPlaceholderMobile: { width: '100%', height: '250px', background: '#1f2937', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' },
  placeholderIcon: { fontSize: '4rem', marginBottom: '20px' },
  placeholderText: { fontSize: '20px', fontWeight: '600' },
  placeholderTextMobile: { fontSize: '16px', fontWeight: '600' },
  currentLessonInfo: { padding: '20px', borderTop: '1px solid #e5e7eb' },
  currentLessonInfoMobile: { padding: '12px', borderTop: '1px solid #e5e7eb' },
  currentLessonTitle: { fontSize: '22px', fontWeight: 'bold', color: '#1f2937', marginBottom: '10px' },
  currentLessonTitleMobile: { fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '6px' },
  currentLessonDesc: { color: '#6b7280', marginBottom: '15px', lineHeight: 1.6 },
  currentLessonDescMobile: { color: '#6b7280', marginBottom: '10px', lineHeight: 1.5, fontSize: '14px' },
  lessonMeta: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
  lessonDuration: { color: '#6b7280', fontSize: '14px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' },
  lessonDurationMobile: { color: '#6b7280', fontSize: '12px', background: '#f3f4f6', padding: '3px 6px', borderRadius: '4px' },
  currentSpeedBadge: { background: '#10b981', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  currentSpeedBadgeMobile: { background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '12px', fontSize: '10px', fontWeight: '600' },
  actionsBar: { display: 'flex', gap: '15px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', flexWrap: 'wrap' },
  actionsBarMobile: { display: 'flex', gap: '10px', background: 'white', padding: '12px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap' },
  actionButton: { flex: 1, padding: '15px', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', textDecoration: 'none', textAlign: 'center', minWidth: '120px' },
  actionButtonMobile: { flex: 1, padding: '10px', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', textAlign: 'center', minWidth: '80px' },
  noActions: { flex: 1, padding: '15px', background: '#f3f4f6', color: '#6b7280', borderRadius: '8px', fontSize: '16px', textAlign: 'center' },
  noActionsMobile: { flex: 1, padding: '10px', background: '#f3f4f6', color: '#6b7280', borderRadius: '6px', fontSize: '13px', textAlign: 'center' },
  
  lessonsSection: { display: 'flex', flexDirection: 'column', gap: '25px' },
  lessonsSectionMobile: { display: 'flex', flexDirection: 'column', gap: '15px' },
  lessonsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
  lessonsHeaderMobile: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
  lessonsTitle: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 },
  lessonsTitleMobile: { fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0 },
  expandButtons: { display: 'flex', gap: '10px' },
  expandButton: { padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  expandButtonMobile: { padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' },
  collapseButton: { padding: '8px 16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  collapseButtonMobile: { padding: '6px 12px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' },
  lessonsList: { display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto' },
  lessonsListMobile: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' },
  moduleItem: { background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' },
  moduleItemMobile: { background: 'white', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' },
  moduleHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 20px', cursor: 'pointer', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  moduleHeaderMobile: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', cursor: 'pointer', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  moduleIcon: { fontSize: '24px' },
  moduleInfo: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  moduleTitle: { fontSize: '16px', fontWeight: '600', color: '#1f2937' },
  moduleTitleMobile: { fontSize: '14px', fontWeight: '600', color: '#1f2937' },
  moduleCount: { fontSize: '12px', color: '#6b7280', background: '#e5e7eb', padding: '2px 8px', borderRadius: '12px' },
  moduleCountMobile: { fontSize: '10px', color: '#6b7280', background: '#e5e7eb', padding: '2px 6px', borderRadius: '10px' },
  moduleArrow: { fontSize: '12px', color: '#6b7280' },
  moduleArrowMobile: { fontSize: '10px', color: '#6b7280' },
  moduleLessons: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  moduleLessonsMobile: { padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' },
  directSection: { background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' },
  directSectionMobile: { background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb' },
  directHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  directHeaderMobile: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  directIcon: { fontSize: '24px' },
  directTitle: { fontSize: '16px', fontWeight: '600', color: '#1f2937' },
  directTitleMobile: { fontSize: '14px', fontWeight: '600', color: '#1f2937' },
  directLessons: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  directLessonsMobile: { padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' },
  lessonItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px', border: '2px solid', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.3s', flexWrap: 'wrap' },
  lessonItemMobile: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '2px solid', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s', flexWrap: 'wrap' },
  lessonNumber: { width: '30px', height: '30px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 },
  lessonNumberMobile: { width: '24px', height: '24px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', flexShrink: 0 },
  lessonContent: { flex: 1, minWidth: '100px' },
  lessonTitleSmall: { fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' },
  lessonTitleSmallMobile: { fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '2px' },
  lessonDescSmall: { fontSize: '12px', color: '#6b7280' },
  lessonDescSmallMobile: { fontSize: '11px', color: '#6b7280' },
  lessonBadges: { display: 'flex', gap: '5px', flexWrap: 'wrap' },
  assignmentBadge: { padding: '2px 8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '12px', fontSize: '10px', fontWeight: '600' },
  assignmentBadgeMobile: { padding: '2px 6px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '10px', fontSize: '9px', fontWeight: '600' },
  examBadge: { padding: '2px 8px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', borderRadius: '12px', fontSize: '10px', fontWeight: '600' },
  examBadgeMobile: { padding: '2px 6px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', borderRadius: '10px', fontSize: '9px', fontWeight: '600' },
  
  supportSection: { background: 'white', padding: '25px', borderRadius: '12px', textAlign: 'center' },
  supportSectionMobile: { background: 'white', padding: '15px', borderRadius: '10px', textAlign: 'center' },
  supportTitle: { fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '15px' },
  supportTitleMobile: { fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '10px' },
  supportButtons: { display: 'flex', flexDirection: 'column', gap: '15px' },
  supportButtonsMobile: { display: 'flex', flexDirection: 'column', gap: '10px' },
  botButton: { padding: '15px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '16px', textAlign: 'center', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' },
  botButtonMobile: { padding: '12px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', textAlign: 'center', boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)' },
  whatsappButton: { padding: '15px', background: '#25D366', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '16px', textAlign: 'center' },
  whatsappSupportButton: { padding: '15px', background: '#25D366', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '16px', textAlign: 'center' },
  whatsappSupportButtonMobile: { padding: '12px', background: '#25D366', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', textAlign: 'center' },
  contactButtons: { display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  contactButtonsMobile: { display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch' },
  footer: { background: '#1f2937', marginTop: '50px', padding: '30px 0' },
  footerContent: { maxWidth: '1400px', margin: '0 auto', padding: '0 20px', textAlign: 'center' },
  footerText: { color: '#d1d5db', fontSize: '14px' }
}
