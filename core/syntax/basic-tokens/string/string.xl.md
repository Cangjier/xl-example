# dependencies
```xl
import { BranchStates } from "../../branch-states.xl.md"
import { CloseStates } from "../../close-states.xl.md"
import { ComputePossibleShapesStates } from "../../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../../i-compute-possible-shapes.xl.md"
import { PossibleSource } from "../../possible-source.xl.md"
import { ReloadMessage } from "../../messages/reload-message.xl.md"
import { SourceRange } from "../../source-range.xl.md"
import { SyntaxContext } from "../../syntax-context.xl.md"
import { Token } from "../../token.xl.md"
import { Template } from "../../templates/template.xl.md"
import { UnitToken } from "../../unit-token.xl.md"
import { SyntaxException } from "../../../exceptions/syntax-exception.xl.md"
import { ConstString } from "./const-string.xl.md"
import { InterpolationGuide } from "./interpolation-guide.xl.md"
import { InterpolationString } from "./interpolation-string.xl.md"
import { RawQuoteExitGuide } from "./raw-quote-exit-guide.xl.md"
import { Translate } from "./translate.xl.md"
import { VerbatimQuoteGuide } from "./verbatim-quote-guide.xl.md"
```

# namespace cangjie

# class String extends UnitToken

## field IsBasicToken:bool = true

## field IsSupportInterpolation:bool = false

## field IsSupportVerbatim:bool = false

## field IsSupportRaw:bool = false

## field InterpolationCount:int = 0

## field RawQuoteCount:int = 0

## field StringChar:string = ""

## private field Translate:Translate = new Translate()

## private field PendingInterpolation:int = -1

## field IsRawIndentFormated:bool = false

## field RawIndent:int = 0

## constructor:(template:Template, stringChar:string)=>void

```ts
super(template);
this.StringChar = stringChar;
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## method IsUndo:(index:int)=>bool

```ts
return false;
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
try {
  while (index < buffer.End && !this.Closed) {
    if (this.Parent !== null && this.Parent.MountedUnit !== this) {
      return;
    }
    if (!context.Replaying && context.Messages.length > 0) {
      return;
    }
    if (this.MountedUnit !== null) {
      this.MountedUnit.Process(context, buffer, index);
      if (context.Index === index) {
        return;
      }
      this.LastIndex = context.Index - 1;
      index = context.Index;
      continue;
    }
    const value = buffer.ValueAt(index);
    const exitState = this.ExitOrPre(context, buffer, index, value);
    if (exitState === BranchStates.Reload) {
      context.Messages.push(new ReloadMessage(null, index));
      return;
    }
    if (exitState === BranchStates.Done) {
      if (context.Index === index) {
        context.Index = index + 1;
      }
      this.LastIndex = index;
      index = context.Index;
      continue;
    }
    let transited = false;
    if (this.ProcessQueue !== null) {
      for (const item of this.ProcessQueue.Data) {
        const state = item(context, this, buffer, index, value);
        if (state === BranchStates.Reload) {
          context.Messages.push(new ReloadMessage(null, index));
          return;
        }
        if (state === BranchStates.Done) {
          if (context.Index === index) {
            context.Index = index + 1;
          }
          this.LastIndex = index;
          index = context.Index;
          transited = true;
          break;
        }
      }
    }
    if (!transited) {
      this.Default(context, buffer, index, value);
      if (context.Index === index) {
        context.Index = index + 1;
      }
      this.LastIndex = index;
      index = context.Index;
    }
  }
} catch (e) {
  if (e instanceof SyntaxException) {
    throw e;
  }
  const start = Math.max(0, index - 1);
  const range = new SourceRange(buffer.Document, start, index + 1);
  throw SyntaxException.FromInner(range, e);
}
```

## method Undo:(index:int)=>void

```ts
const last = this.Last();
if (!(last instanceof ConstString)) {
  throw new Error("字符串最后一个元素不是ConstString");
} else {
  last.Undo(index);
}
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
if (this.PendingInterpolation !== -1) {
  const begin = this.PendingInterpolation;
  this.PendingInterpolation = -1;
  this.AppendToLastConstString("$", begin, context);
}
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, PossibleSource.Close);
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## method AppendToLastConstString:(value:string | null, index:int, context:SyntaxContext)=>ConstString

