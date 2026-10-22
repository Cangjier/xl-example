# dependencies
```xl
import { BranchStates } from "../../branch-states.xl.md"
import { CloseStates } from "../../close-states.xl.md"
import { ComputePossibleShapesStates } from "../../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../../i-compute-possible-shapes.xl.md"
import { ReloadMessage } from "../../messages/reload-message.xl.md"
import { Source } from "../../source.xl.md"
import { SyntaxContext } from "../../syntax-context.xl.md"
import { Token } from "../../token.xl.md"
import { Template } from "../../templates/template.xl.md"
import { UnitToken } from "../../unit-token.xl.md"
import { ConstString } from "./const-string.xl.md"
import { InterpolationGuide } from "./interpolation-guide.xl.md"
import { InterpolationString } from "./interpolation-string.xl.md"
import { RawQuoteExitGuide } from "./raw-quote-exit-guide.xl.md"
import { Translate } from "./translate.xl.md"
import { VerbatimQuoteGuide } from "./verbatim-quote-guide.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

字符串词法——引号向导、字符串单元与常量文本块，把 `"…"` / `'…'` / `@"…"` / `$"{…}"` / `"""…"""` 啃成 `<String …><ConstString>…</ConstString></String>`。

字符串单元：`StringGuide` 判定出是哪种字符串后就换成它。它是**单元**（能挂载子单元），按三个开关 `IsSupportInterpolation` / `IsSupportVerbatim` / `IsSupportRaw` 分成七条完全不同的处理路径：内插分两种形态——**前缀式**（C# 的 `$"{a}"`，见 `{` 就开）与**引号内式**（ts 的 `` `${a}` ``，要 `${` 两个字符），两者都挂载 `InterpolationString`；逐字看到引号就挂载 `VerbatimQuoteGuide`，原始串看到引号就挂载 `RawQuoteExitGuide`，其余字符一律攒进常量块 `ConstString`。

三个开关与两个计数会直接印在 XML 标签上（`ToXmlString`）。

标签名取类名，所以本类的类名就是它产出的 XML 标签名。

# class String extends UnitToken

字符串单元。

**它是 basic token**：词法层的一个记号，内容由 `ConstString` 子单元承载。它由 `StringGuide` 从引号那一格直接造出来，不走 basic 跳转队列本身；`IsBasicToken` 这一格的作用是「它属于词法层」——形状提取完字段之后，`Data` 里不该再留着它。

## field IsBasicToken:bool = true

basic 单元：词法层记号。收集它的是 `StringGuide`，不是 `BasicBranchQueue`。

## field IsSupportInterpolation:bool = false

是否支持内插字符串（`$"{a}"`），会写进 XML 标签。

## field IsSupportVerbatim:bool = false

是否支持逐字字符串（`@"D:\1"`），会写进 XML 标签。

## field IsSupportRaw:bool = false

是否支持原始字符串（`""" a """`），会写进 XML 标签。

## field InterpolationCount:int = 0

内插前缀 `$` 的个数（与内插串里 `{` 的数量一致），会写进 XML 标签。**引号内内插（ts 的 `${…}`）恒为 1**：一个内插由一个 `{` 开启——`InterpolationExitGuide` 就是按这一格数 `}` 的。

## field RawQuoteCount:int = 0

原始字符串的开引号个数，会写进 XML 标签。

## field StringChar:string = ""

本串用的引号字符，只在构造器里赋值一次。

## private field Translate:Translate = new Translate()

转义累加器：`\` 之后的字符逐个进来，凑够一个转义序列再解码。本文件用到 `IsTranslating` / `Accept` / `Append` / `DecodeClear` 四个成员。

## private field PendingInterpolation:Source | null = null

引号内内插的 `$` 已经看到、下一个字符还没来：记下这个 `$` 的位置。**不向后看**——下一个字符到来时再决：是 `{` 就挂 `InterpolationString`，否则把这个 `$` 落回常量块再把当前字符照常处理；`$` 后面直接是收尾引号（`ExitOrPre`）或文件结束（`Close`）时，在这两个 close 点把 `$` 补落。非 `null` 期间那个 `$` 不落常量，所以不会产生空 `ConstString`。

## field IsRawIndentFormated:bool = false

原始字符串的缩进是否已经格式化过（保证 `FormatRawIndent` 只生效一次）。

## field RawIndent:int = 0

原始字符串去掉的缩进宽度，由 `FormatRawIndent` 算出来。

## constructor:(template:Template, stringChar:string)=>void

以模板与引号字符创建：记下 `StringChar`，并把本单元的跳转队列从模板上取下来。

```ts
super(template);
this.StringChar = stringChar;
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## method IsUndo:(source:Source)=>bool

字符串单元自己不可回退，恒为 `false`。

```ts
return false;
```

## method Undo:(source:Source)=>void

回退转交给**最后一个**子单元；它不是 `ConstString`（包括还没有子单元）就抛错。

```ts
const last = this.Last();
if (!(last instanceof ConstString)) {
  throw new Error("字符串最后一个元素不是ConstString");
} else {
  last.Undo(source);
}
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：如果还有一个 `$` 挂着（文件在 `$` 上结束、没等到下一个字符），先把它补落进常量块，再把自己标记为已关闭，然后**只问父单元**要不要重算候选——和 `Common.Close` 同款。

字符串 token 关闭就是「一个字符串字面量信息完备」的时刻：`StringLiteralShape` 的候选在这一刻才可能 Accept。所以这里必须把父级的重算结果原样带上去。

```ts
if (this.PendingInterpolation !== null) {
  const begin = this.PendingInterpolation;
  this.PendingInterpolation = null;
  this.AppendToLastConstString("$", begin, context);
}
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context);
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## method AppendToLastConstString:(value:string | null, signSource:Source, context:SyntaxContext)=>ConstString

把 `value` 追加到最后一个常量块上，并返回那个常量块。三步：

1. 还没有子单元、或最后一个子单元不是 `ConstString`——新建一个 `ConstString`、把它的 `ParentString` 指回自己、`SignIn` 后先关上一个子单元、再 `Add` 进去。
2. `value` 非 `null` 就用 `AppendValueAndSignOut(value, signSource)` 把字符收进常量块。
3. `value` 为 `null` 时只 `SignOut(signSource)`：这个位置只签出、不加字符。

```ts
if (this.Data.length === 0 || !(this.Last() instanceof ConstString)) {
  const created = new ConstString(this.Template);
  created.ParentString = this;
  created.SignIn(signSource);
  const lastOfAdd = this.Last();
  if (lastOfAdd !== null && !lastOfAdd.Closed) {
    lastOfAdd.TryToClose(context);
  }
  this.Add(created);
}
const result = this.Last() as ConstString;
if (value !== null) {
  result.AppendValueAndSignOut(value, signSource);
} else {
  result.SignOut(signSource);
}
return result;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：按五个开关分流，把当前字符要么攒进常量块，要么引给一个新的引导单元。

七条分支（前六条各自对应一种字符串形态，最后一条必抛）：

1. **内插 + 逐字**（`IsSupportInterpolation && IsSupportVerbatim && !IsSupportRaw`）：引号挂 `VerbatimQuoteGuide`，`{` 挂 `InterpolationString`，其余进常量块。
2. **只内插**：正在转义时先问 `Translate.Accept`——属于这次转义就 `Append`（攒够时 `DecodeClear()` 落常量块）；不属于就先把上一个转义 `DecodeClear()` 结算（签出到前一个字符）再 `ReloadMessage` 重放当前字符。不在转义时：`EscapeChars` 里的字符（ts 是 `\`）开转义，再按**模板配置的内插形态**分两小支——前缀式（`HasInterpolationPrefix` 打开、当前引号不在 `InterpolationQuoteChars` 里）见 `{` 就挂 `InterpolationGuide`，由它按 `InterpolationCount` 数连续左花括号（`$` 的个数就是开一层内插要几个 `{`）；引号内式（`HasInterpolationQuoteChars` + 引号在 `InterpolationQuoteChars` 里）**不向后看**：`$` 先只记进 `PendingInterpolation`，下一个字符到来时才决——是 `{` 就挂 `InterpolationString`，否则把 `$` 落回常量块、当前字符照常处理；`$` 后面直接收尾时由 `ExitOrPre` / `Close` 补落。引号内式还要把模板里的真 `\r\n` / `\r` 归一成 `\n`（cooked text 口径），其余字符进常量块。
3. **只逐字**：引号挂 `VerbatimQuoteGuide`，其余进常量块。
4. **只原始**：引号可能是原始串的结束、也可能只是串内的纯双引号，一律挂 `RawQuoteExitGuide`（把自己的 `StringChar` 传给它），并插一条 `ReloadMessage` 把当前位置重新处理一遍让向导裁决；其余进常量块。
5. **内插 + 原始**：`{` 挂 `InterpolationGuide` 并插 `ReloadMessage`；引号挂 `RawQuoteExitGuide` 并插 `ReloadMessage`；其余进常量块。
6. **纯字符**（三个开关全关，如 `"…"` / `'…'`）：与第 2 条同款转义处理（同样走 `Accept` / `Append` / `DecodeClear`，转义符由模板的 `EscapeChars` 给），其余字符一律进常量块——`$`、`{` 都只是普通字符，不做内插（ts 的模板串走第 2 条）。
7. 其余组合直接抛错，文案里带上三个开关的当前值。

```ts
const value = source.Value;
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
    (this.MountedUnit as VerbatimQuoteGuide)!.SignIn(source);
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
    (this.MountedUnit as InterpolationString)!.SignIn(source);
  } else {
    this.AppendToLastConstString(value, source, context);
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
    if (this.Translate.Accept(value, allowLongUnicodeBraceEscape)) {
      if (this.Translate.Append(value, allowLongUnicodeBraceEscape)) {
        this.AppendToLastConstString(this.Translate.DecodeClear(lineTerminatorChars, strictTemplateEscapes, allowLongUnicodeBraceEscape), source, context);
      }
    } else {
      const previous = source.Pre();
      if (previous !== null) {
        // `Accept` 不收的字符是「本次转义之外」的第一个字符：`\08` 的合法/非法要看它
        //（`\0` 后跟十进制数字 = legacy octal），所以把它当 nextItem 传进去。
        this.AppendToLastConstString(this.Translate.DecodeClear(lineTerminatorChars, strictTemplateEscapes, allowLongUnicodeBraceEscape, value), previous, context);
      }
      context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
    }
  } else {
    if (this.PendingInterpolation !== null && quoteInterpolation && value === "{") {
      this.PendingInterpolation = null;
      {
        const lastOfMounted = this.Last();
        if (lastOfMounted !== null && !lastOfMounted.Closed) {
          lastOfMounted.TryToClose(context);
        }
        const mounted = new InterpolationString(this.Template);
        this.Add(mounted);
        this.MountedUnit = mounted;
      }
      (this.MountedUnit as InterpolationString)!.SignIn(source);
    } else {
      if (this.PendingInterpolation !== null) {
        const begin = this.PendingInterpolation;
        this.PendingInterpolation = null;
        this.AppendToLastConstString("$", begin, context);
      }
      if (config.EscapeChars.includes(value)) {
        this.Translate.IsTranslating = true;
      } else if (quoteInterpolation && value === "$") {
        this.PendingInterpolation = source;
      } else if (!quoteInterpolation && config.HasInterpolationPrefix && value === "{") {
        {
          const lastOfMounted = this.Last();
          if (lastOfMounted !== null && !lastOfMounted.Closed) {
            lastOfMounted.TryToClose(context);
          }
          const mounted = new InterpolationGuide(this.Template);
          this.Add(mounted);
          this.MountedUnit = mounted;
        }
        (this.MountedUnit as InterpolationGuide)!.SignIn(source);
        context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
      } else if (quoteInterpolation && value === "\r") {
        this.AppendToLastConstString("\n", source, context);
      } else if (quoteInterpolation && value === "\n" && source.Pre()?.Value === "\r") {
        // CRLF 的后半：CR 已经按 `\n` 归一，这里不再追加
      } else {
        this.AppendToLastConstString(value, source, context);
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
    (this.MountedUnit as VerbatimQuoteGuide)!.SignIn(source);
  } else {
    this.AppendToLastConstString(value, source, context);
  }
} else if (!this.IsSupportInterpolation && !this.IsSupportVerbatim && this.IsSupportRaw) {
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
    (this.MountedUnit as RawQuoteExitGuide)!.SignIn(source);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
  } else {
    this.AppendToLastConstString(value, source, context);
  }
} else if (this.IsSupportInterpolation && !this.IsSupportVerbatim && this.IsSupportRaw) {
  if (value === "{") {
    {
      const lastOfMounted = this.Last();
      if (lastOfMounted !== null && !lastOfMounted.Closed) {
        lastOfMounted.TryToClose(context);
      }
      const mounted = new InterpolationGuide(this.Template);
      this.Add(mounted);
      this.MountedUnit = mounted;
    }
    (this.MountedUnit as InterpolationGuide)!.SignIn(source);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
  } else if (value === this.StringChar) {
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
    (this.MountedUnit as RawQuoteExitGuide)!.SignIn(source);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
  } else {
    this.AppendToLastConstString(value, source, context);
  }
} else if (!this.IsSupportInterpolation && !this.IsSupportVerbatim && !this.IsSupportRaw) {
  const plainConfig = this.Template.StringTemplate;
  if (this.Translate.IsTranslating) {
    if (this.Translate.Accept(value, plainConfig.AllowLongUnicodeBraceEscape)) {
      if (this.Translate.Append(value, plainConfig.AllowLongUnicodeBraceEscape)) {
        // 普通引号串：行续接认模板的 LineTerminatorChars（ECMAScript 的 `"a\<LS>b"` 也是续接）、
        // `\u{…}` 位数认 AllowLongUnicodeBraceEscape；但**不**走模板串非法转义口径——
        // 普通引号串的 cooked 照旧解码（ts 侧那些输入本身有诊断）。
        this.AppendToLastConstString(this.Translate.DecodeClear(plainConfig.LineTerminatorChars, false, plainConfig.AllowLongUnicodeBraceEscape), source, context);
      }
    } else {
      const previous = source.Pre();
      if (previous !== null) {
        this.AppendToLastConstString(this.Translate.DecodeClear(plainConfig.LineTerminatorChars, false, plainConfig.AllowLongUnicodeBraceEscape), previous, context);
      }
      context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
    }
  } else {
    if (plainConfig.EscapeChars.includes(value)) {
      this.Translate.IsTranslating = true;
    } else {
      this.AppendToLastConstString(value, source, context);
    }
  }
} else {
  throw new Error(`未知字符串情况，IsSupportInterpolation=${this.IsSupportInterpolation},IsSupportVerbatim=${this.IsSupportVerbatim},IsSupportRaw=${this.IsSupportRaw}`);
}
```

## method ForceExit:(source:Source, context:SyntaxContext)=>void

强制退出：签出、尝试关闭、然后从父单元卸载自己。

供 `StringGuide` 在判定串已经结束时调用。

```ts
this.SignOut(source);
this.TryToClose(context);
this.Quit();
```

## method FormatRawIndent:()=>void

对原始字符串做缩进格式化：以**末行**的缩进宽度为准，把每个常量块的每行行首都削掉这么多空格，并去掉首行与末行的「结构行」。顺序是：

1. 不是原始字符串、或已经格式化过就直接返回（并把标记置上）。
2. 取最后一个子单元，不是 `ConstString` 就返回；`SkipContains(' ', '\n')` 说明末行不满足「只剩空格就到行尾」也返回。
3. `RawIndent = GetRowIndent()`，再把末行的行尾空格与换行符删掉（`RemoveLastLine`）。
4. `Data[0]` 不是 `ConstString` 就抛「原始字符串首行异常」；否则删掉它的首行（`RemoveFirstLine`）。
5. 遍历所有子单元，`ConstString` 逐个 `RemoveIndent(RawIndent, IsFirst)`——只有**第一个**常量块需要额外处理首行，`IsFirst` 在第一次迭代后置 `false`。

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

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

问自己「当前字符是让我退出，还是继续前移」。

只有**不是原始串、也不是逐字串**、且当前字符正是本串的引号、且当前不在转义中时，才 `ForceExit` 并返回 `Done`；其余一律返回 `Undo`（继续前移）。

退出前先看有没有挂着的 `$`：那是 `$` 后面还没等到下一个字符、直接碰上收尾引号的情况——把它补落进常量块再退出（不向后看，收尾这一步自然给出结论）。

```ts
if (source.Value === this.StringChar && this.Translate.IsTranslating === false && !this.IsSupportRaw && !this.IsSupportVerbatim) {
  if (this.PendingInterpolation !== null) {
    const begin = this.PendingInterpolation;
    this.PendingInterpolation = null;
    this.AppendToLastConstString("$", begin, context);
  }
  this.ForceExit(source, context);
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，标签上带**五个属性**，内容是所有子单元的 XML 串接。

两个细节：三个 `bool` 属性印成 `True` / `False`（首字母大写），不是 `true` / `false`；标签名取运行时类型名，属性之间、属性与 `>` 之间都是单个空格。

```ts
const name = this.constructor.name;
const interpolation = this.IsSupportInterpolation ? "True" : "False";
const verbatim = this.IsSupportVerbatim ? "True" : "False";
const raw = this.IsSupportRaw ? "True" : "False";
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} IsSupportInterpolation=${interpolation} IsSupportVerbatim=${verbatim} IsSupportRaw=${raw} InterpolationCount=${this.InterpolationCount} RawQuoteCount=${this.RawQuoteCount}>${temp.join("")}</${name}>`;
```
