# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { IsTypeBracketPosition, IsTypeContainerUnit, SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { Method } from "./method.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

成员访问链 `a.b.c`：把「一个操作数 + 若干个 `.` 成员名」整段收成一个 `PropertyAccess` 单元。

**为什么必须在 token 层折**（而不是留给投影层）：表达式层的那些规则
（`BinaryOperator` / `UnaryOperator` / `LogicalOperator` / `NotNull` / `Spread` / `CompoundAssignmentOperator` …）
判断操作数时只看**紧邻的那一个单元**。`x.y !== z` 在折链之前是这样一串平级单元：

```
Identifier(x)  SymbolToken(.)  Identifier(y)  SymbolToken(!==)  Identifier(z)
```

`!==` 那一趟向左右各取一格，于是拿到的是 `x` 与 `z`——
产物变成 `Identifier(x) . BinaryOperator(y !== z)`：**点号被劈开，链的两头各挂在一处**，
投影层再怎么拼也拼不回 TypeScript 的形状（那一半节点整片消失，实测真实语料
`PropertyAccessExpression` 缺 4071、`CallExpression` 缺 1263）。
折链之后运算符看到的是**一个完整的操作数**，`x.y` 与 `!== z` 各归各位。

**它与 `MethodCloseRule` / `NullConditionalOperatorCloseRule` 的分工**：

- `a.b(1)` 的 `b(1)` 先被 `MethodCloseRule` 收成 `Method`（本规则排在它之后），
  本规则再把 `[a, ., Method]` 收成一个 `PropertyAccess`——链尾是一次调用时**照收**，
  因为 `CjcliHost.Fs().readFileSync(p)` 这种「调用结果再取成员」的链必须整体成为一个操作数；
- `a?.b` 归 `NullConditionalOperatorCloseRule`。本规则**见到链尾紧跟着 `?.` 就让路**
  （`Previous` 里那一条）：那一支已经把它收成了 `NullConditionalOperator`，
  再折一次会把那个节点挤到外面去（投影层能拼回 `PropertyAccessExpression` 的区间，
  但 `NullConditionalOperator` 自己会掉出产物）。

**它与类型层的分工**：类型位的点号名（`A.B.C`、`NodeJS.TypedArray`）要留给投影层折
`QualifiedName`（TS 在类型位用的是 `QualifiedName`、在值位才是 `PropertyAccessExpression`），
所以本规则在**纯类型容器**（`IsTypeContainerUnit`）里一律不成立；
括号类型的内容（`(A.B)[]`）另有一条判据（`IsTypeBracketPosition`）——
括号的内容是在**括号关闭那一刻**重组的，那一刻它的父单元还是语句列表，
`IsTypeContainerUnit` 看不出它是类型，只有「这个括号自己那一格是不是类型位」问得出来。

`PropertyAccessCloseRule` 写在 `PropertyAccess` 之前。

# class PropertyAccessCloseRule extends CloseRule

## static readonly field Instance:PropertyAccessCloseRule = new PropertyAccessCloseRule()

唯一的实例。

## private method IsChainBase:(unit:Token | null)=>bool

`unit` 能不能当一条成员访问链的**起点**。

按类名认（不 import 那些类：`New` / `ArrayLiteral` 这些反过来（间接）依赖表达式层，
直接 import 会绕出循环依赖；`constructor.name` 就是 XML 标签名，判它等价于判类型）：

- `Identifier`：最普通的那一种。**要排掉语句关键字**（`return` / `throw` / … 在本规则跑的时候
  还是 `Identifier`）与 `import`——`import.meta` 归 `ImportCloseRule`，
  折成链会把那个 `Import` 节点挤没；
- `PropertyAccess`：折过一段的链继续往外折（`a.b(1).c` 的第二次）；
- `Method` / `New` / `ArrayLiteral` / `String` / `ConstString` / `RegexToken`：
  `f(1).x` / `new A().b` / `[1, 2].length` / `"ab".length` / `/x/.test` 都是合法写法；
