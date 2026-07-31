import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# Leading option labels the model sometimes emits despite the prompt ("A) x", "2. x").
_OPTION_LABEL_RE = re.compile(r"^\s*(?:[a-dA-D]|[1-9])\s*[.)\]:-]\s+")

MIN_OPTIONS = 2
MAX_OPTIONS = 6


class GeneratedMcq(BaseModel):
    """One question as returned by the LLM. Validation is strict on purpose:
    `service` validates item-by-item and drops the ones that fail, so a single
    malformed question never costs the whole batch."""

    question: str = Field(min_length=10, max_length=2000)
    options: list[str]
    correct_index: int = Field(ge=0)
    explanation: str | None = None
    difficulty: str | None = None

    @field_validator("question", "explanation", mode="before")
    @classmethod
    def _clean_text(cls, v):
        if v is None:
            return None
        return str(v).strip() or None

    @field_validator("options", mode="before")
    @classmethod
    def _clean_options(cls, v):
        if not isinstance(v, list):
            raise ValueError("options must be a list")

        cleaned = [_OPTION_LABEL_RE.sub("", str(opt).strip()) for opt in v]
        if not (MIN_OPTIONS <= len(cleaned) <= MAX_OPTIONS):
            raise ValueError(f"expected {MIN_OPTIONS}-{MAX_OPTIONS} options, got {len(cleaned)}")
        if any(not opt for opt in cleaned):
            raise ValueError("options must not be empty")
        if len({opt.casefold() for opt in cleaned}) != len(cleaned):
            raise ValueError("options must be distinct")
        return cleaned

    @field_validator("difficulty", mode="before")
    @classmethod
    def _clean_difficulty(cls, v):
        if v is None:
            return None
        label = str(v).strip().lower()
        return label if label in {"easy", "medium", "hard"} else None

    @model_validator(mode="after")
    def _check_correct_index(self):
        if self.correct_index >= len(self.options):
            raise ValueError("correct_index is out of range for options")
        return self


# API payloads
# ---------------------------------------------------------------------------

class QuizGenerationResult(BaseModel):
    """Outcome of one topic's generation run (also the manual-trigger response
    body when generation is run inline)."""

    topic_id: UUID
    topic_name: str
    created: int = 0
    requested: int = 0
    skipped: bool = False
    reason: str | None = None
    provider: str | None = None
    model: str | None = None


class QuizGenerationAccepted(BaseModel):
    topic_ids: list[UUID]
    scheduled: bool
    requested_per_topic: int
    detail: str


class McqItem(BaseModel):
    post_id: UUID
    question: str
    options: list[str]
    correct_index: int
    explanation: str | None = None
    difficulty: float
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TopicQuizResponse(BaseModel):
    topic_id: UUID
    topic_name: str
    total: int
    items: list[McqItem]
