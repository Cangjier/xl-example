# HANDOFF — S3c 第 2 棒（r2）：修合并验收发现的「前导小数点数字」AST 回归

日期：2026-10-25　分支：`feature/possible-statement-s3c`（从 `12217d07` 起）　目录：`possible-statement-s3c-r2`

## 结论

合并报告 `MERGE-REPORT-s3c-s2.md` 里那条唯一的红（`.5` / `.5e2` / `.5e+2` 从 `NumericLiteral` 退化成
`Identifier`）**已修**。按**正确复验流程**（重建 → `ast-json` 重生成快照 → `git status --short typescript/cases`
必须为空 → `ast-json-diff`）实测：`typescript/cases` **无任何快照漂移**，`ast-json-diff` **6167/6167、结构/位置/字段 0/0/0**。
全表其余门全绿（见下），没有任何门是靠改期望值变绿的。

## 1. 回归根因（精确到行）

| 位置 | 原状 | 后果 |
|---|---|---|
| `typescript/tokens/statements/statement-operator-body.xl.md`（`LooksNumber`，原 562-573） | 判据是**首字符 `0..9`**，注释里还写着「`.5` 会漏判，S3b 不要 `.5`」 | `.5` 首字符是 `.` → 返回 false |
| 同文件 `BuildOperand`（原 370-382） | `LooksNumber(text) ? KindNumber : KindIdentifier` | `.5` / `.5e2` / `.5e+2` 被建成 `KindIdentifier` |
| `typescript/tokens/statements/statement-shape-ast.xl.md`（`BuildNode`，123-141） | 按 `Kind` 分派：`KindNumber` → `NumericLiteralShape`，其余 → `IdentifierShape` | `Kind` 错了，于是**永远走不到**数字工厂 → AST 变成 `Identifier(".5")` |

关键点：**legacy 路径本来是对的**（`ExpressionBuilder.ParsePrimary` 用 `StartsNumber` → `IsBigInt() ? BigInt : Numeric`），
所以这是「形状层新建的一条判据与工厂接受集不一致」，不是 tokenizer 问题。旧的入库快照是 legacy 时代的值，
所以「不重生成快照直接 diff」恒为 0/0/0 —— **假绿**。这正是必须照四步流程复验的原因。

## 2. 修法（只动 S3c 自己的两个文件，未改 core/、未改 `IsAsiBoundary`）

原则：**形状层的 Kind 必须与 AST 工厂的接受集逐字一致**，不再另写一份字符规则。

1. `statement-operator-body.xl.md` — `LooksNumber` 改为按单元判定，直接复用工厂入参判据：

   ```ts
   ## static method LooksNumber:(unit:Common)=>bool
   return unit.IsNumber() || unit.IsBigInt();
   ```

   - `Common.IsNumber()` 就是 `NumericLiteralShape.FromBasicToken` 的第一行校验；
   - `Common.IsBigInt()` 就是 `BigIntLiteralShape` 的接受集；
   - `IsNumberBody` 本身认前导点（`.5`/`.5e2`/`.5e+2`）、尾点（`1.`）、十六进制、分隔符，所以不需要任何新正则。

2. `statement-operator-body.xl.md` — `BuildOperand` 的 `Common` 分支加一道「非法字面量不建错树」的闸：

   ```ts
   const number = StatementOperatorBody.LooksNumber(common);
   if (!number && common.CanStartNumber()) {
     return null;
   }
   shape.Kind = number ? KindNumber : KindIdentifier;
   ```

   `CanStartNumber()`（`Common` 上与 `StartsNumber` 同一口径的公有判据）为真、但 `IsNumber/IsBigInt` 都为假
   的是**非法源码**（`1_` 之类）。这种单元既不能建 Identifier（会建错树）、也不能进数字工厂（工厂会抛错），
   所以返回 `null` 让本体 `Incomplete` → 回 legacy，与 legacy 对非法源码的行为一致。

3. `statement-shape-ast.xl.md` — `BuildNode` 的数字分支补一道自证，工厂永不被喂非数字：

   ```ts
   if ((raw as Common).IsBigInt()) { return Decline("大整数字面量"); }
   if (!(raw as Common).IsNumber()) { return Decline("不是数字字面量"); }
   ```

**BigInt 的处理（有意保留的未覆盖项）**：`1n` 现在仍判 `KindNumber`（这点很重要——否则会掉进 Identifier 分支，
就是同一类回归），但收口器 `Decline("大整数字面量")`、AST 由 legacy 建 `BigIntLiteral`。
所以它是**明确的「不支持 + 回 legacy」**，不是静默建错树；`op-ast-cases.json` 用 `ast-num-bigint-gap`
（`shapeAst:0` + `declined>0`）把这条钉住。要接管它只需在 `BuildNode` 里加 `BigIntLiteralShape` 分支
（与 legacy 逐字相同：`FromBasicToken` + `Pos = builder.Positions[index]`），本轮未做，列入剩余风险。

## 3. 数字边界专用证据（`tests/statement-possible/`）

`op-ast-cases.json` 的 `ast-from-shapes` 组从 16 条扩到 **25 条**，新增 9 条数字用例：

