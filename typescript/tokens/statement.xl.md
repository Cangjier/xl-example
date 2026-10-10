# dependencies
```xl
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { BranchConditionResult } from "../../core/syntax/branch-condition-result.xl.md"
import { Branch } from "../../core/syntax/branch.xl.md"
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBackIndexed, SearchFrontIndexed, SkipNext } from "../../core/extensions/list-extension.xl.md"
import { GetSkipPreviousTrivia, HasLineBreakBetween, HasTypeColonBefore, IsBindingPatternBrace, IsObjectLiteralBrace, IsPendingTypeModifier, IsStatementStart, IsTriviaUnit, IsTypeAliasAssignment, NextLineFirstCharAt, NextLineStartsWithWord, SkipNextTrivia, SkipNextWrapSymbol, SkipPreviousTrivia, SkipPreviousWrapSymbol, SkipSourceTriviaFrom, WordText } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Class, ClassBranch } from "./class/class.xl.md"
import { Enum } from "./enum/enum.xl.md"
import { ExportCloseRule } from "./export.xl.md"
import { Field } from "./field.xl.md"
import { For } from "./for/for.xl.md"
import { Foreach } from "./foreach/foreach.xl.md"
import { Function } from "./function/function.xl.md"
import { IfSet } from "./if/if-set.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Import, ImportCloseRule } from "./import.xl.md"
import { Interface } from "./interface/interface.xl.md"
import { Keyword } from "./keyword.xl.md"
import { Label, LabelCloseRule } from "./label.xl.md"
import { MethodDeclaration } from "./function/method-declaration.xl.md"
import { String } from "./string/string.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { Signature } from "./signature/signature.xl.md"
import { Switch } from "./switch/switch.xl.md"
import { Try } from "./try/try.xl.md"
import { While } from "./while/while.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

语句：把一串「不是语句边界」的单元收进一个 `Statement`。这是夹具里最常见的结构——
`abc` 的 XML 就是 `<Root><Statement><Identifier>abc</Identifier></Statement></Root>`。

语句壳**由解析期的成形器收**：终结符刚 append 完那一刻 `Token.FormStatement` →
`Statement.FormFrom`，容器关闭时 `Statement.FormTail` 补末尾那一条
——两处都在下面各自的节里（第 564 轮之前还有三个排在 `GeneralCloseRule` 队列上的
收尾规则类，实测**一次都没被调用过** ⇒ 整段删掉、只留这一份实现）。

# class Statement extends IndependentToken

语句单元。

单元值类型是单字符的 `string`。

构造时就把自己的规则队列从模板上取出来（`template.CloseRuleTemplate.Get(this.constructor)`）——
`Statement` 自己这一类没有专门注册 ⇒ 拿到的是通用队列。
容器那一侧走 `ParsePipeline.InitialCloseRuleQueue`，第 564 轮起它做的也是同一句。

## method PrintAst:(ctx:any, v:any)=>any

一条语句 → 它的 TS 形状（**从 `ts-ast.xl.md` 里那个 `case "Statement"` 搬来**，第 198 轮）。

这是**语句分派层**：`Statement` 单元里可能是任何东西（裸块、`let`、`if`、`import`、
类型别名、表达式……），所以它必须把整段交给共享层的 `projectStatement`——
那一份实现同时被「语句位」与「成员位」两条路复用，而且**只在共享层能写**
（它要调 `projectExpression` 那一族）。

这是**最后一个 `case`**：搬完之后 `projectNode` 里那个按 `v.type` 分派的 `switch`
整段消失，只剩「问 token 的 `PrintAst`」与通用投影两条路。

```ts
  const node = ctx.StatementOf(v);
  // **`undefined` 在这里是有意义的答案**（例如「这个 `;` 已经是上一条语句的终结符」），
  // 而 token 出口把 `undefined` 读作「没覆写、请走通用支」——所以要用哨兵
  // `ctx.Nothing` 把「故意不出节点」这件事说出来（第 198 轮）。
  return node === undefined ? ctx.Nothing : node;
