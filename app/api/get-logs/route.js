// app/api/get-logs/route.js
import fs from 'fs';
import path from 'path';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const logFile = path.join(process.cwd(), 'logs', `${date}.json`);
    
    if (!fs.existsSync(logFile)) {
      return new Response(JSON.stringify({ logs: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const fileContent = fs.readFileSync(logFile, 'utf8');
    const logs = JSON.parse(fileContent);

    return new Response(JSON.stringify({ logs }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("❌ خطأ في جلب السجلات:", error);
    return new Response(JSON.stringify({ logs: [] }), { status: 200 });
  }
}