# dependencies
```xl
import { GuideToken } from "../../guide-token.xl.md"
import { SourceRange } from "../../source-range.xl.md"
import { SyntaxContext } from "../../syntax-context.xl.md"
import { Token } from "../../token.xl.md"
import { Template } from "../../templates/template.xl.md"
import { InterpolationString } from "./interpolation-string.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

# class InterpolationExitGuide extends GuideToken

## property AncestorString:String

### get

```ts
return (this.Parent as InterpolationString)!.ParentString;
```

## protected field BracketCount:int = 0

## protected field Items:Array<int> = []

## constructor:(Template:Template)=>void

```ts
super(Template);
```

## protected method Navigate:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
const Value = buffer.At(index);
if (Value === "}") {
  this.BracketCount++;
  if (this.BracketCount === this.AncestorString.InterpolationCount) {
    this.RemoveSelf();
    (this.Parent as InterpolationString)!.ForceExit(context, buffer, index);
    return;
  } else if (this.BracketCount < this.AncestorString.InterpolationCount) {
    //不确定
  } else {
    throw new Error("");
  }
} else {
  //不正常
  throw new Error("插值关闭异常");
}
this.Items.push(index);
```
