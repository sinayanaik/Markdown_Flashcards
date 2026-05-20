const sampleMarkdown = `> What is the derivative of $x^2$?
>
> The derivative is $2x$.
>
> $$
> \\frac{d}{dx}x^2 = 2x
> $$

> What does this Mermaid graph show?
>
> It shows a simple spaced-repetition loop.
>
> \`\`\`mermaid
> flowchart LR
>   A[Read note] --> B[Answer card]
>   B --> C{Remembered?}
>   C -->|Yes| D[Known]
>   C -->|No| E[Review]
> \`\`\`

> How do Notion toggle exports become cards?
>
> Each blockquote group becomes one flashcard. The first non-empty line is the question, and the remaining lines become the answer.`;

const state = {
  cards: [],
  masterCards: [],
  statusById: {},
  previewCard: null,
  deckTitle: "",
  results: {
    known: [],
    review: []
  },
  current: 0,
  known: 0,
  review: 0,
  flipped: false,
  dragStartX: 0,
  dragCurrentX: 0,
  dragging: false
};

const el = {
  sourceInput: document.querySelector("#sourceInput"),
  urlInput: document.querySelector("#urlInput"),
  fileInput: document.querySelector("#fileInput"),
  fetchBtn: document.querySelector("#fetchBtn"),
  parseBtn: document.querySelector("#parseBtn"),
  sampleBtn: document.querySelector("#sampleBtn"),
  importBtn: document.querySelector("#importBtn"),
  closeImportBtn: document.querySelector("#closeImportBtn"),
  importPanel: document.querySelector("#importPanel"),
  printRoot: document.querySelector("#printRoot"),
  diagramModal: document.querySelector("#diagramModal"),
  diagramModalBody: document.querySelector("#diagramModalBody"),
  closeDiagramBtn: document.querySelector("#closeDiagramBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  exportMenu: document.querySelector("#exportMenu"),
  themeBtn: document.querySelector("#themeBtn"),
  deckTitle: document.querySelector("#deckTitle"),
  shuffleBtn: document.querySelector("#shuffleBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  card: document.querySelector("#card"),
  questionView: document.querySelector("#questionView"),
  answerView: document.querySelector("#answerView"),
  cardCount: document.querySelector("#cardCount"),
  knownStackCount: document.querySelector("#knownStackCount"),
  reviewStackCount: document.querySelector("#reviewStackCount"),
  knownBrickList: document.querySelector("#knownBrickList"),
  reviewBrickList: document.querySelector("#reviewBrickList"),
  positionText: document.querySelector("#positionText"),
  scoreText: document.querySelector("#scoreText"),
  progressBar: document.querySelector("#progressBar"),
  statusText: document.querySelector("#statusText"),
  flipBtn: document.querySelector("#flipBtn"),
  knownBtn: document.querySelector("#knownBtn"),
  reviewBtn: document.querySelector("#reviewBtn"),
  replayReviewBtn: document.querySelector("#replayReviewBtn"),
  replayKnownBtn: document.querySelector("#replayKnownBtn"),
  replayAllBtn: document.querySelector("#replayAllBtn"),
  clearProgressBtn: document.querySelector("#clearProgressBtn")
};

marked.setOptions({
  breaks: true,
  gfm: true,
  mangle: false,
  headerIds: false
});

function configureMermaid(theme) {
  const dark = theme === "dark";
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: {
      primaryColor: dark ? "#202a25" : "#eef4f1",
      primaryTextColor: dark ? "#edf5f1" : "#16201c",
      primaryBorderColor: dark ? "#4fc3b1" : "#0f7b6c",
      lineColor: dark ? "#a5b3ad" : "#66736d",
      secondaryColor: dark ? "#171d1a" : "#fcfaf7",
      tertiaryColor: dark ? "#101412" : "#ffffff"
    }
  });
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("swipe-notes-theme", theme);
  el.themeBtn.textContent = theme === "dark" ? "Light" : "Dark";
  configureMermaid(theme);
  if (state.cards[state.current]) showCard();
}

function setStatus(message, type = "info") {
  el.statusText.textContent = message;
  el.statusText.classList.toggle("error", type === "error");
}

