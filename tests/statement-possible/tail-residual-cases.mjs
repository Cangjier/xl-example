#!/usr/bin/env node
// Stage 5d-9a：**退场残余清零**的专用回归用例（按修复形态逐条取证，含反事实档）。
//
// 这一轮修掉的三类残余各自有一条「判据」，本探针逐条量它们，并且**每类都带反事实档**：
// 判据只能在它该成立的地方成立，不能把相邻形态一起吞掉。
//
//   A 后缀运算符 / 非空断言**不跨行**（TS `parsePostfixExpressionOrHigher` 的
//     `scanner.hasPrecedingLineBreak()` 守卫）：`a` ⏎ `++b` / `a` ⏎ `!b` 是**两条**语句，
//     换行后那个 `++` / `--` / `!` 是前缀。反事实：同行的 `a!` / `a++` 仍是**一条**，
//     换行后的 `(` 仍是**续接**（`a` ⏎ `(b)` 是一条调用）。
//   B 前缀 `++` / `--` 的操作数写在下一行（`a++; --` ⏎ `a;`）：判界一侧与建树一侧都读
//     `ExpressionStatementPossibleShape.IsPrefixOperatorWithoutOperand`。反事实：`x++` ⏎ `++y`
//     的第二格是前缀、换行处**确实**断句。
//   C `type` / `module` / `namespace` 与名字之间换行 ⇒ 该词是标识符（TS
//     `nextTokenIsOnSameLineAndCanFollowModifier`），不是声明头。反事实：同行 `type T = 1`
//     仍是**一条** TypeAliasDeclaration。
//   D 函数表达式头部里的 `<` 是**类型参数表**，不是类型实参调用（`SawLessThan` 不在 `ExpectBody` 记）。
//     反事实：`f<T>(1)` 的类型实参尾巴仍由形状层交给 legacy `ParsePostfixSuffix`（接管、declined=0）。
//
// 每条用例断言四件事（全部机械可判）：
//   1. 默认解析的 `ToAstLine()` 与 legacy 档（`EnableShellExpressions=false`）**逐字节相同**；
//   2. `FileFallbackCount === 0`（整条文件没有重解析）；
//   3. `ShapeAstDeclinedCount === 0`（形状树没有拒绝接管）——这是「修的是根因而不是绕开」的正面证据；
//   4. 期望的节点计数（`StatementShapeAst.TotalShapeAst >= 1` + 指定节点的出现次数）。
//
// 用法：node tests/statement-possible/tail-residual-cases.mjs [--json]
// 退出码：0 = 全部通过；1 = 有失败；2 = 用法错误。
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
const { StatementLegacyMetrics } = load("typescript/tokens/statements/statement-legacy-metrics.js");
const { StatementRouteUtil } = load("typescript/tokens/statements/statement-route-util.js");

// 行终止符的四种写法（CR / LF / LS / PS 都要走同一条判据）。
const LF = "\n";
const CR = "\r";
const LS = "\u2028";
const PS = "\u2029";

