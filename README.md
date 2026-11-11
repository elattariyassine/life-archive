# Life Archive

Life Archive is a local-first personal memory archive built with Nuxt 4, Vue, TypeScript, and Nuxt Content. The application now reads through a typed API repository. It defaults to the in-memory fixture repository, while a separate Markdown archive can be enabled locally without putting personal data in this public application repository.

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

The server reads `index.md` frontmatter and Markdown content, scans the adjacent `media/` directory, and returns normalized `Memory` objects. Markdown and original media remain the source of truth. This phase does not write, watch, upload, or modify archive files.

## Project structure

```text
app/
├── assets/css/main.css       # Design tokens and responsive editorial UI
├── components/               # Shell, navigation, cards, metadata, timeline entries
├── composables/              # Repository access used by pages
├── data/fixtures.ts          # Realistic sample memories for the MVP
├── pages/                    # Home, timeline, detail, gallery, settings
├── repositories/             # API adapter, contract and fixture adapter
├── types/memory.ts           # Shared memory schema
└── utils/memory.ts           # Date, type and grouping helpers
fixtures/archive/             # Sample Markdown source examples, outside app content/
public/sample-media/          # Offline sample media referenced by the fixtures
server/api/                   # Typed memory and validated media endpoints
server/repositories/          # External filesystem repository and tests
server/utils/                 # Runtime repository selection and query validation
```

## Data architecture

The UI depends on this contract, not on Markdown, Nuxt Content, or a database:

```ts
interface MemoryRepository {
  getMemories(filters?: { year?: number; month?: number }): Promise<Memory[]>
  getMemoryByDate(date: string): Promise<Memory | null>
  getMemoriesByYear(year: number): Promise<Memory[]>
}
```

`app/repositories/memory-repository.ts` provides `createFixtureMemoryRepository()`. `server/repositories/filesystem-memory-repository.ts` provides `createFilesystemMemoryRepository()`. Pages call `useMemoryRepository()`, which talks to the server API and does not know how entries are loaded.

The API surface is:

- `GET /api/memories` with optional `year` and `month` query parameters
- `GET /api/memories/YYYY-MM-DD`
- `GET /api/archive-media/YYYY-MM-DD/<media-path>` for validated filesystem media

Missing archive roots return an empty list. Invalid or malformed entries are skipped. Invalid dates and filters return a client error. API responses never include the configured absolute archive path.

Markdown remains the source of truth. `fixtures/archive/` shows the intended folder and frontmatter shape without placing a personal archive inside the application repository. The TypeScript fixture data is only the temporary sample implementation for this phase.

## Nuxt Content and Nuxt Studio boundary

Installed versions:

- `@nuxt/content` `3.16.2`
- `nuxt-studio` `1.8.0` (installed, not enabled in the current config)

Nuxt Content documents that it reads the project's `content/` directory into its content data layer. Nuxt Studio's local editing mode writes files in that same `content/` directory. Studio's production publishing flow targets a configured GitHub or GitLab repository and supports a repository `rootDir` for a subdirectory, not an arbitrary filesystem path outside the application project.

Because the personal archive is intentionally a separate local repository, this MVP does not register Studio or pretend that an external directory is supported. Enabling it against the wrong directory would make the public app's content folder, rather than the archive, the editable source.

## Security and Nuxt Content boundary

The archive root is private runtime configuration and is never returned to the client. Dates are strictly validated before path resolution. Filesystem media paths are resolved with `realpath` and must remain inside both the archive root and the requested date's `media/` directory. No API parameter accepts an arbitrary filesystem path.

Nuxt Content 3.16.2 still reads the project's `content/` directory. Nuxt Studio 1.8.0 edits that same directory and is not enabled here. The external archive is intentionally handled by the server adapter instead of being passed to Nuxt Content or Studio.

## Tests

`server/repositories/filesystem-memory-repository.test.ts` covers valid Markdown, chronological ordering, year/month filters, nonexistent dates, invalid dates, malformed Markdown, missing media, missing archive directories, and path traversal attempts.
