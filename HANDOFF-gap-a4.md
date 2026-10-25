# HANDOFF — Gap-A4：`+=` / `^=` 规范化（possible-statement / AST 命名收尾）

## 0. 结论先行

- **A4 完成**：`MakeOperatorToken` 里 `+=` → `PlusEqualsTokenShape`、`^=` → `CaretEqualsTokenShape`，legacy 与形状层共用同一个工厂，两路同时改，没有分叉。
- 提交 **`65b096b5`**（父 `a03df655`，即转正后基线），分支 `feature/possible-statement-gap-a4`，**未 push / 未合并 / 未改开关**。
- 全部验收门绿：ast-json **6171/6171**、ast-json-diff **6171/6171 / 0/0/0**、real-dts **226/226**、token-ast **1706/0**、op-ast-proof **94/94**、op-proof **40/40**、harness --all **101/0/known1**、ast-kind-names **PASS（四类全硬断言）**。
- fixtures 实际变化：**10 个文件、19 行**（先记在这里，明细见 §2）。
- 一条需要 Lead 知道的**实测更正**：`real-dts` 在本基线**不是** `=`/`+=`/`^=` 别名的活哨兵（负对照实测，见 §5）——它是结构回归门；A4 的活哨兵是 `ast-kind-names` + fixtures 原始名逐位比较。

## 1. 改动文件（commit 65b096b5）

| 文件 | 改动 |
|---|---|
| `typescript/tokens/expressions/expression-builder.xl.md` | `MakeOperatorToken`：`+=`→`PlusEqualsTokenShape`、`^=`→`CaretEqualsTokenShape`；删 `FirstCompoundAssignmentShape` / `LastBinaryOperatorShape` 两条已无引用的 import，按字母序加 `PlusEqualsTokenShape`（`PlusTokenShape` 前）、`CaretEqualsTokenShape`（`CaretTokenShape` 前） |
| `typescript/cases/ast-compare.mjs` | `TS_KIND_ALIASES` 补 `["FirstCompoundAssignment","PlusEqualsToken"]`；`LastBinaryOperator→CaretEqualsToken` 原本已有（`:37`），确认未动 |
| `typescript/cases/real-dts-ast.mjs` | 补 `["FirstCompoundAssignment","PlusEqualsToken"]`、`["LastBinaryOperator","CaretEqualsToken"]`（防御性，见 §5） |
| `typescript/cases/{end-compute,expression,gaps-scanner,possible-compute,regex}.{ts,cj}-ast.json` | 重生成（**由 `ast-json.mjs` 生成，未手改**） |
| `tests/statement-possible/ast-kind-names.mjs` | 扩为四类硬断言（`=`/`+=`/`^=`/`,`），删掉 known-gap 豁免分支，加比较器 self-test |

`tests/parse/ts-ast.mjs`：**无需改动**——实测 `:77` 已有 `["FirstCompoundAssignment","PlusEqualsToken"]`、`:90` 已有 `["LastBinaryOperator","CaretEqualsToken"]`（若 Lead 的清单里写「补」，实测结论是「已存在，已确认」）。

## 2. fixtures 变化（实测，非预估）

`git diff --stat`（改前 → 改后）：

```
 typescript/cases/end-compute.cj-ast.json      |  2 +-
 typescript/cases/end-compute.ts-ast.json      |  2 +-
 typescript/cases/expression.cj-ast.json       | 12 ++++++------
 typescript/cases/expression.ts-ast.json       | 10 +++++-----
 typescript/cases/gaps-scanner.cj-ast.json     |  2 +-
 typescript/cases/gaps-scanner.ts-ast.json     |  2 +-
 typescript/cases/possible-compute.cj-ast.json |  2 +-
 typescript/cases/possible-compute.ts-ast.json |  2 +-
 typescript/cases/regex.cj-ast.json            |  2 +-
 typescript/cases/regex.ts-ast.json            |  2 +-
 10 files changed, 19 insertions(+), 19 deletions(-)
```

- **10 个文件、19 行**（9 处 ts + 10 处 cj；`expression` 占其中 5 ts + 6 cj）。
- 语义：`FirstCompoundAssignment → PlusEqualsToken` **18 处**（ts 9 + cj 9）、`LastBinaryOperator → CaretEqualsToken` **1 处**（cj；ts 侧该别名早已归一，故不变）。位置/结构/字段 0 变化。
- 与计划 §4 的「ts +9、cj +9+1」逐项吻合。
- HEAD（`a03df655`）里这些别名的出现数：`git grep -o` → `FirstCompoundAssignment` 18 次、`LastBinaryOperator` 1 次（合计 19，正好是本次改动行数）。

## 3. 各门读数（全部本轮实跑）

| 门 / 步骤 | 读数 |
|---|---|
| `xl_build`（paths=core,typescript / target=ts） | 1 written、891 skipped、0 error（2526 warning 为存量） |
| `tsc -p tsconfig.json` | exit **0** |
| `node typescript/cases/ast-json.mjs` | **6171/6171**（47 构造，cj-fail=0） |
| `git status --porcelain typescript/cases`（提交后重生成一次） | **空**（幂等） |
| `node typescript/cases/ast-json-diff.mjs` | **6171/6171**，结构差 **0**、位置差 **0**、字段差 **0** |
| `git checkout -- typescript/cases` | 口径动作，无输出；随后 `git status` **clean** |
| `node typescript/cases/real-dts-ast.mjs` | **226/226**（解析成功 226、崩溃 0、一致 226、差异 0） |
| `node typescript/cases/token-ast.mjs --quiet` | total=1716、ok=**1706**、crash=0、diff=**0**、ts-invalid=10 |
| `node tests/statement-possible/op-ast-proof.mjs` | **94/94** |
| `node tests/statement-possible/op-proof.mjs` | **40/40** |
| `node tests/statement-possible/harness.mjs --all` | **101/0/known1**（与基线一致，零回归） |
| `node tests/statement-possible/ast-kind-names.mjs` | **PASS**：live=5/5、self-test=4/4、fixtures=47、operator-nodes-compared=262、fail=0 |

