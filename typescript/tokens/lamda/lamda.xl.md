# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenField } from "../../../core/syntax/token-field.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBack } from "../../../core/extensions/list-extension.xl.md"
import { CommentsIn, GetSkipPreviousWrapSymbol, IsArrowReturnTypeBracket, IsTriviaUnit, IsTypeContainerUnit, SkipNextTrivia, SkipNextWrapSymbol, SkipPreviousTrivia, SkipPreviousWrapSymbol, WordText } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { BinaryOperator } from "../binary-operator.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { Identifier } from "../identifier.xl.md"
import { JsonObjectCloseRule, ObjectLiteral } from "../json/object-literal.xl.md"
import { JsonArrayCloseRule } from "../json/array-literal.xl.md"
import { Method } from "../method.xl.md"
import { ReturnType } from "../function/return-type.xl.md"
import { Statement } from "../statement.xl.md"
import { AreaAnnotation } from "../area-annotation.xl.md"
import { LineAnnotation } from "../line-annotation.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
import { LamdaBody } from "./lamda-body.xl.md"
import { Parameter } from "./lamda-parameter.xl.md"
import { LamdaParameters } from "./lamda-parameters.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Lambda 表达式：把 `()=>{}` / `p1=>statement` / `():xxx=>{}` 这三种形态从「参数 + `=>` + 体」重组成单个 `Lamda` 单元，参数收进 `LamdaParameters`，体收进 `LamdaBody`。

收尾规则类 `LamdaCloseRule` 写在 `Lamda` **之前**（与同目录其它 token 一致）。

# class LamdaCloseRule extends CloseRule

`Process` 是整个文件里最重的一段：它要把 `=>` 左边的东西收成 `LamdaParameters`（括号形参表拆成一个个 `Parameter`，或单个裸形参），把右边的东西收成 `LamdaBody`（花括号体直接搬家，语句体按表达式/语句两种终止规则截断）。

## static readonly field Instance:LamdaCloseRule = new LamdaCloseRule()

唯一的实例。

## method IsLambdaParameters:(units:Array<Token>, index:int)=>bool

`index` 处的 `(` 括号是**箭头函数的形参表**，不是一段函数类型。

`(a: A) => B` 与 `(a: A): B => body` 长得几乎一样，区别在括号**前面**是什么：

- 前面是 `:` / `?:`（`let f: (a: A) => B` / `cb?: (a: A) => B`）→ 这是类型标注里的**函数类型**，
  不是箭头函数，本规则不接手；
- 前面是 `new`（`new () => object`）→ **构造类型**，同理不接手；
- 前面是别的（`=` / `(` / `,` / `return` / 行首…）→ 形参表，成立。

**另外两类必须是函数类型**（第 54 轮补，实测各抓到一处误判）：

- 父单元是 `GenericType`——类型实参段里没有箭头函数（`Array<(a: A) => B>` 的
  `(a: A) => B` 是函数类型）。与 `MethodCloseRule.Previous` / `BinaryOperatorCloseRule.Previous`
  的同一句判据同型。
- **括号套括号**，而且外层那个括号在类型位：`x: ((a: A) => B)`、`| ((host, cb) => void) | undefined`
  （`@types/node/stream.d.ts` / `dgram.d.ts` 里成片）。形参括号这时是外层括号内容列表的**第一项**，
  本层往左什么也看不到——要拿**外层括号自己**在它那一层的位置来问：前面是 `:` / `?:` / `|` / `&`
  ⇒ 类型位；前面是 `=` 就继续往左找 `type`（类型别名）还是 `const` / `let` / `var`（值）；
  前面是名字或 `Method` ⇒ 值位（`f((a) => b)` 的形参表）。
  少了这一条，这些函数类型会被收成 `Lamda`（值位标签），产物里 `<Lamda>` 比 TS 的箭头函数多出十几处。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
