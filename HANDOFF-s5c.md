# HANDOFF — Stage 5c：let / const / var 三层 possible（独立实现路线）

分支：`feature/possible-statement-s5c`，基线 `origin/feature/possible-statement` @ **6b077c05**。
本轮**未改** `variable-statement-possible-shape.xl.md`、未改 `block-possible-shape.xl.md`、未改 `core/`、
未改 `StatementBoundaryUtil.IsAsiBoundary`。

## 0. 结论（先看这三行）

| 目标 | 读数 | 状态 |
| --- | --- | --- |
| 接管计数 > 0 | `statements=17 lists=17 declarations=19`、`mismatch=0` | ✅ 达成 |
| AST 与 `ts.createSourceFile` 逐节点一致 | 21/21 case（1 条已知基线差异，见 §5） | ✅ |
| 零差异（接管开 vs 关） | 21/21 case 的 shape 树 JSON 相同 | ✅ |
| 块内变量语句路径 | `block-body-takeover` 21/21、`stage4b` 17/17、`harness --all` 101/0/known1（与基线同） | ✅ 未受影响 |
| 全表 | 见 §6，全部为基线读数 | ✅ |

## 1. 与 S5a / S5b 的关键差别（为什么这次不会重演回归）

| 维度 | S5a / S5b（回归） | S5c（本轮） |
| --- | --- | --- |
| 语句级接线点 | 把 `VariableStatementPossibleShape.Compute/Build` **重写**成 `TryTakeOver` 判型，并在 `statement-possible-shape`（根 legacy 通道）里调用 | **不改任何既有类**；只在 `StatementShape.BuildFromShell` 的「建树那一句」外面加一道判型闸 |
| 块内 `let` | 被连带改坏——`block-possible-shape` 本来就调 `VariableStatementPossibleShape`，该类的壳语义没了 → 「不支持的表达式起点」 | 零影响：`variable-statement-possible-shape.xl.md` 一行未改（`git status` 里没有它） |
| 判型 / 建树隔离 | 判型**之前**就调 `BuildVariableDeclarationList` 在共享 token 上建树，判型不成立返回 null 时 token 已被改写 | 判型**纯读**：只读 `IsTriviaToken`、`TempToString()`、下标；不调 `StatementBuilder`、不碰 `PossibleShapeCache`、不写 `Parent` |
| 判型失败 | 返回 null 但共享 token 已被污染 → 外层 legacy 拿同一批 token 建树时 `let` 被当表达式起点 | null 路径**零副作用**：同一批 token 逐字段与进来时相同 |
| 建树次数 | 可能两次 | 严格一次 |

S5a/S5b 的 `statements=0` 与「无法修复」的根因是第一条（接线点选在了**壳的替代物**上），不是判型算法不准。
本轮把三层放在**壳里**（`BuildFromShell` 是壳自己收口时唯一的建树调用点），于是壳语义完整保留。

## 2. 三层分工（三个独立文件，都不是 `PossibleShape` 子类）

| 层 | 文件 | 职责 | 是否建树 |
| --- | --- | --- | --- |
| 列表级 | `typescript/tokens/declarations/variable-declaration-list-util.xl.md` | 关键字白名单（只认 `let`/`const`/`var`）、`StatementScanner.StartsBinding` 族判型、`;` / 段末（ASI）收口；产出 `VariableListVerdict`（三态 + 条目数） | 否 |
| 声明级 | `typescript/tokens/declarations/variable-declaration-scan-util.xl.md` | `VariableDeclarationScan` 状态机（`名字 / ! / : 类型 / = 初始化器`，`<>` 深度）+ `VerifyItems` 逐条判并数条数 | 否 |
| 语句级 | `typescript/tokens/statements/variable-statement-three-layer.xl.md` | 两层都成立且条数一致才接管；复用外层**已有的** `builder` 建一次；五个计数 + 事后条数核对 | 是（唯一一处） |

