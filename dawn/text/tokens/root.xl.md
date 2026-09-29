# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Sequence } from "../../../core/syntax/templates/sequence.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { InitialStatementReorganizationQueue } from "../text-common-util.xl.md"
import { AreaAnnotation, AreaAnnotationReorganization } from "./area-annotation.xl.md"
import { AsReorganization } from "./as.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
import { CompoundAssignmentOperatorReorganization } from "./compound-assignment-operator.xl.md"
import { ForReorganization } from "./for/for.xl.md"
import { ForeachReorganization } from "./foreach/foreach.xl.md"
import { IfSetReorganization } from "./if/if-set.xl.md"
import { ImportReorganization } from "./import.xl.md"
import { InterfaceReorganization } from "./interface/interface.xl.md"
import { JsonArrayReorganization } from "./json/json-array.xl.md"
import { JsonObjectReorganization } from "./json/json-object.xl.md"
import { KeywordReorganization } from "./keyword.xl.md"
import { LamdaReorganization } from "./lamda/lamda.xl.md"
import { LetReorganization } from "./let.xl.md"
import { LineAnnotation, LineAnnotationReorganization } from "./line-annotation.xl.md"
import { LogicalOperatorReorganization } from "./logical-operator.xl.md"
import { MethodReorganization } from "./method.xl.md"
import { NotNullReorganization } from "./not-null.xl.md"
import { NullConditionalOperatorReorganization } from "./null-conditional-operator.xl.md"
import { NewReorganization } from "./new/new.xl.md"
import { PreprocessorDirectives } from "./preprocessor-directives.xl.md"
import { RegexToken } from "./regex-token.xl.md"
import { StringGuide } from "./string/string-guide.xl.md"
import { Symbol } from "./symbol.xl.md"
import { TernaryOperatorReorganization } from "./ternary-operator/ternary-operator.xl.md"
import { TryReorganization } from "./try/try.xl.md"
import { TypeAssignReorganization } from "./type-assign.xl.md"
import { TypeDefineReorganization } from "./type-define.xl.md"
import { WhileReorganization } from "./while/while.xl.md"
import { WrapSymbol, WrapSymbolReorganization } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

根单元：整棵语法树的顶点。**`textContext.Root.ToString()` 就是验收用的那份 XML。**

它同时是整套 token 的**总装配点**：两个静态字段把「通用跳转队列」与「通用重组队列」按固定顺序
拼出来，交给 `Template` 当默认值。所以只要 `Root` 存在，下面列到的每个 token 类就必须存在——
这也是为什么 `Root` 必须放在 token 层全部完成之后才能写。

注意两个静态成员的语义差别，移植时不能合并：

| C# | ts | 语义 |
| --- | --- | --- |
| `static Sequence<Branch<char>> GeneralQueue => new(...)` | `## static method CreateGeneralQueue` | **每次访问都新建**一个序列 |
| `static Sequence<Reorganization<char>> GeneralReorganize { get; } = new(...)` | `## static readonly field` | 只建一次，全体共享 |

`GeneralQueue` 必须是「每次新建」：`Root` 的构造器把它交给 `template.BranchTemplate.DefaultValue`，
而每个 `TextContext` 都有自己的 `Template`；共享一个序列对象会让不同模板之间互相串味。

C# 里那些 `X.Reorganization.Instance` 现在都指向展平后的顶层类（M32），例如
`LineAnnotation.Reorganization.Instance` → `LineAnnotationReorganization.Instance`。
`String.StringGuide.JumpIn` 里的 `String` 是**命名空间段**，不是嵌套类，所以 ts 里就是
`StringGuide.JumpIn`。

# class Root extends UnitToken

根单元。

原 C# 侧是 `public class Root : UnitToken<char>`。按 M31，`char` 在规范里写 `string`。

## constructor:(owner:IOwner, template:Template)=>void

以负责人与模板创建，并把两套通用队列装进模板。

原 C# 的构造器顺序是：设 `BranchTemplate.DefaultValue` → 设 `ReorganizationTemplate.DefaultValue`
→ `ProcessQueue = template.BranchTemplate.Get(GetType())` → `InitialStatementReorganizationQueue()`。
`GetType()` 按 M17 写成 `this.constructor`。

```ts
super(owner, template);
template.BranchTemplate.DefaultValue = Root.CreateGeneralQueue();
template.ReorganizationTemplate.DefaultValue = Root.GeneralReorganize;
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
InitialStatementReorganizationQueue(this);
```

## static method CreateGeneralQueue:()=>Sequence<Branch>

通用跳转队列：处理每个字符时按这个顺序问每个 `Branch` 要不要接手。

原 C# 是 `public static Sequence<Branch<char>> GeneralQueue => new(...)`——**表达式体属性，每次访问都新建**。
按 M19 本该落成 `## static property` + `### get`，但**实测 xl 的打印器不会给 property 输出 `static`**——那样会变成一个实例 getter，
`Root.GeneralQueue` 就取不到了。所以改成静态方法 `CreateGeneralQueue()`，由构造器显式调用：既保住「每次新建」，也保住「静态」。
调用点是 `Root` 自己的构造器，改名不影响其它文件。