- `Bracket`：只认**收尾括号**是 `)` / `]` 的那种（`(a + b).c` / `a[0].b`）——
  与 `binary-operator.xl.md` 的 `IsOperand` 同一条口径（`startBracket` 只会是 `(` / `{` / `[`，
  拿它判会永远为假，那一处注释里记过这个坑）。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof Identifier) {
  const text = unit.TempToString();
  if (
    text === "return" ||
    text === "throw" ||
    text === "case" ||
    text === "default" ||
    text === "else" ||
    text === "do" ||
    text === "break" ||
    text === "continue" ||
    text === "yield" ||
    text === "import" ||
    // **`new` 也不是链底**（第 538 轮）：`new.target` 不是「`new` 这个操作数的成员访问」，
    // 它在 TS 那边是 **`MetaProperty`**（`print-ast-common.xl.md` 的「0。`import.meta` /
    // `new.target`」那一支）——那一支要看到的是 `[Keyword(new), ., …]` 三格。
    // 折成链之后 `new` 被包进 `PropertyAccess` ⇒ 投影只能投出 `PropertyAccessExpression`
    // 并多一个 `Identifier(new)`（实测 `cls-super-newtarget.ts` 一族：缺 `MetaProperty` +
    // 多出 `PropertyAccessExpression` / `Identifier`）。
    // `import` 本来就在名单里，理由与它**同源**（`import.meta` 归另一条规则）。
    text === "new" ||
    // **声明词也不是链底**（第 533 轮，第 532 轮试出来的方向）：
    // `let` / `const` / `var` 开头的是一段**声明**，后面那对方括号是**解构模式**（`const [a] = …`），
    // 不是下标访问。**这三个词永远不是合法的链底**（`let.x` / `const[0]` / `var[0]` 在 JS 里
    // 本来就是语法错），所以这一条没有副作用。
    //
    // **少了它会怎样**（第 532 轮实测）：`const` 这时还是 `Identifier` ⇒ 链在这里起头
    // ⇒ `const [a = 1, b = a]` 被收成一个 `PropertyAccess` ⇒ 那段声明的形状全变
    //（`LetBranch` 再也认不出、`JsonArrayCloseRule` 也再也看不到那个 `[` ——
    //  它的上一个实义单元成了 `PropertyAccess`，正是 `IsArrayAt` 里「已经是操作数 ⇒ 只能是下标」
    //  那一条）。**这两件事是连锁的**：链一起头，解构括号就同时失去两种身份。
    text === "let" ||
    text === "const" ||
    text === "var"
  ) {
    return false;
  }
  return true;
}
if (unit instanceof Method) {
  return true;
}
if (unit instanceof Bracket) {
  return unit.endBracket === ")" || unit.endBracket === "]";
}
// **`NotNull` 也是链底，但在 `NullConditionalOperator` 里面不折**（第 592 轮）：
// `o?.a!.b` 的 `?.a!.b` 整段是 NCO 的 `Data`，里面的 `a ! . b` 折成
// `PropertyAccess[NotNull(a), ., b]` 之后，投影侧那条 NCO 支要的形状是
// 「`NotNull` 里面装着**名字**」（`print-ast-common.xl.md` 的 `a?.b!` 那一支）——
// 折成链会把它读成「一个成员名」 ⇒ `o?.a!.b` 静默给 `undefined`
//（实测 `c305-ex-optional-chain-nonnull-mix`：node 给 `1`）。NCO 里面的那一格照旧平级。
if (unit.constructor.name === "NotNull") {
  const holder:Token | null = unit.Parent;
  return !(holder !== null && holder.constructor.name === "NullConditionalOperator");
}
const name = unit.constructor.name;
return (
  name === "PropertyAccess" ||
  name === "New" ||
  name === "ArrayLiteral" ||
  name === "String" ||
  name === "ConstString" ||
  name === "RegexToken"
);
```

**`NotNull` 也是链底**（第 592 轮）：`!` 比链**晚**一步成形（`NotNullCloseRule` 排在后面），
收敛环会**再跑一整趟**——第二趟时 `[NotNull, ., b]` 已就位，整条收成一个 `PropertyAccess`。
链的内容与原来平级那三格**逐字节相同**（`ctx.Expression` 走的还是同一段折法），
变的是**产物形状**（`<PropertyAccess>` 里装着 `<NotNull>`）——投影侧那几条
「`NotNull` 接在链中间」的特判从此少了触发面。
**唯一的例外是 `NullConditionalOperator` 里面**（理由见上面那一格注释）。

## private method IsMemberUnit:(unit:Token | null)=>bool

`.` 后面那个单元能不能当**成员名**。

`Identifier` 是常态（`a.b`），`Method` 是「成员位置的一次调用」（`a.b(1)` 里那个 `Method` 盖住
`b(1)`）。`Keyword` 也要认：`KeywordCloseRule` 排在队列最后，
**第二趟**扫到这里时成员名可能已经被升级成 `Keyword` 了（`a.new` / `obj.class` 这类写法
在 TypeScript 里是合法的属性名）。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof Identifier || unit instanceof Method) {
  return true;
}
return unit.constructor.name === "Keyword";
```

