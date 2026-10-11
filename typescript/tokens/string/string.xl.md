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

## field IsChainBaseNode:bool = true

**我这一格能不能当一条链的基名**（投影侧那一问，第 1075 轮）：`"ab".length` 的基名就是一格完整的
`String`，所以这一页常量答 `true`——口径与两条理由见
`../../../core/syntax/token.xl.md` 的 `IsChainBaseNode`。

## field IsStringUnit:bool = true

**我这一格是不是一个字符串单元**（第 1094 轮）：字符串单元就是这一页，所以常量答 `true`——
口径与理由见 `../../../core/syntax/token.xl.md` 的 `IsStringUnit`。

## field IsStringLiteralUnit:bool = true

**我这一格是不是一段字符串字面量**（第 1094 轮）：本页与 `ConstString` 两页都答 `true`——
口径与理由见 `../../../core/syntax/token.xl.md` 的 `IsStringLiteralUnit`。

## field IsTemplateString:bool = false

**我这一格是不是一个模板串**（第 1094 轮）：在构造器里与 `StringChar` 同一趟赋好
（`stringChar === "\`"`）——「我用的引号是不是反引号」只有这一页知道，所以这一问由这一页答，
投影只读这一格。口径与两条理由见 `../../../core/syntax/token.xl.md` 的 `IsTemplateString`。

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

以模板与引号字符创建，并顺手把本单元的跳转/规则队列从模板上取下来：记下 `StringChar`，`ProcessQueue = template.BranchTemplate.Get(this.constructor, null)`，`CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor)`（`SequenceTemplate` 以**构造器对象**为键做派发）。

```ts
super(template);
this.StringChar = stringChar;
this.IsTemplateString = stringChar === "`";
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
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
const name = this.Tag;
const interpolation = this.interpolation ? "true" : "false";
const verbatim = this.verbatim ? "true" : "false";
const raw = this.raw ? "true" : "false";
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} range="${this.RangeOf()}" interpolation="${interpolation}" verbatim="${verbatim}" raw="${raw}" interpolationCount="${this.interpolationCount}" rawQuoteCount="${this.rawQuoteCount}">${temp.join("")}</${name}>`;
```

## property stringChar:string

`stringChar` 这一格**由这一页自己声明**（第 1018 轮）：投影读的就是这一页自己的这一格。

### get

```ts
return this.StringChar;
```

## property StringText:string

**我这一段字符串的正文**（第 1061 轮）：第一个 `ConstString` 子单元里攒的那段文本
（**不含引号**、也不含内插段的壳）；一个 `ConstString` 都没有 ⇒ 空串。

**为什么由这一页答**：这段正文本来就是这一页自己的子单元攒下来的（`ConstString` 是块单元，
文本在它的 `Temp` 上）——而过去它是**投影那一侧**回这一页的子单元里翻出来的
（`print-ast-common` 的 `stringText`：`kidsOf(v, "children").find(k => k.Tag === "ConstString")`），
同一格事实的第二处答案。第 1061 轮把它收成这一页的属性，那个 helper 一并删掉。

**量过的一格**（`tmp/r1061` 的插桩，2051 份语料）：`stringText` 被调 **19335** 次，
**每一次都是 `String`**（`ConstString` 0 次、别的标签 0 次）——所以「一个都没有 ⇒ 空串」
这一档（554 次）是唯一要保住的那一档：`""` / `''` / `` `` `` 与「有单元但值为空串」
在这一格上答的是同一个空串（它们本来就该同答）。

### get

```ts
const first = this.Data.find((k) => k.Tag === "ConstString");
if (first === undefined) return "";
const one = first as ConstString;
return one.StringText;
```

## method PrintAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：这一格出哪个节点，只许用这个 token 自己的属性、子单元与 `Parent`，不回原文查——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintAst`。

