# REPORT-final-astline — ToAstLine 重构的最终合并与 canonical 全量复验

- 日期: 2026-10-26
- 角色: 最终合并成员（只合并、只复验、只报告；未修改任何源码 / 测试 / 门）
- canonical: `C:\Users\Admin\Documents\GitHub\xl-example`（最终合并在该工作区完成，`node_modules` 已存在，未另行安装）
- 一句话结论: **`refactor/astline`（含统一 gates 报告）已 `--no-ff` 合入 `feature/all-possible`，合并提交 `1825210e`，无冲突；canonical 上构建、tsc、三条目标用例、统一 gates、`ToXmlString` 残留扫描五项逐项复现预期读数，全部通过。**

---

## 1. 分支与提交

| 项 | 值 |
| --- | --- |
| 最终分支 | `feature/all-possible` |
| 合并后 HEAD（代码合并提交） | `1825210e77ecf0e6475bf5c837254c1e0a4ad8af` |
| 报告提交后 HEAD | 本报告这一 `docs(coord)` 提交（位于合并提交之上，见 §9） |
| 合并 commit | `1825210e77ecf0e6475bf5c837254c1e0a4ad8af`（真合并提交，父 = `633d22ed` + `f8168d09`） |
| 合并前 canonical | `633d22edbe8acb06d18b7c7ad108b36ac7cb27ff`（`feature/all-possible`，工作区干净） |
| 被合并分支（合并后） | `refactor/astline` @ `f8168d092243e9928e7cbe2f59abec3bdeae6fe3` |
| 原暂存分支 | `refactor/astline` @ `4969338f7b7dec4354587122b2e179a1e836d0ba` |
| gates 报告分支 | `gates-astline` @ `a0d437abf235b65e47e856e4ebbbc3cdbdd7dcc0`（基于 `4969338f`，仅新增 `_coord/REPORT-gates-astline.md`） |
| 暂存分支上的报告合并 | `f8168d092243e9928e7cbe2f59abec3bdeae6fe3`（`merge(astline): 统一 gates 复验报告`） |

合并拓扑（`git log --oneline`）：

```
1825210e merge(astline): Token.ToAstLine(indent) 取代 ToXmlString（14/14，gates 全绿）
f8168d09 merge(astline): 统一 gates 复验报告
a0d437ab docs(coord): gates-astline 统一 gates 复验报告（ToAstLine 重构后 4P/0F/7NA，无回归）
4969338f docs(coord): merge-astline report - 合并、构建、五项验收与清理
5fcf0398 merge(astline): ToAstLine(indent) 取代 ToXmlString
1d1fdc3a fix(astline): op 兜底后重算语料基线 + 修复报告
```

`633d22ed` 是 `1825210e` 的第一父，因此 `--no-ff` 确实生成了合并提交而不是快进。

## 2. 合并过程

### 2.1 先把 gates 报告并入暂存分支（独立克隆，未动 canonical 工作区）

```powershell
git clone C:\Users\Admin\Documents\GitHub\xl-example C:\Users\Admin\Documents\GitHub\xl-example-set\merge-astline-final
git -C <clone> fetch C:\Users\Admin\Documents\GitHub\xl-example refactor/astline
git -C <clone> checkout -b refactor/astline FETCH_HEAD        # → 4969338f
git -C <clone> fetch C:\Users\Admin\Documents\GitHub\xl-example-set\gates-astline gates-astline
git -C <clone> merge --no-ff FETCH_HEAD -m "merge(astline): 统一 gates 复验报告"
```

- **冲突：无。** `Merge made by the 'ort' strategy.`，只新增 `_coord/REPORT-gates-astline.md`（1 file changed, 253 insertions(+)）。
- 合并结果 `f8168d09`，随后 `git push <canonical> HEAD:refs/heads/refactor/astline` 成功（`4969338f..f8168d09`），
  canonical 侧 `git rev-parse refactor/astline` 复核 = `f8168d09`。
- git 身份沿用本机全局配置（`Cangjier <moodlee@qq.com>`），本仓库级无需补设。

### 2.2 合入 `feature/all-possible`（canonical 工作区）

