# GitHub Release Automation Setup

This document explains the optional automated EAS Build → GitHub Release workflow.

## Overview

The `.github/workflows/eas-release.yml` workflow automates the process of:
1. Triggering an EAS Build when a version tag is pushed
2. Waiting for the build to complete
3. Downloading the APK from EAS
4. Attaching it to a GitHub Release automatically

## Prerequisites

### 1. Expo Account Setup

You must have:
- An Expo account (free tier is sufficient)
- The project linked to EAS (`eas init` completed)
- `extra.eas.projectId` set in `app.json`

### 2. GitHub Secrets Configuration

Add the following secret to your GitHub repository:

**`EXPO_TOKEN`** (required):
- Get your Expo access token:
  ```bash
  eas whoami --tokens
  ```
- Go to your GitHub repository → Settings → Secrets and variables → Actions
- Click "New repository secret"
- Name: `EXPO_TOKEN`
- Value: Your Expo access token from the command above

**`EXPO_PUBLIC_DROPBOX_APP_KEY`** (optional, for Dropbox sync):
- If not already set as an EAS secret, add it to GitHub Actions as well
- This is only needed if you want Dropbox cloud sync to work in the APK

### 3. EAS Project Configuration

Ensure your EAS project has:
- Android credentials configured (keystore)
- `EXPO_PUBLIC_DROPBOX_APP_KEY` set as an EAS secret (if using Dropbox)

Set EAS secrets:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_DROPBOX_APP_KEY --value YOUR_DROPBOX_APP_KEY
```

## Usage

### Automatic Release (with workflow)

1. **Commit and push your changes** to main:
   ```bash
   git add .
   git commit -m "Release v1.0.0"
   git push origin main
   ```

2. **Create and push a version tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Monitor the workflow**:
   - Go to your repository → Actions tab
   - Watch the "EAS Build and GitHub Release" workflow run
   - The workflow will:
     - Trigger an EAS build (takes 10-20 minutes typically)
     - Download the APK when complete
     - Create a GitHub Release with the APK attached

4. **Edit the release notes**:
   - Go to your repository → Releases
   - Edit the newly created release
   - Replace the placeholder "What's New" section with actual release notes

### Manual Release (without workflow)

If you prefer not to use the automated workflow, or if it fails, you can manually:

1. Build the APK:
   ```bash
   npm run eas:build:android:apk
   ```

2. Download the APK from the EAS dashboard or the provided URL

3. Create a GitHub Release manually and attach the APK

## Workflow Configuration

The workflow is triggered by pushing tags matching the pattern `v*` (e.g., `v1.0.0`, `v2.1.0-beta`).

### Customization

You can customize the workflow by editing `.github/workflows/eas-release.yml`:

- **Change the tag pattern**: Modify the `on.push.tags` filter
- **Change the build profile**: Replace `preview` with `production` or `development`
- **Adjust polling interval**: Change the `sleep 30` value (in seconds)
- **Modify release body**: Edit the `body` section in the "Create GitHub Release" step

### Troubleshooting

**Build fails with "Invalid credentials"**:
- Verify `EXPO_TOKEN` is set correctly in GitHub Secrets
- Regenerate the token with `eas whoami --tokens` and update the secret

**Build times out**:
- The workflow waits indefinitely for builds by default
- Check the EAS dashboard for build status
- Consider adding a timeout to the workflow

**APK not attached to release**:
- Check the Actions log for download errors
- Verify the build completed successfully on the EAS dashboard
- Ensure the build artifact URL is accessible

**Dropbox integration not working in APK**:
- Verify `EXPO_PUBLIC_DROPBOX_APP_KEY` is set as an EAS secret
- The secret must be set at the project level, not in GitHub Actions

## Disabling the Workflow

If you prefer manual releases, you can:

1. Delete the workflow file:
   ```bash
   rm .github/workflows/eas-release.yml
   ```

2. Or disable it in GitHub:
   - Go to your repository → Actions
   - Select the workflow
   - Click the "..." menu → "Disable workflow"

## EAS Build Limits

Free Expo accounts have limited builds per month:
- Check your usage: https://expo.dev/accounts/[your-account]/usage
- Consider paid plans if you need more builds

For more details on EAS Build and GitHub Releases, see the main [README](../README.md#releases--friend-testing).
