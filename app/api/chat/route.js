// app/api/chat/route.js

// دالة تعديل اسم الطالب
function formatStudentName(name) {
  if (!name || name === 'طالب') return 'طالب';
  
  // لو الاسم بالإنجليزي، حوله لعربي
  const englishToArabic = {
    'tomas': 'توماس',
  };
  
  let formattedName = name.trim();
  const lowerName = formattedName.toLowerCase();
  
  // التحويل من إنجليزي لعربي
  if (englishToArabic[lowerName]) {
    formattedName = englishToArabic[lowerName];
  }
  
  // لو الاسم ثلاثي أو أكثر، خذ أول كلمة بس
  const nameParts = formattedName.split(' ');
  if (nameParts.length > 1) {
    formattedName = nameParts[0];
  }
  
  return formattedName;
}

export async function POST(req) {
  try {
    const { message, history = [], studentName } = await req.json();
    
    // ✅ تنسيق اسم الطالب
    const formattedStudentName = formatStudentName(studentName);
    console.log("📝 اسم الطالب الأصلي:", studentName);
    console.log("📝 اسم الطالب بعد التنسيق:", formattedStudentName);

    const key1 = process.env.GROQ_API_KEY;
    const key2 = process.env.GROQ_API_KEY_2;
    const key3 = process.env.GROQ_API_KEY_3;
    
    const API_KEYS = [];
    if (key1) API_KEYS.push(key1);
    if (key2) API_KEYS.push(key2);
    if (key3) API_KEYS.push(key3);

    if (API_KEYS.length === 0) {
      return new Response(JSON.stringify({ 
        reply: "عذراً، مشكلة في إعدادات الخادم (المفاتيح غير موجودة)" 
      }), { status: 200 });
    }

    // بناء رسائل المحادثة مع التاريخ
    const messages = [
      { role: "system", content: getSystemInstruction(message, formattedStudentName) }
    ];
    
    for (const msg of history.slice(-10)) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }
    
    messages.push({ role: "user", content: message });

    let response = null;

    for (let i = 0; i < API_KEYS.length; i++) {
      const currentKey = API_KEYS[i];
      
      try {
        const fetchResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${currentKey}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (fetchResponse.ok || fetchResponse.status === 429) {
          response = fetchResponse;
          break;
        }
      } catch (err) {
        console.log(`⚠️ خطأ في المفتاح ${i + 1}:`, err.message);
      }
    }

    if (!response) {
      return new Response(JSON.stringify({ 
        reply: "عذراً، مشكلة في الاتصال بالخدمة" 
      }), { status: 200 });
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          reply: "عذراً، تم تجاوز الحد المسموح من الطلبات حالياً. حاول بعد قليل." 
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ 
        reply: "عذراً، حدث خطأ في الاتصال بالخدمة" 
      }), { status: 200 });
    }

    const data = await response.json();
    let replyText = data.choices?.[0]?.message?.content || "عذراً، لم أستطع الإجابة";

    // تنظيف النص من المسافات الزائدة في البداية
    replyText = replyText.trimStart();

    // تنظيف النجوم والصيغ الكيميائية
    replyText = replyText.replace(/\*\*(.*?)\*\*/g, '($1)');
    replyText = replyText.replace(/\*(.*?)\*/g, '($1)');
    replyText = replyText.replace(/#{1,6}\s?/g, '');
    replyText = replyText.replace(/H2O/g, 'H<sub>2</sub>O');
    replyText = replyText.replace(/CO2/g, 'CO<sub>2</sub>');
    replyText = replyText.replace(/O2/g, 'O<sub>2</sub>');

    return new Response(JSON.stringify({ reply: replyText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ خطأ:", error);
    return new Response(JSON.stringify({
      reply: "عذراً، حدث خطأ مؤقت"
    }), { status: 200 });
  }
}

function getSystemInstruction(message, studentName) {
  const lowerCaseMessage = message?.toLowerCase() || '';
  
  const developerKeywords = [
    "من صنعك", "من طورك", "من دربك", "من علمك",
    "المطور", "توماس", "مهني", "اللي عاملك",
    "مين عملك", "مين علمك", "مين دربك", "مين صنعك",
    "who created you", "who made you", "who trained you",
    "your developer", "your creator"
  ];
  
  const isAboutDeveloper = developerKeywords.some(keyword => 
    lowerCaseMessage.includes(keyword)
  );

  let instruction = `أنت Almny Alolom ai، بوت تعليمي متخصص.

**تعليمات مهمة للرد:**

1. **التنسيق**:
   - استخدم سطر جديد بين كل فقرة
   - لو في نقاط، استخدم الأرقام زي (1، 2، 3) أو الشرطات (-)
   - خلي الرد منظم وسهل القراءة

2. **المحتوى**:
   - اكتب إجابة متوسطة الطول (مناسبة للسؤال)
   - استخدم لغة عربية بسيطة وواضحة
   - إذا احتجت توضيح، استخدم (الأقواس)

3. **ممنوع نهائياً**:
   - استخدام النجوم ** أو * في الرد
   - الإجابات الطويلة جداً
   - الإجابات القصيرة جداً (أقل من سطرين)

4. **التعريف**:
   - في بداية المحادثة: (أهلاً بك! أنا Almny Alolom ai)`;

  // ✅ استخدام الاسم المنسق في الرد
  if (studentName && studentName !== 'طالب') {
    instruction += `\n\n**ملاحظة مهمة**: اسم الطالب الذي تتحدث معه هو "${studentName}". يمكنك مناداته باسمه "${studentName}" في ردودك.`;
  }

  if (isAboutDeveloper) {
    instruction += `\n\n**مهم جداً**: المستخدم يسأل عن المطور الخاص بك. رد عليه بأنك "نموذج ذكاء اصطناعي تم تطويري وتدريبي بواسطة توماس مهني".`;
  }

  return instruction;
}

export async function GET() {
  const key1 = !!process.env.GROQ_API_KEY;
  const key2 = !!process.env.GROQ_API_KEY_2;
  const key3 = !!process.env.GROQ_API_KEY_3;
  
  return new Response(JSON.stringify({ 
    message: "✅ API شغال!",
    keys: {
      key1: key1 ? "✅" : "❌",
      key2: key2 ? "✅" : "❌", 
      key3: key3 ? "✅" : "❌"
    }
  }), {
    status: 200
  });
}