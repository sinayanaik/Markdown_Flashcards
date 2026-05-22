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
  transitionToken: 0,
  styleSettings: {},
  styleTouched: false,
  stylePanelScrollY: 0,
  stylePanelTouchY: 0,
  diagramPanPointerId: null,
  diagramPanStartX: 0,
  diagramPanStartY: 0,
  diagramPanScrollLeft: 0,
  diagramPanScrollTop: 0
};

const deckStorageKey = "swipe-notes-current-deck-v1";
const styleStorageKey = "swipe-notes-style-settings-v1";
const themeStorageKey = "swipe-notes-theme";

const fontFamilyChoices = {
  system: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  serif: "Georgia, \"Times New Roman\", Times, serif",
  mono: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, monospace",
  rounded: "ui-rounded, \"Avenir Next\", \"Nunito Sans\", Inter, ui-sans-serif, system-ui, sans-serif"
};

const styleDefaults = {
  fontFamily: "system",
  questionFontFamily: "system",
  answerFontFamily: "system",
  appWidthPercent: "100",
  appHeightPercent: "100",
  sidePanelWidthPercent: "16",
  cardWidthPercent: "96",
  cardMaxHeightPercent: "74",
  modalWidthPercent: "60",
  markdownBoxHeightPercent: "30",
  baseFontSize: "18px",
  baseLineHeight: "1.58",
  codeFontSize: "15px",
  codeLineHeight: "1.55",
  questionFillPercent: "58",
  questionLineHeight: "1.18",
  questionAlign: "center",
  questionVerticalAlign: "center",
  questionFontWeight: "700",
  questionPadding: "2px",
  answerFontSize: "23px",
  answerLineHeight: "1.58",
  answerFontWeight: "400",
  answerPadding: "0px",
  appGap: "10px",
  panelPadding: "10px",
  cardPadding: "24px",
  cardContentGap: "16px",
  buttonGap: "8px",
  stackCardGap: "7px",
  cardBorderWidth: "1px",
  cardCornerRadius: "14px",
  panelCornerRadius: "14px",
  buttonCornerRadius: "8px",
  inputCornerRadius: "8px",
  toolbarButtonHeight: "38px",
  actionButtonHeight: "42px",
  buttonFontSize: "14px",
  replayButtonHeight: "30px",
  stackCardFontSize: "13px",
  stackCardLineHeight: "1.28",
  inputHeight: "40px",
  modalPadding: "18px"
};

const styleControlGroups = [
  {
    title: "Typography",
    fields: [
      { key: "fontFamily", label: "Base font family", type: "select", options: ["system", "serif", "mono", "rounded"], hint: "Base app font." },
      { key: "baseFontSize", label: "Base font size", type: "range", min: 10, max: 36, step: 1, unit: "px", hint: "General Markdown and interface text size." },
      { key: "baseLineHeight", label: "Base line spacing", type: "range", min: 0.9, max: 2.6, step: 0.01, hint: "General reading spacing." },
      { key: "codeFontSize", label: "Code font size", type: "range", min: 10, max: 28, step: 1, unit: "px", hint: "Text size inside code blocks." },
      { key: "codeLineHeight", label: "Code line spacing", type: "range", min: 0.9, max: 2.6, step: 0.01, hint: "Line spacing inside code blocks." }
    ]
  },
  {
    title: "Layout Percentages",
    fields: [
      { key: "appWidthPercent", label: "App width %", type: "range", min: 50, max: 100, step: 1, hint: "Width of the whole app as a percent of screen width." },
      { key: "appHeightPercent", label: "App height %", type: "range", min: 50, max: 100, step: 1, hint: "Height of the whole app as a percent of screen height." },
      { key: "sidePanelWidthPercent", label: "Side panels width %", type: "range", min: 6, max: 35, step: 1, hint: "Each Known/Review column as a percent of total app width." },
      { key: "cardWidthPercent", label: "Card width %", type: "range", min: 40, max: 100, step: 1, hint: "Flashcard width as a percent of the middle study area." },
      { key: "cardMaxHeightPercent", label: "Card max height %", type: "range", min: 30, max: 100, step: 1, hint: "Maximum flashcard height as a percent of screen height." },
      { key: "modalWidthPercent", label: "Modal width %", type: "range", min: 30, max: 100, step: 1, hint: "Import/Web/Style panel width as a percent of screen width." },
      { key: "markdownBoxHeightPercent", label: "Markdown box height %", type: "range", min: 10, max: 80, step: 1, hint: "Import textarea height as a percent of screen height." }
    ]
  },
  {
    title: "Spacing And Shape",
    fields: [
      { key: "appGap", label: "Main gap", type: "range", min: 0, max: 40, step: 1, unit: "px", hint: "Space between major app sections." },
      { key: "panelPadding", label: "Panel padding", type: "range", min: 0, max: 48, step: 1, unit: "px", hint: "Inside spacing for study and side panels." },
      { key: "cardPadding", label: "Card padding", type: "range", min: 0, max: 80, step: 1, unit: "px", hint: "Inside spacing on question and answer faces." },
      { key: "cardContentGap", label: "Card label gap", type: "range", min: 0, max: 48, step: 1, unit: "px", hint: "Space between the Question/Answer label and content." },
      { key: "buttonGap", label: "Button gap", type: "range", min: 0, max: 32, step: 1, unit: "px", hint: "Space between buttons." },
      { key: "stackCardGap", label: "Stack card gap", type: "range", min: 0, max: 32, step: 1, unit: "px", hint: "Space between mini cards in Known/Review stacks." },
      { key: "cardCornerRadius", label: "Card corner radius", type: "range", min: 0, max: 48, step: 1, unit: "px", hint: "Roundness of the flashcard corners." },
      { key: "panelCornerRadius", label: "Panel corner radius", type: "range", min: 0, max: 48, step: 1, unit: "px", hint: "Roundness of study, side, import, and style panels." },
      { key: "buttonCornerRadius", label: "Button corner radius", type: "range", min: 0, max: 32, step: 1, unit: "px", hint: "Roundness of buttons." },
      { key: "inputCornerRadius", label: "Input corner radius", type: "range", min: 0, max: 32, step: 1, unit: "px", hint: "Roundness of textboxes and selects." }
    ]
  },
  {
    title: "Question",
    fields: [
      { key: "questionFontFamily", label: "Question font family", type: "select", options: ["system", "serif", "mono", "rounded"], hint: "Question-only font." },
      { key: "questionFillPercent", label: "Question fill %", type: "range", min: 10, max: 95, step: 1, hint: "How much vertical card space the question tries to occupy." },
      { key: "questionLineHeight", label: "Question line spacing", type: "range", min: 0.8, max: 2.4, step: 0.01, hint: "Line spacing for question text." },
      { key: "questionAlign", label: "Question horizontal align", type: "select", options: ["left", "center", "right", "justify"], hint: "Question text alignment." },
      { key: "questionVerticalAlign", label: "Question vertical align", type: "select", options: ["start", "center", "end"], hint: "Question vertical position." },
      { key: "questionFontWeight", label: "Question weight", type: "select", options: ["300", "400", "500", "600", "700", "800", "900"], hint: "Question text thickness." },
      { key: "questionPadding", label: "Question padding", type: "range", min: 0, max: 120, step: 1, unit: "px", hint: "Internal padding for the question text." }
    ]
  },
  {
    title: "Answer And Card",
    fields: [
      { key: "answerFontFamily", label: "Answer font family", type: "select", options: ["system", "serif", "mono", "rounded"], hint: "Answer-only font." },
      { key: "answerFontSize", label: "Answer font size", type: "range", min: 10, max: 64, step: 1, unit: "px", hint: "Main answer text size." },
      { key: "answerLineHeight", label: "Answer line spacing", type: "range", min: 0.9, max: 2.6, step: 0.01, hint: "Reading spacing on the answer side." },
      { key: "answerFontWeight", label: "Answer weight", type: "select", options: ["300", "400", "500", "600", "700", "800", "900"], hint: "Answer text thickness." },
      { key: "answerPadding", label: "Answer padding", type: "range", min: 0, max: 120, step: 1, unit: "px", hint: "Internal padding for the answer text." },
      { key: "cardBorderWidth", label: "Card border width", type: "range", min: 0, max: 8, step: 1, unit: "px", hint: "Border thickness around the flashcard." }
    ]
  },
  {
    title: "Buttons And Stacks",
    fields: [
      { key: "toolbarButtonHeight", label: "Toolbar button height", type: "range", min: 24, max: 72, step: 1, unit: "px", hint: "Height of Import, Web Decks, Sync, Export, All, and icon buttons." },
      { key: "actionButtonHeight", label: "Action button height", type: "range", min: 28, max: 80, step: 1, unit: "px", hint: "Height of Review, Prev, Next, Known buttons." },
      { key: "buttonFontSize", label: "Button font size", type: "range", min: 10, max: 28, step: 1, unit: "px", hint: "Text size inside buttons." },
      { key: "replayButtonHeight", label: "Replay button height", type: "range", min: 20, max: 56, step: 1, unit: "px", hint: "Height of All cards / Review only replay buttons." },
      { key: "stackCardFontSize", label: "Stack card font size", type: "range", min: 9, max: 24, step: 1, unit: "px", hint: "Text size inside mini Known/Review cards." },
      { key: "stackCardLineHeight", label: "Stack card line spacing", type: "range", min: 0.9, max: 2.2, step: 0.01, hint: "Line spacing inside mini Known/Review cards." },
      { key: "inputHeight", label: "Input height", type: "range", min: 24, max: 72, step: 1, unit: "px", hint: "Height of URL and style textboxes." },
      { key: "modalPadding", label: "Modal padding", type: "range", min: 0, max: 64, step: 1, unit: "px", hint: "Inside spacing for import, web deck, and style panels." }
    ]
  }
];

