# Flashcards

A static GitHub Pages app that turns Markdown into swipe flashcards.

## How Cards Are Parsed

The primary flashcard format is a `::` card block with a `---` separator:

```md
::
## Front

---

## Back
::
```

Everything before `---` becomes the front. Everything after it becomes the back. Both sides render as Markdown.
Blank lines are optional around the markers, so compact blocks like `::## Front`, `---## Back`, and `## Back::` are also accepted.

The app also accepts legacy formats:

- `##`, `###`, or `####` headings followed by answer content until the next heading
- Study-note headings such as `### Explain ...`, `### Describe ...`, `### Summary ...`, or headings with labeled sections like `**Translation:**`, `**Meaning:**`, and `**Word Meanings:**`
- Notion toggle exports where each toggle appears as a blockquote
- `<details><summary>Question</summary>Answer</details>`
- `Q: ...` / `A: ...` blocks

## Features

- Swipe left or press `ArrowRight` for the next card.
- Swipe right or press `ArrowLeft` for the previous card.
- Use the explicit `Review` and `Known` buttons to categorize cards.
- On mobile, vertical gestures are reserved for scrolling the page and long card content.
- Click or tap the card, press `Space`, or press `Enter` to flip.
- Renders Markdown, tables, code blocks, LaTeX with KaTeX, and Mermaid diagrams.
- Imports pasted Markdown, uploaded `.md` / `.txt` / `.json` / `.zip` files, direct raw Markdown URLs, and public pages through Jina Reader fallback.
- Persists the current deck and known/review markers in the browser.
- Dark mode, compact deck-first layout, Markdown export, JSON export with markers, and PDF export for known, review, or all cards.

Private Notion pages cannot be read securely by a static GitHub Pages app because using the Notion API requires a secret token. Public Notion pages can also hide collapsed toggle bodies from URL readers; if the import finds only question headings, export the page as Markdown or paste the expanded toggle content.

## GitHub Pages

Commit these files to a GitHub repository:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`

Then enable GitHub Pages from the repository settings and select the branch that contains these files.
