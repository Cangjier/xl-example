# dependencies
```xl
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { SearchBack } from "../../../core/extensions/list-extension.xl.md"
import { TakeRange } from "../../../core/extensions/list-extension.xl.md"
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { CommentsIn, GetSkipNextTrivia } from "../../text-common-util.xl.md"
import { SkipNextTrivia } from "../../text-common-util.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { IsWordUnit } from "../declaration-common.xl.md"
import { Statement } from "../statement.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { ForBody } from "./for-body.xl.md"
import { ForCompare } from "./for-compare.xl.md"
import { ForInitial } from "./for-initial.xl.md"
import { ForNext } from "./for-next.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

C 风格 `for` 语句：把 `for` `(` … `)` `{` … `}` 这一串单元重组成一个 `For`，里面分成 Initial（第一个 `;` 之前）、Compare（两个 `;` 之间）、Next（第二个 `;` 之后到右括号）、Body（后面那对 `{ }` 或单条语句）四段。

它和 `Foreach` 的收尾规则互为补集：这里只在括号里**没有** `in` / `of` 时命中，`foreach` / `for...in` 那边只在**有**时命中——两者靠这一点区分「C 风格 for」与「for-in」。

收尾规则类 `ForCloseRule` **不进 `Data`、不进 XML**，所以它的类名随便取。它必须写在 `For` **之前**：`Instance` 这个静态字段在类定义时就会 `new ForCloseRule()`，写反了会命中暂时性死区（TDZ）。

反过来，`For` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。

# class ForCloseRule extends CloseRule

收尾规则：`for` 加一个 `(` 开头、且里面**没有** `in` / `of` 的括号，就把这整段换成一个 `For`。

## static readonly field Instance:ForCloseRule = new ForCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点。

三段判定：`Get(index)` 是内容为 `for` 的 `Identifier`；`GetSkipNextTrivia(index)` 是 `startBracket` 为 `(` 的 `Bracket`；且括号里**没有**任何内容为 `in` / `of` 的 `Identifier`。任一条不成立就返回 `false`。

**为什么跨的是 trivia 而不是软换行**（第 595 轮）：`for /* c */ (;;) { }` 在 TypeScript 里是
`ForStatement` ✓（注释是 trivia ✓），只跳软换行会撞上那条注释 ✗ ⇒ 整条语句退化成一个
`ExpressionStatement` ✓（实测缺 `ForStatement` 1 + `Block` 1，多出 `ExpressionStatement` 1 +
`Identifier`(`for`) 1）。

还要一条**结构性**判定：括号里得有 `;`——C 风格 `for` 头必然带分号（`for (;;)` 也带两个）。
不加这条的话，`for` 作为**成员名**出现在接口体里（`interface SymbolConstructor { for(key: string): symbol; }`，
标准库里就有）会命中这里，然后 `Process` 找不到三段结构而抛错。
「前一个形状检查不许放行一个必然让 `Process` 抛错的输入」是本项目的通用口径。

```ts
const common = Get(units, index);
if (common instanceof Identifier && common.Is("for")) {
  const bracket = GetSkipNextTrivia(units, index);
  if (bracket instanceof Bracket && bracket.startBracket === "(") {
    const hasSeparator = bracket.Data.some((item) => item instanceof SymbolToken && item.Is(";"));
    if (hasSeparator === false) {
      return false;
    }
    return bracket.Data.some((item) => IsWordUnit(item, "in") || IsWordUnit(item, "of")) === false;
  }
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：把 `for` 头、条件括号、循环体收进一个 `For`，**返回新的下标**。

重组把多个子单元换成一个，下标必须跟着走。这里的方法体**从不给 `index` 赋值**，所以原样返回收到的 `index`——外层 `Token.Reorganize` 拿到它之后继续 `i++`，正好落在替换出来的那个 `For` 之后。

四段的取法：

1. **Initial**：括号内**第一个** `;` 之前。用 `SearchBack(-1, …)` 从括号开头向后找；找不到就抛错。
2. **Compare**：第一个 `;` 之后到**第二个** `;` 之前。第二个 `;` 用 `SearchBack(initialEnd, …)` 接着找；找不到就抛错。
3. **Next**：第二个 `;` 之后到最后一个单元。`compareEnd + 1 < Data.length` 时连签入签出带搬内容；否则**只签入签出、不搬内容**（括号里以 `;` 收尾的那种写法）。
4. **Body**：括号后面若是 `{` 开头的 `Bracket`，先把它整块搬进来再签入签出；否则从当前位置起用 `Statement.SearchStatementEnd` 找语句结尾（找不到就抛错），把那一段搬进来。

三处抛错都用 `new Error(...)`（不进规范类型位），所以不会被 `catch (SyntaxException)` 单独接住。

取区间用 `TakeRange(self, a, n)`（取出不移除）：`Take(n)` 即 `TakeRange(self, 0, n)`。

`next` 段**不调** `TryToClose()`（Initial / Compare / Body 三段都调了）。

```ts
const unit = Get(units, index)!;
const result = new For(template);
result.Parent = unit.Parent;
result.SignIn(unit.SourceRange.Start!);
let currentIndex = index;
currentIndex = SkipNextTrivia(units, currentIndex);
// **条件括号之前跨过的注释要收下**（第 595 轮）：它们落在被替换的那一段里，
// 不收就等于删掉（软换行不收，见 `CommentsIn`）。
result.AddRange(CommentsIn(units, index + 1, currentIndex));
const conditionBracket = Get(units, currentIndex) as Bracket;
const initialEnd = SearchBack(conditionBracket.Data, -1, (x) => x instanceof SymbolToken && x.Is(";"));
if (initialEnd === -1) {
  throw new Error("for(...){...} 的`(...)`中语句不满足格式要求：`(initial...;compare...;step...)`");
}
const initial = result.CreateInitial();
initial.SignIn(conditionBracket.Data[0].SourceRange.Start!);
initial.SignOut(conditionBracket.Data[initialEnd].SourceRange.End!);
initial.AddRange(TakeRange(conditionBracket.Data, 0, initialEnd));
initial.TryToClose();
const compareEnd = SearchBack(conditionBracket.Data, initialEnd, (x) => x instanceof SymbolToken && x.Is(";"));
if (compareEnd === -1) {
  throw new Error("for(...){...} 的`(...)`中语句不满足格式要求：`(initial...;compare...;step...)`");
}
const compare = result.CreateCompare();
compare.SignIn(conditionBracket.Data[initialEnd + 1].SourceRange.Start!);
compare.SignOut(conditionBracket.Data[compareEnd].SourceRange.End!);
compare.AddRange(TakeRange(conditionBracket.Data, initialEnd + 1, compareEnd - (initialEnd + 1)));
compare.TryToClose();
const nextEnd = conditionBracket.Data.length - 1;
const next = result.CreateNext();
if (compareEnd + 1 < conditionBracket.Data.length) {
  next.SignIn(conditionBracket.Data[compareEnd + 1].SourceRange.Start!);
  next.SignOut(conditionBracket.Data[nextEnd].SourceRange.End!);
  next.AddRange(TakeRange(conditionBracket.Data, compareEnd + 1, nextEnd - (compareEnd + 1) + 1));
} else {
  next.SignIn(conditionBracket.Data[nextEnd].SourceRange.Start!);
  next.SignOut(conditionBracket.Data[nextEnd].SourceRange.End!);
}
const startIndex = index;
let endIndex = currentIndex;
// **体是那条空语句（`for (…);`）**（第 590 轮）：判出来之后记在单元上（见 `EmptyBodyAt`）。
let emptyBody = false;
currentIndex = SkipNextWrapSymbol(units, currentIndex);
const forBody = result.CreateBody();
// **体的右端**（第 572 轮 ✓）：两个分支各自赋值 ✓，兜底值只是让类型定下来 ✓
//（`for` 那个词自己一定是闭着的 ✓）。见下面「体那一格单语句时」那一段说明 ✓。
let tailEnd = unit.SourceRange.End!;
const statementCandidate = Get(units, currentIndex);
if (statementCandidate instanceof Bracket && statementCandidate.startBracket === "{") {
  const statementBracket = statementCandidate;
  statementBracket.MoveDataTo(forBody);
  forBody.SignIn(statementBracket.SourceRange.Start!);
  forBody.SignOut(statementBracket.SourceRange.End!);
  tailEnd = statementBracket.SourceRange.End!;
  endIndex = currentIndex;
} else {
  endIndex = Statement.SearchStatementEnd(units, currentIndex - 1);
  if (endIndex === -1) {
    // **体一直写到输入末尾**：`for (;;) print(1)` 没有 `;`、文件又正好在这里结束时，
    // `SearchStatementEnd` 给不出结尾——那是语句写完了，不是语法错误（第 63 轮补）。
    endIndex = Statement.LastMeaningfulIndex(units, currentIndex);
  }
  // **空体：`for (…);`**（第 589 轮 ✓）：这条规则由 `;` 触发，而触发那一刻
  // **`;` 还没进 `units`**——`for (;;);` 走到这里时列表只有 `for` 与那对括号两格
  // ⇒ `SearchStatementEnd` 与 `LastMeaningfulIndex` 都给 `-1`。
  // 从前这里抛错（`dist/ts/typescript/print-ast-common.ts` 那份 `for (…);` 就是它挡下的）。
  // 体为空、`endIndex` 退到 `)` 那一格：区间借宿主的右端（下面那一支），
  // 而 `;` 由投影侧按原文补成 `EmptyStatement`（见 `For.PrintAst`）。
  if (endIndex === -1) {
    endIndex = currentIndex - 1;
    emptyBody = true;
  }
  if (endIndex >= currentIndex) {
    forBody.AddRange(TakeRange(units, currentIndex, endIndex - currentIndex + 1));
    forBody.SignIn(Get(units, currentIndex)!.SourceRange.Start!);
  } else {
    forBody.SignIn(Get(units, endIndex)!.SourceRange.End!);
  }
  // **体那一格单语句时，尾分号要算进来** ✓（第 572 轮 ✓，与第 569 轮 `do-while` 那一处同一条口径 ✓）：
  // `;` 是语句终结符 ✓ —— `Statement.FormFrom` 把它**切进壳体的区间**却不放进 `Data` ✗
  // ⇒ `Get(units, endIndex).SourceRange.End` 比 TS 少一格 ✓
  //（实测 `for (let i = 0, j = 3; i < j; i++, j--) s++;`：产物 `ForStatement [130,173)`
  //  vs TS `[130,174)` ✓ —— 单看就是「漂移 1 + 多出 1」✓）。
  // **只借宿主的右端** ✓：宿主是 `Statement` 时它比体多出来的那一格正是那个 `;` ✓；
  // **只在体是列表最后一格时才借** ✗（后面还有单元说明壳里不止这一条 ✓）；
  // 别的宿主（`Root` / 各种体 ✓）的右端是**整个容器**的末尾 ✗，照借会一路拉到文件尾 ✓。
  tailEnd = Get(units, endIndex)!.SourceRange.End!;
  const owner = unit.Parent;
  const ownerEnd = owner !== null && owner.constructor.name === "Statement" ? owner.SourceRange.End : null;
  if (ownerEnd !== null && endIndex === units.length - 1 && ownerEnd.Index > tailEnd.Index) {
    tailEnd = ownerEnd;
  }
  forBody.SignOut(tailEnd);
  // **空体那一格：把那个 `;` 的位置记在单元上**（第 590 轮）：`tailEnd` 此刻正是它
  //（宿主 `Statement` 的右端，见上面「只借宿主的右端」那一支），投影直接读这个字段。
  if (emptyBody) {
    result.EmptyBodyAt = tailEnd.Index;
  }
}
forBody.TryToClose();
result.SignOut(tailEnd);
result.TryToClose();
ReplaceCountAt(units, index, endIndex - startIndex + 1, result);
return index;
```

# class For extends IndependentToken

C 风格 `for` 语句单元。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<For>` 里依次是 Initial、Compare、Next、Body 四段的 XML。

## field EmptyBodyAt:int = -1

**体是那条空语句（`for (…);`）时，那个 `;` 的下标**；不是这一档就是 `-1`。

**为什么让 token 记着**（「token 出字段、投影直读」）：判「体是不是空的」只有
`ForCloseRule.Process` 那一处拿得到全部信息——那个 `;` 触发规则时**还没进单元列表**，
所以那边算的是「借宿主 `Statement` 的右端」。投影若再判一次，就得拿
`MatchingParen` + 跳空白**重扫一遍原文**，那是同一条判据的第二份近似。
记成字段之后，投影只做一次字段读取（见 `PrintAst`）。

## method PrintAst:(ctx:any, v:any)=>any

`for (let i = 0, j = 1; i < j; i++, j--) {}` → `ForStatement`
（**从 `ts-ast.xl.md` 的 `projectFor` 搬来**，第 189 轮）。

产物那边四个段是命名段（`initial` / `compare` / `next` / `body`），TS 那边是
`initializer` / `condition` / `incrementor` / `statement`：

- **头部三段是表达式位**：照通用投影会逐个单元投（`i < j` 会散成 `Identifier` +
  `LessThanToken` + `Identifier`）；`let` 开头的那一段走列表版
  （`VariableDeclarationList`，**不套 `VariableStatement`**）；
- **体段为空时 `body` 是 `[]`**（`for (;;) {}` 的空块在 `ToList` 时就摊掉了），
  而 TS 那边仍有一个空 `Block`——所以空体要**自己从原文造**（按头部 `)` 之后的 `{` 量区间）；
- **空体语句 `for (…);`**（第 127 轮）：体段是空的、原文里 `)` 之后紧跟一个 `;`——
  TS 那边那是一个 `EmptyStatement`（`ForStatement.statement` 不会缺）；
- **尾部 trivia 要剪掉**（第 125 轮）：循环的体段在产物里常含行尾的软换行，
  而 TS 的语句**从不含尾部 trivia**。

```ts
  const props: any = {};
  const initial = ctx.KidsOf(v, "initial").filter((k: any) => !ctx.Invisible.has(k.get("type")));
  if (initial.length > 0) {
    props.initializer =
      initial[0].get("type") === "Let" ? ctx.LetFrom(initial, v).list : ctx.Expression(initial);
  }
  const compare = ctx.KidsOf(v, "compare").filter((k: any) => !ctx.Invisible.has(k.get("type")));
  if (compare.length > 0) props.condition = ctx.Expression(compare);
  const next = ctx.KidsOf(v, "next").filter((k: any) => !ctx.Invisible.has(k.get("type")));
  if (next.length > 0) props.incrementor = ctx.Expression(next);
  const body = ctx.KidsOf(v, "body").filter((k: any) => !ctx.Invisible.has(k.get("type")));
  const built = ctx.BlockOfBody(body);
  if (built !== undefined) {
    props.statement = built.node;
  } else if (ctx.source[ctx.StmtEndOf(v) - 1] === "}") {
    const header = ctx.source.indexOf(")", v.start);
    const brace = header >= 0 ? ctx.source.indexOf("{", header) : -1;
    const close = brace >= 0 ? ctx.MatchingBrace(ctx.source, brace) : -1;
    if (brace >= 0 && close >= brace) {
      props.statement = { kind: "Block", statements: [], pos: brace, end: close + 1 };
    }
  }
  if (props.statement === undefined) {
    // **空体语句的 `;` 位置由 token 直接给出**（第 590 轮）：`ForCloseRule` 造这个单元时
    // 就知道体是空的 ✓（`;` 触发规则那一刻它还没进列表 ✓，所以那边退到「借宿主右端」✓）——
    // 把这个事实记成 `emptyBodyAt` ✓，投影**不必再拿 `MatchingParen` 重扫一遍原文** ✓
    //（「token 出字段、投影直读」：判据只算一次，投影那一侧不做第二次近似 ✓）。
    // **字段从 `attrs` 上读** ✗（与 `UnaryOperator.PrintAst` 的 `op` 同一个入口 ✓）：
    // 投影收到的 `v` 是节点包装，`ToDictionary` 的键挂在 `v.attrs` 上 ✓（`v.get` 不存在 ✓）。
    const rawEmpty = v.attrs !== undefined && typeof v.attrs.get === "function"
      ? v.attrs.get("emptyBodyAt")
      : undefined;
    const emptyAt = typeof rawEmpty === "number" ? rawEmpty : -1;
    if (emptyAt >= 0) {
      props.statement = { kind: "EmptyStatement", pos: emptyAt, end: emptyAt + 1 };
    } else {
      const close = ctx.MatchingParen(ctx.source, v.start);
      let at = close >= 0 ? close + 1 : v.start;
      while (at < ctx.source.length && /\s/.test(ctx.source[at])) at++;
      if (ctx.source[at] === ";") {
        props.statement = { kind: "EmptyStatement", pos: at, end: at + 1 };
      }
    }
  }
  return ctx.NodeHead("ForStatement", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，没有自己的字段要初始化。

```ts
super(template);
```

## method CreateInitial:()=>ForInitial

新建 Initial 段并挂到自己名下，返回新单元。

```ts
return this.Add(new ForInitial(this.Template));
```

## property Initial:ForInitial

Initial 段（第一个 `;` 之前那截）。

### get

```ts
return this.Data.find((x) => x instanceof ForInitial) as ForInitial;
```

## method CreateCompare:()=>ForCompare

新建 Compare 段并挂到自己名下，返回新单元。

```ts
return this.Add(new ForCompare(this.Template));
```

## property Compare:ForCompare

Compare 段（两个 `;` 之间那截）。

### get

```ts
return this.Data.find((x) => x instanceof ForCompare) as ForCompare;
```

## method CreateBody:()=>ForBody

新建 Body 段并挂到自己名下，返回新单元。

```ts
return this.Add(new ForBody(this.Template));
```

## property Body:ForBody

Body 段（循环体）。

### get

```ts
return this.Data.find((x) => x instanceof ForBody) as ForBody;
```

## method CreateNext:()=>ForNext

新建 Next 段并挂到自己名下，返回新单元。

```ts
return this.Add(new ForNext(this.Template));
```

## property Next:ForNext

Next 段（第二个 `;` 之后那截）。

### get

```ts
return this.Data.find((x) => x instanceof ForNext) as ForNext;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `initial` / `compare` / `next` / `body` 四个**具名分段**。

`For` 在 XML 里不写属性（`<For>` 只有子单元的串接），但它的子单元是四条各有名字的段：
`initial` 是第一个 `;` 之前那截、`compare` 是两个 `;` 之间那截、`next` 是第二个 `;` 之后到右括号、
`body` 是循环体。JSON 侧把这四个名字显式写出来，下游按段名取用，不必再靠「第几个子单元」去猜。

四段的值都取 `ToList()` 而不是 `ToDictionary()`：每段都是**一批子单元**的容器，
`ToList()` 是给「一批」准备的口子（`ToDictionary()` 是给**单个**节点用的）。
摊成扁平的 `children` 会让四段的边界一起消失——`initial` / `compare` / `next` 本来就
只靠分号分隔，JSON 里丢掉段名之后就再也切不回来了。
`next` 段在括号以 `;` 收尾时是空的，但它仍然作为一段出现（空数组），与 XML 里 `<ForNext>` 仍在树上一致。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("initial", this.Initial.ToList());
result.set("compare", this.Compare.ToList());
result.set("next", this.Next.ToList());
result.set("body", this.Body.ToList());
result.set("emptyBodyAt", this.EmptyBodyAt);
return result;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new For(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((x) => x.Clone()));
result.TryToClose();
return result;
```
