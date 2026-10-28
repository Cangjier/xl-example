# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
```

# namespace cangjie

# class DirectTypeAssembly

```txt
let x: Array<Array<T>> = a;    -> TypeOf([Array,<,Array,<,T,>>], 7)   -> TypeReference（`>>` 由 Load 拆）
let x: A | B = a;              -> TypeOf([A,|,B], 7)                 -> UnionType
function f(): number {}        -> ReturnTypeOf([number], 12)         -> NumberKeyword（ParseReturnType 分流）
```

## static field LastReason:string = ""

## static field LastCategory:string = ""

## static method TypeOf:(units:Array<Token>, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// 读「一段类型单元」（调用方负责切出边界；允许尾部 trivia，覆盖校验按最后一个**代码**单元算）。
// 覆盖口径与 legacy `StatementBuilder.BuildVariableDeclarationList` 的 `At !== Units.length` 同义，
// 差别只有一处：用 `OriginalConsumed()` 把 `>>` 拆分映射回**原 units** 下标（R5-CONTRACT §2.1.2）。
DirectTypeAssembly.LastReason = "";
const lastCode = DirectTypeAssembly.LastCodeAt(units);
if (lastCode < 0) {
  DirectTypeAssembly.LastReason = "类型单元为空";
  return null;
}
const builder = new TypeBuilder(template, context);
builder.Load(units, basePos);
let type:Token | null = null;
try {
  type = builder.ParseType();
} catch (error) {
  type = null;
}
if (type === null) {
  DirectTypeAssembly.LastReason = "类型无法解析";
  return null;
}
const consumed = builder.OriginalConsumed();
if (consumed !== lastCode + 1) {
  DirectTypeAssembly.LastReason = "类型没有读完 consumed=" + String(consumed)
    + " units=" + String(lastCode + 1);
  return null;
}
if (!DirectTypeAssembly.EndsAtTypeEnd(type, units[lastCode])) {
  DirectTypeAssembly.LastReason = "类型终点与最后一个类型单元不一致: typeEnd="
    + String(type.SourceRange.EndIndex) + " unitEnd=" + String(units[lastCode].SourceRange.EndIndex);
  return null;
}
return type;
```

## static method ReturnTypeOf:(units:Array<Token>, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// 函数返回类型的唯一入口：与 legacy `FunctionDeclarationShape.FromUnits` 同口，走 `ParseReturnType`
// （类型谓词 `x is B` / `asserts x` 由它分流），其余仍由 `ParseType` 读。
// 覆盖校验与 `TypeOf` 相同；失败返回 null（调用方 Decline(`stmt.func`)，旧路径接管）。
DirectTypeAssembly.LastReason = "";
const lastCode = DirectTypeAssembly.LastCodeAt(units);
if (lastCode < 0) {
  DirectTypeAssembly.LastReason = "返回类型单元为空";
  return null;
}
const builder = new TypeBuilder(template, context);
builder.Load(units, basePos);
let type:Token | null = null;
try {
  type = builder.ParseReturnType();
} catch (error) {
  type = null;
}
if (type === null) {
  DirectTypeAssembly.LastReason = "返回类型无法解析";
  return null;
}
const consumed = builder.OriginalConsumed();
if (consumed !== lastCode + 1) {
  DirectTypeAssembly.LastReason = "返回类型没有读完 consumed=" + String(consumed)
    + " units=" + String(lastCode + 1);
  return null;
}
if (!DirectTypeAssembly.EndsAtTypeEnd(type, units[lastCode])) {
  DirectTypeAssembly.LastReason = "返回类型终点与最后一个类型单元不一致: typeEnd="
    + String(type.SourceRange.EndIndex) + " unitEnd=" + String(units[lastCode].SourceRange.EndIndex);
  return null;
}
return type;
```

## static method EndsAtTypeEnd:(type:Token, lastUnit:Token)=>bool

```ts
// 防 `TypeBuilder` 提前收层：类型节点的区间终点必须等于最后一个类型单元的终点。
if (lastUnit.SourceRange.EndIndex < 0) {
  return true;
}
return type.SourceRange.EndIndex === lastUnit.SourceRange.EndIndex;
```

## static method LastCodeAt:(units:Array<Token>)=>int

```ts
// 最后一个**代码**单元的下标（尾部 trivia 不算类型的一部分）；没有代码单元返回 -1。
for (let at = units.length - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method LastCodeUnit:(units:Array<Token>)=>Token | null

```ts
const at = DirectTypeAssembly.LastCodeAt(units);
if (at < 0) {
  return null;
}
return units[at];
```
