# Life Archive UI/UX Audit

## Audit Scope

This document describes the current implementation of Life Archive as found in the repository. It separates the intended personal-book vision from the behavior and visual system that exist today.

The audit covers:

- Every user-facing Nuxt page and route.
- The global shell, navigation, footer, shared components, and page-specific components.
- The CSS design tokens, typography, spacing, layout, responsive rules, and interaction states.
- The memory data flow from TypeScript fixtures or filesystem Markdown through the API and into the UI.
- The Markdown and media reading experience.
- Main user journeys, strengths, weaknesses, and prioritized opportunities.

No application code, styling, or configuration was changed for this audit. No dependency was installed.

### Visual inspection limitation

This audit is based on source-code inspection, fixture inspection, and the generated component structure. Browser automation and screenshot capture were not available through the connected tools, and no representative screenshots were found in the repository. The visual descriptions below therefore describe the implemented CSS and markup rather than claiming pixel-level browser verification.

## Product Vision

Life Archive is implemented as a local-first personal memory organizer and reader. Its data model treats Markdown files and adjacent media as the source of truth. A server-side repository reads either in-memory sample entries or a separate filesystem archive, normalizes them into `Memory` objects, and exposes them to the UI through typed API routes.

The product is not implemented as a CMS editor. Life Archive creates the folder and starter Markdown file for a new memory, but writing the story and adding media are intentionally delegated to VS Code, Obsidian, Finder, or another filesystem tool. The application organizes, searches, filters, and presents the archive.

The current interface aims for an editorial personal-publication character rather than a dashboard:

- Warm paper-colored background instead of white or dark application chrome.
- Serif display typography for memory-like headings and story content.
- Small uppercase sans-serif labels for dates, types, navigation, and system information.
- Thin rules and generous whitespace instead of cards with shadows and rounded containers.
- Rust-colored accent actions and editorial labels.
- Timeline, gallery, search, and chronological navigation as different ways to return to the same memory detail page.

The implementation is closer to an editorial archive or designed journal index than to a literal paginated book. The memory detail page is the strongest book-like surface. The home page still behaves partly like a marketing-style landing page, with a hero, numbered sections, promotional language, selected moments, and a closing call to action.

## Route Inventory

### User-facing routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | Home | Introduces the archive, shows recent and selected memories, and provides several paths into the timeline. |
| `/timeline` | Timeline | Presents all memories chronologically, grouped by month, with year filtering. |
| `/memory/:date` | Memory detail | Reads one memory, displays metadata and Markdown content, offers adjacent-memory navigation, delete, and external editing actions. |
| `/memory/new` | New memory | Collects starter metadata and creates a filesystem-backed memory folder. |
| `/gallery` | Gallery | Shows image media grouped by year and creates a placeholder tile for memories with no image. |
| `/search` | Search | Searches title, Markdown body, tags, and location with optional year and type filters. |
| `/settings` | Settings | Reports the active repository mode and whether the configured filesystem archive is available. |

Nuxt's default error page handles unmatched routes and thrown errors. There is no custom application error page in `app/pages` or a custom error component in the repository.

### Server routes supporting the pages

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/memories` | `GET` | Lists normalized memories, with optional year, month, and type filters. |
| `/api/memories/:date` | `GET` | Returns one normalized memory or a 404. |
| `/api/memories` | `POST` | Creates a filesystem memory. It is unavailable in sample mode. |
| `/api/memories/:date` | `DELETE` | Deletes a filesystem memory after checking the Markdown version hash. |
| `/api/archive-media/:date/:path` | `GET` | Serves validated filesystem media with a type-specific MIME type. |
| `/api/search` | `GET` | Searches memories with `q`, optional year, and optional type. |
| `/api/status` | `GET` | Reports `sample` or `filesystem` mode and archive configured/available state. |

### Global shell

Every page is rendered inside `app/app.vue`:

1. `NuxtRouteAnnouncer` is mounted for route announcements.
2. `AppHeader` renders the global header and primary navigation.
3. `<main id="main-content">` contains the current Nuxt page.
4. A global footer provides the current year, a short brand statement, and a link to Settings.

The global footer has a `120px` top margin on desktop and a compact wrapping layout on smaller screens.

## Visual Design System

### Color palette

The design is controlled by CSS custom properties in `app/assets/css/main.css`.

| Token | Value | Current use |
| --- | --- | --- |
| `--paper` | `#f4f0e8` | Main page background, text color on dark buttons, timeline rule dot background. |
| `--paper-deep` | `#e9e2d5` | Secondary sections, media placeholders, tags, notes, form messages, code blocks, and cards' neutral media surfaces. |
| `--ink` | `#262522` | Main text, headings, wordmark, dark button background, outline button borders. |
| `--muted` | `#77736a` | Descriptions, metadata, secondary labels, footer text, inactive navigation, and supporting copy. |
| `--line` | `#d5cec1` | Thin rules, separators, borders, input outlines, timeline structure, and navigation dividers. |
| `--accent` | `#ad5c43` | Rust-colored editorial accent for labels, active states, links, warning states, blockquotes, progress bars, and action hover states. |
| `--olive` | `#65755f` | Positive settings status color and the default status dot. |

There is one additional direct color in the search input placeholder, `#aaa49a`, and several composited colors using `color-mix()` for mood dots, media placeholders, control backgrounds, and icons.

Color usage is restrained. There are no gradients in the main page surfaces, no drop shadows, and no rounded card containers. The one deliberate gradient treatment is the media placeholder: an accent-tinted radial highlight over a paper/line linear gradient.

### Typography

The type system uses a strong serif/sans contrast:

