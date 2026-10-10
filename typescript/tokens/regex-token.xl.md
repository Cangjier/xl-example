# dependencies
```xl
import { Branch } from "../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../core/syntax/branch-states.xl.md"
import { ReloadMessage } from "../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Get } from "../../core/extensions/list-extension.xl.md"
import { SkipPreviousTrivia } from "../text-common-util.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

正则字面量 `/pattern/flags`：前一个 `/` 已经作为符号落在树上时，从第二个 `/` 开始把整段正则收成一个单元——正文进 `Temp`，结尾的 `m` / `g` / `i` / `s` / `u` / `y` / `d` / `v` 进 `Flags`。

**本类不碰正则的编译**：它只负责把 `/…/flags` 这段文本攒下来，真正的编译发生在执行层的 `RegexStep`（`RegexPool` 缓存 + 选项映射），本层不涉及。ts 侧的等价物是原生 `RegExp`：`RegexStep` 里的忽略大小写 / 多行 / 单行三个选项对应 `new RegExp(value, flags)` 的 `i` / `m` / `s`；`g` / `u` / `y` 交给 `RegExp` 自己认。本文件只需要保证 `Temp` 与 `Flags` 逐字正确。

`RegexTokenBranch` 写在 `RegexToken` **之前**：后者的静态字段 `JumpIn` 在类定义时立即 `new RegexTokenBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class RegexTokenBranch extends Branch

它永远不进 `Data`、不进 XML。

## static method IsOperandUnit:(item:Token)=>bool

**这一格能不能给一个表达式收尾**——能的话，紧跟在它后面的那个 `/` 就是**除号**（第 931 轮）。

原来「不是 `Identifier` 也不是 `Bracket`」的单元一律落到 `Condition` 最后那个 `else`
（答「正则」），于是字符串、模板串、正则字面量、后缀 `++` 这些**本来就是操作数**的单元
全被读成正则的开头：`"s" / 2 / 3` 的产物里连一条 `BinaryExpression` 都没有
（那条 `RegexToken` 把 ` 2 ` 当正文吞了）——实测四族各缺两条。

名单按**类名**判，与 `text-common-util.xl.md` 的 `IsTriviaUnit` 同一条理由：
直接 import 那几类会绕出环（本文件只 import 得进 `Bracket` / `Identifier`）。

| 单元 | 为什么是操作数 |
| --- | --- |
| `String` | 引号串与模板串都是操作数（`"s" / 2` / `` `t` / 2 ``） |
| `RegexToken` | 正则字面量自己也是操作数（`/re/ / 2`） |
| `SymbolToken` 的 `++` / `--` | **后缀**式（`i++ / 2`）；前缀式后面直接跟 `/` 不成话 |

`Identifier` / `Bracket` 两档不在这张表里：它们各有各的例外（前者要排语句关键字、
后者整类都是操作数），由 `Condition` 自己那两支处理。

```ts
const name = item.constructor.name;
if (name === "String" || name === "RegexToken") {
  return true;
}
if (name === "SymbolToken") {
  const text = (item as any).TempToString() as string;
  return text === "++" || text === "--";
}
return false;
```

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判据：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符**不是** `/`——也就是「第二个斜杠」的位置。

那种情况下再看 `unit.Data` 的最后两个单元里的**倒数第二个**：单元数不超过 1 就直接成立；否则它是 `Identifier` 或 `Bracket` 时**不**成立（那两个抢走了解释权），其余类型成立。

- `/*` 注释：`a /* c */ / b` 里那个 `/` 前面是注释结尾，不是正则开头；
- **本行没有配对的 `/`**：JSX 闭合标签 `</div>` 的 `/` 就是这一形状（见下）。

**`Identifier` 那一支要放关键字进来**：`return /re/.test(s)` / `typeof /re/` 里的前一个实义单元
是 `return` / `typeof`——它们在**词法阶段还是 `Identifier`**（`KeywordCloseRule` 排在通用队列最后，
那时早得很），但它显然是关键字、后面正好该跟一个表达式。
判据直接查那个 `Identifier` 自己的模板（`last.Template.KeywordTemplate`）。
不放行的话 `return /x/` 里的第一个 `/` 退化成除号，整条正则碎成 `SymbolToken` + `Identifier`
（`expr-regex-after-return` / `lex-regex-after-return-same-line` 两条用例）。
而 `a / b / c` 里 `a` 不是关键字，仍然按除号读。

