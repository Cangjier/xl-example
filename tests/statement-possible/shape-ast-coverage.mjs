#!/usr/bin/env node
// Stage 5d-7：**形状层表达式覆盖**专项探针（按类取证，语料是这轮补上的每一族）。
//
// 每一族一条或多条最小源码，逐条断言三件事：
//   1. `StatementShapeAst.TotalShapeAst >= 1` —— 这条表达式的 AST **确实由形状树建出**（不是"恰好没红"）；
//   2. `StatementShapeAst.TotalDeclined === 0` —— 形状树没有拒绝（`ShapeAstDeclinedCount` 为 0 的正面证据）；
//   3. 默认解析（壳开）的 `ToXmlString()` 与 legacy 档（`EnableShellExpressions=false`）**逐字节相同** ——
//      AST 由构造保证与 legacy 相同，不靠"看起来对"。
//
// 语料分族（族名与 `HANDOFF-5d7.md` 的归类一一对应）：
//   tagged-template   标签模板的非常规被标宿主（`!` / `as` / 数组 / 正则 / `new C()` / 可选链 / `import.meta` / `new.target`）
//   type-assert       `as` / `satisfies`（含链式、`as const`、括号后再取成员）
//   type-arguments    类型实参调用 / 实例化表达式 / `?.<T>(…)`
//   keyword-leaf      `super` / `new.target`
//   private-name      `this.#x` / `obj.#x` / `#x in obj`
//
// **第 3 个元素是 `known`**：这一格是**本轮已知未覆盖**的形态（不是"没测到"），断言换成
// 「XML 仍与 legacy 逐字节相同，且**没有**建错树」——即形状层可以不管它，但绝不能产出与 legacy 不同的树。
// 它们的清单同时抄进 `HANDOFF-5d7.md` §剩余清单；本探针不把它们算作 pass（`known=` 单独计数）。
//
// 用法：node tests/statement-possible/shape-ast-coverage.mjs [--json]
// 退出码：0 = 全部通过（known 不算失败）；1 = 有失败；2 = 用法错误。
// 依赖：`build/ts`（先 `xl_build` 再 `tsc`）。
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(root, "build", "ts", rel));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementShapeAst } = load("typescript/tokens/statements/statement-shape-ast.js");
const { StatementRouteUtil } = load("typescript/tokens/statements/statement-route-util.js");

