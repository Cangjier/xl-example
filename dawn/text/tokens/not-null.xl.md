# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
import { Method } from "./method.xl.md"
import { Symbol } from "./symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

非空断言 `!`：把 `expr!` 里的那个 `!` 从单元列表里删掉——它没有语法结构意义，只是给编译器的标注。

按 M33，展平的嵌套类 `NotNull.Reorganization` 写在 `NotNull` 之前；
`Root` 会在自己的重组队列里持有 `NotNullReorganization.Instance`，所以顺序不能反。

# class NotNullReorganization extends Reorganization

原 C# 是嵌套类 `NotNull.Reorganization`（M32 展平改名）。

它的 `Previous` 是**三路判定**：`index` 处必须是内容为 `!` 的 `Symbol`，且它前一个单元必须是 `Common` / `Bracket` / `Method` 之一。
换句话说：只有「标识符!」「(...)!」「方法(...)!」这三种形状才当非空断言，别的 `!`（如 `!=`）不动。

## static readonly field Instance:NotNullReorganization = new NotNullReorganization()

唯一的实例。

原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`——这里的 `Reorganization` 指的是嵌套的那个类本身，按 §4 的等价写法落成静态只读字段。

## method Previous:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个可以删掉的非空断言 `!`。

原 C# 先取 `units.Get(index - 1)` 存进 `previous`，再用 `units.Get(index) is Symbol symbol && symbol.Is("!") && (previous is Common || previous is Bracket || previous is Method)` 一次判完；
ts 侧拆成早返回，语义相同。`Get` 越界给 `null`，所以下标 `0` 处的 `!` 自然落到 `false`。

```ts
const previous = Get(units, index - 1);
const current = Get(units, index);
if (!(current instanceof Symbol)) {
  return false;
}
if (!(current as Symbol).Is("!")) {
  return false;
}
return previous instanceof Common || previous instanceof Bracket || previous instanceof Method;
```

## method Process:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>int

把 `index` 处的 `!` 从 `units` 里删掉，**返回新的下标**。

原 C# 是 `public override void Process(…, ref int index)`：`units.RemoveAt(index)` 之后 `index--`，让外层循环重新看同一个位置（删除会让后面的单元整体前移一格）。
按 M15 把 `ref int index` 改成返回值，`index--` 就写成返回 `index - 1`。

```ts
units.splice(index, 1);
return index - 1;
```

# class NotNull

非空断言的**容器类**，本身没有任何成员。

原 C# 侧是 `public class NotNull`：它不继承 `Token`，只作为嵌套类 `Reorganization` 的宿主存在。
`Root` 引用的是展平后的 `NotNullReorganization.Instance`，所以这个空壳类在 ts 里不参与解析流程，也不会进 `Data` / XML。
