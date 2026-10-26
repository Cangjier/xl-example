# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { BodyGuideUtil } from "./body-guide-util.xl.md"
import { FunctionDeclarationShape } from "./function-declaration-shape.xl.md"
```

# namespace cangjie

```txt
function f() { }
             ^ 函数体闭合
function f(a: A): B;
                   ^ 无体声明在分号处结束
```

`FunctionDeclarationShape` 的**终结候选**（WP-B3b；照 `ClassDeclarationEndPossibleShape` 的同一模式）。
声明关键字格由 `FunctionDeclarationPossibleShape` 提前 `MountShell` 挂出壳，本候选在壳的 `CatalogGuide`
里回答「声明到哪里算结束」，然后在收口时用**同一批 legacy 建树函数**
（`FunctionDeclarationShape.FromUnits`）把壳里的 raw 单元建成 `FunctionDeclarationShape`，
再由 `BodyGuideUtil.FinishShell` 换回父单元 —— EOF 树因此与 legacy 逐节点一致。

与 class 的差别只有两处：

1. class 一定有类体 `{}`；function 可能是**无体声明**（`function f(): void;` / `declare function f(): void;`），
   所以 `;` 也是合法终点，且没有体的那种要按 `ambient` 口径建树（`FromUnits` 的第 5 个参数）；
2. `{` 只有是**函数体**时才算终点 —— 返回类型里的对象字面量（`function f(): { a: A }`）不能提前收口，
   判据用 `TypeBuilder.IsBodyBrace`（与 legacy 建树同一条）。

# class FunctionDeclarationEndPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

终点判据（任一成立即 `Accept`）：

- 已闭合的函数体 `{`（且 `TypeBuilder.IsBodyBrace` 认定它是体、不是返回类型里的对象字面量）；
- 已闭合的 `;`（`declare function f(): void;` / 重载签名 `function f(a: A): B;`）；
- EOF 哨兵（无分号的 ambient 声明）。

其余一律 `Reject`（壳继续等单元）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{" && (unit as Bracket).Closed) {
  if (TypeBuilder.IsBodyBrace(units, tokenIndex)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
if (unit instanceof Symbol && (unit as Symbol).Is(";") && unit.Closed) {
  return ShapeStates.Accept;
}
if (unit instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

收口：把壳里的 raw 单元按 **legacy 同一批函数**建成 `FunctionDeclarationShape`，再换回父单元。

- 用 `shell` 当 `host` 调 `FromUnits`（壳的 `Data` 就是 `[function, …, 体/分号]`）；
- `ambient = 没有函数体`：无体声明（declare / 重载）按 ambient 口径放行「没有体也没有分号」的成员形；
- `fallbackPos = shell.Pos`：`FromUnits` 的 `Pos` 回扫在 `start === 0` 时扫不到前一格，用壳 `Pos` 兜底，
  与 legacy 的「前一个非 trivia 单元 `EndIndex`」逐位一致；
- EOF 哨兵不算代码单元（从 `code` 尾巴剥掉）。

```ts
const shell = host as FunctionDeclarationShape;
let lastCode = shell.Data.length - 1;
while (lastCode >= 0) {
  const candidate = shell.Data[lastCode];
  if (candidate.IsTriviaToken || candidate instanceof EndOfFileTokenShape) {
    lastCode--;
    continue;
  }
  break;
}
if (lastCode < 0) {
  return shell;
}
let hasBody = false;
for (let at = 0; at <= lastCode; at++) {
  const candidate = shell.Data[at];
  if (candidate instanceof Bracket && (candidate as Bracket).StartBracketChar === "{" && (candidate as Bracket).Closed) {
    hasBody = true;
    break;
  }
}
const built = FunctionDeclarationShape.FromUnits(shell, 0, lastCode, context, !hasBody, false, shell.Pos);
BodyGuideUtil.FinishShell(host, shell, built);
return built;
```