## private method IsPrivateMark:(unit:Token | null)=>bool

`.` 后面那一格是不是**私有名的井号**（`this.#n` 里的 `#`）。

**为什么需要它**（第 205 轮）：产物把 `this.#n` 拆成**两格**——`SymbolToken(#)` 与名字
（与字段 / 方法声明那一处同一个形状，见 `field.xl.md`）。而 `IsMemberUnit` 不认 `#`，
于是链在 `this` 处就断了、`#` 与 `n` 掉成两格平级——接着**二元运算符只吞走了 `n`**
（`n + 1` 成一格、`#` 留在外面），投影投出来 `name` 的文本是 **`"#n + 1"`**
（区间从 `#` 一路到 `1`）。症状是 `this.#n + 1` 读成 `undefined`（JS 给 `8`）——
**静默错值**，第 205 轮的判据现场就是这么红的。
**括号一加就好**（`(this.#n) + 1`）——括号给了投影另一条路，这一条正好当反证。

```ts
if (unit === null) {
  return false;
}
return unit instanceof SymbolToken && unit.Is("#");
```

## private method IsIndexUnit:(unit:Token | null)=>bool

`unit` 是不是**下标访问的那对方括号**（`a[i]` 里的 `[i]`）。

判据只有 `startBracket === "["` 一条：**类型位**的 `[` 早被 `TypeBracketCloseRule`
收成 `ArrayType` / `TupleType` / `IndexedAccessType`（它排在队列很前面），
**值位里没有操作数**的 `[` 被 `JsonArrayCloseRule` 收成 `ArrayLiteral`——
轮到这个规则时，还留着的光秃秃 `[` 括号只可能是「前面有操作数的那个」。

**第 80 轮补**：链要能吞下标。这一条与 `IsChainBase` 里那句「`Bracket` 只认收尾括号是
`)` / `]` 的」是两件事——那句说的是**链底**可以是 `(a + b)` / `a[0]`，
这一条说的是**链尾**还能再挂一个 `[ … ]`。

```ts
if (unit === null) {
  return false;
}
return unit instanceof Bracket && unit.startBracket === "[";
```

## private method ChainEndIndex:(units:Array<Token>, index:int)=>int

从 `index`（链的起点）往后走，返回**链尾**那个单元的下标；走不动就给 `index` 自己。

每一步都是「跨过软换行取下一格」：要么是 `.` + 成员名，要么是**一个下标括号**。
`a` 换行 `.b` 在 TypeScript 里是一次成员访问（`.` 不可能当一条语句的开头，
所以这里跨换行是安全的）。