const styleFieldByKey = styleControlGroups.reduce((fields, group) => {
  group.fields.forEach((field) => {
    fields[field.key] = field;
  });
  return fields;
}, {});

const styleCssVariables = {
  questionFontFamily: "--question-font-family",
  answerFontFamily: "--answer-font-family",
  appWidthPercent: "--app-width-percent",
  appHeightPercent: "--app-height-percent",
  sidePanelWidthPercent: "--side-panel-width-percent",
  cardWidthPercent: "--card-width-percent",
  cardMaxHeightPercent: "--card-max-height-percent",
  modalWidthPercent: "--modal-width-percent",
  markdownBoxHeightPercent: "--markdown-box-height-percent",
  baseFontSize: "--content-font-size",
  baseLineHeight: "--content-line-height",
  codeFontSize: "--code-font-size",
  codeLineHeight: "--code-line-height",
  questionLineHeight: "--question-line-height",
  questionAlign: "--question-align",
  questionVerticalAlign: "--question-vertical-align",
  questionFontWeight: "--question-font-weight",
  questionPadding: "--question-padding",
  answerFontSize: "--answer-font-size",
  answerLineHeight: "--answer-line-height",
  answerFontWeight: "--answer-font-weight",
  answerPadding: "--answer-padding",
  appGap: "--app-gap",
  panelPadding: "--panel-padding",
  cardPadding: "--card-face-padding",
  cardContentGap: "--card-face-gap",
  buttonGap: "--toolbar-gap",
  stackCardGap: "--brick-gap",
  cardBorderWidth: "--card-border-width",
  cardCornerRadius: "--card-radius",
  panelCornerRadius: "--panel-corner-radius",
  buttonCornerRadius: "--toolbar-button-radius",
  inputCornerRadius: "--input-radius",
  toolbarButtonHeight: "--toolbar-button-height",
  actionButtonHeight: "--action-button-height",
  buttonFontSize: "--button-font-size",
  replayButtonHeight: "--replay-button-height",
  stackCardFontSize: "--brick-font-size",
  stackCardLineHeight: "--brick-line-height",
  inputHeight: "--input-height",
  modalPadding: "--modal-padding"
};


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
      tbody.innerHTML = "<tr><td colspan=\"3\" class=\"web-decks-empty\">No web decks found.</td></tr>";
      setStatus("Web decks loaded.");
      return;
    }
    
    data.forEach(deck => {
      const date = new Date(deck.updated_at).toLocaleString();
      const tr = document.createElement("tr");

      const tdTitle = document.createElement("td");
      tdTitle.dataset.label = "Title";
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
      tdDate.dataset.label = "Updated";
      tdDate.textContent = date;
      
      const tdActions = document.createElement("td");
      tdActions.dataset.label = "Actions";
      const actionsWrap = document.createElement("div");
      actionsWrap.className = "web-deck-actions";
      
      const loadBtn = document.createElement("button");
      loadBtn.className = "web-deck-action";
      loadBtn.textContent = "Load";
      loadBtn.onclick = () => loadWebDeck(deck.id);
      
      const delBtn = document.createElement("button");
      delBtn.className = "web-deck-action web-deck-delete";
      delBtn.textContent = "Delete";
      delBtn.onclick = () => deleteWebDeck(deck.id);
      
      actionsWrap.appendChild(loadBtn);
      actionsWrap.appendChild(delBtn);
      tdActions.appendChild(actionsWrap);
      
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
    unlockPageScroll();
    closeImportPanel();
    showCard();
  } catch (error) {
    setStatus("Failed to load deck from web.", "error");
    console.error(error);
  }
}

