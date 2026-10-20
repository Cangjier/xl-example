# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { ImportEqualsDeclarationShape } from "../declarations/import-equals-declaration-shape.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
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

只认四族：`type` 开头、`import <名字> = …`（`code[2]` 是 `=`）、函数声明（`declare function …` /
重载签名 `function …`，无体时最后一块是 `;`；有体时最后一块是 `{`）、以及紧邻的 `class … {}`。
其余返回 `false`，由调用方退回 `ExpressionStatementShape`。返回值 = 有没有建出来。

**多条无分号声明连排**：在 EOF 落下来的 leftovers 可能含多条（`declare function f(): void\ndeclare function g(): void`）。
这里先找**最后一个换行处开始的声明**，把前面那段递归建掉（建不出来就按 `ExpressionStatement(…, false)` 收尾），
再递归建最后一段——于是每条声明各得一个节点，和 TS 的 ASI 结果一致。

```ts
const code:Array<Token> = [];
const codeAt:Array<number> = [];
for (let index = start; index <= at; index++) {
  if (!host.Data[index].IsTriviaToken) {
    code.push(host.Data[index]);
    codeAt.push(index);
  }
}
if (code.length < 3) {
  return false;
}
// 多条声明连排：最后一条的起点 = 最后一个「换行之后出现的声明起点」。
let boundary = -1;
for (let index = 1; index < code.length; index++) {
  const unit = code[index];
  if (!(unit instanceof Common)) {
    continue;
  }
  const unitText = (unit as Common).TempToString();
  if (!(unitText === "declare" || unitText === "function" || unitText === "type" || unitText === "import" || unitText === "class")) {
    continue;
  }
  let lineBreak = false;
  for (let gap = codeAt[index - 1] + 1; gap < codeAt[index]; gap++) {
    if (ExpressionStatementPossibleShape.HasLineBreak(host.Data[gap])) {
      lineBreak = true;
      break;
    }
  }
  if (lineBreak) {
    boundary = index;
  }
}
if (boundary > 0) {
  const prefixEnd = codeAt[boundary - 1];
  if (!SourceFileEndPossibleShape.BuildTrailingDeclaration(host, start, prefixEnd, context)) {
    const prefix = ExpressionStatementShape.FromUnits(host, start, prefixEnd, context, false);
    host.Data.splice(start, prefixEnd - start + 1, prefix);
    prefix.Parent = host;
  }
  return SourceFileEndPossibleShape.BuildTrailingDeclaration(host, start + 1, at + start - prefixEnd, context);
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
const text = (head as Common).TempToString();
const lastUnit = code[code.length - 1];
// 紧邻的 class 声明（体是闭合括号单元，`tokenIndex` 落在 `}` 上）。
if (text === "class" && lastUnit instanceof Bracket && (lastUnit as Bracket).StartBracketChar === "{") {
  const klass = ClassDeclarationShape.FromUnits(host, start, at, context);
  host.Data.splice(start, at - start + 1, klass);
  klass.Parent = host;
  return true;
}
const isType = text === "type";
const isImportEquals = text === "import"
  && code.length >= 5
  && code[1] instanceof Common
  && code[2] instanceof Symbol
  && (code[2] as Symbol).Is("=");
// 函数声明：无体时最后一块是 `;`（补合成 `;`），有体时最后一块是 `{`（直接 FromUnits）。
const isFunction = text === "function"
  || (text === "declare" && code.length >= 4 && code[1] instanceof Common && (code[1] as Common).Is("function"));
if (!isType && !isImportEquals && !isFunction) {
  return false;
}
if (isFunction && lastUnit instanceof Bracket && (lastUnit as Bracket).StartBracketChar === "{") {
  const declared = FunctionDeclarationShape.FromUnits(host, start, at, context);
  host.Data.splice(start, at - start + 1, declared);
  declared.Parent = host;
  return true;
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
if (isImportEquals) {
  const imported = ImportEqualsDeclarationShape.FromUnits(host, start, at + 1, context);
  host.Data.splice(start, at - start + 2, imported);
  imported.Parent = host;
  return true;
}
const declared = FunctionDeclarationShape.FromUnits(host, start, at + 1, context);
host.Data.splice(start, at - start + 2, declared);
declared.Parent = host;
return true;
```

