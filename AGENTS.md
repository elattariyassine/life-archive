# Agent guide

Life Archive is a local-first reader and organizer for a personal archive of Markdown memories. Read this before changing code. For the memory file format (frontmatter, media, figures), use the `memory-format` skill in `.agents/skills/`.

## Principles

- **Markdown is the source of truth.** The app never rewrites a memory's body. It creates a folder with a starter `index.md`, and it can update the `location` frontmatter field after an explicit user action. Writing happens in the user's editor.
- **Keep it simple.** No database, accounts, sync, or background processes. Prefer a small, readable change over a new abstraction or dependency.
- **Works with zero configuration.** Without `NUXT_ARCHIVE_DIR` the app serves read-only sample memories (`app/data/fixtures.ts`). `npm run dev` and Docker must behave the same way.
- **Private by default.** Memory content never leaves the server except to the browser viewing it. Only the location query goes to Photon, and the browser only contacts the map tile provider.

## Commands

```bash
npm run dev         # dev server on 127.0.0.1, reads .env
npm test            # vitest
npm run typecheck   # nuxt typecheck
npm run build       # production build in .output/
docker compose up -d --build
```

Run `npm test` and `npm run typecheck` before finishing a change. Use the Nuxt MCP server (configured in `opencode.json`) for Nuxt 4 APIs instead of memory.

## Layout

```text
app/
├── assets/css/main.css   # The entire design system: tokens, light/dark themes, layout, responsive rules
├── components/           # Shell, tab bar, filter bar, timeline entries, dialogs, creation and editor actions
├── composables/          # Repository access, URL filters, archive status, theme, progressive lists, today
├── data/fixtures.ts      # Sample memories served when no archive is configured
├── error.vue             # 404/error page that suggests the nearest memories
├── pages/                # Home, timeline, calendar, memory/[date], gallery, map, settings, random
├── plugins/              # MDC image component, refresh-on-focus
├── repositories/         # API adapter (client) and fixture repository
├── types/                # Memory, API, and location types shared by client and server
└── utils/                # Dates, filters, discovery (on this day, related, calendar), location, errors
fixtures/archive/         # The same sample memories as Markdown, for testing filesystem mode
public/sample-media/      # Images referenced by the sample memories
server/api/               # Memory, summary, search, map, geocoding, EXIF, and media endpoints
server/repositories/      # Filesystem repository and its tests
server/utils/             # Repository selection, summaries, thumbnails, geocoding, EXIF, query validation
```

## Data flow

Pages call `useMemoryRepository()` / `useMemorySummaries()`, which talk to the server API. The server picks a repository in `server/utils/memory-repository.ts`: the filesystem repository when `NUXT_ARCHIVE_DIR` is set, the fixture repository otherwise. The UI never knows which one is active, except through `GET /api/status` (`useArchiveStatus()`), which decides whether creating a memory is possible.

Read endpoints:

- `GET /api/summaries` returns every memory without its Markdown body, plus `wordCount`, `draft`, and media thumbnails. Lists, grids, the calendar, related pages, and navigation use this.
- `GET /api/memories`, optionally filtered by `year`, `month`, and `type`, returns full memories.
- `GET /api/memories/YYYY-MM-DD` returns one full memory, with `version` and `folderPath` in filesystem mode.
- `GET /api/search?q=` searches titles, bodies, tags, and places, optionally filtered by `year` and `type`.
- `GET /api/map` returns coordinate-bearing memories only. `GET /api/filter-options` returns the values for the filter bar.
- `GET /api/archive-media/YYYY-MM-DD/<path>` serves validated archive media. With `?w=320|640|1280` it returns a cached WebP thumbnail made with `sharp` in the OS temp directory, never inside the archive.
- `GET /api/geocode`, `POST /api/reverse-geocode`, and `GET /api/memories/YYYY-MM-DD/location-suggestions` (local EXIF inspection) handle places.

Write endpoints work in filesystem mode only:

- `POST /api/memories`
- `PATCH /api/memories/YYYY-MM-DD/location`
- `DELETE /api/memories/YYYY-MM-DD`

Writes that change an existing memory take the `expectedVersion` (SHA-256 of `index.md`) and fail with 409 if the file changed outside the app.

## Invariants

- **One memory per day:** the folder is `YYYY/MM/DD/`. Creation uses a temporary directory and an atomic rename, and never overwrites an existing date.
- **Paths:** dates are validated before any path is resolved. Media paths are resolved with `realpath` and must stay inside the archive root and that day's `media/` folder. No endpoint accepts a filesystem path as input.
- **Folder paths:** `folderPath` is returned only for the "Open in VS Code" and "Copy path" actions. When the server sees the archive at another path (Docker mounts it at `/archive`), `NUXT_ARCHIVE_HOST_DIR` maps it back to the host path (`toClientMemory`).
- **Media URLs:** relative media references are rewritten to `/api/archive-media/...` only in responses. Stored Markdown stays relative, so it keeps working in Obsidian.
- **Nuxt Content:** only its `<MDC>` component is used, to render memory bodies. The archive is never registered as a Content collection.
- **Locations:** geocoding queries are trimmed, capped at 120 characters and five results, and proxied with a five-second timeout. Device location is requested only after a click. Precise coordinates are never logged.

## UI conventions

- **Design tokens:** use the tokens in `:root` (`--paper`, `--paper-deep`, `--ink`, `--muted`, `--line`, `--accent`, `--olive`, `--danger`, `--placeholder`) and no raw colors. Every token is redefined for dark mode, so check both themes. Text drawn over photos stays white.
- **Readability:** text is at least 12px (11px for keyboard hints). Keep text at WCAG AA contrast (4.5:1) on both `--paper` and `--paper-deep`.
- **Typography:** serif (Newsreader) for titles and memory text, sans (Inter) for interface labels. Both fonts are bundled through `@fontsource-variable`, so there are no external font requests.
- **Filters:** filters live in the URL (`useArchiveFilters()`). Link metadata to filtered views with `archiveFilterLink()` instead of adding page-local filter state.
- **Lists:** long lists use `useProgressiveList()`. Grids use `media.thumb || media.src`.
- **Dialogs:** use `ModalShell` (`ConfirmDialog` for destructive actions), never `window.confirm`.
- **Responsive:** layouts must work at phone width. Below 800px the header nav is replaced by the bottom tab bar.

## Tests

- `server/repositories/filesystem-memory-repository.test.ts` covers creation, duplicate dates, external edits, media discovery and references, version checks, path traversal, symlink escapes, and atomic cleanup.
- Utility tests sit next to their files (`*.test.ts`).
- Add tests for new pure logic (filters, discovery, path handling) next to the code.

## Docker

The image ships only `.output/`.
- `compose.yaml` bind-mounts `NUXT_ARCHIVE_DIR` from the host at `/archive`. When that variable is empty, it mounts an unused placeholder volume, so the app runs on the sample memories.
- The container runs as the `node` user (UID 1000). On Linux hosts the archive must be writable by that UID.
- `better-sqlite3` compiles during the build stage, which installs `python3`, `make`, and `g++` for that.
