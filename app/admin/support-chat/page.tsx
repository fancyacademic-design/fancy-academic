'use client'
import { useState, useEffect, useRef } from 'react'

export default function AdminSupportChatPage() {
  // حالات تسجيل الدخول
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')

  // حالات الشات
  const [chats, setChats] = useState<any[]>([])
  const [selectedChat, setSelectedChat] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [modalImage, setModalImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // التحقق من تسجيل الدخول عند تحميل الصفحة
  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_auth')
    if (savedAuth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  // دالة تسجيل الدخول
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    // بيانات الدخول الصحيحة
    const validEmail = 'tomasmehany@support'
    const validPassword = 'Tomasmehany@2009'
    
    if (loginEmail === validEmail && loginPassword === validPassword) {
      setIsAuthenticated(true)
      setLoginError('')
      localStorage.setItem('admin_auth', 'true')
    } else {
      setLoginError('❌ البريد الإلكتروني أو كلمة السر غير صحيحة')
    }
  }

  // دالة تسجيل الخروج
  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('admin_auth')
    setLoginEmail('')
    setLoginPassword('')
  }

  // باقي دوال الشات (زي ما هي)
  useEffect(() => {
    if (isAuthenticated) {
      loadChats()
      const interval = setInterval(loadChats, 2000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const loadChats = () => {
    try {
      const allChats = JSON.parse(localStorage.getItem('all_support_chats') || '[]')
      allChats.sort((a: any, b: any) => {
        const timeA = new Date(a.lastActivity || a.createdAt || 0).getTime()
        const timeB = new Date(b.lastActivity || b.createdAt || 0).getTime()
        return timeB - timeA
      })
      setChats(allChats)
    } catch (error) {
      console.error('خطأ:', error)
      setChats([])
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedChat?.messages])

  const handleSend = () => {
    if (!selectedChat || message.trim() === '') return
    
    const now = new Date()
    const newMessage = {
      id: `msg_${Date.now()}`,
      text: message,
      time: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString('ar-EG'),
      sender: 'admin',
      userId: selectedChat.userId,
      userName: 'الدعم الفني'
    }
    
    const updatedMessages = [...selectedChat.messages, newMessage]
    const updatedChat = {
      ...selectedChat,
      messages: updatedMessages,
      lastMessage: message.length > 30 ? message.substring(0, 30) + '...' : message,
      lastActivity: now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      unreadCount: 0
    }
    
    const allChats = JSON.parse(localStorage.getItem('all_support_chats') || '[]')
    const updatedChats = allChats.map((chat: any) => 
      chat.id === selectedChat.id ? updatedChat : chat
    )
    
    localStorage.setItem('all_support_chats', JSON.stringify(updatedChats))
    setSelectedChat(updatedChat)
    setChats(updatedChats)
    setMessage('')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedChat) return
    
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
      const imageMessage = {
        id: `msg_${Date.now()}_img`,
        type: 'image',
        text: '',
        image: base64Image,
        fileName: file.name,
        fileSize: file.size,
        time: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('ar-EG'),
        sender: 'admin',
        userId: selectedChat.userId,
        userName: 'الدعم الفني'
      }
      
      const updatedMessages = [...selectedChat.messages, imageMessage]
      const updatedChat = {
        ...selectedChat,
        messages: updatedMessages,
        lastMessage: '📸 أرسل صورة',
        lastActivity: now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0
      }
      
      const allChats = JSON.parse(localStorage.getItem('all_support_chats') || '[]')
      const updatedChats = allChats.map((chat: any) => 
        chat.id === selectedChat.id ? updatedChat : chat
      )
      
      localStorage.setItem('all_support_chats', JSON.stringify(updatedChats))
      setSelectedChat(updatedChat)
      setChats(updatedChats)
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      setTimeout(() => setPreviewImage(null), 2000)
    }
    
    reader.readAsDataURL(file)
  }

  const closeChat = () => {
    if (!selectedChat) return
    
    if (window.confirm('هل تريد إغلاق هذه المحادثة؟')) {
      const allChats = JSON.parse(localStorage.getItem('all_support_chats') || '[]')
      const updatedChats = allChats.map((chat: any) => {
        if (chat.id === selectedChat.id) {
          return { ...chat, status: 'closed' }
        }
        return chat
      })
      
      localStorage.setItem('all_support_chats', JSON.stringify(updatedChats))
      setChats(updatedChats)
      setSelectedChat(updatedChats.find((chat: any) => chat.id === selectedChat.id))
      alert('تم إغلاق المحادثة')
    }
  }

  const reopenChat = () => {
    if (!selectedChat) return
    
    const allChats = JSON.parse(localStorage.getItem('all_support_chats') || '[]')
    const updatedChats = allChats.map((chat: any) => {
      if (chat.id === selectedChat.id) {
        return { ...chat, status: 'open' }
      }
      return chat
    })
    
    localStorage.setItem('all_support_chats', JSON.stringify(updatedChats))
    setChats(updatedChats)
    setSelectedChat(updatedChats.find((chat: any) => chat.id === selectedChat.id))
    alert('تم إعادة فتح المحادثة')
  }

  const deleteChat = (chatId: string) => {
    if (window.confirm('هل تريد حذف هذه المحادثة نهائياً؟')) {
      const allChats = JSON.parse(localStorage.getItem('all_support_chats') || '[]')
      const updatedChats = allChats.filter((chat: any) => chat.id !== chatId)
      
      localStorage.setItem('all_support_chats', JSON.stringify(updatedChats))
      setChats(updatedChats)
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(null)
      }
      alert('تم حذف المحادثة')
    }
  }

  const openImageModal = (imageSrc: string) => {
    setModalImage(imageSrc)
  }

  const closeImageModal = () => {
    setModalImage(null)
  }

  const filteredChats = chats.filter((chat: any) => {
    if (!chat || !chat.userName) return false
    return chat.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (chat.userGrade && chat.userGrade.toLowerCase().includes(searchTerm.toLowerCase()))
  })

  // إذا مش مسجل الدخول، اعرض صفحة تسجيل الدخول
  if (!isAuthenticated) {
    return (
      <div style={loginStyles.container}>
        <div style={loginStyles.loginBox}>
          <div style={loginStyles.header}>
            <h1 style={loginStyles.title}>🔐 TOMAS دخول الأدمن</h1>
            <p style={loginStyles.subtitle}>الرجاء إدخال بيانات الدخول</p>
          </div>
          
          <form onSubmit={handleLogin} style={loginStyles.form}>
            <div style={loginStyles.inputGroup}>
              <label style={loginStyles.label}>البريد الإلكتروني</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="tomas@t"
                style={loginStyles.input}
                required
                dir="ltr"
              />
            </div>
            
            <div style={loginStyles.inputGroup}>
              <label style={loginStyles.label}>كلمة السر</label>
              <div style={loginStyles.passwordContainer}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="********"
                  style={loginStyles.passwordInput}
                  required
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={loginStyles.togglePassword}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
            
            {loginError && (
              <div style={loginStyles.error}>
                {loginError}
              </div>
            )}
            
            <button type="submit" style={loginStyles.submitButton}>
              تسجيل الدخول
            </button>
          </form>
          
          <div style={loginStyles.footer}>
            <p style={loginStyles.footerText}>ⓘ هذه الصفحة مخصصة للمشرفين فقط</p>
          </div>
        </div>
      </div>
    )
  }

  // إذا مسجل الدخول، اعرض صفحة الشات
  return (
    <div style={styles.container}>
      {/* زر تسجيل الخروج */}
      <button onClick={handleLogout} style={logoutStyles.button}>
        🚪 تسجيل الخروج
      </button>

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>👨‍💼 إدارة محادثات الدعم</h1>
          <p style={styles.subtitle}>محادثة واحدة لكل طالب</p>
        </div>
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{chats.length}</span>
            <span style={styles.statLabel}>المحادثات</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{chats.filter(c => c.status === 'open').length}</span>
            <span style={styles.statLabel}>مفتوحة</span>
          </div>
        </div>
      </header>

      <div style={styles.mainLayout}>
        <div style={styles.sidebar}>
          <input
            type="text"
            placeholder="🔍 بحث باسم الطالب أو المرحلة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          
          <div style={styles.chatsList}>
            {filteredChats.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>💬</div>
                <h4 style={styles.emptyTitle}>لا توجد محادثات</h4>
                <p style={styles.emptyText}>انتظر حتى يبدأ الطلاب محادثات جديدة</p>
              </div>
            ) : (
              filteredChats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  style={{
                    ...styles.chatItem,
                    ...(selectedChat?.id === chat.id && styles.activeChatItem)
                  }}
                >
                  <div style={styles.chatItemHeader}>
                    <div style={styles.userInfo}>
                      <div style={styles.userAvatar}>
                        {chat.userName?.charAt(0) || 'ط'}
                      </div>
                      <div style={styles.userDetails}>
                        <h4 style={styles.userName}>{chat.userName || 'طالب'}</h4>
                        <p style={styles.userGrade}>{chat.userGrade || 'غير محدد'}</p>
                      </div>
                    </div>
                    <div style={styles.chatMeta}>
                      <span style={styles.chatTime}>
                        {new Date(chat.lastActivity).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {chat.unreadCount > 0 && (
                        <span style={styles.unreadBadge}>{chat.unreadCount}</span>
                      )}
                    </div>
                  </div>
                  
                  <p style={styles.chatPreview}>
                    {chat.lastMessage || 'لا توجد رسائل'}
                  </p>
                  
                  <div style={styles.chatFooter}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(chat.status === 'open' ? styles.statusOpen : styles.statusClosed)
                    }}>
                      {chat.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                    </span>
                    <span style={styles.messageCount}>
                      {chat.messages.length} رسالة
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={styles.chatWindow}>
          {selectedChat ? (
            <>
              <div style={styles.chatHeader}>
                <div style={styles.selectedUserInfo}>
                  <div style={styles.selectedUserAvatar}>
                    {selectedChat.userName?.charAt(0) || 'ط'}
                  </div>
                  <div>
                    <h3 style={styles.selectedUserName}>{selectedChat.userName || 'طالب'}</h3>
                    <p style={styles.selectedUserGrade}>{selectedChat.userGrade || 'غير محدد'}</p>
                  </div>
                </div>
                
                <div style={styles.headerActions}>
                  {selectedChat.status === 'open' ? (
                    <button onClick={closeChat} style={styles.closeChatBtn}>
                      🔒 إغلاق
                    </button>
                  ) : (
                    <button onClick={reopenChat} style={styles.reopenChatBtn}>
                      🔓 إعادة فتح
                    </button>
                  )}
                  <button onClick={() => deleteChat(selectedChat.id)} style={styles.deleteChatBtn}>
                    🗑️ حذف
                  </button>
                </div>
              </div>

              <div style={styles.messagesBox}>
                {selectedChat.messages.length === 0 ? (
                  <div style={styles.emptyMessages}>
                    <div style={styles.emptyIcon}>💬</div>
                    <h3 style={styles.emptyTitle}>لا توجد رسائل</h3>
                    <p style={styles.emptyText}>ابدأ المحادثة مع الطالب</p>
                  </div>
                ) : (
                  <>
                    {selectedChat.messages.map((msg: any) => (
                      <div 
                        key={msg.id} 
                        style={{
                          ...styles.message,
                          ...(msg.sender === 'admin' ? styles.messageAdmin : styles.messageUser)
                        }}
                      >
                        <div style={styles.messageHeader}>
                          <span style={styles.senderName}>
                            {msg.sender === 'admin' ? 'أنت' : selectedChat.userName}
                          </span>
                          <span style={styles.messageDate}>{msg.date}</span>
                        </div>
                        
                        {msg.text && <p style={styles.messageText}>{msg.text}</p>}
                        
                        {msg.image && (
                          <div style={styles.imageContainer}>
                            <img 
                              src={msg.image} 
                              alt={msg.fileName || 'صورة'} 
                              style={styles.messageImage}
                              onClick={() => openImageModal(msg.image)}
                            />
                            <span style={styles.imageName}>{msg.fileName}</span>
                          </div>
                        )}
                        
                        <span style={styles.messageTime}>{msg.time}</span>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {previewImage && (
                <div style={styles.previewContainer}>
                  <img src={previewImage} style={styles.previewImage} alt="معاينة" />
                  <span style={styles.previewText}>جاري إرسال الصورة...</span>
                </div>
              )}

              <div style={styles.inputBox}>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="اكتب ردك هنا..."
                  style={styles.input}
                />
                
                <label style={styles.fileButton}>
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
                  style={styles.sendButton} 
                  disabled={!message.trim()}
                >
                  إرسال
                </button>
              </div>
            </>
          ) : (
            <div style={styles.noSelection}>
              <div style={styles.noSelectionIcon}>💬</div>
              <h3 style={styles.noSelectionTitle}>اختر محادثة</h3>
              <p style={styles.noSelectionText}>اختر محادثة من القائمة لعرضها والرد عليها</p>
            </div>
          )}
        </div>
      </div>

      {modalImage && (
        <div style={styles.modal} onClick={closeImageModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <span style={styles.closeButton} onClick={closeImageModal}>×</span>
            <img src={modalImage} style={styles.modalImage} alt="صورة مكبرة" />
          </div>
        </div>
      )}
    </div>
  )
}

// استايلات تسجيل الدخول
const loginStyles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    direction: 'rtl',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  loginBox: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '10px'
  },
  subtitle: {
    color: '#6c757d',
    fontSize: '14px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e9ecef',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s',
    width: '100%',
    boxSizing: 'border-box'
  },
  passwordContainer: {
    position: 'relative',
    width: '100%'
  },
  passwordInput: {
    padding: '12px 16px',
    border: '2px solid #e9ecef',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s',
    width: '100%',
    boxSizing: 'border-box',
    paddingRight: '45px'
  },
  togglePassword: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6c757d',
    padding: '5px'
  },
  error: {
    background: '#f8d7da',
    border: '1px solid #f5c6cb',
    color: '#721c24',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    textAlign: 'center'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '10px'
  },
  footer: {
    marginTop: '30px',
    textAlign: 'center'
  },
  footerText: {
    color: '#adb5bd',
    fontSize: '12px'
  }
}

// استايلات زر تسجيل الخروج
const logoutStyles = {
  button: {
    position: 'fixed',
    top: '20px',
    left: '20px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    zIndex: 1000,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'all 0.3s'
  }
}

// استايلات الشات (زي ما هي من الكود الأصلي)
const styles: any = {
  container: {
    minHeight: '100vh',
    background: '#f1f5f9',
    direction: 'rtl',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    position: 'relative'
  },
  header: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '5px'
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '14px'
  },
  stats: {
    display: 'flex',
    gap: '20px'
  },
  statItem: {
    textAlign: 'center',
    background: '#f8fafc',
    padding: '10px 20px',
    borderRadius: '8px'
  },
  statNumber: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: '5px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280'
  },
  mainLayout: {
    display: 'flex',
    gap: '20px',
    height: 'calc(100vh - 180px)'
  },
  sidebar: {
    width: '350px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column'
  },
  searchInput: {
    width: '100%',
    padding: '15px',
    border: 'none',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
    background: '#f9fafb'
  },
  chatsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6b7280'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '15px',
    opacity: 0.5
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#4b5563'
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280'
  },
  chatItem: {
    padding: '15px',
    background: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '2px solid transparent'
  },
  activeChatItem: {
    background: '#dbeafe',
    borderColor: '#3b82f6'
  },
  chatItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1
  },
  userAvatar: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    background: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
    flexShrink: 0
  },
  userDetails: {
    overflow: 'hidden'
  },
  userName: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  userGrade: {
    margin: 0,
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px'
  },
  chatMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '5px',
    flexShrink: 0
  },
  chatTime: {
    fontSize: '11px',
    color: '#9ca3af',
    whiteSpace: 'nowrap'
  },
  unreadBadge: {
    background: '#ef4444',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
    minWidth: '20px',
    height: '20px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px'
  },
  chatPreview: {
    fontSize: '13px',
    color: '#4b5563',
    margin: '10px 0',
    lineHeight: '1.4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    minHeight: '2.8em'
  },
  chatFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px'
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '12px',
    whiteSpace: 'nowrap'
  },
  statusOpen: {
    background: '#d1fae5',
    color: '#065f46'
  },
  statusClosed: {
    background: '#f3f4f6',
    color: '#4b5563'
  },
  messageCount: {
    fontSize: '11px',
    color: '#9ca3af'
  },
  chatWindow: {
    flex: 1,
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column'
  },
  selectedUserInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  selectedUserAvatar: {
    width: '55px',
    height: '55px',
    borderRadius: '50%',
    background: '#10b981',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '22px',
    flexShrink: 0
  },
  selectedUserName: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937'
  },
  selectedUserGrade: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  closeChatBtn: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  reopenChatBtn: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  deleteChatBtn: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  chatHeader: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
    background: '#f9fafb'
  },
  messagesBox: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    background: '#ffffff'
  },
  emptyMessages: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    textAlign: 'center'
  },
  message: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '12px',
    position: 'relative'
  },
  messageAdmin: {
    alignSelf: 'flex-end',
    background: '#3b82f6',
    color: 'white',
    borderBottomLeftRadius: '4px'
  },
  messageUser: {
    alignSelf: 'flex-start',
    background: '#f3f4f6',
    borderBottomRightRadius: '4px'
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
    fontSize: '12px',
    opacity: 0.9
  },
  senderName: {
    fontWeight: '600'
  },
  messageDate: {
    fontSize: '11px'
  },
  messageText: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    lineHeight: '1.5',
    wordBreak: 'break-word'
  },
  imageContainer: {
    marginTop: '8px',
    marginBottom: '4px'
  },
  messageImage: {
    maxWidth: '100%',
    maxHeight: '250px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    border: '2px solid rgba(255,255,255,0.1)'
  },
  imageName: {
    display: 'block',
    fontSize: '11px',
    opacity: 0.7,
    marginTop: '4px'
  },
  previewContainer: {
    padding: '12px',
    background: '#f3f4f6',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  previewImage: {
    width: '50px',
    height: '50px',
    objectFit: 'cover',
    borderRadius: '6px'
  },
  previewText: {
    fontSize: '13px',
    color: '#4b5563'
  },
  messageTime: {
    fontSize: '11px',
    opacity: 0.7,
    display: 'block',
    textAlign: 'left',
    marginTop: '4px'
  },
  inputBox: {
    display: 'flex',
    padding: '15px',
    borderTop: '1px solid #e5e7eb',
    gap: '10px',
    alignItems: 'center',
    background: 'white'
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  fileButton: {
    background: '#6b7280',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.2s'
  },
  sendButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    minWidth: '80px',
    transition: 'background 0.2s'
  },
  noSelection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    textAlign: 'center',
    padding: '40px'
  },
  noSelectionIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5
  },
  noSelectionTitle: {
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#4b5563'
  },
  noSelectionText: {
    fontSize: '15px',
    color: '#6b7280'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    direction: 'rtl'
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
    borderRadius: '12px'
  },
  closeButton: {
    position: 'absolute',
    top: '-45px',
    left: '-45px',
    fontSize: '44px',
    color: 'white',
    cursor: 'pointer',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '50%',
    transition: 'background 0.2s'
  }
}