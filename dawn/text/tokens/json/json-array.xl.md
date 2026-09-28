# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, GetSkipPrevious } from "../../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { Method } from "../method.xl.md"
import { NullConditionalOperator } from "../null-conditional-operator.xl.md"
import { String } from "../string/string.xl.md"
import { Symbol } from "../symbol.xl.md"
import { WrapSymbol } from "../wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Json 数组：把 `[...]` 这种字面量从「一个方括号 + 里面的内容」重组成单个 `JsonArray` 单元。

按 M32，嵌套类 `JsonArray.Reorganization` 展平成顶层类 `JsonArrayReorganization`；按 M33，它写在 `JsonArray` **之前**（与同目录其它 token 一致）。

# class JsonArrayReorganization extends Reorganization

原 C# 是嵌套类 `JsonArray.Reorganization`（M32 展平改名）。

它只做两件事：判断 `[` 是不是「Json 数组的开头」，是就把它连同内容收成一个 `JsonArray`。

## static readonly field Instance:JsonArrayReorganization = new JsonArrayReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`——这里的 `Reorganization` 指的是嵌套的那个类本身，按 §4 的等价写法落成静态只读字段。

## method IsArrayAt:(units:Array<Token<string>>, index:int)=>bool

`index` 处的 `[` 是不是一个 Json 数组的开头。

原 C# 是重载 `public static bool IsArray(List<Token<char>> units, int index)`；它与单参数版同名，按 M14(c) 改名 `IsArrayAt`（单参数版保留原名 `IsArray`）。

判定链条（任一条命中就**不是**数组）：父单元是 `NullConditionalOperator` 且 `index == 0`（那是 `?.[` 空条件索引）；上一个跳过软换行的单元是 `Common` 且不属于 `return` / `typeof` / `of` / `in`；是 `Bracket`；是 `JsonArray`；是 `String`；是 `Method`；是 `=>` 符号。

```ts
const current = Get(units, index);
if (current instanceof Bracket && current.StartBracketChar === "[") {
  const parent = current.Parent;
  if (parent instanceof NullConditionalOperator && index === 0) {
    return false;
  }
  const previous = GetSkipPrevious(units, index, (item) => item instanceof WrapSymbol);
  if (previous instanceof Common && previous.IsAny(["return", "typeof", "of", "in"]) === false) {
    return false;
  } else if (previous instanceof Bracket) {
    return false;
  } else if (previous instanceof JsonArray) {
    return false;
  } else if (previous instanceof String) {
    return false;
  } else if (previous instanceof Method) {
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

## method IsArray:(unit:Token<string> | null)=>bool

某个单元本身是不是 `JsonArray`；不是的话，回头看它所在的列表中它所在的位置是不是一个数组开头。

原 C# 是重载 `public static bool IsArray(Token<char>? unit)`（保留原名）。`GetType()` 判定按 §3.8 落成 `instanceof`，`Data.IndexOf` 落成 `indexOf`（找不到同样是 `-1`）。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof JsonArray) {
  return true;
}
if (unit.Parent === null) {
  return false;
}
return this.IsArrayAt(unit.Parent.Data, unit.Parent.Data.indexOf(unit));
```

## method Previous:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>bool

`index` 处是不是本次重组的起点——直接问 `IsArrayAt`。

原 C# 是 `public override bool Previous(...)`。

```ts
return this.IsArrayAt(units, index);
```

## method Process:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>int

把 `index` 处的 `[` 连同内容收成一个 `JsonArray`，**返回新的下标**。

原 C# 是 `public override void Process(IOwner owner, Template<char> template, List<Token<char>> units, ref int index)`：它不通过 `ref` 推进下标，按 M15 改成返回值后照原样返回入参。

原 C# 用对象初始化器写 `new JsonArray(owner, template) { Parent = current.Parent }`，ts 侧拆成先 `new` 再赋值。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("JsonArray.Reorganization.Process: current is null");
}
const result = new JsonArray(owner, template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
current.MoveDataTo(result);
result.TryToClose();
current.Replace(result);
return index;
```

# class JsonArray extends IndependentToken

Json 数组。

原 C# 侧是 `public class JsonArray : IndependentToken<char>`。按 M31，C# 的 `char` 在规范里一律写 `string`。

它**没有**覆写 `ToXmlString`，XML 由基类 `Token.ToXmlString` 产出：`<JsonArray>子单元的 XML 串接</JsonArray>`（标签名即运行时类名，M17）。

## constructor:(owner:IOwner, Template:Template<string>)=>void

转调基类构造器，然后从重组模板里取出「本类」对应的一组重组规则。

原 C# 参数名是小写 `template`，构造体只有一句 `ReorganizationQueue = template.ReorganizationTemplate.Get(GetType())`；`GetType()` 按 M17 落成 `this.constructor`（`SequenceTemplate` 以类的构造器对象为键）。

```ts
super(owner, Template);
this.ReorganizationQueue = Template.ReorganizationTemplate.Get(this.constructor);
```

## method ToDictionary:()=>Map<string, any>

转成字典：`type` 是运行时类型名，**总是**带 `children`（哪怕空数组——基类版本是「空就不放」）。

原 C# 返回 `Dictionary<string, object>`，按 M10 / M20 映射成 `Map<string, any>`；`GetType().Name` 按 M17 写成 `this.constructor.name`。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
const data: any[] = [];
for (const item of this.Data) {
  data.push(item.ToDictionary());
}
result.set("children", data);
return result;
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。`Add` 收到的是一批克隆出来的子单元，所以 ts 侧用 `AddRange`（M14(c)：C# 的 `Add<T>(IEnumerable<T>)` 重载在 ts 里改名 `AddRange`）。

```ts
const result = new JsonArray(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
