# dependencies
```xl
import { CloseStates } from "./close-states.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { SourceException } from "../exceptions/source-exception.xl.md"
import { BranchTransiter } from "./branch-transiter.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { Template } from "./templates/template.xl.md"
import { Sequence } from "./templates/sequence.xl.md"
```

# namespace cangjie

# class Token

## field Template:Template

## field ProcessQueue:Sequence<BranchTransiter> | null = null

## field Parent:Token | null = null

## field Data:Array<Token> = []

## field MountedUnit:Token | null = null

## field SourceRange:SourceRange = new SourceRange()

## field LastIndex:int = -1

## field Closed:bool = false

## field IsBasicToken:bool = false

## field IsAnnotationToken:bool = false

## field IsTriviaToken:bool = false

## constructor:(template:Template)=>void

```ts
this.Template = template;
```

## method Last:(index?:int)=>Token | null

```ts
const position = this.Data.length - 1 - (index ?? 0);
if (position >= 0 && position < this.Data.length) {
  return this.Data[position];
}
return null;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

```ts
throw new Error("abstract member: Default");
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
throw new Error("abstract member: Close");
```

## method TryToClose:(context:SyntaxContext)=>CloseStates

```ts
if (this.SourceRange.Start < 0 || this.SourceRange.End < 0) {
  throw SourceException.SourceRangeContainsNull;
}
return this.Close(context);
```

## method Reclose:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = false;
return this.Close(context);
```

## method MoveDataTo:(target:Token)=>void

```ts
for (const item of this.Data) {
  target.Add(item);
}
this.Data.length = 0;
```

## method Add:<Item extends Token>(item:Item)=>Item

```ts
item.Parent = this;
this.Data.push(item);
return item;
```

## method AddRange:<Item extends Token>(items:Array<Item>)=>Token

```ts
for (const item of items) {
  item.Parent = this;
}
this.Data.push(...items);
return this;
```

## method Quit:()=>Token | null

```ts
if (this.Parent !== null) {
  this.Parent.MountedUnit = null;
}
return this.Parent;
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
throw new Error("abstract member: Process");
```

## method SignIn:(index:int)=>Token

```ts
if (this.SourceRange.Start < 0) {
  if (this.SourceRange.Document === null) {
    this.SourceRange.Document = SourceRange.CurrentDocument;
  }
  this.SourceRange.Start = index;
  return this;
}
throw SourceException.SourceRangeStartIsSetted;
```

## method SignInToken:(token:Token)=>Token

```ts
if (token.SourceRange.Start < 0) {
  throw SourceException.SourceRangeStartIsNull;
}
return this.SignIn(token.SourceRange.Start);
```

## method SignOut:(endIndex:int)=>void

```ts
if (this.SourceRange.End < 0) {
  if (this.SourceRange.Document === null) {
    this.SourceRange.Document = SourceRange.CurrentDocument;
  }
  this.SourceRange.End = endIndex;
  if (this.Data.length !== 0) {
    this.Data[this.Data.length - 1].TrySignOut(endIndex);
  }
} else {
  throw SourceException.SourceRangeEndIsSetted;
}
```

## private method TrySignOut:(endIndex:int)=>void

```ts
if (this.SourceRange.End < 0) {
  if (this.SourceRange.Document === null) {
    this.SourceRange.Document = SourceRange.CurrentDocument;
  }
  this.SourceRange.End = endIndex;
  if (this.Data.length !== 0) {
    this.Data[this.Data.length - 1].TrySignOut(endIndex);
  }
}
```

## method SignOutToken:(token:Token)=>void

```ts
if (token.SourceRange.End < 0) {
  throw SourceException.SourceRangeEndIsNull;
}
this.SignOut(token.SourceRange.End);
```

## method Sign:(token:Token)=>void

```ts
this.SignInToken(token);
this.SignOutToken(token);
```

## method Undo:(index:int)=>void

```ts
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  undoUnit.Undo(index);
}
```

## method IsUndo:(index:int)=>bool

```ts
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  return undoUnit.IsUndo(index);
}
return false;
```

## method WhichUnitRangeContains:(index:int)=>Token | null

```ts
for (let i = this.Data.length - 1; i >= 0; i--) {
  if (this.Data[i].SourceRange.IsInRange(index)) {
    return this.Data[i];
  }
}
return null;
```

## method Replace:<Item extends Token>(item:Item)=>Item

```ts
if (this.Parent === null) {
  throw new Error("没有父单元");
}
const index = this.Parent.Data.indexOf(this);
if (index === -1) {
  throw new Error("自身不在父单元的子单元里");
}
item.Parent = this.Parent;
if (this.Parent.MountedUnit === this) {
  this.Parent.MountedUnit = item;
}
this.Parent.Data.splice(index, 0, item);
this.Parent.Data.splice(index + 1, 1);
return item;
```

## method RemoveSelf:()=>void

```ts
if (this.Parent === null) {
  throw new Error("没有父单元");
}
const index = this.Parent.Data.indexOf(this);
if (index === -1) {
  throw new Error("自身不在父单元的子单元里");
}
if (this.Parent.MountedUnit === this) {
  this.Parent.MountedUnit = null;
}
this.Parent.Data.splice(index, 1);
```

## method ToAstLine:(indent:int)=>string

```ts
const depth = indent < 0 ? 0 : indent;
const pad = " ".repeat(depth * 3);
const cut = (depth + 1) * 3;
const lines: string[] = [pad + this.AstLabel()];
for (let i = 0; i < this.Data.length; i++) {
  const last = i === this.Data.length - 1;
  const block = this.Data[i].ToAstLine(depth + 1).split("\n");
  lines.push(pad + (last ? "└─ " : "├─ ") + block[0].slice(cut));
  for (let j = 1; j < block.length; j++) {
    lines.push(pad + (last ? "   " : "│  ") + block[j].slice(cut));
  }
}
return lines.join("\n");
```

## method AstLabel:()=>string

```ts
const parts: string[] = [this.constructor.name];
const pos = this.AstPos();
if (pos !== null) {
  parts.push(`pos=${pos < 0 ? "-" : String(pos)}`);
}
const start = this.SourceRange.Start;
const end = this.SourceRange.End;
parts.push(`src=[${start < 0 ? "-" : String(start)},${end < 0 ? "..." : String(end)})`);
const text = this.AstText();
if (text.length > 0) {
  parts.push(`text="${this.AstEscape(text)}"`);
}
const op = this.AstOperator();
if (op.length > 0) {
  parts.push(`op="${this.AstEscape(op)}"`);
}
return parts.join("  ");
```

## method AstPos:()=>int | null

```ts
return null;
```

## method AstText:()=>string

```ts
return "";
```

## method AstOperator:()=>string

```ts
return "";
```

## private method AstEscape:(value:string)=>string

```ts
let result = "";
for (const ch of value) {
  switch (ch) {
    case "\\":
      result += "\\\\";
      break;
    case '"':
      result += '\\"';
      break;
    case "\r":
      result += "\\r";
      break;
    case "\n":
      result += "\\n";
      break;
    case "\t":
      result += "\\t";
      break;
    default:
      result += ch;
      break;
  }
}
return result;
```

## method ToString:()=>string

```ts
return this.ToAstLine(0);
```
