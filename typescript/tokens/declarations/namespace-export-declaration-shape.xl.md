# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
```

# namespace cangjie

# class NamespaceExportDeclarationShape extends ShapeToken

```txt
export as namespace NS;
```

measurement 载体：`export as namespace <名字>;`。TS 的 children 只有名字一个
（`export as namespace N;` → `NamespaceExportDeclaration → [Identifier N]`），关键字、`;` 都不是节点。
区间从 `export` 起点到 `;`；名字 `Pos` = `namespace` 的 `EndIndex`；整体 `Pos` = 前一个非 trivia 单元 `EndIndex`。

## field ExportName:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>NamespaceExportDeclarationShape

`tokenIndex` 必须落在 `;` 上。

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
if (code.length < 5) {
  throw new Error("namespace export 声明不完整");
}
const keyword = code[0];
const asKeyword = code[1];
const namespaceKeyword = code[2];
const nameUnit = code[3];
const last = code[code.length - 1];
if (!(keyword instanceof Common) || !(keyword as Common).Is("export")) {
  throw new Error("namespace export 声明缺少 export 关键字");
}
if (!(asKeyword instanceof Common) || !(asKeyword as Common).Is("as")) {
  throw new Error("namespace export 声明缺少 as 关键字");
}
if (!(namespaceKeyword instanceof Common) || !(namespaceKeyword as Common).Is("namespace")) {
  throw new Error("namespace export 声明缺少 namespace 关键字");
}
if (!(nameUnit instanceof Common)) {
  throw new Error("namespace export 声明的名字不是标识符");
}
if (!(last instanceof Symbol) || !(last as Symbol).Is(";")) {
  throw new Error("namespace export 声明缺少分号");
}
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
const name = IdentifierShape.FromBasicToken(nameUnit, context);
if (namespaceKeyword.SourceRange.EndIndex >= 0) {
  name.Pos = namespaceKeyword.SourceRange.EndIndex;
}
if (name.SourceRange.EndIndex < 0 && nameUnit.SourceRange.EndIndex >= 0) {
  name.SignOut(nameUnit.SourceRange.End);
}
const shape = new NamespaceExportDeclarationShape(host.Template);
shape.ExportName = name;
shape.Add(name);
if (keyword.SourceRange.StartIndex >= 0) {
  shape.SignIn(keyword.SourceRange.Start);
}
if (last.SourceRange.EndIndex >= 0) {
  shape.SignOut(last.SourceRange.End);
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