```

## constructor:(template:Template)=>void

构造器里取本类型的规则队列；运行时类型用 `this.constructor`。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## static method FormFrom:(unit:Token, terminator:Token)=>void

**在终结符已经进 `Data` 之后**收一条语句壳（第 486 轮）——`StatementCloseRule` / `StatementCloseRule2`
那两条收尾规则的**逐字移植**，只是时机从「单元关闭时扫平表」换成「终结符刚 append 完」。

**为什么必须在这个时机**：壳体要把终结符**算进自己的区间**（TS 的 `VariableStatement` 是 `[0,10)`
而不是 `[0,9)`，实测漂移 1032 → 493），可终结符**在 appender 之前根本不在 `Data` 里**
（第 481–485 轮逐字符 dispatch 量穿的三条硬约束：派发循环遇到第一个 `Done` 就 `return` ⇒ 排在 appender
之后的格子一次都不会被问到；而排在 appender 之前虽然轮得到，那一刻 `data[data.length - 1]` 是终结符
左边那一格 ⇒ 切不出含终结符的区间）。唯一同时满足的位置是**两个 appender 里、紧跟 append 之后**。

**切片与重组一字不差**：`children` 含终结符，装进语句的是 `children.slice(0, children.length - 1)`，
区间取 `FirstMeaningful(children).Start .. children[last].End` —— 所以 `End` 就是终结符的末尾。

**`;` 在小括号里不算语句边界**：那是 `for` 的三段式分隔符（照 `StatementCloseRule.Previous` 的判定）。

```ts
if (unit === null || unit === undefined) {
  return;
}
// **成员列表里不收语句壳**（第 503 轮）：`ClassBody` / `InterfaceBody` / `TypeLiteralBody` / `EnumBody`
// 的子单元是**成员**，不是语句 —— 收了壳之后 `FieldCloseRule` / `MethodDeclarationCloseRule`
// 看到的是「一个 Statement」，成员就永远成形不了（实测 `am-class-modifier-order.ts`：
// `private static readonly b: number` 被包成一个 `Statement`，TS 那边是 `PropertyDeclaration`；
// **对照态同样如此** ⇒ 这是重组层自己的老缺口）。
const owner = unit.constructor.name;
if (owner === "ClassBody" || owner === "InterfaceBody" || owner === "TypeLiteralBody" || owner === "EnumBody") {
  return;
}
// **`[` / `(` 括号里也不收语句壳**（第 515 轮）：语句只活在块里 ——
// 而 `x => x[1, 2, 3]` 的下标括号里，逗号那一格会把 `1, 2, 3` 收成一条**语句**
//（实测 `am-block-lambda-array-compound.ts`：产物是 `Lamda[525,531)`（体只剩 `x`）
// ＋ 另一个 `Statement[532,541) > ArrayLiteral`，而正解是**一个** `ElementAccessExpression`）。
// **只排 `[` 与 `(`**：`{` 既可能是对象字面量（无语句）也可能是块（有语句），
// 要按 `Context` 分辨，那是另一笔账。
if ((owner === "Bracket") && ((unit as Bracket).startBracket === "[" || (unit as Bracket).startBracket === "(")) {
  return;
}
// **泛型实参段里也不收语句壳**（第 583 轮）：`<` 与 `>` 之间装的是**类型**，
// 软换行在那里只是**排版**（`interface Folded<` 换行 `T extends B,` 换行 `U extends C` 换行 `>`）
// —— 一条语句都不可能有。
//
// **少了它会怎样**（实测 `lex-generic-multiline-constraints.ts`）：那一折把
// `T extends B,` 换行 `U extends C` 整段收成一个 `Statement`，接着**壳里面**那条
// 逗号运算符规则把 `B , U` 折成一个 `BinaryOperator op=","` ⇒
// `TypeParameterCloseRule` 按**顶层逗号**切时一个都找不到 ⇒ 两个形参被包成**一个**
// `TypeParameter` [252,278)（TS 那边是两个，第二个连名字带约束整格不见：
// 缺 `Identifier`×3 / `TypeReference`×2 / `TypeParameter`×1）。
if (owner === "GenericType") {
  return;
}
// **`${ … }` 里也不收语句壳**（第 836 轮）：模板串内插段装的是**表达式**
//（`StringExpression` / `TemplateSpan.expression`），不是语句 —— 与 `GenericType` 同一档。
//
// **少了它会怎样**（实测 `gap-sweep-newline-tpl-01` / `gap-sweep-linecomment-tpl-0{3,4}`）：
// `${b` 换行 `}` 里那个换行让壳收下去 ⇒ `InterpolationString` 底下多一格 `Statement`
// ⇒ 投影把 `b` 投成 `ExpressionStatement`（`EXTRA ExpressionStatement [14,15) «b»`），
// 而 TS 那边 `TemplateSpan` 里直接就是 `Identifier`。
// `${//c` 换行 `b}` 那一版更绕：注释先成了一条壳 ⇒ 内插段里出现
// `[Statement(LineAnnotation), Identifier]` ⇒ 投影报 `FIELD TemplateExpression` 缺 `templateSpans`。
if (owner === "InterpolationString") {
  return;
}
// **`{` 括号：值位的花括号里也不收语句壳**（第 556 轮）：对象字面量 / 类型字面量里装的是
// **成员**，不是语句 —— 判据与 `JsonObjectCloseRule` 问的是**同一句**
//（`IsObjectLiteralBrace`，见 `../text-common-util.xl.md`）。
// 少了它会怎样：多行对象字面量里每个成员被包成一个 `Statement` ⇒
// `ObjectLiteral.PrintAst` 按顶层逗号切出来的每一组都是**一格 `Statement`**
// ⇒ 整片投成 `ExpressionStatement`（实测 `ex-object-literal.ts` 缺 37）；
// 而且壳里那个 `b:` 还会被 `Label` 收走（壳的父亲是 `Statement` ⇒ `IsStatementStart` 答「是」）。
//
// **绑定模式的花括号同一条口径**（第 825 轮，`IsBindingPatternBrace`）：`const { a` 换行
// `, b: [c] } = o;` 里模式的内容由 `BindingElementCloseRule` 按顶层逗号切，壳一收下去
// 段就变成一格 `Statement` ⇒ 元素的 `name` 投不出来、逗号还会被折进 `BinaryOperator`
//（实测 `gap-sweep-{newline,linecomment}-destr-0{2,3,4,5}` 七条）。
if (owner === "Bracket" && (unit as Bracket).startBracket === "{") {
  const holder = unit.Parent;
  if (
    holder !== null &&
    (IsObjectLiteralBrace(holder.Data, holder.Data.indexOf(unit)) ||
      IsBindingPatternBrace(holder.Data, holder.Data.indexOf(unit)))
  ) {
    return;
  }
}
const data = unit.Data;
if (Array.isArray(data) === false || data.length === 0) {
  return;
}
const index = data.length - 1;
if (data[index] !== terminator) {
  return;
}
const template = unit.Template;
if (terminator instanceof SymbolToken) {
  const parent = terminator.Parent;
  if (parent instanceof Bracket && parent.startBracket === "(") {
    return;
  }
  if (template.SymbolTemplate.IsStatementSymbol(terminator.TempToString()) === false) {
    return;
  }
}
const frontIndex = SearchFrontIndexed(data, index, (itemIndex, item) => Statement.IsStatementBoundary(data, itemIndex));
// **`switch` 体里，第二个及以后的段头要自己起一条壳**（第 576 轮）：
// `switch (x) { case 1: case 2: y(); }` 写在一行时，`case 1:` 里那个 `:` **不是终结符**
// ⇒ 这一问一次都不响 ⇒ 壳从 `case 1:` 一路收到 `y();` 的那个 `;`
// ⇒ **两个 `case` 进了同一条壳**。而 `SwitchCloseRule` 的分段只看**顶层单元**
//（`SegmentWordOf`）⇒ 第二个 `case` 住在壳里、它根本看不见
// ⇒ 两个 `case` 并进同一个 `CaseClause`（第 574 轮逐字符探针量清的机制，
// 账在 `docs/member-layer-plan.md` 第 177 节）。
//
// 切点取**最后一个**「前面紧挨着 `:` 的那个 `case` / `default` 词」（不是第一个）：
// `case 1: case 2: case 3: y();` 这种三连**一刀全分开** —— 切完留在壳外的那几格是**裸词**，
// 而顶层扫描本来就认裸词（`SegmentWordOf` 的「裸词」那一档）⇒ 三段各归各。
// 切在**第一个**上不行：壳里还剩两个段头，而终结符只来一次 ⇒ 等不到第二刀。
//
// **宿主判据不能省**：第 574 轮实测「不分宿主地找 `default`」会把 `a.default;` 与
// `export default c;` 一起切开（1027 → 1025）；改成问「宿主是不是 `SwitchStatement`」
// 又**一次都不会响**（那个单元是 `SwitchCloseRule` **后面**才造出来的）。
// 正解是问**那个 `{` 自己是不是 `switch` 的体**（`IsSwitchBodyBracket`）——
// 这个判据在解析期问得出来，因为 `switch` 那个词与 `(` `{` 两个括号都在**宿主自己的列表**里。
let startIndex = frontIndex;
if (Statement.IsSwitchBodyBracket(unit)) {
  const clauseIndex = Statement.LastClauseHeadIndex(data, frontIndex, index);
  if (clauseIndex > 0) {
    startIndex = clauseIndex - 1;
  }
}
const children = data.slice(startIndex + 1, index + 1);
const lonelySemicolon = children.length === 1 && children[0] instanceof SymbolToken && children[0].Is(";");
if (children.length === 1 && !lonelySemicolon) {
  data.splice(index, 1);
  return;
}
const statement = new Statement(template);
statement.Parent = terminator.Parent;
statement.AddRange(children.slice(0, children.length - 1));
const first = Statement.FirstMeaningful(children);
const last = children[children.length - 1];
if (first.SourceRange.Start !== null && last.SourceRange.End !== null) {
  statement.SourceRange.Start = first.SourceRange.Start;
  statement.SourceRange.End = last.SourceRange.End;
} else {
  throw new Error("Statement.FormFrom source range is not complete.");
}
ReplaceCountAt(data, startIndex + 1, index - startIndex, statement);
// **造完就关一次**（第 487 轮）：`TryToClose` 会跑 `ApplyCloseRules` —— 壳里的
// `return` / `throw` / `const` 那类词要升成 `Keyword`，投影侧「关键字开头的语句」那一支才认得
//（实测 i42：`return;` 从 `ExpressionStatement` 变成 `ReturnStatement`）。
// 重组那条当年也是这么写的（`StatementCloseRule2.Process` 末尾一句 `statement.TryToClose()`）。
statement.TryToClose();
```

## static method IsSwitchBodyBracket:(unit:Token)=>bool

`unit` 是不是一个 `switch` 语句的**体括号**（那个 `{`）。

判据与 `switch/switch.xl.md` 里 `SwitchCloseRule.Previous` 问的**同一件事**
（那边问「`switch` 那个词后面是不是 `(` 再 `{`」），只是这里**站在那个 `{` 自己身上往回看**。

**为什么必须往回看**：`{` 自己分不出自己是「块」还是「对象字面量」还是「`switch` 的体」，
而这条判据要在**解析期**（终结符刚 append 完那一刻）就问出来 ——
那一刻 `SwitchStatement` / `Switch` 都**还不存在**（它们是 `SwitchCloseRule` 后面才造的，
第 574 轮实测：拿 `SwitchStatement` 当判据**一次都不会响**）。

两处细节：

- **跨过 trivia**（第 841 轮）：`switch (x)` 换行 `{` 是合法排法，而
  `switch /* c */ (a) { … }` 与 `switch (a) /* c */ { … }` 在 TypeScript 里**同样是**
  `switch` 语句（注释是 trivia）—— 与 `SwitchCloseRule.Previous` 一字不差的口径。
  原先这里跨的是 `SkipPreviousWrapSymbol`（只跳软换行）⇒ 那两种排法下往回看到的是注释、
  `WordOf` 给空串 ⇒ **体括号认不出** ⇒ 切壳那一支一次都不响 ⇒
  `case 1: case 2: b();` 这种落穿写法两个段头进了同一条壳
  （实测 `stmt-switch-comment-fallthrough`：`CaseClause` 漂到 `[21,48)`、
  第二个 `CaseClause` 与 `b()` 整条落空，缺 5 漂 1 多 3）；
- **词那一格用 `Statement.WordOf`**：`switch` 可能已经被升级成 `Keyword`
  （`KeywordCloseRule`），两种形态都要认（与 `SwitchCloseRule.WordOf` 同一口径）。

```ts
if ((unit instanceof Bracket) === false || (unit as Bracket).startBracket !== "{") {
  return false;
}
const holder = unit.Parent;
if (holder === null || Array.isArray(holder.Data) === false) {
  return false;
}
const at = holder.Data.indexOf(unit);
if (at < 0) {
  return false;
}
const compareIndex = SkipPreviousTrivia(holder.Data, at);
const compare = Get(holder.Data, compareIndex);
if ((compare instanceof Bracket) === false || (compare as Bracket).startBracket !== "(") {
  return false;
}
const wordIndex = SkipPreviousTrivia(holder.Data, compareIndex);
return Statement.WordOf(Get(holder.Data, wordIndex)) === "switch";
```

## static method LastClauseHeadIndex:(data:Array<Token>, frontIndex:int, index:int)=>int

`(frontIndex, index)` 这一段里**最后一个**「前面紧挨着一个 `:` 的 `case` / `default` 词」的下标；
没有给 `-1`。只给 `FormFrom` 在 `switch` 体里切壳用（为什么取最后一个、为什么只认这两种词，
见 `FormFrom` 那一处）。

三条判据各挡一档：

1. **从 `frontIndex + 2` 起**：`frontIndex + 1` 是这一段的**段首** ——
   `case 1: f();` 的壳里就一个段头，从它起切会切出一条**空壳**；
2. **只认顶层单元**：`f(case)` 里的那个词住在括号里面，不住在这一层，够不到；
3. **前面紧挨着的实义单元是 `:` 或一个 `{` 块**：少了它，`case 1: obj.default = 1;` 的
   `default`（前面是 `.`）会被当成段头切开。判据用 `SkipPreviousTrivia`
   （注释也算 trivia，`case 1: /* c */ case 2:` 这种排法也算）。

**为什么那个 `{` 也算**（第 841 轮）：上一段的体要是**一个块**，
段头前面那一格就是 `}` 而不是 `:` —— `switch (a) { case 1: { break; } default: break; }`
里 `default` 前面紧挨着的是那个块括号。
只看 `:` 时这一格找不到切点 ⇒ 壳从 `case 1:` 一路收到末尾那个 `;`
⇒ **两段进同一条壳** ⇒ 顶层扫描只看得到第一个段头 ⇒ 只有一段
（实测 `gap-b-oneline-0{1,2,3}` 与 `stmt-switch-block-then-default`：`CaseClause`
漂到 `[13,47)`，`DefaultClause` / 第二个 `CaseClause` 整条缺、`default` 投成
`ExpressionStatement > DefaultKeyword`，各缺 2~3 多 3）。
**换行写法不受影响**：`case 1: { break; }` 换行 `default:` 里那个换行已经收过壳，
两条壳本来就在顶层（实测同一形状的 `s8` 一直是绿的）。

**只加不改**：原来那一档（前面是 `:`）一个字不动 —— 落穿写法
（`case 1: case 2: b();`）与 `case 1: obj.default = 1;` 那一档都还走老路。

```ts
let found = -1;
for (let i = frontIndex + 2; i < index; i++) {
  const word = Statement.WordOf(Get(data, i));
  if (word !== "case" && word !== "default") {
    continue;
  }
  const before = Get(data, SkipPreviousTrivia(data, i));
  // **上一段的体收在一个块里**：`case 1: { break; } default: …` 里 `default` 前面是 `}`
  //（那一段没有 `;`，所以壳还没被切过）—— 与「前面是 `:`」同一档待遇。
  if (before instanceof Bracket && (before as Bracket).startBracket === "{") {
    found = i;
    continue;
  }
  if (before instanceof SymbolToken && before.Is(":")) {
    found = i;
  }
}
return found;
```

## static method FormTail:(unit:Token)=>void

**容器关闭时**把末尾那段还没成壳的内容收成一条语句（第 544 轮）。

**为什么需要它**：解析期造语句壳的入口只有两个 —— `\n` 那一档（`StatementBranch`）
与 `;` 那一档（`FormFrom`）。**语句的内容直接顶到容器的末尾**（`}` 或 EOF）时两档都不响
⇒ 那条语句**从来没有壳** ⇒ 它也就**从来没跑过关闭前那一趟** ⇒
里面的 `return` / `continue` 留在 `Identifier` 上 ⇒ 投影投出「`EXTRA Identifier(return)`
+ `MISS ReturnStatement`」（实测 15 份不绿的文件带这个形状，其中
`expr-iife-function.ts` / `expr-func-expr-named.ts` / `expr-object-accessors.ts` /
`stmt-asi-postfix-then-continue.ts` / `type-predicate.ts` 五份都是「缺一个
`ReturnStatement` / `ContinueStatement`，多一个同名 `Identifier`」）。

**与 `FormFrom` 的两点不同**：

1. **没有终结符**：`children` 是「最后一个语句边界之后一直到列表末尾」的**全部**单元、
   一个都不切掉（`FormFrom` 要切掉末尾那个 `;`）；区间右端就取**最后一格内容**的末尾
   （`;} ` 那一档的右端由 `;` 给，这里由内容自己给）；
2. **只有语句列表容器才收**（白名单）：这条跑在每个单元的关闭前那一趟里，
   不设白名单的话 `Statement` 自己、类型单元、对象字面量都会收出**嵌套壳**
   （`Statement` 里再套一个 `Statement` —— 那是收敛环里的自激）。
   白名单就是「构造器里装了语句队列的那些容器」（`InitialCloseRuleQueue`
   的调用点，见 `parse-pipeline.xl.md`）。

**单格早退**：末尾那一格**本身**已经是语句级单元时什么都不做（`IsStatementUnit`，
与 `StatementCloseRule3` 里那一格同款）——函数 / 类**表达式**也在这条里被挡住
（它们在非声明位置不是语句边界，但也不是「要包进壳里的尾巴」）。

```ts
if (unit === null || unit === undefined) {
  return;
}
const owner = unit.constructor.name;
let isStatementList =
  owner === "Root" ||
  owner === "FunctionBody" ||
  owner === "MethodBody" ||
  owner === "LamdaBody" ||
  owner === "ForBody" ||
  owner === "ForeachBody" ||
  owner === "WhileBody" ||
  owner === "IfStatement" ||
  owner === "IfBody" ||
  owner === "TryBody" ||
  owner === "CatchBody" ||
  owner === "FinallyBody" ||
  owner === "NamespaceBody" ||
  // **`SwitchStatement` 也在名单里**（第 553 轮）：它的构造器同样装了语句队列
  // （`switch-statement.xl.md` 的 `InitialCloseRuleQueue`），
  // 白名单就是照这一条列的，第 544 轮加这条时**漏了它** —— 那时 `switch` 的段
  // 一个都造不出来（第 552 轮才修好），看不出症状。
  // 症状是「`case 1: s += "a";` 写在同一行」这一类：标签与体在**同一个 `Statement` 壳**里，
  // 段头规则只把壳里冒号之后那几格搬进 `SwitchStatement` ⇒ 搬进去的是散单元
  // ⇒ 没有壳 ⇒ 投影逐个投出来 ⇒ `statements` 里是 `Identifier` / `EqualsToken` / `BinaryExpression`
  // （实测 `ctl-switch` 一族 11 条覆盖度用例退成 `unimplemented: statement Identifier`）。
  owner === "SwitchStatement" ||
  owner === "StaticBlock";
// **裸块的体也是一个语句列表**（第 665 轮）：`{ A };` 里那个 `A` 后面既没有 `;` 也没有换行
// ⇒ 两档都不响 ⇒ 块里那一格**从来没有壳** ⇒ 投影出来是「`Block` 底下直接一个 `Identifier`」，
// 而 TS 是 `Block > ExpressionStatement > Identifier`（实测 `{ A };` 缺 `ExpressionStatement` 1）。
//
// **对象字面量与绑定模式都要排掉**（判据与 `FormFrom` 里那一格是同一句）：值位花括号里装的
// 是**成员**，给 `({ A })` 收一条壳会把简写属性投成 `ExpressionStatement`；
// 模式里装的是**绑定元素**（第 825 轮，`IsBindingPatternBrace`），壳会把顶层逗号吃掉。
if (owner === "Bracket" && (unit as Bracket).startBracket === "{") {
  const holder = unit.Parent;
  if (
    holder !== null &&
    (IsObjectLiteralBrace(holder.Data, holder.Data.indexOf(unit)) ||
      IsBindingPatternBrace(holder.Data, holder.Data.indexOf(unit)))
  ) {
    return;
  }
  isStatementList = true;
}
if (isStatementList === false) {
  return;
}
const data = unit.Data;
if (Array.isArray(data) === false || data.length === 0) {
  return;
}
const index = data.length - 1;
if (Statement.IsStatementBoundary(data, index)) {
  return;
}
const frontIndex = SearchFrontIndexed(data, index, (itemIndex, item) => Statement.IsStatementBoundary(data, itemIndex));
const children = data.slice(frontIndex + 1);
if (children.length === 0) {
  return;
}
if (children.length === 1 && Statement.IsStatementUnit(children[0])) {
  return;
}
const first = Statement.FirstMeaningful(children);
const last = children[children.length - 1];
if (first.SourceRange.Start === null || last.SourceRange.End === null) {
  return;
}
const statement = new Statement(unit.Template);
statement.Parent = unit;
statement.AddRange(children);
statement.SourceRange.Start = first.SourceRange.Start;
statement.SourceRange.End = last.SourceRange.End;
ReplaceCountAt(data, frontIndex + 1, index - frontIndex, statement);
// **造完就关一次**：与 `FormFrom` 末尾那一句同一个理由 ——
// 壳里的 `return` / `continue` / `throw` 那些词要升成 `Keyword`，
// 投影侧「关键字开头的语句」那一支才认得（这一句正是这一轮要修的那半）。
statement.TryToClose();
```

## static method SplitShell:(unit:Token)=>void

**壳里冒出一条完整的语句级单元时，把壳拆开**——那一格自己留下，它右边那截另收一条壳。

**为什么需要它**：壳是**解析期**收的（`FormFrom` / `StatementBranch`，那一刻只有**字符级**的单元），
而 `Function` / `Class` / `While` / `Try` / `Switch` 这些语句级单元是**关闭前那一趟**才成形的
（各自的 `XxxCloseRule`）⇒ `function f() { … } console.log(f());` 这样写在一行里时：
`;` 一响就把**整段**（函数声明 + 后面那条调用）收进**同一个**壳 ⇒
函数规则随后只认得壳里那一截 ⇒ 壳里成了「一格 `Function` + 一截尾巴」 ⇒
投影按「壳的第一个孩子是什么」投 ⇒ 尾巴被当成**表达式**丢掉
（实测四条：`unimplemented: expression FunctionDeclaration` / `WhileStatement` /
`ForOfStatement` / `TryStatement` —— 降级层报的那句话离现场很远）。

**只在「第一个孩子就是语句级单元」时拆**：那一格一定是**自己成句**的，
它后面的东西不可能属于它。

**`Label` 那一格要连它标的那条语句一起算「头」**（第 692 轮，**实测撞到的**）：
原来这里是**一律 `return`**（理由写的是「标签与它标的那条语句合起来是一条
`LabeledStatement`，拆开就劈成两条」）——可那个理由只说明**头是两格**，
不说明「后面那些格子也属于它」。一律让开的后果是**壳里剩下的全被丢掉**：

    <Statement><Label label="outer" /><For>…</For><PropertyAccess>console.log(…)</PropertyAccess></Statement>

投影的标签那一支只吃「标签 + 被标的语句」，**尾巴那一截连投影都轮不到**——
`console.log` 整条不见（实测 `outer: for (…) { … } console.log(…)` 只打印循环里那几条，
`let out = …` 之后的收尾语句一句都不跑）；在**函数体**里更响：
`function f() { lbl: { …; break lbl; } return out; }` 的 `return` 也被吞进壳里
⇒ 函数返回 `undefined`（**静默错值**，三条探针同时红）。

**修法**：头是「一串连续标签 + 被它们标的那一格」，尾巴照旧另收一条壳。
「被标的那一格」有两档：**语句级单元**（`For` / `While` / `IfSet` / `Try`…），
或者**裸块** `{ … }`（`IsStatementUnit` 不含裸块，而 `lbl: { … }` 是合法 JS）。
**头里只有标签、没有可标的语句时一律不动**（`a: b:` 这种残形不该被拆）。

**尾巴的右端借壳自己那一格**：壳的区间**含终结符**（`FormFrom` 的签出），
而终结符不在 `Data` 里 ⇒ 只看尾巴最后一格会少一格。

**尾巴是空的、而壳的区间比头还长**（第 663 轮）：那一格就是**被 `FormFrom` 切进区间、
却没进 `Data` 的尾分号** ⇒ 它是**宿主的一条空语句**（TS 那边 `while (a) {} ;` /
`function f() {} ;` / `try { } catch (e) {} ;` 都是「语句 + `EmptyStatement`」两条）。
上一段那句话的另一面：`;} ` 那一档的右端由 `;` 给，所以壳的终点**就是那个 `;` 自己**
（`FormFrom` 取的是终结符**刚落下**时的 `End`，那一刻它还没关，`Index` 就是那个字符本身）
—— 读那一格原文复核它是 `;` 就够了（`StatementSymbol` 只有 `;`，这是同一句判据的复核，
不是第二份判据）。

**为什么要在这一趟做**：`FormFrom` 跑在终结符刚落下那一刻，那时 `While` / `Function` /
`Try` 还都是**生料**（各自的 `XxxCloseRule` 要等单元关闭才跑）⇒ 边界判定一个都看不见
⇒ 整段连那个 `;` 一起收进同一个壳。这一趟跑在**规则之后**，那一格已经成形了。

```ts
if (unit.constructor.name !== "Statement") {
  return;
}
const data = unit.Data;
if (Array.isArray(data) === false || data.length < 1) {
  return;
}
// **头那一格要跳过前导 trivia**（第 930 轮）：`outer/*c*/: for (…) { … } g();` 里
// `LabelCloseRule.Process` 把名字与冒号之间那条注释放在 **`Label` 左边**（那个位置只能放左边，
// 见 `label.xl.md` 的说明），于是壳的**第一格**成了那条注释 ⇒ 下面「头是不是标签」当场为否
// ⇒ 尾巴不拆 ⇒ 整段并成一个 `ExpressionStatement`（实测：`g();` / `h(x);` / `return 1;`
// 被一起吞进标签那一格，缺 7 与缺 2 两族）。
//
// **只给「头是标签」那一档放行**：其余形状走的还是原来那条路（`data.slice(1)` 那一套下标
// 都按 0 起算），所以跳过 trivia 之后头不是标签时照旧早退——这一改动的落点只有一格。
// **条件要与下面那一支一字不差**（`Label` 且 `Data` 为空）：只判「是不是 `Label`」会漏掉
// 「已经包住语句的标签」那一种，它落到通用那一支里（`tail = data.slice(1)` 从 **1** 起 ⇒
// 标签既被搬进父亲、又留在新壳里，同一格出现两次、旁边那条注释一起消失——实测
// `decl-label-comment-after-name` 与 exec 的 `049-declarations-decl-label-block-comment`
// 当场红：产物是 `<Root><Label …/><Statement><Label …/></Statement></Root>`，注释 0 个）。
let headAt = 0;
for (;;) {
  const one = Get(data, headAt);
  if (one === null || IsTriviaUnit(one) === false) {
    break;
  }
  headAt = headAt + 1;
}
const head = Get(data, headAt);
if (head === null || Statement.IsStatementUnit(head) === false) {
  return;
}
if (headAt !== 0) {
  if (head.constructor.name !== "Label" || head.Data.length !== 0) {
    return;
  }
}
const parent = unit.Parent;
if (parent === null || Array.isArray(parent.Data) === false) {
  return;
}
const at = parent.Data.indexOf(unit);
if (at < 0) {
  return;
}
const shellEnd = unit.SourceRange.End;
// **标签开头那一档：头是「一串标签 + 被标的那一格」**（第 692 轮）——
// 见上面那一整段说明。头之后的尾巴照旧另收一条壳，只是**头上的格子从一格变成两格以上**。
if (head.constructor.name === "Label" && head.Data.length === 0) {
  // **连续标签要一起走**：`a: b: for (…)` 在产物里是两格标签（`Label(a)` / `Label(b)`）。
  // **标签与被标的语句之间的注释 / 软换行也要跨**（第 929 轮）：判据跳了、搬运就必须跟着跳
  // ——`outer:/* c */ while (…)` 里 `bodyAt` 原来落在那条注释上 ⇒ 判不出「被标的是语句」
  // ⇒ 尾巴不拆（整段留在同一个壳里）。一份判据在 `LabelRunEnd` 里。
  const bodyAt = Statement.LabelRunEnd(data, headAt);
  const body = Get(data, bodyAt);
  if (body === null || Statement.IsLabeledStatementBody(body) === false) {
    return;
  }
  const headCount = bodyAt + 1;
  const labeledTail = data.slice(headCount);
  if (labeledTail.length === 0) {
    return;
  }
  const labeledFirst = Statement.FirstMeaningful(labeledTail);
  const labeledLast = labeledTail[labeledTail.length - 1];
  if (labeledFirst.SourceRange.Start === null || labeledLast.SourceRange.End === null) {
    return;
  }
  const labeledRest = new Statement(unit.Template);
  labeledRest.Parent = parent;
  labeledRest.AddRange(labeledTail);
  labeledRest.SourceRange.Start = labeledFirst.SourceRange.Start;
  labeledRest.SourceRange.End = shellEnd !== null && shellEnd.Index > labeledLast.SourceRange.End.Index
    ? shellEnd
    : labeledLast.SourceRange.End;
  // **头上的格子按原顺序搬回父亲那里**（`Label` + 被标的语句），壳换成尾巴那一条。
  const labeledHead = data.slice(0, headCount);
  data.splice(0, headCount);
  for (let k = 0; k < labeledHead.length; k++) {
    parent.Data.splice(at + k, 0, labeledHead[k]);
    labeledHead[k].Parent = parent;
  }
  parent.Data.splice(at + labeledHead.length, 1, labeledRest);
  labeledRest.TryToClose();
  return;
}
const tail = data.slice(1);
// **壳里只有这一格、而壳的区间比它还长** ⇒ 末尾那个 `;` 单独成一条空语句。
if (tail.length === 0) {
  const headEnd = head.SourceRange.End;
  if (shellEnd === null || headEnd === null || shellEnd.Index <= headEnd.Index) {
    return;
  }
  const terminator = shellEnd.Document.At(shellEnd.Index);
  if (terminator.Value !== ";") {
    return;
  }
  // **只拆「以块收尾、本身不吃尾分号」的那几族**（见 `BlockClosedStatement`）：
  // `Function` / `MethodDeclaration` 在环境声明里是**没有体**的签名
  //（`declare function f(): void;`，返回类型本身就可能是个 `{ … }` 类型字面量），
  // 那个 `;` 是**声明自己的终结符**、不是空语句 —— 照拆会让 `.d.ts` 里成片多出
  // `EmptyStatement`（实测 `typescript.d.ts` 2 处、`@types/node/crypto.d.ts` 1 处）。
  if (Statement.BlockClosedStatement(head) === false) {
    return;
  }
  const empty = new Statement(unit.Template);
  empty.Parent = parent;
  empty.SourceRange.Start = terminator;
  empty.SourceRange.End = shellEnd;
  data.splice(0, 1);
  parent.Data.splice(at, 1, head, empty);
  head.Parent = parent;
  empty.TryToClose();
  return;
}
const first = Statement.FirstMeaningful(tail);
const last = tail[tail.length - 1];
if (first.SourceRange.Start === null || last.SourceRange.End === null) {
  return;
}
const rest = new Statement(unit.Template);
rest.Parent = parent;
rest.AddRange(tail);
rest.SourceRange.Start = first.SourceRange.Start;
rest.SourceRange.End = shellEnd !== null && shellEnd.Index > last.SourceRange.End.Index ? shellEnd : last.SourceRange.End;
data.splice(0, 1);
parent.Data.splice(at, 1, head, rest);
head.Parent = parent;
rest.TryToClose();
```

## static method LabelRunEnd:(data:Array<Token>, start:int)=>int

`data[start]` 是一个标签（`Label`）时，**这一串「标签 + 夹在中间的 trivia」到哪一格为止**：
返回第一个既不是 `Label`、也不是 trivia 的单元的下标（越界就是 `data.length`）。

**两处问它同一句**：`SplitShell` 的标签那一支（拆尾巴）与 `AbsorbLabels`（把语句包进标签）。
各写一份 `while` 就是第二处会漂的答案——第 929 轮之前只有前者，而它**不跨 trivia**，
于是 `outer:/* c */ while (…)` 里那一格落在那条注释上、判不出「被标的是语句」。

```ts
let at = start + 1;
while (at < data.length) {
  const one = Get(data, at);
  if (one === null) {
    break;
  }
  if (one.constructor.name === "Label" || IsTriviaUnit(one)) {
    at = at + 1;
    continue;
  }
  break;
}
return at;
```

## static method IsLabeledStatementBody:(item:Token)=>bool

`item` 能不能当标签的**被标语句**：**语句级单元**（`For` / `While` / `IfSet` / `Try` / `Function` …），
或者**裸块** `{ … }`（`IsStatementUnit` 不含裸块，而 `lbl: { … }` 是合法 JS）。

`SplitShell` 的标签那一支与 `AbsorbLabels` 问的是**同一句**——一处写「语句级单元」、
另一处写「语句级单元或裸块」就会漂（前者漏掉 `lbl: { … }` 的尾巴拆分）。

```ts
return Statement.IsStatementUnit(item)
  || (item.constructor.name === "Bracket" && (item as Bracket).startBracket === "{");
```

## static method AbsorbLabels:(unit:Token)=>void

**把「标签 + 被它标的语句」折成一格**（第 929 轮）：`Label` 从前只是**前缀标记**，
被标的语句是它的**平级兄弟**（`<Label label="outer" /><While>…</While>`）——
与 TypeScript 的 `LabeledStatement`（**包住**那条语句）不是一个形状。
现在在**容器的规则跑完之后**扫一遍：标签后面那一格如果是语句，就搬进标签里
（`a: b: for` ⇒ `Label(a) > Label(b) > For`，标签之间的注释留在外面那一层）。

**为什么在容器这一层扫**：`Label` 是收尾期由 `LabelCloseRule` 造出来的，那一刻被标的语句
**还没成形**（见 `label.xl.md` 那条时序）；而容器（`Root` / 函数体 / 各段的 `Bracket`）
的规则跑在**子单元都关闭之后**，那时语句已经是一格成形单元。
`Statement.SplitShell` 也排在 `RunCloseRules` 的末尾，这一条紧跟着它——
**先拆尾巴、再包**（拆尾巴要的是「平级兄弟」那个形状）。

**只搬「一格」语句**：`outer: for (…) { … } console.log(…)` 在容器列表里是**多格平级**，
搬走整段会把后面那条语句一起吞掉。**唯一的例外是语句壳**：壳里装的本来就是**一条**语句
（`done: f()` 那种平铺的表达式语句没有可搬的单格），所以壳里标签之后那一整段都属于它。

**判据跨 trivia、搬运也跨**：标签与被标语句之间的注释 / 软换行跟着一起搬进去
（与 `LabelRunEnd` 是同一份口径）。

**幂等**：已经包住东西的标签跳过——`RunCloseRules` 的收敛环会把这一趟再跑一遍。

```ts
const data = unit.Data;
if (Array.isArray(data) === false || data.length === 0) {
  return;
}
const isShell = unit.constructor.name === "Statement";
let at = 0;
while (at < data.length) {
  const head = Get(data, at);
  if (head === null || head.constructor.name !== "Label" || head.Data.length !== 0) {
    at = at + 1;
    continue;
  }
  const bodyAt = Statement.LabelRunEnd(data, at);
  const body = Get(data, bodyAt);
  let end = bodyAt;
  if (body !== null && Statement.IsLabeledStatementBody(body)) {
    end = bodyAt + 1;
  } else if (body !== null && isShell) {
    end = data.length;
  }
  if (end === bodyAt) {
    at = bodyAt + 1;
    continue;
  }
  // **搬 `[at, end)` 这一段**，再按里面的标签把它套起来：
  // 最里面那个标签收下它右边的一切（trivia + 被标的语句），
  // 每个外层标签收下「它自己与下一个标签之间」的 trivia，然后收下里面那一层。
  //
  // **下标要在 `labelAt` 上走、不能在 `moved` 上走**（第 929 轮，片段普查当场炸出来的）：
  // 标签**不一定挨着**——`a: /*c*/ b: for (…)` 的 `moved` 是
  // `[Label(a), 注释, Label(b), For]` ⇒ `labelAt = [0, 2]`。
  // 第一版写成 `for (k = last - 1; …)`（`last` 是 2）⇒ 第一趟就把 `moved[2]`（＝ `inner` 自己）
  // 当成「外层标签」挂到 `inner` 上 ⇒ 自环 ⇒ `ToXmlString` 栈溢出
  // （`a :/*c*/b : for (;;) { break a; }` 一族 4 条；挨着写的那种排版看不出来）。
  const moved = data.splice(at, end - at);
  const labelAt: number[] = [];
  for (let i = 0; i < moved.length; i++) {
    if (moved[i].constructor.name === "Label") {
      labelAt.push(i);
    }
  }
  const innermostAt = labelAt[labelAt.length - 1];
  let inner = moved[innermostAt];
  for (let i = innermostAt + 1; i < moved.length; i++) {
    inner.Add(moved[i]);
  }
  const movedEnd = moved[moved.length - 1].SourceRange.End;
  if (movedEnd !== null) {
    inner.SourceRange.End = movedEnd;
  }
  for (let k = labelAt.length - 2; k >= 0; k--) {
    const outer = moved[labelAt[k]];
    for (let i = labelAt[k] + 1; i < labelAt[k + 1]; i++) {
      outer.Add(moved[i]);
    }
    outer.Add(inner);
    const innerEnd = inner.SourceRange.End;
    if (innerEnd !== null) {
      outer.SourceRange.End = innerEnd;
    }
    inner = outer;
  }
  data.splice(at, 0, inner);
  at = at + 1;
}
```

## static method BlockClosedStatement:(item:Token)=>bool

这个单元是不是**以块 / `}` 收尾、而且自己不吃尾分号**的语句级构造（第 663 轮）。

名单是**投影侧那张 `NO_TRAILING_SEMICOLON` 表在 token 这一侧的对应物**：
`if` / `while` / `for` / `foreach` / `switch` / `try` / 类 / 枚举 / 接口 / 命名空间 /
静态块都收在自己的 `}` 上 ⇒ 紧跟的一个 `;` 不属于它们。
**`do…while` 不在这张名单里**（`do … while (c) ;` 后面那个 `;` 归它自己），
`import` / `export` / 变量 / 表达式同样不在。

**`Function` / `MethodDeclaration` 按有没有体分档**：带体的收在 `}` 上（`function f() {} ;`）；
没体的是环境签名 / 重载（`declare function f(): void;`），那个 `;` 归它自己。

```ts
const name = item.constructor.name;
if (
  name === "IfSet" ||
  name === "While" ||
  name === "For" ||
  name === "Foreach" ||
  name === "Switch" ||
  name === "Try" ||
  name === "Class" ||
  name === "Enum" ||
  name === "Interface" ||
  name === "Namespace" ||
  name === "StaticBlock"
) {
  return true;
}
if (name === "Function" || name === "MethodDeclaration") {
  return item.Data.some(
    (one) => one.constructor.name === "FunctionBody" || one.constructor.name === "MethodBody",
  );
}
return false;
```

## static method IsStatementUnit:(item:Token)=>bool

这个单元本身是不是一个「语句级」结构。

基础判定是七路 `instanceof`：`IfSet` / `For` / `Statement` / `Foreach` / `While` / `Try` / `Import`。

在这之上又加了九路：`Class` / `Function` / `Enum` / `MethodDeclaration` / `Field` / `Switch` / `Label`，
以及 `Interface`。三类声明本来没有自己的节点，判定表里也就没有它们；不加的话，
一条声明会和相邻的散单元一起被折进 `Statement`
（`class A {}` 外面会多包一层 `<Statement>`，`Statement` 的边界判定也认不出它是一条完整的声明）。
`Interface` 早就有节点，但判定表里**没有**它——于是 `interface I { }` 会被包进一个 `Statement`。
把它补进表里，让「声明站在根下」这条规则对 `Interface` 与 `Class` 一视同仁。
`Field` 是成员节点，不加的话同一个类体里相邻的两个字段会被折进同一个 `Statement`。

`Signature` 同理，而且它比 `Field` 更早暴露：无名成员签名（`interface I { (): void }`）在不在表里时
会被包成 `<Statement><Signature …/></Statement>`，而紧邻它的 `Field` / `MethodDeclaration` 都是**直接**
站在 `InterfaceBody` 下——同一个体里两种成员两种层级，`type T = { abstract new (): A; b: number }`
还会把 `abstract` 与后面的 `Field` 一起卷进同一个 `Statement`。

`Label` 也在表里：标签与它标的那条语句是**两个平级单元**（见 `./label.xl.md` 的说明），
不把 `Label` 当边界，收壳时会把两者一起收进一个 `Statement`。

这个判定是「语句从这里断开」的四个调用点共用的（判定器统一转调 `IsStatementBoundary`），
所以它决定了声明能不能作为独立节点站在 `Root` / `ClassBody` / 函数体里。

```ts
return item instanceof IfSet
  || item instanceof For
  || item instanceof Statement
  || item instanceof Foreach
  || item instanceof While
  || item instanceof Try
  || item instanceof Import
  || item instanceof Interface
  || item instanceof Class
  || item instanceof Function
  || item instanceof Enum
  || item instanceof MethodDeclaration
  || item instanceof Field
  || item instanceof Signature
  || item instanceof Switch
  || item instanceof Label
  // 类静态块（`static { … }`）与命名空间导出声明（`export as namespace F`）：
  // 两个都是**独立语句**，不加进来就会被多包一层 `<Statement>`——
  // `decl-class-static-block` / `mod-export-as-namespace` 两条用例钉住。
  // 用类名判定而不是 `instanceof`：本文件被几乎所有 token 文件 import，
  // 再 import 它们会绕出更深的环（与上面 `Let` 那条同一个理由）。
  || item.constructor.name === "StaticBlock"
  || item.constructor.name === "NamespaceExport"
  // **`Namespace` 在表里**：`namespace O { … } console.log(O.a);`（同一行再跟一句）
  // 靠这一条才分得开；而它**与 `print-ast-common.xl.md` 的 `BODY_FIELDS` 是一对**——
  // 那边写着「`Namespace` 的 `body` 只在**父亲也是 `Namespace`** 时成立」，
  // 少了那一半，嵌套那一档会**静默**变错（内层命名空间根本没建，
  // 脚本报的是 `cannot read properties of undefined` —— 离现场很远）。
  || item.constructor.name === "Namespace"
  // **`DoWhile` 在表里**（第 866 轮实测）：`do {} while (a) b()` 里 `DoWhile` 与后面那条语句
  // 挤在**同一个**壳里（`;` 与 `\n` 两档都不响，壳由 `FormTail` 收）——
  // 不认它，`SplitShell` 的入口（头是不是语句级单元）当场为假、标签那一支也为假
  // ⇒ 两条语句粘成一条 `ExpressionStatement`（实测这一族 12 条一起红：
  // `dw-then-call` / `dw-then-let` / `dw-then-if` / `dw-then-while` / `dw-then-do` /
  // `dw-then-comment` / `dw-then-class` / `dw-then-func` / `dw-then-return` /
  // `dw-nested-then` / `dw-in-func-then` / `dw-label-then`）。
  || item.constructor.name === "DoWhile";
```

## static method FirstMeaningful:(children:Array<Token>)=>Token

`children` 里第一个**不是 trivia** 的单元；全是 trivia 时给第一个。

**为什么语句的区间要跳过前导 trivia**（本轮量出来的）：
注释（`LineAnnotation` / `AreaAnnotation`）与软换行是**被扫进来的**透明单元，
它们不参与签入签出；而 `SearchFrontIndexed` 用的边界判据（`IsStatementBoundary`）
**不认识它们** ⇒ 一条语句前面那条注释会被算进语句的**区间**里。

实测（一步就复现）：`function f() { 1 + 2; /* c */ 3 + 4; }`
——第二个 `Statement` 的区间从 `/* c */` 起 ⇒ 投影出来的 `ExpressionStatement`
也跟着从注释起 ⇒ 「缺 `ExpressionStatement` + 多一个起点更早的 `ExpressionStatement`」成对出现，
全语料约 60 处、是现在剩下那一小撮里最大的一类。

注释**仍然是它的子单元**（产物里那份 XML 一个字节都不变）——**只把区间收正**。
trivia 落在父单元区间之外是**约定的形态**（ruler 为它单列一栏「trivia 越界」，不计进越界）。

```ts
let first = children[0];
for (const item of children) {
  if (IsTriviaUnit(item) === false) {
    first = item;
    break;
  }
}
return first;
```

## static method IsStatementBoundary:(units:Array<Token>, index:int)=>bool

`index` 处的单元是不是**一条语句从这里开始**——四个 `SearchFrontIndexed` 调用点共用的边界判定。

比 `IsStatementUnit` 多一条：**`Function` / `Class` 只有在声明位置才算边界**。

不加这条会出真 bug（实测）：`const v = function () {} && y;` 里那个函数是**表达式**，
可 `Function` 在 `IsStatementUnit` 里是无条件边界，于是往后找语句头时**停在了它身上**，
`&& y` 被单独收成一个 `Statement`；那个 `Statement` 的 `Data` 以 `&&` 打头，
`LogicalOperatorCloseRule` 攒不到左操作数，直接抛「LogicalOperator 为空」。
`class` 同理（`const v = class {} && y;`）。

```ts
const item = Get(units, index);
if (item === null) {
  return false;
}
if (item instanceof SymbolToken) {
  return item.Template.SymbolTemplate.IsStatementSymbol(item.TempToString());
}
// **语句位上的花括号组本身是一条语句**：裸块 `{ … }` 在 TS 里就是 `Block`
//（`BlockCloseRule` 认的也是它）。
// 少了这一条：`{ a(); } b();` 里那个块与后面那条调用被收进**同一个** `Statement`
// ⇒ 投影出来是 `ExpressionStatement > Block`（降级层报 `unimplemented: expression Block`）。
//
// **两道判据缺一不可**：
// · `IsDeclarationPosition` 问的是「**语句从这里开始**」（前一格是列表开头 / `;` / `}` /
//   另一条语句）—— 少了它，`while (c) { … }` / `with (o) { … }` / `function f() { … }`
//   里那个「头 + 体」的括号也会被当成新语句的开头（实测 `stmt-with.ts` 因此掉出语料）；
// · `IsStatementStart` 问的是「这个花括号是**块**不是对象字面量」（与 `BlockCloseRule`
//   / `JsonObjectCloseRule` 同一句）。
if (
  item instanceof Bracket &&
  item.startBracket === "{" &&
  IsStatementStart(units, index) &&
  Statement.IsDeclarationPosition(units, index)
) {
  return true;
}
if (Statement.IsStatementUnit(item) === false) {
  return false;
}
if (item instanceof Function || item instanceof Class) {
  return Statement.IsDeclarationPosition(units, index);
}
return true;
```

## static method WrapStartIndex:(units:Array<Token>, frontIndex:int, index:int)=>int

`[frontIndex + 1, index]` 这一段**该从哪一格开始收进 `Statement`**——正常就是 `frontIndex + 1`。

段内已经有一个成形的**语句级单元**（`IsStatementUnit`）时，返回「它后面第一个不是透明单元的格子」，
于是**要收的是它右边那条尾巴**（那个单元自己留下）。段里没有这种东西、或者它右边只剩透明单元时，
返回 `index + 1` 表示「没有可收的」。

「透明」= 软换行或符号（`;` / `,`）：它们既不可能是语句级单元，也不该被单独收成一条语句。

```ts
for (let i = frontIndex + 1; i < index; i++) {
  const item = Get(units, i);
  if (item === null || Statement.IsStatementUnit(item) === false) {
    continue;
  }
  for (let j = i + 1; j <= index; j++) {
    const tail = Get(units, j);
    if (tail === null || tail instanceof LineWrap || tail instanceof SymbolToken) {
      continue;
    }
    return j;
  }
  return index + 1;
}
return frontIndex + 1;
```

## static method IsDeclarationPosition:(units:Array<Token>, index:int)=>bool

`index` 处的 `Function` / `Class` 是不是落在**声明位置**（而不是运算符右边的表达式位置）。

只看**前一个实义单元**（跨过软换行）：

- 前面没有单元 → 是（列表开头就是一条声明的开头）；
- 前面是 `;` → 是；
- 前面是 `}` → 是（`{ … } class A {}` 这种紧随块之后）；
- 前面是语句级单元（`Statement` / `Interface` / 另一个 `Function` …）→ 是；
- 其余（`=` / `&&` / `,` / `(` / `return` …）→ 不是，那是表达式。

**往回跳的是 trivia（软换行**与注释**）**（第 679 轮）：`catch (e) //c` 换行 `{ b(); }` 里那个 `{`
前面紧挨着的是一条行注释，而注释在 TypeScript 里是 trivia —— 只跳软换行时 `previous` 落在
`LineAnnotation` 上：它不是符号、不是括号、也不是语句级单元 ⇒ 这一句答「不是声明位置」⇒
`IsStatementBoundary` 跟着答否 ⇒ 那个块与前一行被收进**同一个** `Statement`
（实测这正是一族**产物直接抛异常**用例的根：`TryCloseRule` 看到的是
`[try, Bracket, catch, Bracket, LineAnnotation]`——`catch` 的体那一格**不见了**）。
同一个文件里 `IsStatementStart` 跳 trivia 已经跳了（第 125 轮），两处口径本来就该是一条。

**`else` 那个块仍然要在这里答「是声明位置」**（同轮实测）：它的体由 `IfSet` 自己认，
而 `IfSet` 的边界恰恰问的是 `IsStatementEnd` → `IsStatementBoundary` ——
这里替 `else` 答否，`else` 的体就落进**下一条语句**里（实测
`} else /* c */ { … }` 换行 `return 0;` 的产物是
`IfSegment(else) > IfStatement > [AreaAnnotation, Bracket, Statement(return 0)]`：多出一个 `Block`、
`IfStatement` 的终点被拉到下一条语句末尾）。

**两种注释在这里**不一样（同轮实测，这是这条判据的最后一格）：`//` **换行**在 TypeScript 里
是一次 ASI（`catch (e) //c` 换行 `{` 必须是两条），而块注释不换行——`} else /* c */ {` 里那个 `{`
仍然是 `else` 的体。所以往回跳的是**软换行与块注释 / 行注释**（`SkipPreviousTrivia`），
**唯独行注释要当成一格实义单元**：`//c` 换行 `{` 里 `previous` 落在那条 `LineAnnotation` 上 ⇒
这一句答否 ⇒ 壳在 `{` 处开一条新语句（正是想要的那一条）。
两种注释混在一处时按「行注释优先」判——`catch (e) /* a */ //c` 换行 `{` 与 `catch (e) //c` 换行 `{`
是同一件事（那个 `{` 前面发生过一次换行）。

```ts
let previousIndex = SkipPreviousTrivia(units, index);
// **行注释那一格不跳过去**（第 679 轮）：`//c` 换行 `{` 里那个 `{` 前面发生过一次 ASI，
// 而块注释不算一次换行（`} else /* c */ {` 里那个 `{` 仍然是 `else` 的体）。
// 让 `previous` 落在那条 `LineAnnotation` 上，下面三个分支一个都不命中 ⇒ 答否 ⇒ 正合口径。
// 往回那一趟按**类名**认（`AreaAnnotation` 是块注释，只跳它、不跳行注释）。
for (let back = index - 1; back >= 0; back--) {
  const item = Get(units, back);
  if (item === null) {
    break;
  }
  const kind = item.constructor.name;
  if (kind === "LineAnnotation") {
    previousIndex = back;
    break;
  }
  if (kind !== "LineWrap" && kind !== "AreaAnnotation") {
    break;
  }
  previousIndex = back;
}
if (previousIndex < 0) {
  return true;
}
const previous = Get(units, previousIndex);
if (previous === null) {
  return true;
}
if (previous instanceof SymbolToken) {
  return previous.Template.SymbolTemplate.IsStatementSymbol(previous.TempToString());
}
if (previous instanceof Bracket) {
  return previous.startBracket === "}";
}
return Statement.IsStatementUnit(previous);
```

## static method IsStatementHead:(item:Token | null)=>bool

这一个单元**本身就是「一条新语句的开头」**——换行后面跟着它，就说明上一行已经写完了。

它比 `IsStatementUnit` 多认一个 `Let`：变量声明头（`const a` / `let b` / `using c`）不在
`IsStatementUnit` 的表里，因为本工程把整条声明收成一个 `Statement`、`Let` 只是它**内部**的头节点。
但 `Let` 绝不可能出现在表达式中间，所以「换行 + `Let`」一定是两条语句
（实测：`const a = x as { b: number }` 换行 `const b = …`，`As` 的类型扫描一路吞掉了后面的 `Let`）。

`Let` 用**类名判定**而不是 `instanceof`：从本文件 import `let.xl.md` 会绕出循环依赖
（`let.xl.md` → `statement.xl.md`），这与 `field.xl.md` 的成员白名单、`text-common-util.xl.md` 的
`IsStatementList` 是同一条既有约定。

```ts
if (item === null) {
  return false;
}
if (item.constructor.name === "Let") {
  return true;
}
return Statement.IsStatementUnit(item);
```

## static method WordOf:(item:Token | null)=>string

取一个「词」单元的文本：`Identifier` 用 `TempToString()`，`Keyword` 用它的 `Value`，其余返回空串。

与 `declaration-common.xl.md` 的 `IsWordUnit` 同一口径，只是这里要的是**文本**而不是「等于某个词」。
两种都要认：`KeywordCloseRule` 会把命中的词从 `Identifier` 升级成 `Keyword`
（两条分支没有继承关系），而本文件的收尾规则在**同一趟里跑两遍**，
第二遍看到的词可能已经升级过了。

```ts
if (item instanceof Identifier) {
  return item.TempToString();
}
if (item instanceof Keyword) {
  return item.Value;
}
return "";
```

## static method IsRestrictedKeyword:(item:Token | null)=>bool

`item` 是不是**受限产生式**的那个词：`return` / `throw` / `break` / `continue` / `yield`。

这些词之后**一换行就断句**（ECMAScript 的 *restricted production*）：`return` 换行 `-1`
在 TypeScript 里是 `return;` 加 `-1;` 两条语句，而不是 `return -1`。
`throw` 换行在语法上直接非法（本工程不做诊断，按断句处理更接近 AST 的形状）。

```ts
const word = Statement.WordOf(item);
return word === "return" || word === "throw" || word === "break" || word === "continue" || word === "yield";
```

## static method ExpectsOperand:(item:Token | null, before:Token | null)=>bool

`item` 之后**还必须跟一个操作数**吗——运算符、开括号、逗号、以及需要右操作数的关键词都属于这一档。

换行的**前一**个单元是它时，换行只是排版，不是语句边界：

- `const a =` 换行 `1`（`=` 要右操作数）；
- `const x = a +` 换行 `b`（`+` 要右操作数）；
- `f(` 换行 `1,` 换行 `2`（`(` 与 `,` 要内容）；
- `return` 换行……**不在此列**，它走 `IsRestrictedKeyword` 那条更早的判定。

符号表是「**不是**收尾符号」的那一批：`;` `)` `]` `}` 是收尾，`!` / `++` / `--` 两可（按需要操作数处理，
偏保守——多判成「续行」只是少断一条语句，不会造出额外的节点）。

注意：**声明头那三个词也在表里**（`let` / `const` / `var`，第 820 轮）。
`const` 换行 `a = 1;` 是**一条**声明（TypeScript 的换行在 `const` 与名字之间只是排版），
而这三格后面**必须**跟一个名字——没有「`const` 单独成句」这种写法
（它们是保留字，也不可能是属性名 / 成员名）。少了它们时 `StatementBranch` 的
`LineCannotEnd` 在换行那一刻判「这一行写完了」⇒ 收壳，`const` 自己成一条
`Statement(Keyword)`、后面整条声明另起一条（实测 `gap-sweep-newline-arr-01/02`、
`-cond-01/02`、`-obj-01/02`、`-fn-01` 那一族：缺 `VariableStatement` / `FunctionDeclaration`）。

**`const` 前面是 `as` 的那一格不算**（第 820 轮）：`as const` 是**类型断言**的写法，
`x as const` 换行 `;` 是**写完了**的一条语句，而 `const` 换行 `a = 1;` 是没写完的声明头。
两者词形一样，分开它们只看**前一个实义单元**：是 `as` ⇒ 断言（不收尾的那一格不算「期待操作数」），
否则 ⇒ 声明头。少了这一条实测会让 `stmt-asi-as-const-then-statement` 从绿变红
（`as const` 换行之后被当成续行，两条语句并成一个壳）。

```ts
if (item instanceof SymbolToken) {
  const text = item.TempToString();
  return item.Template.SymbolTemplate.IsStatementSymbol(text) === false && text !== ")" && text !== "]" && text !== "}";
}
const word = Statement.WordOf(item);
if ((word === "let" || word === "const" || word === "var") && Statement.WordOf(before) !== "as") {
  return true;
}
// **声明头那几个词也在表里**（第 822 轮）：`function` 换行 `f() { … }` 是**一条**声明
// （TypeScript 的换行在 `function` 与名字之间只是排版），`class` / `interface` 同理。
// 少了它们时 `StatementBranch` 的 `LineCannotEnd` 在换行那一刻判「这一行写完了」⇒ 收壳。
if (word === "function" || word === "class" || word === "interface" || word === "enum") {
  return true;
}
// **`import` 后面也必须跟东西**（第 934 轮片段普查量出的 `gap-r933-typeof-import-newline`）：
// `type T = typeof import` 换行 `("m");` 在 TS 那边是**一条**（`ImportType` 从 `typeof` 跨到
// `"m"` 的右括号），`import` 换行 `("m");`（动态 import）同样是一条调用 ——
// `import` 是**保留字**：它结束不了一条语句，也不可能是属性名（`a.import` 由
// `previousIsMember` 那一问挡着，走不到这里）。
// 少了它：换行处收壳 ⇒ `typeof import` 被前面的类型运算符收成一个 `TypeQuery`、
// `("m");` 另起一条语句（实测 `TypeAliasDeclaration[0,22)` + 多 `ParenthesizedExpression`）。
// **与 `IsPendingImportHead` 是两件事**：那一格问「导入声明的头写完了没有」（`{` / `*` / `=`），
// 这一格问的是「这个词能不能结束一条语句」——同一个词、两条不同的判据，各管各的落点。
if (word === "import") {
  return true;
}
// **`try` / `do` / `else` / `finally` 后面必须跟一个语句体**（第 828 轮）：
// `try` 换行 `{ … } catch (e) { … }` 是**一条** `TryStatement`
//（TS 那边 `TryStatement` 的区间从 `try` 起，换行只是排版）。
// 少了这四个词，`LineCannotEnd` 在换行那一刻判「这一行写完了」⇒ 收壳 ⇒
// `try` 自己成一条 `ExpressionStatement(Keyword)`、`catch` 另起一条、
// 整条 `TryStatement` 与两个 `Block` / `CatchClause` 全丢（实测 `try` 换行 `{ a(); } catch (e) { b(); }`
// 与 `try //c` 换行那一版：各缺 8 条、多 4 条）。
// **为什么不跟 `while` / `for` 一起**：它们后面跟的是**括号**（`while` 换行 `(cond) { … }`
// 那一格由「下一行以 `(` 开头」那一支管），而这四个词后面跟的是**语句体本身**。
if (word === "try" || word === "do" || word === "else" || word === "finally") {
  return true;
}
// **`for` / `while` / `switch` 后面必须跟一个判别括号**（第 835 轮）：`for (;;) …` 里的
// 那对括号是这几条语句**语法上不可省**的一段，所以这个词同样**不可能结束一条语句**。
//
// **第 828 轮把这三个词留在表外**，理由是「它们后面跟的是括号，那一格由『下一行以 `(` 开头』
// 那一支管」—— 那条路只在**括号真的在下一行**时成立，而标签头把换行提前了：
// `lbl: for` 换行 `(;;) { … }` 在 `for` 那一格问 `LineCannotEnd`，`(` 还没读到
// ⇒ 收壳 ⇒ `<Label/><Keyword>for</Keyword>` 一个壳、条件括号与循环体另一个壳
//（实测 `gap-sweep-{newline,linecomment}-label-02` 两条：`LabeledStatement` 漂到 `[0,8)`）。
// 补上这三个词之后那两条与 `-01` 两条一起成形。
//
// **不会误伤成员名**：`obj.for` / `a.while` 那种写法由上面「点号后面是成员名」那一问挡着
// （`previousIsMember`），与 `default` / `new` 同一档。
if (word === "for" || word === "while" || word === "switch") {
  return true;
}
// **`export` 后面必须跟一条声明 / 一个导出子句**（第 839 轮）：`export` 换行 `const a = 1;`
// 是**一条**声明——TS 的 `parseExportDeclaration` 不看换行（导出声明里没有 ASI），
// 而 `export` 是保留字：它不可能是标识符、也不可能单独成句
// ⇒ 与 `let` / `function` / `class` 同一条理由（「这个词不可能结束一条语句」）。
//
// **`declare` 不在表里**（同一轮实测）：`declare` **是**上下文关键字、可以当标识符，
// TS 那边 `declare` 换行之后走的是 **ASI** —— `declare` 自己成一条表达式语句
//（`ExpressionStatement > Identifier`）、下一行另起一条。两行排版一样、结论相反，
// 判据只能按 TS 的读法分，不能按词形分（`--snippets` 量的四份 `declare` 换行都在
// 「改成 Identifier、而不是并进下一条声明」那一档上，本轮不动）。
//
// **少了它会怎样**：换行处收壳 ⇒ `export` 自己成一条 `ExpressionStatement(Keyword)`、
// 声明另起一条 ⇒ 前缀与声明**不在同一个壳里**（列表那趟的 `export` + 声明合并只认平级、
// 认不出「已经分家」）⇒ TS 那条带 `ExportKeyword` 的声明整条缺
//（实测 `gap-sweep-{newline,linecomment}-ns-01` 两条，各缺 1 多 2）。
if (word === "export") {
  return true;
}
return (
  word === "return" ||
  word === "throw" ||
  word === "typeof" ||
  word === "new" ||
  word === "delete" ||
  word === "void" ||
  word === "await" ||
  word === "yield" ||
  word === "in" ||
  word === "of" ||
  word === "instanceof" ||
  word === "case" ||
  word === "extends" ||
  word === "as" ||
  word === "satisfies" ||
  word === "keyof" ||
  word === "infer" ||
  word === "asserts" ||
  word === "is" ||
  word === "readonly" ||
  word === "default"
);
```

## static method ContinuesExpression:(item:Token | null)=>bool

**换行后面**跟着 `item` 时，上一行的表达式还能接着写下去吗。

能的话换行只是排版（`a` 换行 `+ b` 是 `a + b`；`a` 换行 `.b` 是 `a.b`；`x` 换行 `as T` 是 `x as T`），
不能的话它就是一个语句边界。

两处刻意的取舍：

- **`++` / `--` 不在续接表里**：换行后紧跟的 `++` 是**前缀式**、起一条新语句
  （`a` 换行 `++b` 是两条语句），这正是 ASI 的受限产生式；
- **`(` / `[` / 模板串在续接表里**：`f` 换行 `(1)` 在 TypeScript 里是一次调用，不是两条语句。

**`extends` 在表里、而 `catch` / `finally` 不在**（第 878 轮）：`extends` **起不了一条语句**，
出现在一行的开头只可能是上一行的续写；`catch` / `finally` 虽然也起不了一条语句，但它们是
`try` 声明的**下一个子句**、左边那一半（`try { … }`）已经写完，所以照旧判边界
（`NextLineContinuesExpression` 那一半收它们是为了别的落点，见那一处说明）。
两半的分工是「**解析期判得宽的、收尾期未必跟**」，所以这里只补 `extends` 一个词。

```ts
if (item instanceof SymbolToken) {
  const text = item.TempToString();
  if (
    text === "." ||
    text === "(" ||
    text === "[" ||
    text === "," ||
    text === "?" ||
    text === ":" ||
    text === "=>" ||
    text === "!" ||
    text === "~"
  ) {
    return true;
  }
  if (text === ")" || text === "]" || text === "}" || text === ";" || text === "++" || text === "--") {
    return false;
  }
  // 其余符号（四则 / 移位 / 关系 / 相等 / 位运算 / 逻辑 / 赋值 / 复合赋值）都能续接
  return true;
}
const word = Statement.WordOf(item);
return (
  word === "as" ||
  word === "satisfies" ||
  word === "in" ||
  word === "of" ||
  word === "instanceof" ||
  word === "is" ||
  // **`extends` 与它们同一条理由**（第 878 轮）：它**起不了一条语句**——
  // 继承子句、接口的 `extends`、泛型形参的约束、条件类型的 `A extends B`
  // 全是接着上一行写的。**解析期那一半早就这么判了**（`NextLineContinuesExpression`
  // 第 825 轮就收了 `extends`），只有收尾期这一半没跟上：
  // `infer V` 换行 `extends string ? V : never` 里那个换行被 `IsLineBreakBoundary`
  // 判成边界 ⇒ `ConditionalTypeCloseRule.FindStart` 回扫第一步就停 ⇒
  // 条件类型从**第二个** `extends` 起算、`InferType` 的约束那一格整段丢掉
  // （实测 `gap-r869-infer-extends-newline-7`：缺 `ConditionalType` / `InferType` /
  // `StringKeyword` 等 8 处）。两半口径在这里对齐。
  word === "extends"
);
```

## private static method NextLineFirstCharIndex:(source:Source)=>int

`NextLineFirstCharAt` 那一格需要**下标**（`NextLineContinuesExpression` 要看紧跟在它
后面的第二个字符，用来分辨 `++` / `--`）。本体的跳字符循环在
`text-common-util.xl.md` 的 `SkipSourceTriviaFrom`（理由见那一格），这里只是换个起点。

```ts
return SkipSourceTriviaFrom(source, source.Index + 1);
```

## static method NextLineFirstCharAt:(source:Source)=>string

`source` 处那个软换行**后面**那一行的第一个**实义字符**（跳过空白与注释）；扫到文件末尾给空串。

**本体住在 `text-common-util.xl.md`**（第 876 轮）：`export.xl.md` 的 `ExportCloseRule.Process`
要问**同一段扫描**（`export { a }` 换行 `from "m"`），而 `export.xl.md` 反过来被本文件 import
（`export_1` 那一格）⇒ 共用的一格只能放在两者共同的下层。
本文件这两格只是转发（名字保留：`NextLineContinuesExpression` 那一段的注释都写着它）。

**注释也算 trivia**（与 `IsLineBreakBoundary` 的跳过口径对齐）：`x as` 换行 `// 注` 换行 `| A`
里那个 `|` 才是下一行的第一个实义字符。

```ts
return NextLineFirstCharAt(source);
```

## static method NextLineStartsWithWord:(source:Source, word:string)=>bool

`source` 处那个软换行**后面**那一行是不是以 `word` 这个**词**开头。本体同样在
`text-common-util.xl.md`（见上一格写的理由）——`export` 声明的收尾规则与
`IsPendingExportHead` 问的是**同一句**，所以这里也只是转发。

```ts
return NextLineStartsWithWord(source, word);
```

## static method LineEndsWithEquals:(data:Array<Token>)=>bool

这一段**最后一个实义单元**是不是一个 `=`。

**为什么要问它**（第 876 轮）：`import A =` 换行 `require("m")` 与 `import A = B.C` 的**左半边
一模一样**，分开它们只能看右边；而解析期在换行那一刻右边还没读进来
（`NextLineStartsWithWord` 那一格是同一件事的另一面）。
`import` 声明的收尾规则与语句分派层问的是同一句，所以它是一格公开方法。

```ts
const at = SkipPreviousTrivia(data, data.length);
const last = Get(data, at);
return last instanceof SymbolToken && last.Is("=");
```

## static method NextLineContinuesExpression:(data:Array<Token>, source:Source)=>bool

`source` 处那个软换行**后面**那一行会不会接着写下去——**ASI 右半截的解析期版本**（第 568 轮）。

**为什么右半截要另写一份**：`ContinuesExpression` 问的是**下一个单元**，
而解析期在换行那一刻**下一个单元还没读进来**（`StatementBranch` 排在 `LineWrap.AppendIn` 之前）
⇒ 那一刻只问得出**左边**那一半（`LineCannotEnd` / `IsLineBreakIncompleteOnLeft`）。
可 ASI 判据是**两半合起来**的（`IsLineBreakBoundary`）：`const v = x as` 换行 `| A` 换行 `| B` 里
**第二个**换行左边是 `A`（写完了）、右边是 `|`（还要接着写）⇒ **不是边界** ——
只有左边那一半时它就成了边界 ⇒ 壳在 `| A` 后面关掉 ⇒ `| B` 落进**另一个** `Statement`
（实测 `expr-as-leading-pipe-union.ts` / `type-union-in-as-expression.ts` /
`type-union-leading-bar.ts` 三份 `2 缺 5 漂 7 多`）。

**判据只看原始字符**（`source.Document`）：跳过空白与注释之后，
下一个实义字符落在下表里就答「续接」，其余一律答否。

| 下一行的第一个实义字符 | 判据 |
| --- | --- |
| `\|` / `&` / `.` | 直接答「续接」（第 568 轮，三个都**起不了一条语句**） |
| `(` / `[` | 还要过两道护栏（第 582 轮）——见下 |
| `?` / `:` | 直接答「续接」（第 585 轮，两个都**起不了一条语句、也起不了一个成员**） |
| `+` / `-` / `*` / `%` / `^` | 直接答「续接」（第 589 轮，见下） |

**`(` / `[` 为什么当初被排除、后来又补上**：

`IsLineBreakBoundary` 的续接表宽得多（`(` / `[` / `+` / `-` / `/` / 模板串 / `as` 那一族词），
可那些字符**大多能起一条语句**（括号表达式、数组字面量、一元 `+` / `-`、正则、模板串）——
第 568 轮把**整张表**搬进解析期，实测 **13 份用例当场抛异常**
（`stmt-paren-start.ts` / `expr-iife-*.ts` 那一族，1013 → **1006**），
于是那一条只留了 `|` / `&` / `.` 三个，`(` / `[` **一起被扔掉** ——
这就是 `stmt-asi-paren-call.ts`（`0 4 5`）与 `am-block-lambda-array-compound.ts`（`5 2 4`）
一直红着的原因（TS 那边它们是 `y(…)()` 与 `x[1, 2, 3]`，一条表达式）。

第 582 轮把这两个**单独**拿回来，并配上两道护栏（缺了它们就是第 568 轮那个结果）：

1. **`HasTypeColonBefore(data, data.length) === false`** —— 与 `IsLineBreakBoundary`
   那一支（第 158 轮）**问同一个问题**：上一行是**类型标注**时 `[` 起的是下一条成员
   （`interface I { ['a']: T` 换行 `['b']: U }`）；这是**投影侧早就写过的那条护栏**，
   第 568 轮那一版**没有它**；
2. **左端是一格收好的花括号组时一律不收**：`function f(): any { … }` 换行 `[a, b] = c`
   里那个 `[` 起的是**下一条语句**，而 `HasTypeColonBefore` 撞上那个 `{` 就答「表达式」
   （它的口径是「花括号 = 上一行到此为止、**按表达式处理**」，见那一处说明）
   ⇒ 少了这一句，函数声明被并进下一条解构赋值（实测 `38-destructuring-assignment.ts`
   报 `unimplemented: assignment to a non-identifier (left is FunctionDeclaration)`，
   `tests/runtime/check.mjs` 的「求值顺序与赋值表达式的值」一条一起红 —— 见第四节）。

**语料把两道护栏的必要性分得很清**：只加符号、两道护栏都不加 ⇒ `tests/cases/token` 那一栏
**看不出来**（1035 / 1037、**零抛异常**，与加满护栏时**一模一样**），
红的是 `runtime:*` 两道门 —— 这是本仓第一次出现「四方向尺子全绿、而门是红的」，
所以第 582 轮起，**动这一类判据必须两道门一起看**（见第五节）。

**三条更早的判定仍然优先**（与 `IsLineBreakBoundary` 一字不差）：左边没有实义单元、
左边是**受限产生式**（`return` / `throw` / `break` / `continue` / `yield`）、
左边是**后缀**的 `++` / `--` —— 这三种**换行就是边界** ⇒ 一律答否（照旧收壳，
`stmt-asi-return-newline.ts` / `lex-regex-after-return-next-line.ts` 两份实测就是这么咬回来的）。
`(` / `[` 那两道护栏排在它们**之后**（先判「换行就是边界」，再判续接）。

**注释也当 trivia**：`x as` 换行 `// 注` 换行 `| A` 里那个 `|` 才是下一行的第一个实义字符
（与 `IsLineBreakBoundary` 的跳过口径对齐）。

```ts
const previous = Get(data, SkipPreviousTrivia(data, data.length));
if (previous === null) {
  return false;
}
if (Statement.IsRestrictedKeyword(previous)) {
  return false;
}
if (previous instanceof SymbolToken && (previous.Is("++") || previous.Is("--"))) {
  return false;
}
const document = source.Document;
const count = document.GetCount();
const at = Statement.NextLineFirstCharIndex(source);
const head = NextLineFirstCharAt(source);
if (head === "") {
  return false;
}// **`(` / `[` 开头**（第 582 轮）：`x = y` 换行 `(function () { … })()` 与
// `x => x` 换行 `[1, 2, 3]` 都是**接着写**（TS 那边是一条 `CallExpression` / `ElementAccessExpression`），
// 而解析期只认 `|` / `&` / `.` 三个符号时它们一律断句 ⇒ 后半截落进另一个壳
//（实测 `stmt-asi-paren-call.ts` `0 4 5`、`am-block-lambda-array-compound.ts` `5 2 4`）。
//
// **左端是一格收好的花括号组 ⇒ 一律不收**：`function f(): any { … }` 换行 `[a, b] = c`
// 里那个 `[` 起的是**下一条语句**（TS 那边两条平级），而 `HasTypeColonBefore` 撞上
// 那个 `{` 就答「表达式」（它的口径是「花括号 = 上一行到此为止、按表达式处理」，
// 见那一处说明）⇒ 少了这一句，函数声明会被并进下一条解构赋值
//（实测 `38-destructuring-assignment.ts` 报 `assignment to a non-identifier
// (left is FunctionDeclaration)`、`tests/runtime/check.mjs` 的「求值顺序」一条一起红）。
if (head === "(" || head === "[") {
  const last = Get(data, SkipPreviousTrivia(data, data.length));
  if (last instanceof Bracket && last.startBracket === "{") {
    return false;
  }
  // **声明头的形参表**（第 825 轮）：`function f<T extends U>` 换行 `(x: T): T { … }` 里
  // 那个 `(` 起的是**这一条声明的形参表**，不是下一条语句（判据见
  // `IsDeclarationHeadAwaitingParameters`）。
  //
  // **为什么非要单独认它**：下面那句 `HasTypeColonBefore` 撞上**前面任何一条已经成形的语句**
  // 就答「上一行到此为止」（第 681 行那条口径）——而语料里的用例**前面永远有几行 `// xl:…`
  // 注释**，那些注释各是一层 `Statement` ⇒ 这一格于是判否、壳在换行处关掉
  //（实测 `gap-sweep-newline-generic-05` 与 `gap-sweep-linecomment-generic-05` 两份：
  //  注释掉那三行注释就正好绿，是这一句把它按住的）。
  if (head === "(" && Statement.IsDeclarationHeadAwaitingParameters(data)) {
    return true;
  }
  // **「上一行是不是类型标注」只问这一段自己**（第 831 轮）：`HasTypeColonBefore` 撞上
  // **前面任何一条已经成形的语句**就答「上一行到此为止」——而语料里这一段常常紧跟在
  // `// xl:…` 那几行注释之后（**每一行注释各是一层 `Statement`**）⇒ `f` 换行 `(1, 2)`
  // 被判成「注释后面又起了一条语句」⇒ 换行处收壳 ⇒ 调用被劈成 `f` 与 `(1, 2)` 两条
  // `ExpressionStatement`（实测 `gap-sweep-linecomment-call-01` 与
  // `gap-sweep-{newline,linecomment}-switch-0{1,2}` 四份，各缺一个 `CallExpression`）。
  //
  // 这一问的本意是「**这一行**是类型标注吗」（`interface I { ['a']: T` 换行 `['b']: U }`），
  // 前面那几条语句与它无关 ⇒ 往回扫的范围收到**这一段**（段首由 `IsStatementBoundary` 划，
  // 与 `FormFrom` / `Condition` 那几处同一个边界判据）。段内按定义不含任何边界单元，
  // 于是「撞上已成形语句」那一支在这一问上不再响 —— 正是想要的。
  const segmentFrom =
    SearchFrontIndexed(data, data.length, (itemIndex, item) => Statement.IsStatementBoundary(data, itemIndex)) + 1;
  // **`case` / `default` 的标签冒号不算类型标注**：`switch` 体里段首常常就是 `case 1:`
  // —— 那个冒号只是标签，认成类型标注的话 `(` 那一格会被判成「新起一条语句」
  // （同一个开关，见 `HasTypeColonBefore` 那一处）。
  return HasTypeColonBefore(data.slice(segmentFrom), data.length - segmentFrom, true) === false;
}
// **`?` / `:` 开头**（第 585 轮）：上一条是 `const rendered = a === 0` 换行
// `? "Symbol()"`，下一条是 `const digits = f(x)` 换行 `: (…)` —— 两处都是**接着写**。
//
// **这两个字符与前两族不是一回事**：`(` / `[` 那两道护栏存在，是因为它们
// **能起一条语句**（括号表达式、数组字面量）⇒ 只能靠上下文分辨；`?` 与 `:` 则
// **起不了任何一条语句，也起不了任何一个成员**（语句的开头只有那几族词、`{`、
// 表达式起始符与 `@`；成员的开头是名字 / 计算名 / 修饰符）⇒ 它们出现在一行的
// 第一个实义字符上，只可能是**上一行的续接** —— 不需要护栏，也不该有
//（第 568 轮把整张续接表搬进解析期时翻了车，翻的正是「那些字符能起一条语句」那一条；
// 这一族没有那个问题）。
//
// **投影侧早就是对的**：`ContinuesExpression` 那张表里 `?` / `:` **一直在**
//（第 88 轮起），只有解析期这一份原始字符版没有它们 ⇒ 两半的口径不一致：
// 换行那一刻判「是边界」⇒ 壳关掉 ⇒ `? … : …` 落在**两个** `Statement` 里
// ⇒ 三元规则（`ternary-operator.xl.md` 的 `Previous`）在任何一个壳里都凑不齐
// 一个 `?` 加一个 `:` ⇒ `ConditionalExpression` 整条缺，
// 而散落的两截各自被别的规则认领（`? "Symbol()"` 成了 `ExpressionStatement`、
// `: "Symbol(" + …` 那截里的字符串被当成**类型字面量** ⇒ 多出 `LiteralType` /
// `ParenthesizedType`）。实测一份 12 行的最小复现：缺 21 / 漂 6 / 多 12。
if (head === "?" || head === ":") {
  return true;
}
// **逗号开头**（第 911 轮片段普查量出的 `gap-r907-arrow-generic-newline-before-comma`）：
// `const f = <T` 换行 `,>(a: T) => a;` 在 TS 那边是**一条** `ArrowFunction`（`<T,>` 是它的
// 泛型形参表），而解析期这张表里**没有 `,` 那一档** ⇒ 换行处收壳 ⇒ 泛型段还没成形就断了壳
//（实测：产物把 `<` 折成 `LessThanToken`、`(a: T) => a` 落进另一条语句）。
//
// **为什么可以无条件收**（与上面 `?` / `:` 那一条同一句理由）：`,` **起不了一条语句**、
// 也**起不了一个成员**（语句的开头只有那几族词、`{`、表达式起始符与 `@`；成员的开头是
// 名字 / 计算名 / 修饰符）⇒ 它出现在一行的第一个实义字符上，只可能是上一行的续接。
// 收尾期那一半本来就在表里（`ContinuesExpression` 的 `,`），两半一直不一致。
if (head === ",") {
  return true;
}
// **赋值符开头**（第 824 轮）：`const a` 换行 `= [1, 2, 3];` 是**一条**声明
// （ASI 不在 `=` 前面断句——JS 里 `x` 换行 `= 5` 也是一条赋值语句）。
// `=` / `=>` / `==` / `===` **起不了一条语句**（语句的开头没有以 `=` 起头的写法），
// 所以与 `?` / `:` 同一条理由：出现在一行的第一个实义字符上只可能是上一行的续接。
//
// **少了它会怎样**：换行处收壳 ⇒ `const a` 自己成一个壳、`= [1, 2, 3];` 另起一个
// ⇒ `VariableStatement` / `VariableDeclaration` 整条缺、`Let` 里没有名字
//（实测 `gap-sweep-newline-{arr,cond,destr,obj,arrow,optchain}-02` 与
// `gap-sweep-linecomment-{var,obj,tpl,optchain}-02` 那一族：各缺整条声明 + 多出零散节点）。
if (head === "=") {
  return true;
}
// **尖括号开头**（第 905 轮）：`const a = new A` 换行 `<B>();` 是**一条**声明，
// `const a = b` 换行 `<C>d;` 也是**一条**（TS 那边是 `b < C > d` 那条比较链）。
//
// **为什么它属于「起不了一条语句」那一档、却又不能照抄 `?` / `:` 的写法**：
// `<` 在 TS 里**能**起一条语句（类型断言 `<T>x` 是一条合法的表达式语句），
// 所以它不像 `?` / `:` 那样可以无条件答「续接」。
// 可 ASI 的判据是「**下一个词能不能续接这个表达式**」——`<` 接在一条表达式后面
// **永远是**关系运算符（类型断言只出现在**表达式开头**，而这个 `<` 前面刚写完一条表达式）；
// 真的另起一条语句时（`foo();` 换行 `<T>x;`），上一格已经是 `;` / `}` 那样的语句级单元，
// 上面那句 `IsStatementBoundary` 早就早退了，走不到这里。
// 这也正是 `+` / `-` 那两条**只收「起不了一条语句」的那几个**时留下的口子：
// 它们能起前缀式、可出现在一行开头时只可能是二元 —— `<` 与它们同一档，只是当时没量到。
//
// **少了它会怎样**（实测 `gap-r902-new-typeargs-newline` 与 `const a = b` 换行 `<C>d;`）：
// 换行处收壳 ⇒ 后半截落进**另一个** `Statement` ⇒ `new A<B>()` 被劈成
// `new A` + `<B>()`（后者还被读成 `TypeAssertionExpression`；漂 4 多 7）。
if (head === "<") {
  return true;
}
// **下一行以模板串开头**（第 909 轮片段普查量出的 `gap-r907-tagged-template-newline`）：
// `tag` 换行 `` `a${b}c` `` 在 TS 那边是一条 `TaggedTemplateExpression`
//（实测 `ts.createSourceFile` 的区间跨过那个换行），而解析期这张表里**没有模板串那一档**
// ⇒ 换行处收壳 ⇒ 整条断成「`tag`」+「`` `a${b}c` ``」两条语句。
//
// **为什么可以无条件收**（与上面 `<` 那条同一个理由）：`` ` `` 起头的那一格
// **接在一条表达式后面永远是标签模板**（模板串单独成句时，上面那句
// `IsStatementBoundary` 早就因为上一格是 `;` / `}` 而早退了，走不到这里）。
// 收尾期的 `IsLineBreakBoundary` 那张表里本来就有模板串，两半一直不一致。
if (head === "`") {
  return true;
}
// **除号开头**（第 931 轮）：`const a = 1` 换行 `/ 2 / 3;` 在 TS 那边是**一条**
// `BinaryExpression`（除号接着上一行那个操作数写），而这张表里没有 `/`
// ⇒ 换行处收壳 ⇒ 后半截另起一条壳，`/ 2 /` 还被读成一条 `RegularExpressionLiteral`
//（实测第 931 轮片段普查 `num-newline`：漂移 3 + 多 5，那条正则吞掉了一个操作数）。
//
// **为什么可以无条件收**（与上面 `<` / 模板串那两条同一个理由）：`/` 接在一条
// **写完的表达式**后面**永远是除号**——正则只出现在**表达式开头**，而这个 `/` 前面刚
// 写完一条表达式；真的另起一条正则语句时（`foo();` 换行 `/re/.test(x);`），
// 上面那句 `IsStatementBoundary` 早就因为上一格是 `;` / `}` 而早退了，走不到这里。
//
// **注释不用在这里让路**：`NextLineFirstCharAt` 走的是 `SkipSourceTriviaFrom`
// （注释与空白一起跳过），所以走到这里的一定是**注释之后的**实义字符——
// `1 /*c*/` 换行 `/ 2` 里那一格同样是除号（实测 `num-comment-nl`）。
if (head === "/") {
  return true;
}
// **双目运算符开头**（第 589 轮）：`return a * 86400000` 换行 `+ b * 3600000` 是**一条**表达式
// （ASI 不在它前面断句——`+` 能接着上一条表达式写），实测 `dist/ts/typescript-exec/builtins/globals.ts`
// 与 `inspect.ts` 两份：上一行被收成一个 `ReturnStatement` / `ExpressionStatement`，
// 下一行另外起一条 `ExpressionStatement`，`+` 成了 `PrefixUnaryExpression`。
//
// **只收「起不了一条语句」的那几个**：`*` `%` `^` 都是纯双目，
// 一行以它们开头**只可能**是上一行的续写；`+` / `-` 两可作为一元前缀，
// 可 ASI 的判据是「下一个词能不能续接」——`+ x` 接在一条表达式后面**永远是**二元，
// 所以换行处也不该收壳（真的另起一条语句时，上一格已经是 `;` / `}` / 语句级单元，
// `IsStatementBoundary` 那一句早就早退了，走不到这里）。
//
// **`/` 不在此列**：一行以 `/` 开头可能是正则或注释，`(` / `[` 同理（第 568 轮的账）。
// `&` / `|` / `.` 在下面那一句里，`&&` / `||` / `??` 与比较、相等运算符留给以后按需加。
if (head === "+" || head === "-" || head === "*" || head === "%" || head === "^") {
  // **`++` / `--` 是前缀式**：`a` 换行 `++b` 在 TS 里是两条语句（ASI 的受限产生式）
  // ⇒ 两个字符连着写时不是续接（实测 `stmt-asi-prefix-increment.ts` 与
  // `stmt-asi-prefix-increment-after-statement.ts` 两份，各缺 2 / 漂 2 / 多 1）。
  const after = at + 1 < count ? document.GetValue(at + 1) : "";
  if ((head === "+" && after === "+") || (head === "-" && after === "-")) {
    return false;
  }
  return true;
}
// **下一行以 `catch` / `finally` 开头**：`try { … }` 换行 `catch (e) { … }` 换行
// `finally { … }` 是**同一件事**的日常排法 —— 这两个词**起不了一条语句**（保留字），
// 所以它们出现在一行的第一个词上只可能是上面那条 `try` 的续写，与 `?` / `:` 同一条理由，
// 也不需要护栏。
//
// **少了它会怎样**：换行处照常收壳 ⇒ `try` 与它的体被关进一个 `Statement`
// ⇒ `TryCloseRule`（它只认**平列表上**的 `try` 词）再也看不到它们
// ⇒ `catch` / `finally` 落成两条普通语句，`catch (e)` 里的 `e` 变成一个**没声明过的名字**
//（实测：整份文件报 `name is not a local or a capture: catch` ——
// 覆盖率语料里 `exc-*` / `json-parse-error` / `error-custom-subclass` 那一族十几条一起红）。
let wordEnd = at;
for (;;) {
  if (wordEnd >= count) {
    break;
  }
  const one = document.GetValue(wordEnd);
  const isWordChar =
    (one >= "a" && one <= "z") ||
    (one >= "A" && one <= "Z") ||
    (one >= "0" && one <= "9") ||
    one === "_" ||
    one === "$";
  if (isWordChar === false) {
    break;
  }
  wordEnd = wordEnd + 1;
}
if (wordEnd > at) {
  let word = "";
  for (let i = at; i < wordEnd; i++) {
    word = word + document.GetValue(i);
  }
  if (word === "catch" || word === "finally") {
    return true;
  }
  // **下一行以 `extends` 开头**（第 825 轮）：`extends` 与 `catch` / `finally` 同一条理由
  // ——它**起不了一条语句**（继承子句、接口的 `extends`、条件类型的 `A extends B`、
  // 泛型形参的约束都接着上一行写），所以出现在一行的第一个词上只可能是上一行的续写。
  //
  // **少了它会怎样**：`function f<T` 换行 `extends U>(x: T): T { … }` 里那个换行被判成边界
  // ⇒ 头被切成两半 ⇒ `FunctionDeclaration` 整条缺（实测 `gap-sweep-newline-generic-03`
  // 与 `gap-sweep-linecomment-generic-03` 两份）。
  if (word === "extends") {
    return true;
  }
  // **下一行以 `in` / `instanceof` 开头**（第 879 轮）：与上面那两个词同一条理由
  // ——它们**是保留字、起不了一条语句**，也不是任何一个成员的开头，所以出现在一行的
  // 第一个词上只可能是上一行那个操作数的**双目运算符**：
  //
  //     return #x ⏎ in o;          class A { #x = 1; static f(o: A) { return #x ⏎ in o; } }
  //     return a ⏎ instanceof B;   （TS 那边两条都是**一条** `ReturnStatement` 带一个 `BinaryExpression`）
  //
  // **`of` / `as` / `is` / `satisfies` 刻意不在名单里**：它们是**上下文关键字**、
  // 本身就是一个合法的标识符表达式（`of;` 是一条语句），所以「一行以它开头」分不出
  // 「续写」与「下一条语句」——判据只能留给别处（`ContinuesExpression` 那张表收它们，
  // 是因为那里问的是**下一个实义单元**、而且走的是另一条口径）。
  //
  // **少了它会怎样**：换行处收壳 ⇒ `return #x` 自己成一个 `ReturnStatement`、
  // `in o;` 另起一条 `ExpressionStatement` ⇒ 缺 `BinaryExpression` + 缺操作数
  // （实测 `gap-r869-private-in-newline-12`：缺 2 漂 1 多 2）。
  if (word === "in" || word === "instanceof") {
    return true;
  }
  // **下一行以 `is` 开头，而上一行正好是「类型谓词只写了一半」**（第 931 轮）：
  //
  //     declare function f(x: unknown): asserts x ⏎ is string;
  //     function g(x: unknown): asserts x ⏎ is string {}
  //
  // 在 TS 那边这两条都是**一条**声明（`TypePredicate` 从 `asserts` 跨到 `string`），
  // 而 `is` 是**上下文关键字**（本身是一个合法的标识符表达式）⇒ 上面那条「`of` / `as` /
  // `is` / `satisfies` 不进名单」的理由在这里照样成立，**不能只看那一个词**。
  // 所以这一档多问一句**形状**：这一段的尾巴正好是 `asserts` + 一个名字
  //（`Statement.IsPendingTypePredicate`）——`asserts` 只在类型位合法，
  // 值位那个是普通标识符，于是「一半谓词 + 下一行以 `is` 开头」只可能是同一条谓词。
  // **少了它会怎样**：换行处收壳 ⇒ 谓词只到名字、`is string` 另起一条语句
  //（实测 `gap-r931-asserts-is-newline`：缺 `StringKeyword`、多 `Identifier` + `ExpressionStatement`）。
  if (word === "is" && Statement.IsPendingTypePredicate(data)) {
    return true;
  }
}
// **下一行以 `{` 开头，而上一行是「等着体的语句头」**（第 668 轮）：
// `while (a)` 换行 `{ … }`、`for (;;)` 换行 `/* c */` 换行 `{ … }`、`switch (a)` 换行 `{ … }`
// 都是「体写在下一行」的日常排法。`{` 本身**起得了一条语句**（裸块），所以不能见 `{` 就收，
// 只能认「上一格正好是这些头的那个 `)`」——判据在 `IsHeaderBodyBrace`。
//
// **少了它会怎样**：换行处照常收壳 ⇒ 头与体被切成两条 ⇒ `WhileCloseRule` 那一趟只看得到
// 头那一格，体那一支落成平级的裸 `Bracket`（实测 `while (a)\n{}` 的产物是
// `WhileStatement[0,9)` + 多一个 `EmptyStatement`，TS 是 `WhileStatement[0,12)` 带一个 `Block`）。
// **类头也在这一档里**（第 912 轮片段普查量出的 `gap-r907-class-expression-name-newline`）：
// `const A = class Named` 换行 `{};` 与 `const A = class extends B` 换行 `{}` 都是**一条**
// `ClassExpression`（体写在下一行），而 `class` 那一格后面**还有内容**（名字 / 继承子句）时
// 换行落在名字上 ⇒ `IsHeaderBodyBrace` 那张词表走到名字就停了 ⇒ 壳在换行处关掉 ⇒
// `{}` 落成裸块、`ClassExpression` 整条缺（实测 缺 2 漂 3 多 6）。
// **判据不在这里重写**：`ClassBranch.IsPendingHead` 直接问类自己那一份进门判据
// （`ScanHead`）——头怎么算完、名字 / 类型参数 / `extends` / `implements` 各占哪几格，
// 只有一份实现。`a.class` 换行 `{}` 由它自己的位置闸挡掉。
if (head === "{" && (Statement.IsHeaderBodyBrace(data) || ClassBranch.IsPendingHead(data))) {
  return true;
}
// **下一行以 `<` 开头，而上一行是一个「等着类型参数段」的声明头**（第 825 轮）：
// `function f` 换行 `<T extends U>(x: T): T { … }` 是**一条**声明。
//
// **`<` 不能无条件收**：`.ts` 里 `<T>x` 是**尖括号断言**，一行的第一个字符完全可以是它
// （`IsTypePosition` 的 `;` 那一支就是为「两条断言各占一行」写的）⇒ 只能认「左边是一个
// 还差类型参数段的声明头」这一格，判据在 `IsDeclarationHeadAwaitingTypeParameters`。
//
// **少了它会怎样**：换行处收壳 ⇒ `function f` 自己成一条、`<T extends U>…` 另起一条
// ⇒ `FunctionDeclaration` 整条缺（实测 `gap-sweep-newline-generic-02` 与
// `gap-sweep-linecomment-generic-02` 两份，各缺 11 个节点）。
if (head === "<" && Statement.IsDeclarationHeadAwaitingParameters(data)) {
  return true;
}
return head === "|" || head === "&" || head === ".";
```

## static method IsHeaderBodyBrace:(data:Array<Token>)=>bool

上一行的末尾是不是**一个等着体的声明头**（`while (…)` / `for (…)` / `switch (…)` / `function …`）。

**为什么是「往回走」而不是「看紧邻那一格」**：这些头的尾巴各不相同——
`while (…)` 的尾巴是 `)`、`function f<T>(x: T): T` 的尾巴是**返回类型**（`TypeDefine`）、
`switch (…)` 的尾巴是 `)`。所以判据是「从末尾往回走，跳过声明头里会出现的那几种单元，
**第一个词**是不是这四个之一」。名字那一格（`function f` 里的 `f`）允许出现一次，
`while` / `switch` 没有名字所以要靠符号/单元类型走出来。

**名单不放宽到「凡是等着体的词」**：`do` / `else` / `try` 后面那一格是词不是 `)`，
它们换行写体的路**实测是通的**（`try { }` 换行 `catch (e) { }` 就不需要这一句）；
`if (…)` 也一样（`IfSet` 那一趟自己有认体的路）。放宽到它们就等于把「本来对的排法」也一起改了。

**`catch` / `finally` 在名单里**（第 679 轮，**实测撞到的**）：这两个词的形状与 `try` **一模一样**
（后面跟的是词或 `)`，不是「等着体的声明头」那一串尾巴），可它们换行写体的路**不通**：
`try { } catch (e) { } finally` 换行 `{ c(); }` 里，换行处 `NextLineContinuesExpression`
问的正是这一句 ⇒ 答否 ⇒ 壳在换行处关掉 ⇒ 那个 `{` 落成**独立的块语句**（或者被并进同一个壳）⇒
`TryCloseRule` 手上的单元表里 `finally` 后面**没有**那个 `{` ⇒ 抛
`Cannot read properties of null (reading 'SourceRange')`，**整份文件进不来**。
`catch` 是同一个根（`catch (e)` 换行 `{ … }`），所以两个词一起收。

**为什么必须收**：`{` 本身**起得了一条语句**（裸块），所以不能见 `{` 就答「续接」——
`foo()` 换行 `{}` 在 TS 里就是两条语句。这一条判据正是把「声明头」与「写完的表达式」分开的那一格。

**`import` / `export` 也在名单里**（同一个理由）：这两个词**结束不了一条语句**，
后面那一行的 `{` 只可能是它们那个子句（`import` 换行 `{ a } from "m"`、`export` 换行 `{ a }`）。
少了它们，壳在换行处就关掉 ⇒ `Import` 那一趟只看得到 `import` 那一格
（实测 `d-import-nl` 的产物是 `ImportDeclaration[0,6)`，多出 12 个节点）。

```ts
let at = data.length;
let names = 0;
let seenPredicateWord = false;
for (let step = 0; step < 16; step++) {
  const index = SkipPreviousTrivia(data, at);
  const unit = Get(data, index);
  if (unit === null) {
    return false;
  }
  const name = unit.constructor.name;
  if (name === "Identifier" || name === "Keyword") {
    const text = WordText(unit);
    if (
      text === "while" ||
      text === "for" ||
      text === "switch" ||
      text === "function" ||
      text === "import" ||
      text === "export" ||
      text === "catch" ||
      text === "finally"
    ) {
      return true;
    }
    // **名字那一格**（`function f` 里的 `f`，返回类型 `: T` 里的 `T`）：声明头里最多两个
    // （一个名字 + 一个类型名）。`foo()` 换行 `{}` 里那个 `foo` 走到这里之后，
    // 再往前一格就是语句边界 / 列表开头 ⇒ 照样答否。
    //
    // **类型谓词的尾巴要多一格**（第 869 轮）：`function f(x): x is string` 换行 `{` 里，
    // 返回类型位是**三个标识符**（`x` / `is` / `string`）——`is` 与 `asserts` 是谓词里的词、
    // **不占名字预算**，但见过 `is` 之后那个谓词参数名（`x`）要多占一格
    //（返回类型位上它不算「类型名」）。少了它会一路走到 `x` 那一格就答否
    //（实测 `type-predicate-newline-6`：`FunctionDeclaration` 区间少一截、多一个同名节点）。
    if (text === "is" || text === "asserts") {
      seenPredicateWord = true;
      at = index;
      continue;
    }
    // **`declare` 也是「等着体的声明头」那一族的词**（第 880 轮）：`declare global` 换行
    // `{ interface W { … } }` 是**环境模块声明**的日常排法（TS 那边是一条 `ModuleDeclaration`
    // 带一个 `ModuleBlock`），少了它壳在换行处就关掉 ⇒ `declare global` 自己成一条
    // `ExpressionStatement`、`{ … }` 落成裸 `Block`（实测 `gap-r869-declare-global-newline-2`：
    // 缺 `ModuleDeclaration` / `Identifier` / `ModuleBlock` 三处、多 2）。
    //
    // **`declare` 不能像 `while` / `function` 那样无条件算头**：它是**上下文关键字**、
    // 本身就是一个合法的标识符（`foo(declare)` 换行 `{}` 里那个 `declare` 是个实参，
    // 回扫路上 `)` 是透明的 ⇒ 无条件算头会把那两行并起来）⇒ 只认**这一段的段首**那一格。
    //
    // **段首不能用 `SkipNextTrivia(data, -1)` 求**（第一版就是这么写的，实测**只对了没有注释头的
    // 片段**）：`data` 是**容器**的子单元表，语料里这一段的**前面永远有几行 `// xl:…` 注释**，
    // 那些注释各是一层 `Statement` ⇒ 段首算出来是**注释**那一格、`declare` 于是被判「不是段首」
    // ⇒ 缺口照旧（`gap-r869-declare-global-newline-2` 实测不转绿）。段首只能由**语句边界**
    // 划：与 `NextLineContinuesExpression` 里 `HasTypeColonBefore` 那一处用**同一句**
    // `SearchFrontIndexed(… IsStatementBoundary …) + 1`。
    if (text === "declare") {
      const segmentFrom =
        SearchFrontIndexed(data, data.length, (itemIndex, item) => Statement.IsStatementBoundary(data, itemIndex)) + 1;
      if (index === segmentFrom) {
        return true;
      }
      at = index;
      continue;
    }
    if (name === "Identifier" && names < (seenPredicateWord ? 3 : 2)) {
      names = names + 1;
      at = index;
      continue;
    }
    return false;
  }
  // **只认参数表那个圆括号**：`{` 与 `[` 一律不跳 —— 它们是「上一条语句已经写完」的信号
  //（`const h = function () {}` 换行 `foo()` 换行 `{}` 里，往回走会先撞上那个 `{`）。
  if (unit instanceof Bracket) {
    if (unit.startBracket !== "(") {
      return false;
    }
    at = index;
    continue;
  }
  if (name === "GenericType" || name === "TypeDefine" || name === "ReturnType" || name === "TypeQuery" || name === "TypeOperator" || name === "UnionType" || name === "IntersectionType" || name === "ArrayType" || name === "LiteralType") {
    at = index;
    continue;
  }
  if (unit instanceof SymbolToken) {
    const symbol = unit.TempToString();
    if (symbol === "*" || symbol === ">" || symbol === "?" || symbol === ":") {
      at = index;
      continue;
    }
  }
  return false;
}
return false;
```

## static method IsFunctionHeadReturnColon:(data:Array<Token>)=>bool

上一行末尾那个 `:` 是不是**函数声明头的返回类型**那一格——`function f(x: T):` 换行 `T { … }`。

判据三条：末尾的实义单元是 `:`；`:` 前面那一格是一个**收好的形参表**（`(` 括号）；
段首（跳过修饰词）是 `function`。

**为什么不能见 `:` 就判「没写完」**：`case 1:` / `default:` / `label:` 都以 `:` **收尾**
（`LineCannotEnd` 那一段的账），所以 `:` 在解析期只能按「可能收尾」处理。
这一条把「返回类型那一格」认回来的正是另外两条：那个 `)` 把「标签 / `case` 的冒号」全部排除，
而段首那个 `function` 把「变量的类型标注」（`const x:` 换行 `number = 1`，左边没有 `)`）排除。

```ts
const colonIndex = SkipPreviousTrivia(data, data.length);
const colon = Get(data, colonIndex);
if (!(colon instanceof SymbolToken) || colon.Is(":") === false) {
  return false;
}
const parameters = Get(data, SkipPreviousTrivia(data, colonIndex));
if (!(parameters instanceof Bracket) || parameters.startBracket !== "(") {
  return false;
}
const frontIndex = SearchFrontIndexed(data, data.length - 1, (itemIndex, item) => Statement.IsStatementBoundary(data, itemIndex));
const modifiers = ["export", "declare", "abstract", "default", "async"];
let wordIndex = SkipNextTrivia(data, frontIndex);
let word = Statement.WordOf(Get(data, wordIndex));
while (word !== "" && modifiers.indexOf(word) >= 0) {
  wordIndex = wordIndex + 1;
  word = Statement.WordOf(Get(data, wordIndex));
}
return word === "function";
```

## static method IsVariableTypeAnnotationColon:(data:Array<Token>, index:int)=>bool

`index` 前面那个实义单元是不是**一格的 `:`、而它后面一定是类型**——`const s:` 换行
`string = ""`（变量声明的类型标注）与 `const f = (a: string):` 换行 `number => 1;`
（值位箭头的返回类型标注）。

判据（只看**已经读到**的单元）：末尾的实义单元是 `:`；`:` 前面那一格是**声明头那个单元**
（`Let`——`const s:` 到这一刻 `const` 与名字已经折进 `Let` 自己的字段里，见 `let.xl.md`），
**或者**是一张**值位箭头的形参表**（`(` 括号，判据见 `IsValueArrowReturnColon`）。

**为什么两格合成一问**：两处问的是**同一句话**（「末尾这个 `:` 一定是类型标注 ⇒ 这一行
没写完」），所以挂在同一个入口上 ⇒ 解析期（`LineCannotEnd`）与收尾期
（`IsLineBreakIncompleteOnLeft`）两处口径自动一致；写成两份必然会漂。

**为什么不能见 `:` 就判「没写完」**：`case 1:` / `default:` / `label:` 都以 `:` **收尾**
（`LineCannotEnd` 那一段的账），与 `IsFunctionHeadReturnColon`（认 `function f(x):`）同一条口径；
这一条认的是**变量声明头**与**值位箭头的返回类型**那两格。

**为什么按 `Let` 那个单元判、而不是按 `let` / `const` / `var` 三个词判**（实测踩过）：
走到这一问时那三个词**已经不在 `Data` 里**了——`LetBranch.Success` 把它们与名字一起收进
`Let` 的 `modifiers` / `fieldName` 两个字段，平列表上只剩 `[Let, :]`
（XML：`<Statement><Let fieldName="s" modifiers="let" /><SymbolToken>:</SymbolToken></Statement>`）。
按词判**一次都不响**——第 826 轮那条「把 `CloseRule` 的宿主判据搬到解析期之前，
先问那个单元现在成形了吗」在这里又验了一遍。

**少了它会怎样**（第 873 轮实测）：`let s:` 换行 `string;` 里解析期在换行处收壳
⇒ 类型标注整段落进下一条 `Statement`（`VariableStatement` / `VariableDeclaration` 区间漂、
`StringKeyword` 缺）；同一格的 `declare const s:` 换行 `unique symbol;` 就是语料里
`gap-r869-unique-symbol-newline-3` 那一份。**箭头返回类型那一格**（第 901 轮）的实测账
写在 `IsValueArrowReturnColon` 里。

```ts
const colonIndex = SkipPreviousTrivia(data, index);
const colon = Get(data, colonIndex);
if (!(colon instanceof SymbolToken) || colon.Is(":") === false) {
  return false;
}
const beforeIndex = SkipPreviousTrivia(data, colonIndex);
const before = Get(data, beforeIndex);
if (before !== null && before.constructor.name === "Let") {
  return true;
}
// **值位箭头的返回类型标注**（第 901 轮）：`const f = (a: string):` 换行 `number => 1;`
// 里那个 `:` 同样是**没写完**的那一格 —— 判据见 `IsValueArrowReturnColon`。
if (Statement.IsValueArrowReturnColon(data, beforeIndex)) {
  return true;
}
// **成员签名那个返回类型的 `:` 写在下一行**（第 901 轮）：`type T = { (a: string)` 换行
// `: void };` 里末尾是 `(` 括号，而**换行后面那一格就是 `:`** —— 判据见
// `IsPendingSignatureReturnColon`。少了它：解析期在这一行收壳 ⇒ 签名与返回类型分家
//（实测 `token/types/gap-r900-signature-return-newline`：缺 `CallSignature` / `Parameter`、
// 多 `Bracket`）。
return Statement.IsPendingSignatureReturnColon(data, index);
```

## static method IsPendingSignatureReturnColon:(data:Array<Token>, index:int)=>bool

`index` 处是一个软换行、而它**后面那一格就是 `:`** ——而且左边停着的是一对 `(` 括号
吗——`type T = { (a: string)` 换行 `: void };`。

**这一问的判据是三条，不是「在不在成员体里」**：

1. `index` 那一格是软换行；
2. 跨过 trivia 之后下一格是 `:` ——TypeScript 里**没有**一条语句或一个成员是以 `:` 开头的，
   ASI 那条「语法不允许时才插分号」在这里同样成立；
3. 换行左边那一格是 `(` 括号，而**它前面那一格不是** `=` / `.` / `?.` / `?` / `=>`。

**第 3 条为什么那样写**：`const v = (x)` 换行 `: 1` 这种排版里 `(x)` 前面是 `=` ⇒ 那一段是
**表达式**（`(x)` 的括号、与后面那个 `:` 无关）⇒ 答否。`a ? (b)` 换行 `: c` 里括号前面是 `?`、
`o.f (x)` 换行 `: 1` 里前面是 `.`（或被调用的名字）同理。反过来，签名那一格前面只可能是
成员体的开头（`{`）、上一条成员的 `;` / `,`、修饰词或列表开头 —— 都不在那张表里。

**为什么不在这一格里去问「父单元是不是成员体」**：解析期在换行那一刻，那对括号的父单元
还是 `Root`（`TypeLiteralBody` 要等 `}` 到达、由 `TypeLiteralCloseRule` 造出来），
所以那句话在这个时机**恒为假**。收尾期那一侧的口径在 `SignatureCloseRule.IsBareParameters`
里（那时父单元已经有了），两处问的是同一件事、时机不同，所以判据各写各的。

**少了它会怎样**（第 901 轮实测）：解析期在换行处收壳 ⇒ `{ (a: string)` 与 `: void }` 分家
（实测 `token/types/gap-r900-signature-return-newline`：缺 `CallSignature` / `Parameter`、
多 `Bracket`）。

```ts
const unit = Get(data, index);
if (unit === null || unit instanceof LineWrap === false) {
  return false;
}
const after = Get(data, SkipNextTrivia(data, index));
if (!(after instanceof SymbolToken) || after.Is(":") === false) {
  return false;
}
const parameters = Get(data, SkipPreviousTrivia(data, index));
if (!(parameters instanceof Bracket) || parameters.startBracket !== "(") {
  return false;
}
const before = Get(data, SkipPreviousTrivia(data, SkipPreviousTrivia(data, index) - 1));
if (before === null) {
  return true;
}
if (before instanceof SymbolToken && (before.Is("=") || before.Is(".") || before.Is("?.") || before.Is("?") || before.Is("=>"))) {
  return false;
}
return true;
```

## static method IsValueArrowReturnColon:(data:Array<Token>, parametersIndex:int)=>bool

`parametersIndex` 那一格的 `(` 括号是**值位箭头函数的形参表**、而它右边紧跟一个 `:` 吗
——`const f = (a: string):` 换行 `number => 1;`。

**为什么这一问与 `IsVariableTypeAnnotationColon` 放一起**：两个都问「末尾这个 `:` 后面
一定是类型 ⇒ 这一行没写完」，只是一个跟在 `Let` 后面、一个跟在形参表后面。而两个的
**否定面也一致**：`case 1:` / `default:` / `lbl:` 的冒号前面是名字、不是括号，
`let f: (a: A) => B` 里那个冒号后面虽然也有括号，可**括号在冒号右边**、不在左边
（这一问看的是「冒号左边是不是形参表」）⇒ 都不会被误收。

判据三条（都只看**已经读到**的单元，所以换行那一刻问得出来）：

1. `parametersIndex` 那一格是 `(` 括号；
2. 它**左边那一格是 `=`** —— 值位赋值号的右边才是箭头函数
   （`const f = (a: string):`）；类型标注 `let f: (a: A) => B` 的括号左边是 `:` ⇒ 判否；
3. 括号里装着**实义内容** —— 空括号 `()` 与 `( … )` 在类型位与值位长得一样，
   而本仓的类型位不走这一支（见下），所以只看「是不是空」。

**为什么不去问「这是不是形参表」**：那一问是 `LamdaCloseRule.IsLambdaParameters`
（`lamda.xl.md`），而它**不能在这一格里复用** —— 那一问在解析期与 `StatementBranch`、
`LetBranch`、`LabelCloseRule` 全都互相引用，`IsVariableTypeAnnotationColon` 又同时挂在
解析期（`LineCannotEnd`）与收尾期（`IsLineBreakIncompleteOnLeft`）两处 ⇒ 一引就是环。
**实际也不需要它**：本方法只在**末尾那个 `:`** 上响，而在 `.ts` 里
「`)` 之后紧接 `:` 且这个 `)` 左边是 `=`」只有**值位箭头函数的返回类型标注**一种读法
—— 这一段既然左边是 `=`，它就不是类型位（类型位那几档在 `IsLambdaParameters` 里
按 `:` / `?:` / `new` / `GenericType` 各自早退，走的不是 `=` 这一支）。

**少了它会怎样**（第 901 轮实测）：换行处收壳 ⇒ `const f = (a: string):` 自成一条
`VariableStatement`、返回类型 `number` 与箭头体落进下一条 `Statement`（四方向
`缺 3　漂 3　多 8`，实测 `token/expressions/gap-r900-arrow-return-type-newline`）。

```ts
const parameters = Get(data, parametersIndex);
if (!(parameters instanceof Bracket) || parameters.startBracket !== "(") {
  return false;
}
// **`async` 可以夹在赋值号与形参表之间**（第 928 轮第二趟）：`const f = async ():` 换行
// `Promise<void> => {}` 里 `)` 左边那一格是 `async`（再左边才是 `=`），照原样判否
// ⇒ 换行处收壳 ⇒ 整条 async 箭头分家（实测缺 `ArrowFunction` / `AsyncKeyword` /
// `TypeReference`，多一条 `ExpressionStatement` 与一个 `BinaryExpression`）。
// 跨过 `async` 之后下面那两条判据一个都不用改——`async (` 在值位上只有一种读法
//（异步函数 / 异步箭头），而 `async` 自己是名字时后面不会紧跟一对括号再跟 `:`。
let beforeIndex = SkipPreviousTrivia(data, parametersIndex);
let before = Get(data, beforeIndex);
let crossedAsync = false;
if (before instanceof Identifier && before.Is("async")) {
  crossedAsync = true;
  beforeIndex = SkipPreviousTrivia(data, beforeIndex);
  before = Get(data, beforeIndex);
}
if (!(before instanceof SymbolToken) || before.Is("=") === false) {
  return false;
}
// **空形参表那一格只有 `async` 撑着**：没有 `async` 时「空括号」在类型位与值位同形，
// 所以照旧要求括号里有实义内容（第 901 轮那条判据一个字不动）。
return crossedAsync || Statement.FirstMeaningful(parameters.Data) !== null;
```

## static method IsPendingTypePredicate:(data:Array<Token>)=>bool

这一段的尾巴是不是「类型谓词只写了一半」——`[asserts] <名字>`：下一行以 `is` 开头时，
那一格该不该续接（第 931 轮）：

    declare function f(x: unknown): asserts x ⏎ is string;
    function g(x: unknown): asserts x ⏎ is string {}

**为什么不能只看下一行那个词**：`is` 是**上下文关键字**，本身是一个合法的标识符表达式
（`is;` 是一条语句），所以「一行以 `is` 开头」分不出「续写」与「下一条语句」——
这与 `of` / `as` / `satisfies` 三个词不进 `NextLineContinuesExpression` 那张名单是同一条理由。
这一格改成问**左边那一格**：`asserts` 只在类型位合法（值位那个是普通标识符），
所以「尾巴正好是 `asserts` + 一个名字」时，下一行那个 `is` 只可能是这条谓词的。

**少了它会怎样**：换行处收壳 ⇒ 谓词只到名字、`is string` 另起一条语句
（实测 `gap-r931-asserts-is-newline`：缺 `StringKeyword`、多 `Identifier` + `ExpressionStatement`）。

```ts
const nameAt = SkipPreviousTrivia(data, data.length);
const name = Get(data, nameAt);
if (name === null) {
  return false;
}
const word = Statement.WordOf(name);
if (word === "" || word === "asserts" || word === "is") {
  return false;
}
const assertsAt = SkipPreviousTrivia(data, nameAt);
return Statement.WordOf(Get(data, assertsAt)) === "asserts";
```

## static method IsDeclarationHeadAwaitingParameters:(data:Array<Token>)=>bool

上一行是不是停在一个**还没到形参表**的声明头上——`function f` 换行 `<T extends U>(…)`、
`function f<T extends U>` 换行 `(x: T): T { … }`。

判据三条（都只看**已经读到的**单元，所以换行那一刻问得出来）：

- 末尾那一格是**名字**（`Identifier`）——名字后面**允许已经有一个** `GenericType`
  （`function f<T extends U>` 的那一格），一格一格往回跳；
- 名字**前面**那一格是声明头那个词（`function` / `class` / `interface` / `type` / `enum` /
  `namespace` / `module`）。

**与 `IsHeaderBodyBrace` 是同一族的两格**：那一格问「末尾等着 `{` 吗」（`while (…)` / `function f(…)`
那几种尾巴），这一格问「末尾等着 `<` 或 `(` 吗」——`function f` / `function f<T>` 后面那一格
只有名字（外加一个类型参数段），别的什么都没有。

**为什么必须问左边**：`<` 在 `.ts` 里能起一条语句（尖括号断言 `<T>x`）、`(` 能起一条语句
（括号表达式），所以「一行以它们开头」本身说明不了任何事；而「声明词 + 名字」这个左边后面
只可能跟类型参数段、`(`、`extends`、`{` 四样 ⇒ 这两格就够用了。

```ts
let at = SkipPreviousTrivia(data, data.length);
let name = Get(data, at);
if (name !== null && name.constructor.name === "GenericType") {
  // **类型别名的右值是泛型函数类型**（第 928 轮第二趟）：`type T = <T>` 换行 `(a: T) => T;`
  // 里末尾那一格是类型参数段，再往左是 `=`、别名与 `type`——同一个「等着形参表」的形状
  // （上面那一格认的是「声明词 + 名字 + `GenericType`」，这里认的是
  // 「`type` + 名字 + `=` + `GenericType`」）。少了它：换行处收壳 ⇒ 类型别名只剩 `<T>`、
  // 余下那段另起一条语句（实测缺 `FunctionType` / `TypeParameter`，多一条
  // `ExpressionStatement` 与一个 `ArrowFunction`）。
  // **只管类型别名**：`const f = <T>`（值位的泛型箭头）不在这一档，行为与今天一致。
  const equalsIndex = SkipPreviousTrivia(data, at);
  const equals = Get(data, equalsIndex);
  if (equals instanceof SymbolToken && equals.Is("=")) {
    const aliasIndex = SkipPreviousTrivia(data, equalsIndex);
    const alias = Get(data, aliasIndex);
    return alias instanceof Identifier && Statement.WordOf(Get(data, SkipPreviousTrivia(data, aliasIndex))) === "type";
  }
  at = SkipPreviousTrivia(data, at);
  name = Get(data, at);
}
if (!(name instanceof Identifier)) {
  return false;
}
const word = Statement.WordOf(Get(data, SkipPreviousTrivia(data, at)));
return (
  word === "function" ||
  word === "class" ||
  word === "interface" ||
  word === "type" ||
  word === "enum" ||
  word === "namespace" ||
  word === "module"
);
```

## static method HasLineBreakBefore:(units:Array<Token>, index:int, source:Source)=>bool

`units[index - 1]` 与 `source` 处这个字符之间**跨过了一个软换行**吗——**按原始字符判**（第 571 轮）。

**为什么不能在单元列表上问**：这一问本来是「上一格是不是 `LineWrap`」，可
**`Data` 里根本没有 `LineWrap`** —— 它是透明单元（给 `build/` 临时插一行日志实测：
`if (k) f()` 换行 `g()` 里来 `g` 那一刻 `Data` 是 `Statement|Identifier` 两格，
从来没有第三格）⇒ 那个问法**永远为假**（`if/if-statement.xl.md` 的 `Process` 上原来那一支）。

**改成看字符**：上一格的终点与当前字符之间那片**空隙**里有没有 `\n` / `\r` ——
空隙里只可能是空白 / 注释 / 换行（两侧都是已经定下来的单元），
所以这一问等价于「当前这个字符是**新的一行**上的」，而且**不用等下一个单元**。

**本体已经抽到 `text-common-util.xl.md` 的 `HasLineBreakBetween`**（第 934 轮）：
`type-bracket.xl.md` 问的是同一句话（「上一个实义单元与这一格之间有没有换行」），
而那里问的两端**都不是** `units[index - 1]`（中间隔着已经成形的类型单元）⇒
同一个问题必须只有一份实现，这里只做转发。

```ts
const previous = Get(units, index - 1);
if (previous === null) {
  return false;
}
const end = previous.SourceRange.End;
if (end === null) {
  return false;
}
return HasLineBreakBetween(end, source);
```

## static method IsPendingDecoratorHead:(data:Array<Token>, start:int)=>bool

`start` 起到列表末尾这一段**只装了装饰器**吗——也就是「装饰器还没等到它修饰的那条声明」。

**为什么要问这一句**（第 570 轮）：`@sealed` 换行 `class C {}` 里，换行那一刻
`class` 那个词**还没读进来** ⇒ 解析期只看得见 `@ sealed` 两个单元；
`Decorator` 单元此刻也**还没成形**（它是 `ClassBranch` / `EnumBranch` 进门时
`ReorganizeDeclarationDecorators` 收的）⇒ 这个换行若照常收壳，
装饰器就被关进一个 `<Statement>` ⇒ `class` 那一步往回扫只看见一个**壳**
⇒ 整条装饰器掉到 `Class` 的**兄弟位**上，而 TS 那边它是 `ClassDeclaration` 的
**第一个子节点**、连区间也从装饰器起 ⇒ 每份用例各记「缺一个 `ClassDeclaration`
+ 多两个起点更早的节点」（实测四份：`decl-class-decorator-class.ts`、
`cls-decorators.ts`、`cls-decorator-calls.ts`、`ex-decorator-expression.ts`）。

**为什么段首必须是 `@`**：这就是「装饰器那一行」的定义 ——
`@` 在词法层只有两种命运：逐字字符串前缀（`@'a'` 那一刻就并进 `String`，到不了这里）
或者一个独立的 `SymbolToken`，而后者只出现在装饰器里。
段首不是 `@` 的一律答否 ⇒ 这句话**碰不到**普通表达式（`export` 单独占一行的情形
是另一笔账，见台账里「声明词还没到」那一条）。

**其余单元为什么只能是名字 / 点号 / 括号**：装饰器只有四种写法 ——
`@Name`、`@ns.Name`、`@Name(实参)`、`@(表达式)`（见 `decorator.xl.md`），
合起来就是「`@` + 名字 + 点号 + 括号」；出现别的单元（运算符 / 分号 / 花括号）
说明这一段已经不是装饰器了 ⇒ 答否。

```ts
const first = Statement.FirstMeaningful(data.slice(start));
if (first === null || first === undefined) {
  return false;
}
if ((first instanceof SymbolToken && first.Is("@")) === false) {
  return false;
}
for (let i = start; i < data.length; i++) {
  const item = Get(data, i);
  if (item === null) {
    continue;
  }
  // **注释也是 trivia**（第 666 轮）：`@a // x` 换行 `@b class C {}` 里，
  // 装饰器与换行之间夹着一条行注释；只跳软换行时循环停在注释上 ⇒ 答否 ⇒ 换行处收壳
  // ⇒ 两个装饰器被劈成两条语句（实测缺 `ClassDeclaration`、多一个 `ExpressionStatement`）。
  if (IsTriviaUnit(item)) {
    continue;
  }
  if (item instanceof SymbolToken && (item.Is("@") || item.Is("."))) {
    continue;
  }
  if (item instanceof Identifier) {
    continue;
  }
  if (item instanceof Bracket) {
    continue;
  }
  return false;
}
return true;
```

## static method IsPendingImportHead:(data:Array<Token>, start:int)=>bool

`start` 起到列表末尾这一段**是一条还没写完的导入声明头**吗——也就是「`import` 后面还没有路径」。

**为什么要问这一句**（第 829 轮）：`import` 声明**没有 ASI**，`;` 之前的一切（注释、换行）
都归同一条声明（TS 一样收）：

    import { a, b as c } ⏎ from "m";
    import { a } from //c ⏎ "m";

而换行那一刻 `from "m"` **还没读进来** ⇒ 这一段只装着 `import { … }` ⇒ 换行处收壳之后，
壳里那一格马上被 `ImportCloseRule` 收成一个**半截的** `Import`（区间只到 `}`、`From` 空着），
后面 `from "m";` 另起一条 `ExpressionStatement`
（实测四份：`gap-sweep-{newline,linecomment}-import-02/03/04` 各缺一个 `StringLiteral`、漂移一处）。

判据分两步：

- **段首那个词必须是「真的导入声明头」**：交给 `ImportCloseRule.Instance.Previous` 问**同一句**
  —— `import(` 是动态导入、`import.meta` 是元属性、`a.import` 是成员名，三条都在那里
  （那是收尾规则里唯一的判据，这里再写一份必然会漂）。少了这一条，`import("./m")` 换行
  `.then(f)` 与 `import.meta.url` 换行 这种**表达式**也会被当成没写完的声明；
- **段里还没有路径**：出现 `String` 单元就算写完了（`import "m"` / `import x from "m"`）。

`=` 那一档单列：`import A = B.C` 里**一个字符串都没有** —— 只看 `String` 的话
「`import A = B.C` 换行 `const x = 1;`」会被并进**同一条**语句（实测语料里有这种排版）。

**但「有没有 `=`」不是「写完了没有」**（第 876 轮）：`import m =` 换行 `require("m")` 里那个
`=` 的**右操作数还没到手**——`IsComplete` 要问的是「这一格算不算**完成了**」，
而 `=` 后面的东西此刻还没读进来（与 `export` / `default` 那两格同一件事：
`Statement.ExpectsOperand` 里 `=` 本来就要求右操作数，`LineCannotEnd` 已经答「这一行没完」，
问题在于**导入声明的收尾规则跑在语句壳之前**，它一并壳这一段就再也轮不到下一行了）。
判据落在**原始字符**上：末尾是 `=`、而下一行第一个实义字符**做得了一个操作数**
（标识符字符起头，`{` 那种字面量也算）⇒ 还没写完。下一格是运算符 / `)` / `;` / `,` 这些
「起不了一个操作数」的字符时**照旧算写完**——那样 `import A = B.C` 换行 `const x = 1;` 那种排版
一位都不动。判据本体是 `LineEndsWithEquals` + `NextLineFirstCharAt`（两处只有一份）。

```ts
let headAt = start;
while (headAt < data.length && IsTriviaUnit(Get(data, headAt))) {
  headAt = headAt + 1;
}
const head = Get(data, headAt);
if (head === null || !(head instanceof Identifier) || head.Is("import") === false) {
  return false;
}
if (ImportCloseRule.Instance.Previous(head.Template, data, headAt) === false) {
  return false;
}
for (let i = headAt + 1; i < data.length; i++) {
  const item = Get(data, i);
  if (item === null) {
    continue;
  }
  // **`String` 必须是这一份的 `String`**（第 832 轮）：它原来没在 `# dependencies` 里，
  // 生成出来的 TS 里那句 `item instanceof String` 落到了**JS 内建的那个 `String`** 上
  // ⇒ 永远为假 ⇒ 「段里已经有路径」这一步形同不存在 ⇒ 任何 `import …` 换行都被当成
  // 「头还没写完」。实测：`import './pool'` 换行 `export default Agent` 换行 `class A {}`
  // 三段并进**同一个** `Statement`（`export,default` 于是被折成 `Class` 的修饰词，
  // `export default` 那一条 `ExportAssignment` 整条不见）。
  if (item instanceof String) {
    return false;
  }
  if (item instanceof SymbolToken && item.Is("=")) {
    // **落到这一格为止，那一段末了是不是只剩一个 `=`**（第 876 轮）：
    // 是 ⇒ 右操作数还没到手 ⇒ 这一段当然还没写完（`require("m")` / `B.C` 都还没读进来）
    // ⇒ **待定**；不是（`=` 后面已经有东西）⇒ 照旧算写完。
    return Statement.LineEndsWithEquals(data);
  }
}
return true;
```

## static method IsPendingExportHead:(data:Array<Token>, start:int, source:Source)=>bool

`start` 起到列表末尾这一段**是一条还没写完的导出声明**吗。

**为什么要问这一句**（第 869 轮）：与 `IsPendingImportHead` **同一件事、同一条理由**——
`export` 声明也没有 ASI，`;` 之前的一切（注释、换行）都归同一条声明。
差别只在**「写完」怎么判**：导入一定以路径收尾（一个字符串），导出有**四种**收尾形状
（星号那一支要 `from` 与路径、花括号那一支子句到手就算写完、`=` / `default` 那一支要等操作数）。

判据分两步，与 import 那一格一字不差：

- **段首那个词必须是「真的导出声明头」**：交给 `ExportCloseRule.Instance.Previous` 问**同一句**
  —— `a.export` 是成员名、`import("./m").default` 那类表达式不在这一档，判据只有那一处；
- **这一段还没写完**：判据本体复用 `ExportCloseRule.Instance.IsComplete`（收尾规则里那一份），
  不另写第二份近似——两处问的既然是同一句，写两份必然会漂。

**少了它会怎样**：`export * as ns` 换行 `from "m"` 在换行处收壳 ⇒ `ExportCloseRule` 收出一个
**半截的** `Export`（区间只到 `ns`、`From` 空着），`from "m";` 另起一条 `ExpressionStatement`
（实测 `export * as ns ⏎ from "m"` 缺 1 漂 1 多 3、`export * as ns from ⏎ "m"` 漂 1 多 2）。

**「花括号那一支自己就完整」也要看右边**（第 876 轮）：`export { a }` 换行 `from "m"` 里
花括号子句到手那一刻 `IsComplete` 就已经答「写完了」（`from` 是可选的，所以左边看不出来），
换行处收壳 ⇒ 声明断成「`export { a }` + `from "m";`」两条
（实测 `gap-r869-exp-named-newline-before-from`：漂 1 多 3）。
判据落在**原始字符**上：这一段是花括号那一支、**还没吃到 `from`**、而下一行以 `from` 这个词开头
⇒ 还没写完（`Statement.NextLineStartsWithWord`，与 `NextLineContinuesExpression` 同一段扫描）。

```ts
let headAt = start;
while (headAt < data.length && IsTriviaUnit(Get(data, headAt))) {
  headAt = headAt + 1;
}
const head = Get(data, headAt);
if (head === null || !(head instanceof Identifier) || head.Is("export") === false) {
  return false;
}
// **`export as namespace <名字>` 这一支单列**：`Previous` 只认 `export` 后面紧跟的那几种
//（`*` / `{` / `=` / `default`），而这一支的第三格是 `namespace`、第四格才是名字——
// 换行正好落在名字之前时它是「还没写完」，名字已经读到就是写完了（那时照旧交给下面两问）。
const asAt = SkipNextTrivia(data, headAt);
const asUnit = Get(data, asAt);
if (asUnit instanceof Identifier && asUnit.Is("as")) {
  const namespaceAt = SkipNextTrivia(data, asAt);
  const namespaceUnit = Get(data, namespaceAt);
  if (namespaceUnit instanceof Identifier && namespaceUnit.Is("namespace")) {
    return SkipNextTrivia(data, namespaceAt) >= data.length;
  }
}
if (ExportCloseRule.Instance.Previous(head.Template, data, headAt) === false) {
  return false;
}
const items: Token[] = [];
for (let i = headAt + 1; i < data.length; i++) {
  const item = Get(data, i);
  if (item === null || IsTriviaUnit(item)) {
    continue;
  }
  items.push(item);
}
if (ExportCloseRule.Instance.IsComplete(items)) {
  // **花括号那一支的右边那一格**（第 876 轮）：`export { a }` 换行 `from "m"` 到这里
  // `IsComplete` 已经答「写完了」（`from` 对花括号子句是可选的）——可下一行那个 `from`
  // 说明**还没写完**。只在「有花括号、还没有 `from`」时问右边那一行。
  const brace = items.some(
    (item) => item instanceof Bracket && item.startBracket === "{",
  );
  const fromAt = items.findIndex((item) => item instanceof Identifier && item.Is("from"));
  if (brace && fromAt === -1 && NextLineStartsWithWord(source, "from")) {
    return true;
  }
  return false;
}
return true;
```

## static method EndsOperand:(item:Token | null)=>bool

`item` 能不能**结束一个操作数**——也就是「它左边已经凑出一个完整的表达式了」。

判据只有一条：**不是**运算符。所以 `Identifier` / 字面量 / 字符串 / 各式单元都算；
`SymbolToken` 里只有 `)` / `]` / `}` / `!` / `++` / `--` 这几个是「操作数末尾」。

**整整一条语句不算操作数**（第 934 轮片段普查量出的 `incdec-n5`）：`++` / `--` / `!`
这三个两可符号问的是「**它左边**有没有一个操作数末尾」——而解析期把 `;` 收成壳之后，
左边那一格可能已经是**一条成形的 `Statement`**：
`let a = 1; a++; --` 换行 `a;` 里那个 `--` 前面是 `a++;` 那条壳，而 TS 读的是
**前缀**`--`（`PrefixUnaryExpression` 跨过那个换行，实测缺 `PrefixUnaryExpression` +
漂 1 + 多 3）。**「不是运算符」这一条对整条语句不成立**：
语句级单元不是表达式的操作数，所以它右边那个 `++` / `--` 只可能是前缀。
判据用 `IsStatementUnit`（与「语句从这里断开」那四个调用点共用一份名单）。

它只被 `IsLineBreakBoundary` / `IsLineBreakIncompleteOnLeft` 用来分辨 `++` / `--` 是**前缀**
还是**后缀**：`x` 换行 `++b` 里 `++` 前面没有操作数，是前缀（起新语句）；
`x++` 换行 `continue` 里 `++` 前面是 `x`，是后缀（表达式已经写完，换行是语句边界）。

```ts
if (item === null) {
  return false;
}
if (Statement.IsStatementUnit(item)) {
  return false;
}
if (item instanceof SymbolToken) {
  const text = item.TempToString();
  return text === ")" || text === "]" || text === "}" || text === "!" || text === "++" || text === "--";
}
return true;
```

## static method IsLineBreakIncompleteOnLeft:(units:Array<Token>, index:int)=>bool

`index` 处（将要）是一个软换行时，**左边那一行还没写完**吗——写不完就**一定不是**语句边界。

这是 ASI 判据的**左半截**（第 558 轮从 `IsLineBreakBoundary` 里原样提出来的）。
两半问的东西不一样：

- **右半截**问「下一行第一个单元能不能续接这个表达式」（`ContinuesExpression`）——那要**下一个单元**，
  所以只有事后（列表已经读全）才问得出来；
- **左半截**只用**已经读到的单元** ⇒ **解析期在换行那一刻就能问** ——
  `StatementBranch` 正是靠它才不在「`const a =` 换行 `1 + 2`」这种排版上收壳
  （那一档实测的账见 `FormFrom` / `StatementBranch` 两处）。

顺序是硬的（与 `IsLineBreakBoundary` 一字不差）：**受限产生式**（`return` / `throw` /
`break` / `continue` / `yield`）之后**就是**边界，所以那几种先排除；后缀的
`++` / `--` / `!` 也一样（它们前面已经有操作数末尾 ⇒ 左边写完了）。

**`!` 是两可的**（前缀 `!x` / 后缀 `a!`），所以按**它前面那一格**分辨：
`a!` 换行是边界、`a = !` 换行不是 —— 与 `++` / `--` 同一套判法
（`EndsOperand`，它本来就是为这两可符号写的）。

**点号后面的名字不算「期待操作数」**：`import("./m").default` 换行 `const y = …` 里那个
`default` 是**成员名**（`default` / `new` / `in` / `is` / `readonly` 都在 `ExpectsOperand`
的词表里）——判据落在左边那一格上（第 124 轮定下的那条）。

```ts
const previousIndex = SkipPreviousWrapSymbol(units, index);
if (previousIndex < 0) {
  return false;
}
const previousRealIndex = SkipPreviousTrivia(units, index);
const previous = Get(units, previousRealIndex);
if (previous === null) {
  return false;
}
if (Statement.IsRestrictedKeyword(previous)) {
  return false;
}
if (previous instanceof SymbolToken && (previous.Is("++") || previous.Is("--") || previous.Is("!"))) {
  const before = Get(units, SkipPreviousTrivia(units, previousRealIndex));
  if (Statement.EndsOperand(before)) {
    return false;
  }
}
const beforePrevious = Get(units, SkipPreviousTrivia(units, previousRealIndex));
// **类型词没等到操作数**（第 873 轮）：`const s: unique` 换行 `symbol` 与
// `type T = abstract` 换行 `new () => X` 是同一档——末尾那个词（`unique` / `abstract`）
// **不可能**结束一个类型，判据（含「为什么还要问它自己在不在类型位」）见
// `IsPendingTypeModifier`。少了它：换行处收壳 ⇒ 后半截落进下一条 `Statement`
//（实测 `gap-r869-unique-symbol-newline-4` / `gap-r869-abstract-construct-newline-4`）。
if (IsPendingTypeModifier(units, index)) {
  return true;
}
// **变量声明的类型标注那一格**（第 873 轮）：`const s:` 换行 `string = ""` 是**一条**声明——
// 与 `LineCannotEnd` 那一侧的 `:` 分支问的是同一个问题，所以判据只写一份（本方法）。
// `IsLineBreakBoundary` 走的就是这里（它调本方法），所以两处口径一致。
if (Statement.IsVariableTypeAnnotationColon(units, index)) {
  return true;
}
const previousIsMember =
  beforePrevious instanceof SymbolToken && (beforePrevious.Is(".") || beforePrevious.Is("?."));
if (previousIsMember === false && Statement.ExpectsOperand(previous, beforePrevious)) {
  return true;
}
return false;
```

## static method IsUnfinishedQuestionColon:(units:Array<Token>, index:int)=>bool

`index` 处（将要）是一个软换行时，**左边那一行正停在一个「`? … :` 对」的假分支之前**吗。

这一问原来叫 `IsUnfinishedConditionalType`（第 581 轮），只认**条件类型**那一族
（`A extends B ? C : D`）。第 837 轮把它放开到**三元表达式**（`a ? b : c`）：
两者的形状判据**一模一样**，硬找出一个「这不是类型位」的判据只会是第二份会漂的答案 ——
而且放开是**安全**的：答案只在「这一行确实还差一个假分支」时才为真，而那种行尾
在 TS 里只有「还没写完」一种读法（`?` 与 `:` 之间不可能有平级 `,` / `;`，
见 `ternary-operator.xl.md` 的 `Previous` 那一段）。

判据两条（都只看**已经读到的单元**，所以换行那一刻问得出来）：

1. 这一段里有一个**顶层的 `?`** —— 三元与条件类型都靠它（见下面「为什么把 `extends` 那一问撤掉」）；
2. 那个 `?` 之后**顶层没有 `:`，或者那个 `:` 就是这一段的最后一格** ——
   有 `:` 且它后面还有实义单元才说明假分支已经写了。括号里的 `:`（`? { a: 1 }` / `? [1, 2]`）
   不算：它们是单元内部的内容，而这一问要的正是「**这个三元 / 条件类型自己那个 `:`** 到了没有」。

**为什么把原来那句 `extends` 那一问撤掉**：第 581 轮那一版先找 `extends`、再从它往后找 `?`，
为的是躲开 `type X<T extends U> = { … }` 换行（那个 `extends` 在泛型形参表里）。
可**只认 `?` 就够了**：上面那个例子里 `?` 一个都没有（`{ … }` 里那个 `a: string` 是
`Bracket` 单元内部的内容、不在这一层的 `units` 里）⇒ 判否。
反过来说，「顶层有 `?`、且它的 `:` 还没写」这句话对**声明头**永远不成立
（声明头里不可能出现一个裸 `?`）⇒ 撤掉那一问不会放开任何误判，
而**留着它会把三元整族挡在外面**（`const x = a ? b :` 换行 `c;` 里一个 `extends` 都没有）。

**为什么落在 `LineCannotEnd` 上而不是 `IsLineBreakIncompleteOnLeft`**：口径的松紧不同
（见那两个方法的说明）——`IsLineBreakBoundary` 问的是「ASI 该不该断句」，
那里一个判错就是两条语句合一；而这一问只在**一定没写完**时收手。
`IsLineBreakBoundary` 那一侧由 `ConditionalTypeCloseRule.Process` 自己那三条
「换行后面紧跟 `:`」的放行兜着（`conditional-type.xl.md` 第 100 轮），
两处合起来正好：**解析期不收壳** + **成形期跨过那个换行**。
三元那边由 `TernaryOperatorCloseRule.Process` 的 `endIndex` 扫描兜着 ——
它只看 `,` / `;` / `:` 这三格，**软换行与注释都不在它的终止符表里**
⇒ 假分支跨行时它照样一路收到 `;`（实测 `gap-sweep-newline-cond-03`）。

```ts
const frontIndex = SearchFrontIndexed(units, index, (itemIndex, item) => Statement.IsStatementBoundary(units, itemIndex));
let questionAt = -1;
for (let i = frontIndex + 1; i < index; i++) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && item.Is("?")) {
    questionAt = i;
  }
}
// **一个 `?` 都没有 ⇒ 这一行与三元 / 条件类型都无关**（`extends` 单独出现说明是声明头那一族）。
if (questionAt < 0) {
  return false;
}
let colonAt = -1;
for (let i = questionAt + 1; i < index; i++) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && item.Is(":")) {
    colonAt = i;
  }
}
// **`:` 收尾 ⇒ 假分支还在下一行**（第 589 轮）：`:` 后面还有实义单元才算写完。
if (colonAt >= 0 && SkipNextTrivia(units, colonAt) < index) {
  return false;
}
return true;
```

## static method LineCannotEnd:(units:Array<Token>, index:int)=>bool

`index` 处那个换行**不可能是这一行的终点**吗——**解析期那一问**（`StatementBranch` 用它）。

它与 `IsLineBreakIncompleteOnLeft` 差的不是判据，而是**口径的松紧**：解析期一旦判「不是终点」，
这一行就会与**下一行**并进同一个壳 —— 判错一次就是两条语句合一（而且很难看出是哪儿错的）。
所以这里只认「**左边一定没写完**」那一档，把两个**两可**的词形按**前一格**分辨
（`:` 一律排除；`void` 见下面 `IsVoidInTypePosition`）：

| 词形 | 为什么两可 | 少了这条排除会怎样（实测） |
| --- | --- | --- |
| `:` | `case 1:` / `default:` / `label:` 都以它**收尾**，而 `x:` 换行 `number` 是**续接** | `st-switch.ts` / `stmt-switch-empty-cases.ts` / `stmt-switch-fallthrough.ts` 三份把相邻两个 `case` 并进一个壳（各缺 5 / 多 3） |
| `void` | 它既是运算符（`void 0`）又是**预定义类型名**，而 `): void` 收尾的排版遍地都是 | 少了这条排除：`fn-overloads.ts` 缺 **13**、`ty-variance.ts` / `ty-function-ctor.ts` / `type-param-variance-in-out.ts` / `type-fn-declaration-boundary.ts` 各缺 8、`ns-declare-module.ts` 缺 5 —— 六份全是「上一行以 `=> void` / `): void` 收尾」 |

**`void` 这一格第 911 轮**从「一律排除」收窄成「**按它前面那一格**分」：类型位
（`:` / `=>` / `|` / `&` / 类型别名的 `=`）照旧答「可以收尾」，值位
（`const a = void`）答「一定没写完」⇒ 操作数跨行。判据只写一份，见 `IsVoidInTypePosition`；
上面那六份用例全部是类型位，一行都不用改。

**`:` 那一档只在这里排除**（不动 `IsLineBreakIncompleteOnLeft`）：`IsLineBreakBoundary` 问的是
「ASI 该不该断句」，那里 `x:` 换行 `number` **必须**算续接（`const x:` 换行 `number = 1` 的排版）；
而解析期这一问只敢在**一定没写完**时收手 —— 两个问题不同，所以两个方法。

```ts
// **三元 / 条件类型的假分支还没写**（第 581 轮，第 837 轮放开到三元那一族）：
// `a ? b :` 换行 `c` 与 `A extends B ? C` 换行 `: D` 都是同一档 ——
// 判据、为什么要有它、为什么落在这一问上，见 `IsUnfinishedQuestionColon`。
// 排在下面那三条之前：那三条判的是「上一格是不是期待操作数」（`ExpectsOperand`），
// 而 `TReturn` 这种名字**不期待操作数** ⇒ 它们在这一档上一次都不响。
if (Statement.IsUnfinishedQuestionColon(units, index)) {
  return true;
}
if (Statement.IsLineBreakIncompleteOnLeft(units, index) === false) {
  return false;
}
const previousRealIndex = SkipPreviousTrivia(units, index);
const previous = Get(units, previousRealIndex);
if (previous instanceof SymbolToken && previous.Is(":")) {
  // **函数声明头的返回类型**（第 825 轮）：`function f(x: T):` 换行 `T { … }` 里那个 `:` 后面
  // 那一格**一定**是返回类型，不可能是别的 —— 判据见 `IsFunctionHeadReturnColon`。
  // 少了它：换行处收壳 ⇒ 函数头与返回类型分家 ⇒ `FunctionDeclaration` 整条缺
  //（实测 `gap-sweep-newline-generic-06` 与 `gap-sweep-linecomment-generic-06` 两份）。
  // **变量声明的类型标注**（第 873 轮）：`const s:` 换行 `string = ""` 里那个 `:` 后面
  // **一定**是类型（名字前面是 `let` / `const` / `var`）——与上面那条同族，判据见
  // `IsVariableTypeAnnotationColon`。少了它：换行处收壳 ⇒ 类型标注落进下一条 `Statement`
  //（实测 `declare const s:` 换行 `unique symbol;` 那一份 `gap-r869-unique-symbol-newline-3`）。
  if (Statement.IsVariableTypeAnnotationColon(units, units.length)) {
    return true;
  }
  if (Statement.IsFunctionHeadReturnColon(units)) {
    return true;
  }
  // **标签头那一档**（第 835 轮）：`lbl:` 换行 `for (;;) { … }` 是**一条** `LabeledStatement`。
  // 判据在 `LabelCloseRule.IsPendingLabelHead`（`label.xl.md`）——它自己会把
  // 「`let a:` 换行 `B`」那种类型标注与 `case 1:` 那种段头排掉，这里只转问一次。
  // 少了它：换行处收壳 ⇒ `lbl` 与 `:` 关进一个壳、`for` 另起一条 ⇒ `Label`（**收尾期**才跑）
  // 再也看不到那一对 ⇒ `LabeledStatement` 整条缺、循环体一起降级
  //（实测 `gap-sweep-{newline,linecomment}-label-0{1,2}` 四条）。
  if (LabelCloseRule.IsPendingLabelHead(units)) {
    return true;
  }
  return false;
}
if (Statement.WordOf(previous) === "void") {
  // **`void` 是两可词形**（第 911 轮）：类型位（`): void` / `=> void`）可以收尾，
  // 值位（`void 0`）**一定要操作数** —— 判据落在**它前面那一格**上，
  // 见 `IsVoidInTypePosition`（含「为什么只问前一格」与两处刻意不收）。
  return Statement.IsVoidInTypePosition(units, index) === false;
}
return true;
```

## static method IsVoidInTypePosition:(units:Array<Token>, index:int)=>bool

`index` 之前最后那一格是 `void` 时，这个 `void` 在**类型位**（`): void` / `=> void` / `A | void`）吗。

**为什么需要它**（第 911 轮片段普查量出的 `gap-r907-void-operand-newline`）：`void` 既是**运算符**
（`void 0`，一定要操作数）又是**预定义类型名**（`): void` 收尾的排版遍地都是）。上面那张表原来
把它当「两可」**一律**排除（`LineCannotEnd` 在它那里一律答「可以收尾」），可它是运算符时
**一定没写完** ⇒ `const a = void` 换行 `0;` 在换行处收壳 ⇒ 操作数落进另一条语句
（实测：缺 `VoidExpression`、多 `VoidKeyword` + `ExpressionStatement`）。

判据只看**它前面那一格**：

| `void` 前面那一格 | 答 | 为什么 |
| --- | --- | --- |
| `:` / `=>` | 类型位 | 这两格后面接的就是类型（`function f(): void` / `type F = () => void`） |
| `|` / `&` | 类型位 | 联合 / 交叉类型里那一格（`type X = A \| void`） |
| `=` 且 `IsTypeAliasAssignment` | 类型位 | `type X = void`——右边是类型 |
| 其余一切（`=` 而左边是 `const` / `let`、`(` / `,` / `[` / `return` / 运算符 …） | 值位 | 这些格的右边是**值**，`void` 在那里只可能是运算符 |

**为什么只问前一格、不问整段**：`LineCannotEnd` 是**解析期**那一问，判错的代价是两条语句合一
（它自己的说明里写着这条口径）——所以只在**一定**是运算符时才收手，而「前一格是值位连接符」
正是一个**局部**、可判的判据。语料实测：`node_modules/@types` + `typescript/lib` 里
行尾 `void` 共 44 处，**全部**落在 `:` / `=>` 上（第 911 轮量的），没有一处落在「值位连接符」上。

**两处刻意不收**（保持原来的「可以收尾」，因为那时 `void` 确实可能已经是类型）：

- **三元 / `case` 标签的 `:`**：`c ? a : void` 换行 `0` 里那个 `:` 也是「前一格」，本方法答
  「类型位」⇒ 换行处收壳 —— 与**今天**的行为一致（今天一律收壳，没更坏）；
  真要把这一格分开，得问「这个 `:` 是不是三元那一格」，那是另一条线；
- **`= void` 而 `=` 左边不是 `type`**：答「值位」⇒ 不收壳，`const a = void` 换行 `0;`
  正是要的这一档。

```ts
const voidIndex = SkipPreviousTrivia(units, index);
const beforeIndex = SkipPreviousTrivia(units, voidIndex);
const before = Get(units, beforeIndex);
if (before instanceof SymbolToken === false) {
  return false;
}
if (before.Is(":") || before.Is("=>") || before.Is("|") || before.Is("&")) {
  return true;
}
if (before.Is("=")) {
  // **类型别名的 `=` 右边是类型、变量声明的 `=` 右边是值**：判据是既有的一格
  // （`IsTypeAliasAssignment` 从 `=` 左边往回找 `type` / `const`），不在这里另写一份。
  return IsTypeAliasAssignment(units, SkipPreviousTrivia(units, beforeIndex));
}
return false;
```

## static method IsLineBreakBoundary:(units:Array<Token>, index:int)=>bool

`index` 处那个**软换行**是不是一个语句边界。这就是本工程的 ASI 判据，只判这一件事：

> **前一行的最后一个单元不再要操作数，且下一行的第一个单元也不能续接这个表达式 ⇒ 断句。**

四种更早的结论优先：

1. 换行前没有实义单元（文件开头）→ 不是边界；
2. 换行前是 `return` / `throw` / `break` / `continue` / `yield` → **是**边界（受限产生式）；
3. 换行前是**后缀**的 `++` / `--`（它前面已经是一个操作数末尾）→ **是**边界
   （`x++` 换行 `continue` 是两条语句；`++` 能不能算后缀要看它前面的单元，所以要用 `EndsOperand`）；
4. 换行后没有实义单元（列表末尾）→ **是**边界（这一行已经写完了）。

```ts
// **两个「上一个」各司其职**（第 126 轮）：
// `previousIndex`（只跳软换行）用来判「是不是文件开头」——这正是原文的口径；
// `previous`（连注释一起跳）用来做**语义判断**：注释是 trivia，一行末尾的 `// …`
// 在语法上与不存在等价。
const previousIndex = SkipPreviousWrapSymbol(units, index);
if (previousIndex < 0) {
  return false;
}
const previousRealIndex = SkipPreviousTrivia(units, index);
const previous = Get(units, previousRealIndex);
// **前面只有 trivia ⇒ 这一行是新语句的开头**（第 159 轮）：续接判定问的是「上一行有没有
// 没写完的表达式」，而上一行**什么都没有**——`// 注释` 换行 `!x;` 里那个 `!` 是逻辑非、
// 起一条新语句。原来这里 `previous` 是 `null`，落到下面 `ContinuesExpression("!")`
// 判成续行，注释与 `!x;` 被并成一条语句
// （实测 `expr-unary-prefix.ts`：缺整条 `ExpressionStatement`）。
if (previous === null) {
  return true;
}
if (Statement.IsRestrictedKeyword(previous)) {
  return true;
}
if (previous instanceof SymbolToken && (previous.Is("++") || previous.Is("--"))) {
  const before = Get(units, SkipPreviousTrivia(units, previousRealIndex));
  if (Statement.EndsOperand(before)) {
    return true;
  }
}
// **下一个实义单元也要跳过注释**（第 142 轮）：`x === 1` 换行 `// 注释` 换行 `|| y` 里，
// 那个 `||` 才是上一行的后续；只跳软换行时会把注释当成「下一行的第一个单元」，
// 于是判成断句、整条 `||` 链被切成两段（实测 `statement.ts` 的一长串 `||`）。
const nextIndex = SkipNextTrivia(units, index);
if (nextIndex >= units.length) {
  return true;
}
const next = Get(units, nextIndex);
// **下一行以 `[` 开头**（第 158 轮）：ASI 不在 `[` 前面断句——**前提是上一行不是类型标注**
// （见 `HasTypeColonBefore`）。`interface I { ['a']: T` 换行 `['b']: U }` 是两条成员
// （实测 `undici-types/webidl.d.ts` 一族），而 `x => x` 换行 `[1, 2, 3]` 是 `x[1, 2, 3]`
// 一条表达式（实测 `am-block-lambda-array-compound.ts`）。
if (
  next !== null &&
  ((next instanceof Bracket && (next.startBracket === "[" || next.startBracket === "(")) ||
    next.constructor.name === "ArrayLiteral") &&
  HasTypeColonBefore(units, index) === false
) {
  return false;
}
// **成员名不「期待操作数」**（第 124 轮）：`ExpectsOperand` 只看**词形**，
// 而 `default` / `new` / `in` / `is` / `readonly` 这些词出现在点号后面时是**属性名**
// （`import("./m").default`、`x.new`、`o.in`）。把它们当成关键字，就会把
// 「`…​.default` 换行 `const y = …`」判成续行——
// 实测 `undici-types/index.d.ts` 的 `declare module "undici" { const Dispatcher:
// typeof import('./dispatcher').default ; 换行 const Pool: … }`：整段（140 处缺口）
// 因此被收进**一条类型标注**。
//
// 判据落在左边那一格上：点号（或可选链的点号）之后的名字永远是成员名。
// 这一条只挡「期待操作数」那一支，**不挡**下面 `ContinuesExpression` 那一支——
// `a.export` 换行 `= 1` 仍然续行（`=` 是运算符）。
// **左半截只留一份实现**（第 558 轮）：这里那一支（「`ExpectsOperand` 且不是成员名」）
// 与解析期在换行那一刻问的是**同一个问题** ⇒ 抽成 `IsLineBreakIncompleteOnLeft`，
// 两处都问它（各写一份必然会漂 —— 第 556 / 555 轮各踩过一次）。
if (Statement.IsLineBreakIncompleteOnLeft(units, index)) {
  return false;
}
if (Statement.ContinuesExpression(next)) {
  return false;
}
return true;
```

## static method IsInStatementSymbol:(symbol:SymbolToken)=>bool

这个符号是不是「非语句符号」——也就是**不会**终止语句的那种。

直接对 `IsStatementSymbol` 取反。

```ts
return symbol.Template.SymbolTemplate.IsStatementSymbol(symbol.TempToString()) === false;
```

## static method LastMeaningfulIndex:(units:Array<Token>, from:int)=>int

从 `units.length - 1` 往前找**最后一个不是软换行的单元**，返回它的下标；`from` 之后没有实义单元时返回 `-1`。

`if` / `while` / `for` / `foreach` 那几条规则用它给「一直写到输入末尾」的语句体收尾
（第 63 轮补，见 `if/if-set.xl.md` 的说明）：没有 `;`、文件又正好在这里结束时，
`SearchStatementEnd` 给 `-1`——那不是语法错误，是**语句到输入末尾就结束了**。

尾随软换行刻意**不算**体的一部分（留在外面当语句边界），所以这里要跳过它们。

```ts
let last = units.length - 1;
while (last >= from) {
  const item = Get(units, last);
  if (item !== null && !(item instanceof LineWrap)) {
    return last;
  }
  last = last - 1;
}
return -1;
```

## static method IsInStatement:(units:Array<Token>, index:int)=>bool

`index` 是否落在一条语句**内部**。

**`index` 处是软换行时，直接取 `IsLineBreakBoundary` 的反**——那一条就是 ASI 判据。
这是 `StatementCloseRule2` 唯一的传法（它只在 `Previous` 命中 `LineWrap` 时问这一句，
命中 `;` 时走的是 `currentIsStatementSymbol` 那条短路）。

**`index` 处本身就是一条新语句的开头时，答案是「不在语句内」**（第二条早退）。
这是给 `IsStatementEnd` 用的传法：它传的是**换行后面第一个实义单元的下标**。

其余情形（传一个夹在中间的实义单元）保留原来的近似判据：跨过软换行看左右两侧，
任一侧是非语句符号就算在语句内。

```ts
const current = Get(units, index);
if (current instanceof LineWrap) {
  return Statement.IsLineBreakBoundary(units, index) === false;
}
if (Statement.IsStatementHead(current)) {
  return false;
}
const lastUnitIndex = SkipPreviousWrapSymbol(units, index);
const nextUnitIndex = SkipNextWrapSymbol(units, index);
if (lastUnitIndex === -1) {
  return false;
}
const lastUnit = Get(units, lastUnitIndex);
if (lastUnit instanceof SymbolToken && Statement.IsInStatementSymbol(lastUnit)) {
  return true;
}
if (nextUnitIndex >= units.length) {
  return false;
}
const nextUnit = Get(units, nextUnitIndex);
if (nextUnit instanceof SymbolToken && Statement.IsInStatementSymbol(nextUnit)) {
  return true;
}
return false;
```

## static method SearchStatementEnd:(units:Array<Token>, index:int, statementEndSymbols?:Array<string>)=>int

从 `index` 向后找这条语句的结束符号，返回下标；找不到返回 `-1`。

结束符号允许一个都不传，所以落成**可选**数组参数。

```ts
return SearchBackIndexed(units, index, (itemIndex, item) => Statement.IsStatementEnd(units, itemIndex, statementEndSymbols));
```

## static method IsStatementEnd:(units:Array<Token>, itemIndex:int, statementEndSymbols?:Array<string>)=>bool

`itemIndex` 处是不是语句结束位置。

三条分支：

- 是 `SymbolToken` 且 `Is(";", [",", .. statementEndSymbols])` → 是。
- 是 `LineWrap` → 往后跨过软换行看下一个单元：是 `;`（或 `statementEndSymbols` 里的）就**不是**；
  否则交给 `IsLineBreakBoundary` —— 也就是同一套 ASI 判据，不另写一份近似。
- 其余 → 不是。

合并符号表写成 `[",", ...(statementEndSymbols ?? [])]`；
带候选项的那个 `Is` 重载叫 `IsValueOrAny`。

```ts
const symbols = statementEndSymbols ?? [];
const item = Get(units, itemIndex);
// **一条已经成形的语句级单元，本身就是「语句到此结束」**（第 373 轮）。
//
// 它是**一整条语句**——所以「从这里往后找 `;`」的调用方应当**停在它身上**，
// 而不是扫过去、停到**下一条**语句的分号上。
//
// **少了这一条会漏掉一整族**（实测收敛到两行）：
//
//     for (k = 0; k < 2; k++) if (k > 5) log.push("never");
//     log.push("after");
//
// `if` 那一条**先**被收成 `IfSet`（规则是轮询的，三元 / 复合赋值那些都是这个次序），
// 于是 `for` 来找体尾时（`for.xl.md` 的 `SearchStatementEnd`）一路**扫过** `IfSet`、
// 停在**下一条语句**的 `;` 上 ⇒ 体的范围成了「`if` + 后面那条语句」——
// **静默错值**：实测 `after` 被印了**两遍**（每轮一遍），
// 而 Node 只印一遍。同一个形状在真语料里的后果更大：
// `for (...) if (cond) xs.push(a[i][j]);` 后面再跟一句，那一句每轮都跑。
//
// **为什么用 `IsStatementBoundary` 而不是 `IsStatementUnit`**：后者把
// `Function` / `Class` **无条件**当边界，而 `for (...) function () {} && y;` 那种
// 位置上的函数是**表达式**——`IsStatementBoundary` 多问一句「是不是声明位置」
//（那一处自己写着这段实测）。两处用同一把尺子，不另写一份近似。
if (Statement.IsStatementBoundary(units, itemIndex)) {
  return true;
}
if (item instanceof SymbolToken && item.IsValueOrAny(";", [",", ...symbols])) {
  return true;
}
if (item instanceof LineWrap) {
  const nextIndex = SkipNext(units, itemIndex, (candidate) => candidate instanceof LineWrap);
  if (nextIndex < units.length) {
    const next = Get(units, nextIndex);
    if (next instanceof SymbolToken && next.IsValueOrAny(";", symbols)) {
      return false;
    }
    return Statement.IsLineBreakBoundary(units, itemIndex);
  }
  return true;
}
return false;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；
批量加入用 `AddRange`。

```ts
const result = new Statement(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# class StatementBranch extends Branch

**解析期造语句壳——只剩软换行那一档**（第 477 轮建、第 486 轮收窄）。

**`;` 那一档已经交给 `FormFrom`**（第 486 轮）：它必须在终结符**进 `Data` 之后**才收，
而这一支排在 appender **之前** ⇒ 它收出来的壳**不含分号**（实测 `let a = 1;` 的
`VariableStatement` 是 `[0,9)`，TS 要 `[0,10)`，全语料 1032 处漂移里它占 493）。
两支都留着会**两次成形**，所以这里只认 `\n`。

**软换行为什么仍留在这里**：换行**不进语句的区间**（TS 的 `a = 1\n` 到 `1` 为止），
所以在 append 之前收反而正好；而这个 `LineWrap` 单元随后照旧留在 `Data` 里
（它不参与签入签出、投影当 trivia），别的解析期分支要拿它当分隔符的照旧拿得到。

判据与收束全部复用那份现成的静态方法（`Statement.IsStatementBoundary` /
`Statement.FirstMeaningful` / `ReplaceCountAt`）。

## static readonly field JumpIn:StatementBranch = new StatementBranch()

本类的分支实例：`TextContext` 构造时按 `ParsePipeline` 的队列顺序把它装进通用队列。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

条件：当前字符是一个语句边界（`;` / 软换行 / 块或声明头…），而且 `Data` 到了该收尾的形状
——判据全部复用 `Statement.IsStatementBoundary` 那一族静态方法。

```ts
const result = new BranchConditionResult();
result.Success = false;
if (unit === null || unit === undefined) {
  return result;
}
if (Array.isArray(unit.Data) === false) {
  return result;
}
const value = source.Value;
// **只认软换行**：`;` 那一档已经交给钩子（`Token.FormStatement` → `Statement.FormFrom`）——
// 两支都留着会**两次成形**（一处实现、一个路径，没有开关）。
if (value !== "\n") {
  return result;
}
// **成员列表里不收语句壳**（第 503 轮，与 `FormFrom` 那一处同一口径）：
// `ClassBody` / `InterfaceBody` / `TypeLiteralBody` / `EnumBody` 的子单元是**成员**。
// **`EnumMember` 也是成员住的地方**（第 586 轮）：枚举**最后一名**成员后面**没有逗号**，
// 紧跟的就是那个换行 ⇒ 那一刻的当前单元是 `EnumMember`、不是 `EnumBody`
// ⇒ 成员名被包成一个 `Statement`（XML 实测 `<EnumMember><Statement><Identifier>B</Identifier>…`）
// ⇒ 投影多一个 `ExpressionStatement`（`dist/ts/runtime/heap.ts` 一份里就有 3 处）。
const owner = unit.constructor.name;
if (
  owner === "ClassBody" ||
  owner === "InterfaceBody" ||
  owner === "TypeLiteralBody" ||
  owner === "EnumBody" ||
  owner === "EnumMember"
) {
  return result;
}
// **`[` / `(` 括号里也不收语句壳**（第 515 轮，与 `FormFrom` 那一处同一口径）。
if ((owner === "Bracket") && ((unit as Bracket).startBracket === "[" || (unit as Bracket).startBracket === "(")) {
  return result;
}
// **泛型实参段里也不收语句壳**（第 583 轮，与 `FormFrom` 那一处同一口径）：
// `<` 与 `>` 之间装的是**类型**，软换行在那里只是排版 —— 见那一处的说明。
if (owner === "GenericType") {
  return result;
}
// **`${ … }` 里也不收语句壳**（第 836 轮，与 `FormFrom` 那一处同一口径）：
// 内插段装的是**表达式**，软换行在那里同样只是排版 —— 见那一处的说明与实测账。
if (owner === "InterpolationString") {
  return result;
}
// **`IfCondition` 里也不收**（第 572 轮）：它就是**条件那一对括号** ——
// `while` / `for` / `switch` / `do-while` 四处的条件**先造一个 `Bracket`**，再由各自的规则
// 把内容搬进 `WhileCompare` / `ForCompare` / … ⇒ 上面那一条「`(` 括号」早退替它们挡住了；
// 只有 `if` 这一处是 `IfCondition` **自己吃 `(` `)`**（见 `if-condition.xl.md`）。
//
// **少了它会怎样**（实测）：跨行写的条件被收成一个 `Statement`
// ⇒ 投影多一个 `ExpressionStatement`（`stmt-if-multiline-condition.ts`：
// `a &&` 换行 `b` 被包进壳里，四栏 `0 0 1 0`）；而条件里装的是**表达式**，不是语句。
if (owner === "IfCondition") {
  return result;
}
// **`{` 括号：值位的花括号里也不收语句壳**（第 556 轮）：对象字面量 / 类型字面量里装的是
// **成员**，不是语句 —— 判据与 `JsonObjectCloseRule` 问的是**同一句**
//（`IsObjectLiteralBrace`，见 `../text-common-util.xl.md`）。
// 少了它会怎样：多行对象字面量里每个成员被包成一个 `Statement` ⇒
// `ObjectLiteral.PrintAst` 按顶层逗号切出来的每一组都是**一格 `Statement`**
// ⇒ 整片投成 `ExpressionStatement`（实测 `ex-object-literal.ts` 缺 37）；
// 而且壳里那个 `b:` 还会被 `Label` 收走（壳的父亲是 `Statement` ⇒ `IsStatementStart` 答「是」）。
// **绑定模式的花括号同一条口径**（第 825 轮，`IsBindingPatternBrace`）：`const { a` 换行
// `, b: [c] } = o;` 里壳会把顶层逗号折进 `BinaryOperator` ⇒ 整张模式收成一个元素。
if (owner === "Bracket" && (unit as Bracket).startBracket === "{") {
  const holder = unit.Parent;
  if (
    holder !== null &&
    (IsObjectLiteralBrace(holder.Data, holder.Data.indexOf(unit)) ||
      IsBindingPatternBrace(holder.Data, holder.Data.indexOf(unit)))
  ) {
    return result;
  }
}
const data = unit.Data;
if (data.length === 0) {
  return result;
}
// 不在这里做「已包过」的全容器扫描：一个容器里可以有好几条语句，
// 全容器扫一遍会把第二条之后全挡掉（实测第一条没包上、第二条才包上）。
// 只在语句内部收（与重组那条同一份判据）。
// **终结符此刻还没进 `Data`**（这一支排在 `SymbolToken.AppendIn` / `LineWrap.AppendIn`
// 之前，见 `parse-pipeline.xl.md` 那张表的位置说明）⇒ 要收的就是**已经在列表里**
// 的那一段，而它的**最后一个单元**就是这条语句的最后内容。
//
// 判据的实测账（前两版都不成立）：
// ① `IsInStatement(data, data.length)`——越界那一格 `Get` 给 `null`，
//    `IsInStatement` 的第一条早退直接给 `false`；
// ② `IsInStatement(data, data.length - 1)`——`Data` 里**根本不含软换行**
//    （`LineWrap` 是透明单元、不进列表），所以最后一个单元**永远**是内容单元，
//    而那一支问的是「左右邻居是不是非语句符号」 ⇒ 对 `const b = f(2)` 的 `)` 给 `false`
//    （它右边已经没有东西了，可语句明明开着）；
// ③ 正面判据：**最后一个单元本身就是语句边界** ⇒ 上一条已经收完 ⇒ 这个换行是
//    上一条的尾巴（`let a = 1;` 换行），不收；否则库里正开着一条语句，收。
if (Statement.IsStatementBoundary(data, data.length - 1)) {
  return result;
}
// **`do … while` 不许被行尾的软换行切断**（第 501 轮）：
// `do x++` 换行 `while (x < 10)` 是**一条**语句（TypeScript 的 ASI 在这里不插分号），
// 可壳一收就把 `do` 关进壳里 ⇒ `DoWhileCloseRule.Previous` 再也认不出它
// ⇒ 落到 `WhileCloseRule` 手里、再因为「`while` 后面没有语句」抛错
//（`tests/cases/token/statements/stmt-do-while-no-block.ts`；对照态同样炸 —— 这是重组层的老缺口）。
// 判据只看**这一段**的第一个实义单元是不是 `do` 这个词（`Statement.WordOf` 两种形态都认）。
const frontIndex = SearchFrontIndexed(data, data.length - 1, (itemIndex, item) => Statement.IsStatementBoundary(data, itemIndex));
const head = Statement.WordOf(Statement.FirstMeaningful(data.slice(frontIndex + 1)));
if (head === "do") {
  return result;
}
// **声明头里的换行不是语句边界**（第 557 轮）：
// `class A` 换行 `{` / `interface I<T>` 换行 `{` / `enum E` 换行 `{` 都是合法排法，
// 而这一支会在换行处把**整个头**收成一个 `Statement` ⇒ 那几个词从此**不住在宿主自己的平列表里**
// ⇒ `{` 到达时 `ClassBranch` / `InterfaceBranch` / `EnumBranch` 往回扫**找不到自己的词**
// ⇒ 整条声明连成员一起消失（实测 `lex-generic-union-constraint.ts`：接口头换行之后
// 缺 23 / 多 7；`lex-generic-multiline-constraints.ts` 是同一形状 ——
// 两份用例的注释里都写着「真实声明里几乎总是这么排」）。
//
// **判据只看这一段自己**（`i` 与已经读到的那些）：跳过前导修饰词之后，段首是**声明词**
// 就说明这不是一条语句的开头 —— `class` / `enum` 是保留字（值位语句不可能以它们开头）；
// `interface` / `namespace` / `module` 在**语句开头**也只有声明这一种读法。
// `const enum` 那种前缀由修饰词表吃掉（`const x = 1` 会走到 `x`，不在表里 ⇒ 照旧收壳）。
//
// **`function` 故意不在表里**（实测退回来的）：重载签名（`function f(a: number): void;`）
// 是「有头、没有体」的形状，与 `function f()` 换行 `{` 长得一样 ——
// 加进去会让 `decl-func-overloads.ts` / `fn-overloads.ts` / `type-generic-call-args.ts` 三份变红
//（分别缺 15 / 13 / 8）。**「函数头换行 `{`」那一档第 668 轮由另一条路收掉了**
//（`NextLineContinuesExpression` 的 `IsHeaderBodyBrace`：末尾是一个等着体的头就算续接）——
// 所以这里**照旧不加**：这一处的判据问的是「这算不算一条新语句的开头」，
// 与那一档是两件事，动它只会把上面三份用例再打红一次。
//
// **收完的那一档够不到这里**：体已经收完时最后那一格是**语句级单元**
// ⇒ 上面 `IsStatementBoundary` 那一句早就早退了。
//
// **段里已经有「体」时也不收**（两条判据各挡一档）：
// · 段内出现**花括号** ⇒ 头已经带体了（`function pick(…): number { … }` 的 `Function`
//   单元**还没成形** —— 它要等到外层那一趟 —— 少了这一条会把这个头也压住，
//   实测 `if-else-with-comment.ts` 整条函数丢 29 个节点）；
// · 段内已经有一个**语句级单元** ⇒ 那是上一条语句（`declare namespace B { … }` 后面的换行
//   —— 少了这一条会把它与下一条 `import` 吞进**同一个** `Statement`，
//   实测 `mod-import-equals-deep.ts` 等四份从绿变红）。
const modifiers = ["export", "declare", "abstract", "default", "async", "const"];
const declarationWords = ["class", "interface", "enum", "namespace", "module"];
// **段首的 trivia 要跳过**（第 589 轮）：`frontIndex + 1` 那一格常常是**上一条语句留下的软换行**——
// `interface A { … }` 换行 `interface B` 换行 `extends …` 的排版里，段是
// `[Interface(A), LineWrap, interface, B]`，而 `WordOf(LineWrap)` 给空串 ⇒ 两张词表都问不到
// ⇒ 照常收壳 ⇒ 整条声明被关进 `Statement`（实测 `@types/node/vm.d.ts` / `fs.d.ts` /
// `querystring.d.ts` 三份，都是「上一条声明之后紧跟一条头跨行的声明」）。
// **不跳过那一格就等于「只有文件第一条声明认得出来」**：`interface B2` 换行 `extends …`
// 单独写在文件开头时是对的，跟在任何一条语句后面就错。
let wordIndex = SkipNextTrivia(data, frontIndex);
// **先跳过标签头**（第 930 轮）：`iface: interface I` 换行 `{ … }` 是**一条** `LabeledStatement`
//（被标的是那条接口声明），而这一段的内容从 `iface` 后面才开始 —— 不跳过的话词表问到的
// 是那个标签名 ⇒ 认不出声明头 ⇒ 换行处收壳 ⇒ 声明头与它的体分家
//（实测 `gap-r929-label-body-brace-newline`：`interface` / `enum` 那两格各缺声明本身 + 名字 +
// 成员，多一个裸 `Block`）。判据在 `LabelCloseRule.SkipLabelHeads`（与 `Previous` 同源）。
wordIndex = LabelCloseRule.SkipLabelHeads(data, wordIndex);
let word = Statement.WordOf(Get(data, wordIndex));
while (word !== "" && modifiers.indexOf(word) >= 0) {
  wordIndex = wordIndex + 1;
  word = Statement.WordOf(Get(data, wordIndex));
}
if (declarationWords.indexOf(word) >= 0) {
  let hasBody = false;
  for (let i = frontIndex + 1; i < data.length; i++) {
    const item = Get(data, i);
    if (item === null) {
      continue;
    }
    if (item instanceof Bracket && item.startBracket === "{") {
      hasBody = true;
      break;
    }
    if (Statement.IsStatementUnit(item)) {
      hasBody = true;
      break;
    }
  }
  if (hasBody === false) {
    return result;
  }
}
// **装饰器单独占一行时，换行也不是语句边界**（第 570 轮）：
// `@sealed` 换行 `class C {}` / `@dec()` 换行 `@dec2` 换行 `class B {}` /
// `@Input()` 换行 `export class Widget {` 都是合法排法，
// 而这一段此刻**只装着装饰器** —— 装饰器是**声明头的一部分**
//（与上面那条「声明头里的换行」同一个道理），它要等到 `{` 那一刻由
// `ClassBranch` / `EnumBranch` 的 `ReorganizeDeclarationDecorators` 才收成单元。
//
// **少了它会怎样**（实测四份）：换行处收壳 ⇒ `<Decorator>` 关进 `<Statement>`
// ⇒ `class` 那一刻往回扫**看不到装饰器**（只看到壳）⇒ 装饰器掉到 `Class` 的**兄弟位**、
// `Class` 的区间也从 `class` 那个词起 —— 四份用例各记「缺一个 `ClassDeclaration`
// + 多两个起点更早的节点」（`decl-class-decorator-class.ts`、`cls-decorators.ts`、
// `cls-decorator-calls.ts`、`ex-decorator-expression.ts`）；
// 判据本体见 `Statement.IsPendingDecoratorHead`（段首是 `@` 且段内只有装饰器那几类单元）。
if (Statement.IsPendingDecoratorHead(data, frontIndex + 1)) {
  return result;
}
// **导入声明的头还没写完时，换行也不是语句边界**（第 829 轮）：`import` 声明没有 ASI，
// `;` 之前的一切都归同一条声明（判据、实测账见 `Statement.IsPendingImportHead`）。
if (Statement.IsPendingImportHead(data, frontIndex + 1)) {
  return result;
}
// **导出声明也一样**（第 869 轮）：`export` 声明没有 ASI，`;` 之前的一切都归同一条声明
//（判据、实测账见 `Statement.IsPendingExportHead`）。少这一句时 `export * as ns` 换行 `from "m"`
// 会断成两截：前截是一个只有星号段的 `Export`，`from "m";` 另起一条。
if (Statement.IsPendingExportHead(data, frontIndex + 1, source)) {
  return result;
}
// **上一行还没写完时，换行不收壳**（第 558 轮）：把 ASI 判据的**左半截**搬进解析期
// （`IsLineBreakIncompleteOnLeft`，与 `IsLineBreakBoundary` 共用那一份）——
// 它只用**已经读到的单元**，所以在这一刻问得出来。
//
// **少了它会怎样**（实测）：这一支原来的判据只有「最后一个单元是不是语句边界」——
// 而「一条语句才写了半截」当然不是边界 ⇒ **半截语句被收进壳里** ⇒
// 下一行那几个单元落在**另一个** `Statement` 里 ⇒ 同一条表达式被换行劈成两半。
// 实测三份用例都是这个形状：
// `const a =` 换行 `1 + 2`（`stmt-continuation-after-equals.ts`）、
// `const v = x as` 换行 `A;`（`expr-as-newline.ts`）、
// `const v = x as A |` 换行 `B;`（`expr-as-union-multiline.ts` —— `As` 收不到那个 `B`）。
//
// **它管不到的那一半写在明处**：**右半截**（「下一行以 `|` / `&` / `.` / 运算符开头」）
// 要**下一个单元**才问得出来 ⇒ `x as` 换行 `| A` 换行 `| B` 那一族
//（`expr-as-leading-pipe-union.ts` / `type-union-in-as-expression.ts` / `type-union-leading-bar.ts`）
// 仍然在第二行那个换行上收壳 —— 那是**另一个入口**（见台账），不在这一条里。
//
// **`index` 传 `data.length`**：那个软换行**此刻还没进 `Data`**（这一支排在
// `LineWrap.AppendIn` 之前）——判据只往前看，虚拟下标正好。
if (Statement.LineCannotEnd(data, data.length)) {
  return result;
}
// **右半截**（第 568 轮）：左边写完了不等于这一行就结束了 ——
// 下一行以 `|` / `&` / `.` 开头时它是在**接着写**（`x as` 换行 `| A` 换行 `| B`、
// `[1, 2]` 换行 `.forEach(f)`）。那一刻下一个单元还没读进来 ⇒ 判据落在**原始字符**上
//（`Statement.NextLineContinuesExpression`）。少了这一句：第二个换行处收壳
// ⇒ 联合类型的后半截落进另一个 `Statement`（实测四份用例，见那个方法的注释）。
if (Statement.NextLineContinuesExpression(data, source)) {
  return result;
}
result.Success = true;
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

成功：把 `Data` 到「最后内容单元」为止的那一段收成一个 `Statement`——
右端与重组那一条**取同一格**（当前那个 `;` / 软换行还没进 `Data`）。

```ts
// **当前这个 `;` / 软换行还没进 `Data`**（见 `Condition` 那一处说明）⇒
// `index` 取到的是分号**左边**那一格，而「语句的最后内容单元」就是它。
// 形状于是与重组那条**一字不差**：重组跑在 append 之后，`children` 除最后一个
// （也就是 `;` 自己）全部装进语句；这里 `;` 本就不在 `data` 里 ⇒ 同一个切片。
const data = unit.Data;
const index = data.length - 1;
const frontIndex = SearchFrontIndexed(data, index, (itemIndex, item) => Statement.IsStatementBoundary(data, itemIndex));
// **`switch` 体里，第二个及以后的段头要自己起一条壳**（第 934 轮）：`case 1: case 2:` 换行
// `break;` 里那个换行是**这条壳的终结符**，而两个段头都在壳的范围内 —— 切点取
// 「最后一个前面紧挨着 `:` 的 `case` / `default` 词」（`LastClauseHeadIndex`，与
// `FormFrom` 的 `;` 那一档**同一份判据**）。
//
// **少了它会怎样**：壳从 `case 1:` 一路收到 `case 2:`（实测 `Statement` 的 `Data` 是
// `[case, 1, :, case, 2, :]`）⇒ `SwitchCloseRule` 的分段只看**顶层单元**（`SegmentWordOf`）
// ⇒ 第二个 `case` 住在壳里、它根本看不见 ⇒ 两个 `case` 并进**同一个** `CaseClause`，
// 第二条又另落成一条 `ExpressionStatement`（实测 `gap-r933-switch-case-newline`：
// 缺 `CaseClause` + `NumericLiteral`、漂 1 多 3）。
//
// **为什么这一格原来只有 `;` 那一支有**：`FormFrom` 是「终结符已经进 `Data` 之后」那条路
// （`;`），而这一支是换行那一档（终结符**还没进** `Data`）—— 同一个问题的两份成形器，
// 第 836 / 928 轮那条规矩：「每加一处都要两处成形器一起改」。
// 下标口径跟着那一支走：这里 `index` 是**最后一个内容单元**（换行不在表里），
// 所以 `LastClauseHeadIndex` 的上界递 `index + 1`。
let startIndex = frontIndex;
if (Statement.IsSwitchBodyBracket(unit)) {
  const clauseIndex = Statement.LastClauseHeadIndex(data, frontIndex, index + 1);
  if (clauseIndex > 0) {
    startIndex = clauseIndex - 1;
  }
}
let children = data.slice(startIndex + 1, index + 1);
// 去掉前导 trivia（前一条语句留下的软换行）—— 否则语句起点差一位
//（实测 let a = 1; 后面那条：产物 [10,30) vs 期望 [11,31)）。
let head = 0;
while (head < children.length && (children[head] instanceof LineWrap)) {
  head = head + 1;
}
children = children.slice(head);
if (children.length === 0) {
  return;
}
const statement = new Statement(unit.Template);
statement.Parent = unit;
// **当前这个软换行还没进 `Data`**（见 `Condition` 那一处说明）⇒
// `children` 里**每一格都是语句的内容**，没有终结符要排除
//（重组那条跑在 append 之后，所以它要「除最后一个」——这一支不要，
//  实测照抄重组那一句会把最后的内容单元丢掉：`let a = 1;` 于是只剩 `Let, =`）。
statement.AddRange(children);
const first = Statement.FirstMeaningful(children);
const lastUnit = children[children.length - 1];
if (first.SourceRange.Start !== null && lastUnit.SourceRange.End !== null) {
  statement.SourceRange.Start = first.SourceRange.Start;
  // 右边界取**最后一个内容单元的末尾**：软换行不进语句的区间，所以这里就是 TS 的右边界
  //（`;` 那一档已经搬到 `FormFrom`：那时终结符在 `Data` 里，右边界由它给，见那一处）。
  statement.SourceRange.End = lastUnit.SourceRange.End;
} else {
  throw new Error("StatementBranch source range is not complete.");
}
ReplaceCountAt(data, startIndex + 1, index - startIndex, statement);
// **造完就关一次**（第 531 轮）：与 `FormFrom` 末尾那一句**同一个理由** ——
// 壳里的 `return` / `throw` / `break` / `continue` / `debugger` 那类词要升成 `Keyword`，
// 投影侧「关键字开头的语句」那一支才认得。
//
// **少了它会怎样**（第 531 轮实测）：软换行归档的语句壳**只由这一支造**
// （`;` 那一档走 `FormFrom`、`}` 那一档 `IsStatementSymbol` 答否 ⇒ 从来不走），
// 于是「块里最后一条语句」是**唯一**没跑过关闭前那一趟的语句壳 ——
// `cls-hash-in-operator.ts` 的 `return #x in o` 正是这一档：`return` 留在 `Identifier` 上
// ⇒ 投影投出 `ExpressionStatement > BinaryExpression`（缺 `ReturnStatement` 一栏 63 份）。
statement.TryToClose();
```
