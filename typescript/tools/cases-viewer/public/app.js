// tts 用例查看器 —— 前端（原生 ES 模块，没有构建步骤）。
//
// 数据全部来自 server.mjs 的 /api/*：
//   /api/index      用例清单（含源码，供搜索）
//   /api/case?id=   单个用例：源码、AST、逐字步骤
//   /api/steps?id=  只从 build/ts 实时推进（用于复核 case.md）
//   /api/check      单个用例对拍
//   /api/check-all  全量对拍
//   /api/write-docs 生成并写入 .md/.ast

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const PREFS_KEY = "tts-view.prefs";
const DEFAULT_PREFS = { autoplay: true, loop: false, follow: true, speed: 500 };

const state = {
  index: null,
  byId: new Map(),
  payload: null,
  selectedId: null,
  tab: "player",
  query: "",
  status: "all",
  flagMd: false,
  flagAst: false,
  group: "",
  checks: new Map(),
  checkReasons: new Map(),
  checking: false,
  checkedAt: 0,
  player: null,
  prefs: loadPrefs(),
};

const els = {
  main: $("#main"),
  list: $("#case-list"),
  search: $("#search"),
  listMeta: $("#list-meta"),
  filters: $("#filters"),
  groupSelect: $("#group-select"),
  sidebarFoot: $("#sidebar-foot"),
  topbarStats: $("#topbar-stats"),
  rootPath: $("#root-path"),
  btnCheckAll: $("#btn-check-all"),
  btnDocs: $("#btn-docs"),
  toast: $("#toast"),
};

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    return { ...DEFAULT_PREFS, ...raw };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
  } catch {
    /* 隐私模式：忽略 */
  }
}

let toastTimer = 0;
function toast(message, kind = "") {
  const el = els.toast;
  el.textContent = message;
  el.className = `toast show ${kind}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => {
      el.hidden = true;
    }, 240);
  }, 3200);
}

function ensureVisible(scroller, element, margin = 28) {
  if (!scroller || !element) {
    return;
  }
  const outer = scroller.getBoundingClientRect();
  const inner = element.getBoundingClientRect();
  if (inner.top < outer.top + margin) {
    scroller.scrollTop += inner.top - outer.top - margin;
  } else if (inner.bottom > outer.bottom - margin) {
    scroller.scrollTop += inner.bottom - outer.bottom + margin;
  }
}

async function getJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? `HTTP ${response.status}`);
  }
  return data;
}

async function postJson(url, body = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? `HTTP ${response.status}`);
  }
  return data;
}

function displayGlyph(ch) {
  switch (ch) {
    case " ":
      return "␣";
    case "\n":
      return "⏎";
    case "\r":
      return "␍";
    case "\t":
      return "⇥";
    default:
      return ch;
  }
}

function describeChar(ch) {
  if (ch === undefined || ch === "") {
    return "";
  }
  const code = ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
  const names = { " ": "空格", "\n": "换行", "\r": "回车", "\t": "制表" };
  return names[ch] === undefined ? `U+${code}` : `${names[ch]} · U+${code}`;
}

function charTitle(ch) {
  return `${JSON.stringify(ch)} · ${describeChar(ch)}`;
}

function isWhitespace(ch) {
  return ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
}

function countLines(text) {
  return String(text ?? "").replace(/\n$/, "").split("\n").length;
}

// ---------------------------------------------------------------------------
// 源码着色（按字符着色，保留每个字符一个 <span> 以便逐字高亮）
// ---------------------------------------------------------------------------

const KEYWORDS = new Set([
  "abstract", "any", "as", "asserts", "async", "await", "bigint", "boolean", "break", "case", "catch",
  "class", "const", "constructor", "continue", "debugger", "declare", "default", "delete", "do", "else",
  "enum", "export", "extends", "false", "finally", "for", "from", "function", "get", "if", "implements",
  "import", "in", "infer", "instanceof", "interface", "is", "keyof", "let", "module", "namespace", "never",
  "new", "null", "number", "object", "of", "private", "protected", "public", "readonly", "return", "satisfies",
  "set", "static", "string", "super", "switch", "symbol", "this", "throw", "true", "try", "type", "typeof",
  "undefined", "unique", "unknown", "using", "var", "void", "while", "with", "yield",
]);

const CLASS = { kw: "tk-kw", str: "tk-str", num: "tk-num", com: "tk-com", punc: "tk-punc", ident: "tk-ident" };
const WORD_START = /[A-Za-z_$\u00A0-\uFFFF]/;
const WORD_PART = /[A-Za-z0-9_$\u00A0-\uFFFF]/;

function classifySource(text) {
  const classes = new Array(text.length).fill("");
  const fill = (start, end, cls) => {
    for (let i = start; i < end && i < classes.length; i++) {
      classes[i] = cls;
    }
  };
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === "/" && next === "/") {
      let end = text.indexOf("\n", i);
      if (end < 0) {
        end = text.length;
      }
      fill(i, end, "com");
      i = end;
      continue;
    }
    if (ch === "/" && next === "*") {
      let end = text.indexOf("*/", i + 2);
      end = end < 0 ? text.length : end + 2;
      fill(i, end, "com");
      i = end;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === "\\") {
          j += 2;
          continue;
        }
        if (text[j] === ch) {
          j++;
          break;
        }
        if (ch !== "`" && text[j] === "\n") {
          break;
        }
        j++;
      }
      fill(i, j, "str");
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < text.length && /[0-9a-fA-FxXoObBnN_.]/.test(text[j])) {
        j++;
      }
      fill(i, j, "num");
      i = j;
      continue;
    }
    if (WORD_START.test(ch)) {
      let j = i + 1;
      while (j < text.length && WORD_PART.test(text[j])) {
        j++;
      }
      fill(i, j, KEYWORDS.has(text.slice(i, j)) ? "kw" : "ident");
      i = j;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    fill(i, i + 1, "punc");
    i++;
  }
  return classes;
}

/**
 * 把源码渲染成「一行一行、每个码点一个 span」。
 * 返回 { spanByOffset, cells }：cells 是码点序列（逐字播放的磁带用）。
 */
function renderSource(container, text) {
  container.textContent = "";
  const classes = classifySource(text);
  const spanByOffset = new Map();
  const cells = [];

  const makeLine = (lineNumber) => {
    const line = document.createElement("div");
    line.className = "code-line";
    const number = document.createElement("span");
    number.className = "ln";
    number.textContent = String(lineNumber);
    const content = document.createElement("span");
    content.className = "lc";
    line.append(number, content);
    container.append(line);
    return content;
  };

  let content = makeLine(1);
  let lineNumber = 1;
  let offset = 0;

  const characters = Array.from(text);
  for (let index = 0; index < characters.length; index++) {
    const ch = characters[index];
    const span = document.createElement("span");
    const cls = classes[offset] ? CLASS[classes[offset]] : "";
    span.className = `ch ${cls}`.trim();

    if (ch === "\n") {
      span.classList.add("nl");
      span.textContent = "↵";
      content.append(span);
      spanByOffset.set(offset, span);
      cells.push({ ch, start: offset, span });
      offset += 1;
      // 结尾的换行不额外开一行空行
      if (index < characters.length - 1) {
        lineNumber += 1;
        content = makeLine(lineNumber);
      }
      continue;
    }

    if (ch === "\r") {
      span.classList.add("nl");
      span.textContent = "␍";
    } else if (ch === "\t") {
      span.classList.add("nl");
      span.textContent = "⇥";
    } else {
      span.textContent = ch;
    }

    content.append(span);
    for (let k = 0; k < ch.length; k++) {
      spanByOffset.set(offset + k, span);
    }
    cells.push({ ch, start: offset, span });
    offset += ch.length;
  }

  return { spanByOffset, cells, lineCount: lineNumber };
}

// ---------------------------------------------------------------------------
// token 树着色 + 前后两步的差异
// ---------------------------------------------------------------------------

const LINE_HEAD = /^([\s│├└─]*)([A-Za-z_$][\w$]*)([\s\S]*)$/;
const ATTR = /(pos=)(-?\d+|-)|(src=)(\[[^\]\)]*\))|(text=)("(?:[^"\\]|\\.)*")/g;

function kindClass(kind) {
  if (/Shape$/.test(kind)) return "k-shape";
  if (/Statement$/.test(kind)) return "k-stmt";
  if (/Expression$/.test(kind)) return "k-expr";
  if (kind === "Common" || /(Literal|Token|Identifier)$/.test(kind)) return "k-token";
  return "k-kind";
}

