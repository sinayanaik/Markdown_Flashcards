const delimitedCardBoundaryPattern = /(?:^|\n)\s*::/;
const cardSideSeparatorPattern = /^\s*---(?!-)/;

const sampleMarkdown = `::
## What is the derivative of $x^2$?

---

The derivative is $2x$.

$$
\\frac{d}{dx}x^2 = 2x
$$
::

::
## What does this Mermaid graph show?

---

It shows a simple spaced-repetition loop.

\`\`\`mermaid
flowchart LR
  A[Read note] --> B[Answer card]
  B --> C{Remembered?}
  C -->|Yes| D[Known]
  C -->|No| E[Review]
\`\`\`
::

::
## How do Markdown flashcards become cards?

---

Each \`::\` block becomes one flashcard. The \`---\` line separates the front from the back.
::`;

const styleProfiles = ["desktop", "mobile"];
const styleMobileQuery = "(max-width: 720px)";
const styleMobileMedia = typeof window !== "undefined" && window.matchMedia ? window.matchMedia(styleMobileQuery) : null;

const state = {
  deckId: null,
  cards: [],
  masterCards: [],
  statusById: {},
  previewCard: null,
  deckTitle: "",
  deckCategory: "Uncategorized",
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
  styleProfiles: {
    desktop: {},
    mobile: {}
  },
  activeStyleProfile: "desktop",
  styleEditProfile: "desktop",
  styleEditProfileFollowsDevice: true,
  styleTouched: false,
  stylePanelScrollY: 0,
  stylePanelTouchY: 0
};

const deckStorageKey = "swipe-notes-current-deck-v1";
const styleStorageKey = "swipe-notes-style-settings-v1";
const themeStorageKey = "swipe-notes-theme";
const defaultDeckCategory = "Uncategorized";
let webDeckCategories = [defaultDeckCategory];

const themeCatalog = [
  {
    id: "dark-amoled",
    label: "AMOLED Black",
    mode: "dark",
    description: "Pure black with cyan focus",
    colors: { bg: "#000000", panel: "#050606", text: "#f4fbfb", line: "#1a2424", accent: "#27e0d0" }
  },
  {
    id: "dark-amoled-emerald",
    label: "AMOLED Emerald",
    mode: "dark",
    description: "Pure black with green accents",
    colors: { bg: "#000000", panel: "#040705", text: "#f2fbf5", line: "#16251b", accent: "#34d96f" }
  },
  {
    id: "dark-amoled-violet",
    label: "AMOLED Violet",
    mode: "dark",
    description: "Pure black with violet accents",
    colors: { bg: "#000000", panel: "#070408", text: "#fbf5ff", line: "#25172a", accent: "#c084fc" }
  },
  {
    id: "dark-forest",
    label: "Forest Dark",
    mode: "dark",
    description: "Deep green-black panels",
    colors: { bg: "#0d1110", panel: "#131917", text: "#eef5f1", line: "#2b3933", accent: "#55d6bf" }
  },
  {
    id: "dark-graphite",
    label: "Graphite Dark",
    mode: "dark",
    description: "Neutral charcoal and cyan",
    colors: { bg: "#101113", panel: "#181a1d", text: "#f1f3f4", line: "#333841", accent: "#7cc7d8" }
  },
  {
    id: "dark-navy",
    label: "Navy Dark",
    mode: "dark",
    description: "Low-glare blue workspace",
    colors: { bg: "#0b1020", panel: "#121a2b", text: "#eef3fb", line: "#2b3a55", accent: "#8ab4ff" }
  },
  {
    id: "dark-bronze",
    label: "Bronze Dark",
    mode: "dark",
    description: "Dark neutral with amber focus",
    colors: { bg: "#12110d", panel: "#1b1913", text: "#f3f0e7", line: "#3a3427", accent: "#e1b86b" }
  },
  {
    id: "light-paper",
    label: "Paper Light",
    mode: "light",
    description: "Warm paper with teal accents",
    colors: { bg: "#f4f2ec", panel: "#fffdf8", text: "#161a18", line: "#d8d4c8", accent: "#16796c" }
  },
  {
    id: "light-snow",
    label: "Snow Light",
    mode: "light",
    description: "Clean neutral workspace",
    colors: { bg: "#f6f8f9", panel: "#ffffff", text: "#172026", line: "#d8e0e5", accent: "#2c6f91" }
  },
  {
    id: "light-ink",
    label: "Ink Light",
    mode: "light",
    description: "Cool blue-gray contrast",
    colors: { bg: "#f3f5fb", panel: "#ffffff", text: "#151b2a", line: "#d3dbea", accent: "#3f63b5" }
  }
];

const themeAliases = {
  dark: "dark-amoled",
  light: "light-paper"
};

const fontFamilyChoices = {
  system: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  serif: "Georgia, \"Times New Roman\", Times, serif",
  mono: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, monospace",
  rounded: "ui-rounded, \"Avenir Next\", \"Nunito Sans\", Inter, ui-sans-serif, system-ui, sans-serif"
};

const defaultStyleProfiles = {
  "mobile": {
    "appGap": "10px",
    "buttonGap": "8px",
    "fontFamily": "system",
    "cardPadding": "24px",
    "inputHeight": "40px",
    "baseFontSize": "12px",
    "codeFontSize": "10px",
    "modalPadding": "18px",
    "panelPadding": "10px",
    "stackCardGap": "7px",
    "answerPadding": "0px",
    "questionAlign": "left",
    "answerFontSize": "13px",
    "baseLineHeight": "1.23",
    "buttonFontSize": "14px",
    "cardContentGap": "16px",
    "codeLineHeight": "1.17",
    "appWidthPercent": "100",
    "cardBorderWidth": "1px",
    "questionPadding": "2px",
    "answerFontFamily": "system",
    "answerFontWeight": "300",
    "answerLineHeight": "1.58",
    "appHeightPercent": "100",
    "cardCornerRadius": "14px",
    "cardWidthPercent": "96",
    "inputCornerRadius": "8px",
    "modalWidthPercent": "60",
    "panelCornerRadius": "14px",
    "stackCardFontSize": "13px",
    "actionButtonHeight": "42px",
    "buttonCornerRadius": "8px",
    "questionFontFamily": "system",
    "questionFontWeight": "500",
    "questionLineHeight": "1.17",
    "replayButtonHeight": "30px",
    "questionFillPercent": "75",
    "questionMaxFontSize": "23px",
    "rawMarkdownFontSize": "16px",
    "stackCardLineHeight": "1.28",
    "toolbarButtonHeight": "38px",
    "cardMaxHeightPercent": "80",
    "questionVerticalAlign": "center",
    "sidePanelWidthPercent": "16",
    "visualMaxWidthPercent": "90",
    "markdownBoxHeightPercent": "30"
  },
  "desktop": {
    "appGap": "10px",
    "buttonGap": "8px",
    "fontFamily": "system",
    "cardPadding": "24px",
    "inputHeight": "40px",
    "baseFontSize": "18px",
    "codeFontSize": "12px",
    "modalPadding": "18px",
    "panelPadding": "10px",
    "stackCardGap": "7px",
    "answerPadding": "0px",
    "questionAlign": "center",
    "answerFontSize": "23px",
    "baseLineHeight": "1.58",
    "buttonFontSize": "14px",
    "cardContentGap": "16px",
    "codeLineHeight": "1.55",
    "appWidthPercent": "100",
    "cardBorderWidth": "1px",
    "questionPadding": "2px",
    "answerFontFamily": "system",
    "answerFontWeight": "400",
    "answerLineHeight": "1.58",
    "appHeightPercent": "100",
    "cardCornerRadius": "14px",
    "cardWidthPercent": "100",
    "inputCornerRadius": "8px",
    "modalWidthPercent": "60",
    "panelCornerRadius": "14px",
    "stackCardFontSize": "13px",
    "actionButtonHeight": "42px",
    "buttonCornerRadius": "8px",
    "questionFontFamily": "system",
    "questionFontWeight": "500",
    "questionLineHeight": "1.18",
    "replayButtonHeight": "30px",
    "questionFillPercent": "58",
    "questionMaxFontSize": "19px",
    "rawMarkdownFontSize": "18px",
    "stackCardLineHeight": "1.28",
    "toolbarButtonHeight": "38px",
    "cardMaxHeightPercent": "84",
    "questionVerticalAlign": "center",
    "sidePanelWidthPercent": "6",
    "visualMaxWidthPercent": "50",
    "markdownBoxHeightPercent": "30"
  },
  "version": 2
};

const styleDefaults = defaultStyleProfiles.desktop;

const styleControlGroups = [
  {
    title: "Typography",
    fields: [
      { key: "fontFamily", label: "Base font family", type: "select", options: ["system", "serif", "mono", "rounded"], hint: "Base app font." },
      { key: "baseFontSize", label: "Base font size", type: "range", min: 10, max: 36, step: 1, unit: "px", hint: "General Markdown and interface text size." },
      { key: "baseLineHeight", label: "Base line spacing", type: "range", min: 0.9, max: 2.6, step: 0.01, hint: "General reading spacing." },
      { key: "rawMarkdownFontSize", label: "Raw Markdown font size", type: "range", min: 8, max: 36, step: 1, unit: "px", hint: "Text size inside Markdown edit boxes." },
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
      { key: "visualMaxWidthPercent", label: "Visual max width %", type: "range", min: 10, max: 100, step: 1, hint: "Maximum width of images, videos, and diagrams as a percent of available space." },
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
      { key: "questionMaxFontSize", label: "Question max font size", type: "range", min: 8, max: 180, step: 1, unit: "px", hint: "Largest question text size. Small questions can still shrink without a floor." },
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
  visualMaxWidthPercent: "--visual-max-width-percent",
  markdownBoxHeightPercent: "--markdown-box-height-percent",
  baseFontSize: "--content-font-size",
  baseLineHeight: "--content-line-height",
  rawMarkdownFontSize: "--raw-markdown-font-size",
  codeFontSize: "--code-font-size",
  codeLineHeight: "--code-line-height",
  questionMaxFontSize: "--question-max-font-size",
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


function normalizeDeckCategory(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim() || defaultDeckCategory;
}

function categorySortValue(value) {
  const category = normalizeDeckCategory(value);
  return category === defaultDeckCategory ? "" : category.toLowerCase();
}

function categoryForSync(existingDeck = null) {
  const localCategory = normalizeDeckCategory(state.deckCategory);
  const existingCategory = normalizeDeckCategory(existingDeck?.category);
  if (localCategory === defaultDeckCategory && existingCategory !== defaultDeckCategory) {
    return existingCategory;
  }
  return localCategory;
}

function categoriesFromDecks(decks = [], extraCategories = []) {
  return Array.from(new Set([
    defaultDeckCategory,
    ...extraCategories.map(normalizeDeckCategory),
    ...(decks || []).map((deck) => normalizeDeckCategory(deck.category))
  ])).sort((a, b) => categorySortValue(a).localeCompare(categorySortValue(b)));
}

function setKnownWebDeckCategories(categories = []) {
  webDeckCategories = categoriesFromDecks([], categories);
  return webDeckCategories;
}

function populateWebDeckCategoryFilter(decks = []) {
  const filter = document.getElementById("webDeckCategoryFilter");
  if (!filter) return "";

  const selected = filter.value || "";
  const categories = setKnownWebDeckCategories(categoriesFromDecks(decks));

  filter.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All categories";
  filter.appendChild(allOption);

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    filter.appendChild(option);
  });

  filter.value = categories.includes(selected) ? selected : "";
  return filter.value;
}

async function refreshKnownWebDeckCategories() {
  if (!supabaseClient) return webDeckCategories;
  const { data, error } = await supabaseClient
    .from("decks")
    .select("category");
  if (error) throw error;
  return setKnownWebDeckCategories(categoriesFromDecks(data || []));
}

async function chooseDeckCategory(currentCategory = defaultDeckCategory) {
  try {
    await refreshKnownWebDeckCategories();
  } catch (error) {
    console.warn("Could not load deck categories", error);
  }

  return new Promise((resolve) => {
    const modal = document.createElement("section");
    modal.className = "category-choice-modal";
    modal.setAttribute("aria-label", "Choose deck category");

    const shell = document.createElement("div");
    shell.className = "category-choice-shell";
    shell.innerHTML = `
      <div class="category-choice-head">
        <div>
          <h2>Deck Category</h2>
          <p>Choose an existing category or create a new one.</p>
        </div>
        <button type="button" data-category-cancel aria-label="Close category editor">&#215;</button>
      </div>
      <label class="category-choice-field">
        <span>Category</span>
        <select data-category-select></select>
      </label>
      <label class="category-choice-field" data-category-new-field hidden>
        <span>New category</span>
        <input type="text" data-category-new autocomplete="off" spellcheck="false">
      </label>
      <div class="category-choice-actions">
        <button type="button" data-category-cancel>Cancel</button>
        <button type="button" data-category-save>Apply</button>
      </div>
    `;

    const select = shell.querySelector("[data-category-select]");
    categoriesFromDecks([], [...webDeckCategories, currentCategory]).forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
    const newOption = document.createElement("option");
    newOption.value = "__new__";
    newOption.textContent = "+ New category";
    select.appendChild(newOption);
    select.value = normalizeDeckCategory(currentCategory);

    const newField = shell.querySelector("[data-category-new-field]");
    const newInput = shell.querySelector("[data-category-new]");
    const cleanup = (value = null) => {
      modal.remove();
      resolve(value);
    };

    select.addEventListener("change", () => {
      newField.hidden = select.value !== "__new__";
      if (!newField.hidden) newInput.focus();
    });
    shell.querySelectorAll("[data-category-cancel]").forEach((button) => {
      button.addEventListener("click", () => cleanup(null));
    });
    shell.querySelector("[data-category-save]").addEventListener("click", () => {
      if (select.value === "__new__" && !newInput.value.trim()) {
        setStatus("Category cannot be empty.", "error");
        newInput.focus();
        return;
      }
      cleanup(normalizeDeckCategory(select.value === "__new__" ? newInput.value : select.value));
    });
    newInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        if (!newInput.value.trim()) {
          setStatus("Category cannot be empty.", "error");
          return;
        }
        cleanup(normalizeDeckCategory(newInput.value));
      }
      if (event.key === "Escape") cleanup(null);
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) cleanup(null);
    });

    modal.appendChild(shell);
    document.body.appendChild(modal);
    select.focus();
  });
}

function deckLastAccessedAt(deck = {}) {
  return deck.last_accessed_at || deck.updated_at || deck.created_at || "";
}

function formatWebDeckAccessDate(value) {
  if (!value) return { date: "Never", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "Never", time: "" };
  return {
    date: date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
    time: date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  };
}

async function touchWebDeckAccess(deckId) {
  if (!deckId || !supabaseClient) return false;

  const { error } = await supabaseClient
    .from("decks")
    .update({
      last_accessed_at: new Date().toISOString()
    })
    .eq("id", deckId);

  if (error) throw error;
  return true;
}



