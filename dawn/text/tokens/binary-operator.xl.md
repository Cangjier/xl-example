# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
import { CommonUtil } from "../../../core/common-util.xl.md"
import { IsWordUnit } from "./declaration-common.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { JsonArray } from "./json/json-array.xl.md"
import { JsonObject } from "./json/json-object.xl.md"
import { Keyword } from "./keyword.xl.md"
import { Lamda } from "./lamda/lamda.xl.md"
import { LogicalOperator } from "./logical-operator.xl.md"
import { Method } from "./method.xl.md"
import { New } from "./new/new.xl.md"
import { NullConditionalOperator } from "./null-conditional-operator.xl.md"
import { NotNull } from "./not-null.xl.md"
import { String } from "./string/string.xl.md"
import { Symbol } from "./symbol.xl.md"
import { UnaryOperator } from "./unary-operator.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

二元运算：`a + b` / `a * b` / `a === b` / `a << b` / `k in obj` 这类，
收成一个 `BinaryOperator` 节点（左操作数、运算符、右操作数都装在里面，`Operator` 属性记下运算符文本）。

「完整解析 TypeScript」最后一块缺口就是表达式层（`tests/parse/known-gaps.json` 的
`_notes.expr-tree-absent`）：第 27 轮补了一元，本规则补二元里最大的一块。

**优先级靠「注册多个实例 + 高优先级先跑」实现**：重组是**按规则**扫的，
排在前面的规则整趟先跑完。于是把 `**` 排在 `*` 前面、`*` 排在 `+` 前面……
`a + b * c` 里 `*` 先折叠成 `BinaryOperator(b, *, c)`，随后 `+` 折叠时它的右操作数
正好就是这个节点 → 得到 `BinaryOperator(a, +, BinaryOperator(b, *, c))` ✓ 正确的树。

**结合性靠「同一趟里从左到右」**：`a - b - c` 的同一个实例从左往右扫，
先折 `a - b`、再折 `(a-b) - c` → 左结合 ✓（`**` 在 TypeScript 里是右结合，这里也按左结合处理，
连乘方连写在实际代码里极罕见，等真的需要时再单独给它一个从右往左的实例）。

**运算符集刻意不含 `|` / `&` / `<` / `>`**：它们在类型位另有含义，
已经被类型规则（联合/交叉、`GenericType`）收走；把它们也当二元运算符会直接打坏类型解析。
`&&` / `||` 也不在内——它们早就有 `LogicalOperator` 了。

`BinaryOperatorReorganization` 写在 `BinaryOperator` 之前；
`Root` 会在自己的重组队列里持有这些实例，所以顺序不能反。

# class BinaryOperatorReorganization extends Reorganization

## constructor:(operators:Array<string>)=>void

一个实例负责**一个优先级层**的一组运算符（`["*", "/", "%"]` 这样）。

列表存进 `Operators` 字段；`Instance` 之外的实例都由 `ParsePipeline.GeneralReorganize` 直接 `new` 出来。

```ts
super();
this.Operators = operators;
```

## field Operators:Array<string> = []

本实例负责的运算符文本。

## static readonly field PowerInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["**"])

乘方（最高优先级）。

## static readonly field MultiplicativeInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["*", "/", "%"])

乘除取余。

## static readonly field AdditiveInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["+", "-"])

加减。

## static readonly field ShiftInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["<<", ">>", ">>>"])

移位。

## static readonly field RelationalInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["<=", ">="])

大小比较。**只收 `<=` / `>=`**：单独的 `<` / `>` 与泛型实参同形，
`GenericTypeBranch` 在词法阶段就要靠它们配对，语法层再动它们会互相打坏。

## static readonly field EqualityInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["==", "!=", "===", "!=="])

相等比较。

## static readonly field InInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["in"])

`k in obj`（`in` 是关键字，见 `../parse-pipeline.xl.md` 的 `KeyWords`）。

## static readonly field InstanceofInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["instanceof"])

`x instanceof C`。

## static readonly field NullishInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["??"])

空值合并 `a ?? b`。

放在这一族里（而不是和 `&&` / `||` 一起）：那两个是 `LogicalOperator` 的活，
而 `??` 与它们混写没有括号时本来就是语法错误，所以顺序上挨着谁都不影响正确性 ✓。

**为什么现在才加**：差分引擎原来把**所有** `BinaryExpression` 都算在 `BinaryOperator` 的账上，
`??` 的缺失被埋在那个虚高的差额里；第 39 轮把「另有归属的运算符」（`&&` / `||` / 赋值族）从账上剔掉之后，
剩下的 165 个真切口中 `??` 占 24 个，这才露出来。

## private method OperatorText:(current:Token)=>string

`current` 的文本：`Symbol` / `Common` 用 `TempToString()`，`Keyword` 用它的 `Value`。

