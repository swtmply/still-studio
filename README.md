# Still Studio

An offline-first Next.js photobooth with four separate pages:

1. **Shoot** (`/shoot`): live camera, 4–6 shots, and a three-second video with every photo. Captured-photo previews stay hidden.
2. **Select** (`/select`): pick exactly four photos in strip order.
3. **Style** (`/style`): choose a frame and original, monochrome, or warm finish.
4. **Share** (`/share`): download the original PNG and scan an unlisted QR link for the four selected video moments.

## Run

Use Node.js 24, then:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173** and allow camera access. For a production build:

```sh
npm run build
npm start
```

## Storage and smaller files

Capture, selections, and styling stay in IndexedDB on the device. Completed strips remain in **My strips**. Refreshing restores the current session; starting a new session replaces that draft. Clearing browser data can remove local copies, so download favorites.

Only the four selected clips and the finished shared strip are uploaded on the sharing page:

- Videos: **720 × 480, 15 fps, approximately 800 kbps**, three seconds each, no audio. MP4 is preferred when supported; WebM is the fallback.
- Shared strip: **600 × 1800 JPEG**, quality 0.8. Individual captured images and unselected clips are not uploaded.
- Local download: the original **1200 × 3600 PNG** is preserved for printing at 2 × 6 inches.
- A shared session is capped below **4 MB**, with individual shared files limited to 900 KB. This stays within Vercel Functions' request limit and bounds storage use. Video encoders vary, so oversized recordings show a retry/download message rather than uploading without limits.

The default recording target is roughly 300 KB per clip, or about 1.2 MB for four clips before the JPEG and container overhead. Real file sizes depend on motion and the browser's encoder.

## Vercel Blob (Hobby)

The hosted app uses a **private Vercel Blob store**, connected to the project for production, preview, and development. The connection supplies `BLOB_READ_WRITE_TOKEN` (or `BLOB_STORE_ID` with platform OIDC) to server routes. Credentials never enter client code.

At setup, Hobby includes **1 GB storage and 10 GB Blob data transfer per month**, plus operation limits. See the current [Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) and [Hobby plan](https://vercel.com/docs/plans/hobby). Hobby is intended for personal, non-commercial projects. No paid upgrade or paid feature is enabled by this project. The included allowance is finite: check usage before events or wider public use.

Each completed share stores four clips, one JPEG, and a small manifest. Uploaded files are private; the application serves them only through random, unlisted session URLs. Anyone holding a session link can view that session. The public repository contains code, never browser photos, `.data`, build artifacts, or environment credentials.

Shared sessions persist until removed from Blob storage. No automatic retention/deletion policy is configured. Deleting a strip in **My strips** deletes only the browser copy, not an already-shared session. The Vercel storage dashboard can manage those shared copies.

### Local Wi-Fi mode

Without Blob credentials, local Next.js runs use `.data/shares/` and generate a QR using the booth's private Wi-Fi IPv4 address. Phones must be on the same reachable Wi-Fi, and the local server must stay running. No internet is required for local playback.

To force local sharing even when Blob credentials are present, set `SHARE_MODE=local` in `.env.local`. Optionally set `SHARE_HOST` to the booth's Wi-Fi IPv4 address if it has multiple adapters. Run the booth itself on localhost for camera access; phones only visit the video-viewer link and do not need camera permission.

Guest Wi-Fi isolation or a firewall can prevent phones reaching the booth. Local files survive restarts and are excluded from Git.

## Offline behavior

The service worker caches all four page shells and their Next.js static assets after the first complete load. Capture, selection, styling, and PNG download work offline. Navigation uses Next.js' native history integration, so changing steps does not require an online page fetch.

Hosted QR creation and playback require internet and a connected Blob store. Local QR creation and playback require the local server. Offline sharing failures keep the originals on the device and provide a retry action. API responses and shared media are excluded from the application service-worker cache.

## Deployment

The repository connects to Vercel for automatic deployments from `main`. Vercel uses the Next.js preset, Node.js 24, and the `npm run build` command. Media routes and the Blob store use Singapore (`sin1`).

For local development against the hosted store, link the intended Vercel project and use `vercel env pull .env.local`. Never commit `.env.local` or `.vercel/`. The `.env.example` file documents local sharing options without credentials.

## Structure

- `app/[[...step]]/page.js`: Next.js routes for the four studio steps.
- `components/`: React studio pages, session state, gallery, and phone viewer.
- `lib/media.js`: camera capture and reduced-size video recording.
- `lib/strip.js`: built-in frames, finishes, and original PNG export.
- `lib/compress.js`: smaller JPEG for sharing.
- `lib/storage.js`: browser session/gallery storage; existing records are preserved.
- `lib/shares.js`: private Blob storage and local-file fallback.
- `app/api/shares/`: share creation and metadata.
- `app/s/[token]/`: phone viewer and byte-range media responses.
- `public/sw.js`: offline page and asset cache. Bump its cache name when cached assets change.

No test files were added. Before event use, check a physical webcam and scan a QR on the actual phones and network you plan to support.
