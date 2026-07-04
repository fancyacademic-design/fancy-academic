// app/api/block-student/route.js
import fs from 'fs';
import path from 'path';

const BLOCKED_FILE = path.join(process.cwd(), 'blocked.json');

export async function POST(req) {
  try {
    const { studentId, studentName, action } = await req.json(); // action: 'block' or 'unblock'
    
    // قراءة المحظورين الحاليين
    let blocked = [];
    if (fs.existsSync(BLOCKED_FILE)) {
      const content = fs.readFileSync(BLOCKED_FILE, 'utf8');
      blocked = JSON.parse(content);
    }
    
    if (action === 'block') {
      // إضافة للحظر (لو مش موجود)
      if (!blocked.find(b => b.studentId === studentId)) {
        blocked.push({
          studentId,
          studentName,
          blockedAt: new Date().toISOString()
        });
        console.log(`🚫 تم حظر الطالب: ${studentName} (${studentId})`);
      }
    } else if (action === 'unblock') {
      // إزالة من الحظر
      blocked = blocked.filter(b => b.studentId !== studentId);
      console.log(`✅ تم إلغاء حظر الطالب: ${studentId}`);
    }
    
    // حفظ الملف
    fs.writeFileSync(BLOCKED_FILE, JSON.stringify(blocked, null, 2));
    
    return new Response(JSON.stringify({ 
      success: true, 
      blocked: blocked 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("❌ خطأ في API الحظر:", error);
    return new Response(JSON.stringify({ success: false }), { status: 200 });
  }
}

export async function GET() {
  try {
    if (fs.existsSync(BLOCKED_FILE)) {
      const content = fs.readFileSync(BLOCKED_FILE, 'utf8');
      const blocked = JSON.parse(content);
      return new Response(JSON.stringify({ blocked }), { status: 200 });
    }
    return new Response(JSON.stringify({ blocked: [] }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ blocked: [] }), { status: 200 });
  }
}