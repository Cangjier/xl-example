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
      // 与基类同一口径：当前字符只读一次，顺链传给每条跳转。
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
  // 转义结算的语言口径从模板上取：行终止符表（行续接）、模板串非法转义开关
  //（ECMAScript 模板串里 legacy octal / `\8` `\9` 的 cooked 是 undefined，取原文）、
  // 花括号形 `\u{…}` 是否允许超过 6 位十六进制。
  const lineTerminatorChars = config.LineTerminatorChars;
  const strictTemplateEscapes = config.StrictTemplateEscapes;
  const allowLongUnicodeBraceEscape = config.AllowLongUnicodeBraceEscape;
  if (this.Translate.IsTranslating) {
    // `Accept` 已由 ExitOrPre 问过（返回 false 的那条在那边结算并重放），这里只可能是「还属于本次转义」。
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
        // CRLF 的后半：CR 已经按 `\n` 归一，这里不再追加
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
  // 引号由 ExitOrPre 挂上 RawQuoteExitGuide 后重放；这里只剩其余字符进常量块。
  this.AppendToLastConstString(value, index, context);
} else if (this.IsSupportInterpolation && !this.IsSupportVerbatim && this.IsSupportRaw) {
  // `{` 与引号都由 ExitOrPre 挂向导后重放；这里只剩其余字符进常量块。
  this.AppendToLastConstString(value, index, context);
} else if (!this.IsSupportInterpolation && !this.IsSupportVerbatim && !this.IsSupportRaw) {
  const plainConfig = this.Template.StringTemplate;
  if (this.Translate.IsTranslating) {
    // 普通引号串：行续接认模板的 LineTerminatorChars、`\u{…}` 位数认 AllowLongUnicodeBraceEscape；
    // 但**不**走模板串非法转义口径——普通引号串的 cooked 照旧解码（ts 侧那些输入本身有诊断）。
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
    // `Accept` 不收的字符是「本次转义之外」的第一个字符：`\08` 的合法/非法要看它
    //（`\0` 后跟十进制数字 = legacy octal），所以把它当 nextItem 传进去。
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
      // 原始串的引号：挂 RawQuoteExitGuide 并重放，由向导数这一串引号。
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
      // 内插 + 原始：`{` 挂 InterpolationGuide 并重放。
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
        // 前缀式内插：`{` 挂 InterpolationGuide 并重放，由向导数连续左花括号。
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
