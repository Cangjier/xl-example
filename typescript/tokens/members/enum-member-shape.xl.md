# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { MemberShellCatalog } from "../types/member-shell-catalog.xl.md"
```

# namespace cangjie

# class EnumMemberShape extends ShapeToken

```txt
enum E { A }
```

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

## method ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

[B2b] 成员外壳的子 token 目录：成员名在自己的闭合格成 `IdentifierShape`、`=` 之后的字面量在自己的
闭合格成 `NumericLiteralShape` / `StringLiteralShape`（见 `MemberShellCatalog.HeadCompute`）。

```ts
if (MemberShellCatalog.IsOpen(this)) {
  return MemberShellCatalog.HeadCompute(this, context);
}
return super.ComputePossibleShapes(context, source);
```
