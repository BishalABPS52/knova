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
        loading: loading || context.loading,
        error,
    };
}