# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { SyntaxException } from "../../../core/exceptions/syntax-exception.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol, IsAnnotationUnit, IsTemplateString, SkipNextTrivia, SkipNextWrapSymbol, SkipPreviousTrivia } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Class } from "../class/class.xl.md"
import { Function } from "../function/function.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { Identifier } from "../identifier.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
import { NewArguments } from "./new-arguments.xl.md"
import { NewType } from "./new-type.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`new` 表达式：把 `new Foo(a, b)` 这一串单元重组成一个 `New`，里面分成 Type（`Foo`）与 Arguments（`(a, b)` 的内容）两段。

收尾规则类 `NewCloseRule` **不进 `Data`、不进 XML**，所以它的类名随便取。反过来，`New` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。

# class NewCloseRule extends CloseRule

收尾规则：一个内容为 `new` 的 `Identifier`，连同它后面第一个 `Bracket` 之前的所有类型信息、以及那个括号，整段换成一个 `New`。

## static readonly field Instance:NewCloseRule = new NewCloseRule()

唯一的实例。

## method IsClosedBracket:(unit:Token | null)=>bool

`unit` 是不是一个**已经收好的方括号**（`[ … ]` 整段是一个单元）。

**这一格是「下标段到哪结束」的全部依据**（第 946 轮）：括号由 `BracketBranch` **自己成组**，
所以 `[` 开头的单元有两种完全不同的处境——

- **已经收好**（`Closed` 为真，`endBracket` 是 `]`）：它自己就是完整的一段下标，
  段尾就在它后面那一格；
- **还没收**（`Start` 有值、`End` 是 `null`）：我们**在这个下标里面**（外层那一对还没关闭），
  往后走只会撞见它的内容与那个裸 `]` —— 那不是下一段下标。

