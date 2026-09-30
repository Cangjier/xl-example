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

`CompoundAssignmentOperatorReorganization` 写在 `CompoundAssignmentOperator` 之前——
它的 `Instance` 静态字段在类定义时立即求值，而 `Root` 的重组队列会直接引用 `CompoundAssignmentOperatorReorganization.Instance`。

# class CompoundAssignmentOperatorReorganization extends Reorganization

## static readonly field Instance:CompoundAssignmentOperatorReorganization = new CompoundAssignmentOperatorReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个复合赋值符号。

命中就是 `true`，否则 `false`，合成一个表达式。

注意这里用的是**参数传进来的** `template`，而不是 `current.Template`——两个模板在本工程的调用路径上是同一个对象，所以这样写是安全的。

```ts
const current = Get(units, index);
if (!(current instanceof Symbol)) {
  return false;
}
if (current.FromCompoundAssignment) {
  return false;
}
return template.SymbolTemplate.IsCompoundAssignmentSymbol(current.TempToString());
```

**`FromCompoundAssignment` 那一支是防自反馈的**：`Process` 会插回一份运算符副本
（`&&=` 切出来的 `&&`），那份副本本身也在 `CompoundAssignmentSymbols` 的判据范围内，
不挡掉就会被反复切开、单元数量来回翻倍（实测 `run.mjs` OOM）。见 `Process` 的说明。

## static method IsCompoundAssignmentOperatorStart:(current:Token)=>bool

`current` 能不能当作**赋值表达式的起点**——`Process` 用它向前找「这段赋值从哪儿开始」。

被 `Process` 当作判定器传给 `SearchFront`。两条判定：

1. 是 `Symbol`：文本算赋值号（`IsAssignmentSymbol`），或者是 `,` / `;` / `:` / `?` 之一。
2. 是内容为 `return` 的 `Common`。

两条判定拆成两个早退——`Symbol` 分支里直接 `return false`，不会落到 `Common` 分支，语义相同。

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

它**不推进下标**（`ReplaceRangeAt` 的插入发生在 `index + 1` 之后），
所以原样返回入参 `index`。

逐步：

- `current = Get(units, index) as Symbol`——把 `+=` 这个符号取出来。
- `operatorSymbol = current.Clone() as Symbol`，然后 `operatorSymbol.Temp.splice(1, 1)`、`current.Temp.splice(0, 1)`：
  副本去掉第二个字符（留 `+`），原件去掉第一个字符（留 `=`）。
- `startIndex = SearchFront(units, index, CompoundAssignmentOperatorReorganization.IsCompoundAssignmentOperatorStart)`——从 `index - 1` 往前找赋值表达式起点；
  找不到给 `-1`，此时 `units.slice(0, index)` 正好取出从头到 `index` 的全部单元。
- `front = units.slice(startIndex + 1, index)`——赋值号左侧的那一段（**取副本，不动原列表**）。
- 逐个克隆：`front.map((item) => item.Clone())`。
- `insertUnits = [...frontClones, operatorSymbol]`——副本排在运算符前面。
- `ReplaceRangeAt(units, index + 1, 0, insertUnits)`——在 `index + 1` 处**删除 0 个、插入一批**，即纯插入。

`Process` 的 `template` 形参没有用到（基类签名要求），保留。

```ts
const current = Get(units, index) as Symbol;
const operatorSymbol = current.Clone() as Symbol;
operatorSymbol.FromCompoundAssignment = true;
operatorSymbol.Temp.splice(1, 1);
current.Temp.splice(0, 1);
const startIndex = SearchFront(units, index, CompoundAssignmentOperatorReorganization.IsCompoundAssignmentOperatorStart);
const front = units.slice(startIndex + 1, index);
const frontClones = front.map((item) => item.Clone());
const insertUnits: Token[] = [...frontClones, operatorSymbol];
ReplaceRangeAt(units, index + 1, 0, insertUnits);
return index;
```

**`FromCompoundAssignment` 这个标记是必需的**（实测踩过）：
`Process` 会把 `&&=` 切成 `=` 与一份 `&&` 副本插回去。那份 `&&` **本身也在
`CompoundAssignmentSymbols` 的判据范围内**——新一轮扫描时它又被当成复合赋值去切，
切出来的东西又被处理，于是单元数量来回翻倍，`node tests/parse/run.mjs` 直接
`FATAL ERROR: heap out of memory`（单条用例都在 200ms 内跑完，整份
`expressions/ex-logical-assign` 就发散——是 `Process` 里那条自反馈，不是规则数量的问题）。
打上标记之后 `Previous` 直接放行这一份副本，它只作为普通运算符参与二元/逻辑折算。

# class CompoundAssignmentOperator

复合赋值运算符的**容器类**，本身没有任何成员。

它不继承 `Token`，只是 `CompoundAssignmentOperatorReorganization` 的宿主。
`Root` 引用的是 `CompoundAssignmentOperatorReorganization.Instance`，所以这个空壳类不参与解析流程，也不会进 `Data` / XML。

**已知缺口：切分逻辑是坏的，除了 `+= -= *= /=` 之外的写法都产出畸形单元。**

实测（`a &= b;`，`&=` 不在 `CompoundAssignmentSymbols` 里、因此它按普通符号对处理）：

产物是 `Common(a)` `Symbol(=)` `Common(a)` `Symbol(&)` `Common(b)` ——
补出来的 `&` 落在 `=` **右边**，正解应是 `a = a & b`（`&` 在 `a` 与 `b` 之间）。
`a <<= b` 更明显：词法阶段断成 `<` 与 `<=`，产物是两层 `BinaryOperator Operator="<="`
（实测形状）。也就是说：

- `Process` 里 `operatorSymbol.Temp.splice(1, 1)` 与 `current.Temp.splice(0, 1)` 的切法，
  与 `ReplaceRangeAt(units, index + 1, 0, insertUnits)` 的插入位置合起来**顺序不对**；
- 把 11 个符号补进 `IsCombinedSymbol` 并不能修好它，只会让症状换个样子
  （`a &&= b` 变成 `Common(a)` `Symbol(&=)` `Common(a)` `Symbol(&=)` `Common(b)`）。

**能安全补的前提已经铺好**：`Symbol.FromCompoundAssignment` 标记解决了「切开后插回的
运算符副本又被同一条规则处理」的自反馈（不解决时 `run.mjs` 会 OOM）——
所以下一次修这条时不会重蹈那个坑。要修的是 `Process` 的**切分与插入顺序**：
先把左值那段按原样留在 `=` 左边、再把 `op` 与右值拼到右边，而不是现在这种"插一批克隆 + 一个运算符"。
