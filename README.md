# Moments in Ink

The online booth at `/` prints borderless 100 × 148 mm Japanese Postcards. Choose a 2 × 3, 2 × 2, or single-photo layout, then take eight shots seven seconds apart. Booth screens advance after at most 60 seconds. Camera setup starts shooting when the timer ends if the guest has enabled the camera. Otherwise it returns to welcome. Photo selection fills any open slots in capture order, and the preview automatically confirms when time runs out. The share screen returns to welcome on its own or when the guest selects **Finish and return to welcome**.

- **Frames:** `/admin/frames` shows a preview of each preset and uploaded frame. Use it to rename or remove presets, or to rename, replace, and delete uploaded frames. PNG overlays must be exactly 1110 × 1710 px, have transparent photo windows, and be up to 2 MB. The page shows the cell dimensions for each layout. Changes require a randomly generated server-side `INK_ADMIN_TOKEN` of at least 32 characters.
- **Shares:** One private GIF per postcard, capped at 450 KB. Both the viewer and media URL stop serving it after six hours. Vercel Workflow schedules deletion at that time. Blob’s one-day native TTL provides a fallback. The production app needs a private Vercel Blob connection and Vercel Workflows. Local workflow execution is intended for development and requires the local worker to be running.
- **Printing:** The 1200 × 1776 px postcard fills a 100 × 148 mm print page with zero CSS margins. Preset frames include a printed header and footer above and below their photo windows. Uploaded 1110 × 1710 px overlays keep their own artwork. Select **Japanese Postcard**, 100% scale, no margins, and the printer’s **Borderless** setting. Turn off browser headers and footers if they appear.

## Original offline booth

The original Still Studio flow remains available at `/shoot`, with four separate pages:

1. **Shoot** (`/shoot`): live camera, up to eight shots, and a three-second video with every photo. Captured-photo previews stay hidden.
2. **Select** (`/select`): choose a 4-, 6-, or 8-photo set, then pick your favorites in print order.
3. **Style** (`/style`): choose among eight layouts, twelve frames, and nine photo finishes. Layout, Frame, and Filter tabs keep the options manageable.
4. **Share** (`/share`): print or download the original PNG and scan an unlisted QR link for the selected video moments.

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

## Layouts and styles

- **Four photos:** Classic strip (1 × 4), Square quartet (2 × 2), Photo row (4 × 1).
- **Six photos:** Six together (2 × 3), Wide six (3 × 2), Long story (1 × 6).
- **Eight photos:** Eight moments (2 × 4), Memory board (4 × 2).
- **Frames:** Classic, Midnight, Petal, Butter, Olive, Postcard, Sakura, Ocean, Gingham, Confetti, Starlight, Film club.
- **Filters:** Original, B & W, Warm, Vintage, Cool, Faded, Noir, Rose, Golden.

Photos are centered and cropped to fit each layout. The preview and PNG use the same renderer, including patterned frames. A saved session without a photo count or layout uses the original four-photo classic strip. Changing photo count preserves the first selected photos that still fit; you can capture more shots if needed.

## Storage and smaller files

**Print this moment** opens the browser's print dialog with only the finished image. Paper size follows the selected layout at 600 pixels per inch: Classic strip 2 × 6 in, Square quartet 3 × 3 in, Photo row 6 × 2.25 in, Six together 4 × 5 in, Wide six 5 × 3.5 in, Long story 2 × 8.5 in, Eight moments 4 × 6.2 in, and Memory board 6 × 4 in. The size is shown beside the button. Choose a printer and paper that support that size, use 100% scale and no margins, and disable headers and footers. Printer drivers can override the requested paper size; use fit-to-paper if printing on another size. Printing uses the original local PNG and works without uploading or an internet connection. The browser requires printer selection in its dialog; automatic routing to dedicated printers would need a local print service.

Capture, selections, and styling stay in IndexedDB on the device. Completed strips remain in **My strips**. Refreshing restores the current session; starting a new session replaces that draft. Clearing browser data can remove local copies, so download favorites.

Only the 4, 6, or 8 selected clips and the finished shared print are uploaded on the sharing page:

- Videos: **720 × 480, 15 fps, approximately 800 kbps**, three seconds each, no audio. MP4 is preferred when supported; WebM is the fallback.
- Shared strip: **JPEG with a maximum 1800-pixel edge**, quality 0.8, preserving the chosen layout’s aspect ratio (600 × 1800 for the classic strip). Individual captured images and unselected clips are not uploaded.
- Local download: a full-resolution PNG is preserved for each layout. The classic four-photo strip remains **1200 × 3600**; grid, wide, and six-photo strip layouts use their own dimensions.
- A shared session is capped below **4 MB**, with individual shared files limited to 900 KB. This stays within Vercel Functions' request limit and bounds storage use. Video encoders vary, so oversized recordings show a retry/download message rather than uploading without limits.

The default recording target is roughly 300 KB per clip, or about 1.2 MB for four clips / 2.4 MB for eight clips before the JPEG and container overhead. Real file sizes depend on motion and the browser's encoder.

## Vercel Blob (Hobby)

The hosted app uses a **private Vercel Blob store**, connected to the project for production, preview, and development. The connection supplies `BLOB_READ_WRITE_TOKEN` (or `BLOB_STORE_ID` with platform OIDC) to server routes. Credentials never enter client code.

At setup, Hobby includes **1 GB storage and 10 GB Blob data transfer per month**, plus operation limits. See the current [Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) and [Hobby plan](https://vercel.com/docs/plans/hobby). Hobby is intended for personal, non-commercial projects. No paid upgrade or paid feature is enabled by this project. The included allowance is finite: check usage before events or wider public use.

Each completed share stores 4, 6, or 8 clips, one JPEG, and a small manifest. Uploaded files are private; the application serves them only through random, unlisted session URLs. Anyone holding a session link can view that session. The public repository contains code, never browser photos, `.data`, build artifacts, or environment credentials.

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

- `app/[...step]/page.js`: routes for the four original offline studio steps.
- `components/`: React studio pages, session state, gallery, and phone viewer.
- `lib/media.js`: camera capture and reduced-size video recording.
- `lib/strip.js`: shared layout geometry, twelve frame designs, nine finishes, and the canvas renderer used by both live previews and original PNG exports.
- `lib/compress.js`: smaller JPEG for sharing.
- `lib/storage.js`: browser session/gallery storage; existing records are preserved.
- `lib/shares.js`: private Blob storage and local-file fallback.
- `app/api/shares/`: share creation and metadata.
- `app/s/[token]/`: phone viewer and byte-range media responses.
- `public/sw.js`: offline page and asset cache. Bump its cache name when cached assets change.

No test files were added. Before event use, check a physical webcam and scan a QR on the actual phones and network you plan to support.
