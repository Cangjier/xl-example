# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { MemberShellCatalog } from "./member-shell-catalog.xl.md"
```

# namespace cangjie

# class IndexSignatureShape extends ShapeToken

```txt
type T = { [k: string]: A };
```

## field Parameter:Token | null = null

## field Type:Token | null = null

## field MemberModifiers:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

[B2c] 本形状也可能是「成员外壳」：成员块 `}` 的交接见 `MemberShellCatalog.HandOffOnBodyClose`。

```ts
if (MemberShellCatalog.IsOpen(this)) {
  if (MemberShellCatalog.HandOffOnBodyClose(this, value, context)) {
    return BranchStates.Reload;
  }
}
return BranchStates.Undo;
```

## method ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

[B2c] 成员外壳的子 token 目录：头格子 / 参数表收口 / 方法体收口都走这里。

```ts
if (MemberShellCatalog.IsOpen(this)) {
  return MemberShellCatalog.HeadCompute(this, context);
}
return super.ComputePossibleShapes(context, source);
```

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

[B2c] 成员外壳里新建 `(` / `{`：参数表装 B1 目录，方法体换 `BlockShape`。

```ts
if (MemberShellCatalog.IsOpen(this)) {
  MemberShellCatalog.OnBracketCreated(this, bracket, context);
}
```