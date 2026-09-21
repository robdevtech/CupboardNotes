# Dropbox Integration - End-User Flow

## The Complete User Experience

### Step 1: Open Settings
User opens Cupboard Notes and navigates to the Settings screen.

**What they see:**
- Clean list of cloud storage providers
- Dropbox card showing "Not connected"
- Simple "Connect" and "Disconnect" buttons
- Friendly description: "Cloud sync to your personal Dropbox"

### Step 2: Tap Connect Dropbox
User taps the blue "Connect" button.

**What happens:**
- Browser opens to Dropbox OAuth page
- If user is already logged in to Dropbox: immediate authorization screen
- If not logged in: Dropbox login → authorization screen
- Authorization screen shows:
  - App name: "Cupboard Notes"
  - Permissions requested: Read and write files
  - Allow/Deny buttons

### Step 3: Authorize
User taps "Allow" on the Dropbox authorization page.

**What happens:**
- Browser redirects back to Cupboard Notes app
- App exchanges authorization code for tokens (invisible to user)
- Tokens stored securely in device keychain
- Connection status updates immediately

### Step 4: Connected!
User sees success confirmation.

**What they see:**
- Alert: "Connected - Dropbox connected successfully! Account: [Their Name]"
- Dropbox card now shows "Connected"
- Toggle switch is enabled
- User can start using recipes - they'll sync automatically

## What Users NEVER See

❌ App keys or secrets
❌ OAuth configuration
❌ Developer console URLs
❌ Technical error messages (unless in dev mode)
❌ Token management
❌ API endpoint details
❌ Scope configuration

## What Users DO See

✅ "Connect Dropbox" button
✅ "Connected" status with their account name
✅ Simple error messages if connection fails: "Failed to connect to Dropbox. Please try again."
✅ "Disconnect" button to revoke access
✅ Clear explanation of what syncs: "Recipes and photos sync to your cloud folder"

## Developer vs User Errors

### Developer Error (missing app key)
**Message:** "Dropbox app key not configured. This is a developer setup issue. Add EXPO_PUBLIC_DROPBOX_APP_KEY to your .env file or DROPBOX_APP_KEY to app.json extra. See README 'For Developers' section."

**When shown:** Only in development builds when app key is not configured.

### User Error (connection failed)
**Message:** "Failed to connect to Dropbox. Please try again. [Brief error reason]"

**When shown:** When OAuth flow is cancelled, network fails, or authorization is denied.

## The Developer's Job (One-Time)

1. Create Dropbox app at developer console
2. Configure permissions and redirect URIs
3. Copy app key to `.env` file
4. Build the app

After this one-time setup, all end users get the simple one-tap flow above.

## Technical Implementation (Hidden from Users)

Behind the scenes:
- OAuth 2.0 PKCE flow (no app secret needed)
- PKCE code verifier generated with crypto-secure randomness
- Authorization code exchanged for access token + refresh token
- Refresh token stored securely with `expo-secure-store`
- Access token auto-refreshes before expiry
- All API calls use Bearer token authentication
- Tokens never logged or exposed

But the user just sees: **Connect → Browser → Connected ✓**

## Success Criteria

✅ User completes connection in <30 seconds
✅ Zero configuration required from user
✅ No technical jargon in UI
✅ Clear status indication (Connected / Not connected)
✅ Easy disconnect option
✅ Works identically on iOS, Android, and web

## Future Enhancement Ideas

- Silent background sync
- Sync status indicator (syncing/synced/error)
- Last sync timestamp
- Manual sync button
- Sync conflict resolution UI
- Multi-account support (connect multiple Dropbox accounts)
