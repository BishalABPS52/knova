"use client";

import { useCallback, useEffect, useState } from "react";
import { Profile } from "@/types/profile";

/**
 * Fetch a profile through a caller-supplied fetcher (getMyProfile for the
 * signed-in user, getProfile for a public handle). Handles the lifecycle that a
 * real app needs: cancels stale responses when the input changes or the
 * component unmounts, and resets state between fetches.
 */
export function useProfile(fetcher: () => Promise<Profile>) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetcher();
            setProfile(data);
        } catch (err) {
            setProfile(null);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unknown error");
            }
        } finally {
            setLoading(false);
        }
    }, [fetcher]);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        setError("");

        fetcher()
            .then((data) => {
                if (!cancelled) setProfile(data);
            })
            .catch((err) => {
                if (cancelled) return;
                setProfile(null);
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("Unknown error");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [fetcher]);

    return {
        profile,
        setProfile,
        loading,
        error,
        refetch: fetchProfile,
    };
}