前置核对全部满足后才执行：分支 `feature/all-possible`、HEAD `633d22ed`、`git status --porcelain` 空。

```
$ git merge --no-ff refactor/astline -m "merge(astline): Token.ToAstLine(indent) 取代 ToXmlString（14/14，gates 全绿）"
Merge made by the 'ort' strategy.
 61 files changed, 3256 insertions(+), 2220 deletions(-)
```

- **冲突：0 个。** 合并后 `1825210e` 的两个父为 `633d22ed` 与 `f8168d09`。
- 合并后工作区 `git status --porcelain` 为空（`dist/`、`build/` 在 `.gitignore`，产物不入库）。

## 3. canonical 全量复验（五项）

工作目录 = `C:\Users\Admin\Documents\GitHub\xl-example`，HEAD = `1825210e`。

### 3.1 构建

`xl_build`（`paths=["core","typescript"]`、`targets=["ts"]`、`force:true`，`out` 走仓库 `xl.json` 的 `dist`）：

```
xl build — 566 written, 0 skipped, 0 planned, 0 error(s), 3 warning(s)
```

- **与预期一致：566 written / 0 error / 3 warning。**
- 3 条 warning 全部是既有 E1107（同名类型在多页声明），与基线同一批：
  `GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape`。
- `node node_modules/typescript/bin/tsc -p .` → **exit 0**。

### 3.2 三条目标用例

| 用例 | 权威基线 | canonical 实测 | exit | 判定 |
| --- | --- | --- | --- | --- |
| `npm run tts` | PASS 6 / FAIL 8 / 14（exit 1，EOF PASS） | **PASS 6 / FAIL 8 / 14**，`[PASS] EOF` | **1** | 符合（legacy 既有基线） |
| `npm run tts:incremental` | PASS 14 / FAIL 0 / 14（exit 0） | **PASS 14 / FAIL 0 / 14**，char 11 `[annotation-only]` | **0** | 符合 |
| `npm run tts:corpus` | 1723 / 差异 0（exit 0） | **文件数 当前 1723 / 基线 1723（解析异常 7）；一致 1723；差异 0（变化 0 / 缺失 0 / 新增 0）**，1.38s | **0** | 符合 |

### 3.3 统一 gates（`npm run gates -- --jobs 11`）

```
11 道门并行跑（11 路，16 核）：runtime:check · runtime:cli · cases:tsast · cases:direct · direct:lint · samples · cases:check · wide-ast · real-dts-ast · coverage · cpp:check
```

| # | 门 | 判定 | 摘要 | 耗时 |
| --- | --- | --- | --- | --- |
| 1 | `runtime:check` | **N/A** | `runtime/` 源目录不在本仓库（诊断 §5） | 不运行 |
| 2 | `runtime:cli` | **N/A** | `tsrun.xl.md` 不在本仓库（诊断 §5） | 不运行 |
| 3 | `cases:tsast` | **N/A** | `typescript/print-ast-common.xl.md` 不在本仓库 | 不运行 |
| 4 | `cases:direct` | **N/A** | 同 #3（同一份源页缺失） | 不运行 |
| 5 | `direct:lint` | **ok** | 第三出口的约定 0 条违反（25 条约定名） | 0.5s |
| 6 | `samples` | **N/A** | `dawn/` 不在本仓库（`xl build` 报 E1006） | 不运行 |
| 7 | `cases:check` | **ok** | 1720 条用例，0 条不合格 | 0.7s |
| 8 | `wide-ast` | **ok** | 全部解析成功、崩溃 0、AST 逐节点一致、地基 0 处 | 8.4s |
| 9 | `real-dts-ast` | **ok** | 真实 `.d.ts` 全量解析成功且 AST 逐节点一致 | 3.4s |
| 10 | `coverage` | **N/A** | `print-ast-common.xl.md` 不在本仓库 | 不运行 |
| 11 | `cpp:check` | **N/A** | `dist/cpp` 不存在（`xl.json` 的 `build.target` 只有 `ts`） | 不运行 |

**合计：11 道门 = 4 PASS / 0 FAIL / 7 N/A，exit 0，墙钟 8.6s。**

