// lib/onboarding.ts

import { api } from "@/lib/api";
import {
  OnboardingRequest,
  OnboardingResponse,
} from "@/types/onboarding";

export const saveInterests = async (
  data: OnboardingRequest
): Promise<OnboardingResponse> => {
  return api<OnboardingResponse>("/users/interests", {
    method: "POST",
    body: JSON.stringify(data),
  });
};