function colorizeTreeLine(line) {
  const head = LINE_HEAD.exec(line);
  if (head === null) {
    return esc(line);
  }
  const [, prefix, kind, rest] = head;
  let html = `${esc(prefix)}<span class="${kindClass(kind)}">${esc(kind)}</span>`;
  let last = 0;
  let match;
  ATTR.lastIndex = 0;
  while ((match = ATTR.exec(rest)) !== null) {
    html += esc(rest.slice(last, match.index));
    if (match[1] !== undefined) {
      html += `<span class="a-key">pos=</span><span class="a-num">${esc(match[2])}</span>`;
    } else if (match[3] !== undefined) {
      html += `<span class="a-key">src=</span><span class="a-range">${esc(match[4])}</span>`;
    } else {
      html += `<span class="a-key">text=</span><span class="a-str">${esc(match[6])}</span>`;
    }
    last = ATTR.lastIndex;
  }
  html += esc(rest.slice(last));
  return html;
}

/** 一行树上节点的身份：kind + pos + src 起点。`xxx.infer` / 实际创建位置都用它和 `xxx.ast` 对行。
 *  TS 的 SyntaxKind 有区间别名（FirstLiteralToken…），按 run.mjs 的对拍表归一。 */
const TREE_ID = /^[\s│├└─]*([A-Za-z_$][\w$]*)\s+pos=(-?\d+)\s+src=\[(-?\d+),(-?\d+)\)/;
const KIND_ALIASES = new Map([
  ["FirstStatement", "VariableStatement"],
  ["FirstLiteralToken", "NumericLiteral"],
  ["FirstNode", "QualifiedName"],
  ["FirstTypeNode", "TypePredicate"],
  ["LastTypeNode", "ImportType"],
  ["FirstContextualKeyword", "AbstractKeyword"],
  ["LastStatement", "DebuggerStatement"],
  ["FirstTemplateToken", "NoSubstitutionTemplateLiteral"],
  ["LastTemplateToken", "TemplateTail"],
  ["FirstPunctuation", "OpenBraceToken"],
  ["FirstAssignment", "EqualsToken"],
  ["FirstCompoundAssignment", "PlusEqualsToken"],
  ["LastAssignment", "CaretEqualsToken"],
  ["LastCompoundAssignment", "CaretEqualsToken"],
  ["LastPunctuation", "CaretEqualsToken"],
  ["FirstBinaryOperator", "LessThanToken"],
  ["AssertClause", "ImportAttributes"],
  ["AssertEntry", "ImportAttribute"],
]);

function treeLineId(line) {
  const match = TREE_ID.exec(line);
  if (match === null) {
    return null;
  }
  const kind = KIND_ALIASES.get(match[1]) ?? match[1];
  return `${kind}|${match[2]}|${match[3]}`;
}

/** 把 xxx.infer 里的 `// created at … , llm determined at …` 注记拆出来，按节点身份建索引。 */
function parseInferNotes(text) {
  const NEXT = /^created at char (\d+|\?)(?:\s*"(?:[^"\\]|\\.)*")?,\s*llm determined at char (\d+|\?)(?:\s*"(?:[^"\\]|\\.)*")?(.*)$/;
  const OLD = /^char (\d+|\?)(?:\s*"(?:[^"\\]|\\.)*")?(.*)$/;
  const notes = new Map();
  for (const line of text.split(/\r?\n/)) {
    const at = line.indexOf("// ");
    if (at < 0) {
      continue;
    }
    const id = treeLineId(line.slice(0, at));
    if (id === null) {
      continue;
    }
    const body = line.slice(at + 3).trim();
    const next = NEXT.exec(body);
    const old = next === null ? OLD.exec(body) : null;
    if (next === null && old === null) {
      continue;
    }
    const llm = next !== null
      ? (next[2] === "?" ? null : Number(next[2]))
      : (old[1] === "?" ? null : Number(old[1]));
    const created = next === null ? null : next[1] === "?" ? null : Number(next[1]);
    notes.set(id, { created, llm, text: body });
  }
  return notes;
}

/** llm determined（.infer）与 created at（ShapeToken.CreatedAt）的对比结论。 */
function inferStatus(llm, created) {
  if (llm === null) {
    return { kind: "unfilled", label: "?", title: "llm determined 还没有填" };
  }
  if (created === undefined) {
    return { kind: "never", label: "never", title: `llm 判定 char ${llm}，但树里没有这个节点` };
  }
  if (created === null) {
    return { kind: "unknown", label: "created ?", title: `llm 判定 char ${llm}；这颗形状还没记 CreatedAt` };
  }
  const delta = llm - created;
  if (delta === 0) {
    return { kind: "ok", label: "✓", title: `llm determined ${llm} = created ${created}` };
  }
  return {
    kind: delta > 0 ? "late" : "early",
    label: delta > 0 ? `late +${delta}` : `early ${delta}`,
    title: `llm determined ${llm}，created ${created}`,
  };
}

/** 逐行 LCS：返回 next 里哪些行是相对 prev 新增的。
 *  比较前先把树枝字符（│├└─）抹成空格：每多一个兄弟节点，整棵子树的分支线都会变，
 *  逐字比对原始文本会把「换了树枝」误报成「新增一行」。 */
function diffAddedLines(prev, next) {
  const normalize = (line) => line.replace(/[│├└─]/g, " ");
  const n = prev.length;
  const m = next.length;
  const added = new Array(m).fill(false);
  if (n === 0) {
    return added.fill(true);
  }
  const dp = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    dp[i] = new Uint16Array(m + 1);
  }
  for (let i = n - 1; i >= 0; i--) {
    const row = dp[i];
    const below = dp[i + 1];
    for (let j = m - 1; j >= 0; j--) {
      row[j] = normalize(prev[i]) === normalize(next[j]) ? below[j + 1] + 1 : Math.max(below[j], row[j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (normalize(prev[i]) === normalize(next[j])) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      added[j] = true;
      j++;
    }
  }
  while (j < m) {
    added[j] = true;
    j++;
  }
  return added;
}

function renderTree(container, treeText, prevText) {
  const lines = treeText === "" ? [""] : treeText.split("\n");
  const prev = prevText === null || prevText === "" ? [] : prevText.split("\n");
  const added = diffAddedLines(prev, lines);
  let addedCount = 0;
  const html = lines.map((line, index) => {
    const isAdded = added[index];
    if (isAdded) {
      addedCount++;
    }
    return `<span class="tree-line${isAdded ? " add" : ""}">${colorizeTreeLine(line)}</span>`;
  }).join("");
  container.innerHTML = html;
  return addedCount;
}

// ---------------------------------------------------------------------------
// 极简 Markdown（case.md 与 docs/*.md 都够用）
// ---------------------------------------------------------------------------

function inlineMd(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function renderMarkdown(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const out = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const body = [];
      index++;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index]);
        index++;
      }
      index++;
      out.push(`<pre data-lang="${esc(lang)}"><code>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }

    const step = /^## \[(char\s+(\d+)|EOF)\]\s*(?:`([\s\S]*)`)?\s*$/.exec(line);
    if (step !== null) {
      const label = step[1] === "EOF" ? "EOF" : `char ${step[2]}`;
      const quoted = step[3] === undefined ? "" : step[3];
      const target = step[2] === undefined ? "" : step[2];
      out.push(
        `<button class="md-step" data-step="${esc(target)}" data-label="${esc(label)}">` +
        `<span>${esc(label)}</span>` +
        (quoted === "" ? "" : `<span class="q">${esc(quoted)}</span>`) +
        `<span class="go">在回放中打开 →</span>` +
        `</button>`,
      );
      index++;
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      const content = inlineMd(line.replace(/^#+\s*/, ""));
      out.push(`<h${level}>${content}</h${level}>`);
      index++;
      continue;
    }

    if (/^\|/.test(line)) {
      const rows = [];
      while (index < lines.length && /^\|/.test(lines[index])) {
        rows.push(lines[index]);
        index++;
      }
      const cells = rows
        .map((row) => row.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()))
        .filter((row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell)));
      if (cells.length > 0) {
        const head = `<tr>${cells[0].map((cell) => `<th>${inlineMd(cell)}</th>`).join("")}</tr>`;
        const body = cells.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${inlineMd(cell)}</td>`).join("")}</tr>`).join("");
        out.push(`<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
      }
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(`<li>${inlineMd(lines[index].replace(/^\s*[-*]\s+/, ""))}</li>`);
        index++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\s*$/.test(line)) {
      index++;
      continue;
    }

    const paragraph = [];
    while (index < lines.length && !/^\s*$/.test(lines[index]) && !/^```/.test(lines[index]) && !/^#{1,6}\s/.test(lines[index]) && !/^\|/.test(lines[index]) && !/^\s*[-*]\s+/.test(lines[index]) && !/^## \[/.test(lines[index])) {
      paragraph.push(lines[index]);
      index++;
    }
    out.push(`<p>${inlineMd(paragraph.join(" "))}</p>`);
  }

  return out.join("\n");
}

// ---------------------------------------------------------------------------
// 路由： #/  |  #/case/<id>@<step>  |  #/doc/<name>
// ---------------------------------------------------------------------------

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  if (raw === "" || raw === "overview") {
    return { kind: "overview" };
  }
  const parts = raw.split("/");
  if (parts[0] === "case" && parts.length > 1) {
    const tail = parts.slice(1).join("/");
    const at = tail.lastIndexOf("@");
    const encoded = at >= 0 ? tail.slice(0, at) : tail;
    const stepText = at >= 0 ? tail.slice(at + 1) : "";
    let id = encoded;
    try {
      id = decodeURIComponent(encoded);
    } catch {
      /* 保留原样 */
    }
    return { kind: "case", id, step: /^\d+$/.test(stepText) ? Number(stepText) : null };
  }
  if (parts[0] === "doc" && parts.length > 1) {
    return { kind: "doc", name: decodeURIComponent(parts.slice(1).join("/")) };
  }
  return { kind: "overview" };
}

function caseHash(id, step) {
  const base = `#/case/${encodeURIComponent(id)}`;
  return step === undefined || step === null ? base : `${base}@${step}`;
}