PASS 集合 = `direct:lint`、`cases:check`、`wide-ast`、`real-dts-ast`；
N/A 集合 = `runtime:check`、`runtime:cli`、`cases:tsast`、`cases:direct`、`samples`、`coverage`、`cpp:check`。
**与已验收读数逐门一致，与 gates 报告 §4 的判定、摘要、N/A 理由逐字一致。**

### 3.4 `ToXmlString` 残留扫描

```
rg -n --glob '*.xl.md' --glob '*.mjs' --glob '!dist/**' --glob '!build/**' --glob '!node_modules/**' 'ToXmlString' .
→ 0 命中（exit 1，即无匹配）
```

同一口径下 `ToAstLine` 命中 40 个文件（含 `core/syntax/token.xl.md` 4 处、`tests/` 多个 mjs），
说明替换是「换名 + 换实现」而不是删除调用点。**`ToXmlString` 残留 = 0。**

### 3.5 复验后的仓库状态

```
$ git branch --show-current
feature/all-possible
$ git rev-parse HEAD
1825210e77ecf0e6475bf5c837254c1e0a4ad8af
$ git status --porcelain
（空）
```

## 4. 跨版本结构比对证据（来自 gates 报告 §5 / §7.2）

语料基线 `tests/parse/token-time-shapes/legacy-corpus-baseline.json` 在本重构中被**重算**
（相对 `633d22ed`：1717 行插入 / 1717 行删除；1723 条指纹里 1716 条变化，7 条未变——7 条全是解析异常文件）。
因此「`tts:corpus` 差异 0」本身**只证明分支与自己的基线一致**，不等于「与重构前输出一致」。
gates 报告为此额外做了一次**跨版本结构比对**（脚本在仓库外，未改任何源码/期望文件）：两个克隆各自构建、渲染全部 1723 件语料，
先把绝对根路径归一化成 `<ROOT>`，再从 base 的 XML 与 branch 的缩进树里各抽出**节点标签序列**逐件比对：

```
identical tag sequences : 1716
identical error text    : 7
REAL diffs              : 0
files                   : 1723     （1716 渲染成功 + 7 解析异常，与 tts:corpus 自报「解析异常 7」一致）
```

⇒ **1716 件语料在重构前后的节点标签序列逐一相同，7 件解析异常文案也逐一相同，真差异 0。树结构没有变，变的是渲染格式**；
语料基线因此必须重算（这是设计后果，不是语义回归）。

格式差异的量级（同一件 `samples/declarations.ts`）：

| | base `633d22ed` | branch `4969338f` |
| --- | --- | --- |
| 方法 | `ToXmlString(0)` | `ToAstLine(0)` |
| 形态 | 单行 XML，无位置信息 | 缩进树，每节点带 `pos=` / `src=[a,b)` |
| 输出 | 11 587 字符 / 1 行 | 17 870 字符 / 287 行 |

## 5. `ToAstLine` 规格摘要（`_coord/CONTRACT-astline.md`）

- **入口**：`Token.ToString()` 固定 `return this.ToAstLine(0);`；`Root.ToString()` 即整棵树的 AST 行文本。
  返回本节点及全部后代的整棵子树，行间 `"\n"`，**末尾不带换行**。
- **每层 3 列**：`indent` 是 0 基深度，每层缩进 3 列——正好是连接线 `├─ ` / `└─ ` / `│  ` 的宽度；
  `indent < 0` 先钳到 0 再算，钳后的值贯穿整趟递归。
  设 `depth=max(indent,0)`、`pad=" ".repeat(depth*3)`、`cut=(depth+1)*3`：子单元 `block = child.ToAstLine(depth+1).split("\n")`，
  首行 `pad + (最后?"└─ ":"├─ ") + block[0].slice(cut)`，其余行 `pad + (最后?"   ":"│  ") + block[j].slice(cut)`。
  `slice(cut)` 是关键：子串自带的那 `cut` 列缩进被父级**换成**连接线前缀，整棵树只有一套缩进口径，不会父子缩进叠加。
