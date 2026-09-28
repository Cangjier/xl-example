# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Common } from "./common.xl.md"
import { Statement } from "./statement.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型转换 `as`：把 `expr as Type` 整段收成一个 `As` 单元。触发点是内容恰好为 `as` 的 `Common`。

按 M33，展平的嵌套类 `As.Reorganization` 写在 `As` 之前——它的 `Instance` 静态字段在类定义时立即求值，
而 `Root` 的重组队列会直接引用 `AsReorganization.Instance`。

# class AsReorganization extends Reorganization

原 C# 是嵌套类 `As.Reorganization`（M32 展平改名）。

它比其他重组类简单：`Previous` 只认「内容为 `as` 的 `Common`」；`Process` 从 `as` 之后一路收到**语句边界或 `,`**，
把收到的单元装进新的 `As`，再把原来那一段整体换掉。

## static readonly field Instance:AsReorganization = new AsReorganization()

唯一的实例。

原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 §4 的等价写法落成静态只读字段，调用点形态不变。

## method Previous:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>bool

`index` 处是不是一个 `as` 关键字块。

原 C# 是 `units.Get(index) is Common common && common.TempToString() == "as"`；
ts 的 `Get` 越界给 `null`，`instanceof` 对 `null` 不成立，所以合并成两段判定。

```ts
const current = Get(units, index);
return current instanceof Common && current.TempToString() === "as";
```

## method Process:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>int

把 `as` 及其后的类型表达式收成一个 `As`，**返回新的下标**。

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值。要点：

- 从 `index + 1` 往后扫，遇到 `Statement.IsStatementEnd(units, i, ",")` 就停在 `i - 1`；
  一直没遇到（`endIndex == -1`）就收到列表末尾。
- **`items` 只装 `as` 之后的单元**，不含 `as` 本身。
- 父单元照抄 `current.Parent`；`result.Add(items)` 按 M14(c) 写成 `AddRange`。
- 范围两头直接取 `current.SourceRange.Start!` 与 `items` 末项的 `SourceRange.End!`：
  C# 的 `.Start!.Value` / `.End!.Value` 是在解 `Nullable<Source<char>>`，ts 的 `Start` / `End` 本身就是 `Source<T> | null`，
  按 §7.2 **去掉 `.Value`**，否则会把字符塞进范围字段。
- 最后 `units.ReplaceAt(index, endIndex - index + 1, result)` 是**四参重载**，按 §7.3 在 ts 里叫 `ReplaceCountAt`，
  返回值即新下标。C# 的 `items.Last()` 在 ts 里写成 `items[items.length - 1]`。

原 C# 用对象初始化器写 `new As(owner, template) { Parent = current.Parent }`，ts 侧拆成先 `new` 再赋值。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("NullReferenceException: current");
}
const items: Token<string>[] = [];
let endIndex = -1;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    throw new Error("NullReferenceException: item");
  }
  if (Statement.IsStatementEnd(units, i, [","])) {
    endIndex = i - 1;
    break;
  }
  items.push(item);
}
if (endIndex === -1) {
  endIndex = units.length - 1;
}
const result = new As(owner, template);
result.Parent = current.Parent;
result.AddRange(items);
result.SignIn(current.SourceRange.Start!);
result.SignOut(items[items.length - 1].SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class As extends IndependentToken

类型转换 `as` 表达式。

原 C# 侧是 `public class As : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它**没有**覆写 `ToXmlString`，XML 由基类 `Token` 产出：`<As>子单元的 XML 串接</As>`（标签名即运行时类名，M17）。

## constructor:(owner:IOwner, template:Template<string>)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## method ToDictionary:()=>Map<string, any>

转成字典。

原 C# 是 `public override Dictionary<string, object> ToDictionary() { return base.ToDictionary(); }`——
**纯转调、没有任何改动**，这里照实保留（`override` 写散文，见 M8 / M9），行为与基类 `Token.ToDictionary` 完全一致。
按 M10 / M20，`Dictionary<string, object>` 映射成 `Map<string, any>`。

```ts
return super.ToDictionary();
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；
批量 `Add` 按 M14(c) 写成 `AddRange`。

```ts
const result = new As(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
