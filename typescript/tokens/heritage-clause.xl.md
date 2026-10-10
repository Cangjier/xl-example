# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { IsTriviaUnit, WordText, SkipNextWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Keyword } from "./keyword.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**继承段**：`class C extends B implements I, J` 与 `interface K extends L<M>, N` 里的
`extends …` / `implements …` 各收成一个 `HeritageClause`，段里每个实体名收成一个
`ExpressionWithTypeArguments`。

TypeScript 那边的形状（实测 AST）：

    ClassDeclaration
      HeritageClause «extends B»            → ExpressionWithTypeArguments «B»
      HeritageClause «implements I, J»      → ExpressionWithTypeArguments «I», «J»
    InterfaceDeclaration
      HeritageClause «extends L<M>, N»      → ExpressionWithTypeArguments «L<M>»（名字 + 类型实参都在里面）, «N»

本工程原来只在**属性**里记这件事（`<Class extends="B" implements="I,J">`）：
类还把那些单元留在子单元里（`Keyword extends` / `Identifier B` ……），
接口更彻底——`entities` 那一段的名字与逗号被规则**消费掉**，只留一个类型实参段
（第 66 轮第七批已经让接口把名字与逗号也搬进来）。两边都缺「这是一条继承子句」的节点。

**子句在解析期收**（第 564 轮起这是唯一一条路）：类头与接口头都走
`HeritageClause.OrganizeAll`（`ClassBranch` / `InterfaceBranch` 在「头刚成形、体还没进来」
那一刻各调一次，见那一节）。段的范围到**下一个 `implements`** 或**体节点 / 体括号**
（`ClassBody` / `InterfaceBody`）为止。

**从前还有一条规则锚在 `extends` / `implements` 那个词上**（`HeritageClauseCloseRule`）：
`OrganizeAll` 一接手它就没有机会了 —— 它最后那道守卫是「这个单元还没有祖先叫
`HeritageClause`」，而头成形那一刻子句已经收好了 ⇒ 全语料 **0 次命中**
（第 564 轮量的账：1,580,480 次 `Previous` 调用、命中 0 次）⇒ 连同队列里的那一格一起删掉。

`ExpressionWithTypeArguments` 里装**名字与它的类型实参**（`L<M>` 整个）——
与 TS 一致：`ExpressionWithTypeArguments` 的 `expression` 是名字、`typeArguments` 是那段实参，
区间覆盖两者。

# class HeritageClause extends IndependentToken

一条继承子句（`extends B` / `implements I, J`）。类名必须与产物的标签名一致。

