# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, GetSkipPrevious } from "../../../core/extensions/list-extension.xl.md"
import { IsStatementStart, SkipPreviousWrapSymbol } from "../../text-common-util.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Json 对象：把 `{...}` 这种字面量从「一个花括号 + 里面的内容」重组成单个 `ObjectLiteral` 单元。

`JsonObjectReorganization` 写在 `ObjectLiteral` **之前**（与同目录其它 token 一致）。

# class JsonObjectReorganization extends Reorganization

它只做两件事：判断 `{` 是不是「Json 对象的开头」，是就把它连同内容收成一个 `ObjectLiteral`。

## static readonly field Instance:JsonObjectReorganization = new JsonObjectReorganization()

唯一的实例，注册进通用重组队列时用。

## method IsObjectAt:(units:Array<Token>, index:int)=>bool

`index` 处的 `{` 是不是一个 Json 对象的开头。

它与单参数版同名，所以多参数的这个叫 `IsObjectAt`（单参数版仍叫 `IsObject`，它被 `As` / `TypeDefine` / `TernaryOperator` / `Lamda` 四个文件调用）。

与 `ArrayLiteral` 那套判定的差别：这里**没有** `NullConditionalOperator` 的 `?.[` 检查，也**没有** `ArrayLiteral` / `String` / `Method` 三个排除项。

判定链条（任一条命中就**不是**对象）：**处在语句开头**（那是块语句，见下）；上一个跳过软换行的单元是 `Identifier` 且不属于 `return` / `typeof`；是 `Bracket`；是 `GenericType`；是 `=>` 符号。

**「处在语句开头」是块与对象字面量的分界线**：`{ a: 1 }` 单独成句时，JavaScript / TypeScript 把它读成
**块语句**（里面 `a:` 是标签、`1` 是表达式语句），只有出现在表达式里（`= { … }`、`f({ … })`、
`return { … }`）才是对象字面量。少了这一条，`stmt-object-vs-block` 那条用例要的
「块里的一个带标签语句」永远拿不到——`{` 会先被收成 `ObjectLiteral`。
判据由 `../text-common-util.xl.md` 的 `IsStatementStart` 给出（`LabelReorganization` 用的是同一个）。

**`GenericType` 那一支是必须的**：泛型实参段后面跟的 `{` 是块，不是对象字面量——`class Foo<T> {` 要与 `class Foo {` 同解，`func f<T>(): Array<U> {` 也要与不带泛型的写法同解，否则那个 `{` 会从 `Bracket` 变成 `ObjectLiteral`。

