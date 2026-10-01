# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, GetSkipPrevious } from "../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { Method } from "../method.xl.md"
import { NullConditionalOperator } from "../null-conditional-operator.xl.md"
import { String } from "../string/string.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Json 数组：把 `[...]` 这种字面量从「一个方括号 + 里面的内容」重组成单个 `ArrayLiteral` 单元。

`JsonArrayReorganization` 写在 `ArrayLiteral` **之前**（与同目录其它 token 一致）。

# class JsonArrayReorganization extends Reorganization

它只做两件事：判断 `[` 是不是「Json 数组的开头」，是就把它连同内容收成一个 `ArrayLiteral`。

## static readonly field Instance:JsonArrayReorganization = new JsonArrayReorganization()

唯一的实例，注册进通用重组队列时用。

## method IsArrayAt:(units:Array<Token>, index:int)=>bool

`index` 处的 `[` 是不是一个 Json 数组的开头。

它与单参数版同名，所以多参数的这个叫 `IsArrayAt`（单参数版仍叫 `IsArray`）。

判定链条（任一条命中就**不是**数组）：父单元是 `NullConditionalOperator` 且 `index == 0`（那是 `?.[` 空条件索引）；上一个跳过软换行的单元是 `Identifier` 且不属于 `return` / `typeof` / `of` / `in`；是 `Bracket`；是 `ArrayLiteral`；是 `String`；是 `Method`；是 `=>` 符号。

```ts
const current = Get(units, index);
if (current instanceof Bracket && current.startBracket === "[") {
  const parent = current.Parent;
  if (parent instanceof NullConditionalOperator && index === 0) {
    return false;
  }
  const previous = GetSkipPrevious(units, index, (item) => item instanceof LineWrap);
  if (previous instanceof Identifier && previous.IsAny(["return", "typeof", "of", "in"]) === false) {
    return false;
  } else if (previous instanceof Bracket) {
    return false;
  } else if (previous instanceof ArrayLiteral) {
    return false;
  } else if (previous instanceof String) {
    return false;
  } else if (previous instanceof Method) {
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

## method IsArray:(unit:Token | null)=>bool

某个单元本身是不是 `ArrayLiteral`；不是的话，回头看它所在的列表中它所在的位置是不是一个数组开头。

类型判定用 `instanceof`，`Data.IndexOf` 落成 `indexOf`（找不到同样是 `-1`）。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof ArrayLiteral) {
  return true;
}
if (unit.Parent === null) {
  return false;
}
return this.IsArrayAt(unit.Parent.Data, unit.Parent.Data.indexOf(unit));
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点——直接问 `IsArrayAt`。

```ts
return this.IsArrayAt(units, index);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `index` 处的 `[` 连同内容收成一个 `ArrayLiteral`，**返回新的下标**。

它不推进下标，直接原样返回入参。

`Parent` 在造出单元之后单独赋值。

**拿不到父单元时早退**（`current.Parent === null`，第 67 轮补）：与
`object-literal.xl.md` 里 `JsonObjectReorganization.Process` 那一条**同一个形状、同一个理由**——
`Replace` 要求「自己还在父单元的子单元里」，没有父单元就抛「没有父单元」，
**整份文件解析失败**。这条路只在「重组改短了列表、而下标还是旧扫描留下的」时才走到
（那个 `[` 已经被别的规则挪成了孤儿），属于输入本来就很怪的兜底：**先保住内容再让步**，
产物里那个 `[]` 仍然是一个 `Bracket`、里面的东西一个不少，只是少一层 `ArrayLiteral` 标签。

**为什么这一条是第 67 轮才补上的**：同一族的守卫第 52 轮只加到了**对象**那一支，
数组这一支漏了——而触发它需要的形状更刁：三片段组合探针抓到的
`{` 换行 `x => x` 换行 `[1, 2, 3]` 换行 `a += 1` 换行 `}`（块里的箭头体续上数组字面量，
再跟一条复合赋值）当场抛「没有父单元」。两两拼接的 `fuzz.mjs` 抓不到它。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("ArrayLiteral.Reorganization.Process: current is null");
}
if (current.Parent === null) {
  return index;
}
const result = new ArrayLiteral(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
// `Context` 必须**在 `TryToClose()` 之前**抄过来：本单元自己那一趟重组
// 就发生在 `TryToClose` 里面，而 `BinaryOperatorReorganization` 要靠这个字段判断
// 「这个 `[` 是映射类型还是元素访问」。原来不抄，映射类型 `{ [K in T]: V }` 的
// `in` 会被折成 `<BinaryOperator op="in">`（全语料 9 处误折）。
if (current instanceof Bracket) {
  result.Context = current.Context;
}
current.MoveDataTo(result);
result.TryToClose();
current.Replace(result);
return index;
```

# class ArrayLiteral extends IndependentToken

Json 数组。

它**没有**覆写 `ToXmlString`，XML 由基类 `Token.ToXmlString` 产出：`<ArrayLiteral>子单元的 XML 串接</ArrayLiteral>`（标签名即运行时类名）。

## field Context:string = ""

本单元是从哪个 `[` 括号收来的、那个括号当时处在**类型位**还是**值位**
（`"type"` / `"value"` / `""`）——直接抄自 `Bracket.Context`（见 `../bracket.xl.md`）。

**为什么 ArrayLiteral 也要带这个字段**：映射类型 `{ [K in keyof T]: T[K] }` 的那个 `[`
会在 `JsonArrayReorganization` 里被换成 `ArrayLiteral`，于是**括号单元本身没了**。
`BinaryOperatorReorganization` 的守卫要判断「这个 `[` 是映射类型还是元素访问」，
没有这个字段就只能退回「父单元是不是 `[` 括号」，而那条判据挡不住已经变成 `ArrayLiteral` 的映射类型
（实测 `type X = { [K in "a" | "b"]: number }` 会误产出一个
`<BinaryOperator op="in">`，全语料 9 处）。

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
const result = new ArrayLiteral(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
