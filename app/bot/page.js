'use client';
import { useState, useRef, useEffect } from 'react';

export default function BotPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  // ✅ التحقق من تسجيل الدخول
  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem('currentUser');
      if (!userData) {
        window.location.href = '/login';
        return;
      }
      try {
        const user = JSON.parse(userData);
        if (!user.id && !user.phone) {
          window.location.href = '/login';
        }
      } catch (e) {
        window.location.href = '/login';
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const hasSeenBotMessage = localStorage.getItem('hasSeenBotMessage');
    if (!hasSeenBotMessage) {
      setShowWelcomeMessage(true);
    }

    // ✅ استخدام ID ثابت من المستخدم المسجل
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const stableId = user.id || user.uid || user.phone;
        if (stableId) {
          localStorage.setItem('stableStudentId', stableId);
          setStudentId(stableId);
        }
      } catch(e) {
        console.error('خطأ في جلب ID المستخدم');
      }
    }

    const fetchStudentName = () => {
      try {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          const userName = parsedUser.name || parsedUser.username || parsedUser.displayName || 'طالب';
          setStudentName(userName);
          
          const stableId = parsedUser.id || parsedUser.uid || parsedUser.phone;
          if (stableId) {
            localStorage.setItem('stableStudentId', stableId);
            setStudentId(stableId);
          }
        } else {
          setStudentName('طالب');
        }
      } catch (error) {
        console.error('❌ فشل جلب الاسم:', error);
        setStudentName('طالب');
      }
    };
    
    fetchStudentName();
    checkBlockStatus(studentId);

    setMessages([
      {
        id: 1,
        role: 'bot',
        content: '🧑‍🏫 **مرحبا! أنا Almny Alolom AI**\n\n📚 متخصص في:\n• علوم (إعدادي)\n• علوم متكاملة (أولى ثانوي)\n• فيزياء (تانية ثانوي)\n• كيمياء (تانية ثانوي)\n\n📝 اكتب سؤالك وأنا هجاوبك ✅'
      }
    ]);
  }, []);

  const handleCloseWelcomeMessage = () => {
    setShowWelcomeMessage(false);
    localStorage.setItem('hasSeenBotMessage', 'true');
  };

  const checkBlockStatus = async (id) => {
    try {
      const res = await fetch('/api/block-student');
      const data = await res.json();
      const blocked = data.blocked?.some(b => b.studentId === id);
      setIsBlocked(blocked);
    } catch (error) {
      console.error('خطأ في التحقق من الحظر:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const streamText = (fullText, messageId) => {
    let index = 0;
    setStreamingMessage('');
    
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setStreamingMessage(prev => prev + fullText[index]);
        index++;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        clearInterval(interval);
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== 'streaming');
          return [...filtered, {
            id: messageId,
            role: 'bot',
            content: fullText
          }];
        });
        setStreamingMessage('');
      }
    }, 5);
  };

  // ✅ دالة تسجيل المحادثة المعدلة - تستخدم ID ثابت
  const logConversation = async (userMessage, botReply) => {
    let stableId = localStorage.getItem('stableStudentId');
    if (!stableId) {
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          stableId = user.id || user.uid || user.phone;
          localStorage.setItem('stableStudentId', stableId);
        } catch(e) {
          stableId = 'unknown_' + Date.now();
        }
      } else {
        stableId = 'unknown_' + Date.now();
      }
      localStorage.setItem('stableStudentId', stableId);
    }
    
    const payload = {
      studentId: stableId,
      studentName: studentName,
      realName: studentName,
      message: userMessage,
      reply: botReply,
      timestamp: new Date().toISOString(),
      userMessageTime: new Date().toISOString()
    };
    
    try {
      await fetch('/api/log-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('❌ فشل تسجيل:', error);
    }
  };

  const addToHistory = (role, content) => {
    setConversationHistory(prev => [...prev, { role, content }]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    if (isBlocked) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'bot',
        content: "🚫 عذراً، تم حظر حسابك من استخدام البوت. تواصل مع الدعم الفني."
      }]);
      setInput('');
      return;
    }

    const userMessageContent = input;
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessageContent
    };

    setMessages(prev => [...prev, userMessage]);
    addToHistory('user', userMessageContent);
    setInput('');
    setLoading(true);

    try {
      const lastMessages = conversationHistory.slice(-10);
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessageContent,
          history: lastMessages,
          studentName: studentName
        })
      });

      const data = await res.json();
      let replyText = data.reply || "عذراً، لم أستطع الإجابة";
      
      addToHistory('assistant', replyText);
      const messageId = Date.now() + 1;
      
      await logConversation(userMessageContent, replyText);
      streamText(replyText, messageId);

    } catch (error) {
      const errorMessage = "عذراً، حدث خطأ مؤقت";
      await logConversation(userMessageContent, errorMessage);
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'bot',
        content: errorMessage
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showWelcomeMessage && (
        <div style={styles.messageOverlay}>
          <div style={styles.messageCard}>
            <div style={styles.messageIconWrapper}>
              <span style={styles.messageIcon}>🤖</span>
            </div>
            <h2 style={styles.messageTitle}>مرحباً بك في المساعد الذكي</h2>
            <p style={styles.messageText}>
              في حالة صدور أي مشاكل في المساعد الذكي، الرجاء إخبارنا.
            </p>
            <button 
              style={styles.messageButton}
              onClick={handleCloseWelcomeMessage}
            >
              حسناً
            </button>
            <div style={styles.messageFooter}>
              <span style={styles.messageOnce}>🔔 تظهر مرة واحدة فقط</span>
            </div>
          </div>
        </div>
      )}

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.logoWrapper}>
              <div style={styles.logoAnimated}>
                <span style={styles.logoIcon}>🧑‍🏫</span>
              </div>
              <div style={styles.logoText}>
                <h1 style={styles.botName}>Almny Alolom AI</h1>
                <div style={styles.statusWrapper}>
                  <span style={styles.statusDot}></span>
                  <span style={styles.statusText}>متصل</span>
                </div>
              </div>
            </div>

            {studentName && (
              <div style={styles.userBadge}>
                <span style={styles.userIcon}>👤</span>
                <span style={styles.userName}>{studentName}</span>
                {isBlocked && (
                  <span style={styles.blockedBadge}>محظور</span>
                )}
              </div>
            )}
          </div>

          <div style={styles.specialties}>
            <div style={styles.specialtyItem}>
              <span style={styles.specialtyIcon}>🔬</span>
              <span>علوم (إعدادي)</span>
            </div>
            <div style={styles.specialtyItem}>
              <span style={styles.specialtyIcon}>🧬</span>
              <span>علوم متكاملة (أولى ثانوي)</span>
            </div>
            <div style={styles.specialtyItem}>
              <span style={styles.specialtyIcon}>⚡</span>
              <span>فيزياء (تانية ثانوي)</span>
            </div>
            <div style={styles.specialtyItem}>
              <span style={styles.specialtyIcon}>🧪</span>
              <span>كيمياء (تانية ثانوي)</span>
            </div>
          </div>
        </div>

        <div style={styles.chatArea}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                ...styles.messageRow,
                ...(msg.role === 'user' ? styles.userRow : styles.botRow)
              }}
            >
              {msg.role === 'bot' && (
                <div style={styles.botAvatar}>
                  <span>🧑‍🏫</span>
                </div>
              )}
              <div style={{
                ...styles.messageBubble,
                ...(msg.role === 'user' ? styles.userBubble : styles.botBubble)
              }}>
                <p style={styles.messageText} dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                <span style={styles.messageTime}>
                  {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {msg.role === 'user' && (
                <div style={styles.userAvatar}>
                  <span>👤</span>
                </div>
              )}
            </div>
          ))}

          {streamingMessage && (
            <div style={styles.messageRow}>
              <div style={styles.botAvatar}>
                <span>🧑‍🏫</span>
              </div>
              <div style={{...styles.messageBubble, ...styles.botBubble}}>
                <p style={styles.messageText} dangerouslySetInnerHTML={{ __html: streamingMessage.replace(/\n/g, '<br/>') }} />
              </div>
            </div>
          )}

          {loading && !streamingMessage && (
            <div style={styles.typingContainer}>
              <div style={styles.typingBubble}>
                <span style={styles.typingDot}></span>
                <span style={styles.typingDot}></span>
                <span style={styles.typingDot}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isBlocked ? "🚫 حسابك محظور..." : "اكتب سؤالك هنا..."}
              style={styles.input}
              disabled={loading || isBlocked}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || isBlocked}
              style={{
                ...styles.sendButton,
                ...((!input.trim() || loading || isBlocked) ? styles.sendButtonDisabled : styles.sendButtonActive)
              }}
            >
              {loading ? '⏳' : 'إرسال'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

const styles = {
  messageOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.3s ease',
  },
  messageCard: {
    background: 'white',
    borderRadius: '28px',
    padding: '35px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 30px 50px rgba(0, 0, 0, 0.4)',
    animation: 'slideIn 0.4s ease',
  },
  messageIconWrapper: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    animation: 'float 3s ease-in-out infinite',
  },
  messageIcon: {
    fontSize: '40px',
  },
  messageTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '15px',
  },
  messageText: {
    fontSize: '16px',
    color: '#4b5563',
    lineHeight: '1.7',
    marginBottom: '25px',
  },
  messageButton: {
    padding: '14px 40px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginBottom: '15px',
    boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3)',
  },
  messageFooter: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  messageOnce: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
  },
  container: {
    maxWidth: '900px',
    margin: '20px auto',
    background: 'white',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    direction: 'rtl',
    height: 'calc(100vh - 40px)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"Cairo", "Segoe UI", Tahoma, sans-serif',
  },
  header: {
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    color: 'white',
    padding: '20px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    flexWrap: 'wrap',
    gap: '15px',
  },
  logoWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  logoAnimated: {
    width: '55px',
    height: '55px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid rgba(255, 255, 255, 0.2)',
  },
  logoIcon: {
    fontSize: '28px',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },
  botName: {
    fontSize: '22px',
    fontWeight: '700',
    margin: 0,
    marginBottom: '5px',
  },
  statusWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    background: '#10b981',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'pulse 2s infinite',
  },
  statusText: {
    fontSize: '13px',
    opacity: 0.9,
  },
  userBadge: {
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  userIcon: {
    fontSize: '16px',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
  },
  blockedBadge: {
    fontSize: '11px',
    background: '#dc2626',
    padding: '3px 8px',
    borderRadius: '20px',
    color: 'white',
  },
  specialties: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  specialtyItem: {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '6px 14px',
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.2s',
  },
  specialtyIcon: {
    fontSize: '14px',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    background: '#f8fafc',
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
    marginBottom: '15px',
    animation: 'fadeIn 0.3s ease',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px',
    flexShrink: 0,
    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px',
    flexShrink: 0,
    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
  },
  messageBubble: {
    maxWidth: '65%',
    padding: '12px 18px',
    borderRadius: '18px',
    position: 'relative',
    wordWrap: 'break-word',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
  },
  botBubble: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderBottomRightRadius: '18px',
    borderBottomLeftRadius: '4px',
  },
  userBubble: {
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: 'white',
    borderBottomLeftRadius: '18px',
    borderBottomRightRadius: '4px',
  },
  messageText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
  },
  messageTime: {
    fontSize: '10px',
    opacity: 0.7,
    display: 'block',
    textAlign: 'left',
    marginTop: '4px',
  },
  typingContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  typingBubble: {
    background: 'white',
    padding: '12px 18px',
    borderRadius: '18px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    gap: '4px',
  },
  typingDot: {
    width: '6px',
    height: '6px',
    background: '#94a3b8',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'typing 1.4s infinite ease-in-out',
  },
  inputContainer: {
    padding: '15px 20px',
    background: 'white',
    borderTop: '1px solid #e2e8f0',
  },
  inputWrapper: {
    display: 'flex',
    gap: '10px',
  },
  input: {
    flex: 1,
    padding: '14px 18px',
    border: '2px solid #e2e8f0',
    borderRadius: '30px',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.3s',
    fontFamily: '"Cairo", "Segoe UI", Tahoma, sans-serif',
  },
  sendButton: {
    padding: '0 25px',
    border: 'none',
    borderRadius: '30px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    minWidth: '90px',
  },
  sendButtonActive: {
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: 'white',
    boxShadow: '0 5px 12px rgba(59, 130, 246, 0.3)',
  },
  sendButtonDisabled: {
    background: '#e2e8f0',
    color: '#94a3b8',
    cursor: 'not-allowed',
  },
};