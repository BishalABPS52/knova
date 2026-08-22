#!/usr/bin/env python3
"""Rebuild knova_content.csv text fields with real educational content.

Replaces the template/Faker placeholder text in every content row with
factually-correct compositions drawn from the curated knowledge base (kb/).

Preserved per row: content_id, type, topic, difficulty_score, creator_id,
published_at, flip_threshold_sec (flashcards). Recomputed: title,
description, front_desc, back_desc, options, correct_index, explanation,
word_count, expected_read_time_sec (original formula).

Usage:
    python build_real_content.py            # rewrite ml/data/knova_content.csv
    python build_real_content.py --dry-run  # preview without writing
"""
from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
DATA = HERE.parent / "data"

from kb import KB  # noqa: E402

EMPTY = ""
READ_WPM = 220  # reading speed used by the original generator


# ---------------------------------------------------------------------------
# deterministic per-row rng
# ---------------------------------------------------------------------------
def rng_for(content_id: int, type_idx: int) -> random.Random:
    return random.Random(f"knova-{content_id}-{type_idx}")


# ---------------------------------------------------------------------------
# composition helpers
# ---------------------------------------------------------------------------
NOTE_FRAMES = [
    "{d} {f}",
    "**Key point:** {d} {f}",
    "**Quick primer:** {d} {f}",
    "**Why it matters:** {f} {d}",
    "**Remember this:** {f} {d}",
    "{d} Worth noting: {f}",
]

TITLE_FRAMES = [
    "{t}, explained",
    "Understanding {t} in {topic}",
    "{t}: the essentials",
    "What is {t}? A quick guide",
    "{topic} fundamentals: {t}",
    "How {t} works",
]

BODY_FRAMES = [
    # every article body carries a second element (extra fact or related
    # concept) that short notes never include, so the two types cannot
    # ever compose identical text
    "{d} {f1} {f2}",
    "{d} {f1} Related: {d2}",
    "{d} {d2}",
    "{d} {f1} {f2}",
]

FRONT_FRAMES = [
    "What {va} {t}?",
    "Define: {t}",
    "{topic}: what does {t} mean?",
    "Flashback: {t}",
    "Can you explain {t}?",
    "Quick recall — {t}: what is it?",
]

MCQ_STEMS = [
    "Which statement best describes {t}?",
    "In {topic}, what {va} {t}?",
    "What does {t} refer to?",
    "Pick the correct description of {t}.",
    "Which option correctly defines {t}?",
    "What is the meaning of {t} in {topic}?",
    "Choose the accurate statement about {t}.",
    "{topic} quiz: which line matches {t} best?",
]


def def_sentence(term: str, phrase: str) -> str:
    """Dash-style definition — grammatical for singular, plural and mass terms."""
    return f"{term} — {phrase}."


def bare_phrase(phrase: str) -> str:
    """Definition phrase as a standalone MCQ option line."""
    return phrase[0].upper() + phrase[1:] + "."


# terms that end in 's' but take a singular verb
SINGULAR_S_TERMS = {
    "physics for cee", "chemistry for cee", "neet physics", "neet chemistry",
    "transfer news", "academic vs general ielts", "engineering mathematics",
    "cee syllabus", "pte reading fill-in-blanks", "expected goals",
    "semantics", "pragmatics", "ethics", "optics", "kinematics",
    "biomechanics", "geopolitics", "street food economics",
    "mock test series", "ipl analysis", "osmosis", "scale and proportion",
}


def looks_plural(term: str) -> bool:
    t = term.lower()
    return (
        t.endswith("s")
        and not t.endswith(("ss", "us", "is"))
        and t not in SINGULAR_S_TERMS
    )


def be_verb(term: str) -> str:
    return "are" if looks_plural(term) else "is"


# phase offsets so different content types never realign their frame/fact
# rotation (prevents short_note and text_content composing identical text)
TYPE_PHASE = {"short_note": 0, "text_content": 2, "flashcard": 4, "mcq": 6}


