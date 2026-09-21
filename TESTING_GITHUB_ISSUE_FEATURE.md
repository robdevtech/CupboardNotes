# Testing Guide: GitHub Issue Reporting for Failed Imports

This document provides comprehensive test instructions for the new GitHub issue reporting feature added to the Import screen.

## Feature Overview

When a recipe URL import fails, users now see a "Report on GitHub" button in the error alert. This button opens GitHub's new issue page with prefilled information about the failure, making it easy to track and debug failed imports.

**CRITICAL FIX**: This PR also fixes the `crypto.getRandomValues() not supported` error that prevented imports from working in Expo Go. The app now uses `expo-crypto` for native UUID generation instead of the web-based `uuid` package.

## Prerequisites

1. Install dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   ```

2. Start the dev server:
   ```bash
   npx expo start --clear
   ```

3. Open the app:
   - **Android**: Use Expo Go app and scan QR code
   - **iOS**: Use Expo Go app and scan QR code
   - **Web**: Press `w` in the terminal or open the localhost URL

## Test Scenarios

### Test 1: Non-HTTPS URL (Security Error)

**Steps:**
1. Navigate to the Import screen
2. Enter a non-HTTPS URL: `http://example.com/recipe`
3. Tap "Import JSON-LD"

**Expected Result:**
- Alert appears with title "Import failed"
- Message shows: "Only HTTPS URLs are supported\n\nYou can paste the recipe manually instead."
- Three buttons appear:
  - "Paste manually"
  - "Report on GitHub" ⭐ (NEW)
  - "OK"

**Test the Report Button:**
1. Tap "Report on GitHub"
2. Browser or GitHub app should open
3. GitHub new issue page should load for `robdevtech/CupboardNotes`
4. Verify the prefilled content:
   - **Title**: `Import failed: http://example.com/recipe`
   - **Body contains**:
     - Section: "Import Failure Report"
     - Failed URL: `http://example.com/recipe`
     - Error: "Only HTTPS URLs are supported"
     - App Version: "1.0.0"
     - Platform: "android" / "ios" / "web"
     - Note: "This issue was automatically generated from a failed recipe import"

### Test 2: URL Without JSON-LD (No Recipe Data)

**Steps:**
1. Navigate to the Import screen
2. Enter a valid HTTPS URL without recipe JSON-LD: `https://google.com`
3. Tap "Import JSON-LD"

**Expected Result:**
- Alert appears with title "Import failed"
- Message shows: "No JSON-LD found on page. Paste ingredients manually or try another URL.\n\nYou can paste the recipe manually instead."
- Three buttons appear as before

**Test the Report Button:**
1. Tap "Report on GitHub"
2. Verify the issue body contains:
   - Failed URL: `https://google.com`
   - Error: "No JSON-LD found on page. Paste ingredients manually or try another URL."

### Test 3: URL With JSON-LD But No Recipe Schema

**Steps:**
1. Navigate to the Import screen
2. Enter a URL with JSON-LD but no Recipe schema: `https://github.com`
3. Tap "Import JSON-LD"

**Expected Result:**
- Alert appears with error about no Recipe schema found
- "Report on GitHub" button appears

**Test the Report Button:**
1. Tap "Report on GitHub"
2. Verify the issue contains the appropriate error message

### Test 4: Network Failure (404/500)

**Steps:**
1. Navigate to the Import screen
2. Enter a URL that returns a 404: `https://httpstat.us/404`
3. Tap "Import JSON-LD"

**Expected Result:**
- Alert appears with "Fetch failed: HTTP 404"
- "Report on GitHub" button appears

**Test the Report Button:**
1. Tap "Report on GitHub"
2. Verify the issue contains:
   - Failed URL: `https://httpstat.us/404`
   - Error: "Fetch failed: HTTP 404"

### Test 5: Long URL Truncation in Title

**Steps:**
1. Navigate to the Import screen
2. Enter a very long URL (>60 characters): 
   ```
   https://www.example.com/recipes/very-long-recipe-name-that-exceeds-sixty-characters
   ```
3. Tap "Import JSON-LD"

**Expected Result:**
- Alert appears with import failure
- "Report on GitHub" button appears

**Test the Report Button:**
1. Tap "Report on GitHub"
2. Verify the issue **title** is truncated to 60 characters with "..." suffix
3. Verify the issue **body** contains the full URL (not truncated)

### Test 6: Platform Detection

**Test on each platform:**

**Android:**
- Follow Test 1 on Android device/emulator
- Verify issue body shows: `**Platform**: android`

