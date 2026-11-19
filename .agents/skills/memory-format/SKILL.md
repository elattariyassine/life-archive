---
name: memory-format
description: The Life Archive memory file format. Use when writing, editing, importing, or validating memories (YYYY/MM/DD/index.md with YAML frontmatter and a media/ folder), when helping someone write a memory, or when changing code that parses frontmatter or media references.
---

# Memory format

A memory is one folder per day inside the archive folder (`NUXT_ARCHIVE_DIR`):

```text
<archive>/YYYY/MM/DD/
├── index.md      # YAML frontmatter + Markdown body
└── media/        # photos, video, audio, PDFs referenced from index.md
```

- One memory per day. The date in the path is the memory's identity, and the app refuses to create a second one for the same day.
- Folders that don't match `YYYY/MM/DD` with a real calendar date are ignored. Malformed entries are skipped, not fatal.
- The app never rewrites the body. It creates the starter file and can update `location`. Everything else is edited by hand.

## Frontmatter

```yaml
---
date: 2026-07-02            # required, must match the folder
title: A room of my own     # required
type: milestone             # required: highlight | thought | experience | travel | milestone | letter
tags: [home, personal]      # optional list of strings (max 30, 50 chars each)
mood:                       # optional
  label: Grounded
  score: 9                  # 1–10
location:                   # optional: a plain string, or an object
  name: Le Marais           # shown to the reader
  city: Paris               # used by filters, "related pages", and place links
  country: France
  latitude: 48.8590         # latitude and longitude together put the memory on the map
  longitude: 2.3622
  precision: place          # place | city | region | unknown
  source: manual            # manual | geocoding | exif | device
excerpt: One sentence summary.   # optional; defaults to the first paragraph
music:                      # optional
  title: Alameda
  artist: Elliott Smith
  url: https://open.spotify.com/
---
```

A string location (`location: Paris, France`) is valid but has no coordinates, so the memory won't appear on the map. Coordinates must be finite, with latitude in −90..90 and longitude in −180..180.

## Body

Plain Markdown. A leading `# Heading` that repeats the title is hidden when reading.

A body that contains only headings (like the starter `# What happened`) counts as a **draft**. The app shows a "Draft" badge until something is written.

Reference media with relative paths, so the file also works in Obsidian and VS Code:

```markdown
![Alt text that describes the photo](./media/photo.jpg)

<audio controls src="./media/voice-note.mp3"></audio>
<video controls src="./media/walk.mp4"></video>
[Read the notes](./media/notes.pdf)
```

Supported media: images (`avif gif heic jpg jpeg png svg webp`), video (`mov mp4 webm`), audio (`mp3 m4a wav ogg opus`), and PDF. Files in `media/` that the body doesn't reference still appear in the gallery.

A caption under a photo:

```html
<figure class="memory-figure">
  <img src="./media/photo.jpg" alt="Morning light on the desk">
  <figcaption>13 October 2026 · Morning</figcaption>
</figure>
```

Two photos side by side (they stack on phones):

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

## Checklist when writing or importing

1. The folder path, the `date` field, and the real calendar date all agree.
2. `type` is one of the six allowed values.
3. Media lives in that day's `media/` folder and is referenced as `./media/...` (no absolute paths, no `../`).
4. Add `latitude` and `longitude` when the place matters, so the memory shows on the map.
5. Write alt text that describes the photo for someone who can't see it.
