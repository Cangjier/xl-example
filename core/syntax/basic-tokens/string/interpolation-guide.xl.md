# dependencies
```xl
import { GuideToken } from "../../guide-token.xl.md"
import { SourceRange } from "../../source-range.xl.md"
import { SyntaxContext } from "../../syntax-context.xl.md"
import { Token } from "../../token.xl.md"
import { Template } from "../../templates/template.xl.md"
import { InterpolationString } from "./interpolation-string.xl.md"
import { ReloadMessage } from "../../messages/reload-message.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

# class InterpolationGuide extends GuideToken

## property ParentString:String

### get

```ts
return (this.Parent as String)!;
```

## private field Items:Array<int> = []

## private field BracketCount:int = 0

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method Navigate:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
const Value = buffer.At(index);
if (Value !== "{") {
  const whole = SourceRange.Whole(buffer.Document!);
  if (this.BracketCount >= this.ParentString.InterpolationCount) {
    //满足情况
    this.RemoveSelf();
    const Next = this.BracketCount - this.ParentString.InterpolationCount;
    for (let i = 0; i < Next; i++) {
      const ItemIndex = this.Items[i];
      const Const = this.ParentString.AppendToLastConstString(whole.At(ItemIndex), ItemIndex, context);
      if (i === 0) {
        Const.TrySignIn(ItemIndex);
      }
    }
    {
      const lastOfMounted = this.ParentString.Last();
      if (lastOfMounted !== null && !lastOfMounted.Closed) {
        lastOfMounted.TryToClose(context);
      }
      const mounted = new InterpolationString(this.Template);
      this.ParentString.Add(mounted);
      this.ParentString.MountedUnit = mounted;
    }
    (this.ParentString.MountedUnit as InterpolationString)!.SignIn(this.Items[0]);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));
    return;
  } else {
    //不满足情况
    this.RemoveSelf();
    for (const ItemIndex of this.Items) {
      this.ParentString.AppendToLastConstString(whole.At(ItemIndex), ItemIndex, context).TrySignIn(ItemIndex);
    }
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));
  }
} else {
  this.BracketCount++;
}

this.Items.push(index);
```