```ts
if (this.Data.length === 0 || !(this.Last() instanceof ConstString)) {
  const created = new ConstString(this.Template);
  created.ParentString = this;
  created.SignIn(index);
  const lastOfAdd = this.Last();
  if (lastOfAdd !== null && !lastOfAdd.Closed) {
    lastOfAdd.TryToClose(context);
  }
  this.Add(created);
}
const result = this.Last() as ConstString;
if (value !== null) {
  result.AppendValueAndSignOut(value, index);
} else {
  result.SignOut(index + 1);
}
return result;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

```ts
if (this.IsSupportInterpolation && this.IsSupportVerbatim && !this.IsSupportRaw) {
  if (value === this.StringChar) {
    {
      const lastOfMounted = this.Last();
      if (lastOfMounted !== null && !lastOfMounted.Closed) {
        lastOfMounted.TryToClose(context);
      }
      const mounted = new VerbatimQuoteGuide(this.Template);
      this.Add(mounted);
      this.MountedUnit = mounted;
    }
    (this.MountedUnit as VerbatimQuoteGuide)!.SignIn(index);
  } else if (value === "{") {
    {
      const lastOfMounted = this.Last();
      if (lastOfMounted !== null && !lastOfMounted.Closed) {
        lastOfMounted.TryToClose(context);
      }
      const mounted = new InterpolationString(this.Template);
      this.Add(mounted);
      this.MountedUnit = mounted;
    }
    (this.MountedUnit as InterpolationString)!.SignIn(index);
  } else {
    this.AppendToLastConstString(value, index, context);
  }
} else if (this.IsSupportInterpolation && !this.IsSupportVerbatim && !this.IsSupportRaw) {
  const config = this.Template.StringTemplate;
  const quoteInterpolation = config.HasInterpolationQuoteChars && config.InterpolationQuoteChars.includes(this.StringChar);
  const lineTerminatorChars = config.LineTerminatorChars;
  const strictTemplateEscapes = config.StrictTemplateEscapes;
  const allowLongUnicodeBraceEscape = config.AllowLongUnicodeBraceEscape;
  if (this.Translate.IsTranslating) {
    if (this.Translate.Append(value, allowLongUnicodeBraceEscape)) {
      this.AppendToLastConstString(this.Translate.DecodeClear(lineTerminatorChars, strictTemplateEscapes, allowLongUnicodeBraceEscape), index, context);
    }
  } else {
    if (this.PendingInterpolation !== -1 && quoteInterpolation && value === "{") {
      this.PendingInterpolation = -1;
      {
        const lastOfMounted = this.Last();
        if (lastOfMounted !== null && !lastOfMounted.Closed) {
          lastOfMounted.TryToClose(context);
        }
        const mounted = new InterpolationString(this.Template);
        this.Add(mounted);
        this.MountedUnit = mounted;
      }
      (this.MountedUnit as InterpolationString)!.SignIn(index);
    } else {
      if (this.PendingInterpolation !== -1) {
        const begin = this.PendingInterpolation;
        this.PendingInterpolation = -1;
        this.AppendToLastConstString("$", begin, context);
      }
      if (config.EscapeChars.includes(value)) {
        this.Translate.IsTranslating = true;
      } else if (quoteInterpolation && value === "$") {
        this.PendingInterpolation = index;
      } else if (quoteInterpolation && value === "\r") {
        this.AppendToLastConstString("\n", index, context);
      } else if (quoteInterpolation && value === "\n" && index > 0 && (index > buffer.Start ? buffer.At(index - 1) : SourceRange.Whole(buffer.Document!).At(index - 1)) === "\r") {
      } else {
        this.AppendToLastConstString(value, index, context);
      }
    }
  }
} else if (!this.IsSupportInterpolation && this.IsSupportVerbatim && !this.IsSupportRaw) {
  if (value === this.StringChar) {
    {
      const lastOfMounted = this.Last();
      if (lastOfMounted !== null && !lastOfMounted.Closed) {
        lastOfMounted.TryToClose(context);
      }
      const mounted = new VerbatimQuoteGuide(this.Template);
      this.Add(mounted);
      this.MountedUnit = mounted;
    }
    (this.MountedUnit as VerbatimQuoteGuide)!.SignIn(index);
  } else {
    this.AppendToLastConstString(value, index, context);
  }
} else if (!this.IsSupportInterpolation && !this.IsSupportVerbatim && this.IsSupportRaw) {
  this.AppendToLastConstString(value, index, context);
} else if (this.IsSupportInterpolation && !this.IsSupportVerbatim && this.IsSupportRaw) {
  this.AppendToLastConstString(value, index, context);
} else if (!this.IsSupportInterpolation && !this.IsSupportVerbatim && !this.IsSupportRaw) {
  const plainConfig = this.Template.StringTemplate;
  if (this.Translate.IsTranslating) {
    if (this.Translate.Append(value, plainConfig.AllowLongUnicodeBraceEscape)) {
      this.AppendToLastConstString(this.Translate.DecodeClear(plainConfig.LineTerminatorChars, false, plainConfig.AllowLongUnicodeBraceEscape), index, context);
    }
  } else {
    if (plainConfig.EscapeChars.includes(value)) {
      this.Translate.IsTranslating = true;
    } else {
      this.AppendToLastConstString(value, index, context);
    }
  }
} else {
  throw new Error(`未知字符串情况，IsSupportInterpolation=${this.IsSupportInterpolation},IsSupportVerbatim=${this.IsSupportVerbatim},IsSupportRaw=${this.IsSupportRaw}`);
}
```

## method ForceExit:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
this.SignOut(index + 1);
this.TryToClose(context);
this.Quit();
```

