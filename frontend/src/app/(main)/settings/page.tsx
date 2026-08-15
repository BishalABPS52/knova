"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  IdCard,
  Lock,
  Tag,
  HelpCircle,
  Info,
  Mail,
  LogOut,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  Plus,
  Search,
  Loader2,
} from "lucide-react";
import { getTopics, Topic } from "@/lib/reference";
import { getMyInterests, updateMyInterests } from "@/lib/interests";
import { useAuth } from "@/context/AuthContext";

type ModalType = "personal" | "password" | "topics" | null;

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const closeModal = () => setActiveModal(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activeModal]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] pb-24 font-sans selection:bg-orange-100">
      <main className="max-w-2xl mx-auto pt-10 px-4 sm:px-6 space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold text-[#1a1a1a] tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-[#8d7165]">
            Manage your account, security and learning preferences.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xs font-bold text-[#5c5c5c] uppercase tracking-wider px-1">
            Account
          </h2>
          <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-black/[0.04] overflow-hidden">
            <SettingsButton
              icon={<IdCard size={20} className="text-[#594137]" />}
              label="Personal Information"
              onClick={() => setActiveModal("personal")}
            />
            <Divider />
            <SettingsButton
              icon={<Lock size={20} className="text-[#594137]" />}
              label="Change Password"
              onClick={() => setActiveModal("password")}
            />
            <Divider />
            <SettingsButton
              icon={<Tag size={20} className="text-[#594137]" />}
              label="Preferred Topics"
              onClick={() => setActiveModal("topics")}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-bold text-[#5c5c5c] uppercase tracking-wider px-1">
            Support
          </h2>
          <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-black/[0.04] overflow-hidden">
            <SettingsButton
              icon={<HelpCircle size={20} className="text-[#594137]" />}
              label="Help / FAQ"
              onClick={() => router.push("/help")}
            />
            <Divider />
            <SettingsButton
              icon={<Info size={20} className="text-[#594137]" />}
              label="About"
              onClick={() => router.push("/about")}
            />
            <Divider />
            <SettingsButton
              icon={<Mail size={20} className="text-[#594137]" />}
              label="Contact Us"
              onClick={() => router.push("/contact")}
            />
          </div>
        </section>

        <section>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-black/[0.04] p-4 flex items-center gap-4 hover:bg-red-50/50 transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
              {loggingOut ? (
                <Loader2 size={18} className="text-red-600 animate-spin" />
              ) : (
                <LogOut size={18} className="text-red-600 ml-0.5" />
              )}
            </div>
            <span className="text-red-600 font-semibold text-sm">
              {loggingOut ? "Logging out…" : "Log Out"}
            </span>
          </button>

          <p className="text-center text-xs text-[#b8b0ab] mt-6">
            Knova · Learn a little every day
          </p>
        </section>
      </main>

      <AnimatePresence>
        {activeModal && (
          <ModalWrapper onClose={closeModal}>
            {activeModal === "personal" && (
              <PersonalInfoModal onClose={closeModal} />
            )}
            {activeModal === "password" && (
              <ChangePasswordModal onClose={closeModal} />
            )}
            {activeModal === "topics" && (
              <PreferredTopicsModal onClose={closeModal} />
            )}
          </ModalWrapper>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Subcomponents ---

function SettingsButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group text-left"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors border border-transparent group-hover:border-gray-100 shadow-sm shadow-black/0 group-hover:shadow-black/5">
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>
      <ChevronRight
        size={18}
        className="text-gray-400 group-hover:text-gray-900 transition-colors"
      />
    </button>
  );
}

function Divider() {
  return <div className="h-[1px] bg-gray-100 mx-4" />;
}

function ModalWrapper({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="relative w-full max-w-[512px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// --- Specific Modals ---

function PersonalInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">
          Personal Information
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>
      <div className="p-6 space-y-5 overflow-y-auto">
        <InfoField label="Username" value="@arivera_learns" />
        <InfoField label="Full Name" value="Alex Rivera" />
        <InfoField label="Email" value="alex.rivera@example.com" />
        <InfoField label="Date of Birth" value="August 12, 1995" />
      </div>
      <div className="px-6 py-5 bg-gray-50/80 border-t border-gray-100 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#f36710] text-white hover:bg-[#d45600] active:scale-95 transition-all shadow-sm shadow-orange-500/20"
        >
          Close
        </button>
      </div>
    </>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="px-4 py-3 rounded-xl bg-gray-50 text-gray-900 text-sm border border-gray-100 font-medium">
        {value}
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">
          Change Password
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>
      <div className="p-6 space-y-5 overflow-y-auto">
        <PasswordInput label="Current Password" />
        <PasswordInput label="New Password" />
        <PasswordInput label="Confirm New Password" />
      </div>
      <div className="px-6 py-5 bg-gray-50/80 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0">
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#f36710] text-white hover:bg-[#d45600] active:scale-95 transition-all shadow-sm shadow-orange-500/20"
        >
          Update Password
        </button>
      </div>
    </>
  );
}

function PasswordInput({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder="••••••••"
          className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 focus:border-[#f36710] focus:ring-1 focus:ring-[#f36710] outline-none text-gray-900 transition-colors bg-gray-50/50 text-sm tracking-wider font-medium placeholder:tracking-normal"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function PreferredTopicsModal({ onClose }: { onClose: () => void }) {
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the full topic vocabulary + the user's current interests together.
  useEffect(() => {
    let active = true;
    Promise.all([getTopics(), getMyInterests()])
      .then(([topics, interests]) => {
        if (!active) return;
        setAllTopics(topics);
        setSelected(new Set(interests.map((i) => i.name)));
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Failed to load topics");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const addTopic = (name: string) =>
    setSelected((prev) => new Set(prev).add(name));

  const removeTopic = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  // topics the user has picked (preserve the alphabetical topic order)
  const selectedTopics = allTopics.filter((t) => selected.has(t.name));

  // topics available to add: not selected, matching the search
  const q = search.trim().toLowerCase();
  const addable = allTopics.filter(
    (t) => !selected.has(t.name) && (!q || t.name.toLowerCase().includes(q)),
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateMyInterests([...selected]);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save interests");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">
          Preferred Topics
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="overflow-y-auto">
          {/* Your interests (removable) */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Your Interests
              </h4>
              <span className="text-xs font-semibold text-[#f36710]">
                {selected.size}
              </span>
            </div>
            {selectedTopics.length === 0 ? (
              <p className="text-sm text-gray-400">
                No interests yet. Add some below to personalize your feed.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedTopics.map((topic) => (
                  <span
                    key={topic.id}
                    className="px-3 py-1.5 bg-[#FEF3EA] text-[#f36710] text-sm font-semibold rounded-full flex items-center gap-1.5 border border-[#f36710]/20"
                  >
                    {topic.name}
                    <button
                      onClick={() => removeTopic(topic.name)}
                      className="hover:bg-orange-200/50 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${topic.name}`}
                    >
                      <X size={13} strokeWidth={3} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="px-6 pt-4 pb-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search topics to add..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f36710] focus:ring-1 focus:ring-[#f36710] outline-none text-sm bg-gray-50/50 transition-colors"
              />
            </div>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          </div>

          {/* Add topics */}
          <div className="px-6 pb-4">
            <div className="flex flex-wrap gap-2">
              {addable.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => addTopic(topic.name)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:border-[#f36710] hover:text-[#f36710] transition-all active:scale-95"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  {topic.name}
                </button>
              ))}
              {addable.length === 0 && (
                <p className="text-sm text-gray-400 py-4">
                  {q ? "No topics found." : "All topics added."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3 sticky bottom-0">
        <span className="text-xs font-medium text-gray-500">
          {selected.size} selected
        </span>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#f36710] text-white hover:bg-[#d45600] active:scale-95 transition-all shadow-sm shadow-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Interests
          </button>
        </div>
      </div>
    </>
  );
}