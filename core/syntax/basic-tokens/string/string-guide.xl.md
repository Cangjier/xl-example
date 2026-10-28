# dependencies
```xl
import { BranchStates } from "../../branch-states.xl.md"
import { CloseStates } from "../../close-states.xl.md"
import { GuideToken } from "../../guide-token.xl.md"
import { ReloadMessage } from "../../messages/reload-message.xl.md"
import { SourceRange } from "../../source-range.xl.md"
import { SyntaxContext } from "../../syntax-context.xl.md"
import { Token } from "../../token.xl.md"
import { Template } from "../../templates/template.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

# class StringGuide extends GuideToken

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
const config = unit.Template.StringTemplate;
if (!config.Quotes.includes(value)) {
  return BranchStates.Undo;
}
const item = new StringGuide(unit.Template, value);
if (config.HasInterpolationQuoteChars && config.InterpolationQuoteChars.includes(value)) {
  item.IsSupportInterpolation = true;
  item.InterpolationCount = 1;
}
const undoSources: number[] = [];
const whole = SourceRange.Whole(buffer.Document!);
let last = index;
while (true) {
  last = last - 1;
  if (last < 0) {
    break;
  }
  const previous = whole.At(last);
  if (config.HasInterpolationPrefix && previous === config.InterpolationPrefix) {
    undoSources.push(last);
  } else if (config.HasVerbatim && previous === config.VerbatimPrefix) {
    undoSources.push(last);
  } else {
    break;
  }
}
for (const i of undoSources) {
  if (whole.At(i) === config.VerbatimPrefix) {
    item.IsSupportVerbatim = true;
  } else {
    item.IsSupportInterpolation = true;
    item.InterpolationCount++;
  }
  unit.Undo(i);
}
const lastOfMounted = unit.Last();
if (lastOfMounted !== null && !lastOfMounted.Closed && lastOfMounted.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
if (!config.HasRaw && !config.HasVerbatim) {
  const asString = item.CreateString(false, 1);
  unit.Add(asString);
  unit.MountedUnit = asString;
  asString.SignIn(index);
  return BranchStates.Done;
}
unit.Add(item);
unit.MountedUnit = item;
(unit.MountedUnit as StringGuide)!.SignIn(index);
return BranchStates.Done;
```

## field IsSupportInterpolation:bool = false

## field IsSupportVerbatim:bool = false

## field InterpolationCount:int = 0

## private field QuoteCount:int = 1

## field StringChar:string = ""

## constructor:(template:Template, stringChar:string)=>void

```ts
super(template);
this.StringChar = stringChar;
```

## private method CreateString:(isRaw:bool, rawQuoteCount:int)=>String

```ts
const item = new String(this.Template, this.StringChar);
item.IsSupportInterpolation = this.IsSupportInterpolation;
item.IsSupportRaw = isRaw;
item.IsSupportVerbatim = this.IsSupportVerbatim;
item.InterpolationCount = this.InterpolationCount;
item.RawQuoteCount = rawQuoteCount;
return item;
```

## protected method Navigate:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
const value = buffer.At(index);
if (this.QuoteCount === 1) {
  if (value === this.StringChar) {
    this.QuoteCount++;
  } else {
    const item = this.CreateString(false, 1);
    this.Replace(item).SignIn(index - 1);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));
  }
} else if (this.QuoteCount === 2) {
  if (value === this.StringChar) {
    this.QuoteCount++;
    if (this.IsSupportVerbatim) {
      const item = this.CreateString(false, 1);
      this.Replace(item).SignIn(index - 2);
      context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index - 1));
      context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));
    }
  } else {
    const item = this.CreateString(false, 1);
    this.Replace(item).SignIn(index - 2).SignOut(index);
    this.Parent!.MountedUnit = null;
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));
  }
} else {
  if (value === this.StringChar) {
    this.QuoteCount++;
  } else {
    const item = this.CreateString(true, this.QuoteCount);
    this.Replace(item).SignIn(this.SourceRange.Start);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));
  }
}
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
if (this.QuoteCount === 2) {
  const item = this.CreateString(false, 1);
  this.Replace(item).SignIn(this.SourceRange.Start).SignOut(this.SourceRange.End);
}
return super.Close(context);
```
