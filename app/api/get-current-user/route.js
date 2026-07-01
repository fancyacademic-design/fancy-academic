// app/api/get-current-user/route.js
export async function GET(req) {
  // هذا API تجريبي بيرجع اسم ثابت
  // في التطبيق الحقيقي، هتجيب الاسم من قاعدة البيانات
  return new Response(JSON.stringify({ 
    name: "أحمد محمد", // اسم حقيقي للاختبار
    email: "ahmed@example.com",
    id: "12345"
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}