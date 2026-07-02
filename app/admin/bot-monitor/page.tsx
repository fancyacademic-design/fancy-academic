'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-auth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function BotMonitor() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const q = query(collection(db, "bot_messages"), orderBy("userMessageTime", "desc"));
      const snapshot = await getDocs(q);
      
      // تجميع الرسائل لكل طالب على حدة
      const studentsMap = new Map();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const studentId = data.studentId;
        
        if (!studentsMap.has(studentId)) {
          studentsMap.set(studentId, {
            id: studentId,
            name: data.realName || data.studentName || 'طالب',
            messages: [],
            lastMessage: data.message,
            lastTime: data.userMessageTime
          });
        }
        
        const student = studentsMap.get(studentId);
        student.messages.push({
          question: data.message,
          reply: data.reply,
          time: data.userMessageTime
        });
        
        // تحديث آخر رسالة
        if (new Date(data.userMessageTime) > new Date(student.lastTime)) {
          student.lastTime = data.userMessageTime;
          student.lastMessage = data.message;
        }
      });
      
      // ترتيب الرسائل داخل كل طالب (الأقدم أولاً)
      for (let student of studentsMap.values()) {
        student.messages.sort((a, b) => new Date(a.time) - new Date(b.time));
      }
      
      // ترتيب الطلاب (الأحدث أولاً)
      const studentsList = Array.from(studentsMap.values());
      studentsList.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
      
      setStudents(studentsList);
    } catch (error) {
      console.error("خطأ:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>جاري تحميل المحادثات...</p>
      </div>
    );
  }

  // عرض محادثات طالب واحد
  if (selectedStudent) {
    return (
      <div style={styles.container}>
        <div style={styles.chatHeader}>
          <button onClick={() => setSelectedStudent(null)} style={styles.backButton}>
            ← رجوع
          </button>
          <div style={styles.chatUserInfo}>
            <div style={styles.chatAvatar}>👤</div>
            <div>
              <div style={styles.chatUserName}>{selectedStudent.name}</div>
              <div style={styles.chatUserId}>{selectedStudent.id}</div>
            </div>
          </div>
        </div>

        <div style={styles.chatMessages}>
          {selectedStudent.messages.map((msg, idx) => (
            <div key={idx} style={styles.messageGroup}>
              {/* رسالة الطالب */}
              <div style={styles.userMessage}>
                <div style={styles.userBubble}>
                  <div style={styles.messageText}>{msg.question}</div>
                  <div style={styles.messageTime}>
                    {new Date(msg.time).toLocaleString('ar-EG')}
                  </div>
                </div>
                <div style={styles.userIcon}>👤</div>
              </div>
              
              {/* رد البوت */}
              <div style={styles.botMessage}>
                <div style={styles.botIcon}>🤖</div>
                <div style={styles.botBubble}>
                  <div style={styles.messageText}>{msg.reply}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // عرض قائمة الطلاب
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🤖 مراقبة البوت</h1>
        <p style={styles.subtitle}>محادثات الطلاب</p>
      </div>

      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="بحث باسم الطالب..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <button onClick={loadData} style={styles.refreshBtn}>تحديث</button>
      </div>

      {filteredStudents.length === 0 ? (
        <div style={styles.empty}>لا توجد محادثات</div>
      ) : (
        filteredStudents.map(student => (
          <div 
            key={student.id} 
            onClick={() => setSelectedStudent(student)} 
            style={styles.studentCard}
          >
            <div style={styles.studentAvatar}>👤</div>
            <div style={styles.studentInfo}>
              <div style={styles.studentName}>{student.name}</div>
              <div style={styles.studentLastMsg}>
                {student.lastMessage?.substring(0, 50)}...
              </div>
              <div style={styles.studentTime}>
                {new Date(student.lastTime).toLocaleString('ar-EG')}
              </div>
            </div>
            <div style={styles.studentBadge}>{student.messages.length}</div>
          </div>
        ))
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '20px',
    direction: 'rtl',
    fontFamily: 'Arial, sans-serif',
    background: '#f0f0f0',
    minHeight: '100vh'
  },
  loading: {
    textAlign: 'center',
    padding: '50px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #ccc',
    borderTopColor: '#333',
    borderRadius: '50%',
    margin: '0 auto 15px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    marginBottom: '5px'
  },
  subtitle: {
    color: '#666',
    fontSize: '14px'
  },
  searchBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  },
  searchInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '10px'
  },
  refreshBtn: {
    padding: '10px 20px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer'
  },
  studentCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    background: 'white',
    padding: '15px',
    borderRadius: '15px',
    marginBottom: '10px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  studentAvatar: {
    width: '50px',
    height: '50px',
    background: '#3b82f6',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: 'white'
  },
  studentInfo: {
    flex: 1
  },
  studentName: {
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  studentLastMsg: {
    fontSize: '13px',
    color: '#666'
  },
  studentTime: {
    fontSize: '11px',
    color: '#999',
    marginTop: '3px'
  },
  studentBadge: {
    background: '#eee',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '15px'
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    background: 'white',
    padding: '15px',
    borderRadius: '15px',
    marginBottom: '15px'
  },
  backButton: {
    background: '#eee',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '20px',
    cursor: 'pointer'
  },
  chatUserInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1
  },
  chatAvatar: {
    width: '45px',
    height: '45px',
    background: '#3b82f6',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    color: 'white'
  },
  chatUserName: {
    fontWeight: 'bold'
  },
  chatUserId: {
    fontSize: '11px',
    color: '#999'
  },
  chatMessages: {
    background: 'white',
    borderRadius: '15px',
    padding: '15px',
    maxHeight: 'calc(100vh - 180px)',
    overflowY: 'auto'
  },
  messageGroup: {
    marginBottom: '20px'
  },
  userMessage: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: '8px',
    marginBottom: '10px'
  },
  userBubble: {
    maxWidth: '70%',
    background: '#3b82f6',
    color: 'white',
    padding: '10px 15px',
    borderRadius: '18px',
    borderBottomLeftRadius: '4px'
  },
  userIcon: {
    width: '30px',
    height: '30px',
    background: '#10b981',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: 'white'
  },
  botMessage: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: '8px'
  },
  botBubble: {
    maxWidth: '70%',
    background: '#e5e5ea',
    padding: '10px 15px',
    borderRadius: '18px',
    borderBottomRightRadius: '4px'
  },
  botIcon: {
    width: '30px',
    height: '30px',
    background: '#1e293b',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: 'white'
  },
  messageText: {
    fontSize: '14px',
    lineHeight: '1.4'
  },
  messageTime: {
    fontSize: '10px',
    opacity: 0.7,
    marginTop: '5px',
    textAlign: 'left'
  }
};