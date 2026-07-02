// lib/firebase-course-structure.js
import { db } from './firebase'
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  writeBatch
} from 'firebase/firestore'

// ============================================
// دوال إدارة الوحدات
// ============================================

// جلب كل وحدات الكورس مع دروسها
export async function getModules(courseId) {
  try {
    console.log('🔍 جلب وحدات للكورس:', courseId);
    
    const modulesQuery = query(
      collection(db, "modules"),
      where("courseId", "==", courseId),
      orderBy("order", "asc")
    )
    const modulesSnap = await getDocs(modulesQuery)
    const modules = []
    
    console.log('📊 عدد الوحدات الموجودة:', modulesSnap.size);
    
    for (const moduleDoc of modulesSnap.docs) {
      const moduleData = { id: moduleDoc.id, ...moduleDoc.data() }
      console.log('📁 تم العثور على وحدة:', moduleData.title);
      
      // جلب الدروس داخل كل وحدة
      const lessonsQuery = query(
        collection(db, "lessons"),
        where("moduleId", "==", moduleDoc.id),
        orderBy("order", "asc")
      )
      const lessonsSnap = await getDocs(lessonsQuery)
      moduleData.lessons = lessonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      console.log(`📚 عدد الدروس في وحدة "${moduleData.title}":`, moduleData.lessons.length);
      
      modules.push(moduleData)
    }
    
    return { success: true, modules }
  } catch (error) {
    console.error('❌ خطأ في جلب الوحدات:', error)
    return { success: false, modules: [] }
  }
}

// جلب الدروس المباشرة (بدون وحدة) - للتوافق مع النظام القديم
export async function getDirectLessons(courseId) {
  try {
    console.log('🔍 جلب دروس مباشرة للكورس:', courseId);
    
    const lessonsQuery = query(
      collection(db, "lessons"),
      where("courseId", "==", courseId),
      where("moduleId", "==", null),
      orderBy("order", "asc")
    )
    const lessonsSnap = await getDocs(lessonsQuery)
    const lessons = lessonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    console.log('📊 عدد الدروس المباشرة:', lessons.length);
    return { success: true, lessons }
  } catch (error) {
    console.error('❌ خطأ في جلب الدروس المباشرة:', error)
    return { success: false, lessons: [] }
  }
}

