// app/api/log-chat/route.js
import { db } from '@/lib/firebase-auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req) {
  try {
    const { studentId, studentName, realName, message, reply, timestamp } = await req.json();

    // حفظ المحادثة في مجموعة new_messages
    const docRef = await addDoc(collection(db, "bot_messages"), {
      studentId: studentId,
      studentName: studentName,
      realName: realName,
      message: message,
      reply: reply,
      userMessageTime: timestamp || new Date().toISOString(),
      botReplyTime: new Date().toISOString(),
      createdAt: serverTimestamp()
    });

    console.log("✅ تم تسجيل المحادثة:", docRef.id);

    return new Response(JSON.stringify({ 
      success: true, 
      id: docRef.id 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ خطأ في تسجيل المحادثة:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}