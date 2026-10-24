# 表达式语句壳收口修订（S1b 设计）

> 作者：架构成员（设计修订，只写文档）。基线：`origin/feature/possible-statement` = `8137721e`（Wave1）。
> T1d 现状代码取自 `feature/possible-statement-s1d` @ `67780f98`（r4 目录，树 = r3 `ac827b52` + HANDOFF-r4）。
> 依据：`HANDOFF-s1d.md`、`HANDOFF-s1d-r2.md`、`HANDOFF-s1d-r3.md`、`HANDOFF-s1d-r4.md`、`docs/possible-statement-design.md` §2/§3/§13，
> 以及本文 §9 逐条列出的 `file:line`。凡标「实测」的读数都出自上述 HANDOFF 的四道 AST 门；凡标「推断」的都有对应的证伪脚本（§3.2/§5.1）。

---

## 0. 结论摘要（先看这一节）

三道门禁的失败**不是三个独立 bug**，而是「壳不知道自己这一层已经关了」这一个语义缺口在三个位置的三种症状。

1. **收口语义模型**：壳的边界是「**已归本条语句的最后一格**」，边界格本身**不属于**本条语句；它的归属由「谁把这一格交还给父单元」决定（§1）。壳收口只在**两个函数**里发生：`FinishShell` / `DetachShell`，两者都必须留下一个**显式的、按层（per-layer）的「本层已关闭」信号**。
2. **信号载体**：只能是**按宿主对象**的旁表（新文件 `statement-shell-signal-util.xl.md`，Wave2 owner 自有），**不能**是 `PossibleShapeCache`（`Reset()` 会 `Clear()`，`catalog-guide.xl.md:114`），也**不能**是全局静态位（r4 已实测否证，§2.1）。`PossibleShape.ComputeByIndex` 拿不到 `host` 时，**统一用 `units[0].Parent` 取宿主**，空数组/已摘链时返回「未知」而不是「已关闭」（§2.4）。
3. **missing-end 24 的最可能根因**：`StatementEndPossibleShape.BuildByIndex` **没有** `try/catch`——`StatementShape.BuildFromShell` 的 `DetachShell` 兜底只包住了 `TryToClose`（`statement-shape.xl.md:153-176`），而表达式族真正收口走的是 `BuildByIndex`（r4 `statement-end-possible-shape.xl.md:206-208`）。于是建造器一抛错就是**未捕获异常**：短形态表现为 `SourceRange.End has already been set`（边界格被二次签出），长形态表现为 token-ast crash（§3.5、§5.2）。

**可行性判断**：现路径**可行**，代价可控（约 5 个小步，每步一个回滚点），不需要推翻架构。替代架构（legacy 独占边界 / 壳内 raw 攒 + EndPossible 只审计）列在 §7，**建议保留为 B 计划而非首选**。

---

## 1. 壳收口的正确语义模型

### 1.1 同时存在三个「边界」，此前把它们混成了一个

| 名字 | 值域 | 产生者 | 语义 |
|---|---|---|---|
| `StatementScanner.End` | 代码下标（跳过 trivia） | `StatementScanner.ScanRoot`（变量族） | 「扫描器认为这条语句在代码序列里到此为止」 |
| `StatementEndScan.End` | **宿主 `Data` 下标** | r4 `statement-end-possible-shape.xl.md:116-119` / `:194-198` | 折算后的收口位置，`BuildFromShell` 消费到它 |
| `codeAt[i]` | 代码下标 → `Data` 下标 | 同上（`CodeAt` 只追加） | 两套下标的唯一换算表 |

**关键**：表达式族**不使用**扫描器的 `End`，它走 `StatementEndPossibleShape.ExpressionEndCode`（r4 `:132-164`）。原因写在 r4 `:63-64`：`ScanRoot` 只认 `{` / `;` / 固定关键字起点，对表达式条目返回 `Mismatch`；即便偶有 `End`，那个位置也**早于**壳里已攒下的全部代码单元，正是「表达式语句没有读完」的根因。

### 1.2 「边界 = 哪一格」——冻结答案

`ExpressionEndCode`（r4 `statement-end-possible-shape.xl.md:143-164`）的返回值是**壳 `Data` 的下标**，四分支：

```ts
if (codeAt.length === 0) return -1;
const lastAt = codeAt[codeAt.length - 1];
if (StatementBoundaryUtil.IsEof(lastAt, units))
  return codeAt.length === 1 ? -1 : codeAt[codeAt.length - 2];   // EOF：收到前一格
if (StatementBoundaryUtil.IsSemicolon(units[lastAt]))
  return lastAt;                                                  // `;`：收到它本身
if (StatementBoundaryUtil.IsAsiBoundary(units, lastAt)) {
  if (codeAt.length === 1) return -1;
  return codeAt[codeAt.length - 2];                               // ASI：收到前一格代码
}
if (atEof) return lastAt;
return -1;
```

于是：

**I1（边界格归属）** 表达式族收口时，`End` = 「已归本条语句的**最后一格**」。**ASI / EOF 的边界格（下一条语句的首代码单元）不属于本条语句**，它留在壳 `Data` 里，由 `FinishShell` 原序搬回父单元（`statement-shape.xl.md:94-104`）。
**I2（消费口径）** `BuildFromShell` 消费 `host.Data.slice(0, endIndex + 1)`（`statement-shape.xl.md:67`）并断言 `builder.At === builder.Units.length`（`:71-73`）。所以 `endIndex` 多一格就必然抛错——**不存在「多消费一点也没关系」的余地**。
**I3（`;` 例外）** `;` 属于本条语句，进 `consumed`，但 `StatementBuilder` 建完语句后 `At == Units.length`，`;` 不进语句 `Data`（`statement-shape.xl.md:59`）。
**I4（壳不进 AST）** 收口只有两个出口：`FinishShell`（原位顶替）与 `DetachShell`（原位退回），两者都清 `parent.MountedUnit`（`statement-shape.xl.md:98-100`、`:137-139`）。壳在 `Parent = null` / `Closed = true` 之后**不再是任何一层的判定对象**。
**I5（一层一出口）** 一个 `StatementShape` 只收口一次；`TryToClose` 用 `if (!this.Closed)` 挡住二次（`statement-shape.xl.md:154`）。

> 早期失败的一个共同来源：把 I1 读成「边界格 = 当前格」。那样 `BuildFromShell` 会连着下一格一起消费，或者 `FinishShell` 搬回父单元的顺序错位，两种都会在**父单元的下一格**上表现为二次求值。

### 1.3 「本层已关闭」到底是什么

