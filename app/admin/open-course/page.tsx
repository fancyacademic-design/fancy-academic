'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, getDocs, addDoc, query, where, updateDoc, doc } from 'firebase/firestore'
import Link from 'next/link'

export default function OpenCoursePage() {
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [price, setPrice] = useState(0)
  const [notes, setNotes] = useState('')
  
  // الحقول الجديدة: فلتر المرحلة
  const [selectedGrade, setSelectedGrade] = useState('all')
  const [availableGrades, setAvailableGrades] = useState<string[]>([])
  const [filteredStudents, setFilteredStudents] = useState<any[]>([])
  const [filteredCourses, setFilteredCourses] = useState<any[]>([])

  // الحقول الجديدة للكورسات المفتوحة
  const [showOnlyStudentsWithCourses, setShowOnlyStudentsWithCourses] = useState(false)
  const [showOnlyStudentsWithoutCourses, setShowOnlyStudentsWithoutCourses] = useState(false)
  const [studentsWithOpenCourses, setStudentsWithOpenCourses] = useState<any[]>([])
  const [studentsWithoutOpenCourses, setStudentsWithoutOpenCourses] = useState<any[]>([])
  const [openCoursesData, setOpenCoursesData] = useState<any>({})
  const [openCourseRecords, setOpenCourseRecords] = useState<any[]>([]) // لحفظ سجلات الكورسات المفتوحة
  const [coursesByGrade, setCoursesByGrade] = useState<any>({}) // لتخزين الكورسات حسب المرحلة

  useEffect(() => {
    fetchData()
  }, [])

  // جلب الكورسات المفتوحة لكل طالب
  const fetchOpenCourses = async () => {
    try {
      console.log('🔍 جلب الكورسات المفتوحة...')
      const openCoursesQuery = query(
        collection(db, "student_courses"),
        where("isActive", "==", true)
      )
      const openCoursesSnap = await getDocs(openCoursesQuery)
      
      const studentsWithCourses = new Set()
      const openCoursesByStudent = {}
      const allOpenRecords: any[] = []
      
      openCoursesSnap.forEach((docSnap) => {
        const data = docSnap.data()
        const studentId = data.studentId
        const docId = docSnap.id
        
        studentsWithCourses.add(studentId)
        
        if (!openCoursesByStudent[studentId]) {
          openCoursesByStudent[studentId] = []
        }
        
        openCoursesByStudent[studentId].push({
          id: docId,
          courseId: data.courseId,
          courseTitle: data.courseTitle,
          openedAt: data.openedAt,
          pricePaid: data.pricePaid,
          notes: data.notes
        })
        
        allOpenRecords.push({
          id: docId,
          ...data
        })
      })
      
      const studentsWithCoursesArray = Array.from(studentsWithCourses)
      setStudentsWithOpenCourses(studentsWithCoursesArray)
      setOpenCoursesData(openCoursesByStudent)
      setOpenCourseRecords(allOpenRecords)
      
      console.log(`✅ عدد الطلاب الذين لديهم كورسات مفتوحة: ${studentsWithCoursesArray.length}`)
      console.log(`✅ عدد سجلات الكورسات المفتوحة: ${allOpenRecords.length}`)
      
    } catch (error) {
      console.error('❌ خطأ في جلب الكورسات المفتوحة:', error)
    }
  }

  // تحديث القوائم المفلترة عند تغيير المرحلة أو فلتر الكورسات المفتوحة
  useEffect(() => {
    if (students.length > 0) {
      let filtered = students
      
      // التصفية حسب المرحلة - مهم: إذا لم تكن المرحلة "all" نعرض فقط طلاب هذه المرحلة
      if (selectedGrade !== 'all') {
        filtered = students.filter(student => student.grade === selectedGrade)
      }
      
      // تحديد الطلاب بدون كورسات في المرحلة المحددة
      const studentsWithoutCoursesInGrade = filtered.filter(student => 
        !studentsWithOpenCourses.includes(student.id)
      )
      setStudentsWithoutOpenCourses(studentsWithoutCoursesInGrade)
      
      // التصفية حسب وجود كورسات مفتوحة
      if (showOnlyStudentsWithCourses) {
        filtered = filtered.filter(student => 
          studentsWithOpenCourses.includes(student.id)
        )
      } else if (showOnlyStudentsWithoutCourses) {
        filtered = filtered.filter(student => 
          !studentsWithOpenCourses.includes(student.id)
        )
      }
      
      setFilteredStudents(filtered)
      
      // إذا كان هناك طالب محدد ولم يكن موجود في القائمة المفلترة، نمسح اختياره
      if (selectedStudent && !filtered.find(s => s.id === selectedStudent)) {
        setSelectedStudent('')
      }
    }
    
    // فلترة الكورسات حسب المرحلة المختارة
    if (courses.length > 0 && coursesByGrade) {
      let filtered = courses
      
      // إذا كانت المرحلة محددة، نعرض فقط كورسات هذه المرحلة
      if (selectedGrade !== 'all') {
        // استخدم الكورسات المخزنة حسب المرحلة
        filtered = coursesByGrade[selectedGrade] || []
      }
      
      setFilteredCourses(filtered)
      
      // إذا كان هناك كورس محدد ولم يكن موجود في القائمة المفلترة، نمسح اختياره
      if (selectedCourse && !filtered.find(c => c.id === selectedCourse)) {
        setSelectedCourse('')
        setMessage(`⚠️ تم إلغاء اختيار الكورس لأنه غير متاح لمرحلة ${selectedGrade}`)
      }
    }
  }, [selectedGrade, students, courses, selectedStudent, selectedCourse, showOnlyStudentsWithCourses, showOnlyStudentsWithoutCourses, studentsWithOpenCourses, coursesByGrade])

  const fetchData = async () => {
    try {
      setLoading(true)
      setMessage('🔍 جاري تحميل البيانات...')
      
      console.log('=== بدء جلب البيانات ===')
      
      // جلب جميع الطلاب
      console.log('📥 جلب الطلاب...')
      const studentsQuery = query(
        collection(db, "users"),
        where("status", "==", "active")
      )
      const studentsSnap = await getDocs(studentsQuery)
      const studentsList: any[] = []
      const gradesSet = new Set<string>()
      
      studentsSnap.forEach((doc) => {
        const data = doc.data()
        console.log(`👤 طالب: ${data.name} - ${doc.id}`)
        const grade = data.grade || 'غير محدد'
        
        studentsList.push({
          id: doc.id,
          name: data.name || 'غير معروف',
          phone: data.phone || 'بدون رقم',
          grade: grade
        })
        
        gradesSet.add(grade)
      })
      
      // تحويل Set إلى Array وترتيب المراحل
      const gradesArray = Array.from(gradesSet).sort()
      setAvailableGrades(['all', ...gradesArray])
      
      console.log(`✅ عدد الطلاب: ${studentsList.length}`)
      console.log(`📊 المراحل المتاحة: ${gradesArray.join(', ')}`)
      
      // جلب جميع الكورسات
      console.log('📥 جلب الكورسات...')
      const coursesQuery = query(collection(db, "courses"))
      const coursesSnap = await getDocs(coursesQuery)
      const coursesList: any[] = []
      
      coursesSnap.forEach((doc) => {
        const data = doc.data()
        console.log(`📚 كورس: ${data.title} - ${doc.id}`)
        coursesList.push({
          id: doc.id,
          title: data.title || 'بدون عنوان',
          grade: data.grade || 'غير محدد', // تأكد من وجود حقل grade في الكورسات
        })
      })
      
      console.log(`✅ عدد الكورسات: ${coursesList.length}`)
      
      // تنظيم الكورسات حسب المرحلة
      const coursesByGradeTemp: any = {}
      coursesList.forEach(course => {
        const grade = course.grade
        if (!coursesByGradeTemp[grade]) {
          coursesByGradeTemp[grade] = []
        }
        coursesByGradeTemp[grade].push(course)
      })
      setCoursesByGrade(coursesByGradeTemp)
      
      console.log('📊 توزيع الكورسات حسب المرحلة:')
      Object.keys(coursesByGradeTemp).forEach(grade => {
        console.log(`  ${grade}: ${coursesByGradeTemp[grade].length} كورس`)
      })
      
      setStudents(studentsList)
      setCourses(coursesList)
      
      // جلب الكورسات المفتوحة
      await fetchOpenCourses()
      
      // تعيين القيم الأولية للقوائم المفلترة
      setFilteredStudents(studentsList)
      setFilteredCourses(coursesList)
      
      setMessage(`✅ تم تحميل ${studentsList.length} طالب و ${coursesList.length} كورس`)
      
    } catch (error: any) {
      console.error('❌ خطأ في جلب البيانات:', error)
      console.error('📌 كود الخطأ:', error.code)
      console.error('📌 رسالة الخطأ:', error.message)
      setMessage(`❌ حدث خطأ في جلب البيانات: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCourse = async () => {
    console.log('=== بدء عملية فتح الكورس ===')
    console.log('👤 الطالب المختار:', selectedStudent)
    console.log('📚 الكورس المختار:', selectedCourse)
    console.log('💰 السعر:', price)
    console.log('📝 الملاحظات:', notes)
    console.log('📊 المرحلة المحددة:', selectedGrade)
    
    if (!selectedStudent || !selectedCourse) {
      setMessage('❌ يجب اختيار طالب وكورس')
      return
    }

    const selectedStudentData = students.find(s => s.id === selectedStudent)
    const selectedCourseData = courses.find(c => c.id === selectedCourse)

    console.log('📊 بيانات الطالب:', selectedStudentData)
    console.log('📊 بيانات الكورس:', selectedCourseData)

    if (!selectedStudentData || !selectedCourseData) {
      setMessage('❌ بيانات غير صحيحة')
      return
    }

    // التحقق من تطابق مرحلة الطالب مع مرحلة الكورس إذا كانت محددة
    if (selectedGrade !== 'all' && selectedCourseData.grade !== selectedStudentData.grade) {
      setMessage(`❌ لا يمكن فتح كورس مرحلة ${selectedCourseData.grade} لطالب مرحلة ${selectedStudentData.grade}`)
      return
    }

    const confirmOpen = window.confirm(
      `هل تريد فتح كورس "${selectedCourseData.title}" للطالب "${selectedStudentData.name}"؟\n` +
      `مرحلة الكورس: ${selectedCourseData.grade}\nمرحلة الطالب: ${selectedStudentData.grade}`
    )

    if (!confirmOpen) return

    try {
      console.log('🔍 التحقق من وجود الكورس مفتوح مسبقاً...')
      
      // التحقق إذا الكورس مفتوح بالفعل لهذا الطالب
      const existingQuery = query(
        collection(db, "student_courses"),
        where("studentId", "==", selectedStudent),
        where("courseId", "==", selectedCourse),
        where("isActive", "==", true)
      )
      
      const existingSnap = await getDocs(existingQuery)
      
      if (!existingSnap.empty) {
        console.log('⚠️ الكورس مفتوح بالفعل لهذا الطالب')
        setMessage('⚠️ هذا الكورس مفتوح بالفعل للطالب')
        return
      }

      console.log('🚀 جاري فتح الكورس للطالب...')
      
      const newRecord = {
        studentId: selectedStudent,
        courseId: selectedCourse,
        studentName: selectedStudentData.name,
        studentPhone: selectedStudentData.phone,
        studentGrade: selectedStudentData.grade, // إضافة مرحلة الطالب
        courseTitle: selectedCourseData.title,
        courseGrade: selectedCourseData.grade, // إضافة مرحلة الكورس
        isActive: true,
        pricePaid: price || 0,
        notes: notes || 'تم الفتح من لوحة الأدمن',
        openedAt: new Date().toISOString(),
        openedBy: 'admin',
        deactivatedAt: null
      }
      
      console.log('📝 البيانات المرسلة:', newRecord)
      
      // فتح الكورس للطالب
      const docRef = await addDoc(collection(db, "student_courses"), newRecord)
      
      console.log('✅ تم فتح الكورس بنجاح! Document ID:', docRef.id)
      setMessage(`✅ تم فتح كورس "${selectedCourseData.title}" للطالب "${selectedStudentData.name}" بنجاح`)
      
      // تفريغ الحقول
      setSelectedStudent('')
      setSelectedCourse('')
      setPrice(0)
      setNotes('')
      
      // إعادة تحميل البيانات وتحديث الكورسات المفتوحة
      setTimeout(async () => {
        await fetchData()
      }, 2000)
      
    } catch (error: any) {
      console.error('❌ خطأ في فتح الكورس:', error)
      console.error('📌 كود الخطأ:', error.code)
      console.error('📌 رسالة الخطأ:', error.message)
      
      let errorMsg = '❌ حدث خطأ في فتح الكورس'
      
      if (error.code === 'permission-denied') {
        errorMsg = '❌ ليس لديك صلاحية للإضافة. تحقق من Firestore Rules'
      } else if (error.code === 'not-found') {
        errorMsg = '❌ Collection غير موجود'
      }
      
      setMessage(`${errorMsg}: ${error.message}`)
    }
  }

  const handleDeactivateCourse = async (recordId: string, studentName: string, courseTitle: string) => {
    const confirmDeactivate = window.confirm(
      `هل تريد إلغاء تفعيل كورس "${courseTitle}" للطالب "${studentName}"؟\n\nملاحظة: هذا الإجراء لا يحذف السجل بل يغير حالته إلى غير مفعل`
    )
    
    if (!confirmDeactivate) return
    
    try {
      setLoading(true)
      setMessage('🔄 جاري إلغاء تفعيل الكورس...')
      
      // تحديث السجل في Firestore
      const courseRef = doc(db, "student_courses", recordId)
      await updateDoc(courseRef, {
        isActive: false,
        deactivatedAt: new Date().toISOString(),
        deactivatedBy: 'admin'
      })
      
      console.log(`✅ تم إلغاء تفعيل الكورس بنجاح: ${recordId}`)
      setMessage(`✅ تم إلغاء تفعيل كورس "${courseTitle}" للطالب "${studentName}"`)
      
      // إعادة تحميل البيانات
      setTimeout(async () => {
        await fetchData()
      }, 2000)
      
    } catch (error: any) {
      console.error('❌ خطأ في إلغاء تفعيل الكورس:', error)
      setMessage(`❌ حدث خطأ في إلغاء تفعيل الكورس: ${error.message}`)
      setLoading(false)
    }
  }

  const handleBulkOpen = async () => {
    if (!selectedCourse) {
      setMessage('❌ يجب اختيار كورس أولاً')
      return
    }

    const selectedCourseData = courses.find(c => c.id === selectedCourse)
    if (!selectedCourseData) return

    // استخدام الطلاب المفلترين حسب المرحلة
    const studentsToProcess = filteredStudents

    if (studentsToProcess.length === 0) {
      setMessage('❌ لا يوجد طلاب لعرض الكورس لهم')
      return
    }

    // التحقق من تطابق مرحلة الكورس مع المرحلة المحددة
    if (selectedGrade !== 'all' && selectedCourseData.grade !== selectedGrade) {
      setMessage(`❌ لا يمكن فتح كورس مرحلة ${selectedCourseData.grade} لطلاب مرحلة ${selectedGrade}`)
      return
    }

    const confirmBulk = window.confirm(
      `هل تريد فتح كورس "${selectedCourseData.title}" لجميع الطلاب؟\n` +
      `عدد الطلاب: ${studentsToProcess.length}\n` +
      `مرحلة الكورس: ${selectedCourseData.grade}\n` +
      `مرحلة الطلاب: ${selectedGrade !== 'all' ? selectedGrade : 'جميع المراحل'}`
    )

    if (!confirmBulk) return

    try {
      setLoading(true)
      setMessage(`🔄 جاري فتح الكورس لـ ${studentsToProcess.length} طالب...`)
      let successCount = 0
      let errorCount = 0
      let alreadyOpenCount = 0

      // فتح الكورس لكل طالب
      for (const student of studentsToProcess) {
        try {
          // التحقق من تطابق المرحلة إذا كانت محددة
          if (selectedGrade !== 'all' && student.grade !== selectedCourseData.grade) {
            console.log(`⚠️ تخطي الطالب ${student.name} - مرحلة غير متطابقة`)
            continue
          }

          // التحقق إذا مفتوح بالفعل
          const existingQuery = query(
            collection(db, "student_courses"),
            where("studentId", "==", student.id),
            where("courseId", "==", selectedCourse),
            where("isActive", "==", true)
          )
          
          const existingSnap = await getDocs(existingQuery)
          
          if (existingSnap.empty) {
            await addDoc(collection(db, "student_courses"), {
              studentId: student.id,
              courseId: selectedCourse,
              studentName: student.name,
              studentPhone: student.phone,
              studentGrade: student.grade,
              courseTitle: selectedCourseData.title,
              courseGrade: selectedCourseData.grade,
              isActive: true,
              pricePaid: price || 0,
              notes: notes || 'فتح جماعي من لوحة الأدمن',
              openedAt: new Date().toISOString(),
              openedBy: 'admin',
              deactivatedAt: null
            })
            successCount++
            console.log(`✅ فتح الكورس للطالب: ${student.name}`)
          } else {
            alreadyOpenCount++
            console.log(`⚠️ الكورس مفتوح بالفعل للطالب: ${student.name}`)
          }
        } catch (error: any) {
          console.error(`❌ خطأ في فتح الكورس للطالب ${student.name}:`, error)
          errorCount++
        }
      }

      let resultMessage = `✅ تم فتح الكورس لـ ${successCount} طالب`
      if (alreadyOpenCount > 0) resultMessage += `، مفتوح مسبقاً: ${alreadyOpenCount}`
      if (errorCount > 0) resultMessage += `، فشل: ${errorCount}`
      
      setMessage(resultMessage)
      setLoading(false)
      
      // إعادة تحميل البيانات وتحديث الكورسات المفتوحة
      setTimeout(async () => {
        await fetchData()
      }, 3000)
      
    } catch (error: any) {
      console.error('❌ خطأ في الفتح الجماعي:', error)
      setMessage(`❌ حدث خطأ في الفتح الجماعي: ${error.message}`)
      setLoading(false)
    }
  }

  // إضافة هذا الوظيفة لتغيير المرحلة
  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade)
    setSelectedStudent('') // مسح اختيار الطالب عند تغيير المرحلة
    setSelectedCourse('') // مسح اختيار الكورس عند تغيير المرحلة
    setMessage(`📊 تم تحديد مرحلة: ${grade === 'all' ? 'جميع المراحل' : grade}`)
  }

  // وظيفة لعرض الكورسات المفتوحة للطالب المحدد
  const viewStudentOpenCourses = (studentId: string) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return
    
    const courses = openCoursesData[studentId]
    if (!courses || courses.length === 0) {
      alert(`الطالب ${student.name} ليس لديه أي كورسات مفتوحة`)
      return
    }
    
    const courseList = courses.map((course: any, index: number) => 
      `${index + 1}. ${course.courseTitle} (${course.pricePaid} جنيه) - ${new Date(course.openedAt).toLocaleDateString('ar-EG')}`
    ).join('\n')
    
    alert(`📚 الكورسات المفتوحة للطالب: ${student.name}\n\n${courseList}\n\nعدد الكورسات: ${courses.length}`)
  }

  // وظيفة لعرض قائمة الطلاب بدون كورسات
  const viewStudentsWithoutCourses = () => {
    // عرض الطلاب بدون كورسات في المرحلة المحددة
    const studentsToShow = selectedGrade === 'all' 
      ? studentsWithoutOpenCourses 
      : studentsWithoutOpenCourses.filter(s => s.grade === selectedGrade)
    
    if (studentsToShow.length === 0) {
      alert(selectedGrade === 'all' 
        ? '🎉 كل الطلاب لديهم كورسات مفتوحة!' 
        : `🎉 كل طلاب مرحلة ${selectedGrade} لديهم كورسات مفتوحة!`)
      return
    }
    
    const studentList = studentsToShow.map((student, index) => 
      `${index + 1}. ${student.name} - ${student.phone} (${student.grade})`
    ).join('\n')
    
    alert(`👤 الطلاب الذين ليس لديهم كورسات مفتوحة${selectedGrade !== 'all' ? ` في مرحلة ${selectedGrade}` : ''}:\n\n${studentList}\n\nعدد الطلاب: ${studentsToShow.length}`)
  }

  // وظيفة لعرض معلومات المرحلة المحددة
  const viewGradeInfo = () => {
    if (selectedGrade === 'all') {
      alert('📊 عرض جميع المراحل\nيمكنك تحديد مرحلة معينة للتصفية')
      return
    }
    
    const studentsInGrade = students.filter(s => s.grade === selectedGrade)
    const coursesInGrade = coursesByGrade[selectedGrade] || []
    
    const info = `
📊 معلومات مرحلة: ${selectedGrade}

👥 عدد الطلاب: ${studentsInGrade.length}
📚 عدد الكورسات: ${coursesInGrade.length}

📋 الطلاب في هذه المرحلة:
${studentsInGrade.map(s => `• ${s.name} - ${s.phone}`).join('\n').slice(0, 300)}...

📋 الكورسات في هذه المرحلة:
${coursesInGrade.map(c => `• ${c.title}`).join('\n')}
    `
    
    alert(info)
  }

  return (
    <div style={styles.container}>
      {/* الهيدر */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/admin" style={styles.backButton}>
            ← العودة للوحة التحكم
          </Link>
          <h1 style={styles.title}>🎓 فتح كورس للطلاب</h1>
          <p style={styles.subtitle}>علمني العلوم مستر بيشوي</p>
        </div>
      </header>

      <main style={styles.main}>
        {/* رسالة Debug */}
        <div style={styles.debugSection}>
          <p style={styles.debugText}>
            ℹ️ افتح Console (F12) لمشاهدة تفاصيل العملية
          </p>
        </div>

        {message && (
          <div style={{
            ...styles.message,
            background: message.startsWith('✅') ? '#d4fae5' : 
                      message.startsWith('⚠️') ? '#fef3c7' : 
                      message.startsWith('🔍') ? '#dbeafe' : 
                      message.startsWith('📊') ? '#e0e7ff' :
                      '#fee2e2',
            color: message.startsWith('✅') ? '#065f46' : 
                   message.startsWith('⚠️') ? '#92400e' : 
                   message.startsWith('🔍') ? '#1e40af' : 
                   message.startsWith('📊') ? '#3730a3' :
                   '#991b1b'
          }}>
            {message}
          </div>
        )}

        <div style={styles.grid}>
          {/* القسم الأيسر: اختيار البيانات */}
          <div style={styles.formSection}>
            <div style={styles.formCard}>
              <h2 style={styles.formTitle}>📋 اختيار الطالب والكورس</h2>
              
              {/* فلتر المرحلة مع زر معلومات */}
              <div style={styles.formGroup}>
                <div style={styles.gradeHeader}>
                  <label style={styles.label}>📊 اختر المرحلة:</label>
                  {selectedGrade !== 'all' && (
                    <button
                      type="button"
                      onClick={viewGradeInfo}
                      style={styles.infoButton}
                      title="عرض معلومات المرحلة"
                    >
                      ℹ️ معلومات
                    </button>
                  )}
                </div>
                <div style={styles.gradeFilter}>
                  {availableGrades.map(grade => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => handleGradeChange(grade)}
                      style={{
                        ...styles.gradeButton,
                        background: selectedGrade === grade ? '#3b82f6' : '#f3f4f6',
                        color: selectedGrade === grade ? 'white' : '#374151',
                        fontWeight: selectedGrade === grade ? 'bold' : 'normal',
                        border: selectedGrade === grade ? '2px solid #1d4ed8' : '1px solid #d1d5db'
                      }}
                    >
                      {grade === 'all' ? '🌍 جميع المراحل' : `📚 ${grade}`}
                    </button>
                  ))}
                </div>
                
                {/* عرض معلومات المرحلة المحددة */}
                {selectedGrade !== 'all' && (
                  <div style={styles.gradeStats}>
                    <p style={styles.gradeStatText}>
                      📊 <strong>{selectedGrade}</strong>: 
                      {coursesByGrade[selectedGrade] ? ` ${coursesByGrade[selectedGrade].length} كورس` : ' لا يوجد كورسات'} | 
                      {students.filter(s => s.grade === selectedGrade).length} طالب
                    </p>
                  </div>
                )}
                
                {/* فلتر الكورسات المفتوحة */}
                <div style={styles.courseFilterSection}>
                  <div style={styles.filterButtonsRow}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOnlyStudentsWithCourses(true)
                        setShowOnlyStudentsWithoutCourses(false)
                      }}
                      style={{
                        ...styles.courseFilterButton,
                        background: showOnlyStudentsWithCourses ? '#10b981' : '#f3f4f6',
                        color: showOnlyStudentsWithCourses ? 'white' : '#374151',
                        border: showOnlyStudentsWithCourses ? '2px solid #059669' : '1px solid #d1d5db'
                      }}
                    >
                      {showOnlyStudentsWithCourses ? '✅ الطلاب الذين لديهم كورسات' : '👁️ الطلاب الذين لديهم كورسات'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowOnlyStudentsWithCourses(false)
                        setShowOnlyStudentsWithoutCourses(true)
                      }}
                      style={{
                        ...styles.courseFilterButton,
                        background: showOnlyStudentsWithoutCourses ? '#f59e0b' : '#f3f4f6',
                        color: showOnlyStudentsWithoutCourses ? 'white' : '#374151',
                        border: showOnlyStudentsWithoutCourses ? '2px solid #d97706' : '1px solid #d1d5db'
                      }}
                    >
                      {showOnlyStudentsWithoutCourses ? '✅ الطلاب بدون كورسات' : '👤 الطلاب بدون كورسات'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowOnlyStudentsWithCourses(false)
                        setShowOnlyStudentsWithoutCourses(false)
                      }}
                      style={{
                        ...styles.courseFilterButton,
                        background: (!showOnlyStudentsWithCourses && !showOnlyStudentsWithoutCourses) ? '#3b82f6' : '#f3f4f6',
                        color: (!showOnlyStudentsWithCourses && !showOnlyStudentsWithoutCourses) ? 'white' : '#374151',
                        border: (!showOnlyStudentsWithCourses && !showOnlyStudentsWithoutCourses) ? '2px solid #1d4ed8' : '1px solid #d1d5db'
                      }}
                    >
                      🌍 جميع الطلاب
                    </button>
                  </div>
                  
                  {showOnlyStudentsWithCourses && (
                    <p style={styles.filterInfo}>
                      📊 عرض {filteredStudents.length} طالب من أصل {students.length} لديهم كورسات مفتوحة
                      {selectedGrade !== 'all' && ` في مرحلة ${selectedGrade}`}
                    </p>
                  )}
                  {showOnlyStudentsWithoutCourses && (
                    <p style={styles.filterInfo}>
                      📊 عرض {filteredStudents.length} طالب من أصل {students.length} ليس لديهم كورسات مفتوحة
                      {selectedGrade !== 'all' && ` في مرحلة ${selectedGrade}`}
                    </p>
                  )}
                </div>
                
                <p style={styles.filterInfo}>
                  📌 عرض: {filteredStudents.length} طالب، {filteredCourses.length} كورس
                  {selectedGrade !== 'all' && ` (مرحلة: ${selectedGrade})`}
                  {showOnlyStudentsWithCourses && ' 👁️ (فقط لديهم كورسات)'}
                  {showOnlyStudentsWithoutCourses && ' 👤 (فقط بدون كورسات)'}
                </p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  👨‍🎓 اختر الطالب ({filteredStudents.length})
                  {selectedGrade !== 'all' && ` - مرحلة ${selectedGrade}`}:
                </label>
                <div style={styles.selectWithButton}>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    style={styles.select}
                    disabled={loading}
                  >
                    <option value="">-- اختر طالبًا --</option>
                    {filteredStudents.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} - {student.phone} ({student.grade})
                        {studentsWithOpenCourses.includes(student.id) ? ' 📚' : ' ⭕'}
                      </option>
                    ))}
                  </select>
                  {selectedStudent && (
                    <div style={styles.studentActions}>
                      <button
                        type="button"
                        onClick={() => viewStudentOpenCourses(selectedStudent)}
                        style={styles.viewCoursesButton}
                        title="عرض الكورسات المفتوحة لهذا الطالب"
                      >
                        👁️ عرض الكورسات
                      </button>
                    </div>
                  )}
                </div>
                {filteredStudents.length === 0 && (
                  <p style={styles.warningText}>
                    {showOnlyStudentsWithCourses 
                      ? '✅ كل الطلاب لديهم كورسات مفتوحة!' 
                      : showOnlyStudentsWithoutCourses
                        ? '🎉 كل الطلاب لديهم كورسات مفتوحة!' 
                        : selectedGrade === 'all' 
                          ? '⚠️ لا يوجد طلاب نشطين' 
                          : `⚠️ لا يوجد طلاب في مرحلة ${selectedGrade}`}
                  </p>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  📚 اختر الكورس ({filteredCourses.length})
                  {selectedGrade !== 'all' && ` - مرحلة ${selectedGrade}`}:
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  style={styles.select}
                  disabled={loading}
                >
                  <option value="">-- اختر كورسًا --</option>
                  {filteredCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title} {course.grade && `(${course.grade})`}
                    </option>
                  ))}
                </select>
                {filteredCourses.length === 0 && (
                  <p style={styles.warningText}>
                    {selectedGrade === 'all' 
                      ? '⚠️ لا يوجد كورسات' 
                      : `⚠️ لا يوجد كورسات لمرحلة ${selectedGrade}`}
                  </p>
                )}
                {selectedCourse && (
                  <p style={styles.courseInfo}>
                    📝 مرحلة الكورس: {courses.find(c => c.id === selectedCourse)?.grade || 'غير محدد'}
                  </p>
                )}
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>💰 المبلغ المدفوع:</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    style={styles.input}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>📝 ملاحظات:</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={styles.textarea}
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                />
              </div>

              <div style={styles.buttonsGroup}>
                <button 
                  onClick={handleOpenCourse}
                  style={styles.primaryButton}
                  disabled={!selectedStudent || !selectedCourse || loading}
                >
                  ✅ فتح الكورس للطالب المحدد
                  {selectedGrade !== 'all' && ` (${selectedGrade})`}
                </button>
                
                <button 
                  onClick={handleBulkOpen}
                  style={styles.secondaryButton}
                  disabled={!selectedCourse || loading || filteredStudents.length === 0}
                >
                  📦 فتح الكورس للطلاب الحاليين
                  {selectedGrade !== 'all' && ` (${selectedGrade})`}
                  <br />
                  <small style={{ fontSize: '12px', opacity: 0.8 }}>
                    {filteredStudents.length} طالب
                  </small>
                </button>
              </div>
            </div>

            {/* قائمة الكورسات المفتوحة مع زر الإلغاء */}
            <div style={styles.openCoursesList}>
              <h3 style={styles.openCoursesTitle}>
                📋 الكورسات المفتوحة الحالية
                {selectedGrade !== 'all' && ` - مرحلة ${selectedGrade}`}
              </h3>
              {loading ? (
                <p style={styles.loadingText}>جاري تحميل الكورسات المفتوحة...</p>
              ) : openCourseRecords.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📚</div>
                  <p style={styles.emptyText}>لا يوجد كورسات مفتوحة حاليًا</p>
                </div>
              ) : (
                <div style={styles.coursesTable}>
                  <div style={styles.tableHeader}>
                    <span style={styles.tableHeaderCell}>الطالب (المرحلة)</span>
                    <span style={styles.tableHeaderCell}>الكورس (المرحلة)</span>
                    <span style={styles.tableHeaderCell}>السعر</span>
                    <span style={styles.tableHeaderCell}>الإجراءات</span>
                  </div>
                  <div style={styles.tableBody}>
                    {openCourseRecords
                      .filter(record => selectedGrade === 'all' || record.studentGrade === selectedGrade)
                      .slice(0, 10)
                      .map((record, index) => (
                      <div key={record.id} style={styles.tableRow}>
                        <span style={styles.tableCell}>
                          {record.studentName}
                          <br />
                          <small style={{ color: '#6b7280', fontSize: '11px' }}>
                            {record.studentGrade || 'غير محدد'}
                          </small>
                        </span>
                        <span style={styles.tableCell}>
                          {record.courseTitle}
                          <br />
                          <small style={{ color: '#6b7280', fontSize: '11px' }}>
                            {record.courseGrade || 'غير محدد'}
                          </small>
                        </span>
                        <span style={styles.tableCell}>{record.pricePaid} ج.م</span>
                        <span style={styles.tableCell}>
                          <button
                            onClick={() => handleDeactivateCourse(record.id, record.studentName, record.courseTitle)}
                            style={styles.deactivateButton}
                            title="إلغاء تفعيل هذا الكورس"
                          >
                            ❌ إلغاء
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                  {openCourseRecords.filter(record => selectedGrade === 'all' || record.studentGrade === selectedGrade).length > 10 && (
                    <p style={styles.moreText}>
                      و {openCourseRecords.filter(record => selectedGrade === 'all' || record.studentGrade === selectedGrade).length - 10} كورس آخر...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* القسم الأيمن: الإحصائيات */}
          <div style={styles.statsSection}>
            <div style={styles.statsCard}>
              <h2 style={styles.statsTitle}>📊 الإحصائيات</h2>
              
              <div style={styles.statItem}>
                <div style={styles.statNumber}>{students.length}</div>
                <div style={styles.statLabel}>جميع الطلاب</div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statNumber}>{filteredStudents.length}</div>
                <div style={styles.statLabel}>طلاب مفلترين</div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statNumber}>{courses.length}</div>
                <div style={styles.statLabel}>جميع الكورسات</div>
              </div>

              <div style={styles.statItem}>
                <div style={{
                  ...styles.statNumber,
                  fontSize: '24px',
                  color: studentsWithOpenCourses.length > 0 ? '#10b981' : '#9ca3af'
                }}>
                  {studentsWithOpenCourses.length}
                </div>
                <div style={styles.statLabel}>طلاب لديهم كورسات مفتوحة</div>
              </div>

              <div style={styles.statItem}>
                <div style={{
                  ...styles.statNumber,
                  fontSize: '24px',
                  color: studentsWithoutOpenCourses.length > 0 ? '#f59e0b' : '#9ca3af'
                }}>
                  {studentsWithoutOpenCourses.length}
                </div>
                <div style={styles.statLabel}>طلاب بدون كورسات</div>
              </div>

              <div style={styles.statItem}>
                <div style={{
                  ...styles.statNumber,
                  fontSize: '24px',
                  color: selectedGrade === 'all' ? '#9ca3af' : '#3b82f6'
                }}>
                  {selectedGrade === 'all' ? '🌍 الكل' : `📚 ${selectedGrade}`}
                </div>
                <div style={styles.statLabel}>المرحلة المحددة</div>
              </div>
            </div>

            {/* قائمة سريعة بالطلاب المفلترين */}
            <div style={styles.quickList}>
              <div style={styles.quickListHeader}>
                <h3 style={styles.quickListTitle}>
                  👥 الطلاب {selectedGrade !== 'all' ? `(${selectedGrade})` : ''}
                </h3>
                <span style={styles.counterBadge}>{filteredStudents.length}</span>
              </div>
              <div style={styles.quickListContent}>
                {loading ? (
                  <p style={styles.loadingText}>جاري تحميل الطلاب...</p>
                ) : filteredStudents.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>
                      {showOnlyStudentsWithCourses ? '✅' : showOnlyStudentsWithoutCourses ? '🎉' : '👤'}
                    </div>
                    <p style={styles.emptyText}>
                      {showOnlyStudentsWithCourses 
                        ? `✅ كل طلاب ${selectedGrade !== 'all' ? `مرحلة ${selectedGrade}` : 'المنصة'} لديهم كورسات!` 
                        : showOnlyStudentsWithoutCourses
                          ? `🎉 لا يوجد طلاب بدون كورسات ${selectedGrade !== 'all' ? `في مرحلة ${selectedGrade}` : ''}!` 
                          : selectedGrade === 'all' 
                            ? 'لا يوجد طلاب نشطين' 
                            : `لا يوجد طلاب في مرحلة ${selectedGrade}`}
                    </p>
                  </div>
                ) : (
                  <div style={styles.studentsList}>
                    {filteredStudents.slice(0, 8).map(student => (
                      <div key={student.id} style={styles.studentItem}>
                        <span style={styles.studentName}>{student.name}</span>
                        <div style={styles.studentInfo}>
                          <span style={styles.studentGrade}>{student.grade}</span>
                          {studentsWithOpenCourses.includes(student.id) ? (
                            <span style={styles.hasCoursesBadge} title="لديه كورسات مفتوحة">
                              📚
                            </span>
                          ) : (
                            <span style={styles.noCoursesBadge} title="ليس لديه كورسات">
                              ⭕
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredStudents.length > 8 && (
                      <p style={styles.moreText}>و {filteredStudents.length - 8} طالب آخر...</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* أزرار إضافية */}
            <div style={styles.quickList}>
              <h3 style={styles.quickListTitle}>👁️ إجراءات سريعة</h3>
              <div style={styles.quickActions}>
                <button
                  onClick={viewStudentsWithoutCourses}
                  style={styles.quickActionButton}
                >
                  👤 عرض قائمة الطلاب بدون كورسات
                  <br />
                  <small style={{ fontSize: '11px', opacity: 0.8 }}>
                    ({selectedGrade === 'all' 
                      ? studentsWithoutOpenCourses.length 
                      : studentsWithoutOpenCourses.filter(s => s.grade === selectedGrade).length
                    } طالب)
                  </small>
                </button>
                
                <button
                  onClick={viewGradeInfo}
                  style={styles.quickActionButton}
                >
                  📊 عرض معلومات المرحلة
                  <br />
                  <small style={{ fontSize: '11px', opacity: 0.8 }}>
                    {selectedGrade !== 'all' ? selectedGrade : 'اختر مرحلة أولاً'}
                  </small>
                </button>
                
                <button
                  onClick={() => {
                    setShowOnlyStudentsWithCourses(false)
                    setShowOnlyStudentsWithoutCourses(false)
                    setSelectedStudent('')
                    setSelectedCourse('')
                  }}
                  style={styles.quickActionButton}
                >
                  🔄 إعادة ضبط الفلاتر
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* زر التحديث */}
        <div style={styles.refreshSection}>
          <button 
            onClick={fetchData}
            style={styles.refreshButton}
            disabled={loading}
          >
            {loading ? '🔄 جاري التحديث...' : '🔄 تحديث البيانات'}
          </button>
          <p style={styles.helpText}>
            ⚠️ عند تغيير المرحلة، سيتم إعادة تعيين اختيار الطالب والكورس
          </p>
        </div>
      </main>

      {/* الفوتر */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p style={styles.footerText}>
            © 2024 علمني العلوم مستر بيشوي - إدارة فتح الكورسات
          </p>
          <div style={styles.footerLinks}>
            <Link href="/admin" style={styles.footerLink}>لوحة التحكم</Link>
            <Link href="/admin/courses" style={styles.footerLink}>إضافة كورسات</Link>
            <Link href="/admin/students" style={styles.footerLink}>تفعيل طلاب</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// الأنماط
const styles = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    direction: 'rtl' as const,
    fontFamily: 'Arial, sans-serif'
  },
  debugSection: {
    background: '#dbeafe',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '15px',
    textAlign: 'center' as const
  },
  debugText: {
    color: '#1e40af',
    fontSize: '14px',
    margin: 0
  },
  header: {
    background: 'linear-gradient(to right, #1e3a8a, #3b82f6)',
    color: 'white',
    padding: '25px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    textAlign: 'center' as const
  },
  backButton: {
    position: 'absolute' as const,
    right: '20px',
    top: '25px',
    color: 'white',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '16px',
    background: 'rgba(255,255,255,0.2)',
    padding: '8px 16px',
    borderRadius: '6px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold' as const,
    marginBottom: '10px'
  },
  subtitle: {
    fontSize: '18px',
    opacity: 0.9
  },
  main: {
    maxWidth: '1400px',
    margin: '30px auto',
    padding: '0 20px'
  },
  message: {
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '25px',
    textAlign: 'center' as const,
    fontWeight: 'bold' as const,
    fontSize: '16px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '30px',
    marginBottom: '30px'
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '25px'
  },
  formCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  formTitle: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: '#1f2937',
    marginBottom: '25px',
    textAlign: 'center' as const
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600' as const,
    color: '#374151',
    fontSize: '15px'
  },
  gradeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  infoButton: {
    padding: '6px 12px',
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    '&:hover': {
      background: '#7c3aed'
    }
  },
  gradeStats: {
    background: '#f0f9ff',
    padding: '10px',
    borderRadius: '8px',
    marginTop: '10px',
    marginBottom: '15px'
  },
  gradeStatText: {
    margin: 0,
    fontSize: '14px',
    color: '#0369a1',
    textAlign: 'center' as const
  },
  courseInfo: {
    fontSize: '13px',
    color: '#3b82f6',
    marginTop: '5px',
    fontStyle: 'italic' as const
  },
  selectWithButton: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  select: {
    flex: 1,
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    background: 'white',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6'
    }
  },
  studentActions: {
    display: 'flex',
    gap: '5px'
  },
  viewCoursesButton: {
    padding: '12px 16px',
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    '&:hover': {
      background: '#7c3aed'
    }
  },
  warningText: {
    color: '#dc2626',
    fontSize: '13px',
    marginTop: '5px',
    fontStyle: 'italic' as const
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    background: 'white',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6'
    }
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    background: 'white',
    resize: 'vertical' as const,
    minHeight: '80px',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6'
    }
  },
  buttonsGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    marginTop: '30px'
  },
  primaryButton: {
    padding: '15px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    transition: 'background 0.3s',
    '&:hover:not(:disabled)': {
      background: '#059669'
    },
    '&:disabled': {
      background: '#9ca3af',
      cursor: 'not-allowed'
    }
  },
  secondaryButton: {
    padding: '15px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    transition: 'background 0.3s',
    '&:hover:not(:disabled)': {
      background: '#2563eb'
    },
    '&:disabled': {
      background: '#9ca3af',
      cursor: 'not-allowed'
    }
  },
  openCoursesList: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  openCoursesTitle: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: '20px',
    textAlign: 'center' as const
  },
  coursesTable: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1.5fr 0.8fr 0.8fr',
    background: '#f3f4f6',
    padding: '12px',
    fontWeight: 'bold' as const,
    color: '#374151',
    fontSize: '14px'
  },
  tableHeaderCell: {
    textAlign: 'center' as const
  },
  tableBody: {
    maxHeight: '300px',
    overflowY: 'auto' as const
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1.5fr 0.8fr 0.8fr',
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    alignItems: 'center',
    '&:last-child': {
      borderBottom: 'none'
    },
    '&:hover': {
      background: '#f9fafb'
    }
  },
  tableCell: {
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#4b5563'
  },
  deactivateButton: {
    padding: '6px 12px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    '&:hover': {
      background: '#dc2626'
    }
  },
  statsSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '25px'
  },
  statsCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  statsTitle: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: '20px',
    textAlign: 'center' as const
  },
  statItem: {
    textAlign: 'center' as const,
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '15px'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold' as const,
    color: '#3b82f6',
    marginBottom: '8px'
  },
  statLabel: {
    color: '#6b7280',
    fontSize: '14px'
  },
  quickList: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  quickListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  quickListTitle: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: '15px'
  },
  counterBadge: {
    background: '#3b82f6',
    color: 'white',
    padding: '2px 10px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 'bold' as const
  },
  quickListContent: {
    maxHeight: '200px',
    overflowY: 'auto' as const
  },
  loadingText: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '20px'
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '20px'
  },
  emptyIcon: {
    fontSize: '2rem',
    color: '#9ca3af',
    marginBottom: '10px'
  },
  emptyText: {
    color: '#6b7280',
    marginBottom: '5px'
  },
  studentsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  studentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    background: '#f9fafb',
    borderRadius: '6px'
  },
  studentInfo: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  studentName: {
    fontWeight: '600' as const,
    color: '#374151'
  },
  studentGrade: {
    color: '#6b7280',
    fontSize: '12px'
  },
  hasCoursesBadge: {
    background: '#10b981',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px'
  },
  noCoursesBadge: {
    background: '#f59e0b',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px'
  },
  moreText: {
    textAlign: 'center' as const,
    color: '#9ca3af',
    fontSize: '12px',
    marginTop: '10px'
  },
  gradeFilter: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '10px',
    marginBottom: '15px'
  },
  gradeButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '20px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
  },
  courseFilterSection: {
    marginBottom: '15px'
  },
  filterButtonsRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px'
  },
  courseFilterButton: {
    flex: 1,
    padding: '10px 12px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
  },
  quickActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  quickActionButton: {
    padding: '12px 16px',
    background: '#e0e7ff',
    color: '#3730a3',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    '&:hover': {
      background: '#c7d2fe',
      transform: 'translateY(-2px)'
    }
  },
  filterInfo: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '5px',
    textAlign: 'center' as const
  },
  refreshSection: {
    textAlign: 'center' as const,
    marginTop: '30px',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '10px'
  },
  refreshButton: {
    padding: '12px 24px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    marginBottom: '10px',
    '&:disabled': {
      background: '#9ca3af',
      cursor: 'not-allowed'
    }
  },
  helpText: {
    color: '#6b7280',
    fontSize: '13px',
    marginTop: '10px'
  },
  footer: {
    background: '#1f2937',
    marginTop: '50px'
  },
  footerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px',
    textAlign: 'center' as const
  },
  footerText: {
    color: '#d1d5db',
    marginBottom: '15px'
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    flexWrap: 'wrap' as const
  },
  footerLink: {
    color: '#9ca3af',
    textDecoration: 'none',
    '&:hover': {
      color: 'white'
    }
  }
}