```ts
if (current instanceof Symbol) {
  return current.TempToString();
}
if (current instanceof Common) {
  return current.TempToString();
}
if (current instanceof Keyword) {
  return current.Value;
}
return "";
```

## private method IsOperator:(current:Token | null)=>bool

`current` 是不是**本实例负责的**运算符。

```ts
if (current === null) {
  return false;
}
const text = this.OperatorText(current);
if (text === "") {
  return false;
}
return this.Operators.indexOf(text) !== -1;
```

## private method IsOperand:(unit:Token | null)=>bool

`unit` 能不能当**操作数**。

能当的：`Common` / `String` / `Method`（`f(x)`）/ `NotNull` / `UnaryOperator` / `BinaryOperator`
（左结合要靠它：`a - b - c` 的第二步，左边已经是一个二元节点）/ `JsonObject` / `JsonArray` /
`New` / `Lamda` / 收尾的 `)` 与 `]` 括号。

`Keyword` 只认 `this` / `super` 两个——别的关键字（`return` / `typeof` / `in` …）都不是操作数，
不当心认下来的话 `return - 1` 这种会被折成一个荒谬的二元节点。

`LogicalOperator` 也在列：`&&` / `||` 的规则排在**本规则之前**（历史位次），
`a && b + c` 会先把 `a && b` 折成 `LogicalOperator`，那时 `+` 的左边就是这个节点——
不认它的话 `+` 会因为没有左操作数而丢节点。**代价是那一处优先级不准确**
（按 TypeScript 应当是 `a && (b + c)`）：这是「`&&` 规则位次比四则早」带来的既有顺序问题，
真要修得把 `LogicalOperator` 挪到四则之后，属于另一次改动。

