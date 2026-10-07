# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol, IsMappedKeyBracket } from "../text-common-util.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Satisfies } from "./satisfies.xl.md"
import { Statement } from "./statement.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型转换 `as`：把 `expr as Type` 整段收成一个 `As` 单元。触发点是内容恰好为 `as` 的 `Identifier`。

**`satisfies` 走同一条规则**（见 `satisfies.xl.md`）：两者在 TypeScript 里同优先级、同结合性，
触发、收集与终止完全一样，只有产出的标签不同——规则按触发词分派 `As` / `Satisfies`。

`AsCloseRule` 写在 `As` 之前：它的 `Instance` 静态字段在类定义时立即求值，
而 `Root` 的规则队列会直接引用 `AsCloseRule.Instance`。

# class AsCloseRule extends CloseRule

它比其他重组类简单：`Previous` 只认「内容为 `as` / `satisfies` 的 `Identifier`」；
`Process` 从那个词之后一路收到**语句边界 / `,` / 下一个 `as` / `satisfies`**，
把收到的单元装进新的 `As`（或 `Satisfies`），再把原来那一段整体换掉。

## static readonly field Instance:AsCloseRule = new AsCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个 `as` / `satisfies` 关键字块。

`Get` 越界给 `null`，`instanceof` 对 `null` 不成立，所以写成两段判定。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier) || (current.TempToString() !== "as" && current.TempToString() !== "satisfies")) {
  return false;
}
// **映射类型的 `as` 子句不是 `AsExpression`**（第 66 轮）：`{ [K in T as X]: Y }` 里那个
// `as X` 在 TS 那边是 `MappedType` 自己的 `nameType`（一个**类型**），不是断言表达式。
// 键括号的内容里已经有 `in` 标记（`IsMappedKeyBracket`），判据与映射类型共用同一个答案。
// 少了这一条，`as X` 会把左边的 `TypeParameter` 一起吞进 `As`（实测 4 处）。
if (current.Parent !== null && IsMappedKeyBracket(current.Parent)) {
  return false;
}
return true;
```

## private method IsTypeContinuationAhead:(units:Array<Token>, index:int)=>bool

`index` 处那个**软换行**后面跟的是不是「类型还没写完」的续接符（`|` / `&` / `.` / `<` / `[` / `(` / `=>`）。

`as` 后面的类型可以折行排版（`x as\n  | A\n  | B`），那些换行是版面而不是语句边界。

```ts
const next = GetSkipNextWrapSymbol(units, index);
if (!(next instanceof SymbolToken)) {
  return false;
}
return (
  next.Is("|") ||
  next.Is("&") ||
  next.Is(".") ||
  next.Is("<") ||
  next.Is("[") ||
  next.Is("(") ||
  next.Is("=>") ||
  next.Is("->")
);
```

## private method IsValueOperatorAfterType:(item:Token)=>bool

`item` 是不是「**类型已经写完**之后出现的值位二元运算符」——遇到它就该收工。

**这一问是第 288 轮补的** ✗，它量到的是一条**静默错值** ✓：
`a as number + 1` 在 TypeScript 里是 **`(a as number) + 1`** ✓
（实测 `ts.createSourceFile`：`BinaryExpression(AsExpression(a, number), +, 1)` ✓），
而本规则原来把 `+ 1` **当成类型的一部分**吞进了 `As` ✗
⇒ 降级之后那个 `+ 1` 整个没了 ✓，表达式退化成 `a` 本身 ✓。

**为什么 `+` 不可能是类型的续接** ✓：`as` 右边那一段走的是 TypeScript 的 `parseType()` ✓，
而 `parseType` 见到 `+` 就停 ✓（`number + 1` 不是类型 ✗）；
**能续接类型的符号是另一批** ✓——`.` / `[` / `<` / `|` / `&` / `=>` / `extends` / `?` / `:` ✓
（它们已经在 `IsTypeContinuationAhead` 那张名单里 ✓）。

**为什么名单里没有 `<<` / `>>` / `>>>`** ✗：那三个在**嵌套泛型的收尾**上会撞车 ✓
（`as Array<Array<number>>` 的 `>>` ✓）——它们当值位运算符出现在 `as` 后面的写法极罕见 ✓，
而误判一次就是**一整份文件解析崩** ✗，所以宁可漏 ✗。

```ts
if (!(item instanceof SymbolToken)) {
  return false;
}
const text = item.TempToString();
return (
  text === "+" ||
  text === "-" ||
  text === "*" ||
  text === "/" ||
  text === "%" ||
  text === "**" ||
  text === "&&" ||
  text === "||" ||
  text === "??" ||
  text === "==" ||
  text === "!=" ||
  text === "===" ||
  text === "!==" ||
  text === "^" ||
  text === "!"
);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `as` / `satisfies` 及其后的类型表达式收成一个 `As` / `Satisfies`，**返回新的下标**（不靠入参回写）。要点：

- **出发词决定节点类型**：`current` 是不是 `satisfies` 先算成 `isSatisfies`，最后按它分派
  `Satisfies` / `As`。**不要在造节点那一句现算**：`Get` 的静态类型是 `Token | null`，
  而 `TempToString` 只长在 `Identifier` 上，`instanceof` 收窄必须和判定写在同一句里才能过 `tsc`。
- **遇到后面那个同类词就收工**：`a as B satisfies C` 是 `(a as B) satisfies C`、
  `a satisfies B as C` 是 `(a satisfies B) as C`（两者同级、左结合）。
  规则是**按词分派**的，`as` 与 `satisfies` 都触发它，所以先跑的那个必须在自己这一段
  遇到另一个词时停下，否则后一个词连同它的类型会被前一个节点整段吞掉
  （实测旧行为：`a as const satisfies B` 得到 `<As>const satisfies B</As>`——两个运算一个节点）。
- **`as` 后面必须有一个类型**，所以还没收到任何实义单元时**不许收工**：
  `const v = x as` 换行 `A;` 是常见排版，可 `Statement.IsStatementEnd` 会把那个换行
  判成语句边界（它看的是换行**两侧**的单元，而 `as` 是 `Identifier`、不算「语句内部」），
  于是 `items` 为空、`items[items.length - 1]` 取到 `undefined`，下一句读 `.SourceRange` 抛**裸 `TypeError`**。
  实测 `const v = x as\n  A;` 就是这个形状（真实代码里 `as` 换行很常见）。
- **软换行不进 `items`**：它们只是排版。原来换行会被塞进 `As` 的 `Data`，
  而 `As` 是独立单元、**没有自己的规则队列**（`IndependentToken` 不装队列），
  那个换行于是以 `<LineWrap />` 的形式漏进产物（实测 `const v = x as A |\n B;`）。
- 换行处要不要收工，沿用 `Statement.IsStatementEnd`，但**类型续接符之后一律不算**。
- 终止符是 `;` / `,` / 赋值符号；`?` 与 `:` **也终止**——`x as A ? b : c` 在 TypeScript 里
  解析成 `(x as A) ? b : c`（实测 AST 是 `ConditionalExpression(AsExpression(…))`）。
  例外是**条件类型**：见过顶层的 `extends` 之后，`?` / `:` 属于类型
  （`x as A extends B ? C : D` 的 AST 是 `AsExpression(ConditionalType)`）。
- 收集为空时什么都不做、返回原下标。
- **`items` 只装 `as` 之后的单元**，不含 `as` 本身。
- 父单元取 `current.Parent`；批量加子单元用 `AddRange`。
- 范围两头直接取 `current.SourceRange.Start!` 与 `items` 末项的 `SourceRange.End!`：
  `Start` / `End` 本身就是 `Source | null`，**不要再取 `.Value`**，否则会把字符塞进范围字段。
- 最后整体替换用四参数的 `ReplaceCountAt`（三个参数的版本才叫 `ReplaceAt`），
  返回值即新下标；取末项写成 `items[items.length - 1]`。

先 `new` 出单元，再赋 `Parent`。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const isSatisfies = current instanceof Identifier && current.Is("satisfies");
const items: Token[] = [];
let endIndex = -1;
let sawExtends = false;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    throw new Error("item 为空");
  }
  if (item instanceof LineWrap) {
    if (items.length > 0 && this.IsTypeContinuationAhead(units, i) === false && Statement.IsStatementEnd(units, i, [","])) {
      endIndex = i - 1;
      break;
    }
    continue;
  }
  if (item instanceof SymbolToken) {
    if (item.Is(";") || item.Is(",") || template.SymbolTemplate.IsAssignmentSymbol(item.TempToString())) {
      endIndex = i - 1;
      break;
    }
    if ((item.Is("?") || item.Is(":")) && sawExtends === false) {
      endIndex = i - 1;
      break;
    }
    // **类型已经写完、后面跟的是值位运算符** ⇒ 收工 ✓（第 288 轮 ✓）：
    // `a as number + 1` 是 `(a as number) + 1` ✓，`+ 1` **不是类型** ✗。
    // 判据是「**已经收到过东西**」✓——`as -1` 那种写法里 `-` 在**最前面** ✓，
    // 那正是字面量类型的符号 ✓，不该在这里被截断 ✗。
    if (items.length > 0 && this.IsValueOperatorAfterType(item)) {
      endIndex = i - 1;
      break;
    }
  }
  if (item instanceof Identifier && (item.Is("as") || item.Is("satisfies"))) {
    endIndex = i - 1;
    break;
  }
  if (item instanceof Identifier && item.Is("extends")) {
    sawExtends = true;
  }
  items.push(item);
}
if (endIndex === -1) {
  endIndex = units.length - 1;
}
if (items.length === 0) {
  return index;
}
const result = isSatisfies ? new Satisfies(template) : new As(template);
result.Parent = current.Parent;
result.AddRange(items);
result.SignIn(current.SourceRange.Start!);
result.SignOut(items[items.length - 1].SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class As extends IndependentToken

类型转换 `as` 表达式。

单元值类型是单字符的 `string`。

它**没有**覆写 `ToXmlString`，XML 由基类 `Token` 产出：`<As>子单元的 XML 串接</As>`（标签名即运行时类名）。

## constructor:(template:Template)=>void

转调基类构造器，并把**类型队列**挂上来。

`as` 右边的整段是**类型文本**（`x as A | B`、`x as { a: number }`、`x as T extends U ? X : Y`），
收进来的那一段要再跑一趟才会成节点：联合 / 交叉、条件类型、`keyof` 之类的关键词升级都在那一趟里。
少了这条，多行写法（`x as` 换行 `| A` 换行 `| B`）的联合根本不成形
（实测 `expr-as-leading-pipe-union` / `expr-as-union-multiline` 两条用例；
与 `TypeDefine` / `TypeAssign` / `FunctionType` 同一条做法）。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；
批量加入用 `AddRange`。

```ts
const result = new As(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