`StatementScanner.AtEOF` 的注释（`statement-scanner.xl.md:39`）写的是「**本层没有后续单元**」：

> 根在最后一个真实位置已经被签出（`SourceRange.EndIndex >= 0`）时，候选把「本层没有后续单元」当成 ASI 收尾，而不是继续等 `else` / `;`。

这句话是**层语义**，但实现是**全局静态位**（`statement-scanner.xl.md:41`），写入点有三处：r4 `statement-end-possible-shape.xl.md:101-102`、`:192-193`，Wave1 `statement-possible-shape.xl.md:118`。三处都用同一个启发式：

```ts
StatementScanner.AtEOF = (owner !== null && owner.SourceRange.EndIndex >= 0)
  || (unitEnd >= 0 && StatementScanner.NextChar(..., unitEnd) === "");
```

`owner.SourceRange.EndIndex >= 0` 的含义是「**宿主已经签出过一部分**」，它**不是**「本层已关闭」。在壳收口之后，根宿主当然已经签出过（它签出过被顶替的语句），于是这个位对**后续每一条语句**都为真——这就是 r4 §2 记录的「泄漏」。

r4 的实测（`HANDOFF-s1d-r4.md` §2）必须被当作**正面约束**而不是负面结论：

| 门 | false（最终） | true（r4 改动后） | true（r3 基线） |
|---|---|---|---|
| ast-json | **6167/6167** | 5838/6167（329 失败） | 6037/6167（130 失败） |
| ast-json-diff | **0/0/0** | 330 结构差 | 130 |
| token-ast | **1706 ok / 0 crash** | exit 1（崩溃） | 1692 ok / 14 crash |
| real-dts | **226/226** | 161 处差异 | 226/226 |

**读法**：把静态位改成局部值（只在 `ScanRoot` 的两头 save/assign/restore）会让 329 例同时坏掉，说明那个「泄漏」在 r3 实现里**是承重的拐杖**——它把「本层到底」错误地传给了下一条语句，而**下一条语句确实需要这个信号**（因为它的 `Data` 被壳截断过）。

**所以正确的修法不是「消除静态位」，而是「把静态位的值做对」**：把它从「宿主签出过」的全局启发式，改成一个**由收口动作显式写下、按宿主对象记账**的信号。静态位本身可以保留为「本次求值的入参镜像」（§2.3），从而不动 `statement-scanner` 里那 12 处 `AtEOF && code.length > 0`（`statement-scanner.xl.md:227/266/274/282/352/384/391/436/480/745/766/785/846`）。

---

## 2. 显式「本层已关闭」信号

### 2.1 必须是显式信号：三条实测支持

1. 静态位是全局的，跨语句、跨文件污染（r4 §2 假设）。
2. 复原静态位反而更差（§1.3 表），说明**值错了**而不是**机制错了**。
3. 现有启发式 `owner.SourceRange.EndIndex >= 0` 与真正的「本层已关闭」**不同真**：文件开头是注释时，首次判定落在只有 trivia 的格，宿主尚未签出，但这一层也还没关闭（`statement-end-possible-shape.xl.md:57-58`、`root-expression-statement-possible-shape.xl.md:50-54` 都在防这一格）。用一个「签出过」的位表达「关闭了」，在这两格上语义为假、结果必须靠**另写一条 `Uncertain` 防御**去补——这正是 28 crash 根因的补丁形态。

### 2.2 载体选址：四方案对比

| 方案 | 位置 | 谁能读到 | 生命周期 | 致命问题 |
|---|---|---|---|---|
| A. `StatementShape` 字段 | 壳实例 | 只有**本壳**的目录候选 | 与壳同生共死 | **下一条语句看不到**（那是新壳 / legacy 根候选），恰好是 missing-end 需要的那一方 |
| B. `PossibleShapeCache` 状态 | 每个 `CatalogGuide` 一份 | 同一 `CatalogGuide` 的候选 | `Reset()` → `Clear()`（`catalog-guide.xl.md:110-114`） | 每次建完就清；且 `:22-23` 明确「只放判定进度，不放任何会让建成什么不同的东西」 |
| C. `SyntaxContext` 字段 | 一次性传入 | 全部候选 | 整个语法上下文 | 跨条目、跨文件污染；与静态位同病，只是换了个名字 |
| D. **按宿主对象的旁表** | 新文件 `StatementShellSignal` 内 `Set<Token>` / `Map<Token,bool>` | **任何**候选，只要拿得到宿主 | 与 token 树同生共死；`Set` 可随时剪枝 | 需要「怎么拿到宿主」的一条规则（§2.4），且要防对象泄漏（弱引用/随树剪枝） |

**选定 D**，理由逐条：

- `CatalogGuide` 的 `Reset` 只碰 `Candidates` 与 `ComputeCache`（`catalog-guide.xl.md:109-114`），旁表**不受影响**，所以「建完一条语句、目录复位、下一条语句仍能读到上一层的关闭状态」这件事天然成立。
- 不动 core：`catalog-guide` / `possible-shape` / `possible-shape-cache` 都是 **Lead 专属**（设计 §6 表），A/B/C 三种都要改它们的语义或签名。
- 不动冻结签名：`ComputeByIndex(units, tokenIndex, cache)` 一个参数都不加（设计 §11）。
- 与 §7 的 B 计划兼容：将来若退成「legacy 定边界」，旁表仍可作为「边界已裁定」的记账位，不浪费。

**为什么不选 A**：A 只能回答「**我**关了吗」，而 missing-end 需要回答的是「**父层**在我这一格上是否已经到底」。壳自己的 `Closed`（`statement-shape.xl.md:141`）在 `FinishShell` 之后为真，承载的是「壳已退出树」（I4），不是「层已关闭」。把两件事塞进同一个字段，会让 `TryToClose` 的 `if (!this.Closed)`（`:154`）产生歧义。

### 2.3 谁写、什么时机写

信号只有三个写入者，全部是**收口动作本身**：

| 写入者 | 位置 | 时机 | 值 |
|---|---|---|---|
| `StatementShape.FinishShell` | `statement-shape.xl.md:96-104` 之后 | 壳已原位顶替、leftover 已搬回父单元**之后** | `MarkClosed(parent)` |
| `StatementShape.DetachShell` | `statement-shape.xl.md:132-139` 之后 | raw 单元已原位退回父单元**之后** | `MarkClosed(parent)` |
| `Token.TryToClose`（父层关闭流程） | 走 `super.TryToClose` 之前 | 父层确实不再有后续单元时 | `MarkClosed(owner)` |