if (current.Parent instanceof GenericType) {
  return false;
}
// **往左第一步要跨注释**（第 881 轮）：这一问与 `FindParameters` / `FunctionTypeCloseRule.Previous`
// 问的是同一件事（「这个 `(` 前面是什么」），而**那两处早就走 trivia 口径了**
//（`FindParameters` 的 `previousNonTrivia`、`Previous` 的 `SkipPreviousTrivia`）。
// 本判据原来只跳软换行 ⇒ 注释落在 `(` 前面时 `previous` 取到的是那条注释
// ⇒ 下面每一档都不命中 ⇒ 落到末尾那句 `return true`（「形参表」）——
// 于是 `FunctionTypeCloseRule` 拿到 `FindParameters >= 0`、把这段**函数类型**让给了箭头函数，
// 两边一起判错、整条构造类型不成形（实测 `token/types/gap-r869-abstract-construct-comment-5`：
// 缺 `ConstructorType` / `AbstractKeyword`，多出 `TypeReference` + `Identifier`）。
// 同一个形状还能量到 `type T = /*c*/ (a: number) => B` 与 `let f: /*c*/ (a: A) => B`
// 两格（前者散成裸单元、后者被收成 `<Lamda>`）。
//
// **只动这一格，内层那两处照旧**：`?` 那一支与括号回溯都在做**符号配对**，
// 与「`(` 前面是什么」不是同一个问题（见下面那一段扫描的说明）。
const previousIndex = SkipPreviousTrivia(units, index);
const previous = Get(units, previousIndex);
if (previousIndex < 0) {
  return this.IsWrappedByTypeContext(current) === false;
}
if (previous instanceof SymbolToken && (previous.Is(":") || previous.Is("?:"))) {
  // `?:` 是**一个**符号单元（可选参数 / 可选属性），只认 `:` 会漏掉
  // `callback?: (error: Error | null) => void` 这一大片（实测 `@types/node/child_process.d.ts`
  // 里成排的 `send(message, callback?: (…) => void)` 全会退回 `Lamda`）。
  //
  // **但冒号在对象字面量里是属性分隔符，不是类型标注**（第 77 轮）：
  // `const o = { a: (x, y) => x }` 里那个 `(` 往前看只有 `a:`，照上面这条会判成函数类型——
  // `FunctionTypeCloseRule` 排在 `Lamda` 之前，于是整条箭头被收成 `FunctionType`，
  // 连形参表里的 `,` 都折成了逗号运算符。实测（`cases:align`）：缺 `ArrowFunction` 10 处 +
  // `FunctionType in ObjectLiteral` 10 处 + `BinaryOperator in Parameter` 4 处。
  //
  // 两条判据合起来才算「冒号是属性分隔符」：
  //   ① 外层容器**确实是对象字面量**——见 `EnclosingObjectLiteral`（它认两种形态：
  //      已经成形的 `ObjectLiteral`，以及还没成形的 `{` 括号交给对象字面量规则自己的
  //      `IsObject` 判）；
  //   ② 类型字面量 `type T = { a: (x) => B }` 里的 `(x) => B` 是**函数类型**，
  //      它的 `{` 判据里要求 `Context !== "type"` 才算对象字面量（见那个方法）。
  // 判据复用对象字面量规则自己的 `IsObject`（`As` / `TypeDefine` / `TernaryOperator` 与
  // 本文件本来就在用它），不新写一份近似。
  if (this.EnclosingObjectLiteral(current)) {
    return true;
  }
  // **值三元的冒号也不是类型标注**（第 364/365 轮，**实测撞到的**）：
  // `flag ? (a: number) => a + 1 : (a: number) => a - 1` 里那个 `(` 往前看紧挨着**三元的 `:`**，
  // 照上面那条一律判「类型标注 ⇒ 不是形参表」 ⇒ `FindParameters` 给 `-1` ⇒ 紧邻的
  // `FunctionTypeCloseRule`（它排在 `Lamda` **之前**）把**假值段那个箭头**收成**函数类型**
  // ⇒ 降级层报 `unimplemented: expression FunctionType`。
  // **判据与本文件下面那条同源**（`?` 那一支用的就是 `HasExtendsMarker`）：
  // 「左边有平级的 `?` 而且**没有** `extends`」是值三元、有 `extends` 才是条件类型
  //（`T extends U ? () => A : B` 里那个 `() => A` **确实是**函数类型，所以不能一刀切）。
  // **"没有 extends" 要看整张列表**（第 365 轮，**收窄到第四次才对**）：
  // 第一版借的是 \`HasExtendsMarker\`（它只看一段窗口）——而条件类型的 \`extends\`
  // 可能落在窗口外面 ⇒ 那个**类型箭头**被当成了值箭头 ⇒ 语料里少 3 个、多 1 个
  //（实测 \`real\` 那一趟复现、\`cases\` 那一趟干净 —— 所以只有真语料才露）。
  let sawExtendsAnywhere = false;
  for (let k = 0; k < previousIndex; k++) {
    const u = Get(units, k);
    if (u instanceof Identifier && u.Is("extends")) {
      sawExtendsAnywhere = true;
      break;
    }
  }
  if (previous.Is(":") && sawExtendsAnywhere === false) {
    let scan = SkipPreviousWrapSymbol(units, previousIndex);
    while (scan >= 0) {
      const item = Get(units, scan);
      if (item instanceof SymbolToken && item.Is("?")) {
        return true;
      }
      // **真值段那个箭头横在中间**：`? (a) => a + 1 : …` 的 `=>` 与它的形参括号
      // 正好夹在 `?` 与 `:` 之间 ⇒ 这两个都**不算停靠**（探针现场：`previousIndex=13`、
      // `ext=false`、可回溯在索引 9 的 `=>` 上停住 ⇒ 判据恒为假）。
      // **括号只在「紧跟 `?`」时才跨**：那正是「它是真值段的形参表」。
      if (item instanceof Bracket) {
        // **三个条件一起才算「真值段的形参表」**（第 365 轮，**收窄到第三次才对**）：
        // ① 括号左边紧挨着 `?`、② 括号右边紧跟着 `=>`（那才是箭头）、
        // ③ 中间没有别的边界。少了②，别的形状也会被放开（实测 `real` 那一趟语料里
        // 仍旧「缺 3 / 多 1」）。
        const beforeBracket = SkipPreviousWrapSymbol(units, scan);
        const beforeUnit = Get(units, beforeBracket);
        const afterBracket = SkipNextWrapSymbol(units, scan);
        const afterUnit = Get(units, afterBracket);
        if (beforeUnit instanceof SymbolToken && beforeUnit.Is("?")
          && afterUnit instanceof SymbolToken && afterUnit.Is("=>")) {
          scan = beforeBracket;
          continue;
        }
        break;
      }
      if (item instanceof SymbolToken && (item.Is("=") || item.Is(",") || item.Is(";") || item.Is(":"))) {
        break;
      }
      scan = SkipPreviousWrapSymbol(units, scan);
    }
  }
  return false;
}
if (previous !== null && WordText(previous) === "new") {
  // `new () => object` 是**构造类型**，`new` 直接贴在形参括号前面。
  //
  // **按词认、不按类认**（第 881 轮）：通用队列里 `KeywordCloseRule` 排在最后，
  // 注释 / 换行会让它在 `FunctionCloseRule` 之前先跑一趟 ⇒ 这里那个 `new` 到这一刻
  // 可能已经是 `Keyword`（第 873 轮在 `function-type.xl.md` 的 `Process` 里实测同一件事）。
  // 只认 `Identifier` 时这一档整条不成立、函数类型被让给箭头函数。`WordText` 正是
  // 「两种单元取同一个词」的入口（见 `text-common-util.xl.md`）。
  return false;
}
if (previous instanceof Identifier && previous.Is("extends")) {
  // 条件类型的约束段：`T extends (this: infer U, …) => any ? … : …`
  // （`@types/node` 与 `lib.es5.d.ts` 的 `LamdaParameters` / `ThisParameterType` 都是这一形状）。
  // 类继承的 `extends (expr)` 后面不会跟 `=>`，所以这一条不会误伤值位。
  return false;
}
if (previous instanceof GenericType) {
  // `<T>(a: A) => B`：泛型函数类型（类型参数段属于它自己），`type X = <T>(a) => B`
  // 与 `declare function f(): <T>(a: A) => B` 都是这一形状。左边是类型位就算类型。
  //
  // **这一跳走 trivia 口径**（第 928 轮第二趟）：`type T =/*c*/<T>(a: T) => T;` 里注释夹在
  // `=` 与泛型段之间，原来只跳软换行 ⇒ `before` 取到的是那条 `AreaAnnotation`
  // ⇒ 三档都不命中 ⇒ 落到末尾那句 `return true`（「是形参表」）⇒ 整段函数类型一个节点都不成形
  //（实测缺 `FunctionType` / `Parameter` / 三个 `Identifier`，多一个当类型引用的 `<T>`；
  // 把注释换成换行一直是绿的）。判据与 `IsTypeAliasAssignment`、`FunctionTypeCloseRule.Previous`
  // 问的是同一件事（「泛型段左边那一格是什么」），那两处早就是 trivia 口径。
  const beforeIndex = SkipPreviousTrivia(units, previousIndex);
  const before = Get(units, beforeIndex);
  if (beforeIndex < 0) {
    return this.IsWrappedByTypeContext(previous) === false;
  }
  if (before instanceof SymbolToken && (before.Is(":") || before.Is("?:") || before.Is("|") || before.Is("&"))) {
    return false;
  }
  if (before instanceof SymbolToken && before.Is("=")) {
    return this.IsTypeAliasAssignment(units, beforeIndex) === false;
  }
  return true;
}
if (previous instanceof SymbolToken && previous.Is("?")) {
  // 条件类型真分支的起点：`T extends U ? (a: A) => B : C` 里的 `?` 后面是**类型**；
  // 三元表达式的 `?` 后面才是值（那边没有 `extends` 标志）。
  return this.HasExtendsMarker(units, previousIndex) === false;
}
if (previous instanceof SymbolToken && previous.Is("=")) {
  // `type F = (a: A) => B`（类型别名右值）与 `const f = (a) => b` 长得一样，
  // 差别只在等号左边是 `type X` 还是 `const x`。少了这一条，类型别名里的函数类型会被
  // `FunctionTypeCloseRule`（它排在 `TypeAssign` 之前）问出「是形参表」，
  // 于是既不产 `FunctionType` 也不产 `Lamda`（实测 `@types/node/fs.d.ts` 的
  // `export type NoParamCallback = (err: …) => void` 一片）。
  return this.IsTypeAliasAssignment(units, previousIndex) === false;
}
return true;
```

## private method EnclosingObjectLiteral:(unit:Token)=>bool

**包着 `unit` 的最近那个容器是不是对象字面量**。

给 `IsLambdaParameters` 的冒号那一支用（见那里的说明）：对象字面量里的冒号是**属性分隔符**，
里面的 `(x, y) => …` 是**箭头函数**；类体 / 接口体 / 类型字面量里的冒号是**类型标注**，
里面的 `(x, y) => …` 是**函数类型**。

两种形态都要认——实测（第 77 轮插桩）在问这件事的时候，外层**已经**是造好的
`ObjectLiteral` 了：

    Bracket((:… ) < ObjectLiteral < Root

- 上溯遇到 **`ObjectLiteral`** ⇒ 是（确定性最高的一种：容器已经成形）；
- 上溯遇到还是括号的 **`{`** ⇒ 三条一起看：
  ① `Context !== "type"`——类型字面量 `type T = { … }` 的 `{` 在 `IsObject` 眼里是
  「对象开头」（前面是 `=`），只有 `Context` 分得开它；
  ② 对象字面量规则自己认得它（`JsonObjectCloseRule.IsObject`）；
  ③ **它前面那一格是表达式位置**（符号，或 `return` / `typeof` 两个词）——这一条是实测补的：
  `IsObject` 只回答「对象字面量规则会不会接手」，而**命名空间体**
  （`declare module "x" { … }` 的 `{`，前面是模块名字符串）在那一刻也判「是」
  （命名空间规则排在它前面、本来轮不到对象字面量规则接手），于是
  `child_process.d.ts` 里成片的 `callback?: (error: …) => void` 会被判成箭头函数
  ——实测 **269 处 `FunctionType` 消失**。对象字面量只出现在**表达式**里，所以加这一条就够；
- 遇到别的容器（`ClassBody` / `InterfaceBody` / `TypeLiteralBody` / `Statement` / `FunctionBody`…）
  ⇒ 不是；爬到头 ⇒ 不是。

```ts
let node:Token | null = unit;
for (let hop = 0; hop < 8 && node !== null; hop++) {
  if (node instanceof ObjectLiteral) {
    return true;
  }
  if (node instanceof Bracket && node.startBracket === "{") {
    if (node.Context === "type" || JsonObjectCloseRule.Instance.IsObject(node) === false) {
      return false;
    }
    if (node.Parent === null) {
      return false;
    }
    const units = node.Parent.Data;
    const at = units.indexOf(node);
    if (at < 0) {
      return false;
    }
    const before = Get(units, SkipPreviousWrapSymbol(units, at));
    if (before instanceof SymbolToken) {
      return true;
    }
    return before instanceof Identifier && before.IsAny(["return", "typeof"]);
  }
  node = node.Parent;
}
return false;
```

## private method IsTypeAliasAssignment:(units:Array<Token>, index:int)=>bool

`index` 处的 `=` 是不是**类型别名**的等号。

往左只跨 `Identifier`（别名、`export` / `declare` 这些修饰词）、`GenericType` 与 **trivia**：

- 找到 `type` ⇒ 是类型别名；
- 找到 `let` / `var` / `const` ⇒ 不是；
- 碰到别的（符号、括号、列表开头）⇒ 不是（保守：宁可当值位，行为与既有一致）。

**第 927 轮：`LineWrap` 那一格换成 `IsTriviaUnit`**。这一条与 `IsLambdaParameters` 的第 1 步、
`FunctionTypeCloseRule.Previous`、`IsFunctionTypeArrow` 问的是**同一件事的两半**
（「这个 `=` / `(` 左边那一格是什么」），而那三处都早已走 trivia 口径。这一处只跳软换行时：
`type /*c*/ T = () => void;` 往回走看到的是那条注释 ⇒ 落到最后那句 `return false`
⇒ `IsLambdaParameters` 判「这是形参表」⇒ `FunctionTypeCloseRule.Previous` 拿到
`FindParameters >= 0` 就把整段**函数类型**让了出去 ⇒ **一个节点都不成形**
（实测：token 树里 `TypeAssign` 底下是平的 `Bracket` / `=>` / `void`，
投影缺 `FunctionType` + `VoidKeyword`、多一个裸 `Bracket`；无注释的对照态全绿）。
这才是第 927 轮量到的「第二段箭头」那一族的**另一个根**——它在**解析期**，不在投影期。

```ts
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item instanceof GenericType || IsTriviaUnit(item)) {
    continue;
  }
  if (item instanceof Identifier) {
    const text = item.TempToString();
    if (text === "type") {
      return true;
    }
    if (text === "let" || text === "var" || text === "const") {
      return false;
    }
    continue;
  }
  return false;
}
return false;
```

## private method HasExtendsMarker:(units:Array<Token>, index:int)=>bool

`index`（一个 `?`）**往前**有没有条件类型的标志 `extends`。

`T extends U ? A : B` 两个分支都是**类型**；`cond ? a : b` 是三元表达式，两个分支是值。
判据与 `../type-literal/type-literal.xl.md` 里那份同源（那边判的是 `{` 该不该当类型字面量）。

扫到别的符号（`;` / `=` / 语句边界）就停；括号与软换行是透明的。

```ts
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item instanceof LineWrap || item instanceof Bracket || item instanceof GenericType) {
    continue;
  }
  if (item instanceof Identifier) {
    if (item.Is("extends")) {
      return true;
    }
    continue;
  }
  if (item instanceof SymbolToken) {
    const text = item.TempToString();
    if (text === "." || text === "?.") {
      // 约束段里的成员访问（`T extends NodeJS.ArrayBufferView<infer B> ? … : …`）。
      continue;
    }
    return false;
  }
}
return false;
```

## private method IsWrappedByTypeContext:(bracket:Token)=>bool

形参括号是所在列表的第一项时，判断**包着它的那个括号**处在不在类型位。

`bracket.Parent` 就是外层括号（形参括号是它的内容），外层括号的 `Parent` 才是「外公列表」——
问的是外层括号在**外公列表**里前面那一格是什么：

- `:` / `?:` / `|` / `&` ⇒ 类型位（类型标注、联合 / 交叉类型的一项）；
- `=` ⇒ 继续往左找 `type`（`type T = ((a: A) => B)`）⇒ 类型位，找到 `const` / `let` / `var` 或者
  一路到头 ⇒ 值位；
- 别的（名字、`Method`、列表开头…）⇒ 值位。

不是「括号套括号」的形状一律给 `false`——那说明形参括号是某个列表的第一项而外层不是括号，
按值位收（`({ a }) => x` 那种解构形参）。

```ts
const wrapper = bracket.Parent;
if (!(wrapper instanceof Bracket) || wrapper.startBracket !== "(") {
  return false;
}
const outer = wrapper.Parent;
if (outer === null) {
  return false;
}
if (outer instanceof GenericType) {
  // 类型实参段里的括号一定是类型：`Mock<(() => T) | Implementation>`。
  return true;
}
const at = outer.Data.indexOf(wrapper);
if (at <= 0) {
  // **括号套括号、而外层括号自己在类型位**（第 928 轮）：这一格原来一律答否，于是
  // `const k6 = (): ((() => void)) => { … }` 里**最里层**那对括号（`() => void` 的形参表）
  // 判不出「包着我的是类型位」⇒ `IsLambdaParameters` 答「是形参表」⇒ 那一段函数类型
  // 被收成 `Lamda`（实测多一个 `ArrowFunction`、缺 `FunctionType`）。
  // 往上追问一层就够了：外层括号在它自己那一层的位置由下面这段扫描回答
  //（`:` ⇒ 类型位、`=` ⇒ 看声明词……），而 `((a) => b)` 这种值位嵌套会一路问到顶、
  // 得到否（顶层那一问的 `wrapper` 不再是括号）。
  return this.IsWrappedByTypeContext(wrapper);
}
// **这一趟回扫一律走 trivia 口径**（第 928 轮）：`const k = ():/*c*/(() => void) => { return; };`
// 里那句注释夹在返回类型的冒号与括号之间，`A extends/*c*/(() => infer R) ? R : never` 里
// 夹在 `extends` 与括号之间——两处的括号都是**类型位**，而只跳软换行时回扫第一步就撞上注释
// ⇒ 落到末尾那句 `return false`（值位）⇒ 里面那段函数类型被 `LamdaCloseRule` 收成箭头函数
//（实测：缺 `FunctionType` / `InferType`，多 `ArrowFunction` + `EqualsGreaterThanToken`；
// 把注释换成换行则一直是绿的——**注释与软换行是同一件事**，第 873 轮那条线）。
// 初始那一步与循环里那两步（`=` 与普通标识符之后）一起换：判据跨过什么，搬运就得跨过什么。
let index = SkipPreviousTrivia(outer.Data, at);
let crossedAssignment = false;
while (index >= 0) {
  const item = Get(outer.Data, index);
  if (item instanceof SymbolToken) {
    const text = item.TempToString();
    if (text === ":" || text === "?:" || text === "|" || text === "&") {
      return crossedAssignment === false;
    }
    if (text === "=" && crossedAssignment === false) {
      crossedAssignment = true;
      index = SkipPreviousTrivia(outer.Data, index);
      continue;
    }
    return false;
  }
  if (item instanceof Identifier) {
    const text = item.TempToString();
    if (text === "extends") {
      // 条件类型的约束段：`F extends ((value: infer V) => any) ? … : …`
      return true;
    }
    if (crossedAssignment && (text === "let" || text === "var" || text === "const")) {
      return false;
    }
    if (crossedAssignment && text === "type") {
      return true;
    }
    index = SkipPreviousTrivia(outer.Data, index);
    continue;
  }
  return false;
}
return false;
```

## method FindParameters:(units:Array<Token>, index:int)=>int

`index`（一个 `=>`）左边那段是不是形参；是就返回**形参单元**的下标（`(` 括号或裸形参 `Identifier`），否则返回 `-1`。

`Previous` 与 `Process` 共用它——两边对「形参在哪」的判断必须一致。
**函数类型的规则（`function-type.xl.md`）也复用它**：`-1` 正好就是「这是一段函数类型」的判据，
两边共用一份判断才不会出现「一边当形参表、另一边当函数类型」的错位，所以它是 `method` 而不是 `private method`。

四种形状都走这里：

- `( …. ) =>`：`=>` 左边就是形参括号；
- `p1 =>`：`=>` 左边是裸形参；
- `( …. ) : T =>`：要先跨过返回类型标注：从 `=>` 往左走，遇到 `:` 再看它**左边**是不是 `(` 括号；
- 反过来，`let f: (a: A) => B` 这种**函数类型**必须排除掉——它的括号左边也是 `:`，
  但那个 `:` 属于类型标注而不是箭头函数的返回类型；区别在**冒号左边**：
  函数类型是 `: ( … ) =>`（括号前面直接是冒号），箭头函数是 `( … ) : T =>`（冒号前面是形参括号）。
  所以判定统一成一句：**冒号左边那个单元是 `(` 括号 ⇒ 它是箭头函数的返回类型标注**。

往左走时遇到 `=` / `,` / `;` / `?` / 另一个括号就停：再往左就是上一条语句或另一个表达式了。
一路走完都没找到 `:` 时，若 `=>` 左边是个裸 `Identifier`，它就是裸形参。

```ts
// **注释不是形参表的一部分**（第 621 轮，**实测撞到的**）：块注释在产物树里是一个
// `AreaAnnotation` 单元（行注释是 `LineAnnotation`）——`(a: number) /* c */ => a + 1` 里
// 它正好卡在括号与 `=>` 之间 ⇒ 往左第一步就撞上它 ⇒ 上面那四档一条都不成立 ⇒ 给 `-1`
// ⇒ **这个箭头根本不成形**（投出来是 `BinaryExpression` + `EqualsGreaterThanToken`，
// 而 TS 那边是 `ArrowFunction`；`(a: number) => /* c */ a + 1` 一直是对的）。
// **跳过它们与跳过软换行是同一件事** ⇒ 每一档往左走之前都先过一遍这里。
const previousNonTrivia = (from: number): number => {
  let at = SkipPreviousWrapSymbol(units, from);
  while (at >= 0) {
    const maybe = Get(units, at);
    if (maybe instanceof AreaAnnotation || maybe instanceof LineAnnotation) {
      at = SkipPreviousWrapSymbol(units, at);
      continue;
    }
    break;
  }
  return at;
};
const firstIndex = previousNonTrivia(index);
const first = Get(units, firstIndex);
if (first === null) {
  return -1;
}
// **返回类型那一格也是括号时，它不是形参表**（第 928 轮）：`(): (() => void) => { … }` 里
// `=>` 左边紧邻的是**返回类型**那个括号，它长得与形参表一模一样（都是已关闭的 `(`）。
// 照第一支问 `IsLambdaParameters` 只能看「括号自己前面那一格」——这里前面是 `:`
// （类型标注）⇒ 判否 ⇒ 本方法给 `-1` ⇒ `FunctionTypeCloseRule` 拿到「左边不是形参表」
// 就把整段收成函数类型（连箭头与体一起吞掉）。
// **真正的形参括号在冒号左边**，所以这一格要**落到下面那段回扫**去找它：回扫本来就认
// 「`:` 左边是 `(`」这一形状（箭头函数的返回类型标注那一条）。
if (first instanceof Bracket && first.startBracket === "(" && this.IsReturnTypeBracket(units, firstIndex) === false) {
  return this.IsLambdaParameters(units, firstIndex) ? firstIndex : -1;
}
let scan = previousNonTrivia(firstIndex);
while (scan >= 0) {
  const item = Get(units, scan);
  if (item instanceof SymbolToken && item.Is(":")) {
    const candidateIndex = previousNonTrivia(scan);
    const candidate = Get(units, candidateIndex);
    if (candidate instanceof Bracket && candidate.startBracket === "(") {
      return this.IsLambdaParameters(units, candidateIndex) ? candidateIndex : -1;
    }
    break;
  }
  if (item instanceof Bracket) {
    break;
  }
  if (item instanceof SymbolToken && (item.Is("=") || item.Is(",") || item.Is(";") || item.Is("=>") || item.Is("?"))) {
    break;
  }
  scan = previousNonTrivia(scan);
}
if (first instanceof Identifier) {
  return firstIndex;
}
return -1;
```

## private method IsReturnTypeBracket:(units:Array<Token>, index:int)=>bool

**第 928 轮：这一格已经搬到共用层**（`text-common-util.xl.md` 的
`IsArrowReturnTypeBracket`）——`IsFunctionTypeArrow` / `TypeLiteral.IsTypePosition`
问的是同一件事，三处各写一份近似就会漂（第 875 轮那条纪律）。
这里只留一句转发，免得 `FindParameters` 里那两处调用点各自散着。

```ts
return IsArrowReturnTypeBracket(units, index);
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：它得是 `=>`，而且左边那一段能认成形参（见 `FindParameters`）。

**`=>` 在类型位不是箭头函数**（第 66 轮）：`<F extends (...args: any[]) => any>` 这种
**参数表约束**里的 `=>` 与箭头函数同形，`FindParameters` 也会认出左边那段形参——
于是它被收成一个 `Lamda`，而 TS 那边是 `FunctionType`（当时那把对齐尺子实测
`Lamda in TypeParameter` 3 处、`FunctionType` 缺 3 处，`lib.decorators.d.ts` 与
`@types/node/test.d.ts` 各一片）。类型位里不可能有箭头函数，所以父单元是类型容器时一律让给
`function-type.xl.md`。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken) || !current.Is("=>")) {
  return false;
}
// **值初始化式除外，而且例外只给 `Field`**：类字段 `f = (a: number): void => {}` 的父单元是
// `Field`（它同时罩着属性声明与字段），那里是**值**、必须由本规则收。
// 参数表的**默认值**里也有 `=`（`<F extends Function = (…args: any[]) => undefined>`），
// 但父单元是 `TypeParameter` 而不是 `Field`——只看「有没有 `=`」会把它误让给函数类型
// （实测 `Lamda in TypeParameter` 3 处又冒出来）。
const fieldInitializer =
  current.Parent !== null &&
  current.Parent.constructor.name === "Field" &&
  this.HasAssignmentBefore(units, index);
if (IsTypeContainerUnit(current.Parent) && fieldInitializer === false) {
  return false;
}
return this.FindParameters(units, index) >= 0;
```

## private method HasAssignmentBefore:(units:Array<Token>, index:int)=>bool

`index` 前面（同一层）有没有一个 `=`——有的话这一层是**值初始化式**，不是类型标注。

与 `function-type.xl.md` 的同名判据同源（两边看的是同一件事，各自实现一份）。

```ts
for (let i = 0; i < index; i++) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && item.Is("=")) {
    return true;
  }
}
return false;
```

## static method IsMethod:(unit:Token | null)=>bool

某个单元算不算「方法调用形态」——要么它本身就是 `Method`，要么它是一个 `(...)` 圆括号。

`Process` 里用它判断「`=>` 右边是逗号分隔的实参列表」还是「一条语句」。

```ts
if (unit instanceof Method) {
  return true;
} else if (unit instanceof Bracket && unit.Is("(", ")")) {
  return true;
}
return false;
```

## private method CollectParameterUnits:(item:Token, out:Array<Token>)=>void

把形参表里的**逗号二元运算拆平**，按原文档顺序追加到 `out`。

`(a, b) => x` 的形参括号在 `=>` **之前**就关闭了，它自己那一趟重组先把 `a, b` 收成了一个
`BinaryOperator op=","`（三个以上形参还会左嵌套：`((a, b), c)`）。轮到 `LamdaCloseRule` 时，
形参表里已经没有逗号 `SymbolToken` 了——按旧写法往下切分，`(a, b, c) => x` 会得到**一个**
`Parameter`，里面装着那个逗号二元运算（`ComputeParametersCount` 也跟着报 1 个形参）。

所以切分之前先递归拆平：`op` 是 `,` 的二元运算按子单元继续展开，其余原样收集。

```ts
if (item instanceof BinaryOperator && item.op === ",") {
  for (const child of item.Data) {
    this.CollectParameterUnits(child, out);
  }
  return;
}
out.push(item);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组，**返回新的下标**。