内容：子句词（`extends` / `implements`）、逗号、以及每个实体名的 `ExpressionWithTypeArguments`。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["HeritageClause", new Map([["children", "types"]])]]);
```

## static method IsClauseWord:(item:Token | null)=>bool

这个单元是不是 `extends` / `implements` 这两个词之一（两种形态都认：没升级的 `Identifier`
与已升级的 `Keyword`）。

**这一条原来在 `HeritageClauseCloseRule` 上**，现在搬到这里（那条规则第 564 轮已删）：
类头在 `{` 那一刻也要用同一个判据（同一个问题一份答案）。

```ts
if (item === null) {
  return false;
}
const word = WordText(item);
return word === "extends" || word === "implements";
```

## static method ClauseEnd:(units:Array<Token>, index:int)=>int

这条子句的终点（含）：走到**下一个 `implements`** 之前、或者**体节点 / 体括号**之前。

**这一条原来在一条收尾规则上**，搬过来共用 ——
两处的时机只差一点：类头那边此刻**类体还没进 `Data`**（`ClassBody` 是下一步才 `Add` 的），
所以它自然止于列表末尾；接口那边头搬进来时**体节点已经在表里**，靠下面那两句停住。

```ts
let end = index;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    break;
  }
  // **体节点也要停**（实测踩过）：`Class` 的子单元是 `ClassBody` 节点、不是 `{` 括号，
  // 只认 `Bracket` 时最后一段会把整个类体吞进 `ExpressionWithTypeArguments`
  // （`class C extends B implements J {}` 的 `J` 后面挂着 `<ClassBody>`）。
  const name = item.constructor.name;
  if (name === "ClassBody" || name === "InterfaceBody") {
    break;
  }
  // 体是 `{` 括号（有些写法里进得来），`(` **不是**边界：
  // `class A extends (Base) {}` / `class B extends mixin(C) {}` 是合法的继承表达式，
  // 括号属于那个实体名（实测漏过 1 处：`decl-class-extends-parenthesized`）。
  if (item instanceof Bracket && item.startBracket === "{") {
    break;
  }
  if (HeritageClause.IsClauseWord(item) && WordText(item) === "implements") {
    break;
  }
  // **透明单元不进终点**（第 658 轮）：软换行与注释都不是子句的一部分——
  // TS 的 `HeritageClause` 到最后一个实体名为止（`class A extends B /* c */ {}` 是 `[8,17)`）。
  // 原来只跳软换行，于是**行尾那条注释把子句区间撑了出去**（实测产物 `[8,25)` =
  // `extends B /* c */`，`class` 与 `interface` 两族各一条）。
  // 与 `Take` 里「段的区间跳过段首 / 段尾的透明单元」是同一条口径：透明单元照样进 `Data`，
  // 只是不把父单元的区间撑出去。
  if (!IsTriviaUnit(item)) {
    end = i;
  }
}
return end;
```

## static method Take:(template:Template, owner:Token | null, items:Array<Token>)=>HeritageClause

把**一整段平列表**（`items` = 子句词 + 后面到终点为止的每一个单元）收成一个 `HeritageClause`，
返回它——**这是「一条继承子句长什么样」的唯一一份答案**。

两个调用方共用它（第 564 轮起只剩这两处）：

- `HeritageClause.OrganizeAll`（**接口头**那一路，就地扫 `Data`、一处一处换）；
- `Class.OrganizeHeritage`（**类头在 `{` 那一刻就收**，整个头刚刚搬进 `Class`、
  每一格都已经闭合 ⇒ 这里做完就能直接 `TryToClose`）。

（从前还有第三条调用方 `HeritageClauseCloseRule.Process`，第 564 轮随那条规则一起删掉 ——
它一次都没命中过，接口那边早就是 `OrganizeAll` 在做同一件事。）

**`items` 的第一格必须是子句词**（调用方已经判过）。子句词自己作为一个子单元进节点
（TS 的 `HeritageClause` 区间含 `extends`）；**逗号分段的实体名每段套一个
`ExpressionWithTypeArguments`**，逗号留在子句下当同级单元（TS 那边逗号不参与遍历，
投影侧把它筛掉）。

```ts
const word = items[0];
const last = items[items.length - 1];
const clause = new HeritageClause(template);
clause.Parent = owner;
clause.SignIn(word.SourceRange.Start!);
clause.SignOut(last.SourceRange.End!);
// **子句词当场升成 `<Keyword>`**（一份答案：`Keyword.FromIdentifier`，
// `KeywordCloseRule.Process` 调的是同一个）——不再等本单元关闭时由规则队列去升
//（实测把本类的队列摘掉而不补这一句：`<Keyword>extends</Keyword>` 当场退回
// `<Identifier>extends</Identifier>`，而那正是 `Keyword` 这个单元存在的理由）。
clause.AddAndCloseLast(Keyword.FromIdentifier(clause, word as Identifier));
let segment: Token[] = [];
for (let i = 1; i <= items.length; i++) {
  const item = i < items.length ? items[i] : null;
  if (item === null || (item instanceof SymbolToken && item.Is(","))) {
    if (segment.length > 0) {
      // **范围要跳过段首 / 段尾的透明单元**（本轮量出来的）：解析期这一条路把整个头原样搬进来，
      // 所以段里会留着软换行与注释（`interface I extends` 换行 `NodeJS.Dict<…>`）——
      // 拿「段里第一个单元」当起点就会落在**换行**上
      //（实测 `@types/node/querystring.d.ts`：TS 的 `ExpressionWithTypeArguments` 从 `NodeJS` 的
      //  `[1382,1572)` 起，产物给成 `[1373,1572)`——那 9 格正是 `extends` 之后的换行与缩进）。
      // **只收区间、不动单元**：透明单元仍然是这一段的子单元（与 `Statement.FirstMeaningful` 同一条口径），
      // 于是它们照样进 XML，只是不再把父单元的区间撑出去。
      let firstReal = segment[0];
      for (const unit of segment) {
        if (!IsTriviaUnit(unit)) {
          firstReal = unit;
          break;
        }
      }
      let lastReal = segment[segment.length - 1];
      for (let k = segment.length - 1; k >= 0; k--) {
        if (!IsTriviaUnit(segment[k])) {
          lastReal = segment[k];
          break;
        }
      }
      const target = new ExpressionWithTypeArguments(template);
      target.Parent = clause;
      target.SignIn(firstReal.SourceRange.Start!);
      target.SignOut(lastReal.SourceRange.End!);
      for (const unit of segment) {
        target.AddAndCloseLast(unit);
      }
      target.TryToClose();
      clause.AddAndCloseLast(target);
      segment = [];
    }
    if (item instanceof SymbolToken && item.Is(",")) {
      clause.AddAndCloseLast(item);
    }
    continue;
  }
  segment.push(item);
}
clause.TryToClose();
return clause;
```

## static method OrganizeAll:(template:Template, owner:Token, data:Array<Token>)=>void

把 `data` 里 `extends` / `implements` 那几段**就地**收成 `HeritageClause`——**一份答案**：
类头（`ClassBranch`）与接口头（`InterfaceBranch`）都调它。

**只在「头刚成形、体还没进来」的那一刻调**：那时每一段都已经闭合（类型实参段在 `>` 上关了、
继承表达式里的括号也在 `)` 上关了），所以子句收完就能直接 `TryToClose`，
它自己那一趟重组当场跑（`extends` 升成 `<Keyword>` 就是那一趟做的）。

**为什么要就地改**：调用方拿到的是**刚搬好的那个单元自己的 `Data`**，
它此刻还没被别人读走；`ReplaceCountAt` 返回的就是插入位置，接着从下一格继续扫即可。

```ts
let index = 0;
while (index < data.length) {
  const item = Get(data, index);
  if (item === null || HeritageClause.IsClauseWord(item) === false) {
    index = index + 1;
    continue;
  }
  const end = HeritageClause.ClauseEnd(data, index);
  const items: Array<Token> = [];
  for (let i = index; i <= end; i++) {
    const one = Get(data, i);
    if (one !== null) {
      items.push(one);
    }
  }
  const clause = HeritageClause.Take(template, owner, items);
  index = ReplaceCountAt(data, index, end - index + 1, clause) + 1;
}
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **第 993 轮**：`ctx.TextOf` → `ctx.ValueOf` —— 只读那一格**自己记的**值，
  // 不回原文兜底（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。
  const kids = ctx.Kids(v);
  // **子句词是节点的属性、不参与遍历**（TS 那边就是这样）——
  // 所以它**不能留在 `types` 里**（下面那一句就是干这件事的：
  // 实测「投影后多出来的节点」里 `ExtendsKeyword` 有 2192 个）。
  //
  // **但它也是唯一能分清 `extends` 与 `implements` 的地方**（第 281 轮）：
  // 两条子句投影之后**形状一模一样**（都只有 `types`），
  // 于是「`class C implements I {}` 的父类是谁」这个问题在**降级层无从回答**
  //（实测：它把 `I` 当成了父类，报 `name is not a local or a capture: I`——
  // **响亮**，可现场离真相很远）。
  //
  // **所以这一轮把它作为 `token` 属性收进来**：名字照 TS 那一格（TS 的
  // `HeritageClause` 正是 `{ token, types }`），值是**关键词文本**——
  // 与这一层「kind 一律用名字」同一条口径（`"Identifier"` / `"ClassDeclaration"`
  // 都是名字，不是 TS 的数字）。
  // **它不进 `types`**，所以**节点集合一个都没变**——
  // `cases:tsast` 那一把尺子的「字段名」只统计**值里含节点**的键，
  // 而这是一个字符串，四方向因此都不受影响。
  let clauseWord = "";
  const kept: any[] = [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (
      (k.Tag() === "Keyword" || k.Tag() === "Identifier") &&
      (ctx.ValueOf(k) === "extends" || ctx.ValueOf(k) === "implements")
    ) {
      // **一条子句里只可能有一个子句词**，取到就走（后面那几个是实体名）。
      if (clauseWord === "") clauseWord = ctx.ValueOf(k);
      continue;
    }
    kept.push(k);
  }
  const projected = ctx.ProjectEach(kept, "HeritageClause");
  const props: any = clauseWord === "" ? {} : { token: clauseWord };
  if (projected.length > 0) props.types = projected;
  return ctx.NodeHead("HeritageClause", props, v);
