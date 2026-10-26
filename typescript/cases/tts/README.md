# 增量形状（token-time-shapes）支持范围 cases

`let x = 2*3+1` 走的是「逐字符长出 shape」的增量路径：

```text
char 5  → VariableStatementShape / VariableDeclarationListShape / VariableDeclarationShape / IdentifierShape
char 9  → NumericLiteralShape("2")、BinaryExpressionShape(*)
char 11 → BinaryExpressionShape(+)（* 那一层当场封口）
EOF     → 只补最后一个数字的收口
```

而 `a < b && c > d` 不支持增量形状：逐字符 dump 里整条语句只剩 `StatementShape` + 一堆 basic token，
直到最后一个标识符关闭、语句收口，才**一次性**建出整棵表达式树（见 [README 根目录](../../../README.md) 的 cjcli 一节）。

本目录回答一个问题：**当前增量形状的覆盖边界在哪里——哪些形态还不支持？**
每一条 case 都锚定一个「不支持」的具体形态。（2026-10 收尾时账本曾清空：原 56 条缺口已全部迁往
[`../tts-impl`](../tts-impl/)。随后新增一批「复合 case」压力测试，重新打开账本，见「现状」与
[`_notes/composite-probes/`](_notes/composite-probes/README.md)。）

判据与目录标注由 [`run.mjs`](run.mjs) 实现；全部 case 的清单见 [INDEX.md](INDEX.md)。

## 判定口径

同一条 case 源码在**同一个进程内跑两遍**，唯一变量是静态开关
`StatementRouteUtil.EnableIncrementalVariableShapes`：

1. **legacy**：开关 `false`，旧路径（`StatementShape` 空壳 → 语句收口时 `StatementBuilder` 原子建树）；
2. **incremental**：开关 `true`，增量路径。

两遍都按「一次吃一个字符 + EOF 收尾」推进，每一步取 `Root.ToAstLine(0)`（与 `cjcli`、
`tests/parse/token-time-shapes.mjs` 同一套驱动与渲染器）。

对每个在 EOF 树里出现的 shape 节点取 identity `(类名, pos)`（`pos` 是 AST 起点、含前导 trivia，
两种模式一致），比较它在这两遍里**第一次出现的步号**。basic token
（`Common` / `Symbol` / `WrapSymbol` / `Bracket` / `String` / …）是尚未被形状吃掉的中间态，
不算 AST 节点，不参与比较；比较 EOF 树时忽略 `src` 区间与 basic token 行（它们不是形状结构，
而且增量实现的 `src` 有缺陷，见文末）。

分类：

| 分类 | 判据 | 含义 |
| --- | --- | --- |
| `throw` | incremental 抛错（`增量变量形状未支持：…`），legacy 正常 | C10「全有或全无」的**显式拒绝**：增量路径拒绝该形态，不会静默产出错树 |
| `atomic` | 两遍的逐字符 shape 树**完全相同** | 开关对该形态没有任何影响：整棵树等语句/文件收口时原子建出 |
| `partial` | 有节点提前，但提前的只有变量声明骨架（三层容器 + 绑定名） | **只有外层增量**：初始化器/子语句仍原子建树 |
| `incremental` | 骨架之外的标的形状首次出现严格早于 legacy | **真正增量**（正向对照 case，不是缺口；现已迁往 `tts-impl`） |

> 为什么不只看「EOF 前有没有出现」：`a < b && c > d\n` 的全部表达式形状恰好在 EOF 前一步出现，
> 但那是语句收口时一次性建出来的。和 legacy 对拍是「增量建造真的发生了」的唯一可靠证据。

目录约定（第一层目录就是期望分类，`run.mjs` 用它做回归标注）：

```text
cases/<class>/<area>/<name>.ts      class = throw | atomic | partial | incremental
                                    area  = statements | declarations | expressions | types | lexical | controls
_notes/<area>.md                    分区覆盖清单、throw 文案表、实现缺陷观察（人手写，不参与判定）
INDEX.md                            全部 case + 判定依据 + 备注（`--write-index` 生成，不要手改）
```

