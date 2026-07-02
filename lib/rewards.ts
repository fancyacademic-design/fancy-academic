// lib/rewards.ts
import { db } from './firebase';
import { doc, updateDoc, increment, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// ✅ تعريف المكافآت
export interface Reward {
  xp: number;
  coins: number;
  gems?: number;
  description?: string;
}

export const REWARDS: Record<string, Reward> = {
  // 🎯 مكافآت الدروس
  WATCH_LESSON: { xp: 5, coins: 3, description: 'مشاهدة درس' },
  COMPLETE_LESSON: { xp: 15, coins: 10, description: 'إنهاء درس' },
  
  // 📝 مكافآت الواجبات
  COMPLETE_HOMEWORK: { xp: 10, coins: 8, description: 'حل واجب' },
  PERFECT_HOMEWORK: { xp: 20, coins: 15, description: 'واجب ممتاز' },
  
  // 📝 مكافآت الامتحانات
  COMPLETE_EXAM: { xp: 25, coins: 15, description: 'إنهاء امتحان' },
  PERFECT_EXAM: { xp: 50, coins: 25, gems: 1, description: 'امتحان ممتاز' },
  
  // 🔥 مكافآت الـ Streak
  DAILY_STREAK: { xp: 5, coins: 3, description: 'دخول يومي' },
  WEEKLY_STREAK: { xp: 25, coins: 15, gems: 1, description: 'أسبوع متواصل' },
  
  // 🏆 مكافآت الإنجازات
  COMPLETE_MODULE: { xp: 40, coins: 20, description: 'إنهاء وحدة' },
  COMPLETE_SUBJECT: { xp: 100, coins: 50, gems: 2, description: 'إنهاء مادة' },
  BOSS_DEFEATED: { xp: 60, coins: 30, gems: 1, description: 'هزيمة Boss' },
  
  // 🎁 مكافآت إضافية
  FIRST_LOGIN: { xp: 20, coins: 10, gems: 1, description: 'أول دخول' },
  SHARE_APP: { xp: 10, coins: 5, description: 'مشاركة التطبيق' },
};

// ✅ حساب المستوى بناءً على XP
export const calculateLevel = (xp: number): number => {
  // كل 100 XP = مستوى واحد
  return Math.floor(xp / 100) + 1;
};

// ✅ حساب XP المطلوب للمستوى التالي
export const getNextLevelXP = (currentXP: number): number => {
  const currentLevel = calculateLevel(currentXP);
  return currentLevel * 100;
};

// ✅ نسبة التقدم للمستوى التالي (0-100%)
export const getLevelProgress = (xp: number): number => {
  const currentLevel = calculateLevel(xp);
  const currentLevelXP = (currentLevel - 1) * 100;
  const nextLevelXP = currentLevel * 100;
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return Math.min(Math.round(progress), 100);
};

// ✅ إضافة مكافأة للمستخدم
export const addReward = async (
  userId: string,
  rewardKey: keyof typeof REWARDS,
  customReward?: Reward
): Promise<{
  success: boolean;
  newXP: number;
  newCoins: number;
  newLevel: number;
  reward: Reward | null;
  message?: string;
}> => {
  try {
    const reward = customReward || REWARDS[rewardKey];
    if (!reward) {
      return {
        success: false,
        newXP: 0,
        newCoins: 0,
        newLevel: 1,
        reward: null,
        message: 'مكافأة غير معروفة',
      };
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return {
        success: false,
        newXP: 0,
        newCoins: 0,
        newLevel: 1,
        reward: null,
        message: 'المستخدم غير موجود',
      };
    }

    const data = userDoc.data();
    const currentXP = data.xp || 0;
    const currentCoins = data.coins || 0;
    const currentLevel = data.level || 1;

    // ✅ حساب القيم الجديدة
    const newXP = currentXP + reward.xp;
    const newCoins = currentCoins + reward.coins;
    const newLevel = calculateLevel(newXP);

    // ✅ التحقق من رفع المستوى
    const leveledUp = newLevel > currentLevel;

    // ✅ تحديث البيانات
    const updates: any = {
      xp: newXP,
      coins: newCoins,
      level: newLevel,
      lastActivity: serverTimestamp(),
    };

    if (reward.gems) {
      updates.gems = (data.gems || 0) + reward.gems;
    }

    await updateDoc(userRef, updates);

    // ✅ تسجيل تاريخ المكافأة
    const historyRef = doc(collection(db, 'reward_history'));
    await setDoc(historyRef, {
      userId: userId,
      rewardKey: rewardKey,
      reward: reward,
      xpGained: reward.xp,
      coinsGained: reward.coins,
      gemsGained: reward.gems || 0,
      newTotalXP: newXP,
      newTotalCoins: newCoins,
      leveledUp: leveledUp,
      timestamp: serverTimestamp(),
    });

    return {
      success: true,
      newXP,
      newCoins,
      newLevel,
      reward,
      message: leveledUp ? `🎉 رفعت المستوى إلى ${newLevel}!` : undefined,
    };
  } catch (error) {
    console.error('❌ خطأ في إضافة المكافأة:', error);
    return {
      success: false,
      newXP: 0,
      newCoins: 0,
      newLevel: 1,
      reward: null,
      message: 'حدث خطأ في الخادم',
    };
  }
};

// ✅ التحقق من الـ Streak اليومي
export const checkDailyStreak = async (userId: string): Promise<{
  streak: number;
  reward: Reward | null;
  message?: string;
}> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { streak: 0, reward: null, message: 'المستخدم غير موجود' };
    }

    const data = userDoc.data();
    const lastLogin = data.lastLogin?.toDate?.() || new Date(0);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const lastStr = lastLogin.toISOString().split('T')[0];

    let streak = data.streak || 0;

    // ✅ إذا دخل اليوم بالفعل
    if (todayStr === lastStr) {
      return { streak, reward: null, message: 'تم الدخول اليوم بالفعل' };
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastStr === yesterdayStr) {
      // ✅ استمرار الـ Streak
      streak += 1;
    } else {
      // ❌ انقطع الـ Streak
      streak = 1;
    }

    // ✅ تحديث الـ Streak في Firebase
    await updateDoc(userRef, {
      streak: streak,
      lastLogin: serverTimestamp(),
    });

    // ✅ مكافأة الـ Streak
    let reward: Reward | null = null;
    if (streak % 7 === 0 && streak > 0) {
      // ✅ كل 7 أيام مكافأة أسبوعية
      reward = REWARDS.WEEKLY_STREAK;
    } else {
      reward = REWARDS.DAILY_STREAK;
    }

    // ✅ إضافة المكافأة
    if (reward) {
      const result = await addReward(userId, 'DAILY_STREAK', reward);
      if (!result.success) {
        console.error('❌ فشل إضافة مكافأة الـ Streak');
      }
    }

    return { streak, reward };
  } catch (error) {
    console.error('❌ خطأ في التحقق من الـ Streak:', error);
    return { streak: 0, reward: null, message: 'حدث خطأ' };
  }
};

// ✅ الحصول على إحصائيات المستخدم
export const getUserStats = async (userId: string): Promise<{
  xp: number;
  coins: number;
  level: number;
  streak: number;
  gems: number;
  nextLevelXP: number;
  levelProgress: number;
} | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    const xp = data.xp || 0;
    const level = data.level || 1;
    const nextLevelXP = getNextLevelXP(xp);
    const levelProgress = getLevelProgress(xp);

    return {
      xp,
      coins: data.coins || 0,
      level,
      streak: data.streak || 0,
      gems: data.gems || 0,
      nextLevelXP,
      levelProgress,
    };
  } catch (error) {
    console.error('❌ خطأ في جلب الإحصائيات:', error);
    return null;
  }
};

// ✅ استيراد collection للاستخدام
import { collection } from 'firebase/firestore';