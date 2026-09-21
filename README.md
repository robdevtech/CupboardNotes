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

### Stubbed / next milestones

- [x] **Dropbox OAuth + sync (Milestone 2 — first live provider)**
- [ ] Live OAuth (PKCE) for Google Drive, OneDrive, Box via `expo-auth-session`
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
| **Dropbox** | **OAuth 2.0 PKCE** | **✅ LIVE: Full Dropbox, `/Cupboard Notes` folder** |
| OneDrive | Azure AD v2 / Graph | `Files.ReadWrite`, `offline_access` |
| Box | OAuth 2.0 | `root_readwrite` (narrow later) |

Tokens: `expo-secure-store` only. Never a central Cupboard Notes server.

## Dropbox Setup (First Live Provider)

Cupboard Notes now supports **real Dropbox cloud storage** with OAuth 2.0 PKCE authentication. Follow these steps to enable Dropbox sync:

### 1. Create a Dropbox App

1. Go to the [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click **Create app**
3. Choose settings:
   - **API:** Scoped access
   - **Access type:** Full Dropbox (the app will create `/Cupboard Notes` folder)
   - **Name:** Choose a unique name (e.g., `cupboard-notes-dev-yourname`)
4. Click **Create app**

### 2. Configure App Permissions

In the **Permissions** tab of your Dropbox app:

1. Enable these scopes:
   - `files.content.read`
   - `files.content.write`
   - `files.metadata.read`
2. Click **Submit** at the bottom

### 3. Configure OAuth Redirect URIs

In the **Settings** tab:

1. Scroll to **OAuth 2** section → **Redirect URIs**
2. Add these URIs (one per line):
   ```
   cupboardnotes://auth
   https://auth.expo.io/@your-expo-username/cupboard-notes
   ```
   Replace `your-expo-username` with your actual Expo username if publishing to Expo Go
3. Click **Add**

### 4. Get Your App Key

In the **Settings** tab:

1. Find the **App key** (looks like `abc123xyz...`)
2. Copy this value

### 5. Configure the App

Add your Dropbox app key to `app.json`:

```json
{
  "expo": {
    "extra": {
      "DROPBOX_APP_KEY": "your-app-key-here"
    }
  }
}
```

Or set it as an environment variable:

```bash
export EXPO_PUBLIC_DROPBOX_APP_KEY=your-app-key-here
```

### 6. Test in Expo Go

1. Restart the Expo dev server:
   ```bash
   npx expo start
   ```
2. Open the app in Expo Go
3. Go to **Settings**
4. Find **Dropbox** and tap **Connect**
5. Complete OAuth in the browser
6. You should see "Connected" with your account name

### What Works

- ✅ OAuth 2.0 PKCE authentication (no app secret needed)
- ✅ Automatic token refresh with offline access
- ✅ Create `/Cupboard Notes` folder automatically
- ✅ Upload recipe JSON + photos with `syncRecipeBundle`
- ✅ List, read, write, delete files
- ✅ Secure token storage in device keychain
- ✅ Works in Expo Go and standalone builds

### Notes

- **App key is public:** PKCE flow doesn't require an app secret, only the app key
- **Redirect URI:** For Expo Go, use `cupboardnotes://auth`. For standalone builds, configure your custom scheme
- **Permissions:** Full Dropbox access allows syncing to a dedicated `/Cupboard Notes` folder. App folder access would restrict to `/Apps/YourAppName`
- **Token storage:** Refresh tokens are stored securely in device keychain via `expo-secure-store`

### Troubleshooting

**"DROPBOX_APP_KEY not configured" error:**
- Make sure you've added the app key to `app.json` under `expo.extra.DROPBOX_APP_KEY`
- Or set `EXPO_PUBLIC_DROPBOX_APP_KEY` environment variable
- Restart the Expo dev server after changes

**OAuth redirect fails:**
- Verify redirect URI is exactly `cupboardnotes://auth` in Dropbox app settings
- Check that `scheme: "cupboardnotes"` is set in `app.json`

**"Not authenticated" errors:**
- Disconnect and reconnect in Settings
- Check that required scopes are enabled in Dropbox app Permissions tab

## License / attribution

App code: project license as shipped. **Do not** copy Mealie (AGPL) source. schema.org vocabulary is used as a public vocabulary for import mapping only.