## method FormatRawIndent:()=>void

```ts
if (!this.IsSupportRaw) {
  return;
}
if (this.IsRawIndentFormated) {
  return;
}
this.IsRawIndentFormated = true;
const Last = this.Last();
if (!(Last instanceof ConstString)) {
  return;
}
const LastConstString = Last;
if (!LastConstString.SkipContains(" ", "\n")) {
  return;
}
this.RawIndent = LastConstString.GetRowIndent();
LastConstString.RemoveLastLine();
if (!(this.Data[0] instanceof ConstString)) {
  throw new Error("原始字符串首行异常");
}
const FirstConstString = this.Data[0] as ConstString;
FirstConstString.RemoveFirstLine();
let IsFirst = true;
for (const i of this.Data) {
  if (i instanceof ConstString) {
    i.RemoveIndent(this.RawIndent, IsFirst);
  }
  if (IsFirst) {
    IsFirst = false;
  }
}
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
const config = this.Template.StringTemplate;
if (this.Translate.IsTranslating) {
  if (!this.Translate.Accept(value, config.AllowLongUnicodeBraceEscape)) {
    const strictTemplateEscapes = this.IsSupportInterpolation && !this.IsSupportVerbatim && !this.IsSupportRaw
      ? config.StrictTemplateEscapes
      : false;
    this.AppendToLastConstString(
      this.Translate.DecodeClear(config.LineTerminatorChars, strictTemplateEscapes, config.AllowLongUnicodeBraceEscape, value),
      index - 1,
      context,
    );
    return BranchStates.Reload;
  }
}
if (value === this.StringChar && this.Translate.IsTranslating === false && !this.IsSupportRaw && !this.IsSupportVerbatim) {
  if (this.PendingInterpolation !== -1) {
    const begin = this.PendingInterpolation;
    this.PendingInterpolation = -1;
    this.AppendToLastConstString("$", begin, context);
  }
  this.ForceExit(context, buffer, index);
  return BranchStates.Done;
}
if (this.Translate.IsTranslating === false) {
  if (this.IsSupportRaw && !this.IsSupportVerbatim) {
    if (value === this.StringChar) {
      const guide = new RawQuoteExitGuide(this.Template);
      guide.StringChar = this.StringChar;
      {
        const lastOfMounted = this.Last();
        if (lastOfMounted !== null && !lastOfMounted.Closed) {
          lastOfMounted.TryToClose(context);
        }
        this.Add(guide);
        this.MountedUnit = guide;
      }
      (this.MountedUnit as RawQuoteExitGuide)!.SignIn(index);
      return BranchStates.Reload;
    }
    if (this.IsSupportInterpolation && value === "{") {
      {
        const lastOfMounted = this.Last();
        if (lastOfMounted !== null && !lastOfMounted.Closed) {
          lastOfMounted.TryToClose(context);
        }
        const mounted = new InterpolationGuide(this.Template);
        this.Add(mounted);
        this.MountedUnit = mounted;
      }
      (this.MountedUnit as InterpolationGuide)!.SignIn(index);
      return BranchStates.Reload;
    }
  } else if (this.IsSupportInterpolation && !this.IsSupportVerbatim && !this.IsSupportRaw) {
    if (value === "{") {
      const quoteInterpolation = config.HasInterpolationQuoteChars && config.InterpolationQuoteChars.includes(this.StringChar);
      if (!quoteInterpolation && config.HasInterpolationPrefix) {
        {
          const lastOfMounted = this.Last();
          if (lastOfMounted !== null && !lastOfMounted.Closed) {
            lastOfMounted.TryToClose(context);
          }
          const mounted = new InterpolationGuide(this.Template);
          this.Add(mounted);
          this.MountedUnit = mounted;
        }
        (this.MountedUnit as InterpolationGuide)!.SignIn(index);
        return BranchStates.Reload;
      }
    }
  }
}
return BranchStates.Undo;
```
