# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ImportSpecifierShape } from "./import-specifier-shape.xl.md"
import { ClauseBuild, ClauseItemDrive } from "../items/clause-item-rule.xl.md"
```

# namespace cangjie

# class NamedImportsShape extends ShapeToken

```txt
import { a } from "m";
```

## field Elements:Array<ImportSpecifierShape> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBracket:(bracket:Bracket, context:SyntaxContext)=>NamedImportsShape

`{ … }` 里是 specifier 列表。**两条路**（WP-6-3）：

- **sub-clause item 表接管**：`ClauseItemDrive.Drive` 在克隆括号上把整段喂一遍，全部 item 建出
  （无 raw 残留）时返回 specifier 表，这里只做子节点装配；
- **legacy 分组**：接管不了（返回 `null`）时逐字走原来的「按 `,` 分组」循环。

两条路的 `Pos` 口径同一份：每个 specifier 的 `Pos` 是它前面那个非 trivia 单元（`{` 或 `,`）的
`EndIndex`（括号与逗号都在 `bracket.Data` 里）。`ImportSpecifierClauseBuild` 在**原始** `Data` 上
预计算这张表，所以 item 表的 splice 不影响它。

```ts
const shape = new NamedImportsShape(bracket.Template);
const elements:Array<ImportSpecifierShape> = [];
const built = ClauseItemDrive.Drive(bracket, context, new ImportSpecifierClauseBuild(bracket));
if (built !== null) {
  for (const item of built) {
    elements.push(item as ImportSpecifierShape);
  }
} else {
  let group:Array<Token> = [];
  // 每个 specifier 的 Pos 是它前面那个非 trivia 单元（`{` 或 `,`）的 End+1：
  // 括号与逗号都在 bracket.Data 里，从这里算得出，组内自己算不出。
  let pos = bracket.SourceRange.StartIndex < 0 ? -1 : bracket.SourceRange.StartIndex + 1;
  for (const item of bracket.Data) {
    if (item instanceof Symbol && (item as Symbol).Is(",")) {
      const specifier = ImportSpecifierShape.FromTokens(group, context, pos);
      if (specifier !== null) {
        elements.push(specifier);
      }
      group = [];
      pos = item.SourceRange.EndIndex < 0 ? -1 : item.SourceRange.EndIndex;
      continue;
    }
    group.push(item);
  }
  const tail = ImportSpecifierShape.FromTokens(group, context, pos);
  if (tail !== null) {
    elements.push(tail);
  }
}
shape.Elements = elements;
for (const item of elements) {
  item.Parent = shape;
  shape.Data.push(item);
}
if (bracket.SourceRange.StartIndex >= 0) {
  shape.SignIn(bracket.SourceRange.Start);
}
if (bracket.SourceRange.EndIndex >= 0) {
  shape.SignOut(bracket.SourceRange.End);
}
shape.TryToClose(context);
return shape;
```

# class ImportSpecifierClauseBuild implements ClauseBuild

`NamedImportsShape` 注入子句 item 表的一 specifier 建造器：把 `[start, end]`（`end` 是尾随 `,`
或最后一条 specifier 的末单元）切成一个 specifier 的 token 组，交给 `ImportSpecifierShape.FromTokens`。

## field Positions:Map<Token, int> = new Map()

每个代码单元的 specifier `Pos`（前一个非 trivia 单元的 `EndIndex`），按**原始** `bracket.Data`
预计算：item 表驱动时引擎会 splice 克隆的 `Data`，从那里反推 `,` 的 `EndIndex` 已经拿不到了。

## constructor:(bracket:Bracket)=>void

```ts
let pos = bracket.SourceRange.StartIndex < 0 ? -1 : bracket.SourceRange.StartIndex + 1;
for (const unit of bracket.Data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  this.Positions.set(unit, pos);
  const end = unit.SourceRange.EndIndex;
  if (end >= 0) {
    pos = end;
  }
}
```

## method BuildAt:(host:Token, start:int, end:int, context:SyntaxContext)=>Token | null

```ts
if (start < 0 || end < start || end >= host.Data.length) {
  return null;
}
let to = end;
const last = host.Data[to];
if (last instanceof Symbol && (last as Symbol).Is(",")) {
  to = to - 1;
}
const group:Array<Token> = [];
for (let at = start; at <= to; at++) {
  const unit = host.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  group.push(unit);
}
if (group.length === 0) {
  return null;
}
const pos = this.Positions.get(group[0]);
if (pos === undefined) {
  return null;
}
return ImportSpecifierShape.FromTokens(group, context, pos);
```
