# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BlockShape } from "./block-shape.xl.md"
import { BreakStatementShape } from "./break-statement-shape.xl.md"
import { CaseClauseShape } from "../members/case-clause-shape.xl.md"
import { ContinueStatementShape } from "./continue-statement-shape.xl.md"
import { DebuggerStatementShape } from "./debugger-statement-shape.xl.md"
import { DefaultClauseShape } from "../members/default-clause-shape.xl.md"
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

[B0b:SHELLID] **身份化**：`Shells` / `Lists` 之外多一条**同下标**的 `ShellIds`，每个 push 的壳在
`Attach` 里领一个单调 `ShellId`（唯一分配点，计数器 `NextShellId`）。`Take` 不再默认取「栈顶 + 类名」，
而是先按身份 `(壳的 Pos, 占位节点类名)` 找壳；身份不命中才退回旧的栈顶匹配，并且**每次都计数**。

为什么需要它：`Take` 的旧判据是「`Lists` 最后一个 + `constructor.name`」。内层语句壳只要**提前 push**
（`if (a) { … }` 的块壳在 `if` 壳收口前就进了栈），栈顶就不再是外层语句的壳；旧代码要么匹配不中（
`return null`，占位节点悄悄留在壳里当 trivia），要么在类名相同的两层之间弹错壳。身份判据把这类
「提前 push 的内层壳」从外层 `Take` 的搜索里排除。

只读计数（全部可外部读取，只增不减）：

| 计数 | 含义 |
|---|---|
| `ShellTakeByIdentityCount` | 按身份命中（正常路径） |
| `ShellTakeFallbackCount` | 身份不命中、退回「栈顶 + 类名」并命中（旧行为；**不为 0 就是还没身份化的残留**） |
| `ShellTakeMissCount` | 两条路径都不命中 ⇒ `return null`（不动栈，等本壳自己收口） |
| `ShellTakeOutOfOrderCount` | 身份命中的壳**不是栈顶**（= 确实存在提前 push 的内层壳被排除） |

## static field ShellIds:Array<int> = []

## static field NextShellId:int = 0

## static field ShellTakeByIdentityCount:int = 0

## static field ShellTakeFallbackCount:int = 0

## static field ShellTakeMissCount:int = 0

