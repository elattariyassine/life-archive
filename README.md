# Life Archive

Life Archive is a local-first personal memory organizer and reader built with Nuxt 4, Vue, TypeScript, and Nuxt Content. It creates the folder structure for a memory, then lets VS Code, Obsidian, or another filesystem editor own the Markdown and media. Without configuration it shows built-in sample memories; point `NUXT_ARCHIVE_DIR` at your own Markdown archive to use it, without putting personal data in this application repository.

## Run locally

```bash
cp .env.example .env   # then set NUXT_ARCHIVE_DIR (see below)
npm install
npm run dev
```

The development server binds to `127.0.0.1`. Build the production bundle with `npm run build`, run the repository tests with `npm test`, and run TypeScript validation with `npm run typecheck`.

## Connect your archive

Set the absolute path of your archive folder in `.env`:

```bash
NUXT_ARCHIVE_DIR=/absolute/path/to/life-archive-data
```

When `NUXT_ARCHIVE_DIR` is set, Life Archive reads and creates memories in that folder. When it is empty, the app shows the built-in sample memories, which are read-only. `.env` is ignored by Git, so the path to your personal data never ends up in this repository. Restart the server after changing it.

Location search uses Photon server-side. Override its endpoint or the optional MapLibre style in `.env` when using a different hosted service:

```bash
NUXT_PHOTON_URL=https://photon.komoot.io/api
NUXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/positron
```

The default map style is OpenFreeMap's official Positron style rather than public OpenStreetMap community tiles. The MapLibre attribution control displays the OpenFreeMap/OpenStreetMap attribution from the style. Review the selected tile provider's current terms, attribution requirements, availability, and privacy policy before production use. Map tiles are loaded only after opening the map, and the browser will contact that provider for the visible map viewport.

## Run with Docker

The image contains only the application. Your archive stays in its folder on your machine and is bind-mounted into the container at `/archive`, so stopping, removing, or rebuilding the container, including `docker compose down -v`, never changes or deletes it.

```bash
cp .env.example .env   # set NUXT_ARCHIVE_DIR to your archive folder
docker compose up -d --build
```

Open <http://127.0.0.1:3000>. The port is published on `127.0.0.1` only, so the archive is not reachable from your network; set `LIFE_ARCHIVE_PORT` in `.env` to use another port. Compose refuses to start when `NUXT_ARCHIVE_DIR` is empty or points to a folder that does not exist, instead of silently creating an empty one.

Inside the container the app uses `NUXT_ARCHIVE_DIR=/archive`. Compose also passes your host path as `NUXT_ARCHIVE_HOST_DIR`, so "Open in VS Code" and "Copy path" show paths on your machine rather than container paths. Thumbnails are cached in the container's temporary directory and are regenerated after the container is recreated.

The container runs as the unprivileged `node` user (UID 1000). On Linux, the archive folder must be writable by that UID to create or delete memories; Docker Desktop on macOS and Windows handles this automatically.

```bash
docker compose logs -f     # follow logs
docker compose down        # stop and remove the container; the archive is untouched
```

The archive is expected to look like this:

```text
life-archive-data/
├── 2025/
│   └── 08/
│       └── 15/
│           ├── index.md
│           └── media/
│               └── photo-01.jpg
└── 2026/
    └── 11/
        └── 10/
            ├── index.md
            └── media/
                └── photo-01.jpg
```

The server reads `index.md` frontmatter and Markdown content, scans the adjacent `media/` directory, and returns normalized `Memory` objects. Markdown and original media remain the source of truth. Creating and deleting memories is available only when `NUXT_ARCHIVE_DIR` is set; the sample memories are read-only. There is no backup or synchronization, and no file watching: open pages re-read the archive when the browser tab regains focus.

## Project structure