`Token.Last(index)` 的语义是「倒数第 `index` 个子单元」，所以写成 `unit.Last(1)`。返回值不是 `bool` 而是 `BranchConditionResult`，所以展开成「建结果、赋 `Success`」两步。

```ts
const preUnit = source.Pre();
if (preUnit === null || preUnit.Value !== "/" || !unit.IsUndo(preUnit) || source.Value === "/") {
  const result = new BranchConditionResult();
  result.Success = false;
  return result;
}
// **本行内必须能找到配对的 `/`**（实测补的）：正则字面量不可能跨行（除了字符类里的 `\n` 转义，
// 那也写在同一行）。这一条挡住的是 **JSX 闭合标签** `</div>`——
// 那里的 `/` 前面是 `<`、于是被当成「正则开头」，而后面根本没有第二个 `/`，
// 结果 `RegexToken` 一路吃到底：实测 `const d = <div>x</div>;` 换行 `const after = 1;`
// 换行 `const after2 = 2;` 的产物只到 `<RegexToken>` 就结束，**后面的语句整段消失**。
// 找不到收尾就判否，`/` 退回普通符号，至少不会吞掉文件余下内容。
const document = source.Document;
let scan = source.Index + 1;
let closed = false;
// **字符类里的 `/` 不是收尾**（第 149 轮）：`/[/]/` 的正文是 `[/]`——那个 `/` 在 `[` `]` 里面，
// 是**字面量的一部分**。不跟字符类的话这一趟扫描会在它上面判成「已收尾」，
// 于是整条正则被读成「`/` 除号 + 数组字面量 + 除号」：实测 `ex-regex.ts` 里
// 多出 `BinaryExpression` / `CloseBracketToken`，`if (/x/.test(s)) {` 的体也跟着碎掉。
let inClass = false;
while (scan < document.GetCount()) {
  const ch = document.GetValue(scan);
  if (ch === "\n" || ch === "\r") {
    break;
  }
  if (ch === "\\") {
    scan = scan + 2;
    continue;
  }
  if (ch === "[") {
    inClass = true;
    scan = scan + 1;
    continue;
  }
  if (ch === "]") {
    inClass = false;
    scan = scan + 1;
    continue;
  }
  if (ch === "/" && inClass === false) {
    closed = true;
    break;
  }
  scan = scan + 1;
}
if (closed === false) {
  const result = new BranchConditionResult();
  result.Success = false;
  return result;
}
// **往回找的是「上一个实义单元」**（第 931 轮）：注释与软换行一律跨过去。
// `unit.Last(1)` 只看**倒数第二格**，而 `x/*c*/ / 2 / 3` 里那一格正是那条注释
// ⇒ 落到下面最后那个 `else`（「其余类型一律答正则」）⇒ 除号被读成正则的开头，
// 整条 `x / 2` 连同第二个 `/` 一起被吞进 `<RegexToken>`
//（实测：缺两条 `BinaryExpression` + 两个 `SlashToken` + 两个 `NumericLiteral`，
// 而 `<RegexToken>` 里躺着 ` 2 `）。
// 「相邻的那一格一律走 trivia 口径」是本仓的老规矩（第 817 轮），这一处是它的又一个落点。
const previous = Get(unit.Data, SkipPreviousTrivia(unit.Data, unit.Data.length - 1));
const result = new BranchConditionResult();
if (previous === null) {
  // 这一格之前没有任何实义单元（只有那个 `/`，或者只有注释）：新起的一条语句以 `/` 开头
  // ⇒ 正则（`/re/.test(x)` 那种）。与原来 `unit.Data.length <= 1` 那一档同义。
  result.Success = true;
  return result;
}
if (previous instanceof Identifier) {
  const text = previous.TempToString();
  // **`this` / `super` 是操作数，不是「等着操作数的词」**（第 931 轮）：`this / 2` 在 TS 里
  // 是除法，而它们在**词法阶段是关键字**（`KeywordCloseRule` 排在最后），
  // 照关键字那一支读就成了正则。这一句与 `tokens/binary-operator.xl.md` 的 `IsOperand`
  // 里那句（`unit.Value === "this" || unit.Value === "super"`）说的是同一件事。
  if (text === "this" || text === "super") {
    result.Success = false;
    return result;
  }
  result.Success = previous.Template.KeywordTemplate.IsKeyword(text);
} else if (previous instanceof Bracket) {
  result.Success = false;
} else if (RegexTokenBranch.IsOperandUnit(previous)) {
  // **其余能当被除数的单元**（第 931 轮）：字符串（含模板串）、正则、后缀 `++` / `--`
  // ——它们在 TS 里都能**结束一个表达式**，所以后面那个 `/` 是除号。
  // 原来它们一并落到最后那个 `else` ⇒ `"s" / 2 / 3` / `` `t` / 2 / 3 `` / `/re/ / 2` /
  // `i++ / 2` 四族全被读成正则（实测各缺两条 `BinaryExpression`）。
  result.Success = false;
} else {
  result.Success = true;
}
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下这段正则的**开头**：先把那个已经被吃掉的 `/` 回退掉（它归 `RegexToken` 所有，不属于前一个单元），然后挂一个新的 `RegexToken`，用同一个 `/` 签入，再把当前字符补进去。

`Condition` 已经确认过前一个字符是 `/`，所以这里直接写 `source.Pre()!`。

```ts
const preUnit = source.Pre()!;
unit.Undo(preUnit);
const regexToken = unit.AddToMounted(new RegexToken(unit.Template));
regexToken.SignIn(preUnit);
regexToken.Append(source);
// **开头那个字符如果是 `\`，要立刻进入转义态**（第 128 轮）。
//
// `Success` 是在**第二个字符**上被触发的（第一个 `/` 已经作为符号落树，这里把它回退掉），
// 所以 `source` 是正则正文的第一个字符。它如果是 `\`，紧随其后的那个字符就是**被转义的**——
// 而 `Append` 只往 `Temp` 里加字符、不置 `IsTranslate`，于是下一个字符若正好是 `/`
// （`/\/\//` 这种转义斜杠开头的正则），`ExitOrPre` 会把它当成**结尾斜杠**，正则在那里断掉。
// 实测 `dist/ts/typescript/ts-ast.ts` 的 `/\/\/[^\n]*|\/\*[\s\S]*?\*\//g`：
// 产物里多出一个裸 `\` 与两个空 `<RegexToken>`。
if (source.Value === "\\") {
  regexToken.IsTranslate = true;
}
// **正文第一个字符是 `[` 时同样要进字符类态**（第 149 轮）：`Success` 是**自己**把当前字符
// 塞进 `Temp` 的（不走 `ExitOrPre`），所以 `ExitOrPre` 里那条 `[` 分支对它无效——
// `/[/]/` 的正文第一个字符正是 `[`，不补这一句 `IsInClass` 一直是假，
// 类里那个 `/` 会被当成收尾斜杠（实测 `ex-regex.ts`：多出 `BinaryExpression` /
// `CloseBracketToken` / `SlashToken`，`const t = /[/]/` 只剩半条正则）。
if (source.Value === "[") {
  regexToken.IsInClass = true;
}
```

# class RegexToken extends UnitToken

正则字面量单元。

单元值类型是单字符的 `string`。

它没有覆写 `ToXmlString`，所以 XML 由 `Token.ToXmlString` 产出（子单元串接）。正则单元没有子单元，落地就是个空标签——夹具 `24-regex.xml` 里 `let a = /ab+c/g` 的第三个单元正是 `<RegexToken></RegexToken>`（**不要**给它加 `ToXmlString` 覆写）。`Temp` / `Flags` 只暴露给执行层。

## method PrintAst:(ctx:any, v:any)=>any

正则字面量 `/ab+c/gi` → `RegularExpressionLiteral`（**从 `ts-ast.xl.md` 的 `projectRegex` 整体搬来**，第 182 轮）。

**区间按原文重新量**：从那个 `/` 起扫到配对的 `/`（跳过 `\` 转义与 `[…]` 字符类），
再把后面的 flags 吃掉。终点不是 `stmtEndOf` 能给的，所以这里直接返回节点字面量。

**这一格在第 931 轮之后变成了一道保险**：那次把 `ExitOrPre` 的签出改成落在
**正则的最后一个字符**上（原来多一个字符，见那一处的说明），所以单元自己的区间已经与
TS 一致；这里重新量仍然值得留着——它同时负责把 flags 算进去，而且不依赖单元区间的口径。

```ts
  const source = ctx.source;
  let end = v.start + 1;
  let inClass = false;
  for (; end < source.length; end++) {
    const c = source[end];
    if (c === "\\") {
      end++;
      continue;
    }
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) break;
    else if (c === "\n") break;
  }
  if (end < source.length && source[end] === "/") end++;
  while (end < source.length && /[a-z]/.test(source[end])) end++;
  return { kind: "RegularExpressionLiteral", pos: v.start, end };
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 1000 轮）：与上面的 `PrintAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

上面那一趟是**从那个 `/` 起回原文扫一遍**（跳 `\` 转义与 `[…]` 字符类、吃掉 flags），
而那件事**正则单元自己已经做过一次**：`Temp` 是正文、`Flags` 是旗标，
第 931 轮之后**单元自己的区间已经落在正则的最后一个字符上**（含 flags）——
实测 `let a = /ab+c/gi;` 的单元区间是 `[8,15]`（`/ab+c/gi` 全在里面），
于是这一格只要把**自己的坐标**交出去：`pos` 就是 `v.start`、`end` 就是 `v.end`。

**为什么这样比回原文扫更准**：那一趟认的是**原文里的字符**（`\`、`[`、`]`、`/`、`\n`），
而这个单元是**词法那一趟**认下来的——同一个问句没有第二份答案。

```ts
  return { kind: "RegularExpressionLiteral", pos: v.start, end: v.end };
