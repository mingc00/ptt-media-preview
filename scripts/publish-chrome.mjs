import { readFile } from 'node:fs/promises';

const API_ORIGIN = 'https://chromewebstore.googleapis.com';
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 24;

const requiredEnvironment = [
  'CHROME_WEB_STORE_ACCESS_TOKEN',
  'CHROME_WEB_STORE_PUBLISHER_ID',
  'CHROME_WEB_STORE_EXTENSION_ID',
  'EXTENSION_ZIP',
];

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const {
  CHROME_WEB_STORE_ACCESS_TOKEN: accessToken,
  CHROME_WEB_STORE_PUBLISHER_ID: publisherId,
  CHROME_WEB_STORE_EXTENSION_ID: extensionId,
  EXTENSION_ZIP: extensionZip,
} = process.env;

const itemName = `publishers/${publisherId}/items/${extensionId}`;
const authorization = { Authorization: `Bearer ${accessToken}` };

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  let data;

  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    data = { body };
  }

  if (!response.ok) {
    throw new Error(
      `Chrome Web Store API request failed (${response.status} ${response.statusText}): ${JSON.stringify(data)}`,
    );
  }

  return data;
}

function uploadInProgress(state) {
  return state === 'IN_PROGRESS' || state === 'UPLOAD_IN_PROGRESS';
}

console.log(`Uploading ${extensionZip} to Chrome Web Store item ${extensionId}`);
const upload = await request(`${API_ORIGIN}/upload/v2/${itemName}:upload`, {
  method: 'POST',
  headers: {
    ...authorization,
    'Content-Type': 'application/zip',
  },
  body: await readFile(extensionZip),
});

let uploadState = upload.uploadState;
for (let attempt = 1; uploadInProgress(uploadState) && attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
  console.log(`Upload is still processing (${attempt}/${MAX_POLL_ATTEMPTS})`);
  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

  const status = await request(`${API_ORIGIN}/v2/${itemName}:fetchStatus`, {
    headers: authorization,
  });
  uploadState = status.lastAsyncUploadState;
}

if (uploadState !== 'SUCCEEDED') {
  throw new Error(
    `Chrome Web Store upload did not succeed; final state: ${uploadState ?? 'unknown'}`,
  );
}

console.log('Upload succeeded; submitting the new version for review');
const submission = await request(`${API_ORIGIN}/v2/${itemName}:publish`, {
  method: 'POST',
  headers: {
    ...authorization,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    publishType: 'DEFAULT_PUBLISH',
    blockOnWarnings: true,
  }),
});

console.log(`Chrome Web Store submission state: ${submission.state ?? 'submitted'}`);
if (submission.warningInfo?.warnings?.length) {
  console.log(`Chrome Web Store warnings: ${JSON.stringify(submission.warningInfo.warnings)}`);
}