`new Sequence<...>(...)` 的参数要写成**一个数组**：C# 的 `Sequence(params T[] items)` 按 M2 落成 `constructor(items?: Array<T>)`，
所以 `new Sequence<Branch>([a, b, …])`。

顺序（决定解析优先级，不能改）：注释 → 预处理指令 → 正则 → 字符串 → 括号 → 软换行 → 符号 → 通用字符。

```ts
return new Sequence<Branch>([
  AreaAnnotation.JumpIn,
  LineAnnotation.JumpIn,
  PreprocessorDirectives.JumpIn,
  RegexToken.JumpIn,
  StringGuide.JumpIn,
  Bracket.JumpIn,
  WrapSymbol.AppendIn,
  Symbol.AppendIn,
  Common.AppendIn,
]);
```

## static readonly field GeneralReorganize:Sequence<Reorganization> = new Sequence<Reorganization>([LineAnnotationReorganization.Instance, AreaAnnotationReorganization.Instance, LetReorganization.Instance, KeywordReorganization.Instance, NewReorganization.Instance, MethodReorganization.Instance, NullConditionalOperatorReorganization.Instance, InterfaceReorganization.Instance, JsonObjectReorganization.Instance, JsonArrayReorganization.Instance, ImportReorganization.Instance, LogicalOperatorReorganization.AndInstance, LogicalOperatorReorganization.OrInstance, AsReorganization.Instance, TypeAssignReorganization.Instance, TypeDefineReorganization.Instance, LamdaReorganization.Instance, TernaryOperatorReorganization.Instance, TryReorganization.Instance, IfSetReorganization.Instance, ForReorganization.Instance, ForeachReorganization.Instance, WhileReorganization.Instance, WrapSymbolReorganization.Instance, CompoundAssignmentOperatorReorganization.Instance, NotNullReorganization.Instance])

通用重组队列：单元关闭时按这个顺序把子单元合并成更高层的结构。

原 C# 是 `public static Sequence<Reorganization<char>> GeneralReorganize { get; } = new(...)`——静态只读属性加初值，只求值一次，全体共享。

**顺序即语义**：注释与软换行先被摘掉，语句级结构（`Let` / `Keyword` / …）再依次尝试，
控制流（`IfSet` / `For` / `Foreach` / `While` / `Try`）最后兜底。改顺序会直接改变 XML。

## protected method Close:()=>void

关闭根单元：打个标记，然后把最后一个子单元也关掉。

原 C# 是 `protected override void Close()`，其中 `Last()?.TryToClose()` 是空条件调用。

```ts
this.Closed = true;
const last = this.Last();
if (last !== null) {
  last.TryToClose();
}
```

## protected method Default:(Context:SyntaxContext, Src:Source)=>void

所有跳转都不接手时的兜底。

原 C# 对 `\r` / `\n` / 空格 / `\t` 直接返回，其余走 `Console.WriteLine` 打印「Unknown Branch」。
按 port-brief §3.9，调试输出不移植，所以 ts 侧的非空白分支什么都不做——**注意这意味着未知字符被静默忽略**，
与 C# 的「打印但继续」在行为上等价（都不产生 token）。

```ts
switch (Src.Value) {
  case "\r":
  case "\n":
  case " ":
  case "\t":
    return;
  default:
    break;
}
```

## protected method ExitOrPre:(Context:SyntaxContext, Src:Source)=>BranchStates

根单元永远不「退出」，一律交给跳转队列。

原 C# 是 `protected override BranchStates ExitOrPre(...) => BranchStates.Undo;`。

```ts
return BranchStates.Undo;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，内容是子单元的 XML 串接。

原 C# 覆写了基类的同名方法，逻辑与基类一致（先取 `GetType().Name`，再无分隔拼接 `Data` 里每个子单元的 XML）。
按 M17，`GetType().Name` 写成 `this.constructor.name`。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name}>${temp.join("")}</${name}>`;
```

## method Process:(Context:SyntaxContext, Src:Source)=>void

处理一个字符：第一次处理时把范围起点钉在第一个字符上，然后走基类的调度。

原 C# 覆写里只多了一件事——`SourceRange.Start` 为空就地赋值；注意它**直接改字段**，
不走 `SignIn`（`SignIn` 只能设一次，而这里要允许后续再设）。

```ts
if (this.SourceRange.Start === null) {
  this.SourceRange.Start = Src;
}
super.Process(Context, Src);
```

## method Clone:()=>Token

克隆整棵树。

原 C# 是先建一个 `Root`，再把每个子单元克隆后 `Add` 进去；注意它**没有**调 `TryToClose`，
也没有签入签出范围——与其它 token 的 `Clone` 不同，照抄。

```ts
const root = new Root(this.Owner, this.Template);
for (const item of this.Data) {
  root.Add(item.Clone());
}
return root;
```