```

## static readonly field JumpIn:RegexTokenBranch = new RegexTokenBranch()

把 `RegexTokenBranch` 注册进 `Root` 的通用跳转队列用的实例。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列与规则队列都取出来。

取运行时类型用 `this.constructor`。

注意 `CloseRuleTemplate` 取出来的是**默认队列**：本类没有嵌套的 `CloseRule`，把正则从单元列表里摘掉是执行层 `RegexStep.Parser` 干的事（本层不做）。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor, null);
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## field Temp:string = ""

正则正文，**不含两端的斜杠**：`Success` 用开头那个 `/` 签入却只 `Append` 当前字符，结尾的 `/` 又只置 `IsReadyToExit`。所以 `let a = /ab+c/g` 攒出来的是 `ab+c`、`Flags` 是 `g`，执行层拼出的键 `/${RegexValue}/${Flags}` 正好是 `/ab+c/g`（见 `RegexStep.Set`）。

`Temp` 写成 `string`：它只被本类读写，没有被别处当容器用，所以 `this.Temp += c`，换成字符串不失语义。

## field IsReadyToExit:bool = false

是否已经见到结尾的 `/`（此后只可能再收标志字符）。

## field IsTranslate:bool = false

上一个字符是不是转义用的 `\`（正则里 `\/` 不该结束字面量）。

## field IsInClass:bool = false

当前是不是在**字符类** `[...]` 里面（第 149 轮）。类里的 `/` 是字面量的一部分：
`/[/]/` 的正文是 `[/]`。不跟踪它的话收尾斜杠会提前落在类里那个 `/` 上，
整条正则被读成除法 + 数组字面量。

```ts
this.IsInClass = false;
```

## field Flags:string = ""

结尾标志字符（`m` / `g` / `i` / `s` / `u` / `y` / `d` / `v`）逐个攒进来；用 `string` 就好。

**这一格还决定单元自己的区间**（第 1000 轮）：签出落在最后收进来的那个标志字符上，
所以少认一个字母，本单元的区间就短一格——`PrintDirectAst` 直接交出去的正是这个区间
（见下面那一格），于是「认不出 `d`」这件事会当场显形。

## method Append:(source:Source)=>void

把当前字符补进 `Temp`。

只有 `RegexTokenBranch.Success` 调它，所以落成普通公开方法。

```ts
this.Temp += source.Value;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