**顺序是硬要求**：必须在「父单元 `Data` 已经稳定」之后写。若在 `splice` 之前写，`EndPossible` 可能在本层自己的一次求值中读到「已关闭」，把**本条**语句提前收口（`StatementEndPossibleShape.ComputeByIndex` 的 `Accept` 分支在 r4 `:126-128`）。

**读法**（替换掉三个写点的启发式）：

```ts
// 旧（三处）：StatementScanner.AtEOF = (owner !== null && owner.SourceRange.EndIndex >= 0) || (...NextChar === "");
// 新：入口处一次性算好，静态位只是「本次求值的镜像」，不是状态源
const atLayerClosed = StatementShellSignal.IsClosedOfLayer(units, tokenIndex);
StatementScanner.AtEOF = atLayerClosed;
```

即：**保留静态位作为 `ScanRoot` 的入参镜像**（不动 `statement-scanner` 的 12 处读取），把它的**值**从启发式换成显式信号。这样既拿到 r4 证实的「拐杖」利益（下一条语句仍然知道「本层到底」），又去掉了跨语句污染（信号按宿主记账，换宿主即失效）。

### 2.4 `ComputeByIndex(units, tokenIndex, cache)` 拿不到 `host` 时怎么合法获知

四个候选，按可接受度排序：

| 方案 | 做法 | 代价 | 风险 |
|---|---|---|---|
| **D1（选定）`units[0].Parent`** | 由首单元的 `Parent` 拿到宿主（壳或根），再查旁表 | O(1)，无签名改动 | `units` 为空（`length === 0`）时无宿主；`units[0]` 是 trivia 时 `Parent` 仍是宿主（trivia 也在 `Data` 里） |
| D2 `units[tokenIndex].Parent` | 同上，取当前格 | O(1) | **错**：当前格可能是已被搬回父单元的边界格，`Parent` 已改指父单元（`statement-shape.xl.md:102`），读到的层会**提前变父层** |
| D3 `cache` 里塞宿主弱引用 | 建壳时写一次 | 需要额外契约 | `Reset()` 会清（`catalog-guide.xl.md:114`）；语义上污染判定缓存 |
| D4 给 `ComputeByIndex` 加第 4 个 `host` 参数 | 直截了当 | 改 core + 全仓所有形状签名 | 违反设计 §11 冻结清单，Lead 决策成本高 |

**D1 的完整规则（写进 `StatementShellSignal`）**：

```ts
static IsClosedOfLayer(units:Array<Token>, tokenIndex:int):bool {
  if (units.length === 0) {
    return false;            // 没有宿主可查：一律「未关闭」，让调用方继续等（Uncertain 方向）
  }
  const head = units[0];
  const owner = head.Parent;
  if (owner === null) {
    return false;            // 已摘链（壳已 Detach）：同样「未关闭」，由上层兜底
  }
  return StatementShellSignal.Closed.has(owner);
}
```

三条注意：

1. **`units[0]` 必须是「本层 `Data` 的第一个单元」**。壳内目录传的是 `host.Data`（`catalog-guide.xl.md:68` 传 `host.Data`），根的目录传的也是根的 `Data`，口径一致。
2. **绝不返回 true 的兜底**：拿不到宿主时返回 `false`。方向选择与现有防御一致——只有 trivia 时 `Uncertain`（`statement-end-possible-shape.xl.md:123-125`、`root-expression-statement-possible-shape.xl.md:50-54`），**宁可多等一格也不提前收口**。
3. **旁表剪枝**：`FinishShell` 之后壳退出树（I4），`Closed` 里留下的是**父单元**的键，父单元活得比语句长，所以不会无界增长；只需在 `DetachShell` 的同一条路径上 `delete` 掉被拆壳自身的键。

### 2.5 与 `CatalogGuide` 契约的兼容性（逐条核对）

`catalog-guide.xl.md` 的三条契约必须逐条对上，任何一条破了都会变成 `double-accept` 或 crash：

| 契约 | 出处 | 本方案如何保持 |
|---|---|---|
| `Reject` = **永久**从 `Candidates` 删（数组不动） | `catalog-guide.xl.md:67-71`、`:21` | 本方案**不新增 `Reject` 分支**。新信号的读法只在 `Accept`/`Uncertain` 之间切换（`Accept` 仍由 `End >= 0` 决定），因此候选不会被永久删除。**禁止**写成 `if (closed) return Reject`——那是 28 crash 的形态。 |
| `EndPossible` 只在 `Candidates.size === 0` 时建 | `catalog-guide.xl.md:72-83`、`:84-89` | 壳的目录就是 `new CatalogGuide([], endShape)`（`root-expression-statement-possible-shape.xl.md:140`），`PossibleShapes` 恒空、`Candidates` 恒 0，本条天然满足。**不要**往壳目录里加普通候选（将来 Stage 3 加操作符候选时才需要，届时由 `ClassOf` 互斥，见设计 §2.3）。 |
| `Reset()`：`Candidates` 回填 + `Cache.Clear()` | `catalog-guide.xl.md:105-114` | 旁表不在 `PossibleShapeCache` 里，`Reset` 不动它；`Candidates` 回填照旧。壳只建一次（`FinishShell` 顶替后壳不再参与），所以 `Reset` 后无第二次求值。 |
| 「终结候选与其它候选同时成立」即抛错 | `catalog-guide.xl.md:75-77` | 壳目录普通候选恒空，永不触发。**但**根目录要做到：`RootExpressionStatementPossibleShape` 只在 `tokenIndex === headAt` 或「补建」格 `Accept`（`root-expression-statement-possible-shape.xl.md:62-86`），与根终结候选不同格成立——这一条在 §4 收窄后更严格。 |

---

## 3. missing-end 24 的根因

### 3.1 形态与最小复现（r4 §4 记录）

全部 24 例都是同一形态：**ASI 收口的子语句 + 下一行新语句**。

```
while (a) b
c;
if (a) b
else c
d;
debugger
c;
return
c;
lab: a
c;
```

报错：`SourceRange.End has already been set`（HANDOFF-s1d-r4 §4，用例 `missing-end`）。
最小复现命令（cwd = 分支目录）：

```
node typescript/cases/ast-json-diff.mjs missing-end
```

注意这些形态的**共同点**：被 ASI 收口的那条语句是**子语句**（`b` / `debugger` / `lab: a`），它的收口**不是**由壳做的，而是由 `StatementScanner` 的 `AtEOF` 分支做的（`statement-scanner.xl.md:436`、`:480`、`:745`、`:766-769` 全是 `AtEOF && code.length > 0` 形态）。也就是说：**这 24 例真正的收口者是 scanner，而 scanner 的收口条件由那个全局静态位决定**。静态位的值一旦是「真」，子语句就在最后一个代码格收口；收口之后下一行成为新语句。

