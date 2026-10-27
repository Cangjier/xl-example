# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { MemberShellCatalog } from "./member-shell-catalog.xl.md"
```

# namespace cangjie

# class PropertyDeclarationShape extends ShapeToken

```txt
class C { a = 1; }
```

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

[B2] 本形状也可能是「成员外壳」（`MemberShellCatalog`）：此时它是成员块括号的挂载单元，
成员块的 `}` 不会落到括号自己身上。先收口、把挂载还回去，再 `Reload` 让同一个 `}` 由括号正常闭合。

```ts
if (MemberShellCatalog.IsOpen(this)) {
  if (MemberShellCatalog.HandOffOnBodyClose(this, value, context)) {
    return BranchStates.Reload;
  }
}
return BranchStates.Undo;
```

## method ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

[B2b] **成员外壳的子 token 目录**：外壳里的 basic token 关闭时只问父单元（`this`），这一格就是那个入口——
先把刚闭合的那一格按位置包成修饰词 / 名字 / 初始字面量形状，再判成员边界。

非外壳（正品 `PropertyDeclarationShape`）保持基类行为：`CatalogGuide` 为空时什么都不做。

```ts
if (MemberShellCatalog.IsOpen(this)) {
  return MemberShellCatalog.HeadCompute(this, context);
}
return super.ComputePossibleShapes(context, source);
```
