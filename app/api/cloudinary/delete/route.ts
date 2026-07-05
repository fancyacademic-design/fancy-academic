import { NextRequest, NextResponse } from 'next/server';
import cloudinary from 'cloudinary';

// ✅ تهيئة Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(request: NextRequest) {
  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json(
        { success: false, error: 'publicId مطلوب' },
        { status: 400 }
      );
    }

    // حذف الصورة من Cloudinary
    const result = await cloudinary.v2.uploader.destroy(publicId);

    if (result.result === 'ok') {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'فشل حذف الصورة' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ خطأ في حذف الصورة:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}