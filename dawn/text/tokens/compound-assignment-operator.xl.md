# dependencies
```xl
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceRangeAt, SearchFront } from "../../../core/extensions/list-extension.xl.md"
import { Common } from "./common.xl.md"
import { Symbol } from "./symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

复合赋值运算符 `+=` / `-=` / `*=` 这类：把 `符号 + 赋值号` 拆开成两个符号，再把左侧表达式的副本补回来。

它**不改写**成别的结构，只在单元序列里做一次「切 + 插」——下游照样看到原始的符号与单元。动机是执行层需要一个能单独取到的运算符符号副本。

以 `a += b` 为例（单元序列 `a` `+=` `b`，下标 0 / 1 / 2）：

1. `current`（`+=`）丢掉**第一个**字符，`operatorSymbol` 副本丢掉**第二个**字符。
2. 副本被塞进「本次插入的一批单元」的**末尾**。
3. 用 `SearchFront` 从 `index - 1` 往前找赋值表达式起点，把起点之后到 `index` 之间的单元**逐个克隆**，排在副本前面。
4. 整批在 `index + 1` 处纯插入。

按 M33，展平的嵌套类 `CompoundAssignmentOperator.Reorganization` 写在 `CompoundAssignmentOperator` 之前——
它的 `Instance` 静态字段在类定义时立即求值，而 `Root` 的重组队列会直接引用 `CompoundAssignmentOperatorReorganization.Instance`。

# class CompoundAssignmentOperatorReorganization extends Reorganization

原 C# 是嵌套类 `CompoundAssignmentOperator.Reorganization`（M32 展平改名）。

## static readonly field Instance:CompoundAssignmentOperatorReorganization = new CompoundAssignmentOperatorReorganization()

唯一的实例。

原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 §4 的等价写法落成静态只读字段。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个复合赋值符号。

原 C# 是 `units.Get(index) is Symbol symbol && template.SymbolTemplate.IsCompoundAssignmentSymbol(symbol.TempToString())`，
命中就 `true`，否则 `false`；ts 侧合并成一个表达式。

注意这里用的是**参数传进来的** `template`，而不是 `current.Template`——两个模板在本工程的调用路径上是同一个对象，照原样写。

```ts
const current = Get(units, index);
return current instanceof Symbol && template.SymbolTemplate.IsCompoundAssignmentSymbol(current.TempToString());
```

## static method IsCompoundAssignmentOperatorStart:(current:Token)=>bool

`current` 能不能当作**赋值表达式的起点**——`Process` 用它向前找「这段赋值从哪儿开始」。

原 C# 是静态方法 `public static bool IsCompoundAssignmentOperatorStart(Token<char> current)`，被 `Process` 当作判定器传给 `SearchFront`。
两条判定：

1. 是 `Symbol`：文本算赋值号（`IsAssignmentSymbol`），或者是 `,` / `;` / `:` / `?` 之一。
2. 是内容为 `return` 的 `Common`。

原 C# 用 `else if` 把两条写成一条链（`Symbol` 分支里直接 `return false`，不会落到 `Common` 分支），ts 侧拆成两个早退，语义相同。

```ts
if (current instanceof Symbol) {
  if (current.Template.SymbolTemplate.IsAssignmentSymbol(current.TempToString())) {
    return true;
  }
  if (current.Is(",") || current.Is(";") || current.Is(":") || current.Is("?")) {
    return true;
  }
  return false;
}
if (current instanceof Common && current.Is("return")) {
  return true;
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

切开复合赋值符号、补一份运算符副本，**返回新的下标**。

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值。它**不推进下标**（`ReplaceRangeAt` 的插入发生在 `index + 1` 之后），
所以 ts 侧原样返回入参 `index`。

原逻辑逐步：

- `current = (Symbol)units.Get(index)!`——把 `+=` 这个符号取出来。
- `operatorSymbol = (Symbol)current.Clone()!`，然后 `operatorSymbol.Temp.RemoveAt(1)`、`current.Temp.RemoveAt(0)`：
  副本去掉第二个字符（留 `+`），原件去掉第一个字符（留 `=`）。两句 `RemoveAt` 在 ts 里都是 `splice(位置, 1)`。
- `startIndex = units.SearchFront(index, IsCompoundAssignmentOperatorStart)`——从 `index - 1` 往前找赋值表达式起点；
  找不到给 `-1`，此时 `GetRange(0, index)` 正好取出从头到 `index` 的全部单元。
- `front = units.GetRange(startIndex + 1, index - startIndex - 1)`——赋值号左侧的那一段（**取副本，不动原列表**），
  ts 侧等价写法是 `units.slice(startIndex + 1, index)`。
- `frontClone = front.Select(x => x.Clone())`——逐个克隆。
- `insertUnits = [.. frontClone, operatorSymbol]`——C# 的集合表达式，ts 里写成 `[...frontClones, operatorSymbol]`。
- `units.ReplaceRangeAt(index + 1, 0, insertUnits)`——在 `index + 1` 处**删除 0 个、插入一批**，即纯插入。

`Process` 的 `template` 形参在原 C# 里也没用到（基类签名要求），照实保留。

```ts
const current = Get(units, index) as Symbol;
const operatorSymbol = current.Clone() as Symbol;
operatorSymbol.Temp.splice(1, 1);
current.Temp.splice(0, 1);
const startIndex = SearchFront(units, index, CompoundAssignmentOperatorReorganization.IsCompoundAssignmentOperatorStart);
const front = units.slice(startIndex + 1, index);
const frontClones = front.map((item) => item.Clone());
const insertUnits: Token[] = [...frontClones, operatorSymbol];
ReplaceRangeAt(units, index + 1, 0, insertUnits);
return index;
```

# class CompoundAssignmentOperator

复合赋值运算符的**容器类**，本身没有任何成员。

原 C# 侧是 `public class CompoundAssignmentOperator`：它不继承 `Token`，只作为嵌套类 `Reorganization` 的宿主存在。
`Root` 引用的是展平后的 `CompoundAssignmentOperatorReorganization.Instance`，所以这个空壳类在 ts 里不参与解析流程，也不会进 `Data` / XML。