**链尾是 `Method` 时继续走**：`CjcliHost.Fs().readFileSync(p)` 的中间那次调用之后再取成员，
仍然属于同一条链——一次 `Process` 收完整条，后续那两条二元/一元规则才能看到完整的操作数。
（第一版在 `Method` 处 `break`，结果 `a.b(1).c.d` 被折成两个平级的 `PropertyAccess`，
投影层再也拼不回左结合的嵌套。）

**下标也是链的一环**（第 80 轮）：`a[i]` / `a[i].b` / `a[i][j].c` 都是一条链。
不吞下标的后果是**运算符会先把那个括号拿走**——`xs[0] + 1` 在产物里成了
`[Identifier(xs), BinaryOperator([0] + 1)]`（`+` 的左操作数是那个 `[0]` 括号，
`xs` 被留在外面），投影层再也拼不回关联：`ElementAccessExpression` 缺 292 处、
`BinaryExpression` 漂移 680 处里的一大块、以及 `Identifier` 缺 1851 里的一部分。

```ts
let current = index;
while (true) {
  const nextIndex = SkipNextWrapSymbol(units, current);
  if (this.IsIndexUnit(Get(units, nextIndex))) {
    current = nextIndex;
    continue;
  }
  // **`fn!()` 的调用括号**（第 592 轮）：`MethodCloseRule` 只认 `Identifier` 当被调用者，
  // 所以紧跟在一个 `NotNull` 之后的 `()` 从来没被折进 `Method`，一直是一格裸括号。
  // 不吞它的后果是**链从这里断** ⇒ `fn!().k` 在产物里是
  // `[NotNull(fn), PropertyAccess(Bracket(), ., k)]` ⇒ 投影把 `()` 当成链底
  // ⇒ TS 侧那三格（`CallExpression` / `PropertyAccessExpression` / `Identifier(k)`）整片消失
  //（`tests/parse/cases/expressions/zz-probe-nonnull-chain.ts` 实测缺 3）。
  // **只吞「紧跟在 `NotNull` 之后」的那一格**：`o["m"]()` 那一族的既有形状是
  // `[o, Bracket([m]), Bracket(())]`（三格平级、靠投影折），放开会换掉它。
  //
  // **还得看它后面接不接得上**：调用括号是**链的最后一格**时不能吞——
  // `b!()` 的既有形状是 `<Method name="">[NotNull(b, !), Bracket(空)]</Method>`
  // （`MethodCloseRule` 认那个 `NotNull` 当被调用者，投影里有一条**专门**处理它的支）。
  // 吞成 `PropertyAccess[NotNull, Bracket()]` 之后：`Method` 认不出被调用者
  // ⇒ 投影多出一个 `Identifier("")`（实测 `expr-nonnull-callee.ts` / `expr-optional-call-nodes.ts`
  // 各一处）。所以只有**后面还有链环**（`.` 成员或 `[` 下标）时才吞。
  const here = Get(units, current);
  const nextUnit = Get(units, nextIndex);
  if (
    nextUnit instanceof Bracket &&
    nextUnit.startBracket === "(" &&
    here !== null &&
    here.constructor.name === "NotNull"
  ) {
    const tail = Get(units, SkipNextWrapSymbol(units, nextIndex));
    const tailLinks =
      this.IsIndexUnit(tail) || (tail instanceof SymbolToken && tail.Is("."));
    if (tailLinks) {
      current = nextIndex;
      continue;
    }
    return current;
  }
  const dot = Get(units, nextIndex);
  if (!(dot instanceof SymbolToken) || !dot.Is(".")) {
    return current;
  }
  // **私有成员名是两格**（第 205 轮）：`.` 后面先是 `#`、再是名字——**两格都要进链**
  //（少进一格就是 `IsPrivateMark` 那段写的静默错值：`#` 留在链外、
  //  二元运算符把名字单独吞走，`this.#n + 1` 的 `name` 于是成了 `"#n + 1"`）。
  // **`#` 后面不是成员名时不留步**（原样 `return current`）——`#` 也能开别的构造，
  // 链规则不该把它一并吃掉。
  const afterDot = SkipNextWrapSymbol(units, nextIndex);
  if (this.IsPrivateMark(Get(units, afterDot))) {
    const namedIndex = SkipNextWrapSymbol(units, afterDot);
    if (this.IsMemberUnit(Get(units, namedIndex))) {
      current = namedIndex;
      continue;
    }
    return current;
  }
  const memberIndex = SkipNextWrapSymbol(units, nextIndex);
  if (this.IsMemberUnit(Get(units, memberIndex)) === false) {
    return current;
  }
  current = memberIndex;
}
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点。

