#!/usr/bin/env python3
"""
Copy retrained ML artifacts from ml/models/ into backend/models/, the directory the
backend actually loads (settings.ML_MODELS_PATH). Writes a manifest recording the
MODEL_VERSION and a sha256 of every artifact, so what the backend serves is always
traceable to a specific retrain.

Run this AFTER regenerate_constants.py (which bumps MODEL_VERSION), so the artifacts
and the constants that describe them are deployed together. Restart the backend
afterwards — ModelContainer.load() reads the pickles once, at first feed request.

Note: knova_thompson_sampler.pkl is copied for completeness but the backend does
NOT load it — it rebuilds the Beta posterior live from Post vote counters
(see backend/src/recommendation/thompson.py).

Usage
-----
  python sync_models.py            # dry run: show what would copy + integrity diff
  python sync_models.py --write     # copy artifacts and write the manifest
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
SRC = ROOT / "ml" / "models"
DST = BACKEND / "models"
MANIFEST = "_manifest.json"
sys.path.insert(0, str(BACKEND))

from ml import constants as C  # noqa: E402


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser(description="Sync ml/models -> backend/models with a manifest.")
    ap.add_argument("--write", action="store_true", help="perform the copy (default: dry run)")
    ap.add_argument("--src", default=str(SRC))
    ap.add_argument("--dst", default=str(DST))
    args = ap.parse_args()

    src, dst = Path(args.src), Path(args.dst)
    if not src.is_dir():
        sys.exit(f"Source not found: {src}")

    src_pkls = sorted(p.name for p in src.glob("*.pkl"))
    if not src_pkls:
        sys.exit(f"No .pkl artifacts in {src}")
    dst_pkls = {p.name for p in dst.glob("*.pkl")}

    print(f"MODEL_VERSION (from constants): {C.MODEL_VERSION}")
    print(f"  source: {src}  ({len(src_pkls)} artifacts)")
    print(f"  target: {dst}\n")

    only_in_dst = sorted(dst_pkls - set(src_pkls))

    changed = []
    for name in src_pkls:
        s = sha256(src / name)
        d = sha256(dst / name) if (dst / name).exists() else None
        state = "NEW" if d is None else ("changed" if s != d else "same")
        if state != "same":
            changed.append(name)
        print(f"  {state:8} {name}")
    if only_in_dst:
        print(f"\n  (only in target, will be left as-is: {only_in_dst})")

    if not args.write:
        print(f"\n(dry run — {len(changed)} artifact(s) would change; pass --write to copy)")
        return

    dst.mkdir(parents=True, exist_ok=True)
    manifest = {
        "model_version": C.MODEL_VERSION,
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "artifacts": {},
    }
    for name in src_pkls:
        shutil.copy2(src / name, dst / name)
        p = dst / name
        manifest["artifacts"][name] = {"sha256": sha256(p), "bytes": p.stat().st_size}

    (dst / MANIFEST).write_text(json.dumps(manifest, indent=2))
    print(f"\nCopied {len(src_pkls)} artifact(s); wrote {dst / MANIFEST}")
    print("Restart the backend so ModelContainer.load() picks up the new artifacts.")


if __name__ == "__main__":
    main()