```text
app/
├── assets/css/main.css       # Design tokens and responsive editorial UI
├── components/               # Shell, tab bar, filter bar, timeline entries, dialogs, creation and external-editor actions
├── composables/              # Repository access, URL filters, archive status, theme, progressive lists
├── data/fixtures.ts          # Realistic sample memories for the MVP
├── error.vue                 # Branded 404/error page that suggests the nearest memories
├── pages/                    # Home, timeline, calendar, detail, gallery, map, settings, random
├── repositories/             # API adapter, contract and fixture adapter
├── types/memory.ts           # Shared memory schema
└── utils/                    # Date, filter, discovery (on this day, related, calendar), location, and API error helpers
fixtures/archive/             # Sample Markdown source examples, outside app content/
public/sample-media/          # Offline sample media referenced by the fixtures
server/api/                   # Typed memory, geocoding, EXIF, map, and media endpoints
server/repositories/          # External filesystem repository and tests
server/utils/                 # Runtime repository selection, summaries, thumbnails, geocoding, EXIF, and query validation
Dockerfile, compose.yaml      # Production image and Compose setup; the archive is bind-mounted, never copied in
.env.example                  # Template for .env (NUXT_ARCHIVE_DIR and optional overrides)
```

## Data architecture

The UI depends on this contract, not on the filesystem format, Nuxt Content's data layer, or a database:

```ts
interface MemoryRepository {
  getMemories(filters?: { year?: number; month?: number }): Promise<Memory[]>
  getMemoryByDate(date: string): Promise<Memory | null>
  getMemoriesByYear(year: number): Promise<Memory[]>
}
```

`app/repositories/memory-repository.ts` provides `createFixtureMemoryRepository()`. `server/repositories/filesystem-memory-repository.ts` provides `createFilesystemMemoryRepository()`. Pages call `useMemoryRepository()`, which talks to the server API and does not know how entries are loaded.

The read API surface is:

- `GET /api/memories` with optional `year` and `month` query parameters
- `GET /api/summaries` for every memory without its Markdown body, plus `wordCount`, `draft`, and media thumbnails; lists, grids, the calendar, and navigation use this
- `GET /api/filter-options` for the years, tags, moods, countries, and cities used by the shared filter bar
- `GET /api/memories/YYYY-MM-DD`
- `GET /api/search?q=<query>` with optional `year` and `type` filters
- `GET /api/geocode?q=<place-query>` for normalized Photon suggestions
- `POST /api/reverse-geocode` for explicit accepted-EXIF labels, with coordinates in the request body
- `GET /api/map` for coordinate-bearing memory previews with combined filters
- `GET /api/memories/YYYY-MM-DD/location-suggestions` for explicit local EXIF inspection
- `GET /api/archive-media/YYYY-MM-DD/<media-path>` for validated filesystem media; add `?w=320|640|1280` for a cached WebP thumbnail of JPEG, PNG, WebP, AVIF, or TIFF images (generated with `sharp` into the OS temp directory, never inside the archive)

The write API surface is filesystem-only:

- `POST /api/memories` to create a memory
- `PATCH /api/memories/YYYY-MM-DD/location` to accept or explicitly correct structured location metadata with an expected version
- `DELETE /api/memories/YYYY-MM-DD` with `expectedVersion` to delete a memory and its media

The creation dialog (press `N`, or choose an empty past day in the calendar; `/memory/new` opens it) is available only when a filesystem archive is connected, and otherwise explains why. It warns before submitting when the chosen date already holds a memory, since each day has one folder. It collects the date, title, type, location, mood, and tags. Location text can remain manual, or use server-side Photon suggestions, a lazy MapLibre picker, or an explicit browser-device location action. Only the location query is sent to Photon; memory content and metadata are not included. On success it creates `YYYY/MM/DD/index.md` with YAML frontmatter, creates the adjacent `media/` directory, and writes a minimal `# What happened` body. The success state and every filesystem-backed detail page provide the archive folder path, an `Open in VS Code` action using the registered `vscode://file/...` URI handler, and a `Copy path` fallback. Life Archive does not edit Markdown or upload media.

Search (press `⌘K`/`Ctrl+K`; `/search` opens it) searches titles, Markdown body text, tags, and locations with case-insensitive partial matching. Results are read from the current repository on every search, ordered newest first, and can be narrowed by year and memory type. Markdown formatting is removed for body matching and result excerpts.

Timeline, gallery, and map share URL-based filters (`year`, `type`, `tag`, `mood`, `country`, `city`), so a filtered view can be bookmarked and shared, and the tags, places, types, and moods shown on a memory link to those filtered views. The home page shows memories from the same day in earlier years (or the same week when the day is empty), `/calendar` shows each year as month grids, `/random` opens a random memory, and each memory suggests related pages by shared tags, place, and season. Data is re-read when the browser tab regains focus, so edits made in an external editor appear without a reload. The interface supports light and dark themes (System, Light, or Dark in Settings, stored in a cookie).

