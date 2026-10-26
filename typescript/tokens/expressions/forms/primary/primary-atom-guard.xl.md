# dependencies
```xl
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class PrimaryAtomGuard

WP-A1 的**共享判据**：A1 的原子候选只负责「初始化器 = 一个原子（+ 已支持的续接）」这类形态。
`let x = y as T` / `let x = typeof y` / `let x = y = 1` 这类**以原子开头、但续接语法还没有候选消费**的
初始化器不在 A1/A1b 范围：如果 A1 候选在原子关闭时就建形状，后续续接单元会找不到候选，EOF 收口时要么多根
（显式 throw）、要么只剩半棵树（divergent）——两者都会让既有 `partial` case 漂移。

所以 A1 候选在 `IsBuildable` 里用两道闸门只对「这个原子是我覆盖的启动形态」放行：

1. **它是初始化器的第一个代码单元**：`units` 里在本格之前、最后一个非 trivia 单元必须是 `Symbol("=")`
   （`let/const/var` 声明的初始化器起点）。`typeof y` 的 `y`、`as` 后面的类型名都不满足。
2. **它后面是收口、或已被消费面接管的续接首字符**（WP-A1b 扩展）：
   - 收口：跳过空白 / 换行后是 EOF 或 `;`；
   - 带标签模板：标识符后面跟反引号（由 `TaggedTemplatePrimaryPossibleShape` 消费）；
   - **续接白名单** `PrimaryAtomGuard.ContinuationChars`：这些字符开头的续接已经有候选能**消费已建原子**
     （A2 的 `BinaryOperatorPossibleShape` 覆盖 `*`/`+` 之外的二元运算符、既有 `BinaryExpressionPossibleShape`
     覆盖 `*`/`+`、A2 扩展后的 `RightOperandPossibleShape.Catalog()` 覆盖标识符右操作数），所以原子可以提前物化。

两道闸门任一不满足 → `IsBuildable` 返回 `false`（`CatalogGuide` 继续 `Waiting`，**不建**），
让 EOF 收口走 `VariableDeclarationShape.FinishIncremental` 既有的 `ExpressionBuilder` 降级分支——
于是「还没有消费面的形态」逐字节保持原来的 `partial` 行为（零漂移），而不是被打成 throw/divergent。

**白名单为什么是这些字符（保守口径，逐条实测过）**：

| 字符 | 消费面（实测存在的候选） | 结论 |
| --- | --- | --- |
| `+` `*` | 既有 `BinaryExpressionPossibleShape` | 启用 |
| `-` `/` `%` `<` `>` `&` `\|` `^` | A2 `BinaryOperatorPossibleShape`（+ 右操作数标识符分支） | 启用 |
| `=` | 赋值走旧二元候选，会与 A1 的原子抢同一格（`let x = y = 1` 实测被打成 throw/divergent） | **不启用** |
| `!` `?` `:` | 前缀 / 条件 / 非空（条件与 update 归 A2b/A2c，尚无消费面） | **不启用** |
| `.` `(` `[` | 成员 / 调用 / 下标（A3 的 postfix 候选尚未合并） | **不启用** |
| `/` | 除号由 A2 在 `/` 那一格**就地物化**左操作数（A2 的 `IsBuildable` 兜底）；若 A1 提前建了标识符，`RegexToken` 的起点判据把「非 basic 的最后一个代码单元」当成语句边界 ⇒ `a/b` 会被重新切成正则（`bin-div` 实测 divergent），故 A1 在 `/` 前**不建**，由 A2 兜底 | **不启用** |
| `in` / `instanceof`（关键字续接） | A2 `BinaryOperatorPossibleShape` 的 `TextOf` 认这两个 `Common` 关键字；A1 建完标识符后由它在运算符那一格消费 | 启用（词级，见 `ContinuationWords`） |
| 反引号 | 带标签模板（`allowTemplate`，只对标识符候选开放） | 启用 |

**边界（有意保守）**：注释（`/* */`、`//`）不当作 trivia 跳过，遇到就判「不建」；
`,` `}` `)` 等收口符也不认（多声明 / 块内收口归 A6）。

## static field ContinuationChars:string = "+-*%<>&|^"

续接白名单（**字符级**）。只放「已有候选能消费已建原子」的运算符首字符；加字符前必须用 `--show` 实测
「该形态变 incremental 且不产生 divergent」。§A1b 报告里逐条记录了本次取舍（`/` `=` `!` `?` `.` `(` `[` 为什么排除）。

## static field ContinuationWords:Array<string> = ["in", "instanceof"]

续接白名单（**词级**）：空白之后以这些关键字开头的续接，A2 的二元候选能在关键字那一格消费已建原子
（`TextOf` 把 `in` / `instanceof` 当运算符文本）。`as` / `satisfies` 不在这里：它们目前没有候选消费，
A1 若提前建原子会让 EOF 收口退化成 divergent（实测），所以仍走降级分支。

## static method IsInitializerStart:(units:Array<Token>, tokenIndex:int)=>bool

本格是不是初始化器的第一个代码单元：往前找第一个非 trivia 单元，它必须是 `Symbol("=")`。

```ts
let at = tokenIndex - 1;
let previous = -1;
while (at >= 0) {
  if (!units[at].IsTriviaToken) {
    previous = at;
    break;
  }
  at--;
}
if (previous < 0) {
  return false;
}
const unit = units[previous];
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is("=");
```

## static method IsDivisionAfter:(unit:Token)=>bool

该单元之后是不是**除号**（而不是注释的开头）。`ComputeByIndex` 拿不到 `context`，A2 的「`/` 前让路」判据用它：
先找第一个非空白字符，必须是 `/`，且**紧挨着的下一个字符**不是 `/` 也不是 `*`（`//`、`/*` 是 trivia，不是除号）。

```ts
const document = SourceRange.CurrentDocument;
if (document === null) {
  return false;
}
const count = document.GetCount();
let at = unit.SourceRange.EndIndex;
if (at < 0) {
  return false;
}
while (at < count) {
  const ch = document.GetRaw(at, at + 1);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  if (ch !== "/") {
    return false;
  }
  const next = at + 1 < count ? document.GetRaw(at + 1, at + 2) : "";
  return next !== "/" && next !== "*";
}
return false;
```

## static method IsTerminalAfter:(unit:Token, context:SyntaxContext, allowTemplate:bool)=>bool

该单元之后是「收口」还是「已被消费面接管的续接」：EOF / `;` / 白名单字符 / 白名单词
（`allowTemplate` 时反引号也算）。

文档不可用（`context.CurrentDocument === null`）时**放行**：真实驱动链一定会设 `CurrentDocument`
（`SourceRange.CurrentDocument` 同源），探针若没设也只是「多建了」，不会把目标 case 判错。

```ts
const document = context.CurrentDocument;
if (document === null) {
  return true;
}
const count = document.GetCount();
let at = unit.SourceRange.EndIndex;
if (at < 0) {
  return false;
}
while (at < count) {
  const ch = document.GetRaw(at, at + 1);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  if (ch === ";") {
    return true;
  }
  if (allowTemplate && ch === "`") {
    return true;
  }
  if (PrimaryAtomGuard.ContinuationChars.includes(ch)) {
    return true;
  }
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
    let end = at;
    let word = "";
    while (end < count) {
      const inner = document.GetRaw(end, end + 1);
      if (!((inner >= "a" && inner <= "z") || (inner >= "A" && inner <= "Z"))) {
        break;
      }
      word += inner;
      end += 1;
    }
    return PrimaryAtomGuard.ContinuationWords.includes(word);
  }
  return false;
}
return true;
```

## static method IsLoneAtom:(units:Array<Token>, tokenIndex:int, context:SyntaxContext, allowTemplate:bool)=>bool

两道闸门的合取：初始化器第一个代码单元 + 之后只剩收口。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!PrimaryAtomGuard.IsInitializerStart(units, tokenIndex)) {
  return false;
}
return PrimaryAtomGuard.IsTerminalAfter(unit, context, allowTemplate);
```