function normalizeSyncText(value) {
  return normalizeMarkdown(String(value || ""))
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function syncTextChanged(localValue, webValue) {
  return normalizeSyncText(localValue) !== normalizeSyncText(webValue);
}

function sameSyncContent(localCard, webCard) {
  return !syncTextChanged(localCard.question, webCard.question)
    && !syncTextChanged(localCard.answer, webCard.answer);
}

function uniqueMatchingWebCard(webCards, predicate) {
  const matches = webCards.filter(predicate);
  return matches.length === 1 ? matches[0] : null;
}

function fallbackWebCardFor(localCard, localIndex, unmatchedWebCards, localIds) {
  const candidates = unmatchedWebCards.filter((webCard) => !localIds.has(String(webCard.id)));

  return uniqueMatchingWebCard(candidates, (webCard) => sameSyncContent(localCard, webCard))
    || uniqueMatchingWebCard(candidates, (webCard) => Number(webCard.position) === localIndex)
    || uniqueMatchingWebCard(candidates, (webCard) => (
      normalizeSyncText(localCard.question)
      && normalizeSyncText(localCard.question) === normalizeSyncText(webCard.question)
    ))
    || uniqueMatchingWebCard(candidates, (webCard) => (
      normalizeSyncText(localCard.answer)
      && normalizeSyncText(localCard.answer) === normalizeSyncText(webCard.answer)
    ));
}

function calculateSyncDiff(localCards, webCards, statusById = {}) {
  const unmatchedWeb = new Map(webCards.map((card) => [String(card.id), card]));
  const localIds = new Set(localCards.map((card) => String(card.id)));
  const changes = {
    added: 0,
    deleted: 0,
    edited: 0,
    moved: 0,
    statusChanges: 0
  };

  localCards.forEach((localCard, index) => {
    const id = String(localCard.id);
    let webCard = unmatchedWeb.get(id) || null;

    if (!webCard) {
      webCard = fallbackWebCardFor(localCard, index, Array.from(unmatchedWeb.values()), localIds);
    }

    if (!webCard) {
      changes.added += 1;
      return;
    }

    unmatchedWeb.delete(String(webCard.id));

    if (syncTextChanged(localCard.question, webCard.question) || syncTextChanged(localCard.answer, webCard.answer)) {
      changes.edited += 1;
    }

    const webPosition = Number(webCard.position);
    if (Number.isFinite(webPosition) && webPosition !== index) {
      changes.moved += 1;
    }

    const localStatus = normalizeCardStatus(statusById[id]);
    const webStatus = normalizeCardStatus(webCard.status);
    if (localStatus !== webStatus) {
      changes.statusChanges += 1;
    }
  });

  changes.deleted = unmatchedWeb.size;
  return changes;
}

async function showSyncModal() {
  const modal = document.getElementById("syncModal");
  const content = document.getElementById("syncDetailsContent");
  const confirmBtn = document.getElementById("confirmSyncBtn");
  
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
  
  modal.hidden = false;
  if (confirmBtn) confirmBtn.disabled = true;
  
  content.innerHTML = `
    <p><strong>Action:</strong> ${actionText}</p>
    <p><strong>Title:</strong> ${escapeHtml(deckTitle)}</p>
    <p><strong>Cards:</strong> ${cardsCount} total (${knownCount} known, ${reviewCount} review)</p>
    <p><strong>Current Position:</strong> Card ${state.current + 1}</p>
    <br>
    <p style="color: var(--text-secondary);">Calculating differences...</p>
  `;
  
  let diffHtml = "";

  if (!isUpdate || !supabaseClient) {
    diffHtml = `<p style="color: var(--text-secondary);">This will create a new deck on the web with your ${cardsCount} cards.</p>`;
  } else {
    try {
      const { data: webCards, error } = await supabaseClient
        .from("cards")
        .select("id, question, answer, status, position")
        .eq("deck_id", state.deckId);

      if (error) throw error;

      const { added, deleted, edited, moved, statusChanges } = calculateSyncDiff(state.masterCards, webCards || [], state.statusById);

      if (added === 0 && deleted === 0 && edited === 0 && moved === 0 && statusChanges === 0) {
        diffHtml = `<p style="color: var(--text-secondary);">No changes detected. The web deck is up to date.</p>`;
      } else {
        diffHtml = `<p style="color: var(--text-secondary); margin-bottom: 0.5rem;"><strong>Changes to sync:</strong></p>
        <ul style="color: var(--text-secondary); margin-left: 1.5rem; list-style-type: disc;">`;
        if (added > 0) diffHtml += `<li>${added} card${added > 1 ? 's' : ''} added</li>`;
        if (deleted > 0) diffHtml += `<li>${deleted} card${deleted > 1 ? 's' : ''} deleted</li>`;
        if (edited > 0) diffHtml += `<li>${edited} card${edited > 1 ? 's' : ''} modified</li>`;
        if (moved > 0) diffHtml += `<li>${moved} card position${moved > 1 ? 's' : ''} updated</li>`;
        if (statusChanges > 0) diffHtml += `<li>${statusChanges} status update${statusChanges > 1 ? 's' : ''}</li>`;
        diffHtml += `</ul>`;
      }
    } catch (err) {
      console.error("Failed to calculate sync differences", err);
      diffHtml = `<p style="color: #ff4a4a;">Could not calculate differences. Proceeding will overwrite web data.</p>`;
    }
  }

  content.innerHTML = `
    <p><strong>Action:</strong> ${actionText}</p>
    <p><strong>Title:</strong> ${escapeHtml(deckTitle)}</p>
    <p><strong>Cards:</strong> ${cardsCount} total (${knownCount} known, ${reviewCount} review)</p>
    <p><strong>Current Position:</strong> Card ${state.current + 1}</p>
    <br>
    ${diffHtml}
  `;
  
  if (confirmBtn) confirmBtn.disabled = false;
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
    const isNewDeck = !state.deckId;
    if (isNewDeck) {
      state.deckId = slugifyFileName(state.deckTitle || state.sourceTitle) || ("deck-" + Date.now());
    }

    setStatus(`Syncing... (1/3) Saving deck info "${state.deckTitle}"`);
    
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

    // Handle deletions if it's an update
    if (!isNewDeck) {
      setStatus("Syncing... (2/3) Cleaning up deleted cards");
      const { data: webCards, error: fetchError } = await supabaseClient
        .from("cards")
        .select("id")
        .eq("deck_id", state.deckId);
      
      if (!fetchError && webCards) {
        const localIds = new Set(state.masterCards.map(c => c.id));
        const idsToDelete = webCards.filter(wc => !localIds.has(wc.id)).map(wc => wc.id);
        
        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabaseClient
            .from("cards")
            .delete()
            .in("id", idsToDelete);
          if (deleteError) throw deleteError;
        }
      }
    }

    setStatus(`Syncing... (3/3) Saving ${state.masterCards.length} cards`);
    const cardsData = state.masterCards.map((card, index) => ({
      id: card.id,
      deck_id: state.deckId,
      question: card.question,
      answer: card.answer,
      position: index,
      status: normalizeCardStatus(state.statusById[card.id]),
      updated_at: new Date().toISOString()
    }));

    // Chunk upserts if there are many cards
    const chunkSize = 50;
    for (let i = 0; i < cardsData.length; i += chunkSize) {
      const chunk = cardsData.slice(i, i + chunkSize);
      const { error: cardsError } = await supabaseClient
        .from("cards")
        .upsert(chunk);
      if (cardsError) throw cardsError;
    }

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
let draggedAllCardId = "";
let printTitleBeforeExport = "";
let liveQuestionFitFrame = 0;

const el = {
  sourceInput: document.querySelector("#sourceInput"),
  urlInput: document.querySelector("#urlInput"),
  fileInput: document.querySelector("#fileInput"),
  fetchBtn: document.querySelector("#fetchBtn"),
  parseBtn: document.querySelector("#parseBtn"),
  openWebDecksFromImportBtn: document.querySelector("#openWebDecksFromImportBtn"),
  sampleBtn: document.querySelector("#sampleBtn"),
  deckMenuBtn: document.querySelector("#deckMenuBtn"),
  deckMenu: document.querySelector("#deckMenu"),
  newDeckBtn: document.querySelector("#newDeckBtn"),
  newDeckFromImportBtn: document.querySelector("#newDeckFromImportBtn"),
  importBtn: document.querySelector("#importBtn"),
  webDecksBtn: document.querySelector("#webDecksBtn"),
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
  styleBtn: document.querySelector("#styleBtn"),
  stylePanel: document.querySelector("#stylePanel"),
  styleControls: document.querySelector("#styleControls"),
  closeStyleBtn: document.querySelector("#closeStyleBtn"),
  syncStyleBtn: document.querySelector("#syncStyleBtn"),
  applyStyleBtn: document.querySelector("#applyStyleBtn"),
  resetStyleBtn: document.querySelector("#resetStyleBtn"),
  styleSyncStatus: document.querySelector("#styleSyncStatus"),
  themeBtn: document.querySelector("#themeBtn"),
  deckTitleWrap: document.querySelector("#deckTitleWrap"),
  deckTitle: document.querySelector("#deckTitle"),
  editDeckTitleBtn: document.querySelector("#editDeckTitleBtn"),
  shuffleBtn: document.querySelector("#shuffleBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  card: document.querySelector("#card"),
  questionView: document.querySelector("#questionView"),
  answerView: document.querySelector("#answerView"),
  editQuestionBtn: document.querySelector("#editQuestionBtn"),
  editAnswerBtn: document.querySelector("#editAnswerBtn"),
  questionEdit: document.querySelector("#questionEdit"),
  answerEdit: document.querySelector("#answerEdit"),
  deleteCardBtn: document.querySelector("#deleteCardBtn"),
  addCardBtn: document.querySelector("#addCardBtn"),
  knownStackCount: document.querySelector("#knownStackCount"),
  reviewStackCount: document.querySelector("#reviewStackCount"),
  mobileKnownCount: document.querySelector("#mobileKnownCount"),
  mobileReviewCount: document.querySelector("#mobileReviewCount"),
  mobileStackToggle: document.querySelector(".mobile-stack-toggle"),
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
  replayUncategorizedBtn: document.querySelector("#replayUncategorizedBtn"),
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
  el.themeBtn.textContent = theme === "dark" ? "Light" : "Dark";
  el.themeBtn.title = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  el.themeBtn.setAttribute("aria-label", el.themeBtn.title);
  configureMermaid(theme);
  if (state.cards[state.current]) showCard();
}

function resolveFontFamily(value) {
  return fontFamilyChoices[value] || value;
}

function styleValue(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key) ? String(source[key]) : styleDefaults[key];
}

function decimalPlaces(value) {
  const text = String(value);
  return text.includes(".") ? text.split(".")[1].length : 0;
}

function formatStyleNumber(value, step) {
  const precision = decimalPlaces(step || 1);
  const fixed = value.toFixed(precision);
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") || "0" : fixed;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeStyleValue(key, value) {
  const field = styleFieldByKey[key];
  const defaultValue = styleDefaults[key];
  const raw = String(value ?? defaultValue ?? "").trim();

  if (!field) return raw || defaultValue;

  if (field.type === "select") {
    return field.options.includes(raw) ? raw : defaultValue;
  }

  if (field.type !== "range") return raw || defaultValue;

  if (!raw) return defaultValue;
  if (!field.unit) return raw;

  const repeatedUnit = new RegExp(`^(-?\\d*\\.?\\d+)(${escapeRegExp(field.unit)})+$`, "i");
  const repeatedUnitMatch = raw.match(repeatedUnit);
  if (repeatedUnitMatch) return `${repeatedUnitMatch[1]}${field.unit}`;

  return /^-?\d*\.?\d+$/.test(raw) ? `${raw}${field.unit}` : raw;
}

function migrateLegacyStyleSettings(raw = {}) {
  const migrated = { ...raw };
  if (Object.prototype.hasOwnProperty.call(raw, "appMaxWidth")) migrated.appWidthPercent = "100";
  if (Object.prototype.hasOwnProperty.call(raw, "cardWidth")) migrated.cardWidthPercent = "96";
  if (Object.prototype.hasOwnProperty.call(raw, "cardMaxHeight")) migrated.cardMaxHeightPercent = "74";
  if (Object.prototype.hasOwnProperty.call(raw, "modalWidth")) migrated.modalWidthPercent = "60";
  if (Object.prototype.hasOwnProperty.call(raw, "textareaMinHeight")) migrated.markdownBoxHeightPercent = "30";
  if (Object.prototype.hasOwnProperty.call(raw, "questionFill")) migrated.questionFillPercent = String(raw.questionFill);
  if (Object.prototype.hasOwnProperty.call(raw, "answerFont")) migrated.answerFontSize = `${Math.round(Number(raw.answerFont) * 16)}px`;
  if (Object.prototype.hasOwnProperty.call(raw, "bodyFont")) migrated.baseFontSize = `${Math.round(Number(raw.bodyFont) * 16)}px`;
  if (Object.prototype.hasOwnProperty.call(raw, "lineHeight")) {
    migrated.baseLineHeight = String(raw.lineHeight);
    migrated.answerLineHeight = String(raw.lineHeight);
    migrated.questionLineHeight = String(raw.lineHeight);
  }
  if (Object.prototype.hasOwnProperty.call(raw, "cardPadding")) migrated.cardPadding = `${raw.cardPadding}px`;
  if (Object.prototype.hasOwnProperty.call(raw, "bodyFontSize")) migrated.baseFontSize = raw.bodyFontSize;
  if (Object.prototype.hasOwnProperty.call(raw, "bodyLineHeight")) migrated.baseLineHeight = raw.bodyLineHeight;
  if (Object.prototype.hasOwnProperty.call(raw, "cardFacePadding")) migrated.cardPadding = raw.cardFacePadding;
  if (Object.prototype.hasOwnProperty.call(raw, "cardFaceGap")) migrated.cardContentGap = raw.cardFaceGap;
  if (Object.prototype.hasOwnProperty.call(raw, "toolbarGap")) migrated.buttonGap = raw.toolbarGap;
  if (Object.prototype.hasOwnProperty.call(raw, "quizPanelPadding")) migrated.panelPadding = raw.quizPanelPadding;
  if (Object.prototype.hasOwnProperty.call(raw, "quizPanelRadius")) migrated.panelCornerRadius = raw.quizPanelRadius;
  if (Object.prototype.hasOwnProperty.call(raw, "cardRadius")) migrated.cardCornerRadius = raw.cardRadius;
  if (Object.prototype.hasOwnProperty.call(raw, "toolbarButtonRadius")) migrated.buttonCornerRadius = raw.toolbarButtonRadius;
  if (Object.prototype.hasOwnProperty.call(raw, "inputRadius")) migrated.inputCornerRadius = raw.inputRadius;
  if (Object.prototype.hasOwnProperty.call(raw, "actionButtonFontSize")) migrated.buttonFontSize = raw.actionButtonFontSize;
  if (Object.prototype.hasOwnProperty.call(raw, "brickGap")) migrated.stackCardGap = raw.brickGap;
  if (Object.prototype.hasOwnProperty.call(raw, "brickFontSize")) migrated.stackCardFontSize = raw.brickFontSize;
  if (Object.prototype.hasOwnProperty.call(raw, "brickLineHeight")) migrated.stackCardLineHeight = raw.brickLineHeight;
  return migrated;
}

function normalizeStyleSettings(raw = {}) {
  const source = migrateLegacyStyleSettings(raw || {});
  return Object.keys(styleDefaults).reduce((normalized, key) => {
    normalized[key] = normalizeStyleValue(key, styleValue(source, key));
    return normalized;
  }, {});
}

function setStyleStatus(message) {
  if (el.styleSyncStatus) el.styleSyncStatus.textContent = message;
}

function renderStyleControls() {
  if (!el.styleControls || el.styleControls.dataset.rendered === "true") return;
  const themeField = el.styleControls.querySelector(".style-field");
  el.styleControls.innerHTML = "";
  if (themeField) el.styleControls.appendChild(themeField);

  styleControlGroups.forEach((group, groupIndex) => {
    const section = document.createElement("details");
    section.className = "style-section";
    section.name = "style-accordion";
    section.open = groupIndex === 0;
    section.addEventListener("toggle", () => {
      if (section.open) {
        el.styleControls.querySelectorAll("details").forEach((node) => {
          if (node !== section) node.open = false;
        });
      }
    });

    const heading = document.createElement("summary");
    heading.textContent = group.title;
    section.appendChild(heading);

    const body = document.createElement("div");
    body.className = "style-section-body";

    group.fields.forEach((field) => {
      const label = document.createElement("label");
      label.className = "style-field";

      const name = document.createElement("span");
      name.textContent = field.label;
      label.appendChild(name);

      let control;
      if (field.type === "select") {
        control = document.createElement("select");
        field.options.forEach((value) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value.charAt(0).toUpperCase() + value.slice(1);
          control.appendChild(option);
        });
        control.dataset.styleKey = field.key;
        label.appendChild(control);
      } else if (field.type === "range") {
        const rangeRow = document.createElement("div");
        rangeRow.className = "style-range-row";

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = String(field.min);
        slider.max = String(field.max);
        slider.step = String(field.step);
        slider.dataset.styleSlider = field.key;
        slider.dataset.unit = field.unit || "";
        rangeRow.appendChild(slider);

        control = document.createElement("input");
        control.type = "text";
        control.spellcheck = false;
        control.placeholder = styleDefaults[field.key] || "";
        control.dataset.styleKey = field.key;
        control.dataset.unit = field.unit || "";
        rangeRow.appendChild(control);
        label.appendChild(rangeRow);
      } else {
        control = document.createElement("input");
        control.type = "text";
        control.spellcheck = false;
        control.placeholder = styleDefaults[field.key] || "";
        control.dataset.styleKey = field.key;
        label.appendChild(control);
      }

      const hint = document.createElement("small");
      hint.textContent = field.hint;
      label.appendChild(hint);

      body.appendChild(label);
    });

    section.appendChild(body);
    el.styleControls.appendChild(section);
  });

  el.styleControls.dataset.rendered = "true";
}

