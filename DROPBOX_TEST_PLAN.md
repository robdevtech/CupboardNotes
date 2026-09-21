# Dropbox Integration Manual Test Plan

## Prerequisites
- Dropbox app created at https://www.dropbox.com/developers/apps
- App key configured in app.json
- Scopes enabled: files.content.read, files.content.write, files.metadata.read
- Redirect URI: cupboardnotes://auth

## Test Cases

### 1. OAuth Connection Flow
**Steps:**
1. Open Cupboard Notes app
2. Navigate to Settings
3. Find Dropbox provider card
4. Tap "Connect" button
5. Browser opens to Dropbox authorization page
6. Login with Dropbox credentials if needed
7. Grant permissions to the app
8. Browser redirects back to app

**Expected:**
- OAuth flow completes successfully
- Alert shows "Connected" with account name
- Dropbox card status changes to "Connected"
- Toggle switch is enabled
- Session stored in secure store

### 2. Connection Persistence
**Steps:**
1. Complete OAuth connection (Test 1)
2. Close the app completely
3. Reopen the app
4. Navigate to Settings

**Expected:**
- Dropbox still shows "Connected" status
- No need to re-authenticate

### 3. Token Refresh
**Steps:**
1. Wait for access token to expire (typically 4 hours)
2. Trigger any Dropbox API operation

**Expected:**
- Token automatically refreshes using refresh token
- API operation succeeds
- No user intervention required

### 4. Folder Creation
**Steps:**
1. Connect to Dropbox (Test 1)
2. Call `dropboxAdapter.ensureAppFolder()`

**Expected:**
- `/Cupboard Notes` folder created in user's Dropbox
- Returns folder path: "/Cupboard Notes"
- Second call doesn't fail if folder exists

### 5. File Upload (Write)
**Steps:**
1. Connect to Dropbox
2. Create test data: `new TextEncoder().encode("test content")`
3. Call `dropboxAdapter.write("/Cupboard Notes/test.txt", data)`

**Expected:**
- File uploads successfully
- Returns CloudFileInfo with path, name, size, updatedAt
- File visible in Dropbox web interface at /Cupboard Notes/test.txt

### 6. File Listing
**Steps:**
1. Upload some test files (Test 5)
2. Call `dropboxAdapter.list("/Cupboard Notes")`

**Expected:**
- Returns array of CloudFileInfo
- Each entry has path, name, size, updatedAt, isFolder
- Test files from Test 5 are present

### 7. File Reading
**Steps:**
1. Upload test file with known content (Test 5)
2. Call `dropboxAdapter.read("/Cupboard Notes/test.txt")`

**Expected:**
- Returns Uint8Array
- Decoding matches original content
- No data corruption

### 8. File Deletion
**Steps:**
1. Upload test file (Test 5)
2. Verify file exists (Test 6)
3. Call `dropboxAdapter.delete("/Cupboard Notes/test.txt")`
4. List folder again

**Expected:**
- Delete succeeds without error
- File no longer appears in list
- File removed from Dropbox

### 9. Recipe Bundle Sync
**Steps:**
1. Create test recipe JSON
2. Prepare test photo array: `[{ fileName: "photo1.jpg", localUri: "file://..." }]`
3. Call `dropboxAdapter.syncRecipeBundle("test-recipe-123", recipeJson, photos)`

**Expected:**
- Creates folder `/Cupboard Notes/test-recipe-123/`
- Uploads `recipe.json` with correct content
- Uploads all photos with correct filenames
- Returns recipePath and photoPaths array

### 10. Disconnect
**Steps:**
1. Connect to Dropbox (Test 1)
2. Navigate to Settings
3. Tap "Disconnect" button

**Expected:**
- Tokens revoked with Dropbox API
- Local tokens cleared from secure store
- Status changes to "Not connected"
- isConnected() returns false

### 11. Error Handling - No App Key
**Steps:**
1. Remove DROPBOX_APP_KEY from app.json
2. Restart app
3. Try to connect

**Expected:**
- Shows error: "DROPBOX_APP_KEY not configured"
- Alert explains how to configure

### 12. Error Handling - Invalid Token
**Steps:**
1. Connect successfully
2. Manually invalidate stored token in secure store
3. Try any API operation

**Expected:**
- Throws "Not authenticated with Dropbox" error
- App prompts to reconnect

### 13. Error Handling - Network Failure
**Steps:**
1. Connect successfully
2. Disable device internet
3. Try any API operation

**Expected:**
- Appropriate error message
- App doesn't crash
- Can retry when network restored

### 14. Expo Go Compatibility
**Steps:**
1. Test all above in Expo Go
2. Verify redirect URI `cupboardnotes://auth` works

**Expected:**
- All functionality works in Expo Go
- OAuth redirect completes successfully

## Automated Verification

Run TypeScript compilation:
```bash
npx tsc --noEmit
```

Run unit tests:
```bash
npm test
```

## Security Checklist
- [ ] No app secret in code
- [ ] Tokens stored in SecureStore only
- [ ] No tokens logged to console
- [ ] PKCE code_verifier properly random
- [ ] Refresh token used for offline access

## Performance Checklist
- [ ] Token refresh happens automatically before expiry
- [ ] Multiple API calls reuse same valid token
- [ ] File uploads handle large photos (5-10MB)
- [ ] App remains responsive during uploads
