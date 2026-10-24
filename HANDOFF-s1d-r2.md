# HANDOFF — T1d r2：收口判据按壳族分派（StatementKind），熔断仍为 false

## 1. 本次改动（相对 23402e6f）

1. `statement-end-possible-shape.xl.md`：新增 `## field StatementKind:int = 0`，
   `ComputeByIndex` / `BuildByIndex` 按族分派——`StatementKind == StatementRoute.ShellPlainExpression` 时
   用新的 `StatementEndPossibleShape.ExpressionEndCode(code, atEof)`（`StatementBoundaryUtil.IsSemicolon` /
   `IsAsiBoundary` / `atEof`），`ScanRoot` 的 `End` 不再参与判界；`StatementKind == 0`（变量声明壳）逐位保留 Wave1 的
   `ScanRoot` 的 `Status == 1 && End >= 0`。
2. `root-expression-statement-possible-shape.xl.md`：建壳时 `endShape.StatementKind = StatementRoute.ShellPlainExpression`。
3. `statement-route-util.xl.md`：`EnableShellExpressions` **最终值 = false**（熔断，默认关闭）。
4. 新增依赖：`statement-boundary-util.xl.md` / `statement-route-util.xl.md`（无循环 import）。

## 2. 打开开关（true）时的实测（关键证据，下一成员从这里继续）

- xl_build 884 文件 0 error；xl_check 884 文件 0 error。
- `tsc` 0；`tests/parse/validate.mjs` 1720/0；`real-dts-ast` 226/226；feas 6/6；insert-between 9/9；`--lint` PASS。
- `ast-json` **6011/6167**（应为 6167）：`missing-end` 24 fail、`possible-compute` 61 fail；`ast-json-diff` **156 条结构差**（应为 0）。
- `token-ast` ok=1689 crash=**17**（基线 1706/0）。
- `harness --all`：stage1 11/1（失败 `stage1/stage1-mixed`：CJ 解析抛错「表达式语句没有读完」）；asi/trivia/route/satisfies/operators 全绿；
  `--double-accept` 冲突 0（唯一失败同 stage1-mixed）；`--lint` PASS。

## 3. 剩余根因（带位置）

- `typescript/tokens/statements/statement-end-possible-shape.xl.md` 的 `ExpressionEndCode` 对「表达式语句 + 同层后续代码」
  的收口仍有两类不合 TS 的行为：(a) 该断处 `IsAsiBoundary` 判 false（`statement-boundary-util.xl.md` 的语句起点/续接表）
  → 语句不收口、拖到 EOF 后 `BuildFromShell` 抛「语句没有读完」（stage1-mixed）；(b) 不该断处判 true → 语句被切早，
  End 位置与 TS 差（`missing-end` 24 例、结构差 156 条的来源）。
- `token-ast` 的 17 个 crash 与 stage1-mixed 同源：都是同一壳在收口处 `BuildFromShell` 抛错后 `DetachShell` 兜底把 raw 单元退回父单元，
  但父单元此时已越过该位置，留下一段没人接管的条目。
- `StatementKind` 分派本身已被证明可用（变量族逐位不变、双路 0 冲突、`--lint` PASS），问题集中在表达式族的 ASI 判据边界。

## 4. 下一步（Stage 2 建议）

1. 以 `harness --all` 的 `stage1/stage1-mixed` 为单点：打印该用例的 `code` / `CodeAt` / `ExpressionEndCode` 返回值，
   对着 TS 的 ASI 判定逐格比对，先让这一例绿。
2. 再按 `missing-end`（24）与 `possible-compute`（61）两组的差异逐个收敛；每收一组跑四道 AST 门，
   读数必须回到 6167/6167、0/0/0、1716/1706/0/0/10。
3. 收口判据只在「确定起点」上先启用（标识符 / 字面量），`(` / `[` / 一元前缀继续 Legacy，可先缩小半径。
4. 全部绿之后再单独提交「`EnableShellExpressions = true`」这一行，与代码分开，便于回退。