- **一行的字段（`AstLabel()`）**：运行时类名 `this.constructor.name` 起头，随后按**固定顺序**追加、字段间两个空格：

  | 字段 | 何时出现 | 形态 | 说明 |
  | --- | --- | --- | --- |
  | `pos` | `AstPos()` 非 `null` | `pos=<v>` | `v < 0` 印 `pos=-` |
  | `src` | **总是出现** | `src=[<start>,<end>)` | `start < 0` 印 `-`，`end < 0` 印 `未封` |
  | `text` | `AstText()` 非空 | `text="<escaped>"` | 空串＝不出现 |
  | `op` | `AstOperator()` 非空 | `op="<escaped>"` | 空串＝不出现 |

  样例：`NumericLiteralShape  pos=7  src=[8,9)  text="2"`、`AsteriskTokenShape  pos=9  src=[9,10)  op="*"`、
  `Common  src=[0,3)  text="let"`、`SourceFileShape  pos=-  src=[0,未封)`。
- **三个钩子**（运行时多态，写成普通方法）：

  | 钩子 | `Token` 默认 | 覆写 |
  | --- | --- | --- |
  | `AstPos:()=>int \| null` | `return null;` | `ShapeToken` → `this.Pos`（默认 `-1`，故 `SourceFileShape` 印 `pos=-`） |
  | `AstText:()=>string` | `return "";` | `BlockToken`→`Temp`；`AreaAnnotation`/`LineAnnotation`→`Tmp`；`ConstString`→`Temp`；`RegexToken`→`ToText()`；`ShapeToken`→字段探测 `(this as any).Text` 为 string 则取；`IdentifierShape`→`EscapedText`（盖掉上一条） |
  | `AstOperator:()=>string` | `return "";` | `ShapeToken`→字段探测 `(this as any).Op`（约七十个 `*TokenShape` 都声明了 `Op`，不必逐个改） |

- **转义**：`AstEscape(value)` 只处理 `\\` `\"` `CR` `LF` `TAB`，其余原样，先判反斜杠；不再有 `\a \b \f \v \'`
  与 `&gt; &lt; &amp;` 实体（行文本只需能放进双引号）。
- **被删除的成员**：`Token.ToXmlString`、`BlockToken.ToXmlString`、`Bracket.ToXmlString`、`AreaAnnotation.ToXmlString`、
  `LineAnnotation.ToXmlString`、`String.ToXmlString`、`ConstString.ToXmlString`；`CommonUtil.XmlDecode` 保留不删（解析路径已不调用）。

## 6. 清理结果

先 `Test-Path` 精确核对再删，删除后复查（删除前已确认 `f8168d09` 已 push 到 canonical、当前不在被删目录内）：

| 目标 | 删除前 Test-Path | 删除后 Test-Path |
| --- | --- | --- |
| `C:\Users\Admin\Documents\GitHub\xl-example-set\gates-astline` | True | **False** |
| `C:\Users\Admin\Documents\GitHub\xl-example-set\gates-astline-base` | True | **False** |
| `C:\Users\Admin\Documents\GitHub\xl-example-set\merge-astline-final` | True | **False** |

- `C:\Users\Admin\Documents\GitHub\xl-example-set` 条目数：**删除前 3 → 删除后 0（空目录）**。
- 已合并暂存分支：`git -C <canonical> branch -d refactor/astline` → `Deleted branch refactor/astline (was f8168d09).`
- canonical 分支残留检查：`git branch --list '*astline*'` → **无输出**（无 `astline*` / `refactor/astline` 残留）。
- canonical 终态：检出 `feature/all-possible`、HEAD `1825210e`、`git status --porcelain` 空。
- 说明：被删的只是本地克隆目录；两个被合并提交（`a0d437ab`、`f8168d09`）都已在其合并提交里可达，无历史丢失。

## 7. 异常与限定

1. **无冲突、无失败、无需改代码。** 两个合并都是 `ort` 策略自动完成。
2. **`direct:lint` 的 PASS 不含证据（既有状态，非本轮回归）**：它只认 `## method PrintAst` 这一行，
   全仓 `*.xl.md` 里该标题一处也没有（分支、base、上一轮均为 0 处），于是扫描段数 = 0，
   逐页判据计数恒为 0，仍以 exit 0 结束；base 与分支的 27 行输出逐字节相同。
   ⇒ 本轮新增/重写的 `ToAstLine` 方法体**不在任何静态门的判据里**，渲染文本只由 `tts` 14/14 与 `tts:corpus` 1723/0 覆盖。
   建议（非本轮范围）：让该门标题正则指向现状方法名，或补「扫到 0 段即红」守卫。
