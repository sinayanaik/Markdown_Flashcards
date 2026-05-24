const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. nomnoml parsing
code = code.replace(
  /} else if \(\/\\bd2\\b\/\.test\(lang\) \|\| \/\\bd2lang\\b\/\.test\(lang\) \|\| \/\\bd2lang-js\\b\/\.test\(lang\)\) {/,
  `} else if (/\\bnomnoml\\b/.test(lang)) {`
);
code = code.replace(/class="d2-diagram"/, `class="nomnoml-diagram"`);

// 2. nomnoml rendering
code = code.replace(
  /const d2Diagrams = container\.querySelectorAll\("\.d2-diagram"\);[\s\S]*?if \(d2Diagrams\.length\) \{[\s\S]*?\}\)\);\n  \}/,
  `const nomnomlDiagrams = container.querySelectorAll(".nomnoml-diagram");
  nomnomlDiagrams.forEach((node) => {
    if (node.dataset.diagram) {
      node.textContent = decodeURIComponent(node.dataset.diagram);
    }
    node.removeAttribute("data-processed");
  });

  if (nomnomlDiagrams.length) {
    nomnomlDiagrams.forEach((node) => {
      try {
        const diagramSource = node.textContent;
        const svg = nomnoml.renderSvg(diagramSource);
        node.innerHTML = svg;
        addDiagramZoomControl(node);
      } catch (err) {
        console.warn("Nomnoml render error:", err);
        node.textContent = "Error rendering Nomnoml: " + err.message;
      }
    });
  }`
);

// 3. remove globalD2Promise
code = code.replace(/let globalD2Promise = null;\n/, '');

// 4. Modal zoom styles and options
code = code.replace(/img\.style\.maxWidth = "100%";\n     img\.style\.maxHeight = "100%";\n/, '');
code = code.replace(/minScale: 0\.5,\n        contain: 'outside',/, `minScale: 0.1,\n        startScale: 1,`);

// 5. Append feature in buildCards
code = code.replace(
  /function buildCards\(titleHint = state\.importTitleHint \|\| ""\) \{/,
  `function buildCards(titleHint = state.importTitleHint || "", append = false) {`
);
code = code.replace(
  /state\.cards = cards;\n  state\.masterCards = cards\.slice\(\);\n  state\.deckId = null;\n  state\.current = 0;\n  state\.deckTitle = cards\.length \? importTitle \|\| inferDeckTitle\(source, titleHint\) : "";\n  state\.sourceTitle = cards\.length \? importTitle \|\| state\.deckTitle : "";/,
  `if (append) {
    state.cards = state.cards.concat(cards);
    state.masterCards = state.masterCards.concat(cards);
  } else {
    state.cards = cards;
    state.masterCards = cards.slice();
    state.deckId = null;
    state.current = 0;
    state.deckTitle = cards.length ? importTitle || inferDeckTitle(source, titleHint) : "";
    state.sourceTitle = cards.length ? importTitle || state.deckTitle : "";
    resetResults();
  }`
);
code = code.replace(/resetResults\(\);\n  closeAllCardsPanel\(\);/, 'closeAllCardsPanel();');

// 6. Append feature in loadDeckSnapshot
code = code.replace(
  /function loadDeckSnapshot\(payload, titleHint = ""\) \{/,
  `function loadDeckSnapshot(payload, titleHint = "", append = false) {`
);
code = code.replace(
  /const usedIds = new Set\(\);\n  const statusById = \{\};/,
  `const usedIds = new Set(append ? state.masterCards.map(c => c.id) : []);\n  const statusById = append ? { ...state.statusById } : {};`
);
code = code.replace(
  /if \(usedIds\.has\(id\)\) id = `\$\{index\}-\$\{id\}`;/,
  `while (usedIds.has(id)) id = \`\$\{index\}-\$\{Math.random().toString(36).slice(2, 6)\}-\$\{id\}\`;`
);
code = code.replace(
  /state\.cards = cards\.slice\(\);\n  state\.masterCards = cards\.slice\(\);\n  state\.statusById = statusById;\n  state\.current = Math\.min\(Math\.max\(Number\(payload\.current\) \|\| 0, 0\), cards\.length\);\n  state\.previewCard = null;\n  state\.flipped = false;\n  state\.deckTitle = String\(payload\.deckTitle \|\| ""\)\.trim\(\) \|\| humanizeSourceTitle\(titleHint\);\n  state\.deckId = payload\.deckId \|\| null;\n  state\.sourceTitle = String\(payload\.sourceTitle \|\| ""\)\.trim\(\) \|\| sourceFileTitle\(titleHint\) \|\| state\.deckTitle;\n  state\.importTitleHint = String\(payload\.importTitleHint \|\| ""\)\.trim\(\) \|\| titleHint;/,
  `if (append) {
    state.cards = state.cards.concat(cards);
    state.masterCards = state.masterCards.concat(cards);
    state.statusById = statusById;
  } else {
    state.cards = cards.slice();
    state.masterCards = cards.slice();
    state.statusById = statusById;
    state.current = Math.min(Math.max(Number(payload.current) || 0, 0), cards.length);
    state.previewCard = null;
    state.flipped = false;
    state.deckTitle = String(payload.deckTitle || "").trim() || humanizeSourceTitle(titleHint);
    state.deckId = payload.deckId || null;
    state.sourceTitle = String(payload.sourceTitle || "").trim() || sourceFileTitle(titleHint) || state.deckTitle;
    state.importTitleHint = String(payload.importTitleHint || "").trim() || titleHint;
  }`
);

// 7. LoadFile with append
code = code.replace(
  /function loadFile\(file\) \{/,
  `function loadFile(file, append = false) {`
);
code = code.replace(
  /loadZipFile\(file\);/,
  `loadZipFile(file, append);`
);
code = code.replace(
  /loadDeckSnapshot\(JSON\.parse\(text\), file\.name\);/,
  `loadDeckSnapshot(JSON.parse(text), file.name, append);`
);
code = code.replace(
  /buildCards\(state\.importTitleHint\);/g,
  `buildCards(state.importTitleHint, append);`
);

// 8. Add el variables for zoom and file inputs
code = code.replace(
  /fileInput: document\.querySelector\("#fileInput"\),/,
  `fileInput: document.querySelector("#fileInput"),
  fileInputCards: document.querySelector("#fileInputCards"),`
);
code = code.replace(
  /closeDiagramBtn: document\.querySelector\("#closeDiagramBtn"\),/,
  `closeDiagramBtn: document.querySelector("#closeDiagramBtn"),
  diagramZoomInBtn: document.querySelector("#diagramZoomInBtn"),
  diagramZoomOutBtn: document.querySelector("#diagramZoomOutBtn"),`
);

// 9. Add event listeners
code = code.replace(
  /el\.fileInput\.addEventListener\("change", \(event\) => loadFile\(event\.target\.files\[0\]\)\);/,
  `el.fileInput.addEventListener("change", (event) => loadFile(event.target.files[0], false));
if (el.fileInputCards) el.fileInputCards.addEventListener("change", (event) => loadFile(event.target.files[0], true));`
);
code = code.replace(
  /el\.closeDiagramBtn\.addEventListener\("click", closeDiagramModal\);/,
  `el.closeDiagramBtn.addEventListener("click", closeDiagramModal);
el.diagramZoomInBtn?.addEventListener("click", () => currentPanzoom?.zoomIn());
el.diagramZoomOutBtn?.addEventListener("click", () => currentPanzoom?.zoomOut());`
);

fs.writeFileSync('app.js', code);