### 3.2 最小诊断脚本（untracked，patch `build/ts`，不改源码）

思路：**给三处加「谁签了谁」的记账**，然后只看记账不一致的那一格。脚本放 `tmp/diag-signin.cjs`（untracked，不入库），`node tmp/diag-signin.cjs`：

1. `require("./build/ts/core/syntax/token.js")` 拿 `Token`；给 `SignIn` / `SignOut` 包一层（保存原函数，`Function.prototype.apply` 调回）：

```js
const { Token } = require("./build/ts/core/syntax/token.js");
const origIn = Token.prototype.SignIn, origOut = Token.prototype.SignOut;
const log = [];
Token.prototype.SignIn = function (index) {
  log.push({ op: "in", idx: index, cls: this.constructor.name,
             start: this.SourceRange.StartIndex, end: this.SourceRange.EndIndex,
             stack: new Error().stack.split("\n").slice(2, 5).join(" | ") });
  return origIn.call(this, index);
};
Token.prototype.SignOut = function (index) {
  log.push({ op: "out", idx: index, cls: this.constructor.name,
             start: this.SourceRange.StartIndex, end: this.SourceRange.EndIndex,
             stack: new Error().stack.split("\n").slice(2, 5).join(" | ") });
  return origOut.call(this, index);
};
```

2. 再给 `SourceRange` 的 `End` setter 包一层（`SourceRange` 在 `build/ts/core/syntax/source-range.js`；若 `End` 是访问器就包 `Object.getOwnPropertyDescriptor(proto, "End")` 的 `set`），在 `EndIndex >= 0` 再次赋值时打印 `{old, new, stack}` —— **这就是报错原文的产生点**。
3. 跑单例：`require("./build/ts/...").parse` 或直接 `node typescript/cases/ast-json-diff.mjs missing-end` 前先 `--require ./tmp/diag-signin.cjs`。
4. 只看最后 200 条记录，找**同一个 `SourceRange` 对象**上 `End` 被写两次的那一对，以及两次的 `stack` 前 3 帧。

**输出必须能回答两个问题**（这就是两个假设的判别式）：
- Q1：二次写 `End` 的那一对，**第一次**来自壳路径（栈里有 `StatementShape.BuildFromShell` / `StatementShape.FinishShell` / `StatementBuilder`）还是来自 legacy 根路径（栈里有 `SourceFileEndPossibleShape` / `StatementPossibleShape`）？
- Q2：被写两次的 token，是**边界格**（下一行新语句的首代码单元）还是**子语句内部**的单元？

### 3.3 两个假设的证伪/坐实

**H1：壳收口格与 legacy 收口格重合，同一 token 二次 SignIn/SignOut。**

- 机理：壳的 `End`（`ExpressionEndCode`）与 legacy 根终结候选的收口格**落在同一格**上；壳先收口并 `FinishShell` 把边界格搬回父单元（`statement-shape.xl.md:101-104`），父单元随后在**同一格**上再收一次口，于是同一 token 被两个 owner 各签一次。
- 坐实判据：Q1 = 「一次壳、一次 legacy」**且** Q2 = 「是边界格」。
- 证伪判据：两次都来自同一 owner（例如都在 legacy 路径内）→ H1 不成立，转 H2；或二次写的是子语句内部单元 → H1 不成立（那是 I2 违反，见 H2'）。
- 修法（谁让位）：**壳让位**。在 `StatementEndPossibleShape.ComputeByIndex` 的表达式分支里，先问一次「这一格是不是边界格」——即 `StatementBoundaryUtil.CanEndStatement(units, tokenIndex, atLayerClosed)` 只用来**否决 `Accept`**，不让它决定 `End`：

```
// r4 statement-end-possible-shape.xl.md:105-113（现）
if (!units[tokenIndex].IsTriviaToken) {
  const end = ExpressionEndCode(units, state.CodeAt, AtEOF);
  if (end >= 0 && end <= tokenIndex) { state.End = end; state.Status = 1; }
}
// 拟改：只在这里多一条「边界格不得收口」的守卫（不改变 End 的来源）
if (!units[tokenIndex].IsTriviaToken && !StatementBoundaryUtil.CanEndStatement(units, tokenIndex, atLayerClosed)) { ...同上... }
```

  注意 `End` 仍然来自 `ExpressionEndCode`（**不要**换回 `ScanRoot`，那是 r3 已修的回归）。

**H2：`FinishShell` 的边界 token 被父单元二次求值。**

- 机理：`FinishShell` 把 leftover 插在 `index + 1 + at`（`statement-shape.xl.md:101-104`），边界格因此**落在父单元 `Data` 里一个已经求值过的下标之后**；下一次父目录求值带着更长的前缀，边界格被当成「本条语句的一部分」再判一次。若此时根候选走的是「补建」分支（`root-expression-statement-possible-shape.xl.md:76-86`），它会把 `[start..tokenIndex]` 整段搬进新壳，**连同上一句已签出的边界格**，于是 `StatementBuilder` 二次建树 → 二次 `SignOut`。
- 坐实判据：Q1 = 「两次都来自 legacy + builder，且其中一次的栈里有 `RootExpressionStatementPossibleShape.ComputeByIndex` → `BuildByIndex`（`:105-150`）」，**且** Q2 = 「是边界格」。
- 证伪判据：`RootExpressionStatementPossibleShape` 从未在该例中 `Accept`（打点即可：在 `:66` / `:86` 两处 `Accept` 前各打一行）→ H2 不成立。
- 修法（谁让位）：**补建让位**，见 §4——补建条件收窄到「当前单元**证明**表达式仍在延续」，边界格上绝不补建。

> 两假设不互斥：H1 解释 `;` 结尾的短形态（`debugger\nc;`），H2 解释带 `(` 的形态（`if (a) b\nelse c\nd;` 的 `else` 格）。**先按 §3.2 拿 Q1/Q2 再改**，不要凭形态猜。

### 3.4 判定（最可能根因）

**最可能根因 = §5.2 的 catch 缺口**：`BuildFromShell` 抛错时，`DetachShell` 兜底**没有被走到**。

证据链（全部可指到行）：

