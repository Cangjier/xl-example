# dependencies
```xl
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class PrimaryAtomGuard

WP-A1 的**共享判据**：A1 的原子候选只负责「初始化器 = 一个原子」这一种形态。`let x = y as T` /
`let x = typeof y` / `let x = y = 1` 这类**以原子开头、但后面还有续接语法**的初始化器不在 A1 范围
（归 A2/A3/A5/A6）：如果 A1 候选在原子关闭时就建形状，后续续接单元会找不到候选，EOF 收口时要么多根
（显式 throw）、要么只剩半棵树（divergent）——两者都会让既有 `partial` case 漂移。

所以 A1 候选在 `IsBuildable` 里用两道闸门**只对「整个初始化器就是这个原子」放行**：

1. **它是初始化器的第一个代码单元**：`units` 里在本格之前、最后一个非 trivia 单元必须是 `Symbol("=")`
   （`let/const/var` 声明的初始化器起点）。`typeof y` 的 `y`、`as` 后面的类型名都不满足。
2. **它后面只剩收口**：从该单元 `EndIndex` 往后看源码，跳过空白 / 换行，第一个非空白字符是 EOF 或 `;`
   （或显式允许的反引号——带标签模板的标签后面必须跟模板，由 `TaggedTemplatePrimaryPossibleShape` 消费）。

两道闸门任一不满足 → `IsBuildable` 返回 `false`（`CatalogGuide` 继续 `Waiting`，**不建**），
让 EOF 收口走 `VariableDeclarationShape.FinishIncremental` 既有的 `ExpressionBuilder` 降级分支——
于是「A1 不覆盖的形态」逐字节保持原来的 `partial` 行为（零漂移），而不是被打成 throw/divergent。

**边界（有意保守）**：注释（`/* */`、`//`）不当作 trivia 跳过，遇到就判「不建」（这些形态本来也不在 A1 目标里）；
`;` 与 EOF 之外的收口符（`,` `}` `)`）也一律判「不建」（多声明 / 块内收口归 A6）。

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

## static method IsTerminalAfter:(unit:Token, context:SyntaxContext, allowTemplate:bool)=>bool

该单元之后是不是只剩收口（EOF / `;`；`allowTemplate` 时反引号也算）。

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
