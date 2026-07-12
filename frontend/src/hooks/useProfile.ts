"use client";

import { useEffect, useState } from "react";
import { getProfile } from "@/lib/profile";
import { Profile } from "@/types/profile";

export function useProfile(username: string) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await getProfile(username);
            setProfile(data);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unknown error");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (username) {
            fetchProfile();
        }
    }, [username]);

    return {
        profile,
        setProfile,
        loading,
        error,
        refetch: fetchProfile,
    };
}