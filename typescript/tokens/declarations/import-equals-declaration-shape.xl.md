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
所以 `Data` 只装两个形状：名字 + 引用。区间从 `import` 起点到 `;`；`Pos` = 前一个非 trivia 单元 `End.Index + 1`。

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
    const end = host.Data[at].SourceRange.End;
    if (end !== null) {
      pos = end.Index + 1;
    }
    break;
  }
}
const shape = new ImportEqualsDeclarationShape(host.Template);
const name = IdentifierShape.FromBasicToken(nameUnit, context);
const nameSource = isTypeOnly ? code[base + 1] : keyword;
if (nameSource.SourceRange.End !== null) {
  name.Pos = nameSource.SourceRange.End.Index + 1;
}
if (name.SourceRange.End === null && nameUnit.SourceRange.End !== null) {
  name.SignOut(nameUnit.SourceRange.End);
}
shape.LocalName = name;
shape.Add(name);
let referencePos = 0;
if (equal.SourceRange.End !== null) {
  referencePos = equal.SourceRange.End.Index + 1;
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
  if (inner.SourceRange.Start !== null) {
    literal.Pos = inner.SourceRange.Start.Index + 1;
  }
  if (literal.SourceRange.End === null && stringUnit.SourceRange.End !== null) {
    literal.SignOut(stringUnit.SourceRange.End);
  }
  const external = new ExternalModuleReferenceShape(host.Template);
  external.Add(literal);
  if (target.SourceRange.Start !== null) {
    external.SignIn(target.SourceRange.Start);
  }
  if (inner.SourceRange.End !== null) {
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
    if (dot.SourceRange.End !== null) {
      right.Pos = dot.SourceRange.End.Index + 1;
    }
    if (right.SourceRange.End === null && rightUnit.SourceRange.End !== null) {
      right.SignOut(rightUnit.SourceRange.End);
    }
    const qualified = new QualifiedNameShape(host.Template);
    qualified.Left = current;
    qualified.Right = right;
    qualified.Add(current);
    qualified.Add(right);
    if (current.SourceRange.Start !== null) {
      qualified.SignIn(current.SourceRange.Start);
    }
    if (right.SourceRange.End !== null) {
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
  if (exportModifier.SourceRange.End === null && exportUnit.SourceRange.End !== null) {
    exportModifier.SignOut(exportUnit.SourceRange.End);
  }
  shape.Data.unshift(exportModifier);
  exportModifier.Parent = shape;
  if (exportUnit.SourceRange.Start !== null) {
    shape.SignIn(exportUnit.SourceRange.Start);
  }
} else if (keyword.SourceRange.Start !== null) {
  shape.SignIn(keyword.SourceRange.Start);
}
if (last.SourceRange.End !== null) {
  shape.SignOut(last.SourceRange.End);
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