Missing archive roots return an empty list for reads. Invalid or malformed entries are skipped. Invalid dates and filters return a client error. Filesystem-backed memory responses include the resolved memory folder path so the local UI can offer external editing actions; the server never accepts that path as an API input.

Every filesystem read returns a SHA-256 `version` derived from the raw `index.md`. Deletes require that version. Creation uses a temporary directory and atomic rename, and an existing date directory is never overwritten. Markdown is never rewritten by the application, so external edits and relative references remain intact on disk.

Media is managed directly in the filesystem. The reader discovers files already present in `media/`, renders relative image, video, audio, and PDF references at their original Markdown positions, and transforms their URLs only in the response sent to the renderer. The stored Markdown remains relative and works in Obsidian. Unreferenced files remain in `media/`.

Opening VS Code depends on the browser and operating system recognizing the `vscode://` protocol. Browsers may prompt, ignore, or block the request, so the copyable folder path is always provided as the fallback. No desktop app or background process is installed by Life Archive.

Markdown remains the source of truth. `fixtures/archive/2026/11/10/` is a complete demonstration entry with all metadata, multiple relative image references, an audio file, a video, and a PDF in its `media/` directory. Point `NUXT_ARCHIVE_DIR` at `fixtures/archive/` to inspect the same filesystem workflow locally. The TypeScript fixture data is only the temporary sample implementation for this phase.

## Markdown rendering boundary

Installed versions:

- `@nuxt/content` `3.16.2`

The app uses Nuxt Content's `<MDC>` component only to render Markdown content returned by the memory repository. It does not use Nuxt Content collections or the project's `content/` directory. The external archive remains owned by the filesystem repository and is never passed to Nuxt Content as a data source.

## Security boundary

Dates are strictly validated before path resolution. Filesystem media paths are resolved with `realpath` and must remain inside both the archive root and the requested date's `media/` directory. No API parameter accepts an arbitrary filesystem path. The resolved memory folder path is returned only to support the local external-editor actions.

Geocoding queries are trimmed, limited to 120 characters, capped at five normalized results, and proxied through the server with a five-second timeout. Provider responses are validated before reaching the client. Device location is requested only after the user clicks the action and is labeled as approximate. Precise coordinates are not logged by the geocoding or location-selection code.

EXIF inspection is explicit and local-only. The server reads supported image files through the same archive path resolver used by media delivery, returns no absolute paths, and never uploads photographs. Accepting a coordinate-only EXIF suggestion may make one explicit reverse-geocoding request for a readable label; rejecting it performs no filesystem write. The map endpoint returns only metadata needed for markers and previews, never Markdown bodies or folder paths.

Markdown media can use semantic figures for visible captions. Relative media paths are rewritten to the secure archive endpoint:

```html
<figure class="memory-figure">
  <img src="./media/photo.jpg" alt="Photo prise de la matinée">
  <figcaption>13 October 2026 · Morning</figcaption>
</figure>
```

Two images can be placed side by side with a responsive image pair. It collapses to one column on small screens:

```html
<div class="memory-image-pair">
  <figure class="memory-figure">
    <img src="./media/one.jpg" alt="First photo">
    <figcaption>Morning</figcaption>
  </figure>
  <figure class="memory-figure">
    <img src="./media/two.jpg" alt="Second photo">
    <figcaption>Later that day</figcaption>
  </figure>
</div>
```

The external archive is intentionally handled by the server adapter instead of being registered as a Nuxt Content collection. The renderer receives only the normalized Markdown content for the requested memory.

## Tests

`server/repositories/filesystem-memory-repository.test.ts` covers metadata creation, expected folder structure, starter Markdown, duplicate-date protection, externally modified Markdown, direct filesystem media discovery, relative image/video/audio/PDF references, relative-reference preservation, deletion version checks, path traversal, symlink escapes, and atomic cleanup. `app/repositories/api-memory-repository.test.ts` covers metadata-only creation and versioned deletion.