- case 文件是**最小可复现片段**，合法 TS，**以换行结尾**（让最后一个 token 有机会在 EOF 之前关闭，
  从而把「增量收口」与「EOF 兜底」区分开；`let x = 1` 不带尾随换行时最后一个数字只能在 EOF 兜底）。
  唯一例外是迁出前的 `incremental/controls/let-mul-add.ts`（现在是
  `tts-impl/cases/controls/let-mul-add.ts`）：它就是目标文档的样本本身（13 字节、无尾随换行）。
- 一条 case 只放一个语法构造；`atomic` case 里不要嵌**可变声明 + 支持形态**的初始化器
  （那会让开关在内部生效、把整条 case 判成 `partial`/`incremental`）。
- 不加注释、不写多段无关代码：逐字符时序是判据的一部分，任何多余字符都会改变步号。
  （`lexical` 区的注释本身就是被测形态，注释写在被测位置，文件头不加说明注释。）

## 用法

前提：先有 `build/ts/**`（构建链见根目录 README）：

```powershell
# 本机没有 xl CLI 时用 DSH 的 xl_build 工具：
#   xl_build { cwd: <repo>, paths: ["core","typescript"], targets: ["ts"] }    # 不传 out
node node_modules/typescript/bin/tsc -p .
```

```powershell
node typescript/cases/tts/run.mjs                          # 全量：逐条 PASS/FAIL + 汇总
node typescript/cases/tts/run.mjs --quiet                  # 只打汇总（0 失败时静音，仅退出码）
node typescript/cases/tts/run.mjs --filter expressions     # 只跑某个 area
node typescript/cases/tts/run.mjs --show atomic/statements/if-no-block
node typescript/cases/tts/run.mjs --json tmp/tts-report.json
node typescript/cases/tts/run.mjs --write-index            # 重写 INDEX.md
```

单条 case 想看逐字符 AST 行时，直接用它跑 `cjcli`（与判据同一套渲染器）：

```powershell
node build/ts/cjcli.js typescript/cases/tts/cases/atomic/statements/if-no-block.ts
```

退出码：`0` 全部与目录标注一致；`1` 有不符（新增支持 / 回归 / 结构异常）；`2` 环境错误（构建产物缺失等）。

## 什么时候 FAIL

本目录是**覆盖边界账本**，不是「必须永远红」的缺口清单：

- 某个形态的增量支持做上去了 ⇒ 实测分类从 `atomic` / `partial` / `throw` 升到 `partial` / `incremental`，
  `run.mjs` 会打 **NOW-SUPPORTED**：按文末「迁移契约」把 case 迁出，再重跑两处 `--write-index`。
- 反过来（原来支持，现在退化）会打 **REGRESSION**。
- 两种模式 EOF 形状结构不同（`divergent`）或 legacy 自己就抛错（`invalid`）属于 case/实现异常，同样是 FAIL。

## 现状（复合 case 探索中）

**4 条 case，全部 `throw`**。`node typescript/cases/tts/run.mjs --quiet` → PASS 4 / FAIL 0；
[`../tts-impl`](../tts-impl/) → PASS 425 / FAIL 0。

2026-10 收尾时本账本曾清空（原 56 条剩余缺口全部实现增量支持并迁往 `tts-impl`）。
随后新增 7 条「自圆其说」的复合 case 做压力测试：

- 4 条仍为 `throw`，保留为**新缺口**：`class-ball`、`generic-container`、`control-flow`、`expression-zoo`；
- `async-pipeline` 判为 `incremental`，已按约定移除（不留在缺口账本）；
- `class-inheritance`（`divergent`）与 `namespace-store`（`invalid`）是合法 TS 但触发结构异常，
  按本目录契约不入账，复现文件保存在 [`_notes/composite-probes/`](_notes/composite-probes/README.md)。

当前分类矩阵（新增 case 都在 `composite` 分区）：

| 分类 | composite | 合计 |
| --- | ---: | ---: |
| `throw`（显式拒绝） | 4 | **4** |
| `atomic`（开关无影响） | 0 | **0** |
| `partial`（仅外层增量） | 0 | **0** |
| `incremental`（真正增量，已迁出） | 0 | **0** |
| 合计 | 4 | **4** |