async function route() {
  stopPlayback();
  const found = parseHash();

  if (found.kind === "overview") {
    state.selectedId = null;
    state.payload = null;
    markActiveRow(null);
    renderOverview();
    document.title = "tts 用例查看器 · typescript/cases/tts";
    return;
  }

  if (found.kind === "doc") {
    state.selectedId = null;
    state.payload = null;
    markActiveRow(null);
    renderDoc(found.name);
    return;
  }

  if (!state.byId.has(found.id)) {
    renderOverview();
    toast(`找不到用例 ${found.id}`, "err");
    return;
  }
  await openCase(found.id, found.step);
}

function select(id) {
  if (state.selectedId === id && state.payload !== null) {
    window.scrollTo(0, 0);
    return;
  }
  location.hash = caseHash(id);
}

// ---------------------------------------------------------------------------
// 侧栏
// ---------------------------------------------------------------------------

function renderTopbar() {
  const { stats } = state.index;
  const parts = [
    `<span><b>${stats.total}</b> 用例</span>`,
    `<span>success <b>${stats.success}</b></span>`,
    `<span>todo <b>${stats.todo}</b></span>`,
    `<span>case.md <b>${stats.withMd}</b></span>`,
  ];
  if (state.checkedAt > 0) {
    const ok = [...state.checks.values()].filter((value) => value === "ok").length;
    parts.push(`<span>对拍 <b style="color:${ok === stats.total ? "var(--green)" : "var(--amber)"}">${ok}</b>/${stats.total}</span>`);
  }
  els.topbarStats.innerHTML = parts.join("");
}

function renderGroupSelect() {
  const options = ['<option value="">全部类别</option>'];
  const walk = (nodes) => {
    for (const node of nodes) {
      options.push(`<option value="${esc(node.path)}">${"· ".repeat(node.depth)}${esc(node.path)}（${node.total}）</option>`);
      walk(node.children);
    }
  };
  walk(state.index.groups);
  els.groupSelect.innerHTML = options.join("");
  els.groupSelect.value = state.group;
}

function filteredCases() {
  const query = state.query.trim().toLowerCase();
  return state.index.cases.filter((item) => {
    if (state.status !== "all" && item.status !== state.status) {
      return false;
    }
    if (state.flagMd && !item.hasMd) {
      return false;
    }
    if (state.flagAst && !item.hasAst) {
      return false;
    }
    if (state.group !== "" && item.group !== state.group && !item.group.startsWith(`${state.group}/`)) {
      return false;
    }
    if (query !== "" && !(`${item.id}\n${item.source}\n${item.category}`.toLowerCase().includes(query))) {
      return false;
    }
    return true;
  });
}

function nameHtml(item, query) {
  if (query === "") {
    return esc(item.name);
  }
  const lower = item.name.toLowerCase();
  const at = lower.indexOf(query);
  if (at < 0) {
    return esc(item.name);
  }
  return `${esc(item.name.slice(0, at))}<mark>${esc(item.name.slice(at, at + query.length))}</mark>${esc(item.name.slice(at + query.length))}`;
}

function renderList() {
  const cases = filteredCases();
  const query = state.query.trim().toLowerCase();
  els.listMeta.innerHTML = `<span>显示 <b style="color:var(--dim)">${cases.length}</b> / ${state.index.stats.total}</span>` +
    (state.group === "" ? "" : `<span title="${esc(state.group)}">${esc(state.group.split("/").pop())}</span>`);

  if (cases.length === 0) {
    els.list.innerHTML = `<div class="empty-list">没有匹配的用例<br>试试清空搜索或换一个筛选</div>`;
    return;
  }

  const chunks = [];
  let lastGroup = null;
  for (const item of cases) {
    if (item.group !== lastGroup) {
      lastGroup = item.group;
      chunks.push(`<div class="case-group">${esc(item.group)} <span>${state.index.cases.filter((other) => other.group === item.group).length}</span></div>`);
    }
    const check = state.checks.get(item.id);
    const tags = [];
    if (item.hasMd) {
      tags.push('<i class="dot md" title="有 case.md"></i>');
    }
    if (item.hasAst) {
      tags.push('<i class="dot ast" title="有 case.ast"></i>');
    }
    if (item.hasInfer) {
      tags.push('<i class="dot infer" title="有 case.infer"></i>');
    }
    if (check !== undefined) {
      tags.push(`<span class="ci-check ${check}" title="${check === "ok" ? "对拍通过" : "对拍失败"}">${check === "ok" ? "✓" : "✗"}</span>`);
    }
    chunks.push(
      `<button class="case-item${item.id === state.selectedId ? " is-active" : ""}" role="option" ` +
      `aria-selected="${item.id === state.selectedId}" data-id="${esc(item.id)}" title="${esc(item.id)}.ts">` +
      `<span class="ci-name">${nameHtml(item, query)}</span>` +
      `<span class="ci-tags">${tags.join("")}</span>` +
      `</button>`,
    );
  }
  els.list.innerHTML = chunks.join("");
}

function renderSidebarFoot() {
  const build = state.index.build;
  const ok = state.checkedAt > 0
    ? [...state.checks.values()].filter((value) => value === "ok").length
    : 0;
  els.sidebarFoot.innerHTML = [
    `<div class="row"><i class="status-dot ${build.available ? "ok" : "warn"}"></i>` +
    `<span>build/ts ${build.available ? "可用" : "缺失"}（${build.available ? "缺 case.md 时可实时生成" : "只能看已有 case.md"}）</span></div>`,
    `<div class="row"><i class="status-dot ${state.checkedAt > 0 ? (ok === state.index.stats.total ? "ok" : "warn") : ""}"></i>` +
    `<span>${state.checkedAt > 0 ? `对拍 ${ok} / ${state.index.stats.total} 通过` : "尚未对拍"}</span></div>`,
  ].join("");
}

function markActiveRow(id) {
  for (const row of $$(".case-item", els.list)) {
    const active = row.dataset.id === id;
    row.classList.toggle("is-active", active);
    row.setAttribute("aria-selected", String(active));
  }
  if (id !== null) {
    const row = $(`.case-item[data-id="${CSS.escape(id)}"]`, els.list);
    if (row !== null) {
      ensureVisible(els.list, row, 60);
    }
  }
}

// ---------------------------------------------------------------------------
// 总览
// ---------------------------------------------------------------------------

