# GitHub Issue Reporting Feature - Visual Flow

## User Experience Flow

```
┌─────────────────────────────────┐
│   Import Screen                 │
│                                 │
│   Recipe URL (HTTPS)            │
│   ┌───────────────────────────┐ │
│   │ https://example.com/...   │ │
│   └───────────────────────────┘ │
│                                 │
│   ┌───────────────────────────┐ │
│   │   Import JSON-LD          │ │
│   └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
           │
           │ User taps "Import JSON-LD"
           │ Import fails (no JSON-LD, HTTP error, etc.)
           ▼
┌─────────────────────────────────┐
│   Alert: Import failed          │
│                                 │
│   Error message text            │
│   You can paste manually...     │
│                                 │
│   ┌─────────────────────────┐   │
│   │   Paste manually        │   │ ◄── Existing option
│   └─────────────────────────┘   │
│                                 │
│   ┌─────────────────────────┐   │
│   │  Report on GitHub 🆕    │   │ ◄── NEW: Opens GitHub issue
│   └─────────────────────────┘   │
│                                 │
│   ┌─────────────────────────┐   │
│   │         OK              │   │ ◄── Existing option
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
           │
           │ User taps "Report on GitHub"
           ▼
┌─────────────────────────────────┐
│   Browser / GitHub App          │
│                                 │
│   New Issue for                 │
│   robdevtech/CupboardNotes      │
│                                 │
│   Title:                        │
│   Import failed: https://...    │
│                                 │
│   Body (prefilled):             │
│   ## Import Failure Report      │
│   - Failed URL                  │
│   - Error Message               │
│   - App Version: 1.0.0          │
│   - Platform: android/ios/web   │
│                                 │
│   [User can add more info]      │
│   [Submit issue]                │
│                                 │
└─────────────────────────────────┘
```

## Example Issue Content

### Example 1: HTTPS Security Error

**Issue Title:**
```
Import failed: http://example.com/recipe
```

**Issue Body:**
```markdown
## Import Failure Report

**This issue was automatically generated from a failed recipe import.**

### Failed URL
```
http://example.com/recipe
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

### Example 2: No JSON-LD Found

**Issue Title:**
```
Import failed: https://google.com
```

**Issue Body:**
```markdown
## Import Failure Report

**This issue was automatically generated from a failed recipe import.**

### Failed URL
```
https://google.com
```

### Error Message
```
No JSON-LD found on page. Paste ingredients manually or try another URL.
```

### Environment
- **App Version**: 1.0.0
- **Platform**: ios
- **Reported via**: Import screen failure

### Additional Context
Please add any additional details about this recipe URL or the failure below.
```

### Example 3: Network Error (404)

**Issue Title:**
```
Import failed: https://httpstat.us/404
```

**Issue Body:**
```markdown
## Import Failure Report

**This issue was automatically generated from a failed recipe import.**

### Failed URL
```
https://httpstat.us/404
```

### Error Message
```
Fetch failed: HTTP 404
```

### Environment
- **App Version**: 1.0.0
- **Platform**: web
- **Reported via**: Import screen failure

### Additional Context
Please add any additional details about this recipe URL or the failure below.
```

## Benefits

1. **Easy Issue Tracking**: Failed imports are automatically documented with all relevant context
2. **Better Debugging**: Developers can see exactly which URLs fail and why
3. **User Engagement**: Users can easily report issues without leaving the app flow
4. **Pattern Recognition**: Multiple reports of the same domain can reveal systematic issues
5. **Version/Platform Context**: Helps identify platform-specific or version-specific bugs

## Implementation Highlights

- ✅ Client-side only (no backend required)
- ✅ Uses standard GitHub URL query parameters
- ✅ Works with browser or GitHub mobile app
- ✅ Properly encodes special characters
- ✅ Includes comprehensive error context
- ✅ Maintains existing "Paste manually" fallback
- ✅ Graceful error handling if URL opening fails
