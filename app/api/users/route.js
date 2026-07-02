import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        id: doc.id,
        name: data.name,
        lastLogin: data.lastLogin,
        lastLoginType: typeof data.lastLogin
      });
    });
    return Response.json({ success: true, users });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}