async function fetchWebDecks() {
  if (!supabaseClient) return;
  try {
    setStatus("Fetching web decks...");
    const { data, error } = await supabaseClient
      .from("decks")
      .select("*")
      .order("last_accessed_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });
      
    if (error) throw error;
    
    const tbody = document.getElementById("webDecksListTable");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    const selectedCategory = populateWebDeckCategoryFilter(data || []);
    const visibleDecks = selectedCategory
      ? (data || []).filter((deck) => normalizeDeckCategory(deck.category) === selectedCategory)
      : (data || []);
    const categories = webDeckCategories;

    if (!data || data.length === 0) {
      tbody.innerHTML = "<tr><td colspan=\"4\" class=\"web-decks-empty\">No web decks found.</td></tr>";
      setStatus("Web decks loaded.");
      return;
    }

    if (!visibleDecks.length) {
      tbody.innerHTML = "<tr><td colspan=\"4\" class=\"web-decks-empty\">No decks in this category.</td></tr>";
      setStatus("Web decks loaded.");
      return;
    }
    
    visibleDecks.forEach(deck => {
      const accessed = formatWebDeckAccessDate(deckLastAccessedAt(deck));
      const category = normalizeDeckCategory(deck.category);
      const tr = document.createElement("tr");

      const tdTitle = document.createElement("td");
      tdTitle.dataset.label = "Title";
      const titleWrap = document.createElement("div");
      titleWrap.className = "web-deck-title";

      const titleText = document.createElement("span");
      titleText.className = "web-deck-title-text";
      titleText.textContent = deck.title || "Untitled";

      const renameBtn = document.createElement("button");
      renameBtn.className = "web-deck-rename";
      renameBtn.type = "button";
      renameBtn.title = "Rename web deck";
      renameBtn.setAttribute("aria-label", `Rename ${deck.title || "Untitled"}`);
      renameBtn.textContent = "Rename";
      renameBtn.onclick = () => renameWebDeck(deck.id, deck.title || "Untitled");

      titleWrap.appendChild(titleText);
      titleWrap.appendChild(renameBtn);
      tdTitle.appendChild(titleWrap);

      const tdDate = document.createElement("td");
      tdDate.dataset.label = "Accessed";
      const dateWrap = document.createElement("div");
      dateWrap.className = "web-deck-accessed";
      const dateText = document.createElement("strong");
      dateText.textContent = accessed.date;
      const timeText = document.createElement("span");
      timeText.textContent = accessed.time;
      dateWrap.appendChild(dateText);
      dateWrap.appendChild(timeText);
      tdDate.appendChild(dateWrap);

      const tdCategory = document.createElement("td");
      tdCategory.dataset.label = "Category";
      tdCategory.appendChild(createWebDeckCategoryControl(deck, category, categories));
      
      const tdActions = document.createElement("td");
      tdActions.dataset.label = "Actions";
      const actionsWrap = document.createElement("div");
      actionsWrap.className = "web-deck-actions";
      
      const loadBtn = document.createElement("button");
      loadBtn.className = "web-deck-action";
      loadBtn.textContent = "Load";
      loadBtn.onclick = () => loadWebDeck(deck.id);

      const exportWrap = createWebDeckExportControl(deck);
      
      const delBtn = document.createElement("button");
      delBtn.className = "web-deck-action web-deck-delete";
      delBtn.textContent = "Delete";
      delBtn.onclick = () => deleteWebDeck(deck.id);
      
      actionsWrap.appendChild(loadBtn);
      actionsWrap.appendChild(exportWrap);
      actionsWrap.appendChild(delBtn);
      tdActions.appendChild(actionsWrap);
      
      tr.appendChild(tdTitle);
      tr.appendChild(tdCategory);
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

async function updateWebDeckCategory(deckId, category) {
  if (!deckId || !supabaseClient) return false;

  const { error } = await supabaseClient
    .from("decks")
    .update({
      category: normalizeDeckCategory(category),
      updated_at: new Date().toISOString()
    })
    .eq("id", deckId);

  if (error) throw error;
  return true;
}

async function applyWebDeckCategory(deckId, category) {
  const normalized = normalizeDeckCategory(category);
  setKnownWebDeckCategories([...webDeckCategories, normalized]);
  await updateWebDeckCategory(deckId, normalized);

  if (state.deckId === deckId) {
    state.deckCategory = normalized;
    savePersistedDeck();
    updateMeta();
  }

  return normalized;
}

function createWebDeckCategoryControl(deck, currentCategory, categories = webDeckCategories) {
  const wrap = document.createElement("div");
  wrap.className = "web-deck-category-editor";

  const select = document.createElement("select");
  select.className = "web-deck-category-select";
  select.setAttribute("aria-label", `Category for ${deck.title || "Untitled"}`);

  categoriesFromDecks([], [...categories, currentCategory]).forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });

  const newOption = document.createElement("option");
  newOption.value = "__new__";
  newOption.textContent = "+ New category";
  select.appendChild(newOption);
  select.value = normalizeDeckCategory(currentCategory);

  const newRow = document.createElement("div");
  newRow.className = "web-deck-category-new";
  newRow.hidden = true;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "New category";
  input.autocomplete = "off";
  input.spellcheck = false;

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";

  const saveNewCategory = async () => {
    if (!input.value.trim()) {
      setStatus("Category cannot be empty.", "error");
      input.focus();
      return;
    }

    const nextCategory = normalizeDeckCategory(input.value);
    saveBtn.disabled = true;
    try {
      setStatus("Updating deck category...");
      await applyWebDeckCategory(deck.id, nextCategory);
      setStatus("Deck category updated.");
      fetchWebDecks();
    } catch (error) {
      console.error("Failed to update deck category", error);
      setStatus("Failed to update deck category. Run the deck category SQL migration first.", "error");
      saveBtn.disabled = false;
    }
  };

  select.addEventListener("change", async () => {
    if (select.value === "__new__") {
      newRow.hidden = false;
      input.value = "";
      input.focus();
      return;
    }

    const nextCategory = normalizeDeckCategory(select.value);
    if (nextCategory === normalizeDeckCategory(currentCategory)) return;

    select.disabled = true;
    try {
      setStatus("Updating deck category...");
      await applyWebDeckCategory(deck.id, nextCategory);
      setStatus("Deck category updated.");
      fetchWebDecks();
    } catch (error) {
      console.error("Failed to update deck category", error);
      setStatus("Failed to update deck category. Run the deck category SQL migration first.", "error");
      select.disabled = false;
      select.value = normalizeDeckCategory(currentCategory);
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveNewCategory();
    if (event.key === "Escape") {
      newRow.hidden = true;
      select.value = normalizeDeckCategory(currentCategory);
    }
  });
  saveBtn.addEventListener("click", saveNewCategory);
  cancelBtn.addEventListener("click", () => {
    newRow.hidden = true;
    select.value = normalizeDeckCategory(currentCategory);
  });

  newRow.append(input, saveBtn, cancelBtn);
  wrap.append(select, newRow);
  return wrap;
}

function closeWebDeckExportMenus(exceptMenu = null) {
  document.querySelectorAll(".web-deck-export-menu, .web-decks-global-export-menu").forEach((menu) => {
    if (menu !== exceptMenu) {
      menu.hidden = true;
      const trigger = menu.previousElementSibling;
      if (trigger?.matches("[aria-expanded]")) trigger.setAttribute("aria-expanded", "false");
    }
  });
}

function createWebDeckExportControl(deck) {
  const wrap = document.createElement("div");
  wrap.className = "web-deck-export-wrap";

  const button = document.createElement("button");
  button.className = "web-deck-action web-deck-export";
  button.type = "button";
  button.setAttribute("aria-haspopup", "true");
  button.setAttribute("aria-expanded", "false");
  button.title = "Export deck";
  button.setAttribute("aria-label", `Export ${deck.title || "Untitled"}`);
  button.textContent = "Export";

  const menu = document.createElement("div");
  menu.className = "web-deck-export-menu";
  menu.hidden = true;

  [
    ["pdf", "Cornell PDF"],
    ["markdown", "Markdown"],
    ["json", "JSON"],
    ["sql", "SQL"]
  ].forEach(([format, label]) => {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = label;
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
      exportWebDeck(deck.id, format);
    });
    menu.appendChild(item);
  });

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = menu.hidden;
    closeWebDeckExportMenus(menu);
    menu.hidden = !shouldOpen;
    button.setAttribute("aria-expanded", String(shouldOpen));
  });

  wrap.append(button, menu);
  return wrap;
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

async function recategorizeWebDeck(deckId, currentCategory = defaultDeckCategory) {
  if (!deckId || !supabaseClient) return;

  const category = await chooseDeckCategory(currentCategory);
  if (category === null) return;

  try {
    setStatus("Updating deck category...");
    await applyWebDeckCategory(deckId, category);

    setStatus("Deck category updated.");
    fetchWebDecks();
  } catch (error) {
    console.error("Failed to update deck category", error);
    setStatus("Failed to update deck category. Run the deck category SQL migration first.", "error");
  }
}

function downloadTextFile(content, filename, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeWebDeckPayload(deckData, cardsData = []) {
  const deck = {
    id: String(deckData.id || ""),
    title: String(deckData.title || "Untitled"),
    category: normalizeDeckCategory(deckData.category),
    current_card_index: Number(deckData.current_card_index) || 0,
    created_at: deckData.created_at || null,
    updated_at: deckData.updated_at || null,
    last_accessed_at: deckData.last_accessed_at || null
  };

  const cards = (cardsData || []).map((card, index) => ({
    id: String(card.id || `${deck.id}-${index}`),
    deck_id: String(card.deck_id || deck.id),
    question: String(card.question || ""),
    answer: String(card.answer || ""),
    position: Number.isFinite(Number(card.position)) ? Number(card.position) : index,
    status: normalizeCardStatus(card.status),
    created_at: card.created_at || null,
    updated_at: card.updated_at || null
  }));

  return { deck, cards };
}

function deckPayloadSnapshot(payload) {
  return {
    app: "markdown-flashcards",
    version: 1,
    exportedAt: new Date().toISOString(),
    deckTitle: payload.deck.title,
    deckCategory: payload.deck.category,
    sourceTitle: payload.deck.title,
    importTitleHint: payload.deck.title,
    deckId: payload.deck.id,
    current: payload.deck.current_card_index || 0,
    cards: payload.cards.map((card) => ({
      id: card.id,
      question: card.question,
      answer: card.answer,
      status: card.status
    }))
  };
}

function statusByIdFromCards(cards = []) {
  return cards.reduce((statusById, card) => {
    const status = normalizeCardStatus(card.status);
    if (status) statusById[card.id] = status;
    return statusById;
  }, {});
}

async function fetchWebDeckPayload(deckId) {
  const { data: deckData, error: deckError } = await supabaseClient
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .single();

  if (deckError) throw deckError;

  const { data: cardsData, error: cardsError } = await supabaseClient
    .from("cards")
    .select("*")
    .eq("deck_id", deckId)
    .order("position", { ascending: true });

  if (cardsError) throw cardsError;
  return normalizeWebDeckPayload(deckData, cardsData || []);
}

async function fetchAllWebDeckPayloads() {
  const { data: decksData, error: decksError } = await supabaseClient
    .from("decks")
    .select("*")
    .order("last_accessed_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (decksError) throw decksError;

  const { data: cardsData, error: cardsError } = await supabaseClient
    .from("cards")
    .select("*")
    .order("deck_id", { ascending: true })
    .order("position", { ascending: true });

  if (cardsError) throw cardsError;

  const cardsByDeck = (cardsData || []).reduce((grouped, card) => {
    const deckId = String(card.deck_id || "");
    if (!grouped.has(deckId)) grouped.set(deckId, []);
    grouped.get(deckId).push(card);
    return grouped;
  }, new Map());

  return (decksData || []).map((deck) => normalizeWebDeckPayload(deck, cardsByDeck.get(String(deck.id)) || []));
}

function webDeckPayloadMarkdown(payload) {
  return [
    `# ${payload.deck.title}`,
    "",
    `Category: ${payload.deck.category}`,
    `Deck ID: ${payload.deck.id}`,
    `Exported: ${new Date().toISOString()}`,
    "",
    formatCardList("Cards", payload.cards)
  ].join("\n");
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlTimestamp(value, fallback = new Date().toISOString()) {
  const parsed = value ? new Date(value) : null;
  return sqlValue(parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : fallback);
}

function buildDeckSql(payloads, title = "Markdown Flashcards SQL Export") {
  const lines = [
    `-- ${title}`,
    `-- Exported: ${new Date().toISOString()}`,
    "BEGIN;"
  ];

  payloads.forEach((payload) => {
    const deck = payload.deck;
    lines.push("");
    lines.push(`-- Deck: ${deck.title}`);
    lines.push(
      "INSERT INTO decks (id, title, category, current_card_index, created_at, updated_at, last_accessed_at) VALUES " +
      `(${sqlValue(deck.id)}, ${sqlValue(deck.title)}, ${sqlValue(deck.category)}, ${Number(deck.current_card_index) || 0}, ${sqlTimestamp(deck.created_at)}, ${sqlTimestamp(deck.updated_at)}, ${sqlTimestamp(deck.last_accessed_at)}) ` +
      "ON CONFLICT (id) DO UPDATE SET " +
      "title = EXCLUDED.title, category = EXCLUDED.category, current_card_index = EXCLUDED.current_card_index, updated_at = EXCLUDED.updated_at, last_accessed_at = EXCLUDED.last_accessed_at;"
    );
    lines.push(`DELETE FROM cards WHERE deck_id = ${sqlValue(deck.id)};`);

    if (payload.cards.length) {
      const values = payload.cards.map((card, index) => (
        `(${sqlValue(card.id)}, ${sqlValue(deck.id)}, ${sqlValue(card.question)}, ${sqlValue(card.answer)}, ${Number.isFinite(Number(card.position)) ? Number(card.position) : index}, ${sqlValue(normalizeCardStatus(card.status))}, ${sqlTimestamp(card.created_at)}, ${sqlTimestamp(card.updated_at)})`
      ));
      lines.push(
        "INSERT INTO cards (id, deck_id, question, answer, position, status, created_at, updated_at) VALUES\n" +
        values.join(",\n") +
        "\nON CONFLICT (id) DO UPDATE SET " +
        "deck_id = EXCLUDED.deck_id, question = EXCLUDED.question, answer = EXCLUDED.answer, position = EXCLUDED.position, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at;"
      );
    }
  });

  lines.push("");
  lines.push("COMMIT;");
  return `${lines.join("\n")}\n`;
}

function currentDeckPayload(scope = "all") {
  const deckTitle = state.deckTitle || state.sourceTitle || "Untitled Deck";
  const deckId = state.deckId || slugifyFileName(deckTitle);
  const cards = cardsForScope(scope).map((card, index) => ({
    id: card.id,
    deck_id: deckId,
    question: card.question,
    answer: card.answer,
    position: index,
    status: normalizeCardStatus(state.statusById[card.id]),
    created_at: null,
    updated_at: new Date().toISOString()
  }));

  return {
    deck: {
      id: deckId,
      title: deckTitle,
      category: normalizeDeckCategory(state.deckCategory),
      current_card_index: Number.isFinite(state.current) ? state.current : 0,
      created_at: null,
      updated_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString()
    },
    cards
  };
}

function exportSql(scope = "all") {
  const payload = currentDeckPayload(scope);
  if (!payload.cards.length) {
    setStatus("No cards to export as SQL.", "error");
    return;
  }

  downloadTextFile(
    buildDeckSql([payload], `${payload.deck.title} SQL Export`),
    `${exportBaseName(scope)}.sql`,
    "application/sql;charset=utf-8"
  );
  setStatus("Exported current deck as SQL.");
}

async function exportWebDeck(deckId, format) {
  if (!deckId || !supabaseClient) return;

  try {
    setStatus("Exporting web deck...");
    const payload = await fetchWebDeckPayload(deckId);
    const baseName = slugifyFileName(payload.deck.title || "flashcards");

    if (format === "pdf") {
      await exportCardsPdf(payload.deck.title, payload.cards, {
        fileBaseName: baseName,
        statusById: statusByIdFromCards(payload.cards)
      });
    } else if (format === "markdown") {
      downloadTextFile(webDeckPayloadMarkdown(payload), `${baseName}.md`, "text/markdown;charset=utf-8");
      setStatus("Exported web deck as Markdown.");
    } else if (format === "sql") {
      downloadTextFile(buildDeckSql([payload], `${payload.deck.title} SQL Export`), `${baseName}.sql`, "application/sql;charset=utf-8");
      setStatus("Exported web deck as SQL.");
    } else {
      downloadTextFile(`${JSON.stringify(deckPayloadSnapshot(payload), null, 2)}\n`, `${baseName}.json`, "application/json;charset=utf-8");
      setStatus("Exported web deck as JSON.");
    }

    await touchWebDeckAccess(deckId);
    fetchWebDecks();
  } catch (error) {
    console.error("Failed to export web deck", error);
    setStatus("Failed to export web deck.", "error");
  }
}

async function exportAllWebDecks(format) {
  if (!supabaseClient) return;

  try {
    setStatus("Exporting all web decks...");
    const payloads = await fetchAllWebDeckPayloads();
    if (!payloads.length) {
      setStatus("No web decks to export.", "error");
      return;
    }

    if (format === "pdf") {
      const cards = [];
      const statusById = {};
      payloads.forEach((payload) => {
        cards.push({
          type: "deck-divider",
          title: payload.deck.title,
          category: payload.deck.category
        });
        payload.cards.forEach((card) => {
          const id = `${payload.deck.id}:${card.id}`;
          cards.push({
            id,
            question: card.question,
            answer: card.answer,
            position: cards.length
          });
          const status = normalizeCardStatus(card.status);
          if (status) statusById[id] = status;
        });
      });
      await exportCardsPdf("All Web Decks", cards, { fileBaseName: "all-web-decks", statusById });
    } else if (format === "markdown") {
      downloadTextFile(
        payloads.map(webDeckPayloadMarkdown).join("\n\n---\n\n"),
        "all-web-decks.md",
        "text/markdown;charset=utf-8"
      );
      setStatus("Exported all web decks as Markdown.");
    } else if (format === "sql") {
      downloadTextFile(buildDeckSql(payloads, "All Web Decks SQL Export"), "all-web-decks.sql", "application/sql;charset=utf-8");
      setStatus("Exported all web decks as SQL.");
    } else {
      downloadTextFile(
        `${JSON.stringify({
          app: "markdown-flashcards",
          version: 1,
          exportedAt: new Date().toISOString(),
          decks: payloads.map(deckPayloadSnapshot)
        }, null, 2)}\n`,
        "all-web-decks.json",
        "application/json;charset=utf-8"
      );
      setStatus("Exported all web decks as JSON.");
    }

    fetchWebDecks();
  } catch (error) {
    console.error("Failed to export all web decks", error);
    setStatus("Failed to export all web decks.", "error");
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

    const statusById = {};
    const cards = cardsData.map((rawCard, index) => {
      const id = String(rawCard.id || `${index}-${rawCard.question.slice(0, 32)}`);
      const status = normalizeCardStatus(rawCard.status);
      if (status) {
        statusById[id] = status;
      }
      return { id, question: rawCard.question, answer: rawCard.answer };
    });

    state.deckId = deckData.id;
    state.masterCards = cards.slice();
    resetStudyDeck(state.masterCards);
    state.statusById = statusById;
    state.current = 0; // always start from the first card on fresh load
    state.deckTitle = deckData.title || "";
    state.deckCategory = normalizeDeckCategory(deckData.category);
    state.sourceTitle = deckData.title || "";
    state.importTitleHint = deckData.title || "";
    
    syncResults();
    await touchWebDeckAccess(deckData.id);
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

function normalizeDeckTitleForSync(value) {
  return normalizeSyncText(value).toLowerCase();
}

async function findExistingWebDeckForLocalSync(deckTitle, preferredDeckId = "") {
  if (!supabaseClient) return null;

  const normalizedTitle = normalizeDeckTitleForSync(deckTitle);
  const normalizedPreferredId = String(preferredDeckId || "").trim();

  if (normalizedPreferredId) {
    const { data, error } = await supabaseClient
      .from("decks")
      .select("*")
      .eq("id", normalizedPreferredId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (!normalizedTitle) return null;

  const { data, error } = await supabaseClient
    .from("decks")
    .select("*")
    .order("last_accessed_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || []).find((deck) => normalizeDeckTitleForSync(deck.title) === normalizedTitle) || null;
}

async function resolveSyncTargetDeck(deckTitle) {
  const preferredDeckId = state.deckId || slugifyFileName(deckTitle);

  if (state.deckId) {
    const existingDeck = supabaseClient
      ? await findExistingWebDeckForLocalSync(deckTitle, state.deckId)
      : null;

    return {
      deckId: preferredDeckId,
      existingDeck: existingDeck,
      overwriteExisting: false
    };
  }

  if (!supabaseClient) {
    return {
      deckId: preferredDeckId,
      existingDeck: null,
      overwriteExisting: false
    };
  }

  const existingDeck = await findExistingWebDeckForLocalSync(deckTitle, preferredDeckId);

  return {
    deckId: existingDeck?.id || preferredDeckId || ("deck-" + Date.now()),
    existingDeck,
    overwriteExisting: Boolean(existingDeck)
  };
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

  let syncTarget = {
    deckId: state.deckId || slugifyFileName(deckTitle) || ("deck-" + Date.now()),
    existingDeck: state.deckId ? { id: state.deckId, title: deckTitle } : null,
    overwriteExisting: false
  };
  try {
    syncTarget = await resolveSyncTargetDeck(deckTitle);
  } catch (error) {
    console.error("Failed to resolve sync target", error);
  }

  const isUpdate = Boolean(syncTarget.existingDeck);
  const actionText = syncTarget.overwriteExisting
    ? "Overwrite existing web deck"
    : isUpdate
      ? "Update existing web deck"
      : "Create new web deck";
  const deckCategory = categoryForSync(syncTarget.existingDeck);
  
  modal.hidden = false;
  if (confirmBtn) confirmBtn.disabled = true;
  
  content.innerHTML = `
    <p><strong>Action:</strong> ${actionText}</p>
    <p><strong>Title:</strong> ${escapeHtml(deckTitle)}</p>
    <p><strong>Category:</strong> ${escapeHtml(deckCategory)}</p>
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
        .eq("deck_id", syncTarget.deckId);

      if (error) throw error;

      const { added, deleted, edited, moved, statusChanges } = calculateSyncDiff(state.masterCards, webCards || [], state.statusById);

      if (added === 0 && deleted === 0 && edited === 0 && moved === 0 && statusChanges === 0) {
        diffHtml = `<p style="color: var(--text-secondary);">No changes detected. The web deck is up to date.</p>`;
      } else {
        diffHtml = `<p style="color: var(--text-secondary); margin-bottom: 0.5rem;"><strong>${syncTarget.overwriteExisting ? "Local import will overwrite web deck:" : "Changes to sync:"}</strong></p>
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
    <p><strong>Category:</strong> ${escapeHtml(deckCategory)}</p>
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
    const deckTitle = state.deckTitle || state.sourceTitle || "Untitled Deck";
    const syncTarget = await resolveSyncTargetDeck(deckTitle);
    const isNewDeck = !syncTarget.existingDeck;
    const shouldOverwriteExisting = syncTarget.overwriteExisting;
    state.deckId = syncTarget.deckId;
    state.deckCategory = categoryForSync(syncTarget.existingDeck);

    setStatus(`Syncing... (1/3) Saving deck info "${deckTitle}"`);
    const now = new Date().toISOString();
    
    const deckData = {
      id: state.deckId,
      title: deckTitle,
      category: state.deckCategory,
      current_card_index: Number.isFinite(state.current) ? state.current : 0,
      updated_at: now,
      last_accessed_at: now
    };

    const { error: deckError } = await supabaseClient
      .from("decks")
      .upsert(deckData);

    if (deckError) throw deckError;

    if (shouldOverwriteExisting) {
      setStatus("Syncing... (2/3) Replacing existing web cards");
      const { error: deleteError } = await supabaseClient
        .from("cards")
        .delete()
        .eq("deck_id", state.deckId);

      if (deleteError) throw deleteError;
    } else if (!isNewDeck) {
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
            .eq("deck_id", state.deckId)
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
      updated_at: now
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
    const errorMessage = String(error?.message || "");
    setStatus(
      errorMessage.includes("category") || errorMessage.includes("last_accessed_at")
        ? "Failed to sync deck metadata. Run supabase_deck_categories.sql in Supabase first."
        : "Failed to sync deck to web.",
      "error"
    );
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
let printPreviewOpen = false;
let allCardsAnswersVisible = false;
const pdfPrintStyleId = "pdfPrintStyle";
let liveQuestionFitFrame = 0;
let markdownTableFitFrame = 0;
let pasteImportAppend = false;
let pastePreviewSource = "";
let pastePreviewCards = [];

const el = {
  sourceInput: document.querySelector("#sourceInput"),
  urlInput: document.querySelector("#urlInput"),
  fileInput: document.querySelector("#fileInput"),
  fileInputCards: document.querySelector("#fileInputCards"),
  fetchBtn: document.querySelector("#fetchBtn"),
  pasteDeckBtn: document.querySelector("#pasteDeckBtn"),
  pasteCardsBtn: document.querySelector("#pasteCardsBtn"),
  pasteEditorPanel: document.querySelector("#pasteEditorPanel"),
  pasteEditorTitle: document.querySelector("#pasteEditorTitle"),
  pasteEditorHint: document.querySelector("#pasteEditorHint"),
  pasteMarkdownInput: document.querySelector("#pasteMarkdownInput"),
  pastePreviewBtn: document.querySelector("#pastePreviewBtn"),
  pastePreviewSummary: document.querySelector("#pastePreviewSummary"),
  pastePreviewList: document.querySelector("#pastePreviewList"),
  pasteImportBtn: document.querySelector("#pasteImportBtn"),
  pasteCancelBtn: document.querySelector("#pasteCancelBtn"),
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
  diagramZoomInBtn: document.querySelector("#diagramZoomInBtn"),
  diagramZoomOutBtn: document.querySelector("#diagramZoomOutBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  exportMenu: document.querySelector("#exportMenu"),
  allCardsBtn: document.querySelector("#allCardsBtn"),
  allCardsPanel: document.querySelector("#allCardsPanel"),
  allCardsList: document.querySelector("#allCardsList"),
  allCardsSummary: document.querySelector("#allCardsSummary"),
  toggleAllAnswersBtn: document.querySelector("#toggleAllAnswersBtn"),
  closeAllCardsBtn: document.querySelector("#closeAllCardsBtn"),
  styleBtn: document.querySelector("#styleBtn"),
  stylePanel: document.querySelector("#stylePanel"),
  styleControls: document.querySelector("#styleControls"),
  closeStyleBtn: document.querySelector("#closeStyleBtn"),
  syncUpBtn: document.querySelector("#syncUpBtn"),
  applyStyleBtn: document.querySelector("#applyStyleBtn"),
  syncDownBtn: document.querySelector("#syncDownBtn"),
  styleSyncStatus: document.querySelector("#styleSyncStatus"),
  themeBtn: document.querySelector("#themeBtn"),
  themeMenu: document.querySelector("#themeMenu"),
  themeCurrentLabel: document.querySelector("#themeCurrentLabel"),
  deckTitleWrap: document.querySelector("#deckTitleWrap"),
  deckTitle: document.querySelector("#deckTitle"),
  editDeckTitleBtn: document.querySelector("#editDeckTitleBtn"),
  deckCategory: document.querySelector("#deckCategory"),
  editDeckCategoryBtn: document.querySelector("#editDeckCategoryBtn"),
  webDeckCategoryFilter: document.querySelector("#webDeckCategoryFilter"),
  globalWebExportBtn: document.querySelector("#globalWebExportBtn"),
  globalWebExportMenu: document.querySelector("#globalWebExportMenu"),
  shuffleBtn: document.querySelector("#shuffleBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  card: document.querySelector("#card"),
  questionView: document.querySelector("#questionView"),
  answerView: document.querySelector("#answerView"),
  questionStatusBadge: document.querySelector("#questionStatusBadge"),
  answerStatusBadge: document.querySelector("#answerStatusBadge"),
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
  deckSummary: document.querySelector("#deckSummary"),
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

function themeById(themeId) {
  const normalized = normalizeThemeId(themeId);
  return themeCatalog.find((theme) => theme.id === normalized) || themeCatalog[0];
}

function normalizeThemeId(themeId) {
  const requested = String(themeId || "").trim();
  const normalized = themeAliases[requested] || requested;
  return themeCatalog.some((theme) => theme.id === normalized) ? normalized : "dark-amoled";
}

function currentThemeId() {
  return normalizeThemeId(document.documentElement.dataset.theme || "dark-amoled");
}

function cssVariableColor(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function applyThemePreviewStyles(node, theme) {
  if (!node) return;
  node.style.setProperty("--theme-bg", theme.colors.bg);
  node.style.setProperty("--theme-panel", theme.colors.panel);
  node.style.setProperty("--theme-text", theme.colors.text);
  node.style.setProperty("--theme-line", theme.colors.line);
  node.style.setProperty("--theme-accent", theme.colors.accent);
}

function configureMermaid(themeId) {
  const theme = themeById(themeId);
  const isPrintTheme = themeId === "print";
  const card = isPrintTheme ? cssVariableColor("--print-surface", "#ffffff") : cssVariableColor("--card", theme.colors.panel);
  const panel = isPrintTheme ? cssVariableColor("--print-panel", "#ffffff") : cssVariableColor("--panel", theme.colors.panel);
  const bg = isPrintTheme ? cssVariableColor("--print-bg", "#eef2f2") : cssVariableColor("--bg", theme.colors.bg);
  const text = isPrintTheme ? cssVariableColor("--print-text", "#17201c") : cssVariableColor("--text", theme.colors.text);
  const line = isPrintTheme ? cssVariableColor("--print-line", "#b9c9c5") : cssVariableColor("--line", theme.colors.line);
  const muted = isPrintTheme ? cssVariableColor("--print-muted", "#56645f") : cssVariableColor("--muted", theme.colors.text);
  const accent = isPrintTheme ? cssVariableColor("--print-accent", theme.colors.accent) : cssVariableColor("--accent", theme.colors.accent);
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    themeVariables: {
      primaryColor: card,
      primaryTextColor: text,
      primaryBorderColor: accent,
      lineColor: muted,
      secondaryColor: panel,
      tertiaryColor: bg,
      edgeLabelBackground: panel,
      clusterBkg: panel,
      clusterBorder: line
    }
  });
}

function setTheme(theme) {
  const themeId = normalizeThemeId(theme);
  document.documentElement.dataset.theme = themeId;
  updateThemeControl(themeId);
  configureMermaid(themeId);
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) metaThemeColor.setAttribute("content", themeById(themeId).colors.bg);
  if (state.cards[state.current]) showCard();
  if (el.allCardsPanel && !el.allCardsPanel.hidden) {
    allCardsRenderId += 1;
    renderAllCards();
  }
  try {
    localStorage.setItem(themeStorageKey, themeId);
  } catch (error) {
    console.warn("Could not save theme", error);
  }
}

function renderThemeMenu() {
  if (!el.themeMenu) return;
  el.themeMenu.innerHTML = "";
  ["dark", "light"].forEach((mode) => {
    const label = document.createElement("div");
    label.className = "theme-group-label";
    label.textContent = mode === "light" ? "Light themes" : "Dark themes";
    el.themeMenu.appendChild(label);

    themeCatalog.filter((theme) => theme.mode === mode).forEach((theme) => {
      const button = document.createElement("button");
      button.className = "theme-option";
      button.type = "button";
      button.setAttribute("role", "option");
      button.dataset.themeOption = theme.id;
      applyThemePreviewStyles(button, theme);
      button.innerHTML = `
        <span class="theme-preview" aria-hidden="true"><span></span><span></span><span></span></span>
        <span><strong>${theme.label}</strong><small>${theme.description}</small></span>
        <span class="theme-check" aria-hidden="true"></span>
      `;
      applyThemePreviewStyles(button.querySelector(".theme-preview"), theme);
      el.themeMenu.appendChild(button);
    });
  });
}

function updateThemeControl(themeId = currentThemeId()) {
  const theme = themeById(themeId);
  if (el.themeCurrentLabel) el.themeCurrentLabel.textContent = theme.label;
  if (el.themeBtn) {
    el.themeBtn.title = `Theme: ${theme.label}`;
    el.themeBtn.setAttribute("aria-label", `Theme: ${theme.label}. Choose theme.`);
    applyThemePreviewStyles(el.themeBtn.querySelector(".theme-preview"), theme);
  }
  el.themeMenu?.querySelectorAll("[data-theme-option]").forEach((button) => {
    const selected = button.dataset.themeOption === theme.id;
    button.setAttribute("aria-selected", selected ? "true" : "false");
    const check = button.querySelector(".theme-check");
    if (check) check.textContent = selected ? "*" : "";
  });
}

function setThemeMenuOpen(open) {
  if (!el.themeMenu || !el.themeBtn) return;
  el.themeMenu.hidden = !open;
  el.themeBtn.setAttribute("aria-expanded", open ? "true" : "false");
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

function normalizeStyleValue(key, value, customDefault) {
  const field = styleFieldByKey[key];
  const defaultValue = customDefault ?? styleDefaults[key];
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

function normalizeStyleSettings(raw = {}, profile = "desktop") {
  const source = migrateLegacyStyleSettings(raw || {});
  const defaults = defaultStyleProfiles[profile] || styleDefaults;
  return Object.keys(styleDefaults).reduce((normalized, key) => {
    normalized[key] = normalizeStyleValue(key, styleValue(source, key), defaults[key]);
    return normalized;
  }, {});
}

function detectStyleProfile() {
  return styleMobileMedia?.matches ? "mobile" : "desktop";
}

function styleProfileLabel(profile) {
  return profile === "mobile" ? "Mobile" : "Desktop";
}

function normalizeStyleProfiles(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const profileSource = source.profiles && typeof source.profiles === "object" ? source.profiles : source;
  const hasProfiles = Boolean(profileSource.desktop || profileSource.mobile);

  if (!hasProfiles) {
    const legacy = normalizeStyleSettings(source, "desktop");
    const mobileLegacySource = { ...defaultStyleProfiles.mobile, ...migrateLegacyStyleSettings(source) };
    return {
      desktop: { ...legacy },
      mobile: normalizeStyleSettings(mobileLegacySource, "mobile")
    };
  }

  const desktopSource = profileSource.desktop || profileSource.mobile || defaultStyleProfiles.desktop;
  const mobileSource = profileSource.mobile || profileSource.desktop || defaultStyleProfiles.mobile;
  return {
    desktop: normalizeStyleSettings(desktopSource, "desktop"),
    mobile: normalizeStyleSettings(mobileSource, "mobile")
  };
}

function setStyleProfiles(raw = {}) {
  state.styleProfiles = normalizeStyleProfiles(raw);
  try {
    localStorage.setItem(styleStorageKey, JSON.stringify(state.styleProfiles));
  } catch (error) {
    console.warn("Could not save style profiles", error);
  }
  return state.styleProfiles;
}

function getStyleProfileSettings(profile = state.styleEditProfile) {
  const normalizedProfile = styleProfiles.includes(profile) ? profile : detectStyleProfile();
  const settings = state.styleProfiles?.[normalizedProfile] || defaultStyleProfiles[normalizedProfile];
  return normalizeStyleSettings(settings, normalizedProfile);
}

function setStyleProfileSettings(profile, rawSettings) {
  const normalizedProfile = styleProfiles.includes(profile) ? profile : detectStyleProfile();
  const settings = normalizeStyleSettings(rawSettings, normalizedProfile);
  state.styleProfiles = {
    ...state.styleProfiles,
    [normalizedProfile]: settings
  };
  if (normalizedProfile === state.activeStyleProfile) state.styleSettings = settings;
  try {
    localStorage.setItem(styleStorageKey, JSON.stringify(state.styleProfiles));
  } catch (error) {
    console.warn("Could not save style profiles", error);
  }
  return settings;
}

function styleProfilesPayload() {
  return {
    version: 2,
    desktop: getStyleProfileSettings("desktop"),
    mobile: getStyleProfileSettings("mobile")
  };
}

function setStyleStatus(message) {
  if (el.styleSyncStatus) el.styleSyncStatus.textContent = message;
}

function renderStyleControls() {
  if (!el.styleControls || el.styleControls.dataset.rendered === "true") return;
  const themeField = el.styleControls.querySelector(".style-field");
  el.styleControls.innerHTML = "";
  if (themeField) el.styleControls.appendChild(themeField);

  const profileField = document.createElement("section");
  profileField.className = "style-profile-field";
  profileField.setAttribute("aria-label", "Style profile");

  const profileHeader = document.createElement("div");
  profileHeader.className = "style-profile-head";
  const profileTitle = document.createElement("span");
  profileTitle.textContent = "Editing profile";
  const profileBadge = document.createElement("strong");
  profileBadge.id = "styleProfileBadge";
  profileHeader.append(profileTitle, profileBadge);
  profileField.appendChild(profileHeader);

  const profileButtons = document.createElement("div");
  profileButtons.className = "style-profile-toggle";
  styleProfiles.forEach((profile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.styleProfile = profile;
    button.textContent = styleProfileLabel(profile);
    profileButtons.appendChild(button);
  });
  profileField.appendChild(profileButtons);

  const profileHint = document.createElement("small");
  profileHint.id = "styleProfileHint";
  profileField.appendChild(profileHint);
  el.styleControls.appendChild(profileField);

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

function updateStyleProfileUi() {
  if (!el.styleControls) return;
  const activeProfile = detectStyleProfile();
  const editProfile = styleProfiles.includes(state.styleEditProfile) ? state.styleEditProfile : activeProfile;
  const badge = el.styleControls.querySelector("#styleProfileBadge");
  const hint = el.styleControls.querySelector("#styleProfileHint");
  if (badge) badge.textContent = styleProfileLabel(editProfile);
  if (hint) {
    const activeLabel = styleProfileLabel(activeProfile);
    const editLabel = styleProfileLabel(editProfile);
    hint.textContent = editProfile === activeProfile
      ? `${activeLabel} values are active on this screen.`
      : `Editing ${editLabel} values. This screen is currently using ${activeLabel}.`;
  }
  el.styleControls.querySelectorAll("[data-style-profile]").forEach((button) => {
    const isEditProfile = button.dataset.styleProfile === editProfile;
    const isActiveProfile = button.dataset.styleProfile === activeProfile;
    button.classList.toggle("is-active", isEditProfile);
    button.classList.toggle("is-device", isActiveProfile);
    button.setAttribute("aria-pressed", String(isEditProfile));
  });
}

function updateStyleControls() {
  renderStyleControls();
  const editProfile = styleProfiles.includes(state.styleEditProfile) ? state.styleEditProfile : detectStyleProfile();
  const settings = getStyleProfileSettings(editProfile);
  const defaults = defaultStyleProfiles[editProfile] || styleDefaults;
  updateStyleProfileUi();
  el.styleControls?.querySelectorAll("[data-style-key]").forEach((input) => {
    input.value = settings[input.dataset.styleKey] ?? "";
    input.placeholder = defaults[input.dataset.styleKey] || "";
    syncSliderFromText(input);
  });
}

function applyStyleSettings(rawSettings, options = {}) {
  const settings = normalizeStyleSettings(rawSettings);
  const activeProfile = state.activeStyleProfile || detectStyleProfile();
  state.styleSettings = settings;
  const appWidthPercent = numericStyleValue(settings.appWidthPercent) ?? 100;
  const appHeightPercent = numericStyleValue(settings.appHeightPercent) ?? 100;
  const sidePanelWidthPercent = numericStyleValue(settings.sidePanelWidthPercent) ?? 16;
  const cardWidthPercent = numericStyleValue(settings.cardWidthPercent) ?? 96;
  const cardMaxHeightPercent = numericStyleValue(settings.cardMaxHeightPercent) ?? 74;
  const modalWidthPercent = numericStyleValue(settings.modalWidthPercent) ?? 60;
  const visualMaxWidthPercent = numericStyleValue(settings.visualMaxWidthPercent) ?? (activeProfile === "mobile" ? 90 : 50);
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
  root.style.setProperty("--visual-max-width", `${visualMaxWidthPercent}%`);
  root.style.setProperty("--textarea-min-height", `${markdownBoxHeightPercent}vh`);

  if (!el.stylePanel || el.stylePanel.hidden || state.styleEditProfile === state.activeStyleProfile) {
    updateStyleControls();
  } else {
    updateStyleProfileUi();
  }
  scheduleLiveQuestionFit();
  if (options.force) forceStyleRefresh();

  return settings;
}

function applyActiveStyleSettings(options = {}) {
  const activeProfile = detectStyleProfile();
  state.activeStyleProfile = activeProfile;
  document.documentElement.dataset.styleProfile = activeProfile;
  return applyStyleSettings(getStyleProfileSettings(activeProfile), options);
}

function loadLocalStyleSettings() {
  try {
    const stored = localStorage.getItem(styleStorageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("Could not load style settings from local storage", error);
  }
  return defaultStyleProfiles;
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
  const editProfile = styleProfiles.includes(state.styleEditProfile) ? state.styleEditProfile : detectStyleProfile();
  const settings = setStyleProfileSettings(editProfile, styleSettingsFromControls());
  if (editProfile === detectStyleProfile()) applyActiveStyleSettings();
  else updateStyleProfileUi();
  scheduleMarkdownTableFit();
  setStyleStatus(`Unsynced ${styleProfileLabel(editProfile).toLowerCase()} style`);
  return settings;
}

function forceStyleRefresh() {
  [el.questionView, el.answerView].forEach((node) => {
    if (!node) return;
    node.style.fontSize = "";
    node.style.transform = "";
    node.style.width = "";
    node.style.removeProperty("--question-fit-font-size");
  });
  document.querySelectorAll(".rendered table").forEach((table) => {
    table.style.fontSize = "";
    delete table.dataset.baseFontSize;
  });
  scheduleMarkdownTableFit();
  scheduleLiveQuestionFit();
  requestAnimationFrame(() => {
    scheduleMarkdownTableFit();
    scheduleLiveQuestionFit();
    if (!el.allCardsPanel?.hidden) renderAllCards();
  });
}

function applyCurrentStyleSettings(statusMessage = "Style applied") {
  state.styleTouched = true;
  const editProfile = styleProfiles.includes(state.styleEditProfile) ? state.styleEditProfile : detectStyleProfile();
  setStyleProfileSettings(editProfile, styleSettingsFromControls());
  if (editProfile === detectStyleProfile()) {
    applyActiveStyleSettings({ force: true });
  } else {
    updateStyleProfileUi();
  }
  if (state.previewCard || state.cards[state.current]) {
    showCard();
  }
  setStyleStatus(`${styleProfileLabel(editProfile)} ${statusMessage.toLowerCase()}`);
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
  state.styleEditProfile = detectStyleProfile();
  state.styleEditProfileFollowsDevice = true;
  el.stylePanel.hidden = false;
  updateStyleControls();
}

function closeStylePanel() {
  el.stylePanel.hidden = true;
  unlockPageScroll();
}

function switchStyleEditProfile(profile, options = {}) {
  if (!styleProfiles.includes(profile)) return;
  state.styleEditProfile = profile;
  state.styleEditProfileFollowsDevice = options.followDevice ?? false;
  updateStyleControls();
  setStyleStatus(`Editing ${styleProfileLabel(profile).toLowerCase()} style`);
}

function handleStyleEnvironmentChange() {
  const previousProfile = state.activeStyleProfile;
  applyActiveStyleSettings({ force: true });
  if (!el.stylePanel?.hidden && (state.styleEditProfileFollowsDevice || state.styleEditProfile === previousProfile)) {
    switchStyleEditProfile(detectStyleProfile(), { followDevice: true });
  } else {
    updateStyleProfileUi();
  }
}

async function loadStyleFromWeb(force = false) {
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
    if (state.styleTouched && !force) {
      setStyleStatus("Unsynced local style");
      return;
    }

    setStyleProfiles(data.settings);
    applyActiveStyleSettings({ force: true });
    state.styleTouched = false;
    updateStyleControls();
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

  const syncBtn = el.syncUpBtn;
  state.styleTouched = true;
  const editProfile = styleProfiles.includes(state.styleEditProfile) ? state.styleEditProfile : detectStyleProfile();
  setStyleProfileSettings(editProfile, styleSettingsFromControls());
  if (editProfile === detectStyleProfile()) applyActiveStyleSettings({ force: true });
  const settings = styleProfilesPayload();
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

function setDeckCategory(category, options = {}) {
  state.deckCategory = normalizeDeckCategory(category);
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

async function editCurrentDeckCategory() {
  if (!state.masterCards.length) {
    setStatus("Import a deck before editing its category.", "error");
    return;
  }

  const category = await chooseDeckCategory(state.deckCategory);
  if (category === null) return;
  setDeckCategory(category);

  if (!state.deckId || !supabaseClient) {
    setStatus("Deck category updated locally. Sync to update the web deck.");
    return;
  }

  try {
    setStatus("Updating web deck category...");
    await applyWebDeckCategory(state.deckId, category);
    setStatus("Deck category updated in the cloud.");
  } catch (error) {
    console.error("Failed to update web deck category", error);
    setStatus("Deck category updated locally, but cloud category update failed. Run the deck category SQL migration first.", "error");
  }
}

function openImportPanel() {
  lockPageScroll();
  closePasteEditor(false);
  el.importPanel.classList.add("is-open");
}

function openWebDecksPanel() {
  const panel = document.getElementById("webDecksPanel");
  if (!panel) return;

  lockPageScroll();
  panel.hidden = false;
}

function closeImportPanel() {
  closePasteEditor(true);
  if (state.cards.length === 0) {
    createNewDeck();
    return;
  }
  el.importPanel.classList.remove("is-open");
  unlockPageScroll();
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

function parseDelimitedCards(markdown) {
  const lines = normalizeMarkdown(markdown).split("\n");
  const cards = [];
  let inCard = false;
  let side = "front";
  let front = [];
  let back = [];
  let inFence = false;

  const reset = () => {
    inCard = false;
    side = "front";
    front = [];
    back = [];
    inFence = false;
  };

  const flush = () => {
    const question = cleanToggleContent(front);
    const answer = cleanToggleContent(back);
    if (question && answer) cards.push({ question, answer });
    reset();
  };

  const pushContent = (line) => {
    if (!inCard) return;
    if (side === "front") {
      front.push(line);
    } else {
      back.push(line);
    }
    if (/^\s*```/.test(line.trim())) inFence = !inFence;
  };

  const toggleCardBoundary = () => {
    if (inCard) {
      flush();
    } else {
      reset();
      inCard = true;
    }
  };

  for (const line of lines) {
    let rest = line;

    if (!inFence && rest.trim() === "::") {
      toggleCardBoundary();
      continue;
    }

    if (!inFence && /^\s*::/.test(rest)) {
      toggleCardBoundary();
      rest = rest.replace(/^\s*::/, "");
      if (!rest.trim()) continue;
    }

    if (!inCard) continue;

    if (!inFence && side === "front" && rest.trim() === "---") {
      side = "back";
      continue;
    }

    if (!inFence && side === "front" && cardSideSeparatorPattern.test(rest)) {
      side = "back";
      rest = rest.replace(cardSideSeparatorPattern, "");
      if (!rest.trim()) continue;
    }

    if (!inFence && rest.trim().endsWith("::")) {
      const content = rest.replace(/::\s*$/, "");
      if (content.trim()) pushContent(content);
      flush();
      continue;
    }

    pushContent(rest);
  }

  return cards;
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

function parseLegacyHeadingFallbackCards(markdown) {
  const lines = normalizeMarkdown(markdown).split("\n");
  const cards = [];
  let current = null;
  let inFence = false;

  const flush = () => {
    if (!current) return;
    const answer = cleanToggleContent(current.answer);
    if (current.question && answer) {
      cards.push({
        question: current.question,
        answer
      });
    }
    current = null;
  };

  for (const line of lines) {
    if (/^\s*```/.test(line.trim())) inFence = !inFence;

    const heading = inFence ? null : line.match(/^(#{2,4})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flush();
      current = {
        question: heading[2].trim(),
        answer: []
      };
      continue;
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
  const delimitedCards = parseDelimitedCards(source);
  const hasDelimitedCardSyntax = delimitedCardBoundaryPattern.test(source);
  const structuredLegacyCards = [
    ...parseDetailsCards(source),
    ...parseBlockquoteCards(source),
    ...parseQACards(source)
  ];
  const legacyHeadingCards = parseLegacyHeadingFallbackCards(source);
  const parsedCards = delimitedCards.length
    ? delimitedCards
    : hasDelimitedCardSyntax
      ? []
    : structuredLegacyCards.length
      ? [
        ...structuredLegacyCards,
        ...parseHeadingCards(source, { includeStudySections: true })
      ]
      : legacyHeadingCards.length
        ? legacyHeadingCards
        : parseHeadingCards(source, { includeStudySections: true });
  const seen = new Set();
  const cards = parsedCards.filter((card) => {
    const key = `${card.question.trim()}\u0000${card.answer.trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

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

function resetStudyDeck(cards = state.masterCards) {
  state.transitionToken += 1;
  state.cards = cards.slice();
  state.current = 0;
  state.previewCard = null;
  state.flipped = false;
  resetResults();
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
  await renderMarkdown(el.questionView, card.question, true);
  await renderMarkdown(el.answerView, card.answer, true);
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
        // Surround display math with blank lines so marked exits HTML-block mode
        // and correctly parses any markdown (headings, paragraphs) that follows.
        const node = mathNode(source.slice(index + 2, close), true);
        const needsLeading = output.length > 0 && !output.endsWith("\n\n");
        output += (needsLeading ? "\n\n" : "") + node + "\n\n";
        index = close + 2;
        // Skip any trailing newlines that were already part of $$...$$
        while (index < source.length && source[index] === "\n") index++;
        continue;
      }
    }

    if (isSingleDollarLine(source, index)) {
      const openLineEnd = source.indexOf("\n", index);
      const contentStart = openLineEnd === -1 ? index + 1 : openLineEnd + 1;
      const close = findSingleDollarLine(source, contentStart);
      if (close !== -1) {
        const closeLineStart = source.lastIndexOf("\n", close - 1) + 1;
        const node = mathNode(source.slice(contentStart, closeLineStart), true);
        const needsLeading = output.length > 0 && !output.endsWith("\n\n");
        output += (needsLeading ? "\n\n" : "") + node + "\n\n";
        const closeLineEnd = source.indexOf("\n", close);
        index = closeLineEnd === -1 ? close + 1 : closeLineEnd + 1;
        while (index < source.length && source[index] === "\n") index++;
        continue;
      }
    }

    if ((source.startsWith("\\[", index) || source.startsWith("\\(", index)) && !isEscaped(source, index)) {
      const displayMode = source[index + 1] === "[";
      const closeToken = displayMode ? "\\]" : "\\)";
      const close = findUnescaped(source, closeToken, index + 2);
      if (close !== -1) {
        const node = mathNode(source.slice(index + 2, close), displayMode);
        if (displayMode) {
          const needsLeading = output.length > 0 && !output.endsWith("\n\n");
          output += (needsLeading ? "\n\n" : "") + node + "\n\n";
        } else {
          output += node;
        }
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
    if (/\bmermaid\b/i.test(match[1])) {
      output += `<div class="mermaid" data-diagram="${encodeAttribute(match[2].trim())}"></div>`;
    } else if (/\bnomnoml\b/i.test(match[1])) {
      output += `<div class="nomnoml-diagram" data-diagram="${encodeAttribute(match[2].trim())}"></div>`;
    } else {
      output += match[0];
    }
    lastIndex = fencePattern.lastIndex;
  }

  output += protectMath(source.slice(lastIndex));
  return output;
}

function markdownToSafeHtml(markdown) {
  const prepared = preprocessSpecialBlocks(markdown || "");
  const html = marked.parse(prepared);
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["foreignObject", "font", "u", "del", "kbd"],
    ADD_ATTR: ["target", "rel", "class", "data-tex", "data-diagram", "style", "color", "face"]
  });
}

function nomnomlThemeDefaults(print = false) {
  return {
    background: cssVariableColor(print ? "--print-surface" : "--card", "#ffffff"),
    fill: [
      cssVariableColor(print ? "--print-surface" : "--card", "#ffffff"),
      cssVariableColor(print ? "--print-panel" : "--panel", "#fffdf8"),
      cssVariableColor(print ? "--print-panel-2" : "--panel-2", "#f3f6fb"),
      cssVariableColor(print ? "--print-question" : "--card-answer", "#eaf7f3")
    ].join("; "),
    stroke: cssVariableColor(print ? "--print-text" : "--text", "#263238"),
    font: "Arial",
    fontSize: "12",
    lineWidth: "1.4"
  };
}

function sourceWithNomnomlTheme(source, print = false) {
  const diagramSource = String(source || "").trim();
  const configured = new Set();

  diagramSource.split("\n").forEach((line) => {
    const match = line.trim().match(/^#([A-Za-z][A-Za-z0-9_]*)\s*:/);
    if (match) configured.add(match[1].toLowerCase());
  });

  const injected = Object.entries(nomnomlThemeDefaults(print))
    .filter(([key]) => !configured.has(key.toLowerCase()))
    .map(([key, value]) => `#${key}: ${value}`);

  return injected.length ? `${injected.join("\n")}\n${diagramSource}` : diagramSource;
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

  const nomnomlDiagrams = container.querySelectorAll(".nomnoml-diagram");
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
        const printTheme = Boolean(node.closest(".print-root"));
        const svg = nomnoml.renderSvg(sourceWithNomnomlTheme(diagramSource, printTheme));
        node.classList.add("nomnoml-light-theme");
        node.innerHTML = svg;
        node.querySelector("svg")?.classList.add("nomnoml-light-svg");
        addDiagramZoomControl(node);
      } catch (err) {
        console.warn("Nomnoml render error:", err);
        node.textContent = "Error rendering Nomnoml: " + err.message;
      }
    });
  }

  container.querySelectorAll("img").forEach(addDiagramZoomControl);

  fitMarkdownTables(container);
}

async function renderMarkdown(container, markdown, allowPlaceholder = false) {
  let displayMarkdown = markdown;
  if (allowPlaceholder && (!markdown || String(markdown).trim() === "")) {
    if (container.closest(".all-card-question") || container.closest(".card-question")) {
      displayMarkdown = "<div class='empty-placeholder'>Question</div>";
    } else if (container.closest(".all-card-answer") || container.closest(".card-answer")) {
      displayMarkdown = "<div class='empty-placeholder'>Answer</div>";
    }
  }
  container.innerHTML = markdownToSafeHtml(displayMarkdown);
  await enhanceRenderedMarkdown(container);
}

function markdownTableColumnCount(table) {
  return Array.from(table.rows).reduce((max, row) => {
    const count = Array.from(row.cells).reduce((sum, cell) => sum + Math.max(1, cell.colSpan || 1), 0);
    return Math.max(max, count);
  }, 0);
}

function tableCellWeight(cell) {
  const text = String(cell.textContent || "").replace(/\s+/g, " ").trim();
  const longestWord = text.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);
  return Math.max(4, Math.min(80, text.length * 0.58 + longestWord * 0.9));
}

function applyMarkdownTableColumns(table) {
  const columnCount = markdownTableColumnCount(table);
  if (!columnCount) return;
  table.style.setProperty("--markdown-table-columns", String(columnCount));

  const weights = Array(columnCount).fill(4);
  Array.from(table.rows).forEach((row) => {
    let columnIndex = 0;
    Array.from(row.cells).forEach((cell) => {
      const span = Math.max(1, cell.colSpan || 1);
      const weight = tableCellWeight(cell) / span;
      for (let offset = 0; offset < span && columnIndex + offset < weights.length; offset += 1) {
        weights[columnIndex + offset] = Math.max(weights[columnIndex + offset], weight);
      }
      columnIndex += span;
    });
  });

  table.querySelector(":scope > colgroup")?.remove();
  const colgroup = document.createElement("colgroup");
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  weights.forEach((weight) => {
    const col = document.createElement("col");
    col.style.width = `${(weight / total) * 100}%`;
    colgroup.appendChild(col);
  });
  table.insertBefore(colgroup, table.firstChild);
}

function markdownTableHeaderCells(table) {
  if (table.tHead?.rows.length) {
    return Array.from(table.tHead.rows[table.tHead.rows.length - 1].cells);
  }

  return Array.from(table.rows)
    .find((row) => Array.from(row.cells).some((cell) => cell.tagName === "TH"))
    ?.cells || [];
}

function markdownTableHeaders(table) {
  const labels = [];
  Array.from(markdownTableHeaderCells(table)).forEach((cell) => {
    const label = String(cell.textContent || "").replace(/\s+/g, " ").trim();
    const span = Math.max(1, cell.colSpan || 1);
    for (let index = 0; index < span; index += 1) {
      labels.push(label || `Column ${labels.length + 1}`);
    }
  });
  return labels;
}

function applyMarkdownTableLabels(table) {
  const labels = markdownTableHeaders(table);
  const columnCount = markdownTableColumnCount(table);
  while (labels.length < columnCount) {
    labels.push(`Column ${labels.length + 1}`);
  }
  if (!labels.length) return;

  const headerCells = new Set(Array.from(markdownTableHeaderCells(table)));
  Array.from(table.rows).forEach((row) => {
    let columnIndex = 0;
    Array.from(row.cells).forEach((cell) => {
      const span = Math.max(1, cell.colSpan || 1);
      if (!headerCells.has(cell)) {
        cell.dataset.label = labels[columnIndex] || `Column ${columnIndex + 1}`;
      }
      columnIndex += span;
    });
  });
}

function wrapMarkdownTable(table) {
  if (table.parentElement?.classList.contains("markdown-table-wrap")) return table.parentElement;
  const wrapper = document.createElement("div");
  wrapper.className = "markdown-table-wrap";
  table.parentNode.insertBefore(wrapper, table);
  wrapper.appendChild(table);
  return wrapper;
}

function markdownTableFits(table, wrapper) {
  const allowance = 1;
  if (table.scrollWidth > wrapper.clientWidth + allowance) return false;
  return Array.from(table.cells || table.querySelectorAll("th, td"))
    .every((cell) => cell.scrollWidth <= cell.clientWidth + allowance);
}

function fitMarkdownTables(container) {
  container.querySelectorAll("table").forEach((table) => {
    if (table.closest("pre")) return;

    const wrapper = wrapMarkdownTable(table);
    applyMarkdownTableLabels(table);
    applyMarkdownTableColumns(table);
    if (!wrapper.clientWidth) return;

    if (!table.dataset.baseFontSize) {
      table.dataset.baseFontSize = String(parseFloat(getComputedStyle(table).fontSize) || 16);
    }

    const baseFontSize = parseFloat(table.dataset.baseFontSize) || 16;
    const minimumFontSize = 7;
    table.style.fontSize = `${baseFontSize}px`;

    if (styleMobileMedia?.matches) return;

    if (markdownTableFits(table, wrapper)) return;

    let low = minimumFontSize;
    let high = baseFontSize;
    let best = low;

    for (let index = 0; index < 10; index += 1) {
      const mid = (low + high) / 2;
      table.style.fontSize = `${mid}px`;
      if (markdownTableFits(table, wrapper)) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    table.style.fontSize = `${Math.max(minimumFontSize, best - 0.25)}px`;
  });
}

function scheduleMarkdownTableFit() {
  cancelAnimationFrame(markdownTableFitFrame);
  markdownTableFitFrame = requestAnimationFrame(() => {
    document.querySelectorAll(".rendered").forEach((node) => fitMarkdownTables(node));
  });
}

function addDiagramZoomControl(node) {
  if (node.closest("#printRoot")) return;
  if (node.parentElement?.classList.contains("diagram-shell")) return;

  const shell = document.createElement("div");
  shell.className = "diagram-shell";
  if (node.classList.contains("nomnoml-light-theme")) {
    shell.classList.add("nomnoml-light-shell");
  }
  const button = document.createElement("button");
  button.className = "diagram-zoom";
  button.type = "button";
  button.textContent = "Zoom";
  button.addEventListener("click", () => openDiagramModal(node));

  node.parentNode.insertBefore(shell, node);
  shell.appendChild(node);
  shell.appendChild(button);
}

let currentDiagramZoom = null;
const diagramZoomRange = {
  min: 0.2,
  max: 8
};

function clampDiagramScale(value) {
  return Math.min(diagramZoomRange.max, Math.max(diagramZoomRange.min, value));
}

function diagramViewportCenter() {
  const rect = el.diagramModalBody.getBoundingClientRect();
  return {
    x: rect.width / 2,
    y: rect.height / 2
  };
}

function diagramLocalPoint(point) {
  if (Number.isFinite(point?.x) && Number.isFinite(point?.y)) {
    return { x: point.x, y: point.y };
  }
  const rect = el.diagramModalBody.getBoundingClientRect();
  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top
  };
}

function zoomDiagramTo(scale, focalPoint = diagramViewportCenter()) {
  if (!currentDiagramZoom) return;
  const nextScale = clampDiagramScale(scale);
  const focal = diagramLocalPoint(focalPoint);
  const anchorX = (focal.x - currentDiagramZoom.x) / currentDiagramZoom.scale;
  const anchorY = (focal.y - currentDiagramZoom.y) / currentDiagramZoom.scale;
  currentDiagramZoom.scale = nextScale;
  currentDiagramZoom.x = focal.x - anchorX * nextScale;
  currentDiagramZoom.y = focal.y - anchorY * nextScale;
  applyDiagramTransform();
}

function zoomDiagramBy(multiplier) {
  if (!currentDiagramZoom) return;
  zoomDiagramTo(currentDiagramZoom.scale * multiplier);
}

function diagramPointers() {
  return Array.from(currentDiagramZoom?.pointers.values() || []);
}

function pointerDistance(points) {
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function pointerCenter(points) {
  return {
    x: (points[0].x + points[1].x) / 2,
    y: (points[0].y + points[1].y) / 2
  };
}

function isVectorDiagramContent(content) {
  return content instanceof SVGElement;
}

function baseDiagramSize(content) {
  const rect = content.getBoundingClientRect();
  const viewBox = content instanceof SVGElement ? content.viewBox?.baseVal : null;
  if (viewBox?.width && viewBox?.height) {
    return {
      width: viewBox.width,
      height: viewBox.height
    };
  }
  if (content instanceof HTMLImageElement && content.naturalWidth && content.naturalHeight) {
    return {
      width: content.naturalWidth,
      height: content.naturalHeight
    };
  }
  return {
    width: rect.width || Number(content.getAttribute("width")) || 1,
    height: rect.height || Number(content.getAttribute("height")) || 1
  };
}

function applyDiagramTransform() {
  if (!currentDiagramZoom?.content) return;
  const { content, scale, x, y, baseWidth, baseHeight, isVector } = currentDiagramZoom;
  if (isVector) {
    content.style.width = `${baseWidth}px`;
    content.style.height = `${baseHeight}px`;
  }

  content.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${x}, ${y})`;
}

function beginDiagramPan(point) {
  if (!currentDiagramZoom) return;
  const local = diagramLocalPoint(point);
  currentDiagramZoom.mode = "pan";
  currentDiagramZoom.panStartX = currentDiagramZoom.x;
  currentDiagramZoom.panStartY = currentDiagramZoom.y;
  currentDiagramZoom.pointerStartX = local.x;
  currentDiagramZoom.pointerStartY = local.y;
}

function beginDiagramPinch() {
  if (!currentDiagramZoom) return;
  const points = diagramPointers();
  if (points.length < 2) return;

  const center = pointerCenter(points);
  currentDiagramZoom.mode = "pinch";
  currentDiagramZoom.pinchStartDistance = pointerDistance(points) || 1;
  currentDiagramZoom.pinchStartScale = currentDiagramZoom.scale;
  currentDiagramZoom.pinchAnchorX = (center.x - currentDiagramZoom.x) / currentDiagramZoom.scale;
  currentDiagramZoom.pinchAnchorY = (center.y - currentDiagramZoom.y) / currentDiagramZoom.scale;
}

function centerDiagramContent(content) {
  if (!currentDiagramZoom || currentDiagramZoom.content !== content) return;
  const bodyRect = el.diagramModalBody.getBoundingClientRect();
  const { width, height } = baseDiagramSize(content);
  currentDiagramZoom.baseWidth = width;
  currentDiagramZoom.baseHeight = height;
  const fitPadding = 24;
  const fitScale = Math.min(
    1,
    Math.max(0.1, (bodyRect.width - fitPadding * 2) / Math.max(width, 1)),
    Math.max(0.1, (bodyRect.height - fitPadding * 2) / Math.max(height, 1))
  );

  currentDiagramZoom.scale = clampDiagramScale(fitScale);
  currentDiagramZoom.x = (bodyRect.width - width * currentDiagramZoom.scale) / 2;
  currentDiagramZoom.y = (bodyRect.height - height * currentDiagramZoom.scale) / 2;
  applyDiagramTransform();
}

function initializeDiagramZoom(content) {
  const { width, height } = baseDiagramSize(content);
  currentDiagramZoom = {
    content,
    isVector: isVectorDiagramContent(content),
    baseWidth: width,
    baseHeight: height,
    scale: 1,
    x: 0,
    y: 0,
    pointers: new Map(),
    mode: "",
    panStartX: 0,
    panStartY: 0,
    pointerStartX: 0,
    pointerStartY: 0,
    pinchStartDistance: 1,
    pinchStartScale: 1,
    pinchAnchorX: 0,
    pinchAnchorY: 0
  };
  requestAnimationFrame(() => centerDiagramContent(content));
}

function resetDiagramZoom() {
  currentDiagramZoom = null;
}

function openDiagramModal(node) {
  lockPageScroll();
  el.diagramModalBody.innerHTML = "";
  el.diagramModalBody.classList.remove("nomnoml-light-modal-body");
  if (node.tagName === "IMG") {
    el.diagramModalBody.appendChild(node.cloneNode(true));
  } else {
    el.diagramModalBody.innerHTML = node.innerHTML;
  }
  el.diagramModal.hidden = false;
  
  const content = el.diagramModalBody.querySelector("svg, img");
  if (content) {
    content.classList.add("diagram-zoom-content");
    if (content.classList.contains("nomnoml-light-svg")) {
      el.diagramModalBody.classList.add("nomnoml-light-modal-body");
    }
    initializeDiagramZoom(content);
  }
}

function closeDiagramModal() {
  el.diagramModal.hidden = true;
  el.diagramModalBody.innerHTML = "";
  el.diagramModalBody.classList.remove("nomnoml-light-modal-body");
  resetDiagramZoom();
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
  return { id: 'card-' + Date.now(), question: '', answer: '' };
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
    setCardStatusBadge(node.querySelector("[data-all-status-label]"), status);
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
  adjustCornellRowHeight(item);
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
  if (side === "answer") item.classList.add("is-flipped");
  editor.hidden = false;
  editor.dataset.side = side;
  editor.querySelector("[data-all-edit-label]").textContent = side === "answer" ? "Answer" : "Question";
  const textarea = editor.querySelector("[data-all-edit-value]");
  textarea.value = side === "answer" ? card.answer : card.question;
  updateAllCardEditButton(item);
  adjustCornellRowHeight(item);
  enableSyntaxHighlighting(textarea);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
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
  if (item.dataset.answerRendered === "true") {
    adjustCornellRowHeight(item);
    return;
  }
  if (item.dataset.answerRendered === "rendering") return;
  const card = item.cardData;
  if (!card) return;

  item.dataset.answerRendered = "rendering";
  const answerView = item.querySelector(".all-card-answer .rendered");
  answerView.textContent = "Rendering...";
  await renderMarkdown(answerView, card.answer, true);
  item.dataset.answerRendered = "true";
  adjustCornellRowHeight(item);
}

function flipAllCard(item) {
  if (item.dataset.answerRendered === "rendering") return;
  if (item.classList.contains("is-editing")) return;
  const willShowAnswer = !item.classList.contains("is-flipped");
  item.classList.toggle("is-flipped", willShowAnswer);
  if (willShowAnswer) {
    ensureAllCardAnswer(item).then(() => adjustCornellRowHeight(item));
  } else {
    adjustCornellRowHeight(item);
  }
  updateAllCardEditButton(item);
}

function adjustCornellRowHeight(row) {
  if (!row) return;
  row.style.minHeight = "";
  const rail = row.querySelector(".cornell-question-rail");
  const question = rail?.querySelector(".rendered");
  const answerCell = row.querySelector(".cornell-answer-cell");
  if (!rail || !question || !answerCell) return;

  const railStyle = getComputedStyle(rail);
  const railPaddingY = (parseFloat(railStyle.paddingTop) || 0) + (parseFloat(railStyle.paddingBottom) || 0);
  const railGap = parseFloat(railStyle.rowGap || railStyle.gap) || 0;
  const badge = rail.querySelector(".cornell-row-number");
  const badgeHeight = badge ? badge.getBoundingClientRect().height : 0;
  const questionBuffer = row.classList.contains("cornell-print-row") ? 10 : 16;
  const questionHeight = question.scrollHeight + railPaddingY + badgeHeight + railGap + questionBuffer;
  const answerHeight = answerCell.scrollHeight;
  const minHeight = row.classList.contains("cornell-print-row") ? 72 : 108;
  row.style.minHeight = `${Math.ceil(Math.max(minHeight, rail.scrollHeight, questionHeight, answerHeight))}px`;
}

function adjustCornellRows(container = document) {
  container.querySelectorAll(".cornell-card, .cornell-print-row").forEach(adjustCornellRowHeight);
}

function updateAllAnswersToggleButton() {
  if (!el.toggleAllAnswersBtn) return;
  el.toggleAllAnswersBtn.textContent = allCardsAnswersVisible ? "Hide answers" : "Show answers";
  el.toggleAllAnswersBtn.setAttribute("aria-pressed", allCardsAnswersVisible ? "true" : "false");
}

async function setAllCardsAnswersVisible(visible) {
  allCardsAnswersVisible = Boolean(visible);
  updateAllAnswersToggleButton();

  const rows = Array.from(el.allCardsList.querySelectorAll(".cornell-card"));
  for (const row of rows) {
    row.classList.toggle("is-flipped", allCardsAnswersVisible);
    if (allCardsAnswersVisible) {
      await ensureAllCardAnswer(row);
    } else {
      adjustCornellRowHeight(row);
    }
  }
  await afterPaint();
  adjustCornellRows(el.allCardsList);
}

async function renderAllCards() {
  const cards = state.masterCards;
  const renderId = allCardsRenderId;
  el.allCardsList.innerHTML = "";
  el.allCardsSummary.textContent = `${cards.length} ${cards.length === 1 ? "card" : "cards"}`;
  updateAllAnswersToggleButton();

  for (const [index, card] of cards.entries()) {
    if (renderId !== allCardsRenderId) return;

    const template = document.createElement("template");
    template.innerHTML = cornellCardHtml(card, index, { answerVisible: allCardsAnswersVisible });
    const item = template.content.firstElementChild;
    item.cardData = card;
    const editor = document.createElement("div");
    editor.className = "all-card-editor";
    editor.hidden = true;
    editor.innerHTML = `
      <label>
        <div class="all-card-editor-header">
          <span data-all-edit-label>Question</span>
          <div class="edit-toolbar" data-all-card-toolbar>
            ${createToolbarHtml()}
          </div>
        </div>
        <textarea data-all-edit-value spellcheck="false"></textarea>
      </label>
    `;
    item.querySelector(".cornell-answer-cell").appendChild(editor);
    el.allCardsList.appendChild(item);
    await enhanceRenderedMarkdown(item.querySelector(".all-card-question .rendered"));
    if (allCardsAnswersVisible) {
      await enhanceRenderedMarkdown(item.querySelector(".cornell-answer-body"));
    }
    adjustCornellRowHeight(item);
  }

  updateAllCardStatuses();
  await afterPaint();
  adjustCornellRows(el.allCardsList);
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

function cardStatusLabel(status) {
  if (status === "known") return "Known";
  if (status === "review") return "Review";
  return "Uncategorized";
}

function setCardStatusBadge(badge, status) {
  if (!badge) return;
  badge.dataset.status = status;
  badge.textContent = cardStatusLabel(status);
}

function updateActiveCardStatusBadges() {
  const card = state.previewCard || state.cards[state.current] || null;
  const status = card ? normalizeCardStatus(state.statusById[card.id]) : "";
  setCardStatusBadge(el.questionStatusBadge, status);
  setCardStatusBadge(el.answerStatusBadge, status);
}

function updateMeta() {
  const total = state.cards.length;
  const finished = Math.min(state.current, total);
  syncResults();
  updateActiveCardStatusBadges();
  el.deckTitle.textContent = state.deckTitle;
  el.deckTitle.title = state.deckTitle;
  el.deckTitleWrap.hidden = !state.deckTitle;
  el.editDeckTitleBtn.disabled = state.masterCards.length === 0;
  if (el.deckCategory) {
    el.deckCategory.textContent = normalizeDeckCategory(state.deckCategory);
    el.deckCategory.title = `Category: ${normalizeDeckCategory(state.deckCategory)}`;
  }
  if (el.editDeckCategoryBtn) {
    el.editDeckCategoryBtn.disabled = state.masterCards.length === 0;
  }
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

function buildDeckSummaryHtml() {
  syncResults();
  const total = state.masterCards.length;
  const known = state.results.known.length;
  const review = state.results.review.length;
  const uncategorized = total - known - review;

  const knownPct   = total ? Math.round((known / total) * 100) : 0;
  const reviewPct  = total ? Math.round((review / total) * 100) : 0;
  const uncatPct   = total ? (100 - knownPct - reviewPct) : 0;

  // SVG pie chart using stroke-dasharray on a circle (r=15.9, circumference≈100)
  const r = 15.9155;
  const circ = 2 * Math.PI * r; // ≈100
  const knownArc   = (known / total) * circ || 0;
  const reviewArc  = (review / total) * circ || 0;
  const uncatArc   = (uncategorized / total) * circ || 0;

  // Rotation offsets so segments start at top (-90deg = top)
  const knownOffset   = circ * 0.25; // start at top
  const reviewOffset  = knownOffset - knownArc;
  const uncatOffset   = reviewOffset - reviewArc;

  const isEmpty = total === 0;

  const pieSlices = isEmpty ? `
    <circle r="${r}" cx="21" cy="21" fill="none"
      stroke="var(--line)" stroke-width="8" stroke-dasharray="${circ} 0"/>
  ` : `
    ${known > 0 ? `<circle r="${r}" cx="21" cy="21" fill="none"
      stroke="var(--known,#22c55e)" stroke-width="8"
      stroke-dasharray="${knownArc} ${circ - knownArc}"
      stroke-dashoffset="${knownOffset}"
      class="pie-segment pie-known"/>` : ""}
    ${review > 0 ? `<circle r="${r}" cx="21" cy="21" fill="none"
      stroke="var(--review,#f59e0b)" stroke-width="8"
      stroke-dasharray="${reviewArc} ${circ - reviewArc}"
      stroke-dashoffset="${reviewOffset}"
      class="pie-segment pie-review"/>` : ""}
    ${uncategorized > 0 ? `<circle r="${r}" cx="21" cy="21" fill="none"
      stroke="var(--muted,#94a3b8)" stroke-width="8"
      stroke-dasharray="${uncatArc} ${circ - uncatArc}"
      stroke-dashoffset="${uncatOffset}"
      class="pie-segment pie-uncat"/>` : ""}
  `;

  return `<div class="deck-summary">
    <div class="deck-summary-header">
      <div class="deck-summary-icon">🎉</div>
      <h2 class="deck-summary-title">Deck Complete!</h2>
      <p class="deck-summary-subtitle">${escapeHtml(state.deckTitle || "All cards reviewed")}</p>
    </div>
    <div class="deck-summary-body">
      <div class="deck-summary-chart-wrap">
        <svg class="deck-summary-pie" viewBox="0 0 42 42" role="img" aria-label="Score breakdown">
          ${pieSlices}
          <text x="21" y="19.5" class="pie-center-num">${total}</text>
          <text x="21" y="24.5" class="pie-center-label">cards</text>
        </svg>
      </div>
      <div class="deck-summary-stats">
        <div class="deck-stat deck-stat-known">
          <span class="deck-stat-dot"></span>
          <span class="deck-stat-label">Known</span>
          <span class="deck-stat-count">${known}</span>
          <span class="deck-stat-pct">${knownPct}%</span>
        </div>
        <div class="deck-stat deck-stat-review">
          <span class="deck-stat-dot"></span>
          <span class="deck-stat-label">Review</span>
          <span class="deck-stat-count">${review}</span>
          <span class="deck-stat-pct">${reviewPct}%</span>
        </div>
        <div class="deck-stat deck-stat-uncat">
          <span class="deck-stat-dot"></span>
          <span class="deck-stat-label">Uncategorized</span>
          <span class="deck-stat-count">${uncategorized}</span>
          <span class="deck-stat-pct">${uncatPct}%</span>
        </div>
      </div>
    </div>
    <div class="deck-summary-actions">
      <button class="deck-summary-btn deck-summary-btn-primary" data-replay="all">↺ Restart All</button>
      <button class="deck-summary-btn deck-summary-btn-review" data-replay="review" ${review === 0 ? "disabled" : ""}>❌ Review (${review})</button>
      <button class="deck-summary-btn deck-summary-btn-uncat" data-replay="uncategorized" ${uncategorized === 0 ? "disabled" : ""}>? Uncategorized (${uncategorized})</button>
      <button class="deck-summary-btn deck-summary-btn-known" data-replay="known" ${known === 0 ? "disabled" : ""}>✅ Known (${known})</button>
    </div>
  </div>`;
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
    if (state.cards.length > 0) {
      // Deck finished — show rich summary overlay covering the whole card
      if (el.deckSummary) {
        el.deckSummary.innerHTML = buildDeckSummaryHtml();
        el.deckSummary.hidden = false;
      }
    } else {
      // No deck loaded
      if (el.deckSummary) el.deckSummary.hidden = true;
      await renderMarkdown(el.questionView, "Import a deck to begin.");
      await renderMarkdown(el.answerView, "");
      el.questionView.style.fontSize = "";
      el.questionView.style.width = "";
      el.questionView.style.removeProperty("--question-fit-font-size");
    }
    updateMeta();
    return;
  }

  // Normal card — hide summary overlay
  if (el.deckSummary) el.deckSummary.hidden = true;
  await renderMarkdown(el.questionView, card.question, true);
  await renderMarkdown(el.answerView, card.answer, true);
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

function buildCards(titleHint = state.importTitleHint || "", append = false) {
  const source = stripReaderMetadata(el.sourceInput.value);
  const cards = parseCards(source);
  const headingCount = countQuestionHeadings(source);
  const importTitle = titleFromImportHint(titleHint);
  if (append) {
    state.cards = state.cards.concat(cards);
    state.masterCards = state.masterCards.concat(cards);
  } else {
    state.masterCards = cards.slice();
    state.deckId = null;
    resetStudyDeck(state.masterCards);
    state.deckTitle = cards.length ? importTitle || inferDeckTitle(source, titleHint) : "";
    state.deckCategory = defaultDeckCategory;
    state.sourceTitle = cards.length ? importTitle || state.deckTitle : "";
  }
  state.importTitleHint = titleHint;
  closeAllCardsPanel();

  if (cards.length) {
    setStatus(`Built ${cards.length} card${cards.length === 1 ? "" : "s"}.`);
    savePersistedDeck();
    closeImportPanel();
  } else {
    savePersistedDeck();
    const message = headingCount
      ? `Found ${headingCount} question heading${headingCount === 1 ? "" : "s"}, but no answer text. This Notion page is exposing collapsed toggle titles only; export Markdown or paste expanded toggle content.`
      : "No cards found. Use :: card blocks with a --- separator, legacy > toggle blocks, Q:/A: blocks, or ##/###/#### headings with answer content.";
    setStatus(message, "error");
  }

  showCard();
  return cards.length;
}

function flipCard() {
  if (!state.previewCard && !state.cards[state.current]) return;
  state.flipped = !state.flipped;
  el.card.classList.toggle("is-flipped", state.flipped);
}

function navigateCard(direction, animationDirection = direction) {
  if (state.previewCard || !state.cards.length) return;

  // Allow going one step past the last card to show the end-of-deck summary
  if (direction > 0 && state.current >= state.cards.length - 1) {
    animateToCard(animationDirection, () => {
      state.current = state.cards.length; // triggers summary in showCard
      state.previewCard = null;
      state.flipped = false;
    });
    return;
  }

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
  resetStudyDeck(state.masterCards);
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
    ? cards.map((card) => `::\n${card.question.trim()}\n\n---\n\n${card.answer.trim()}\n::`).join("\n\n")
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
    deckCategory: normalizeDeckCategory(state.deckCategory),
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
    localStorage.removeItem("flashcards_style_cache");
  } catch (error) {
    console.warn("Could not clear browser persistence", error);
  }
}

function savePersistedDeck() {
  try {
    if (!state.masterCards.length) {
      localStorage.removeItem(deckStorageKey);
      return;
    }
    localStorage.setItem(deckStorageKey, JSON.stringify(deckSnapshot()));
  } catch (error) {
    console.warn("Could not save deck state", error);
  }
}

function loadDeckSnapshot(payload, titleHint = "", append = false) {
  if (!payload || !Array.isArray(payload.cards)) {
    throw new Error("Invalid flashcard JSON");
  }

  const usedIds = new Set(append ? state.masterCards.map(c => c.id) : []);
  const statusById = append ? { ...state.statusById } : {};
  const cards = payload.cards
    .map((rawCard, index) => {
      const question = String(rawCard?.question || "").trim();
      const answer = String(rawCard?.answer || "").trim();
      if (!question || !answer) return null;

      let id = String(rawCard.id || `${index}-${question.slice(0, 32)}`);
      while (usedIds.has(id)) id = `${index}-${Math.random().toString(36).slice(2, 6)}-${id}`;
      usedIds.add(id);

      const status = normalizeCardStatus(rawCard?.status || payload.statusById?.[id]);
      if (status) statusById[id] = status;

      return { id, question, answer };
    })
    .filter(Boolean);

  if (!cards.length) {
    throw new Error("No cards in flashcard JSON");
  }

  if (append) {
    state.cards = state.cards.concat(cards);
    state.masterCards = state.masterCards.concat(cards);
    state.statusById = statusById;
  } else {
    state.masterCards = cards.slice();
    resetStudyDeck(state.masterCards);
    state.statusById = statusById;
    state.current = Math.min(Math.max(Number(payload.current) || 0, 0), cards.length);
    state.deckTitle = String(payload.deckTitle || "").trim() || humanizeSourceTitle(titleHint);
    state.deckCategory = normalizeDeckCategory(payload.deckCategory || payload.category);
    state.deckId = payload.deckId || null;
    state.sourceTitle = String(payload.sourceTitle || "").trim() || sourceFileTitle(titleHint) || state.deckTitle;
    state.importTitleHint = String(payload.importTitleHint || "").trim() || titleHint;
  }
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
  const maxQuestionFontSize = numericStyleValue(settings.questionMaxFontSize) ?? numericStyleValue(styleDefaults.questionMaxFontSize) ?? 64;
  const availableHeight = Math.max(face.clientHeight - paddingY - occupiedHeight - gapHeight, 1);
  const availableWidth = Math.max(face.clientWidth - paddingX, 1);
  const targetHeight = Math.max(availableHeight * fillRatio, 1);
  const searchCeiling = Math.max(1, Math.min(maxQuestionFontSize, 360, targetHeight / Math.max(lineHeight, 0.1) * 2.2, availableWidth * 1.6));
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
    return contentSize.width <= Math.max(node.clientWidth, availableWidth) + 4
      && contentSize.height <= targetHeight + 2
      && contentSize.height <= availableHeight + 2;
  };

  for (let index = 0; index < 10; index += 1) {
    const mid = (low + high) / 2;
    node.style.setProperty("--question-fit-font-size", `${mid}px`);
    if (fits()) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  node.style.setProperty("--question-fit-font-size", `${Math.min(maxQuestionFontSize, Math.max(1, best - 0.5))}px`);
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
  const maxQuestionFontSize = numericStyleValue(settings.questionMaxFontSize) ?? numericStyleValue(styleDefaults.questionMaxFontSize) ?? 64;
  const questionUpper = Math.max(1, Math.min(maxQuestionFontSize, 220, node.clientHeight * fillRatio / Math.max(lineHeight, 0.1), Math.max(node.clientWidth, 1)));

  if (!shouldGrow && contentFits(node)) return;

  let low = shouldGrow ? 1 : 4;
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

function scopeTitle(scope = "all") {
  if (scope === "known") return "Known Cards";
  if (scope === "review") return "Review Cards";
  if (scope === "uncategorized") return "Uncategorized Cards";
  return "All Cards";
}

function closePrintPreview() {
  printPreviewOpen = false;
  el.printRoot.classList.remove("is-preparing", "is-preview");
  el.printRoot.innerHTML = "";
  el.printRoot.setAttribute("aria-hidden", "true");
  document.querySelector(`#${pdfPrintStyleId}`)?.remove();
  if (printTitleBeforeExport) document.title = printTitleBeforeExport;
  printTitleBeforeExport = "";
  unlockPageScroll();
}

function cardOrdinalLabel(index) {
  return `Q${index + 1}`;
}

function isPrintDeckDivider(entry) {
  return entry?.type === "deck-divider";
}

function printableCardCount(entries = []) {
  return entries.filter((entry) => !isPrintDeckDivider(entry)).length;
}

function cornellDeckDividerHtml(entry) {
  return `
    <article class="cornell-print-deck-divider">
      <span>Deck</span>
      <h2>${escapeHtml(entry.title || "Untitled")}</h2>
      <p>Category: ${escapeHtml(normalizeDeckCategory(entry.category))}</p>
    </article>
  `;
}

function cornellCardHtml(card, index, { answerVisible = false, print = false, statusById = state.statusById } = {}) {
  const status = normalizeCardStatus(statusById[card.id] || card.status);
  const statusLabel = cardStatusLabel(status);
  const rowClass = print ? "cornell-print-row" : "all-card cornell-card";
  const openClass = answerVisible ? " is-flipped" : "";
  const idAttr = print ? "" : ` data-card-id="${escapeHtml(card.id)}" data-status="${escapeHtml(status)}" data-answer-rendered="${answerVisible ? "true" : "false"}"`;
  const draggableAttr = print ? "" : ` tabindex="0" draggable="true"`;
  const answerHtml = answerVisible ? markdownToSafeHtml(card.answer) : "";
  // Use clean class names for print — strip interactive all-card-* classes that have display:none rules
  const questionClass = print ? "cornell-question-rail" : "cornell-question-rail all-card-question";
  const answerClass = print ? "cornell-answer-cell" : "cornell-answer-cell all-card-answer";

  return `
    <article class="${rowClass}${openClass}"${idAttr}${draggableAttr}>
      <aside class="${questionClass}">
        <span class="cornell-row-number">${cardOrdinalLabel(index)}</span>
        <div class="rendered">${markdownToSafeHtml(card.question)}</div>
      </aside>
      <section class="${answerClass}">
        <div class="cornell-row-head">
          ${print ? "" : `<span class="all-card-status-label cornell-status" data-all-status-label data-status="${escapeHtml(status)}">${escapeHtml(statusLabel)}</span>`}
          ${print ? "" : `
            <div class="all-card-actions" aria-label="Card controls">
              <button class="all-card-add" type="button" data-all-add-after title="Insert card after this one" aria-label="Insert card after this one">+</button>
              <button class="all-card-edit" type="button" data-all-edit-current title="Edit question" aria-label="Edit question">&#9998;</button>
              <button class="all-card-review" type="button" data-all-status="review">Review</button>
              <button class="all-card-known" type="button" data-all-status="known">Known</button>
            </div>
          `}
        </div>
        <div class="cornell-answer-body rendered">${answerHtml}</div>
        ${print ? "" : `<div class="cornell-answer-cue">Tap row to ${answerVisible ? "hide" : "show"} answer</div>`}
      </section>
    </article>
  `;
}

function buildCornellPrintDocument(title, cards, scope, options = {}) {
  const total = printableCardCount(cards);
  const sourceTitle = options.sourceTitle || state.deckTitle || state.sourceTitle || "Flashcards";
  const statusById = options.statusById || state.statusById;
  let cardIndex = 0;
  return `
    <div class="print-preview-actions" data-print-ui>
      <button type="button" data-print-close>Close</button>
      <button type="button" data-print-now>Download PDF</button>
    </div>
    <div class="cornell-print-document">
      <header class="cornell-print-cover">
        <div>
          <h1>${escapeHtml(sourceTitle)}</h1>
          <p>${total} ${total === 1 ? "card" : "cards"} · ${new Date().toLocaleString()}</p>
        </div>
      </header>
      <section class="cornell-print-table" aria-label="${escapeHtml(title)} Cornell notes">
        ${cards.map((entry) => {
          if (isPrintDeckDivider(entry)) return cornellDeckDividerHtml(entry);
          const html = cornellCardHtml(entry, cardIndex, { answerVisible: true, print: true, statusById });
          cardIndex += 1;
          return html;
        }).join("\n")}
      </section>
    </div>
  `;
}

function markOversizePrintRows() {
  const a4PortraitContentHeightMm = 277;
  const pageHeight = Math.round(a4PortraitContentHeightMm * 96 / 25.4);
  el.printRoot.querySelectorAll(".cornell-print-row").forEach((row) => {
    row.classList.toggle("is-oversize", row.scrollHeight > pageHeight);
  });
}

function installPdfPrintStyle() {
  let style = document.querySelector(`#${pdfPrintStyleId}`);
  if (!style) {
    style = document.createElement("style");
    style.id = pdfPrintStyleId;
    document.head.appendChild(style);
  }
  style.textContent = `
    @media print {
      @page { size: A4 portrait; margin: 12mm; }

      /* Card layout */
      .cornell-print-document { width: auto !important; border: none !important; box-shadow: none !important; }
      .cornell-print-table { padding: 6mm 0 0 !important; }
      .cornell-print-row {
        display: flex !important;
        flex-direction: row !important;
        align-items: stretch !important;
        border: 2px solid #bbb !important;
        border-radius: 0 !important;
        margin-bottom: 6mm !important;
        overflow: hidden !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .cornell-print-row .cornell-question-rail {
        flex: 0 0 45mm !important;
        width: 45mm !important;
        min-width: 45mm !important;
        border-right: 2px solid #bbb !important;
      }
      .cornell-print-row .cornell-answer-cell {
        flex: 1 1 0 !important;
        min-width: 0 !important;
      }
      /* Oversized cards (taller than a page): let them fragment but start on new page */
      .cornell-print-row.is-oversize {
        break-inside: auto !important;
        page-break-inside: auto !important;
        break-before: page;
        page-break-before: always;
      }

      /* Code block light theme for print */
      .cornell-print-row pre,
      .cornell-print-row pre[class*="language-"] {
        background: #f6f8fa !important;
        border: 1px solid #d0d0d0 !important;
        color: #24292e !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      .cornell-print-row pre code,
      .cornell-print-row pre code[class*="language-"] {
        color: #24292e !important;
        background: transparent !important;
      }
      .cornell-print-row .token.comment,
      .cornell-print-row .token.prolog,
      .cornell-print-row .token.doctype,
      .cornell-print-row .token.cdata { color: #6a737d !important; font-style: italic !important; }
      .cornell-print-row .token.keyword,
      .cornell-print-row .token.atrule { color: #d73a49 !important; font-weight: bold !important; }
      .cornell-print-row .token.function { color: #6f42c1 !important; }
      .cornell-print-row .token.string,
      .cornell-print-row .token.char,
      .cornell-print-row .token.attr-value { color: #032f62 !important; }
      .cornell-print-row .token.number,
      .cornell-print-row .token.boolean { color: #005cc5 !important; }
      .cornell-print-row .token.operator { color: #d73a49 !important; }
      .cornell-print-row .token.punctuation { color: #24292e !important; }
      .cornell-print-row .token.tag,
      .cornell-print-row .token.selector { color: #22863a !important; }
      .cornell-print-row .token.variable { color: #e36209 !important; }

      /* Tables */
      .cornell-print-row table {
        width: 100% !important;
        border-collapse: collapse !important;
        font-size: 8.5pt !important;
      }
      .cornell-print-row th { background: #f0f0f0 !important; font-weight: bold !important; color: #222 !important; }
      .cornell-print-row th,
      .cornell-print-row td { border: 1px solid #bbb !important; padding: 3px 6px !important; }

      /* Images */
      .cornell-print-row img {
        max-width: 100% !important;
        max-height: 50mm !important;
        object-fit: contain !important;
      }
    }
  `;
}

function standalonePrintStyles() {
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
    .map((link) => `<link rel="stylesheet" href="${escapeHtml(link.href)}">`)
    .join("\n");
  const pdfPrintStyle = document.querySelector(`#${pdfPrintStyleId}`)?.textContent || "";
  return `
    ${links}
    <style>
      html,
      body {
        margin: 0;
        background: var(--print-bg);
        color: var(--print-text);
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      body {
        padding: 0;
      }
      .print-root,
      .print-root.is-preview,
      .print-root.is-preparing {
        position: static !important;
        display: block !important;
        width: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
        background: var(--print-bg) !important;
        color: var(--print-text) !important;
        padding: 0 !important;
        box-shadow: none !important;
        print-color-adjust: exact !important;
        -webkit-print-color-adjust: exact !important;
      }
      .cornell-print-document {
        width: auto !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
      .print-preview-actions,
      [data-print-ui] {
        display: none !important;
      }
      @media screen {
        body {
          padding: 10px;
        }
      }
      ${pdfPrintStyle}
    </style>
  `;
}

function standalonePrintDocumentHtml() {
  const documentNode = el.printRoot.querySelector(".cornell-print-document");
  if (!documentNode) return "";
  return `<!doctype html>
    <html lang="en" data-theme="${escapeHtml(currentThemeId())}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <base href="${escapeHtml(document.baseURI)}">
        <title>${escapeHtml(document.title || "Flashcards PDF")}</title>
        ${standalonePrintStyles()}
      </head>
      <body>
        <section class="print-root is-preview" aria-label="Cornell PDF export">
          ${documentNode.outerHTML}
        </section>
        <script>
          (() => {
            const printWhenReady = () => {
              const waitForImages = Promise.all(Array.from(document.images).map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                  img.addEventListener("load", resolve, { once: true });
                  img.addEventListener("error", resolve, { once: true });
                });
              }));
              Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), waitForImages])
                .then(() => setTimeout(() => window.print(), 250));
            };
            if (document.readyState === "complete") {
              printWhenReady();
            } else {
              window.addEventListener("load", printWhenReady, { once: true });
            }
          })();
        <\/script>
      </body>
    </html>`;
}

async function generatePdfDirectly() {
  const documentNode = el.printRoot.querySelector(".cornell-print-document");
  if (!documentNode) {
    setStatus("PDF preview is not ready yet.", "error");
    return;
  }

  // Use fast standalone print window — browser print is instant and uses @media print CSS
  openStandalonePrintDocument();
}

function openStandalonePrintDocument() {
  const html = standalonePrintDocumentHtml();
  if (!html) {
    setStatus("PDF preview is not ready yet.", "error");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    setStatus("Could not open the print page. Allow pop-ups, then try Print / Save PDF again.", "error");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  setStatus("Opened a dedicated print page. Choose Save as PDF there.");
}

async function exportCardsPdf(sourceTitle, cards, options = {}) {
  const title = options.title || "All Cards";
  const statusById = options.statusById || {};
  const fileBaseName = slugifyFileName(options.fileBaseName || sourceTitle || "flashcards");
  const cardCount = printableCardCount(cards);

  if (!cardCount) {
    setStatus("No cards to export as PDF.", "error");
    return;
  }

  setStatus(`Preparing ${sourceTitle} Cornell PDF...`);
  el.exportBtn.disabled = true;
  el.printRoot.innerHTML = "";
  el.printRoot.classList.add("is-preparing");
  el.printRoot.classList.remove("is-preview");
  el.printRoot.setAttribute("aria-hidden", "true");
  printTitleBeforeExport = document.title;
  document.title = fileBaseName;

  try {
    await afterPaint();
    el.printRoot.innerHTML = buildCornellPrintDocument(title, cards, "all", { sourceTitle, statusById });
    configureMermaid("print");
    try {
      await enhanceRenderedMarkdown(el.printRoot);
    } finally {
      configureMermaid(currentThemeId());
    }
    await (document.fonts?.ready || Promise.resolve());
    await afterPaint();

    adjustCornellRows(el.printRoot);
    await afterPaint();
    installPdfPrintStyle();
    el.printRoot.classList.remove("is-preparing");
    el.printRoot.classList.add("is-preview");
    el.printRoot.setAttribute("aria-hidden", "false");
    printPreviewOpen = true;
    lockPageScroll();
    markOversizePrintRows();
    setStatus(`${sourceTitle} Cornell PDF preview is ready. Use Download PDF.`);
  } catch (error) {
    console.error("PDF export failed", error);
    closePrintPreview();
    setStatus("Could not prepare the PDF export.", "error");
  } finally {
    el.exportBtn.disabled = false;
  }
}

async function exportPdf(scope = "all") {
  const cards = cardsForScope(scope);
  const title = scopeTitle(scope);
  if (!cards.length) {
    setStatus(`No ${scope === "review" ? "review" : scope} cards to export.`, "error");
    return;
  }

  setStatus(`Preparing ${title.toLowerCase()} Cornell PDF...`);
  el.exportBtn.disabled = true;
  el.printRoot.innerHTML = "";
  el.printRoot.classList.add("is-preparing");
  el.printRoot.classList.remove("is-preview");
  el.printRoot.setAttribute("aria-hidden", "true");
  printTitleBeforeExport = document.title;
  document.title = exportBaseName(scope);
  try {
    await afterPaint();
    el.printRoot.innerHTML = buildCornellPrintDocument(title, cards, scope);
    configureMermaid("print");
    try {
      await enhanceRenderedMarkdown(el.printRoot);
    } finally {
      configureMermaid(currentThemeId());
    }
    await (document.fonts?.ready || Promise.resolve());
    await afterPaint();

    adjustCornellRows(el.printRoot);
    await afterPaint();
    installPdfPrintStyle();
    el.printRoot.classList.remove("is-preparing");
    el.printRoot.classList.add("is-preview");
    el.printRoot.setAttribute("aria-hidden", "false");
    printPreviewOpen = true;
    lockPageScroll();
    markOversizePrintRows();
    setStatus(`${title} Cornell PDF preview is ready. Use Download PDF.`);
  } catch (error) {
    console.error("PDF export failed", error);
    closePrintPreview();
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
  if (format === "sql") {
    exportSql(scope);
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
      state.deckCategory = defaultDeckCategory;
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

async function loadZipFile(file, append = false) {
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
    buildCards(state.importTitleHint, append);
  } catch (error) {
    setStatus("Could not read this zip export.", "error");
  }
}

function loadFile(file, append = false) {
  if (!file) return;

  if (isZipName(file.name) || /zip/i.test(file.type)) {
    loadZipFile(file, append);
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const text = String(reader.result || "");

    if (isJsonName(file.name) || file.type === "application/json") {
      try {
        loadDeckSnapshot(JSON.parse(text), file.name, append);
        el.sourceInput.value = "";
        setStatus(`Loaded ${state.masterCards.length} card${state.masterCards.length === 1 ? "" : "s"} from ${file.name}.`);
        closeImportPanel();
      } catch (error) {
        setStatus("Could not read this flashcard JSON export.", "error");
      }
      return;
    }

    el.sourceInput.value = text;
    state.importTitleHint = file.name;
    setStatus(`Loaded ${file.name}.`);
    buildCards(state.importTitleHint, append);
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

function resetPastePreview(message = "Paste Markdown and click Preview.", summary = "No preview yet") {
  pastePreviewSource = "";
  pastePreviewCards = [];
  if (el.pastePreviewSummary) el.pastePreviewSummary.textContent = summary;
  if (el.pastePreviewList) {
    el.pastePreviewList.innerHTML = `<div class="paste-preview-empty">${escapeHtml(message)}</div>`;
  }
  if (el.pasteImportBtn) el.pasteImportBtn.disabled = true;
}

function closePasteEditor(clear = false) {
  if (el.pasteEditorPanel) el.pasteEditorPanel.hidden = true;
  if (clear && el.pasteMarkdownInput) el.pasteMarkdownInput.value = "";
  resetPastePreview();
}

function openPasteEditor(append = false) {
  pasteImportAppend = append;

  if (el.pasteEditorTitle) {
    el.pasteEditorTitle.textContent = append ? "Paste Markdown Cards" : "Paste Markdown Deck";
  }
  if (el.pasteEditorHint) {
    el.pasteEditorHint.textContent = append
      ? "Append pasted Markdown cards to the current deck."
      : "Replace the current deck with pasted Markdown.";
  }
  if (el.pasteImportBtn) {
    el.pasteImportBtn.textContent = append ? "Import Pasted Cards" : "Import Pasted Deck";
  }
  if (el.pasteMarkdownInput) {
    el.pasteMarkdownInput.placeholder = append
      ? "Paste Markdown cards here"
      : "Paste Markdown deck here";
  }
  if (el.pasteEditorPanel) el.pasteEditorPanel.hidden = false;
  resetPastePreview();

  window.setTimeout(() => el.pasteMarkdownInput?.focus(), 0);
}

async function previewPastedMarkdown() {
  const markdown = el.pasteMarkdownInput?.value || "";
  if (!markdown.trim()) {
    setStatus("Paste Markdown before importing.", "error");
    el.pasteMarkdownInput?.focus();
    resetPastePreview("Paste Markdown to generate a preview.", "No preview");
    return;
  }

  const cards = parseCards(markdown);
  if (!cards.length) {
    const headingCount = countQuestionHeadings(markdown);
    const message = headingCount
      ? `Found ${headingCount} question heading${headingCount === 1 ? "" : "s"}, but no answer text.`
      : "No cards found in this Markdown.";
    resetPastePreview(message, "0 cards");
    setStatus(message, "error");
    return;
  }

  pastePreviewSource = markdown;
  pastePreviewCards = cards;
  if (el.pastePreviewSummary) {
    el.pastePreviewSummary.textContent = `${cards.length} card${cards.length === 1 ? "" : "s"}`;
  }
  if (el.pastePreviewList) {
    el.pastePreviewList.innerHTML = cards.map((card, index) => `
      <article class="paste-preview-card">
        <div class="paste-preview-card-head">Card ${index + 1}</div>
        <div class="paste-preview-card-side">
          <span class="paste-preview-card-label">Question</span>
          <div class="rendered">${markdownToSafeHtml(card.question)}</div>
        </div>
        <div class="paste-preview-card-side">
          <span class="paste-preview-card-label">Answer</span>
          <div class="rendered">${markdownToSafeHtml(card.answer)}</div>
        </div>
      </article>
    `).join("");
    await enhanceRenderedMarkdown(el.pastePreviewList);
  }
  if (el.pasteImportBtn) el.pasteImportBtn.disabled = false;
  setStatus(`Previewed ${cards.length} card${cards.length === 1 ? "" : "s"}.`);
}

async function importPastedMarkdown() {
  const markdown = el.pasteMarkdownInput?.value || "";
  if (!markdown.trim()) {
    setStatus("Paste Markdown before importing.", "error");
    el.pasteMarkdownInput?.focus();
    resetPastePreview("Paste Markdown to generate a preview.", "No preview");
    return;
  }

  if (!pastePreviewCards.length || pastePreviewSource !== markdown) {
    await previewPastedMarkdown();
    if (!pastePreviewCards.length || pastePreviewSource !== markdown) return;
  }

  el.sourceInput.value = markdown;
  const titleHint = pasteImportAppend
    ? state.importTitleHint || state.deckTitle || "Pasted cards"
    : "";
  state.importTitleHint = titleHint;
  setStatus(pasteImportAppend ? "Importing pasted cards..." : "Importing pasted deck...");
  const builtCount = buildCards(titleHint, pasteImportAppend);
  if (builtCount) closePasteEditor(true);
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
  if (closestElement(event.target, "input, button, a, label, textarea, .import-action-btn")) return;

  const point = event.touches[0];
  const previousY = state.stylePanelTouchY || point.clientY;
  const deltaY = previousY - point.clientY;
  state.stylePanelTouchY = point.clientY;
  containStylePanelScroll(event, deltaY);
}

function handleStylePanelWheel(event) {
  containStylePanelScroll(event, event.deltaY);
}

function handleDiagramWheel(event) {
  if (!currentDiagramZoom) return;
  preventCancelableScroll(event);
  const direction = event.deltaY > 0 ? 0.9 : 1.1;
  zoomDiagramTo(currentDiagramZoom.scale * direction, event);
}

function handleDiagramPointerDown(event) {
  const isPrimaryContact = event.button === 0 || event.pointerType === "touch" || event.pointerType === "pen";
  if (!currentDiagramZoom || !isPrimaryContact || event.target.closest("button, a")) return;
  preventCancelableScroll(event);
  el.diagramModalBody.setPointerCapture?.(event.pointerId);
  currentDiagramZoom.pointers.set(event.pointerId, diagramLocalPoint(event));
  el.diagramModalBody.classList.add("is-panning");

  const points = diagramPointers();
  if (points.length >= 2) beginDiagramPinch();
  else beginDiagramPan(points[0]);
}

function handleDiagramPointerMove(event) {
  if (!currentDiagramZoom?.pointers.has(event.pointerId)) return;
  preventCancelableScroll(event);
  currentDiagramZoom.pointers.set(event.pointerId, diagramLocalPoint(event));

  const points = diagramPointers();
  if (points.length >= 2) {
    if (currentDiagramZoom.mode !== "pinch") beginDiagramPinch();
    const distance = pointerDistance(points) || currentDiagramZoom.pinchStartDistance;
    const center = pointerCenter(points);
    const nextScale = clampDiagramScale(currentDiagramZoom.pinchStartScale * (distance / currentDiagramZoom.pinchStartDistance));
    currentDiagramZoom.scale = nextScale;
    currentDiagramZoom.x = center.x - currentDiagramZoom.pinchAnchorX * nextScale;
    currentDiagramZoom.y = center.y - currentDiagramZoom.pinchAnchorY * nextScale;
    applyDiagramTransform();
    return;
  }

  if (currentDiagramZoom.mode !== "pan") beginDiagramPan(points[0]);
  const local = diagramLocalPoint(event);
  currentDiagramZoom.x = currentDiagramZoom.panStartX + local.x - currentDiagramZoom.pointerStartX;
  currentDiagramZoom.y = currentDiagramZoom.panStartY + local.y - currentDiagramZoom.pointerStartY;
  applyDiagramTransform();
}

function handleDiagramPointerEnd(event) {
  if (!currentDiagramZoom?.pointers.has(event.pointerId)) return;
  currentDiagramZoom.pointers.delete(event.pointerId);
  el.diagramModalBody.releasePointerCapture?.(event.pointerId);

  const points = diagramPointers();
  if (points.length >= 2) {
    beginDiagramPinch();
  } else if (points.length === 1) {
    beginDiagramPan(points[0]);
  } else {
    currentDiagramZoom.mode = "";
    el.diagramModalBody.classList.remove("is-panning");
  }
}

function registerServiceWorker() {
  if (!pwaAssetsSupported()) return;
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

function pwaAssetsSupported() {
  return location.protocol === "http:" || location.protocol === "https:";
}

function installManifestLink() {
  if (!pwaAssetsSupported() || document.querySelector('link[rel="manifest"]')) return;

  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = "manifest.webmanifest";
  document.head.appendChild(link);
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
  state.deckCategory = defaultDeckCategory;
  state.sourceTitle = "New Deck";
  state.importTitleHint = "New Deck";
  state.masterCards = [createBlankCard()];
  resetStudyDeck(state.masterCards);
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
el.urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") fetchUrl();
});
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
el.closeImportBtn.addEventListener("click", closeImportPanel);
el.editDeckTitleBtn.addEventListener("click", editCurrentDeckTitle);
el.editDeckCategoryBtn?.addEventListener("click", editCurrentDeckCategory);
el.webDeckCategoryFilter?.addEventListener("change", fetchWebDecks);
el.globalWebExportBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  const shouldOpen = el.globalWebExportMenu?.hidden;
  closeWebDeckExportMenus(el.globalWebExportMenu);
  if (el.globalWebExportMenu) el.globalWebExportMenu.hidden = !shouldOpen;
  el.globalWebExportBtn.setAttribute("aria-expanded", String(Boolean(shouldOpen)));
});
el.globalWebExportMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-global-web-export]");
  if (!button) return;
  event.stopPropagation();
  el.globalWebExportMenu.hidden = true;
  el.globalWebExportBtn?.setAttribute("aria-expanded", "false");
  exportAllWebDecks(button.dataset.globalWebExport);
});
el.styleBtn.addEventListener("click", openStylePanel);
el.closeStyleBtn.addEventListener("click", closeStylePanel);
el.applyStyleBtn.addEventListener("click", () => applyCurrentStyleSettings());
el.syncUpBtn.addEventListener("click", syncStyleToWeb);
el.syncDownBtn.addEventListener("click", () => loadStyleFromWeb(true));
el.styleControls.addEventListener("click", (event) => {
  const button = event.target.closest("[data-style-profile]");
  if (!button) return;
  switchStyleEditProfile(button.dataset.styleProfile);
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

el.diagramModalBody.addEventListener("wheel", handleDiagramWheel, { passive: false });
el.diagramModalBody.addEventListener("pointerdown", handleDiagramPointerDown);
el.diagramModalBody.addEventListener("pointermove", handleDiagramPointerMove);
el.diagramModalBody.addEventListener("pointerup", handleDiagramPointerEnd);
el.diagramModalBody.addEventListener("pointercancel", handleDiagramPointerEnd);

el.allCardsBtn.addEventListener("click", openAllCardsPanel);
el.toggleAllAnswersBtn?.addEventListener("click", () => {
  setAllCardsAnswersVisible(!allCardsAnswersVisible);
});
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
el.printRoot.addEventListener("click", (event) => {
  if (event.target.closest("[data-print-close]")) {
    closePrintPreview();
    setStatus("Closed PDF preview.");
    return;
  }
  if (event.target.closest("[data-print-now]")) {
    generatePdfDirectly();
  }
});
el.themeBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  setThemeMenuOpen(el.themeMenu?.hidden ?? true);
});
el.themeMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme-option]");
  if (!button) return;
  setTheme(button.dataset.themeOption);
  setThemeMenuOpen(false);
});
el.fileInput.addEventListener("change", (event) => loadFile(event.target.files[0], false));
if (el.fileInputCards) el.fileInputCards.addEventListener("change", (event) => loadFile(event.target.files[0], true));
el.pasteDeckBtn?.addEventListener("click", () => openPasteEditor(false));
el.pasteCardsBtn?.addEventListener("click", () => openPasteEditor(true));
el.pastePreviewBtn?.addEventListener("click", previewPastedMarkdown);
el.pasteImportBtn?.addEventListener("click", importPastedMarkdown);
el.pasteCancelBtn?.addEventListener("click", () => closePasteEditor(false));
el.pasteMarkdownInput?.addEventListener("input", () => resetPastePreview("Preview is out of date. Click Preview again.", "Needs preview"));
el.pasteMarkdownInput?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePasteEditor(false);
});
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
  // Deck summary replay buttons
  const replayBtn = event.target.closest("[data-replay]");
  if (replayBtn) {
    replayDeck(replayBtn.dataset.replay);
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
  if (!event.target.closest(".theme-select")) {
    setThemeMenuOpen(false);
  }
  if (!event.target.closest(".web-deck-export-wrap, .web-decks-global-export")) {
    closeWebDeckExportMenus();
    el.globalWebExportBtn?.setAttribute("aria-expanded", "false");
  }
  if (!event.target.closest(".menu-wrap")) {
    el.exportMenu.hidden = true;
    closeDeckMenu();
  }
});

el.closeDiagramBtn.addEventListener("click", closeDiagramModal);
el.diagramZoomInBtn?.addEventListener("click", () => zoomDiagramBy(1.25));
el.diagramZoomOutBtn?.addEventListener("click", () => zoomDiagramBy(0.8));
el.diagramModal.addEventListener("click", (event) => {
  if (event.target === el.diagramModal) closeDiagramModal();
});

window.addEventListener("afterprint", () => {
  if (printPreviewOpen || el.printRoot.classList.contains("is-preparing") || el.printRoot.classList.contains("is-preview")) {
    closePrintPreview();
  }
});

window.addEventListener("resize", () => {
  scheduleMarkdownTableFit();
  scheduleLiveQuestionFit();
});
if (styleMobileMedia?.addEventListener) {
  styleMobileMedia.addEventListener("change", handleStyleEnvironmentChange);
} else if (styleMobileMedia?.addListener) {
  styleMobileMedia.addListener(handleStyleEnvironmentChange);
}

clearBrowserPersistence();
setStyleProfiles(defaultStyleProfiles);
applyActiveStyleSettings({ force: true });
renderThemeMenu();
setTheme("dark-amoled");
setStatus("");
showCard();
loadStyleFromWeb();
installManifestLink();
registerServiceWorker();

function toggleEditMode(side) {
  const isQuestion = side === 'question';
  const btn = isQuestion ? el.editQuestionBtn : el.editAnswerBtn;
  const view = isQuestion ? el.questionView : el.answerView;
  const edit = isQuestion ? el.questionEdit : el.answerEdit;
  const toolbar = isQuestion ? document.getElementById("questionEditToolbar") : document.getElementById("answerEditToolbar");
  const currentCard = state.cards[state.current];
  
  if (!currentCard) return;

  const isEditing = view.hidden;
  
  if (!isEditing) {
    view.hidden = true;
    edit.hidden = false;
    if (toolbar) toolbar.hidden = false;
    edit.value = isQuestion ? currentCard.question : currentCard.answer;
    btn.innerHTML = '&#128190;';
    btn.title = 'Save';
    edit.dispatchEvent(new Event("input", { bubbles: true }));
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
    if (toolbar) toolbar.hidden = true;
    btn.innerHTML = '&#9998;';
    btn.title = isQuestion ? 'Edit question' : 'Edit answer';
    
    renderMarkdown(view, newValue, true).then(() => {
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

// Convert rich text/HTML to Markdown on paste in all textareas
document.addEventListener("paste", (event) => {
  const target = event.target;
  if (target.tagName !== "TEXTAREA") return;

  if (typeof TurndownService === "undefined") return;

  const clipboardData = event.clipboardData || window.clipboardData;
  if (!clipboardData) return;

  const types = clipboardData.types || [];
  if (!types.includes("text/html")) return;

  const html = clipboardData.getData("text/html");
  if (!html) return;

  const plainText = clipboardData.getData("text/plain");

  // Prevent default paste behavior
  event.preventDefault();

  // Initialize TurndownService with preferences matching markdown cards
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    hr: "---",
    bulletListMarker: "-"
  });

  // Load GFM plugin for tables, strikethrough, etc. if available
  if (typeof turndownPluginGfm !== "undefined" && turndownPluginGfm.gfm) {
    turndownService.use(turndownPluginGfm.gfm);
  }

  // Restore KaTeX rendered math back into standard LaTeX ($...$ or $$...$$)
  turndownService.addRule("katex", {
    filter: function (node) {
      return node.nodeName === "SPAN" && node.classList.contains("katex");
    },
    replacement: function (content, node) {
      const annotation = node.querySelector('annotation[encoding="application/x-tex"]');
      if (annotation) {
        const tex = annotation.textContent.trim();
        const isDisplay = node.classList.contains("katex-display") || node.querySelector(".katex-display");
        return isDisplay ? "\n$$\n" + tex + "\n$$\n" : "$" + tex + "$";
      }
      return content;
    }
  });

  // Intercept and ignore MathJax rendering containers, extracting raw text from mjx-copytext
  turndownService.addRule("mathjax-containers", {
    filter: function (node) {
      return (
        (node.classList && (
          node.classList.contains("MathJax") || 
          node.classList.contains("MathJax_Preview") || 
          node.classList.contains("MathJax_Display")
        )) || 
        node.nodeName === "MJX-CONTAINER"
      );
    },
    replacement: function (content, node) {
      if (node.nodeName === "MJX-CONTAINER") {
        const copyTextEl = node.querySelector("mjx-copytext");
        if (copyTextEl) return copyTextEl.textContent.trim();
      }
      return "";
    }
  });

  // Extract LaTeX from MathJax 2 script tags
  turndownService.addRule("mathjax-script", {
    filter: function (node) {
      return node.nodeName === "SCRIPT" && node.type && node.type.startsWith("math/tex");
    },
    replacement: function (content, node) {
      const tex = node.textContent.trim();
      const isDisplay = node.type.includes("mode=display");
      return isDisplay ? "\n$$\n" + tex + "\n$$\n" : "$" + tex + "$";
    }
  });

  let markdown = "";
  try {
    markdown = turndownService.turndown(html);
  } catch (err) {
    console.error("Turndown conversion failed, falling back to plain text", err);
    markdown = plainText;
  }

  // Fallback to plain text if the markdown conversion was empty
  if (!markdown.trim() && plainText.trim()) {
    markdown = plainText;
  }

  let inserted = false;
  try {
    target.focus();
    inserted = document.execCommand("insertText", false, markdown);
  } catch (e) {
    console.warn("execCommand failed, falling back to manual insertion", e);
  }

  if (!inserted) {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const val = target.value;
    target.value = val.substring(0, start) + markdown + val.substring(end);
    target.selectionStart = target.selectionEnd = start + markdown.length;
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
});

// Dynamic HTML template for the inline edit toolbar
function createToolbarHtml() {
  return `
    <button type="button" data-action="bold" title="Bold"><b>B</b></button>
    <button type="button" data-action="italic" title="Italic"><i>I</i></button>
    <button type="button" data-action="underline" title="Underline"><u>U</u></button>
    <button type="button" data-action="strikethrough" title="Strikethrough"><span style="text-decoration: line-through;">S</span></button>
    <button type="button" data-action="code" title="Code Block"><code>&lt;/&gt;</code></button>
    
    <div class="toolbar-dropdown">
      <button type="button" class="toolbar-dropdown-toggle" title="Font Family">Aa</button>
      <div class="toolbar-dropdown-content font-menu">
        <button type="button" data-font="sans-serif" style="font-family: sans-serif;">Sans-Serif</button>
        <button type="button" data-font="serif" style="font-family: serif;">Serif</button>
        <button type="button" data-font="monospace" style="font-family: monospace;">Monospace</button>
        <button type="button" data-font="cursive" style="font-family: cursive;">Cursive</button>
        <button type="button" data-font="system-ui" style="font-family: system-ui;">System UI</button>
        <button type="button" data-font="georgia" style="font-family: georgia, serif;">Georgia</button>
        <button type="button" data-font="Garamond" style="font-family: Garamond, serif;">Garamond</button>
        <button type="button" data-font="Impact" style="font-family: Impact, sans-serif;">Impact</button>
        <button type="button" data-font="Trebuchet MS" style="font-family: 'Trebuchet MS', sans-serif;">Trebuchet</button>
        <button type="button" data-font="Arial" style="font-family: Arial, sans-serif;">Arial</button>
        <button type="button" data-font="Times New Roman" style="font-family: 'Times New Roman', serif;">Times New Roman</button>
        <button type="button" data-font="Verdana" style="font-family: Verdana, sans-serif;">Verdana</button>
        <button type="button" data-font="Tahoma" style="font-family: Tahoma, sans-serif;">Tahoma</button>
        <button type="button" data-font="Courier New" style="font-family: 'Courier New', monospace;">Courier New</button>
        <button type="button" data-font="Consolas" style="font-family: Consolas, monospace;">Consolas</button>
        <button type="button" data-font="Comic Sans MS" style="font-family: 'Comic Sans MS', cursive;">Comic Sans</button>
      </div>
    </div>

    <div class="toolbar-dropdown">
      <button type="button" class="toolbar-dropdown-toggle" title="Text Color">🎨</button>
      <div class="toolbar-dropdown-content color-menu">
        <button type="button" data-color="#ef4444" style="--btn-bg: #ef4444;" title="Red"></button>
        <button type="button" data-color="#f97316" style="--btn-bg: #f97316;" title="Orange"></button>
        <button type="button" data-color="#f59e0b" style="--btn-bg: #f59e0b;" title="Yellow"></button>
        <button type="button" data-color="#10b981" style="--btn-bg: #10b981;" title="Green"></button>
        <button type="button" data-color="#14b8a6" style="--btn-bg: #14b8a6;" title="Teal"></button>
        <button type="button" data-color="#3b82f6" style="--btn-bg: #3b82f6;" title="Blue"></button>
        <button type="button" data-color="#6366f1" style="--btn-bg: #6366f1;" title="Indigo"></button>
        <button type="button" data-color="#8b5cf6" style="--btn-bg: #8b5cf6;" title="Purple"></button>
        <button type="button" data-color="#ec4899" style="--btn-bg: #ec4899;" title="Pink"></button>
        <button type="button" data-color="var(--accent-strong)" style="--btn-bg: var(--accent-strong);" title="Accent"></button>
        <button type="button" data-color="#ffffff" style="--btn-bg: #ffffff;" title="White"></button>
        <button type="button" data-color="#9ca3af" style="--btn-bg: #9ca3af;" title="Gray"></button>
        <button type="button" data-color="clear" class="color-clear" title="Clear Color">Clear Color</button>
      </div>
    </div>

    <button type="button" data-action="bullet" title="Toggle Bullet List">-</button>
    <button type="button" data-action="clear-all" title="Clear Formatting">Tx</button>
  `;
}

// Populate toolbars for static question & answer fields on load
function initToolbars() {
  const qToolbar = document.getElementById("questionEditToolbar");
  if (qToolbar) qToolbar.innerHTML = createToolbarHtml();

  const aToolbar = document.getElementById("answerEditToolbar");
  if (aToolbar) aToolbar.innerHTML = createToolbarHtml();

  if (el.questionEdit) enableSyntaxHighlighting(el.questionEdit);
  if (el.answerEdit) enableSyntaxHighlighting(el.answerEdit);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initToolbars);
} else {
  initToolbars();
}

// Global click delegation for any formatting toolbar button
document.addEventListener("click", (e) => {
  const button = e.target.closest(".edit-toolbar button");
  if (button) {
    handleToolbarClick(e);
  }
});

// Syntax highlighting backdrop creator for textareas
function enableSyntaxHighlighting(textarea) {
  if (!textarea || textarea.dataset.highlighted === "true") return;
  textarea.dataset.highlighted = "true";

  const wrapper = document.createElement("div");
  wrapper.className = "highlight-textarea-wrapper";

  const backdrop = document.createElement("div");
  backdrop.className = "highlight-textarea-backdrop";

  textarea.parentNode.insertBefore(wrapper, textarea);
  wrapper.appendChild(backdrop);
  wrapper.appendChild(textarea);

  function sync() {
    const text = textarea.value;
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Fade out HTML syntax tags
    let highlighted = escaped.replace(/(&lt;\/?[a-zA-Z0-9]+(?:\s+[^&]*)?&gt;)/g, '<span class="syntax-tag">$1</span>');

    if (highlighted.endsWith("\n") || highlighted === "") {
      highlighted += " ";
    }

    backdrop.innerHTML = highlighted;
  }

  function syncScroll() {
    backdrop.scrollTop = textarea.scrollTop;
    backdrop.scrollLeft = textarea.scrollLeft;
  }

  textarea.addEventListener("input", sync);
  textarea.addEventListener("scroll", syncScroll);

  // Initialize
  sync();
  syncScroll();
  window.addEventListener("resize", syncScroll);
}

// Formatting helpers
function toggleWrap(text, wrapper) {
  if (text.startsWith(wrapper) && text.endsWith(wrapper)) {
    return text.substring(wrapper.length, text.length - wrapper.length);
  }
  return wrapper + text + wrapper;
}

function toggleUnderline(text) {
  if (text.startsWith("<u>") && text.endsWith("</u>")) {
    return text.substring(3, text.length - 4);
  }
  return "<u>" + text + "</u>";
}

function toggleStrikethrough(text) {
  if (text.startsWith("~~") && text.endsWith("~~")) {
    return text.substring(2, text.length - 2);
  }
  return "~~" + text + "~~";
}

function toggleCode(text) {
  if (text.startsWith("`") && text.endsWith("`")) {
    return text.substring(1, text.length - 1);
  }
  return "`" + text + "`";
}

function toggleKbd(text) {
  if (text.startsWith("<kbd>") && text.endsWith("</kbd>")) {
    return text.substring(5, text.length - 6);
  }
  return "<kbd>" + text + "</kbd>";
}

function clearStyling(text) {
  let cleared = text;
  cleared = cleared.replace(/<span style="[^"]*">([\s\S]*?)<\/span>/gi, "$1");
  cleared = cleared.replace(/<font [^>]*>([\s\S]*?)<\/font>/gi, "$1");
  cleared = cleared.replace(/<mark>([\s\S]*?)<\/mark>/gi, "$1");
  cleared = cleared.replace(/<u>([\s\S]*?)<\/u>/gi, "$1");
  cleared = cleared.replace(/<del>([\s\S]*?)<\/del>/gi, "$1");
  cleared = cleared.replace(/<kbd[^>]*>([\s\S]*?)<\/kbd>/gi, "$1");
  return cleared;
}

function toggleBulletPoints(text) {
  const lines = text.split("\n");
  const allAreBulleted = lines.every(line => line.trim() === "" || line.trim().startsWith("- "));
  
  const formatted = lines.map(line => {
    if (allAreBulleted) {
      return line.replace(/^(\s*)-\s?/, "$1");
    } else {
      if (line.trim() === "") return line;
      if (line.trim().startsWith("- ")) return line;
      return "- " + line;
    }
  });
  return formatted.join("\n");
}

function clearFormatting(text) {
  let cleared = text;
  
  // 1. Strip styling HTML wrappers
  cleared = clearStyling(cleared);
  
  // 2. Strip standard Markdown markup (bold, italic, strikethrough, inline code)
  cleared = cleared.replace(/\*\*([\s\S]*?)\*\*/g, "$1");
  cleared = cleared.replace(/__([\s\S]*?)__/g, "$1");
  cleared = cleared.replace(/\*([\s\S]*?)\*/g, "$1");
  cleared = cleared.replace(/_([\s\S]*?)_/g, "$1");
  cleared = cleared.replace(/~~([\s\S]*?)~~/g, "$1");
  cleared = cleared.replace(/`([\s\S]*?)`/g, "$1");
  
  // 3. Strip list bullets and header tags on each line
  const lines = cleared.split("\n");
  const processed = lines.map(line => {
    let l = line;
    l = l.replace(/^(\s*)[-*+]\s+/, "$1");
    l = l.replace(/^(\s*)\d+\.\s+/, "$1");
    l = l.replace(/^(\s*)#+\s+/, "$1");
    return l;
  });
  return processed.join("\n");
}

// Global mousedown listener to prevent focus loss in textareas
document.addEventListener("mousedown", (e) => {
  if (e.target.closest(".edit-toolbar")) {
    e.preventDefault();
  }
});

// Dropdown click-to-open toggler (prevents opening on hover)
document.addEventListener("click", (e) => {
  const dropdownToggle = e.target.closest(".edit-toolbar .toolbar-dropdown-toggle");
  if (dropdownToggle) {
    e.preventDefault();
    e.stopPropagation();
    const dropdown = dropdownToggle.closest(".toolbar-dropdown");
    const wasOpen = dropdown.classList.contains("is-open");
    
    // Close all dropdowns first
    document.querySelectorAll(".edit-toolbar .toolbar-dropdown").forEach(d => {
      d.classList.remove("is-open");
    });
    
    // Toggle current
    if (!wasOpen) {
      dropdown.classList.add("is-open");
    }
    return;
  }

  // Close dropdowns if clicked anywhere else
  if (!e.target.closest(".edit-toolbar .toolbar-dropdown-content")) {
    document.querySelectorAll(".edit-toolbar .toolbar-dropdown").forEach(d => {
      d.classList.remove("is-open");
    });
  }
});

// Handle toolbar actions
function handleToolbarClick(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const toolbar = button.closest(".edit-toolbar");
  if (!toolbar) return;

  // Find the associated textarea
  let textarea = null;
  if (toolbar.id === "questionEditToolbar") {
    textarea = el.questionEdit;
  } else if (toolbar.id === "answerEditToolbar") {
    textarea = el.answerEdit;
  } else {
    // Inside dynamic "All cards" editor
    const container = toolbar.closest(".all-card-editor");
    if (container) {
      textarea = container.querySelector("[data-all-edit-value]");
    }
  }

  if (!textarea) return;

  event.preventDefault();

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);

  let formatFn = null;

  if (button.dataset.action === "bold") {
    formatFn = text => toggleWrap(text, "**");
  } else if (button.dataset.action === "italic") {
    formatFn = text => toggleWrap(text, "*");
  } else if (button.dataset.action === "underline") {
    formatFn = text => toggleUnderline(text);
  } else if (button.dataset.action === "strikethrough") {
    formatFn = text => toggleStrikethrough(text);
  } else if (button.dataset.action === "code") {
    formatFn = text => toggleCode(text);
  } else if (button.dataset.action === "kbd") {
    formatFn = text => toggleKbd(text);
  } else if (button.dataset.action === "bullet") {
    formatFn = text => toggleBulletPoints(text);
  } else if (button.dataset.action === "clear-all") {
    formatFn = text => clearFormatting(text);
  } else if (button.dataset.font) {
    const font = button.dataset.font;
    formatFn = text => `<span style="font-family: ${font};">${clearStyling(text)}</span>`;
  } else if (button.dataset.color) {
    const color = button.dataset.color;
    if (color === "clear") {
      formatFn = text => clearStyling(text);
    } else {
      formatFn = text => `<span style="color: ${color};">${clearStyling(text)}</span>`;
    }
  } else if (button.dataset.highlight) {
    const highlight = button.dataset.highlight;
    if (highlight === "clear") {
      formatFn = text => clearStyling(text);
    } else {
      formatFn = text => `<span style="background-color: ${highlight};">${clearStyling(text)}</span>`;
    }
  }

  if (!formatFn) return;

  const replacement = formatFn(selectedText);

  let inserted = false;
  try {
    textarea.focus();
    inserted = document.execCommand("insertText", false, replacement);
  } catch (e) {
    console.warn("execCommand failed, manual fallback used", e);
  }

  if (!inserted) {
    const val = textarea.value;
    textarea.value = val.substring(0, start) + replacement + val.substring(end);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Restore selection
  textarea.selectionStart = start;
  textarea.selectionEnd = start + replacement.length;
  
  // Trigger input event to save values to state
  textarea.dispatchEvent(new Event("input", { bubbles: true }));

  // Close all open dropdowns after action is applied
  document.querySelectorAll(".edit-toolbar .toolbar-dropdown").forEach(d => {
    d.classList.remove("is-open");
  });
}