> 历史基线：清空前为 `throw` 125 / `atomic` 192 / `partial` 53（合计 370）；`tts-impl` 历史累计
> 369 条，加上收尾迁出的 56 条剩余缺口，合计为 **425 条**。更早的 45 条 `incremental` 正向对照
> case 已包含在历史 369 条中。当前复合探索的 4 条新缺口尚未计入 `tts-impl`，
> 因此 `tts` + `tts-impl` 暂时为 4 + 425 = **429**。

分区覆盖与逐条清单：`_notes/<area>.md`（构造 → 分类、throw 文案、divergent/invalid 观察、未收录变体）
是清空前的历史记录，保留供追溯；自动生成的 [INDEX.md](INDEX.md) 现在为 4 条（全部 `throw/composite`）。

覆盖边界（清空前的实测记录，保留供追溯；当前边界由 `tts-impl` 的 425 条表达）：

- **支持**：`let` / `const` / `var` + **单个 `Common` 标识符绑定** + 初始化器为**数字字面量**或
  `*` / `+` 组成的二元表达式；**语句末尾不能有 `;`**（`let x = 1;` 也会在 `;` 处 `throw`，
  现有目标用例没有分号，所以文档没暴露这一点）；同一文件里**不能再跟第二条语句**（见缺陷 1）。
  这些已支持形态的 case 已整体迁往 [`../tts-impl`](../tts-impl/)，本目录只保留历史契约。
- **throw（清空前 125 条）**：变量声明族遇到类型注解 `:`、多声明 `,`、`!`、解构、`;`、括号、
  非白名单符号/运算符——在 `statement` / `declaration` / `expression` 各阶段显式拒绝
  （**38 种**文案，见各 notes 与历史 INDEX）。
- **atomic（清空前 192 条）**：开关只挂在「变量语句」这一条产生式上，所以其它全部语句、声明、import/export、
  type alias/interface/enum、for 头里的 `let`、switch case 里的声明……一律原子建树。
- **partial（清空前 53 条）**：变量声明骨架已经增量，但初始化器仍是原子建树——字符串 / 模板 / regex /
  标识符 / `a < b` / `typeof` / `void` / `in` / `instanceof` / `as` / `satisfies` 等**不被拒绝**的表达式形态。
- **`/` 与多语句文件不在 cases 里**：它们不是「不支持」而是 incremental 产出错误树（`divergent`），
  见下面的实现缺陷 1、2；判据会明确 FAIL，不会把错误树收成 case。

## 顺带发现的增量实现缺陷（不是覆盖边界）

判据只关心「形状有没有提前长出来」，下面几项是实现缺陷，记录在案、不改变分类。
它们都比覆盖边界严重：`divergent` 意味着 incremental **静默产出与 legacy 不同的树**，违反契约 C10
「不允许静默产出错误的树」，因此对应形态无法作为 case 收进来（收进来就是 FAIL），只记录复现方式：

**2026-10 收尾状态**：以下缺陷已在 2026-10 收尾中修复或由后续 WP（D0/P5 等）覆盖；
本节作为历史观察保留，不再阻塞任何账本。

1. **增量声明之后跟第二条语句 ⇒ 后续语句整段丢失（divergent，最严重）**：
   `let x = 2*3+1\nlet y = 4\n` 的 incremental EOF 树只有第一条 `VariableStatementShape`
   （其 `src` 还被拉成 `[0,24)` 吞掉整个文件），第二条语句在树里不存在；legacy 两条都在。
   同类：`let x = 1\nlet y = 2`、`let x = 1\ndebugger`。也就是说**当前增量模式只能处理单语句文件**。
2. **数值左操作数后面的 `/` 被当成正则开头（divergent）**：
   `let x = 2 / 3\n` 的 incremental EOF 树只剩 `NumericLiteralShape("2")`，
   `BinaryExpressionShape` / `SlashTokenShape` / 右操作数整段缺失——逐字符 dump 里可见 `/` 打开了一个
   `RegexToken`（`src=[10,...) text="/ 3\n/"`）；legacy 是正常的除法。同类：`2/3`、`1/2+3`、`2*3/4`、`2/b`。
   （`a/b` / `a/2` 是 `partial`：左操作数是标识符时不被增量路由接管，`/` 仍按除号切。
   所以 `/` 的覆盖由 `partial/expressions/bin-div.ts` 代表。）