1. `DetachShell` 的唯一调用点在 `StatementShape.TryToClose`（`statement-shape.xl.md:170`），而 `TryToClose` 只在**文件末尾**由根单元调用（`:147-149` 注释）。
2. 表达式族在**非 EOF** 的收口走 `StatementEndPossibleShape.BuildByIndex`（r4 `:166-208`）→ 直接 `BuildFromShell` + `FinishShell`（`:206-207`），**整段没有 `try/catch`**。
3. `BuildFromShell` 有两处显式 `throw`（`statement-shape.xl.md:64-66`、`:71-73`），`StatementBuilder` 内部还有自己的断言。
4. 于是：只要 `endIndex` 算多一格（H1/H2 任一），异常**穿透**到 `CatalogGuide.BuildByIndex` 之上，既没有 `DetachShell`，也没有「退回 legacy 重建」——AST 少一条语句（missing-end）或在别处炸（token-ast crash 14）。

这条根因与 r4 的「静态位是承重拐杖」不冲突：**拐杖让多数例侥幸不抛错；抛错的那些就是 missing-end 24 与 crash 14。**

### 3.5 修法（函数级）

| # | 文件 | 函数 | 改动 | 让谁让位 |
|---|---|---|---|---|
| F1 | `typescript/tokens/statements/statement-end-possible-shape.xl.md` | `BuildByIndex`（r4 `:166-208`） | 把 `BuildFromShell` + `FinishShell` 两行包进 `try`；`catch` 里 `StatementShape.DetachShell(host)`，成功则 `return host`（让 legacy 根候选按基线口径重建），失败则 `throw` 原错误 | 壳让位给 legacy |
| F2 | 同上 | `ComputeByIndex`（r4 `:105-113`） | 加「边界格不得 `Accept`」守卫（§3.3 H1 修法） | 壳让位给边界 |
| F3 | `typescript/tokens/statements/root-expression-statement-possible-shape.xl.md` | `ComputeByIndex`（`:76-86`） | 补建条件收窄（§4.3） | 补建让位 |
| F4 | 新文件 `statement-shell-signal-util.xl.md` | `MarkClosed` / `IsClosedOfLayer` | §2.4 实现 | — |
| F5 | `statement-shape.xl.md` | `FinishShell` / `DetachShell` | 各加一行 `MarkClosed(parent)`（§2.3 时机） | — |

> F1 是**最小、最先做、单独可验收**的一步。它的验收读数很硬：`missing-end` 24 例若从「抛错」变成「AST 有差异但不再抛错」，就坐实了 §3.4；若 24 例直接转绿，则 H1/H2 都不需要改。**先做 F1，再决定 F2/F3 的必要性**。

---

## 4. possible-compute 49

### 4.1 过宽在哪

r3 §4.2 的判断（HANDOFF-s1d-r4 §4 引用）是「补建分支过宽」。代码上过宽的是 `RootExpressionStatementPossibleShape.ComputeByIndex` 的晚建分支（`root-expression-statement-possible-shape.xl.md:68-86`）：它只排除了一件事——`CanEndStatement` 为真的格（`:80-82`），其余**任何** `tokenIndex > headAt` 的格都补建。于是：

- 在「表达式**还没开始**」的格上补建（例如 `else` / `catch` / `case` 这类会把条目切开的格）；
- 在「本条语句**早就该收口**」的格上补建（例如下一条语句的第二个代码格）；
- 两者都会把不属于本条语句的单元搬进壳，`BuildFromShell` 消费到它们 → `builder.At !== Units.length`（`statement-shape.xl.md:71-73`）→ 抛错（并因 §3.4 变成 missing-end / crash）。

### 4.2 收窄到什么判据

判据必须是**正向证据**：「当前这一格**证明**表达式仍在延续」。现成的唯一分类器是 `StatementRouteUtil.ClassOf`（`statement-route-util.xl.md:201-263`，设计 §2.3 冻结签名），不要新写第二份：

| `ClassOf` | 是否证明延续 | 补建？ |
|---|---|---|
| `BinaryOperator` | 是（`a +` 等待右操作数） | **是** |
| `MemberAccess`（`.` / `?.`） | 是 | **是** |
| `Postfix`（`++` / `--`） | 是 | **是** |
| `OperandStart`（`(` / `[` / `{` / 标识符 / 字面量） | 是（只可能是 call / 索引 / 继续运算） | **是** |
| `Separator`（`,` `:` `?` `)`） | 间接（可能是列表继续，也可能是该收口） | **否**（交 legacy，避免 49 的主体） |
| `PrefixOperator` | 否（`!` / `~` / `typeof` 起新语句更像） | **否** |
| `Semicolon` / `Eof` | 否（`CanEndStatement` 已挡） | **否** |
| `StatementStart`（`if` / `else` / `return` / `class` …） | 否——那是**下一条**语句 | **否** |
| `Unknown`（trivia / 未识别） | 未知 | **否**（`Uncertain`，方向同 §2.4 注意 2） |

### 4.3 伪代码

```
// root-expression-statement-possible-shape.xl.md:68-86 替换段
const atLayerClosed = StatementShellSignal.IsClosedOfLayer(units, tokenIndex);
if (StatementBoundaryUtil.CanEndStatement(units, tokenIndex, atLayerClosed)) {
  return ShapeStates.Reject;                       // 保留：边界格上要收的是上一条语句
}
if (StatementRouteUtil.Decide(units, tokenIndex) !== StatementRoute.ShellPlainExpression) {
  return ShapeStates.Reject;                       // 保留：不是表达式起点
}
const cls = StatementRouteUtil.ClassOf(units, tokenIndex);
if (cls !== StatementClass.OperandStart
 && cls !== StatementClass.BinaryOperator
 && cls !== StatementClass.MemberAccess
 && cls !== StatementClass.Postfix) {
  return ShapeStates.Uncertain;                    // 收窄：没有「延续」证据就不补建，也不 Reject
}
return ShapeStates.Accept;
```

三处刻意选择：

1. **「不是延续证据」返回 `Uncertain` 而不是 `Reject`**：`Reject` 会被 `CatalogGuide` 永久删除（`catalog-guide.xl.md:67-71`），而这一格可能只是**还没到**延续格（例如 `a` ⏎ `(` 之间隔了 trivia）；`Uncertain` 让目录继续等，`Reset` 之后自动复原。
2. **不引入新的 `StatementRoute` 值**：分流是全函数、冻结签名（`statement-route-util.xl.md:64-71`），补建与否是**目录策略**，不是路由。
3. **`CanEndStatement` 的 `atEof` 参数改为 `atLayerClosed`**：这就是 §2 信号的第一处消费点，它让「层已到底」与「文件已到底」解耦——正是 r4 缺的那一刀。

### 4.4 验证顺序（每条都是一个读数，不许跳过）

