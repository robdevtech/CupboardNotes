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

## Releases / Friend Testing

Cupboard Notes uses **EAS Build** to create production Android APK files for sideloading and friend testing. APK binaries are **never committed** to git; they are built via EAS and attached to [GitHub Releases](https://github.com/robdevtech/CupboardNotes/releases) on this repo.

### Prerequisites (one-time setup)

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Authenticate with Expo**:
   ```bash
   eas login
   ```
   Use your Expo account credentials. The project owner must do this first.

3. **Link the EAS project** (first time only):
   ```bash
   eas init
   ```
   This will:
   - Create or link to an Expo project
   - Update `app.json` with `extra.eas.projectId`
   - Replace the `PLACEHOLDER_REPLACE_AFTER_EAS_INIT` value in `app.json`

4. **Set up environment variables** for EAS (required for Dropbox integration):
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_DROPBOX_APP_KEY --value YOUR_DROPBOX_APP_KEY
   ```
   This ensures the Dropbox Connect button works in APK builds. Do NOT commit secrets to git.

### Building an Android APK for testing

The `eas.json` configuration includes three profiles:

- **`preview`**: Production-ready APK for sideload/friend testing (recommended for releases)
- **`development`**: Development build with DevTools (requires `expo-dev-client`)
- **`production`**: AAB format for Play Store submission

To build an APK for friend testing:

```bash
# Using npm script (recommended)
npm run eas:build:android:apk

# Or directly with EAS CLI
eas build --platform android --profile preview
```

The build runs in the cloud. When complete:
- Download the `.apk` file from the EAS dashboard or the URL provided in the terminal
- Test it locally on your device or emulator

### Publishing to GitHub Releases

1. **Create a new git tag** for the release:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Build the APK** (if not already built):
   ```bash
   npm run eas:build:android:apk
   ```

3. **Create a GitHub Release**:
   - Go to [Releases](https://github.com/robdevtech/CupboardNotes/releases)
   - Click "Draft a new release"
   - Select the tag (e.g., `v1.0.0`)
   - Add release notes
   - **Attach the APK** downloaded from EAS Build
   - Click "Publish release"

4. **Share the Release URL** with friends for testing:
   ```
   https://github.com/robdevtech/CupboardNotes/releases/latest
   ```

### Optional: Automated GitHub Release workflow

A GitHub Actions workflow can automate APK attachment to releases when a tag is pushed. See `.github/workflows/eas-release.yml` for the implementation (if added). This requires:
- `EXPO_TOKEN` as a GitHub Actions secret (get it from `eas whoami --tokens`)
- Tag-based trigger (e.g., `v*`)

The workflow downloads the EAS build artifact and attaches it to the GitHub Release automatically.

### Important notes

- **APK binaries are never committed to git** — they are build artifacts only
- **EAS account required**: The project owner must run `eas login` and `eas init` once
- **Dropbox integration**: Set `EXPO_PUBLIC_DROPBOX_APP_KEY` as an EAS secret for cloud sync to work in builds
- **Free EAS tier**: Includes limited builds per month; check [Expo pricing](https://expo.dev/pricing) for details
- **F-Droid future**: APKs from this process can be used for a custom F-Droid repo (not yet implemented)

### Build profiles reference

| Profile | Command | Output | Use case |
|---------|---------|--------|----------|
| `preview` | `npm run eas:build:android:apk` | `.apk` | Friend testing, sideload, GitHub Releases |
| `development` | `npm run eas:build:android:dev` | `.apk` (dev) | Internal development with DevTools |
| `production` | `npm run eas:build:android:aab` | `.aab` | Google Play Store submission |

## License / attribution

App code: project license as shipped. **Do not** copy Mealie (AGPL) source. schema.org vocabulary is used as a public vocabulary for import mapping only.