3. **二元表达式 `Data` 残留 trivia**：`let x = 2 * 3\n` 的 incremental EOF 树里，
   `BinaryExpressionShape` 下还留着运算符后的 `WrapSymbol`；legacy 树没有。带换行的跨行表达式
   （`let x = 1\n+ 2`）也会残留 `+` 前的换行。案例：`residualBasicLines > 0`（INDEX 备注会显示）。
4. **语句/声明 `src` 区间吞掉前导与尾随 trivia**：incremental 的变量声明 `src` 从 `0` 起
   （BOM / shebang / 前导注释 / 缩进都算进去），legacy 从首个代码字符起；带换行结尾时又多出尾随换行。
   `let-x.ts` 无前导 trivia、无尾随换行，所以既有验收没暴露它。与契约 C6 不符。

第 3、4 条不阻塞覆盖范围判定：分类用 `pos`（AST 起点，含前导 trivia，两种模式一致）做节点 identity，
比较 EOF 树时忽略 `src` 区间与 basic token 行。因此「前导注释 / shebang / BOM / 缩进 / CRLF / 尾随空白」
这类只影响 `src` 区间的词法形态仍会被正确判成 `incremental`（INDEX 备注标 `EOF 区间含前导/尾随 trivia`），
只有 `residualBasicLines` 会提示第 3 条。

## 迁移契约（历史 56 条已迁出；新缺口仍适用）

历史迁移已完成：收尾时 `tts` 0 条、[`tts-impl`](../tts-impl/) 425 条。当前账本因复合探索重新有
**4 条 `throw` 缺口**；这些新缺口一旦做成 `incremental`，仍按下面的迁出规则迁往 `tts-impl`。

本目录是**覆盖边界账本**。一个形态支持上去之后，它的 case 不再属于账本，而属于
[`../tts-impl`](../tts-impl/) 的**已支持回归基线**——**迁出，不是复制**。

### 迁出规则

1. **只迁判成 `incremental` 的 case**。先在 `tts` 里确认实测分类：

   ```powershell
   node typescript/cases/tts/run.mjs --show incremental/<area>/<name>
   # 判定：actual=incremental —— 已支持，可以迁出
   ```

   `throw` / `atomic` / `partial` 不迁——它们还不是「已支持」。
2. **用 `git mv`，原样搬家**：目标路径去掉 `incremental` 这一层，**内容逐字节不变**
   （判定步号依赖源码的逐字符时序，顺手格式化/改注释会把分类改掉）：

   ```powershell
   git mv typescript/cases/tts/cases/incremental/<area>/<name>.ts `
          typescript/cases/tts-impl/cases/<area>/<name>.ts
   ```

3. **两处 INDEX 都重生成**（两个 INDEX 都是自动生成的，不要手改）：

   ```powershell
   node typescript/cases/tts/run.mjs --write-index
   node typescript/cases/tts-impl/run.mjs --write-index
   ```

4. **`tts` 侧的分类目录随迁出消失**：`cases/incremental/<area>/` 空了就删；
   本 README 的「现状」表与上面的分类矩阵一并更新（条数减少、矩阵重算）。
5. **验收（两个 harness 都必须绿）**：

   ```powershell
   node typescript/cases/tts/run.mjs --quiet          # 剩余账本条数 PASS / FAIL 0
   node typescript/cases/tts-impl/run.mjs --quiet     # 累计已支持条数 PASS / FAIL 0
   npm run tts:impl --silent                          # = 上面那条的 npm 入口
   ```

6. **单向**：`tts-impl` 的 case 若回归成非 `incremental`，要修增量实现（那就是回归信号），
   **不要**把它挪回 `tts` 来消红。只有上游明确降级时，才按「改 `tts` 分类目录 + 改本 README 现状表 +
   从 `tts-impl` 删除」一起做，并在提交说明里写清原因。
7. **不重复收录**：同一条 case 不能同时存在于 `tts` 与 `tts-impl`。迁出后本目录不再有正向对照 case，
   正向边界改由 `tts-impl` 的 PASS 数表达（见 [`../tts-impl/README.md`](../tts-impl/README.md)）。