function openImportPanel() {
  el.importPanel.classList.add("is-open");
}

function closeImportPanel() {
  if (state.cards.length) {
    el.importPanel.classList.remove("is-open");
  }
}

function normalizeMarkdown(text) {
  return text.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
}

function stripReaderMetadata(markdown) {
  const source = normalizeMarkdown(markdown).trim();
  const marker = "\nMarkdown Content:\n";
  const markerIndex = source.indexOf(marker);
  return markerIndex === -1 ? source : source.slice(markerIndex + marker.length).trim();
}

function removeEmptyHeadingGroups(markdown) {
  return normalizeMarkdown(markdown)
    .split("\n")
    .filter((line) => !/^#{1,6}\s*[^\S\r\n]*$/.test(line))
    .join("\n");
}

function humanizeSourceTitle(value) {
  const cleaned = normalizeMarkdown(String(value || ""))
    .split(/[?#]/)[0]
    .split("/")
    .filter(Boolean)
    .pop() || "";
  const withoutExtension = cleaned.replace(/\.(md|markdown|mdown|mkdn|txt|zip)$/i, "");
  const withoutNotionId = withoutExtension
    .replace(/[-_\s]+[a-f0-9]{32}$/i, "")
    .replace(/[-_\s]+[a-f0-9]{8,}$/i, "");
  return withoutNotionId
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferDeckTitle(markdown, fallback = "") {
  const source = stripReaderMetadata(markdown);
  const lines = normalizeMarkdown(source).split("\n");
  const h1 = lines.find((line) => /^#\s+.+/.test(line.trim()));
  if (h1) return h1.replace(/^#\s+/, "").replace(/\s+#*$/, "").trim();

  const nonQuestionHeading = lines.find((line) => {
    const match = line.trim().match(/^#{2,6}\s+(.+?)\s*#*$/);
    return match && !match[1].trim().endsWith("?");
  });
  if (nonQuestionHeading) {
    return nonQuestionHeading.replace(/^#{2,6}\s+/, "").replace(/\s+#*$/, "").trim();
  }

  return humanizeSourceTitle(fallback);
}

function stripQuoteMarker(line) {
  return line.replace(/^\s{0,3}>\s?/, "");
}

function cleanToggleContent(lines) {
  return lines
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseBlockquoteCards(markdown) {
  const lines = normalizeMarkdown(markdown).split("\n");
  const cards = [];
  let block = [];
  let inFence = false;

  const flush = () => {
    const body = cleanToggleContent(block);
    block = [];
    if (!body) return;

    const parts = body.split("\n");
    const firstContentIndex = parts.findIndex((line) => line.trim());
    if (firstContentIndex === -1) return;

    const question = parts[firstContentIndex].trim();
    const answer = cleanToggleContent(parts.slice(firstContentIndex + 1));
    if (question && answer) {
      cards.push({ question, answer });
    }
  };

  for (const line of lines) {
    const isQuote = /^\s{0,3}>/.test(line);

    if (isQuote) {
      const stripped = stripQuoteMarker(line);
      if (/^\s*```/.test(stripped)) inFence = !inFence;
      block.push(stripped);
      continue;
    }

    if (line.trim() === "" && block.length && inFence) {
      block.push("");
      continue;
    }

    flush();
    inFence = false;
  }

  flush();
  return cards;
}

function parseDetailsCards(markdown) {
  const cards = [];
  const detailsPattern = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  let match;

  while ((match = detailsPattern.exec(markdown))) {
    const question = match[1].replace(/<[^>]*>/g, "").trim();
    const answer = match[2].trim();
    if (question && answer) cards.push({ question, answer });
  }

  return cards;
}

function parseQACards(markdown) {
  const cards = [];
  const chunks = normalizeMarkdown(markdown).split(/\n{2,}(?=(?:Q|Question)\s*:)/i);

  for (const chunk of chunks) {
    const match = chunk.match(/^(?:Q|Question)\s*:\s*([\s\S]*?)\n(?:A|Answer)\s*:\s*([\s\S]*)$/i);
    if (match?.[1]?.trim() && match?.[2]?.trim()) {
      cards.push({
        question: match[1].trim(),
        answer: match[2].trim()
      });
    }
  }

  return cards;
}

function parseHeadingCards(markdown) {
  const lines = normalizeMarkdown(markdown).split("\n");
  const cards = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    const answer = cleanToggleContent(current.answer);
    if (current.question && answer) {
      cards.push({
        question: current.question,
        answer
      });
    }
  };

  for (const line of lines) {
    const heading = line.match(/^(#{2,6})\s+(.+?)\s*#*\s*$/);

    if (heading) {
      if (line.trim().endsWith("?")) {
        flush();
        current = {
          question: heading[2].trim(),
          level: heading[1].length,
          answer: []
        };
        continue;
      }

      if (current && heading[1].length <= current.level) {
        flush();
        current = null;
      }
    }

    if (current) current.answer.push(line);
  }

  flush();
  return cards;
}

function countQuestionHeadings(markdown) {
  return normalizeMarkdown(markdown)
    .split("\n")
    .filter((line) => /^#{2,6}\s+.+\?\s*$/.test(line.trim()))
    .length;
}

function parseCards(markdown) {
  const source = removeEmptyHeadingGroups(stripReaderMetadata(markdown));
  const cards = [
    ...parseDetailsCards(source),
    ...parseBlockquoteCards(source),
    ...parseQACards(source),
    ...parseHeadingCards(source)
  ];

  return cards.map((card, index) => ({
    id: `${index}-${card.question.slice(0, 32)}`,
    question: card.question,
    answer: card.answer
  }));
}

function syncResults() {
  state.results = {
    known: state.masterCards.filter((card) => state.statusById[card.id] === "known"),
    review: state.masterCards.filter((card) => state.statusById[card.id] === "review")
  };
  state.known = state.results.known.length;
  state.review = state.results.review.length;
}

function resetResults() {
  state.statusById = {};
  state.previewCard = null;
  state.results = {
    known: [],
    review: []
  };
  state.known = 0;
  state.review = 0;
}

function renderBrickList(container, cards, group) {
  container.innerHTML = "";
  cards.forEach((card, index) => {
    const item = document.createElement("button");
    item.className = "brick";
    item.type = "button";
    item.title = "Preview this card";
    item.dataset.group = group;
    item.dataset.index = String(index);
    item.textContent = `${index + 1}. ${card.question}`;
    container.appendChild(item);
  });
}

async function previewCard(card) {
  if (!card) return;
  state.previewCard = card;
  state.flipped = false;
  el.card.classList.remove("is-flipped", "swipe-left", "swipe-right");
  el.card.style.transform = "";
  await renderMarkdown(el.questionView, card.question);
  await renderMarkdown(el.answerView, card.answer);
  setStatus("Previewing saved card. Use Replay to study that pile again.");
  updateMeta();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function encodeAttribute(value) {
  return escapeHtml(encodeURIComponent(value));
}

function preprocessLineDelimitedMath(markdown) {
  const lines = normalizeMarkdown(markdown).split("\n");
  const output = [];
  let delimiter = "";
  let buffer = [];
  let inFence = false;

  const flushMath = () => {
    output.push(`<div class="math-display" data-tex="${encodeAttribute(buffer.join("\n").trim())}"></div>`);
    delimiter = "";
    buffer = [];
  };

  const startsWithDelimiter = (line) => {
    if (/^\s*\$\$/.test(line)) return "$$";
    if (/^\s*\$(?!\$)/.test(line)) return "$";
    return "";
  };

  const endsWithDelimiter = (line, value) => {
    const rightTrimmed = line.trimEnd();
    if (!rightTrimmed.endsWith(value)) return false;
    if (value === "$" && rightTrimmed.endsWith("$$")) return false;
    return rightTrimmed.at(-value.length - 1) !== "\\";
  };

  const removeOpeningDelimiter = (line, value) => line.replace(value === "$$" ? /^\s*\$\$/ : /^\s*\$(?!\$)/, "");
  const removeClosingDelimiter = (line, value) => line.trimEnd().slice(0, -value.length);

  for (const line of lines) {
    const trimmed = line.trim();
    const isDelimiter = trimmed === "$$" || trimmed === "$";
    const isFence = /^\s*```/.test(line);

    if (delimiter) {
      if (trimmed === delimiter) {
        flushMath();
      } else if (endsWithDelimiter(line, delimiter)) {
        buffer.push(removeClosingDelimiter(line, delimiter));
        flushMath();
      } else {
        buffer.push(line);
      }
      continue;
    }

    if (isFence) {
      inFence = !inFence;
      output.push(line);
      continue;
    }

    if (inFence) {
      output.push(line);
      continue;
    }

    if (isDelimiter) {
      delimiter = trimmed;
      buffer = [];
      continue;
    }

    const openingDelimiter = startsWithDelimiter(line);
    if (openingDelimiter && !endsWithDelimiter(line, openingDelimiter)) {
      delimiter = openingDelimiter;
      buffer = [removeOpeningDelimiter(line, openingDelimiter)];
      continue;
    }

    output.push(line);
  }

  if (delimiter) {
    output.push(delimiter, ...buffer);
  }

  return output.join("\n");
}

function preprocessSpecialBlocks(markdown) {
  return preprocessLineDelimitedMath(markdown)
    .replace(/```[ \t]*mermaid[^\n]*\n([\s\S]*?)```/gi, (_, diagram) => {
      return `<div class="mermaid" data-diagram="${encodeAttribute(diagram.trim())}"></div>`;
    })
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
      return `<div class="math-display" data-tex="${encodeAttribute(tex.trim())}"></div>`;
    });
}

async function renderMarkdown(container, markdown) {
  const prepared = preprocessSpecialBlocks(markdown || "");
  const html = marked.parse(prepared);
  container.innerHTML = DOMPurify.sanitize(html, {
    ADD_TAGS: ["foreignObject"],
    ADD_ATTR: ["target", "rel", "class", "data-tex", "data-diagram"]
  });

  container.querySelectorAll("a[href]").forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  container.querySelectorAll(".math-display[data-tex]").forEach((node) => {
    try {
      katex.render(decodeURIComponent(node.dataset.tex), node, {
        displayMode: true,
        throwOnError: false
      });
    } catch (error) {
      node.textContent = decodeURIComponent(node.dataset.tex);
    }
  });

  renderMathInElement(container, {
    delimiters: [
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
      { left: "$", right: "$", display: false }
    ],
    throwOnError: false
  });

  const diagrams = container.querySelectorAll(".mermaid");
  diagrams.forEach((node) => {
    if (node.dataset.diagram) {
      node.textContent = decodeURIComponent(node.dataset.diagram);
    }
    node.removeAttribute("data-processed");
  });
  if (diagrams.length) {
    try {
      await mermaid.run({ nodes: diagrams });
      diagrams.forEach(addDiagramZoomControl);
    } catch (error) {
      console.warn("Mermaid render failed", error);
    }
  }
}

function addDiagramZoomControl(node) {
  if (node.closest("#printRoot")) return;
  if (node.parentElement?.classList.contains("diagram-shell")) return;

  const shell = document.createElement("div");
  shell.className = "diagram-shell";
  const button = document.createElement("button");
  button.className = "diagram-zoom";
  button.type = "button";
  button.textContent = "Zoom";
  button.addEventListener("click", () => openDiagramModal(node));

  node.parentNode.insertBefore(shell, node);
  shell.appendChild(node);
  shell.appendChild(button);
}

function openDiagramModal(node) {
  el.diagramModalBody.innerHTML = node.innerHTML;
  el.diagramModal.hidden = false;
}

function closeDiagramModal() {
  el.diagramModal.hidden = true;
  el.diagramModalBody.innerHTML = "";
}

function updateMeta() {
  const total = state.cards.length;
  const finished = Math.min(state.current, total);
  syncResults();
  el.deckTitle.textContent = state.deckTitle;
  el.deckTitle.title = state.deckTitle;
  el.deckTitle.hidden = !state.deckTitle;
  el.cardCount.textContent = `${total} ${total === 1 ? "card" : "cards"}`;
  el.positionText.textContent = state.previewCard ? "Preview" : total ? `Card ${Math.min(state.current + 1, total)} of ${total}` : "Card 0 of 0";
  el.scoreText.textContent = `Known ${state.known} / Review ${state.review}`;
  el.knownStackCount.textContent = state.known;
  el.reviewStackCount.textContent = state.review;
  renderBrickList(el.knownBrickList, state.results.known, "known");
  renderBrickList(el.reviewBrickList, state.results.review, "review");
  el.progressBar.style.width = total ? `${(finished / total) * 100}%` : "0";

  const disabled = !state.previewCard && (total === 0 || state.current >= total);
  el.flipBtn.disabled = disabled;
  el.knownBtn.disabled = disabled;
  el.reviewBtn.disabled = disabled;
  el.shuffleBtn.disabled = total < 2;
  el.resetBtn.disabled = total === 0;
  el.exportBtn.disabled = state.masterCards.length === 0 && state.results.known.length === 0 && state.results.review.length === 0;
  el.replayKnownBtn.disabled = state.results.known.length === 0;
  el.replayReviewBtn.disabled = state.results.review.length === 0;
  el.replayAllBtn.disabled = state.masterCards.length === 0;
  el.clearProgressBtn.disabled = state.results.known.length === 0 && state.results.review.length === 0;
}

async function showCard() {
  state.previewCard = null;
  state.flipped = false;
  el.card.classList.remove("is-flipped", "swipe-left", "swipe-right");
  el.card.style.transform = "";

  const card = state.cards[state.current];
  if (!card) {
    await renderMarkdown(el.questionView, state.cards.length ? "Finished. Restart or shuffle to quiz again." : "Import a deck to begin.");
    await renderMarkdown(el.answerView, "");
    updateMeta();
    return;
  }

  await renderMarkdown(el.questionView, card.question);
  await renderMarkdown(el.answerView, card.answer);
  updateMeta();
}

function buildCards(titleHint = "") {
  const source = stripReaderMetadata(el.sourceInput.value);
  const cards = parseCards(source);
  const headingCount = countQuestionHeadings(source);
  state.cards = cards;
  state.masterCards = cards.slice();
  state.current = 0;
  state.deckTitle = cards.length ? inferDeckTitle(source, titleHint) : "";
  resetResults();

  if (cards.length) {
    setStatus(`Built ${cards.length} card${cards.length === 1 ? "" : "s"}.`);
    closeImportPanel();
  } else {
    const message = headingCount
      ? `Found ${headingCount} question heading${headingCount === 1 ? "" : "s"}, but no answer text. This Notion page is exposing collapsed toggle titles only; export Markdown or paste expanded toggle content.`
      : "No cards found. Use > toggle blocks with an answer under the first line.";
    setStatus(message, "error");
  }

  showCard();
}

function flipCard() {
  if (!state.previewCard && !state.cards[state.current]) return;
  state.flipped = !state.flipped;
  el.card.classList.toggle("is-flipped", state.flipped);
}

function moveCard(result) {
  const card = state.previewCard || state.cards[state.current];
  if (!card) return;
  state.statusById[card.id] = result;
  syncResults();

  if (state.previewCard) {
    state.previewCard = null;
    setStatus(`Moved card to ${result}.`);
    showCard();
    return;
  }

  el.card.classList.add(result === "known" ? "swipe-right" : "swipe-left");
  window.setTimeout(() => {
    state.current += 1;
    showCard();
  }, 180);
}

function shuffleCards() {
  for (let index = state.cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [state.cards[index], state.cards[swap]] = [state.cards[swap], state.cards[index]];
  }
  state.current = 0;
  setStatus("Deck shuffled.");
  showCard();
}

function resetQuiz() {
  state.cards = state.masterCards.slice();
  state.current = 0;
  state.previewCard = null;
  setStatus("Studying all cards.");
  showCard();
}

function replayDeck(scope) {
  syncResults();
  const selected = scope === "known"
    ? state.results.known.slice()
    : scope === "review"
      ? state.results.review.slice()
      : state.masterCards.slice();

  if (!selected.length) {
    setStatus(`No ${scope} cards to replay.`, "error");
    return;
  }

  state.cards = selected;
  state.current = 0;
  state.previewCard = null;
  setStatus(scope === "all" ? "Studying all cards." : `Studying ${scope} cards.`);
  showCard();
}

function clearProgress() {
  resetResults();
  state.cards = state.masterCards.slice();
  state.current = 0;
  setStatus("Cleared known and review marks.");
  showCard();
}

function formatCardList(title, cards) {
  const body = cards.length
    ? cards.map((card, index) => `### ${index + 1}. ${card.question}\n\n${card.answer}`).join("\n\n")
    : "_None_";
  return `## ${title}\n\n${body}`;
}

function cardsForScope(scope) {
  syncResults();
  if (scope === "known") return state.results.known;
  if (scope === "review") return state.results.review;
  return state.masterCards.length ? state.masterCards : state.cards;
}

function exportMarkdown(scope = "all") {
  const cards = cardsForScope(scope);
  const title = scope === "known" ? "Known" : scope === "review" ? "Review" : "All Cards";
  const unplayed = state.masterCards.filter((card) => !state.statusById[card.id]);
  const output = [
    "# Flashcard Export",
    "",
    `Exported: ${new Date().toISOString()}`,
    "",
    formatCardList(title, cards),
    scope === "all" ? "" : null,
    scope === "all" ? formatCardList("Known", state.results.known) : null,
    scope === "all" ? "" : null,
    scope === "all" ? formatCardList("Review", state.results.review) : null,
    scope === "all" ? "" : null,
    scope === "all" ? formatCardList("Unplayed", unplayed) : null
  ].filter((line) => line !== null).join("\n");

  const blob = new Blob([output], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `flashcards-${scope}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus(`Exported ${title.toLowerCase()} as Markdown.`);
}

async function renderForExport(markdown) {
  const container = document.createElement("div");
  container.className = "rendered";
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.width = "720px";
  document.body.appendChild(container);
  await renderMarkdown(container, markdown);
  const html = container.innerHTML;
  container.remove();
  return html;
}

function contentFits(node) {
  return node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1;
}

function fitPrintNode(node) {
  node.style.transform = "";
  node.style.width = "";

  let low = 4;
  let high = 88;
  let best = low;

  for (let index = 0; index < 18; index += 1) {
    const mid = (low + high) / 2;
    node.style.fontSize = `${mid}px`;
    if (contentFits(node)) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  node.style.fontSize = `${Math.max(4, best - 0.5)}px`;

  if (!contentFits(node)) {
    const xScale = node.clientWidth / Math.max(node.scrollWidth, 1);
    const yScale = node.clientHeight / Math.max(node.scrollHeight, 1);
    const scale = Math.max(0.35, Math.min(xScale, yScale, 1) - 0.02);
    node.style.width = `${100 / scale}%`;
    node.style.transform = `scale(${scale})`;
  }
}

function fitPrintPages() {
  el.printRoot.querySelectorAll(".fit-content").forEach(fitPrintNode);
}

async function exportPdf(scope = "all") {
  const cards = cardsForScope(scope);
  const title = scope === "known" ? "Known Cards" : scope === "review" ? "Review Cards" : "All Cards";
  if (!cards.length) {
    setStatus(`No ${scope === "review" ? "review" : scope} cards to export.`, "error");
    return;
  }

  setStatus(`Preparing ${title.toLowerCase()} PDF...`);

  const pages = [];
  for (const [index, card] of cards.entries()) {
    const question = await renderForExport(card.question);
    const answer = await renderForExport(card.answer);
    pages.push(`
      <section class="print-page">
        <div class="page-kicker">Question ${index + 1}</div>
        <div class="fit-content">${question}</div>
      </section>
      <section class="print-page">
        <div class="page-kicker">Answer ${index + 1}</div>
        <div class="fit-content">${answer}</div>
      </section>
    `);
  }

  el.printRoot.innerHTML = `
    <h1 class="print-title">${escapeHtml(title)}</h1>
    ${pages.join("\n")}
  `;
  el.printRoot.classList.add("is-preparing");

  window.setTimeout(() => {
    fitPrintPages();
    window.setTimeout(() => {
      fitPrintPages();
      el.printRoot.classList.remove("is-preparing");
      window.print();
      setStatus(`Opened ${title.toLowerCase()} print dialog.`);
    }, 200);
  }, 0);
}

function handleExportAction(format, scope) {
  el.exportMenu.hidden = true;
  if (format === "pdf") {
    exportPdf(scope);
    return;
  }
  exportMarkdown(scope);
}

function exportResults() {
  exportMarkdown("all");
}

async function fetchText(url) {
  const direct = await fetch(url, { mode: "cors" });
  if (!direct.ok) throw new Error(`HTTP ${direct.status}`);
  return direct.text();
}

function cleanImportUrl(rawUrl) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);

    if (parsed.hostname === "r.jina.ai") {
      return decodeURIComponent(`${parsed.pathname}${parsed.search}`.replace(/^\/+/, ""));
    }

    if (parsed.hostname.endsWith("notion.site") || parsed.hostname.endsWith("notion.so")) {
      parsed.searchParams.delete("source");
      parsed.searchParams.delete("pvs");
    }

    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function readerUrlFor(url) {
  return `https://r.jina.ai/${url}`;
}

async function fetchUrl() {
  const url = cleanImportUrl(el.urlInput.value);
  if (!url) {
    setStatus("Enter a URL first.", "error");
    return;
  }

  el.fetchBtn.disabled = true;
  setStatus("Fetching source...");

  try {
    let text;
    const isNotionUrl = /\/\/[^/]*(notion\.site|notion\.so)\//i.test(url);

    try {
      if (isNotionUrl) throw new Error("Use Reader for Notion pages");
      text = await fetchText(url);
    } catch {
      text = await fetchText(readerUrlFor(url));
    }

    el.sourceInput.value = text;
    const source = stripReaderMetadata(text);
    const cards = parseCards(source);

    if (!cards.length && countQuestionHeadings(source)) {
      state.cards = [];
      state.masterCards = [];
      state.statusById = {};
      state.previewCard = null;
      state.deckTitle = "";
      state.current = 0;
      resetResults();
      setStatus("This public Notion URL only exposes collapsed question headings, not answers. Use Export -> Markdown & CSV, then upload the zip or paste the exported Markdown.", "error");
      showCard();
      return;
    }

    setStatus("Fetched source. Building cards...");
    buildCards(url);
  } catch (error) {
    setStatus("Could not fetch this URL. If it is private Notion content, export Markdown or paste the page content.", "error");
  } finally {
    el.fetchBtn.disabled = false;
  }
}

function normalizedArchiveName(name) {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function isMarkdownName(name) {
  return /\.(md|markdown|mdown|mkdn|txt)$/i.test(normalizedArchiveName(name).split("?")[0]);
}

function isZipName(name) {
  return /\.zip$/i.test(normalizedArchiveName(name).split("?")[0]);
}

async function collectMarkdownFromZip(input, prefix = "", depth = 0) {
  if (depth > 4) return [];

  const zip = await JSZip.loadAsync(input);
  const entries = Object.values(zip.files).sort((a, b) => a.name.localeCompare(b.name));
  const found = [];

  for (const entry of entries) {
    if (entry.dir) continue;

    const path = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (isMarkdownName(entry.name)) {
      found.push({
        name: path,
        text: await entry.async("text")
      });
      continue;
    }

    if (isZipName(entry.name)) {
      try {
        const nested = await entry.async("arraybuffer");
        found.push(...await collectMarkdownFromZip(nested, path, depth + 1));
      } catch (error) {
        console.warn("Nested zip could not be read", path, error);
      }
    }
  }

  return found;
}

async function loadZipFile(file) {
  if (!window.JSZip) {
    setStatus("Zip support did not load. Extract the zip and upload the .md file.", "error");
    return;
  }

  try {
    setStatus("Reading zip export...");
    const markdownFiles = await collectMarkdownFromZip(file);

    if (!markdownFiles.length) {
      setStatus("No Markdown file found in this zip export, including nested zip files.", "error");
      return;
    }

    const markdown = markdownFiles
      .map((entry) => `<!-- Source: ${entry.name} -->\n\n${entry.text}`)
      .join("\n\n---\n\n");
    el.sourceInput.value = markdown;
    setStatus(`Loaded ${markdownFiles.length} Markdown file${markdownFiles.length === 1 ? "" : "s"} from ${file.name}.`);
    buildCards(markdownFiles.length === 1 ? markdownFiles[0].name : file.name);
  } catch (error) {
    setStatus("Could not read this zip export.", "error");
  }
}

function loadFile(file) {
  if (!file) return;

  if (isZipName(file.name) || /zip/i.test(file.type)) {
    loadZipFile(file);
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    el.sourceInput.value = String(reader.result || "");
    setStatus(`Loaded ${file.name}.`);
    buildCards(file.name);
  });
  reader.addEventListener("error", () => setStatus("Could not read the selected file.", "error"));
  reader.readAsText(file);
}

function loadSample() {
  el.sourceInput.value = sampleMarkdown;
  setStatus("Sample loaded.");
  buildCards("Sample flashcards");
}

function handlePointerDown(event) {
  state.dragging = false;
  state.dragStartX = event.clientX;
  state.dragCurrentX = event.clientX;
}

function handlePointerMove(event) {
  state.dragCurrentX = event.clientX;
}

function handlePointerUp(event) {
  state.dragging = false;
  el.card.style.transform = "";
}

el.parseBtn.addEventListener("click", () => buildCards());
el.sampleBtn.addEventListener("click", loadSample);
el.fetchBtn.addEventListener("click", fetchUrl);
el.importBtn.addEventListener("click", openImportPanel);
el.closeImportBtn.addEventListener("click", closeImportPanel);
el.exportBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  el.exportMenu.hidden = !el.exportMenu.hidden;
});
el.exportMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-export]");
  if (!button) return;
  handleExportAction(button.dataset.export, button.dataset.scope);
});
el.themeBtn.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
el.fileInput.addEventListener("change", (event) => loadFile(event.target.files[0]));
el.flipBtn.addEventListener("click", flipCard);
el.knownBtn.addEventListener("click", () => moveCard("known"));
el.reviewBtn.addEventListener("click", () => moveCard("review"));
el.knownBrickList.addEventListener("click", (event) => {
  const item = event.target.closest(".brick");
  if (!item) return;
  previewCard(state.results.known[Number(item.dataset.index)]);
});
el.reviewBrickList.addEventListener("click", (event) => {
  const item = event.target.closest(".brick");
  if (!item) return;
  previewCard(state.results.review[Number(item.dataset.index)]);
});
el.replayReviewBtn.addEventListener("click", () => replayDeck("review"));
el.replayKnownBtn.addEventListener("click", () => replayDeck("known"));
el.replayAllBtn.addEventListener("click", () => replayDeck("all"));
el.clearProgressBtn.addEventListener("click", clearProgress);
el.shuffleBtn.addEventListener("click", shuffleCards);
el.resetBtn.addEventListener("click", resetQuiz);
el.card.addEventListener("click", (event) => {
  if (Math.abs(state.dragCurrentX - state.dragStartX) < 8 && event.target.closest("a") === null) flipCard();
});
el.card.addEventListener("pointerdown", handlePointerDown);
el.card.addEventListener("pointermove", handlePointerMove);
el.card.addEventListener("pointerup", handlePointerUp);
el.card.addEventListener("pointercancel", handlePointerUp);

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea")) return;
  if (event.key === "Escape") {
    el.exportMenu.hidden = true;
    closeDiagramModal();
    closeImportPanel();
  }
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    flipCard();
  }
  if (event.key === "ArrowRight") moveCard("known");
  if (event.key === "ArrowLeft") moveCard("review");
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".menu-wrap")) {
    el.exportMenu.hidden = true;
  }
});

el.closeDiagramBtn.addEventListener("click", closeDiagramModal);
el.diagramModal.addEventListener("click", (event) => {
  if (event.target === el.diagramModal) closeDiagramModal();
});

window.addEventListener("afterprint", () => {
  el.printRoot.classList.remove("is-preparing");
  el.printRoot.innerHTML = "";
});

setTheme(localStorage.getItem("swipe-notes-theme") || "dark");
setStatus("");
showCard();
