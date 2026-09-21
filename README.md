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

## Releases and friend testing

Cupboard Notes uses **EAS Build** to create Android APK files for sideloading and friend testing. APKs are attached to GitHub Releases on this repository — **no APK binaries are committed to the main branch**.

### Prerequisites

1. **Expo account**: Sign up at [expo.dev](https://expo.dev) if you don't have one
2. **EAS CLI**: Install globally with `npm install -g eas-cli`
3. **Login**: Run `eas login` and authenticate with your Expo account
4. **Link project**: Run `eas init` in the project root to create an EAS project and add the `extra.eas.projectId` to `app.json`

### Building an Android APK

Once the project is linked, build an APK with:

```bash
npm run eas:build:android:apk
```

This uses the `preview` profile in `eas.json` and produces an installable `.apk` file suitable for:
- Direct installation on Android devices via USB or file sharing
- Friend testing and internal distribution
- Future F-Droid custom repository

EAS Build runs in the cloud and will prompt for Android keystore credentials on first build (EAS can generate and manage them for you).

### Environment variables for builds

The Dropbox integration requires `EXPO_PUBLIC_DROPBOX_APP_KEY` to be set for the app to connect to Dropbox. For EAS builds:

1. Set the secret via EAS CLI:
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_DROPBOX_APP_KEY --value your-dropbox-app-key --type string
   ```

2. Or add it via the Expo dashboard at [expo.dev](https://expo.dev/accounts/[account]/projects/[project]/secrets)

The build profiles in `eas.json` reference this environment variable, and it will be baked into the APK at build time.

### Attaching APK to GitHub Release

After EAS Build completes, download the APK and attach it to a GitHub Release:

1. **Download the APK**: EAS provides a download link when the build finishes, or visit the [EAS dashboard](https://expo.dev/accounts/[account]/projects/[project]/builds)

2. **Create a GitHub Release**:
   ```bash
   gh release create v1.0.0 \
     --title "Cupboard Notes v1.0.0" \
     --notes "Release notes here" \
     cupboard-notes-v1.0.0.apk
   ```

3. **Share the Release URL** with friends for testing: `https://github.com/robdevtech/CupboardNotes/releases`

### Additional build profiles

- **`npm run eas:build:android:aab`**: Builds an Android App Bundle (AAB) for Google Play Store submission (`production` profile)
- **`npm run eas:build:ios`**: Builds for iOS (`production` profile, requires Apple Developer account)

### CI automation (optional)

A GitHub Actions workflow can automate downloading completed EAS builds and attaching them to releases. See `.github/workflows/eas-release.yml` for an example that:
- Triggers on version tags (e.g. `v1.0.0`)
- Waits for the EAS build to complete
- Downloads the APK artifact
- Attaches it to a GitHub Release

This requires `EXPO_TOKEN` to be set as a repository secret (generate one with `eas build:token:create` or from your Expo account settings).

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