重组把多个子单元换成一个，下标必须跟着走；函数体末尾把 `ReplaceCountAt(...)` 的结果直接 `return`。

- **带返回类型标注时要先退回形参**：`(a: A): T => body` 里 `=>` 左边那一段是 `: T`，
  `FindParameters` 会退回形参括号；形参与 `=>` 之间的那一截（`:` 与类型单元）搬进 `ReturnType`，
  替换范围从**形参**起算（有 `async` 时从 `async` 起算）——
  从 `T` 起算的话，形参括号与冒号会被留在外面，紧接着的 `TypeDefine` 会把整个 `Lamda` 包起来。
- **`Lamda` 本体要签入签出**（`result.SignIn(lambdaStart)`，终点在收尾处兜底）：
  它是要留在树里的单元，而 `Clone` 走的是 `Sign(this)`，要求 `SourceRange` 的**两头**都已经签过。
  两条分支各自用 `result.SignOut(...)` 把终点设成真正的末尾；两个分支都没走到时
  （`=>` 后面什么都没有这种被截断的形状）由收尾处那句 `result.SignOut(arrowEnd)` 兜底。
  兜底必须判空：`SignOut` 只能签一次，重复签会抛 `SourceRange.End has been setted`。

几处实现说明：

- 语句体截断用数组原生的 `slice(index + 1, endIndex + 1)`。
- **终止用的 `;` 不属于箭头函数的体**：`Statement.SearchStatementEnd` 把 `;` 也算作语句结束符并**返回它的下标**，
  于是 `() => 1;` 的体会连 `;` 一起吞掉。整体上看不出问题（`LamdaBody` 关的时候那个孤零零的 `;`
  被语句重组的早退删掉了），可它把**外层的分号也一起吃了**——
  `for (; () => 1; ) {}` 的条件括号里本来就只有两个 `;`，少一个之后
  `ForCloseRule.Process` 找不到第二段，直接抛「`(...)`中语句不满足格式要求」。
  所以收尾统一把末尾的 `;` 一路退掉，把它们留在外面（**循环退**：`for (() => 1; ; )` 的实参列表
  那条分支会退到最后一个单元，那里连着两个 `;`）。
  **这一步必须在两条分支合流之后做**：实参列表那条分支（`IsObject` / `IsMethod`）
  在找不到 `,` 时也会退到 `units.length - 1`，那个位置同样可能是外层语句的 `;`——
  `for (; () => 1; ) {}` 走的正是这一条（`=>` 的父亲是 `for` 的条件括号，被 `IsMethod` 认成实参列表）。
  退格要求 `endIndex > index + 1`，免得把 `() => ;` 这种非法输入退到 `=>` 自己身上。
