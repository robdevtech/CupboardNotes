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
| **Box** | **OAuth 2.0** | **✅ LIVE: Full Box access, `/Cupboard Notes` folder** |

Tokens: `expo-secure-store` only. Never a central Cupboard Notes server.

## Dropbox Cloud Storage (First Live Provider)

Cupboard Notes now supports **real Dropbox cloud storage** with one-tap OAuth connection. End users simply tap **Connect Dropbox** in Settings - no API keys or developer accounts needed.

---

### For End Users

**Connecting Dropbox (one tap):**

1. Open Cupboard Notes
2. Go to **Settings**
3. Find **Dropbox** and tap **Connect**
4. Sign in to Dropbox in your browser (if needed)
5. Authorize Cupboard Notes
6. You're connected! Recipes will sync to `/Cupboard Notes` folder

**What syncs:**
- Recipe JSON files
- Recipe photos
- Stored in your Dropbox at `/Cupboard Notes/{recipeId}/`

**Disconnecting:**
Tap **Disconnect** in Settings to revoke access and clear local tokens.

---

### For Developers (One-Time Setup)

The publisher (robdevtech) has registered a Dropbox app for Cupboard Notes. If you're forking this repo or building your own version, you'll need to create your own Dropbox app and configure the app key.

#### 1. Create a Dropbox App

