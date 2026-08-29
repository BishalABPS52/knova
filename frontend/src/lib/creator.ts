import { api } from "@/lib/api";

export interface FollowResponse {
    creator_id: string;
    following: boolean;
    follower_count: number;
}

export interface FollowedCreator {
    creator_id: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    headline: string | null;
    follower_count: number;
}

export interface FollowingListResponse {
    following: FollowedCreator[];
    total: number;
}

export function followCreator(id: string) {
    return api<FollowResponse>(`/api/v1/creator/${id}/follow`, {
        method: "POST",
    });
}

export function unfollowCreator(id: string) {
    return api<FollowResponse>(`/api/v1/creator/${id}/follow`, {
        method: "DELETE",
    });
}

/** Creators the current (authenticated) user follows. */
export function getFollowing() {
    return api<FollowingListResponse>(`/api/v1/creator/following`);
}