默认门零回归：harness `--all` 未变（101/0/known1），ast-json 总数未变（6171），仅 19 行 kind 名按预期更新。

## 4. `ast-kind-names` 的「牙齿」与反例构造

门内自带 **self-test**（合成节点，不依赖产品代码），四条全部按预期报错/放行：

- `canonical-passes`：两侧 `PlusEqualsToken` / `CaretEqualsToken` → 0 问题；
- `cj-alias-detected`：CJ `FirstCompoundAssignment` vs TS `PlusEqualsToken` → 2 问题（别名 + 原始名差）；
- `both-alias-detected`：两侧都 `LastBinaryOperator` → 2 问题（**两侧同名也算失败**：规范名丢失，正是 A3 时被 known-gap 分支放过的形态）；
- `count-mismatch-detected`：数量不同 → 1 问题。

真实反例（**不必提交**，临时构造后务必还原）——验证「漏改产品」会红：

```powershell
# 1) 把产品改回别名（expression-builder.xl.md 的 MakeOperatorToken）
#    "+=" → new FirstCompoundAssignmentShape(this.Template)  （并补回该 import）
# 2) 重建
#    xl_build(cwd=本目录, paths=["core","typescript"], targets=["ts"])  然后  node node_modules/typescript/bin/tsc -p tsconfig.json
# 3) 只跑 live 部分即可见红（不必重生成 fixtures）：
#    node tests/statement-possible/ast-kind-names.mjs
#    期望：FAIL plus-equals  ... 类名 FirstCompoundAssignmentShape 不在四类规范集合；exit 1
# 4) 若再跑一次 ast-json.mjs（不提交），门还会在 fixtures 栏报 both-alias：
#    case[n] 第 0 个运算符 TS 侧原始名是别名 FirstCompoundAssignment / CJ 侧仍是别名类 …Shape
# 5) 还原：git checkout -- typescript/cases typescript/tokens && 重新 xl_build + tsc
```

## 5. 实测更正：real-dts 在本基线不是 `+=` 别名的活哨兵（诚实记录）

计划 §4/§5-R2 把 `real-dts` 当 A/A4 的哨兵（「不补表必红」）。本轮**负对照实测**结论不同：

- 临时删掉 `real-dts-ast.mjs` 的 `["FirstAssignment","EqualsToken"]` → 仍 **226/226 全绿**；
- 临时删掉 `["FirstCompoundAssignment","PlusEqualsToken"]` → 同样 **226/226 全绿**；
- 原因：`.d.ts` 语料（226 份）里**没有任何赋值运算符 AST 节点**——`=` 只出现在 enum 成员/类型参数默认值（不是 token 节点）、`+=` 的 14 次文本命中全部位于 JSDoc 注释/字符串里（`typescript/lib`+`@types/node`+`undici-types` 实测：`EqualsToken`/`FirstAssignment`/`PlusEqualsToken`/`FirstCompoundAssignment`/`CaretEqualsToken` 节点计数为 **0**）。

因此：**real-dts 226/226 是结构回归门，不是别名哨兵**；补的两条是防御性的（语料换/加用例后才咬人）。A4 的活证据是 `ast-kind-names` 的原始名逐位比较 + 入库 fixtures 的 19 行差异。这一点建议 Lead 更新计划§4 的哨兵标注，避免后续成员照抄一个不成立的断言。

## 6. 复现 / 回退

复现（干净工作树，HEAD=65b096b5）：

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-gap-a4
# 重建（本目录没有 xl CLI）
#   xl_build：cwd=本目录, paths=["core","typescript"], targets=["ts"]   # 期望 0 error
node node_modules/typescript/bin/tsc -p tsconfig.json                    # 期望 exit 0
node typescript/cases/ast-json.mjs                                       # 6171/6171
git status --porcelain typescript/cases                                  # 期望空
node typescript/cases/ast-json-diff.mjs                                  # 6171/6171，0/0/0
node typescript/cases/real-dts-ast.mjs                                   # 226/226
node typescript/cases/token-ast.mjs --quiet                              # 1706 ok / 0 diff
node tests/statement-possible/op-ast-proof.mjs                           # 94/94
node tests/statement-possible/op-proof.mjs                               # 40/40
node tests/statement-possible/harness.mjs --all                          # 101/0/known1
node tests/statement-possible/ast-kind-names.mjs                         # PASS
```

回退（二选一）：

```powershell
# 只回退 A4（保留基线提交历史）
git revert --no-edit 65b096b5
#   然后必须重建：xl_build(0 error) + tsc，再跑 ast-json.mjs 让 fixtures 回到别名态并提交
# 或整枝回到基线（确认工作树干净后）
git reset --hard a03df655
#   dist/ build/ 不在版本里：回退后同样要 xl_build + tsc
```

注意：`.xl.md` 是唯一源，`dist/ts/**` 由 `xl_build` 生成、`build/ts/**` 由 `tsc` 生成；本提交**没有**手改这两棵树。
