"use client";

import { useState } from "react";
import { useAuth as useAuthContext } from "@/context/AuthContext";
import {
    LoginRequest,
    RegisterRequest,
} from "@/types/authentication";

export function useAuth() {
    const context = useAuthContext();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function login(data: LoginRequest) {
        try {
            setLoading(true);
            setError("");
            await context.login(data);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Login failed");
            }
            throw err;
        } finally {
            setLoading(false);
        }
    }

    async function register(data: RegisterRequest) {
        try {
            setLoading(true);
            setError("");
            await context.register(data);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Registration failed");
            }
            throw err;
        } finally {
            setLoading(false);
        }
    }

    return {
        user: context.user,
        login,
        register,
        logout: context.logout,
        // Submit state for THIS form only. It must not fold in context.loading:
        // that flag means "still checking whether a session exists" and stays
        // true until GET /users/me settles, so OR-ing them left the login and
        // register buttons disabled and spinning from page load whenever the API
        // was slow or unreachable (e.g. opening the app from a phone).
        loading,
        // Session bootstrap, for callers that need to wait on the user lookup.
        initializing: context.loading,
        error,
    };
}