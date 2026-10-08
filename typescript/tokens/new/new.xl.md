# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { SyntaxException } from "../../../core/exceptions/syntax-exception.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol, IsAnnotationUnit, SkipNextTrivia, SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
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
  所以扫描不是「找第一个括号」，而是「往前走到边界」：遇到圆括号就收实参，遇到软换行 / `;` / `,` /
  `.` 以外的符号就停——不然 `new A` 会把下一条语句的括号当成自己的实参表（
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
    if (item.startBracket === "(") {
      bracketIndex = i;
    }
    break;
  }
  if (item instanceof LineWrap) {
    break;
  }
  if (IsAnnotationUnit(item)) {
    i = i + 1;
    continue;
  }
  if (item instanceof SymbolToken && item.Is(".") === false) {
    break;
  }
  i = i + 1;
}
const typeEnd = bracketIndex === -1 ? i - 1 : bracketIndex - 1;
if (typeEnd < index + 1) {
  throw SyntaxException.FromMessage(current.SourceRange, "new 后面没有找到类型名");
}
const result = new New(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
const newType = result.CreateType();
newType.SignIn(current.SourceRange.Start!);
for (let t = index + 1; t <= typeEnd; t++) {
  newType.Add(Get(units, t)!);
}
newType.SignOut(Get(units, typeEnd)!.SourceRange.End!);
const newArguments = result.CreateArguments();
if (bracketIndex === -1) {
  newArguments.SignIn(Get(units, typeEnd)!.SourceRange.End!);
  newArguments.SignOut(Get(units, typeEnd)!.SourceRange.End!);
  result.SignOut(Get(units, typeEnd)!.SourceRange.End!);
} else {
  const bracket = Get(units, bracketIndex) as Bracket;
  newArguments.SignIn(bracket.SourceRange.Start!);
  newArguments.SignOut(bracket.SourceRange.End!);
  bracket.MoveDataTo(newArguments);
  result.SignOut(bracket.SourceRange.End!);
}
newType.TryToClose();
newArguments.TryToClose();
result.TryToClose();
const lastIndex = bracketIndex === -1 ? typeEnd : bracketIndex;
return ReplaceCountAt(units, index, lastIndex - index + 1, result);
```

# class New extends IndependentToken

`new` 表达式单元。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<New>` 里依次是 Type 与 Arguments 两段的 XML。

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
  const generic = nameUnits.find((k: any) => k.get("type") === "GenericType");
  const calleeUnits = nameUnits.filter((k: any) => k.get("type") !== "GenericType");
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
  // **实参按顶层逗号切段、每段走 `ctx.Expression`**（第 232 轮 ✓）——**不能走 `ctx.ProjectEach`** ✗：
  // 那个助手是**逐格**投的 ✓，而实参位有好几种「一个实参 = 好几格」的形状 ✓——
  // 最普通的是 **`as` / `satisfies`** ✓（产物把 `x as T` 记成 `Identifier(x)` 与 `As(T)`
  // **两个平级单元** ✓，左边那个操作数是它的**前一个兄弟** ✓）。
  // 逐格投会把 `As` 单独投成一个 `AsExpression` ✓、而它的 `expression` 是**空的** ✗——
  // 实测现场：`new Object(null as any)` 报
  // `ast node AsExpression has no child expression` ✓（一句话指向**投影** ✓，
  // 而现场是 `arguments` 那一段的**投法** ✗）。
  // **与 `projectCall` 的实参那一段同一个写法** ✓（那里第 143 轮已经踩过同一类坑 ✓：
  // `h?.(o?.a)` 的括号里也是「基名与 `?.` 平级」✓）——**一处规矩写两遍会漂** ✗，
  // 所以这里连注释一起照它对齐 ✓。
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
