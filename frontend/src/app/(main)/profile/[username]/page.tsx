"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Grid,
  BarChart2,
  ArrowUp,
  X,
  Settings,
  Users,
  MessageCircle,
  Share2,
  FileText,
  Hash,
  Target,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import Spinner, { ButtonSpinner } from "@/components/ui/Spinner";
import FollowButton from "@/components/ui/FollowButton";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";
import { getMyProfile, getProfile, updateProfile } from "@/lib/profile";
import { getFollowing, type FollowedCreator } from "@/lib/creator";
import { followStore } from "@/lib/followStore";

interface StatItem {
  name: string;
  score: number;
}

export default function ProfileScreen() {
  const { username } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"posts" | "stats" | "following">("posts");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [following, setFollowing] = useState<FollowedCreator[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);

  const { user, refreshUser } = useAuth();

  const isOwnProfile =
    !!user &&
    user.username.toLowerCase() === (username as string).toLowerCase();

  const profileFetcher = useCallback(
    () =>
      isOwnProfile ? getMyProfile() : getProfile(username as string),
    [isOwnProfile, username as string],
  );

  const { profile, setProfile, loading, error } = useProfile(profileFetcher);

  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (profile && isEditing) {
      setEditUsername(profile.username);
      setEditBio(profile.bio || "");
    }
  }, [profile, isEditing]);

  // The following list is the current user's own follow graph, so it's only
  // available (and only shown) on your own profile. Fetched lazily on first view.
  useEffect(() => {
    if (activeTab !== "following" || !isOwnProfile || followingLoaded) return;
    setFollowingLoading(true);
    getFollowing()
      .then((res) => {
        setFollowing(res.following);
        setFollowingLoaded(true);
        followStore.hydrate(res.following.map((c) => c.creator_id));
      })
      .catch((err) => console.error("Failed to load following:", err))
      .finally(() => setFollowingLoading(false));
  }, [activeTab, isOwnProfile, followingLoaded]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size={32} className="text-orange-500" label="Loading profile" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-red-500 text-center py-10 font-semibold">
        {error}
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="text-stone-500 text-center py-10 font-semibold">
        User not found
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError("");
      const updated = await updateProfile({
        username: editUsername,
        bio: editBio,
      });
      setProfile(updated);
      setIsEditing(false);
      if (
        updated.username.toLowerCase() !== (username as string).toLowerCase()
      ) {
        router.push(`/profile/${updated.username}`);
      }
      await refreshUser();
    } catch (err) {
      if (err instanceof Error) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to save changes");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const statsData: StatItem[] = [
    { name: "Cognitive Psychology", score: 94 },
    { name: "Algorithm Design", score: 88 },
    { name: "Molecular Biology", score: 72 },
    { name: "Global Economics", score: 64 },
  ];

  const engagement = [
    { label: "Upvotes", value: profile.total_upvotes, icon: ArrowUp },
    { label: "Comments", value: profile.total_comments, icon: MessageCircle },
    { label: "Shares", value: profile.total_shares, icon: Share2 },
  ];

  const formatCount = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`;

  return (
    <div className="max-w-[880px] mx-auto p-4 space-y-6">
      {/* ===== Header card with gradient cover ===== */}
      <section className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden border border-black/[0.04]">
        {/* Cover banner */}
        <div className="relative h-28 md:h-32 bg-gradient-to-r from-[#f36710] via-[#ff8a3d] to-[#00afef]">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          {isOwnProfile && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white/90 backdrop-blur-sm text-[#1b1c1c] text-sm font-semibold rounded-xl hover:bg-white transition active:scale-95 shadow-sm"
              >
                Edit Profile
              </button>
              {/* Only entry point to settings now that it's out of the nav bars. */}
              <Link
                href="/settings"
                aria-label="Settings"
                title="Settings"
                className="flex items-center justify-center w-9 h-9 bg-white/90 backdrop-blur-sm text-[#1b1c1c] rounded-xl hover:bg-white transition active:scale-95 shadow-sm"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        <div className="px-6 md:px-8 pb-7">
          {/* Avatar overlapping the banner */}
          <div className="flex flex-col md:flex-row md:items-end md:gap-5 -mt-14 md:-mt-16">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden ring-4 ring-white bg-[#efeded] shrink-0 mx-auto md:mx-0 shadow-md">
              <Image
                src={profile.avatar_url || "/logos/default-avatar.png"}
                alt={profile.username}
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="pt-3 md:pb-1 text-center md:text-left">
              <h1 className="text-2xl font-bold text-[#1b1c1c]">
                {profile.username}
              </h1>
              <p className="text-[#8d7165] text-sm mt-0.5">@{profile.username}</p>
            </div>
          </div>

          {/* Follower / following counts */}
          <div className="flex gap-6 mt-5 justify-center md:justify-start">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#1b1c1c] tabular-nums">
                {formatCount(profile.followers)}
              </span>
              <span className="text-sm text-[#5c5c5c]">Followers</span>
            </div>
            <button
              type="button"
              onClick={() => isOwnProfile && setActiveTab("following")}
              disabled={!isOwnProfile}
              className={`flex items-baseline gap-1.5 ${isOwnProfile ? "hover:opacity-70 transition-opacity cursor-pointer" : "cursor-default"}`}
            >
              <span className="font-bold text-[#1b1c1c] tabular-nums">
                {formatCount(profile.following)}
              </span>
              <span className="text-sm text-[#5c5c5c]">Following</span>
            </button>
          </div>

          {profile.bio && (
            <p className="text-sm text-[#5c5c5c] leading-relaxed mt-4 max-w-prose">
              {profile.bio}
            </p>
          )}

          {profile.primary_topics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
              {profile.primary_topics.map((topic) => (
                <span
                  key={topic}
                  className="px-3 py-1 bg-[#fef3ea] text-[#f36710] rounded-full text-xs font-semibold tracking-wide"
                >
                  #{topic}
                </span>
              ))}
            </div>
          )}

          {/* Engagement strip (surfaces upvotes / comments / shares) */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-[#efeded] rounded-2xl bg-[#faf9f8] border border-[#efeded]">
            {engagement.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center py-3.5 gap-1"
              >
                <div className="flex items-center gap-1.5 text-[#f36710]">
                  <Icon className="w-4 h-4" />
                  <span className="font-bold text-[#1b1c1c] tabular-nums">
                    {formatCount(value)}
                  </span>
                </div>
                <span className="text-[11px] text-[#8d7165] font-medium uppercase tracking-wide">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Primary stat cards ===== */}
      <section className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          {
            label: "Posts Created",
            value: `${profile.posts}`,
            icon: FileText,
            accent: "text-[#1b1c1c]",
            tint: "bg-[#fef3ea] text-[#f36710]",
          },
          {
            label: "Topics Covered",
            value: `${profile.primary_topics.length}`,
            icon: Hash,
            accent: "text-[#1b1c1c]",
            tint: "bg-[#e0f6fe] text-[#00afef]",
          },
          {
            label: "Accuracy",
            value: `${profile.authority_score.toFixed(0)}%`,
            icon: Target,
            accent: "text-[#f36710]",
            tint: "bg-[#fef3ea] text-[#f36710]",
          },
        ].map(({ label, value, icon: Icon, accent, tint }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-4 md:p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-black/[0.04] hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${tint}`}
            >
              <Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
            </div>
            <p className={`text-2xl md:text-3xl font-bold mt-3 tabular-nums ${accent}`}>
              {value}
            </p>
            <p className="text-[10px] md:text-xs text-[#8d7165] uppercase tracking-wider font-semibold mt-1">
              {label}
            </p>
          </div>
        ))}
      </section>

      {/* ===== Tabs ===== */}
      <section className="bg-white rounded-full p-1 flex w-max mx-auto shadow-sm border border-[#efeded]">
        {([
          { key: "posts", label: "Posts", icon: Grid },
          { key: "stats", label: "Stats", icon: BarChart2 },
          ...(isOwnProfile ? [{ key: "following", label: "Following", icon: Users }] : []),
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`px-6 md:px-8 py-2 flex items-center justify-center gap-2 font-semibold rounded-full transition-colors ${
              activeTab === key ? "bg-[#fef3ea] text-[#f36710]" : "text-[#5c5c5c] hover:text-[#1b1c1c]"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </section>

      {activeTab === "posts" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item, i) => (
            <div
              key={i}
              className={`aspect-square rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${i % 2 === 0 ? "bg-[#fef3ea] border border-[#f36710]/10" : "bg-white border border-[#d9d9d9]/30 border-l-[3px] border-l-[#00afef]"}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-[#00afef]">
                  {i % 2 !== 0 ? "Note" : ""}
                </span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${i % 2 === 0 ? "bg-white/80 text-[#f36710]" : "bg-[#e0f6fe] text-[#00afef]"}`}
                >
                  {i % 2 === 0 ? "FlashCard" : "Deep Dive"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#1b1c1c] leading-tight line-clamp-3">
                {i % 2 === 0
                  ? "What is the difference between a process and a thread?"
                  : "Cognitive Load Theory in Digital Environments"}
              </h3>
              <div className="flex items-center justify-end gap-1 text-[#f36710] mt-2">
                <ArrowUp className="w-3 h-3" />
                <span className="text-xs font-bold">{12 + i * 7}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="pb-8 space-y-3">
          {statsData.map((item) => (
            <div
              key={item.name}
              className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-black/[0.04] space-y-3"
            >
              <div className="flex justify-between items-end">
                <span className="font-bold text-[#1b1c1c]">{item.name}</span>
                <span
                  className={`text-sm font-bold tabular-nums ${item.score > 80 ? "text-[#f36710]" : "text-[#8d7165]"}`}
                >
                  {item.score}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#f5f5f5] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.score > 80 ? "bg-gradient-to-r from-[#00afef] to-[#2dbcfe]" : "bg-gradient-to-r from-[#f36710] to-[#ff8a3d]"}`}
                  style={{ width: `${item.score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "following" && (
        <div className="pb-8">
          {followingLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size={28} className="text-orange-500" label="Loading following" />
            </div>
          ) : following.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-semibold text-[#594137]">Not following anyone yet</p>
              <p className="text-sm text-[#8d7165] mt-1">Follow creators and they&apos;ll show up here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {following.map((c) => (
                <div
                  key={c.creator_id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-[#efeded] flex items-center gap-4 hover:shadow-md transition-shadow"
                >
                  <Link
                    href={`/profile/${c.username}`}
                    className="w-12 h-12 rounded-full overflow-hidden bg-[#f5f5f5] shrink-0"
                  >
                    <Image
                      src={c.avatar_url || "/logos/default-avatar.png"}
                      alt={c.username}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${c.username}`}
                      className="font-bold text-[#1b1c1c] hover:underline truncate block"
                    >
                      {c.username}
                    </Link>
                    <p className="text-sm text-[#8d7165] truncate">
                      {c.headline || `${c.follower_count} followers`}
                    </p>
                  </div>
                  <FollowButton creatorId={c.creator_id} author={c.username} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isEditing && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSaving && setIsEditing(false)}
          >
            <motion.div
              className="bg-white rounded-3xl w-full max-w-md p-8 relative shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsEditing(false)}
                className="absolute top-5 right-5 p-2 hover:bg-[#f5f5f5] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#594137]" />
              </button>
              <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
              <div className="space-y-5">
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-sm bg-[#f5f5f5]">
                    <Image
                      src={profile.avatar_url || "/logos/default-avatar.png"}
                      alt={profile.username}
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                {saveError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    {saveError}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#5c5c5c] tracking-wider uppercase">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-[#5c5c5c]">
                      @
                    </span>
                    <input
                      className="w-full border border-[#d9d9d9] rounded-xl pl-8 pr-4 py-3.5 focus:border-[#f36710] focus:ring-1 focus:ring-[#f36710] outline-none transition-all"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#5c5c5c] tracking-wider uppercase">
                    Bio
                  </label>
                  <textarea
                    className="w-full border border-[#d9d9d9] rounded-xl px-4 py-3.5 focus:border-[#f36710] focus:ring-1 focus:ring-[#f36710] outline-none resize-none h-28 transition-all"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <p className="text-xs text-[#8d7165]">
                  Learning interests live under{" "}
                  <Link href="/settings" className="font-semibold underline underline-offset-2">
                    Settings → Preferred Topics
                  </Link>
                  .
                </p>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="flex-1 py-4 rounded-xl font-bold text-[#5c5c5c] hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 bg-[#f36710] hover:bg-[#d45600] text-white font-bold py-4 rounded-xl shadow-md transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <ButtonSpinner>Saving</ButtonSpinner> : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