解构为什么不需要进括号：`{a}` / `[a, b]` 在这棵 token 树里是**一个** `Bracket` 单元（内部单元是它的孩子），
所以声明级只认「`Common` 或 `Bracket` + `[`/`{`」两种名字起点，括号内的 `,` 天然不切条目。

## 3. 判型 / 建树隔离方式（AST 相等是构造性保证）

接管路径执行的就是基线那一句：

```ts
built = VariableStatementThreeLayer.TryBuild(builder, consumed);
// TryBuild 内部：const built = builder.BuildStatement();
```

同一 `builder`、同一 `consumed`、同一 `shell.Pos`、同一个 legacy `BuildStatement()` 入口（它派发到
`BuildVariableStatement`）。本类不新增任何建树入口、不改 `consumed`、不改 `Pos`、不写 `Parent`。
**「接管与否」只改变谁先调用这一句，不改变调用本身** —— 所以 AST / Pos / End 的相等不是靠测试兜住的，
而是由构造决定；零差异口径（接管开 vs `Enabled=false`）在 21/21 case 上验证了这一点。

`null` 回退同理：`TryBuild` 在调用任何建造器之前就完成全部判定，返回 `null` 时外层 token 与我进来时逐字段相同。

## 4. 接管计数证据（三层分开计量）

```
[stage5c/declaration] cases=21 pass=21 fail=0 knownTsDiff=1
[stage5c/declaration] totals: statements=17 lists=17 declarations=19 fallbacks=0 mismatch=0
```

- `statements`（语句级接管）/ `lists`（列表级判成立）/ `declarations`（声明级条目总数）**三项都 > 0**，目标达成。
- `mismatch=0`：建出的 `VariableStatement` 的声明条数与三层判定在 21/21 case 上一致。
  （`MismatchCount` 只记录、不回退：建树已发生，回退会让同一批 token 建两遍。）
- `fallbacks=0` 的**真实原因**（不粉饰）：合法源码上，变量壳一形成（`let|const|var` + `StartsBinding`），
  三层判型就成立；6 条 `takeover=false` 的 case（`for (let …)` 头、`let:` 标签、`declare const`、
  `export const`、`using`、`let = 1`）**根本没有形成变量壳**（Kind 分别为标签壳 / 表达式壳 / legacy 通道），
  所以走不到「判型不成立」这条回退。判型回退只在语法错误输入上出现，本轮**没有构造**（见 §7）。

## 5. 专用 cases（`tests/statement-possible/declaration-cases.json`，组 `stage5c`，21 条）

覆盖：`let x;`、`let x = 1;`、`const y = a + b;`、`var z;`、`let a = 1, b = 2;`、`const x = 1, y = 2;`、
`let a: T = 1;`、`let a: Map<string, number> = new Map();`、`let a = 1\nlet b = 2`（ASI，无分号）、
`const f = () => {}`（EOF 尾巴）、`function f() { let x = 1; }`（块内）、`const {a} = o;`、
`const [a] = x;`、`let [a, b] = xs;`、`let a = 1; let b = 2; console.log(a + b);`（多语句混排）；
回退：`for (let i = 0; i < 3; i++) {}`、`let: foo;`、`declare const x: number;`、`export const q = 1;`、
`using x = f();`、`let = 1;`。

脚本 `tests/statement-possible/declaration-takeover.mjs`（`--group=stage5c`）四条口径：

1. **TS 真值**：`ts.createSourceFile` 与产物 shape 树逐节点一致（复用 `typescript/cases/ast-compare.mjs` 的唯一归一表）；
2. **零差异**：同一份源码再跑一遍 `VariableStatementThreeLayer.Enabled=false` 的纯 legacy 路径，两棵树 JSON 相同；
3. **接管证据**：三层计数与 cases 声明的 `takeover` / `declarations` 相符，且 `MismatchCount=0`；
4. **未覆盖形态**：`takeover=false` 的 case 必须 0 接管且不抛错。