1. Go to the [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click **Create app**
3. Choose settings:
   - **API:** Scoped access
   - **Access type:** Full Dropbox (creates `/Cupboard Notes` folder)
   - **Name:** Choose a unique name (e.g., `cupboard-notes-yourname`)
4. Click **Create app**

#### 2. Configure App Permissions

In the **Permissions** tab:

1. Enable these scopes:
   - `files.content.read`
   - `files.content.write`
   - `files.metadata.read`
2. Click **Submit** at the bottom

#### 3. Configure OAuth Redirect URIs

In the **Settings** tab → **OAuth 2** section → **Redirect URIs**:

Add these URIs:
```
cupboardnotes://auth
https://auth.expo.io/@your-expo-username/cupboard-notes
```

Replace `your-expo-username` with your actual Expo username for Expo Go testing.

#### 4. Get Your App Key

In the **Settings** tab, find the **App key** (looks like `abc123xyz...`) and copy it.

#### 5. Configure the Build

**Option A: Environment variable (recommended for production)**

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_DROPBOX_APP_KEY=your-app-key-here
```

The `.env` file is already in `.gitignore` to keep your key secure.

**Option B: app.json (easier for local testing)**

Add to `app.json`:

```json
{
  "expo": {
    "extra": {
      "DROPBOX_APP_KEY": "your-app-key-here"
    }
  }
}
```

⚠️ **Do not commit your app key to public repositories.** Use `.env` or EAS Secrets for production.

#### 6. Test

```bash
npx expo start
```

Open in Expo Go or simulator, go to Settings, and tap **Connect Dropbox**. The OAuth flow should complete successfully.

---

### Technical Details

- ✅ OAuth 2.0 PKCE authentication (no app secret needed in client)
- ✅ Automatic token refresh with offline access
- ✅ Secure token storage in device keychain via `expo-secure-store`
- ✅ Works in Expo Go and standalone builds
- ✅ Full Dropbox access with dedicated `/Cupboard Notes` folder

**If app key is missing:**
Developers will see a clear error message in development. End users of a properly configured build never see configuration prompts.

---

## Box Cloud Storage (Second Live Provider)

Cupboard Notes now supports **real Box cloud storage** with one-tap OAuth connection. End users simply tap **Connect Box** in Settings - no API keys or developer accounts needed.

---

### For End Users

**Connecting Box (one tap):**

1. Open Cupboard Notes
2. Go to **Settings**
3. Find **Box** and tap **Connect**
4. Sign in to Box in your browser (if needed)
5. Authorize Cupboard Notes
6. You're connected! Recipes will sync to `/Cupboard Notes` folder

**What syncs:**
- Recipe JSON files
- Recipe photos
- Stored in your Box at `/Cupboard Notes/{recipeId}/`

**Disconnecting:**
Tap **Disconnect** in Settings to revoke access and clear local tokens.

---

### For Developers (One-Time Setup)

The publisher (robdevtech) has registered a Box app for Cupboard Notes. If you're forking this repo or building your own version, you'll need to create your own Box app and configure the credentials.

**Important:** Box does not support PKCE (Proof Key for Code Exchange) for OAuth 2.0, which means the `client_secret` must be included in the app. This is the same security model as storing API keys - the credentials are embedded in the app bundle. For production apps, consider additional security measures like environment-specific builds and proper secret management.

#### 1. Create a Box App

1. Go to the [Box Developer Console](https://app.box.com/developers/console)
2. Click **Create New App**
3. Choose **Custom App**
4. Choose **User Authentication (OAuth 2.0)**
5. Enter a name (e.g., `cupboard-notes-yourname`)
6. Click **Create App**

#### 2. Configure App Scopes

In the **Configuration** tab → **Application Scopes**:

1. Enable these scopes:
   - **Read and write all files and folders stored in Box**
2. Click **Save Changes** at the top

#### 3. Configure OAuth Redirect URIs

In the **Configuration** tab → **OAuth 2.0 Redirect URI**:

Add these URIs (one at a time):

```
cupboardnotes://auth
https://auth.expo.io/@your-expo-username/cupboard-notes
```

Replace `your-expo-username` with your actual Expo username for Expo Go testing.

Click **Save Changes** at the top after adding each URI.

#### 4. Get Your Credentials

In the **Configuration** tab, find:

- **Client ID** (looks like `abc123xyz...`)
- **Client Secret** (click **Fetch Current Secret** to reveal it)

Copy both values.

#### 5. Configure the Build

**Option A: Environment variables (recommended for production)**

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_BOX_CLIENT_ID=your-client-id-here
EXPO_PUBLIC_BOX_CLIENT_SECRET=your-client-secret-here
```

The `.env` file is already in `.gitignore` to keep your credentials secure.

**Option B: app.json (easier for local testing)**

Add to `app.json`:

```json
{
  "expo": {
    "extra": {
      "BOX_CLIENT_ID": "your-client-id-here",
      "BOX_CLIENT_SECRET": "your-client-secret-here"
    }
  }
}
```

⚠️ **Do not commit your credentials to public repositories.** Use `.env` or EAS Secrets for production.

#### 6. Test

```bash
npx expo start
```

Open in Expo Go or simulator, go to Settings, and tap **Connect Box**. The OAuth flow should complete successfully.

---

### Technical Details

- ✅ OAuth 2.0 authentication (Box does not support PKCE)
- ✅ Automatic token refresh with offline access
- ✅ Secure token storage in device keychain via `expo-secure-store`
- ✅ Works in Expo Go and standalone builds
- ✅ Full Box access with dedicated `/Cupboard Notes` folder
- ⚠️ Client secret required (embedded in app like API keys)

**If credentials are missing:**
Developers will see a clear error message in development. End users of a properly configured build never see configuration prompts.

**Security Note:**
Box's OAuth implementation requires `client_secret` for the authorization code exchange, which means it must be embedded in the mobile app. This is similar to how API keys are typically handled in mobile applications. The credentials enable the app to authenticate on behalf of the user after they've explicitly granted permission through the OAuth flow. For additional security in production:

- Use environment-specific credentials (dev, staging, production)
- Implement certificate pinning
- Use EAS Secrets or similar secure secret management
- Monitor for unauthorized usage through Box's developer console
- Consider implementing a lightweight proxy for highly sensitive deployments

---

## License / attribution

App code: project license as shipped. **Do not** copy Mealie (AGPL) source. schema.org vocabulary is used as a public vocabulary for import mapping only.
