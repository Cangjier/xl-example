// 类型覆盖率观测工具（P5 地基，只读，不改行为）。
//
// 对每个 tts 用例逐字符推进解析器（与 typescript/cases/tts/run.mjs 的 runIncremental 同一驱动），
// 并用 TypeParserApi 的兜底计数器增量判断该用例是否走了「Close 时整段解析」：
//   AliasFallbackCount      —— TypeParserApi.ParseAlias 的调用次数（类型别名整段解析）
//   ReturnTypeFallbackCount —— TypeParserApi.ParseCompleteReturnType 的调用次数（函数返回类型整段解析）
// 同时统计最终树里 CreatedAt - SourceRange.Start > 2 的 IdentifierShape 个数（「迟到标识符」）。
//
// 用法:
//   node typescript/tools/type-coverage.mjs [--json] [--dir <目录>] [--allow <id1,id2,...>]
//
// --allow 是给 CI 用的断言：给定用例 id 集合（用例文件名去掉 .ts，或相对仓库根的路径），
// 若「兜底用例 ∩ 白名单」非空，打印违规清单并 exit 1，否则 exit 0。
// 不带 --allow 时输出与退出码与旧版完全一致（默认输出兼容）。
//
// 默认遍历 typescript/cases/tts/success。计数器在每个用例前归零，单进程跑完整个目录。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BUILD = path.join(ROOT, "build", "ts");
const DEFAULT_DIR = path.join(ROOT, "typescript", "cases", "tts", "success");
const LATE_THRESHOLD = 2;

if (!fs.existsSync(path.join(BUILD, "typescript", "shapes", "files", "source-file-shape.js"))) {
  console.error("[type-coverage] build/ts 里没有解析器产物：先跑 xl build + tsc。");
  process.exit(2);
}

const { SyntaxContext } = require(path.join(BUILD, "core/syntax/syntax-context.js"));
const { SourceRange } = require(path.join(BUILD, "core/syntax/source-range.js"));
const { TextDocument } = require(path.join(BUILD, "typescript/run/text-document.js"));
const { TypescriptTemplate } = require(path.join(BUILD, "typescript/run/typescript-template.js"));
const { SourceFileShape } = require(path.join(BUILD, "typescript/shapes/files/source-file-shape.js"));
const { TypeParserApi } = require(path.join(BUILD, "typescript/shapes/types/type-parser-api.js"));
const { IdentifierShape } = require(path.join(BUILD, "typescript/shapes/names/identifier-shape.js"));

function parseAllowList(value) {
  const ids = new Set();
  for (const part of String(value).split(",")) {
    const id = part.trim();
    if (id.length > 0) {
      ids.add(id);
    }
  }
  return ids;
}

function parseArgs(argv) {
  const options = { json: false, dir: DEFAULT_DIR, allow: null };
  for (let at = 0; at < argv.length; at++) {
    const arg = argv[at];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--allow") {
      const value = argv[++at];
      if (value === undefined) {
        console.error("[type-coverage] --allow 需要一个逗号分隔的用例 id 列表");
        process.exit(2);
      }
      options.allow = parseAllowList(value);
    } else if (arg.startsWith("--allow=")) {
      options.allow = parseAllowList(arg.slice("--allow=".length));
    } else if (arg === "--dir") {
      const value = argv[++at];
      if (value === undefined) {
        console.error("[type-coverage] --dir 需要一个目录参数");
        process.exit(2);
      }
      options.dir = path.isAbsolute(value) ? value : path.resolve(ROOT, value);
    } else if (arg.startsWith("--dir=")) {
      const value = arg.slice("--dir=".length);
      options.dir = path.isAbsolute(value) ? value : path.resolve(ROOT, value);
    } else if (arg === "--help" || arg === "-h") {
      console.log("用法: node typescript/tools/type-coverage.mjs [--json] [--dir <目录>] [--allow <id1,id2,...>]");
      process.exit(0);
    } else {
      console.error(`[type-coverage] 未知参数: ${arg}`);
      process.exit(2);
    }
  }
  return options;
}

function collectTsFiles(dir) {
  const files = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        files.push(full);
      }
    }
  }
  files.sort();
  return files;
}

// 用例 id：文件名去掉 .ts（与 _coord/probe 的 case id 一致）。
function caseIdOf(relativePath) {
  const base = relativePath.slice(relativePath.lastIndexOf("/") + 1);
  return base.endsWith(".ts") ? base.slice(0, -3) : base;
}

// 白名单既可以写 id，也可以写相对仓库根的路径，避免 CI 里两种写法互相踩。
function isAllowed(allow, relativePath) {
  return allow.has(caseIdOf(relativePath)) || allow.has(relativePath);
}

// 逐字符推进（与 run.mjs 的 runIncremental 完全一致）。
function runIncremental(source, name) {
  const template = TypescriptTemplate.Create();
  const root = new SourceFileShape(template);
  const context = new SyntaxContext(root, 32);
  const document = new TextDocument(source, name);
  SourceRange.CurrentDocument = document;
  context.CurrentDocument = document;
  const count = document.GetCount();
  for (let index = 0; index < count; index++) {
    context.ProcessRange(root, new SourceRange(document, index, index + 1), index);
  }
  context.Index = count;
  root.SignOut(count);
  context.ProcessRange(root, new SourceRange(document, count, count), count);
  return root;
}

function collectIdentifiers(root) {
  const found = [];
  const stack = [root];
  while (stack.length > 0) {
    const token = stack.pop();
    if (token instanceof IdentifierShape) {
      found.push(token);
    }
    const data = token?.Data;
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item !== null && typeof item === "object") {
          stack.push(item);
        }
      }
    }
  }
  return found;
}