// [名字, 源码, { expr / typeAlias / postfix / prefix / nonNull / call / newExpr }, 备注]
// `expect` 里的数字是**必须等于**的出现次数（数 XML 节点）；没列的节点不管。
const GROUPS = [
  {
    name: "postfix-no-line-break",
    note: "后缀 `++` / `--` / `!` 不跨行：换行后是**前缀**，两条语句",
    cases: [
      ["pp-ls-prefix", `a${LS}++b`, { expr: 2, prefix: 1 }, "LS 之后 `++b` 是前缀"],
      ["pp-lf-prefix", `a${LF}++b`, { expr: 2, prefix: 1 }, "LF 之后 `++b` 是前缀"],
      ["pp-cr-prefix", `a${CR}++b`, { expr: 2, prefix: 1 }, "CR 之后 `++b` 是前缀"],
      ["pp-ps-prefix", `a${PS}++b`, { expr: 2, prefix: 1 }, "PS 之后 `++b` 是前缀"],
      ["bang-ls-prefix", `a${LS}!b`, { expr: 2, prefix: 1 }, "LS 之后 `!b` 是前缀（不是非空断言）"],
      ["pp-after-postfix", `function f(){ x++${LS}++y }`, { expr: 2, postfix: 1, prefix: 1 }, "`x++` 是后缀、`++y` 是前缀"],
      // 反事实：同行 `a++` / `a!` 仍是**一条**（后缀形态没有被跨行判据吞掉）。
      // 同行的 `a !b` 不在此列：TS 对它是错误恢复（`';' expected`），整条不是合法源码，
      // 本实现的 legacy 与形状档都会抛「表达式语句没有读完」，语料也按 ts-invalid 跳过它。
      ["nonnull-same-line", "a!;", { expr: 1, nonNull: 1 }, "同行 `a!` 仍是非空断言（一条）"],
      ["postfix-same-line", "a++;", { expr: 1, postfix: 1 }, "同行 `a++` 仍是后缀（一条）"],
      // 反事实：换行后的 `(` 仍是续接（调用），不受「不能跨行」影响
      ["call-across-line", `a${LF}(b);`, { expr: 1, call: 1 }, "换行后的 `(` 是调用，不是新语句"],
    ],
  },
  {
    name: "prefix-operand-newline",
    note: "前缀 `++` / `--` 的操作数可以写在下一行（`a++; --` ⏎ `a;`）",
    cases: [
      ["prefix-operand", `a++; --${LF}a;`, { expr: 2, postfix: 1, prefix: 1 }, "`--` 与操作数分居两行，仍是一条前缀语句"],
      ["prefix-operand-comment", `a++; --//c${LF}a;`, { expr: 2, postfix: 1, prefix: 1 }, "跨行注释那一版同样"],
      ["prefix-block", `if (a) { a++; } --${LF}a;`, { expr: 2, postfix: 1, prefix: 1 }, "块语句之后那一版同样"],
      // 反事实：`x++` ⏎ `++y` 的第二格是前缀，但换行处**确实**要断句
      ["postfix-then-prefix", `let e = 1; e++${LF}++e;`, { expr: 2, postfix: 1, prefix: 1 }, "`e++` 与 `++e` 是两条"],
      ["postfix-then-prefix-semi", `let g = 1; g++;${LF}--g;`, { expr: 2, postfix: 1, prefix: 1 }, "带分号那一版"],
    ],
  },
  {
    name: "contextual-declaration-head",
    note: "`type` / `module` / `namespace` 与名字之间换行 ⇒ 标识符（两条表达式语句）",
    cases: [
      ["type-lf", `type${LF}T = 1`, { expr: 2 }, "LF"],
      ["type-cr", `type${CR}T = 1`, { expr: 2 }, "CR（CatalogGuide 双 Accept 的原始触发形）"],
      ["type-ls", `type${LS}T = 1`, { expr: 2 }, "U+2028"],
      ["type-ps", `type${PS}T = 1`, { expr: 2 }, "U+2029"],
      ["type-block-comment", `type /* ${LF} */ T = 1`, { expr: 2 }, "块注释里的换行同样触发"],
      // 反事实：同行仍是声明（声明族**不**经过 `StatementShapeAst`，所以形状树读数是 0——
      // `minShapeAst: 0` 是刻意的：这一条要证明的是「没有被改判成表达式」，不是「形状层接管」）。
      ["type-same-line", "type T = 1;", { typeAlias: 1, expr: 0, minShapeAst: 0 }, "同行 `type T = 1` 仍是一条 TypeAliasDeclaration"],
    ],
  },
  {
    name: "function-expression-type-params",
    note: "函数表达式头部里的 `<…>` 是类型参数表，不是类型实参调用",
    cases: [
      ["anon-generic-fn-call", "(function <T>(x: T) { return x; })(1)", { expr: 1, call: 1 }, "匿名泛型函数表达式 + 调用"],
      ["anon-generic-fn-paren", "(function <T>(x: T) { return x; })", { expr: 1 }, "只取括号"],
      // 反事实：真正的类型实参调用仍由形状层接管（`ParsePostfixSuffix`）
      ["type-argument-call", "f<T>(1);", { expr: 1, call: 1 }, "`f<T>(1)` 仍是类型实参调用"],
      ["instantiation", "f<string>;", { expr: 1 }, "实例化表达式"],
    ],
  },
];

function count(astLine, tag) {
  const needle = `${tag}  `;
  let at = 0;
  let total = 0;
  for (;;) {
    const found = xml.indexOf(needle, at);
    if (found < 0) {
      return total;
    }
    total++;
    at = found + needle.length;
  }
}

const TAG_OF = {
  expr: "ExpressionStatementShape",
  typeAlias: "TypeAliasDeclarationShape",
  postfix: "PostfixUnaryExpressionShape",
  prefix: "PrefixUnaryExpressionShape",
  nonNull: "NonNullExpressionShape",
  call: "CallExpressionShape",
  newExpr: "NewExpressionShape",
};