1. `xl_check` 0 error → `xl_build` 1 written / 0 error → `tsc` 0。（不跑门禁，纯编译。）
2. `harness --double-accept`：冲突 **0**（补建收窄最容易撞「同格双 Accept」，这一步最先能抓到）。
3. `harness stage1` 12/12；`harness --all` 72 pass / 0 fail / 1 known。
4. `ast-json-diff missing-end`：24 → **下降**（这是 F1 的效果，不是 F3 的）。
5. `ast-json` 的 `possible-compute` 组：49 → 下降且**不得**出现新的 `missing-end`。
6. 全表 `ast-json` 6167/6167 → `token-ast` crash 0 → `real-dts` 226/226。
7. 任一步恶化即回到上一步的 commit（§6.3）。

---

## 5. token-ast crash 14

### 5.1 定位方法

1. **拿崩溃栈**：`node typescript/cases/token-ast.mjs` 前加 `--trace-uncaught`，只跑第一个 crash 例，记下栈顶 5 帧。判据很简单——栈里有没有 `StatementShape.BuildFromShell`：
   - **有** → 走 §5.2（catch 缺口）；
   - **没有**，栈顶是 `SourceRange.End` setter → 走 §3.2 的记账脚本，按 Q1/Q2 分 H1/H2。
2. **最小用例**：从 r3 的 14 个 crash 里取 AST 最短的一个，逐步删到不能删（每次只删一段 trivia / 一个语句），保留 `detach-` 前缀存进 `tests/statement-possible/cases/`，作为回归用例（设计 §7.2「反例库永远保留」的口径）。
3. **二分开关**：同一用例在 `EnableShellExpressions=false` 下必须 crash=0（r4 已实测 false 态全绿），这一步确认 crash 属**壳路径专有**，而不是 legacy 老毛病。

### 5.2 与 `BuildFromShell` / `DetachShell` 的关系（关键结论）

`DetachShell` 的设计意图写得非常明确（`statement-shape.xl.md:115-118`）：

> 为什么必须有这一手：壳里这一段建不出来时（例如 `satisfies` / 类型实参这种扫描器给不出 `Status==1` 的形态），不拆壳它就会以「未建树的形状」留在父单元里，AST 少整条语句（token-ast 4 个 diff 的根因）。

但它的**调用面只有一处**（`:170`，在 `TryToClose` 里，`:151` 注释「建不出来时先调 `DetachShell`」）。而 `TryToClose` 的触发条件是**文件末尾**（`:147-149`）。于是：

| 收口路径 | 触发位置 | 有 `try/catch` + `DetachShell` 吗 |
|---|---|---|
| `StatementShape.TryToClose`（EOF 兜底） | `statement-shape.xl.md:153-176` | **有**（`:158-172`） |
| `StatementEndPossibleShape.BuildByIndex`（`;` / ASI / EOF 哨兵） | r4 `statement-end-possible-shape.xl.md:166-208` | **没有**（`:206-207` 裸调） |

**结论**：crash 14 与 diff 4 是**同一个缺陷的两个刻度**——`DetachShell` 存在，但只在 1/2 的收口路径上生效。crash 14 就是「在 `BuildByIndex` 路径上抛错」的那一批；missing-end 24 是「抛错被别处吞掉、但树已经少了一条语句」的那一批。修法即 F1（§3.5），一处 `try/catch` 同时覆盖两道门。

> 顺带解决 §3.4 的证据闭环：`detach` 兜底生效后，r4 记录的「14 crash」按机理应当**全部转为「AST 有差异」或「转绿」**，不会剩下「未捕获异常」。若仍有 crash，则那些例子的根因在 `BuildByIndex` **之外**（例如 `Shell.CatalogGuide` 的「终结候选与其它候选同时成立」抛错，`catalog-guide.xl.md:75-77`），需要单独按 §5.1 步骤 1 定位。

### 5.3 修法

即 F1。补充两条防御，避免把异常吞成静默错误：

1. `catch` 里**必须**先 `DetachShell` 再 `return host`；`DetachShell` 返回 `false`（壳已不在父单元 / 无父单元，`statement-shape.xl.md:123-129`）时**原样重抛**，不要返回 `host`——那会把「未建树的形状」留在树里（正是 `:115-118` 警告的后果）。
2. `catch` 里**不得**再调 `FinishShell`：壳的 `Data` 已经被 `DetachShell` 清空（`:130-133`），再调会命中 `:92` 的「语句壳没有父单元」或 `:95` 的「语句壳不在父单元里」。

---

## 6. 落地方案

### 6.1 file / function 级改动清单

| # | 文件（`.xl.md`） | 函数 / 字段 | 改动性质 | owner（设计 §6） |
|---|---|---|---|---|
| 1 | `typescript/tokens/statements/statement-shell-signal-util.xl.md` | **新文件**：`StatementShellSignal.Closed`、`MarkClosed`、`IsClosedOfLayer`、`Forget` | 新增 | Wave2 owner B（与 `statement-route-util` 同人） |
| 2 | `typescript/tokens/statements/statement-shape.xl.md` | `FinishShell`（`:78-105`） | 末尾加 `StatementShellSignal.MarkClosed(parent)` | Stage 1 owner Wave2 |
| 3 | 同上 | `DetachShell`（`:107-143`） | 末尾加 `MarkClosed(parent)` + `Forget(shell)` | 同上 |
| 4 | `typescript/tokens/statements/statement-end-possible-shape.xl.md` | `BuildByIndex`（r4 `:166-208`） | `try/catch` + `DetachShell` 兜底（F1） | Stage 2 owner |
| 5 | 同上 | `ComputeByIndex`（r4 `:99-121`） | 三个 `StatementScanner.AtEOF = ...` 启发式 → `IsClosedOfLayer`；表达式分支加边界格守卫（F2） | 同上 |
| 6 | 同上 | `ExpressionEndCode`（r4 `:132-164`） | **不改**（r3 已修，改回 code-only 数组会回归） | — |
| 7 | `typescript/tokens/statements/root-expression-statement-possible-shape.xl.md` | `ComputeByIndex`（`:68-86`）、`IsBuildable`（`:89-103`） | 补建收窄到 `ClassOf ∈ {OperandStart, BinaryOperator, MemberAccess, Postfix}`（F3）；`IsBuildable` 与 `ComputeByIndex` **同判据**，否则会「Accept 了但建不出来」 | Wave2 owner B |
| 8 | `typescript/tokens/statements/statement-possible-shape.xl.md`（Wave1 `:118`） | `ComputeByIndex` | 同一启发式 → `IsClosedOfLayer` | Stage 2 owner |
| 9 | `typescript/tokens/statements/statement-scanner.xl.md` | **不改** | 12 处 `AtEOF && …` 保留；静态位只作为「本次求值的镜像」 | Stage 2 owner（冻结） |
| 10 | `tests/statement-possible/harness.mjs` | 新增 `--trace-signal` 组 | 断言「同一 token 不被两个 owner 各签出一次」（§3.2 的记账**仪器化**，比临时脚本更持久） | Wave1 owner C |

