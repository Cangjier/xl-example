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