// إضافة وحدة جديدة
export async function addModule(courseId, moduleData) {
  try {
    console.log('➕ إضافة وحدة جديدة للكورس:', courseId);
    
    // جلب عدد الوحدات الحالي لتحديد الترتيب
    const modulesQuery = query(
      collection(db, "modules"),
      where("courseId", "==", courseId)
    )
    const modulesSnap = await getDocs(modulesQuery)
    const order = modulesSnap.size + 1
    
    const newModule = {
      courseId: courseId,
      title: moduleData.title,
      description: moduleData.description || '',
      order: moduleData.order || order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const docRef = await addDoc(collection(db, "modules"), newModule)
    console.log('✅ تم إضافة الوحدة بنجاح:', docRef.id);
    return { success: true, id: docRef.id, module: newModule }
  } catch (error) {
    console.error('❌ خطأ في إضافة الوحدة:', error)
    return { success: false, error: error.message }
  }
}

// تحديث وحدة
export async function updateModule(moduleId, moduleData) {
  try {
    const moduleRef = doc(db, "modules", moduleId)
    await updateDoc(moduleRef, {
      ...moduleData,
      updatedAt: new Date().toISOString()
    })
    return { success: true }
  } catch (error) {
    console.error('❌ خطأ في تحديث الوحدة:', error)
    return { success: false, error: error.message }
  }
}

// حذف وحدة (مع حذف الدروس المرتبطة بها)
export async function deleteModule(moduleId) {
  try {
    console.log('🗑️ حذف وحدة:', moduleId);
    
    // 1. حذف كل الدروس المرتبطة بالوحدة
    const lessonsQuery = query(
      collection(db, "lessons"),
      where("moduleId", "==", moduleId)
    )
    const lessonsSnap = await getDocs(lessonsQuery)
    
    const batch = writeBatch(db)
    lessonsSnap.forEach((lessonDoc) => {
      batch.delete(lessonDoc.ref)
    })
    await batch.commit()
    
    // 2. حذف الوحدة نفسها
    await deleteDoc(doc(db, "modules", moduleId))
    
    console.log('✅ تم حذف الوحدة وجميع دروسها');
    return { success: true }
  } catch (error) {
    console.error('❌ خطأ في حذف الوحدة:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// دوال إدارة الدروس (المطورة)
// ============================================

// إضافة درس جديد (يدعم الوحدات)
export async function addLesson(courseId, lessonData) {
  try {
    console.log('➕ إضافة درس جديد:', lessonData.title);
    
    let order = lessonData.order || 1
    
    if (!lessonData.order) {
      // تحديد الترتيب تلقائياً
      let lessonsRef
      if (lessonData.moduleId) {
        lessonsRef = query(
          collection(db, "lessons"),
          where("moduleId", "==", lessonData.moduleId)
        )
      } else {
        lessonsRef = query(
          collection(db, "lessons"),
          where("courseId", "==", courseId),
          where("moduleId", "==", null)
        )
      }
      const lessonsSnap = await getDocs(lessonsRef)
      order = lessonsSnap.size + 1
    }
    
    const newLesson = {
      courseId: courseId,
      moduleId: lessonData.moduleId || null,
      title: lessonData.title,
      description: lessonData.description || '',
      videoUrl: lessonData.videoUrl,
      order: order,
      assignmentLink: lessonData.assignmentLink || '',
      examLink: lessonData.examLink || '',
      duration: lessonData.duration || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const docRef = await addDoc(collection(db, "lessons"), newLesson)
    console.log('✅ تم إضافة الدرس بنجاح:', docRef.id);
    return { success: true, id: docRef.id, lesson: newLesson }
  } catch (error) {
    console.error('❌ خطأ في إضافة الدرس:', error)
    return { success: false, error: error.message }
  }
}

// تحديث درس
export async function updateLesson(lessonId, lessonData) {
  try {
    const lessonRef = doc(db, "lessons", lessonId)
    await updateDoc(lessonRef, {
      ...lessonData,
      updatedAt: new Date().toISOString()
    })
    return { success: true }
  } catch (error) {
    console.error('❌ خطأ في تحديث الدرس:', error)
    return { success: false, error: error.message }
  }
}

// حذف درس
export async function deleteLesson(lessonId) {
  try {
    await deleteDoc(doc(db, "lessons", lessonId))
    return { success: true }
  } catch (error) {
    console.error('❌ خطأ في حذف الدرس:', error)
    return { success: false, error: error.message }
  }
}

// جلب كل محتوى الكورس (وحدات + دروس مباشرة)
export async function getFullCourseContent(courseId) {
  try {
    console.log('🎯 جلب المحتوى الكامل للكورس:', courseId);
    
    const modules = await getModules(courseId)
    const directLessons = await getDirectLessons(courseId)
    
    const totalModules = modules.modules.length
    const totalLessonsInModules = modules.modules.reduce((sum, m) => sum + m.lessons.length, 0)
    const totalLessons = totalLessonsInModules + directLessons.lessons.length
    
    console.log('📊 الملخص النهائي:');
    console.log(`   - عدد الوحدات: ${totalModules}`);
    console.log(`   - عدد الدروس في الوحدات: ${totalLessonsInModules}`);
    console.log(`   - عدد الدروس المباشرة: ${directLessons.lessons.length}`);
    console.log(`   - إجمالي الدروس: ${totalLessons}`);
    
    return {
      success: true,
      modules: modules.modules,
      directLessons: directLessons.lessons,
      totalModules: totalModules,
      totalLessons: totalLessons
    }
  } catch (error) {
    console.error('❌ خطأ في جلب محتوى الكورس:', error)
    return { success: false, modules: [], directLessons: [], totalModules: 0, totalLessons: 0 }
  }
}