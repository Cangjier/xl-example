# HANDOFF — impl-wp7b（WP-7 B 组：已迁移族 possible 实现删除）

STATUS: COMPLETE（B 组可安全删除部分）
BRANCH: impl-wp7b @ b60de19c
BASE: refactor-integration @ 90354756
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7b`

## 1. 结论先行

- 起点 55 个 `*possible*.xl.md`，**删 7 个 / 699 行**，剩 **48 个**。
- **B-1「重指依赖」结论：没有可重指的目标。** spec 点名的 `items/class-member-item-util`(11)、
  `items/member-item-util`(17)、`statement-builder`(11)、`statement-scanner`(6) 对 `PossibleShape`
  的引用**全部指向 core 协议**（`core/syntax/possible-shape` 的 `SlotOf`/`PossibleShapeCache` 类型）或
  **仍然存活的 possible 文件**（`ExpressionStatementPossibleShape`、`TypeAliasDeclarationPossibleShape`），
  没有一处 import 到本轮要删的 7 个文件。因此 B-1 无改动、tsc 无断裂。
- 其余 41 个「已迁移族」possible 仍被 live 壳 import（`source-file-shape` 的候选表、`import-clause-shape`、
  `import-declaration-shape`、`export-declaration-shape`），删它们必须同批改写壳或走 C 组（WP-7c），
  超出 B 组写范围；**按“先重指、再删；每族正向才留”原则一律保留**（见 §3）。

## 2. 删除清单（3 个族各一个 commit）

| commit | 族 | 文件 | 行 |
|---|---|---|---|
| `353ed8d4` B-2a | class/interface 成员体 | `types/get-accessor-possible-shape`、`types/set-accessor-possible-shape`、`types/index-signature-possible-shape` | 287 |
| `0d0c2f9f` B-2b | bindings | `bindings/array-binding-pattern-possible-shape`、`bindings/object-binding-pattern-possible-shape`、`bindings/binding-element-possible-shape` | 387 |
| `b60de19c` B-2c | clause（遗留桩） | `members/import-attributes-possible-shape`（与 declarations 同名类的死桩；活的是 declarations 那个） | 25 |

删除依据（机械，可复现）：
`git grep -n -E '<类名>' -- '*.xl.md'` 除自身外 **0 命中**；
`git grep -n 'from ".*possible-shape.xl.md"' -- '*.xl.md'` 无任何文件 import 这 7 个模块。
删除时同步删 `dist/ts/<同名>.ts` 与 `build/ts/<同名>.js(.map)`（14 个产物），避免 stale 产物假绿。

## 3. 剩余 48 个 possible 的归属（为什么不能删）

| 数 | 类别 | 说明 |
|---|---|---|
| 4 | D 组 core 协议 | `possible-shape`、`possible-shape-cache`、`i-compute-possible-shapes`、`compute-possible-shapes-states`（写范围禁 core） |
| 3 | 名白名单 | `expressions/class-expression-possible-shape`、`jsdoc/jsdoc-class-tag-possible-shape`、`keywords/class-keyword-possible-shape`（A 组已硬排除，任务书要求保留） |
| 18 | C 组语句桩 | `statements/{block,break,continue,debugger,do,empty,for,for-in,for-of,if,labeled,return,switch,throw,try,variable,while,with}-possible-shape`：均被 `source-file-shape` import（当前仅用于注释掉/未启用的候选，但仍被引用；任务书明确留给 WP-7c） |
| 20 | 迁移族但 **live import** | `source-file-shape.CreatePossibleShapes()` 的活动候选：class、enum、interface、module、type-alias、function、import-declaration、import-equals、export-assignment、export-declaration、namespace-export-declaration + `statement-possible` + `expression-statement`；clause 壳：`import-clause`、`import-clause-end`、`import-declaration-end`、`named-imports`、`named-exports`、`namespace-import`、`namespace-export`、`import-attributes`、`export-declaration-end`。删一个即断壳/少候选，AST 会变 |
| 1 | 被 export/import 壳 import | `literals/string-literal-possible-shape` |
| 2 | 被 item 引擎 + source-file-shape 共用 | `statement-possible-shape`、`expression-statement-possible-shape`（静态判据 `IsAsiBoundary` 等被 `statement-builder/scanner`、`source-file-tail-builder` 调用） |

**B-2 的顺序结论**：enum/interface/class/statement/module/clause/case/try 这些族的 possible 文件
不是“族内全死”，而是**族内一部分仍挂在 legacy 候选表上**（BatchMode 默认仍 0，见 spec §1.1-1）。
在 C/D 组把壳切到 item rule 之前删它们 = 删正在跑的路径。因此本轮只删“零 import”的成员体/bindings/遗留桩。

## 4. 门禁读数（本分支实测，删除后）

| 项 | 读数 | 判定 |
|---|---|---|
| xl_build | 538 written/up-to-date、0 error（7 个 orphan 记录，源已删） | PASS |
| tsc | exit 0 | PASS |
| AST | 6167/6167（47 构造） | PASS |
| AST diff | 完全一致 6167/6167；结构 0 / 位置 0 / 字段 0 | PASS |
| real-dts | 226 文件、成功 226、崩溃 0、AST 一致 226 | PASS |
| item-oracle | 454 前缀 | PASS |
| batch-split | 70 段 / 837 断言 / 0 失败 | PASS |
| stream-proof | 146 / 0（11 段） | PASS |
| gates standard | RESULT: PASS（tests/gates 1/8 基线 KNOWN-RED） | PASS |
| gates full -BaseBuild | RESULT: PASS；buffer-equivalence WAIVED（xml 4488/16/52，digest 4384/120/52）、statement-scaling WAIVED（stmt-count-500 1.22）、class-scaling same-line WAIVED（XML 21/21）；class-scaling 12 档 PASS | PASS |

基线（删除前，dist 全新）：standard PASS，6167/0/0/0，real-dts 226，item-oracle 454 —— 与删除后逐项相同。

## 5. 未完成与下一步

1. **B 组剩余 26 个 live possible**（§3 的 20+1+2+3）需要 C 组先做：把 `source-file-shape` 的活动候选表、
   `import-clause-shape`/`import-declaration-shape`/`export-declaration-shape` 的 body 候选换成 item rule，
   然后才能删。**不要直接删**：它们是 legacy（BatchMode=0）当前解析路径。
2. C 组（WP-7c）：`body-guide-util.MountBodyGuide`、`source-file-shape` 79 处、18 个语句桩。
3. D 组：core 6 协议 + `legacy-batch-adapter` + `shadow-compare` + `BatchMode` 收 1（R1 前置：先强推 1 跑 full）。
4. `xl_orphans` 只剩 cache 残记录（warning），可在 C/D 收尾时 `prune`。
5. 分支未 merge、未 push；`git status` 干净。

## 6. 踩坑

- `git rm` 已把删除放进 index，随后 `git add` 具体路径会报 `pathspec did not match`；分族提交要
  `git reset --soft HEAD~1 && git reset` 后用**目录** pathspec 重新 stage。
- 只 `git rm` 源文件不删 `dist/ts`/`build/ts` 会假绿（tsc 仍编译残留）；本次逐文件清 14 个产物。
- `git grep` 的 pathspec `'!:...'` 在 PowerShell 里会被当成 `!:` 盘符；用 `-- '*.xl.md'` 再 Where-Object 过滤。
