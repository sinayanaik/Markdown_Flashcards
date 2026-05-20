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
  deckId: null,
  cards: [],
  masterCards: [],
  statusById: {},
  previewCard: null,
  deckTitle: "",
  sourceTitle: "",
  importTitleHint: "",
  results: {
    known: [],
    review: []
  },
  current: 0,
  known: 0,
  review: 0,
  flipped: false,
  dragStartX: 0,
  dragStartY: 0,
  dragCurrentX: 0,
  dragCurrentY: 0,
  dragPointerId: null,
  dragPointerType: "",
  dragCaptured: false,
  dragStartTime: 0,
  dragLastX: 0,
  dragLastY: 0,
  dragLastTime: 0,
  dragging: false,
  dragMoved: false,
  suppressClickUntil: 0,
  transitionToken: 0
};

const deckStorageKey = "swipe-notes-current-deck-v1";


// Supabase Integration
const supabaseUrl = "https://jxihukiaeqpkyatfdoso.supabase.co";
const supabaseKey = "sb_publishable_DWc8wA59N2av1QpAfYqqpw_v4k5q7aY";
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;




async function fetchWebDecks() {
  if (!supabaseClient) return;
  try {
    setStatus("Fetching web decks...");
    const { data, error } = await supabaseClient
      .from("decks")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
      
    if (error) throw error;
    
    const tbody = document.getElementById("webDecksListTable");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (!data || data.length === 0) {
      tbody.innerHTML = "<tr><td colspan=\"3\" style=\"text-align: center; padding: 1rem; color: var(--text-secondary);\">No web decks found.</td></tr>";
      setStatus("Web decks loaded.");
      return;
    }
    
    data.forEach(deck => {
      const date = new Date(deck.updated_at).toLocaleString();
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--border-color, #333)";

      const tdTitle = document.createElement("td");
      tdTitle.style.padding = "0.5rem";
      const titleWrap = document.createElement("div");
      titleWrap.className = "web-deck-title";

      const titleText = document.createElement("span");
      titleText.textContent = deck.title || "Untitled";

      const renameBtn = document.createElement("button");
      renameBtn.className = "web-deck-rename";
      renameBtn.type = "button";
      renameBtn.title = "Rename web deck";
      renameBtn.setAttribute("aria-label", `Rename ${deck.title || "Untitled"}`);
      renameBtn.innerHTML = "&#9998;";
      renameBtn.onclick = () => renameWebDeck(deck.id, deck.title || "Untitled");

      titleWrap.appendChild(titleText);
      titleWrap.appendChild(renameBtn);
      tdTitle.appendChild(titleWrap);

      const tdDate = document.createElement("td");
      tdDate.style.padding = "0.5rem";
      tdDate.textContent = date;
      
      const tdActions = document.createElement("td");
      tdActions.style.padding = "0.5rem";
      tdActions.style.textAlign = "right";
      
      const loadBtn = document.createElement("button");
      loadBtn.className = "button is-small";
      loadBtn.textContent = "Load";
      loadBtn.style.marginRight = "0.25rem";
      loadBtn.onclick = () => loadWebDeck(deck.id);
      
      const delBtn = document.createElement("button");
      delBtn.className = "button is-small";
      delBtn.textContent = "Delete";
      delBtn.style.background = "#e04f5f";
      delBtn.style.color = "white";
      delBtn.style.border = "none";
      delBtn.onclick = () => deleteWebDeck(deck.id);
      
      tdActions.appendChild(loadBtn);
      tdActions.appendChild(delBtn);
      
      tr.appendChild(tdTitle);
      tr.appendChild(tdDate);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
    setStatus("Web decks updated.");
  } catch (error) {
    console.error("Failed to fetch web decks", error);
    setStatus("Failed to fetch web decks.", "error");
  }
}

async function updateWebDeckTitle(deckId, title) {
  if (!deckId || !supabaseClient) return false;

  const { error } = await supabaseClient
    .from("decks")
    .update({
      title,
      updated_at: new Date().toISOString()
    })
    .eq("id", deckId);

  if (error) throw error;
  return true;
}

async function renameWebDeck(deckId, currentTitle = "") {
  if (!deckId || !supabaseClient) return;

  const nextTitle = prompt("Rename web deck", currentTitle || "Untitled");
  if (nextTitle === null) return;

  const title = nextTitle.trim();
  if (!title) {
    setStatus("Deck title cannot be empty.", "error");
    return;
  }

  try {
    setStatus("Renaming web deck...");
    await updateWebDeckTitle(deckId, title);

    if (state.deckId === deckId) {
      state.deckTitle = title;
      state.sourceTitle = title;
      savePersistedDeck();
      updateMeta();
    }

    setStatus("Web deck renamed.");
    fetchWebDecks();
  } catch (error) {
    console.error("Failed to rename web deck", error);
    setStatus("Failed to rename web deck.", "error");
  }
}

async function deleteWebDeck(deckId) {
  if (!supabaseClient) return;
  if (!confirm("Are you sure you want to delete this deck from the web?")) return;
  
  try {
    setStatus("Deleting deck...");
    const { error } = await supabaseClient.from("decks").delete().eq("id", deckId);
    if (error) throw error;
    
    if (state.deckId === deckId) {
      state.deckId = null;
      savePersistedDeck();
    }
    
    setStatus("Deck deleted successfully.");
    fetchWebDecks();
  } catch (error) {
    console.error("Failed to delete web deck", error);
    setStatus("Failed to delete web deck.", "error");
  }
}

async function loadWebDeck(deckId) {
  if (!deckId || !supabaseClient) return;

  setStatus("Loading deck from web... (1/2) Fetching details");
  
  try {
    const { data: deckData, error: deckError } = await supabaseClient
      .from("decks")
      .select("*")
      .eq("id", deckId)
      .single();

    if (deckError) throw deckError;

    setStatus("Loading deck from web... (2/2) Fetching cards");
    const { data: cardsData, error: cardsError } = await supabaseClient
      .from("cards")
      .select("*")
      .eq("deck_id", deckId)
      .order("position", { ascending: true });

    if (cardsError) throw cardsError;

    const usedIds = new Set();
    const statusById = {};
    const cards = cardsData.map((rawCard, index) => {
      const id = String(rawCard.id || `${index}-${rawCard.question.slice(0, 32)}`);
      if (rawCard.status) statusById[id] = rawCard.status;
      return { id, question: rawCard.question, answer: rawCard.answer };
    });

    state.deckId = deckData.id;
    state.cards = cards.slice();
    state.masterCards = cards.slice();
    state.statusById = statusById;
    state.current = Math.min(Math.max(Number(deckData.current_card_index) || 0, 0), cards.length);
    state.previewCard = null;
    state.flipped = false;
    state.deckTitle = deckData.title || "";
    state.sourceTitle = deckData.title || "";
    state.importTitleHint = deckData.title || "";
    
    syncResults();
    closeAllCardsPanel();
    savePersistedDeck();
    setStatus(`Loaded ${cards.length} cards from web successfully.`);
    document.getElementById("webDecksPanel").hidden = true;
    closeImportPanel();
    showCard();
  } catch (error) {
    setStatus("Failed to load deck from web.", "error");
    console.error(error);
  }
}

function showSyncModal() {
  const modal = document.getElementById("syncModal");
  const content = document.getElementById("syncDetailsContent");
  
  if (!state.masterCards.length) {
    setStatus("No deck to sync.", "error");
    return;
  }
  
  const deckTitle = state.deckTitle || state.sourceTitle || "Untitled Deck";
  const cardsCount = state.masterCards.length;
  const knownCount = state.results.known.length;
  const reviewCount = state.results.review.length;
  
  const isUpdate = !!state.deckId;
  const actionText = isUpdate ? "Update existing web deck" : "Create new web deck";
  
  content.innerHTML = `
    <p><strong>Action:</strong> ${actionText}</p>
    <p><strong>Title:</strong> ${escapeHtml(deckTitle)}</p>
    <p><strong>Cards:</strong> ${cardsCount} total (${knownCount} known, ${reviewCount} review)</p>
    <p><strong>Current Position:</strong> Card ${state.current + 1}</p>
    <br>
    <p style="color: var(--text-secondary);">This will overwrite the web version with your local progress.</p>
  `;
  
  modal.hidden = false;
}

async function syncDeckToWeb() {
  if (!supabaseClient) return;
  document.getElementById("syncModal").hidden = true;
  
  if (!state.masterCards.length) {
    setStatus("No deck to sync.", "error");
    return;
  }

  const syncBtn = document.getElementById("syncBtn");
  if (syncBtn) syncBtn.disabled = true;

  try {
    if (!state.deckId) {
      state.deckId = slugifyFileName(state.deckTitle || state.sourceTitle) || ("deck-" + Date.now());
    }

    setStatus(`Syncing... (1/2) Saving deck info "${state.deckTitle}"`);
    
    const deckData = {
      id: state.deckId,
      title: state.deckTitle || "Untitled Deck",
      current_card_index: state.current,
      updated_at: new Date().toISOString()
    };

    const { error: deckError } = await supabaseClient
      .from("decks")
      .upsert(deckData);

    if (deckError) throw deckError;

    setStatus(`Syncing... (2/2) Saving ${state.masterCards.length} cards`);
    const cardsData = state.masterCards.map((card, index) => ({
      id: card.id,
      deck_id: state.deckId,
      question: card.question,
      answer: card.answer,
      position: index,
      status: normalizeCardStatus(state.statusById[card.id]),
      updated_at: new Date().toISOString()
    }));

    const { error: cardsError } = await supabaseClient
      .from("cards")
      .upsert(cardsData);

    if (cardsError) throw cardsError;

    setStatus("Deck synced to web successfully.");
    savePersistedDeck();
  } catch (error) {
    setStatus("Failed to sync deck to web.", "error");
    console.error(error);
  } finally {
    if (syncBtn) syncBtn.disabled = false;
  }
}





const swipeConfig = {
  intentDistance: 12,
  intentRatio: 1.12,
  commitRatio: 1.18,
  minCommitDistance: 66,
  maxCommitDistance: 142,
  widthCommitRatio: 0.18,
  flickDistance: 34,
  flickVelocity: 0.42,
  resistance: 0.74,
  maxPreviewOffset: 128
};

let allCardsRenderId = 0;
let printTitleBeforeExport = "";

const el = {
  sourceInput: document.querySelector("#sourceInput"),
  urlInput: document.querySelector("#urlInput"),
  fileInput: document.querySelector("#fileInput"),
  fetchBtn: document.querySelector("#fetchBtn"),
  parseBtn: document.querySelector("#parseBtn"),
  openWebDecksFromImportBtn: document.querySelector("#openWebDecksFromImportBtn"),
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
  allCardsBtn: document.querySelector("#allCardsBtn"),
  allCardsPanel: document.querySelector("#allCardsPanel"),
  allCardsList: document.querySelector("#allCardsList"),
  allCardsSummary: document.querySelector("#allCardsSummary"),
  closeAllCardsBtn: document.querySelector("#closeAllCardsBtn"),
  themeBtn: document.querySelector("#themeBtn"),
  deckTitleWrap: document.querySelector("#deckTitleWrap"),
  deckTitle: document.querySelector("#deckTitle"),
  editDeckTitleBtn: document.querySelector("#editDeckTitleBtn"),
  shuffleBtn: document.querySelector("#shuffleBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  card: document.querySelector("#card"),
  questionView: document.querySelector("#questionView"),
  answerView: document.querySelector("#answerView"),
  knownStackCount: document.querySelector("#knownStackCount"),
  reviewStackCount: document.querySelector("#reviewStackCount"),
  knownBrickList: document.querySelector("#knownBrickList"),
  reviewBrickList: document.querySelector("#reviewBrickList"),
  positionText: document.querySelector("#positionText"),
  scoreText: document.querySelector("#scoreText"),
  progressBar: document.querySelector("#progressBar"),
  statusText: document.querySelector("#statusText"),
  prevCardBtn: document.querySelector("#prevCardBtn"),
  nextCardBtn: document.querySelector("#nextCardBtn"),
  knownBtn: document.querySelector("#knownBtn"),
  reviewBtn: document.querySelector("#reviewBtn"),
  replayReviewBtn: document.querySelector("#replayReviewBtn"),
  replayKnownBtn: document.querySelector("#replayKnownBtn"),
  replayAllBtn: document.querySelector("#replayAllBtn"),
};

marked.setOptions({
  breaks: true,
  gfm: true,
  mangle: false,
  headerIds: false
});

const codeLanguageAliases = {
  cjs: "javascript",
  coffee: "coffeescript",
  "c++": "cpp",
  "c#": "csharp",
  "f#": "fsharp",
  html: "markup",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  md: "markdown",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  tex: "latex",
  ts: "typescript",
  tsx: "typescript",
  yml: "yaml"
};

if (window.Prism?.plugins?.autoloader) {
  Prism.plugins.autoloader.languages_path = "https://cdn.jsdelivr.net/npm/prismjs@1.30.0/components/";
}

let prismPythonConfigured = false;

function configurePrismLanguages() {
  if (prismPythonConfigured || !window.Prism?.languages?.python) return;

  Prism.languages.insertBefore("python", "function", {
    method: {
      pattern: /(\.)[A-Za-z_]\w*(?=\s*\()/,
      lookbehind: true
    },
    "uppercase-constant": /\b[A-Z][A-Z0-9_]*\b/
  });

  prismPythonConfigured = true;
}

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

function setDeckTitle(title, options = {}) {
  const normalized = String(title || "").trim();
  state.deckTitle = normalized;
  if (options.updateSourceTitle || !state.sourceTitle) {
    state.sourceTitle = normalized;
  }
  if (options.save !== false) savePersistedDeck();
  updateMeta();
}

async function editCurrentDeckTitle() {
  if (!state.masterCards.length) {
    setStatus("Import a deck before editing its title.", "error");
    return;
  }

  const nextTitle = prompt("Edit deck title", state.deckTitle || state.sourceTitle || "Untitled Deck");
  if (nextTitle === null) return;

  const title = nextTitle.trim();
  if (!title) {
    setStatus("Deck title cannot be empty.", "error");
    return;
  }

  setDeckTitle(title, { updateSourceTitle: true });
  if (!state.deckId || !supabaseClient) {
    setStatus("Deck title updated.");
    return;
  }

  try {
    setStatus("Updating web deck title...");
    await updateWebDeckTitle(state.deckId, title);
    if (!document.getElementById("webDecksPanel")?.hidden) await fetchWebDecks();
    setStatus("Deck title updated in the cloud.");
  } catch (error) {
    console.error("Failed to update web deck title", error);
    setStatus("Deck title updated locally, but cloud rename failed.", "error");
  }
}

function openImportPanel() {
  el.importPanel.classList.add("is-open");
}

function openWebDecksPanel() {
  const panel = document.getElementById("webDecksPanel");
  if (!panel) return;

  panel.hidden = false;
  fetchWebDecks();
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

function sourceFileTitle(value) {
  const cleaned = normalizeMarkdown(String(value || ""))
    .split(/[?#]/)[0]
    .split("/")
    .filter(Boolean)
    .pop() || "";
  const decoded = (() => {
    try {
      return decodeURIComponent(cleaned);
    } catch {
      return cleaned;
    }
  })();
  return decoded
    .replace(/\.(md|markdown|mdown|mkdn|txt|json|zip)$/i, "")
    .replace(/[-_\s]+[a-f0-9]{32}$/i, "")
    .replace(/[-_\s]+[a-f0-9]{8,}$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromImportHint(titleHint = "") {
  return sourceFileTitle(titleHint) || humanizeSourceTitle(titleHint);
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

function hasStructuredSectionLabels(lines) {
  const studyLabelPattern = /^\*\*\s*(?:original(?:\s+sanskrit)?|(?:english\s+)?transliteration|(?:complete\s+)?translation|word(?:-by-word|\s+meanings?)?(?:\s+breakdown)?|(?:philosophical\s+)?meaning|memorization\s+tip|explanation|example|summary|notes)\s*:\*\*\s*$/i;
  const labels = lines.filter((line) => studyLabelPattern.test(line.trim()));
  return labels.length >= 2;
}

function hasMeaningfulContent(lines) {
  return lines.some((line) => {
    const trimmed = line.trim();
    return trimmed
      && !/^-{3,}$/.test(trimmed)
      && !/^<alphaxiv-thinking-title\b/i.test(trimmed);
  });
}

function isStudySectionTitle(title) {
  return /^(?:what|how|why|when|where|which|who|can|does|do|is|are|explain|describe|summari[sz]e|summary|compare|contrast)\b/i.test(title);
}

function parseHeadingCards(markdown, options = {}) {
  const lines = normalizeMarkdown(markdown).split("\n");
  const cards = [];
  let current = null;
  const includeStudySections = options.includeStudySections === true;

  const flush = () => {
    if (!current) return;
    const answer = cleanToggleContent(current.answer);
    const shouldKeep = current.isQuestion
      || (
        includeStudySections
        && !current.hasNestedHeading
        && hasMeaningfulContent(current.answer)
        && (isStudySectionTitle(current.question) || hasStructuredSectionLabels(current.answer))
      );

    if (current.question && answer && shouldKeep) {
      cards.push({
        question: current.question,
        answer
      });
    }
  };

  for (const line of lines) {
    const heading = line.match(/^(#{2,6})\s+(.+?)\s*#*\s*$/);

    if (heading) {
      const level = heading[1].length;
      const question = heading[2].trim();
      const isQuestionHeading = question.endsWith("?");

      if (isQuestionHeading || includeStudySections) {
        if (current && level > current.level) {
          if (current.isQuestion) {
            current.answer.push(line);
            continue;
          }

          current.hasNestedHeading = true;
          flush();
          current = null;
        }

        flush();
        current = {
          question,
          level,
          isQuestion: isQuestionHeading,
          hasNestedHeading: false,
          answer: []
        };
        continue;
      }

      if (current && level <= current.level) {
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
    ...parseHeadingCards(source, { includeStudySections: true })
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
  el.card.classList.remove("is-flipped", "swipe-left", "swipe-right", "is-dragging", "drag-review", "drag-known", "drag-prev", "drag-next");
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

function isEscaped(source, index) {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === "\\"; cursor -= 1) {
    slashes += 1;
  }
  return slashes % 2 === 1;
}

function isSingleDollarLine(source, index) {
  if (source[index] !== "$" || source[index - 1] === "$" || source[index + 1] === "$" || isEscaped(source, index)) {
    return false;
  }

  const lineStart = source.lastIndexOf("\n", index - 1) + 1;
  const lineEnd = source.indexOf("\n", index);
  const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd);
  return line.trim() === "$";
}

function findSingleDollarLine(source, start) {
  for (let index = source.indexOf("$", start); index !== -1; index = source.indexOf("$", index + 1)) {
    if (isSingleDollarLine(source, index)) return index;
  }
  return -1;
}

function findUnescaped(source, token, start) {
  for (let index = source.indexOf(token, start); index !== -1; index = source.indexOf(token, index + token.length)) {
    if (!isEscaped(source, index)) return index;
  }
  return -1;
}

function canOpenInlineDollar(source, index) {
  const next = source[index + 1];
  return next && next !== "$" && !/\s/.test(next) && !isEscaped(source, index);
}

function findInlineDollarClose(source, start) {
  for (let index = source.indexOf("$", start); index !== -1; index = source.indexOf("$", index + 1)) {
    const previous = source[index - 1];
    if (source[index + 1] !== "$" && previous && !/\s/.test(previous) && !isEscaped(source, index)) {
      return index;
    }
  }
  return -1;
}

function mathNode(tex, displayMode) {
  const tag = displayMode ? "div" : "span";
  const className = displayMode ? "math-display" : "math-inline";
  return `<${tag} class="${className}" data-tex="${encodeAttribute(tex.trim())}"></${tag}>`;
}

function normalizeDisplayMathIndentation(markdown) {
  return markdown
    .replace(/(^|\n)[ \t]{4,}\$\$[ \t]*\n([\s\S]*?)\n[ \t]{4,}\$\$[ \t]*(?=\n|$)/g, (match, prefix, tex) => {
      const normalizedTex = tex
        .split("\n")
        .map((line) => line.replace(/^[ \t]{4}/, ""))
        .join("\n");
      return `${prefix}$$\n${normalizedTex}\n$$`;
    })
    .replace(/(^|\n)[ \t]{4,}\$\$([^\n]+?)\$\$[ \t]*(?=\n|$)/g, "$1$$$$$2$$$$");
}

function protectMath(markdown) {
  let output = "";
  let index = 0;
  const source = normalizeDisplayMathIndentation(markdown);

  while (index < source.length) {
    if (source.startsWith("$$", index) && !isEscaped(source, index)) {
      const close = findUnescaped(source, "$$", index + 2);
      if (close !== -1) {
        output += mathNode(source.slice(index + 2, close), true);
        index = close + 2;
        continue;
      }
    }

    if (isSingleDollarLine(source, index)) {
      const openLineEnd = source.indexOf("\n", index);
      const contentStart = openLineEnd === -1 ? index + 1 : openLineEnd + 1;
      const close = findSingleDollarLine(source, contentStart);
      if (close !== -1) {
        const closeLineStart = source.lastIndexOf("\n", close - 1) + 1;
        output += mathNode(source.slice(contentStart, closeLineStart), true);
        const closeLineEnd = source.indexOf("\n", close);
        index = closeLineEnd === -1 ? close + 1 : closeLineEnd + 1;
        continue;
      }
    }

    if ((source.startsWith("\\[", index) || source.startsWith("\\(", index)) && !isEscaped(source, index)) {
      const displayMode = source[index + 1] === "[";
      const closeToken = displayMode ? "\\]" : "\\)";
      const close = findUnescaped(source, closeToken, index + 2);
      if (close !== -1) {
        output += mathNode(source.slice(index + 2, close), displayMode);
        index = close + 2;
        continue;
      }
    }

    if (source[index] === "$" && canOpenInlineDollar(source, index)) {
      const close = findInlineDollarClose(source, index + 1);
      if (close !== -1) {
        output += mathNode(source.slice(index + 1, close), false);
        index = close + 1;
        continue;
      }
    }

    output += source[index];
    index += 1;
  }

  return output;
}

function preprocessSpecialBlocks(markdown) {
  const source = normalizeMarkdown(markdown || "");
  const fencePattern = /```[ \t]*([^\n]*)\n([\s\S]*?)```/g;
  let output = "";
  let lastIndex = 0;
  let match;

  while ((match = fencePattern.exec(source))) {
    output += protectMath(source.slice(lastIndex, match.index));
    output += /\bmermaid\b/i.test(match[1])
      ? `<div class="mermaid" data-diagram="${encodeAttribute(match[2].trim())}"></div>`
      : match[0];
    lastIndex = fencePattern.lastIndex;
  }

  output += protectMath(source.slice(lastIndex));
  return output;
}

function markdownToSafeHtml(markdown) {
  const prepared = preprocessSpecialBlocks(markdown || "");
  const html = marked.parse(prepared);
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["foreignObject"],
    ADD_ATTR: ["target", "rel", "class", "data-tex", "data-diagram"]
  });
}

function declaredCodeLanguage(code) {
  const languageClass = Array.from(code.classList).find((className) => className.startsWith("language-"));
  return languageClass ? languageClass.replace(/^language-/, "").trim() : "";
}

function normalizeCodeLanguage(language) {
  const normalized = String(language || "").toLowerCase();
  return codeLanguageAliases[normalized] || normalized;
}

function codeLanguageLabel(language) {
  return language
    .replace(/^language-/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .toUpperCase();
}

function enhanceCodeBlocks(container) {
  configurePrismLanguages();

  container.querySelectorAll("pre code").forEach((code) => {
    const pre = code.closest("pre");
    const declaredLanguage = declaredCodeLanguage(code);
    const normalizedLanguage = normalizeCodeLanguage(declaredLanguage);

    pre?.classList.add("code-block");

    if (declaredLanguage && pre) {
      pre.classList.add("has-code-language");
      pre.dataset.language = codeLanguageLabel(declaredLanguage);
    }

    if (!window.Prism || !normalizedLanguage || code.dataset.highlighted === "yes") return;

    code.classList.add(`language-${normalizedLanguage}`);
    pre?.classList.add(`language-${normalizedLanguage}`);
    Prism.highlightElement(code);
  });
}

async function enhanceRenderedMarkdown(container) {
  container.querySelectorAll("a[href]").forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  enhanceCodeBlocks(container);

  container.querySelectorAll(".math-display[data-tex], .math-inline[data-tex]").forEach((node) => {
    try {
      katex.render(decodeURIComponent(node.dataset.tex), node, {
        displayMode: node.classList.contains("math-display"),
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

async function renderMarkdown(container, markdown) {
  container.innerHTML = markdownToSafeHtml(markdown);
  await enhanceRenderedMarkdown(container);
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

function closeAllCardsPanel() {
  allCardsRenderId += 1;
  el.allCardsPanel.hidden = true;
}

function setAllCardStatus(cardId, status) {
  if (state.statusById[cardId] === status) {
    delete state.statusById[cardId];
  } else {
    state.statusById[cardId] = status;
  }
  syncResults();
  savePersistedDeck();
  updateMeta();
  updateAllCardStatuses();
}

function updateAllCardStatuses() {
  el.allCardsList.querySelectorAll(".all-card").forEach((node) => {
    const status = state.statusById[node.dataset.cardId] || "";
    node.dataset.status = status;
    node.querySelectorAll("[data-all-status]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.allStatus === status);
    });
  });
}

async function ensureAllCardAnswer(item) {
  if (item.dataset.answerRendered === "true" || item.dataset.answerRendered === "rendering") return;
  const card = item.cardData;
  if (!card) return;

  item.dataset.answerRendered = "rendering";
  const answerView = item.querySelector(".all-card-answer .rendered");
  answerView.textContent = "Rendering...";
  await renderMarkdown(answerView, card.answer);
  item.dataset.answerRendered = "true";
}

function flipAllCard(item) {
  if (item.dataset.answerRendered === "rendering") return;
  const willShowAnswer = !item.classList.contains("is-flipped");
  item.classList.toggle("is-flipped", willShowAnswer);
  if (willShowAnswer) ensureAllCardAnswer(item);
}

async function renderAllCards() {
  const cards = state.masterCards;
  const renderId = allCardsRenderId;
  el.allCardsList.innerHTML = "";
  el.allCardsSummary.textContent = `${cards.length} ${cards.length === 1 ? "card" : "cards"}`;

  for (const [index, card] of cards.entries()) {
    if (renderId !== allCardsRenderId) return;

    const item = document.createElement("article");
    item.className = "all-card";
    item.tabIndex = 0;
    item.dataset.cardId = card.id;
    item.dataset.status = state.statusById[card.id] || "";
    item.dataset.answerRendered = "false";
    item.cardData = card;
    item.innerHTML = `
      <div class="all-card-top">
        <span class="all-card-index">${index + 1}</span>
        <div class="all-card-actions" aria-label="Categorize card">
          <button class="all-card-review" type="button" data-all-status="review">Review</button>
          <button class="all-card-known" type="button" data-all-status="known">Known</button>
        </div>
      </div>
      <div class="all-card-face all-card-question">
        <span class="face-label">Question</span>
        <div class="rendered"></div>
      </div>
      <div class="all-card-face all-card-answer">
        <span class="face-label">Answer</span>
        <div class="rendered"></div>
      </div>
    `;
    el.allCardsList.appendChild(item);
    await renderMarkdown(item.querySelector(".all-card-question .rendered"), card.question);
  }

  updateAllCardStatuses();
}

function openAllCardsPanel() {
  if (!state.masterCards.length) {
    setStatus("Import a deck before opening all cards.", "error");
    return;
  }

  allCardsRenderId += 1;
  el.allCardsPanel.hidden = false;
  renderAllCards();
}

function updateMeta() {
  const total = state.cards.length;
  const finished = Math.min(state.current, total);
  syncResults();
  el.deckTitle.textContent = state.deckTitle;
  el.deckTitle.title = state.deckTitle;
  el.deckTitleWrap.hidden = !state.deckTitle;
  el.editDeckTitleBtn.disabled = state.masterCards.length === 0;
  el.positionText.textContent = state.previewCard ? "Preview" : total ? `${Math.min(state.current + 1, total)}/${total}` : "0/0";
  el.scoreText.textContent = `Known ${state.known} / Review ${state.review}`;
  el.knownStackCount.textContent = state.known;
  el.reviewStackCount.textContent = state.review;
  renderBrickList(el.knownBrickList, state.results.known, "known");
  renderBrickList(el.reviewBrickList, state.results.review, "review");
  el.progressBar.style.width = total ? `${(finished / total) * 100}%` : "0";

  const disabled = !state.previewCard && (total === 0 || state.current >= total);
  el.prevCardBtn.disabled = Boolean(state.previewCard) || total === 0 || state.current <= 0;
  el.nextCardBtn.disabled = Boolean(state.previewCard) || total === 0 || state.current >= total - 1;
  el.knownBtn.disabled = disabled;
  el.reviewBtn.disabled = disabled;
  el.shuffleBtn.disabled = total < 2;
  el.resetBtn.disabled = total === 0;
  el.allCardsBtn.disabled = state.masterCards.length === 0;
  el.exportBtn.disabled = state.masterCards.length === 0 && state.results.known.length === 0 && state.results.review.length === 0;
  el.replayKnownBtn.disabled = state.results.known.length === 0;
  el.replayReviewBtn.disabled = state.results.review.length === 0;
  el.replayAllBtn.disabled = state.masterCards.length === 0;
}

function transitionClassFor(direction, phase) {
  if (!direction) return "";
  const suffix = phase === "in" ? "in" : "out";
  if (direction === "known") return `transition-right-${suffix}`;
  if (direction === "review") return `transition-left-${suffix}`;
  if (direction === "next") return `transition-left-${suffix}`;
  if (direction === "prev") return `transition-right-${suffix}`;
  if (direction > 0) return `transition-down-${suffix}`;
  if (direction < 0) return `transition-up-${suffix}`;
  return "";
}

function clearCardTransitionClasses() {
  el.card.classList.remove(
    "transition-left-out",
    "transition-left-in",
    "transition-right-out",
    "transition-right-in",
    "transition-up-out",
    "transition-up-in",
    "transition-down-out",
    "transition-down-in"
  );
}

async function showCard(direction = 0) {
  const token = state.transitionToken;
  state.previewCard = null;
  state.flipped = false;
  el.card.classList.remove("is-flipped", "swipe-left", "swipe-right", "is-dragging", "drag-review", "drag-known", "drag-prev", "drag-next");
  clearCardTransitionClasses();
  el.card.style.transform = "";
  const enterClass = transitionClassFor(direction, "in");
  if (enterClass) el.card.classList.add(enterClass);

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
  if (enterClass) {
    window.setTimeout(() => {
      if (state.transitionToken !== token) return;
      el.card.classList.remove(enterClass);
    }, 280);
  }
}

function animateToCard(direction, updateState) {
  const token = state.transitionToken + 1;
  state.transitionToken = token;
  const exitClass = transitionClassFor(direction, "out");
  clearCardTransitionClasses();
  el.card.classList.remove("swipe-left", "swipe-right", "is-dragging", "drag-review", "drag-known", "drag-prev", "drag-next");
  el.card.style.transform = "";
  if (exitClass) el.card.classList.add(exitClass);

  window.setTimeout(() => {
    if (state.transitionToken !== token) return;
    updateState();
    savePersistedDeck();
    showCard(direction);
  }, 210);
}

function buildCards(titleHint = state.importTitleHint || "") {
  const source = stripReaderMetadata(el.sourceInput.value);
  const cards = parseCards(source);
  const headingCount = countQuestionHeadings(source);
  const importTitle = titleFromImportHint(titleHint);
  state.cards = cards;
  state.masterCards = cards.slice();
  state.deckId = null;
  state.current = 0;
  state.deckTitle = cards.length ? importTitle || inferDeckTitle(source, titleHint) : "";
  state.sourceTitle = cards.length ? importTitle || state.deckTitle : "";
  state.importTitleHint = titleHint;
  resetResults();
  closeAllCardsPanel();

  if (cards.length) {
    setStatus(`Built ${cards.length} card${cards.length === 1 ? "" : "s"}.`);
    savePersistedDeck();
    closeImportPanel();
  } else {
    savePersistedDeck();
    const message = headingCount
      ? `Found ${headingCount} question heading${headingCount === 1 ? "" : "s"}, but no answer text. This Notion page is exposing collapsed toggle titles only; export Markdown or paste expanded toggle content.`
      : "No cards found. Use > toggle blocks, Q:/A: blocks, question headings, or structured note sections with answer content.";
    setStatus(message, "error");
  }

  showCard();
}

function flipCard() {
  if (!state.previewCard && !state.cards[state.current]) return;
  state.flipped = !state.flipped;
  el.card.classList.toggle("is-flipped", state.flipped);
}

function navigateCard(direction, animationDirection = direction) {
  if (state.previewCard || !state.cards.length) return;
  const nextIndex = Math.min(Math.max(state.current + direction, 0), state.cards.length - 1);
  if (nextIndex === state.current) return;
  setStatus(direction > 0 ? "Moved to next card." : "Moved to previous card.");
  animateToCard(animationDirection, () => {
    state.current = nextIndex;
    state.previewCard = null;
    state.flipped = false;
  });
}

function moveCard(result) {
  const card = state.previewCard || state.cards[state.current];
  if (!card) return;
  el.card.classList.remove("is-dragging", "drag-review", "drag-known", "drag-prev", "drag-next");
  el.card.style.transform = "";
  state.statusById[card.id] = result;
  syncResults();
  savePersistedDeck();

  if (state.previewCard) {
    state.previewCard = null;
    setStatus(`Moved card to ${result}.`);
    showCard();
    return;
  }

  animateToCard(result, () => {
    state.current += 1;
  });
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
  savePersistedDeck();
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

function formatCardList(title, cards) {
  const body = cards.length
    ? cards.map((card, index) => `### ${index + 1}. ${card.question}\n\n${card.answer}`).join("\n\n")
    : "_None_";
  return `## ${title}\n\n${body}`;
}

function slugifyFileName(value, fallback = "flashcards") {
  const source = String(value || "").trim() || fallback;
  const cleaned = source
    .replace(/\.(md|markdown|mdown|mkdn|txt|json|zip)$/i, "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function exportBaseName(scope = "all") {
  const base = slugifyFileName(state.deckTitle || state.sourceTitle || "flashcards");
  if (scope === "known") return `${base} - known`;
  if (scope === "review") return `${base} - review`;
  return base;
}

function normalizeCardStatus(status) {
  return status === "known" || status === "review" ? status : "";
}

function deckSnapshot() {
  return {
    app: "markdown-flashcards",
    version: 1,
    exportedAt: new Date().toISOString(),
    deckTitle: state.deckTitle || "",
    sourceTitle: state.sourceTitle || state.deckTitle || "",
    importTitleHint: state.importTitleHint || "",
    deckId: state.deckId,
    current: Number.isFinite(state.current) ? state.current : 0,
    cards: state.masterCards.map((card, index) => ({
      id: card.id || `${index}-${card.question.slice(0, 32)}`,
      question: card.question,
      answer: card.answer,
      status: normalizeCardStatus(state.statusById[card.id])
    }))
  };
}

function savePersistedDeck() {
  try {
    localStorage.removeItem(deckStorageKey);
  } catch (error) {
    console.warn("Could not clear deck state", error);
  }
}

function loadDeckSnapshot(payload, titleHint = "") {
  if (!payload || !Array.isArray(payload.cards)) {
    throw new Error("Invalid flashcard JSON");
  }

  const usedIds = new Set();
  const statusById = {};
  const cards = payload.cards
    .map((rawCard, index) => {
      const question = String(rawCard?.question || "").trim();
      const answer = String(rawCard?.answer || "").trim();
      if (!question || !answer) return null;

      let id = String(rawCard.id || `${index}-${question.slice(0, 32)}`);
      if (usedIds.has(id)) id = `${index}-${id}`;
      usedIds.add(id);

      const status = normalizeCardStatus(rawCard?.status || payload.statusById?.[id]);
      if (status) statusById[id] = status;

      return { id, question, answer };
    })
    .filter(Boolean);

  if (!cards.length) {
    throw new Error("No cards in flashcard JSON");
  }

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
  syncResults();
  closeAllCardsPanel();
  savePersistedDeck();
  showCard();
}

function loadPersistedDeck() {
  try {
    const stored = localStorage.getItem(deckStorageKey);
    if (!stored) return false;

    loadDeckSnapshot(JSON.parse(stored), "Saved deck");
    setStatus(`Restored ${state.masterCards.length} saved card${state.masterCards.length === 1 ? "" : "s"}.`);
    closeImportPanel();
    return true;
  } catch (error) {
    console.warn("Could not restore saved deck", error);
    localStorage.removeItem(deckStorageKey);
    return false;
  }
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
  link.download = `${exportBaseName(scope)}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus(`Exported ${title.toLowerCase()} as Markdown.`);
}

function exportJson() {
  if (!state.masterCards.length) {
    setStatus("No cards to export.", "error");
    return;
  }

  const blob = new Blob([`${JSON.stringify(deckSnapshot(), null, 2)}\n`], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${exportBaseName("all")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Exported all cards and markers as JSON.");
}

function contentFits(node) {
  return node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1;
}

function fitPrintNode(node) {
  node.style.transform = "";
  node.style.width = "";

  const shouldGrow = node.classList.contains("fit-question");

  if (!shouldGrow && contentFits(node)) return;

  let low = 4;
  let high = shouldGrow ? 58 : 88;
  let best = low;

  for (let index = 0; index < 10; index += 1) {
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

function afterPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function exportPdf(scope = "all") {
  const cards = cardsForScope(scope);
  const title = scope === "known" ? "Known Cards" : scope === "review" ? "Review Cards" : "All Cards";
  if (!cards.length) {
    setStatus(`No ${scope === "review" ? "review" : scope} cards to export.`, "error");
    return;
  }

  setStatus(`Preparing ${title.toLowerCase()} PDF...`);
  el.exportBtn.disabled = true;
  el.printRoot.innerHTML = "";
  el.printRoot.classList.add("is-preparing");
  printTitleBeforeExport = document.title;
  document.title = exportBaseName(scope);
  try {
    await afterPaint();

    const pages = [];
    for (const [index, card] of cards.entries()) {
      pages.push(`
        <section class="print-page">
          <div class="page-kicker">Question ${index + 1}</div>
          <div class="fit-content fit-question">${markdownToSafeHtml(card.question)}</div>
        </section>
        <section class="print-page">
          <div class="page-kicker">Answer ${index + 1}</div>
          <div class="fit-content fit-answer">${markdownToSafeHtml(card.answer)}</div>
        </section>
      `);

      if ((index + 1) % 20 === 0) {
        setStatus(`Preparing ${title.toLowerCase()} PDF... ${index + 1}/${cards.length}`);
        await afterPaint();
      }
    }

    el.printRoot.innerHTML = `
      <h1 class="print-title">${escapeHtml(title)}</h1>
      ${pages.join("\n")}
    `;
    await enhanceRenderedMarkdown(el.printRoot);
    await (document.fonts?.ready || Promise.resolve());
    await afterPaint();

    fitPrintPages();
    el.printRoot.classList.remove("is-preparing");
    window.print();
    setStatus(`Opened ${title.toLowerCase()} print dialog.`);
  } catch (error) {
    console.error("PDF export failed", error);
    el.printRoot.classList.remove("is-preparing");
    if (printTitleBeforeExport) document.title = printTitleBeforeExport;
    printTitleBeforeExport = "";
    setStatus("Could not prepare the PDF export.", "error");
  } finally {
    el.exportBtn.disabled = false;
  }
}

function handleExportAction(format, scope) {
  el.exportMenu.hidden = true;
  if (format === "pdf") {
    setStatus("Opening PDF export...");
    window.setTimeout(() => exportPdf(scope), 0);
    return;
  }
  if (format === "json") {
    exportJson();
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

  state.importTitleHint = url;
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
      state.deckId = null;
      state.deckTitle = "";
      state.sourceTitle = "";
      state.importTitleHint = url;
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

function isJsonName(name) {
  return /\.json$/i.test(normalizedArchiveName(name).split("?")[0]);
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
    state.importTitleHint = markdownFiles.length === 1 ? markdownFiles[0].name : file.name;
    setStatus(`Loaded ${markdownFiles.length} Markdown file${markdownFiles.length === 1 ? "" : "s"} from ${file.name}.`);
    buildCards(state.importTitleHint);
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
    const text = String(reader.result || "");

    if (isJsonName(file.name) || file.type === "application/json") {
      try {
        loadDeckSnapshot(JSON.parse(text), file.name);
        el.sourceInput.value = "";
        setStatus(`Loaded ${state.masterCards.length} card${state.masterCards.length === 1 ? "" : "s"} with saved markers from ${file.name}.`);
        closeImportPanel();
      } catch (error) {
        setStatus("Could not read this flashcard JSON export.", "error");
      }
      return;
    }

    el.sourceInput.value = text;
    state.importTitleHint = file.name;
    setStatus(`Loaded ${file.name}.`);
    buildCards(state.importTitleHint);
  });
  reader.addEventListener("error", () => setStatus("Could not read the selected file.", "error"));
  reader.readAsText(file);
}

function loadSample() {
  el.sourceInput.value = sampleMarkdown;
  state.importTitleHint = "Sample flashcards";
  setStatus("Sample loaded.");
  buildCards(state.importTitleHint);
}

function currentCardCanMove() {
  return Boolean(state.previewCard || state.cards[state.current]);
}

function closestElement(target, selector) {
  if (target instanceof Element) return target.closest(selector);
  if (typeof target?.closest === "function") return target.closest(selector);
  if (typeof target?.parentElement?.closest === "function") return target.parentElement.closest(selector);
  return null;
}

function isCardActionTarget(target) {
  return Boolean(closestElement(target, "a, button, input, textarea"));
}

function isSelectableCardText(target) {
  return Boolean(closestElement(target, ".rendered"));
}

function hasCardTextSelection() {
  const selection = window.getSelection?.();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;
  return Boolean((anchorNode && el.card.contains(anchorNode)) || (focusNode && el.card.contains(focusNode)));
}

function swipeCommitDistance() {
  return Math.min(
    swipeConfig.maxCommitDistance,
    Math.max(swipeConfig.minCommitDistance, el.card.offsetWidth * swipeConfig.widthCommitRatio)
  );
}

function dragVelocity(current, previous, time) {
  const elapsed = Math.max(time - state.dragLastTime, 1);
  return (current - previous) / elapsed;
}

function beginSwipe(clientX, clientY, pointerId = null, pointerType = "") {
  const time = performance.now();
  state.dragging = false;
  state.dragMoved = false;
  state.dragStartX = clientX;
  state.dragStartY = clientY;
  state.dragCurrentX = clientX;
  state.dragCurrentY = clientY;
  state.dragLastX = clientX;
  state.dragLastY = clientY;
  state.dragStartTime = time;
  state.dragLastTime = time;
  state.dragPointerId = pointerId;
  state.dragPointerType = pointerType;
  state.dragCaptured = false;
}

function resetCardDrag() {
  state.dragging = false;
  state.dragPointerId = null;
  state.dragPointerType = "";
  state.dragCaptured = false;
  state.dragMoved = false;
  el.card.classList.remove("is-dragging", "drag-review", "drag-known", "drag-prev", "drag-next");
  el.card.style.transform = "";
}

function updateSwipe(clientX, clientY, event) {
  const time = performance.now();
  const velocityX = dragVelocity(clientX, state.dragLastX, time);
  state.dragCurrentX = clientX;
  state.dragCurrentY = clientY;

  const dx = state.dragCurrentX - state.dragStartX;
  const dy = state.dragCurrentY - state.dragStartY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  state.dragMoved = state.dragMoved || absX > 6 || absY > 6;

  if (!state.dragging) {
    const hasHorizontalIntent = absX >= swipeConfig.intentDistance && absX >= absY * swipeConfig.intentRatio;
    const hasVerticalIntent = absY >= swipeConfig.intentDistance && absY >= absX * swipeConfig.intentRatio;

    if (!hasHorizontalIntent && !hasVerticalIntent) {
      state.dragLastX = clientX;
      state.dragLastY = clientY;
      state.dragLastTime = time;
      return;
    }

    if (hasVerticalIntent) {
      state.suppressClickUntil = time + 360;
      resetCardDrag();
      return;
    }

    state.dragging = true;
    if (event?.pointerId !== undefined && !state.dragCaptured) {
      el.card.setPointerCapture?.(event.pointerId);
      state.dragCaptured = true;
    }
    el.card.classList.add("is-dragging");
  }

  if (event?.cancelable && typeof event.preventDefault === "function") event.preventDefault();

  const direction = dx > 0 ? 1 : -1;
  const resisted = direction * Math.min(absX * swipeConfig.resistance, swipeConfig.maxPreviewOffset);
  const progress = Math.min(absX / swipeCommitDistance(), 1);
  const flicking = absX >= swipeConfig.flickDistance && Math.abs(velocityX) >= swipeConfig.flickVelocity;
  const choosing = progress > 0.45 || flicking;
  el.card.classList.toggle("drag-prev", dx > 0 && choosing);
  el.card.classList.toggle("drag-next", dx < 0 && choosing);
  el.card.style.transform = `translateX(${resisted}px) rotate(${direction * progress * 2.2}deg) scale(${1 - progress * 0.01})`;

  state.dragLastX = clientX;
  state.dragLastY = clientY;
  state.dragLastTime = time;
}

function finishSwipe() {
  const dx = state.dragCurrentX - state.dragStartX;
  const dy = state.dragCurrentY - state.dragStartY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const elapsed = Math.max(performance.now() - state.dragStartTime, 1);
  const averageVelocity = absX / elapsed;
  const committed = state.dragging
    && absX >= absY * swipeConfig.commitRatio
    && (
      absX >= swipeCommitDistance()
      || (absX >= swipeConfig.flickDistance && averageVelocity >= swipeConfig.flickVelocity)
    );

  if (state.dragMoved || state.dragging) {
    state.suppressClickUntil = performance.now() + 360;
  }

  if (committed) {
    el.card.classList.remove("is-dragging", "drag-review", "drag-known", "drag-prev", "drag-next");
    el.card.style.transform = "";
    state.dragging = false;
    state.dragPointerId = null;
    state.dragPointerType = "";
    state.dragCaptured = false;
    state.dragMoved = false;

    navigateCard(dx > 0 ? -1 : 1, dx > 0 ? "prev" : "next");
    return;
  }

  resetCardDrag();
}

function handlePointerDown(event) {
  if (!currentCardCanMove() || isCardActionTarget(event.target)) return;
  if (event.pointerType === "mouse" && isSelectableCardText(event.target)) return;
  beginSwipe(event.clientX, event.clientY, event.pointerId, event.pointerType);
}

function handlePointerMove(event) {
  if (state.dragPointerId !== event.pointerId) return;
  updateSwipe(event.clientX, event.clientY, event);
}

function handlePointerUp(event) {
  if (state.dragPointerId !== event.pointerId) return;
  if (state.dragCaptured) el.card.releasePointerCapture?.(event.pointerId);
  finishSwipe();
}

function handlePointerCancel(event) {
  if (state.dragPointerId === event.pointerId) {
    if (state.dragCaptured) el.card.releasePointerCapture?.(event.pointerId);
    resetCardDrag();
  }
}

function touchPoint(event) {
  return event.changedTouches?.[0] || event.touches?.[0] || null;
}

function handleTouchStart(event) {
  if (!currentCardCanMove() || isCardActionTarget(event.target)) return;
  const point = touchPoint(event);
  if (!point) return;
  beginSwipe(point.clientX, point.clientY, "touch", "touch");
}

function handleTouchMove(event) {
  if (state.dragPointerId !== "touch") return;
  const point = touchPoint(event);
  if (!point) return;
  updateSwipe(point.clientX, point.clientY, event);
}

function handleTouchEnd() {
  if (state.dragPointerId !== "touch") return;
  finishSwipe();
}

function handleTouchCancel() {
  if (state.dragPointerId !== "touch") return;
  resetCardDrag();
}



if (document.getElementById("closeWebDecksBtn")) {
  document.getElementById("closeWebDecksBtn").addEventListener("click", () => {
    document.getElementById("webDecksPanel").hidden = true;
  });
}
if (document.getElementById("syncBtn")) {
  document.getElementById("syncBtn").addEventListener("click", showSyncModal);
}
if (document.getElementById("cancelSyncBtn")) {
  document.getElementById("cancelSyncBtn").addEventListener("click", () => {
    document.getElementById("syncModal").hidden = true;
  });
}
if (document.getElementById("confirmSyncBtn")) {
  document.getElementById("confirmSyncBtn").addEventListener("click", syncDeckToWeb);
}

if (document.getElementById("refreshWebDecksBtn")) document.getElementById("refreshWebDecksBtn").addEventListener("click", fetchWebDecks);

el.parseBtn.addEventListener("click", () => buildCards());
el.sampleBtn.addEventListener("click", loadSample);
el.fetchBtn.addEventListener("click", fetchUrl);
el.importBtn.addEventListener("click", openImportPanel);
el.openWebDecksFromImportBtn.addEventListener("click", openWebDecksPanel);
el.closeImportBtn.addEventListener("click", closeImportPanel);
el.editDeckTitleBtn.addEventListener("click", editCurrentDeckTitle);
el.allCardsBtn.addEventListener("click", openAllCardsPanel);
el.closeAllCardsBtn.addEventListener("click", closeAllCardsPanel);
el.allCardsList.addEventListener("click", (event) => {
  const statusButton = event.target.closest("[data-all-status]");
  if (statusButton) {
    event.stopPropagation();
    const item = statusButton.closest(".all-card");
    setAllCardStatus(item.dataset.cardId, statusButton.dataset.allStatus);
    return;
  }

  const item = event.target.closest(".all-card");
  if (item && event.target.closest("a, button") === null) {
    flipAllCard(item);
  }
});
el.allCardsList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const item = event.target.closest(".all-card");
  if (!item || event.target.closest("button")) return;
  event.preventDefault();
  flipAllCard(item);
});
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
el.prevCardBtn.addEventListener("click", () => navigateCard(-1, "prev"));
el.nextCardBtn.addEventListener("click", () => navigateCard(1, "next"));
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
el.shuffleBtn.addEventListener("click", shuffleCards);
el.resetBtn.addEventListener("click", resetQuiz);
el.card.addEventListener("click", (event) => {
  if (performance.now() < state.suppressClickUntil) {
    event.preventDefault();
    return;
  }
  if (hasCardTextSelection()) return;
  if (Math.abs(state.dragCurrentX - state.dragStartX) < 8 && Math.abs(state.dragCurrentY - state.dragStartY) < 8 && !isCardActionTarget(event.target)) flipCard();
});
el.card.addEventListener("pointerdown", handlePointerDown);
el.card.addEventListener("pointermove", handlePointerMove);
el.card.addEventListener("pointerup", handlePointerUp);
el.card.addEventListener("pointercancel", handlePointerCancel);
el.card.addEventListener("touchstart", handleTouchStart, { passive: true });
el.card.addEventListener("touchmove", handleTouchMove, { passive: false });
el.card.addEventListener("touchend", handleTouchEnd);
el.card.addEventListener("touchcancel", handleTouchCancel);

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea")) return;
  if (event.key === "Escape") {
    el.exportMenu.hidden = true;
    closeDiagramModal();
    closeAllCardsPanel();
    closeImportPanel();
  }
  if (!el.allCardsPanel.hidden) return;
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    flipCard();
  }
  if (event.key === "ArrowRight") navigateCard(1, "next");
  if (event.key === "ArrowLeft") navigateCard(-1, "prev");
  if (event.key === "ArrowDown") navigateCard(1);
  if (event.key === "ArrowUp") navigateCard(-1);
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
  if (printTitleBeforeExport) document.title = printTitleBeforeExport;
  printTitleBeforeExport = "";
});

setTheme(localStorage.getItem("swipe-notes-theme") || "dark");
localStorage.removeItem(deckStorageKey);
setStatus("");
showCard();