function numericStyleValue(value) {
  const number = parseFloat(String(value ?? "").match(/-?\d*\.?\d+/)?.[0] ?? "");
  return Number.isFinite(number) ? number : null;
}

function sliderTextValue(slider) {
  return `${slider.value}${slider.dataset.unit || ""}`;
}

function syncSliderFromText(input) {
  const slider = el.styleControls?.querySelector(`[data-style-slider="${input.dataset.styleKey}"]`);
  if (!slider) return;
  const number = numericStyleValue(input.value);
  if (number !== null) slider.value = String(number);
}

function updateStyleControls() {
  const settings = normalizeStyleSettings(state.styleSettings);
  renderStyleControls();
  el.styleControls?.querySelectorAll("[data-style-key]").forEach((input) => {
    input.value = settings[input.dataset.styleKey] ?? "";
    syncSliderFromText(input);
  });
}

function applyStyleSettings(rawSettings, options = {}) {
  const settings = normalizeStyleSettings(rawSettings);
  state.styleSettings = settings;
  const appWidthPercent = numericStyleValue(settings.appWidthPercent) ?? 100;
  const appHeightPercent = numericStyleValue(settings.appHeightPercent) ?? 100;
  const sidePanelWidthPercent = numericStyleValue(settings.sidePanelWidthPercent) ?? 16;
  const cardWidthPercent = numericStyleValue(settings.cardWidthPercent) ?? 96;
  const cardMaxHeightPercent = numericStyleValue(settings.cardMaxHeightPercent) ?? 74;
  const modalWidthPercent = numericStyleValue(settings.modalWidthPercent) ?? 60;
  const markdownBoxHeightPercent = numericStyleValue(settings.markdownBoxHeightPercent) ?? 30;

  const root = document.documentElement;
  root.style.setProperty("--app-font-family", resolveFontFamily(settings.fontFamily));
  root.style.setProperty("--question-font-family", resolveFontFamily(settings.questionFontFamily));
  root.style.setProperty("--answer-font-family", resolveFontFamily(settings.answerFontFamily));
  root.style.setProperty("--question-justify-items", questionJustifyItems(settings.questionAlign));
  Object.entries(styleCssVariables).forEach(([key, cssVariable]) => {
    if (key === "questionFontFamily" || key === "answerFontFamily") return;
    root.style.setProperty(cssVariable, settings[key]);
  });
  root.style.setProperty("--question-fill", `${settings.questionFillPercent}%`);
  root.style.setProperty("--app-width", `${appWidthPercent}vw`);
  root.style.setProperty("--app-height", `${appHeightPercent}vh`);
  root.style.setProperty("--app-mobile-width", `${appWidthPercent}vw`);
  root.style.setProperty("--app-mobile-height", `${appHeightPercent}dvh`);
  root.style.setProperty("--side-panel-width", `${sidePanelWidthPercent}%`);
  root.style.setProperty("--card-width", `${cardWidthPercent}%`);
  root.style.setProperty("--card-mobile-width", `${cardWidthPercent}%`);
  root.style.setProperty("--card-max-height", `${cardMaxHeightPercent}vh`);
  root.style.setProperty("--card-mobile-max-height", `${cardMaxHeightPercent}dvh`);
  root.style.setProperty("--modal-width", `${modalWidthPercent}vw`);
  root.style.setProperty("--textarea-min-height", `${markdownBoxHeightPercent}vh`);

  updateStyleControls();
  scheduleLiveQuestionFit();
  if (options.force) forceStyleRefresh();

  return settings;
}

function loadLocalStyleSettings() {
  clearBrowserPersistence();
  return normalizeStyleSettings();
}

function hasMeaningfulStyleSettings(settings) {
  return Boolean(settings && typeof settings === "object" && Object.keys(settings).length > 0);
}

function questionJustifyItems(align) {
  if (align === "right") return "end";
  if (align === "center") return "center";
  if (align === "justify") return "stretch";
  return "start";
}

function styleSettingsFromControls() {
  const settings = {};
  el.styleControls?.querySelectorAll("[data-style-key]").forEach((input) => {
    settings[input.dataset.styleKey] = input.value;
  });
  return normalizeStyleSettings(settings);
}

function handleStyleControlChange() {
  state.styleTouched = true;
  applyStyleSettings(styleSettingsFromControls());
  setStyleStatus("Unsynced local style");
}

function forceStyleRefresh() {
  [el.questionView, el.answerView].forEach((node) => {
    if (!node) return;
    node.style.fontSize = "";
    node.style.transform = "";
    node.style.width = "";
    node.style.removeProperty("--question-fit-font-size");
  });
  scheduleLiveQuestionFit();
  requestAnimationFrame(() => {
    scheduleLiveQuestionFit();
    if (!el.allCardsPanel?.hidden) renderAllCards();
  });
}

function applyCurrentStyleSettings(statusMessage = "Style applied") {
  state.styleTouched = true;
  applyStyleSettings(styleSettingsFromControls(), { force: true });
  if (state.previewCard || state.cards[state.current]) {
    showCard();
  }
  setStyleStatus(statusMessage);
}

function lockPageScroll() {
  if (document.documentElement.classList.contains("modal-scroll-lock")) return;
  state.stylePanelScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.top = `-${state.stylePanelScrollY}px`;
  document.documentElement.classList.add("modal-scroll-lock");
  document.body.classList.add("modal-scroll-lock");
}

