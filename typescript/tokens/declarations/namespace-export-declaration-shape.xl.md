# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { DeclarationSpan } from "../items/module-item-rule.xl.md"
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

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext, requireSemicolon?:bool)=>NamespaceExportDeclarationShape

`tokenIndex` 落在 `;` 上时要求最后一块是 `;`；无分号收口（EOF / ASI）时传 `requireSemicolon = false`，
最后一个代码单元就是名字，`End` 取它的 `End`。

```ts
const hasSemicolon = requireSemicolon ?? true;
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
if (code.length < 4) {
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
if (hasSemicolon && (!(last instanceof Symbol) || !(last as Symbol).Is(";"))) {
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

## static method BuildDirect:(host:Token, start:int, end:int, context:SyntaxContext)=>NamespaceExportDeclarationShape | null

**直接建造入口**（WP-3 根级用）：`host.Data[start, end)` 恰好是一条 `export as namespace X`（`end` 不含）。

`;` 口径：**可有可无**。无分号时 `FromUnits(…, false)` 把名字单元的 `End` 当区间终点（`;` 不是本节点的
children），也就是模块体里 `export as namespace X` 换行收口的同一口径——但这里**不合成 `;`**、
**不改 `host.Data`**。

- 不依赖 `BuildByIndex` / `MountShell` / `CatalogGuide`；
- 返回 `null` = 这一片不是 namespace-export 或不是完整声明；不抛异常。

```ts
if (start < 0 || end <= start) {
  return null;
}
const code = DeclarationSpan.Slice(host, start, end);
if (code.length < 4) {
  return null;
}
const keyword = code[0];
if (!(keyword instanceof Common) || !(keyword as Common).Is("export")) {
  return null;
}
const asKeyword = code[1];
if (!(asKeyword instanceof Common) || !(asKeyword as Common).Is("as")) {
  return null;
}
const namespaceKeyword = code[2];
if (!(namespaceKeyword instanceof Common) || !(namespaceKeyword as Common).Is("namespace")) {
  return null;
}
const hasSemicolon = DeclarationSpan.EndsWithSemicolon(code);
const units:Array<Token> = [];
for (const unit of code) {
  units.push(unit);
}
const hostLike:any = { Data: units, Template: host.Template };
const pos = DeclarationSpan.PosBefore(host, start);
const shape = NamespaceExportDeclarationShape.FromUnits(hostLike, 0, units.length - 1, context, hasSemicolon);
shape.Pos = pos;
return shape;
```
