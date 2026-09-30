# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, GetSkipPrevious } from "../../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { Symbol } from "../symbol.xl.md"
import { WrapSymbol } from "../wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Json 对象：把 `{...}` 这种字面量从「一个花括号 + 里面的内容」重组成单个 `JsonObject` 单元。

`JsonObjectReorganization` 写在 `JsonObject` **之前**（与同目录其它 token 一致）。

# class JsonObjectReorganization extends Reorganization

它只做两件事：判断 `{` 是不是「Json 对象的开头」，是就把它连同内容收成一个 `JsonObject`。

## static readonly field Instance:JsonObjectReorganization = new JsonObjectReorganization()

唯一的实例，注册进通用重组队列时用。

## method IsObjectAt:(units:Array<Token>, index:int)=>bool

`index` 处的 `{` 是不是一个 Json 对象的开头。

它与单参数版同名，所以多参数的这个叫 `IsObjectAt`（单参数版仍叫 `IsObject`，它被 `As` / `TypeDefine` / `TernaryOperator` / `Lamda` 四个文件调用）。

与 `JsonArray` 那套判定的差别：这里**没有** `NullConditionalOperator` 的 `?.[` 检查，也**没有** `JsonArray` / `String` / `Method` 三个排除项。

判定链条（任一条命中就**不是**对象）：上一个跳过软换行的单元是 `Common` 且不属于 `return` / `typeof`；是 `Bracket`；是 `GenericType`；是 `=>` 符号。

**`GenericType` 那一支是必须的**：泛型实参段后面跟的 `{` 是块，不是对象字面量——`class Foo<T> {` 要与 `class Foo {` 同解，`func f<T>(): Array<U> {` 也要与不带泛型的写法同解，否则那个 `{` 会从 `Bracket` 变成 `JsonObject`。

```ts
const current = Get(units, index);
if (current instanceof Bracket && current.StartBracketChar === "{") {
  const previous = GetSkipPrevious(units, index, (item) => item instanceof WrapSymbol);
  if (previous instanceof Common && previous.IsAny(["return", "typeof"]) === false) {
    return false;
  } else if (previous instanceof Bracket) {
    return false;
  } else if (previous instanceof GenericType) {
    return false;
  } else if (previous instanceof Symbol) {
    if (previous.Is("=>")) {
      return false;
    }
  }
  return true;
}
return false;
```

## method IsObject:(unit:Token | null)=>bool

某个单元本身是不是 `JsonObject`；不是的话，回头看它所在的列表中它所在的位置是不是一个对象开头。

类型判定用 `instanceof`，`Data.IndexOf` 落成 `indexOf`（找不到同样是 `-1`）。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof JsonObject) {
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

把 `index` 处的 `{` 连同内容收成一个 `JsonObject`，**返回新的下标**。

它不推进下标，直接原样返回入参。

`Parent` 在造出单元之后单独赋值。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("JsonObject.Reorganization.Process: current is null");
}
const result = new JsonObject(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
current.MoveDataTo(result);
result.TryToClose();
current.Replace(result);
return index;
```

# class JsonObject extends IndependentToken

Json 对象。

它**没有**覆写 `ToXmlString`，XML 由基类 `Token.ToXmlString` 产出：`<JsonObject>子单元的 XML 串接</JsonObject>`（标签名即运行时类名）。

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
const result = new JsonObject(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