- Display and story serif: `Georgia, 'Times New Roman', serif` via `--serif`.
- Interface sans: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` via `--sans`.
- Code: `ui-monospace, SFMono-Regular, Menlo, monospace`.

No webfont is imported in the repository. If Inter is not installed on the user's system, the interface falls back to the system sans stack.

Global typography behavior:

- Body: sans-serif, `15px`, line-height `1.65`.
- `h1`, `h2`, and `h3`: serif, weight `400`, letter-spacing `-.055em`, line-height `1.04`.
- `h1`: fluid `clamp(58px, 9vw, 124px)` by default.
- `h2`: fluid `clamp(35px, 4.5vw, 60px)` by default.
- `h3`: `29px` by default.
- Italic emphasis uses the accent color.
- Eyebrows, section labels, fact labels, navigation, metadata, and buttons use small uppercase sans text with expanded letter spacing.

Common type treatments:

- Eyebrows and fact labels: `11px`, accent, uppercase, letter-spacing `.13em`.
- Navigation: `12px`, muted, uppercase, letter-spacing `.08em`.
- Buttons: `11px`, uppercase, letter-spacing `.11em`.
- Text links: `11px`, accent, uppercase, letter-spacing `.08em`.
- Memory story paragraphs: serif, `18px`, line-height `1.85`.
- Memory blockquotes: serif, italic, accent, `26px`, line-height `1.35`.
- Memory metadata and timeline labels: generally `10px` to `12px`, uppercase, muted or accent.

### Layout and spacing

The main layout token is:

- `--wide: 1240px`.

The shared container is:

```css
width: min(calc(100% - 96px), 1240px);
margin: 0 auto;
```

Responsive container widths become `calc(100% - 64px)` at `1050px` and `calc(100% - 40px)` at `800px`.

Global dimensions and spacing:

- Header minimum height: `92px` desktop, `74px` below `800px`.
- Default page top padding: `88px` desktop, `55px` below `800px`.
- Main header bottom border: `1px solid var(--line)`.
- Footer minimum height: `90px` desktop, approximately `110px` when wrapping on mobile.
- Site footer top margin: `120px` desktop, `70px` below `800px`.
- Default page section dividers use a `1px` top border and `30px` top padding.
- Most large sections use `80px` to `120px` bottom padding.
- Default buttons are at least `50px` high; small buttons are `38px` high.

There is no general radius system. Rounded shapes are used as visual marks or controls:

- Wordmark mark: circular border.
- Hero stamp: circular border.
- Mood dots: circular.
- Timeline rule dot: circular.
- Carousel controls: circular.
- Tags and cards: square corners.

### Icon system

The handwritten `AppIcon` component has been removed. Icons now use Nuxt Icon with the bundled Lucide collection:

- `lucide:timeline`
- `lucide:search`
- `lucide:layout-grid`
- `lucide:settings`
- `lucide:arrow-right`
- `lucide:arrow-up-right`
- `lucide:map-pin`
- `lucide:music-2`

Icons receive the shared `.app-icon` class, which sets size, no fill, current-color stroke, round caps, round joins, and `1.5` stroke width. Icon behavior is primarily directional and informational rather than decorative.

### Interaction states and motion

- Global keyboard focus uses a `2px` accent outline with `4px` offset.
- Navigation links change from muted to ink on hover and active state. Active desktop links receive a rust underline that animates from the left.
- Buttons lift `2px` on hover.
- Dark buttons change from ink to accent on hover.
- Outline buttons fill with ink on hover.
- Text-link icons shift slightly on hover.
- Timeline headings change to accent when their content area is hovered.
- Images scale to `1.04` on hover in cards and gallery items.
- Timeline carousel controls are hidden until hover or keyboard focus within the carousel.
- Carousel images use directional opacity and horizontal movement transitions.
- `prefers-reduced-motion: reduce` disables smooth scrolling and reduces transitions and animations to `.01ms`.

## Shared Component Inventory

### `AppHeader.vue`

Global header used by the app shell on every page. It contains:

- Circular `L` wordmark linking to `/`.
- Primary navigation for Timeline, Search, Gallery, and Settings.
- A `New memory` link to `/memory/new`.
- A short right-aligned note: “A personal record / of ordinary days”.

The desktop navigation is horizontally spaced and centered toward the right. At `800px`, the navigation moves to a full-width row below the brand/tools row. At `420px`, navigation icons are hidden and only text labels remain.

### `MemoryCard.vue`

Reusable on the home page for Recent memories and Selected moments. It receives a `Memory` and an optional `featured` flag.

- Links the entire card to `/memory/:date`.
- Selects only image media through `getMemoryImages()`.
- Shows a fixed aspect-ratio media frame.
- Shows a color/paper placeholder when the memory has no image.
- Shows an image count only when images exist.
- Displays date, type, title, excerpt, and “Read memory”.
- Featured cards use a taller image ratio and a larger title.

### `TimelineEntry.vue`

Reusable for each entry in `/timeline`.

- Date rail with day and abbreviated month.
- Vertical rule and circular node.
- Entry type and optional location.
- Title, excerpt, optional mood, and “Open entry” link.
- Fixed media column with image carousel or placeholder.
- Keyboard left/right controls when multiple images exist.
- Previous/next buttons and image count/dots when more than one image exists.

The media column is present even for memories without images, keeping timeline entries structurally consistent.

### `MemoryMeta.vue`

Used in the detail-page header. Displays formatted date, memory type, and optional mood separated by slash characters. It supports a `compact` prop, although the current page usage uses the default presentation.

### `ExternalEditingActions.vue`

Used on filesystem-backed memory details and on the new-memory success state.

- Displays a “Write in your own tools” explanation.
- Shows the resolved archive folder path when available.
- Provides an `Open in VS Code` link using the `vscode://file/` protocol.
- Provides a clipboard “Copy path” fallback.
- Shows a manual fallback message when clipboard access fails.
- In sample mode, the path is unavailable and the copy button is disabled.

### `MemoryCreationForm.vue`

Page-specific form component used by `/memory/new`.

