# Life Archive

Life Archive is a local-first personal memory organizer and reader built with Nuxt 4, Vue, TypeScript, and Nuxt Content. It creates the folder structure for a memory, then lets VS Code, Obsidian, or another filesystem editor own the Markdown and media. The application defaults to the in-memory fixture repository, while a separate Markdown archive can be enabled locally without putting personal data in this public application repository.

## Run locally

```bash
npm install
npm run dev
```

The development server binds to `127.0.0.1`. Build the production bundle with `npm run build`, run the repository tests with `npm test`, and run TypeScript validation with `npm run typecheck`.

## Connect a private archive

The default mode is the sample repository. To use the external filesystem archive, set an absolute archive path and select the filesystem adapter:

```bash
NUXT_ARCHIVE_REPOSITORY=filesystem \
NUXT_ARCHIVE_DIR=/absolute/path/to/life-archive-data \
npm run dev
```

Location search uses Photon server-side. Override its endpoint or the optional MapLibre style when using a different hosted service:

```bash
NUXT_PHOTON_URL=https://photon.komoot.io/api \
NUXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/positron \
npm run dev
```

The default map style is OpenFreeMap's official Positron style rather than public OpenStreetMap community tiles. The MapLibre attribution control displays the OpenFreeMap/OpenStreetMap attribution from the style. Review the selected tile provider's current terms, attribution requirements, availability, and privacy policy before production use. Map tiles are loaded only after opening the picker, and the browser will contact that provider for the visible map viewport.

When `NUXT_ARCHIVE_DIR` is set without `NUXT_ARCHIVE_REPOSITORY`, filesystem mode is selected automatically. Set `NUXT_ARCHIVE_REPOSITORY=sample` to force fixtures while keeping an archive path configured.

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

The server reads `index.md` frontmatter and Markdown content, scans the adjacent `media/` directory, and returns normalized `Memory` objects. Markdown and original media remain the source of truth. Creation is available only in filesystem mode; the sample repository remains read-only. There is still no file watching, backup, or synchronization.

## Project structure

```text
app/
├── assets/css/main.css       # Design tokens and responsive editorial UI
├── components/               # Shell, navigation, cards, timeline entries, creation and external-editor actions
├── composables/              # Repository access used by pages
├── data/fixtures.ts          # Realistic sample memories for the MVP
├── pages/                    # Home, timeline, detail, gallery, map, settings
├── repositories/             # API adapter, contract and fixture adapter
├── types/memory.ts           # Shared memory schema
└── utils/                    # Date, location, and API error helpers
fixtures/archive/             # Sample Markdown source examples, outside app content/
public/sample-media/          # Offline sample media referenced by the fixtures
server/api/                   # Typed memory, geocoding, EXIF, map, and media endpoints
server/repositories/          # External filesystem repository and tests
server/utils/                 # Runtime repository selection, geocoding, EXIF, and query validation
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
- `GET /api/memories/YYYY-MM-DD`
- `GET /api/search?q=<query>` with optional `year` and `type` filters
- `GET /api/geocode?q=<place-query>` for normalized Photon suggestions
- `POST /api/reverse-geocode` for explicit accepted-EXIF labels, with coordinates in the request body
- `GET /api/map` for coordinate-bearing memory previews with combined filters
- `GET /api/memories/YYYY-MM-DD/location-suggestions` for explicit local EXIF inspection
- `GET /api/archive-media/YYYY-MM-DD/<media-path>` for validated filesystem media

The write API surface is filesystem-only:

- `POST /api/memories` to create a memory
- `PATCH /api/memories/YYYY-MM-DD/location` to accept or explicitly correct structured location metadata with an expected version
- `DELETE /api/memories/YYYY-MM-DD` with `expectedVersion` to delete a memory and its media

The creation form at `/memory/new` collects the date, title, type, location, mood, and tags. Location text can remain manual, or use server-side Photon suggestions, a lazy MapLibre picker, or an explicit browser-device location action. Only the location query is sent to Photon; memory content and metadata are not included. On success it creates `YYYY/MM/DD/index.md` with YAML frontmatter, creates the adjacent `media/` directory, and writes a minimal `# What happened` body. The success state and every filesystem-backed detail page provide the archive folder path, an `Open in VS Code` action using the registered `vscode://file/...` URI handler, and a `Copy path` fallback. Life Archive does not edit Markdown or upload media.

The search page at `/search` searches titles, Markdown body text, tags, and locations with case-insensitive partial matching. Results are read from the current repository on every search, ordered newest first, and can be narrowed by year and memory type. Markdown formatting is removed for body matching and result excerpts.

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

The external archive is intentionally handled by the server adapter instead of being registered as a Nuxt Content collection. The renderer receives only the normalized Markdown content for the requested memory.

## Tests

`server/repositories/filesystem-memory-repository.test.ts` covers metadata creation, expected folder structure, starter Markdown, duplicate-date protection, externally modified Markdown, direct filesystem media discovery, relative image/video/audio/PDF references, relative-reference preservation, deletion version checks, path traversal, symlink escapes, and atomic cleanup. `app/repositories/api-memory-repository.test.ts` covers metadata-only creation and versioned deletion.