**模板串这一格的形状由这一页自己算**（第 1073 轮）：原来本方法只有一句
`return ctx.Template(v);`——算式住在共享层的 `projectString` 里，经 `ctx` 上那个转调出口
递过来。可这一格的每一半事实都是**这一页自己的**：我是不是模板（`StringChar`）、
我攒下的段（`ConstString` / `InterpolationString` 这两类子单元）、我的正文与坐标
（`Text` / `start` / `end`）、内插里那两格表达式（`ProjectableKids`）。
所以第 1073 轮把那份算式整段搬回这一页，`projectString` 与 `ctx.Template` 一并删掉
——「这一格缺什么」于是等于「这一页少写了什么」，共享层不再替它算。

**仍然要经 `ctx` 的两件事**：内插里那段正文是**表达式或类型**，递归投它需要
`ctx.Expression` / `ctx.TypeExpression`（`token` 层不能 import 投影层，会成环）；
节点本身经 `ctx.Node` 造、尾部坐标经 `ctx.StmtEndOf` 剪——**口径与共享层同一份实现**。

**值位与类型位靠 `ctx.typePosition` 分**：`` `${string}-${string}` `` 与 `` `x${b}y` ``
在产物里同形，只有这一点上下文能区分 ⇒ 外层 kind 与 span 名按它分岔。

**模板（反引号串）在产物里是** `String > [ConstString, InterpolationString, ConstString, …]`，
而 TS 那边是**另一种结构**：

~~~text
`x${b}y`  ⇒ TemplateExpression[10,18)
              head: TemplateHead[10,14)        "`x${"
              templateSpans: [ TemplateSpan[14,18)
                                 expression: Identifier[14,15)  b
                                 literal: TemplateTail[15,18)   "}y`" ]
~~~

**类型位的模板**（`` `${string}-${string}` ``）形状相同、名字不同：外层是
`TemplateLiteralType`、span 是 `TemplateLiteralTypeSpan`、里面装的是 `type`（不是 `expression`）。
两者的**产物同形**，所以靠 `ctx.typePosition`（由 `projectTypeExpression` 打标）区分。

没有内插的模板是 `NoSubstitutionTemplateLiteral`（**不是** `StringLiteral`）。

