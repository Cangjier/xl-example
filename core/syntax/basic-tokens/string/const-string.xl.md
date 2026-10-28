# dependencies
```xl
import { SyntaxContext } from "../../syntax-context.xl.md"
import { BlockToken } from "../../block-token.xl.md"
import { CloseStates } from "../../close-states.xl.md"
import { SourceRange } from "../../source-range.xl.md"
import { Token } from "../../token.xl.md"
import { Template } from "../../templates/template.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

# class ConstString extends BlockToken

## field ParentString:String | null = null

## constructor:(Template:Template)=>void

```ts
super(Template);
```

## method IsAppend:(buffer:SourceRange, index:int)=>bool

```ts
return false;
```

## method IsUndo:(index:int)=>bool

```ts
return true;
```

## method Undo:(index:int)=>void

```ts
if (this.Temp.length === 0) {
  throw new Error("ConstString Undo异常");
}
this.Temp = this.Temp.substring(0, this.Temp.length - 1);
```

## private method RemoveCharAt:(Index:int)=>void

```ts
this.Temp = this.Temp.substring(0, Index) + this.Temp.substring(Index + 1);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## method TrySignIn:(index:int)=>ConstString

```ts
if (this.SourceRange.Start < 0) {
  this.SignIn(index);
}
return this;
```

## method AstText:()=>string

```ts
return this.Temp;
```

## method Contains:(Value:string)=>bool

```ts
return this.Temp.includes(Value);
```

## method SkipContains:(SkipValue:string, FindValue:string)=>bool

```ts
for (let i = this.Temp.length - 1; i >= 0; i--) {
  const Item = this.Temp[i];
  if (Item === SkipValue) {
    continue;
  } else if (Item === FindValue) {
    return true;
  } else {
    return false;
  }
}
return false;
```

## method GetRowIndent:()=>int

```ts
let RowIndent = 0;
for (let i = this.Temp.length - 1; i >= 0; i--) {
  const Item = this.Temp[i];
  if (Item === " ") {
    RowIndent++;
  } else {
    break;
  }
}
return RowIndent;
```

## method RemoveLastLine:()=>void

```ts
let flag = 0;
for (let i = this.Temp.length - 1; i >= 0; i--) {
  const Item = this.Temp[i];
  if (flag === 0) {
    if (Item === " ") {
      this.RemoveCharAt(i);
    } else if (Item === "\n") {
      this.RemoveCharAt(i);
      flag = 1;
    } else {
      throw new Error("异常字符");
    }
  } else if (flag === 1) {
    if (Item === "\r") {
      this.RemoveCharAt(i);
    } else {
      break;
    }
  }
}
```

## method RemoveFirstLine:()=>void

```ts
let Flag = 0;
for (let i = 0; i < this.Temp.length; i++) {
  const Item = this.Temp[i];
  if (Flag === 0) {
    if (Item === " ") {
      this.RemoveCharAt(i);
      i--;
    } else if (Item === "\r") {
      this.RemoveCharAt(i);
      i--;
      Flag = 1;
    } else if (Item === "\n") {
      this.RemoveCharAt(i);
      return;
    } else {
      throw new Error("异常字符");
    }
  } else if (Flag === 1) {
    if (Item === "\n") {
      this.RemoveCharAt(i);
      return;
    } else {
      throw new Error("异常字符");
    }
  }
}
```

## private method RemoveIndentAt:(Index:int, Count:int)=>void

```ts
let SpaceCount = 0;
for (let i = Index; i < this.Temp.length; i++) {
  const Item = this.Temp[i];
  if (Item === " ") {
    this.RemoveCharAt(i);
    i--;
    SpaceCount++;
    if (SpaceCount === Count) {
      return;
    }
  } else {
    throw new Error("原始字符串缩进时异常");
  }
}
throw new Error("原始字符串缩进时未正常退出");
```

## method RemoveIndent:(Count:int, IsFirst:bool)=>void

```ts
if (Count === 0) {
  return;
}
if (IsFirst) {
  if (this.Temp.length === 0) {
    return;
  }
  if (this.Temp[0] !== " ") {
    throw new Error("首行缩进字符异常");
  }
  this.RemoveIndentAt(0, Count);
}
let LastIndex = 0;
while (true) {
  const LineStartIndex = this.Temp.indexOf("\n", LastIndex);
  if (LineStartIndex === -1) {
    break;
  }
  this.RemoveIndentAt(LineStartIndex + 1, Count);
  LastIndex = LineStartIndex + 1;
}
```