function parse(source) {
  return SourceFileRunner.Parse(source, "residual.ts");
}

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log("用法：node tests/statement-possible/tail-residual-cases.mjs [--json]");
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
const rows = [];
try {
  for (const group of GROUPS) {
    for (const [name, source, expect, note] of group.cases) {
      const problems = [];

      // legacy 档：壳全关（同一份 legacy 代码给出这条源码的"标准答案"）
      StatementRouteUtil.EnableShellExpressions = false;
      StatementRouteUtil.FileFallbackCount = 0;
      StatementShapeAst.TotalDeclined = 0;
      StatementShapeAst.TotalShapeAst = 0;
      StatementLegacyMetrics.Reset();
      let legacyAstLine = null;
      try {
        legacyAstLine = parse(source).ToAstLine(0);
      } catch (error) {
        problems.push(`legacy 档解析抛错：${String(error && error.message ? error.message : error)}`);
      }

      // 默认档：壳开
      StatementRouteUtil.EnableShellExpressions = true;
      StatementRouteUtil.FileFallbackCount = 0;
      StatementShapeAst.TotalDeclined = 0;
      StatementShapeAst.TotalShapeAst = 0;
      StatementLegacyMetrics.Reset();
      let shapeAstLine = null;
      let declined = 0;
      let shapeAst = 0;
      let fallback = 0;
      let rawTail = 0;
      let legacyDispatch = 0;
      try {
        shapeAstLine = parse(source).ToAstLine(0);
        declined = StatementShapeAst.TotalDeclined;
        shapeAst = StatementShapeAst.TotalShapeAst;
        fallback = StatementRouteUtil.FileFallbackCount;
        rawTail = StatementLegacyMetrics.RawTailBuildCount;
        legacyDispatch = StatementLegacyMetrics.LegacyStatementDispatchCount;
      } catch (error) {
        problems.push(`默认档解析抛错：${String(error && error.message ? error.message : error)}`);
      }

      if (declined !== 0) {
        problems.push(`TotalDeclined=${declined}（形状树拒绝接管）`);
      }
      if (fallback !== 0) {
        problems.push(`FileFallbackCount=${fallback}（整条文件重解析）`);
      }
      if (legacyDispatch !== 0) {
        problems.push(`LegacyStatementDispatch=${legacyDispatch}（语句壳退回整段 raw 分派）`);
      }
      if (rawTail !== 0) {
        problems.push(`RawTailBuildCount=${rawTail}（块体 raw 尾巴）`);
      }
      if (shapeAst < (expect.minShapeAst === undefined ? 1 : expect.minShapeAst)) {
        problems.push(`TotalShapeAst=${shapeAst}（AST 不是形状树建出的）`);
      }
      if (legacyAstLine !== null && shapeAstLine !== null && legacyAstLine !== shapeAstLine) {
        problems.push("XML 与 legacy 不同（形状档改变了树）");
      }
      if (shapeAstLine !== null) {
        for (const key of Object.keys(expect)) {
          if (key === "minShapeAst") {
            continue;
          }
          const tag = TAG_OF[key];
          const actual = count(shapeAstLine, tag);
          if (actual !== expect[key]) {
            problems.push(`${tag} 数量 = ${actual}，期望 ${expect[key]}`);
          }
        }
      }

      rows.push({ group: group.name, name, source, note, expect, shapeAst, declined, problems, ok: problems.length === 0 });
    }
  }
} finally {
  StatementRouteUtil.EnableShellExpressions = savedShell;
}

const failed = rows.filter((row) => !row.ok);
if (json) {
  process.stdout.write(JSON.stringify({ rows, failed: failed.length, pass: rows.length - failed.length, groups: GROUPS.map((g) => g.name) }, null, 2) + "\n");
  process.exit(failed.length > 0 ? 1 : 0);
}

const lines = [];
for (const group of GROUPS) {
  const groupRows = rows.filter((row) => row.group === group.name);
  const groupFailed = groupRows.filter((row) => !row.ok).length;
  lines.push(`=== ${group.name}（${groupRows.length} 例，失败 ${groupFailed}）`);
  lines.push(`    ${group.note}`);
  for (const row of groupRows) {
    lines.push(`  ${row.ok ? "PASS " : "FAIL "} ${row.name.padEnd(26, " ")} shapeAst=${row.shapeAst} :: ${JSON.stringify(row.source)}`);
    if (row.note) {
      lines.push(`        · ${row.note}`);
    }
    for (const problem of row.problems) {
      lines.push(`        - ${problem}`);
    }
  }
}
lines.push("");
lines.push(`[tail-residual-cases] cases=${rows.length} pass=${rows.length - failed.length} fail=${failed.length}`);
process.stdout.write(lines.join("\n") + "\n");
process.exit(failed.length > 0 ? 1 : 0);
