// lib/firebase-auth.js
import { db } from "./firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";

export async function loginUser(phone, password) {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("phone", "==", phone));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: "رقم الهاتف غير مسجل" };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    if (userData.password !== password) {
      return { success: false, error: "كلمة السر غير صحيحة" };
    }
    
    if (userData.status !== "active" && userData.status !== "مفعل") {
      return { success: false, error: "الحساب قيد المراجعة" };
    }
    
    return {
      success: true,
      user: {
        id: userDoc.id,
        name: userData.name,
        phone: userData.phone,
        grade: userData.grade,
        role: userData.role,
        status: userData.status
      }
    };
  } catch (error) {
    console.error(error);
    return { success: false, error: "حدث خطأ في الخادم" };
  }
}

export function getCurrentUser() {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
  }
  return null;
}

export function logoutUser() {
  localStorage.removeItem("currentUser");
  window.location.href = "/login";
}

export { db };