"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { login as apiLogin, register as apiRegister, logout as apiLogout } from "@/lib/auth";
import { telemetry } from "@/lib/telemetry";
import { feedCache } from "@/lib/feedCache";
import { exploreCache } from "@/lib/exploreCache";
import { followStore } from "@/lib/followStore";
import { getFollowing } from "@/lib/creator";
import { api } from "@/lib/api";
import { AuthUser, LoginRequest, RegisterRequest } from "@/types/authentication";

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const ONBOARDING_ROUTE = "/onboarding";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ["/login", "/register", "/about", "/help", "/contact"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Seed the global follow store from the server so every FollowButton shows the
    // right state on load. Fire-and-forget: a failure just leaves buttons unset.
    const hydrateFollows = () => {
        getFollowing()
            .then((res) => followStore.hydrate(res.following.map((c) => c.creator_id)))
            .catch(() => {});
    };

    const fetchCurrentUser = async () => {
        try {
            const data = await api<AuthUser>("/api/v1/users/me");
            setUser(data);
            hydrateFollows();
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    // Route guard
    useEffect(() => {
        if (!loading) {
            const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
            if (!user && !isPublicRoute) {
                router.push("/login");
            } else if (user && (pathname === "/login" || pathname === "/register")) {
                router.push(user.onboarding_completed ? "/" : ONBOARDING_ROUTE);
            } else if (user && !user.onboarding_completed && pathname !== ONBOARDING_ROUTE && !pathname.startsWith("/api")) {
                router.push(ONBOARDING_ROUTE);
            }
        }
    }, [user, loading, pathname, router]);

    const login = async (data: LoginRequest) => {
        const response = await apiLogin(data);
        setUser(response.user);
        hydrateFollows();
    };

    const register = async (data: RegisterRequest) => {
        const response = await apiRegister(data);
        setUser(response.user);
    };

    const logout = async () => {
        // Dispatch what we have before the cookie goes away, then clear the
        // buffer: the tab's session id outlives the login, so cumulative dwell
        // left behind would be re-sent under whoever signs in next. Not awaited —
        // the keepalive fetch is already in flight, and logout must not hang on
        // telemetry.
        void telemetry.flush();
        telemetry.reset();
        feedCache.clear();
        exploreCache.clear();
        followStore.clear();

        try {
            await apiLogout();
        } catch (err) {
            console.error("Logout request failed:", err);
        } finally {
            setUser(null);
            router.push("/login");
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: fetchCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
