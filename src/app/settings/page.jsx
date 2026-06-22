'use client'

import { ChevronRight, BadgeInfo, User, Lock, Tag, HelpCircle, Info, Mail, LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <main className="max-w-[500px] mx-auto pt-6 px-4 pb-20">
      <header className="flex items-center gap-3 mb-8">
        <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-[#e4e2e2] transition-colors"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <div className="space-y-6">
        <section>
          <h2 className="text-[11px] font-bold text-[#5c5c5c] uppercase tracking-wider mb-2 px-1">Account</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-[#d9d9d9]/50 overflow-hidden divide-y divide-[#d9d9d9]/50">
            <button className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f5f3f3] flex items-center justify-center text-[#594137]"><BadgeInfo size={18} /></div>
                <span className="font-semibold text-sm text-[#1b1c1c]">Personal Information</span>
              </div>
              <ChevronRight size={20} className="text-[#594137]/50" />
            </button>
            <button className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f5f3f3] flex items-center justify-center text-[#594137]"><User size={18} /></div>
                <span className="font-semibold text-sm text-[#1b1c1c]">Edit Profile</span>
              </div>
              <ChevronRight size={20} className="text-[#594137]/50" />
            </button>
            <button className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f5f3f3] flex items-center justify-center text-[#594137]"><Lock size={18} /></div>
                <span className="font-semibold text-sm text-[#1b1c1c]">Change Password</span>
              </div>
              <ChevronRight size={20} className="text-[#594137]/50" />
            </button>
            <button className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f5f3f3] flex items-center justify-center text-[#594137]"><Tag size={18} /></div>
                <span className="font-semibold text-sm text-[#1b1c1c]">Preferred Topics</span>
              </div>
              <ChevronRight size={20} className="text-[#594137]/50" />
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-[11px] font-bold text-[#5c5c5c] uppercase tracking-wider mb-2 px-1">Support</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-[#d9d9d9]/50 overflow-hidden divide-y divide-[#d9d9d9]/50">
            <Link href="/help" className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f5f3f3] flex items-center justify-center text-[#594137]"><HelpCircle size={18} /></div>
                <span className="font-semibold text-sm text-[#1b1c1c]">Help / FAQ</span>
              </div>
              <ChevronRight size={20} className="text-[#594137]/50" />
            </Link>
            <Link href="/about" className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f5f3f3] flex items-center justify-center text-[#594137]"><Info size={18} /></div>
                <span className="font-semibold text-sm text-[#1b1c1c]">About</span>
              </div>
              <ChevronRight size={20} className="text-[#594137]/50" />
            </Link>
            <Link href="/contact" className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f5f3f3] flex items-center justify-center text-[#594137]"><Mail size={18} /></div>
                <span className="font-semibold text-sm text-[#1b1c1c]">Contact Us</span>
              </div>
              <ChevronRight size={20} className="text-[#594137]/50" />
            </Link>
          </div>
        </section>

        <Link href="/register" className="w-full bg-[#fef2f2] border border-[#ef4444]/20 rounded-2xl shadow-sm p-4 flex items-center justify-center gap-3 hover:bg-[#fee2e2] text-[#ef4444] transition-colors mt-8">
          <LogOut size={20} />
          <span className="font-bold text-sm">Log Out</span>
        </Link>
      </div>
    </main>
  );
}
