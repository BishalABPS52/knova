import { useState } from "react";
import { saveInterests } from "@/lib/onboarding";

export function useOnboarding() {
    const [loading, setLoading] = useState(false);

    const submitInterests = async (
        interests: string[]
    ) => {
        setLoading(true);

        try {
            await saveInterests({
                interests,
            });
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        submitInterests,
    };
}