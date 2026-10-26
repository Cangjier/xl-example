# M-B4b 合并 `feature/b4b-expr-on` 入主仓库 — 合并报告

| 项 | 值 |
| --- | --- |
| 状态 | **合并完成 + 验收通过**（零冲突、无 reset、默认开） |
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible` @ `e5c22add`（`$BASE`） |
| 合并源 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4b-expr-on`，`feature/b4b-expr-on` @ `5feaa12e`（code `c689f27a` + report） |
| 三点 diff | 5 文件，+512 / −29（`git merge-base` = `e5c22add`，源分支正基于 `$BASE`） |
| 合并提交 | `afd8d8d9` `merge(b4b): enable expression bracket catalog (0 crashes)`（`--no-ff`，零冲突） |
| push / pull origin | **未执行**（全程未触 origin） |

---

## 1. 合并内容

- `statement-route-util.xl.md`：`EnableExprBracketCatalog` 默认改为 **true**（B4 时是 false）
- `expression-bracket-possible-shape.xl.md` +189：12 条崩溃的 `IsBuildable` / `Seal` / `Classify` 修复
- `bracket-role-resolver.xl.md` +110：12 处崩溃点修复
- `core/syntax/basic-tokens/bracket.xl.md` +31：`BracketCloseHook`（默认 `null`）

**冲突**：0 条（`--no-ff` 一次完成，工作树即刻干净）。

---

## 2. 重建

| 项 | 结果 |
| --- | --- |
| `xl_build`（cwd=repo，paths core+typescript，target ts）| **4 written / 627 skipped / 0 planned / 0 error**，3 warning（E1107 三条 `GetAccessor/SetAccessor/IndexSignature PossibleShape` 同名声明，B2c 既有，非本轮新增） |
| `tsc -p .` | **exit 0** |

写入的 4 份即本合并改动的 4 个源页产物（`bracket.ts`、`expression-bracket-possible-shape.ts`、`bracket-role-resolver.ts`、`statement-route-util.ts`）。

---

## 3. 验收读数（合并后实测）

| 套件 | 期望 | 实测 | 结论 |
| --- | --- | --- | --- |
| `tests/gates/run.mjs`（默认 incremental）| 4 / 0 / 7 | **4 PASS / 0 FAIL / 7 N/A**，exit 0 | PASS |
| `tests/gates/run.mjs --legacy` | 4 / 0 / 7 | **4 / 0 / 7**，exit 0（其中 wide-ast 0/0/2、real-dts 0/0） | PASS |
| `wide-ast`（默认）| 0 崩溃 / 33 差异 / 98 fallback | **崩溃 0/0、差异 33/33、fallback 85+13=98/85、缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0** | PASS（与 base 一致） |
| `wide-ast --legacy` | 0 / 0 / 2 | **0 / 0 / 2** | PASS |
| `real-dts-ast`（默认）| PASS | **崩溃 0/0、差异 0/33、缺 range 0** | PASS |
| `real-dts-ast --legacy` | 0 / 0 | **0 / 0** | PASS |
| `tts run.mjs --quiet` | PASS 429 | **PASS 429 / FAIL 0 / 429**（throw 3/3、atomic 0/0、partial 0/0、incremental 426/426），exit 0 | PASS |
| `tshape-judge.mjs ts-all` | 426 / 0 / 3 | **total 429 / ok 426 / failures 3**（与基线同名的三条，零新增失败） | 基线一致 |

逐项与任务预期**完全吻合**，无偏移，无需 reset。

---

## 4. 开关确认：默认开

| 检查 | 结果 |
| --- | --- |
| 源码声明 `statement-route-util.xl.md` | `EnableExprBracketCatalog = true` |
| 运行期读数（`require('./build/ts/.../statement-route-util.js')`）| **`EnableExprBracketCatalog = true`**，`IsIncrementalShapesEnabled() = true` |
| 默认档下 12 条崩溃 | **不出现**（gates / wide-ast / real-dts 崩溃栏全 0；`FileFallbackCount` 85 与 base 逐位相同） |
| `BracketCloseHook` | 默认 `null`，未接线任何消费者（本合并只提供挂点） |

---

## 5. 已知未完成（**不声称全量 Known**）

- **K1**：容器 shape 在创建/关闭格替换父 Data —— **未完成**。
- **K2**：`ArrowParamsCatalog` / `Bind` —— **未完成**。

以上两项在本次合并的验收集（gates / wide-ast / real-dts / tts / ts-all）上均未出现红项；它们仍是 expr 目录在容器与箭头参数两个探针方向上的既知缺口，**默认档的"0 崩溃"结论仅覆盖上述五套件**。

---

## 6. 收尾

- **未**重生成 INDEX / README（默认读数没变：`EnableExprBracketCatalog` 的默认值翻转不影响索引与 README 的既有读数）。
- 合并临时 ref `refs/merge/b4b` 已删除。
- 源目录 `xl-example-set\b4b-expr-on` 已 **先解 `node_modules` junction** 再整目录删除（junction 原指向主仓库 `node_modules`，直接删除会波及主仓库依赖；解链后主仓库 `node_modules/typescript/bin/tsc` 仍存在）。
- 最终 `git status --short` 为空。

---

## 7. 复算命令

```powershell
$repo = "C:\Users\Admin\Documents\GitHub\xl-example"
Set-Location $repo
node node_modules/typescript/bin/tsc -p .
node tests/gates/run.mjs                                    # 4 / 0 / 7
node tests/gates/run.mjs --legacy                           # 4 / 0 / 7（含 wide-ast 0/0/2、real-dts 0/0）
node tests/parse/wide-ast.mjs                               # 0 崩溃 / 33 差异 / fallback 85(+13)=98
node tests/parse/wide-ast.mjs --legacy                      # 0 / 0 / 2
node typescript/cases/tts/run.mjs                           # PASS 429 / FAIL 0
node typescript/cases/tts/tools/tshape-judge.mjs ts-all     # 429 / 426 / 3
node -e "const u=require('./build/ts/typescript/tokens/statements/statement-route-util.js');console.log(u.StatementRouteUtil.EnableExprBracketCatalog)"  # true
```