**括号那一支看的是 `EndBracketChar`，不是 `StartBracketChar`**：`a = (4) / 2;` /
`a = xs[0] - 1;` 里，操作数位置上的括号**左端**是 `(` / `[`，而「右端是 `)` / `]`」
才是「这个括号是一段完整的括号表达式」的意思。原来写的是
`StartBracketChar === ")" || StartBracketChar === "]"`——`Bracket` 的 `StartBracketChar`
只会是 `(` / `{` / `[`（见 `bracket.xl.md` 的 `Use`），所以那个判断**永远为假**，
整条括号分支是死代码：`(4) / 2` 与 `a[i] - b` 里的运算符都拿不到节点。
`[` 开头的括号**同时也要认**（`a[b + 1]` 的下标里那个 `+` 要折），
而 `JsonArray` 本身（`[...]` 数组字面量）也是操作数——
两个都要在名单里，否则 `[1, 2] + x` 会丢掉 `+`。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof Common) {
  const text = unit.TempToString();
  if (
    text === "return" ||
    text === "throw" ||
    text === "case" ||
    text === "default" ||
    text === "else" ||
    text === "do" ||
    text === "break" ||
    text === "continue"
  ) {
    return false;
  }
  return true;
}
if (
  unit instanceof String ||
  unit instanceof Method ||
  unit instanceof NotNull ||
  unit instanceof UnaryOperator ||
  unit instanceof BinaryOperator ||
  unit instanceof JsonObject ||
  unit instanceof JsonArray ||
  unit instanceof New ||
  unit instanceof Lamda ||
  unit instanceof LogicalOperator ||
  unit instanceof NullConditionalOperator
) {
  return true;
}
if (unit instanceof Bracket) {
  return (
    unit.EndBracketChar === ")" ||
    unit.EndBracketChar === "]" ||
    unit.StartBracketChar === "[" ||
    unit.StartBracketChar === "("
  );
}
if (unit instanceof Keyword) {
  return unit.Value === "this" || unit.Value === "super";
}
return false;
```

**`NullConditionalOperator` 也要认成操作数**：`a?.b ?? c` / `x.y.get(z)?.v ?? null` 里
`?.` 已经收成一个节点，不认它的话 `??` 找不到左操作数 ✗ ——
这是差分账上最后 34 个 `BinaryOperator` 的主要形状（取样里 `?.` 与 `.` 链各占一半，
而**普通 `.` 链本来就能折**，差别正在这里）。

**`Common` 那一支要排掉「语句关键字」**（这一条是实测补的）：本规则跑在 `KeywordReorganization`
（队列最后）**之前**，所以那时 `return` / `throw` 这些词**还是 `Common`** ✓ ——
按「是个 `Common` 就能当操作数」判，`return -1;` 会被折成
`<BinaryOperator Operator="-"><Keyword>return</Keyword>…` ✗（实测产物就是这个），
一元那一边因此永远拿不到它（差 38 个一元节点里的 29 个）。

**只排「语句关键字」这一小组，不要用「在关键字表里」当判据**：
第一版写成 `unit.Template.KeywordTemplate.IsKeyword(text)` 就一律拒收，结果
**表达式类关键字**（`await` / `yield` / `new` / `typeof` …）也被拒 ✗ ——
差分账上 `BinaryOperator` 立刻多出 34 个缺口（实测），说明有 37 处本来能折的表达式折不动了。
判据要窄：`return` / `throw` / `case` / `default` / `else` / `do` / `break` / `continue`
这八个**只会出现在语句头**的词 ✓；`true` / `false` / `null` 不在关键字表里，仍是操作数 ✓。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是**本层的一个二元运算符**，而且左右两边都是操作数。

父单元是 `GenericType` 时一律不成立（类型实参段里的东西不是表达式，
与 `MethodReorganization` / `UnaryOperatorReorganization` 同一条判据）。

父单元是 `[` 括号时也一律不成立：那是**映射类型**（`{ [K in keyof T]: T[K] }`）
与索引签名（`[key: string]: T`）的地盘，`in` 是类型语法的一部分、不是运算符。
实测这一条不挡的话四条映射类型用例全炸（`in` 的左右正好是两个 `Common`：
`K` 与 `keyof`）。

**但判据不能只看「父单元是 `[` 括号」**：元素访问 `a[b + 1]` / `xs[xs.length - 1]`
用的是**同一个 `[` 括号单元**，一并挡掉的话下标里的运算符全都拿不到节点
（实测量化：这一类占二元缺口的 41 个节点 / 21 个文件，是最大的一块）。
正确的判据是括号自己的 `Context`——它在**开括号那一刻**由 `DecideBracketContext` 算好，
不受重组时序影响（见 `bracket.xl.md` 的 `Context` 字段说明）：
只有 `Context === "type"` 的 `[` 才是映射类型 / 索引签名的地盘。
实测 `a[b + 1]` 的括号 `Context === "value"`。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
if (current.Parent instanceof GenericType) {
  return false;
}
if (current.Parent instanceof Bracket && current.Parent.Context === "type") {
  return false;
}
if (this.IsOperator(current) === false) {
  return false;
}
if (this.IsOperand(Get(units, SkipPreviousWrapSymbol(units, index))) === false) {
  return false;
}
return this.IsOperand(Get(units, SkipNextWrapSymbol(units, index)));
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把「左操作数 / 运算符 / 右操作数」三个单元（中间夹着的软换行一并吞掉）收成一个 `BinaryOperator`，
**返回新的下标**。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("BinaryOperatorReorganization.Process: current is null");
}
const beforeIndex = SkipPreviousWrapSymbol(units, index);
const afterIndex = SkipNextWrapSymbol(units, index);
const before = Get(units, beforeIndex);
const after = Get(units, afterIndex);
if (before === null || after === null) {
  throw new Error("BinaryOperatorReorganization.Process: 两侧缺操作数");
}
const result = new BinaryOperator(template);
result.Parent = current.Parent;
result.Operator = this.OperatorText(current);
result.SignIn(before.SourceRange.Start!);
result.SignOut(after.SourceRange.End!);
for (let i = beforeIndex; i <= afterIndex; i++) {
  const item = Get(units, i);
  if (item !== null && !(item instanceof WrapSymbol)) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, beforeIndex, afterIndex - beforeIndex + 1, result);
```

# class BinaryOperator extends IndependentToken

二元运算 `left op right`。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它覆写了 `ToXmlString`：在基类的串接之外带上 `Operator` 属性。

## constructor:(template:Template)=>void

转调基类构造器，**并且把自己的重组队列装上**。

本单元是重组规则建出来的，它的内容（左右操作数与运算符）**没有**再被外层扫过一遍，
`KeywordReorganization` 排在通用队列最后、轮不到它里面的词——
`k in obj` 的 `in`、`x instanceof Y` 的 `instanceof` 于是停在 `Common` 上。
挂上类型队列（`../parse-pipeline.xl.md` 的 `InitialKeywordReorganizationQueue`）之后，
它关闭时会再跑一趟，`KeywordReorganization` 这一趟就能看见里面的词。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## field Operator:string = ""

运算符文本（`+` / `*` / `===` / `in` …）。

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带 `Operator`。

属性值必须过一遍 `CommonUtil.XmlDecode`：`<=` / `>=` 里的 `<` 直接写进属性会**破坏 XML**
（实测 `expr-compare-lt-le` 这条用例就是这么报出来的：`XML 里出现没转义的 <`）。
`Bracket` 的 `(` / `)` 没有这个问题，所以那边没这一步。

`Operator` 里装的运算符（`in` / `instanceof`）也**要能升级成关键字**：
本单元是重组规则建出来的，它的内容不会再被外层扫一遍，所以构造器里挂了
`InitialKeywordReorganizationQueue`（与 `TypeDefine` / `Export` / `Let` 同一做法）。

```ts
const name = this.constructor.name;
let body = "";
for (const item of this.Data) {
  body = body + item.ToXmlString();
}
return `<${name} Operator="${CommonUtil.XmlDecode(this.Operator)}">${body}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new BinaryOperator(this.Template);
result.Sign(this);
result.Operator = this.Operator;
result.TryToClose();
return result;
```
