// lib/support-data.ts

export interface Message {
  id: string
  text: string
  time: string
  date: string
  sender: 'user' | 'admin'
  userId: string
  userName: string
  userGrade?: string
}

export interface Chat {
  id: string
  userId: string
  userName: string
  userGrade: string
  messages: Message[]
  createdAt: string
  lastMessage: string
  status: 'open' | 'closed'
  unreadCount: number
  lastActivity: string
}

// دالة جلب كل المحادثات
export function getAllChats(): Chat[] {
  if (typeof window === 'undefined') return []
  const chats = localStorage.getItem('all_support_chats')
  return chats ? JSON.parse(chats) : []
}

// دالة حفظ المحادثات
export function saveAllChats(chats: Chat[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('all_support_chats', JSON.stringify(chats))
}

// دالة جلب محادثات مستخدم معين
export function getUserChats(userId: string): Chat[] {
  const allChats = getAllChats()
  return allChats.filter(chat => chat.userId === userId)
}

// دالة إنشاء محادثة جديدة
export function createNewChat(userId: string, userName: string, userGrade: string): Chat {
  const now = new Date()
  const newChat: Chat = {
    id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    userName,
    userGrade,
    messages: [],
    createdAt: now.toLocaleDateString('ar-EG'),
    lastMessage: '',
    status: 'open',
    unreadCount: 0,
    lastActivity: now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  }
  
  const allChats = getAllChats()
  allChats.unshift(newChat)
  saveAllChats(allChats)
  
  return newChat
}

// دالة إضافة رسالة
export function addMessage(chatId: string, message: Message) {
  const allChats = getAllChats()
  const chatIndex = allChats.findIndex(chat => chat.id === chatId)
  
  if (chatIndex !== -1) {
    allChats[chatIndex].messages.push(message)
    allChats[chatIndex].lastMessage = message.text.substring(0, 50) + (message.text.length > 50 ? '...' : '')
    allChats[chatIndex].lastActivity = now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    
    if (message.sender === 'user') {
      allChats[chatIndex].unreadCount += 1
    } else {
      allChats[chatIndex].unreadCount = 0
    }
    
    // تحديث اسم المستخدم والمرحلة إذا كانت رسالة من المستخدم
    if (message.sender === 'user') {
      allChats[chatIndex].userName = message.userName
      if (message.userGrade) {
        allChats[chatIndex].userGrade = message.userGrade
      }
    }
    
    saveAllChats(allChats)
  }
}

// دالة تحديث حالة المحادثة
export function updateChatStatus(chatId: string, status: 'open' | 'closed') {
  const allChats = getAllChats()
  const chatIndex = allChats.findIndex(chat => chat.id === chatId)
  
  if (chatIndex !== -1) {
    allChats[chatIndex].status = status
    saveAllChats(allChats)
  }
}

// دالة مسح المحادثة
export function deleteChat(chatId: string) {
  const allChats = getAllChats()
  const filteredChats = allChats.filter(chat => chat.id !== chatId)
  saveAllChats(filteredChats)
}

// دالة تحديث محادثة
export function updateChat(chatId: string, updatedChat: Partial<Chat>) {
  const allChats = getAllChats()
  const chatIndex = allChats.findIndex(chat => chat.id === chatId)
  
  if (chatIndex !== -1) {
    allChats[chatIndex] = { ...allChats[chatIndex], ...updatedChat }
    saveAllChats(allChats)
  }
}

// دالة الحصول على محادثة محددة
export function getChatById(chatId: string): Chat | null {
  const allChats = getAllChats()
  return allChats.find(chat => chat.id === chatId) || null
}

// دالة تحديث lastActivity
export function updateLastActivity(chatId: string) {
  const now = new Date()
  const allChats = getAllChats()
  const chatIndex = allChats.findIndex(chat => chat.id === chatId)
  
  if (chatIndex !== -1) {
    allChats[chatIndex].lastActivity = now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    saveAllChats(allChats)
  }
}