const GROUPS = [
  {
    name: "tagged-template",
    note: "标签模板：被标宿主不是标识符（后缀 / 字面量 / 关键字宿主）",
    cases: [
      ["tt-identifier", "tag`t`;"],
      ["tt-member", "String.raw`a${x}b`;"],
      ["tt-nonnull", "a!`t`;"],
      ["tt-array", "[a, b]`t`;"],
      ["tt-regex", "/re/g`t`;"],
      ["tt-new-call", "new C()`t`;"],
      ["tt-call-chain", "a?.b()`t`;"],
      ["tt-index", "a[b]`t`;"],
      ["tt-import-meta", "import.meta`t`;"],
      ["tt-new-target", "function f() { new.target`t`; }"],
      ["tt-after-as", "a`t` as T;"],
      ["tt-then-member", "a`t`.b;"],
      ["tt-nested-paren", "f(a`t`);"],
    ],
  },
  {
    name: "type-assert",
    note: "`as` / `satisfies`：类型区域整段交给 legacy `ParseFollowingType`",
    cases: [
      ["as-simple", "a as T;"],
      ["as-generic", "a as A<B>;"],
      ["as-array-type", "a as A[];"],
      ["as-const", "x as const;"],
      ["as-chain", "x as T as U;"],
      ["as-satisfies", "x as const satisfies T;"],
      ["satisfies-plain", "a satisfies T;"],
      ["as-lower-than-add", "a + b as T;"],
      ["as-in-assign", "x = a as T;"],
      ["as-in-call", "f(a as T, b as U);"],
      ["as-then-member", "(x as any).y;"],
      ["as-paren-nonnull", "(x as any)!;"],
      ["as-in-array", "[a as T];"],
      // known：条件表达式的分支位。`as` 一到就进 `ExpectTypeTail`，`?`/`:` 被当成类型区域的一部分；
      // 收口器从 `as` 之后只读一个类型，读到 `: c` 还有剩余单元就拒绝接管 → 回 legacy（树仍正确）。
      ["as-in-conditional", "a ? b as T : c;", "条件分支位的 `as`：类型之后还有 `: c`，形状层不解释"],
    ],
  },
  {
    name: "type-arguments",
    note: "类型实参：`<` 判成类型实参表之后整段交给 legacy `ParsePostfixSuffix`",
    cases: [
      ["ta-call", "f<T>(1);"],
      ["ta-call-multi", "f<T, U>(a, b);"],
      ["ta-member-call", "o.m<T, U>(x);"],
      ["ta-instantiation", "f<string>;"],
      ["ta-instantiation-multi", "f<string, number>;"],
      ["ta-optional-call", "a?.<T>(b);"],
      ["ta-instantiation-optional", "a<b>?.[0];"],
      // known：`a<b>` 是实例化表达式，后面还跟着 `as` / `instanceof`。`ParsePostfixSuffix` 只管后缀，
      // 读到 `as` / `instanceof` 就停 → 没有覆盖整段 → 回 legacy（树仍正确）。
      // 收掉它要给「类型实参尾巴」再叠一层表达式解析（或让 `as`/`instanceof` 走同一段 legacy），超出本轮。
      ["ta-after-as", "a<b> as T;", "实例化表达式后面接 `as`：后缀解析在 `as` 处停"],
      ["ta-after-instanceof", "a<b> instanceof C;", "实例化表达式后面接 `instanceof`：同上"],
      ["ta-tag", "a<b>`t`;"],
      ["ta-nested-paren", "(f<T>(1));"],
      ["ta-comparison-stays", "a < b;"],
    ],
  },
  {
    name: "keyword-leaf",
    note: "关键字叶子：`super` / `new.target`",
    cases: [
      ["kw-super-call", "class C extends D { constructor() { super(); } }"],
      ["kw-super-member", "class C extends D { m() { super.m(); } }"],
      ["kw-super-index", "class C extends D { m() { super[k]; } }"],
      ["kw-new-target", "function f() { new.target; }"],
      ["kw-new-target-member", "function f() { new.target.name; }"],
      ["kw-this-not-new-target", "function f() { new C().name; }"],
    ],
  },
  {
    name: "private-name",
    note: "私有名：`#` + 名字两格合成 `PrivateIdentifier`",
    cases: [
      ["pn-member-this", "class C { #x = 1; m() { this.#x; } }"],
      ["pn-member-other", "class C { #x = 1; m(o) { o.#x; } }"],
      ["pn-member-as-index", "class C { #x = 1; m() { this.#x[0]; } }"],
      // known：**语句起点**的 `#`。这一格的缺口不在形状树（操作数位的私有名已经能建），
      // 而在「块体目录/路由把 `#` 认成表达式语句起点」——本轮的改动范围不含路由判据。
      ["pn-in", "class C { #x = 1; m(o) { #x in o; } }", "语句起点的 `#`：路由/体目录还没把 `#` 当表达式起点"],
      ["pn-in-paren", "class C { #x = 1; m(o) { (#x in o); } }"],
    ],
  },
];

// 与 final-matrix.mjs 同口径的 XML 差异定位：只报第一处不同，足够定位。
function xmlDifference(left, right) {
  if (left === right) {
    return null;
  }
  let at = 0;
  while (at < left.length && at < right.length && left[at] === right[at]) {
    at++;
  }
  const from = Math.max(0, at - 40);
  return `位置 ${at}：形状=${JSON.stringify(left.slice(from, at + 40))} legacy=${JSON.stringify(right.slice(from, at + 40))}`;
}

function parse(source) {
  return SourceFileRunner.Parse(source, "coverage.ts");
}

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log("用法：node tests/statement-possible/shape-ast-coverage.mjs [--json]");
  process.exit(0);
}
for (const arg of args) {
  if (arg !== "--json") {
    console.error(`不认识的选项：${arg}`);
    process.exit(2);
  }
}
const json = args.has("--json");

const savedShell = StatementRouteUtil.EnableShellExpressions;
const savedDeclined = StatementShapeAst.TotalDeclined;
const savedShapeAst = StatementShapeAst.TotalShapeAst;
const savedFallback = StatementRouteUtil.FileFallbackCount;