- Emits `save` and `cancel` events.
- Collects date, title, type, location, mood, mood score, and comma-separated tags.
- Shows the mood range control only after a mood label is entered.
- Performs client-side title, date, tag count, and tag length validation.
- Describes that writing and media management happen in external tools.

### `@nuxt/icon` and Lucide

The current icon system is shared through Nuxt Icon's auto-imported `<Icon>` component. The Lucide collection is bundled server-side in `nuxt.config.ts`.

### Nuxt Content `<MDC>`

Nuxt Content remains installed only because the detail page uses `<MDC :value="memory.content" />` to render Markdown. The app does not use Nuxt Content collections or a project `content/` directory as its archive source.

## Page Documentation

## 1. Home

**Route:** `/`
**File:** `app/pages/index.vue`
**Purpose:** Introduce the archive and provide multiple discovery routes into its memories.

### Structure from top to bottom

1. **Global header**
   - Wordmark, primary navigation, New memory action, and archive note.
2. **Hero**
   - Eyebrow: “A private collection / est. 2025”.
   - Very large two-line serif headline: “A place for the / days that matter.”
   - Accent italic treatment on the second line.
   - Short muted explanation of Life Archive.
   - Dark “Explore the archive” button linking to `/timeline`.
   - Right-side editorial stamp `LA / 01`.
   - Current year statement and archive summary.
3. **Now in the archive**
   - Numbered section label `01`.
   - Latest archive month and year as a large serif date.
   - Editorial lead sentence.
   - Current-year memory count.
   - Link to the full timeline.
4. **Recent memories**
   - Section label `02` and “Just before now” heading.
   - Link to all memories.
   - Four `MemoryCard` entries, newest first.
5. **Selected moments**
   - Section label `03` and “Worth lingering over” heading.
   - Short supporting line: “A few frames from the collection”.
   - Up to three cards with media, with the first card marked featured.
   - Background changes to `--paper-deep`.
6. **From the archive**
   - Section label `04` and “From the archive” heading.
   - Chronology link rows for the first five memories.
   - Each row shows date, title, type, and an external-arrow icon.
7. **Closing call to action**
   - Accent star mark.
   - Large “Keep the / good parts.” heading.
   - Short supporting copy.
   - Outline button back to the timeline.
8. **Global footer**

### Layout and responsive behavior

- Hero uses a two-part flex layout with a minimum height of `670px` on desktop.
- The hero copy can occupy up to `760px` or `75%` of the available width.
- The hero aside is `180px` wide and positioned with top padding.
- Recent cards use four equal columns with `18px` gaps on large screens.
- At `1050px`, recent cards become two columns and selected moments become two columns, with the featured card spanning both.
- At `800px`, the hero becomes a single-column experience and the aside disappears. Recent and selected cards remain two columns.
- At `420px`, card grids become one column and the featured aspect ratio changes.

### Navigation relationships

The home page links to the timeline from the hero, intro, recent section, chronology section, and closing action. Individual cards and chronology rows link directly to memory detail pages. The header and footer provide routes to all major surfaces.

### Strengths

- Strong first impression and clear archive identity.
- Several discovery entry points for different reading moods.
- Clear editorial hierarchy between section labels, display headings, and supporting copy.
- Cards now maintain a stable media shape even when a memory has no image.

### Weaknesses or inconsistencies

- The page is long and promotional relative to the stated goal of opening a personal book.
- The large hero and closing call to action delay access to the actual archive.
- The home page has four numbered sections, while other pages reuse section numbering such as `/02` for both Gallery and Search.
- The selected moments list is limited to memories with any media, not necessarily memories with meaningful photographic content.
- Empty archive behavior is not designed as a dedicated home state; calculations simply produce fallback copy and empty grids.

## 2. Timeline

**Route:** `/timeline`
**File:** `app/pages/timeline.vue`
**Purpose:** Provide the long chronological view of the archive.

### Structure from top to bottom

1. Global header.
2. Page intro:
   - Eyebrow “The long view / 01”.
   - Large “Timeline” heading.
   - Description of the chronological walk.
3. Year filter:
   - “All years” plus years derived from loaded memories.
   - Buttons use `aria-pressed` and an accent active state.
4. Timeline overview:
   - Number of filtered entries.
   - “Most recent first” label.
5. Month groups:
   - Month/year heading.
   - Rule extending across the available width.
   - Number of memories in the month.
   - `TimelineEntry` rows.
6. End marker:
   - “End of the visible archive” and an accent star.
7. Global footer.

### Timeline entry layout

Desktop entries use three outer columns:

- `74px` date column.
- `28px` timeline rule column.
- Remaining content column.

The content column has a text area and a `210px × 150px` media area separated by `50px`.

The date rail shows a large serif day and muted abbreviated month. The vertical rule and outlined node create a chronological spine. The content area uses a small accent type/location kicker, a `38px` serif title, a muted excerpt, optional mood, and an Open entry link.

The media area selects only image files. Multiple images become a keyboard-accessible carousel with directional controls, dots, and a count. Memories without images receive the shared abstract placeholder instead of leaving the media column empty.

### Responsive behavior

- At `1050px`, the media column reduces to `170px × 130px` and the content gap reduces to `30px`.
- At `800px`, the outer date rail shrinks to `45px`, the rule to `15px`, and the content/media layout becomes one column.
- The media area becomes full width with a `1.7 / 1` aspect ratio on mobile.
- Entry titles reduce to `30px` below `800px` and `27px` below `420px`.
- The entry footer becomes block layout on mobile.

### Navigation relationships

Year filters change the local view without changing the URL. Every timeline entry links to its memory detail page. The header and home page provide entry points into Timeline. Detail-page adjacent navigation provides a route back into the chronological sequence.

### Strengths

- The timeline has a distinctive visual spine rather than a generic list.
- Date, type, mood, location, excerpt, and image are visible before opening a memory.
- Year filtering is simple and understandable.
- Multiple image handling makes the media column useful without overwhelming the list.