function renderOverview() {
  const { stats, groups, build } = state.index;
  const mdCases = state.index.cases.filter((item) => item.hasMd);
  const passed = [...state.checks.values()].filter((value) => value === "ok").length;

  const flatten = (nodes, depth = 0, out = []) => {
    for (const node of nodes) {
      out.push({ ...node, depth });
      flatten(node.children, depth + 1, out);
    }
    return out;
  };
  const rows = flatten(groups).map((node) => {
    const width = Math.max(2, Math.round((node.total / Math.max(1, stats.total)) * 100));
    return `<button class="cov-row" data-group="${esc(node.path)}">` +
      `<span class="path" style="padding-left:${node.depth * 12}px">${esc(node.path)}</span>` +
      `<span class="bar"><i style="width:${width}%"></i></span>` +
      `<span class="n">${node.total}</span>` +
      `</button>`;
  }).join("");

  els.main.innerHTML = `
    <div class="scroll-area">
      <div class="hero">
        <h1>typescript/cases/tts 用例总览</h1>
        <p>
          每个用例是一段 TypeScript 源码（<code>.ts</code>）、一份 TypeScript 语义 AST 快照（<code>.ast</code>），
          和一份逐字符 token 树快照（<code>.md</code>）。左侧选一个用例：源码和 AST 对照着看，
          逐字回放会把 <code>.md</code> 里的每一步放成动画。
        </p>
      </div>

      <div class="stat-grid">
        <div class="stat-card accent"><div class="k">用例</div><div class="v">${stats.total}</div></div>
        <div class="stat-card green"><div class="k">success</div><div class="v">${stats.success}</div></div>
        <div class="stat-card amber"><div class="k">todo</div><div class="v">${stats.todo}</div></div>
        <div class="stat-card purple"><div class="k">有 case.md</div><div class="v">${stats.withMd}<small>${Math.round((stats.withMd / Math.max(1, stats.total)) * 100)}%</small></div></div>
        <div class="stat-card purple"><div class="k">有 case.ast</div><div class="v">${stats.withAst}</div></div>
        <div class="stat-card purple"><div class="k">有 case.infer</div><div class="v">${stats.withInfer ?? 0}</div></div>
        <div class="stat-card ${state.checkedAt > 0 ? (passed === stats.total ? "green" : "red") : ""}">
          <div class="k">对拍通过</div><div class="v">${state.checkedAt > 0 ? passed : "—"}<small>${state.checkedAt > 0 ? `/ ${stats.total}` : "未跑"}</small></div>
        </div>
      </div>

      <h2 class="section-title">覆盖分布 <span>点击一行即按类别筛选左侧列表</span></h2>
      <div class="coverage">${rows}</div>

      <h2 class="section-title">有 case.md 的用例 <span>${mdCases.length} 个 · 点开就能逐字回放</span></h2>
      <div class="chip-grid">
        ${mdCases.map((item) => `<a class="mini" href="${caseHash(item.id)}">${esc(item.id.replace("success/", "").replace("todo/", "todo · "))}</a>`).join("")}
      </div>

      <div class="overview-cols">
        <div class="panel">
          <h3>键盘</h3>
          <div class="keys">
            <div class="row"><kbd>空格</kbd><span>播放 / 暂停</span></div>
            <div class="row"><kbd>←</kbd><kbd>→</kbd><span>上一步 / 下一步</span></div>
            <div class="row"><kbd>Home</kbd><kbd>End</kbd><span>跳到首 / 尾</span></div>
            <div class="row"><kbd>/</kbd><span>聚焦搜索框</span></div>
            <div class="row"><kbd>Esc</kbd><span>退出输入框 / 回到全部</span></div>
          </div>
        </div>
        <div class="panel">
          <h3>两种逐字来源</h3>
          <ul class="hint-list">
            <li><b>case.md</b>：仓库里已有的逐字快照，回放严格按它的每一步。</li>
            <li><b>解析器实时生成</b>：没有 <code>.md</code> 的用例，按 <code>${esc(build.path)}</code> 逐字符推进算出来（不写盘）。</li>
            <li><code>.ast</code> 缺失时，AST 用 <code>ts-ast-line</code> 现场算。</li>
            <li>用 <b>对拍</b> 跑 <code>${esc(state.index.gate)}</code>，结果会标回左侧列表。</li>
          </ul>
        </div>
      </div>
    </div>`;

  $$(".cov-row", els.main).forEach((row) => {
    row.addEventListener("click", () => {
      state.group = row.dataset.group;
      renderGroupSelect();
      renderList();
      const first = filteredCases()[0];
      if (first !== undefined) {
        select(first.id);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// 文档视图（tts.md / index.md）
// ---------------------------------------------------------------------------

function renderDoc(name) {
  const doc = state.index.docs.find((item) => item.name === name);
  els.main.innerHTML = `<div class="scroll-area">
    <div class="tab-head">
      <a class="btn" href="#/">← 总览</a>
      <span class="name">typescript/cases/tts/${esc(name)}</span>
      <span class="grow"></span>
      ${state.index.docs.map((item) => `<a class="btn${item.name === name ? " btn-primary" : ""}" href="#/doc/${encodeURIComponent(item.name)}">${esc(item.name)}</a>`).join("")}
    </div>
    <div class="md">${doc === undefined ? `<div class="notice err">找不到 ${esc(name)}</div>` : renderMarkdown(doc.text)}</div>
  </div>`;
  document.title = `${name} · tts 用例查看器`;
}

// ---------------------------------------------------------------------------
// 单个用例
// ---------------------------------------------------------------------------

function stepCountOf(payload) {
  return payload.steps?.steps?.length ?? 0;
}

async function openCase(id, startStep) {
  state.selectedId = id;
  markActiveRow(id);
  els.main.innerHTML = `<div class="scroll-area"><div class="empty-list">加载 ${esc(id)} …</div></div>`;

  let payload;
  try {
    payload = await getJson(`/api/case?id=${encodeURIComponent(id)}`);
  } catch (error) {
    els.main.innerHTML = `<div class="scroll-area"><div class="notice err"><b>加载失败</b><pre>${esc(error.message)}</pre></div></div>`;
    return;
  }

  state.payload = payload;
  state.tab = "player";
  renderCaseView(payload);

  const steps = payload.steps.steps ?? [];
  const explicitStep = startStep !== null && startStep !== undefined;
  const initial = explicitStep && steps.length > 0
    ? Math.min(startStep, steps.length - 1)
    : 0;
  mountPlayer(payload, initial);

  // URL 里写了 @N 就是「我要停在第 N 步」：不自动播放，否则打开后立刻跑掉，
  // 跟 case.md 同一小节对照时会看到不一样的一步。
  if (state.prefs.autoplay && steps.length > 1 && !explicitStep) {
    play();
  }

  document.title = `${payload.name}.ts · tts 用例查看器`;
  // 没写步号就补一个 @0；写了但超出范围（例如 @99）就落到实际停下的那一步。
  if (!explicitStep || initial !== startStep) {
    history.replaceState(null, "", caseHash(id, initial));
  }
}

function badgesFor(payload, item) {
  const badges = [];
  badges.push(`<span class="badge ${payload.status}">${payload.status}</span>`);
  if (item.hasMd) {
    badges.push('<span class="badge md">case.md</span>');
  }
  if (item.hasAst) {
    badges.push(`<span class="badge ast">case.ast${payload.ast.stale === true ? " · 过期" : ""}</span>`);
  }
  if (item.hasInfer) {
    badges.push('<span class="badge infer" title="有 case.infer：每个形状的期望创建位置">case.infer</span>');
  }
  const check = state.checks.get(payload.id);
  if (check !== undefined) {
    badges.push(`<span class="badge ${check}" title="${check === "ok" ? "run.mjs 对拍通过" : esc(state.checkReasons.get(payload.id) ?? "")}">${check === "ok" ? "对拍通过" : "对拍失败"}</span>`);
  }
  if (payload.ast.origin === "generated") {
    badges.push('<span class="badge muted" title="仓库里没有 .ast 夹具，按 ts-ast-line 实时计算">AST 实时</span>');
  }
  return badges.join("");
}

/** 对拍之后只换徽章，不动回放状态。 */
function refreshCaseHeader() {
  const payload = state.payload;
  if (payload === null) {
    return;
  }
  const title = $(".case-title", els.main);
  const item = state.byId.get(payload.id);
  if (title !== null && item !== undefined) {
    title.innerHTML = `<code>${esc(payload.name)}<span class="ext">.ts</span></code>${badgesFor(payload, item)}`;
  }
}

function renderCaseView(payload) {
  const item = state.byId.get(payload.id);
  const stepCount = stepCountOf(payload);
  const groupCrumbs = payload.group.split("/");

  els.main.innerHTML = `
    <div class="case-view">
      <div class="case-head">
        <div class="case-head-top">
          <div class="case-crumb">${groupCrumbs.map((part, index) => `${index > 0 ? "<span>/</span>" : ""}<span>${esc(part)}</span>`).join("")}</div>
          <div class="case-actions">
            <button class="btn" id="btn-copy-ts" title="复制 case.ts 全文">复制源码</button>
            ${item.hasMd || payload.steps.origin === "error" ? "" : '<button class="btn" id="btn-gen-md" title="用 build/ts 生成 .md 与 .ast 并写回仓库">生成 case.md</button>'}
            <button class="btn" id="btn-check-one" title="只跑这一个用例的 run.mjs 对拍">对拍</button>
          </div>
        </div>
        <div class="case-title">
          <code>${esc(payload.name)}<span class="ext">.ts</span></code>
          ${badgesFor(payload, item)}
        </div>
        <div class="tabs" role="tablist">
          <button class="tab is-on" data-tab="player" role="tab">逐字回放 <span class="tab-n">${stepCount}</span></button>
          <button class="tab" data-tab="ts" role="tab">case.ts</button>
          <button class="tab" data-tab="ast" role="tab">case.ast${payload.ast.stale === true ? " <span class=\"tab-n\">⚠</span>" : ""}</button>
          <button class="tab" data-tab="md" role="tab">case.md${item.hasMd ? "" : ' <span class="tab-n">无</span>'}</button>
          <button class="tab" data-tab="check" role="tab">对拍</button>
        </div>
      </div>
      <div class="tab-panel player-panel" data-panel="player"></div>
      <div class="tab-panel pad" data-panel="ts" hidden></div>
      <div class="tab-panel pad" data-panel="ast" hidden></div>
      <div class="tab-panel pad" data-panel="md" hidden></div>
      <div class="tab-panel pad" data-panel="check" hidden></div>
    </div>`;

  renderTsPanel(payload);
  renderAstPanel(payload);
  renderMdPanel(payload);
  renderCheckPanel(payload);

  $$(".tab", els.main).forEach((tab) => {
    tab.addEventListener("click", () => {
      setTab(tab.dataset.tab);
    });
  });

  $("#btn-copy-ts").addEventListener("click", async () => {
    await copyText(payload.ts);
    toast("已复制 case.ts 全文", "ok");
  });
  $("#btn-check-one").addEventListener("click", () => runCheckOne(payload.id));

  const genButton = $("#btn-gen-md");
  if (genButton !== null) {
    genButton.addEventListener("click", () => generateDocs(payload.id));
  }
}

function setTab(name) {
  state.tab = name;
  for (const tab of $$(".tab", els.main)) {
    tab.classList.toggle("is-on", tab.dataset.tab === name);
  }
  for (const panel of $$("[data-panel]", els.main)) {
    panel.hidden = panel.dataset.panel !== name;
  }
  if (name !== "player") {
    stopPlayback();
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

// ---------------------------------------------------------------------------
// case.ts / case.ast / case.md / 对拍 四个静态面板
// ---------------------------------------------------------------------------

function renderTsPanel(payload) {
  const panel = $('[data-panel="ts"]', els.main);
  const lines = countLines(payload.ts);
  panel.innerHTML = `
    <div class="tab-head">
      <span class="name">${esc(payload.name)}.ts</span>
      <span class="meta">${payload.ts.length} 字节 · ${lines} 行</span>
      <span class="grow"></span>
      <button class="btn" id="ts-copy">复制</button>
    </div>
    <div class="code-card"><div class="code" id="ts-code"></div></div>`;
  renderSource($("#ts-code", panel), payload.ts);
  $("#ts-copy", panel).addEventListener("click", async () => {
    await copyText(payload.ts);
    toast("已复制 case.ts 全文", "ok");
  });
}

function renderAstPanel(payload, showGenerated = false) {
  const panel = $('[data-panel="ast"]', els.main);
  const ast = payload.ast;
  const text = showGenerated ? (ast.generated ?? "") : (ast.text ?? "");
  const originText = showGenerated
    ? "ts-ast-line 实时计算"
    : ast.origin === "fixture"
      ? "仓库快照"
      : ast.origin === "generated"
        ? "ts-ast-line 实时计算（无 .ast）"
        : "无法计算";

  let notice = "";
  if (ast.stale === true) {
    notice = `<div class="notice"><b>这份 .ast 与当前 ts-ast-line 输出不一致（夹具过期）。</b>
      跑 <code>node typescript/tools/gen-case-docs.mjs ${esc(payload.rel)}</code> 重新生成。
      <div class="btns"><button class="btn" id="ast-toggle">${showGenerated ? "看仓库快照" : "看重算结果"}</button></div></div>`;
  } else if (ast.stale === false) {
    notice = `<div class="notice ok">与 <code>ts-ast-line</code> 当前输出逐字节一致。</div>`;
  } else if (ast.origin === "generated") {
    notice = `<div class="notice info">仓库里没有 <code>.ast</code>：下面是按 <code>ts-ast-line</code> 现场算出来的期望 AST。</div>`;
  }

  // case.infer 存在时，把每行对应的「预期创建位置」接在行末，并和实际创建位置对拍。
  const inferNotes = payload.infer && typeof payload.infer.text === "string"
    ? parseInferNotes(payload.infer.text)
    : new Map();
  const creation = payload.infer && payload.infer.creation ? payload.infer.creation : null;
  const lines = text === "" ? [""] : text.split("\n");
  const rows = lines.map((line) => {
    const id = treeLineId(line);
    const note = id === null ? undefined : inferNotes.get(id);
    if (note === undefined) {
      return { line, note: undefined, status: null, actual: undefined };
    }
    const actual = creation === null ? undefined : creation[id];
    return { line, note, status: creation === null ? null : inferStatus(note.llm, actual), actual };
  });
  const annotated = rows.filter((row) => row.note !== undefined);
  const judged = annotated.filter((row) => row.status !== null);
  const counts = { ok: 0, late: 0, early: 0, unfilled: 0, unknown: 0, never: 0 };
  for (const row of judged) {
    counts[row.status.kind]++;
  }
  const bad = judged.length - counts.ok;

  let inferNotice = "";
  if (annotated.length > 0 && creation === null) {
    inferNotice = `<div class="notice infer"><b><code>case.infer</code> 的两个位置：</b>
      行末 <code>// created at char N "…", llm determined at char N "…"</code> ——前者是 shape token 建出来的那一格，
      后者是 LLM 按语法逻辑判的（不是解析器结果）。这里没有 <code>build/ts</code> 的 created at，所以只显示注记，不能对拍。
      ${payload.infer.creationError ? `（${esc(payload.infer.creationError)}）` : ""}</div>`;
  } else if (annotated.length > 0 && judged.length === 0) {
    inferNotice = '<div class="notice infer">case.infer 里没有一行能和这份 .ast 对上（节点身份是 kind + pos + src 起点）。</div>';
  } else if (judged.length > 0 && bad === 0) {
    inferNotice = `<div class="notice ok"><b>infer 对拍：${judged.length} 个节点全部一致。</b>
      llm determined 来自 <code>case.infer</code>，created at 来自 shape token（<code>build/ts</code>）。</div>`;
  } else if (judged.length > 0) {
    inferNotice = `<div class="notice ${counts.late + counts.early > 0 ? "warn" : "infer"}"><b>infer 对拍：一致 ${counts.ok} / ${judged.length}，不一致 ${bad}。</b>
      ${counts.late > 0 ? `<span class="chipstat late">late ${counts.late}</span>` : ""}
      ${counts.early > 0 ? `<span class="chipstat early">early ${counts.early}</span>` : ""}
      ${counts.unfilled > 0 ? `<span class="chipstat unfilled">unfilled ${counts.unfilled}</span>` : ""}
      ${counts.unknown > 0 ? `<span class="chipstat unknown">created ? ${counts.unknown}</span>` : ""}
      ${counts.never > 0 ? `<span class="chipstat never">never ${counts.never}</span>` : ""}
      行末的标记是「llm determined vs created at」：<code>✓</code> 一致，<code>late +N</code> 模型判得比实际创建晚 N 格，<code>early -N</code> 早 N 格。</div>`;
  }

  panel.innerHTML = `
    <div class="tab-head">
      <span class="name">${esc(payload.name)}.ast</span>
      <span class="meta">${originText} · ${countLines(text)} 行${annotated.length > 0 ? ` · infer 注记 ${annotated.length} 个${judged.length > 0 ? `，一致 ${counts.ok}` : ""}` : ""}</span>
      <span class="grow"></span>
      <button class="btn" id="ast-copy">复制</button>
    </div>
    ${notice}
    ${inferNotice}
    <div class="tree-card" style="margin-top:10px"><div class="tree" id="ast-tree"></div></div>`;

  const container = $("#ast-tree", panel);
  container.innerHTML = rows
    .map((row) => {
      if (row.note === undefined) {
        return `<span class="tree-line">${colorizeTreeLine(row.line)}</span>`;
      }
      const chip = row.status === null
        ? ""
        : `<span class="infer-status ${row.status.kind}" title="${esc(row.status.title)}">${esc(row.status.label)}</span>`;
      return `<span class="tree-line">${colorizeTreeLine(row.line)}<span class="infer-note">// ${esc(row.note.text)}</span>${chip}</span>`;
    })
    .join("");

  if (ast.stale === true) {
    $("#ast-toggle", panel).addEventListener("click", () => renderAstPanel(payload, !showGenerated));
  }
  $("#ast-copy", panel).addEventListener("click", async () => {
    await copyText(text);
    toast("已复制 AST", "ok");
  });
}

function renderMdPanel(payload) {
  const panel = $('[data-panel="md"]', els.main);
  if (!payload.md) {
    panel.innerHTML = `
      <div class="tab-head"><span class="name">${esc(payload.name)}.md</span><span class="meta">不存在</span></div>
      <div class="notice">
        <b>这个用例没有 case.md。</b>
        回放用的是 <code>${esc(state.index.build.path)}</code> 实时推进出来的步骤（只读，不写盘）。
        如果想把快照落进仓库，可以生成并写入 <code>.md</code> 与 <code>.ast</code>。
        <div class="btns">
          <button class="btn btn-primary" id="md-generate">生成 case.md 并写入</button>
        </div>
      </div>`;
    $("#md-generate", panel).addEventListener("click", () => generateDocs(payload.id));
    return;
  }

  const steps = payload.steps.steps ?? [];
  const toc = steps.map((step, index) => {
    const label = step.label === "" ? String(index) : step.label.replace(/^char\s+/, "");
    return `<button class="jump" data-step="${esc(step.index ?? "")}">${esc(label)}</button>`;
  }).join("");

  panel.innerHTML = `
    <div class="tab-head">
      <span class="name">${esc(payload.name)}.md</span>
      <span class="meta">${steps.length} 步（含 EOF）· 仓库快照</span>
      <span class="grow"></span>
      <button class="btn" id="md-verify">用解析器复核</button>
      <button class="btn" id="md-copy">复制</button>
    </div>
    <div id="md-verify-result"></div>
    <div class="toc">${toc}</div>
    <div class="md" id="md-body">${renderMarkdown(payload.md.text)}</div>`;

  const jump = (offset) => {
    setTab("player");
    const p = state.player;
    if (!p) {
      return;
    }
    const index = p.steps.findIndex((step) => String(step.index ?? "") === String(offset));
    setStep(index >= 0 ? index : 0);
  };

  $$(".toc .jump", panel).forEach((button) => {
    button.addEventListener("click", () => jump(button.dataset.step));
  });
  $$(".md-step", panel).forEach((button) => {
    button.addEventListener("click", () => jump(button.dataset.step));
  });
  $("#md-copy", panel).addEventListener("click", async () => {
    await copyText(payload.md.text);
    toast("已复制 case.md 全文", "ok");
  });
  $("#md-verify", panel).addEventListener("click", () => verifyWithParser(payload, $("#md-verify-result", panel)));
}

async function verifyWithParser(payload, container) {
  container.innerHTML = `<div class="notice info">正在用 build/ts 重新推进 …</div>`;
  try {
    const result = await getJson(`/api/steps?id=${encodeURIComponent(payload.id)}`);
    if (result.error !== null && result.steps.length === 0) {
      container.innerHTML = `<div class="notice err"><b>解析器没有给出结果</b><pre>${esc(result.error)}</pre></div>`;
      return;
    }
    const mine = payload.steps.steps ?? [];
    if (mine.length !== result.steps.length) {
      container.innerHTML = `<div class="notice err"><b>步数不一致：</b>case.md 有 ${mine.length} 步，解析器给 ${result.steps.length} 步。</div>`;
      return;
    }
    const diffAt = mine.findIndex((step, index) => step.tree !== result.steps[index].tree);
    if (diffAt < 0) {
      container.innerHTML = `<div class="notice ok">case.md 与解析器当前输出逐步一致（${mine.length} 步）。</div>`;
    } else {
      container.innerHTML = `<div class="notice err"><b>第 ${diffAt} 步（${esc(mine[diffAt].label)}）开始不一致，夹具已过期。</b>
        <div class="btns"><button class="btn" id="md-show-diff">看看差异</button></div>
        <div id="md-diff"></div></div>`;
      $("#md-show-diff", container).addEventListener("click", () => {
        $("#md-diff", container).innerHTML =
          `<div class="overview-cols" style="margin-top:10px">
             <div><div class="pane-head">case.md</div><pre class="log">${esc(mine[diffAt].tree)}</pre></div>
             <div><div class="pane-head">解析器</div><pre class="log">${esc(result.steps[diffAt].tree)}</pre></div>
           </div>`;
      });
    }
  } catch (error) {
    container.innerHTML = `<div class="notice err"><b>复核失败</b><pre>${esc(error.message)}</pre></div>`;
  }
}

function renderCheckPanel(payload) {
  const panel = $('[data-panel="check"]', els.main);
  const known = state.checks.get(payload.id);
  panel.innerHTML = `
    <div class="tab-head">
      <span class="name">run.mjs</span>
      <span class="meta">单个用例对拍</span>
      <span class="grow"></span>
      <button class="btn btn-primary" id="check-run">运行对拍</button>
    </div>
    ${known === undefined ? "" : `<div class="notice ${known === "ok" ? "ok" : "err"}">上次结果：${known === "ok" ? "通过" : `失败 · ${esc(state.checkReasons.get(payload.id) ?? "原因未知")}`}</div>`}
    <div id="check-out" style="margin-top:10px"></div>`;
  $("#check-run", panel).addEventListener("click", () => runCheckOne(payload.id));
}

async function runCheckOne(id) {
  const panel = $('[data-panel="check"]', els.main);
  const output = panel === null ? null : $("#check-out", panel);
  if (output !== null) {
    output.innerHTML = `<div class="notice info">正在跑 <code>run.mjs</code> …</div>`;
  }
  const button = $("#check-run", panel);
  if (button !== null) {
    button.disabled = true;
  }
  try {
    const result = await postJson("/api/check", { id });
    state.checkedAt = Date.now();
    if (result.ok) {
      state.checks.set(id, "ok");
      state.checkReasons.delete(id);
    } else {
      state.checks.set(id, "fail");
      state.checkReasons.set(id, result.reason ?? "解析器与 TypeScript 不一致");
    }
    renderList();
    renderTopbar();
    renderSidebarFoot();
    refreshCaseHeader();
    if (output !== null) {
      const text = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
      output.innerHTML =
        `<div class="notice ${result.ok ? "ok" : "err"}">${result.ok ? "通过：解析器逐节点与 TypeScript 一致。" : esc(result.reason ?? "失败")}</div>` +
        `<pre class="log" style="margin-top:10px">${esc(text || "（没有输出）")}</pre>`;
    }
    toast(result.ok ? `${id} 对拍通过` : `${id} 对拍失败`, result.ok ? "ok" : "err");
  } catch (error) {
    if (output !== null) {
      output.innerHTML = `<div class="notice err"><b>对拍失败</b><pre>${esc(error.message)}</pre></div>`;
    }
    toast(error.message, "err");
  } finally {
    if (button !== null) {
      button.disabled = false;
    }
  }
}

async function generateDocs(id) {
  const item = state.byId.get(id);
  const ok = window.confirm(
    `生成 ${id}.md 与 .ast 并写入仓库？\n\n` +
    `工具：node typescript/tools/gen-case-docs.mjs ${item.rel}\n` +
    `这会覆盖同名文件（git 可回退），随后页面会重新加载该用例。`,
  );
  if (!ok) {
    return;
  }
  toast("正在生成 .md / .ast …");
  try {
    const result = await postJson("/api/write-docs", { id });
    toast(`已写入 ${result.written.join("、")}`, "ok");
    await refreshIndex();
    location.hash = caseHash(id);
    await route();
  } catch (error) {
    toast(`生成失败：${error.message}`, "err");
  }
}

// ---------------------------------------------------------------------------
// 逐字回放
// ---------------------------------------------------------------------------

function stopPlayback() {
  const p = state.player;
  if (p !== null && p.timer !== 0) {
    clearTimeout(p.timer);
    p.timer = 0;
  }
  if (p !== null) {
    p.playing = false;
  }
}

function mountPlayer(payload, initialStep) {
  const panel = $('[data-panel="player"]', els.main);
  const stepInfo = payload.steps ?? { origin: "none", steps: [], error: null };
  const steps = stepInfo.steps ?? [];
  const hasSteps = steps.length > 0;

  const originChip = stepInfo.origin === "md"
    ? '<span class="origin-chip md" title="回放严格按仓库里的 case.md">来自 case.md</span>'
    : stepInfo.origin === "generated"
      ? '<span class="origin-chip gen" title="没有 case.md：按 build/ts 逐字符推进实时生成，不写盘">解析器实时生成</span>'
      : "";

  const treeTitle = stepInfo.origin === "md" ? "case.md · 当前这一步的树" : "解析器 · 当前这一步的树";

  let noticeHtml = "";
  if (!hasSteps) {
    const isError = stepInfo.origin === "error";
    noticeHtml = `<div class="notice ${isError ? "err" : ""}">
      <b>${isError ? "解析器无法逐字推进这个用例" : "没有可回放的逐字数据"}</b>
      ${stepInfo.error === null ? "" : `<pre>${esc(stepInfo.error)}</pre>`}
      <div class="btns">
        ${state.index.build.available && isError ? '<button class="btn" id="player-retry">重试</button>' : ""}
        <button class="btn" id="player-goto-check">去看对拍</button>
      </div>
    </div>`;
  }

  panel.innerHTML = `
    <div class="player-bar">
      <div class="step-readout">
        <span class="step-label" id="p-label">—</span>
        <span class="step-quoted" id="p-quoted"></span>
        <span class="step-code" id="p-code"></span>
      </div>
      ${originChip}
      <span class="step-count" id="p-count"></span>
    </div>
    ${hasSteps ? '<div class="tape-wrap" id="p-tape-wrap"><div class="tape" id="p-tape"></div></div>' : noticeHtml}
    <div class="panes${hasSteps ? "" : " single"}">
      <section class="pane">
        <header class="pane-head">${esc(payload.name)}.ts<span class="spacer"></span><span class="pane-note" id="p-src-note"></span></header>
        <div class="pane-body code" id="p-source"></div>
      </section>
      ${hasSteps ? `<section class="pane">
        <header class="pane-head">${esc(treeTitle)}<span class="spacer"></span><span class="pane-note" id="p-tree-note"></span></header>
        <div class="pane-body tree" id="p-tree"></div>
      </section>` : ""}
    </div>
    ${hasSteps ? `
    <div class="controls">
      <div class="ctrl-group">
        <button class="icon-btn" id="p-first" title="第一步（Home）">⏮</button>
        <button class="icon-btn" id="p-prev" title="上一步（←）">◀</button>
        <button class="icon-btn primary" id="p-play" title="播放 / 暂停（空格）">▶</button>
        <button class="icon-btn" id="p-next" title="下一步（→）">▶|</button>
        <button class="icon-btn" id="p-last" title="最后一步（End）">⏭</button>
      </div>
      <div class="seek">
        <input type="range" id="p-seek" min="0" max="${steps.length - 1}" value="0" step="1">
        <span class="pos" id="p-pos">1 / ${steps.length}</span>
      </div>
      <div class="ctrl-group sep">
        <label class="toggle" title="每一步停留时长"><span>速度</span></label>
        <select class="select-mini" id="p-speed">
          ${[1200, 800, 500, 300, 150].map((ms) => `<option value="${ms}"${ms === state.prefs.speed ? " selected" : ""}>${ms / 1000}s</option>`).join("")}
        </select>
      </div>
      <div class="ctrl-group">
        <label class="toggle" title="回到开头继续"><input type="checkbox" id="p-loop"><span class="box"></span>循环</label>
        <label class="toggle" title="自动滚动到当前字符"><input type="checkbox" id="p-follow"><span class="box"></span>跟随</label>
        <label class="toggle" title="从列表点开用例时自动播放；URL 里指定了步号（@N）就停在第 N 步"><input type="checkbox" id="p-autoplay"><span class="box"></span>自动播放</label>
      </div>
    </div>
    <div class="kbd-hint">
      <span><kbd>空格</kbd> 播放/暂停</span>
      <span><kbd>←</kbd><kbd>→</kbd> 单步</span>
      <span><kbd>Home</kbd><kbd>End</kbd> 首尾</span>
      <span id="p-hint"></span>
    </div>` : ""}`;

  const sourceBody = $("#p-source", panel);
  const rendered = renderSource(sourceBody, payload.ts);
  $("#p-src-note", panel).textContent = `${rendered.lineCount} 行 · ${payload.ts.length} 字符`;

  const player = {
    panel,
    steps,
    index: -1,
    playing: false,
    timer: 0,
    cells: rendered.cells,
    spanByOffset: rendered.spanByOffset,
    currentSpan: null,
    currentCell: -1,
    prevTree: null,
    origin: stepInfo.origin,
    treeEl: $("#p-tree", panel),
    tapeWrap: $("#p-tape-wrap", panel),
    tape: $("#p-tape", panel),
  };

  if (!hasSteps) {
    const treeNote = $("#p-tree-note", panel);
    if (treeNote !== null) {
      treeNote.textContent = "";
    }
    if (player.treeEl !== null) {
      player.treeEl.innerHTML = "";
    }
    const retry = $("#player-retry", panel);
    if (retry !== null) {
      retry.addEventListener("click", () => route());
    }
    const goCheck = $("#player-goto-check", panel);
    if (goCheck !== null) {
      goCheck.addEventListener("click", () => setTab("check"));
    }
    state.player = player;
    return;
  }

  // 磁带
  player.tape.innerHTML = player.cells.map((cell, index) => {
    const ws = isWhitespace(cell.ch) ? " ws" : "";
    return `<button class="cell${ws}" type="button" data-cell="${index}" title="${esc(charTitle(cell.ch))}">` +
      `<span class="idx">${index}</span><span class="gl">${esc(displayGlyph(cell.ch))}</span></button>`;
  }).join("");

  player.tape.addEventListener("click", (event) => {
    const cell = event.target.closest(".cell");
    if (cell === null) {
      return;
    }
    pause();
    setStep(stepForCell(player, Number(cell.dataset.cell)));
  });

  // 控件
  $("#p-first", panel).addEventListener("click", () => { pause(); setStep(0); });
  $("#p-prev", panel).addEventListener("click", () => { pause(); setStep(player.index - 1); });
  $("#p-play", panel).addEventListener("click", () => (player.playing ? pause() : play()));
  $("#p-next", panel).addEventListener("click", () => { pause(); setStep(player.index + 1); });
  $("#p-last", panel).addEventListener("click", () => { pause(); setStep(steps.length - 1); });
  $("#p-seek", panel).addEventListener("input", (event) => { pause(); setStep(Number(event.target.value)); });

  const speed = $("#p-speed", panel);
  speed.value = String(state.prefs.speed);
  speed.addEventListener("change", () => {
    state.prefs.speed = Number(speed.value);
    savePrefs();
    if (player.playing) {
      schedule(player);
    }
  });

  const loop = $("#p-loop", panel);
  loop.checked = state.prefs.loop;
  loop.addEventListener("change", () => {
    state.prefs.loop = loop.checked;
    savePrefs();
  });

  const follow = $("#p-follow", panel);
  follow.checked = state.prefs.follow;
  follow.addEventListener("change", () => {
    state.prefs.follow = follow.checked;
    savePrefs();
  });

  const autoplay = $("#p-autoplay", panel);
  autoplay.checked = state.prefs.autoplay;
  autoplay.addEventListener("change", () => {
    state.prefs.autoplay = autoplay.checked;
    savePrefs();
  });

  state.player = player;
  // 第一步不标「新增」：它相对的是空树，全部标绿反而看不出变化。
  player.prevTree = steps[Math.max(0, Math.min(steps.length - 1, initialStep))].tree;
  setStep(initialStep, { instant: true });
  updatePlayButton();
}

function stepForCell(player, cellIndex) {
  const cell = player.cells[cellIndex];
  if (cell === undefined) {
    return 0;
  }
  let best = 0;
  let bestDistance = Infinity;
  player.steps.forEach((step, index) => {
    if (step.index === null || step.index === undefined) {
      return;
    }
    const distance = Math.abs(step.index - cell.start);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

function tapeIndexForStep(player, step) {
  if (step.index === null || step.index === undefined) {
    return -1;
  }
  let low = 0;
  let high = player.cells.length - 1;
  let answer = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (player.cells[mid].start <= step.index) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return answer;
}

function setStep(index, { instant = false } = {}) {
  const p = state.player;
  if (p === null || p.steps.length === 0) {
    return;
  }
  const clamped = Math.max(0, Math.min(p.steps.length - 1, index));
  if (clamped === p.index && !instant) {
    return;
  }
  const previous = p.index;
  p.index = clamped;
  const step = p.steps[clamped];

  // 源码：只移动当前字符的高亮
  if (p.currentSpan !== null) {
    p.currentSpan.classList.remove("cur");
    p.currentSpan = null;
  }
  if (step.index !== null && step.index !== undefined) {
    const span = p.spanByOffset.get(step.index);
    if (span !== undefined) {
      span.classList.add("cur");
      p.currentSpan = span;
    }
  }

  // 读数
  const label = $("#p-label", p.panel);
  const quoted = $("#p-quoted", p.panel);
  const code = $("#p-code", p.panel);
  const count = $("#p-count", p.panel);
  const seek = $("#p-seek", p.panel);
  const pos = $("#p-pos", p.panel);

  if (label !== null) {
    label.textContent = step.label === "" ? "step" : step.label;
  }
  if (quoted !== null) {
    quoted.textContent = step.quoted === null || step.quoted === undefined ? "" : JSON.stringify(step.quoted);
  }
  if (code !== null) {
    code.textContent = step.index === null || step.index === undefined
      ? "源码结束（EOF）"
      : describeChar(step.quoted ?? "");
  }
  if (count !== null) {
    count.textContent = `${clamped + 1} / ${p.steps.length}`;
  }
  if (seek !== null) {
    seek.value = String(clamped);
  }
  if (pos !== null) {
    pos.textContent = `${clamped + 1} / ${p.steps.length}`;
  }

  // 磁带
  const cellIndex = tapeIndexForStep(p, step);
  if (p.currentCell !== cellIndex) {
    const previousCell = p.tape.children[p.currentCell];
    if (previousCell !== undefined) {
      previousCell.classList.remove("is-cur");
    }
    const nextCell = p.tape.children[cellIndex];
    if (nextCell !== undefined) {
      nextCell.classList.add("is-cur");
    }
    p.currentCell = cellIndex;
  }
  for (let i = 0; i < p.tape.children.length; i++) {
    const cell = p.tape.children[i];
    cell.classList.toggle("done", step.index === null ? true : i < cellIndex);
  }

  // 树：重绘 + 标出这一步新增的行
  const addedCount = renderTree(p.treeEl, step.tree, p.prevTree);
  p.prevTree = step.tree;
  const treeNote = $("#p-tree-note", p.panel);
  if (treeNote !== null) {
    treeNote.textContent = step.tree === "" ? "" : `${step.tree.split("\n").length} 行${addedCount > 0 ? ` · 新增 ${addedCount}` : ""}`;
  }

  // 自动滚动
  if (state.prefs.follow) {
    if (state.tab === "player") {
      if (p.currentSpan !== null) {
        ensureVisible($("#p-source", p.panel), p.currentSpan, 40);
      }
      if (addedCount > 0) {
        const first = $(".tree-line.add", p.treeEl);
        if (first !== null) {
          ensureVisible(p.treeEl, first, 40);
        }
      }
      const cell = p.tape.children[cellIndex];
      if (cell !== undefined && p.tapeWrap !== null) {
        const wrapper = p.tapeWrap.getBoundingClientRect();
        const box = cell.getBoundingClientRect();
        const delta = (box.left + box.width / 2) - (wrapper.left + wrapper.width / 2);
        if (Math.abs(delta) > 4) {
          p.tapeWrap.scrollLeft += delta;
        }
      } else if (p.tapeWrap !== null) {
        p.tapeWrap.scrollLeft = p.tapeWrap.scrollWidth;
      }
    }
  }

  if (state.payload !== null && previous !== clamped) {
    history.replaceState(null, "", caseHash(state.payload.id, clamped));
  }
}

function updatePlayButton() {
  const p = state.player;
  const button = $("#p-play", p?.panel);
  if (button === null || button === undefined) {
    return;
  }
  button.textContent = p.playing ? "❚❚" : "▶";
  button.classList.toggle("primary", !p.playing);
}

function schedule(p) {
  if (p.timer !== 0) {
    clearTimeout(p.timer);
  }
  p.timer = setTimeout(() => {
    if (!p.playing) {
      return;
    }
    if (p.index >= p.steps.length - 1) {
      if (state.prefs.loop) {
        setStep(0);
        schedule(p);
      } else {
        pause();
      }
      return;
    }
    setStep(p.index + 1);
    schedule(p);
  }, state.prefs.speed);
}

function play() {
  const p = state.player;
  if (p === null || p.steps.length === 0) {
    return;
  }
  if (p.playing) {
    return;
  }
  if (p.index >= p.steps.length - 1) {
    setStep(0);
  }
  p.playing = true;
  updatePlayButton();
  schedule(p);
}

function pause() {
  const p = state.player;
  if (p === null) {
    return;
  }
  if (p.timer !== 0) {
    clearTimeout(p.timer);
    p.timer = 0;
  }
  if (!p.playing) {
    return;
  }
  p.playing = false;
  updatePlayButton();
  if (state.payload !== null) {
    history.replaceState(null, "", caseHash(state.payload.id, p.index));
  }
}

function togglePlay() {
  const p = state.player;
  if (p === null || p.steps.length === 0) {
    return;
  }
  if (p.playing) {
    pause();
  } else {
    play();
  }
}

// ---------------------------------------------------------------------------
// 全量对拍
// ---------------------------------------------------------------------------

async function runCheckAll() {
  if (state.checking) {
    return;
  }
  state.checking = true;
  const button = els.btnCheckAll;
  const original = button.innerHTML;
  button.classList.add("is-busy");
  button.disabled = true;
  button.innerHTML = '<span class="btn-dot"></span>对拍中…';
  try {
    const result = await postJson("/api/check-all");
    state.checks = new Map();
    state.checkReasons = new Map();
    for (const id of result.passed) {
      state.checks.set(id, "ok");
    }
    for (const [id, reason] of Object.entries(result.failures)) {
      state.checks.set(id, "fail");
      state.checkReasons.set(id, reason);
    }
    state.checkedAt = Date.now();
    renderList();
    renderTopbar();
    renderSidebarFoot();
    if (state.payload !== null) {
      refreshCaseHeader();
    }
    const ok = [...state.checks.values()].filter((value) => value === "ok").length;
    toast(`对拍完成：${ok} / ${state.index.stats.total} 通过（${result.elapsedMs ?? 0}ms）`, ok === state.index.stats.total ? "ok" : "err");
  } catch (error) {
    toast(`对拍失败：${error.message}`, "err");
  } finally {
    state.checking = false;
    button.classList.remove("is-busy");
    button.disabled = false;
    button.innerHTML = original;
  }
}

async function refreshIndex() {
  const index = await getJson("/api/index");
  state.index = index;
  state.byId = new Map(index.cases.map((item) => [item.id, item]));
  els.rootPath.textContent = index.root;
  renderTopbar();
  renderGroupSelect();
  renderList();
  renderSidebarFoot();
}

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------

function bindEvents() {
  els.search.addEventListener("input", () => {
    state.query = els.search.value;
    renderList();
  });

  els.search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      els.search.value = "";
      state.query = "";
      renderList();
      els.search.blur();
    }
    if (event.key === "Enter") {
      const first = filteredCases()[0];
      if (first !== undefined) {
        select(first.id);
        els.search.blur();
      }
    }
  });

  for (const chip of $$("#status-filters .chip")) {
    chip.addEventListener("click", () => {
      state.status = chip.dataset.status;
      for (const other of $$("#status-filters .chip")) {
        other.classList.toggle("is-on", other === chip);
      }
      renderList();
    });
  }

  for (const chip of $$("[data-flag]")) {
    chip.addEventListener("click", () => {
      const flag = chip.dataset.flag;
      if (flag === "md") {
        state.flagMd = !state.flagMd;
        chip.classList.toggle("is-on", state.flagMd);
      } else {
        state.flagAst = !state.flagAst;
        chip.classList.toggle("is-on", state.flagAst);
      }
      renderList();
    });
  }

  els.groupSelect.addEventListener("change", () => {
    state.group = els.groupSelect.value;
    renderList();
  });

  els.list.addEventListener("click", (event) => {
    const row = event.target.closest(".case-item");
    if (row !== null) {
      select(row.dataset.id);
    }
  });

  els.btnCheckAll.addEventListener("click", runCheckAll);

  els.btnDocs.addEventListener("click", () => {
    location.hash = `#/doc/${encodeURIComponent("tts.md")}`;
  });

  window.addEventListener("hashchange", () => {
    route();
  });

  // 用鼠标点过控件之后把焦点交还页面，方向键才能继续控制回放。
  // event.detail === 0 是键盘合成的 click，此时必须保留焦点。
  document.addEventListener("click", (event) => {
    if (event.detail === 0) {
      return;
    }
    const element = event.target.closest(".icon-btn, .cell, .case-item, .tab, .btn, .chip");
    if (element !== null) {
      element.blur();
    }
  });

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) {
      return;
    }
    if (event.key === "/" && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      els.search.focus();
      return;
    }
    // 空格 / 回车交给当前聚焦的按钮，其它键照常控制回放。
    const control = target instanceof HTMLElement ? target.closest("button, a") : null;
    if (control !== null && (event.key === " " || event.key === "Enter")) {
      return;
    }
    if (state.player === null || state.payload === null || state.tab !== "player") {
      return;
    }
    switch (event.key) {
      case " ":
        event.preventDefault();
        togglePlay();
        break;
      case "ArrowRight":
        event.preventDefault();
        pause();
        setStep(state.player.index + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        pause();
        setStep(state.player.index - 1);
        break;
      case "Home":
        event.preventDefault();
        pause();
        setStep(0);
        break;
      case "End":
        event.preventDefault();
        pause();
        setStep(state.player.steps.length - 1);
        break;
      default:
        break;
    }
  });
}

async function boot() {
  bindEvents();
  try {
    state.index = await getJson("/api/index");
  } catch (error) {
    els.main.innerHTML = `<div class="scroll-area"><div class="notice err"><b>连不上服务</b><pre>${esc(error.message)}</pre></div></div>`;
    return;
  }
  state.byId = new Map(state.index.cases.map((item) => [item.id, item]));
  els.rootPath.textContent = state.index.root;
  renderTopbar();
  renderGroupSelect();
  renderList();
  renderSidebarFoot();
  await route();
}

boot();
