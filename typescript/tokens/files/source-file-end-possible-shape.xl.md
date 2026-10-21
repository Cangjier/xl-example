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
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { ImportEqualsDeclarationShape } from "../declarations/import-equals-declaration-shape.xl.md"
import { ImportDeclarationShape } from "../declarations/import-declaration-shape.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { ExportAssignmentShape } from "../declarations/export-assignment-shape.xl.md"
import { ExportDeclarationShape } from "../declarations/export-declaration-shape.xl.md"
import { InterfaceDeclarationShape } from "../declarations/interface-declaration-shape.xl.md"
import { TypeAliasDeclarationShape } from "../declarations/type-alias-declaration-shape.xl.md"
import { ModuleDeclarationShape } from "../declarations/module-declaration-shape.xl.md"
import { EnumDeclarationShape } from "../declarations/enum-declaration-shape.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { ExpressionStatementShape } from "../statements/expression-statement-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
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
  // 前导装饰器属于**下一条声明**，不是换行处结束的表达式语句：`@dec\nclass C {}`。
  // 类候选还在吃这串装饰器时，终结候选不许 Accept，否则 CatalogGuide 会报「终结候选与其它候选同时成立」。
  if (SourceFileEndPossibleShape.HasDecoratorPrefix(units, tokenIndex)) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## static method HasDecoratorPrefix:(units:Array<Token>, tokenIndex:int)=>bool

自 `tokenIndex` 往前看：这段开头的代码单元是否属于**装饰器前缀**（`@dec` / `@dec()` / `@a @b` / `@a.b`）。
是的话 `tokenIndex` 处不是一条表达式语句的结尾，而是带装饰器声明的内部——终结候选不许把它当 ASI 边界。

做法：从 `tokenIndex` 前一个代码单元起往回走，把「`.` / Common / `(…)` 括号单元」当成装饰器表达式的一部分，
碰到 `@` 就成立；碰到别的（`;` / `}` / 二元运算符等）就说明不是装饰器前缀。

