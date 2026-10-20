# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { ImportEqualsDeclarationShape } from "../declarations/import-equals-declaration-shape.xl.md"
import { TypeAliasDeclarationShape } from "../declarations/type-alias-declaration-shape.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { ExpressionStatementShape } from "../statements/expression-statement-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
```

# namespace cangjie

# class SourceFileEndPossibleShape extends PossibleShape

```txt
a
++b;
^ 换行这里上一条就到齐了
```

根单元的终结候选：认两种「这条语句到这里该结束了」。

- **EOF 哨兵**：`EndOfFileTokenShape` 关闭触发的那一次重算里 `Accept`；
- **ASI 边界**：换行之后到来的代码单元接不上前一条表达式时 `Accept`（判据由
  `ExpressionStatementPossibleShape.IsAsiBoundary` 给出，与普通候选**读同一个函数**）。

两种情况下普通候选（import / export / expression statement）都已在同一处 `Reject`，
所以 `Candidates == 0`，按 `CatalogGuide` 的契约由本候选结束这一条语句。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const current = units[tokenIndex];
if (current instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
if (ExpressionStatementPossibleShape.IsAsiBoundary(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

两条路各走各的：

- **ASI**：只把「换行处结束的那一条」按边界收尾建出来（不要求 `;`），根继续吃后面的单元；
- **EOF**：建最后一条等不到 `;` 的语句，签出根（`SyntaxContext.Process` 在最后一个真实位置已经签过一次，
  这里只在没签时补），关闭根。

```ts
const unit = host as UnitToken;
if (!(host.Data[tokenIndex] instanceof EndOfFileTokenShape)) {
  // ASI：当前代码单元接不上上一条表达式，上一条在换行处就结束了。
  let end = tokenIndex - 1;
  while (end >= 0 && host.Data[end].IsTriviaToken) {
    end--;
  }
  const asiStart = ItemUtil.ItemStart(host.Data);
  if (end >= asiStart && host.Data[end].IsBasicToken) {
    const built = ExpressionStatementShape.FromUnits(host, asiStart, end, context, false);
    host.Data.splice(asiStart, end - asiStart + 1, built);
    built.Parent = host;
  }
  return host;
}
let at = tokenIndex;
while (at >= 0 && (host.Data[at].IsTriviaToken || host.Data[at] instanceof EndOfFileTokenShape)) {
  at--;
}
const start = ItemUtil.ItemStart(host.Data);
if (at >= start && host.Data[at].IsBasicToken) {
  if (!SourceFileEndPossibleShape.BuildTrailingDeclaration(host, start, at, context)) {
    const built = ExpressionStatementShape.FromUnits(host, start, at, context, false);
    host.Data.splice(start, at - start + 1, built);
    built.Parent = host;
  }
}
let tail = host.Data.length - 1;
while (tail >= 0 && (host.Data[tail].IsTriviaToken || host.Data[tail] instanceof EndOfFileTokenShape)) {
  tail--;
}
if (tail >= 0 && unit.SourceRange.End === null) {
  const end = host.Data[tail].SourceRange.End;
  if (end !== null) {
    unit.SignOut(end);
  }
}
unit.TryToClose(context);
return host;
```

## private static method BuildTrailingDeclaration:(host:Token, start:int, at:int, context:SyntaxContext)=>bool

EOF 边界补一条「必须分号、但 ASI 允许省略分号」的声明：`type T = A` 与 `import x = require("m")`
（两者在 TS 里都能不带 `;` 收在文件末尾）。它们的 `FromUnits` 都要求 `tokenIndex` 落在 `;` 上，
所以这里在最后一个真实代码单元后面补一个**零宽合成 `Symbol ";"`**（`SignIn` / `SignOut` 用同一个
`End` 位置，`End.Index + 1` 正好是声明的右边界），再按正常入口建。

只认这两族：`type` 开头、或 `import <名字> = …`（`code[2]` 是 `=`）；其余返回 `false`，由调用方退回
`ExpressionStatementShape`。返回值 = 有没有建出来。

```ts
const code:Array<Token> = [];
for (let index = start; index <= at; index++) {
  if (!host.Data[index].IsTriviaToken) {
    code.push(host.Data[index]);
  }
}
if (code.length < 4) {
  return false;
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
const text = (head as Common).TempToString();
const isType = text === "type";
const isImportEquals = text === "import"
  && code.length >= 5
  && code[1] instanceof Common
  && code[2] instanceof Symbol
  && (code[2] as Symbol).Is("=");
if (!isType && !isImportEquals) {
  return false;
}
const lastEnd = host.Data[at].SourceRange.End;
if (lastEnd === null) {
  return false;
}
const semi = new Symbol(host.Template);
semi.SignIn(lastEnd);
semi.AppendValueAndSignOut(";", lastEnd);
host.Data.splice(at + 1, 0, semi);
if (isType) {
  const built = TypeAliasDeclarationShape.FromUnits(host, start, at + 1, context);
  host.Data.splice(start, at - start + 2, built);
  built.Parent = host;
  return true;
}
const imported = ImportEqualsDeclarationShape.FromUnits(host, start, at + 1, context);
host.Data.splice(start, at - start + 2, imported);
imported.Parent = host;
return true;
```