**为什么不能靠「沿列表找 `]`」**（第一版那么写，实测错）：内层括号在自己成形时
**已经把 `]` 吃掉了**，列表里根本没有那个符号；于是深度永远减不到 0、函数一路走到列表末尾
（实测 `new ns[a]()` 的 `runEnd` 给出 6 而不是 5 —— `[a]` 只有一格，后面那一格是实参表）。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof Bracket) {
  return unit.startBracket === "[" && unit.Closed === true;
}
return false;
```

## method PostfixIndexRunEnd:(units:Array<Token>, index:int)=>int

从 `index`（一个 `[` 括号）起，跨过**一整段后置下标**，返回接在它**后面**那一格的下标。

每一步都是「下一格是不是又是一个**收好的** `[ … ]`」：是就跨过去（`ns[a][b]` 的两段），
不是就停下。撞见一个**还没收的** `[` 也停下——那种时刻我们正在它里面，
再往右走的是它的内容，不是同级的下一段。

**它只回答「这一段到哪结束」**，不回答「这一段归谁」——归谁由 `Process` 里那条
「这一段下标收好了没有」决定（第 947 轮起：收好了就整段归被构造者，见 `Process`）。

```ts
let at = index;
let guard = 0;
while (guard < 64) {
  guard = guard + 1;
  const current = Get(units, at);
  if (this.IsClosedBracket(current) === false) {
    return at;
  }
  at = at + 1;
}
return at;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：一个内容为 `new` 的 `Identifier`，**并且后面紧跟一个类型名**（`Identifier`）。
后面有没有括号由 `Process` 负责检查。

判定里多加了「后面紧跟类型名」这一条。原因：TypeScript 的类型位置里有
**构造签名** `new () => T`（`lib.es5.d.ts` 的 `Function.apply` / `CallableFunction` 里就有），
那里 `new` 后面直接跟括号，没有类型名。只认 `new` 这个词会一口认下，随后 `Process` 找不到「类型名」
就抛 `SyntaxException`——整个文件解析失败。加上这一条，`new () => T` 不再进这条规则，
`new` 与那对括号原样留在树里（它们属于类型层，等类型层那一轮再处理）。
合法的 `new Foo(a)` / `new ns.Foo<T>(a)` 都仍然命中：类型名分别是 `Foo` / `ns`。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier) || !current.Is("new")) {
  return false;
}
const nextIndex = SkipNextTrivia(units, index);
const next = Get(units, nextIndex);
if (next instanceof Bracket) {
  if (next.startBracket !== "(") {
    return false;
  }
  const afterBracket = Get(units, SkipNextTrivia(units, nextIndex));
  if (afterBracket instanceof SymbolToken && afterBracket.Is("=>")) {
    return false;
  }
  return true;
}
// **`new` 后面紧跟一个匿名 `class` / `function` 单元也算**（第 939 轮）：
// `new class { m() {} }()` / `new function () {}()` 在 TS 那边是
// `NewExpression > ClassExpression`（`FunctionExpression`）——被构造者是一个**表达式**，
// 不是类型名。它此刻已经成形（解析期把 `class` … `}` 收成了一个 `Class` 单元），
// 所以这里看得到的是**单元**而不是裸词 —— 与「括号里的被构造者」是同一件事的两种排版。
// 少了这一支：`new` 留在树里当 `Keyword`、类另起一格、末尾那对括号成了对它的又一次调用
// （实测 `gap-r938-new-anonymous-class.ts`：缺 `NewExpression` / `ClassExpression` /
// `MethodDeclaration` / `Identifier(m)` / `Block` 共 5、多 2）。
if (next !== null && (next instanceof Class || next instanceof Function)) {
  return true;
}
return next instanceof Identifier;
```

**`new` 与类型名之间的注释要跳过去**（第 631 轮）：`new /* c */ A()` 里紧接着 `new` 的是
那条 `AreaAnnotation`——只跳软换行时它在判定这一步就把形状打断了，`new` 留在树里当 `Keyword`
（判据 `cm-new-paren`）。注释是 trivia，与软换行同一条口径：`SkipNextTrivia` 两样都跳。

**`(` 括号那一支是给「括号里的被构造者」的**：`new (class {})()` / `new (getCtor())()`——
被构造的表达式可以先用括号包起来。不认这一支时 `new` 留在树里、拿不到 `New` 节点。

**但类型位的构造签名 `new (a: number) => A` 要留在门外**（它属于类型层，标签表里没有 `New` 的位置）：
判据是括号后面紧跟 `=>`。少了这一条，`lib.es5.d.ts` 里满地的构造签名会被收成 `New` 表达式
（`type-fn-new` 那条用例当场报出来）。

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：从 `index` 起向后找类型名与可选的实参括号，整段换成一个 `New`，**返回新的下标**。

重组把多个子单元换成一个，下标必须跟着走。

几处行为：

- **实参括号是可选的**：TypeScript 里 `new A` / `new A<T>` / `new a.b.C` 都合法（没有实参表）。
  所以扫描不是「找第一个括号」，而是「往前走到边界」：遇到圆括号就收实参，
  **遇到方括号就停但不收**（第 937 轮：`new ns` 换行 `[a]()` 的 `[` 是跨行下标访问，不是实参表），
  遇到软换行 / `;` / `,` / `.` 以外的符号就停——不然 `new A` 会把下一条语句的括号当成自己的实参表（
  `const b = new A` 换行 `const c = new B()` 就是一个真实的反例）。
- 有括号时括号本身也在这段范围内，`result` 的 `SignOut` 取的是**括号的终点**；
  没有括号时取类型名的终点，`NewArguments` 是一个空段（标签仍在，形状与 `new A()` 对齐）。
- `bracket.MoveDataTo(newArguments)` 把括号内容整体搬走，括号随后就不在单元列表里了（它被 `ReplaceCountAt` 换掉）。
- **`new` 后面紧跟一个 `(` 括号时，那个括号是「被构造者」**（`new (class {})()` / `new (getCtor())()`），
  它进 `NewType` 段，实参括号是它**后面**那一个。所以扫描先跳过它一格再找实参括号。
- 一个类型单元都没有时（`new` 后面直接是换行之类）抛 `SyntaxException`。

```ts
const current = Get(units, index) as Identifier;
// **扫描也要跳 trivia**（第 631 轮）：与 `Previous` 同一处口径。跳的是注释与软换行，
// 但**注释仍留在 `NewType` 里**（它们落在被替换的那一段里，不显式收下就等于删掉，
// 与 `Foreach` 的 `CommentsIn` 同一个理由；软换行照旧丢掉）。
const calleeIndex = SkipNextTrivia(units, index);
let i = calleeIndex;
let bracketIndex = -1;
const callee = Get(units, i);
if (callee instanceof Bracket && callee.startBracket === "(") {
  i = SkipNextTrivia(units, i);
}
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof Bracket) {
    // **`[` 那一格也要记下来**（第 937 轮）：扫描在 `(` **与 `[`** 两处都停，
    // 但只有 `(` 是实参表；`[` 是**跨行的下标访问**（`new ns` 换行 `[a]()` 在 TS 那边是
    // `NewExpression > ElementAccessExpression`）。不记它，`bracketIndex` 就停在 `-1`、
    // 类型段的终点算到 `ns` 为止 ⇒ 下标括号留在外面被挂成对 `(new ns)` 的又一次下标 + 调用
    //（实测 `new-member-callee-newline.ts` 末两档：缺 `ElementAccessExpression` 1、漂 1、多 3）。
    // 记下来之后，下面那一段按 `startBracket` 分岔：`(` 照旧搬进 `NewArguments`，
    // `[` 只借它的**前一格**当类型段的终点（括号自己留给 `PropertyAccessCloseRule`）。
    //
    // **整段下标都属于被构造者**（第 947 轮把这一格一次认清）：
    //
    //     new ns[a]       → NewExpression(expression: ElementAccessExpression(ns, a))
    //     new ns[a]()     → NewExpression(expression: ElementAccessExpression(ns, a), arguments: [])
    //     new ns[a].b     → NewExpression > PropertyAccessExpression > ElementAccessExpression
    //     new ns[a][b]()  → NewExpression > ElementAccessExpression > ElementAccessExpression
    //     new ns[a]`t`    → NewExpression > TaggedTemplateExpression > ElementAccessExpression
    //
    // 也就是 TS 的 `parseMemberExpressionOrHigher` **先整段取「构造者」**
    //（`.成员` 与 `下标` 一起贪心走完、换行也不让路），**再看末尾是不是 `(`**——
    // 有没有那对实参括号只决定 `arguments` 挂不挂，**不决定下标归谁**。
    //
    // **第 946 轮那一支的判据是反的**（这一轮实测推翻，如实记）：它按「后面接不接得上
    // `(` / `.` / `[` / 模板」分岔，而 `const a = new A` 换行 `[1]();` 在 TS 那边是
    // **一条** `NewExpression`（`expression` 是 `ElementAccessExpression(A, 1)`），
    // 不是那一轮记的「两个 `NewExpression` / `CallExpression`」——`[` 前面那个换行
    // 挡不住成员访问，`new A` 后面那个**分号**才挡得住（`const a = new A;` 换行 `[1]();`
    // 是语句边界，那一条由上面的 `break` 管）。
    // 于是少收的那一格（`new ns[a]` 单独出现、后面什么都没接）与已经收掉的四格
    // 变成**同一格**：判据只剩「这一段下标**收好了**没有」——
    // 收好了（`IsClosedBracket`）就整段跨过去，让它落进 `NewType`。
    if (item.startBracket === "[") {
      const indexRunEnd = this.PostfixIndexRunEnd(units, i);
      if (indexRunEnd > i) {
        i = indexRunEnd;
        continue;
      }
    }
    bracketIndex = i;
    break;
  }
  if (item instanceof LineWrap) {
    // **换行后面紧跟类型实参段时，换行不是边界**（第 905 轮）：`new A` 换行 `<B>()`
    // 在 TS 那边是**一条** `NewExpression`（`new` 的类型实参表可以另起一行——
    // 那里没有受限产生式）。断在换行处会把 `<B>()` 留在外面（实测
    // `gap-r902-new-typeargs-newline`：漂 4 多 7）。
    //
    // **判据是「下一格是不是已经成形的 `GenericType`」**：`<B>` 在跳转那一趟
    // 就挂成了 `GenericType`（名字闸往回看时软换行是透明单元），所以这里看到的是一个
    // **单元**、不是裸的 `<` 符号。这一点很重要——只看「下一个字符是 `<`」会把
    // `new A` 换行 `< B` 这种比较链也并进来；`GenericType` 只在那四道闸门全过时才成形。
    //
    // **与 `const b = new A` 换行 `const c = new B()` 那个反例不冲突**：那一行的下一格是
    // `const`（既不是括号也不是 `GenericType`），照旧走到 `break`。
    if (Get(units, SkipNextTrivia(units, i)) instanceof GenericType) {
      i = i + 1;
      continue;
    }
    // **换行后面紧跟实参表时也不是边界**（第 931 轮）：`new Error` 换行 `("x")` 与
    // `new C<T>` 换行 `(x)` 在 TS 那边都是**一条** `NewExpression`——实参表可以另起一行
    //（TS 的 parser 只问「紧跟在这一格后面的是不是 `(`」，从不看中间有没有换行；
    // 实测 `gap-r931-new-arguments-newline`：漂 1 多 2，那对括号被折成了
    // 对刚收好的 `NewExpression` 的又一次调用）。
    //
    // **与上面那个反例同样不冲突**：`const b = new A` 换行 `const c = new B()` 的下一格是
    // `const`（一个 `Identifier`，不是括号），照旧 `break`；
    // 而 `new A` 换行 `(x)` 在 TS 里**就是** `new A(x)`。
    const afterWrap = Get(units, SkipNextTrivia(units, i));
    if (afterWrap instanceof Bracket && afterWrap.startBracket === "(") {
      i = i + 1;
      continue;
    }
    // **换行后面紧跟成员访问的延续时也不是边界**（第 937 轮）：`new ns` 换行 `.C()`
    // 与 `new ns` 换行 `[a]()` 在 TS 那边都是**一条** `NewExpression`——被构造者是一段
    // **跨行的成员链**（TS 的 `parseMemberExpressionRest` 只在**同一行**上因换行让路；
    // `.` 与 `[` 落在换行之后照样接着走）。断在换行处只把 `new ns` 折成一条
    // `NewExpression`，`.` / `[` 随后被 `PropertyAccessCloseRule` 挂到它**外面**、
    // 末尾那对括号又成了对刚收好的 `NewExpression` 的又一次调用
    //（实测 `new-member-callee-newline.ts`：`new ns` 换行 `.C()` 缺 1 漂 1 多 3，
    //  `new ns` 换行 `[a]()` 缺 `ElementAccessExpression` 1、漂 1、多 3）。
    //
    // **判据是「跳过 trivia 之后那一格是 `.` 或 `[`」**，与上面两支同一处口径。
    // **与 `new A` 换行 `const c = …` 那个反例不冲突**：那里跳过 trivia 之后是 `const`
    // （一个 `Identifier`），三支都不成立，照旧 `break`。
    if (
      afterWrap !== null &&
      ((afterWrap instanceof SymbolToken && afterWrap.Is(".")) ||
        (afterWrap instanceof Bracket && afterWrap.startBracket === "["))
    ) {
      i = i + 1;
      continue;
    }
    // **换行后面紧跟模板串时也不是边界**（第 947 轮）：`new A[0]` 换行 `` `t` `` 在 TS 那边是
    // **一条** `NewExpression`（`expression` 是 `TaggedTemplateExpression(A[0], `t`)`）——
    // 换行挡不住成员访问，也挡不住紧随其后的模板串（`` tag `` 换行 `` `t` `` 就是一次标签调用，
    // 实测 `const v = new A` 换行 `` `t` `` 是一条 `NewExpression`）。少了这一支，扫描停在
    // 换行上 ⇒ 模板留在 `New` 外面 ⇒ 投出来是 `NewExpression` 再挂一个模板单元
    //（实测 `tmp/r947/gate-sweep.mjs` 那 4 条：缺 2 漂 1 多 1 / 缺 6 漂 1 多 1）。
    //
    // **判据要判到反引号上**（`IsTemplateString`，不是 `StartsWithTemplate`）：
    // `const v = new A` 换行 `"x";` 在 TS 那边是**两条语句**（下一格接不上 ⇒ ASI 插分号，实测），
    // 只看类名会把那个普通字符串并进被构造者。
    //
    // **与 `new A` 换行 `const c = …` 那个反例不冲突**：那里跨完 trivia 撞上的是 `const`。
    if (IsTemplateString(afterWrap)) {
      i = i + 1;
      continue;
    }
    // **`.` 之后的那些 trivia 也不是边界**（第 937 轮）：`new ns.` 换行 `C()`、
    // `new ns. // x` 换行 `C()` 里换行落在**点号与名字之间**——点号在上一格已经收下了，
    // 而 `new ns.` 不是一条能独立成立的表达式（TS 的成员访问里 `.` 与后面的名字之间
    // 可以有换行与注释），所以这里没有「语句到此为止」这一说。少了这一支，扫描停在
    // 换行上 ⇒ 类型段的终点算到点号为止（实测 `new ns.` 换行 `C()` 缺
    // `PropertyAccessExpression` 1 + `Identifier` 1、多 1；行注释那一档 `new ns.` 换行
    // `// x` 换行 `C()` 是同一格）。
    //
    // **「上一个实义单元」要跨过注释**：`new ns. // x` 里点号与换行之间还夹着一条
    // `LineAnnotation`，只看紧挨着的前一格会停在它上面 ⇒ 判据落空。这里问的是
    // 「这一格左边的**实义**单元是不是点号」，与 `SkipNextTrivia` /
    // `SkipPreviousTrivia` 一族同一处口径。
    //
    // **与 `new A` 换行 `const …` 那个反例不冲突**：那里跨完 trivia 撞上的是名字、
    // 不是点号。
    const beforeWrap = Get(units, SkipPreviousTrivia(units, i));
    if (beforeWrap !== null && beforeWrap instanceof SymbolToken && beforeWrap.Is(".")) {
      i = i + 1;
      continue;
    }
    break;
  }
  if (IsAnnotationUnit(item)) {
    i = i + 1;
    continue;
  }
  // **匿名 `class` / `function` 就是被构造者本身**（第 939 轮）：`new class { m() {} }()`
  // 在 TS 那边是 `NewExpression > ClassExpression`（`function` 那一档同理）——
  // 被构造者是一个**表达式**，它的类型段就是它自己，末尾那对括号才是实参表。
  // 这里只是把这一格标明「它算类型段的内容」（与 `Identifier` 走同一条路：往下 `i++`），
  // 括号在下一轮被收进 `bracketIndex`。少了它，`new class { … }` 整段会被
  // `Previous` 挡在门外 ⇒ `new` 留成裸 `Keyword`、类另起一格（实测 `gap-r938-new-anonymous-class.ts`）。
  if (item instanceof Class || item instanceof Function) {
    i = i + 1;
    continue;
  }
  // **非空断言 `!` 也属于被构造者**（第 982 轮）：`new a!.b()` / `new a!()` / `new a!`
  // 在 TS 那边被构造者是 `NonNullExpression(a!)`（外层仍是 `NewExpression`，区间包住整个 `!`）——
  // `!` 是与 `.` / `[` 同一族的**后缀**，跟着左边的操作数走，不另起一个操作数。
  // 少了这一格，扫描停在 `!` 上 ⇒ `New` 只盖到 `a`，而 `!` 留在外面把**整条 `new a`**
  // 包成 `NotNull`，投出来是 `PropertyAccess(NonNull(NewExpression(a)), b)`——
  // 差在被构造者是谁（实测 `const r = new a!.b();`：缺 `PropertyAccessExpression` +
  // `NonNullExpression` 各 1、漂 1、多 4）。
  //
  // **与 `new a ++` 同一条口径**：TS 那边 `new a ++` 是 `Pending` 的
  // `PostfixUnaryExpression(NewExpression(a))`、`new a++ .b` 报「',' expected」——
  // `++` / `--` 不跟着左边的操作数收进来（`new` 被构造者那一趟到 `a` 就收手），
  // 所以这里**只补 `!`**，别的符号照旧 `break`。
  if (item instanceof SymbolToken && item.Is(".") === false && item.Is("!") === false) {
    break;
  }
  i = i + 1;
}
// **跨过去的软换行不算类型段的尾巴**（第 931 轮）：`new C<T>` 换行 `(x)` 里那个换行
// 正好落在类型实参段与实参表之间，`bracketIndex - 1` 停在它上面 ⇒ 类型段的终点会算到
// 换行末尾（`newType.SignOut` 取的就是 `Get(units, typeEnd)` 的终点）。
// 只往回跳软换行，注释照旧留在类型段里（第 631 轮那条口径不动）——
// `[` 那一侧同样只看软换行：它与 `(` 的区别只在「括号归谁」，类型段的终点是同一件事。
let typeEnd = bracketIndex === -1 ? i - 1 : bracketIndex - 1;
while (typeEnd > index && Get(units, typeEnd) instanceof LineWrap) {
  typeEnd = typeEnd - 1;
}
if (typeEnd < index + 1) {
  throw SyntaxException.FromMessage(current.SourceRange, "new 后面没有找到类型名");
}
const result = new New(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
const newType = result.CreateType();
newType.SignIn(current.SourceRange.Start!);
for (let t = index + 1; t <= typeEnd; t++) {
  const item = Get(units, t)!;
  // **跨过的那个软换行不进 `NewType`**（第 905 轮）：扫描现在允许在
  // 「换行 + 类型实参段」处跨过去（见上面那一支），那格换行是排版、不属于类型名。
  if (item instanceof LineWrap) {
    continue;
  }
  newType.Add(item);
}
newType.SignOut(Get(units, typeEnd)!.SourceRange.End!);
const newArguments = result.CreateArguments();
if (bracketIndex === -1) {
  newArguments.SignIn(Get(units, typeEnd)!.SourceRange.End!);
  newArguments.SignOut(Get(units, typeEnd)!.SourceRange.End!);
  result.SignOut(Get(units, typeEnd)!.SourceRange.End!);
} else {
  const bracket = Get(units, bracketIndex) as Bracket;
  // **`[` 那一格从来不是实参表**（第 937 轮）：**收好了**的 `[` 在上面那一支就整段
  // 跨过去了（第 947 轮），落到这里的只有「我们此刻正在这个下标里面」那一档
  // （`IsClosedBracket` 为假、`PostfixIndexRunEnd` 停在原地）——它当然不是实参表。
  // 这一支过去一律把落点当实参表——`new ns` 换行 `[a]()` 于是把下标括号整个
  // 搬进了 `NewArguments`（实测缺 `ElementAccessExpression` 1、漂 1、多 3）。
  // 下标括号应当与 `.` 走同一条路：**留在单元列表上**，随后由 `PropertyAccessCloseRule`
  // 折成元素访问，再被末尾那对实参括号调用。
  if (bracket.startBracket === "[") {
    newArguments.SignIn(Get(units, typeEnd)!.SourceRange.End!);
    newArguments.SignOut(Get(units, typeEnd)!.SourceRange.End!);
    result.SignOut(Get(units, typeEnd)!.SourceRange.End!);
  } else {
    newArguments.SignIn(bracket.SourceRange.Start!);
    newArguments.SignOut(bracket.SourceRange.End!);
    bracket.MoveDataTo(newArguments);
    result.SignOut(bracket.SourceRange.End!);
  }
}
newType.TryToClose();
newArguments.TryToClose();
result.TryToClose();
// **收掉这一段的终点也跟着分岔**（与上一段同一件事）：落在 `bracketIndex` 上的 `[`
// 是**没收好**的那一档，它不在 `New` 里面——但那一档本来就不该在这里出现
// （收好的 `[` 已经由上面那一支跨过去、进 `NewType` 了，第 947 轮）。
//
// **但 `New` 与 `[` 之间那几格 trivia 也不进这一段**（第 937 轮试过一版把它们收进来，
// 没成）：收进来之后 `[` 确实能挂上链（`PropertyAccess[New, [a]]` 出来了），
// 可末尾那对 `()` 仍然停在 `Statement` 里没被折成 `Method`
// —— 剩下的那一步在 `MethodCloseRule` 与 `PropertyAccess` 的先后上，
// 不在这一段的区间里。按规矩把现状登记成 `gap-r937-new-index-callee-newline`。
let lastIndex = bracketIndex === -1 ? typeEnd : bracketIndex;
if (bracketIndex !== -1 && (Get(units, bracketIndex) as Bracket).startBracket === "[") {
  lastIndex = typeEnd;
}
return ReplaceCountAt(units, index, lastIndex - index + 1, result);
```

# class New extends IndependentToken

`new` 表达式单元。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<New>` 里依次是 Type 与 Arguments 两段的 XML。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `name` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["NewExpression", new Map([["name", "expression"]])]]);
```

## method PrintAst:(ctx:any, v:any)=>any

`new Map<string, number>()` → `NewExpression`（`expression` + 可选 `typeArguments` / `arguments`；
**从 `ts-ast.xl.md` 的 `projectNew` 搬来**，第 185 轮）。

产物的 `New` 把 `name` 段记成**一串单元**（被构造者 + 类型实参段）、`arguments` 段是实参：

- 类型实参段要按**类型位**投进 `typeArguments`（`Map<string, number>` 的两格是
  `StringKeyword` / `NumberKeyword`，不是 `TypeReference`）；
- 空实参段在 `ToList` 里**干脆不出现**（`new Map<A, B>()`），而 TS 那边空 `arguments`
  也不进字段（`forEachChild` 不访问空数组）——所以只在非空时挂。

**被构造者可能是一串**（第 154 轮）：`new a.b.C()` 的 `name` 段是
`[a, ., b, ., C]` 五格，只取第一格会只剩一个 `Identifier(a)`（实测 `ex-new-variants.ts`：
缺两层 `PropertyAccessExpression` + `Identifier` 2）。

**括号形态**（`new (getCtor())()`）要走 `ctx.ParenthesizedOf`——否则那个括号会原样透传成
未映射的 `<Bracket>`（实测 `ex-new-variants.ts` 与 `stmt-adversarial-shapes.ts` 各一处）。

```ts
  const nameUnits = ctx.KidsOf(v, "name").filter((k: any) => !ctx.Invisible.has(k.get("type")));
  // **`<…>` 归谁**（第 980 轮）：`` new f<T>`t` `` 的 `name` 段是
  // `[Identifier(f), GenericType(<T>), String(反引号)]`——那个 `<T>` 是**标签模板自己的**
  // 类型实参（TS：`NewExpression > TaggedTemplateExpression{ tag, typeArguments, template }`），
  // **不是** `NewExpression` 的 `typeArguments`。拿真 TS 复量过（`tmp-r979/ts-newfields.cjs`）：
  // `` new f<T>`t` `` / `` new f<T>`t`.b `` / `` new f<T>`t`(1) `` 三条的外层 `NewExpression`
  // **都只有 `expression`**，`typeArguments` 挂的是里面那一层。
  //
  // **判据**：紧跟 `GenericType` 的那一格是**反引号模板**时，这一段连同它后面的一起归
  // **被构造者**（`ctx.Expression` 那一趟会把它合成 `TaggedTemplateExpression`）；
  // 只有 `GenericType` 是 `name` 段**最后一个实义单元**时才是 `New` 自己的实参段
  //（`new Map<string, number>()` / `new C<T>` 换行 `(x)` 那一族）。
  // 引号那一问与 0b / 0c / 0d 同源：`IsTemplateString` 看的是**原文那个引号**
  //（产物里普通字符串与模板串属性一模一样）。
  const genericAt = nameUnits.findIndex((k: any) => k.get("type") === "GenericType");
  const templateAfterGeneric =
    genericAt >= 0 &&
    genericAt + 1 < nameUnits.length &&
    IsTemplateString(nameUnits[genericAt + 1].__token ?? null);
  const generic = genericAt >= 0 && !templateAfterGeneric ? nameUnits[genericAt] : undefined;
  const calleeUnits = nameUnits.filter((k: any) => k !== generic);
  const props: any = {};
  if (
    calleeUnits.length === 1 &&
    calleeUnits[0].get("type") === "Bracket" &&
    calleeUnits[0].get("startBracket") === "("
  ) {
    props.expression = ctx.ParenthesizedOf(calleeUnits[0]);
  } else if (calleeUnits.length > 0) {
    props.expression = ctx.Expression(calleeUnits);
  }
  if (generic !== undefined) {
    const typeArguments = [];
    for (const group of ctx.Split(ctx.Kids(generic), ",")) {
      const one = ctx.TypeExpression(group);
      if (one !== undefined) typeArguments.push(one);
    }
    if (typeArguments.length > 0) props.typeArguments = typeArguments;
  }
  const args = ctx.KidsOf(v, "arguments").filter((k: any) => !ctx.Invisible.has(k.get("type")));
  // **实参按顶层逗号切段、每段走 `ctx.Expression`**（第 232 轮）——**不能走 `ctx.ProjectEach`**：
  // 那个助手是**逐格**投的，而实参位有好几种「一个实参 = 好几格」的形状——
  // 最普通的是 **`as` / `satisfies`**（产物把 `x as T` 记成 `Identifier(x)` 与 `As(T)`
  // **两个平级单元**，左边那个操作数是它的**前一个兄弟**）。
  // 逐格投会把 `As` 单独投成一个 `AsExpression`、而它的 `expression` 是**空的**——
  // 实测现场：`new Object(null as any)` 报
  // `ast node AsExpression has no child expression`（一句话指向**投影**，
  // 而现场是 `arguments` 那一段的**投法**）。
  // **与 `projectCall` 的实参那一段同一个写法**（那里第 143 轮已经踩过同一类坑：
  // `h?.(o?.a)` 的括号里也是「基名与 `?.` 平级」）——**一处规矩写两遍会漂**，
  // 所以这里连注释一起照它对齐。
  const argGroups = ctx.Split(args, ",");
  const argumentList = [];
  for (const group of argGroups) {
    if (group.length === 0) continue;
    const one = ctx.Expression(group);
    if (one !== undefined) argumentList.push(one);
  }
  if (argumentList.length > 0) props.arguments = argumentList;
  return ctx.NodeHead("NewExpression", props, v);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 995 轮）：与上面的 `PrintAst` 出**同一个答案**，但只许用**这个 token 自己**的东西——
