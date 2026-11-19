# Life Archive

I built Life Archive because I want to keep memories for the future: the big days and the ordinary ones. It's deliberately simple. Each memory is a Markdown file in a folder you own, and Life Archive is a calm way to read them back as a timeline, a calendar, a gallery, and a map. No account, no database, no cloud. If the app disappears tomorrow, your memories are still plain text and photos you can open anywhere.

## Run it

```bash
docker compose up -d --build
```

Open <http://localhost:3000>. With no configuration you'll see a few sample memories, so you can explore everything first.

## Use your own memories

Point it at a folder in `.env`, then restart:

```bash
cp .env.example .env
# .env
NUXT_ARCHIVE_DIR=/absolute/path/to/my-memories
```

```bash
docker compose up -d
```

That folder is mounted into the container, never copied into it. Stopping, removing, or rebuilding the container doesn't touch your files.

## Your data

One folder per day, one Markdown file per memory, photos next to it:

```text
my-memories/
└── 2026/
    └── 07/
        └── 02/
            ├── index.md
            └── media/
                └── window.jpg
```

```markdown
---
date: 2026-07-02
title: A room of my own
type: milestone
tags: [home]
location: Paris, France
---

The last box is unpacked. The desk is by the window.

![The desk by the window](./media/window.jpg)
```

Write in any editor (VS Code, Obsidian, or a plain text editor). Back it up, sync it, or copy it anywhere: it's just files. The **New memory** button (or `N`) creates the folder and a starter file for you.

## Without Docker

```bash
npm install
npm run dev
```

It reads the same `.env` file and also works without one.

## Configuration

All optional, set in `.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `NUXT_ARCHIVE_DIR` | *(empty: sample memories)* | Absolute path to your memories folder |
| `LIFE_ARCHIVE_PORT` | `3000` | Port on your machine (Docker) |
| `LIFE_ARCHIVE_BIND` | `127.0.0.1` | Set to `0.0.0.0` to expose a public demo (Docker) |
| `NUXT_PHOTON_URL` | `https://photon.komoot.io/api` | Place search used when adding a location |
| `NUXT_PUBLIC_MAP_STYLE_URL` | OpenFreeMap Positron | Map tiles |

Your memories never leave your machine. The only outside requests are map tiles while the map is open, and place search when you look up a location.

## Contributing

Architecture, conventions, and the full memory format live in [AGENTS.md](AGENTS.md) and [`.agents/skills/`](.agents/skills/). Sample photos are from Unsplash; see [credits](public/sample-media/CREDITS.md).