**iOS:**
- Follow Test 1 on iOS device/simulator
- Verify issue body shows: `**Platform**: ios`

**Web:**
- Follow Test 1 in web browser
- Verify issue body shows: `**Platform**: web`

### Test 7: Existing Fallback Options Still Work

**Test "Paste manually" button:**
1. Trigger an import failure (use Test 1)
2. In the alert, tap "Paste manually"
3. Verify the paste form appears below with Title, Ingredients, and Steps fields
4. Enter some test data and tap "Save pasted recipe"
5. Verify the recipe is created and you're redirected to the detail view

**Test "OK" button:**
1. Trigger an import failure
2. In the alert, tap "OK"
3. Verify the alert dismisses
4. Verify you're still on the Import screen
5. Verify the URL field still contains your entered URL

### Test 8: No URL Entered (Button Should Not Appear)

**Note:** The current implementation will show the alert and button even without a URL entered, but the import button is disabled when URL is empty. This prevents the failure case from occurring in the first place.

**Steps:**
1. Navigate to the Import screen
2. Leave the URL field empty
3. Verify the "Import JSON-LD" button is disabled (grayed out)

### Test 9: Error Opening GitHub

This test verifies error handling when the URL cannot be opened.

**Steps:**
1. If testing on a device without a browser (unlikely), trigger this scenario
2. Or manually test the error path by inspecting the code

**Expected Result:**
- If `Linking.openURL` fails, a second alert appears: "Could not open GitHub" with the error message

### Test 10: Crypto Fix - Successful Import in Expo Go (CRITICAL)

This test verifies the `crypto.getRandomValues()` fix that prevented imports from working.

**Steps:**
1. Navigate to the Import screen in Expo Go (on Android or iOS device)
2. Enter a valid recipe URL with JSON-LD (e.g., `https://www.bbcgoodfood.com/recipes/easy-millionaires-shortbread`)
3. Tap "Import JSON-LD"

**Expected Result:**
- ✅ Import succeeds without `crypto.getRandomValues() not supported` error
- ✅ Recipe is imported and you're redirected to the detail screen
- ✅ Recipe ingredients and steps are populated
- ✅ No alert appears (import works correctly)

**Previous Behavior (Bug):**
- ❌ Import failed immediately with alert: "crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported"
- ❌ User was forced to paste manually even though the URL had valid recipe data

**Why This Was Critical:**
This bug completely broke recipe imports in Expo Go, the primary way users test the app during development. The `uuid` package relied on web crypto APIs that don't exist in React Native. We fixed it by replacing `uuid` with `expo-crypto`, which provides native UUID generation.

## Checklist

- [ ] Test 1: Non-HTTPS URL - Report button works
- [ ] Test 2: No JSON-LD - Report button works
- [ ] Test 3: No Recipe schema - Report button works
- [ ] Test 4: Network failure - Report button works
- [ ] Test 5: Long URL truncation - Title truncated, body shows full URL
- [ ] Test 6: Platform detection - Correct platform in issue body (android/ios/web)
- [ ] Test 7: Existing buttons - "Paste manually" and "OK" still work
- [ ] Test 8: Empty URL - Import button disabled (prevents alert)
- [ ] Test 9: Error opening GitHub - Graceful error handling
- [ ] Test 10: **Crypto fix - Successful import in Expo Go without getRandomValues error** ⭐ **CRITICAL**
- [ ] TypeScript build - No type errors (`npx tsc --noEmit`)
- [ ] Android export - Builds successfully (`npx expo export --platform android`)
- [ ] Web export - Builds successfully (`npx expo export --platform web`)

## Expected Issue Format

When you tap "Report on GitHub", the opened GitHub issue should look like this:

**Title:**
```
Import failed: https://example.com/recipe
```

**Body:**
```markdown
## Import Failure Report

**This issue was automatically generated from a failed recipe import.**

### Failed URL
```
https://example.com/recipe
```

### Error Message
```
Only HTTPS URLs are supported
```

### Environment
- **App Version**: 1.0.0
- **Platform**: android
- **Reported via**: Import screen failure

### Additional Context
Please add any additional details about this recipe URL or the failure below.
```

## Notes

- The GitHub issue page is opened in the default browser or GitHub mobile app (if installed)
- No authentication is required to view the prefilled issue, but users need to be logged in to GitHub to submit it
- The feature is completely client-side; no backend or API calls are made
- The feature uses standard GitHub URL query parameters (`title` and `body`)
- All special characters in the URL are properly encoded using `URLSearchParams`
