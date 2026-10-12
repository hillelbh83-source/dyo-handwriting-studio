# Dyo Handwriting Studio

**Your handwriting, from the first letter to a finished document.** Draw letters, give each one a few natural variations, and turn Hebrew, English, and mathematical text into handwritten PDFs. You can also export an installable font.

**From an AI answer to a handwritten PDF:** ask your AI assistant for Markdown (MD), copy the Markdown source into the studio’s **מסמך** (Document) text box, check the preview, and click **הורדת PDF** (Download PDF). No intermediate file or conversion tool is needed. [See the steps and a ready-to-copy prompt](#ai-to-pdf).

**Choose your guide:** [English](README.md) · [עברית — המדריך המלא](README.he.md)

The studio interface is in Hebrew. This English guide includes the Hebrew button labels so you can find your way around. Once the studio is running, a readable guide is available at [localhost:5173/guide.html](http://localhost:5173/guide.html), with a language switch and chapter navigation.

## Contents

- [1. Your first document](#start)
- [2. Download and run](#setup)
- [3. Find your way around](#tour)
- [4. Draw letters and variants](#draw)
- [5. Write and format a document](#document)
- [6. Mathematics and LaTeX](#math)
- [7. Export PDF or font](#export)
- [8. Save, back up, and restore](#backup)
- [9. Use a phone or tablet](#mobile)
- [10. Troubleshooting](#troubleshooting)
- [11. For developers](#development)
- [12. Libraries and credits](#credits)

<a id="start"></a>
## 1. Your first document

You do not need to draw an entire alphabet to get started.

1. [Run the studio](#setup) and open **http://localhost:5173**.
2. In **מעבדת אותיות** (Letter lab), select a letter from the library and draw it on the lined canvas.
3. Click **שמירת גרסה +** (Save variant). Draw a second version and save it too.
4. Open **מסמך** (Document) and type a short word containing that letter. Draw the remaining letters in your word to make it fully handwritten.
5. Adjust **גודל ועובי טקסט** (Text size and ink weight), then click **הורדת PDF** (Download PDF).
6. Click **גיבוי אותיות** (Back up letters) and **שמירת טקסט** (Save text) to keep editable copies as well.

**Try before drawing:** download the [sample handwriting JSON](public/downloads/dyo-expanded-backup.json) and load it with **טעינת גיבוי** (Load backup). You can download the [sample TTF](public/downloads/my-dyo-handwriting-expanded.ttf) separately to try an installed font. These are sample assets; they are not your own handwriting. Importing a backup replaces your current letter library, so export your own backup first.

<a id="setup"></a>
## 2. Download and run

### What you need

A computer with **Node.js 22.13 or newer**, a modern browser, and this repository. No account, API key, cloud service, or framework dependency installation is required for the local studio. Internet access is needed to download the project and Node.js; the studio then uses bundled local libraries.

### Option A — download a ZIP

1. On the [GitHub repository](https://github.com/hillelbh83-source/dyo-handwriting-studio), choose **Code → Download ZIP**.
2. Extract the ZIP into a normal folder. Do not run it from inside the archive.
3. Open a terminal in the extracted folder, where `package.json` is located. On Windows this can be PowerShell; on macOS or Linux use Terminal.
4. Run:

```sh
npm run dev
```

5. Keep that terminal open and visit **http://localhost:5173** in your browser. To stop the server, press **Ctrl+C** in the terminal.

### Option B — use Git

```sh
git clone https://github.com/hillelbh83-source/dyo-handwriting-studio.git
cd dyo-handwriting-studio
npm run dev
```

### Useful server settings

By default, the server listens on your local network. To restrict access to this computer on macOS/Linux:

```sh
HOST=127.0.0.1 npm run dev
```

In Windows PowerShell:

```powershell
$env:HOST="127.0.0.1"
npm run dev
```

If port 5173 is occupied, use `PORT=5174 npm run dev` on macOS/Linux, or set `$env:PORT="5174"` before `npm run dev` in PowerShell. Open the matching port in the browser. **Changing the address or port opens separate browser storage**; export a backup and your text before moving.

<a id="tour"></a>
## 3. Find your way around

| Area / Hebrew label | What you do here |
| --- | --- |
| Letter lab / מעבדת אותיות | Choose characters, draw them, save variants, and adjust their size or baseline. |
| Document / מסמך | Type or load text, format it, preview handwriting, and download a PDF. |
| Font / פונט | Name and download an installable TrueType font. |
| Back up letters / גיבוי אותיות | Download the letter library and per-character adjustments as JSON. |
| Load backup / טעינת גיבוי | Replace the letter library with a previously exported JSON file. |
| User guide / מדריך למשתמש | Open this guide and choose English or Hebrew. |

The ready-character count shows how many characters have at least one saved variant. You can work with a partial library and add letters as needed.

<a id="draw"></a>
## 4. Draw letters and variants

### Choose and draw

Select Hebrew, lowercase English, uppercase English, numbers/punctuation, mathematics, or custom characters. Click the desired character, then draw with a mouse, finger, or stylus.

The **blue baseline** is where ordinary letters sit. Use the body-height guide for their main shape; descending letters can extend below the baseline. **התאמת גובה אוטומטית** (Automatic height adjustment) adapts the saved shape to the character type while retaining its proportions. Turn it off if you prefer your original positioning.

- **ביטול קו** (Undo stroke) removes the latest stroke on the canvas.
- **ניקוי** (Clear) clears the current canvas; saved variants remain in the library.
- **עובי עט** (Pen width) controls the drawing pen.
- **שמירת גרסה +** (Save variant) adds your drawing to the selected character.
- **התו הבא שחסר** (Next missing character) finds an undrawn character in the selected group.

**Save before selecting another character.** Switching characters clears the current canvas. A drawing becomes a library variant only when you save it.

### Make it feel natural

Start with one variant per needed character. Add 3–5 variants when you want more natural variation. Small differences are useful: each occurrence in the studio can choose a different saved variant. The document's **אופי כתב היד** (Handwriting character) slider controls natural movement; preview regeneration may choose new variants.

Click a saved variant to edit it, then use **עדכון גרסה** (Update variant) to replace that version. To create an additional version instead, clear the canvas and draw again. The **×** control deletes that saved variant. Large libraries have previous/next variant-page controls.

### Adjust or add characters

Use **גודל** (Size) and **גובה בשורה** (Baseline position) to adjust all variants of the selected character. **איפוס הכוונון לתו הזה** resets only those adjustments. Original drawings remain available.

Enter one character in **תו נוסף** (Extra character), then click **הוספה** (Add). For personal fraction lines, use **ציור קו שבר** (Draw fraction bar), draw a horizontal stroke, and save one or more variants.

<a id="document"></a>
## 5. Write and format a document

In **מסמך**, paste or type into the text box, or choose **טעינת מסמך** (Load document) for a `.txt` or `.md` file. Uploaded text files must be no larger than 1 MB. Loading a file replaces the text in the editor, so save your current text first.

The preview updates as you type. **רענון תצוגה** (Refresh preview) rebuilds it manually. **מסמך לדוגמה — כל התווים** (Sample document — all characters) is useful for spotting gaps in your library; it asks before replacing existing non-demo text.

<a id="ai-to-pdf"></a>
### Turn an AI answer into a PDF

To turn a summary, explanation, lesson, or other AI-generated text into a handwritten document, ask the AI to write in **Markdown (MD)**. Then copy the source directly into Dyo. You do not need to create or upload a `.md` file first.

1. **Ask for Markdown.** Use the prompt below and replace the bracketed topic with your request.
2. **Copy the Markdown source.** If the AI presents it in a code block, use that block’s copy button. Paste only the document content, without the enclosing triple backticks or the AI’s introductory comments.
3. **Paste into Dyo.** Open **מסמך** (Document) and paste into **הטקסט שלכם** (Your text). Save any existing text before replacing it.
4. **Check the preview.** Dyo formats the headings, paragraphs, lists, tables, and supported formulas, using your saved handwriting where available. Adjust text size and ink weight if needed.
5. **Download the PDF.** Click **הורדת PDF** (Download PDF), then open the downloaded file to check its pages before sharing it.

A ready-to-copy prompt:

```text
Write [your topic or request] as Markdown (MD) source that I can paste
into Dyo Handwriting Studio. Use clear headings, short paragraphs,
and lists or simple tables where appropriate. For mathematics, use
LaTeX with $...$ for inline formulas and $$...$$ for display formulas.
Return only the document content, without an introduction or enclosing
triple backticks. Do not use HTML or rely on external images.
```

**Markdown provides the formatting; your saved letter library provides the handwriting.** If a character is missing, draw it in the letter lab. Review the AI’s content and the document preview before exporting, especially for wide tables or long formulas. Use **שמירת טקסט** (Save text) if you also want an editable Markdown copy.

### Format text yourself

Plain text works immediately. **Markdown** is plain text with simple formatting marks:

```markdown
# My notebook
## A smaller heading
This is **bold** and this is *emphasized*.

- First item
- Second item

1. First step
2. Second step

| Topic | Notes |
| --- | --- |
| Practice | A little every day |
```

Hebrew, English, and mixed-direction paragraphs are supported. Open **גודל ועובי טקסט** to adjust text size, ink weight, word spacing, and natural movement. Watch the preview while you adjust; those choices also affect PDF output. Missing letter drawings can appear as regular text rather than your handwriting: draw them in the letter lab.

Use **שמירת טקסט** to download the editable source as `.md`. This retains the text and Markdown/LaTeX syntax. A PDF is the finished visual document; it cannot be loaded back into this text editor.

<a id="math"></a>
## 6. Mathematics and LaTeX

Write a short formula between single dollar signs; put a formula on its own line between double dollar signs:

```latex
Inline: $x^2 + y^2 = z^2$

$$
\frac{1}{2} + \sqrt{x} = \int_0^1 t^2\,dt
$$
```

Fractions, powers, indices, integrals, limits, matrices, and scalable brackets use bundled KaTeX layout with your saved handwriting where available. Draw the letters, digits, and symbols used in your formula in **סימנים מתמטיים** (Math symbols) and the other character groups. Some mathematical characters have equivalent-letter aliases. Missing drawings can retain standard formula characters.

A custom saved fraction-bar variant is stretched to match the fraction width. A TTF font alone does not arrange equations; use the studio's document editor and PDF export for mathematical layouts.

<a id="export"></a>
## 7. Export PDF or font

### A finished document — PDF

1. Open **מסמך** and check the preview.
2. Set your text size and ink weight.
3. Click **הורדת PDF** and let the export finish.
4. Open the downloaded file to check its pages before sharing or printing it.

PDF export uses the current preview's handwritten shapes and layout. Long documents can take longer and are split into pages; check wide formulas and tables in the resulting file. You do not need to install a font to view the PDF.

### Your handwriting in other apps — TTF

1. Open **פונט** (Font).
2. Enter a name in **שם הפונט** (Font name).
3. Click **הורדת פונט TTF** (Download TTF font).
4. If a save dialog opens, choose a destination. Otherwise the browser downloads it; a **הורדת הקובץ המוכן** (Download ready file) link is also available.
5. Open the `.ttf` file with your operating system's font installer and install it. Reopen your writing app and select the font name you chose.

The first variant is the default character. Additional variants are included as stylistic alternates (`salt`), but external applications differ in their font-feature support. Automatic random mixing is available in the studio; do not assume Word or another app will mix variants automatically. Undrawn characters are not added to the font and may use another font in external apps.

<a id="backup"></a>
## 8. Save, back up, and restore

**Your work is stored in this browser, at this exact address.** The letter library uses IndexedDB; text and settings use browser storage. No sign-in or automatic device sync is provided. Browser-data cleanup, private browsing, a different browser, or a changed address can make previous work unavailable.

| Keep this | How | What it contains |
| --- | --- | --- |
| Editable handwriting | **גיבוי אותיות** → `.json` | Saved character variants and per-character size/baseline adjustments. |
| Editable document | **שמירת טקסט** → `.md` | Current text, Markdown formatting, and LaTeX source. |
| Finished document | **הורדת PDF** → `.pdf` | Exported pages for viewing, printing, and sharing. |
| Installable font | **הורדת פונט TTF** → `.ttf` | Exported glyphs and alternates for compatible applications. |

**The JSON backup does not include document text or all display settings.** Keep both JSON and Markdown copies. A TTF file is not an editable studio backup, and TTF import is not supported.

To restore: open the intended browser/address, choose **טעינת גיבוי**, and select your JSON. Import replaces the existing letter library after confirmation; it does not merge libraries. Export the current library before importing another. Then load your saved `.md` in the Document tab and recheck display settings. JSON imports must be no larger than 20 MB and must use the studio's backup format.

Wait until the header says **נשמר במכשיר שלך** (Saved on your device) before closing. If it reports a save failure, download a JSON backup immediately and save your text too.

<a id="mobile"></a>
## 9. Use a phone or tablet

1. Run the server on your computer with its default network settings. Keep the computer awake and the terminal open.
2. Connect both devices to the same trusted Wi-Fi network.
3. Find the computer's local network IP in its network settings, for example `192.168.1.20`.
4. Open `http://192.168.1.20:5173` on the phone, replacing the example with your computer's address.
5. Draw with a finger or stylus. Scroll outside the canvas; touches inside it are reserved for drawing. The bottom tabs switch between lab, document, and font.

On the phone, `localhost` refers to the phone itself. Use the computer's IP address. If the page cannot open, check that the server is running, that it is not limited to `127.0.0.1`, and that your firewall permits this local connection.

The phone has its own browser data. To move work, export JSON and Markdown on the original device, transfer the files yourself, and import them on the phone. There is no automatic synchronization.

<a id="troubleshooting"></a>
## 10. Troubleshooting

| Problem | What to do |
| --- | --- |
| `node` or `npm` is not recognized | Install the required Node.js version, then reopen your terminal. |
| `package.json` cannot be found | Open the terminal in the extracted repository folder, not its parent folder. |
| `EADDRINUSE` / port already in use | Stop the other server or choose a different port as explained in [setup](#setup). Remember that storage is separate for each port. |
| I cannot find my letters | Return to the same browser and exact address you used before. If browser data was removed, restore your JSON backup. |
| Some text is not handwritten | Draw those characters; check English case, punctuation, and mathematical symbols too. |
| A character is too high or too large | Select it in the lab and adjust its size/baseline; review automatic height adjustment when drawing. |
| My unsaved drawing disappeared | Save a variant before changing character. Canvas strokes are not saved as library letters automatically. |
| The formula shows an error | Check dollar-sign pairs, braces, and LaTeX commands. Try the small example in the math chapter. |
| Preview or export takes time | Try a shorter document, wait for the preview to finish, and avoid repeated export clicks. Save your JSON and text before reloading. |
| No file appears after export | Check your browser's downloads or save dialog. For fonts, use the ready-file link. |
| Backup is rejected | Select a studio JSON backup, not a TTF/PDF. Check the 20 MB limit. Save your existing library before trying another file. |
| Saving failed | Export JSON and text immediately; check available device storage and browser storage permissions. |

When reporting a problem in [GitHub Issues](https://github.com/hillelbh83-source/dyo-handwriting-studio/issues), include your browser, operating system, what you did, and what happened. Use a small non-private example or screenshot rather than uploading your personal documents.

<a id="development"></a>
## 11. For developers

| Location | Purpose |
| --- | --- |
| `public/index.html`, `public/style.css`, `public/studio.css` | Local studio markup and presentation. |
| `public/app.js`, `public/local.js` | Drawing, document interaction, font export, and local preferences. |
| `public/storage.js`, `public/storage-worker.js` | Browser letter-library persistence. |
| `public/document-markdown*.js`, `public/document-pdf.js` | Markdown/LaTeX rendering and PDF output. |
| `public/font.js` | Font generation. |
| `scripts/local-server.mjs` | Static local server and development reload. |
| `README.md`, `README.he.md` | English and Hebrew guide sources. |
| `scripts/build-guide.mjs` | Generate the two offline HTML guides from the READMEs. |
| `public/downloads/` | Included sample handwriting assets. |

Run `npm run dev` or `npm start` for the local studio. Regenerate the website guides after documentation edits with:

```sh
npm run docs:build
```

The repository also retains a React/Vite/Cloudflare scaffold. Its framework build and lint scripts concern that scaffold; they are not required to use the local studio. If working on the scaffold, install the pinned dependencies with `pnpm install --frozen-lockfile` (pnpm 11.25.0). Preserve browser data and handwritten variants when changing storage or rendering.

<a id="credits"></a>
## 12. Libraries and credits

Bundled libraries include KaTeX for mathematical layout, markdown-it for Markdown, and jsPDF with svg2pdf.js for PDF output. Third-party license files are included under `public/vendor/` and `vendor/`.

Drawings and documents created in your browser are not automatically uploaded to GitHub. Files already included in `public/downloads/` are repository samples. Keep personal exports outside the repository if you do not intend to publish them.