- **尾随的软换行也不属于体**（实测：`x => x` 换行 `y` 会被并成**一条**语句）：
  `SearchStatementEnd` 把 `x => x` 的体判到行尾，可它**不包括**那个换行；
  换行若被收进 `LamdaBody`，后面语句重组就再也看不到那个边界了——
  `x => x` 与下一行于是收进同一个 `Statement`（`cases:boundaries` 报「被 `<Statement>` 横跨」）。
  所以收尾处再退掉一层 `LineWrap`，把换行留在外面。
  软的换行本来就不进产物（`WrapSymbolCloseRule` 会摘掉它），留它在外面只是让它继续当边界。
  这一条与上一条同型：**边界字符不属于左侧表达式**。
  **不能无条件改用 `SearchStatementEnd` 兜底**：实参列表里 `1` 换行再 `+ 2` 时，
  它会在那个软换行上判出语句结尾，`+ 2` 就被漏在箭头函数外面了。
  所以兜底只认**落在 `;` 上**的那次结果——那说明这是 `for (…)` 头，
  其余情况仍旧一路收到实参列表末尾。
- 抛错一律用 `new Error(...)`（不进规范类型位）——形参形态认不出来时抛 `参数错误`。
- **`result` 必须自己签入**（实测）：`SignIn` 只给 `LamdaParameters` 那几个**子单元**签了范围，
  新造的 `Lamda` 本体的 `SourceRange.Start` 一直是 `null`。`Lamda.Clone`
  第一句就是 `Sign(this)`，而 `SignInToken` 要求对方的范围已经签入——
  于是一旦有人克隆这个 lambda，就会抛 `SourceException: SourceRange.Start == null`。
  实际触发路径很短：`x => x` 换行 `a.b += 1`——复合赋值规则要把等号左边那一段逐个克隆，
  而它的起点搜索会把前面那个 `Lamda` 一起圈进来。起点取 `rangeStart`（含 `async`）。
