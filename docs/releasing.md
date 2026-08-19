# Publishing releases

Publishing starts when a GitHub release named `v<version>` is published. The tag, `package.json`, and
`manifest.json` versions must match. The workflow builds the extension, attaches the extension and source
archives to the GitHub release, waits for approval from the `production` environment, and then submits the
release to Chrome Web Store and Firefox Add-ons separately.

## GitHub environment

Create an environment named `production` in **Settings > Environments** and enable required reviewers.
Add the following environment variables:

- `CHROME_WEB_STORE_EXTENSION_ID`: `khanhghjfcpmgkomfomadomnckjakglm`
- `CHROME_WEB_STORE_PUBLISHER_ID`: the ID under **Publisher > Settings** in the Chrome Web Store dashboard
- `GCP_PROJECT_ID`: the Google Cloud project with Chrome Web Store API enabled
- `GCP_SERVICE_ACCOUNT`: the service account email authorized in the Chrome Web Store dashboard
- `GCP_WORKLOAD_IDENTITY_PROVIDER`: the full GitHub workload identity provider resource name

Add these environment secrets from the [Firefox Add-ons API credentials page](https://addons.mozilla.org/developers/addon/api/key/):

- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

## Chrome authentication

1. Enable Chrome Web Store API in the Google Cloud project.
2. Create a service account and add its email under **Account** in the Chrome Web Store developer dashboard.
3. Configure a Workload Identity Pool and GitHub provider restricted to this repository.
4. Allow that GitHub identity to impersonate the service account with `roles/iam.workloadIdentityUser`.

No Google service account key or OAuth refresh token is stored in GitHub.

## Publishing

1. Update the version with `npm version patch`, `npm version minor`, or `npm version major`.
2. Push the version commit and tag.
3. Create and publish the corresponding GitHub release.
4. Review the build and approve the `production` deployment.

Publishing submits both extensions for store review. A successful workflow means submission succeeded, not
that either store has completed its review.
