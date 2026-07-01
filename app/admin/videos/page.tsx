// app/admin/videos/page.tsx (عدل هذا الملف بالكامل)
'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore'
import { 
  getModules, 
  addModule, 
  updateModule, 
  deleteModule,
  addLesson,
  updateLesson,
  deleteLesson,
  getFullCourseContent
} from '@/lib/firebase-course-structure'
import Link from 'next/link'

export default function VideosAdminPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [modules, setModules] = useState<any[]>([])
  const [directLessons, setDirectLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('modules') // 'modules' or 'direct'
  
  // نموذج إضافة وحدة
  const [newModule, setNewModule] = useState({
    title: '',
    description: ''
  })
  const [showModuleForm, setShowModuleForm] = useState(false)
  
  // نموذج إضافة درس
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    videoUrl: '',
    order: 0,
    assignmentLink: '',
    examLink: '',
    moduleId: ''
  })
  
  // نموذج التعديل
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editingType, setEditingType] = useState<'module' | 'lesson' | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    order: 0,
    assignmentLink: '',
    examLink: ''
  })

  // جلب الكورسات
  const fetchCourses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "courses"))
      const coursesList: any[] = []
      
      querySnapshot.forEach((doc) => {
        coursesList.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      setCourses(coursesList)
      if (coursesList.length > 0 && !selectedCourse) {
        setSelectedCourse(coursesList[0].id)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
      setMessage('❌ حدث خطأ في جلب الكورسات')
    }
  }

  // جلب محتوى الكورس (وحدات ودروس)
  const fetchCourseContent = async (courseId: string) => {
    if (!courseId) return
    
    try {
      setLoading(true)
      const content = await getFullCourseContent(courseId)
      setModules(content.modules)
      setDirectLessons(content.directLessons)
      setMessage(`✅ تم تحميل ${content.totalModules} وحدة و ${content.totalLessons} درس`)
    } catch (error) {
      console.error('Error fetching content:', error)
      setMessage('❌ حدث خطأ في جلب المحتوى')
    } finally {
      setLoading(false)
    }
  }

  // إضافة وحدة
  const handleAddModule = async () => {
    if (!selectedCourse || !newModule.title) {
      setMessage('❌ عنوان الوحدة مطلوب')
      return
    }

    try {
      const result = await addModule(selectedCourse, newModule)
      if (result.success) {
        setMessage('✅ تم إضافة الوحدة بنجاح')
        setNewModule({ title: '', description: '' })
        setShowModuleForm(false)
        fetchCourseContent(selectedCourse)
      } else {
        setMessage('❌ ' + result.error)
      }
    } catch (error) {
      console.error('Error adding module:', error)
      setMessage('❌ حدث خطأ في إضافة الوحدة')
    }
  }

  // إضافة درس (يدعم الوحدات)
  const handleAddLesson = async () => {
    if (!selectedCourse || !newLesson.title || !newLesson.videoUrl) {
      setMessage('❌ العنوان ورابط الفيديو مطلوبان')
      return
    }

    try {
      const lessonData = {
        title: newLesson.title,
        description: newLesson.description,
        videoUrl: newLesson.videoUrl,
        order: newLesson.order || 0,
        assignmentLink: newLesson.assignmentLink,
        examLink: newLesson.examLink,
        moduleId: newLesson.moduleId || null
      }
      
      const result = await addLesson(selectedCourse, lessonData)
      if (result.success) {
        setMessage('✅ تم إضافة الدرس بنجاح')
        setNewLesson({
          title: '',
          description: '',
          videoUrl: '',
          order: 0,
          assignmentLink: '',
          examLink: '',
          moduleId: ''
        })
        fetchCourseContent(selectedCourse)
      } else {
        setMessage('❌ ' + result.error)
      }
    } catch (error) {
      console.error('Error adding lesson:', error)
      setMessage('❌ حدث خطأ في إضافة الدرس')
    }
  }

  // حذف وحدة
  const handleDeleteModule = async (moduleId: string, moduleTitle: string) => {
    if (!confirm(`⚠️ هل أنت متأكد من حذف الوحدة "${moduleTitle}"؟\nسيتم حذف جميع الدروس داخل هذه الوحدة!`)) return
    
    try {
      const result = await deleteModule(moduleId)
      if (result.success) {
        setMessage(`✅ تم حذف الوحدة "${moduleTitle}" وجميع دروسها`)
        fetchCourseContent(selectedCourse)
      } else {
        setMessage('❌ ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting module:', error)
      setMessage('❌ حدث خطأ في حذف الوحدة')
    }
  }

  // حذف درس
  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`هل تريد حذف الدرس "${lessonTitle}"؟`)) return
    
    try {
      const result = await deleteLesson(lessonId)
      if (result.success) {
        setMessage(`✅ تم حذف الدرس "${lessonTitle}"`)
        fetchCourseContent(selectedCourse)
      } else {
        setMessage('❌ ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting lesson:', error)
      setMessage('❌ حدث خطأ في حذف الدرس')
    }
  }

  // فتح نموذج التعديل
  const handleEditClick = (item: any, type: 'module' | 'lesson') => {
    setEditingType(type)
    setEditingItem(item)
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      videoUrl: item.videoUrl || '',
      order: item.order || 0,
      assignmentLink: item.assignmentLink || '',
      examLink: item.examLink || ''
    })
  }

  // حفظ التعديلات
  const handleSaveEdit = async () => {
    if (!editingItem) return
    
    try {
      if (editingType === 'module') {
        await updateModule(editingItem.id, {
          title: editForm.title,
          description: editForm.description,
          order: editForm.order
        })
        setMessage('✅ تم تحديث الوحدة بنجاح')
      } else {
        await updateLesson(editingItem.id, {
          title: editForm.title,
          description: editForm.description,
          videoUrl: editForm.videoUrl,
          order: editForm.order,
          assignmentLink: editForm.assignmentLink,
          examLink: editForm.examLink
        })
        setMessage('✅ تم تحديث الدرس بنجاح')
      }
      
      setEditingItem(null)
      setEditingType(null)
      fetchCourseContent(selectedCourse)
    } catch (error) {
      console.error('Error updating:', error)
      setMessage('❌ حدث خطأ في التحديث')
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseContent(selectedCourse)
    }
  }, [selectedCourse])

  const selectedCourseData = courses.find(c => c.id === selectedCourse)

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🎬 إدارة المحتوى (وحدات ودروس)</h1>
          <p style={styles.subtitle}>علمني العلوم مستر بيشوي - إدارة: توماس مهني</p>
        </div>
      </header>

      <div style={styles.main}>
        {message && (
          <div style={{
            ...styles.message,
            background: message.startsWith('✅') ? '#d4fae5' : '#fee2e2',
            color: message.startsWith('✅') ? '#065f46' : '#991b1b'
          }}>
            {message}
          </div>
        )}

        <div style={styles.navigation}>
          <Link href="/admin" style={styles.navLink}>← العودة للأدمن</Link>
          <span style={styles.navSeparator}>|</span>
          <Link href="/platform" style={styles.navLink}>← عرض المنصة</Link>
        </div>

        {/* اختيار الكورس */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📚 اختيار الكورس</h2>
          <div style={styles.courseSelector}>
            <select 
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={styles.select}
            >
              <option value="">اختر كورس</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title} - {course.grade}
                </option>
              ))}
            </select>
            
            {selectedCourseData && (
              <div style={styles.courseInfo}>
                <h3 style={styles.courseName}>{selectedCourseData.title}</h3>
                <p style={styles.courseDetails}>
                  الصف: {selectedCourseData.grade} | السعر: {selectedCourseData.price} جنيه
                </p>
              </div>
            )}
          </div>
        </div>

        {/* تبويب الوحدات والدروس */}
        <div style={styles.tabsContainer}>
          <button
            onClick={() => setActiveTab('modules')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'modules' ? '#3b82f6' : '#f3f4f6',
              color: activeTab === 'modules' ? 'white' : '#4b5563'
            }}
          >
            📁 إدارة الوحدات والدروس
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'direct' ? '#10b981' : '#f3f4f6',
              color: activeTab === 'direct' ? 'white' : '#4b5563'
            }}
          >
            📖 دروس مباشرة (بدون وحدات)
          </button>
        </div>

        {activeTab === 'modules' && (
          <>
            {/* زر إضافة وحدة */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>📁 الوحدات ({modules.length})</h2>
                <button 
                  onClick={() => setShowModuleForm(!showModuleForm)}
                  style={styles.addModuleButton}
                >
                  {showModuleForm ? '❌ إلغاء' : '➕ إضافة وحدة جديدة'}
                </button>
              </div>

              {/* نموذج إضافة وحدة */}
              {showModuleForm && (
                <div style={styles.formSection}>
                  <div style={styles.formRow}>
                    <input
                      type="text"
                      placeholder="عنوان الوحدة *"
                      value={newModule.title}
                      onChange={(e) => setNewModule({...newModule, title: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formRow}>
                    <textarea
                      placeholder="وصف الوحدة"
                      value={newModule.description}
                      onChange={(e) => setNewModule({...newModule, description: e.target.value})}
                      style={styles.textarea}
                      rows={2}
                    />
                  </div>
                  <button onClick={handleAddModule} style={styles.addButton}>
                    ✅ إضافة الوحدة
                  </button>
                </div>
              )}

              {/* عرض الوحدات ودروسها */}
              {loading ? (
                <div style={styles.loading}>⏳ جاري تحميل الوحدات...</div>
              ) : modules.length === 0 ? (
                <div style={styles.empty}>
                  📭 لا توجد وحدات بعد. أضف وحدة جديدة!
                </div>
              ) : (
                <div style={styles.modulesList}>
                  {modules.map(module => (
                    <div key={module.id} style={styles.moduleCard}>
                      <div style={styles.moduleHeader}>
                        <div>
                          <h3 style={styles.moduleTitle}>
                            📁 {module.title}
                            <span style={styles.moduleBadge}>{module.lessons.length} دروس</span>
                          </h3>
                          {module.description && (
                            <p style={styles.moduleDesc}>{module.description}</p>
                          )}
                        </div>
                        <div style={styles.moduleActions}>
                          <button 
                            onClick={() => handleEditClick(module, 'module')}
                            style={styles.editButton}
                          >
                            ✏️ تعديل
                          </button>
                          <button 
                            onClick={() => handleDeleteModule(module.id, module.title)}
                            style={styles.deleteButton}
                          >
                            🗑️ حذف
                          </button>
                        </div>
                      </div>

                      {/* نموذج إضافة درس داخل هذه الوحدة */}
                      <div style={styles.addLessonToModule}>
                        <button 
                          onClick={() => {
                            setNewLesson({
                              ...newLesson,
                              moduleId: newLesson.moduleId === module.id ? '' : module.id,
                              title: '',
                              description: '',
                              videoUrl: '',
                              order: 0,
                              assignmentLink: '',
                              examLink: ''
                            })
                          }}
                          style={styles.addLessonButton}
                        >
                          {newLesson.moduleId === module.id ? '❌ إلغاء' : '➕ إضافة درس لهذه الوحدة'}
                        </button>
                        
                        {newLesson.moduleId === module.id && (
                          <div style={styles.lessonFormInline}>
                            <input
                              type="text"
                              placeholder="عنوان الدرس *"
                              value={newLesson.title}
                              onChange={(e) => setNewLesson({...newLesson, title: e.target.value})}
                              style={styles.inputSmall}
                            />
                            <input
                              type="text"
                              placeholder="رابط الفيديو *"
                              value={newLesson.videoUrl}
                              onChange={(e) => setNewLesson({...newLesson, videoUrl: e.target.value})}
                              style={styles.inputSmall}
                            />
                            <textarea
                              placeholder="وصف الدرس"
                              value={newLesson.description}
                              onChange={(e) => setNewLesson({...newLesson, description: e.target.value})}
                              style={styles.textareaSmall}
                              rows={2}
                            />
                            <button onClick={handleAddLesson} style={styles.addLessonSubmit}>
                              ✅ إضافة الدرس
                            </button>
                          </div>
                        )}
                      </div>

                      {/* عرض الدروس داخل الوحدة */}
                      {module.lessons.length > 0 && (
                        <div style={styles.lessonsList}>
                          {module.lessons.map(lesson => (
                            <div key={lesson.id} style={styles.lessonItem}>
                              <div style={styles.lessonHeader}>
                                <div>
                                  <span style={styles.lessonNumber}>الدرس {lesson.order}</span>
                                  <strong style={styles.lessonTitleInline}>{lesson.title}</strong>
                                </div>
                                <div style={styles.lessonActions}>
                                  <button 
                                    onClick={() => handleEditClick(lesson, 'lesson')}
                                    style={styles.editSmallButton}
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                                    style={styles.deleteSmallButton}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                              {lesson.description && (
                                <p style={styles.lessonDescSmall}>{lesson.description}</p>
                              )}
                              <a href={lesson.videoUrl} target="_blank" style={styles.videoLink}>
                                🎬 رابط الفيديو
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'direct' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📖 الدروس المباشرة (بدون وحدات)</h2>
            
            {/* نموذج إضافة درس مباشر */}
            <div style={styles.formSection}>
              <h3 style={styles.formTitle}>➕ إضافة درس مباشر</h3>
              <div style={styles.formRow}>
                <input
                  type="text"
                  placeholder="عنوان الدرس *"
                  value={newLesson.title}
                  onChange={(e) => setNewLesson({...newLesson, title: e.target.value, moduleId: ''})}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="رابط الفيديو *"
                  value={newLesson.videoUrl}
                  onChange={(e) => setNewLesson({...newLesson, videoUrl: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formRow}>
                <input
                  type="number"
                  placeholder="ترتيب الدرس"
                  value={newLesson.order}
                  onChange={(e) => setNewLesson({...newLesson, order: parseInt(e.target.value)})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formRow}>
                <textarea
                  placeholder="وصف الدرس"
                  value={newLesson.description}
                  onChange={(e) => setNewLesson({...newLesson, description: e.target.value})}
                  style={styles.textarea}
                  rows={2}
                />
              </div>
              <div style={styles.formRow}>
                <input
                  type="text"
                  placeholder="رابط الواجب (اختياري)"
                  value={newLesson.assignmentLink}
                  onChange={(e) => setNewLesson({...newLesson, assignmentLink: e.target.value})}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="رابط الامتحان (اختياري)"
                  value={newLesson.examLink}
                  onChange={(e) => setNewLesson({...newLesson, examLink: e.target.value})}
                  style={styles.input}
                />
              </div>
              <button onClick={handleAddLesson} style={styles.addButton}>
                ✅ إضافة الدرس
              </button>
            </div>

            {/* عرض الدروس المباشرة */}
            {loading ? (
              <div style={styles.loading}>⏳ جاري تحميل الدروس...</div>
            ) : directLessons.length === 0 ? (
              <div style={styles.empty}>📭 لا توجد دروس مباشرة</div>
            ) : (
              <div style={styles.lessonsGrid}>
                {directLessons.map(lesson => (
                  <div key={lesson.id} style={styles.lessonCard}>
                    <div style={styles.lessonHeader}>
                      <h3 style={styles.lessonTitle}>الدرس {lesson.order}: {lesson.title}</h3>
                      <div style={styles.lessonActions}>
                        <button onClick={() => handleEditClick(lesson, 'lesson')} style={styles.editButton}>
                          ✏️ تعديل
                        </button>
                        <button onClick={() => handleDeleteLesson(lesson.id, lesson.title)} style={styles.deleteButton}>
                          🗑️ حذف
                        </button>
                      </div>
                    </div>
                    {lesson.description && <p style={styles.lessonDesc}>{lesson.description}</p>}
                    <a href={lesson.videoUrl} target="_blank" style={styles.videoLink}>🎬 رابط الفيديو</a>
                    {lesson.assignmentLink && <a href={lesson.assignmentLink} target="_blank" style={styles.assignmentLink}>📝 رابط الواجب</a>}
                    {lesson.examLink && <a href={lesson.examLink} target="_blank" style={styles.examLink}>📊 رابط الامتحان</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* نافذة التعديل */}
        {editingItem && (
          <div style={styles.editModal}>
            <div style={styles.editModalContent}>
              <h3 style={styles.editModalTitle}>
                {editingType === 'module' ? '✏️ تعديل الوحدة' : '✏️ تعديل الدرس'}
              </h3>
              
              <div style={styles.formRow}>
                <input
                  type="text"
                  placeholder="العنوان"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  style={styles.input}
                />
                <input
                  type="number"
                  placeholder="الترتيب"
                  value={editForm.order}
                  onChange={(e) => setEditForm({...editForm, order: parseInt(e.target.value)})}
                  style={styles.input}
                />
              </div>
              
              {editingType === 'lesson' && (
                <div style={styles.formRow}>
                  <input
                    type="text"
                    placeholder="رابط الفيديو"
                    value={editForm.videoUrl}
                    onChange={(e) => setEditForm({...editForm, videoUrl: e.target.value})}
                    style={styles.input}
                  />
                </div>
              )}
              
              <div style={styles.formRow}>
                <textarea
                  placeholder="الوصف"
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  style={styles.textarea}
                  rows={3}
                />
              </div>
              
              {editingType === 'lesson' && (
                <div style={styles.formRow}>
                  <input
                    type="text"
                    placeholder="رابط الواجب"
                    value={editForm.assignmentLink}
                    onChange={(e) => setEditForm({...editForm, assignmentLink: e.target.value})}
                    style={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="رابط الامتحان"
                    value={editForm.examLink}
                    onChange={(e) => setEditForm({...editForm, examLink: e.target.value})}
                    style={styles.input}
                  />
                </div>
              )}
              
              <div style={styles.editModalButtons}>
                <button onClick={handleSaveEdit} style={styles.saveButton}>💾 حفظ</button>
                <button onClick={() => { setEditingItem(null); setEditingType(null); }} style={styles.cancelButton}>❌ إلغاء</button>
              </div>
            </div>
          </div>
        )}

        {/* تعليمات */}
        <div style={styles.instructions}>
          <h3 style={styles.instructionsTitle}>📋 تعليمات إدارة المحتوى:</h3>
          <ol style={styles.instructionsList}>
            <li><strong>الوحدات:</strong> تستخدم لتجميع الدروس المتشابهة (مثل: الوحدة الأولى، الوحدة الثانية)</li>
            <li><strong>الدروس داخل الوحدة:</strong> تضاف بعد إنشاء الوحدة، وتظهر مرتبة حسب رقم الترتيب</li>
            <li><strong>الدروس المباشرة:</strong> تضاف مباشرة تحت الكورس بدون وحدات (للنظام القديم)</li>
            <li><strong>الترتيب:</strong> يمكنك التحكم في ترتيب الوحدات والدروس عن طريق رقم الترتيب</li>
            <li><strong>الحذف:</strong> عند حذف وحدة، يتم حذف جميع الدروس داخلها تلقائياً</li>
          </ol>
        </div>
      </div>

      <footer style={styles.footer}>
        <p>© 2024 علمني العلوم مستر بيشوي - نظام إدارة المحتوى المتقدم</p>
      </footer>
    </div>
  )
}

// الأنماط (نفس الأنماط السابقة مع إضافات بسيطة)
const styles = {
  container: { minHeight: '100vh', background: '#f8fafc', direction: 'rtl' as const, fontFamily: 'Arial, sans-serif' },
  header: { background: 'linear-gradient(to right, #1e3a8a, #3b82f6)', color: 'white', padding: '30px 20px' },
  headerContent: { maxWidth: '1200px', margin: '0 auto', textAlign: 'center' as const },
  title: { fontSize: '32px', marginBottom: '10px', fontWeight: 'bold' as const },
  subtitle: { fontSize: '16px', opacity: 0.9 },
  main: { maxWidth: '1200px', margin: '30px auto', padding: '0 20px' },
  message: { padding: '15px', borderRadius: '10px', marginBottom: '25px', textAlign: 'center' as const, fontWeight: 'bold' as const },
  navigation: { display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px', padding: '15px', background: 'white', borderRadius: '10px' },
  navLink: { color: '#3b82f6', textDecoration: 'none', fontWeight: '600' as const },
  navSeparator: { color: '#9ca3af' },
  section: { background: 'white', borderRadius: '12px', padding: '25px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  sectionTitle: { fontSize: '22px', fontWeight: 'bold' as const, color: '#1f2937', marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' as const, gap: '15px' },
  courseSelector: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  select: { padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', background: 'white' },
  courseInfo: { background: '#f0f9ff', padding: '15px', borderRadius: '8px', border: '1px solid #bae6fd' },
  courseName: { margin: '0 0 10px 0', color: '#0369a1', fontSize: '20px' },
  courseDetails: { margin: 0, color: '#0c4a6e', fontSize: '14px' },
  tabsContainer: { display: 'flex', gap: '10px', marginBottom: '20px' },
  tabButton: { padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' as const, fontSize: '16px', flex: 1 },
  addModuleButton: { padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' as const },
  formSection: { background: '#f9fafb', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e5e7eb' },
  formTitle: { fontSize: '18px', fontWeight: '600' as const, marginBottom: '15px', color: '#1f2937' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' },
  input: { padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', background: 'white' },
  inputSmall: { padding: '10px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: 'white' },
  textarea: { padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', background: 'white', resize: 'vertical' as const, gridColumn: 'span 2' },
  textareaSmall: { padding: '10px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: 'white', resize: 'vertical' as const },
  addButton: { padding: '14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' as const, cursor: 'pointer', width: '100%' },
  modulesList: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  moduleCard: { background: '#f9fafb', borderRadius: '10px', padding: '20px', border: '1px solid #e5e7eb' },
  moduleHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap' as const, gap: '15px' },
  moduleTitle: { fontSize: '18px', fontWeight: 'bold' as const, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const },
  moduleBadge: { background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '12px' },
  moduleDesc: { color: '#6b7280', fontSize: '14px', marginTop: '5px' },
  moduleActions: { display: 'flex', gap: '10px' },
  editButton: { padding: '6px 12px', background: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  deleteButton: { padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  addLessonToModule: { marginBottom: '15px', padding: '10px', background: '#f0f9ff', borderRadius: '8px' },
  addLessonButton: { padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' as const },
  lessonFormInline: { marginTop: '15px', display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  addLessonSubmit: { padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' as const },
  lessonsList: { display: 'flex', flexDirection: 'column' as const, gap: '10px', marginTop: '10px' },
  lessonItem: { background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' },
  lessonHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' as const, gap: '10px' },
  lessonNumber: { background: '#e5e7eb', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' as const, marginLeft: '10px' },
  lessonTitleInline: { fontSize: '15px', color: '#1f2937' },
  lessonActions: { display: 'flex', gap: '5px' },
  editSmallButton: { padding: '4px 8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  deleteSmallButton: { padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  lessonDescSmall: { fontSize: '13px', color: '#6b7280', marginBottom: '8px' },
  videoLink: { fontSize: '12px', color: '#3b82f6', textDecoration: 'none', display: 'inline-block', marginTop: '5px' },
  assignmentLink: { fontSize: '12px', color: '#10b981', textDecoration: 'none', display: 'inline-block', marginLeft: '10px' },
  examLink: { fontSize: '12px', color: '#ef4444', textDecoration: 'none', display: 'inline-block', marginLeft: '10px' },
  lessonsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
  lessonCard: { border: '2px solid #e5e7eb', borderRadius: '12px', padding: '20px', background: '#f9fafb' },
  lessonTitle: { fontSize: '18px', fontWeight: 'bold' as const, color: '#1f2937', marginBottom: '10px' },
  lessonDesc: { color: '#6b7280', fontSize: '14px', marginBottom: '15px', lineHeight: 1.5 },
  loading: { textAlign: 'center' as const, padding: '40px', color: '#6b7280' },
  empty: { textAlign: 'center' as const, padding: '40px', color: '#9ca3af', background: '#f9fafb', borderRadius: '8px' },
  editModal: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  editModalContent: { background: 'white', borderRadius: '12px', padding: '30px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' as const },
  editModalTitle: { fontSize: '22px', fontWeight: 'bold' as const, color: '#1f2937', marginBottom: '25px', textAlign: 'center' as const },
  editModalButtons: { display: 'flex', gap: '15px', marginTop: '25px' },
  saveButton: { flex: 1, padding: '15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' as const, cursor: 'pointer' },
  cancelButton: { flex: 1, padding: '15px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' as const, cursor: 'pointer' },
  instructions: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '25px' },
  instructionsTitle: { fontSize: '20px', fontWeight: 'bold' as const, color: '#0369a1', marginBottom: '15px' },
  instructionsList: { margin: 0, paddingRight: '20px', color: '#0c4a6e', fontSize: '15px', lineHeight: 2 },
  footer: { background: '#1f2937', color: 'white', textAlign: 'center' as const, padding: '25px', marginTop: '50px' }
}