```ts
  // 值位的普通字符串（引号串）走原来的口径。
  // **「这一格是不是模板」问 token 自己**（第 1049 轮）：反引号是 `String.StringChar`
  // **在构造器里赋好的**那一格（`stringChar` 是它给投影的读法），投影不再回原文读第一个字符。
  if (this.stringChar !== "`") {
    return ctx.Node("StringLiteral", { text: this.StringText }, v);
  }
  const kids = this.ProjectableKids;
  const consts = kids.filter((k: any) => k.Tag === "ConstString");
  const interps = kids.filter((k: any) => k.Tag === "InterpolationString");
  if (interps.length === 0) {
    return ctx.Node("NoSubstitutionTemplateLiteral", { text: this.StringText }, v);
  }
  const typePosition = ctx.typePosition === true;
  // **头部含那个 `{`**：`ConstString` 已经把 `$` 收进去了（`x$`），所以终点是
  // 第一段内插的起点再加一（`{` 那一格）。**先算成局部量**——在对象字面量里引用
  // 正在初始化的 `head` 是取不到值的（试过：`Cannot access 'head' before initialization`）。
  const headEnd = interps[0].start + 1;
  const head = {
    kind: "TemplateHead",
    pos: this.start,
    end: headEnd,
    // **段内文本**（TS 的口径：**不含**分隔符）：头段去掉开头的反引号与结尾的 `${`。
    // 按区间推出来，不扫源码：`headEnd` 落在 `{` 上，所以 `$` 在 `end - 2`。
    // **读这一格自己的 `Text`**（第 1053 轮）：同一段正文，只是不再把投影手上那个字符串切一遍
    // （区间是**全文坐标**，所以两头各自减去这一格的起点）——与 `Token.Text` 同一口径。
    text: this.Text.slice(1, headEnd - 2 - this.start),
  };
  const spans: any[] = [];
  for (let i = 0; i < interps.length; i++) {
    const isLast = i === interps.length - 1;
    const inner = interps[i].ProjectableKids;
    const value = typePosition ? ctx.TypeExpression(inner) : ctx.Expression(inner);
    if (value === undefined) continue;
    // **段内文本**：从 `}` 之后算起；中段到 `$` 之前，尾段到收尾反引号之前。
    //
    // **起点按「那个 `}` 的右边一格」定，不按表达式的终点**（第 677 轮）：两者只在
    // 「表达式与 `}` 紧挨着」时相等 —— `` `${ `b${1}` }c` `` 里表达式终点落在**内层
    // 反引号之后一格**（那个空格上），照它 `+1` 就把 `}` 自己算进了段文本：
    // `node` 给 `ab1c`、本仓给 `ab1}c`（实测 `expr-template-nested-spaced`，
    // 执行侧 `l677-expressions-expr-template-nested-spaced` 量的就是它）。
    // 位置那一格第 623 轮已经这么算了（`pos` 取 `interps[i].end - 1`），
    // **文本这一格漏了同一处**——两格现在同一个起点。
    //
    // **分支按 `isLast` 定，不按 `consts[i + 1]`**：实测两者会不一致
    // （尾段也可能跟着一个常量段），那时按后者会算出一个**反向区间**——
    // `slice(25, 24)` 给的是空串，判据报的是「少了一个 `]`」，而线索离这里很远。
    const literalText = isLast
      ? this.Text.slice(interps[i].end - this.start, this.end - 1 - this.start)
      : this.Text.slice(interps[i].end - this.start, consts[i + 1].end - 1 - this.start);
    const literal = {
      kind: isLast ? "TemplateTail" : "TemplateMiddle",
      // **字面量段从 `}` 起**（TS 的 `TemplateTail` / `TemplateMiddle` 含那个右花括号），
      // 终点是下一个常量段的末尾再加一：那个 `ConstString` 已经把 `$` 收进去了，
      // 后面紧跟的 `{`（或尾段的那个反引号）是它的后面一格。
      //
      // **起点取那个 `}` 本身，不取内插表达式的终点**（第 623 轮）：两者只在
      // 「表达式与 `}` 紧挨着」时相等 —— `` `${ `b${1}` }c` `` 里表达式终点落在
      // 内层反引号之后一格（那个空格上），照它给起点就**多吞一个空格**
      //（实测 `op-template-nested`：`TemplateTail` 漂一格）。
      // `InterpolationString` 的区间**到 `}` 为止**（`$` 起、`}` 收）⇒ 减一就是它。
      pos: interps[i].end - 1,
      // 尾段后面没有常量段时（`` `${a}` ``）终点就是整个字符串的终点（含那个反引号）。
      end: consts[i + 1] === undefined ? this.end : consts[i + 1].end + 1,
      text: literalText,
    };
    const span: any = {
      kind: typePosition ? "TemplateLiteralTypeSpan" : "TemplateSpan",
      literal,
      pos: value.pos,
      end: literal.end,
    };
    if (typePosition) span.type = value;
    else span.expression = value;
    spans.push(span);
  }
  return {
    kind: typePosition ? "TemplateLiteralType" : "TemplateExpression",
    head,
    templateSpans: spans,
    pos: this.start,
    end: v.ProjectionEnd,
  };
```

**这一格与共享层逐格等价，两处替换是机械的**（第 1073 轮）：
`startOf(x)` / `endOf(x)` → `x.start` / `x.end`（那两个 `# const` 本就只是读这一格的两个属性），
`astNode(kind, props, v, ctx)` → `ctx.Node(kind, props, v)` / `stmtEndOf(v, ctx)` →
`ctx.StmtEndOf(v)`——**两条路走的是同一份实现**（`astNode` 就是 `ctx.Node` 转调的那一格），
所以判据（`cases:tsast` 全语料逐节点、`samples` 逐字节）不必为这一轮放宽。


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

## field AstKind:string | undefined = "StringLiteral"

**我这一格投成目标语言形状时叫什么节点**（第 1025 轮）：标签是我的类名（`Tag`），
节点名也是我自己的事实——过去它住在投影层那张按标签查的 `KIND_BY_TAG` 中央表里，
同一份事实于是被声明了两遍（我这一页一次、表里一次）。
基类答 `undefined`＝「这个标签没有对应节点」（原样透传 + 记 `unmapped`）。
