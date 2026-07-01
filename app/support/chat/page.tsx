'use client'
import { useState, useEffect, useRef } from 'react'

export default function SupportChatPage() {
  const [message, setMessage] = useState('')
  const [currentChat, setCurrentChat] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [modalImage, setModalImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // التحكم في التمرير التلقائي
  const [userScrolled, setUserScrolled] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()

  // جلب بيانات المستخدم
  useEffect(() => {
    const loadCurrentUser = () => {
      try {
        const userData = localStorage.getItem('currentUser')
        if (userData) {
          const parsedUser = JSON.parse(userData)
          
          let userName = 'طالب'
          if (parsedUser.name) userName = parsedUser.name
          else if (parsedUser.username) userName = parsedUser.username
          else if (parsedUser.email) userName = parsedUser.email.split('@')[0]
          
          let userGrade = 'غير محدد'
          if (parsedUser.year) userGrade = parsedUser.year
          else if (parsedUser.grade) userGrade = parsedUser.grade
          
          let userId = ''
          if (parsedUser.id) userId = parsedUser.id
          else if (parsedUser.userId) userId = parsedUser.userId
          else if (parsedUser.phone) userId = `phone_${parsedUser.phone}`
          else userId = `user_${Date.now()}`
          
          setCurrentUser({
            id: userId,
            name: userName,
            grade: userGrade
          })
        } else {
          setCurrentUser({
            id: `user_${Date.now()}`,
            name: 'طالب جديد',
            grade: 'غير محدد'
          })
        }
      } catch (error) {
        console.error('خطأ:', error)
        setCurrentUser({
          id: `user_${Date.now()}`,
          name: 'طالب',
          grade: 'غير محدد'
        })
      }
    }
    loadCurrentUser()
  }, [])

  // تحميل محادثة المستخدم
  useEffect(() => {
    if (currentUser) {
      loadUserChat()
      const interval = setInterval(loadUserChat, 2000)
      return () => clearInterval(interval)
    }
  }, [currentUser])

  const loadUserChat = () => {
    if (!currentUser) return
    const allChats = JSON.parse(localStorage.getItem('all_support_chats') || '[]')
    const userChat = allChats.find((chat: any) => chat.userId === currentUser.id)
    
    if (userChat) {
      setCurrentChat(userChat)
    } else {
      const now = new Date()
      const newChat = {
        id: `chat_${currentUser.id}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userGrade: currentUser.grade,
        messages: [],
        createdAt: now.toLocaleDateString('ar-EG'),
        lastMessage: '',
        status: 'open',
        unreadCount: 0,
        lastActivity: now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      }
      const updatedChats = [...allChats, newChat]
      localStorage.setItem('all_support_chats', JSON.stringify(updatedChats))
      setCurrentChat(newChat)
    }
  }

  // ✅ منع التمرير التلقائي نهائياً عند السحب
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      // المستخدم بيسحب
      setUserScrolled(true)
      
      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // بعد 3 ثواني من اخر سحب، نسمح بالتمرير التلقائي مرة تانية
      scrollTimeoutRef.current = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = container
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
        if (isAtBottom) {
          setUserScrolled(false)
        }
      }, 3000)
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // ✅ التمرير التلقائي فقط عند ارسال رسالة جديدة والمستخدم مش بسحب
  useEffect(() => {
    if (!userScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentChat?.messages, userScrolled])

  // ✅ التمرير التلقائي عند ارسال رسالة
  useEffect(() => {
    if (message === '') {
      // بعد ارسال الرسالة مباشرة
      setTimeout(() => {
        if (!userScrolled) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [message])

  const handleSend = () => {
    if (!currentChat || !currentUser || message.trim() === '') return
    
    const now = new Date()
    const timeString = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    const dateString = now.toLocaleDateString('ar-EG')
    
    const newMessage = {
      id: `msg_${Date.now()}`,
      text: message,
      time: timeString,
      date: dateString,
      sender: 'user',
      userId: currentUser.id,
      userName: currentUser.name
    }
    
    const updatedMessages = [...currentChat.messages, newMessage]
    const updatedChat = {
      ...currentChat,
      messages: updatedMessages,
      lastMessage: message.length > 30 ? message.substring(0, 30) + '...' : message,
      lastActivity: dateString + ' ' + timeString,
      unreadCount: currentChat.unreadCount + 1
    }
    
    const allChats = JSON.parse(localStorage.getItem('all_support_chats') || '[]')
    const updatedChats = allChats.map((chat: any) => 
      chat.id === currentChat.id ? updatedChat : chat
    )
    
    localStorage.setItem('all_support_chats', JSON.stringify(updatedChats))
    setCurrentChat(updatedChat)
    setMessage('')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentChat || !currentUser) return
    
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('الرجاء اختيار صورة فقط')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64Image = event.target?.result as string
      setPreviewImage(base64Image)
      
      const now = new Date()
      const timeString = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      const dateString = now.toLocaleDateString('ar-EG')
      
      const imageMessage = {
        id: `msg_${Date.now()}_img`,
        type: 'image',
        text: '',
        image: base64Image,
        fileName: file.name,
        time: timeString,
        date: dateString,
        sender: 'user',
        userId: currentUser.id,
        userName: currentUser.name
      }
      
      const updatedMessages = [...currentChat.messages, imageMessage]
      const updatedChat = {
        ...currentChat,
        messages: updatedMessages,
        lastMessage: '📸 أرسل صورة',
        lastActivity: dateString + ' ' + timeString,
        unreadCount: currentChat.unreadCount + 1
      }
      
      const allChats = JSON.parse(localStorage.getItem('all_support_chats') || '[]')
      const updatedChats = allChats.map((chat: any) => 
        chat.id === currentChat.id ? updatedChat : chat
      )
      
      localStorage.setItem('all_support_chats', JSON.stringify(updatedChats))
      setCurrentChat(updatedChat)
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      setTimeout(() => setPreviewImage(null), 2000)
    }
    
    reader.readAsDataURL(file)
  }

  const openImageModal = (imageSrc: string) => {
    setModalImage(imageSrc)
  }

  const closeImageModal = () => {
    setModalImage(null)
  }

  // ✅ الوقت الفعلي لآخر ظهور - الحل النهائي
  const getAdminStatus = () => {
    if (!currentChat || currentChat.messages.length === 0) {
      return 'آخر ظهور: كان قريبا '
    }
    
    // البحث عن اخر رسالة من الادمن
    const adminMessages = currentChat.messages.filter((msg: any) => msg.sender === 'admin')
    
    // لو مفيش رسايل من الادمن خالص
    if (adminMessages.length === 0) {
      return 'آخر ظهور: كان قريبا   '
    }
    
    // اخر رسالة من الادمن
    const lastAdminMessage = adminMessages[adminMessages.length - 1]
    
    // وقت الرسالة
    const messageDate = lastAdminMessage.date
    const messageTime = lastAdminMessage.time
    
    // تحويل التاريخ والوقت
    const [day, month, year] = messageDate.split('/')
    const [hours, minutes] = messageTime.split(':')
    
    const messageDateTime = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`)
    const now = new Date()
    
    const diffMs = now.getTime() - messageDateTime.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    // ✅ لو الرسالة خلال ال 5 دقايق الاخيرة - متصل الان
    if (diffMinutes < 5) {
      return 'متصل الان'
    }
    
    // ✅ لو النهاردة - اخر ظهور: منذ X دقيقة
    if (diffDays === 0) {
      if (diffMinutes < 60) {
        return `اخر ظهور: كان ${diffMinutes} قريبا`
      } else {
        return `اخر ظهور: كان ${diffHours} قريبا`
      }
    }
    
    // ✅ لو امبارح
    if (diffDays === 1) {
      return 'اخر ظهور: كان قريبا'
    }
    
    // ✅ لو قبل كدة
    if (diffDays < 7) {
      return `اخر ظهور: كان${diffDays} قريبا`
    }
    
    // ✅ لو اقدم من كدة
    return 'اخر ظهور:  كان قريبا '
  }

  if (!currentUser) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>⏳</div>
        <p>جاري تحميل المحادثة...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.chatContainer}>
        {/* Header - الوضع النهائي */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.supportInfo}>
              <div style={styles.supportAvatar}>👨‍💼</div>
              <div>
                <h1 style={styles.supportTitle}>الادمن</h1>
                <div style={styles.supportStatus}>
                  <span style={{
                    ...styles.statusDot,
                    ...(getAdminStatus() === 'متصل الان' ? styles.statusOnline : styles.statusOffline)
                  }}></span>
                  <span style={styles.statusText}>{getAdminStatus()}</span>
                </div>
              </div>
            </div>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{currentUser.name}</span>
              <span style={styles.userGrade}>{currentUser.grade}</span>
            </div>
          </div>
        </div>

        {/* Messages Area - مع منع التمرير التلقائي */}
        <div 
          style={styles.messagesArea} 
          ref={messagesContainerRef}
          onWheel={() => setUserScrolled(true)}
          onTouchMove={() => setUserScrolled(true)}
        >
          {currentChat?.messages.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>💬</div>
              <h2 style={styles.emptyTitle}>مرحباً {currentUser.name} 👋</h2>
              <p style={styles.emptyText}>كيف يمكننا مساعدتك اليوم؟</p>
            </div>
          ) : (
            <div style={styles.messagesList}>
              {currentChat?.messages.map((msg: any, index: number) => {
                const prevMsg = index > 0 ? currentChat.messages[index - 1] : null
                const showDate = !prevMsg || prevMsg.date !== msg.date
                
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={styles.dateDivider}>
                        <span style={styles.dateText}>{msg.date}</span>
                      </div>
                    )}
                    <div 
                      style={{
                        ...styles.messageWrapper,
                        ...(msg.sender === 'admin' ? styles.adminWrapper : styles.userWrapper)
                      }}
                    >
                      {msg.sender === 'admin' && (
                        <div style={styles.adminAvatar}>👨‍💼</div>
                      )}
                      <div 
                        style={{
                          ...styles.messageBubble,
                          ...(msg.sender === 'admin' ? styles.adminBubble : styles.userBubble)
                        }}
                      >
                        {msg.sender === 'admin' && (
                          <span style={styles.adminName}>الادمن</span>
                        )}
                        {msg.text && <p style={styles.messageText}>{msg.text}</p>}
                        {msg.image && (
                          <div style={styles.imageContainer}>
                            <img 
                              src={msg.image} 
                              alt="صورة" 
                              style={styles.messageImage}
                              onClick={() => openImageModal(msg.image)}
                            />
                            <span style={styles.imageName}>{msg.fileName}</span>
                          </div>
                        )}
                        <span style={styles.messageTime}>{msg.time}</span>
                      </div>
                      {msg.sender === 'user' && (
                        <div style={styles.userAvatar}>
                          {currentUser.name?.charAt(0) || 'ط'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Image Preview */}
        {previewImage && (
          <div style={styles.previewContainer}>
            <img src={previewImage} style={styles.previewImage} alt="معاينة" />
            <span style={styles.previewText}>جاري إرسال الصورة...</span>
          </div>
        )}

        {/* Input Area */}
        <div style={styles.inputArea}>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="اكتب رسالتك هنا..."
              style={styles.input}
            />
            <div style={styles.actions}>
              <label style={styles.attachButton}>
                📎
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload}
                />
              </label>
              <button 
                onClick={handleSend} 
                style={{
                  ...styles.sendButton,
                  ...(message.trim() ? styles.sendButtonActive : styles.sendButtonDisabled)
                }} 
                disabled={!message.trim()}
              >
                إرسال
              </button>
            </div>
          </div>
          <div style={styles.inputFooter}>
            <span>📎 الصورة الواحدة حتى 5 ميجابايت</span>
            <span>⏰ وقت الرد: في اقرب فرصة  </span>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div style={styles.modal} onClick={closeImageModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <span style={styles.modalClose} onClick={closeImageModal}>×</span>
            <img src={modalImage} style={styles.modalImage} alt="صورة مكبرة" />
          </div>
        </div>
      )}
    </div>
  )
}

const styles: any = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    direction: 'rtl',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  chatContainer: {
    width: '100%',
    maxWidth: '800px',
    height: 'calc(100vh - 40px)',
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    padding: '20px',
    color: 'white'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  supportInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  supportAvatar: {
    width: '50px',
    height: '50px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    border: '2px solid rgba(255,255,255,0.2)'
  },
  supportTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold'
  },
  supportStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '5px',
    fontSize: '12px'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  statusOnline: {
    background: '#4ade80',
    boxShadow: '0 0 10px #4ade80'
  },
  statusOffline: {
    background: '#94a3b8'
  },
  statusText: {
    opacity: 0.9,
    fontSize: '12px'
  },
  userInfo: {
    background: 'rgba(255,255,255,0.1)',
    padding: '10px 15px',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  userName: {
    fontSize: '14px',
    fontWeight: 'bold'
  },
  userGrade: {
    fontSize: '12px',
    opacity: 0.9
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    background: '#f8fafc'
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#334155'
  },
  emptyText: {
    fontSize: '16px'
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  dateDivider: {
    display: 'flex',
    justifyContent: 'center',
    margin: '20px 0',
    position: 'relative'
  },
  dateText: {
    padding: '5px 15px',
    background: '#e2e8f0',
    borderRadius: '15px',
    fontSize: '11px',
    color: '#475569',
    fontWeight: '600'
  },
  messageWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px'
  },
  adminWrapper: {
    justifyContent: 'flex-start'
  },
  userWrapper: {
    justifyContent: 'flex-end'
  },
  adminAvatar: {
    width: '35px',
    height: '35px',
    background: '#1e293b',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px'
  },
  userAvatar: {
    width: '35px',
    height: '35px',
    background: '#10b981',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  messageBubble: {
    maxWidth: '60%',
    padding: '12px 16px',
    borderRadius: '18px',
    position: 'relative'
  },
  adminBubble: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderBottomRightRadius: '18px',
    borderBottomLeftRadius: '4px'
  },
  userBubble: {
    background: '#1e293b',
    color: 'white',
    borderBottomLeftRadius: '18px',
    borderBottomRightRadius: '4px'
  },
  adminName: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '4px'
  },
  messageText: {
    margin: '0 0 5px 0',
    fontSize: '14px',
    lineHeight: '1.5',
    wordBreak: 'break-word'
  },
  imageContainer: {
    marginTop: '8px'
  },
  messageImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '12px',
    cursor: 'pointer'
  },
  imageName: {
    display: 'block',
    fontSize: '11px',
    opacity: 0.7,
    marginTop: '4px'
  },
  messageTime: {
    fontSize: '11px',
    opacity: 0.7,
    display: 'block',
    textAlign: 'left',
    marginTop: '4px'
  },
  previewContainer: {
    padding: '10px 20px',
    background: '#f1f5f9',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  previewImage: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '8px'
  },
  previewText: {
    fontSize: '13px',
    color: '#475569'
  },
  inputArea: {
    padding: '20px',
    background: 'white',
    borderTop: '1px solid #e2e8f0'
  },
  inputWrapper: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '25px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border 0.3s'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  attachButton: {
    width: '45px',
    height: '45px',
    background: '#f1f5f9',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  sendButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '25px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  sendButtonActive: {
    background: '#1e293b',
    color: 'white'
  },
  sendButtonDisabled: {
    background: '#e2e8f0',
    color: '#94a3b8',
    cursor: 'not-allowed'
  },
  inputFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px',
    fontSize: '11px',
    color: '#64748b'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    position: 'relative',
    maxWidth: '90%',
    maxHeight: '90%'
  },
  modalImage: {
    maxWidth: '100%',
    maxHeight: '90vh',
    objectFit: 'contain',
    borderRadius: '8px'
  },
  modalClose: {
    position: 'absolute',
    top: '-40px',
    left: '-40px',
    fontSize: '40px',
    color: 'white',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    color: 'white'
  },
  loadingSpinner: {
    fontSize: '48px',
    marginBottom: '20px',
    animation: 'spin 1s linear infinite'
  }
}