**禁止触碰**（Lead 专属，设计 §6）：`core/syntax/catalog-guide.xl.md`、`possible-shape.xl.md`、`possible-shape-cache.xl.md`、`token.xl.md`、`unit-token.xl.md`。本方案不需要改它们中的任何一个——这是 §2.2 选 D 的直接收益。

### 6.2 分步顺序与每步验收读数

每步 = 一个 commit = 一个回滚点。顺序按「信息量 / 代价」排，**每一步都必须能独立判定成败**。

| 步 | 内容 | 验收读数（全部 `EnableShellExpressions=true`） | 若失败 |
|---|---|---|---|
| **S1** | 只做 §3.2 的诊断脚本（untracked，不入库），跑 `missing-end` 与 crash 例 | 拿到 Q1/Q2 答案 | 无代码可回滚；这一步不改源码 |
| **S2** | F1（清单 #4 `BuildByIndex` 的 `try/catch`）+ #2/#3 的 `MarkClosed` + 新文件 #1（只有 `MarkClosed`/`IsClosedOfLayer`，**暂不接消费者**） | `missing-end` 24 → **抛错归零**；`token-ast` crash 14 → **0**；`ast-json` **不得**低于 6037 | 回滚 S2；说明 §3.4 判断错，按 S1 的 Q1/Q2 转 H1/H2 |
| **S3** | F2（#5 的边界格守卫） | `missing-end` 继续下降；`ast-json-diff` 结构差 130 → 下降 | 回滚到 S2 |
| **S4** | #5/#8 把三个 `AtEOF` 启发式换成 `IsClosedOfLayer` | `ast-json` 升；`token-ast` crash 保持 0；`real-dts` 保持 226/226 | 回滚 S4（只回滚这一个语义替换，不动 S2/S3） |
| **S5** | F3（#7 补建收窄） | `possible-compute` 49 → 下降；`double-accept` 冲突 **0**；`harness --all` 全绿 | 回滚 S5 |
| **S6** | 全绿后**单独** commit 把 `EnableShellExpressions` 置 `true`（`statement-route-util.xl.md:73`）+ `--trace-signal` 仪器化（#10） | 第 4 项「最终态」：12 道门全绿 | S6 单独 revert 即回到熔断态 |

**门禁读数基线（false 态，必须逐位保持）**：`validate` 1720/0、`ast-json` 6167/6167、`ast-json-diff` 0/0/0、`token-ast` ok=1706 / crash=0、`real-dts` 226/226、`harness --all` 72/0/1、`--double-accept` 0、`--lint` PASS、`feas-operator` 6/6、`insert-between` 9/9、perf ratio(200/100)=1.09 / (400/200)=1.96。

### 6.3 熔断开关与回滚点

- **主开关**：`StatementRouteUtil.EnableShellExpressions`（`statement-route-util.xl.md:73`）——`false` 时 `RootExpressionStatementPossibleShape` 整体 `Reject`（`root-expression-statement-possible-shape.xl.md:42-44`）、legacy `ExpressionStatementPossibleShape` 顶部不再让位（r4 `expression-statement-possible-shape.xl.md:629-632` 的反向条件），Wave1 逐位行为。
- **二级开关**（建议新增，按 §6.2 的步粒度）：`StatementShellSignal.EnableLayerClosed:bool = false` —— 关掉时 `IsClosedOfLayer` 退回旧启发式。这样 S4 的语义替换可以**单独**熔断，不必回滚 S2/S3。这是把「一个语义改动」和「一次全局回退」解耦的唯一办法。
- **回滚点**：S1 无代码；S2 `git revert` 单个 commit；S3/S4/S5 各自单 commit；S6 单独 revert 即恢复 `false`。
- **硬熔断条件**（任一出现立即回滚到上一步，不许「再看看」）：`ast-json` 低于 6037；`token-ast` crash > 0；`--double-accept` 冲突 > 0；`real-dts` < 226/226；perf ratio(400/200) > 2.5。

---

## 7. 替代架构判断

### 7.1 三个候选与代价

| 方案 | 做法 | 改动面 | 工期（相对） | 失去什么 | 判断 |
|---|---|---|---|---|---|
| **A（本文推荐）** | 保留现有分工（壳定收口、legacy 定边界兜底），补三件事：显式层信号 + `BuildByIndex` 兜底 + 补建收窄 | 1 新文件 + 4 文件函数级 | 1.0 | — | **首选** |
| **B** | 保留 legacy **决定边界**，壳只在边界确定后接管建树；即 `EndPossible` 只做**审计**（判定「到这一格为止是否可建」但不消费），真正的建树全部由根终结候选在边界确定后触发 | 壳的生命周期后移一大步；`StatementEndPossibleShape` 退化为断言器；`BuildFromShell` 的 `endIndex` 由 legacy 传入 | 大（约一个 Stage） | 增量建树（Stage 3 的操作符候选要重新设计：壳里 raw 攒意味着 `Frames` 栈无处挂） | **B 计划**：仅当 A 的 S2–S5 全部失败时启用 |
| **C** | 给 token 加「已被某 owner 认领」位（`ClaimedBy`），二次 `SignOut` 直接跳过 | 动 `core/syntax/token.xl.md`（Lead 专属）+ 全仓 `SignOut` 语义 | 小 | 把**结构性错误**变成**静默跳过**：AST 会继续错，只是不再抛错——missing-end 会从「24 抛错」变成「24 差异」，读数是假的绿 | **不推荐**：它会掩盖 §3.4 的根因，把「能发现的错」换成「发现不了的错」 |

### 7.2 为什么 A 仍然可行（三条量化理由）

1. **静态位的方向已被 r4 定死**：不是删掉它，而是喂对它（§1.3 表）。A 正是「喂对」，改动只落在**写值的三处**，`statement-scanner` 的 12 处读取一行不动。
2. **`DetachShell` 已经存在且语义完整**（`statement-shape.xl.md:107-143`），A 只是把它接到缺的那条路径（`:206` 的 `try`）。这是**接线**，不是新机制。
3. **补建收窄有现成分类器**（`ClassOf`，`statement-route-util.xl.md:201-263`），不需要新判据文件——符合设计 §4.3「禁止第二份优先级/判据表」的纪律。

### 7.3 若 A 在 S2 之后仍不收敛，切换 B 的判据