### Weaknesses or inconsistencies

- Year selection is local component state and is not represented in the URL, so filtered views are not shareable or restorable.
- Month headings and entries create a long vertical page with no persistent position or navigation aid.
- The carousel is visually small on desktop compared with the importance of photography in the product vision.
- Keyboard support exists for the carousel, but the region itself has no visible placeholder label beyond the generic “Memory images”.
- A completely empty archive would show the end marker without an explicit empty-state explanation.

## 3. Memory detail

**Route:** `/memory/:date`

### Structure from top to bottom

1. Global header.
2. Back link to Timeline.
3. Memory header:
   - `MemoryMeta` with date, type, and mood.
   - Optional location with map-pin icon.
   - Large title.
   - Muted excerpt/lede.
   - Delete memory action.
   - Conflict/error message with a Reload memory action when needed.
4. Main memory layout:
   - Left sidebar containing mood, type, tags, music, and media-folder facts.
   - Main story column containing `<MDC :value="memory.content" />`.
5. External editing actions.
6. Older/newer memory navigation.
7. Global footer.

### Desktop layout

The memory header is limited to `900px`. The main reading layout uses a centered two-column grid:

- `190px` metadata sidebar.
- `680px` main content column.
- `100px` gap.

This gives the story a constrained reading width while allowing the metadata to sit as a quiet reference column. The main article is not full viewport width.

### Sidebar metadata

- Mood uses a label, accent horizontal scale, and numeric score out of ten.
- Type is shown as a serif fact value.
- Tags are small square paper-deep pills.
- Music uses a music icon, title, artist, and external Listen link.
- If any media exists, a media-folder fact reports its file count and says it is managed outside Life Archive.

### Markdown rendering behavior

The server removes YAML frontmatter before returning content. It normalizes title, date, type, tags, mood, location, music, and excerpt separately. The detail page renders only the Markdown body through Nuxt Content's MDC renderer.

The filesystem adapter rewrites relative `./media/...` references inside the returned content to validated `/api/archive-media/:date/...` URLs. The original Markdown on disk remains relative and unchanged.

The current CSS supports these rendered structures:

- Headings: all `h1`, `h2`, and `h3` inside the content receive a `40px` serif treatment and `22px` bottom margin. This means a Markdown `#` heading inside the story is visually similar to a large section heading rather than a small article heading.
- Paragraphs: serif, `18px`, line-height `1.85`, `24px` bottom margin.
- Unordered and ordered lists: serif, `18px`, line-height `1.85`, `25px` left padding.
- Blockquotes: `26px` italic serif, accent color, `2px` accent left rule, `42px` vertical margin.
- Images: full width of the `680px` story column, with `42px` top and bottom margins. There is no intrinsic image-height cap or caption component in the page CSS.
- Videos: full width, `42px` vertical margins, paper-deep background.
- Audio: full width, `20px` top and `42px` bottom margins.
- Links: accent color, underlined with a `3px` offset.
- Preformatted code: horizontally scrollable, paper-deep background, `20px` padding, monospace text.

### Media types in the current fixture

The filesystem fixture `fixtures/archive/2026/11/10/index.md` demonstrates:

- Three consecutive SVG image references.
- An inline HTML audio player for `voice-note.mp3`.
- An inline HTML video player for `walkthrough.mp4`.
- A Markdown link to `field-notes.pdf`.

The three images render sequentially in the same story column, one below another. They are not grouped into a gallery, collage, or carousel. Audio and video remain inline controls. The PDF is a normal text link whose URL is rewritten to the validated archive-media endpoint; it is not rendered as an embedded document viewer.

### Responsive behavior

- At `800px`, the sidebar and article become a vertical flex stack.
- The sidebar becomes a two-column grid, with music spanning both columns.
- The memory layout gap reduces and bottom padding decreases.
- Body paragraphs reduce from `18px` to `17px`.
- The title reduces to `64px` below `800px` and `53px` below `420px`.
- The back-link margin decreases from `80px` to `48px`.
- Adjacent-memory navigation becomes a single column below `420px`; the newer entry receives a top border and left alignment.

### Navigation and actions

- Back to Timeline is the primary route out of the detail page.
- Older and newer links move through the sorted memory list.
- Delete invokes a browser confirmation before making a version-checked API request.
- A stale external edit produces a conflict message rather than deleting blindly.
- External editing actions provide the bridge from reading back to authoring.

### Strengths

- This is the most book-like page in the current application.
- The constrained story width and serif body text support long-form reading.
- Metadata is separated from the story instead of being mixed into every paragraph.
- Relative media references remain valid in the original Markdown source.
- The renderer supports text, lists, quotes, images, audio, video, PDF links, and code blocks.
- Adjacent memory navigation makes continued reading possible.

### Weaknesses or inconsistencies

- All inline images receive the same full-width treatment, regardless of portrait/landscape ratio or narrative role.
- Consecutive images are only a vertical sequence; there is no visual grouping, caption system, or image navigation in the reading view.
- Media controls are native browser controls with no additional visual integration into the book-like system.
- PDF content is only linked, not visually previewed.
- The story title may be duplicated: the page header uses frontmatter `title`, while Markdown commonly begins with a heading such as `# What happened`.
- Empty or very short Markdown is technically supported, but the page gives no special “quiet entry” composition for a memory with little text.
- The page always renders a Delete memory action, including sample/read-only mode, where the action cannot succeed.
- The content CSS targets only `h1` through `h3`; deeper headings, tables, thematic breaks, images with captions, and custom embeds have no explicitly documented visual treatment.

## 4. Gallery

**Route:** `/gallery`

### Structure

1. Global header.
2. Page intro:
   - Eyebrow “The visual record / 02”.
   - Large Gallery heading.
   - Description.
   - Absolute-positioned image count.
3. One section per year:
   - Year heading with horizontal rule.
   - “Photographs” label.
   - Three-column gallery grid.
