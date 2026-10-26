# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
```

# namespace cangjie

增量模式下三层的最外层。`TryToClose` 负责在 EOF 收口时把挂载链**由内向外**关掉：
`VariableDeclarationShape`（提取字段 / 原子建初始值）→ `VariableDeclarationListShape` → 自己，
再交回基类补自己的终点。默认（`Incremental == false`）时逐字节走基类路径，旧行为不变。

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
if (this.Incremental) {
  const list = this.MountedUnit;
  let listEndBefore = -1;
  if (list !== null && list instanceof VariableDeclarationListShape) {
    listEndBefore = list.SourceRange.EndIndex;
    const declaration = list.MountedUnit;
    if (declaration !== null && declaration instanceof VariableDeclarationShape) {
      declaration.TryToClose(context);
    }
    list.TryToClose(context);
  }
  // 没有分号的 ASI 收口整条链都按文件长度签出，尾随 trivia 已经被 declaration / list 丢掉；
  // 若语句终点原本与列表终点相同（说明多出来的只是 trivia，而不是 `;`），跟着列表收回代码终点。
  // 有分号时 statement.End 比 list.End 大 1，保留分号（`let x = 1;\n` 的语句终点是 10）。
  if (listEndBefore >= 0 && this.SourceRange.EndIndex === listEndBefore) {
    this.TrimEndToLastCode();
  }
}
return super.TryToClose(context);
```
