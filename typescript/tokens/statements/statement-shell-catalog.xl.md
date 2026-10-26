# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BlockShape } from "./block-shape.xl.md"
import { BreakStatementShape } from "./break-statement-shape.xl.md"
import { ContinueStatementShape } from "./continue-statement-shape.xl.md"
import { DebuggerStatementShape } from "./debugger-statement-shape.xl.md"
import { DoStatementShape } from "./do-statement-shape.xl.md"
import { EmptyStatementShape } from "./empty-statement-shape.xl.md"
import { ForInStatementShape } from "./for-in-statement-shape.xl.md"
import { ForOfStatementShape } from "./for-of-statement-shape.xl.md"
import { ForStatementShape } from "./for-statement-shape.xl.md"
import { IfStatementShape } from "./if-statement-shape.xl.md"
import { LabeledStatementShape } from "./labeled-statement-shape.xl.md"
import { ReturnStatementShape } from "./return-statement-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { SwitchStatementShape } from "./switch-statement-shape.xl.md"
import { ThrowStatementShape } from "./throw-statement-shape.xl.md"
import { TryStatementShape } from "./try-statement-shape.xl.md"
import { WhileStatementShape } from "./while-statement-shape.xl.md"
import { WithStatementShape } from "./with-statement-shape.xl.md"
```

# namespace cangjie

# class StatementShellCatalog

**B1 的「尽早挂壳」目录：只在 `StatementRouteUtil.IsIncrementalShapesEnabled()` 为 true 时被调用。**

控制流 / 块 / 标签语句在 legacy 里是「整条语句收口时一次建出整棵子树」（`StatementFamilyDispatch`
的 family builder），账本因此判 `atomic`。本目录在**壳刚建出来**的那一格，就往壳的 `Data` 里塞一个
**占位节点**：类名 = 该语句族最终节点的 legacy 类名，`Pos` = 壳的 `Pos`（两者逐位相同），`src` 起点 =
首代码字符。占位节点 `IsTriviaToken = true`，所以：

- `ToAstLine` 会把它当普通子单元打印（账本因此能记下「这个类名 @ 这个 pos 在第 N 格就出现了」）；
- `StatementBuilder.Load` / `ItemUtil` / 各扫描器都按 trivia 跳过它，语句收口时 `consumed` 切片会把它
  一并挪出壳、`builder.Load` 不会把它当成代码单元 —— 解析行为零扰动。

收口时 `StatementFamilyDispatch.Build` 用 `Take` 把 legacy 建出的节点 `Data` 原样搬进占位节点、
把占位节点从 trivia 恢复成普通节点并返回它：于是 EOF 树的 `(类名, pos, 子节点)` 与 legacy **逐节点一致**，
而该节点首次出现的步号严格早于 legacy。`src` 按 C1 口径覆盖（终点 = legacy 子树终点，不吸尾随 trivia）。

开关关闭时本目录**一个方法都不会被调用**（两个调用点都用 `IsIncrementalShapesEnabled()` 门控），
所以 legacy 逐字节不变。未支持的形态（`return` / `break` / `continue` / 声明族 / `;`）**不进本目录**，
它们在 B1 里保持 legacy 时序（不静默假装支持，见报告「已完成 / 未完成」）。

## static field Shells:Array<Token> = []

## static field Lists:Array<Array<Token>> = []

## static method HeadText:(unit:Token)=>string

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
return "";
```

## static method IsControlFlowHead:(text:string)=>bool

```ts
return text === "if" || text === "while" || text === "do" || text === "for"
  || text === "switch" || text === "try" || text === "with"
  || text === "throw" || text === "debugger";
```

