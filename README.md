# ocr-match-record

> Monorepo for OCR → field extraction → DB fuzzy matching, with a desktop runner (Electron) and future shared core/config tooling.

---

## Why this repo exists (first principles)

**Problem**: OCR text is noisy and the DB is large/heterogeneous. We must reliably map two key fields — *supplier* and *project* — from raw `.txt` to the correct DB row, at scale.

**Constraints**:
- OCR output is unstable (line breaks, near-characters, missing glyphs).
- DB columns/aliases vary by file; names are not fixed.
- Review cost must be minimized and traceable.

**Invariants** (design decisions that keep the system reliable):
1. **Two projects, one truth**: desktop runner (Electron) for production runs; trainer for config generation; both depend on a **shared core** (algorithms, thresholds, report schema).
2. **Configuration is versioned**: learned alias/normalize/domain rules live under `configs/v*/<sha>`; a pointer `configs/latest.json` selects the active set.
3. **One run = one bundle**: every execution writes a self-contained folder under `runs/` with `manifest.json`, `summary.md`, `results.csv` (single source of truth), optional `review.html`.
4. **No surprise IO in apps**: apps focus on wiring/UX; scoring/thresholds/buckets/report columns are defined once in the shared core (to be added in `packages/`).
5. **Deterministic tooling**: Node ≥ 18, pnpm workspaces, explicit scripts from the repo root.

For an overview of folders and files, see **PROJECT_STRUCTURE.md** at the repo root.

---

## Repo layout (short)
- **apps/electron-app** – Desktop runner: images → OCR HTTP → `.txt` → match → write a run bundle to `runs/`.
- **packages/** – Shared libraries (future `@ocr/core` with normalize/extract/match/bucketize/report-schema).
- **configs/** – Versioned matching configs, plus `latest.json` pointer.
- **runs/** – One bundle per execution (human & machine friendly).
- **examples/**, **sandbox/** – Samples & experiments. **Not built** by CI or root scripts.

> Full detail: `PROJECT_STRUCTURE.md`

---

## Prerequisites
- Node **>= 18**
- pnpm **(use a concrete version)**. If needed:
  ```bash
  corepack enable
  corepack prepare pnpm@9.12.2 --activate
  ```

---

## Install, Dev, Build (root commands)

```bash
# install
pnpm install

# dev: runs the Electron app's dev script
pnpm dev

# build: builds the Electron app
pnpm build
```

> The root scripts intentionally target **apps/electron-app** only. If you rename/move the app, update the filters in root `package.json` (see `PROJECT_STRUCTURE.md`).

---

## Run output (the run bundle)

Every run produces a folder like `runs/run_YYYYmmdd_HHMMSS__prod/` containing:
- `manifest.json` – inputs/params/stats/versions/fingerprints
- `summary.md` – one-page human summary
- `results.csv` – **single source of truth** (Top1 + field scores + bucket + reason)
- `results_top3.csv` *(optional)* – Top 3 candidates
- `review.html` + `review.json` *(optional)* – single-page reviewer (table on the left, image+txt on the right)

Minimal columns expected in `results.csv`:
```
file_name, q_supplier, q_project,
cand_f1, cand_f2, source_file, row_index,
s_field1, s_field2, score, bucket, reason,
source_txt, source_image, viewer_link,
run_id, config_version, config_sha, db_digest
```

---

## Configuration management

- Versioned under `configs/vX.Y.Z/<sha>/...` (e.g., `label_alias.json`, `normalize.user.json`, `domain.json`).
- The active configuration is selected via `configs/latest.json`:
  ```json
  { "path": "configs/v1.1.0/a1b2c3", "version": "1.1.0", "sha": "a1b2c3" }
  ```
- Each run records the **exact config version/sha** in its `manifest.json` and `results.csv`.

---

## Build scope (what *not* to build)

Root scripts and CI should **only** build packages under `apps/*` and `packages/*`.
`examples/` and `sandbox/` are **not** part of the build/publish surface.

> Example CI/root build command:
> ```bash
> pnpm -r --filter ./apps/* --filter ./packages/* run build
> ```

---

## Troubleshooting

- **Filter didn’t match** (`No projects matched the filters`)  
  Use a **path filter** to avoid package name confusion:
  ```json
  { "scripts": { "dev": "pnpm -F ./apps/electron-app dev", "build": "pnpm -F ./apps/electron-app build" } }
  ```

- **Invalid packageManager semver**  
  Ensure the root `package.json` uses a full version, e.g. `"packageManager": "pnpm@9.12.2"`.

- **Mixed lockfiles**  
  If migrating from npm/yarn, remove sub-package `package-lock.json`/`yarn.lock`. Only `pnpm-lock.yaml` should exist at the root.

---

## Next

- Add `packages/ocr-match-core` and migrate normalize/extract/match/bucketize/report schema into one library.
- Add `apps/trainer-cli` to produce versioned configs and update `configs/latest.json`.
- Generate `review.html` within each run bundle to enable one-click source tracing and side-by-side review.

---

## License
Internal project. Fill in your preferred license if needed.
