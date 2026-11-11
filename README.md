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
├── pages/                    # Home, timeline, detail, gallery, settings
├── repositories/             # API adapter, contract and fixture adapter
├── types/memory.ts           # Shared memory schema
└── utils/                    # Date and API error helpers
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

The read API surface is:

- `GET /api/memories` with optional `year` and `month` query parameters
- `GET /api/memories/YYYY-MM-DD`
- `GET /api/archive-media/YYYY-MM-DD/<media-path>` for validated filesystem media

The write API surface is filesystem-only:

- `POST /api/memories` to create a memory
- `DELETE /api/memories/YYYY-MM-DD` with `expectedVersion` to delete a memory and its media

The creation form at `/memory/new` collects the date, title, type, location, mood, and tags. On success it creates `YYYY/MM/DD/index.md` with YAML frontmatter, creates the adjacent `media/` directory, and writes a minimal `# What happened` body. The success state and every filesystem-backed detail page provide the archive folder path, an `Open in VS Code` action using the registered `vscode://file/...` URI handler, and a `Copy path` fallback. Life Archive does not edit Markdown or upload media.

Missing archive roots return an empty list for reads. Invalid or malformed entries are skipped. Invalid dates and filters return a client error. Filesystem-backed memory responses include the resolved memory folder path so the local UI can offer external editing actions; the server never accepts that path as an API input.

Every filesystem read returns a SHA-256 `version` derived from the raw `index.md`. Deletes require that version. Creation uses a temporary directory and atomic rename, and an existing date directory is never overwritten. Markdown is never rewritten by the application, so external edits and relative references remain intact on disk.

Media is managed directly in the filesystem. The reader discovers files already present in `media/`, renders relative image, video, audio, and PDF references at their original Markdown positions, and transforms their URLs only in the response sent to the renderer. The stored Markdown remains relative and works in Obsidian. Unreferenced files remain in `media/`.

Opening VS Code depends on the browser and operating system recognizing the `vscode://` protocol. Browsers may prompt, ignore, or block the request, so the copyable folder path is always provided as the fallback. No desktop app or background process is installed by Life Archive.

Markdown remains the source of truth. `fixtures/archive/2026/11/10/` is a complete demonstration entry with all metadata, multiple relative image references, an audio file, a video, and a PDF in its `media/` directory. Point `NUXT_ARCHIVE_DIR` at `fixtures/archive/` to inspect the same filesystem workflow locally. The TypeScript fixture data is only the temporary sample implementation for this phase.

## Nuxt Content and Nuxt Studio boundary

Installed versions:

- `@nuxt/content` `3.16.2`
- `nuxt-studio` `1.8.0` (installed, not enabled in the current config)

Nuxt Content documents that it reads the project's `content/` directory into its content data layer. Nuxt Studio's local editing mode writes files in that same `content/` directory. Studio's production publishing flow targets a configured GitHub or GitLab repository and supports a repository `rootDir` for a subdirectory, not an arbitrary filesystem path outside the application project.

Because the personal archive is intentionally a separate local repository, this MVP does not register Studio or pretend that an external directory is supported. Enabling it against the wrong directory would make the public app's content folder, rather than the archive, the editable source.

## Security and Nuxt Content boundary

Dates are strictly validated before path resolution. Filesystem media paths are resolved with `realpath` and must remain inside both the archive root and the requested date's `media/` directory. No API parameter accepts an arbitrary filesystem path. The resolved memory folder path is returned only to support the local external-editor actions.

Nuxt Content 3.16.2 still reads the project's `content/` directory. Nuxt Studio 1.8.0 edits that same directory and is not enabled here. The external archive is intentionally handled by the server adapter instead of being passed to Nuxt Content or Studio.

## Tests

`server/repositories/filesystem-memory-repository.test.ts` covers metadata creation, expected folder structure, starter Markdown, duplicate-date protection, externally modified Markdown, direct filesystem media discovery, relative image/video/audio/PDF references, relative-reference preservation, deletion version checks, path traversal, symlink escapes, and atomic cleanup. `app/repositories/api-memory-repository.test.ts` covers metadata-only creation and versioned deletion.