跳转队列没接手时，把字符并进 `Temp`。

```ts
this.Temp += source.Value;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

本类的调度核心，三个状态：

1. **转义中**（`IsTranslate`）：把 `\` 之后的这个字符原样收进 `Temp`，退出转义态，返回 `Done`。
2. **还没见到结尾的 `/`**：当前字符是 `\` 就收进 `Temp` 并进入转义态，是 `/` 就把 `IsReadyToExit` 置真——两种都返回 `Done`；其余返回 `Undo`，让字符继续往下走。
3. **已经见到结尾的 `/`**：当前字符是 `m` / `g` / `i` / `s` / `u` / `y` / `d` / `v` 之一就收进 `Flags`；否则说明字面量结束——签出、关闭自己并跑重组、卸载，再插一条 `ReloadMessage` 让当前字符重新处理。两种情况都返回 `Done`。

标志字符的判定展开成一串 `||`；插消息走静态工厂 `ReloadMessage.WithoutProcessOwner`。

```ts
if (!this.IsTranslate) {
  if (this.IsReadyToExit) {
    if (
      source.Value === "m" ||
      source.Value === "g" ||
      source.Value === "i" ||
      source.Value === "s" ||
      source.Value === "u" ||
      source.Value === "y" ||
      // **`d` 与 `v` 也是标志位**（第 1000 轮）：`d`（`hasIndices`，ES2022）与
      // `v`（Unicode 集合，ES2024）与上面那六个同级。原来这一串里没有这两个字母，
      // 于是 `/a/dgimsuy` 在 `d` 上**当场收尾**——`Flags` 只剩空串、单元区间也只到收尾的 `/`，
      // 后面那串 `dgimsuy` 被重新词法成标识符（实测 `expr-regex-flags` / `lex-regex-flags`
      // 两条用例：TS 那边 `RegularExpressionLiteral` 的区间是 `[55,65)`，我们只到 `[55,58)`）。
      // 判据只有一份，就写在词法这一趟里：**认下这个字面量的那一刻，它到底到哪结束**。
      source.Value === "d" ||
      source.Value === "v"
    ) {
      this.Flags += source.Value;
    } else {
      // **签出要落在正则的最后一个字符上**（第 931 轮）：走到这里时 `source` 是**紧跟
      // 字面量后面**的那一格（标志位之后的第一个字符，或者收尾 `/` 之后那个字符），
      // `SignOut(source)` 于是让本单元的终点**比字面量多一个字符**——
      // `typeof /re/;` 里那个 `;` 也算进正则的区间。`PrintAst` 那边用「从 `/` 扫到配对的 `/`」
      // 重新量过一遍（所以 `RegularExpressionLiteral` 自己是对的），可**父节点**是按
      // `v.end` 算的：`typeof /re/;` 的 `TypeOfExpression` 因此是 `[10,22)` 而不是 `[10,21)`
      //（实测 `gap-r931-typeof-regex-range`：漂 1 多 1）。往回退一格就对了。
      this.SignOut(source.Pre()!);
      this.TryToClose();
      this.Quit();
      context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
    }
    return BranchStates.Done;
  }
  if (source.Value === "\\") {
    this.Temp += source.Value;
    this.IsTranslate = true;
    return BranchStates.Done;
  }
  if (source.Value === "[") {
    // **进了字符类**（第 149 轮）：类里的 `/` 是字面量的一部分，不能收尾（见 `Condition` 那一处）。
    this.IsInClass = true;
    return BranchStates.Undo;
  }
  if (source.Value === "]") {
    this.IsInClass = false;
    return BranchStates.Undo;
  }
  if (source.Value === "/" && this.IsInClass === false) {
    this.IsReadyToExit = true;
    return BranchStates.Done;
  }
  return BranchStates.Undo;
}
this.Temp += source.Value;
this.IsTranslate = false;
return BranchStates.Done;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Temp` 追加到自身 → 把 `Flags` 追加到自身 → `TryToClose()`。

```ts
const result = new RegexToken(this.Template);
result.Sign(this);
result.Temp += this.Temp;
result.Flags += this.Flags;
result.TryToClose();
return result;
```