**唯一判据**：S2 做完后，`missing-end` 的抛错归零、crash 归零，但 `ast-json` 仍 `< 6100` 且 `ast-json-diff` 结构差 `> 80`。这说明「壳收口」与「legacy 收口」在语义上**不可调和**（不只是信号没喂对），此时再转 B。
**反例**：若 S2 之后 `missing-end` 转绿而 `possible-compute` 仍 49，那是 S5（补建收窄）的活，**不要**因此转 B。

---

## 8. 剩余风险

| 风险 | 触发条件 | 影响 | 缓解 |
|---|---|---|---|
| 旁表泄漏 | 长期运行的进程里 token 对象被持有 | 内存缓慢增长 | 键是**父单元**（活得比语句长，但随树释放）；`DetachShell` 里 `Forget(shell)`；`harness --trace-signal` 断言集合大小不随用例数单调增长 |
| `units[0].Parent` 在多壳嵌套时指错层（Stage 4 块体壳） | 块内壳的 `Data[0].Parent` 是块壳而非根 | 信号读错层 | Stage 1 只覆盖根层（`root-expression-statement-possible-shape.xl.md:34`），Stage 4 时必须复核 §2.4 的规则；先加断言「`units[0].Parent !== null`」 |
| `ClassOf` 的 `Separator` 判据在 Stage 3 变化 | 操作符候选接入后 `Separator` 的含义扩展 | 补建收窄失效（可能重开 49） | 收窄判据写成「白名单」而不是「黑名单」（§4.3），新增类默认**不补建** |
| `StatementScanner.AtEOF` 仍是全局位 | 将来有人再次从「残留值」推理 | 回归 r4 的错 | 在 `statement-scanner.xl.md:39` 的注释里补一句「本位的值必须由 `StatementShellSignal.IsClosedOfLayer` 在入口一次性写入，禁止在别处写」——**文档级约束，Stage 2 owner 负责** |
| `dts-recovery` 7 与零散例未定位 | 本设计未覆盖 | 打开开关后仍有 ~10 例差异 | 明确移出 S1b 范围，列为 S1c；**不得**因为它们把主开关打开的时间点提前或推后 |

---

## 9. 证据索引（本文引用的 `file:line`）

**Wave1 基线（`8137721e`）**
- `typescript/tokens/statements/statement-shape.xl.md:51-76` `BuildFromShell`（消费口径 `:67`，断言 `:71-73`，两处 `throw` `:64-66`）
- 同上 `:78-105` `FinishShell`（leftover 插在 `index + 1 + at` `:101-104`）
- 同上 `:107-143` `DetachShell`（`:123-129` 返回 false 的两个条件，`:130-139` 退回 raw）
- 同上 `:145-176` `TryToClose`（`DetachShell` 的**唯一**调用点 `:170`）
- `core/syntax/catalog-guide.xl.md:67-71`（`Reject` 永久删）、`:72-83`（`EndPossible` 只在 0 候选建）、`:75-77`（同格双 Accept 抛错）、`:105-114`（`Reset`/`Clear`）
- `core/syntax/possible-shape.xl.md:54-61`（`ComputeByIndex` 抽象、无 `host` 形参）、`:46-52`（`Compute` 转调）
- `typescript/tokens/statements/statement-scanner.xl.md:39`（`AtEOF` 的**层语义**注释）、`:41`（全局静态位）、`:227/266/274/282/352/384/391/436/480/745/766/785/846`（12 处读取）

**T1d（r4 `67780f98`）**
- `statement-route-util.xl.md:73` `EnableShellExpressions`（含 r3 实测记录 `:77-83`）、`:154-199` `Decide`、`:132-152` `DecideCommon`、`:201-263` `ClassOf`
- `root-expression-statement-possible-shape.xl.md:36-87` `ComputeByIndex`（首格 Accept `:62-67`，补建 `:68-86`，`CanEndStatement` 否决 `:80-82`）、`:89-103` `IsBuildable`、`:105-150` `BuildByIndex`（`Kind` `:130`，终结候选 `:138-140`，晚建补算 `:146-148`）
- `statement-end-possible-shape.xl.md:99-121`（三处 `AtEOF` 启发式之一 `:101-102`）、`:105-113`（表达式族分支）、`:123-128`（只 trivia 与 `Accept`）、`:132-164` `ExpressionEndCode`（EOF `:148-150`、`;` `:151-153`、ASI `:154-159`、`atEof` `:160-162`）、`:166-208` `BuildByIndex`（裸调 `:206-207`，第二处启发式 `:192-193`）
- `expression-statement-possible-shape.xl.md:629-632`（legacy 让位条件）
- `statement-possible-shape.xl.md:73-77`（变量族让位）、Wave1 版 `:118`（第三处启发式）
- `body-guide-util.xl.md:233` `FinishShell`（声明族的同类收口，可作对照：它**有**调用方显式接线）

**实测读数**
- `HANDOFF-s1d-r4.md` §2（真/假开关四道门对照表）、§3（最终 `false` 态全绿读数）、§4（24 / 49 / 7 / 14 的分类与最小复现命令）、§5（下一步优先级）
- `HANDOFF-s1d-r3.md` §3（熔断开关）、§4.1（`AtEOF` 静态位假设，**已否证**）、§4.2（补建过宽）
- `docs/possible-statement-design.md` §2.3（分类器）、§3.2（分流不变量，冻结）、§3.3（新文件与改动）、§3.5（AST 零差异保证）、§6（文件所有权）、§11（冻结接口）、§13（风险与回滚）

---

## 10. 给实现成员的执行摘要（一页）

1. **先跑 §3.2 的记账脚本**，拿到 Q1/Q2。不要凭形态猜 H1 还是 H2。
2. **第二步只做 F1**（`statement-end-possible-shape.xl.md` 的 `BuildByIndex` 加 `try/catch` + `DetachShell`）。这一步的验收是「抛错归零、crash 归零」，不是「AST 转绿」。
3. **第三步做 §2 的信号**（新文件 + `FinishShell`/`DetachShell` 各一行），先**不接消费者**；第四步才替换三个 `AtEOF` 写点，且用 `EnableLayerClosed` 二级开关单独熔断。
4. **第五步收窄补建**（`ClassOf` 白名单）。这一步最容易撞 `double-accept`，先跑 `--double-accept`。
5. **任何一步读数为负立即回滚那一步**；`ast-json < 6037`、`crash > 0`、`double-accept > 0` 是无条件熔断线。
6. **主开关最后单独 commit**。四任未收敛的教训之一是：把「语义修好」和「打开开关」混在一个 commit 里，回滚时会把已修好的部分一起丢掉。
