# M-B4 路 合并 `feature/b4-expr-brackets` 入主仓库 — 合并报告

| 项 | 值 |
| --- | --- |
| 状态 | **合并完成 + 验收通过**（无冲突、无 reset、**默认关**）|
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible` @ `0ba2bf81`（`$BASE`）|
| 合并源 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4-expr-brackets`，`feature/b4-expr-brackets` @ `24d60915` |
| 三点 diff | 7 文件，+1064 / −2（`git merge-base` = `0ba2bf81`，即源分支正基于 `$BASE`）|
| 合并提交 | `e4e3fd9a` `merge(b4): expression bracket catalog infrastructure (default off)`（`--no-ff`，零冲突）|
| push / pull origin | **未执行**（禁 push；全程未碰 origin）|

---

## 1. 合并内容

**零行为基建，默认关**：

- 新增 `expression-bracket-possible-shape.xl.md`（490 行，object / array / call / paren 四态括号目录，arrow 参数走 deferred 延迟判定）
- 新增 `expression-atom-registry.xl.md`（81 行，原子登记表）
- `bracket-role-resolver.xl.md` +269：resolver **5 roles**
- `statement-route-util.xl.md` +35：`EnableExprBracketCatalog = false` + 3 个计数器
- `source-file-shape.xl.md` +13：装配只在 `EnableExprBracketCatalog && IsIncrementalShapesEnabled()` 时才做
- `expression-builder.xl.md` ±28：接入点
- 新增 `typescript/cases/tts/tools/expr-bracket-probe.mjs`（150 行探针）

**冲突**：0 条（`git merge --no-ff` 一次完成，工作树即刻干净）。

---

## 2. 重建

| 项 | 结果 |
| --- | --- |
| `xl_build`（cwd=repo，paths core+typescript，target ts）| **6 written / 625 skipped / 0 planned / 0 error**，3 warning（E1107 三条 `GetAccessor/SetAccessor/IndexSignature PossibleShape` 同名声明，B2c 既有、非本轮新增）|
| `tsc -p .` | **exit 0** |

写入的 6 份即 B4 改动的 6 个源页对应的产物（`expression-bracket-possible-shape.ts`、`expression-atom-registry.ts`、`bracket-role-resolver.ts`、`statement-route-util.ts`、`source-file-shape.ts`、`expression-builder.ts`），其余 625 份 `up to date`。

---

## 3. 验收读数（合并后实测）

| 套件 | 期望 | 实测 | 结论 |
| --- | --- | --- | --- |
| `tests/gates/run.mjs`（默认 incremental）| 4 / 0 / 7 | **4 PASS / 0 FAIL / 7 N/A**，exit 0 | PASS |
| `tests/gates/run.mjs --legacy` | 4 / 0 / 7 | **4 / 0 / 7**，exit 0 | PASS |
| `wide-ast`（默认）| 0 / 33 / 98 | **崩溃 0/0（预期清单为空）/ 差异 33/33 / `FileFallbackCount` 85（打印 85+13=98）**，缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0 | PASS |
| `wide-ast --legacy` | 0 / 0 / 2 | **0 / 0 / 2** | PASS |
| `real-dts`（默认）| PASS | **崩溃 0/0、差异 0/33、缺 range 0** | PASS |
| `real-dts --legacy` | 0 / 0 | **0 / 0** | PASS |
| `tts run.mjs` | 429 | **PASS 429 / FAIL 0 / 429**（throw 3/3、atomic 0/0、partial 0/0、incremental 426/426），exit 0 | PASS |
| `tshape-judge.mjs ts-all` | 426 / 0 / 3 | **total 429 / ok 426 / failures 3**（与基线同名三条，零新增失败） | 基线一致 |

逐项与任务预期**完全吻合**，无偏移，无需 reset。

---

## 4. 开关确认：默认关

| 检查 | 结果 |
| --- | --- |
| 源码声明 `statement-route-util.xl.md` | `EnableExprBracketCatalog = false` |
| 运行期读值（`require('./build/ts/.../statement-route-util.js')`）| **`EnableExprBracketCatalog = false`**，`IsIncrementalShapesEnabled() = true` |
| 装配守卫 | `source-file-shape.ts:73` `if (StatementRouteUtil.EnableExprBracketCatalog && ...IsIncrementalShapesEnabled())` → 默认不装配 |
| 打开开关后的 **12 崩溃** | **不出现**（默认 false，装配分支不进入；gates / wide-ast / real-dts 崩溃栏全 0）|

### 4.1 探针 `expr-bracket-probe.mjs`（只需确认可跑、默认行为不变）

| 用例 | 归属 |
| --- | --- |
| paren（`(a * b)`）| `Known ParenExpression`，atoms+2 / members+0 / guides+1 / deferred+0 |
| arrow-paren（`let v = (a);`）| `Deferred ArrowParams`（`arrow-paren-wait-for-arrow`），deferred+1 |
| method-params（`class C { m(a: number) {} }`）| `Known MemberList` / `Known ParameterList` / `Known FunctionBody` 全部 **family-installed** |

结论：默认档走得仍是既有 family 装配路径（`family-installed`），B4 的 expr 目录未启用 —— 与"零行为基建"一致。

---

## 5. 收尾

- **未**重生成 INDEX / README（B5 / F6 已做；默认无变化）。
- **未**打开 `EnableExprBracketCatalog`（保持 false）。
- 合并临时 ref `refs/merge/b4` 已删除。
- 源目录 `xl-example-set\b4-expr-brackets` 已**先解 `node_modules` junction** 再整目录删除（junction 原指向主仓库 `node_modules`，直接删除会波及主仓库依赖）。
- 最终 `git status --short` 为空。

---

## 6. 复算命令

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
node typescript/cases/tts/tools/expr-bracket-probe.mjs      # 探针
node -e "const u=require('./build/ts/typescript/tokens/statements/statement-route-util.js');console.log(u.StatementRouteUtil.EnableExprBracketCatalog)"  # false
```
