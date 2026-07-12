import { api } from "@/lib/api";
import { Profile } from "@/types/profile";

export function getProfile(username: string) {
    return api<Profile>(`/api/v1/users/${username}`);
}

export function updateProfile(data: Partial<Profile>) {
    return api<Profile>("/api/v1/users/profile", {
        method: "PUT",
        body: JSON.stringify(data),
    });
}