## static field ShellTakeOutOfOrderCount:int = 0

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
  // [WP-S1] `switch` 子句头（`case <表达式> :` / `default :`）：两族类名不同，**不能像 `for` 那样三挂**
  // ——`Take` 按 `constructor.name` 匹配，多挂的占位节点只会随 `consumed` 切片一起被挪出壳。
  else if (typeName === "CaseClauseShape") { made = new CaseClauseShape(template); }
  else if (typeName === "DefaultClauseShape") { made = new DefaultClauseShape(template); }
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
if (route === StatementRoute.ShellCaseClauseHead) {
  // [WP-S1] 子句头：`case` 与 `default` 的最终类名**不同**，各挂各的（见 `make` 的说明）。
  if (head instanceof Common) {
    const clauseText = (head as Common).TempToString();
    if (clauseText === "case") {
      make("CaseClauseShape");
    } else if (clauseText === "default") {
      make("DefaultClauseShape");
    }
  }
} else if (route === StatementRoute.ShellLabel) {
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
// [B0b:SHELLID] 给这个壳发身份号：**唯一分配点**。`Shells` / `ShellIds` / `Lists` 三个数组同下标，
// `Take` 按 `ShellIds[at]` 反查（见 `FindShellByIdentity`），不再依赖「栈顶就是本壳」。
StatementShellCatalog.NextShellId += 1;
const shellId = StatementShellCatalog.NextShellId;
(shell as any).ShellId = shellId;
StatementShellCatalog.Shells.push(shell);
StatementShellCatalog.ShellIds.push(shellId);
StatementShellCatalog.Lists.push(created);
```

## static method FindShellByIdentity:(built:Token)=>int

[B0b:SHELLID] identity = `(壳的 Pos, 占位节点的 legacy 类名)`，返回 `Shells` / `Lists` / `ShellIds`
里的下标，找不到返回 `-1`。

`Pos` 是语句起始位，壳与 legacy 节点**同一口径**：`Attach` 里 `made.Pos = 壳的 Pos`，而 legacy
`StatementBuilder.Finish` 用 `this.Positions[first]`（= 前一个非 trivia 单元的 `EndIndex`，见
`Load` 的 `Positions` 推法）。所以「同一条语句的壳」与「别的壳」在这里可分——**提前 push 的内层语句壳**
`Pos` 不同，不会命中。从栈顶往下扫：正常情况下最多一个壳命中。

```ts
const builtPos = (built as any).Pos as number;
if (typeof builtPos !== "number") {
  return -1;
}
const typeName = built.constructor.name;
const shells = StatementShellCatalog.Shells;
const lists = StatementShellCatalog.Lists;
for (let at = shells.length - 1; at >= 0; at--) {
  if (((shells[at] as any).Pos as number) !== builtPos) {
    continue;
  }
  for (const shape of lists[at]) {
    if (shape.constructor.name === typeName) {
      return at;
    }
  }
}
return -1;
```

## static method Take:(built:Token)=>Token | null

[B0b:SHELLID] 取壳判据从「`Lists` 栈顶 + 类名」改成「**身份优先**、栈顶只作兜底」：

1. `FindShellByIdentity(built)` 命中 ⇒ 用那个下标的壳（`ShellTakeByIdentityCount += 1`；下标不是栈顶时
   再 `ShellTakeOutOfOrderCount += 1`，这是「提前 push 的内层壳被排除」的**唯一**证据）；
2. 身份不命中 ⇒ 退回旧行为（只看栈顶 + 类名），命中则 `ShellTakeFallbackCount += 1`——**不静默降级**；
3. 两条都不命中 ⇒ `ShellTakeMissCount += 1` 并 `return null`（不动栈，等本壳自己收口）。

出栈用 `splice(at, 1)` 而不是 `pop()`：身份命中的壳不一定在栈顶。三个数组必须同下标地删。

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return null;
}
if (StatementShellCatalog.Lists.length === 0) {
  return null;
}
const typeName = built.constructor.name;
const top = StatementShellCatalog.Lists.length - 1;
// [B0b:SHELLID] 先按身份取壳，**不再默认栈顶**：栈顶可能是提前 push 的内层语句壳。
let at = StatementShellCatalog.FindShellByIdentity(built);
if (at >= 0) {
  StatementShellCatalog.ShellTakeByIdentityCount += 1;
  if (at !== top) {
    StatementShellCatalog.ShellTakeOutOfOrderCount += 1;
  }
} else {
  // 身份不命中 ⇒ 退回旧判据（只看栈顶 + 类名）。这条路径必须计数：静默走它等于把「按身份」降级。
  at = top;
  let fallbackHit = false;
  for (const shape of StatementShellCatalog.Lists[at]) {
    if (shape.constructor.name === typeName) {
      fallbackHit = true;
      break;
    }
  }
  if (!fallbackHit) {
    // 不是本壳的族（例如控制流壳里先收口的裸表达式语句）：不动栈，等本壳自己收口。
    StatementShellCatalog.ShellTakeMissCount += 1;
    return null;
  }
  StatementShellCatalog.ShellTakeFallbackCount += 1;
}
const list = StatementShellCatalog.Lists[at];
let matched:Token | null = null;
for (const shape of list) {
  if (shape.constructor.name === typeName) {
    matched = shape;
    break;
  }
}
if (matched === null) {
  // 防御：走到这里说明栈内三数组不同步，显式计数 + 不动栈（不静默弹错壳）。
  StatementShellCatalog.ShellTakeMissCount += 1;
  return null;
}
StatementShellCatalog.Shells.splice(at, 1);
StatementShellCatalog.ShellIds.splice(at, 1);
StatementShellCatalog.Lists.splice(at, 1);
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