```ts
const start = ItemUtil.ItemStart(units);
let at = tokenIndex - 1;
while (at >= start && units[at].IsTriviaToken) {
  at--;
}
for (let index = at; index >= start; index--) {
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
    return true;
  }
  if (unit instanceof Common) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(".")) {
    continue;
  }
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
    continue;
  }
  return false;
}
return false;
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
if (code.length < 2) {
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
  if (!(unitText === "declare" || unitText === "function" || unitText === "type" || unitText === "import" || unitText === "export" || unitText === "class" || unitText === "interface"
    || unitText === "enum" || unitText === "namespace" || unitText === "module" || unitText === "global" || unitText === "abstract"
    || unitText === "const" || unitText === "let" || unitText === "var" || unitText === "using")) {
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
  // 前缀可能建出多条声明（它自己也会继续拆）：splice 进来的是非 basic 的形状 token，
  // 形状之间还可能夹 trivia，所以「后缀起点」必须跳过所有 trivia **和已建形状**，直到下一个 basic 单元。
  let cursor = start;
  while (cursor < host.Data.length
    && (host.Data[cursor].IsTriviaToken || !host.Data[cursor].IsBasicToken)) {
    cursor++;
  }
  // 后缀终点不能用「前缀消费了几个原单元」的算术：前缀若走无体签名/type/import 的路径，
  // BuildTrailingDeclaration 内部会先插一个零宽合成 `;` 再 splice（净删 C+1 个槽位、换回 1 条形状），
  // 原来 `at + inserted - (prefixEnd - start + 1)` 会偏一格，递归的第二个边界就落到合成形状上。
  // 后缀自己的单元（含其间 trivia）在 splice 后是连续平移的，所以用「后缀起点 + 相对长度」直接定位。
  const suffixAt = cursor + (at - codeAt[boundary]);
  // 后缀自己也可能建不出来：整条返回 false 会让调用方拿**已经 splice 过**的旧下标来兜底
  // （`已建前缀 + export 子句` 就是这样越界读到 undefined 的）。所以后缀先内部兜底成表达式语句。
  const suffixBuilt = SourceFileEndPossibleShape.BuildTrailingDeclaration(host, cursor, suffixAt, context);
  if (!suffixBuilt) {
    const suffix = ExpressionStatementShape.FromUnits(host, cursor, suffixAt, context, false);
    host.Data.splice(cursor, suffixAt - cursor + 1, suffix);
    suffix.Parent = host;
  }
  return true;
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
const text = (head as Common).TempToString();
const lastUnit = code[code.length - 1];
// 变量语句（`const/let/var/using` 开头，或 ambient 的 `declare const/let/var` 开头）：
// EOF 时 statement 候选按 stopAtEof 主动退让（避免与终结候选同时成立），由这里用
// StatementBuilder 按正常语句路径补建——declare 修饰与 DeclareKeyword 子节点都由它负责。
const isVariableKeyword = text === "let" || text === "const" || text === "var" || text === "using";
const isDeclareVariable = text === "declare"
  && code.length >= 2
  && code[1] instanceof Common
  && ((code[1] as Common).Is("let") || (code[1] as Common).Is("const")
    || (code[1] as Common).Is("var") || (code[1] as Common).Is("using"));
if (isVariableKeyword || isDeclareVariable) {
  let basePos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.End;
      if (previousEnd !== null) {
        basePos = previousEnd.Index + 1;
      }
      break;
    }
  }
  const builder = new StatementBuilder(host.Template, context);
  builder.Load(host.Data.slice(start, at + 1), basePos);
  const statement = builder.BuildStatement();
  host.Data.splice(start, at - start + 1, statement);
  statement.Parent = host;
  return true;
}
// 紧邻的 class / interface 声明（体是闭合括号单元，tokenIndex 落在 `}` 上）；允许前置 declare。
// `export const x = 1` 鏃犲垎鍙峰埌 EOF锛氬厛渚?StatementBuilder 鎸夊彉閲忚鍙ュ缓锛屽啀鎶?ExportKeyword 鎻掑埌 Data 鏈€鍓嶃€?
const isExportVariable = text === "export"
  && code.length >= 3
  && code[1] instanceof Common
  && ((code[1] as Common).Is("const") || (code[1] as Common).Is("let")
    || (code[1] as Common).Is("var") || (code[1] as Common).Is("using")
    || ((code[1] as Common).Is("declare") && code.length >= 4 && code[2] instanceof Common
      && ((code[2] as Common).Is("const") || (code[2] as Common).Is("let")
        || (code[2] as Common).Is("var") || (code[2] as Common).Is("using"))));
if (isExportVariable) {
  let basePos = 0;
  let pos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.End;
      if (previousEnd !== null) {
        pos = previousEnd.Index + 1;
      }
      break;
    }
  }
  const exportEnd = code[0].SourceRange.End;
  basePos = exportEnd === null ? pos : exportEnd.Index + 1;
  const builder = new StatementBuilder(host.Template, context);
  builder.Load(host.Data.slice(codeAt[1], at + 1), basePos);
  const statement = builder.BuildStatement();
  const exportKeyword = ExportKeywordShape.FromBasicToken(code[0] as Common, context);
  (exportKeyword as ShapeToken).Pos = pos;
  statement.Data.unshift(exportKeyword);
  exportKeyword.Parent = statement;
  (statement as ShapeToken).Pos = pos;
  host.Data.splice(start, at - start + 1, statement);
  statement.Parent = host;
  return true;
}
// `export class C {…}` / `export interface I {…}` / `export [declare] namespace N {…}`
// 无分号到 EOF：体是闭合 `}` 括号；从 export 之后那一格建声明，再把 ExportKeyword 插回 Data 最前。
if (text === "export" && code.length >= 4 && code[1] instanceof Common && lastUnit instanceof Bracket
  && (lastUnit as Bracket).StartBracketChar === "{" && TypeBuilder.IsBodyBrace(code, code.length - 1)) {
  // 跳过 export 之后的修饰词（declare / abstract / async）找到声明词；
  // 但建树起点要留在第一个修饰词上（DeclareKeyword / AbstractKeyword 是 TS 的 children）。
  let keywordOffset = 1;
  while (keywordOffset < code.length && code[keywordOffset] instanceof Common) {
    const modifierText = (code[keywordOffset] as Common).TempToString();
    if (modifierText === "declare" || modifierText === "abstract" || modifierText === "async") {
      keywordOffset++;
      continue;
    }
    break;
  }
  const keywordText = keywordOffset < code.length && code[keywordOffset] instanceof Common
    ? (code[keywordOffset] as Common).TempToString() : "";
  if (keywordText === "class" || keywordText === "interface"
    || keywordText === "namespace" || keywordText === "module" || keywordText === "global") {
    let pos = 0;
    for (let index = start - 1; index >= 0; index--) {
      if (!host.Data[index].IsTriviaToken) {
        const previousEnd = host.Data[index].SourceRange.End;
        if (previousEnd !== null) {
          pos = previousEnd.Index + 1;
        }
        break;
      }
    }
    let declared:ShapeToken;
    if (keywordText === "class") {
      declared = ClassDeclarationShape.FromUnits(host, codeAt[1], at, context) as ShapeToken;
    } else if (keywordText === "interface") {
      declared = InterfaceDeclarationShape.FromUnits(host, codeAt[1], at, context) as ShapeToken;
    } else {
      // namespace / module / global：ModuleDeclarationShape.FromUnits 要 code + positions 两个数组，
      // 且它自己会处理开头的 export / declare 修饰词，所以从 export 开始切。
      const subCode:Array<Token> = [];
      const subPositions:Array<number> = [];
      let subPos = pos;
      for (let index = start; index <= at; index++) {
        const unit = host.Data[index];
        if (unit.IsTriviaToken) {
          continue;
        }
        subCode.push(unit);
        subPositions.push(subPos);
        if (unit.SourceRange.End !== null) {
          subPos = unit.SourceRange.End.Index + 1;
        }
      }
      declared = ModuleDeclarationShape.FromUnits(subCode, subPositions, context) as ShapeToken;
    }
    const exportKeyword = ExportKeywordShape.FromBasicToken(code[0] as Common, context);
    (exportKeyword as ShapeToken).Pos = pos;
    if (keywordText !== "namespace" && keywordText !== "module" && keywordText !== "global") {
      declared.Data.unshift(exportKeyword);
      exportKeyword.Parent = declared;
    }
    (declared as ShapeToken).Pos = pos;
    host.Data.splice(start, at - start + 1, declared);
    declared.Parent = host;
    return true;
  }
}
// `export default 1` 鏃犲垎鍙峰埌 EOF锛欳hildren 鍙湁琛ㄨ揪寮忥紙TS 涓?export/default 閮戒笉鏄妭鐐癸級鎴栧悕绉般€?
const isExportDefault = text === "export"
  && code.length >= 3
  && code[1] instanceof Common
  && (code[1] as Common).Is("default");
if (isExportDefault) {
  let pos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.End;
      if (previousEnd !== null) {
        pos = previousEnd.Index + 1;
      }
      break;
    }
  }
  const defaultEnd = code[1].SourceRange.End;
  const basePos = defaultEnd === null ? pos : defaultEnd.Index + 1;
  const builder = new ExpressionBuilder(host.Template, context);
  builder.Load(host.Data.slice(codeAt[2], at + 1), basePos);
  const expression = builder.ParseExpression();
  const assignment = new ExportAssignmentShape(host.Template);
  assignment.Expression = expression;
  assignment.Data.push(expression);
  expression.Parent = assignment;
  (assignment as ShapeToken).Pos = pos;
  if (code[0].SourceRange.Start !== null) {
    assignment.SignIn(code[0].SourceRange.Start);
  }
  const expressionEnd = code[code.length - 1].SourceRange.End;
  if (expressionEnd !== null) {
    assignment.SignOut(expressionEnd);
  }
  host.Data.splice(start, at - start + 1, assignment);
  assignment.Parent = host;
  return true;
}
// `export = 1` 无分号到 EOF：与 `export default 1` 同族（都是 ExportAssignment，children 只有表达式），
// 区别只在 `export` 后面跟的是 `=`。`End` 由形状取最后一个代码单元。
const isExportEquals = text === "export"
  && code.length >= 3
  && code[1] instanceof Symbol
  && (code[1] as Symbol).Is("=");
if (isExportEquals) {
  const assignment = ExportAssignmentShape.FromUnits(host, start, at, context, false);
  host.Data.splice(start, at - start + 1, assignment);
  assignment.Parent = host;
  return true;
}
const isClass = text === "class"
  || (text === "declare" && code.length >= 3 && code[1] instanceof Common && (code[1] as Common).Is("class"));
const isInterface = text === "interface"
  || (text === "declare" && code.length >= 3 && code[1] instanceof Common && (code[1] as Common).Is("interface"));
const isEnum = text === "enum"
  || (text === "declare" && code.length >= 3 && code[1] instanceof Common && (code[1] as Common).Is("enum"));
const isModuleDecl = text === "namespace" || text === "module" || text === "global"
  || (text === "declare" && code.length >= 3 && code[1] instanceof Common
    && ((code[1] as Common).Is("namespace") || (code[1] as Common).Is("module")
      || (code[1] as Common).Is("global")));
if ((isClass || isInterface || isEnum || isModuleDecl)
  && lastUnit instanceof Bracket && (lastUnit as Bracket).StartBracketChar === "{") {
  if (isClass) {
    const klass = ClassDeclarationShape.FromUnits(host, start, at, context);
    host.Data.splice(start, at - start + 1, klass);
    klass.Parent = host;
    return true;
  }
  if (isInterface) {
    const iface = InterfaceDeclarationShape.FromUnits(host, start, at, context);
    host.Data.splice(start, at - start + 1, iface);
    iface.Parent = host;
    return true;
  }
  if (isEnum) {
    const enumShape = EnumDeclarationShape.FromUnits(host, start, at, context);
    host.Data.splice(start, at - start + 1, enumShape);
    enumShape.Parent = host;
    return true;
  }
  // namespace / module / global：ModuleDeclarationShape.FromUnits 要 code + positions 两个数组。
  const subCode:Array<Token> = [];
  const subPositions:Array<number> = [];
  let noSemiPos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.End;
      if (previousEnd !== null) {
        noSemiPos = previousEnd.Index + 1;
      }
      break;
    }
  }
  for (let index = start; index <= at; index++) {
    const unit = host.Data[index];
    if (unit.IsTriviaToken) {
      continue;
    }
    subCode.push(unit);
    subPositions.push(noSemiPos);
    if (unit.SourceRange.End !== null) {
      noSemiPos = unit.SourceRange.End.Index + 1;
    }
  }
  const moduleShape = ModuleDeclarationShape.FromUnits(subCode, subPositions, context);
  host.Data.splice(start, at - start + 1, moduleShape);
  moduleShape.Parent = host;
  return true;
}
// `export type T = A` 也走类型别名族（TypeAliasDeclarationShape 已接受 export 前缀），
// 于是 `export type T = A` 无分号到 EOF 能靠合成 `;` 建出来。
const isExportType = text === "export"
  && code.length >= 3
  && code[1] instanceof Common
  && (code[1] as Common).Is("type");
// `declare type T = A` 无分号到 EOF：TypeAliasDeclarationShape.FromUnits 已接受 declare 前缀。
const isDeclareType = text === "declare"
  && code.length >= 3
  && code[1] instanceof Common
  && (code[1] as Common).Is("type");
const isExportDeclareType = text === "export"
  && code.length >= 4
  && code[1] instanceof Common && (code[1] as Common).Is("declare")
  && code[2] instanceof Common && (code[2] as Common).Is("type");
const isType = text === "type" || isExportType || isDeclareType || isExportDeclareType;
const isImportEquals = text === "import"
  && code.length >= 5
  && code[1] instanceof Common
  && code[2] instanceof Symbol
  && (code[2] as Symbol).Is("=");
// `import … from "m"`（含 import type / 具名 / 命名空间 / 副作用）无分号到 EOF：
// ImportDeclarationShape 有 FromUnits，末尾要求 `;`，这里补零宽合成 `;` 走它。
const isImportClause = text === "import" && !isImportEquals;
// 函数声明：无体时最后一块是 `;`（补合成 `;`），有体时最后一块是 `{`（直接 FromUnits）。
const isFunction = text === "function"
  || (text === "declare" && code.length >= 4 && code[1] instanceof Common && (code[1] as Common).Is("function"));
// `export function …` / `export declare function …` / `export async function …`：
// FunctionDeclarationShape.FromUnits 只认 declare/async 前缀、不认 export，所以从 export 之后那一格建，
// 再把 ExportKeyword 插到 Data 最前面（与 isExportVariable 同款）。没有这一支，`export declare function f(): B`
// 无分号到 EOF 会落进 ExpressionStatement，报「表达式语句没有读完」。
let exportFunctionStart = -1;
if (text === "export" && code.length >= 4 && code[1] instanceof Common) {
  const secondText = (code[1] as Common).TempToString();
  if (secondText === "function") {
    // `export function …`
    exportFunctionStart = codeAt[1];
  } else if (secondText === "async" && code.length >= 5 && code[2] instanceof Common
    && (code[2] as Common).Is("function")) {
    // `export async function …`：从 async 起（FromUnits 建 AsyncKeyword 子节点）。
    exportFunctionStart = codeAt[1];
  } else if (secondText === "declare") {
    // `export declare function …` / `export declare async function …`：从 declare 起，
    // FromUnits 才能建出 DeclareKeyword 子节点。
    if (code.length >= 5 && code[2] instanceof Common && (code[2] as Common).Is("function")) {
      exportFunctionStart = codeAt[1];
    } else if (code.length >= 6 && code[2] instanceof Common && (code[2] as Common).Is("async")
      && code[3] instanceof Common && (code[3] as Common).Is("function")) {
      exportFunctionStart = codeAt[1];
    }
  }
}
const isExportFunction = exportFunctionStart >= 0;
// 其余 `export …` 形式（`export { a }` / `export * from "m"` / `export type { T }` 等）：
// 走 ExportDeclarationShape.FromUnits + 合成 `;`，在下面 isType/isImportEquals/isExportFunction 之后兜底。
const isExportClause = text === "export";
if (!isType && !isImportEquals && !isImportClause && !isFunction && !isExportFunction && !isExportClause) {
  return false;
}
if ((isFunction || isExportFunction) && lastUnit instanceof Bracket && (lastUnit as Bracket).StartBracketChar === "{"
  && TypeBuilder.IsBodyBrace(code, code.length - 1)) {
  const functionStart = isExportFunction ? exportFunctionStart : start;
  const declared = FunctionDeclarationShape.FromUnits(host, functionStart, at, context);
  if (isExportFunction) {
    let pos = 0;
    for (let index = start - 1; index >= 0; index--) {
      if (!host.Data[index].IsTriviaToken) {
        const previousEnd = host.Data[index].SourceRange.End;
        if (previousEnd !== null) {
          pos = previousEnd.Index + 1;
        }
        break;
      }
    }
    const exportKeyword = ExportKeywordShape.FromBasicToken(code[0] as Common, context);
    (exportKeyword as ShapeToken).Pos = pos;
    declared.Data.unshift(exportKeyword);
    exportKeyword.Parent = declared;
    (declared as ShapeToken).Pos = pos;
  }
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
if (isImportClause) {
  try {
    const imported = ImportDeclarationShape.FromUnits(host, start, at + 1, context);
    host.Data.splice(start, at - start + 2, imported);
    imported.Parent = host;
    return true;
  } catch (error) {
    host.Data.splice(at + 1, 1);
    return false;
  }
}
if (isExportFunction) {
  const exported = FunctionDeclarationShape.FromUnits(host, exportFunctionStart, at + 1, context);
  let pos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.End;
      if (previousEnd !== null) {
        pos = previousEnd.Index + 1;
      }
      break;
    }
  }
  const exportKeyword = ExportKeywordShape.FromBasicToken(code[0] as Common, context);
  (exportKeyword as ShapeToken).Pos = pos;
  exported.Data.unshift(exportKeyword);
  exportKeyword.Parent = exported;
  (exported as ShapeToken).Pos = pos;
  host.Data.splice(start, at - start + 2, exported);
  exported.Parent = host;
  return true;
}
if (isExportClause) {
  // `export { a }` / `export * from "m"` 无分号到 EOF：ExportDeclarationShape 自己的入口要求末尾 `;`，
  // 这里用已插入的合成 `;` 走正常路径；建不出来就撤掉合成 `;` 并让调用方退回表达式兜底。
  try {
    const built = ExportDeclarationShape.FromUnits(host, start, at + 1, context);
    host.Data.splice(start, at - start + 2, built);
    built.Parent = host;
    return true;
  } catch (error) {
    host.Data.splice(at + 1, 1);
    return false;
  }
}
const declared = FunctionDeclarationShape.FromUnits(host, start, at + 1, context);
host.Data.splice(start, at - start + 2, declared);
declared.Parent = host;
return true;
```