const rows = [];
try {
  for (const group of GROUPS) {
    for (const entry of group.cases) {
      const name = entry[0];
      const source = entry[1];
      const knownReason = entry.length > 2 ? entry[2] : null;
      const known = knownReason !== null;
      const problems = [];

      // legacy 档：壳全关（这条源码的"标准答案"由同一份 legacy 代码给出）
      StatementRouteUtil.EnableShellExpressions = false;
      StatementRouteUtil.FileFallbackCount = 0;
      StatementShapeAst.TotalDeclined = 0;
      StatementShapeAst.TotalShapeAst = 0;
      let legacyXml = null;
      try {
        legacyXml = parse(source).ToXmlString();
      } catch (error) {
        problems.push(`legacy 档解析抛错：${String(error && error.message ? error.message : error)}`);
      }

      // 默认档：壳开（AST 必须由形状树建出）
      StatementRouteUtil.EnableShellExpressions = true;
      StatementRouteUtil.FileFallbackCount = 0;
      StatementShapeAst.TotalDeclined = 0;
      StatementShapeAst.TotalShapeAst = 0;
      let shapeXml = null;
      let declined = 0;
      let shapeAst = 0;
      let fallback = 0;
      try {
        shapeXml = parse(source).ToXmlString();
        declined = StatementShapeAst.TotalDeclined;
        shapeAst = StatementShapeAst.TotalShapeAst;
        fallback = StatementRouteUtil.FileFallbackCount;
      } catch (error) {
        problems.push(`默认档解析抛错：${String(error && error.message ? error.message : error)}`);
      }

      if (!known) {
        // 已修类：AST 必须由形状树建出，且形状树不得拒绝。
        if (shapeAst < 1) {
          problems.push(`TotalShapeAst=${shapeAst}（AST 不是形状树建出的）`);
        }
        if (declined !== 0) {
          problems.push(`TotalDeclined=${declined}（形状树拒绝接管）`);
        }
      } else if (shapeAst > 0 && declined > 0) {
        // known 类：要么整体回 legacy（shapeAst=0），要么完整接管（declined=0）；
        // 「接管了又拒绝」= 半棵树，不允许。
        problems.push(`known 类同时出现 shapeAst=${shapeAst} 与 declined=${declined}`);
      }
      if (fallback !== 0) {
        problems.push(`FileFallbackCount=${fallback}（整条文件重解析）`);
      }
      if (legacyXml !== null && shapeXml !== null) {
        const diff = xmlDifference(shapeXml, legacyXml);
        if (diff !== null) {
          problems.push(`XML 与 legacy 不同（${diff}）`);
        }
      }

      rows.push({
        group: group.name,
        name,
        source,
        known,
        knownReason,
        shapeAst,
        declined,
        fileFallback: fallback,
        problems,
        ok: problems.length === 0,
      });
    }
  }
} finally {
  StatementRouteUtil.EnableShellExpressions = savedShell;
  StatementShapeAst.TotalDeclined = savedDeclined;
  StatementShapeAst.TotalShapeAst = savedShapeAst;
  StatementRouteUtil.FileFallbackCount = savedFallback;
}

const failed = rows.filter((row) => !row.ok);
const knownRows = rows.filter((row) => row.known && row.ok);
if (json) {
  process.stdout.write(JSON.stringify({
    rows,
    failed: failed.length,
    pass: rows.length - knownRows.length - failed.length,
    known: knownRows.length,
    groups: GROUPS.map((group) => group.name),
  }, null, 2) + "\n");
  if (failed.length > 0) process.exit(1);
  process.exit(0);
}

const lines = [];
for (const group of GROUPS) {
  const groupRows = rows.filter((row) => row.group === group.name);
  const groupFailed = groupRows.filter((row) => !row.ok).length;
  const groupKnown = groupRows.filter((row) => row.known && row.ok).length;
  lines.push(`=== ${group.name}（${groupRows.length} 例，失败 ${groupFailed}，known ${groupKnown}）`);
  lines.push(`    ${group.note}`);
  for (const row of groupRows) {
    const head = row.ok ? (row.known ? "KNOWN" : "PASS ") : "FAIL ";
    lines.push(`  ${head} ${row.name.padEnd(28, " ")} shapeAst=${row.shapeAst} declined=${row.declined} :: ${row.source}`);
    if (row.known && row.knownReason) {
      lines.push(`        · 已知未覆盖：${row.knownReason}`);
    }
    for (const problem of row.problems) {
      lines.push(`        - ${problem}`);
    }
  }
}
lines.push("");
lines.push(`[shape-ast-coverage] cases=${rows.length} pass=${rows.length - knownRows.length - failed.length} known=${knownRows.length} fail=${failed.length}`);
if (failed.length > 0) {
  process.stdout.write(lines.join("\n") + "\n");
  process.exit(1);
}
process.stdout.write(lines.join("\n") + "\n");
