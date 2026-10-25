# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementBuilder } from "./statement-builder.xl.md"
import { VariableDeclarationListUtil } from "../declarations/variable-declaration-list-util.xl.md"
import { VariableListVerdict } from "../declarations/variable-declaration-list-util.xl.md"
```

# namespace cangjie

# class VariableStatementThreeLayer

## static field Enabled:bool = true

## static field StatementCount:int = 0

## static field ListCount:int = 0

## static field DeclarationCount:int = 0

## static field FallbackCount:int = 0

## static field MismatchCount:int = 0

## static method Reset:()=>void

```ts
VariableStatementThreeLayer.StatementCount = 0;
VariableStatementThreeLayer.ListCount = 0;
VariableStatementThreeLayer.DeclarationCount = 0;
VariableStatementThreeLayer.FallbackCount = 0;
VariableStatementThreeLayer.MismatchCount = 0;
```

## static method CountDeclarations:(built:Token)=>int

```ts
if (built.Data.length < 1) {
  return -1;
}
const list = built.Data[0];
if (list.Data.length < 1) {
  return -1;
}
return list.Data.length;
```

## static method TryBuild:(builder:StatementBuilder, consumed:Array<Token>)=>Token | null

```ts
if (!VariableStatementThreeLayer.Enabled) {
  VariableStatementThreeLayer.FallbackCount = VariableStatementThreeLayer.FallbackCount + 1;
  return null;
}
let verdict:VariableListVerdict | null = null;
try {
  verdict = VariableDeclarationListUtil.Judge(consumed);
} catch {
  VariableStatementThreeLayer.FallbackCount = VariableStatementThreeLayer.FallbackCount + 1;
  return null;
}
if (verdict === null || verdict.State !== 1 || verdict.Declarations <= 0) {
  VariableStatementThreeLayer.FallbackCount = VariableStatementThreeLayer.FallbackCount + 1;
  return null;
}
const built = builder.BuildStatement();
VariableStatementThreeLayer.StatementCount = VariableStatementThreeLayer.StatementCount + 1;
VariableStatementThreeLayer.ListCount = VariableStatementThreeLayer.ListCount + 1;
VariableStatementThreeLayer.DeclarationCount =
  VariableStatementThreeLayer.DeclarationCount + verdict.Declarations;
const actual = VariableStatementThreeLayer.CountDeclarations(built);
if (actual !== verdict.Declarations) {
  VariableStatementThreeLayer.MismatchCount = VariableStatementThreeLayer.MismatchCount + 1;
}
return built;
```