4. Gallery tiles:
   - Image frame or placeholder frame.
   - Date, memory title, type, and external-arrow icon.
   - Link to the corresponding memory detail.
5. Global footer.

Only image media is included in the gallery. PDF, audio, and video files are skipped as gallery media. If a memory has no image, the page adds one placeholder tile for that memory, so non-photographic memories remain discoverable without pretending that a document or voice note is a photograph. The gallery count reports actual images only.

### Layout and responsive behavior

- Three columns on desktop with `18px` horizontal and `22px` vertical gaps.
- Image frames use a `1 / 1.08` aspect ratio.
- At `800px`, the grid becomes two columns with smaller gaps.
- At `420px`, the grid becomes one column.
- The gallery statistic is absolute on desktop and returns to normal flow at `800px`.
- Captions become block layout on smaller screens.

### Strengths

- The page gives photography a dedicated discovery path.
- A consistent frame and placeholder prevent broken PDF/audio image treatments.
- Year grouping provides a simple chronological structure.
- Each tile returns directly to the full memory context.

### Weaknesses or inconsistencies

- The page is still a conventional grid of tiles, which is the closest current surface to a conventional photo gallery despite the product vision explicitly resisting that identity.
- It does not distinguish a memory with one image from a memory with many images beyond repeating tiles for each image.
- Placeholder tiles are visually present but not semantically labeled in the visible caption as non-image memories.
- There is no full-screen image viewer, image detail route, captions beyond the file-derived alt text, or image-specific navigation.
- The year section label still says “Photographs” even when a section contains placeholder tiles for memories without images.

## 5. Search

**Route:** `/search`

### Structure

1. Global header.
2. Page intro:
   - Eyebrow “Find your way back / 02”.
   - Large Search heading.
   - Explanation covering titles, stories, tags, and places.
3. Search form:
   - Large serif search input with Lucide search icon.
   - Clear action when text exists.
   - Year select populated from the current archive.
   - Type select populated from supported memory types.
   - Search and conditional Reset buttons.
4. Search state:
   - Initial “A quiet index” explanation.
   - Loading state.
   - Error message.
   - No-results state.
5. Result list:
   - Count and “Most recent first”.
   - Date day/month block.
   - Type and match-field labels.
   - Title, excerpt, and external-arrow icon.
6. Global footer.

### Search behavior

- Empty queries do not submit.
- Search is case-insensitive and uses partial matching.
- The server searches title, stripped Markdown body, tags, and location.
- Markdown syntax is removed for matching and content excerpts.
- Results are ordered newest first.
- The result summary does not include content media or mood.
- The year list is loaded separately through the normal memory list API.
- Search state is local to the component and is not reflected in the URL.

### Responsive behavior

- The search input reduces from `30px` to `24px` at `800px`.
- Filters wrap at `800px`.
- Search actions become a full-width row on small screens.
- Results reduce from a `95px` date column and `20px` icon column to `55px` and `15px` columns.
- Result titles reduce to `25px` on smaller screens.

### Strengths

- Clear initial state and explicit loading/no-result/error states.
- Search covers the fields most likely to matter in a personal archive.
- Filters are simple and derived from the active archive rather than hardcoded years.
- Result rows preserve the editorial type/date hierarchy.

### Weaknesses or inconsistencies

- Search is a utility list rather than a memory-oriented visual return path; it has no image preview or memory context beyond an excerpt.
- The search state cannot be shared or bookmarked because query and filters are not URL parameters.
- There is a separate archive-list request solely to populate years before searching.
- Results identify match fields but do not highlight the matched text.
- The Search page uses the same `/02` editorial numbering as Gallery, creating a visible numbering inconsistency.

## 6. Settings

**Route:** `/settings`

### Structure

1. Global header.
2. Page intro:
   - Eyebrow “The quiet machinery / 03”.
   - Settings heading.
   - Short explanatory copy.
3. Three settings rows:
   - Archive status.
   - Archive directory status.
   - Storage description.
4. Private-archive note panel.
5. Global footer.

### Current status behavior

The page calls `/api/status` and distinguishes:

- Sample data active / Preview.
- Private archive active / Connected.
- Archive unavailable / Unavailable.
- A transient checking state.

It also distinguishes whether an archive directory is configured. The endpoint intentionally reports availability booleans, not the private absolute archive path.

The “Configure later” button is disabled. Settings is informational rather than a configuration surface.

### Responsive behavior

At `800px`, settings rows become vertical stacks with `17px` gaps. The status action or badge moves below the text rather than staying in a side column.

### Strengths

- The status now reflects the real server repository mode rather than static sample copy.
- It communicates the privacy/local-first model directly.
- Storage principles are visible without exposing a private filesystem path.

### Weaknesses or inconsistencies

- “Configure later” looks actionable but cannot do anything.
- The page reports status but does not help the user correct an unavailable or missing archive.
- The setting rows are more product/settings language than personal-book language, though this is appropriate for the operational surface.
- There is no visible connection to the external editing actions or a shortcut to the archive directory.

## 7. New memory flow

**Route:** `/memory/new`

### Form structure

1. Global header.
2. Form header:
   - Back to Timeline link.
   - Eyebrow “A new page / 04”.
   - New memory heading.
   - Explanation that the story is written in an external editor.
   - Cancel and Create memory actions.
3. Context section:
   - Numbered section label `01 / Context`.
   - Large title field.
   - Date and type fields in a two-column grid.
   - Location and mood fields in a second two-column grid.
   - Tags field.
   - Conditional mood score range input.
4. “Write it elsewhere” note panel.
5. Error message region.

On success, the form disappears and the page becomes a success state:

- Back to Timeline.
- “Memory created” heading.
- Created title and date.
- `ExternalEditingActions` with folder path, VS Code link, and copy fallback.
- Link to read the new memory.

### Interactions and validation

