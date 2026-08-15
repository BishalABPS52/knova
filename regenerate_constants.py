#!/usr/bin/env python3
"""
Regenerate the machine-computed blocks of backend/ml/constants.py from the ML
training CSVs, keeping the backend's frozen constants in lockstep with a retrained
model set (see CLAUDE.md and the docstring at the top of constants.py).

Recomputes, from ml/data/:
    FEATURES_ALL, SCALE_FEATURES          <- knova_feature_config.json
    FEATURE_MEDIANS, ALS_MEAN             <- median()/mean() over knova_features_final.csv
    DWELL_MEAN_BY_TYPE / DWELL_STD_BY_TYPE,
    VELOCITY_MEAN_BY_TYPE / VELOCITY_STD_BY_TYPE  <- per-`type` mean/std over the same file
    _TOPIC_TAGS_RAW                       <- knova_topic_tags.csv
    MODEL_VERSION                         <- bumped (auto-increment or --model-version)

By default it is a DRY RUN: it prints what changed vs. the current constants and
writes nothing. Pass --write to patch backend/ml/constants.py in place (each target
assignment is replaced by name; the file's prose, helpers and hyperparameters are
left untouched).

Run this after retraining the notebook and BEFORE sync_models.py, so the artifacts
in backend/models/ and the constants that describe them ship together.

Usage
-----
  python regenerate_constants.py                 # dry run: show drift
  python regenerate_constants.py --write          # patch constants.py in place
  python regenerate_constants.py --write --model-version real-v1
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
DATA = ROOT / "ml" / "data"
CONSTANTS = BACKEND / "ml" / "constants.py"
sys.path.insert(0, str(BACKEND))

from ml import constants as C  # noqa: E402  (current values, for the drift report)

# Per-type dwell clip from the notebook (Step 3), applied before the z-score mean/std.
DWELL_CLIP = {"flashcard": 2.0, "short_note": 2.2, "mcq": 3.0, "text_content": 2.5}
DWELL_FLOOR = 0.1


# --------------------------------------------------------------------------
# Compute
# --------------------------------------------------------------------------
def compute(model_version: str | None) -> dict:
    config = json.loads((DATA / "knova_feature_config.json").read_text())
    features_all = list(config["FEATURES_ALL"])
    scale_features = list(config["scale_features"])

    df = pd.read_csv(DATA / "knova_features_final.csv")

    feature_medians = {f: round(float(df[f].median()), 6) for f in features_all}
    als_mean = round(float(df["als_score"].mean()), 5)

    # Reproduce the notebook's per-type z-score inputs: dwell_ratio_actual is clipped
    # per type, read_velocity_raw = word_count / actual_dwell_sec.
    dwell = df.copy()
    dwell["_clip"] = dwell["dwell_ratio_actual"]
    for t, upper in DWELL_CLIP.items():
        m = dwell["type"] == t
        dwell.loc[m, "_clip"] = dwell.loc[m, "dwell_ratio_actual"].clip(DWELL_FLOOR, upper)
    dwell_mean = {t: round(float(g["_clip"].mean()), 6) for t, g in dwell.groupby("type")}
    dwell_std = {t: round(float(g["_clip"].std()), 6) for t, g in dwell.groupby("type")}

    vel = df.dropna(subset=["read_velocity_raw"])
    velocity_mean = {t: round(float(g["read_velocity_raw"].mean()), 6) for t, g in vel.groupby("type")}
    velocity_std = {t: round(float(g["read_velocity_raw"].std()), 6) for t, g in vel.groupby("type")}

    tags = pd.read_csv(DATA / "knova_topic_tags.csv")
    topic_tags = {r["topic"]: r["tags"].split("|") for _, r in tags.iterrows()}

    return {
        "FEATURES_ALL": features_all,
        "SCALE_FEATURES": scale_features,
        "FEATURE_MEDIANS": feature_medians,
        "ALS_MEAN": als_mean,
        "DWELL_MEAN_BY_TYPE": dwell_mean,
        "DWELL_STD_BY_TYPE": dwell_std,
        "VELOCITY_MEAN_BY_TYPE": velocity_mean,
        "VELOCITY_STD_BY_TYPE": velocity_std,
        "_TOPIC_TAGS_RAW": topic_tags,
        "MODEL_VERSION": model_version or _bump_version(C.MODEL_VERSION),
    }


def _bump_version(current: str) -> str:
    """Increment a trailing -vN, else append -v2."""
    m = re.search(r"-v(\d+)$", current)
    if m:
        return current[: m.start()] + f"-v{int(m.group(1)) + 1}"
    return f"{current}-v2"


# --------------------------------------------------------------------------
# Render Python literals (matching constants.py's style)
# --------------------------------------------------------------------------
def render(name: str, value) -> str:
    if name == "MODEL_VERSION":
        return f'{name} = "{value}"'
    if name == "ALS_MEAN":
        return f"{name} = {value}"
    if isinstance(value, list):
        body = "".join(f'    "{v}",\n' for v in value)
        return f"{name} = [\n{body}]"
    if name == "_TOPIC_TAGS_RAW":
        lines = "".join(
            f"    {topic!r}: [{', '.join(repr(t) for t in tags)}],\n"
            for topic, tags in value.items()
        )
        return f"{name} = {{\n{lines}}}"
    # numeric dict (medians / z-score params)
    lines = "".join(f'    "{k}": {v},\n' for k, v in value.items())
    return f"{name} = {{\n{lines}}}"


# --------------------------------------------------------------------------
# Drift report + in-place patch
# --------------------------------------------------------------------------
def current_value(name: str):
    return getattr(C, name, None)


def report(computed: dict) -> None:
    print("Drift vs. current backend/ml/constants.py:\n")
    for name, new in computed.items():
        old = current_value(name)
        same = old == new
        flag = "  ok " if same else ">> CHANGED"
        print(f"  {flag}  {name}")
        if not same and name in ("ALS_MEAN", "MODEL_VERSION"):
            print(f"           {old!r} -> {new!r}")
        elif not same and isinstance(new, dict):
            keys = set(old or {}) | set(new)
            deltas = [k for k in keys if (old or {}).get(k) != new.get(k)]
            print(f"           {len(deltas)} key(s) differ: {sorted(deltas)[:6]}"
                  f"{' ...' if len(deltas) > 6 else ''}")
        elif not same and isinstance(new, list):
            print(f"           {old} -> {new}")


def patch(computed: dict) -> None:
    text = CONSTANTS.read_text()
    for name, value in computed.items():
        literal = render(name, value)
        if isinstance(value, (list, dict)):
            # Replace `NAME = [ ... ]` / `NAME = { ... }` up to the first line whose
            # first char is the matching close bracket (constants.py always formats
            # the closer at column 0).
            pattern = re.compile(rf"(?ms)^{re.escape(name)} = [\[{{].*?^[\]}}]")
        else:
            pattern = re.compile(rf"(?m)^{re.escape(name)} = .*$")
        new_text, n = pattern.subn(lambda _: literal, text, count=1)
        if n != 1:
            sys.exit(f"ERROR: could not locate `{name}` in {CONSTANTS} — aborting (no partial write).")
        text = new_text
    CONSTANTS.write_text(text)
    print(f"\nPatched {CONSTANTS}")


def main():
    ap = argparse.ArgumentParser(description="Regenerate the computed blocks of ml/constants.py.")
    ap.add_argument("--write", action="store_true", help="patch constants.py in place (default: dry run)")
    ap.add_argument("--model-version", default=None, help="explicit MODEL_VERSION (default: bump current)")
    args = ap.parse_args()

    computed = compute(args.model_version)
    report(computed)
    if args.write:
        patch(computed)
    else:
        print("\n(dry run — pass --write to patch constants.py)")


if __name__ == "__main__":
    main()
