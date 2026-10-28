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

## static field Shells:Array<Token> = []

## static field Lists:Array<Array<Token>> = []

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