function analyzeFile(file) {
  const source = fs.readFileSync(file, "utf8");
  TypeParserApi.ResetFallbackCounts();
  const root = runIncremental(source, path.basename(file));
  const aliasFallback = TypeParserApi.AliasFallbackCount;
  const returnTypeFallback = TypeParserApi.ReturnTypeFallbackCount;

  const identifiers = collectIdentifiers(root);
  let lateIdentifiers = 0;
  let maxLate = -1;
  let maxLateText = "";
  for (const identifier of identifiers) {
    const start = identifier.SourceRange?.Start ?? -1;
    if (identifier.CreatedAt < 0 || start < 0) {
      continue;
    }
    const late = identifier.CreatedAt - start;
    if (late > LATE_THRESHOLD) {
      lateIdentifiers++;
    }
    if (late > maxLate) {
      maxLate = late;
      maxLateText = identifier.Text ?? "";
    }
  }

  return {
    path: path.relative(ROOT, file).replace(/\\/g, "/"),
    aliasFallback,
    returnTypeFallback,
    fallback: aliasFallback + returnTypeFallback,
    identifiers: identifiers.length,
    lateIdentifiers,
    maxLate,
    maxLateText,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(options.dir)) {
    console.error(`[type-coverage] 目录不存在: ${options.dir}`);
    process.exit(2);
  }

  const files = collectTsFiles(options.dir);
  const cases = [];
  const failures = [];
  let fallbackCases = 0;
  let fallbackTotal = 0;
  let identifiersTotal = 0;
  let lateTotal = 0;
  let maxLate = -1;
  let maxLateCase = "";
  let maxLateText = "";

  for (const file of files) {
    let result;
    try {
      result = analyzeFile(file);
    } catch (error) {
      failures.push({ path: path.relative(ROOT, file).replace(/\\/g, "/"), error: String(error?.message ?? error) });
      continue;
    }
    cases.push(result);
    if (result.fallback > 0) {
      fallbackCases++;
    }
    fallbackTotal += result.fallback;
    identifiersTotal += result.identifiers;
    lateTotal += result.lateIdentifiers;
    if (result.maxLate > maxLate) {
      maxLate = result.maxLate;
      maxLateCase = result.path;
      maxLateText = result.maxLateText;
    }
  }

  const summary = {
    dir: path.relative(ROOT, options.dir).replace(/\\/g, "/") || options.dir,
    cases: cases.length,
    failed: failures.length,
    fallbackCases,
    fallbackTotal,
    aliasFallbackTotal: cases.reduce((sum, item) => sum + item.aliasFallback, 0),
    returnTypeFallbackTotal: cases.reduce((sum, item) => sum + item.returnTypeFallback, 0),
    identifiers: identifiersTotal,
    lateIdentifiers: lateTotal,
    lateThreshold: LATE_THRESHOLD,
    maxLate,
    maxLateCase,
    maxLateText,
  };

  const allow = options.allow;
  let violations = [];
  let allowUnknown = [];
  if (allow !== null) {
    const known = new Set();
    for (const result of cases) {
      known.add(caseIdOf(result.path));
      known.add(result.path);
    }
    violations = cases.filter((result) => result.fallback > 0 && isAllowed(allow, result.path));
    allowUnknown = [...allow].filter((id) => !known.has(id));
  }

  if (options.json) {
    if (allow === null) {
      console.log(JSON.stringify({ summary, cases, failures }, null, 2));
      return;
    }
    console.log(JSON.stringify({
      summary,
      cases,
      failures,
      allow: {
        ids: [...allow],
        violationCount: violations.length,
        violations: violations.map((result) => ({ id: caseIdOf(result.path), path: result.path, fallback: result.fallback })),
        unknown: allowUnknown,
        passed: violations.length === 0,
      },
    }, null, 2));
    if (violations.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  for (const result of cases) {
    const mark = result.fallback > 0 ? "*" : " ";
    console.log(`${mark} ${result.path} fallback=${result.fallback} lateIdentifiers=${result.lateIdentifiers}`);
  }
  for (const failure of failures) {
    console.log(`! ${failure.path} error=${failure.error}`);
  }
  console.log("");
  console.log(`汇总: 用例 ${summary.cases} / 兜底用例 ${summary.fallbackCases} / 兜底总次数 ${summary.fallbackTotal}` +
    ` / 迟到标识符 ${summary.lateIdentifiers} (IdentifierShape ${summary.identifiers}, 最多 +${summary.maxLate} ${summary.maxLateText || ""} @ ${summary.maxLateCase})`);
  if (summary.failed > 0) {
    console.log(`失败用例 ${summary.failed} 个（见上面的 ! 行）`);
  }
  if (allow !== null) {
    console.log("");
    console.log(`[type-coverage] --allow ${allow.size} 个 id：兜底用例命中 ${violations.length} 条`);
    for (const violation of violations) {
      console.log(`  ! ${caseIdOf(violation.path)} fallback=${violation.fallback} (${violation.path})`);
    }
    if (allowUnknown.length > 0) {
      console.log(`[type-coverage] --allow 里未匹配任何用例: ${allowUnknown.join(",")}`);
    }
    if (violations.length > 0) {
      console.log("[type-coverage] 结论: FAIL（白名单里仍有兜底用例）");
      process.exitCode = 1;
    } else {
      console.log("[type-coverage] 结论: OK（白名单内无兜底用例）");
    }
  }
}

main();
