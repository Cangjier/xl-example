# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementBuilder } from "./statement-builder.xl.md"
import { StatementOperatorBody } from "./statement-operator-body.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
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
if (built === null) {
  built = builder.BuildStatement();
}
if (builder.At !== builder.Units.length) {
  throw new Error("语句没有读完");
}
host.Data.splice(0, consumed.length);
return built;
```

## static method FinishShell:(shell:Token, built:Token)=>void

壳收口：把壳从父单元里**原位**换成建好的语句形状，并把壳 `Data` 里剩下的 raw 单元按原顺序插在语句形状之后；
父单元的 `MountedUnit` 若还指着壳就清掉（本条语句已经结束，后续字符回到父单元）。

两处必须显式：`built.Parent`（`splice` 不设父）、`parent.MountedUnit`（`splice` 不清挂载）。

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

## method TryToClose:(context:SyntaxContext)=>CloseStates

文件末尾的兜底：根单元在 EOF 前先把挂载单元 `TryToClose`，此时壳里可能还攒着一条没有 `;` 的语句
（`let x = 1` 在文件末尾）。这时用 `BuildFromShell` 建最后一条语句并 `FinishShell` 收口；
建不出来（空壳 / 建造器抛错）才退回基类，交给父单元的关闭流程报错。

建不出来时先调 `DetachShell` 把壳拆掉（见上）；拆不掉才退回基类。

```ts
if (!this.Closed) {
  const lastCode = ItemUtil.LastCodeInItem(this.Data);
  if (lastCode >= 0) {
    let built:Token | null = null;
    try {
      built = StatementShape.BuildFromShell(this, lastCode, context);
    } catch {
      built = null;
    }
    if (built !== null) {
      StatementShape.FinishShell(this, built);
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
