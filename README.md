# Cupboard Notes

Offline-first mobile recipe app built with **Expo + TypeScript**. Your recipes live in on-device SQLite; optional sync uses **your** cloud (Dropbox currently supported; Google Drive, iCloud, OneDrive, and Box planned). No managed server. Free, client-side only.

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
- [x] Pluggable cloud adapter architecture behind `CloudStorageAdapter`
- [x] Dropbox cloud storage integration (currently the only active provider in Settings UI)
- [x] Additional provider adapters implemented but not exposed (Google Drive, iCloud, OneDrive, Box) — ready for future activation
- [x] Settings UI: enable/disable providers; connect/disconnect
- [x] Full light/dark kitchen themes with System/Light/Dark preference persisted in SecureStore
- [x] `expo-secure-store` wrapper for future OAuth tokens
- [x] README with architecture, Mealie/AGPL note, run instructions

### Stubbed / next milestones

- [ ] Live Dropbox OAuth (PKCE) via `expo-auth-session` and full sync implementation
- [ ] Activate additional providers: Google Drive, OneDrive, Box OAuth (PKCE) via `expo-auth-session`
- [ ] Real iCloud ubiquity container / CloudKit in a custom dev client
- [ ] Persist enabled-provider prefs; bidirectional cloud sync of `recipe.json` + photo binaries under `/Cupboard Notes/{recipeId}/`
- [ ] Persist scale-mode overrides more richly; unit convert UI
- [ ] Stronger HTML heuristics when JSON-LD missing
- [ ] Search / tags / collections
- [ ] Automated tests for parsers & scale

### Cloud OAuth / scopes (planned)

| Provider | Auth approach | Scopes / notes |
|----------|---------------|----------------|
| Google Drive | OAuth 2.0 PKCE | `drive.file`; folder `/Cupboard Notes` |
| iCloud | Apple ubiquity / CloudKit | iOS only; no classic OAuth client |
| Dropbox | OAuth 2.0 PKCE | app-folder; `files.content.read/write` |
| OneDrive | Azure AD v2 / Graph | `Files.ReadWrite`, `offline_access` |
| Box | OAuth 2.0 | `root_readwrite` (narrow later) |

Tokens: `expo-secure-store` only. Never a central Cupboard Notes server.

## License / attribution

App code: project license as shipped. **Do not** copy Mealie (AGPL) source. schema.org vocabulary is used as a public vocabulary for import mapping only.
