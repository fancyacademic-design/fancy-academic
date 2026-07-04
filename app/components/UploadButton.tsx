"use client";
import { useState } from "react";
import { CldUploadButton } from "next-cloudinary";

interface UploadButtonProps {
  onUpload: (url: string) => void;
  label?: string;
}

export default function UploadButton({ onUpload, label = "📤 رفع صورة" }: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);

  return (
    <CldUploadButton
      uploadPreset="exams-preset"
      signatureEndpoint="/api/sign-cloudinary-params"
      onUploadBegin={() => {
        setUploading(true);
      }}
      onSuccess={(result: any) => {
        setUploading(false);
        console.log("✅ تم الرفع:", result.info.secure_url);
        onUpload(result.info.secure_url);
      }}
      onError={() => {
        setUploading(false);
        alert("❌ فشل رفع الصورة");
      }}
    >
      <button
        type="button"
        style={{
          padding: "8px 16px",
          background: uploading ? "#9ca3af" : "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: uploading ? "not-allowed" : "pointer",
          fontSize: "13px",
          fontWeight: "600",
          transition: "all 0.3s",
        }}
        disabled={uploading}
      >
        {uploading ? "⏳ جاري الرفع..." : label}
      </button>
    </CldUploadButton>
  );
}