- `JsonObjectCloseRule.IsObject` 是单参数版（`IsObjectAt` 才是列表版）。
- `current?.Parent` 可能是 `undefined`，而 `IsObject` / `IsMethod` 的形参只接受 `null`，所以补 `?? null`。

```ts
const current = Get(units, index);
const result = new Lamda(template);
result.Parent = Get(units, index)!.Parent;
const parameters = result.CreateParameters();
const lastIndex = SkipPreviousWrapSymbol(units, index);
const parametersIndex = this.FindParameters(units, index);
if (parametersIndex < 0) {
  throw new Error("参数错误");
}
const parameterUnit = Get(units, parametersIndex);
if (parameterUnit === null) {
  throw new Error("参数错误");
}
let rangeStart = parametersIndex;
result.IsAsync = false;
const asyncIndex = SkipPreviousWrapSymbol(units, parametersIndex);
const asyncUnit = Get(units, asyncIndex);
if (asyncUnit instanceof Identifier && asyncUnit.Is("async")) {
  rangeStart = asyncIndex;
  result.IsAsync = true;
}
// **「`async` 与形参表之间隔着一个泛型段」那一支整个撤掉了**（第 862 轮）：
// 它原来（第 856 轮）管 `async<T>(x) => x`——把 `rangeStart` 拉到 `async`、`IsAsync` 置真。
// 代价是**泛型段落进替换范围却没人收**：`[async, GenericType, Lamda]` 三格被换成**一格** `Lamda`
// ⇒ `typeParameters` 与 `T` 那一格永远缺（实测 `expr-async-generic-arrow` 缺 2 字段 1）。
// 第 861 轮在投影层收掉了「三格 `[Identifier(async), GenericType, Lamda]`」那一档之后，
// 紧贴与隔空格**两种排版走的是同一份判据**：留在这里反而把树压成一格、让投影看不到泛型段。
// 所以这一支整个撤掉——`async` 与泛型段照旧留在 `Lamda` 外面，由投影补
// `typeParameters` 与 `AsyncKeyword`（见 `print-ast-common.xl.md` 的 0a'）。
// **两条排版现在同一条路**：`async<T>(x) => x` 与 `async <T>(x: T) => x` 逐位置都完全一致。
const lambdaStart = Get(units, rangeStart)!.SourceRange.Start!;
const parametersRangeEnd = parameterUnit.SourceRange.End!;
const arrow = Get(units, index)!;
// **`=>` 的位置当场记进 `ArrowAt`**（第 621 轮）：它就在手上（触发本规则的那一格），
// 而投影那边原来拿 `indexOf("=>", 最后一个形参的终点)` **回原文里找**——那是
// **第二份位置答案**（`(a: number) /* => */ => a` 会命中注释里那个箭头）。
result.ArrowAt = arrow.SourceRange.Start!.Index;
const arrowEnd = arrow.SourceRange.End!;
result.SignIn(lambdaStart);
if (parametersIndex < lastIndex) {
  const returnType = result.CreateReturnType();
  for (let t = parametersIndex + 1; t <= lastIndex; t++) {
    const item = Get(units, t);
    if (!(item instanceof LineWrap)) {
      returnType.AddAndCloseLast(item!);
    }
  }
  returnType.SignIn(Get(units, parametersIndex + 1)!.SourceRange.Start!);
  returnType.SignOut(Get(units, lastIndex)!.SourceRange.End!);
  returnType.TryToClose();
}
if (parameterUnit instanceof Bracket) {
  const tempParameters: Token[] = [];
  const flatParameters: Token[] = [];
  for (const unit of parameterUnit.Data) {
    this.CollectParameterUnits(unit, flatParameters);
  }
  // **只有 trivia 的一段不成形参**（第 818 轮）：`(/*c*/) => 1` 里扁平化之后只有那条注释，
  // 照原样会包出一个**零宽 `Parameter`**（实测 `EXTRA Parameter [11,11)`、
  // `FIELD ArrowFunction` 多一个 `parameters`；`m(/*c*/)` 那一族在 `parameter.xl.md` 同根一起收掉）。
  // 注释不带走——它留在原处（形参表括号的 `Data` 里），投影时是 `INVISIBLE`。
  const flushParameter = (): void => {
    if (tempParameters.every((item) => IsTriviaUnit(item))) {
      tempParameters.length = 0;
      return;
    }
    const parameter = new Parameter(template);
    parameter.SignIn(tempParameters[0].SourceRange.Start!);
    parameter.SignOut(tempParameters[tempParameters.length - 1].SourceRange.End!);
    parameter.AddRange(tempParameters);
    parameter.TryToClose();
    parameters.Add(parameter);
    tempParameters.length = 0;
  };
  for (let i = 0; i < flatParameters.length; i++) {
    const item = flatParameters[i];
    if (item instanceof SymbolToken && item.Is(",")) {
      flushParameter();
    } else {
      tempParameters.push(item);
      if (i === flatParameters.length - 1) {
        flushParameter();
      }
    }
  }
} else if (parameterUnit instanceof Identifier) {
  const parameter = new Parameter(template);
  parameter.SignIn(parameterUnit.SourceRange.Start!);
  parameter.SignOut(parameterUnit.SourceRange.End!);
  parameter.Add(parameterUnit);
  parameter.TryToClose();
  parameters.Add(parameter);
} else {
  throw new Error("参数错误");
}
parameters.SignIn(lambdaStart);
parameters.SignOut(parametersRangeEnd);
parameters.TryToClose();

let endIndex = SkipNextTrivia(units, index);
const next = Get(units, endIndex);
// **`=>` 与体之间跨过的注释要收下**（第 595 轮）：只有**花括号体**这一支需要显式收
//（表达式体那一支把 `index+1 … endIndex` 整段搬进体，注释本来就在里面）；
// 它们落在本单元被替换掉的那一段里，不收就等于删掉。
// **收在体之前**：`CreateBody` 把体追加在末尾 ⇒ 先收注释、后建体，XML 里就是源序。
// 收进体里 不行：体有自己的收尾规则队列，一条光秃秃的注释会被包成一个 `Statement` 壳
// ⇒ 投影以为体里是「一条语句」而不是花括号块（实测 `Block` 缺 1 + 字段名 1）。
if (next instanceof Bracket && next.startBracket === "{") {
  result.AddRange(CommentsIn(units, index + 1, endIndex));
}
const body = result.CreateBody();
if (next instanceof Bracket && next.startBracket === "{") {
  // **是花括号体：那一对花括号当场记进字段**（第 595 轮那一格，第 647 轮带上整段）：
  // 投影于是不必回原文里猜「`=>` 之后第一个非空白字符是不是 `{`」（见 `Lamda.BodyBrace`）。
  result.BodyBrace.Set(next.SourceRange.Start!.Index, next.SourceRange);
  try {
    next.MoveDataTo(body);
    body.SignIn(next.SourceRange.Start!);
    body.SignOut(next.SourceRange.End!);
    result.SignOut(next.SourceRange.End!);
  } catch (e) {
    throw e;
  }
} else {
  // **数组字面量里的表达式体也要在逗号前收住**（第 178 轮）：`[() => 1, () => 2]` 里
  // 第一个箭头的体原来一路吃到**行尾**（`Statement.SearchStatementEnd`），
  // 把**那个逗号**也吞进了 `<LamdaBody>`——于是数组元素的分割线不见了：
  // 投影按顶层逗号切元素，切不出来就把两个 `Lamda` 当成**一个**元素，
  // 结果是 `xs.length` 给 `1`、`xs[1]` 给 `undefined`（**静默错值**，Node 给两个函数）。
  // 对象字面量与实参表早就有这一支（`IsObject` / `IsMethod`），数组字面量是**同一件事**
  //（逗号分隔的元素表），所以并进这一条判据——`IsArray` 与 `IsObject` 同源。
  if (JsonObjectCloseRule.Instance.IsObject(current?.Parent ?? null)
    || JsonArrayCloseRule.Instance.IsArray(current?.Parent ?? null)
    || LamdaCloseRule.IsMethod(current?.Parent ?? null)) {
    endIndex = SearchBack(units, index + 1, (x) => x instanceof SymbolToken && x.Is(","));
    if (endIndex !== -1) {
      endIndex--;
    } else {
      const statementEnd = Statement.SearchStatementEnd(units, index);
      const statementEndUnit = Get(units, statementEnd);
      if (statementEndUnit instanceof SymbolToken && statementEndUnit.Is(";")) {
        endIndex = statementEnd;
      } else {
        endIndex = units.length - 1;
      }
    }
  } else {
    endIndex = Statement.SearchStatementEnd(units, index);
  }
  // **三元的那个 `:` 不属于箭头的体**（第 351 轮，**实测撞到的**）：
  // `flag ? () => "yes" : () => "no"` 里体原来一路吃到**行尾**
  //（`Statement.SearchStatementEnd`），把 `: () => "no"` 整段吞进了 `<LamdaBody>`——
  // 于是 `TernaryOperatorCloseRule` **再也看不到那个 `:`**：实测 token 流里只有
  // `SymbolToken("?")` + **一个 `Lamda`**、**没有 `TernaryOperator`**，
  // 降级层拿到一个光秃秃的 `?` ⇒ 运行时报「binary operator ?」
  //（**一句话里没有一个字提到箭头**）。
  //
  // **判据与三元那一条同源**：这一层（`units`）里、箭头**左边**最近的那个平级标点是 `?`
  // ⇒ 这个箭头就落在三元的**真值段**上 ⇒ 体必须在**下一个平级 `:`** 之前收住
  //（扫描时先遇到 `:` 就说明左边那个 `?` 已经被配掉了，与三元重组里
  // `questionSinceColon` 那条纪律**同一个形状**）。
  // **只看平级**：形参括号 / 花括号 / 方括号里的 `?:` 是**另一个单元**（到不了这一层）——
  // 这与三元重组里「逗号与冒号都必须是边界」是同一条纪律。
  let arrowInTernary = false;
  for (let i = rangeStart - 1; i >= 0; i--) {
    const prev = Get(units, i);
    // **空位要跳过、不能停**（**实测踩到过**）：`units` 里被摘掉的软换行留下的是**空位**，
    // `Get` 在那些位置返回 `null`——第一版写成 `break`，于是扫描**第一步就停**，
    // 判据永远为假、`TernaryOperator` 照样成形可体还是把 `:` 吞了
    //（实测 token 流：`TernaryOperator` 有了、可 `Lamda` 的体里仍旧带着 `FunctionType`）。
    if (prev === null) continue;
    if (!(prev instanceof SymbolToken)) continue;
    if (prev.Is(":")) break;
    if (prev.Is("?")) {
      arrowInTernary = true;
      break;
    }
  }
  // **「没找到语句尾」那一档要先兜底，再扫三元的 `:`**（第 593 轮，**实测撞到的**）：
  // `const add = flag ? (a: number) => a + 1 : (a: number) => a - 1;` 走到这里时**那个 `;` 还没到**
  //（它正是触发本规则那一格）⇒ `Statement.SearchStatementEnd` 给 `-1` ⇒ 下面那个
  // `for (i = index + 1; i <= endIndex; …)` **一次都不转** ⇒ `:` 没被剪掉
  // ⇒ 体一路吃到**第二个箭头**（实测产物：`LamdaBody` 里除了 `a + 1` 还有一个
  // `TypeDefine > FunctionType`，而 TS 那边是 `ConditionalExpression` 两支各一个
  // `ArrowFunction`）⇒ 降级层报 `unimplemented: binary operator ?`（`c330-ex-ternary-arrow-branches`）。
  // **次序反过来就好**：`endIndex` 的兜底（「没找到 ⇒ 到列表末尾」）与后面的用途无关，
  // 先做它，那个 `:` 扫描才有界。
  if (endIndex === -1) {
    endIndex = units.length - 1;
  }
  if (arrowInTernary) {
    for (let i = index + 1; i <= endIndex; i++) {
      const item = Get(units, i);
      if (item instanceof SymbolToken && item.Is(":")) {
        endIndex = i - 1;
        break;
      }
    }
  }
  while (endIndex > index + 1) {
    const endUnit = Get(units, endIndex);
    if (!(endUnit instanceof SymbolToken) || !endUnit.Is(";")) {
      break;
    }
    endIndex = endIndex - 1;
  }
  while (endIndex > index + 1 && Get(units, endIndex) instanceof LineWrap) {
    endIndex = endIndex - 1;
  }
  body.AddRange(units.slice(index + 1, endIndex + 1));
  body.SignIn(Get(units, index + 1)!.SourceRange.Start!);
  body.SignOut(Get(units, endIndex)!.SourceRange.End!);
  result.SignOut(Get(units, endIndex)!.SourceRange.End!);
  body.IsStatement = true;
}
body.TryToClose();
if (result.SourceRange.End === null) {
  result.SignOut(arrowEnd);
}
result.TryToClose();
index = ReplaceCountAt(units, rangeStart, endIndex - rangeStart + 1, result);
return index;
```
# class Lamda extends IndependentToken

Lambda 表达式。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<Lamda>参数列表 + 体的 XML</Lamda>`。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `GenericType` / `children` / `returnType` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["ArrowFunction", new Map([["GenericType", "typeParameters"], ["children", "parameters"], ["returnType", "type"]])]]);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 995 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，但只许用**这个 token 自己**的东西——
属性、子单元与 `Parent`（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。

**唯一让开的一处**：`ArrowAt` 那一格是 `-1` 时（理论上不该有：它由重组那一刻当场记下），
`PrintDirectAst` 会**回原文里找** `=>`。那正是直出版不许有的第二份近似 ⇒ 直出版答 `undefined`，
交回 `PrintDirectAst` 走那一条（与基类「我没有直出版」同一个约定，只是让开的范围小到一格）。
**其余全部直读字段**：箭头的两个字符宽度由「它占两个字符」这一事实给（不是回原文比一次），
体的那对括号两端读 `BodyBrace` / `BodyBraceRange`。

```ts
  const props: any = ctx.Structural(v, "ArrowFunction");
  const rawArrowAt = v.arrowAt;
  const arrowAt = typeof rawArrowAt === "number" ? rawArrowAt : -1;
  // **位置不在这一格上**（字段缺）⇒ 交回 `PrintDirectAst`（它回原文里找一次）。
  if (!(arrowAt >= 0 && arrowAt < v.end)) {
    return undefined;
  }
  props.equalsGreaterThanToken = {
    kind: "EqualsGreaterThanToken",
    text: "=>",
    pos: arrowAt,
    end: arrowAt + 2,
  };
  let braced = false;
  let braceAt = -1;
  let braceEnd = -1;
  const rawBodyBrace = v.bodyBraceAt;
  if (typeof rawBodyBrace === "number" && rawBodyBrace >= 0) {
    braced = true;
    braceAt = rawBodyBrace;
  }
  const rawBodyBraceRange = v.bodyBraceRange;
  if (typeof rawBodyBraceRange === "string" && rawBodyBraceRange.includes(",")) {
    const bodyBraceSpan = rawBodyBraceRange.split(",");
    const spanEnd = Number(bodyBraceSpan[1]);
    if (Number.isInteger(spanEnd)) {
      braceEnd = spanEnd + 1;
    }
  }
  const bodyUnits = ctx.KidsOf(v, "body");
  const raw: any[] = [];
  for (const unit of bodyUnits) {
    if (unit.Tag() === "LamdaBody") {
      for (const x of ctx.UnwrapNodes(unit)) raw.push(x);
      continue;
    }
    raw.push(unit);
  }
  if (braced) {
    props.body = {
      kind: "Block",
      statements: ctx.ProjectEach(raw, "Block"),
      pos: braceAt,
      end: braceEnd >= 0 ? braceEnd : ctx.EndOf(v),
    };
  } else {
    const flat: any[] = [];
    for (const k of raw) {
      if (k.Tag() === "Statement") {
        for (const x of ctx.UnwrapNodes(k)) flat.push(x);
        continue;
      }
      flat.push(k);
    }
    const projected = ctx.Expression(flat);
    if (projected !== undefined) props.body = projected;
  }
  return ctx.NodeHead("ArrowFunction", props, v);
```

## field IsAsync:bool = false

这个 lambda 前面是不是有 `async`。纯数据字段，没有访问器。

## field BodyBrace:TokenField<number> = new TokenField<number>(-1)

**体是花括号块时，那一对花括号的起点（`Value`）与整段（`Range`）**；体是表达式时未记过。

**为什么让 token 记着**（用户口径：token 出字段、投影直读）：`LamdaCloseRule.Process`
在 `next instanceof Bracket && next.startBracket === "{"` 那一支里**括号就在手上**
（`next.SourceRange`）⇒ 当场把**两端**都记下来。投影原来回原文里找
（`arrowAt + 2` 起跳空白看第一个字符），`() => /* c */ { }` 会撞上注释的 `/`
⇒ 判成表达式体 ⇒ 整个 `Block` 丢。

**第 647 轮从「只有起点」（`BodyBraceAt:int`）换成了 `TokenField`**（与
`While.BodyBrace` / `For.BodyBrace` / `IfSegment.BodyBrace` / `Try.TryBrace` **同一条口径**）：
投影画那个 `Block` 时**右端也读这一格**——原来写的是 `ctx.EndOf(v)`，
那背后是「**本单元的终点恰好是那个 `}`**」这个没被记下来的约定
（它今天成立，可它是一处**隐含前提**，而不是一条事实）。

## field ArrowAt:int = -1

**那个 `=>` 的下标**（第 621 轮）。

**为什么让 token 记着**（用户口径：token 出字段、投影直读）：`LamdaCloseRule.Process`
就是被 `=>` 触发的那一格（`Get(units, index)` 正是它）⇒ 当场记下来。
投影原来用 `indexOf("=>", 最后一个形参的终点)` **回原文里找**——那是**第二份位置答案**
（`(a: number) /* => */ => a` 会命中注释里那个箭头）。

## constructor:(Template:Template)=>void

转调基类构造器（体是空的）。

```ts
super(Template);
```

## method CreateParameters:()=>LamdaParameters

造一个 `LamdaParameters` 作为自己的子单元并返回它。

`Add` 返回加进去的那个单元，所以这里直接返回。

```ts
return this.Add(new LamdaParameters(this.Template));
```

## property bodyBraceRange:string

**体那一对花括号的整段区间**（闭区间，`"起,止"`）：投影画空 `Block` 时直读它，不再回原文重扫。
段还没挂上或两头不齐时给空串——与搬掉字典之前「那一格不写这个键」同义（投影按空串处理）。

### get

```ts
const braceRange = this.BodyBrace.Range;
if (braceRange === null || braceRange.Start === null || braceRange.End === null) {
  return "";
}
return braceRange.Start.Index + "," + braceRange.End.Index;
```

## property children:Array<Token>

**这一页没有扁平的 `children`**：子单元是**具名分段**（`compare` / `body` / `segments` …），
段边界就是结构本身，摊成一条列表会把它抹掉——与搬掉字典之前「这一页不写 `children` 键」同义。

### get

```ts
return [];
```

## property Parameters:LamdaParameters

参数列表：子单元里第一个 `LamdaParameters`。

### get

`Array.find` 找不到给 `undefined`，这里直接断言成 `LamdaParameters`。

```ts
return this.Data.find((x) => x instanceof LamdaParameters) as LamdaParameters;
```

## method ComputeParametersCount:()=>int

形参个数。

`Dawn/Steper` 的 `StepInferenceUtil` 用它匹配委托参数；执行层不在本规范范围内。

```ts
return this.Parameters.Data.length;
```

## method CreateReturnType:()=>ReturnType

造一个 `ReturnType` 作为自己的子单元并返回它。

**箭头函数的返回类型标注必须自成一段**：`(a: A): T => body` 里的 `: T` 若与体同级，
贪婪的 `TypeDefine` 会连函数体一起吞掉——这与 `Function` / `MethodDeclaration` 是同一个问题。
它也是本规则必须排在 `TypeDefine` **之前**的原因（见 `../parse-pipeline.xl.md` 的队列顺序）。

```ts
return this.Add(new ReturnType(this.Template));
```

## property ReturnType:ReturnType | null

返回类型段：子单元里第一个 `ReturnType`；没有标注时给 `null`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof ReturnType) {
    return item;
  }
}
return null;
```

