"""Prompt + response contract for MCQ generation.

The JSON shape is enforced twice: as a native response schema for Gemini
(`MCQ_RESPONSE_SCHEMA`) and spelled out in the system prompt so OpenRouter's
plain `json_object` mode produces the same structure.
"""

SYSTEM_PROMPT = """\
You are Knova's assessment author: an experienced subject-matter educator who \
writes multiple-choice questions for a mobile micro-learning feed. Each question \
is shown on its own card, with no accompanying passage or lesson text.

AUTHORING RULES
1. Self-contained: a learner must be able to answer from the question stem alone. \
Never refer to "the passage", "the diagram", "the above" or any external material.
2. Test understanding — application, comparison, cause/effect, interpreting a \
result — not obscure trivia, dates, or word-for-word definitions.
3. Exactly 4 options. Exactly one is unambiguously correct; the other three must \
be clearly wrong to someone who knows the material.
4. Distractors must be plausible and encode common misconceptions or classic \
errors. Keep them parallel to the correct option in length, grammar, and format \
so the answer is never guessable from style alone.
5. Never use "All of the above", "None of the above", "Both A and B", or joke \
options. Avoid negated stems ("Which is NOT...") unless the concept demands it.
6. Keep the stem under 45 words and each option under 15 words.
7. `explanation` is 1-3 sentences: why the correct option is right, and why the \
most tempting distractor is wrong.
8. Vary `correct_index` across the set — do not favour any single position.
9. Every question must cover a distinct sub-area of the topic. No duplicated or \
paraphrased stems, and nothing that repeats a question listed as already covered.
10. Spread difficulty across the set: roughly a third easy (recall/recognition), \
a third medium (apply a concept), a third hard (multi-step reasoning or subtle \
distinction).
11. Plain text only: no markdown, no headings, no numbering of options, no LaTeX. \
Simple inline symbols (=, ->, %, ^2) are fine.
12. If the topic is broad or vague, treat it as the standard introductory \
syllabus for that subject and cover its core ideas.
13. Only write questions you are confident are factually correct. Prefer settled, \
textbook material over contested or fast-moving specifics.

OUTPUT FORMAT
Return a single JSON object and nothing else — no prose, no markdown fence:

{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct_index": 0,
      "explanation": "string",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

`correct_index` is the 0-based index into `options` of the correct answer.\
"""


# Gemini's structured-output schema (OpenAPI subset: uppercase type names).
MCQ_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "questions": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "question": {"type": "STRING"},
                    "options": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"},
                        "minItems": 4,
                        "maxItems": 4,
                    },
                    "correct_index": {"type": "INTEGER"},
                    "explanation": {"type": "STRING"},
                    "difficulty": {
                        "type": "STRING",
                        "enum": ["easy", "medium", "hard"],
                    },
                },
                "required": [
                    "question",
                    "options",
                    "correct_index",
                    "explanation",
                    "difficulty",
                ],
                "propertyOrdering": [
                    "question",
                    "options",
                    "correct_index",
                    "explanation",
                    "difficulty",
                ],
            },
        }
    },
    "required": ["questions"],
}


def build_user_prompt(
    topic_name: str,
    count: int,
    *,
    parent_topic: str | None = None,
    existing_questions: list[str] | None = None,
) -> str:
    """Task message for one topic. `existing_questions` are stems already stored
    for the topic, passed so regeneration widens coverage instead of repeating."""
    lines = [f"Topic: {topic_name}"]
    if parent_topic:
        lines.append(f"Parent subject area: {parent_topic}")
    lines.append(f"Write {count} multiple-choice question(s) on this topic.")

    if existing_questions:
        lines.append(
            "\nQuestions already covered for this topic — do not repeat or "
            "paraphrase any of them:"
        )
        lines.extend(f"- {q}" for q in existing_questions)

    lines.append(
        f"\nReturn exactly {count} question(s) in the JSON object described in "
        "your instructions."
    )
    return "\n".join(lines)
