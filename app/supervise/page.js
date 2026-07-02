'use client';
import { useState, useEffect } from 'react';

export default function Supervise() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [conversations, setConversations] = useState({});
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [blockedStudents, setBlockedStudents] = useState([]);

  // بيانات الدخول
  const VALID_EMAIL = 'tomasmehany@bot';
  const VALID_PASSWORD = 'Tomasmehany@2009';

  useEffect(() => {
    const savedLogin = localStorage.getItem('superviseLoggedIn');
    if (savedLogin === 'true') {
      setIsLoggedIn(true);
      fetchBlockedStudents();
      fetchConversations(selectedDate);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === VALID_EMAIL && password === VALID_PASSWORD) {
      setIsLoggedIn(true);
      setLoginError('');
      localStorage.setItem('superviseLoggedIn', 'true');
      fetchBlockedStudents();
      fetchConversations(selectedDate);
    } else {
      setLoginError('❌ البريد الإلكتروني أو كلمة السر غير صحيحة');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('superviseLoggedIn');
    setEmail('');
    setPassword('');
  };

  const fetchBlockedStudents = async () => {
    try {
      const res = await fetch('/api/block-student');
      const data = await res.json();
      setBlockedStudents(data.blocked || []);
    } catch (error) {
      console.error('خطأ في جلب المحظورين:', error);
    }
  };

  const handleBlockStudent = async (studentId, studentName, action) => {
    try {
      const res = await fetch('/api/block-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, studentName, action })
      });
      const data = await res.json();
      if (data.success) {
        await fetchBlockedStudents();
        alert(action === 'block' ? '✅ تم حظر الطالب' : '✅ تم إلغاء حظر الطالب');
      }
    } catch (error) {
      alert('❌ حدث خطأ');
    }
  };

  async function fetchConversations(date) {
    setLoading(true);
    try {
      const res = await fetch(`/api/get-logs?date=${date}`);
      const data = await res.json();
      const logs = data.logs || [];
      
      const convos = {};
      const studentsList = [];
      const studentMap = new Map();
      
      logs.forEach(log => {
        if (!log.studentId) return;
        
        if (!convos[log.studentId]) {
          convos[log.studentId] = {
            studentId: log.studentId,
            studentName: log.studentName || 'طالب',
            messages: [],
            lastMessage: log.timestamp
          };
          
          if (!studentMap.has(log.studentId)) {
            studentMap.set(log.studentId, {
              id: log.studentId,
              name: log.studentName || 'طالب',
              lastMessage: log.message,
              lastTime: log.timestamp
            });
          }
        }
        
        convos[log.studentId].messages.push({
          id: log.id || Date.now() + Math.random(),
          message: log.message,
          reply: log.reply,
          timestamp: log.timestamp
        });
      });

      const sortedStudents = Array.from(studentMap.values()).sort(
        (a, b) => new Date(b.lastTime) - new Date(a.lastTime)
      );
      
      setConversations(convos);
      setStudents(sortedStudents);
      
      if (sortedStudents.length > 0 && !selectedStudent) {
        setSelectedStudent(sortedStudents[0].id);
      }
    } catch (error) {
      console.error('خطأ في جلب السجلات:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const isStudentBlocked = (studentId) => {
    return blockedStudents.some(b => b.studentId === studentId);
  };

  // صفحة تسجيل الدخول
  if (!isLoggedIn) {
    return (
      <div style={loginStyles.container}>
        <div style={loginStyles.card}>
          <div style={loginStyles.icon}>🔐</div>
          <h1 style={loginStyles.title}>لوحة المراقبة</h1>
          <p style={loginStyles.subtitle}>يرجى تسجيل الدخول للمتابعة</p>
          
          <form onSubmit={handleLogin} style={loginStyles.form}>
            <div style={loginStyles.inputGroup}>
              <label style={loginStyles.label}>البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={loginStyles.input}
                placeholder="tomas"
                required
              />
            </div>
            
            <div style={loginStyles.inputGroup}>
              <label style={loginStyles.label}>كلمة السر</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={loginStyles.input}
                placeholder="********"
                required
              />
            </div>
            
            {loginError && (
              <div style={loginStyles.error}>{loginError}</div>
            )}
            
            <button type="submit" style={loginStyles.button}>
              تسجيل الدخول
            </button>
          </form>
          
          <div style={loginStyles.note}>
            <p>ممثل :</p>
            <p>البريد: tomas</p>
            <p>كلمة السر: 0000000000</p>
          </div>
        </div>
      </div>
    );
  }

  // صفحة المراقبة
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>💬 مراقبة المحادثات</h1>
          <p style={styles.subtitle}>إجمالي الطلاب: {students.length} | محظورين: {blockedStudents.length}</p>
        </div>
        <div style={styles.headerControls}>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 تسجيل الخروج
          </button>
          <div style={styles.dateNavigator}>
            <button onClick={() => changeDate(-1)} style={styles.dateButton}>◀</button>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.dateInput}
            />
            <button onClick={() => changeDate(1)} style={styles.dateButton}>▶</button>
            <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} style={styles.todayButton}>
              اليوم
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>جاري التحميل...</p>
        </div>
      ) : (
        <div style={styles.mainContent}>
          <div style={styles.sidebar}>
            <div style={styles.searchBox}>
              <input
                type="text"
                placeholder="🔍 بحث عن طالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <div style={styles.studentsList}>
              {filteredStudents.length === 0 ? (
                <p style={styles.noStudents}>لا يوجد طلاب</p>
              ) : (
                filteredStudents.map(student => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student.id)}
                    style={{
                      ...styles.studentItem,
                      ...(selectedStudent === student.id ? styles.studentItemSelected : {}),
                      ...(isStudentBlocked(student.id) ? styles.studentBlocked : {})
                    }}
                  >
                    <div style={styles.studentAvatar}>
                      {student.name.charAt(0)}
                    </div>
                    <div style={styles.studentInfo}>
                      <div style={styles.studentName}>
                        {student.name}
                        {isStudentBlocked(student.id) && (
                          <span style={styles.blockedBadge}>🚫</span>
                        )}
                      </div>
                      <div style={styles.lastMessage}>{student.lastMessage?.substring(0, 30)}...</div>
                    </div>
                    <div style={styles.studentTime}>
                      {new Date(student.lastTime).toLocaleTimeString('ar-EG', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={styles.chatArea}>
            {selectedStudent && conversations[selectedStudent] ? (
              <>
                <div style={styles.chatHeader}>
                  <div style={styles.chatStudentInfo}>
                    <div style={styles.chatAvatar}>
                      {conversations[selectedStudent].studentName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={styles.chatNameRow}>
                        <h2 style={styles.chatStudentName}>
                          {conversations[selectedStudent].studentName}
                        </h2>
                        {isStudentBlocked(selectedStudent) && (
                          <span style={styles.blockedTag}>🚫 محظور</span>
                        )}
                      </div>
                      <p style={styles.chatStudentId}>ID: {selectedStudent}</p>
                      <p style={styles.chatStats}>
                        {conversations[selectedStudent].messages.length} رسالة
                      </p>
                    </div>
                  </div>
                  
                  {isStudentBlocked(selectedStudent) ? (
                    <button 
                      onClick={() => handleBlockStudent(selectedStudent, conversations[selectedStudent].studentName, 'unblock')}
                      style={styles.unblockButton}
                    >
                      ✅ إلغاء الحظر
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleBlockStudent(selectedStudent, conversations[selectedStudent].studentName, 'block')}
                      style={styles.blockButton}
                    >
                      🚫 حظر الطالب
                    </button>
                  )}
                </div>

                <div style={styles.messagesContainer}>
                  {conversations[selectedStudent].messages.map((msg, index) => (
                    <div key={msg.id || index} style={styles.messageGroup}>
                      <div style={styles.messageTime}>
                        {new Date(msg.timestamp).toLocaleTimeString('ar-EG')}
                      </div>
                      <div style={styles.messageRow}>
                        <div style={styles.userMessage}>
                          <div style={styles.messageIcon}>👤</div>
                          <div style={styles.messageBubbleUser}>
                            <p style={styles.messageText}>{msg.message}</p>
                          </div>
                        </div>
                      </div>
                      <div style={styles.messageRow}>
                        <div style={styles.botMessage}>
                          <div style={styles.messageIcon}>🤖</div>
                          <div style={styles.messageBubbleBot}>
                            <p style={styles.messageText} 
                               dangerouslySetInnerHTML={{ __html: msg.reply }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={styles.noChatSelected}>
                <div style={styles.noChatIcon}>💬</div>
                <h3>اختر محادثة</h3>
                <p>اضغط على اسم طالب من القائمة لعرض محادثاته</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ستايلات تسجيل الدخول
const loginStyles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    direction: 'rtl',
    fontFamily: 'Cairo, Arial, sans-serif'
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    textAlign: 'center'
  },
  icon: {
    fontSize: '60px',
    marginBottom: '20px'
  },
  title: {
    fontSize: '28px',
    color: '#333',
    marginBottom: '10px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    textAlign: 'right'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontSize: '14px',
    color: '#555',
    fontWeight: '600'
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none'
  },
  button: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  error: {
    color: '#e74c3c',
    fontSize: '14px'
  },
  note: {
    marginTop: '30px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#666',
    border: '1px dashed #ccc'
  }
};

const styles = {
  container: {
    height: '100vh',
    background: '#f0f2f5',
    direction: 'rtl',
    fontFamily: 'Cairo, Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    background: 'white',
    padding: '15px 20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: '20px',
    color: '#333',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap'
  },
  logoutButton: {
    padding: '8px 16px',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  dateNavigator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  dateButton: {
    background: '#f0f0f0',
    border: 'none',
    width: '35px',
    height: '35px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px'
  },
  todayButton: {
    background: '#667eea',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  sidebar: {
    width: '350px',
    background: 'white',
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  searchBox: {
    padding: '15px',
    borderBottom: '1px solid #e0e0e0'
  },
  searchInput: {
    width: '100%',
    padding: '10px 15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  },
  studentsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px'
  },
  studentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginBottom: '5px'
  },
  studentItemSelected: {
    background: '#e8f0fe',
    borderRight: '3px solid #667eea'
  },
  studentBlocked: {
    background: '#fff1f0',
    opacity: 0.8
  },
  studentAvatar: {
    width: '45px',
    height: '45px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  studentInfo: {
    flex: 1,
    minWidth: 0
  },
  studentName: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  blockedBadge: {
    fontSize: '14px'
  },
  lastMessage: {
    fontSize: '12px',
    color: '#666',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  studentTime: {
    fontSize: '11px',
    color: '#999',
    whiteSpace: 'nowrap'
  },
  chatArea: {
    flex: 1,
    background: '#f0f2f5',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  chatHeader: {
    background: 'white',
    padding: '15px 20px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  chatStudentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  chatAvatar: {
    width: '50px',
    height: '50px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  chatNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '5px'
  },
  chatStudentName: {
    fontSize: '18px',
    margin: 0,
    color: '#333'
  },
  blockedTag: {
    fontSize: '12px',
    color: '#dc2626',
    background: '#fee2e2',
    padding: '2px 8px',
    borderRadius: '10px'
  },
  chatStudentId: {
    fontSize: '12px',
    color: '#666',
    margin: '0 0 5px 0'
  },
  chatStats: {
    fontSize: '12px',
    color: '#667eea',
    margin: 0
  },
  blockButton: {
    padding: '8px 16px',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  unblockButton: {
    padding: '8px 16px',
    background: '#d1fae5',
    color: '#059669',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px'
  },
  messageGroup: {
    marginBottom: '20px'
  },
  messageTime: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#999',
    marginBottom: '10px'
  },
  messageRow: {
    display: 'flex',
    marginBottom: '10px'
  },
  userMessage: {
    display: 'flex',
    gap: '10px',
    maxWidth: '80%',
    marginRight: 'auto'
  },
  botMessage: {
    display: 'flex',
    gap: '10px',
    maxWidth: '80%',
    marginLeft: 'auto'
  },
  messageIcon: {
    width: '30px',
    height: '30px',
    background: '#f0f0f0',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px'
  },
  messageBubbleUser: {
    background: '#667eea',
    color: 'white',
    padding: '10px 15px',
    borderRadius: '15px',
    borderTopRightRadius: '4px'
  },
  messageBubbleBot: {
    background: 'white',
    padding: '10px 15px',
    borderRadius: '15px',
    borderTopLeftRadius: '4px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
  },
  messageText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.5',
    wordBreak: 'break-word'
  },
  noChatSelected: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999'
  },
  noChatIcon: {
    fontSize: '60px',
    marginBottom: '20px'
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '10px'
  },
  noStudents: {
    textAlign: 'center',
    color: '#999',
    padding: '20px'
  }
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}