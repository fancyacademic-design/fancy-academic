// استيراد مكتبات Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

// نفس بيانات Firebase بتاعتك
const firebaseConfig = {
  apiKey: "AIzaSyBBy-OhVURoXuK_C-cdNMYf_Uwe3hGA88E",
  authDomain: "tomas-service.firebaseapp.com",
  projectId: "tomas-service",
  storageBucket: "tomas-service.firebasestorage.app",
  messagingSenderId: "69137587894",
  appId: "1:69137587894:web:96ccaff83928b72cb49017"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addLastLoginToAllUsers() {
  console.log('🚀 بدأ إضافة حقل آخر دخول لجميع المستخدمين...');
  
  try {
    // جلب كل المستخدمين
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    let count = 0;
    
    // تعديل كل مستخدم
    for (const userDoc of querySnapshot.docs) {
      const userData = userDoc.data();
      
      // تحديث المستخدم بإضافة حقل lastLogin
      await updateDoc(doc(db, 'users', userDoc.id), {
        lastLogin: userData.createdAt || null
      });
      
      count++;
      console.log(`✅ تم تحديث المستخدم ${count}: ${userData.name || 'بدون اسم'}`);
    }
    
    console.log(`\n🎉 تم بنجاح! أضفنا حقل آخر دخول لـ ${count} مستخدم`);
    console.log('✨ دلوقتي تقدر تروح صفحة الأدمن وتشوف آخر دخول للطلاب');
    
  } catch (error) {
    console.error('❌ حصل خطأ:', error);
  }
}

// تشغيل الدالة
addLastLoginToAllUsers();