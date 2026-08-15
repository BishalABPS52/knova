# Retraining Knova on real telemetry

Knova ships with models trained on synthetic data. Once real engagement has been
captured, this is how to retrain on it and redeploy — the loop the telemetry work
was built to close. Each step has a script; the only long-running, judgement-heavy
step (running the notebook) is yours to drive.

```
 capture ──▶ export ──▶ retrain ──▶ regenerate constants ──▶ sync models ──▶ restart
 (live)      script      notebook     script                  script
```

## 0. Prerequisites

- Real interactions in the DB. Telemetry capture is always on; `GET /posts/feed`
  logs impressions and the browser reports dwell/quiz/flip. Confirm there are rows
  with `view_count > 0` (served-but-unseen rows are excluded from training).
- The direct (non-pooler) Postgres URL, as `EXPORT_DATABASE_URL`.
- The ML notebook environment (the notebook `!pip install`s its own deps).

## 1. Export the DB → training CSVs

```bash
EXPORT_DATABASE_URL='postgresql://…:5432/postgres' \
    python export_training_data.py --out ml/data/_export
# add --organic-only to exclude the seeded synthetic rows
```

Writes `knova_{interactions,users,content,follows,interests}.csv` in the exact
schema the notebook consumes, plus `_ext_id_map.json` (stable integer ids for
organic rows — keep it, so repeat exports stay consistent). Snapshots
(`is_interest_match`, `creator_followed`, `difficulty_gap`) are exported as stored,
never recomputed, to avoid leaking future state into training rows.

Sanity check before retraining:
```bash
head -1 ml/data/_export/knova_interactions.csv   # must equal the 16-col contract
diff <(head -1 ml/data/_export/knova_interactions.csv) <(head -1 ml/data/knova_interactions.csv)
```

## 2. Retrain (notebook)

Point `ml/notebook/Knova_Engine.ipynb` at the exported CSVs and run it top to
bottom. It rebuilds every artifact: ALS, TF-IDF, the LightGBM ranker, the
RobustScaler, and the type encoder. Two things to know:

- **Step 1 / cell 0** originally generate synthetic data and derive
  `knova_topics.csv` / `knova_interests.csv` from an in-memory `df_users`. When
  training on real data, load `df_users`/`df_content`/`df_interactions` from the
  exported CSVs instead of generating them. `knova_interests.csv` is rebuilt from
  each user's `interests` column, so keep that column populated (the export does).
- **`FEATURES_ALL` order is load-bearing** — `ranker.predict` depends on it. The
  notebook writes it to `knova_feature_config.json`; step 3 below reads it back.

Copy the produced `*.pkl` and the intermediate `knova_features_final.csv`,
`knova_feature_config.json`, `knova_topic_tags.csv` into `ml/models/` and
`ml/data/`.

## 3. Regenerate the frozen constants

`backend/ml/constants.py` bakes values computed from the training CSVs so the
backend has no runtime CSV dependency. They must move in lockstep with the models.

```bash
python regenerate_constants.py            # dry run: shows drift vs. current constants
python regenerate_constants.py --write     # patch constants.py in place
```

Recomputes `FEATURE_MEDIANS`, `ALS_MEAN`, the per-type dwell/velocity z-score
params, `FEATURES_ALL`/`SCALE_FEATURES`, `_TOPIC_TAGS_RAW`, and bumps
`MODEL_VERSION` (override with `--model-version real-v1`). On today's synthetic
CSVs it is a no-op except the version bump — that's the fidelity check.

## 4. Sync artifacts into the backend

```bash
python sync_models.py            # dry run: integrity diff
python sync_models.py --write     # copy ml/models/*.pkl -> backend/models/ + manifest
```

Writes `backend/models/_manifest.json` (the `MODEL_VERSION` and a sha256 per
artifact) so served rankings are traceable to a retrain. `knova_thompson_sampler.pkl`
is copied but not loaded — the backend rebuilds that posterior live from vote
counters.

## 5. Restart & verify

```bash
cd backend && .venv/bin/python -c "import main"     # artifacts load cleanly
.venv/bin/uvicorn main:app --reload
```

`ModelContainer.load()` reads the pickles at the first feed request. Confirm new
interaction rows carry the bumped `model_version`, and spot-check that
`GET /posts/feed` still returns a sane ordering.

---

### Live features vs. the ranker's training distribution

The backend serves ranker features from live per-user telemetry
(`LIVE_FEATURES_ENABLED`, default on) — including `kg_readiness`, which tracks the
user's quiz mastery in a topic. Retraining is what keeps the model calibrated to
those live inputs: the ranker was fit on the training CSVs' feature distribution,
so a retrain on real data (whose distributions differ) tightens the match between
what is served and what the model learned. If you ever need the frozen-median
behaviour for an A/B comparison, set `LIVE_FEATURES_ENABLED=false`.
