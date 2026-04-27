"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function SyncButton({ lastSync }: { lastSync: string | null }) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatLastSync = (isoStr: string | null) => {
    if (!isoStr) return "Chưa có dữ liệu";
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + 
             " ngày " + date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return "Không xác định";
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/investments/sync", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.updatedCount > 0 ? `Đã đồng bộ giá thành công cho ${data.updatedCount} mã chứng khoán!` : `Đã rà soát nhưng không có biến động giá hoặc mã không hợp lệ.`);
        window.location.reload();
      } else {
        alert("Lỗi đồng bộ: " + data.error);
      }
    } catch {
      alert("Lỗi kết nối khi đồng bộ!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className={`flex items-center gap-2 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold py-2 px-5 rounded-2xl shadow-sm transition-all focus:outline-none ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'}`}
      >
        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        {loading ? "Đang dò tìm..." : "Làm mới Giá Thị trường"}
      </button>
      <p className="text-[10px] font-medium text-slate-400 italic">
        Cập nhật lần cuối: <span className="text-emerald-600 not-italic font-bold">{mounted ? formatLastSync(lastSync) : "---"}</span>
      </p>
    </div>
  );
}