三道闸：起点能当链底（`IsChainBase`）、后面确实跟着 `.` + 成员名（`ChainEndIndex` 走出去了）、
以及三处**让路**判据。让路判据都要在**走出链尾之后**才判（链尾之后那个单元才是「链的下文」）：

1. **纯类型容器里不让路**——父亲是 `TypeDefine` / `GenericType` / `UnionType` …（`IsTypeContainerUnit`）
   时一律不成立。类型位的点号名归投影层的 `QualifiedName`；
2. **括号类型的内容让路**——父亲是括号、而这个括号自己那一格处在类型位
   （`IsTypeBracketPosition`）时不让。括号的内容在关闭那一刻就重组完了，
   那时它的祖父还不是 `ParenthesizedType`，第 1 条盖不住它（`(A.B)[]` 就是这个形状）；
3. **链尾之后紧跟 `?.` 时让路**——那一支归 `NullConditionalOperatorCloseRule`。

`NewType` / `HeritageClause` / `ExpressionWithTypeArguments` / `Decorator` 里也让路：
那几处的点号名各有自己的规则与投影路径（`new ns.Cls()` 的名字段、`extends A.B` 的
`ExpressionWithTypeArguments`），折成 `PropertyAccess` 会把它们的内容换一种形状，
与既有投影对不上。这一轮**不动它们**，先让值位的链全部成形。

