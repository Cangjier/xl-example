# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { StatementScanResult, StatementScanner } from "../statements/statement-scanner.xl.md"
```

# namespace cangjie

语句族 item 的扫描状态机（WP-2）。

**阶段 1（本文件当前实现）**：状态机把「一条语句从起点到哪一格收口」表达成一条**显式状态**，
每个状态对应 `StatementScanner` 的一族判据（组号见表），`Run` 在**当前代码前缀**上调用那一族的
**同一个** `Scan*` 方法——判据仍然只有一份实现（在 `StatementScanner` 里），状态机只负责
「用哪一族、从哪里起步、收口点怎么映射回宿主下标」。

为什么不让状态机自己重写 `Scan*` 的判据：`ScanRoot` 的头分派里 `declare` / `const enum` /
`let [a] = b` / `using x` / `await using` 这些分支的**同一个头**会落到标签或表达式体，
判据依赖 `NextWord` / `NextChar` / `AtEOF`；在状态机里复制一份，等于第二套判据（INV-2 与本包禁令）。
因此阶段 1 用「状态号 = 族 + 入口下标」，族内判据单点调用；**逐 unit 直译（O(1)/unit）留给下一包**，
本节末尾写明接法。

状态号与前任交接 `impl-wp2/HANDOFF.wp2.md` 的 13 组映射表一一对应：

| 状态号 | 名字 | scanner 组 | 入口 `at` |
|---|---|---|---|
| 0 | StateBegin | 待判型 | — |
| 1 | Head | `ScanRoot`（首单元分派） | — |
| 2 | BodyHead | `ScanBody` | 保留 |
| 3 | DeclBody | `ScanDeclarationBody` | 保留 |
| 4 | Semi | `ScanToSemicolon` | 保留 |
| 5 | ReturnThrow | `ScanReturnOrThrow` | 0 |
| 6 | SimpleSemi | `ScanSimpleSemicolon` | 1 |
| 7 | BreakContinue | `ScanBreakOrContinue` | 1 |
| 8 | ExprBody | `ScanExpressionBody` | 保留 |
| 9 | IfHead | `ScanIf` | 0 |
| 10 | IfBody | `ScanBody`（if 体） | 保留 |
| 11 | IfElse | `ScanBody`（else 体） | 保留 |
| 12 | ForHead | `ScanFor` | 0 |
| 13 | LoopHead | `ScanLoop` | 0 |
| 14 | DoBody | `ScanDo` | 0 |
| 15 | DoWhile | `ScanDo` 内部 | 保留 |
| 16 | DoSemi | `ScanDo` 内部 | 保留 |
| 17 | TryBlock | `ScanTry` | 0 |
| 18 | CatchHead | `ScanCatch` 内部 | 保留 |
| 19 | CatchBody | `ScanCatch` 内部 | 保留 |
| 20 | FinallyHead | `ScanFinally` 内部 | 保留 |
| 21 | Done | 已收口 | — |

`保留` 的状态号已经分配但阶段 1 不单独进入：`if` 体 / `do` 体 / `try` 体内层由 `ScanIf` /
`ScanDo` / `ScanTry` 自己递归推进（同一次调用里完成），状态机只在**根/块内一条语句**这一层收口。
逐 unit 直译时这些状态才成为真正的驻留点（见本文末「下一包接法」）。

# class StatementItemScan

一条语句的扫描状态：`State` 是显式状态号，`Watermark` 是上次判定时的代码前缀长度（前缀没变就直接复用
`Result`，不重算），`PendingEnd` 是「已判定收口」时的 `Code` 下标（还没映射到宿主），`AtEof` 从
`ItemScanState.AtEof` 抄进来（G0：文档级事实）。

`Run` 只读 `code`（当前 item 的代码前缀）与 `AtEof`，不碰宿主、不建 AST、不改任何全局状态
（`StatementScanner.AtEOF` 保存-恢复）。

## static field StateBegin:int = 0

待判型。

## static field Head:int = 1

`ScanRoot`：首单元分派。

## static field BodyHead:int = 2

`ScanBody`（保留）。

## static field DeclBody:int = 3

`ScanDeclarationBody`（保留：`function` / `class` / `interface` / `enum` / `namespace` 等声明体）。

## static field Semi:int = 4

`ScanToSemicolon`（保留：变量 / `using` 声明）。

## static field ReturnThrow:int = 5

`ScanReturnOrThrow`。

## static field SimpleSemi:int = 6

`ScanSimpleSemicolon`（`debugger`）。

## static field BreakContinue:int = 7

`ScanBreakOrContinue`。

## static field ExprBody:int = 8

`ScanExpressionBody`（保留）。

## static field IfHead:int = 9

`ScanIf`。

## static field IfBody:int = 10

if 体（保留）。

## static field IfElse:int = 11

else 体（保留）。

## static field ForHead:int = 12

`ScanFor`。

## static field LoopHead:int = 13

`ScanLoop`（`while` / `switch` / `with`）。

## static field DoBody:int = 14

`ScanDo`。

## static field DoWhile:int = 15

do-while 条件头（保留）。

## static field DoSemi:int = 16

do-while 的 `;`（保留）。

## static field TryBlock:int = 17

`ScanTry`。

## static field CatchHead:int = 18

catch 头（保留）。

## static field CatchBody:int = 19

catch 体（保留）。

## static field FinallyHead:int = 20

finally 体（保留）。

## static field Done:int = 21

已收口。

## field AtEof:bool = false

文档是否已到末尾（由 `ItemRule.Analyze` 从 `ItemScanState.AtEof` 抄入）。

## field Watermark:int = -1

上次判定时的代码前缀长度。同一个前缀重复 `Analyze` 时直接返回 `Result`（lookahead 判定可重算，
但只在文档真的变了时才重算）。

## field State:int = 0

当前显式状态号（见上表）。

## field Entry:int = 0

当前族在 `code` 里的入口下标（`Scan*` 的 `at` 参数）。阶段 1 的族入口都是 0（`break` / `continue` /
`debugger` 的扫描从 1 开始，由状态机内部固定）。

## field PendingEnd:int = -1

已收口时最后一个代码单元在 `code` 里的下标（`StatementScanResult.End`）；未收口 `-1`。
规则侧用 `state.CodeAt[PendingEnd]` 映射成宿主下标。

## field Result:StatementScanResult = new StatementScanResult(0, -1)

最近一次判定的结果（`Status` 0/1/2，与 `StatementScanner` 同构）。

## method Run:(code:Array<Token>)=>StatementScanResult

在当前代码前缀上判定一次。前缀长度与上次相同 → 复用；否则按状态号选族、调用该族**同一个** `Scan*`。

**`AtEof` 的收窄（本文件的关键约定）**：`ItemScanState.AtEof` 是**文档级**事实（G0），而
`StatementScanner` 的 EOF 规则假设「本层已经没有后续内容」（旧路径里那个 `AtEOF` 是根级候选算出来的）。
一条 item 在容器中间时这两件事不同：`return` 后面还有 `i;`，文档却已到末尾——此时若把 `AtEof` 原样传进去，
`ScanReturnOrThrow` 会把裸 `return` 判成空 return（`return` + 无参）。因此这里把 `AtEof` **收窄**成
「文档到末尾 **且** 本 item 的最后一个代码单元就是容器的最后一个非 trivia 单元」（`AtContainerEnd`）。
收窄只可能把 `true` 变 `false`，所以「逐前缀 AtEof=(n===N)」的 oracle 对拍口径不变（n<N 时本来就是 false）。

```ts
if (this.Watermark === code.length && this.Result.Status !== 0) {
  return this.Result;
}
const previous = StatementScanner.AtEOF;
StatementScanner.AtEOF = this.AtEof && StatementItemScan.AtContainerEnd(code);
this.Watermark = code.length;
const result = this.Decide(code);
StatementScanner.AtEOF = previous;
this.Result = result;
if (result.Status === 1) {
  this.PendingEnd = result.End;
  this.State = StatementItemScan.Done;
} else {
  this.PendingEnd = -1;
}
return result;
```

## static method AtContainerEnd:(code:Array<Token>)=>bool

`code` 的最后一个代码单元是不是**容器**（`code[last].Parent`）的最后一个非 trivia 单元。
从容器 `Data` 的尾部向前找：先遇到 `last` → 到头（`true`）；先遇到别的非 trivia → 没到头（`false`）。
容器已 splice / 找不到 `last`（假宿主、测试里拷出来的 Data）时保守返回 `true`，与收窄前的行为一致。

```ts
if (code.length === 0) {
  return true;
}
const last = code[code.length - 1];
const host = last.Parent;
if (host === null) {
  return true;
}
const data = host.Data;
if (data === null || data === undefined || data.length === 0) {
  return true;
}
for (let at = data.length - 1; at >= 0; at--) {
  const unit = data[at];
  if (unit === last) {
    return true;
  }
  if (!unit.IsTriviaToken) {
    return false;
  }
}
return true;
```

## method Decide:(code:Array<Token>)=>StatementScanResult

按首单元选族。**只在本文件的头分派与 `ScanRoot` 逐字一致时才走显式族**（块 / 空语句 / `if` /
`while` / `switch` / `with` / `for` / `try` / `do` / `return` / `throw` / `break` / `continue` /
`debugger`——这些分支在 `ScanRoot` 里是**独占**的，不会落到标签或表达式体）；
其余头（`declare` / `const` / `var` / `let` / `using` / `await` / 标签 / 标识符起头）整条交回
`ScanRoot`，因为它们的判据本身依赖 lookahead 与 `AtEof`，复制就会分叉。

```ts
this.State = StatementItemScan.Head;
this.Entry = 0;
if (code.length === 0) {
  return StatementScanner.NeedMore();
}
const first = code[0];
if (first instanceof Bracket) {
  if ((first as Bracket).StartBracketChar === "{") {
    return StatementScanner.Complete(0);
  }
  return StatementScanner.Mismatch();
}
if (first instanceof Symbol) {
  if ((first as Symbol).Is(";")) {
    return StatementScanner.Complete(0);
  }
  return StatementScanner.Mismatch();
}
if (first instanceof Common) {
  const text = (first as Common).TempToString();
  if (text === "if") {
    this.State = StatementItemScan.IfHead;
    return StatementScanner.ScanIf(code, 0);
  }
  if (text === "while" || text === "switch" || text === "with") {
    this.State = StatementItemScan.LoopHead;
    return StatementScanner.ScanLoop(code, 0);
  }
  if (text === "for") {
    this.State = StatementItemScan.ForHead;
    return StatementScanner.ScanFor(code, 0);
  }
  if (text === "try") {
    this.State = StatementItemScan.TryBlock;
    return StatementScanner.ScanTry(code, 0);
  }
  if (text === "do") {
    this.State = StatementItemScan.DoBody;
    return StatementScanner.ScanDo(code, 0);
  }
  if (text === "return" || text === "throw") {
    this.State = StatementItemScan.ReturnThrow;
    return StatementScanner.ScanReturnOrThrow(code, 0);
  }
  if (text === "break" || text === "continue") {
    this.State = StatementItemScan.BreakContinue;
    return StatementScanner.ScanBreakOrContinue(code, 1);
  }
  if (text === "debugger") {
    this.State = StatementItemScan.SimpleSemi;
    return StatementScanner.ScanSimpleSemicolon(code, 1);
  }
}
return StatementScanner.ScanRoot(code);
```

## static method BasePos:(host:Token, start:int)=>int

item 第一个代码单元的位置口径（给 `StatementBuilder.Load` 的 `basePos`）：
`start` 之前最近一个非 trivia 单元的 `EndIndex`；前面什么都没有时用宿主起点 + 1
（与 `StatementBuilder.BuildBlock` 的初始 `basePos = bracket.SourceRange.StartIndex + 1` 同口径）。

```ts
if (start > 0) {
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      const previousEnd = host.Data[at].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        return previousEnd;
      }
      break;
    }
  }
}
if (host.SourceRange.StartIndex < 0) {
  return 0;
}
return host.SourceRange.StartIndex + 1;
```
