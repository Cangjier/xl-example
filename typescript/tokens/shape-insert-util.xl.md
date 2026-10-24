# dependencies
```xl
import { ShapeToken } from "../../core/syntax/shape-token.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ShapeInsertUtil

```txt
parent.Data: [A, child, B]  ->  [A, wrapper, B]
                                   wrapper.Data: [child]
```

## static method InsertBetween:(parent:Token, child:Token, wrapper:Token, sealRange?:bool)=>Token

把 `wrapper` 插到 `parent` 与它的直接子单元 `child` 之间：`wrapper` 原位顶替 `child`，`child` 变成 `wrapper` 的子单元。

一次做完六件事：

1. `parent.Data` 顺序：先把 `child` 从原位删掉，再把 `wrapper` 插回同一个下标；
2. `Parent` 指针：`wrapper.Parent = parent`、`child.Parent = wrapper`（其余兄弟一个字都不动）；
3. `MountedUnit` 转交：原来挂在 `parent` 上的是 `child` 时，改成 `parent.MountedUnit = wrapper`、`wrapper.MountedUnit = child`，后续字符仍然流到 `child`；
4. `SourceRange`：起点从 `child` 继承（`SignInToken`），**`child` 自己的范围不重签**；`sealRange` 为真时终点也从 `child` 继承并当场锁死（`SourceRange` 只能赋值一次，之后 wrapper 不能再扩范围）；
5. `Pos`：`wrapper` 还没算位置时继承 `child` 的（含前导 trivia 的 AST 起点）；
6. `LastIndex`：继承 `child` 的。

约束：`wrapper` 必须是**游离**单元（没有父单元、没有子单元、不是 `parent` / `child` 本身）。不满足时抛错，而不是悄悄造出一棵断链的树。

```ts
const index = parent.Data.indexOf(child);
if (index < 0 || child.Parent !== parent) {
  throw new Error("ShapeInsertUtil.InsertBetween: child 不是 parent 的直接子单元");
}
if (wrapper.Parent !== null) {
  throw new Error("ShapeInsertUtil.InsertBetween: wrapper 已经有父单元");
}
if (wrapper.Data.length !== 0) {
  throw new Error("ShapeInsertUtil.InsertBetween: wrapper 必须没有子单元");
}
if (wrapper === parent || wrapper === child) {
  throw new Error("ShapeInsertUtil.InsertBetween: wrapper 不能是 parent 或 child 本身");
}
parent.Data.splice(index, 1);
wrapper.Parent = parent;
parent.Data.splice(index, 0, wrapper);
wrapper.Add(child);
if (parent.MountedUnit === child) {
  parent.MountedUnit = wrapper;
  wrapper.MountedUnit = child;
}
if (wrapper.SourceRange.Start < 0 && child.SourceRange.Start >= 0) {
  wrapper.SignInToken(child);
}
if ((sealRange ?? false) && wrapper.SourceRange.End < 0 && child.SourceRange.End >= 0) {
  wrapper.SignOutToken(child);
}
if (wrapper instanceof ShapeToken && child instanceof ShapeToken && wrapper.Pos < 0) {
  wrapper.Pos = child.Pos;
}
wrapper.LastIndex = child.LastIndex;
return wrapper;
```
