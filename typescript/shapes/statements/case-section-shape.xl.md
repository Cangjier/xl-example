# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class CaseSectionShape extends ShapeToken

CaseClause / DefaultClause 的公共部分：`case <expr>:` 或 `default:` 加上它名下的语句。
Test 只有 CaseClause 有（DefaultClause 保持 null）。

## field Test:Token | null = null

## static method HandBack:(section:Token, tokenIndex:int, context:SyntaxContext)=>void

```ts
// 子句遇到 `case` / `default` / `}`：先按最后一个代码子单元收口子句，
// 再把这个记号交回 CaseBlock，由它的候选建下一个子句或收口整个块。
const units = section.Data;
const token = units[tokenIndex];
units.splice(tokenIndex, 1);
// 记号之前的尾随 trivia 归下一个子句（TS 的 pos 就是这么算的）：先摘出来，随记号一起搬回 CaseBlock。
const tail:Array<Token> = [];
while (units.length > 0 && units[units.length - 1].IsTriviaToken) {
  tail.unshift(units.pop()!);
}
// 右边界取「冒号末尾」与「最后一个语句末尾」的较大者：空子句停在冒号，非空子句停在语句。
let end = section.SourceRange.End;
for (let at = units.length - 1; at >= 0; at--) {
  const unit = units[at];
  if (unit.IsTriviaToken || unit.IsBasicToken) {
    continue;
  }
  if (unit.SourceRange.End > end) {
    end = unit.SourceRange.End;
  }
  break;
}
section.SourceRange.End = end;
section.TryToClose(context);
const parent = section.Parent;
section.Quit();
if (parent === null) {
  return;
}
const at = parent.Data.indexOf(section);
for (const item of tail) {
  item.Parent = parent;
  parent.Data.splice(at + 1, 0, item);
}
token.Parent = parent;
parent.Data.splice(at + 1 + tail.length, 0, token);
const block = parent as UnitToken;
block.MountedUnit = null;
block.ComputePossibleShapesByIndex(at + 1 + tail.length, context, PossibleSource.Close);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
if (this.SourceRange.End < 0) {
  for (let at = this.Data.length - 1; at >= 0; at--) {
    const unit = this.Data[at];
    if (unit.IsTriviaToken || unit.IsBasicToken) {
      continue;
    }
    if (unit.SourceRange.End >= 0) {
      this.SourceRange.End = unit.SourceRange.End;
    }
    break;
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
this.Closed = true;
return CloseStates.Nothing;
```