function unlockPageScroll() {
  if (!document.documentElement.classList.contains("modal-scroll-lock")) return;
  const scrollY = state.stylePanelScrollY || 0;
  document.documentElement.classList.remove("modal-scroll-lock");
  document.body.classList.remove("modal-scroll-lock");
  document.body.style.top = "";
  window.scrollTo(0, scrollY);
}

function openStylePanel() {
  lockPageScroll();
  el.stylePanel.hidden = false;
  updateStyleControls();
}

function closeStylePanel() {
  el.stylePanel.hidden = true;
  unlockPageScroll();
}

async function loadStyleFromWeb() {
  if (!supabaseClient) {
    setStyleStatus("Local style");
    return;
  }

  setStyleStatus("Loading synced style...");
  try {
    const { data, error } = await supabaseClient
      .from("app_style_settings")
      .select("settings, updated_at")
      .eq("id", "global")
      .maybeSingle();

    if (error) throw error;
    if (!hasMeaningfulStyleSettings(data?.settings)) {
      setStyleStatus("No synced style yet");
      return;
    }
    if (state.styleTouched) {
      setStyleStatus("Unsynced local style");
      return;
    }

    applyStyleSettings(data.settings, { force: true });
    state.styleTouched = false;
    setStyleStatus(data.updated_at ? `Loaded ${new Date(data.updated_at).toLocaleString()}` : "Loaded synced style");
  } catch (error) {
    console.warn("Could not load synced style", error);
    setStyleStatus("Style sync table not ready");
  }
}

