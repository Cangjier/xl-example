# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { BranchStates } from "../../../../core/syntax/branch-states.xl.md"
import { ReloadMessage } from "../../../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../../core/syntax/unit-token.xl.md"
import { ConstString } from "./const-string.xl.md"
import { InterpolationGuide } from "./interpolation-guide.xl.md"
import { InterpolationString } from "./interpolation-string.xl.md"
import { RawQuoteExitGuide } from "./raw-quote-exit-guide.xl.md"
import { Translate } from "./translate.xl.md"
import { VerbatimQuoteGuide } from "./verbatim-quote-guide.xl.md"
```

# namespace cangjie

`Dawn/Text/Tokens/String`：字符串词法——引号向导、字符串单元与常量文本块，把 `"…"` / `'…'` / `@"…"` / `$"{…}"` / `"""…"""` 啃成 `<String …><ConstString>…</ConstString></String>`。

字符串单元：`StringGuide` 判定出是哪种字符串后就换成它。它是**单元**（能挂载子单元），按五个开关 `IsSupportInterpolation` / `IsSupportVerbatim` / `IsSupportRaw` 分成七条完全不同的处理路径：内插看到 `{` 就挂载 `InterpolationString`，逐字看到引号就挂载 `VerbatimQuoteGuide`，原始串看到引号就挂载 `RawQuoteExitGuide`，其余字符一律攒进常量块 `ConstString`。

三个开关与两个计数会**直接印在 XML 标签上**（`ToXmlString`），是本文件最不能出错的地方。

本文件里的 `String` 类与 C# 的 `System.String` 无关：C# 侧它就叫 `String`（`Cangjie.Dawn.Text.Tokens.String.String`），ts 侧照抄这个名字，因此本模块里的 `String` 会遮蔽全局 `String`——这是故意的，类名必须与 C# 一致（M17），否则 XML 标签名就变了。

按 M31，`char` 在规范里一律写 `string`（单字符）。按 M33，本文件没有需要排在前面的展平嵌套类；同命名空间的 `StringGuide` 是**另一个顶层类**，在 `string-guide.xl.md` 里。

# class String extends UnitToken

字符串单元。

原 C# 侧是 `public class String : UnitToken<char>`。

## field IsSupportInterpolation:bool = false

是否支持内插字符串（`$"{a}"`）。写在 XML 标签上，一字不能差。

## field IsSupportVerbatim:bool = false

是否支持逐字字符串（`@"D:\1"`）。写在 XML 标签上。

## field IsSupportRaw:bool = false

是否支持原始字符串（`""" a """`）。写在 XML 标签上。

## field InterpolationCount:int = 0

内插前缀 `$` 的个数（与内插串里 `{` 的数量一致）。写在 XML 标签上。

## field RawQuoteCount:int = 0

原始字符串的开引号个数。写在 XML 标签上。

## field StringChar:string = ""

本串用的引号字符。原 C# 是只读属性 `public char StringChar { get; }`，只在构造器里赋值一次；ts 侧按字段表达。

## private field Translate:Translate = new Translate()

转义累加器：`\` 之后的字符逐个进来，凑够一个转义序列再解码。原 C# 是私有字段 `private Translate Translate = new();`——字段名与类名同名，ts 侧照抄（字段名与类型名同名在 ts 里合法）。

`Translate` 来自同目录的 `translate.xl.md`（`Dawn/Text/Tokens/String/Translate.cs`），本文件只用到它的 `IsTranslating` / `Append` / `DecodeClear` 三个成员。

## private field LastTranslateSource:Source<string> | null = null

上一次解码转义序列时用的位置。原 C# 是 `private Source<char> LastTranslateSource;`——C# 的结构体字段不能为 `null`，默认值是「`Document` 为 `null` 的那个 `Source`」；ts 侧用 `null` 表达这个「还没设过」的状态，与 C# 的默认值在下面的比较里行为一致（`Source.Same` 对 `null` 与非 `null` 判不等）。

## field IsRawIndentFormated:bool = false

原始字符串的缩进是否已经格式化过（保证 `FormatRawIndent` 只生效一次）。

## field RawIndent:int = 0

原始字符串去掉的缩进宽度，由 `FormatRawIndent` 算出来。

## constructor:(owner:IOwner, template:Template<string>, stringChar:string)=>void

以负责人、模板与引号字符创建，并顺手把本单元的跳转/重组队列从模板上取下来。

原 C# 是 `public String(IOwner owner, Template<char> template, char stringChar) : base(owner, template)`，体内三句：记下 `StringChar`，`ProcessQueue = template.BranchTemplate.Get(GetType(), null)`，`ReorganizationQueue = template.ReorganizationTemplate.Get(GetType())`。`GetType()` 按 M17 写成 `this.constructor`（`SequenceTemplate` 以**构造器对象**为键做派发）。

```ts
super(owner, template);
this.StringChar = stringChar;
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method IsUndo:(source:Source<string>)=>bool

字符串单元自己不可回退，恒为 `false`。

原 C# 是 `public override bool IsUndo(Source<char> source) => false;`。

```ts
return false;
```

## method Undo:(source:Source<string>)=>void

回退转交给**最后一个**子单元；它不是 `ConstString` 就抛错。

原 C# 是 `public override void Undo(Source<char> source)`，用 `last is not ConstString` 判定——类类型的模式匹配在 `null` 时不成立，等价于 ts 的 `!(last instanceof ConstString)`。

```ts
const last = this.Last();
if (!(last instanceof ConstString)) {
  throw new Error("字符串最后一个元素不是ConstString");
} else {
  last.Undo(source);
}
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

原 C# 是 `protected override void Close()`。

```ts
this.Closed = true;
```

## method AppendToLastConstString:(value:string | null, signSource:Source<string>)=>ConstString

把 `value` 追加到最后一个常量块上，并返回那个常量块。

原 C# 是 `internal ConstString AppendToLastConstString(char? value, in Source<char> signSource)`，三步：

1. 还没有子单元、或最后一个子单元不是 `ConstString`——新建一个 `ConstString`、把它的 `ParentString` 指回自己、`SignIn` 后 `AddAndCloseLast`。
2. `value` 非 `null` 就 `AppendAndSignOut(value.Value, signSource)`——那是基类**两参**的重载，按 M14(c) 在 ts 里改名 `AppendValueAndSignOut`；`value.Value` 是可空 `char?` 的解包，ts 侧参数本身就是 `string | null`，直接传。
3. `value` 为 `null` 时只 `SignOut(signSource)`——「这个位置只签出、不加字符」，`Translate.DecodeClear()` 返回 `null`（如 `\` + 换行）时走这条路。

```ts
if (this.Data.length === 0 || !(this.Last() instanceof ConstString)) {
  const created = new ConstString(this.Owner, this.Template);
  created.ParentString = this;
  created.SignIn(signSource);
  this.AddAndCloseLast(created);
}
const result = this.Last() as ConstString;
if (value !== null) {
  result.AppendValueAndSignOut(value, signSource);
} else {
  result.SignOut(signSource);
}
return result;
```

## protected method Default:(context:SyntaxContext<string>, source:Source<string>)=>void

兜底处理：按五个开关分流，把当前字符要么攒进常量块，要么引给一个新的引导单元。

原 C# 是 `protected override void Default(SyntaxContext<char> context, in Source<char> source)`，七条分支（前六条各自对应一种字符串形态，最后一条必抛）：

1. **内插 + 逐字**（`IsSupportInterpolation && IsSupportVerbatim && !IsSupportRaw`）：引号挂 `VerbatimQuoteGuide`，`{` 挂 `InterpolationString`，其余进常量块。
2. **只内插**：正在转义就把字符喂给 `Translate`，解出一个完整转义序列（`Append` 返回 `true`）时把 `DecodeClear()` 的结果追加进常量块；否则 `\` 开转义、`{` 挂 `InterpolationString`、其余进常量块。
3. **只逐字**：引号挂 `VerbatimQuoteGuide`，其余进常量块。
4. **只原始**：引号可能是原始串的结束、也可能只是串内的纯双引号，一律挂 `RawQuoteExitGuide`（把自己的 `StringChar` 传给它——C# 用对象初始化器），并插一条 `ReloadMessage` 把当前位置重新处理一遍让向导裁决；其余进常量块。
5. **内插 + 原始**：`{` 挂 `InterpolationGuide` 并插 `ReloadMessage`；引号挂 `RawQuoteExitGuide` 并插 `ReloadMessage`；其余进常量块。
6. **纯字符**（三个开关全关，如反引号串）：与第 2 条同款转义处理，但多一条特例——`{` 且前一个字符是 `$` 且那个 `$` 不是刚解码出来的（`!= LastTranslateSource`）且 `StringChar` 是反引号时，判为 ts 模板串的内插起点：`InterpolationCount = 1`、把前一个字符 `$` 从单元上 `Undo` 掉、挂 `InterpolationString`。
7. 其余组合直接抛错，文案里带上三个开关的当前值。

两处 C# 惯用写法按语义改写：`source.Pre()!.Value`（可空结构体的 `.Value`，取出来的是前一个 `Source` 本身）在 ts 里是 `source.Pre()!`；`source.Pre()!.Value != LastTranslateSource` 用的是 `Source` 重载的 `!=`，按 M19 换成 `!Source.Same(source.Pre(), this.LastTranslateSource)`。`context.Messages.Add(...)` 是 `List<Message>` 的添加，ts 侧是 `push`；三参构造器 `new ReloadMessage<char>(Owner, this, source)` 按 M14(b) 走 `ReloadMessage.WithoutProcessOwner`。

```ts
const value = source.Value;
if (this.IsSupportInterpolation && this.IsSupportVerbatim && !this.IsSupportRaw) {
  if (value === this.StringChar) {
    this.AddToMounted(new VerbatimQuoteGuide(this.Owner, this.Template)).SignIn(source);
  } else if (value === "{") {
    this.AddToMounted(new InterpolationString(this.Owner, this.Template)).SignIn(source);
  } else {
    this.AppendToLastConstString(value, source);
  }
} else if (this.IsSupportInterpolation && !this.IsSupportVerbatim && !this.IsSupportRaw) {
  if (this.Translate.IsTranslating) {
    if (this.Translate.Append(value)) {
      this.AppendToLastConstString(this.Translate.DecodeClear(), source);
    }
  } else {
    if (value === "\\") {
      this.Translate.IsTranslating = true;
    } else if (value === "{") {
      this.AddToMounted(new InterpolationString(this.Owner, this.Template)).SignIn(source);
    } else {
      this.AppendToLastConstString(value, source);
    }
  }
} else if (!this.IsSupportInterpolation && this.IsSupportVerbatim && !this.IsSupportRaw) {
  if (value === this.StringChar) {
    this.AddToMounted(new VerbatimQuoteGuide(this.Owner, this.Template)).SignIn(source);
  } else {
    this.AppendToLastConstString(value, source);
  }
} else if (!this.IsSupportInterpolation && !this.IsSupportVerbatim && this.IsSupportRaw) {
  if (value === this.StringChar) {
    const guide = new RawQuoteExitGuide(this.Owner, this.Template);
    guide.StringChar = this.StringChar;
    this.AddToMounted(guide).SignIn(source);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
  } else {
    this.AppendToLastConstString(value, source);
  }
} else if (this.IsSupportInterpolation && !this.IsSupportVerbatim && this.IsSupportRaw) {
  if (value === "{") {
    this.AddToMounted(new InterpolationGuide(this.Owner, this.Template)).SignIn(source);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
  } else if (value === this.StringChar) {
    const guide = new RawQuoteExitGuide(this.Owner, this.Template);
    guide.StringChar = this.StringChar;
    this.AddToMounted(guide).SignIn(source);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
  } else {
    this.AppendToLastConstString(value, source);
  }
} else if (!this.IsSupportInterpolation && !this.IsSupportVerbatim && !this.IsSupportRaw) {
  if (this.Translate.IsTranslating) {
    if (this.Translate.Append(value)) {
      this.LastTranslateSource = source;
      this.AppendToLastConstString(this.Translate.DecodeClear(), source);
    }
  } else {
    if (value === "\\") {
      this.Translate.IsTranslating = true;
    } else if (value === "{" && source.Pre()?.Value === "$" && !Source.Same(source.Pre(), this.LastTranslateSource) && this.StringChar === "`") {
      this.InterpolationCount = 1;
      this.Undo(source.Pre()!);
      this.AddToMounted(new InterpolationString(this.Owner, this.Template)).SignIn(source);
    } else {
      this.AppendToLastConstString(value, source);
    }
  }
} else {
  throw new Error(`未知字符串情况，IsSupportInterpolation=${this.IsSupportInterpolation},IsSupportVerbatim=${this.IsSupportVerbatim},IsSupportRaw=${this.IsSupportRaw}`);
}
```

## method ForceExit:(source:Source<string>)=>void

强制退出：签出、尝试关闭、然后从父单元卸载自己。

原 C# 是 `public void ForceExit(in Source<char> source)`，注释说明它「把这个方法暴露出来，给向导使用」——`StringGuide` 判定串已经结束时靠它收尾。

```ts
this.SignOut(source);
this.TryToClose();
this.Quit();
```

## method FormatRawIndent:()=>void

对原始字符串做缩进格式化：以**末行**的缩进宽度为准，把每个常量块的每行行首都削掉这么多空格，并去掉首行与末行的「结构行」。

原 C# 是 `public void FormatRawIndent()`，顺序是：

1. 不是原始字符串、或已经格式化过就直接返回（并把标记置上）。
2. 取最后一个子单元，不是 `ConstString` 就返回；`SkipContains(' ', '\n')` 说明末行不满足「只剩空格就到行尾」也返回。
3. `RawIndent = GetRowIndent()`，再把末行的行尾空格与换行符删掉（`RemoveLastLine`）。
4. `Data[0]` 不是 `ConstString` 就抛「原始字符串首行异常」；否则删掉它的首行（`RemoveFirstLine`）。
5. 遍历所有子单元，`ConstString` 逐个 `RemoveIndent(RawIndent, IsFirst)`——只有**第一个**常量块需要额外处理首行，`IsFirst` 在第一次迭代后置 `false`。

`i is ConstString ItemConstString` 是 C# 的模式匹配，按 M18/M20 在 ts 里写成 `instanceof` 判定。

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

## protected method ExitOrPre:(context:SyntaxContext<string>, source:Source<string>)=>BranchStates

问自己「当前字符是让我退出，还是继续前移」。

原 C# 是 `protected override BranchStates ExitOrPre(SyntaxContext<char> context, in Source<char> source)`：只有**不是原始串、也不是逐字串**、且当前字符正是本串的引号、且当前不在转义中时，才 `ForceExit` 并返回 `Done`；其余一律返回 `Undo`（继续前移）。

```ts
if (source.Value === this.StringChar && this.Translate.IsTranslating === false && !this.IsSupportRaw && !this.IsSupportVerbatim) {
  this.ForceExit(source);
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，标签上带**五个属性**，内容是所有子单元的 XML 串接。

原 C# 是 `public override string ToXmlString()`，最后一句拼串（下面是节选，属性顺序与分隔符一字不差）：

`return $"<{Name} IsSupportInterpolation={IsSupportInterpolation}" + " IsSupportVerbatim={...}" + " IsSupportRaw={...}" + " InterpolationCount={...}" + " RawQuoteCount={...}>{Tmp.Join("")}</{Name}>";`

**两个必须照抄的细节**：

- 三个 `bool` 属性在 C# 的字符串插值里走 `bool.ToString()`，结果是 `True` / `False`（**首字母大写**），不是 ts 原生的 `true` / `false`。验收夹具 `tests/fixtures/xml/04-string.xml` 里写的正是 `IsSupportInterpolation=False`，所以 ts 侧显式三元成 `"True"` / `"False"`。
- 标签名取自 `GetType().Name`，按 M17 写成 `this.constructor.name`；属性之间、属性与 `>` 之间都是**单个空格**，属性之间没有任何换行。

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

## method ToDictionary:()=>Map<string, any>

转成字典：类型名、五个开关/计数、引号字符、缩进信息，外加 `children`。

原 C# 是 `public override Dictionary<string, object> ToDictionary()`，键名照抄（都是小驼峰）；`GetType().Name` 按 M17 写成 `this.constructor.name`。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("isSupportInterpolation", this.IsSupportInterpolation);
result.set("isSupportVerbatim", this.IsSupportVerbatim);
result.set("isSupportRaw", this.IsSupportRaw);
result.set("interpolationCount", this.InterpolationCount);
result.set("rawQuoteCount", this.RawQuoteCount);
result.set("stringChar", this.StringChar);
result.set("rawIndent", this.RawIndent);
result.set("isRawIndentFormated", this.IsRawIndentFormated);
const data: any[] = [];
for (const item of this.Data) {
  data.push(item.ToDictionary());
}
result.set("children", data);
return result;
```

## method Clone:()=>Token<string>

克隆自身：连同五个开关/计数与所有子单元的克隆一起复制。

原 C# 是 `public override Token<char> Clone()`，顺序是 `Sign(this)` → 逐个复制开关 → `Add(i.Clone())` → `TryToClose()`。

```ts
const result = new String(this.Owner, this.Template, this.StringChar);
result.Sign(this);
result.IsSupportInterpolation = this.IsSupportInterpolation;
result.IsSupportVerbatim = this.IsSupportVerbatim;
result.IsSupportRaw = this.IsSupportRaw;
result.InterpolationCount = this.InterpolationCount;
result.RawQuoteCount = this.RawQuoteCount;
result.RawIndent = this.RawIndent;
result.IsRawIndentFormated = this.IsRawIndentFormated;
for (const item of this.Data) {
  result.Add(item.Clone());
}
result.TryToClose();
return result;
```
