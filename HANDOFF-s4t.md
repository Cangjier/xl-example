# HANDOFF — Stage 4t：声明族专用壳的晚建守卫与晚建补建（**未能安全打开，默认保持关**）

分支 `feature/possible-statement-s4t`，基线 `feature/possible-statement` @ **846723f9**。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s4t`。

## 1. 结论先行（不伪造绿）

两条 S4r 已定位的根因**都修掉并各自取得预期效果**，但**打开开关后仍有 2 类新回归**，按纪律与目标第 7 条
**保持 `EnableDeclarationShell=false`**（安全回退，行为逐位回到基线），机制、证据与残留问题全部留在下面。

| 状态 | `declaration-statement-takeover` | `--all` | `r1-asi` | `token-ast` | `real-dts` |
|---|---|---|---|---|---|
| S4r（基线，关） | 27 cases / **failed=22** / takeover=0 / shells=0 | 101 pass / 0 fail | 31 pass | 1706 ok / **diff=0** | 226 / 226 |
| S4t **flag=true**（实测） | 27 cases / failed=**1** / takeover=**21** / totalShell=**23** | **101 pass / 0 fail** | **31 pass / 0 fail** | 1702 ok / **diff=4** | **225 / 226（差 1）** |
| S4t **flag=false**（本轮收尾，交付态） | 27 cases / failed=22（接管关闭的证据） | [statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0 | [statement-possible] groups run=1 skipped=0 | cases pass=31 fail=0 skip=0 known=0 uncovered=0 | summary: total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0 | real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0 |

**打开时的两个新回归**（这就是不能默认开的原因）：
1. `token-ast` 由基线的 **diff=0** 变成 **diff=4**：声明族壳在更广语料上产出的 token/AST 与 TS 不完全等价
   （diff 明细本轮未逐条枚举，属未覆盖项）。
2. `real-dts` 由 **226/226** 变成 **225/226**：真实 `.d.ts` 里有 1 个文件的 AST 与 TS 有差异。

**两条根因的修复效果（都已验证）**：
- **ASI 回归修好了**：S4r 打开时 `--all` 是 100 pass / **1 fail**（`asi/asi-type-then-return`）；S4t 打开后
  `--all` 是 **101 pass / 0 fail**、`r1-asi` **31/31** —— §2.2 的晚建补建确实把「声明壳在 ASI 边界收口后
  既没建树也没重放」这条修掉了。
- **组合用例大幅收敛**：S4r 打开时 27 条里 failed=2；S4t 打开后 failed=**1**（26/27 通过），
  takeover 计数 21、totalShell=23 —— §2.1 的晚建守卫确实挡掉了「把已闭合的壳 + 下一条语句的头一起搬进新壳」，
  但仍有 1 条组合/形态不在守卫覆盖内。

## 2. 落地的改动（2 处实质修复，默认关闭时全部惰性）

1. **晚建越界守卫**（`typescript/tokens/statements/declaration-statement-possible-shape.xl.md`）：
   `ComputeByIndex` 的 `tokenIndex > headAt` 分支不再无条件 `Accept`，先问
   `StatementBoundaryUtil.CanEndStatement(units, tokenIndex, lateAtEof)`——与
   `RootExpressionStatementPossibleShape` 的晚建守卫**同一份判据**（`lateAtEof` 用
   `StatementScanner.NextChar` 折算，不新写第二份 ASI）；为真 → `Reject`，把这一格交回 legacy。
   `IsBuildable` 同步加同一条守卫，避免「可建」与「接受」两处判据分叉。新增 import：
   `StatementBoundaryUtil`、`StatementScanner`。**未改** `IsAsiBoundary` 的函数体。
2. **晚建补建**（`control-flow-statement-possible-shape.xl.md` 的 `BuildByIndex` 尾部 4 行）：
   声明族壳在 `tokenIndex > start`（族晚一两格才判出：`type T` / `declare const` / `interface I`）时补一次
   `shell.ComputePossibleShapes(context)`，与 `RootExpressionStatementPossibleShape.BuildByIndex` 同一手法。
   已搬进壳的 raw 单元不会再触发壳自己的求值，不补则壳停在「有单元、没判过界」，收口只能等 EOF 兜底。
3. `EnableDeclarationShell` **保持 `false`**（本轮曾置 true 实测，见 §1，随后按纪律回退）。

## 3. 打开时的全表读数（flag=true，供下一轮定位）

| 断言 | 读数 |
|---|---|
| `--double-accept` | 冲突 0（cases=120 failed=0，与基线一致） |
| `--lint` | PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| `validate` | 1720 条 / 0 条不合格 |
| `ast-json` | 6167 / 6167 完全一致（结构差 0、位置差 0、字段差 0）|
| control-flow / block-body / control-flow-body | 39/0、21/0、38/0 |
| op-ast / op-proof | 90/90、40/40 |
| 分组 dev / stage4b / stage4c / stage4c2 / stage4n / stage4o / stage4s | 22/17/42/33/28/27/20 全 pass |

## 4. 交付态（flag=false）全表读数

| 断言 | 读数 |
|---|---|
| `harness --all` | [statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0 |
| `r1-asi` | [statement-possible] groups run=1 skipped=0 | cases pass=31 fail=0 skip=0 known=0 uncovered=0 |
| `declaration-statement-takeover` | [declaration-statement-takeover] cases=27 failed=22 defaultFlags=false takeover=0 totalShell=0（22 条按预期 FAIL = 接管关闭的证据） |
| `--double-accept` | [statement-possible] double-accept: cases=120 failed=0 |
| `--lint` | [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| `validate` | 1720 条用例，0 条不合格 |
| `token-ast` | summary: total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0 |
| `real-dts-ast` | real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0 |
| `ast-json` | cases 目录 ；合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条 |
| control-flow=[control-flow-takeover] cases=39 failed=0 defaultFlag=true；block-body=[block-body-takeover] cases=21 failed=0 defaultFlag=true；control-flow-body=[control-flow-body-takeover] cases=38 failed=0 defaultFlags=true totalBrace=34 totalBody=53 | s4j FAIL 数=0；s4l FAIL 数=0 |
| op-ast=[op-ast-proof] group=ast-from-shapes cases=90 pass=90 fail=0 | 形状树接管计数已核 90 条、TS 逐节点已核 85 条、AST 数字叶子已核 8 条；op-proof=[op-proof] group=operators-live cases=40 pass=40 fail=0 | 结构文本已核 40 条、InsertBetween 计数已核 38 条；comma-import=[comma-import-fallback] cases=11 pass=11 fail=0（契约：XML==legacy、无 fallback、无形状泄漏、控制组仍被接管） | 分组：dev [statement-possible] groups run=1 skipped=0 | cases pass=22 fail=0 skip=0 known=0 uncovered=0 ; stage4b [statement-possible] groups run=1 skipped=0 | cases pass=17 fail=0 skip=0 known=0 uncovered=0 ; stage4c [statement-possible] groups run=1 skipped=0 | cases pass=42 fail=0 skip=0 known=0 uncovered=0 ; stage4c2 [statement-possible] groups run=1 skipped=0 | cases pass=33 fail=0 skip=0 known=0 uncovered=0 ; stage4n [statement-possible] groups run=1 skipped=0 | cases pass=28 fail=0 skip=0 known=0 uncovered=0 ; stage4o [statement-possible] groups run=1 skipped=0 | cases pass=27 fail=0 skip=0 known=0 uncovered=0 ; stage4s [statement-possible] groups run=1 skipped=0 | cases pass=20 fail=0 skip=0 known=0 uncovered=0 |
| perf | [perf] scale n=200 median=1.29ms tokens=399 candidateCalls=36 ; [perf] scale n=400 median=3.17ms tokens=799 candidateCalls=36 |

## 5. 未覆盖清单（下一轮的入口）

1. **打开态的 1 条 takeover 失败**：27 条里 failed=1，未逐条枚举（自包含脚本只打印 case 名，本轮未落盘）。
   定位方法：`EnableDeclarationShell=true` 重建后跑 `declaration-statement-takeover.mjs`，
   第一条 FAIL 即它（第 4 类组合形态）。
2. **打开态的 `token-ast` diff=4**：4 个用例与 TS 有差异，未枚举。这是**比组合用例更关键的信号**：
   说明声明族壳的收口/建树口径与 legacy 在更广语料上不等价。定位方法：打开后跑
   `node typescript/cases/token-ast.mjs`，看非 known-gap 的 diff 清单。
3. **打开态的 `real-dts` 225/226**：1 个真实 `.d.ts` 文件 AST 有差异，未定位到文件名。
4. `abstract class` / `declare global {}` / `declare module "m" {}` / `using` 无逐条专用断言。
5. `--group=stage4q` 的 harness 映射未接：`declaration-statement-cases.json` + `--group=stage4q`
   返回 `groups run=0 skipped=1`（组名未注册）。
6. 块内声明不接管（候选只注册根目录）；装饰器声明走 legacy；`export =` / `import x = require()`
   由 `DecideDeclaration` 明确返回 `None`。

## 6. 风险

| id | 风险 | 现状 |
|---|---|---|
| R1 | 晚建补建在 `BuildByIndex` 内重入壳内目录，可能与 CatalogGuide 的「终结候选与其它候选同格」相撞 | 打开时 double-accept 冲突 0；但可能正是 token-ast diff=4 的来源之一，需按 §5.2 排查 |
| R2 | 晚建守卫用 `CanEndStatement` 判「上一单元能否结束语句」，对声明族可能过宽/过窄 | 26/27 通过；剩 1 条待定位 |
| R3 | 两处修复在 flag=false 时惰性（route 不会判成声明族），但代码路径仍在 | 交付态全表与基线一致（§4） |
| R4 | 本轮实测中 `token-ast`/`real-dts` 的回归说明「单条形态 XML/AST 全等」不足以证明等价 | 下一轮必须以 token-ast + real-dts 为门，而不是只看 27 条 |

## 7. 复现命令

```powershell
xl_build targets=["ts"] paths=["core","typescript"]     # 0 error
node node_modules/typescript/bin/tsc -p tsconfig.json
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept ; node tests/statement-possible/harness.mjs --lint
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs ; git status --short typescript/cases ; node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs ; node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/perf.mjs
# 打开实测：把 statement-route-util.xl.md 的 EnableDeclarationShell 改成 true，重建后重跑上面全部
```