| 用例 | 源码 | shapeTexts | shapeAst | astLeaves（= AST 里的 NumericLiteral 文本） |
|---|---|---|---|---|
| ast-num-leading-dot | `.5;` | `.5` | 1 | `Numeric:0.5` |
| ast-num-leading-dot-exp | `.5e2;` | `.5e2` | 1 | `Numeric:50` |
| ast-num-leading-dot-exp-plus | `.5e+2;` | `.5e+2` | 1 | `Numeric:50` |
| ast-num-trailing-dot | `1.;` | `1.` | 1 | `Numeric:1` |
| ast-num-exp | `1.5e3;` | `1.5e3` | 1 | `Numeric:1500` |
| ast-num-hex | `0x1f;` | `0x1f` | 1 | `Numeric:31` |
| ast-num-separator | `1_000;` | `1_000` | 1 | `Numeric:1000` |
| ast-num-mixed | `.5+1_000*.5e2;` | `+(.5,*(1_000,.5e2))` | 1 | `Numeric:0.5, Numeric:1000, Numeric:50` |
| ast-num-bigint-gap | `1n;` | `1n` | 0 | —（declined，legacy 建 BigInt） |

`op-ast-proof.mjs` 新增第 ④ 类断言（`astLeaves`，8 条）：把壳路径**真正建出的 AST**（`SourceFileShape` 的
`Data` 树）按源码顺序收集 `NumericLiteralShape` 的规范化文本，与用例声明、**以及与
`ts.createSourceFile` 的 `NumericLiteral.text`** 三方逐字比较。
这直接钉住回归本身：若 `.5` 再退化成 `Identifier`，壳这边会**少一条**数字叶子（`[]` vs `["Numeric:0.5"]`），立刻红；
同时「XML == legacy」「shapeAst == 期望」「形状结构 == TS 逐节点渲染」三条旧断言全部保留。

## 4. 正确复验流程读数（本轮实测，从零构建）

| 门 | 读数 | 判定 |
|---|---|---|
| `xl_build` targets=["ts"] paths=["core","typescript"] | **886 written, 0 skipped, 0 planned, 0 error**（2505 warning，存量 W3102/W3103） | PASS |
| `xl_check` 同上 | **886 file(s), 0 error**, 2505 warning | PASS |
| `tsc -p tsconfig.json` | exit 0 | PASS |
| `node typescript/cases/ast-json.mjs` | `total 6167 cj-ok=6167 cj-fail=0`（47 构造） | PASS |
| `git status --short typescript/cases` | **空（0 个快照漂移）** ← 回归已消 | PASS |
| `node typescript/cases/ast-json-diff.mjs` | **合计 6167 条：完全一致 6167/6167；结构差 0、位置差 0、字段差 0** | PASS |
| `token-ast.mjs` | non-known-gap 1716（ok 1706、ts-invalid 10）、known-gap 0、crash 0、diff 0 | PASS |
| `real-dts-ast.mjs` | 文件 226、解析成功 226、崩溃 0、AST 完全一致 **226**、差异 0 | PASS |
| `op-ast-proof.mjs` | **cases=25 pass=25 fail=0**；形状树接管已核 25、TS 逐节点已核 25、**AST 数字叶子已核 8** | PASS |
| `op-proof.mjs` | `cases=12 pass=12 fail=0`；结构文本 12、InsertBetween 计数 11 | PASS |
| harness `operators-live` | pass=12 fail=0 skip=0 uncovered=0；cells=86 candidateCalls=408 acceptCells=15 | PASS |
| harness `dev` | pass=22 fail=0；cells=223 candidateCalls=1191 acceptCells=50 | PASS |
| harness `--all` | groups run=6 skipped=3 \| cases **pass=72 fail=0** skip=0 known=1 uncovered=0 | PASS |
| harness `--double-accept` | cases=91 failed=0；冲突 0 | PASS |
| harness `--lint` | **PASS**（ASI 实现唯一 / 优先级数字表只在 operator-table；OperatorTable 数字条目=12） | PASS |
| `tests/parse/validate.mjs` | **1720 条用例，0 条不合格** | PASS |
| `feas-operator/harness.mjs` | 6/6 | PASS |
| `insert-between.test.mjs` | 9/9 | PASS |
| `perf.mjs` | long n=300 / many 2000 正常；scale ratio 2.90 / **3.32** | WARN（存量，不判失败） |

对照合并报告：`ast-json-diff` 从 **4 条结构差** → **0**，`op-ast` 从 16 条 → 25 条，其余读数与 S2/S3c 基线一致。

## 5. 剩余风险 / 未覆盖

1. **BigInt 未接管**（`1n`）：判 `KindNumber` 后由收口器 `Decline`、legacy 建 `BigIntLiteral`。要接管只需在
   `BuildNode` 加 `BigIntLiteralShape.FromBasicToken` + `Pos`（与 legacy 逐字相同），代价是引入一个新节点工厂；
   本轮按「最小回归修复」故意不做，`ast-num-bigint-gap` 用例保证它不会悄悄变成 Identifier。
2. **非法数字字面量**（`1_`、`0x` 等）现在返回 `null` → 回 legacy，与 legacy 行为一致（legacy 在数字工厂处抛错）。
   没有专门用例覆盖这些非法源码，因为 `ast-json` 的 6167 条里没有非法输入；`token-ast` 的 10 条 `ts-invalid`
   依旧是基线值，未变。
3. **`perf` 的 `ratio(400/200)=3.32`** 仍是存量 WARN（S3a/S3b 起就有，S3c 未加重，本轮数值与合并报告 3.39 同量级）。
   不判失败，但值得单独看（设计 §8.3.3）。
4. **快照掩盖问题本身**：这条回归只能靠「`ast-json` 重生成 + `git status` 为空」发现。
   任何只跑 `ast-json-diff`（读已入库快照）的流程都会假绿 —— 后续验收请一律照四步顺序。
5. 本轮未改 `core/`、未改 `StatementBoundaryUtil.IsAsiBoundary`、未 push、未 merge、未提交任何 `dist/` `build/`
   或 `.cj-ast.json` 产物。
