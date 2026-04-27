"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PieChart, TrendingUp, Settings, PiggyBank, Coins, LayoutList, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navItems = [
    { href: "/", label: "Dashboard", icon: PieChart },
    { href: "/allocation", label: "Phân bổ", icon: LayoutList },
    { href: "/investments", label: "Đầu tư", icon: TrendingUp },
    { href: "/savings", label: "Tiết kiệm", icon: PiggyBank },
    { href: "/gold", label: "Vàng", icon: Coins },
    { href: "/settings", label: "Cấu hình", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 md:sticky md:top-0 md:bottom-auto md:border-b md:border-t-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-5xl mx-auto px-2 md:px-4">
        <div className="flex justify-between md:justify-start md:space-x-8 h-14 md:h-16 md:items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex flex-col md:flex-row items-center justify-center w-full md:w-auto px-1 py-1 space-y-0.5 md:space-y-0 md:space-x-2 transition-colors ${
                  isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-900"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-50' : 'bg-transparent'}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={`text-[9px] md:text-sm font-medium ${isActive ? 'font-semibold text-indigo-600' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          {/* Logout — desktop only in nav row, hidden on mobile bottom bar */}
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center space-x-2 ml-auto text-slate-400 hover:text-red-500 transition-colors px-2 py-1"
            title="Đăng xuất"
          >
            <LogOut size={18} />
            <span className="text-sm">Đăng xuất</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