## method CreateBody:()=>LamdaBody

造一个 `LamdaBody` 作为自己的子单元并返回它。

```ts
return this.Add(new LamdaBody(this.Template));
```

## property Body:LamdaBody

体：子单元里第一个 `LamdaBody`。

### get

```ts
return this.Data.find((x) => x instanceof LamdaBody) as LamdaBody;
```

## property async:bool

`ToDictionary` 的 `async` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.IsAsync;
```

## property bodyBraceAt:int

`ToDictionary` 的 `bodyBraceAt` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.BodyBrace.File();
```

## property arrowAt:int

`ToDictionary` 的 `arrowAt` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.ArrowAt;
```

## property parameters:Array<Token>

`ToDictionary` 的 `parameters` 键**由这一页自己承担**（第 1018 轮）：值取那一批子单元的节点数据。

### get

```ts
return this.ChildrenOf(this.Parameters);
```

## property body:Array<Token>

`ToDictionary` 的 `body` 键**由这一页自己承担**（第 1018 轮）：值取那一批子单元的节点数据。

### get

```ts
return this.ChildrenOf(this.Body);
```

## property returnType:Array<Token>

`ToDictionary` 的 `returnType` 键**由这一页自己承担**（第 1018 轮）：值取那一批子单元的节点数据。

### get

**`!` 是这一格的调用约定**：本页 `ToDictionary` 只在 `ReturnType !== null` 时才写这个键，
读到这一格时它一定在；没有返回类型标注由**不写这个键**表达。

```ts
return this.ChildrenOf(this.ReturnType);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 拷 `IsAsync` / `BodyBrace` / `ArrowAt` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new Lamda(this.Template);
result.Sign(this);
result.IsAsync = this.IsAsync;
result.BodyBrace = this.BodyBrace;
result.ArrowAt = this.ArrowAt;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
