# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
```

# namespace cangjie

# class VariableStatementShape extends ShapeToken

```txt
let x = 1;
const y = 2;
var z;
let a = 1, b = 2;
const [a, b] = arr;
const { p, q } = o;
using u = q;
await using au = q;
export const k = 1;
declare let d: number;
```

## field Incremental:bool = false

## constructor:(template:Template)=>void

```ts
super(template);
```

## method TryToClose:(context:SyntaxContext)=>CloseStates

```ts
// 增量模式：挂载链是 statement → list → declaration。基类 `TryToClose` 只关自己、不递归，
// 所以这里先把最内层（真正持有字段和 Data 的那一层）关掉，再逐层补终点；最后交回基类关自己。
if (this.Incremental && !this.Closed) {
  const list = this.MountedUnit;
  let listEndBefore = -1;
  let declaration:VariableDeclarationShape | null = null;
  if (list !== null && list instanceof VariableDeclarationListShape) {
    listEndBefore = list.SourceRange.EndIndex;
    const inner = list.MountedUnit;
    if (inner !== null && inner instanceof VariableDeclarationShape) {
      declaration = inner;
    }
    if (declaration !== null) {
      declaration.TryToClose(context);
    }
    list.TryToClose(context);
  }
  // [R5:SEMICOLON] 声明在 `FinishIncremental` 里把末尾的 `;` 交还回来（声明自己不保留它），语句在这里**收下**：
  // `;` 成为语句自己的最后一个子单元，语句终点因此是分号的 `End`，而不是最后一个代码子单元。
  // 必须在 `super.TryToClose` 之前收——基类补终点读的就是 `Data` 的最后一个子单元。
  if (declaration !== null) {
    this.AdoptTrailingSemicolon(declaration, context);
  }
  // [R5:TRIM] 收口守卫 —— **两条判据**，缺一不可：
  //   ① 语句的末代码子单元是 `;`：它的 `End` 就是语句终点，裁掉就是少一格（`const a = 1;` 无结尾换行 → 12）；
  //   ② 语句终点仍等于**收口前**的列表终点：说明多出来的只是 trivia（ASI 的 `let x = 1` ⏎ 的尾随换行），
  //      这时才把终点收回最后一个代码子单元。
  // 分号已被 `CloseAtSemicolon` 消费时（`let x = 1;\n`），语句终点比列表终点大 1，② 不成立 ⇒ 分号不会被裁掉。
  // 旧实现只有 ②，而 ② 在 EOF 上两边都是 -1（谁也没签出），既判不出「有没有分号」，也判不出「收到哪」——
  // `const a = 1;` 无结尾换行就会安静地收成 [0,11)，这正是 R5 缺陷的另一半。
  this.TrimEndToLastCodeUnlessSemicolon(listEndBefore);
}
if (this.Closed) {
  return CloseStates.Nothing;
}
return super.TryToClose(context);
```

## method AdoptTrailingSemicolon:(declaration:VariableDeclarationShape, context:SyntaxContext)=>void

```ts
const semicolon = declaration.TrailingSemicolon;
if (semicolon === null) {
  return;
}
declaration.TrailingSemicolon = null;
for (const unit of this.Data) {
  if (unit === semicolon) {
    return;
  }
}
this.Add(semicolon);
if (!semicolon.Closed) {
  // 分号到达末尾时没有下一个 token 来触发 `Symbol.Close`，所以它可能一直是打开的；
  // 挂到本形状名下再关，`Symbol.Close` 的「问父单元」落在本形状上（本形状没有目录向导 ⇒ 无事发生）。
  semicolon.TryToClose(context);
}
```

## method TrimEndToLastCodeUnlessSemicolon:(listEndBefore:int)=>void

```ts
let last:Token | null = null;
for (let at = this.Data.length - 1; at >= 0; at--) {
  if (!this.Data[at].IsTriviaToken) {
    last = this.Data[at];
    break;
  }
}
if (last !== null && last instanceof Symbol && (last as Symbol).Is(";")) {
  const end = last.SourceRange.EndIndex;
  if (end >= 0 && this.SourceRange.End > end) {
    this.SourceRange.End = end;
  }
  return;
}
if (listEndBefore >= 0 && this.SourceRange.EndIndex === listEndBefore) {
  this.TrimEndToLastCode();
}
```