- Date defaults to the browser's local date.
- Title is required.
- Date must match `YYYY-MM-DD` and represent a real calendar day.
- Up to 30 tags are accepted; each tag must be no more than 50 characters.
- Type is selected from Highlight, Thought, Experience, Travel, Milestone, or Letter.
- The form is disabled during creation.
- Sample mode returns a read-only error because creation requires filesystem mode.
- Filesystem creation writes a new date folder, `index.md`, and `media/` directory atomically.

### Layout and responsive behavior

- The form header is a two-column flex layout on desktop, with actions aligned to the bottom.
- Creation fields have a maximum width of `760px`.
- Title input is a large `37px` serif field with only a bottom border.
- Date/type and location/mood use two-column grids.
- At `800px`, the header becomes block layout and all field grids become one column.

### Strengths

- The form clearly respects the filesystem-first authoring model.
- Validation explains common input errors before the server call.
- The success state provides a practical handoff to an external editor.
- Atomic creation and duplicate-date handling protect the archive structure.

### Weaknesses or inconsistencies

- It asks the user for structured metadata before they can write the actual memory, which may feel like content administration rather than opening a page in a personal book.
- There is no way to add initial content, choose a starter template, or attach media through the app; this is intentional but makes the flow dependent on another application.
- The form's `A new page / 04` numbering is not a global sequence; it reuses the home page's `04` concept.
- The success screen depends on the operating system recognizing the VS Code protocol.

## Visual Design Character

The current design is editorial, warm, restrained, and typography-led. `#f4f0e8` makes the entire application feel like an uncoated paper surface. `Georgia` headings and reading text establish a literary tone, while the sans-serif interface labels create a clear distinction between story and navigation. Rust accent `#ad5c43` provides a consistent visual signal for “this matters” actions and editorial labels without becoming a bright UI color.

The interface is spacious rather than dense. Large section padding, thin rules, fluid display headings, and a lack of shadows give it a printed-publication quality. The wordmark circle, hero stamp, timeline node, and star marks supply a small set of repeated graphic motifs. Square-cornered buttons, inputs, tags, and surfaces keep the system from becoming soft or app-like.

The visual language is more photographic and editorial on the home, timeline, and gallery surfaces, but the actual reading page is primarily text-first. Media is supported and displayed with useful defaults, yet the content renderer treats images, audio, video, and documents as inline Markdown content rather than as coordinated parts of a cinematic memory composition.

## Memory-Reading Experience

### Entry point

A user can open a memory from:

- Recent or selected cards on the home page.
- Chronology rows on the home page.
- Timeline text or media.
- Gallery images/placeholders.
- Search results.
- The New memory success state.
- Older/newer navigation from another detail page.

All paths converge on `/memory/:date`.

### Metadata and title

The server parses frontmatter into normalized fields. The detail page presents date, type, and mood as a compact metadata row, followed by optional location, title, and excerpt. This establishes context before the story begins.

The source Markdown title is not rendered from frontmatter inside the article; the page header owns the memory title. Any heading inside the Markdown body is rendered separately.

### Text

Paragraphs are deliberately comfortable for long reading: a constrained `680px` column, serif font, `18px` size, and `1.85` line-height. Lists receive the same serif size and generous line-height. Blockquotes are treated as highlighted editorial quotations with accent color and a left rule.

The page does not implement a reading progress indicator, chapter navigation, pull-quote extraction, footnotes, or a typographic distinction between a short note and a long essay.

### Images

Images inside Markdown are displayed inline at the full width of the reading column and receive `42px` vertical margins. Consecutive images therefore form a vertical stack. They are not placed into cards, a lightbox, a masonry layout, or a collage.

This is coherent and predictable, but it does not yet give photographs the visual authority implied by the product vision. A large landscape image and a small portrait or scanned document all receive the same width rule. There is no caption UI beyond the HTML image `alt` attribute, and no special treatment for a memory that is mostly photographs.

### Multiple consecutive images

The filesystem fixture explicitly contains three consecutive images. The renderer receives all three rewritten media URLs and displays them one after another in the story column. There is no grouping or sequence count inside the detail page. The timeline and home surfaces have carousel/card logic, but that logic is not reused in the memory reader.

### Video

Inline HTML `<video controls>` elements are preserved in the Markdown content and styled as full-width media with a paper-deep background. The server rewrites relative media URLs to the validated media endpoint and supplies the correct MIME type for common video extensions.

The current implementation does not add a poster image, caption, transcript, custom control bar, or fallback copy for unsupported video.

### Audio and voice notes

Inline HTML `<audio controls>` elements are preserved and rendered full width. The current CSS gives audio a smaller top margin than images/video but a generous bottom margin. There is no custom audio identity, waveform, recording title, duration label, or transcript. An audio file that is not referenced in Markdown remains discoverable as media metadata but is not automatically inserted into the story.

### PDFs and documents

PDFs are served with `application/pdf` through the archive media endpoint. When linked in Markdown, the link target is rewritten to the safe endpoint and displayed as a normal underlined accent link. The detail page does not embed a PDF viewer or generate a document card.

### Links and embedded content

Normal Markdown links use accent color and underlines. External music links are rendered separately in the sidebar. The code does not define a custom component registry for embeds, so the experience depends on what Nuxt Content's MDC renderer supports for the provided Markdown/HTML.

### Long and short memories

Long memories receive the same single-column reading treatment regardless of length. There is no “chapter” or progress mechanism. Short memories still receive the full header, sidebar, external editing section, and adjacent navigation, which creates continuity but may feel oversized for a one-paragraph note.

### Mostly photographic memories

The content can contain mostly image references, and those images will stack vertically with large margins. The metadata sidebar still occupies the left column on desktop. There is no alternate photographic layout that lets the images become the primary composition.

### Missing content and malformed content

Filesystem entries without valid frontmatter, valid date, title, or supported type are skipped by the repository. A missing memory returns a 404 detail page. A memory with valid metadata but little body content renders the standard structure with an empty or very short article. There is no custom “untitled”, “draft”, or “empty memory” treatment.