```


## constructor:(template:Template)=>void

**本类不挂规则队列**——子句在 `Take` 里就已经成形（见那一节）：
子句词由 `Keyword.FromIdentifier` 当场升成 `<Keyword>`，
实体名与类型实参段在搬进来之前各自就已经是成品。
挂一条队列等于让「这一格什么时候成形」有**两个答案**，
而第二个答案（本类关闭时再扫一遍自己的 `Data`）什么也扫不出来——
实测把它摘掉之后，全语料只掉两处，两处都落在 `ExpressionWithTypeArguments` 那一格上，
与子句本身无关。

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new HeritageClause(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# class ExpressionWithTypeArguments extends IndependentToken

继承子句里的一个实体名（`B` / `L<M>`）。类名必须与产物的标签名一致。

名字与它的类型实参都在里面（与 TS 的 `ExpressionWithTypeArguments` 一致）。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["ExpressionWithTypeArguments", new Map([["children", "expression"]])]]);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 1001 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

上面那一份里只有**一处回原文查**：那个模板串的判据
（`ctx.source[ctx.StartOf(k)] === "\`"`——**回原文读那个引号**）。直出版改读
**那一格自己记的引号**：`String.ToDictionary` 这一轮把 `stringChar` 写进字典了
（见 `string.xl.md` 的说明：`IsTemplateString` 吃的是**实例**，而这里手上只有子单元的**视图**，
所以那一格必须经字典递过来——与 `questionAt` / `namedBraceAt` 同一条口径）。
其余逐行与 `PrintDirectAst` 同一份（判据都落在子单元与属性上）。

```ts
  const kids = ctx.Kids(v);
  const generic = kids.find((k: any) => k.Tag() === "GenericType");
  const names = kids.filter((k: any) => ctx.IsNameNode(k));
  const props: any = {};
  // **名字后面紧跟模板串 ⇒ `TaggedTemplateExpression`**（第 986 轮）：判据是那个 `String`
  // 的**引号是反引号**——读的是它自己记的 `stringChar`（第 1001 轮），不是原文里那个字符。
  const template = kids.find(
    (k: any) => k.Tag() === "String" && k.stringChar === "\`",
  );
  if (template !== undefined && names.length > 0) {
    const tag = ctx.DottedExpression(names);
    const body = ctx.Project(template);
    props.expression = {
      kind: "TaggedTemplateExpression",
      tag,
      template: body,
      pos: tag.pos,
      end: body.end,
    };
  } else if (names.length > 0) {
    props.expression = ctx.DottedExpression(names);
  } else {
    const paren = kids.find((k: any) => k.Tag() === "Bracket" && k.startBracket === "(");
    if (paren !== undefined) {
      props.expression = ctx.ParenthesizedOf(paren);
    } else {
      const expr = kids.filter((k: any) => k !== generic);
      if (expr.length > 0) props.expression = ctx.Expression(expr);
    }
  }
  if (generic !== undefined) props.typeArguments = ctx.TypeArguments(generic);
  return ctx.NodeHead("ExpressionWithTypeArguments", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**——这一格**仍然依赖重组**，是类头里**最后一处**：

继承表达式 `extends mixin(B)` / `extends (Base)` 里的实体名不是「一个名字」而是一个
**表达式**，那一段由 `MethodCloseRule` 之类的规则在**本单元关闭时**成形
（实测把这条队列摘掉，`decl-class-extends-call.ts` / `cls-extends-expression.ts`
两条当场掉 `CallExpression` 与 `Identifier`）。
它要等的是「调用表达式 / 成员访问」那一层也搬成解析期——那一层现在还在通用队列里。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new ExpressionWithTypeArguments(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
