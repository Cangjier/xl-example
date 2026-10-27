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

增量模式下三层的最外层。`TryToClose` 负责在 EOF 收口时把挂载链**由内向外**关掉：
`VariableDeclarationShape`（提取字段 / 原子建初始值）→ `VariableDeclarationListShape` → 自己，
再交回基类补自己的终点。默认（`Incremental == false`）时逐字节走基类路径，旧行为不变。

[R5] **语句分号的归属**：`;` 不是声明的子节点（TS 的 `VariableDeclaration` 止于初始化器），也不是 trivia
（语句的终点含它）。声明在 `FinishIncremental` 里把它交还（`TrailingSemicolon`），本形状在 `TryToClose` 里
**收成自己的最后一个子单元**，语句区间因此以分号的 `End` 封口——`const a = 1;`（无结尾换行）是 `[0,12)`，
不是 `[0,11)`。收口守卫见 `TrimEndToLastCodeUnlessSemicolon`：末单元是 `;` 时只裁掉它之后的 trivia，
绝不把 `;` 一起裁掉。

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

是不是增量模式建出来的形状。默认 `false`：legacy `StatementBuilder` 建的 AST 节点不受本类新增逻辑影响。

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

[R5:SEMICOLON] 把声明交还的语句分号**收成语句自己的子单元**，并给它补一次关闭。

为什么由语句收：TS 的 `VariableStatement` 区间含 `;`（`const a = 1;` → `[0,12)`），但它的 AST children 里没有
`SemicolonToken`。所以 `;` 既不能留在 `VariableDeclarationShape.Data`（声明区间会多一格，`[6,12)` 而不是 `[6,11)`），
也不能被丢掉（语句区间会少一格，`[0,11)` 就是 R5 的 `moved`）。唯一与两边都对得上的归属，就是语句自己。

`Data` 里的顺序因此是 `[声明列表, ;]`（源码顺序）；`;` 是 basic token，`cjAst` 的对拍按 `IsAstShape` 过滤掉它，
所以它不会变成多出来的 AST 节点，只贡献语句的终点。

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

[R5:TRIM] 收口守卫：**末尾代码子单元是 `;` 时裁到分号的 `End`**（并且只在它比当前终点短时收），
其余形态才看 `listEndBefore` 那条「只是 trivia」的判据。

`TrimEndToLastCode` 的语义是「把尾随 trivia 从区间里去掉」——分号不是 trivia，它是语句自己的终点。
EOF 收口时驱动层可能已经把区间签到文件长度（`SourceRange.End` 先被写成文件长度），此时若不把 `;` 排除在外，
分号的 `End` 会被「收到最后一个 code 子单元」按同一个数再裁一次，语句就少一格。

两条判据的分工（参数 `listEndBefore` 是**收口前**的列表终点快照，`-1` = 当时还没签出）：

1. 末代码子单元是 `;` ⇒ 只允许裁到分号的 `End`（把 `;` 之后的 trivia 去掉，`;` 本身保留）；
2. 否则，只有「语句终点仍等于列表终点」才裁（旧行为：多出来的只能是 trivia）；不等就什么都别动
   （分号已被 `CloseAtSemicolon` 消费、或终点另有来源）。

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