属性、子单元与 `Parent`（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。

**这一页本来就是「全字段」的**（`PrintAst` 里的每一问都读 `name` / `arguments` 两个段与子单元自己的东西），
所以直出版是**逐行同一份**：`ctx.KidsOf` / `ctx.Invisible` / `ctx.ParenthesizedOf` / `ctx.Expression` /
`ctx.Split` / `ctx.TypeExpression` / `ctx.NodeHead` 都是出口助手，没有一处回原文查。
唯一一处「判据落在 token 自己的字段上」的是 `IsTemplateString`——它读的是 `String.StringChar`
（那一格自己记着用哪个引号开头），不是原文里那个字符。

```ts
  const nameUnits = ctx.KidsOf(v, "name").filter((k: any) => !ctx.Invisible.has(k.Tag()));
  const genericAt = nameUnits.findIndex((k: any) => k.Tag() === "GenericType");
  const templateAfterGeneric =
    genericAt >= 0 &&
    genericAt + 1 < nameUnits.length &&
    IsTemplateString(nameUnits[genericAt + 1].__token ?? null);
  const generic = genericAt >= 0 && !templateAfterGeneric ? nameUnits[genericAt] : undefined;
  const calleeUnits = nameUnits.filter((k: any) => k !== generic);
  const props: any = {};
  if (
    calleeUnits.length === 1 &&
    calleeUnits[0].Tag() === "Bracket" &&
    calleeUnits[0].startBracket === "("
  ) {
    props.expression = ctx.ParenthesizedOf(calleeUnits[0]);
  } else if (calleeUnits.length > 0) {
    props.expression = ctx.Expression(calleeUnits);
  }
  if (generic !== undefined) {
    const typeArguments = [];
    for (const group of ctx.Split(ctx.Kids(generic), ",")) {
      const one = ctx.TypeExpression(group);
      if (one !== undefined) typeArguments.push(one);
    }
    if (typeArguments.length > 0) props.typeArguments = typeArguments;
  }
  const args = ctx.KidsOf(v, "arguments").filter((k: any) => !ctx.Invisible.has(k.Tag()));
  const argGroups = ctx.Split(args, ",");
  const argumentList = [];
  for (const group of argGroups) {
    if (group.length === 0) continue;
    const one = ctx.Expression(group);
    if (one !== undefined) argumentList.push(one);
  }
  if (argumentList.length > 0) props.arguments = argumentList;
  return ctx.NodeHead("NewExpression", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method CreateType:()=>NewType

新建 Type 段并挂到自己名下，返回新单元。

```ts
return this.Add(new NewType(this.Template));
```

## property Type:NewType

Type 段（被 `new` 的类型名，含命名空间与泛型实参）。

**注意与 `constructor` 区分**：这里的 `Type` 是成员名，与 `this.constructor` 无关。

### get

```ts
return this.Data.find((x) => x instanceof NewType) as NewType;
```

## method CreateArguments:()=>NewArguments

新建 Arguments 段并挂到自己名下，返回新单元。

```ts
return this.Add(new NewArguments(this.Template));
```

## property Arguments:NewArguments

Arguments 段（括号里的实参）。

### get

```ts
return this.Data.find((x) => x instanceof NewArguments) as NewArguments;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `name` / `arguments` 两个**具名分段**。

**`name` 装的是 `Type` 段**（被 `new` 的类型名），这不是写错：`type` 这个键已经被运行时类型名占了
（`result.set("type", this.constructor.name)`），所以这一段改用 `name`——与上游 Cangjie 的写法一致。

`arguments` 是实参段。两段都取 `ToList()`：它们各是**一批子单元**的容器，
摊成扁平的 `children` 会让「类型名到哪结束、实参从哪开始」这个边界消失
（`new A` 这类没有实参表的形状里 `arguments` 是空段，但它仍要作为一段出现在 JSON 里）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("name", this.Type.ToList());
result.set("arguments", this.Arguments.ToList());
return result;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new New(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