## User Journeys

### Journey A — Discovering memories

1. The user opens `/` and sees the Life Archive hero.
2. They can choose “Explore the archive” to open Timeline.
3. They can scan four Recent memories or up to three Selected moments.
4. They can use the home chronology list for a compact date/title view.
5. On Timeline, they can choose All years or an individual year.
6. They can open a text entry or image area.
7. Alternatively, they can use Gallery for image-led discovery or Search for text-led discovery.
8. Each discovery path opens the same memory detail page.

**What works:** multiple entry points, clear route convergence, and a recognizable visual hierarchy.

### Journey B — Reading a memory

1. The user opens a memory from a card, timeline row, gallery tile, search result, or adjacent-memory link.
2. The detail page establishes date, type, mood, location, title, and excerpt.
3. The user reads the Markdown story in the constrained main column.
4. Images, video, audio, and document links appear at their Markdown positions.
5. Sidebar metadata remains visible on desktop and moves above the story on mobile.
6. The user can open the external archive folder, copy its path, delete the memory, or continue to an older/newer memory.

**What works:** clear context/story separation, comfortable body typography, source-preserving media links, and adjacent navigation.

### Journey C — Creating a memory

1. The user clicks New memory in the global header.
2. They fill title, date, type, and optional location, mood, and tags.
3. The app validates the input and creates a date folder, `index.md`, and `media/` directory in filesystem mode.
4. The success screen shows the created title/date and archive folder path.
5. The user opens the folder in VS Code or copies the path to use another tool.
6. They add Markdown and media externally.
7. They can return to Life Archive and open the new memory.

**What works:** the ownership boundary is explicit and the handoff is practical.

### Journey D — Returning to a memory

1. The user opens Search and enters a phrase, person, location, or tag.
2. They optionally filter by year and memory type.
3. Results show match categories, title, date, and an excerpt.
4. The user opens the result and reads the full memory.
5. They can use adjacent navigation to continue around the date.
6. They can also use Timeline year grouping or Gallery placeholders/images to return to the archive.

**What works:** search covers relevant personal-memory fields and results are newest first.

## Responsive Behavior Summary

The stylesheet defines three primary breakpoints:

### At `1050px`

- Container side margin shrinks from `48px` to `32px`.
- Header note disappears.
- Recent grid becomes two columns.
- Featured grid becomes two columns, with the featured card spanning both.
- Timeline media reduces to `170px × 130px`.
- Memory layout gap reduces from `100px` to `55px`.

### At `800px`

- Container side margin shrinks to `20px`.
- Header wraps; navigation becomes a full-width row.
- Navigation underline disappears.
- Header note disappears.
- Page top spacing drops to `55px`.
- Hero aside disappears.
- Intro becomes one column.
- Recent and featured grids remain two columns.
- Search filters wrap and actions become full width.
- Timeline entries become a single content/media column.
- Detail sidebar moves above the story in a two-column metadata grid.
- Creation form fields become one column.
- Gallery becomes two columns.
- Settings rows become vertical.

### At `420px`

- Wordmark and navigation typography reduce.
- Navigation icons disappear.
- Home cards and selected moments become one column.
- Featured card returns to its own mobile aspect ratio.
- Detail adjacent navigation becomes one column.
- Gallery becomes one column.
- Detail title and timeline title reduce further.

### Reduced motion

The reduced-motion media query disables smooth scrolling and nearly all transitions and animations.

## Component and Implementation Inventory

### Styling

- `app/assets/css/main.css`: single global stylesheet containing tokens, resets, global shell, page layouts, components, media behavior, and all responsive rules.
- There are no CSS modules, scoped component styles, utility CSS framework, or separate page stylesheets.
- Most selectors are semantic class names with compact one-line declarations.

### Data and repository layer

- `app/types/memory.ts`: `Memory`, `MemoryMedia`, mood, music, filter, search, and write contracts.
- `app/types/memory-api.ts`: API response and repository-status contracts.
- `app/data/fixtures.ts`: eight in-memory sample memories from February 2025 through November 2026.
- `app/repositories/memory-repository.ts`: fixture repository with date sorting and filters.
- `app/repositories/api-memory-repository.ts`: client API adapter used by pages.
- `app/composables/use-memory-repository.ts`: returns the API repository for page use.
- `server/repositories/filesystem-memory-repository.ts`: filesystem Markdown/media adapter, validation, media discovery, versioning, atomic creation, and deletion.
- `server/utils/memory-repository.ts`: selects sample or filesystem repository based on runtime configuration.
- `server/utils/memory-search.ts`: strips Markdown, searches fields, creates excerpts, and sorts results.

### Media utilities

- `getMemoryImages()` in `app/utils/memory.ts`: selects image media using explicit `kind` or known image extensions.
- Filesystem media kinds include image, audio, video, and document.
- `server/api/archive-media/[date]/[...path].get.ts`: validates path containment and returns media with MIME types.
- `rewriteMediaReferences()` changes only the response content; the stored Markdown remains unchanged.

### Navigation and shell

- `app/app.vue`: shell and footer.
- `app/components/AppHeader.vue`: shared brand and global navigation.
- Nuxt `NuxtLink` is used for internal routes, so most navigation is client-side.
- Header and footer are not separate layout files; they are mounted in the app root.

### Markdown rendering

- Nuxt Content's `<MDC>` is used only on the detail page.
- Markdown is supplied as a string from the repository rather than loaded from a Nuxt Content collection.
- No custom MDC component mapping appears in the source.

### Responsive and interaction patterns

- CSS media queries control all responsive layout changes.
- Timeline carousel state is local to each `TimelineEntry`.
- Search state is local to `/search`.
- Timeline year state is local to `/timeline`.
- Settings status is fetched from the server and rendered reactively.
- No application-wide state store is used.

