# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { QualifiedNameShape } from "../types/qualified-name-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { ExternalModuleReferenceShape } from "./external-module-reference-shape.xl.md"
import { DeclarationSpan } from "../items/module-item-rule.xl.md"
```

# namespace cangjie

# class ImportEqualsDeclarationShape extends ShapeToken

```txt
import x = require("m");
import x = A.B.C;
```

measurement 载体：`import <名字> = <引用>;`。TS 的 children **不含** `import` 关键字、`=` 与 `;`
（`import x = require("m");` → `ImportEqualsDeclaration → [Identifier x, ExternalModuleReference → [StringLiteral "m"]]`；
`import x = A.B;` → `ImportEqualsDeclaration → [Identifier x, QualifiedName → [Identifier A, Identifier B]]`），
所以 `Data` 只装两个形状：名字 + 引用。区间从 `import` 起点到 `;`；`Pos` = 前一个非 trivia 单元 `EndIndex`。

## field LocalName:Token | null = null

## field Reference:Token | null = null

## field IsTypeOnly:bool = false

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>ImportEqualsDeclarationShape

`tokenIndex` 必须落在 `;` 上；require 形的字符串从 `Bracket.Data` 里取。

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
if (code.length < 4) {
  throw new Error("import equals 声明不完整");
}
const last = code[code.length - 1];
let base = 0;
let exportUnit:Token | null = null;
if (code[0] instanceof Common && (code[0] as Common).Is("export")) {
  exportUnit = code[0];
  base = 1;
}
const keyword = code[base];
let index = base + 1;
let isTypeOnly = false;
if (index < code.length - 1 && code[index] instanceof Common && (code[index] as Common).Is("type")) {
  isTypeOnly = true;
  index++;
}
const nameUnit = code[index];
index++;
const equal = code[index];
index++;
if (!(keyword instanceof Common) || !(keyword as Common).Is("import")) {
  throw new Error("import equals 声明缺少 import 关键字");
}
if (!(nameUnit instanceof Common)) {
  throw new Error("import equals 声明的名字不是标识符");
}
if (!(equal instanceof Symbol) || !(equal as Symbol).Is("=")) {
  throw new Error("import equals 声明缺少等号");
}
// 无分号 ASI：行末边界 token 已由 possible-shape 的 BuildByIndex 排除，最后单元是引用末单元。
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.EndIndex;
    if (end !== null) {
      pos = end;
    }
    break;
  }
}
const shape = new ImportEqualsDeclarationShape(host.Template);
const name = IdentifierShape.FromBasicToken(nameUnit, context);
const nameSource = isTypeOnly ? code[base + 1] : keyword;
if (nameSource.SourceRange.EndIndex >= 0) {
  name.Pos = nameSource.SourceRange.EndIndex;
}
if (name.SourceRange.EndIndex < 0 && nameUnit.SourceRange.EndIndex >= 0) {
  name.SignOut(nameUnit.SourceRange.End);
}
shape.LocalName = name;
shape.Add(name);
let referencePos = 0;
if (equal.SourceRange.EndIndex >= 0) {
  referencePos = equal.SourceRange.EndIndex;
}
const target = code[index];
let reference:Token;
if (target instanceof Common && (target as Common).Is("require")) {
  const bracket = code[index + 1];
  if (!(bracket instanceof Bracket) || (bracket as Bracket).StartBracketChar !== "(") {
    throw new Error("import equals 的 require 缺少括号");
  }
  const inner = bracket as Bracket;
  let stringUnit:Token | null = null;
  for (const child of inner.Data) {
    if (!child.IsTriviaToken) {
      stringUnit = child;
      break;
    }
  }
  if (stringUnit === null || !(stringUnit instanceof String)) {
    throw new Error("import equals 的 require 缺少字符串");
  }
  const literal = StringLiteralShape.FromBasicToken(stringUnit as String, context);
  if (inner.SourceRange.StartIndex >= 0) {
    literal.Pos = inner.SourceRange.StartIndex + 1;
  }
  if (literal.SourceRange.EndIndex < 0 && stringUnit.SourceRange.EndIndex >= 0) {
    literal.SignOut(stringUnit.SourceRange.End);
  }
  const external = new ExternalModuleReferenceShape(host.Template);
  external.Add(literal);
  if (target.SourceRange.StartIndex >= 0) {
    external.SignIn(target.SourceRange.Start);
  }
  if (inner.SourceRange.EndIndex >= 0) {
    external.SignOut(inner.SourceRange.End);
  }
  external.Pos = referencePos;
  external.TryToClose(context);
  reference = external;
} else {
  // 实体名 A / A.B.C：QualifiedName 左结合嵌套，children 顺序 [left, right]。
  if (!(target instanceof Common)) {
    throw new Error("import equals 的引用不是标识符");
  }
  let current:ShapeToken = IdentifierShape.FromBasicToken(target, context);
  current.Pos = referencePos;
  let at = index + 1;
  while (at < code.length - 1) {
    const dot = code[at];
    if (!(dot instanceof Symbol) || !(dot as Symbol).Is(".")) {
      throw new Error("import equals 的实体名缺少点号");
    }
    at++;
    const rightUnit = code[at];
    if (!(rightUnit instanceof Common)) {
      throw new Error("import equals 的实体名缺少标识符");
    }
    const right = IdentifierShape.FromBasicToken(rightUnit, context);
    if (dot.SourceRange.EndIndex >= 0) {
      right.Pos = dot.SourceRange.EndIndex;
    }
    if (right.SourceRange.EndIndex < 0 && rightUnit.SourceRange.EndIndex >= 0) {
      right.SignOut(rightUnit.SourceRange.End);
    }
    const qualified = new QualifiedNameShape(host.Template);
    qualified.Left = current;
    qualified.Right = right;
    qualified.Add(current);
    qualified.Add(right);
    if (current.SourceRange.StartIndex >= 0) {
      qualified.SignIn(current.SourceRange.Start);
    }
    if (right.SourceRange.EndIndex >= 0) {
      qualified.SignOut(right.SourceRange.End);
    }
    qualified.Pos = current.Pos;
    qualified.TryToClose(context);
    current = qualified;
    at++;
  }
  reference = current;
}
shape.Reference = reference;
shape.IsTypeOnly = isTypeOnly;
shape.Add(reference);
if (exportUnit !== null) {
  const exportModifier = ExportKeywordShape.FromBasicToken(exportUnit as Common, context);
  exportModifier.Pos = pos;
  if (exportModifier.SourceRange.EndIndex < 0 && exportUnit.SourceRange.EndIndex >= 0) {
    exportModifier.SignOut(exportUnit.SourceRange.End);
  }
  shape.Data.unshift(exportModifier);
  exportModifier.Parent = shape;
  if (exportUnit.SourceRange.StartIndex >= 0) {
    shape.SignIn(exportUnit.SourceRange.Start);
  }
} else if (keyword.SourceRange.StartIndex >= 0) {
  shape.SignIn(keyword.SourceRange.Start);
}
if (last.SourceRange.EndIndex >= 0) {
  shape.SignOut(last.SourceRange.End);
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method BuildDirect:(host:Token, start:int, end:int, context:SyntaxContext)=>ImportEqualsDeclarationShape | null

**直接建造入口**（WP-3 根级用）：`host.Data[start, end)` 恰好是一条 import-equals 声明
（`import x = require("m")` / `import x = A.B.C` / `export import x = …`；`end` 不含）。

`;` 口径：**可有可无**。`FromUnits` 的区间终点就是「最后一个单元」，带 `;` 时它落在 `;` 上、
无分号（ASI）时落在引用末单元上——两种口径的 `End` 都由同一个 `last` 签出，所以这里**不需要合成 `;`**；
有 `;` 但被 ASI 提前收口时，调用方给的 `end` 已经把它排除在外。

- 不依赖 `BuildByIndex` / `MountShell` / `ShapeCatalog`；
- **不改 `host.Data`**；
- 返回 `null` = 这一片不是 import-equals（例如 `import { … } from` 形态交给
  `ImportDeclarationShape.BuildDirect`）或不是完整声明；不抛异常。

```ts
if (start < 0 || end <= start) {
  return null;
}
const code = DeclarationSpan.Slice(host, start, end);
if (code.length < 4) {
  return null;
}
const headText = code[0] instanceof Common ? (code[0] as Common).TempToString() : "";
const keywordIndex = headText === "export" ? 1 : 0;
if (keywordIndex >= code.length) {
  return null;
}
const keyword = code[keywordIndex];
if (!(keyword instanceof Common) || !(keyword as Common).Is("import")) {
  return null;
}
let hasEquals = false;
for (let at = keywordIndex + 1; at < code.length; at++) {
  const unit = code[at];
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    hasEquals = true;
    break;
  }
  if (unit instanceof Common && (unit as Common).Is("from")) {
    break;
  }
}
if (!hasEquals) {
  return null;
}
const units:Array<Token> = [];
for (const unit of code) {
  units.push(unit);
}
const hostLike:any = { Data: units, Template: host.Template };
const pos = DeclarationSpan.PosBefore(host, start);
const shape = ImportEqualsDeclarationShape.FromUnits(hostLike, 0, units.length - 1, context);
shape.Pos = pos;
// FromUnits 在切片 hostLike 上倒扫，拿不到段前的 pos（= 0）；ExportKeyword 的 Pos 与声明 Pos 同口径
// （TS 的 Pos 含前导 trivia，即前一个非 trivia 单元的 EndIndex），在这里补正（#72 / #155）。
const exportHead = shape.Data.length > 0 ? shape.Data[0] : null;
if (exportHead !== null && exportHead instanceof ExportKeywordShape) {
  (exportHead as ShapeToken).Pos = pos;
}
return shape;
```