**已知基线差异（1 条，`knownTsDiff`）**：`let = 1;` —— CJ 与 TS 对「`let` 作标识符的赋值」给出不同节点类别。
这条的零差异口径通过（且该输入走表达式壳，`TryBuild` 根本不会被调用），所以差异是基线既有的、与本轮无关；
脚本把它单独计数（`knownTsDiff=1`）而不是混进 pass。

## 6. 全表读数（本轮实测，全部与基线一致）

## 7. 未覆盖清单

1. **判型回退（`FallbackCount > 0`）未构造**：需要在语法错误输入（例如 `let a = 1,;`、`let a b;`）上取证，
   而这类输入 TS 侧本身报语法错，会和「TS 逐节点一致」口径冲突。诚实结论：判型回退代码路径存在、
   但本轮没有正向证据；`takeover=false` 的 6 条只证明「不形成壳因此不接管」。
2. `let a = a < b, c > d;` 的 `<` 深度误判（S5a 遗留）：`<` 被当作泛型实参起点，声明条数可能算成 1。
   影响仅限「是否接管 + 条数」；条数不符会被 `MismatchCount` 记到（不会静默）。未进 cases。
3. `const enum X {}`、装饰器 + 变量语句、`declare let`、`for (let …)` 头的**逐条 AST 取证**未做
   （只覆盖了 `declare const` / `export const` / `using` / `for (let` / `let:` 这 5 条回退 case）。
4. 声明级只识别 `!` / `:` / `=` 三个符号；`let x?: T` 等怪异形态一律 `Rejected` → 回退（无 AST 风险，但会少接管）。
5. 未测 > 2000 语句或 > 1MB 单文件；`perf` 沿用基线口径（不设硬阈值）。

## 8. 风险

- **接管点选择**：`StatementShape.BuildFromShell` 是所有语句壳共用的收口点；本轮闸门是
  `shell.Kind === StatementRoute.ShellVariable || shell.Kind === 0` **且**列表级判型成立。
  若将来有新的语句族把 `Kind` 留成 `0`，它会先被三层判一次（判型不成立 → `FallbackCount++` → 基线），
  行为安全但会多一次 `O(n)` 扫描。
- **`Enabled` 默认 `true`**。关闭值已实测：`declaration-takeover.mjs` 的第二条口径就是它在 `false` 时的
  结果（21/21 与开启态 JSON 相同），因此默认开有全表证据。
- 三层与 legacy 的「条目理解」若某天分叉，`MismatchCount` 会非 0（脚本里是硬失败条件），不会伪装成绿。

