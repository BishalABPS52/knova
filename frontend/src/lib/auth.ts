import { api } from "@/lib/api";
import { LoginRequest, RegisterRequest, AuthResponse, } from "@/types/authentication";

export function login(data: LoginRequest) {
    return api<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function register(data: RegisterRequest) {
    return api<AuthResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function refresh() {
    return api<AuthResponse>("/api/v1/auth/refresh", {
        method: "POST",
    });
}

export function logout() {
    return api<{ detail: string }>("/api/v1/auth/logout", {
        method: "POST",
    });
}