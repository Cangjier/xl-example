# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementBuilder } from "./statement-builder.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementOperatorBody } from "./statement-operator-body.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { VariableStatementThreeLayer } from "./variable-statement-three-layer.xl.md"
import { BlockPossibleShape } from "./block-possible-shape.xl.md"
```

# namespace cangjie

# class StatementShape extends ShapeToken

```txt
let x = 1;
const y = a + b;
let a = 1
let b = 2
```

**语句壳**（可行性原型 A）。根层的语句起点候选在「声明关键字格」就 Accept、把已经攒下的 raw basic token 搬进本壳并挂到宿主上
（`host.MountedUnit = 本壳`），于是后续字符先流进本壳；本壳自己持一份 `CatalogGuide`（候选为空、终结候选是
`StatementEndPossibleShape`），由终结候选在 `;` / ASI 边界 / EOF 处收口，再由本壳把建好的语句形状**原位顶替**进父单元。

本壳**不进 AST**：收口时用 `FinishShell` 把自己从父单元 `Data` 里换成建好的语句形状，壳 `Data` 里剩下的 raw 单元
（例如 ASI 提前收口时尚未归属下一条语句的边界 token）按原顺序挪回父单元、排在语句形状之后。

为什么这一批（原型 A）只有变量声明语句走壳：表达式语句的 `ExpressionStatementPossibleShape` 在根目录与
`async` / `import` / `using` / `type` 等双角色起点共用候选淘汰，把它整体换成壳会把那些「等后续单元才分家」的
起点也锁进壳里；可行性阶段先只接管 `let` / `const` / `var` 三个保留/上下文关键字的声明起点，
其它语句族与表达式语句继续走原有 legacy 路径（见 `HANDOFF.md`）。

## field Pos:int = -1

本语句 `Pos`（含前导 trivia 的起点）：建壳时由宿主按「前一个非 trivia 单元 `EndIndex`」算好，收口时直接沿用。

## field Kind:int = 0

本壳的**语句族标记**（§1.2「根上按语句族、壳内按构件」）：族在壳建立时已由根目录的起点候选决定，记在壳上，
壳内目录据此选构件候选，**不再重复语句族判型**。`0` = 未定；族常量随 `statement-route-util.xl.md` 落地
（`StatementRoute.ShellVariable` 等），Stage 1 先留字段与注释，不定义常量、不改变任何判定。

## field BodyKind:int = 0

壳的**体种类**（设计 §1.4 的 `BodyKind`）：`0` = 未定；`StatementShape.BodyKindBlock` = 块语句的体
（语句首 `{`，由 `BlockPossibleShape` 建壳时置位）；`StatementShape.BodyKindObjectLiteral` = 对象字面量
（预留给「表达式位置 `{`」的后续 Stage，本阶段不产生）。块内目录的挂载判据读它，
不再重复「这是不是块」的判型。

## field OperatorBody:StatementOperatorBody | null = null

**壳内的表达式体状态机**（Stage 3 S3a/S3b）：只有 `Kind == StatementRoute.ShellPlainExpression` 的壳才由
`RootExpressionStatementPossibleShape.BuildByIndex` 建它；其它族的壳保持 `null`（变量声明壳行为逐位不变）。

壳每攒到一个新的 basic token，`ComputePossibleShapes` 就先把新单元喂给它（遇操作数建叶子、遇二元运算符
用 `ShapeInsertUtil.InsertBetween` 增量插入），再把同一格交给壳自己的目录（终结候选 = `StatementEndPossibleShape`）。
`Kind` 只在建壳时判一次，这里直接读字段，不再重判族。

**它与 AST 的关系**（S3c 改写）：收口时先试 `BuildExpressionStatementFromShapes`——`OperatorBody` 已完整
（`IsComplete()`）且形状树覆盖整段表达式单元时，AST **由形状树逐节点产出**（`StatementShapeAst`，节点工厂
与 `ExpressionBuilder` 同一份）；否则照旧由 `StatementBuilder` 从壳里 raw 单元整段建（legacy 逐位不变）。
XML 的逐字节一致由「同一份 raw 单元 + 同一批节点工厂 + 同一套 Pos/SignIn/SignOut 口径」结构性保证。


## static field BodyKindBlock:int = 1

`BodyKind` 的取值：块语句的体（语句首 `{ ... }`）。

## static field BodyKindObjectLiteral:int = 2

`BodyKind` 的取值：对象字面量的体（表达式位置 `{ ... }`；本阶段只留取值，不产生）。

## constructor:(template:Template)=>void

```ts
super(template);
```

## method ComputePossibleShapes:(context:SyntaxContext)=>ComputePossibleShapesStates

**表达式体候选的接入点**（Stage 3 S3a/S3b）：每个新单元先喂给 `OperatorBody`（只追加、遇未实现构造就停），
再把同一格交给基类——基类把壳自己的目录（终结候选 `StatementEndPossibleShape`）问一遍。

顺序是刻意的：摄入必须发生在**收口判定之前**，否则「表达式已完整」的格上壳会先被建掉、新单元再也没机会进状态机。
摄入**不抛错、不改树**（只在壳的字段里建形状树），所以即使摄入判 `Incomplete`，本格的收口判定与基线逐位相同。

```ts
if (this.OperatorBody !== null) {
  this.OperatorBody.IngestAll(this.Data, this.Template);
}
return super.ComputePossibleShapes(context);
```

## static method BuildFromShell:(host:Token, endIndex:int, context:SyntaxContext)=>Token

从壳里「已经攒下的 raw 单元」建当前这一条语句：`endIndex` 是最后一个**归本条语句所有**的单元在壳 `Data` 里的下标
（含该下标本身；由终结候选按 `StatementScanner` 的 `End` 折算好）。

`consumed = host.Data.slice(0, endIndex + 1)` 原样交给 `StatementBuilder`——与 `StatementPossibleShape.BuildByIndex`
喂的是同一份建造器、同一份 `[start..end]` raw 单元，因此 AST 逐节点一致。

`;` 也在 `consumed` 里：`StatementBuilder` 建完语句后 `At == Units.length`，basic token（`;`）不进语句的 `Data`。
最后把 `consumed` 从壳 `Data` 里摘掉，剩下的就是离开本条语句的 raw 单元（ASI 边界 token / 尾部 trivia）。

```ts
const shell = host as StatementShape;
if (endIndex < 0) {
  throw new Error("语句壳没有可建的代码单元");
}
// S3c：收口前把壳里**还没喂过**的单元补齐给表达式体。壳的 `ComputePossibleShapes` 只在「有新单元流进来」
// 时被调用，因此「本条目最后一格」之后不再有格子来喂它（`a;` / 文件末尾的 `a+b`），体就会停在
// `Ingested == 0`、`IsComplete()` 永远假——那不是「形状树不支持」，而是「状态机没吃到单元」。
// `IngestAll` 只从 `Ingested` 往后追加、遇 `Closed` / `Incomplete` 即停，所以这一步对已经喂完的体是空操作。
if (shell.OperatorBody !== null) {
  shell.OperatorBody.IngestAll(shell.Data, host.Template);
  shell.OperatorBody.Finish();
}
const consumed:Array<Token> = host.Data.slice(0, endIndex + 1);
const builder = new StatementBuilder(host.Template, context);
builder.Load(consumed, shell.Pos);
// S3c（设计 §4.4）：**有完整 OperatorBody 的表达式语句**先用形状树建 AST；形状树拒绝（未覆盖构造 /
// 覆盖不全 / 不完整）时 `built` 仍是 null，`builder.At` 未被消费，下面照旧走 legacy `BuildStatement()`——
// 两条路读的是同一份 `consumed` 与同一个 `Pos`，所以「接管与否」不改变任何其它语句的行为。
// 捕获异常只用于「形状路径自己出错」这一种情形（记录后回 legacy，绝不吞掉成假绿：
// `StatementShapeAst.TotalShapeAst` 不会因此增加，op-ast-proof 会红）。
let built:Token | null = null;
if (shell.Kind === StatementRoute.ShellPlainExpression && shell.OperatorBody !== null) {
  try {
    built = builder.BuildExpressionStatementFromShapes(shell.OperatorBody);
  } catch {
    built = null;
  }
}
if (built === null && (shell.Kind === StatementRoute.ShellVariable || shell.Kind === 0)) {
  // Stage 5c：三层 possible（列表级 / 声明级只判型，语句级复用同一建造器）先决定这一条是不是
  // `let` / `const` / `var` 声明列表。不成立时 `TryBuild` 返回 null 且零副作用，下面逐字节走基线；
  // 成立时它执行的仍是同一句 `builder.BuildStatement()`（同一 `builder`、同一 `consumed`、同一
  // `shell.Pos`），因此接管不改变任何节点 / Pos / End——AST 相等由构造保证，不是靠测试兜住。
  built = VariableStatementThreeLayer.TryBuild(builder, consumed);
}
if (built === null) {
  built = builder.BuildStatement();
}
if (builder.At !== builder.Units.length) {
  throw new Error("语句没有读完");
}
host.Data.splice(0, consumed.length);
return built;
```

## static field LeftoverReplayDepth:int = 0

尾巴重放的**重入深度**（Stage 4d）。只有最外层那次收口做重放；重放过程中新建的壳收口时会看到深度 > 0 而跳过，
改由最外层的快照循环继续扫这些格子（它们仍在父单元 `Data` 里、还是同一批对象）。这样重放既不递归、
也不漏格：**幂等由「按单元对象查当前下标」保证**——已经被前一次重放建进形状的格子（`indexOf < 0`）直接跳过。

## static method FinishShell:(shell:Token, built:Token, context:SyntaxContext | null)=>void

壳收口：把壳从父单元里**原位**换成建好的语句形状，并把壳 `Data` 里剩下的 raw 单元按原顺序插在语句形状之后；
父单元的 `MountedUnit` 若还指着壳就清掉（本条语句已经结束，后续字符回到父单元）。

两处必须显式：`built.Parent`（`splice` 不设父）、`parent.MountedUnit`（`splice` 不清挂载）。

**尾巴重放（Stage 4d）**：ASI / 受限产生式收口时留在壳里的边界单元（`if (a) {}` ⏎ `;` 的 `;`、
`{ ; ; }` 的第二格、`let a = 1` ⏎ `{ b; }` 的 `{` 括号）是在壳**挂着**的时候建出来的，父目录从没见过它们；
不重放，父目录只能等到 EOF / 块收口时才看到这批残留单元 —— 这正是空语句丢节点（HANDOFF-s4c2 §2）与
`FinishShell` 缺父目录重放（HANDOFF-s4c §7 风险 1）的共同根因。

所以收口后把每个非 trivia 尾巴格子按**它当前在父单元里的下标**送进父目录判定一次
（`context` 为 `null` 时不做，保持旧行为；父单元没有 `CatalogGuide` 时同样不做）。
父目录可能是根（`SourceFileShape`）、块体括号（`{` 的 `CatalogGuide`）或块壳——它们的候选集各自决定这一格归谁，
本方法不写第二份判据。重放是**尽力而为**：抛错立刻停下并计数（`LeftoverReplayFailed`），
让原有 EOF / fallback 路径接管 —— 重放只增加接管机会，绝不让一次本来能过的解析变成失败。

**为什么用快照 + 深度而不是递归**：重放里建出的壳会自己 `FinishShell`（嵌套），若它也重放就会递归；
若把剩下的格子直接交给它，最外层就再也看不到那些对象。快照循环按对象查下标，所以「被谁建掉」都能正确跳过、
「还没建」都还在父单元里，天然幂等；`LeftoverReplayDepth` 只负责把重入挡在第二层。

```ts
const parent = shell.Parent;
if (parent === null) {
  throw new Error("语句壳没有父单元，无法收口");
}
const index = parent.Data.indexOf(shell);
if (index < 0) {
  throw new Error("语句壳不在父单元里，无法收口");
}
const leftover:Array<Token> = shell.Data.slice();
shell.Data.length = 0;
parent.Data.splice(index, 1, built);
built.Parent = parent;
if (parent.MountedUnit === shell) {
  parent.MountedUnit = null;
}
for (let at = 0; at < leftover.length; at++) {
  leftover[at].Parent = parent;
  parent.Data.splice(index + 1 + at, 0, leftover[at]);
}
if (context !== null && leftover.length > 0 && StatementShape.LeftoverReplayDepth === 0) {
  const host = parent as unknown as ShapeToken;
  const guide = host.CatalogGuide;
  if (guide !== null) {
    StatementShape.LeftoverReplayDepth += 1;
    try {
      for (const unit of leftover) {
        if (unit.IsTriviaToken) {
          continue;
        }
        const at = parent.Data.indexOf(unit);
        if (at < 0) {
          // 这一格已经被前一次重放建进某条形状里（父目录消费了它），跳过。
          continue;
        }
        try {
          guide.ComputePossibleShapesByIndex(parent, at, context);
          StatementRouteUtil.LeftoverReplayCount += 1;
        } catch {
          // 尽力而为：父目录拒收 / 抛错就停在这里，后续格子交回 EOF / fallback 路径。
          StatementRouteUtil.LeftoverReplayFailed += 1;
          break;
        }
      }
    } finally {
      StatementShape.LeftoverReplayDepth -= 1;
    }
  }
}
```

## static method DetachShell:(shell:Token)=>bool

拆壳兜底（从 `TryToClose` 里抽出来的那一段，行为等价）：把壳 `Data` 里剩下的 raw 单元**原位**退回父单元、清父单元的
`MountedUnit`、把壳自己从父单元摘掉并置 `Closed`。

- 拆掉返回 `true`：壳已退出树，父单元按基线口径继续（根终结候选建剩下的语句）；
- 无可拆（壳没有父单元 / 壳已经不在父单元 `Data` 里）返回 `false`：调用方照旧退回基类 `TryToClose`，由父单元的关闭流程报错。

为什么必须有这一手：壳里这一段建不出来时（例如 `satisfies` / 类型实参这种扫描器给不出 `Status==1` 的形态），
不拆壳它就会以「未建树的形状」留在父单元里，AST 少整条语句（token-ast 4 个 diff 的根因）。
壳**不进 AST**，所以拆壳必须把 raw 单元按原顺序放回原位（`splice(index + at, 0, ...)`，从原下标开始、逐格插），
并把每个单元的 `Parent` 一并改回父单元。

```ts
const shape = shell as StatementShape;
const parent = shell.Parent;
if (parent === null) {
  return false;
}
const index = parent.Data.indexOf(shell);
if (index < 0) {
  return false;
}
const raw:Array<Token> = shell.Data.slice();
shell.Data.length = 0;
parent.Data.splice(index, 1);
for (let at = 0; at < raw.length; at++) {
  raw[at].Parent = parent;
  parent.Data.splice(index + at, 0, raw[at]);
}
if (parent.MountedUnit === shell) {
  parent.MountedUnit = null;
}
shape.Parent = null;
shape.Closed = true;
return true;
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

**块体末句在 `}` 前收口**（Stage 4b 收尾，HANDOFF-s4b §6 D2）：块体目录建出的语句壳挂在块体 `{` 括号上，
括号的结束 `}` 会先被这个壳吃掉（`UnitToken.Process` 把字符整段交给 `MountedUnit`），括号自己再也看不到它，
于是块体目录里留下一个「未收口的语句壳」：末句没有 `;` 的形（`{ a }` / `{ f() }` / `{ let x = 1 }`）最后只能
靠文件级 fallback 或干脆建不出块（AST 里剩下一个裸 `Bracket`）。

这里只拦一种字符：**父单元是 `{` 括号、且字符正是那个括号的 `}`**。此时把壳里已经到齐的最后一条语句按
`BuildFromShell` 建出来并 `FinishShell` 收口，然后返回 `Reload`——当前字符没被消费，由驱动层重放，
这次落到括号自己身上，括号正常关闭、块壳随即收口。壳建不出来（未覆盖构造）时先 `DetachShell` 把 raw 单元
按原位退回括号、同样 `Reload`：块体退回 legacy 递归（安全回退，不建错树）。

根级语句壳（父单元是 `SourceFileShape`）与其它括号里的壳都不命中这条守卫，行为逐位不变。

```ts
if (this.Closed) {
  return BranchStates.Undo;
}
const parent = this.Parent;
if (parent === null || !(parent instanceof Bracket)) {
  return BranchStates.Undo;
}
const bracket = parent as Bracket;
if (bracket.StartBracketChar !== "{" || value !== bracket.EndBracketChar) {
  return BranchStates.Undo;
}
const lastCode = ItemUtil.LastCodeInItem(this.Data);
if (lastCode < 0) {
  return BranchStates.Undo;
}
let built:Token | null = null;
try {
  built = StatementShape.BuildFromShell(this, lastCode, context);
} catch {
  built = null;
}
if (built !== null) {
  StatementShape.FinishShell(this, built, context);
  return BranchStates.Reload;
}
if (StatementShape.DetachShell(this)) {
  return BranchStates.Reload;
}
return BranchStates.Undo;
```

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

控制流壳里的**语句体 `{`** 创建事件（Stage 4n）。`Bracket.Transit` 把新括号挂进宿主 `Data` 之后，若宿主
实现了本方法就回调（core/syntax/basic-tokens/bracket.xl.md 的第二条回调）。块体壳自己就把 `MountedUnit`
指到体括号、括号成了它的子单元，所以只有**控制流壳**能走到这里。

只做转调，判据与挂载全在 `BlockPossibleShape.OnShellBracketCreated`：本类不新增任何状态，也不换建树路径
（`BuildIf` / `BuildWhile` / `BuildDo` / `BuildFor` / `BuildTry` / `BuildWith` 仍走 `BuildStatement`）。

```ts
BlockPossibleShape.OnShellBracketCreated(this, bracket, context);
```

## method TryToClose:(context:SyntaxContext)=>CloseStates

文件末尾的兜底：根单元在 EOF 前先把挂载单元 `TryToClose`，此时壳里可能还攒着一条没有 `;` 的语句
（`let x = 1` 在文件末尾）。这时用 `BuildFromShell` 建最后一条语句并 `FinishShell` 收口；
建不出来（空壳 / 建造器抛错）才退回基类，交给父单元的关闭流程报错。

建不出来时先调 `DetachShell` 把壳拆掉（见上）；拆不掉才退回基类。

```ts
if (!this.Closed) {
  const lastCode = ItemUtil.LastCodeInItem(this.Data);
  if (lastCode >= 0) {
    // Stage 4c：EOF 收口也要先问一次 `ScanRoot` 的 `End`（仅控制流/变量族的壳；表达式壳仍消费到末单元）。
    // 受限产生式的 ASI 会在壳里留下**下一条语句**（`throw` ⏎ `a` 的 `a`、`if (a) b` ⏎ `c` 的 `c`）：
    // 一律消费到 `lastCode` 会让 `BuildStatement` 读到两条语句（`At !== Units.length` → 拆壳 →
    // 根终结候选只建回第一条），后一条就丢了（ast-json `dts-recovery` 的 `throw\na` 结构差）。
    let endIndex = lastCode;
    if (this.Kind !== StatementRoute.ShellPlainExpression) {
      const code:Array<Token> = [];
      const codeAt:Array<number> = [];
      for (let at = 0; at < this.Data.length; at++) {
        if (!this.Data[at].IsTriviaToken) {
          code.push(this.Data[at]);
          codeAt.push(at);
        }
      }
      StatementScanner.AtEOF = true;
      const result = StatementScanner.ScanRoot(code);
      if (result.Status === 1 && result.End >= 0 && result.End < codeAt.length) {
        endIndex = codeAt[result.End];
      }
    }
    let built:Token | null = null;
    try {
      built = StatementShape.BuildFromShell(this, endIndex, context);
    } catch {
      built = null;
    }
    if (built !== null) {
      StatementShape.FinishShell(this, built, context);
      return CloseStates.Nothing;
    }
    // 兜底：壳里这一段建不出来（例如 `satisfies` / 类型实参这种扫描器给不出 Status==1 的形态），
    // 就把 raw 单元按原位退回父单元、把自己摘掉，让根终结候选按基线口径建剩下的语句。
    // 不这么做时壳会以「未建树的形状」留在根里，AST 少整条语句（4 个 diff 的根因）。
    if (StatementShape.DetachShell(this)) {
      return CloseStates.Nothing;
    }
  }
}
return super.TryToClose(context);
```