```ts
const current = Get(units, index);
if (current instanceof Bracket && current.startBracket === "{") {
  if (IsStatementStart(units, index)) {
    return false;
  }
  const previous = GetSkipPrevious(units, index, (item) => item instanceof LineWrap);
  // **`return` 换行 `{` 是块语句**（第 149 轮）：`return` 是**受限产生式**——
  // 换行之后那个 `{` 不可能属于 `return`，只能是一条块语句（块里 `a: 1` 还是标签）。
  // 同一行的 `return { a: 1 }` 才是对象字面量，所以判据要落在**中间有没有软换行**上
  // （实测 `stmt-asi-return-newline-object.ts`：缺 `Block` / `LabeledStatement` /
  // `ExpressionStatement` 各 1 + 多出 `ObjectLiteralExpression` / `PropertyAssignment`）。
  if (
    previous instanceof Identifier &&
    previous.Is("return") &&
    SkipPreviousWrapSymbol(units, index) !== index - 1
  ) {
    return false;
  }
  if (previous instanceof Identifier && previous.IsAny(["return", "typeof"]) === false) {
    return false;
  } else if (previous instanceof Bracket) {
    return false;
  } else if (previous instanceof GenericType) {
    return false;
  } else if (previous instanceof SymbolToken) {
    if (previous.Is("=>")) {
      return false;
    }
  }
  return true;
}
return false;
```

## method IsObject:(unit:Token | null)=>bool

某个单元本身是不是 `ObjectLiteral`；不是的话，回头看它所在的列表中它所在的位置是不是一个对象开头。

类型判定用 `instanceof`，`Data.IndexOf` 落成 `indexOf`（找不到同样是 `-1`）。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof ObjectLiteral) {
  return true;
}
if (unit.Parent === null) {
  return false;
}
return this.IsObjectAt(unit.Parent.Data, unit.Parent.Data.indexOf(unit));
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点——直接问 `IsObjectAt`。

```ts
return this.IsObjectAt(units, index);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `index` 处的 `{` 连同内容收成一个 `ObjectLiteral`，**返回新的下标**。

它不推进下标，直接原样返回入参。

`Parent` 在造出单元之后单独赋值。

**拿不到父单元时早退**（`current.Parent === null`）：`Replace` 要求「自己还在父单元的子单元里」，
没有父单元就抛「没有父单元」。这个形状确实会出现——**重组改短了列表、而下标还是旧扫描留下的**
（实测：`{ A }a += 1` 这种「块紧跟着表达式、中间既没有 `;` 也没有换行」的写法，
`StatementReorganization3` 在旧下标上收出一个不可能进树的 `Statement`，
把这个括号的父单元挪成了那个孤儿）。

早退**保住内容**：括号还在 `units` 里、内容也还在括号的 `Data` 里（`MoveDataTo` 已经搬了一次，
所以这里把内容搬回去），产物里那个 `{ … }` 仍然是一个 `Bracket`、里面的东西一个不少——
只是少了一层 `ObjectLiteral` 标签。**先保住内容再让步**：这条路走的是「输入本来就已经很怪」的兜底，
宁可少一个标签，也不要整份文件解析失败。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("ObjectLiteral.Reorganization.Process: current is null");
}
if (current.Parent === null) {
  return index;
}
const result = new ObjectLiteral(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
current.MoveDataTo(result);
result.TryToClose();
current.Replace(result);
return index;
```

# class BlockReorganization extends Reorganization

同一对花括号的**另一种读法：块语句**。

`JsonObjectReorganization.Previous` 已经把「处在语句开头」的 `{` 排除掉了（见那里的说明），
本规则就接手那一支：给块括号补一条**语句队列**并当场跑一遍。

**为什么必须在这里补**：`{` 括号一律不带队列（见 `../bracket.xl.md` 的 `Use`），
而块里装的是语句——不补队列，`{ function g() { … } g() }` 里的函数声明、
`{ a: 1 }` 里的标签语句都退化成散着的 `Identifier`。
补的时机也只能在这里：`LabelReorganization` 能照顾「标签后面的块」，
但**裸块**（没有标签的那些）只有本规则认得出来，而此刻它早已关闭、
`Reorganize()` 只能由我们显式叫一次（`TryToClose` 那次跑在没有队列的时候）。

`Process` **不消费任何单元**（块括号原样留着，只是多了队列），所以返回 `index + 1` 往下走。

## static readonly field Instance:BlockReorganization = new BlockReorganization()

唯一的实例，注册进通用重组队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个**还没有队列的语句位块**。

`ReorganizationQueue === null` 那一句是幂等保护：跑过一次之后本规则就不再命中，
否则队列会在每一趟扫描里被重跑（重组是「每条规则扫一遍所有下标」，同一位置会被问很多次）。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket) || current.startBracket !== "{") {
  return false;
}
if (current.ReorganizationQueue !== null) {
  return false;
}
return IsStatementStart(units, index);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

给这个块补语句队列，然后立刻跑一遍；**不替换任何单元**。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("BlockReorganization.Process: current is null");
}
ParsePipeline.InitialStatementReorganizationQueue(current);
current.Reorganize();
return index + 1;
```

# class ObjectLiteral extends IndependentToken

Json 对象。

它**没有**覆写 `ToXmlString`，XML 由基类 `Token.ToXmlString` 产出：`<ObjectLiteral>子单元的 XML 串接</ObjectLiteral>`（标签名即运行时类名）。

## constructor:(Template:Template)=>void

转调基类构造器，然后从重组模板里取出「本类」对应的一组重组规则。

`ReorganizationQueue` 从模板里取：键是 `this.constructor`（`SequenceTemplate` 以类的构造器对象为键）。

```ts
super(Template);
this.ReorganizationQueue = Template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 搬入全部克隆出来的子单元 → `TryToClose()`；`Add` 收到的是一批子单元，所以这里用 `AddRange`。

```ts
const result = new ObjectLiteral(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
