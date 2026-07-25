"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/ui/Spinner";

export default function ProfileRedirect() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.replace(`/profile/${user.username}`);
            } else {
                router.replace("/login");
            }
        }
    }, [user, loading, router]);

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-4">
                <Spinner size={40} className="text-orange-500" label="Redirecting to profile" />
                <p className="text-stone-500 font-semibold text-sm">Redirecting to profile...</p>
            </div>
        </div>
    );
}
