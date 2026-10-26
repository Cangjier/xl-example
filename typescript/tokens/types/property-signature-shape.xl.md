# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { MemberShellCatalog } from "./member-shell-catalog.xl.md"
```

# namespace cangjie

# class PropertySignatureShape extends ShapeToken

```txt
type T = { a: A };
type T = { a?: A };
type T = { readonly a: A };
```

## field SignatureName:Token | null = null

## field QuestionToken:Token | null = null

## field Type:Token | null = null

## field MemberModifiers:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

[B2] 本形状也可能是「成员外壳」：成员块 `}` 的交接见 `MemberShellCatalog.HandOffOnBodyClose`。

```ts
if (MemberShellCatalog.IsOpen(this)) {
  if (MemberShellCatalog.HandOffOnBodyClose(this, value, context)) {
    return BranchStates.Reload;
  }
}
return BranchStates.Undo;
```

## method ComputePossibleShapes:(context:SyntaxContext)=>ComputePossibleShapesStates

[B2b] 成员外壳的子 token 目录：外壳里 basic token 关闭时把刚闭合的那一格按位置包成名字形状，
再判成员边界（见 `MemberShellCatalog.HeadCompute`）。

```ts
if (MemberShellCatalog.IsOpen(this)) {
  return MemberShellCatalog.HeadCompute(this, context);
}
return super.ComputePossibleShapes(context);
```
