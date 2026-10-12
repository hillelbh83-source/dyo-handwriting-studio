# Dyo Handwriting Studio

A personal handwriting studio for creating custom fonts and turning Hebrew, English, and LaTeX documents into natural-looking handwritten PDFs.

Draw your own letters, save multiple variants, and use them to write documents with the character of your handwriting. Each character occurrence chooses a variant independently, while gradual baseline movement and spacing based on letter contours give the text a shared writing rhythm.

## Features

- A drawing workspace with editable character variants and per-character adjustments.
- Hebrew and English text with mixed-direction support.
- Plain text and Markdown documents, including headings, lists, tables, and code.
- Inline and display LaTeX formulas rendered with your handwritten characters.
- Custom fraction bars with randomly selected drawn variants.
- PDF downloads using the browser's SVG renderer, preserving the current preview's ink and character choices.
- TrueType font export with additional variants included as stylistic alternates (`salt`). Random mixing in external applications depends on their font-feature support.
- Local browser storage and JSON backup import/export.

## Run locally

Install Node.js 22.13 or newer, then run:

```sh
npm run dev
```

Open **http://localhost:5173**. The local studio runs directly from `public/` and uses bundled browser libraries; it does not require installing the framework dependencies or connecting to a cloud service.

The server also supports access from devices on the same local network. To listen only on this computer:

```sh
HOST=127.0.0.1 npm run dev
```

## Your handwriting and documents

Drawings, documents, and settings are saved in the browser for the address you use. Export a JSON backup to move your handwriting to another browser or device. Opening the site at a different address does not automatically transfer that data.

Sample handwriting assets are included in `public/downloads/`. Drawings and backups created in your browser are not automatically uploaded to this repository.

## Development

The local application lives in `public/`, with its server in `scripts/local-server.mjs`. The repository also retains the React/Vite/Cloudflare scaffold and its dependency lockfile.

For TypeScript editor support and work on that scaffold, install the pinned dependencies:

```sh
pnpm install --frozen-lockfile
```

The project uses pnpm 11.25.0. Bundled third-party libraries include their license files under `public/vendor/` and `vendor/`.