## static method Attach:(shell:Token, head:Token, route:int)=>void

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return;
}
if (head.IsTriviaToken) {
  return;
}
const template = shell.Template;
const pos = (shell as any).Pos as number;
const start = head.SourceRange.Start;
const created:Array<Token> = [];
const make = (typeName:string):void => {
  let made:any = null;
  if (typeName === "IfStatementShape") { made = new IfStatementShape(template); }
  else if (typeName === "WhileStatementShape") { made = new WhileStatementShape(template); }
  else if (typeName === "DoStatementShape") { made = new DoStatementShape(template); }
  else if (typeName === "ForStatementShape") { made = new ForStatementShape(template); }
  else if (typeName === "ForInStatementShape") { made = new ForInStatementShape(template); }
  else if (typeName === "ForOfStatementShape") { made = new ForOfStatementShape(template); }
  else if (typeName === "SwitchStatementShape") { made = new SwitchStatementShape(template); }
  else if (typeName === "TryStatementShape") { made = new TryStatementShape(template); }
  else if (typeName === "WithStatementShape") { made = new WithStatementShape(template); }
  else if (typeName === "ThrowStatementShape") { made = new ThrowStatementShape(template); }
  else if (typeName === "DebuggerStatementShape") { made = new DebuggerStatementShape(template); }
  else if (typeName === "LabeledStatementShape") { made = new LabeledStatementShape(template); }
  else if (typeName === "BlockShape") { made = new BlockShape(template); }
  else if (typeName === "BreakStatementShape") { made = new BreakStatementShape(template); }
  else if (typeName === "ContinueStatementShape") { made = new ContinueStatementShape(template); }
  else if (typeName === "ReturnStatementShape") { made = new ReturnStatementShape(template); }
  else if (typeName === "EmptyStatementShape") { made = new EmptyStatementShape(template); }
  if (made === null) {
    throw new Error("增量变量形状未支持：statement 占位节点类型 " + typeName);
  }
  made.IsTriviaToken = true;
  made.Pos = pos;
  if (start >= 0) {
    made.SignIn(start);
  }
  created.push(made);
};
if (route === StatementRoute.ShellLabel) {
  make("LabeledStatementShape");
} else if (head instanceof Bracket) {
  if ((head as Bracket).StartBracketChar === "{") {
    make("BlockShape");
  }
} else if (head instanceof Symbol) {
  if ((head as Symbol).Is(";")) {
    make("EmptyStatementShape");
  }
} else if (head instanceof Common) {
  const text = (head as Common).TempToString();
  if (!StatementShellCatalog.IsControlFlowHead(text)) {
    return;
  }
  if (text === "if") { make("IfStatementShape"); }
  else if (text === "while") { make("WhileStatementShape"); }
  else if (text === "do") { make("DoStatementShape"); }
  else if (text === "for") {
    // `for` 的最终类名要到 `(` 里第一个头单元才判得出来（classic / in / of）：三个候选都先挂上，
    // 收口时按 legacy 节点的类名取匹配的那一个，其余随 `consumed` 切片一起挪出壳。
    make("ForStatementShape");
    make("ForInStatementShape");
    make("ForOfStatementShape");
  }
  else if (text === "switch") { make("SwitchStatementShape"); }
  else if (text === "try") { make("TryStatementShape"); }
  else if (text === "with") { make("WithStatementShape"); }
  else if (text === "throw") { make("ThrowStatementShape"); }
  else if (text === "debugger") { make("DebuggerStatementShape"); }
}
if (created.length === 0) {
  return;
}
for (const shape of created) {
  shape.Parent = shell;
}
// 占位节点插在**首代码单元之前**（下标 0），不能追加到末尾：壳在收口前会把「最后一个子单元」当
// 未关闭的兄弟去 `TryToClose`（`WrapSymbol` / `BasicToken` 的常规路径），占位节点 `src.End` 还没签，
// 会被误关并抛 `SourceRange is not set`。放在最前则 `Last()` 恒是真正的代码单元，扫描器按 trivia 跳过它。
shell.Data.splice(0, 0, ...created);
StatementShellCatalog.Shells.push(shell);
StatementShellCatalog.Lists.push(created);
```

## static method Take:(built:Token)=>Token | null

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return null;
}
if (StatementShellCatalog.Lists.length === 0) {
  return null;
}
const list = StatementShellCatalog.Lists[StatementShellCatalog.Lists.length - 1];
const typeName = built.constructor.name;
let matched:Token | null = null;
for (const shape of list) {
  if (shape.constructor.name === typeName) {
    matched = shape;
    break;
  }
}
if (matched === null) {
  // 不是本壳的族（例如控制流壳里先收口的裸表达式语句）：不动栈，等本壳自己收口。
  return null;
}
StatementShellCatalog.Lists.pop();
StatementShellCatalog.Shells.pop();
const children:Array<Token> = built.Data.slice();
built.Data.length = 0;
for (const child of children) {
  child.Parent = matched;
  matched.Data.push(child);
}
// `src` 按 C1：起点 = legacy 节点起点，终点 = legacy 子树终点；`Pos` 已在挂壳时 = 壳的 Pos（与 legacy 相同）。
const source = built.SourceRange;
if (source.Start >= 0) {
  matched.SourceRange.Start = source.Start;
}
if (source.End >= 0) {
  matched.SourceRange.End = source.End;
}
// 占位节点到此成为真正的语句节点，不再按 trivia 跳过（父单元的 EOF / 后续扫描按普通语句处理它）。
matched.IsTriviaToken = false;
return matched;
```
