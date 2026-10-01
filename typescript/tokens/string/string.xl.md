# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { ConstString } from "./const-string.xl.md"
import { InterpolationGuide } from "./interpolation-guide.xl.md"
import { InterpolationString } from "./interpolation-string.xl.md"
import { RawQuoteExitGuide } from "./raw-quote-exit-guide.xl.md"
import { Translate } from "./translate.xl.md"
import { VerbatimQuoteGuide } from "./verbatim-quote-guide.xl.md"
```

# namespace cangjie

`Typescript/Tokens/String`：字符串词法——引号向导、字符串单元与常量文本块，把 `"…"` / `'…'` / `@"…"` / `$"{…}"` / `"""…"""` 啃成 `<String …><ConstString>…</ConstString></String>`。

字符串单元：`StringGuide` 判定出是哪种字符串后就换成它。它是**单元**（能挂载子单元），按五个开关 `interpolation` / `verbatim` / `raw` 分成七条完全不同的处理路径：内插看到 `{` 就挂载 `InterpolationString`，逐字看到引号就挂载 `VerbatimQuoteGuide`，原始串看到引号就挂载 `RawQuoteExitGuide`，其余字符一律攒进常量块 `ConstString`。

三个开关与两个计数会**直接印在 XML 标签上**（`ToXmlString`），是本文件最不能出错的地方。

本文件里的 `String` 类与内置的 `String` 无关：本模块里的 `String` 会遮蔽全局 `String`，这是**故意的**，因为 `ToXmlString` 拿类名当标签名，改了就变了 XML 标签名。

`char` 表示单字符，规范里一律写 `string`。本文件没有需要排在前面的展平嵌套类；同命名空间的 `StringGuide` 是**另一个顶层类**，在 `string-guide.xl.md` 里。

# class String extends UnitToken

字符串单元。

## field interpolation:bool = false

是否支持内插字符串（`$"{a}"`）。写在 XML 标签上，一字不能差。

## field verbatim:bool = false

是否支持逐字字符串（`@"D:\1"`）。写在 XML 标签上。

## field raw:bool = false

是否支持原始字符串（`""" a """`）。写在 XML 标签上。

## field interpolationCount:int = 0

内插前缀 `$` 的个数（与内插串里 `{` 的数量一致）。写在 XML 标签上。

## field rawQuoteCount:int = 0

原始字符串的开引号个数。写在 XML 标签上。

## field StringChar:string = ""

本串用的引号字符。它只在构造器里赋值一次，所以按字段表达。

## private field Translate:Translate = new Translate()

转义累加器：`\` 之后的字符逐个进来，凑够一个转义序列再解码。字段名与类名同名，ts 里合法。

`Translate` 来自同目录的 `translate.xl.md`，本文件只用到它的 `IsTranslating` / `Append` / `DecodeClear` 三个成员。

## private field LastTranslateSource:Source | null = null

上一次解码转义序列时用的位置。用 `null` 表达「还没设过」的状态，与下面的比较行为一致（`Source.Same` 对 `null` 与非 `null` 判不等）。

## field IsRawIndentFormated:bool = false

原始字符串的缩进是否已经格式化过（保证 `FormatRawIndent` 只生效一次）。

## field RawIndent:int = 0

原始字符串去掉的缩进宽度，由 `FormatRawIndent` 算出来。

## constructor:(template:Template, stringChar:string)=>void

以模板与引号字符创建，并顺手把本单元的跳转/重组队列从模板上取下来：记下 `StringChar`，`ProcessQueue = template.BranchTemplate.Get(this.constructor, null)`，`ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor)`（`SequenceTemplate` 以**构造器对象**为键做派发）。

```ts
super(template);
this.StringChar = stringChar;
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method IsUndo:(source:Source)=>bool

字符串单元自己不可回退，恒为 `false`。

```ts
return false;
```

## method Undo:(source:Source)=>void

回退转交给**最后一个**子单元；它不是 `ConstString` 就抛错。`!(last instanceof ConstString)` 在 `last` 为 `null` 时同样成立，所以空单元也走抛错那一支。

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

```ts
this.Closed = true;
```

## method AppendToLastConstString:(value:string | null, signSource:Source)=>ConstString

把 `value` 追加到最后一个常量块上，并返回那个常量块。三步：

1. 还没有子单元、或最后一个子单元不是 `ConstString`——新建一个 `ConstString`、把它的 `ParentString` 指回自己、`SignIn` 后 `AddAndCloseLast`。
2. `value` 非 `null` 就 `AppendValueAndSignOut(value, signSource)` 把字符收进常量块；参数本身就是 `string | null`，可直接传。
3. `value` 为 `null` 时只 `SignOut(signSource)`——「这个位置只签出、不加字符」，`Translate.DecodeClear()` 返回 `null`（如 `\` + 换行）时走这条路。

```ts
if (this.Data.length === 0 || !(this.Last() instanceof ConstString)) {
  const created = new ConstString(this.Template);
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

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：按五个开关分流，把当前字符要么攒进常量块，要么引给一个新的引导单元。

七条分支（前六条各自对应一种字符串形态，最后一条必抛）：

1. **内插 + 逐字**（`interpolation && verbatim && !raw`）：引号挂 `VerbatimQuoteGuide`，`{` 挂 `InterpolationString`，其余进常量块。
2. **只内插**：正在转义就把字符喂给 `Translate`，解出一个完整转义序列（`Append` 返回 `true`）时把 `DecodeClear()` 的结果追加进常量块；否则 `\` 开转义、`{` 挂 `InterpolationString`、其余进常量块。
3. **只逐字**：引号挂 `VerbatimQuoteGuide`，其余进常量块。
4. **只原始**：引号可能是原始串的结束、也可能只是串内的纯双引号，一律挂 `RawQuoteExitGuide`（把自己的 `StringChar` 传给它），并插一条 `ReloadMessage` 把当前位置重新处理一遍让向导裁决；其余进常量块。
5. **内插 + 原始**：`{` 挂 `InterpolationGuide` 并插 `ReloadMessage`；引号挂 `RawQuoteExitGuide` 并插 `ReloadMessage`；其余进常量块。
6. **纯字符**（三个开关全关，如反引号串）：与第 2 条同款转义处理，但多一条特例——`{` 且前一个字符是 `$` 且那个 `$` 不是刚解码出来的（`!= LastTranslateSource`）且 `StringChar` 是反引号时，判为 ts 模板串的内插起点：`interpolationCount = 1`、把前一个字符 `$` 从单元上 `Undo` 掉、挂 `InterpolationString`。
7. 其余组合直接抛错，文案里带上三个开关的当前值。

两处写法值得说明：`source.Pre()!` 取出的是前一个 `Source` 本身；`!Source.Same(source.Pre(), this.LastTranslateSource)` 是「当前位置与上一次解码转义的位置不是同一个」。

```ts
const value = source.Value;
if (this.interpolation && this.verbatim && !this.raw) {
  if (value === this.StringChar) {
    this.AddToMounted(new VerbatimQuoteGuide(this.Template)).SignIn(source);
  } else if (value === "{") {
    this.AddToMounted(new InterpolationString(this.Template)).SignIn(source);
  } else {
    this.AppendToLastConstString(value, source);
  }
} else if (this.interpolation && !this.verbatim && !this.raw) {
  if (this.Translate.IsTranslating) {
    if (this.Translate.Append(value)) {
      this.AppendToLastConstString(this.Translate.DecodeClear(), source);
    }
  } else {
    if (value === "\\") {
      this.Translate.IsTranslating = true;
    } else if (value === "{") {
      this.AddToMounted(new InterpolationString(this.Template)).SignIn(source);
    } else {
      this.AppendToLastConstString(value, source);
    }
  }
} else if (!this.interpolation && this.verbatim && !this.raw) {
  if (value === this.StringChar) {
    this.AddToMounted(new VerbatimQuoteGuide(this.Template)).SignIn(source);
  } else {
    this.AppendToLastConstString(value, source);
  }
} else if (!this.interpolation && !this.verbatim && this.raw) {
  if (value === this.StringChar) {
    const guide = new RawQuoteExitGuide(this.Template);
    guide.StringChar = this.StringChar;
    this.AddToMounted(guide).SignIn(source);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
  } else {
    this.AppendToLastConstString(value, source);
  }
} else if (this.interpolation && !this.verbatim && this.raw) {
  if (value === "{") {
    this.AddToMounted(new InterpolationGuide(this.Template)).SignIn(source);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
  } else if (value === this.StringChar) {
    const guide = new RawQuoteExitGuide(this.Template);
    guide.StringChar = this.StringChar;
    this.AddToMounted(guide).SignIn(source);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
  } else {
    this.AppendToLastConstString(value, source);
  }
} else if (!this.interpolation && !this.verbatim && !this.raw) {
  if (this.Translate.IsTranslating) {
    if (this.Translate.Append(value)) {
      this.LastTranslateSource = source;
      this.AppendToLastConstString(this.Translate.DecodeClear(), source);
    }
  } else {
    if (value === "\\") {
      this.Translate.IsTranslating = true;
    } else if (value === "{" && source.Pre()?.Value === "$" && !Source.Same(source.Pre(), this.LastTranslateSource) && this.StringChar === "`") {
      this.interpolationCount = 1;
      this.Undo(source.Pre()!);
      this.AddToMounted(new InterpolationString(this.Template)).SignIn(source);
    } else {
      this.AppendToLastConstString(value, source);
    }
  }
} else {
  throw new Error(`未知字符串情况，interpolation=${this.interpolation},verbatim=${this.verbatim},raw=${this.raw}`);
}
```

## method ForceExit:(source:Source)=>void

强制退出：签出、尝试关闭、然后从父单元卸载自己。

它把这个方法暴露出来给向导使用——`StringGuide` 判定串已经结束时靠它收尾。

```ts
this.SignOut(source);
this.TryToClose();
this.Quit();
```

## method FormatRawIndent:()=>void

对原始字符串做缩进格式化：以**末行**的缩进宽度为准，把每个常量块的每行行首都削掉这么多空格，并去掉首行与末行的「结构行」。顺序是：

1. 不是原始字符串、或已经格式化过就直接返回（并把标记置上）。
2. 取最后一个子单元，不是 `ConstString` 就返回；`SkipContains(' ', '\n')` 说明末行不满足「只剩空格就到行尾」也返回。
3. `RawIndent = GetRowIndent()`，再把末行的行尾空格与换行符删掉（`RemoveLastLine`）。
4. `Data[0]` 不是 `ConstString` 就抛「原始字符串首行异常」；否则删掉它的首行（`RemoveFirstLine`）。
5. 遍历所有子单元，`ConstString` 逐个 `RemoveIndent(RawIndent, IsFirst)`——只有**第一个**常量块需要额外处理首行，`IsFirst` 在第一次迭代后置 `false`。

`instanceof ConstString` 用来逐个判定常量块。

```ts
if (!this.raw) {
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

```ts
if (source.Value === this.StringChar && this.Translate.IsTranslating === false && !this.raw && !this.verbatim) {
  this.ForceExit(source);
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，标签上带**五个属性**，内容是所有子单元的 XML 串接。

最后一句拼串（下面是节选，属性顺序与分隔符一字不差）：

`return $"<{Name} interpolation="{interpolation}"" + " verbatim="{...}"" + " raw="{...}"" + " interpolationCount="{...}"" + " rawQuoteCount="{...}">{Tmp.Join("")}</{Name}>";`

**三个必须留意的细节**：

- 五个属性的值**一律带双引号**，与其它 token 的属性写法一致。
- 三个 `bool` 属性印成小写的 `true` / `false`——与 `Import.typeOnly`、`Interface.export` 同款；不要改回大写的 `True` / `False`。
- 标签名取自 `this.constructor.name`；属性之间、属性与 `>` 之间都是**单个空格**，属性之间没有任何换行。

```ts
const name = this.constructor.name;
const interpolation = this.interpolation ? "true" : "false";
const verbatim = this.verbatim ? "true" : "false";
const raw = this.raw ? "true" : "false";
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} interpolation="${interpolation}" verbatim="${verbatim}" raw="${raw}" interpolationCount="${this.interpolationCount}" rawQuoteCount="${this.rawQuoteCount}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + 五个开关/计数 + 子单元。

键名与 XML 的五个属性**同名同源**（`interpolation` / `verbatim` / `raw` / `interpolationCount` /
`rawQuoteCount`），但值的类型按 JSON 自己的规矩：三个开关写**真布尔**（XML 那边印的是小写
`true` / `false`，两者说的是同一件事），两个计数写**真数字**（XML 那边是带引号的十进制文本）。

**只写这五个**——`StringChar` / `RawIndent` / `IsRawIndentFormated` 是解析期的状态，
它们也不进 XML；把 JSON 写成「比 XML 多几个键」等于给同一棵树造第二个事实来源。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("interpolation", this.interpolation);
result.set("verbatim", this.verbatim);
result.set("raw", this.raw);
result.set("interpolationCount", this.interpolationCount);
result.set("rawQuoteCount", this.rawQuoteCount);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method Clone:()=>Token

克隆自身：连同五个开关/计数与所有子单元的克隆一起复制。顺序是 `Sign(this)` → 逐个复制开关 → `Add(i.Clone())` → `TryToClose()`。

```ts
const result = new String(this.Template, this.StringChar);
result.Sign(this);
result.interpolation = this.interpolation;
result.verbatim = this.verbatim;
result.raw = this.raw;
result.interpolationCount = this.interpolationCount;
result.rawQuoteCount = this.rawQuoteCount;
result.RawIndent = this.RawIndent;
result.IsRawIndentFormated = this.IsRawIndentFormated;
for (const item of this.Data) {
  result.Add(item.Clone());
}
result.TryToClose();
return result;
```