3. **`npm run tts` 的 exit 1 是权威基线本身**（legacy 模式 6 PASS / 8 FAIL，第 8 步起为既有差异），不是验收失败。
4. **`tts:corpus` 的「差异 0」是相对重算后的基线**；「与重构前一致」由 §4 的跨版本结构比对（1716/7/0）另行证明。
5. 暂存克隆的 `node_modules` 用 `robocopy /E` 从 canonical 复制（等价于 `Copy-Item -Recurse`，更快）；
   该克隆已随 §6 删除，canonical 未安装/未改动任何依赖。
6. 本地合并后**未 push 到 `origin`**（本轮只要求合入本地 canonical 的 `feature/all-possible`）；`origin/feature/all-possible` 仍停在合并前。
7. `xl_build` 的 31891 字节输出在工具返回里被折叠，但首行汇总 `566 written, 0 skipped, 0 planned, 0 error(s), 3 warning(s)` 与 3 条 E1107 原文均已核对。

## 8. 结论

| 验收项 | 期望 | canonical 实测 | 结论 |
| --- | --- | --- | --- |
| 构建 | 566 / 0 error / 3 E1107 | 566 / 0 error / 3 E1107 | **PASS** |
| `tsc -p .` | exit 0 | exit 0 | **PASS** |
| `npm run tts` | 6 / 8 / 14（exit 1） | 6 / 8 / 14（exit 1，EOF PASS） | **PASS** |
| `npm run tts:incremental` | 14 / 0 / 14（exit 0） | 14 / 0 / 14（exit 0，char 11 annotation-only） | **PASS** |
| `npm run tts:corpus` | 1723 / 差异 0（exit 0） | 1723 / 差异 0（exit 0） | **PASS** |
| `npm run gates -- --jobs 11` | 4 PASS / 0 FAIL / 7 N/A（exit 0） | 4 PASS / 0 FAIL / 7 N/A（exit 0） | **PASS** |
| `ToXmlString` 残留 | 0 命中 | 0 命中 | **PASS** |
| 工作区 | 干净 | `git status --porcelain` 空 | **PASS** |
| 清理 | 三个文件夹删除、暂存分支删除 | 3 → 0、分支已删 | **PASS** |

- **最终分支**：`feature/all-possible` @ `1825210e77ecf0e6475bf5c837254c1e0a4ad8af`
- **合并 commit**：`1825210e77ecf0e6475bf5c837254c1e0a4ad8af`
- **被合并分支**：`refactor/astline` @ `f8168d092243e9928e7cbe2f59abec3bdeae6fe3`（原暂存 `4969338f`）
- **gates 报告**：`a0d437ab`（内容已随 `f8168d09` 进入最终分支）
- 验收项 **9/9 PASS**，无 FAIL，无冲突，无需改代码。

## 9. 本报告自身的提交

本报告是提交在代码合并 `1825210e` **之上**的一个独立 `docs(coord)` 提交（1 file changed, 246 insertions）。
因此 `git log -1` 显示的是这个 docs 提交，而不是合并提交——**代码合并提交固定为 `1825210e`**，
§1 表中「合并后 HEAD」与 §6/§8 里出现的 `1825210e` 均指它。

- `_coord/` 在本仓库被 `.git/info/exclude` 忽略（`git check-ignore` → `.git/info/exclude:8:/_coord/`），
  所以 `git add -A` 不会带上它，本报告用 `git add -f _coord/REPORT-final-astline.md` 入库。
- 该 docs 提交只新增本文件，不触碰源码、测试、gates、期望文件与 `dist/`，
  因此 §3 的复验读数在其之后仍然逐项有效（工作区 `git status --porcelain` 依旧为空）。
- 文件编码：UTF-8 无 BOM（首字节 `# R`，即 35,32,82）。