async function syncStyleToWeb() {
  if (!supabaseClient) {
    setStyleStatus("Supabase unavailable");
    setStatus("Supabase is not available for style sync.", "error");
    return;
  }

  const syncBtn = el.syncStyleBtn;
  state.styleTouched = true;
  const settings = applyStyleSettings(styleSettingsFromControls(), { force: true });
  syncBtn.disabled = true;
  setStyleStatus("Syncing style...");
  try {
    const { error } = await supabaseClient
      .from("app_style_settings")
      .upsert({
        id: "global",
        settings,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (error) throw error;
    state.styleTouched = false;
    setStyleStatus("Style synced");
    setStatus("Style synced to web.");
  } catch (error) {
    console.error("Failed to sync style", error);
    setStyleStatus("Sync failed");
    setStatus("Failed to sync style. Create the app_style_settings table first.", "error");
  } finally {
    syncBtn.disabled = false;
  }
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
    setStatus("Deck title updated in the cloud.");
  } catch (error) {
    console.error("Failed to update web deck title", error);
    setStatus("Deck title updated locally, but cloud rename failed.", "error");
  }
}

function openImportPanel() {
  lockPageScroll();
  el.importPanel.classList.add("is-open");
}

function openWebDecksPanel() {
  const panel = document.getElementById("webDecksPanel");
  if (!panel) return;

  lockPageScroll();
  panel.hidden = false;
}

function closeImportPanel() {
  if (state.cards.length) {
    el.importPanel.classList.remove("is-open");
    unlockPageScroll();
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

function uncategorizedCards() {
  return state.masterCards.filter((card) => !state.statusById[card.id]);
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
  scheduleLiveQuestionFit();
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
  lockPageScroll();
  el.diagramModalBody.innerHTML = node.innerHTML;
  el.diagramModal.hidden = false;
  requestAnimationFrame(() => {
    const body = el.diagramModalBody;
    body.scrollLeft = Math.max(0, (body.scrollWidth - body.clientWidth) / 2);
    body.scrollTop = Math.max(0, (body.scrollHeight - body.clientHeight) / 2);
  });
}

function closeDiagramModal() {
  el.diagramModal.hidden = true;
  el.diagramModalBody.innerHTML = "";
  el.diagramModalBody.classList.remove("is-panning");
  state.diagramPanPointerId = null;
  unlockPageScroll();
}

function closeAllCardsPanel() {
  allCardsRenderId += 1;
  el.allCardsPanel.hidden = true;
  unlockPageScroll();
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

function createBlankCard() {
  return { id: 'card-' + Date.now(), question: 'New Question', answer: 'New Answer' };
}

function refreshAllCardsAround(cardId, side = "question") {
  allCardsRenderId += 1;
  const renderId = allCardsRenderId;
  return renderAllCards().then(async () => {
    if (renderId !== allCardsRenderId) return null;
    const item = Array.from(el.allCardsList.querySelectorAll(".all-card"))
      .find((node) => node.dataset.cardId === cardId);
    if (item && side === "answer") {
      item.classList.add("is-flipped");
      await ensureAllCardAnswer(item);
    }
    if (item) updateAllCardEditButton(item);
    item?.scrollIntoView({ block: "nearest" });
    item?.focus({ preventScroll: true });
    return item || null;
  });
}

function insertCardAfter(cardId) {
  if (!state.masterCards.length && !state.deckTitle) {
    setStatus("Create a new deck or import one first.", "error");
    return;
  }

  const insertAfterIndex = state.masterCards.findIndex((card) => card.id === cardId);
  if (insertAfterIndex < 0) return;

  const currentCardId = state.cards[state.current]?.id || null;
  const shouldRefreshActiveDeck = activeDeckMatchesMasterOrder();
  const newCard = createBlankCard();
  state.masterCards.splice(insertAfterIndex + 1, 0, newCard);

  if (shouldRefreshActiveDeck) {
    state.cards = state.masterCards.slice();
    state.current = currentCardId
      ? Math.max(0, state.cards.findIndex((item) => item.id === currentCardId))
      : 0;
  }

  state.previewCard = null;
  savePersistedDeck();
  updateMeta();
  showCard();
  refreshAllCardsAround(newCard.id).then((item) => {
    if (item) openAllCardEditor(item, "question");
  });
  setStatus(state.deckId ? "Card inserted locally. Sync to update the web deck." : "Card inserted.");
}

function activeDeckMatchesMasterOrder() {
  if (state.cards.length !== state.masterCards.length) return false;
  return state.cards.every((card, index) => card.id === state.masterCards[index]?.id);
}

function clearAllCardDropTargets() {
  el.allCardsList.querySelectorAll(".all-card").forEach((item) => {
    item.classList.remove("is-dragging", "drop-before", "drop-after");
  });
}

function finishMasterCardReorder(cardId, shouldRefreshActiveDeck, currentCardId) {
  if (shouldRefreshActiveDeck) {
    state.cards = state.masterCards.slice();
    state.current = currentCardId
      ? Math.max(0, state.cards.findIndex((item) => item.id === currentCardId))
      : Math.min(state.current, Math.max(state.cards.length - 1, 0));
  }

  state.previewCard = null;
  syncResults();
  savePersistedDeck();
  updateMeta();
  showCard();

  allCardsRenderId += 1;
  const renderId = allCardsRenderId;
  renderAllCards().then(() => {
    if (renderId !== allCardsRenderId) return;
    const movedItem = Array.from(el.allCardsList.querySelectorAll(".all-card"))
      .find((item) => item.dataset.cardId === cardId);
    movedItem?.scrollIntoView({ block: "nearest" });
    movedItem?.focus({ preventScroll: true });
  });
  setStatus(state.deckId ? "Card order updated locally. Sync to update the web deck." : "Card order updated.");
}

function reorderMasterCard(cardId, targetCardId, placement) {
  if (!cardId || !targetCardId || cardId === targetCardId) return;

  const fromIndex = state.masterCards.findIndex((card) => card.id === cardId);
  const targetIndex = state.masterCards.findIndex((card) => card.id === targetCardId);

  if (fromIndex < 0 || targetIndex < 0) return;

  const currentCardId = state.cards[state.current]?.id || null;
  const shouldRefreshActiveDeck = activeDeckMatchesMasterOrder();
  const [card] = state.masterCards.splice(fromIndex, 1);
  let insertIndex = targetIndex + (placement === "after" ? 1 : 0);
  if (fromIndex < insertIndex) insertIndex -= 1;
  insertIndex = Math.min(Math.max(insertIndex, 0), state.masterCards.length);

  if (insertIndex === fromIndex) {
    state.masterCards.splice(fromIndex, 0, card);
    return;
  }

  state.masterCards.splice(insertIndex, 0, card);
  finishMasterCardReorder(cardId, shouldRefreshActiveDeck, currentCardId);
}

function allCardDropPlacement(item, event) {
  const rect = item.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
}

function markAllCardDropTarget(item, placement) {
  clearAllCardDropTargets();
  item.classList.add(placement === "after" ? "drop-after" : "drop-before");
  const draggedItem = Array.from(el.allCardsList.querySelectorAll(".all-card"))
    .find((node) => node.dataset.cardId === draggedAllCardId);
  draggedItem?.classList.add("is-dragging");
}

function handleAllCardDragStart(event) {
  const item = closestElement(event.target, ".all-card");
  if (!item || closestElement(event.target, "button, a, input, textarea")) {
    event.preventDefault();
    return;
  }

  draggedAllCardId = item.dataset.cardId;
  item.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedAllCardId);
}

function handleAllCardDragOver(event) {
  if (!draggedAllCardId) return;
  const item = closestElement(event.target, ".all-card");
  if (!item) return;
  if (item.dataset.cardId === draggedAllCardId) {
    clearAllCardDropTargets();
    item.classList.add("is-dragging");
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  markAllCardDropTarget(item, allCardDropPlacement(item, event));
}

function handleAllCardDrop(event) {
  if (!draggedAllCardId) return;
  const item = closestElement(event.target, ".all-card");
  if (!item || item.dataset.cardId === draggedAllCardId) return;

  event.preventDefault();
  const placement = allCardDropPlacement(item, event);
  const droppedCardId = draggedAllCardId;
  draggedAllCardId = "";
  clearAllCardDropTargets();
  reorderMasterCard(droppedCardId, item.dataset.cardId, placement);
}

function handleAllCardDragEnd() {
  draggedAllCardId = "";
  clearAllCardDropTargets();
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

function allCardById(cardId) {
  return state.masterCards.find((card) => card.id === cardId) || null;
}

function closeAllCardEditor(item) {
  const editor = item?.querySelector(".all-card-editor");
  if (!editor) return;
  editor.hidden = true;
  editor.dataset.side = "";
  item.classList.remove("is-editing");
  item.draggable = true;
  updateAllCardEditButton(item);
}

function closeAllCardEditors(exceptItem = null) {
  el.allCardsList.querySelectorAll(".all-card.is-editing").forEach((item) => {
    if (item !== exceptItem) closeAllCardEditor(item);
  });
}

function allCardVisibleSide(item) {
  return item?.classList.contains("is-flipped") ? "answer" : "question";
}

function updateAllCardEditButton(item) {
  const button = item?.querySelector("[data-all-edit-current]");
  if (!button) return;
  const editing = item.classList.contains("is-editing");
  const side = editing
    ? item.querySelector(".all-card-editor")?.dataset.side || allCardVisibleSide(item)
    : allCardVisibleSide(item);
  button.innerHTML = editing ? "&#128190;" : "&#9998;";
  button.classList.toggle("is-saving", editing);
  button.title = editing
    ? `Save ${side}`
    : `Edit ${side}`;
  button.setAttribute("aria-label", button.title);
}

function openAllCardEditor(item, side = allCardVisibleSide(item)) {
  const card = allCardById(item?.dataset.cardId);
  const editor = item?.querySelector(".all-card-editor");
  if (!card || !editor) return;

  closeAllCardEditors(item);
  item.classList.add("is-editing");
  item.draggable = false;
  editor.hidden = false;
  editor.dataset.side = side;
  editor.querySelector("[data-all-edit-label]").textContent = side === "answer" ? "Answer" : "Question";
  editor.querySelector("[data-all-edit-value]").value = side === "answer" ? card.answer : card.question;
  updateAllCardEditButton(item);
  editor.querySelector("[data-all-edit-value]").focus();
}

function toggleAllCardEditor(item) {
  if (!item) return;
  const editor = item.querySelector(".all-card-editor");
  if (item.classList.contains("is-editing")) {
    saveAllCardEditor(item);
    return;
  }
  openAllCardEditor(item, allCardVisibleSide(item));
}

function saveAllCardEditor(item) {
  const card = allCardById(item?.dataset.cardId);
  const editor = item?.querySelector(".all-card-editor");
  if (!card || !editor) return;

  const side = editor.dataset.side === "answer" ? "answer" : "question";
  const value = editor.querySelector("[data-all-edit-value]").value.trim();

  if (!value) {
    setStatus(`${side === "answer" ? "Answer" : "Question"} cannot be empty.`, "error");
    return;
  }

  card[side] = value;
  savePersistedDeck();
  updateMeta();
  if (state.cards[state.current]?.id === card.id || state.previewCard?.id === card.id) {
    showCard();
  }

  refreshAllCardsAround(card.id, side);
  setStatus(state.deckId ? "Card updated locally. Sync to update the web deck." : "Card updated.");
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
  if (item.classList.contains("is-editing")) return;
  const willShowAnswer = !item.classList.contains("is-flipped");
  item.classList.toggle("is-flipped", willShowAnswer);
  if (willShowAnswer) ensureAllCardAnswer(item);
  updateAllCardEditButton(item);
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
    item.draggable = true;
    item.dataset.cardId = card.id;
    item.dataset.status = state.statusById[card.id] || "";
    item.dataset.answerRendered = "false";
    item.cardData = card;
    item.innerHTML = `
      <div class="all-card-top">
        <span class="all-card-index">${index + 1}</span>
        <div class="all-card-actions" aria-label="Card controls">
          <button class="all-card-add" type="button" data-all-add-after title="Insert card after this one" aria-label="Insert card after this one">+</button>
          <button class="all-card-edit" type="button" data-all-edit-current title="Edit question" aria-label="Edit question">&#9998;</button>
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
    const editor = document.createElement("div");
    editor.className = "all-card-editor";
    editor.hidden = true;
    editor.innerHTML = `
      <label>
        <span data-all-edit-label>Question</span>
        <textarea data-all-edit-value spellcheck="false"></textarea>
      </label>
    `;
    item.appendChild(editor);
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

  lockPageScroll();
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
  if (el.mobileKnownCount) el.mobileKnownCount.textContent = state.known;
  if (el.mobileReviewCount) el.mobileReviewCount.textContent = state.review;
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
  el.replayUncategorizedBtn.disabled = uncategorizedCards().length === 0;
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
    el.questionView.style.fontSize = "";
    el.questionView.style.width = "";
    el.questionView.style.removeProperty("--question-fit-font-size");
    updateMeta();
    return;
  }

  await renderMarkdown(el.questionView, card.question);
  await renderMarkdown(el.answerView, card.answer);
  scheduleLiveQuestionFit();
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
      : scope === "uncategorized"
        ? uncategorizedCards()
        : state.masterCards.slice();

  if (!selected.length) {
    setStatus(scope === "uncategorized" ? "No uncategorized cards to replay." : `No ${scope} cards to replay.`, "error");
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
  if (scope === "uncategorized") return `${base} - uncategorized`;
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

function clearBrowserPersistence() {
  try {
    localStorage.removeItem(deckStorageKey);
    localStorage.removeItem(styleStorageKey);
    localStorage.removeItem(themeStorageKey);
  } catch (error) {
    console.warn("Could not clear browser persistence", error);
  }
}

function savePersistedDeck() {
  clearBrowserPersistence();
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
  clearBrowserPersistence();
  return false;
}

function cardsForScope(scope) {
  syncResults();
  if (scope === "known") return state.results.known;
  if (scope === "review") return state.results.review;
  if (scope === "uncategorized") return uncategorizedCards();
  return state.masterCards.length ? state.masterCards : state.cards;
}

function exportMarkdown(scope = "all") {
  const cards = cardsForScope(scope);
  const title = scope === "known" ? "Known" : scope === "review" ? "Review" : scope === "uncategorized" ? "Uncategorized" : "All Cards";
  const uncategorized = uncategorizedCards();
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
    scope === "all" ? formatCardList("Uncategorized", uncategorized) : null
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

function fitLiveQuestion() {
  const node = el.questionView;
  const face = node?.closest(".card-question");
  if (!node) return;

  node.style.fontSize = "";
  node.style.transform = "";
  node.style.width = "";
  node.style.removeProperty("--question-fit-font-size");

  if (!face || !node.textContent.trim()) return;
  if (face.clientHeight <= 0 || face.clientWidth <= 0) return;

  const settings = normalizeStyleSettings(state.styleSettings);
  const faceStyle = getComputedStyle(face);
  const paddingY = (parseFloat(faceStyle.paddingTop) || 0) + (parseFloat(faceStyle.paddingBottom) || 0);
  const paddingX = (parseFloat(faceStyle.paddingLeft) || 0) + (parseFloat(faceStyle.paddingRight) || 0);
  const rowGap = parseFloat(faceStyle.rowGap || faceStyle.gap) || 0;
  const visibleItems = Array.from(face.children).filter((child) => {
    if (child === node || child.hidden) return child === node;
    return getComputedStyle(child).display !== "none";
  });
  const occupiedHeight = visibleItems.reduce((total, child) => {
    if (child === node) return total;
    const childStyle = getComputedStyle(child);
    return total
      + child.getBoundingClientRect().height
      + (parseFloat(childStyle.marginTop) || 0)
      + (parseFloat(childStyle.marginBottom) || 0);
  }, 0);
  const gapHeight = Math.max(visibleItems.length - 1, 0) * rowGap;
  const lineHeight = parseFloat(settings.questionLineHeight) || parseFloat(styleDefaults.questionLineHeight) || 1.18;
  const fillRatio = Math.min(Math.max((parseFloat(settings.questionFillPercent) || parseFloat(styleDefaults.questionFillPercent)) / 100, 0.1), 0.95);
  const availableHeight = Math.max(face.clientHeight - paddingY - occupiedHeight - gapHeight, 1);
  const availableWidth = Math.max(face.clientWidth - paddingX, 1);
  const targetHeight = Math.max(availableHeight * fillRatio, 1);
  const searchCeiling = Math.max(16, Math.min(360, targetHeight / Math.max(lineHeight, 0.1) * 2.2, availableWidth * 1.6));
  let low = 1;
  let high = searchCeiling;
  let best = low;

  if (node.clientWidth <= 0) node.style.width = `${availableWidth}px`;

  const questionContentSize = () => {
    const children = Array.from(node.children).filter((child) => getComputedStyle(child).display !== "none");
    if (!children.length) {
      const nodeStyle = getComputedStyle(node);
      return {
        width: Math.min(node.scrollWidth, Math.max(node.clientWidth, availableWidth)),
        height: parseFloat(nodeStyle.lineHeight) || node.scrollHeight
      };
    }

    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    let left = Infinity;
    let width = 0;

    children.forEach((child) => {
      const childStyle = getComputedStyle(child);
      const rect = child.getBoundingClientRect();
      const marginTop = parseFloat(childStyle.marginTop) || 0;
      const marginRight = parseFloat(childStyle.marginRight) || 0;
      const marginBottom = parseFloat(childStyle.marginBottom) || 0;
      const marginLeft = parseFloat(childStyle.marginLeft) || 0;
      top = Math.min(top, rect.top - marginTop);
      right = Math.max(right, rect.right + marginRight);
      bottom = Math.max(bottom, rect.bottom + marginBottom);
      left = Math.min(left, rect.left - marginLeft);
      width = Math.max(width, rect.width + marginLeft + marginRight, child.scrollWidth + marginLeft + marginRight);
    });

    return {
      width: Math.max(width, right - left),
      height: Math.max(0, bottom - top)
    };
  };

  const fits = () => {
    const contentSize = questionContentSize();
    return contentSize.width <= Math.max(node.clientWidth, availableWidth) + 1
      && node.scrollWidth <= availableWidth + 1
      && contentSize.height <= targetHeight + 1
      && contentSize.height <= availableHeight + 1;
  };

  for (let index = 0; index < 14; index += 1) {
    const mid = (low + high) / 2;
    node.style.setProperty("--question-fit-font-size", `${mid}px`);
    if (fits()) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  node.style.setProperty("--question-fit-font-size", `${Math.max(1, best - 0.5)}px`);
}

function scheduleLiveQuestionFit() {
  cancelAnimationFrame(liveQuestionFitFrame);
  liveQuestionFitFrame = requestAnimationFrame(() => {
    liveQuestionFitFrame = requestAnimationFrame(fitLiveQuestion);
  });
}

function fitPrintNode(node) {
  node.style.transform = "";
  node.style.width = "";

  const shouldGrow = node.classList.contains("fit-question");
  const settings = normalizeStyleSettings(state.styleSettings);
  const answerFontSize = parseFloat(settings.answerFontSize) || parseFloat(styleDefaults.answerFontSize);
  const fillRatio = Math.min(Math.max((parseFloat(settings.questionFillPercent) || parseFloat(styleDefaults.questionFillPercent)) / 100, 0.1), 0.95);
  const lineHeight = parseFloat(settings.questionLineHeight) || parseFloat(styleDefaults.questionLineHeight) || 1.18;
  const questionUpper = Math.max(8, Math.min(220, node.clientHeight * fillRatio / Math.max(lineHeight, 0.1), Math.max(node.clientWidth, 1)));

  if (!shouldGrow && contentFits(node)) return;

  let low = 4;
  let high = shouldGrow ? questionUpper : Math.max(4, answerFontSize);
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

  node.style.fontSize = `${Math.max(low, best - 0.5)}px`;

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
  const title = scope === "known" ? "Known Cards" : scope === "review" ? "Review Cards" : scope === "uncategorized" ? "Uncategorized Cards" : "All Cards";
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

function isHorizontallyScrollable(node) {
  if (!(node instanceof Element)) return false;
  const styles = window.getComputedStyle(node);
  const allowsHorizontalScroll = !["hidden", "clip", "visible"].includes(styles.overflowX);
  return allowsHorizontalScroll && node.scrollWidth > node.clientWidth + 2;
}

function horizontalScrollRegion(target) {
  let node = target instanceof Element ? target : target?.parentElement;

  while (node && node !== el.card) {
    if (isHorizontallyScrollable(node)) {
      return node;
    }
    node = node.parentElement;
  }

  return null;
}

function isHorizontalScrollTarget(target) {
  return Boolean(horizontalScrollRegion(target));
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
  if (event?.pointerType === "mouse" && hasCardTextSelection()) {
    if (state.dragCaptured && typeof state.dragPointerId === "number") {
      el.card.releasePointerCapture?.(state.dragPointerId);
    }
    resetCardDrag();
    return;
  }

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
      if (event.pointerType !== "mouse" || !hasCardTextSelection()) {
        el.card.setPointerCapture?.(event.pointerId);
        state.dragCaptured = true;
      }
    }
    el.card.classList.add("is-dragging");
  }

  if (event?.cancelable && typeof event.preventDefault === "function") {
    if (event.pointerType !== "mouse" || state.dragCaptured) {
      event.preventDefault();
    }
  }

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
  if (isHorizontalScrollTarget(event.target)) return;
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
  if (isHorizontalScrollTarget(event.target)) return;
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

function preventCancelableScroll(event) {
  if (event.cancelable && typeof event.preventDefault === "function") {
    event.preventDefault();
  }
}

function styleScrollRegion(target) {
  return closestElement(target, ".style-grid, .all-cards-list, .import-card, .web-decks-table-wrap, .diagram-modal-body");
}

function canScrollStyleRegion(region) {
  return Boolean(region && region.scrollHeight > region.clientHeight + 1);
}

function isStyleRegionAtTop(region) {
  return region.scrollTop <= 0;
}

function isStyleRegionAtBottom(region) {
  return region.scrollTop + region.clientHeight >= region.scrollHeight - 1;
}

function containStylePanelScroll(event, deltaY) {
  const region = styleScrollRegion(event.target);
  if (!region || !canScrollStyleRegion(region)) {
    preventCancelableScroll(event);
    return;
  }

  if ((deltaY < 0 && isStyleRegionAtTop(region)) || (deltaY > 0 && isStyleRegionAtBottom(region))) {
    preventCancelableScroll(event);
  }
}

function handleStylePanelTouchStart(event) {
  const point = event.touches?.[0];
  state.stylePanelTouchY = point ? point.clientY : 0;
}

function handleStylePanelTouchMove(event) {
  if (event.touches?.length !== 1) return;
  if (closestElement(event.target, "input[type='range']")) return;

  const point = event.touches[0];
  const previousY = state.stylePanelTouchY || point.clientY;
  const deltaY = previousY - point.clientY;
  state.stylePanelTouchY = point.clientY;
  containStylePanelScroll(event, deltaY);
}

function handleStylePanelWheel(event) {
  containStylePanelScroll(event, event.deltaY);
}

function handleDiagramPanStart(event) {
  if (event.button !== 0 || event.target.closest("button, a")) return;
  const body = el.diagramModalBody;
  if (!body || body.scrollWidth <= body.clientWidth && body.scrollHeight <= body.clientHeight) return;

  state.diagramPanPointerId = event.pointerId;
  state.diagramPanStartX = event.clientX;
  state.diagramPanStartY = event.clientY;
  state.diagramPanScrollLeft = body.scrollLeft;
  state.diagramPanScrollTop = body.scrollTop;
  body.classList.add("is-panning");
  body.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function handleDiagramPanMove(event) {
  if (state.diagramPanPointerId !== event.pointerId) return;
  const body = el.diagramModalBody;
  body.scrollLeft = state.diagramPanScrollLeft - (event.clientX - state.diagramPanStartX);
  body.scrollTop = state.diagramPanScrollTop - (event.clientY - state.diagramPanStartY);
  event.preventDefault();
}

function stopDiagramPan(event) {
  if (state.diagramPanPointerId !== event.pointerId) return;
  el.diagramModalBody.releasePointerCapture?.(event.pointerId);
  el.diagramModalBody.classList.remove("is-panning");
  state.diagramPanPointerId = null;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

function setDeckMenuOpen(open) {
  if (!el.deckMenu || !el.deckMenuBtn) return;
  el.deckMenu.hidden = !open;
  el.deckMenuBtn.setAttribute("aria-expanded", String(open));
}

function closeDeckMenu() {
  setDeckMenuOpen(false);
}

function createNewDeck() {
  closeDeckMenu();
  if (state.masterCards.length > 0) {
    if (!confirm("Create a new deck? Unsaved local progress will be lost.")) return;
  }

  state.deckId = null;
  state.deckTitle = "New Deck";
  state.sourceTitle = "New Deck";
  state.importTitleHint = "New Deck";
  state.masterCards = [createBlankCard()];
  state.cards = [...state.masterCards];
  state.current = 0;
  resetResults();
  savePersistedDeck();
  closeImportPanel();
  closeAllCardsPanel();
  showCard();
  setStatus("Created new deck.");
}



if (document.getElementById("closeWebDecksBtn")) {
  document.getElementById("closeWebDecksBtn").addEventListener("click", () => {
    document.getElementById("webDecksPanel").hidden = true;
    unlockPageScroll();
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
if (el.deckMenuBtn) {
  el.deckMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    el.exportMenu.hidden = true;
    setDeckMenuOpen(el.deckMenu.hidden);
  });
}
el.importBtn.addEventListener("click", () => {
  closeDeckMenu();
  openImportPanel();
});
el.webDecksBtn.addEventListener("click", () => {
  closeDeckMenu();
  openWebDecksPanel();
});
el.openWebDecksFromImportBtn.addEventListener("click", openWebDecksPanel);
el.closeImportBtn.addEventListener("click", closeImportPanel);
el.editDeckTitleBtn.addEventListener("click", editCurrentDeckTitle);
el.styleBtn.addEventListener("click", openStylePanel);
el.closeStyleBtn.addEventListener("click", closeStylePanel);
el.applyStyleBtn.addEventListener("click", () => applyCurrentStyleSettings());
el.syncStyleBtn.addEventListener("click", syncStyleToWeb);
el.resetStyleBtn.addEventListener("click", () => {
  state.styleTouched = true;
  applyStyleSettings(styleDefaults, { force: true });
  setStyleStatus("Reset locally");
});
el.styleControls.addEventListener("input", (event) => {
  if (event.target.matches("[data-style-slider]")) {
    const input = el.styleControls.querySelector(`[data-style-key="${event.target.dataset.styleSlider}"]`);
    if (input) input.value = sliderTextValue(event.target);
    handleStyleControlChange();
  }
  if (event.target.matches("[data-style-key]")) {
    syncSliderFromText(event.target);
    handleStyleControlChange();
  }
});
el.styleControls.addEventListener("change", (event) => {
  if (event.target.matches("[data-style-key]")) {
    syncSliderFromText(event.target);
    handleStyleControlChange();
  }
});
el.stylePanel.addEventListener("touchstart", handleStylePanelTouchStart, { passive: true });
el.stylePanel.addEventListener("touchmove", handleStylePanelTouchMove, { passive: false });
el.stylePanel.addEventListener("wheel", handleStylePanelWheel, { passive: false });

el.allCardsPanel.addEventListener("touchstart", handleStylePanelTouchStart, { passive: true });
el.allCardsPanel.addEventListener("touchmove", handleStylePanelTouchMove, { passive: false });
el.allCardsPanel.addEventListener("wheel", handleStylePanelWheel, { passive: false });

el.importPanel.addEventListener("touchstart", handleStylePanelTouchStart, { passive: true });
el.importPanel.addEventListener("touchmove", handleStylePanelTouchMove, { passive: false });
el.importPanel.addEventListener("wheel", handleStylePanelWheel, { passive: false });

document.getElementById("webDecksPanel").addEventListener("touchstart", handleStylePanelTouchStart, { passive: true });
document.getElementById("webDecksPanel").addEventListener("touchmove", handleStylePanelTouchMove, { passive: false });
document.getElementById("webDecksPanel").addEventListener("wheel", handleStylePanelWheel, { passive: false });

el.diagramModal.addEventListener("touchstart", handleStylePanelTouchStart, { passive: true });
el.diagramModal.addEventListener("touchmove", handleStylePanelTouchMove, { passive: false });
el.diagramModal.addEventListener("wheel", handleStylePanelWheel, { passive: false });
el.diagramModalBody.addEventListener("pointerdown", handleDiagramPanStart);
el.diagramModalBody.addEventListener("pointermove", handleDiagramPanMove);
el.diagramModalBody.addEventListener("pointerup", stopDiagramPan);
el.diagramModalBody.addEventListener("pointercancel", stopDiagramPan);

el.allCardsBtn.addEventListener("click", openAllCardsPanel);
el.closeAllCardsBtn.addEventListener("click", closeAllCardsPanel);
el.allCardsList.addEventListener("click", (event) => {
  const addAfterButton = event.target.closest("[data-all-add-after]");
  if (addAfterButton) {
    event.stopPropagation();
    insertCardAfter(addAfterButton.closest(".all-card").dataset.cardId);
    return;
  }

  const editButton = event.target.closest("[data-all-edit-current]");
  if (editButton) {
    event.stopPropagation();
    toggleAllCardEditor(editButton.closest(".all-card"));
    return;
  }

  const statusButton = event.target.closest("[data-all-status]");
  if (statusButton) {
    event.stopPropagation();
    const item = statusButton.closest(".all-card");
    setAllCardStatus(item.dataset.cardId, statusButton.dataset.allStatus);
    return;
  }

  const item = event.target.closest(".all-card");
  if (item && event.target.closest("a, button, textarea") === null) {
    flipAllCard(item);
  }
});
el.allCardsList.addEventListener("input", (event) => {
  if (event.target.closest(".all-card-editor")) event.stopPropagation();
});
el.allCardsList.addEventListener("dragstart", handleAllCardDragStart);
el.allCardsList.addEventListener("dragover", handleAllCardDragOver);
el.allCardsList.addEventListener("drop", handleAllCardDrop);
el.allCardsList.addEventListener("dragend", handleAllCardDragEnd);
el.allCardsList.addEventListener("dragleave", (event) => {
  if (!el.allCardsList.contains(event.relatedTarget)) clearAllCardDropTargets();
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
  closeDeckMenu();
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
el.replayUncategorizedBtn.addEventListener("click", () => replayDeck("uncategorized"));
el.replayAllBtn.addEventListener("click", () => replayDeck("all"));
el.shuffleBtn.addEventListener("click", shuffleCards);
el.resetBtn.addEventListener("click", resetQuiz);
el.mobileStackToggle?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mobile-stack]");
  if (!button) return;
  const stack = button.dataset.mobileStack === "known" ? "known" : "review";
  const studyLayout = document.querySelector(".study-layout");
  if (studyLayout) studyLayout.dataset.mobileStack = stack;
  el.mobileStackToggle.querySelectorAll("[data-mobile-stack]").forEach((item) => {
    item.classList.toggle("is-active", item === button);
  });
});
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
    closeDeckMenu();
    closeDiagramModal();
    closeAllCardsPanel();
    closeStylePanel();
    closeImportPanel();
    document.getElementById("webDecksPanel").hidden = true;
    unlockPageScroll();
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
    closeDeckMenu();
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

window.addEventListener("resize", scheduleLiveQuestionFit);

clearBrowserPersistence();
applyStyleSettings(styleDefaults, { save: false });
setTheme("dark");
setStatus("");
showCard();
loadStyleFromWeb();
registerServiceWorker();

function toggleEditMode(side) {
  const isQuestion = side === 'question';
  const btn = isQuestion ? el.editQuestionBtn : el.editAnswerBtn;
  const view = isQuestion ? el.questionView : el.answerView;
  const edit = isQuestion ? el.questionEdit : el.answerEdit;
  const currentCard = state.cards[state.current];
  
  if (!currentCard) return;

  const isEditing = view.hidden;
  
  if (!isEditing) {
    view.hidden = true;
    edit.hidden = false;
    edit.value = isQuestion ? currentCard.question : currentCard.answer;
    btn.innerHTML = '&#128190;';
    btn.title = 'Save';
    edit.focus();
  } else {
    const newValue = edit.value.trim();
    if (isQuestion) {
      currentCard.question = newValue;
    } else {
      currentCard.answer = newValue;
    }
    
    const masterIndex = state.masterCards.findIndex(c => c.id === currentCard.id);
    if (masterIndex > -1) {
      if (isQuestion) state.masterCards[masterIndex].question = newValue;
      else state.masterCards[masterIndex].answer = newValue;
    }

    view.hidden = false;
    edit.hidden = true;
    btn.innerHTML = '&#9998;';
    btn.title = isQuestion ? 'Edit question' : 'Edit answer';
    
    renderMarkdown(view, newValue).then(() => {
      if (isQuestion) scheduleLiveQuestionFit();
    });
    
    savePersistedDeck();
    setStatus(state.deckId ? "Card updated locally. Sync to update the web deck." : "Card updated.");
  }
}

el.editQuestionBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleEditMode('question');
});

el.editAnswerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleEditMode('answer');
});

el.questionEdit.addEventListener('click', (e) => e.stopPropagation());
el.answerEdit.addEventListener('click', (e) => e.stopPropagation());

if (el.newDeckBtn) {
  el.newDeckBtn.addEventListener("click", createNewDeck);
}

if (el.newDeckFromImportBtn) {
  el.newDeckFromImportBtn.addEventListener("click", createNewDeck);
}

if (el.addCardBtn) {
  el.addCardBtn.addEventListener("click", () => {
    if (!state.masterCards.length && !state.deckTitle) {
      setStatus("Create a new deck or import one first.", "error");
      return;
    }
    const newCard = createBlankCard();
    state.masterCards.splice(state.current + 1, 0, newCard);
    state.cards.splice(state.current + 1, 0, newCard);
    savePersistedDeck();
    navigateCard(1, "next");
    setStatus("Card added. Click the edit icon to modify it.");
  });
}

if (el.deleteCardBtn) {
  el.deleteCardBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!state.masterCards.length) return;
    if (!confirm("Delete this card?")) return;
    const card = state.cards[state.current];
    
    state.masterCards = state.masterCards.filter(c => c.id !== card.id);
    state.cards = state.cards.filter(c => c.id !== card.id);
    delete state.statusById[card.id];
    
    if (state.current >= state.cards.length) {
      state.current = Math.max(0, state.cards.length - 1);
    }
    
    savePersistedDeck();
    showCard();
    setStatus(state.deckId ? "Card deleted locally. Sync to update the web deck." : "Card deleted.");
  });
}