```ts
const base = Get(units, index);
if (this.IsChainBase(base) === false) {
  return false;
}
// **`fn!()` 那一格要等下一趟**（第 592 轮）：链底若是 `(` 括号、而它**前面紧挨着 `!`**，
// 那个 `!` 这一趟还没收成 `NotNull`（`NotNullCloseRule` 排在本规则之后）。
// 这一趟就把 `()` 折成链底 ⇒ 产物定型成 `[NotNull(fn), PropertyAccess(Bracket(), ., k)]`
// ⇒ 断言与调用分成两截、投影侧那三格整片消失（`fn!().k` 实测缺 3）。
// 让路之后下一趟 `NotNull` 自己当链底、`ChainEndIndex` 把那个 `(` 吞进来。
//
// **但那个 `!` 必须是「非空断言」那一个**：前缀取反后面也常跟一对括号
// （`!(current as SymbolToken).Is("!")`）。判据用 `IsChainBase` 问**断言者**那一格——
// 它与 `NotNullCloseRule.Previous` 认的是同一族操作数（并且顺带排掉 `return` 这类语句关键字）。
// 少了这一问，前缀取反那一格会让路 ⇒ 一元运算符先把 `!` 与括号折成一个单元
// ⇒ 后面的 `.Is(…)` 再也接不上（实测 `dist/ts/typescript/tokens/not-null.ts`：漂 3 + 多 3）。
if (base instanceof Bracket && base.startBracket === "(") {
  const bangIndex = SkipPreviousWrapSymbol(units, index);
  const before = Get(units, bangIndex);
  if (before instanceof SymbolToken && before.Is("!")) {
    const asserted = Get(units, SkipPreviousWrapSymbol(units, bangIndex));
    if (this.IsChainBase(asserted)) {
      return false;
    }
  }
}
const endIndex = this.ChainEndIndex(units, index);
if (endIndex === index) {
  return false;
}
const parent:Token | null = base!.Parent;
if (parent !== null) {
  if (IsTypeContainerUnit(parent)) {
    return false;
  }
  if (parent instanceof Bracket && parent.Parent !== null && IsTypeBracketPosition(parent.Parent, parent)) {
    return false;
  }
  const parentName = parent.constructor.name;
  if (
    parentName === "NewType" ||
    parentName === "HeritageClause" ||
    parentName === "ExpressionWithTypeArguments" ||
    parentName === "Decorator"
  ) {
    return false;
  }
}
const next = Get(units, SkipNextWrapSymbol(units, endIndex));
if (next !== null && next.constructor.name === "NullConditionalOperator") {
  return false;
}
// **下标链接只在值位成立**（第 80 轮补）：类型位的 `[]` 与值位的 `[i]` 形状一模一样，
// 这里多认了一种后缀，就得自己把类型位挡掉。两处实测逼出来的细节：
//
//   · `type E2 = A[]` 这时候**已经没有括号了**（`TypeBracketCloseRule` 排在前面，
//     它先收成 `ArrayType`）——所以这条守卫管的是**它还没接手**的那几个形状；
//   · `type E3 = [...A[]]` / `type T = [..., ...rest: E[]]` 里的那个 `[]` 跑链规则时
//     还是光秃秃的括号，而 **`Context` 在这里帮不上忙**（`...` 是个符号，
//     `DecideBracketContext` 判它「值位」，实测 `[...A[]]` 的 `[]` 就是 `ctx="value"`）。
//
// 所以判据用**括号所在的那一类宿主**——`IsTypeContainerUnit` 那份白名单
// （时序无关，问的是「我的父亲是哪一类节点」），再补两个**只在类型位出现**的元组成员容器
// （`RestType` / `NamedTupleMember`；它们不在共享白名单里，这里只为本规则补一条，
// 不动那份共享白名单——README 记过动它会把别的规则带崩）。
const last = Get(units, endIndex);
if (this.IsIndexUnit(last)) {
  const holder:Token | null = last === null ? null : last.Parent;
  if (holder !== null) {
    const holderName = holder.constructor.name;
    if (
      IsTypeContainerUnit(holder) ||
      holderName === "RestType" ||
      holderName === "NamedTupleMember" ||
      holderName === "TypePredicate"
    ) {
      return false;
    }
    // **成员位那层 `Statement`**（第 79 轮记过的形状）：映射类型的值 `{ [K in keyof O]: O[K] }`
    // 里那个 `O[K]`，跑链规则时它的宿主是个 `<Statement>`——而 `Statement` **刻意不在**
    // `IsTypeContainerUnit` 的白名单里（值位的语句列表也是它，混进来会把 `{ a: b[0] }` 判成类型）。
    // 所以这里再看一层：宿主的宿主是不是类型容器（映射类型 / 类型字面量体 / 接口体…）。
    // 少了这一条，`O[K]` 会被折成链（`cases:align` 的「标签占用」实测 12 处，
    // 样本全是 `readonly [P in keyof T]` 那种映射类型的值）。
    if (
      holderName === "Statement" &&
      holder.Parent !== null &&
      (IsTypeContainerUnit(holder.Parent) || holder.Parent.constructor.name === "TypePredicate")
    ) {
      return false;
    }
    // **元组 / 数组字面量那一层**（插桩实测：`type E3 = [...A[]]` 跑链规则时，
    // `A` 与那个 `[]` 都还在一个 `ArrayLiteral` 里——类型方括号规则还没接手，
    // 那个 ArrayLiteral 的 `Parent` 甚至还是 `Root`，所以「往上找类型容器」与
    // `IsTypeBracketPosition` 在这个时刻都问不出东西）。
    //
    // 现成的时序无关信号是 **`ArrayLiteral.Context`**：它在 `TryToClose` 之前
    // 直接抄自那个括号的 `Bracket.Context`（见 `json/array-literal.xl.md`）——
    // 类型位（元组类型）是 `"type"`、值位是 `"value"`：
    //
    //     type E3 = [...A[]]        → 外层 `[` 的 Context 是 "type"（`=` 往左找到 `type`）
    //     const arr = [a[0], b]     → "value"（`=` 往左找到 `const`）
    if (holderName === "ArrayLiteral" && (holder as any).Context === "type") {
      return false;
    }
  }
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把起点的链整段收成一个 `PropertyAccess`，**返回新的下标**。

签入从链底那个单元起、签出到链尾那个单元——区间与 TypeScript 的
`PropertyAccessExpression` / `CallExpression` 逐字符相同（投影层直接抄这个区间）。

软换行**不进节点**：`a` 换行 `.b` 里那个换行是版面而不是内容，留在里面会让投影多出节点
（与 `BinaryOperatorCloseRule.Process` 同一条做法）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("PropertyAccessCloseRule.Process: current is null");
}
const endIndex = this.ChainEndIndex(units, index);
const last = Get(units, endIndex);
if (last === null) {
  throw new Error("PropertyAccessCloseRule.Process: 链尾为空");
}
const result = new PropertyAccess(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(last.SourceRange.End!);
for (let i = index; i <= endIndex; i++) {
  const item = Get(units, i);
  if (item !== null && !(item instanceof LineWrap)) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class PropertyAccess extends IndependentToken

成员访问链 `a.b` / `a.b(1)` / `f(1).x` 的容器单元；**第 80 轮起下标也是链的一环**
（`a[i]` / `a[i].b` / `a[i][j].c`）。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

链的 `Data` **按原文顺序**排（`[a, ., Method(b(1)), ., c]`、`[a, Bracket[0], ., b]`），
投影层顺着走一遍就能折出左结合的 `PropertyAccessExpression` / `ElementAccessExpression`——
所以下标进链**不需要新标签、也不需要标志位**：那个 `[` 括号单元自己就说明了它是下标链接。

## method PrintAst:(ctx:any, v:any)=>any

成员访问链 → `PropertyAccessExpression` / `ElementAccessExpression` 的**嵌套左结合**形状
（**从 `ts-ast.xl.md` 中央 `switch` 的 `case "PropertyAccess"` 搬来**，第 192 轮）。

**形状交给表达式折链那一支**（`ctx.Expression`）——它按左结合折成嵌套的
`PropertyAccessExpression`、链尾是调用时折成 `CallExpression`、`[…]` 一环折成
`ElementAccessExpression`。这里只负责把内容原样递过去，不做任何判断。

```ts
  return ctx.Expression(ctx.Kids(v));
```

## constructor:(template:Template)=>void

转调基类构造器，并且给它装**只含关键字升级的那条队列**（`InitialKeywordCloseRuleQueue`）。

**为什么不能装通用队列**：这个单元的 `Data` 里第一个单元就是链底，
`PropertyAccessCloseRule.Previous` 对它照样成立——通用队列里的本规则会**自己折自己**，
一路套到爆栈。

**为什么还要装一条**（不能像 `regex-token.xl.md` 那样干脆不装）：成员名可能是一个**关键字**
（`a.import` / `a.new`），它在链路外面时会由语句那一趟的 `KeywordCloseRule` 升级成
`Keyword`，进了链就再也轮不到——产物里它停在 `Identifier` 上，
两条既有用例（`expr-member-named-import` / `expr-member-named-import-qualified`）
断言的正是 `<Keyword>import</Keyword>`。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

新建一个、`Sign(this)`、把子单元逐个克隆后整批 `AddRange`、最后 `TryToClose()`。

```ts
const result = new PropertyAccess(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
