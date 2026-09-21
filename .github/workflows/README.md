# GitHub Actions Workflows

## EAS Build and Release

The `eas-release.yml` workflow automates the process of building Android APKs with EAS Build and attaching them to GitHub Releases.

### How it works

1. **Trigger**: Runs when you push a version tag (e.g., `v1.0.0`)
2. **Build**: Triggers an EAS Build with the `preview` profile (APK for sideloading)
3. **Wait**: Monitors the build status until completion (up to 1 hour)
4. **Download**: Downloads the built APK artifact
5. **Release**: Creates a GitHub Release and attaches the APK

### Setup

To use this workflow, you need to configure the `EXPO_TOKEN` secret:

#### 1. Generate an Expo token

Run one of these commands after logging in with `eas login`:

```bash
# Create a token via CLI
eas build:token:create

# Or create via web
# Visit: https://expo.dev/accounts/[account]/settings/access-tokens
```

Copy the generated token.

#### 2. Add the token to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `EXPO_TOKEN`
5. Value: Paste your Expo token
6. Click **Add secret**

### Usage

Once set up, the workflow runs automatically when you push a tag:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

The workflow will:
- Build the APK via EAS Build
- Create a GitHub Release at `https://github.com/robdevtech/CupboardNotes/releases/tag/v1.0.0`
- Attach the APK to the release

### Manual builds

You can also build and release manually without the workflow:

```bash
# Build APK
npm run eas:build:android:apk

# Wait for build to complete in the EAS dashboard
# Download the APK

# Create release manually
gh release create v1.0.0 \
  --title "Cupboard Notes v1.0.0" \
  --notes "Release notes" \
  cupboard-notes-v1.0.0.apk
```

### Environment variables

The workflow uses:
- `EXPO_TOKEN`: Required for EAS CLI authentication (set as repository secret)
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions for release creation
- `EXPO_PUBLIC_DROPBOX_APP_KEY`: Set as EAS secret (not needed in workflow, configured in EAS project)

### Troubleshooting

**Build fails with "Project not configured"**
- Make sure you've run `eas init` to link the project to EAS
- Verify `extra.eas.projectId` exists in `app.json`

**"No EXPO_TOKEN secret found"**
- Follow the setup steps above to add the token to repository secrets

**Build times out**
- EAS builds typically complete in 10-20 minutes
- The workflow waits up to 1 hour before timing out
- Check the EAS dashboard for build logs if it takes longer

**APK download fails**
- Verify the build completed successfully in the EAS dashboard
- Check that the build profile produces an APK (not AAB)
