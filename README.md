# Cupboard Notes

Offline-first mobile recipe app built with **Expo + TypeScript**. Your recipes live in on-device SQLite; optional sync uses **your** cloud (Google Drive, iCloud, Dropbox, OneDrive, or Box). No managed server. Free, client-side only.

> **Mealie note:** Cupboard Notes borrows *concepts* only (schema.org JSON-LD import, serving scale pipeline). **No Mealie/AGPL code was copied.** Parsers and types are original TypeScript preferring [schema.org/Recipe](https://schema.org/Recipe).

## How to run

```bash
cd /workspace/cupboard-notes
npm install
npx expo start
```

Then open in Expo Go (phone/tablet), iOS Simulator, Android emulator, or `w` for web.

> This environment may not fully boot Expo (no device / Metro quirks). Source is complete; run on a normal machine for a full interactive check.

**Scripts:** `npm start` · `npm run ios` · `npm run android` · `npm run web`

## Architecture

```
/workspace/cupboard-notes/
  app/                      # Expo Router screens
    index.tsx               # Recipe list
    recipe/[id].tsx         # Detail (phone stack / tablet split)
    recipe/edit.tsx         # Create & edit (all fields + photos)
    import.tsx              # HTTPS URL → JSON-LD import + paste fallback
    settings.tsx            # Top-5 cloud provider picker
  src/
    domain/                 # Recipe, Ingredient, Photo, ScaleRules types
    parse/                  # htmlFetch, jsonLd, heuristics, ingredientParse
    scale/                  # servings (linear + fixed), units (same-dimension)
    storage/                # SQLite repo, photo cache, share/export, SecureStore stub
    cloud/                  # CloudStorageAdapter + providers/ (5 stubs)
    store/                  # Zustand (recipes UI, enabled clouds, theme preference)
    ui/                     # PhotoGallery, ScaleServings, theme
    hooks/                  # useBreakpoint (tablet ≥768)
```

**Offline-first:** SQLite (`cupboard-notes.db`) is the source of truth. Cloud sync is optional/additive.

**Responsive:** On tablet width (≥768), recipe detail shows **ingredients beside instructions**.

## Milestone one — checklist

### Done in this starter

- [x] Expo SDK 57 + Expo Router + TypeScript project at `/workspace/cupboard-notes`
- [x] Recipe CRUD (list / create / edit / delete) with title, description, **notes**, ingredients, steps, servings, photos
- [x] SQLite persistence (offline source of truth) + light schema migrate for notes/photos
- [x] Serving scale UI: linear `qty × ratio`; **fixed** / unparsed lines unchanged (pinch, to taste, etc.)
- [x] Unit tables (metric/US) with same-dimension convert helpers
- [x] Import from HTTPS URL → JSON-LD `Recipe` (ingredients, instructions, yield, **image** URLs) → editor/save
- [x] Import failure path: paste / manual entry
- [x] Photos: import URLs cached locally; camera + gallery via `expo-image-picker`; gallery on detail/edit
- [x] Share recipe as JSON via OS share sheet (`expo-sharing` + Share fallback)
- [x] Tablet split layout (ingredients | instructions)
- [x] Pluggable **top-5** cloud adapters behind `CloudStorageAdapter`:
  1. Google Drive (stub furthest — session + syncRecipeBundle path)
  2. iCloud Drive (iOS-only; Android gracefully unavailable)
  3. Dropbox
  4. OneDrive (Microsoft Graph)
  5. Box (replaces discontinued Amazon Drive consumer API)
- [x] Settings UI: multi-select enable/disable providers; connect/disconnect stubs
- [x] Full light/dark kitchen themes with System/Light/Dark preference persisted in SecureStore
- [x] `expo-secure-store` wrapper for future OAuth tokens
- [x] README with architecture, Mealie/AGPL note, run instructions

### Completed features (Wishlist integration)

- [x] **Checkable instruction steps** — tap to check off steps while cooking; persists session state
- [x] **Recipe tags** — preset tags (breakfast, lunch, dinner, coffee, party) + custom tags; shown on cards
- [x] **Search & filter** — search by title/description/notes/ingredients; filter by included/excluded tags
- [x] **Grocery list** — select recipes to generate shopping list; merge ingredients; checkable items; local persistence
- [x] **Cooking mode** — large step display, main timer + per-step timers, keep-screen-awake, check-off integration
- [x] **Share & import recipes with friends** — improved JSON export/import for portable recipe sharing
- [x] **Recommendations feed** — curated seasonal recipes with one-tap import from `recommendations.json` (in-repo or fetched from GitHub)
- [x] **Local filesystem storage** — store recipe bundles in app Documents directory; participates in multi-store sync
- [x] **Multi-store sync** — last-write-wins merge strategy across Local + Dropbox (and future providers); recipe manifests per store; bidirectional sync

### Stubbed / next milestones

- [ ] Live OAuth (PKCE) for Dropbox, Google Drive, OneDrive, Box via `expo-auth-session`
- [ ] Real iCloud ubiquity container / CloudKit in a custom dev client
- [ ] Persist scale-mode overrides more richly; unit convert UI
- [ ] Stronger HTML heuristics when JSON-LD missing
- [ ] Automated tests for parsers & scale

### Storage sync strategy

**Multi-store consistency (last-write-wins):**

1. Recipe bundles stored as `/Cupboard Notes/{recipeId}/recipe.json` + `photos/*` in each enabled store
2. Each store maintains a `manifest.json` with recipe IDs, titles, and `updatedAt` timestamps
3. On sync:
   - Pull manifests from all connected stores (Local Folder, Dropbox, etc.)
   - Merge per-recipe by newest `updatedAt` (last write wins)
   - Update local SQLite as source of truth
   - Push merged set to all connected stores
4. Fully offline-capable; no backend required

**Available storage providers:**

| Provider | Status | Notes |
|----------|--------|-------|
| **Local Folder** | ✅ Working | App Documents directory; always available |
| **Dropbox** | ⚠️ OAuth stub | Planned: OAuth 2.0 PKCE, `files.content.read/write` |
| Google Drive | Stub only | Planned: OAuth 2.0 PKCE, `drive.file` scope |
| iCloud | Stub only | Planned: iOS ubiquity container / CloudKit |
| OneDrive | Stub only | Planned: Azure AD v2 / Graph, `Files.ReadWrite` |
| Box | Stub only | Planned: OAuth 2.0, `root_readwrite` |

Tokens: `expo-secure-store` only. Never a central Cupboard Notes server.

## License / attribution

App code: project license as shipped. **Do not** copy Mealie (AGPL) source. schema.org vocabulary is used as a public vocabulary for import mapping only.