## Current Strengths

### Immersion

The paper palette, restrained rules, serif typography, and limited use of accent color give the interface a distinctive editorial atmosphere. The memory detail page feels intentionally composed rather than like a raw Markdown viewer.

### Reading comfort

The `680px` content width, large line-height, serif body, generous vertical margins, and quiet sidebar support long reading better than a typical dashboard layout.

### Visual hierarchy

The distinction between serif story/display type and uppercase sans metadata is consistent across pages. Accent labels and thin rules make large surfaces scannable without adding heavy cards or shadows.

### Archive ownership model

The UI and server code consistently preserve Markdown and media as source material. The app does not silently rewrite the archive during rendering, and external editing actions explain the handoff.

### Navigation coverage

The same memory is reachable through chronological, visual, textual, recent, selected, and adjacent-memory paths. This supports different ways of remembering.

### Media safety and clarity

The current media handling avoids treating PDFs or voice notes as images in home cards, timeline media, and gallery. Unsupported visual contexts receive placeholders while the detail page preserves richer media at its original Markdown position.

## Current Weaknesses and Inconsistencies

These are observations about the implementation, not recommendations disguised as facts.

### Actual implementation problems

- The app has a dynamic status endpoint, but Settings has no way to configure an unavailable archive.
- The New memory route is visible in all modes even though sample mode is read-only.
- The detail page exposes Delete memory even when the repository cannot write.
- Timeline year state and Search state are not URL-addressable.
- The home page, Timeline, Gallery, and Search use inconsistent editorial section numbers.
- Search results do not highlight the text that matched.
- A no-content memory does not receive an intentionally designed short-entry state.

### Visual design weaknesses

- The home page contains a substantial amount of promotional copy and section choreography before the archive itself.
- The Gallery is visually close to a conventional three-column photo grid, despite the product vision rejecting a conventional gallery identity.
- The detail page gives all images the same full-width treatment and does not create a distinct visual rhythm for a photograph sequence.
- The timeline image column is small relative to the visual importance of media.
- Settings uses product-management language that is functional but disconnected from the literary tone elsewhere.

### Missing product capabilities

- No image lightbox or full-screen reader.
- No captions or richer media metadata in the detail reader.
- No PDF preview.
- No audio transcript or recording metadata beyond the raw player.
- No URL-addressable filters or search state.
- No in-app archive configuration.
- No content watch/reload mechanism beyond manual page refresh or the detail conflict reload action.

### Subjective design opportunities

- The home page could feel more like opening a specific volume or latest memory than a branded landing page.
- Detail pages could allow the shape of the memory to determine the composition.
- The archive could make pauses, short notes, and image-only memories feel intentional rather than structurally identical.

## Five Prioritized Improvement Opportunities

### 1. Make the memory detail page media-aware

**Priority:** Highest

The detail page is the core reading surface, but all memory bodies currently use one article template. A long essay, a photo sequence, an audio note, a video memory, and a short paragraph receive nearly the same layout. The biggest opportunity is to preserve the current readable foundation while allowing image sequences, documents, audio, and video to have distinct, intentional compositions.

### 2. Re-center the home page around entering the archive

**Priority:** High

The current home page is polished but behaves like a long editorial landing page. The first real memories appear after the hero and intro sections. A more personal-book-like opening would establish the archive's latest or most meaningful page earlier, while retaining the timeline and discovery sections as supporting indexes.

### 3. Unify discovery around memory context rather than separate indexes

**Priority:** High

Timeline, Gallery, Search, Recent memories, Selected moments, and chronology are useful but somewhat separate systems. Search results have no visual media hint; Gallery tiles have limited context; Timeline filters are not shareable. A stronger discovery model would preserve each mode while making query/filter state, memory context, and transitions between modes more coherent.

### 4. Make operational states and authoring boundaries mode-aware

**Priority:** Medium-high

Settings now correctly reports sample versus filesystem mode, but it does not resolve the user's next action. The disabled “Configure later” control and the always-visible creation/delete actions create a gap between what the app shows and what the current repository can do. The UI should make read-only/sample and filesystem-backed states visibly distinct and explain the exact next step without pretending that a disabled action is available.

### 5. Define intentional compositions for short, empty, and non-photographic memories

**Priority:** Medium

The current system handles missing images safely with placeholders, but placeholders are a fallback rather than a full editorial language. Short memories, audio-only entries, document-heavy entries, and quiet notes could each have a coherent visual treatment that makes absence of photography or text feel deliberate. This would bring the product closer to a book containing varied page types rather than a single template with optional fields.

## What Life Archive Looks Like Today

Life Archive today looks like a warm editorial archive with a paper background, dark ink typography, rust-colored labels and links, thin rules, large Georgia headings, and quiet system metadata. The home page is a carefully styled landing page leading into a chronological archive. Timeline entries combine a date spine, story summary, and small media frame. Gallery provides an image grid with placeholders. Search provides a clean text index. Settings exposes the repository mode. The memory detail page is a constrained serif reading column with a metadata sidebar and inline Markdown media.

It is coherent, restrained, and more personal than a dashboard, but it is not yet fully a book-like reader. The strongest visual identity is in the shell and detail typography; the weakest alignment is in the home page's promotional structure and the one-size-fits-all treatment of media-rich memories.

## What Life Archive Should Feel Like

Life Archive should feel like opening a private, beautifully designed book whose pages happen to be generated from real Markdown files. Discovery should feel like turning through an archive rather than navigating an admin product. A photograph should be allowed to occupy the page with confidence. An audio note, document, short entry, or long story should feel like a different kind of page, not a missing value in the same template.

The interface should remain quiet, warm, and unforced. Metadata should orient without competing with the memory. Search and timeline should help the user return to a moment, then disappear as the reading experience takes over. External filesystem ownership should remain explicit but should feel like a continuation of the archive rather than a handoff into a separate management workflow.