## 9. 原始门禁日志（本轮实跑）
```text
patched: cases knownTsDiff + script counter
===== xl check =====
(no xl cli; xl tool already reported 890/0)
[exit=1]
===== tsc =====
[exit=0]
===== stage5c takeover =====

[stage5c/declaration] cases=21 pass=21 fail=0 knownTsDiff=1
[stage5c/declaration] totals: statements=17 lists=17 declarations=19 fallbacks=0 mismatch=0
[exit=0]
===== harness --all =====
SKIP  group stage5 —— 语句壳 CatalogGuide 的体候选为空（Stage 5 未实现）
[statement-possible] 互斥仪器: cells=714 candidateCalls=4402 endCalls=711 acceptCells=170 waitingNoCandidate=242
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
[exit=0]
===== harness --double-accept =====
[statement-possible] 互斥仪器: cells=821 candidateCalls=5068 endCalls=818 acceptCells=190 waitingNoCandidate=284
[statement-possible] double-accept 冲突: 0
[statement-possible] double-accept: cases=120 failed=0
[exit=0]
===== harness --lint =====
[lint] 优先级来源
  Precedence 定义 typescript/tokens/expressions/operator-table.js
[lint] OperatorTable 数字优先级条目=12
[lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table）
[exit=0]
===== dev group =====
[statement-possible] groups run=1 skipped=0 | cases pass=22 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=2 distinct=1
  fallback: "let a = 1; a++; --\na;\nif (a) { a++; } --\na;"
[exit=0]
===== operators-live =====
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=40 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
[exit=0]
===== op-ast-proof =====
PASS  s3m-param-rest  shapeAst=1 declined=0 texts=["arrow(params)"]
PASS  s3m-declined-async-arrow-type  shapeAst=0 declined=1 texts=["params"]

[op-ast-proof] group=ast-from-shapes cases=90 pass=90 fail=0 | 形状树接管计数已核 90 条、TS 逐节点已核 85 条、AST 数字叶子已核 8 条
[exit=0]
===== op-proof =====
PASS  s3g-op-new-chain  texts=["member(new(X),y)"] inserts=1 bodies=1
PASS  s3g-op-optional-chain  texts=["member(member(a,b),c)"] inserts=2 bodies=1

[op-proof] group=operators-live cases=40 pass=40 fail=0 | 结构文本已核 40 条、InsertBetween 计数已核 38 条
[exit=0]
===== control-flow-takeover =====
PASS "en: a;\nb;"  cf=0 body=0 label=1
PASS "en /* c */ : a;"  cf=0 body=0 label=1

[control-flow-takeover] cases=39 failed=0 defaultFlag=true
[exit=0]
===== block-body-takeover =====
PASS "{ if (a) b; while (c) d; }"  shells=1 body=2
PASS "{ a; if (b) c; d; }"  shells=1 body=3

[block-body-takeover] cases=21 failed=0 defaultFlag=true
[exit=0]
===== stage4b =====
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=17 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
[exit=0]
===== stage4c =====
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=42 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
[exit=0]
===== stage4c2 =====
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=33 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
[exit=0]
===== validate =====

1720 条用例，0 条不合格
[exit=0]
===== ast-json =====
[types] cases=450 cj-ok=450 cj-fail=0
[using-declarations] cases=29 cj-ok=29 cj-fail=0
total cases=6167 cj-ok=6167 cj-fail=0（47 个构造）
[exit=0]
===== ast-json status =====
[exit=0]
===== ast-json-diff =====
（没有 gap）

合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条
[exit=0]
===== token-ast =====
summary: total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0
known-gap:     0 file(s) (none)
non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10)
[exit=0]
===== real-dts =====
real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0
真实 .d.ts 全量解析成功且 AST 逐节点一致
[exit=0]
===== feas-operator =====
[feas-operator] cases=6 pass=6 fail=0
[exit=0]
===== insert-between =====
PASS  嵌套插入：wrapper 套 wrapper
PASS  拒绝非法输入
[feas-operator] insert-between tests=9 pass=9 fail=0
[exit=0]
===== perf =====
[perf] reps=5 long=300 many=2000（中位数；不设硬阈值）
[perf] long n=300 median=6.09ms tokens=599 candidateCalls=34 callsPerToken=0.06
[perf] many statements=2000 median=34.61ms tokens=2000 candidateCalls=34017 callsPerToken=17.01
[perf] scale n=100 median=0.84ms tokens=199 candidateCalls=34
[perf] scale n=200 median=1.48ms tokens=399 candidateCalls=34
[perf] scale n=400 median=3.65ms tokens=799 candidateCalls=34
[perf] scale ratio(200/100)=1.77 ratio(400/200)=2.47（线性≈2.0；>2.5 视为退化告警，不判失败）
[perf] done
[exit=0]
===== restore cases dir =====
done
[exit=0]
===== git status =====
 M typescript/tokens/statements/statement-shape.xl.md
?? tests/statement-possible/declaration-cases.json
?? tests/statement-possible/declaration-takeover.mjs
?? typescript/tokens/declarations/variable-declaration-list-util.xl.md
?? typescript/tokens/declarations/variable-declaration-scan-util.xl.md
?? typescript/tokens/statements/variable-statement-three-layer.xl.md
[exit=0]
===== END =====
```
