from fastapi import APIRouter, Depends

from .schemas import (
    OnboardingRequest,
    OnboardingResponse,
)

from .service import save_user_interests
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


@router.post(
    "/interests",
    response_model=OnboardingResponse,
)
def save_interests(
    request: OnboardingRequest,
    current_user=Depends(get_current_user),
):
    save_user_interests(
        current_user,
        request.interests,
    )

    return OnboardingResponse(
        message="Interests saved successfully."
    )