# Crypto Fix: Resolving getRandomValues() Error in Expo Go

## 🚨 Critical Bug

Users experienced this error when trying to import recipes in Expo Go:

```
crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported
You can paste the recipe manually instead.
```

**Example URL that triggered it**: `https://www.bbcgoodfood.com/recipes/easy-millionaires-shortbread`

## Root Cause

The app used the `uuid` package to generate unique IDs for recipes, ingredients, and steps:

```typescript
// OLD CODE (src/domain/ids.ts)
import { v4 as uuidv4 } from 'uuid';

export function newId(): string {
  return uuidv4();
}
```

The `uuid` package tries to use `crypto.getRandomValues()`, a Web API that:
- ✅ Works in browsers (web platform)
- ✅ Works in Node.js with polyfills
- ❌ **Does NOT work in React Native/Expo Go** (no web crypto APIs)

This caused **all recipe imports to fail** in Expo Go, the primary way users test the app during development.

## Solution

Replace `uuid` with `expo-crypto`, which provides native crypto support for React Native:

```typescript
// NEW CODE (src/domain/ids.ts)
import * as Crypto from 'expo-crypto';

export function newId(): string {
  return Crypto.randomUUID();
}
```

### Why expo-crypto?

1. **Native Support**: Uses platform-native crypto (iOS Security framework, Android Keystore)
2. **Expo Go Compatible**: Works out of the box in Expo Go
3. **Same Format**: Generates UUID v4 strings, fully compatible with existing data
4. **Better Performance**: No JavaScript polyfills needed
5. **Smaller Bundle**: Removed uuid dependency

## Changes Made

### 1. Updated ID Generation
- Modified `src/domain/ids.ts` to use `expo-crypto`
- Same function signature, same UUID format
- Zero breaking changes to existing code

### 2. Dependency Updates
**Added:**
```json
"expo-crypto": "~57.0.0"
```

**Removed:**
```json
"uuid": "^11.0.0",
"@types/uuid": "^10.0.0"
```

### 3. Bundle Size Reduction
- **Web**: 928 modules → 914 modules (-14)
- **Android**: 1322 modules → 1308 modules (-14)

## Verification

### Before Fix
```bash
# User tries to import recipe in Expo Go
> Import from URL: https://www.bbcgoodfood.com/recipes/...
❌ ERROR: crypto.getRandomValues() not supported
❌ Import fails immediately
❌ User forced to paste manually
```

### After Fix
```bash
# User tries to import recipe in Expo Go
> Import from URL: https://www.bbcgoodfood.com/recipes/...
✅ Import succeeds
✅ Recipe ingredients and steps imported
✅ Redirected to recipe detail screen
```

## Testing

### Quick Test
1. Open app in Expo Go (Android or iOS)
2. Navigate to Import screen
3. Enter: `https://www.bbcgoodfood.com/recipes/easy-millionaires-shortbread`
4. Tap "Import JSON-LD"
5. ✅ Import should succeed without crypto error

### What to Look For
- ✅ No alert about `crypto.getRandomValues()`
- ✅ Recipe is imported successfully
- ✅ Ingredients list is populated
- ✅ Steps are populated
- ✅ You're redirected to recipe detail screen

### TypeScript Verification
```bash
cd /workspace
npx tsc --noEmit
# Should pass with no errors
```

### Build Verification
```bash
# Web
npx expo export --platform web --clear
# Should bundle 914 modules successfully

# Android
npx expo export --platform android
# Should bundle 1308 modules successfully
```

## Impact

### Before This Fix
- ❌ Recipe imports completely broken in Expo Go
- ❌ Users had to manually paste every recipe
- ❌ Testing new import features was impossible
- ❌ User experience severely degraded

### After This Fix
- ✅ Recipe imports work perfectly in Expo Go
- ✅ Users can import from recipe URLs
- ✅ Testing and development flow restored
- ✅ Native crypto performance
- ✅ Smaller bundle size

## Technical Notes

### UUID Format Compatibility
Both `uuid.v4()` and `Crypto.randomUUID()` generate UUID v4 strings in the format:
```
xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
```

Example: `550e8400-e29b-41d4-a716-446655440000`

This means:
- ✅ Existing recipes in the database work fine
- ✅ New recipes are compatible
- ✅ No migration needed
- ✅ Same string format and length

### Why Not Polyfill?
We could have polyfilled `crypto.getRandomValues()` for React Native, but:
- ❌ Adds unnecessary polyfill code
- ❌ Less performant than native
- ❌ Larger bundle size
- ❌ More dependencies

Using `expo-crypto` is cleaner and better.

## Related Issues

This fix also benefits the GitHub issue reporting feature added in this PR:
- Users can now report import failures that occur AFTER the crypto fix
- Before, they couldn't even get past the crypto error to see other failure modes
- The "Report on GitHub" button works for all failure types, including crypto issues

## Commits

- `52f495d` - Fix crypto.getRandomValues() error in Expo Go by using expo-crypto
- `406852b` - Remove uuid and @types/uuid dependencies

## References

- [expo-crypto documentation](https://docs.expo.dev/versions/v57.0.0/sdk/crypto/)
- [uuid package issue](https://github.com/uuidjs/uuid#getrandomvalues-not-supported)
- [React Native crypto limitations](https://reactnative.dev/docs/javascript-environment#polyfills)
