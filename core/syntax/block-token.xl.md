# dependencies
```xl
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

# class BlockToken extends Token

## field Temp:string = ""

## field HasBackslash:bool = false

## constructor:(template:Template)=>void

```ts
super(template);
```

## method TempToString:()=>string

```ts
return this.Temp;
```

## method AppendAndSignOut:(value:string, index:int)=>BlockToken

```ts
this.SignOut(index + 1);
this.Temp += value;
if (value.indexOf("\\") >= 0) {
  this.HasBackslash = true;
}
return this;
```

## method AppendValueAndSignOut:(value:string, index:int)=>BlockToken

```ts
this.SignOut(index + 1);
this.Temp += value;
if (value.indexOf("\\") >= 0) {
  this.HasBackslash = true;
}
return this;
```

## method IsAppend:(buffer:SourceRange, index:int, value:string)=>bool

```ts
throw new Error("abstract member: IsAppend");
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
if (this.MountedUnit !== null) {
  this.MountedUnit.Process(context, buffer, index);
  if (context.Index > index) {
    this.LastIndex = index;
  }
  return;
}
const value = buffer.ValueAt(index);
this.Default(context, buffer, index, value);
if (context.Index === index) {
  context.Index = index + 1;
}
this.LastIndex = index;
```

## method Undo:(index:int)=>void

```ts
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  undoUnit.Undo(index);
  return;
}
this.Temp = this.Temp.substring(0, this.Temp.length - 1);
if (this.Temp.length === 0 || index <= this.SourceRange.Start) {
  this.Parent!.Data.splice(this.Parent!.Data.indexOf(this), 1);
} else {
  this.SignOut(index);
}
```

## method IsUndo:(index:int)=>bool

```ts
return true;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

```ts
throw new Error("抽象成员未实现");
```

## method SignOut:(endIndex:int)=>void

```ts
if (this.SourceRange.Document === null) {
  this.SourceRange.Document = SourceRange.CurrentDocument;
}
this.SourceRange.End = endIndex;
```

## method AstText:()=>string

```ts
return this.Temp;
```
