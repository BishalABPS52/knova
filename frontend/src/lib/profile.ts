import { api } from "@/lib/api";
import { Profile } from "@/types/profile";

// Own profile: fetched by the authenticated session (id-based, never username).
export function getMyProfile() {
    return api<Profile>("/api/v1/users/me");
}

// Public profile by display handle. Usernames are not unique, so the backend
// resolves the handle deterministically; prefer getMyProfile() for the
// signed-in user's own profile.
export function getProfile(username: string) {
    return api<Profile>(`/api/v1/users/${username}`);
}

export function updateProfile(data: Partial<Profile>) {
    return api<Profile>("/api/v1/users/profile", {
        method: "PUT",
        body: JSON.stringify(data),
    });
}