def compose_short_note(rng, entry, term, phrase, topic, idx, n_terms):
    v = idx // n_terms + TYPE_PHASE["short_note"]
    frame = NOTE_FRAMES[v % len(NOTE_FRAMES)]
    fact = entry["facts"][((v // len(NOTE_FRAMES)) + v) % len(entry["facts"])]
    return frame.format(d=def_sentence(term, phrase), f=fact)


def compose_text_content(rng, entry, term, phrase, topic, other_terms, idx, n_terms):
    v = idx // n_terms + TYPE_PHASE["text_content"]
    title = TITLE_FRAMES[v % len(TITLE_FRAMES)].format(t=term, topic=topic)
    frame = BODY_FRAMES[v % len(BODY_FRAMES)]
    o_term, o_phrase = other_terms
    body = frame.format(
        d=def_sentence(term, phrase),
        d2=def_sentence(o_term, o_phrase),
        f1=entry["facts"][((v // len(BODY_FRAMES)) + v) % len(entry["facts"])],
        f2=entry["facts"][(((v // len(BODY_FRAMES)) + v + 1)) % len(entry["facts"])],
    )
    return title, body


def compose_flashcard(rng, entry, term, phrase, topic, idx, n_terms):
    occ = idx // n_terms                      # which repeat of this concept
    front = FRONT_FRAMES[(occ + idx) % len(FRONT_FRAMES)].format(
        t=term, topic=topic, va=be_verb(term))
    back = bare_phrase(phrase) if occ % 2 == 0 else def_sentence(term, phrase)
    back += " " + entry["facts"][(occ // 2 + occ + 1) % len(entry["facts"])]
    return front, back


def compose_mcq(rng, entry, term, phrase, topic, siblings, idx, n_terms):
    """siblings: list of (term, phrase) pairs distinct from `term`.

    Options are the definition phrases themselves (no copula), so any mix of
    singular/plural/mass terms stays grammatical.
    """
    stem_i = (idx // n_terms) % len(MCQ_STEMS)
    question = MCQ_STEMS[stem_i].format(t=term, topic=topic, va=be_verb(term))
    correct = bare_phrase(phrase)
    distractors = [bare_phrase(p) for _, p in siblings]
    options = distractors[:3] + [correct]
    rng.shuffle(options)
    fact_step = ((idx // n_terms) // len(MCQ_STEMS)) % len(entry["facts"])
    explanation = def_sentence(term, phrase) + " " + entry["facts"][fact_step]
    return question, options, options.index(correct), explanation


def count_words(row_fields: dict, ctype: str) -> int:
    """Original generator's word-count contract."""
    if ctype == "mcq":
        n = len(row_fields["description"].split())
        n += sum(len(o.split()) for o in row_fields["options"])
        return n
    if ctype == "flashcard":
        return len(row_fields["front_desc"].split()) + len(row_fields["back_desc"].split())
    if ctype == "text_content":
        return len(row_fields["title"].split()) + len(row_fields["description"].split())
    return len(row_fields["description"].split())  # short_note


def read_time(word_count: int, difficulty: float) -> float:
    return round((word_count / READ_WPM) * 60 * (1 + difficulty * 0.5), 2)


# ---------------------------------------------------------------------------
# main rebuild
# ---------------------------------------------------------------------------
def rebuild(df: pd.DataFrame) -> pd.DataFrame:
    # stable per-(topic,type) ordering so concept cycling covers every term
    df = df.sort_values("content_id").reset_index(drop=True)
    counters: dict[tuple, int] = {}

    out_rows = []
    for _, row in df.iterrows():
        ctype, topic = row["type"], row["topic"]
        entry = KB.get(topic)
        if entry is None:
            raise KeyError(f"No knowledge base entry for topic: {topic!r}")

        terms = list(entry["terms"].items())
        key = (topic, ctype)
        idx = counters.get(key, 0)
        counters[key] = idx + 1

        term, phrase = terms[idx % len(terms)]
        rng = rng_for(int(row["content_id"]), hash(ctype) % 97)

        fields = {
            "title": EMPTY, "description": EMPTY,
            "front_desc": EMPTY, "back_desc": EMPTY,
            "options": EMPTY, "correct_index": EMPTY,
            "explanation": EMPTY,
        }

        if ctype == "short_note":
            fields["description"] = compose_short_note(
                rng, entry, term, phrase, topic, idx, len(terms))

        elif ctype == "text_content":
            others = [(t, p) for t, p in terms if t != term]
            fields["title"], fields["description"] = compose_text_content(
                rng, entry, term, phrase, topic, others[idx % len(others)],
                idx, len(terms))

        elif ctype == "flashcard":
            fields["front_desc"], fields["back_desc"] = compose_flashcard(
                rng, entry, term, phrase, topic, idx, len(terms))
            fields["flip_threshold_sec"] = row["flip_threshold_sec"]

        elif ctype == "mcq":
            siblings = [(t, p) for t, p in terms if t != term]
            q, options, ci, expl = compose_mcq(
                rng, entry, term, phrase, topic, siblings, idx, len(terms))
            fields["description"] = q
            fields["options"] = options          # keep as list until export
            fields["correct_index"] = int(ci)
            fields["explanation"] = expl

        else:
            raise ValueError(f"Unknown content type: {ctype!r}")

        wc = count_words(fields, ctype)
        rt = read_time(wc, float(row["difficulty_score"]))

        out = {
            "content_id": row["content_id"],
            "type": ctype,
            "topic": topic,
            "difficulty_score": row["difficulty_score"],
            "word_count": wc,
            **fields,
            "flip_threshold_sec": fields.get("flip_threshold_sec", EMPTY),
            "creator_id": row["creator_id"],
            "published_at": row["published_at"],
            "expected_read_time_sec": rt,
        }
        out_rows.append(out)

    result = pd.DataFrame(out_rows)

    # export formatting: python-repr options, integer-looking correct_index,
    # blanks instead of NaN for unused fields
    result["options"] = result["options"].apply(
        lambda v: str(v) if isinstance(v, list) else EMPTY)
    result["correct_index"] = result["correct_index"].apply(
        lambda v: str(int(v)) if v != EMPTY else EMPTY)
    for col in ("difficulty_score", "flip_threshold_sec",
                "expected_read_time_sec"):
        result[col] = result[col].apply(lambda v: "" if pd.isna(v) else v)
    return result


def validate(orig: pd.DataFrame, new: pd.DataFrame) -> bool:
    ok = True

    def fail(msg):
        nonlocal ok
        ok = False
        print(f"  !! {msg}")

    # untouched identity columns
    for col in ("content_id", "type", "topic", "difficulty_score",
                "creator_id", "published_at"):
        if not orig[col].astype(str).equals(new[col].astype(str)):
            fail(f"identity column changed: {col}")

    # nullability pattern per type
    expect = {
        "short_note": {"description"},
        "text_content": {"title", "description"},
        "flashcard": {"front_desc", "back_desc"},
        "mcq": {"description", "options", "correct_index", "explanation"},
    }
    for _, r in new.iterrows():
        filled = {c for c in ("title", "description", "front_desc", "back_desc",
                              "options", "correct_index", "explanation")
                  if r[c] not in (EMPTY, None) and str(r[c]) != ""}
        if filled != expect[r["type"]]:
            fail(f"row {r['content_id']} ({r['type']}): unexpected fill pattern {filled}")
            break

    # mcq integrity
    import ast
    for _, r in new[new.type == "mcq"].iterrows():
        opts = ast.literal_eval(r["options"])
        if len(opts) != 4 or len(set(opts)) != 4:
            fail(f"row {r['content_id']}: bad options"); break
        if not (0 <= int(r["correct_index"]) <= 3):
            fail(f"row {r['content_id']}: bad index"); break

    # word counts / read times recomputed consistently
    wc_ok = (new["word_count"] >= 8).all()
    rt_ok = all(
        abs(r.expected_read_time_sec - read_time(int(r.word_count), float(r.difficulty_score))) < 0.02
        for r in new.itertuples())

    # leftover template markers from the faker era
    markers = ["Deep Dive:", "often interacts with", "refers to the process of",
               "is fundamental because it governs", "essential for mastering"]
    blob = new["description"].fillna("") + new["title"].fillna("") \
        + new["front_desc"].fillna("") + new["back_desc"].fillna("")
    marker_hits = sum(m in blob.iloc[i] for i in range(len(blob)) for m in markers)

    # uniqueness measured on complete content units (a repeated prompt with a
    # different answer is fine; a fully identical card is not)
    def unit_dupes(mask, cols):
        sub = new.loc[mask, cols]
        return int(sub.duplicated().sum())

    fc_mask = new["type"] == "flashcard"
    mq_mask = new["type"] == "mcq"
    nt_mask = new["type"].isin(["short_note", "text_content"])
    dup_texts = (unit_dupes(fc_mask, ["front_desc", "back_desc"])
                 + unit_dupes(mq_mask, ["description", "options"])
                 + unit_dupes(nt_mask, ["description"]))

    print(f"  word_count>=8 everywhere      : {wc_ok}")
    print(f"  read_time matches formula     : {rt_ok}")
    print(f"  leftover template markers     : {marker_hits}")
    print(f"  duplicate texts               : {dup_texts}")
    return ok and wc_ok and rt_ok and marker_hits == 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    src = DATA / "knova_content.csv"
    orig = pd.read_csv(src, keep_default_na=False, dtype=str)
    numeric_cols = ["content_id", "difficulty_score", "creator_id"]
    orig[numeric_cols] = orig[numeric_cols].apply(pd.to_numeric)
    orig["word_count"] = pd.to_numeric(orig["word_count"])

    print(f"Loaded {len(orig)} rows, rebuilding text fields...")
    new = rebuild(orig)

    print("Validating...")
    good = validate(orig, new)

    sample = new.sample(4, random_state=0)
    for _, r in sample.iterrows():
        print("\n----", r["type"], "|", r["topic"])
        for c in ("title", "description", "front_desc", "back_desc",
                  "options", "correct_index", "explanation"):
            if str(r[c]):
                print(f"{c:>10}: {r[c]}")

    if not good:
        sys.exit("validation failed — CSV left untouched")
    if args.dry_run:
        print("\n[dry-run] no changes written")
        return

    new.to_csv(src, index=False)
    print(f"\nWrote {len(new)} rows -> {src}")


if __name__ == "__main__":
    main()
