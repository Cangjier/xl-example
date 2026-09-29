# dependencies
```xl
import { Branch } from "../../core/syntax/branch.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Sequence } from "../../core/syntax/templates/sequence.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { AreaAnnotation, AreaAnnotationReorganization } from "./tokens/area-annotation.xl.md"
import { AsReorganization } from "./tokens/as.xl.md"
import { Bracket } from "./tokens/bracket.xl.md"
import { Common } from "./tokens/common.xl.md"
import { CompoundAssignmentOperatorReorganization } from "./tokens/compound-assignment-operator.xl.md"
import { ForReorganization } from "./tokens/for/for.xl.md"
import { ForeachReorganization } from "./tokens/foreach/foreach.xl.md"
import { GenericType } from "./tokens/generic-type.xl.md"
import { IfSetReorganization } from "./tokens/if/if-set.xl.md"
import { ImportReorganization } from "./tokens/import.xl.md"
import { InterfaceReorganization } from "./tokens/interface/interface.xl.md"
import { JsonArrayReorganization } from "./tokens/json/json-array.xl.md"
import { JsonObjectReorganization } from "./tokens/json/json-object.xl.md"
import { KeywordReorganization } from "./tokens/keyword.xl.md"
import { LamdaReorganization } from "./tokens/lamda/lamda.xl.md"
import { LetReorganization } from "./tokens/let.xl.md"
import { LineAnnotation, LineAnnotationReorganization } from "./tokens/line-annotation.xl.md"
import { LogicalOperatorReorganization } from "./tokens/logical-operator.xl.md"
import { MethodReorganization } from "./tokens/method.xl.md"
import { NotNullReorganization } from "./tokens/not-null.xl.md"
import { NullConditionalOperatorReorganization } from "./tokens/null-conditional-operator.xl.md"
import { NewReorganization } from "./tokens/new/new.xl.md"
import { PreprocessorDirectives } from "./tokens/preprocessor-directives.xl.md"
import { RegexToken } from "./tokens/regex-token.xl.md"
import { StatementReorganization2, StatementReorganization3 } from "./tokens/statement.xl.md"
import { StringGuide } from "./tokens/string/string-guide.xl.md"
import { Symbol } from "./tokens/symbol.xl.md"
import { TernaryOperatorReorganization } from "./tokens/ternary-operator/ternary-operator.xl.md"
import { TryReorganization } from "./tokens/try/try.xl.md"
import { TypeAssignReorganization } from "./tokens/type-assign.xl.md"
import { TypeDefineReorganization } from "./tokens/type-define.xl.md"
import { WhileReorganization } from "./tokens/while/while.xl.md"
import { WrapSymbol, WrapSymbolReorganization } from "./tokens/wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**解析流水线装配**：整棵 token 树的公共契约——跳转优先级与重组优先级——都在这一个文件里，
`TextContext` 在造根单元之前调一次 `ParsePipeline.Install`。

原 C# 侧这两张表是 `Root` 的静态成员（`GeneralQueue` / `GeneralReorganize`），
所以 `Root` 必须 import 每一个 token 类，而 token 类又反过来依赖 `Root` 所在的命名空间——
**`root` 与 token 层互为依赖**（`Root` 不得不在文件里就按拓扑次序摆放，见 `tokens/bracket.xl.md`
里关于 TDZ 的说明）。本文件把「谁参与解析、按什么顺序问」从根单元里摘出来：

- `Root` 退回纯粹的「语法树顶点」，不再 import 任何具体 token，循环依赖随之解开；
- 要知道这个语言的解析优先级，只需读本文件，不必读 `Root`；
- 新增 token 的改动点从「`Root` 的静态字段」变成「本文件的两张表」，位置更明确。

本文件**不** import `Root`：依赖是单向的 `TextContext → ParsePipeline → tokens`。

# class ParsePipeline

解析流水线的装配表。

原 C# 侧没有这个类——它是一个 `static class`，里面是从 `Root` 摘出来的静态成员。
xl 没有 `static class`，按 M11 落成普通 class + `## static method` / `## static readonly field`
（与 `core/common-util.xl.md` 的 `CommonUtil`、`cjcli.xl.md` 的 `CjcliHost` 同一种形态）。

它自身没有实例状态，也不该被实例化。

## static method CreateGeneralQueue:()=>Sequence<Branch>

通用跳转队列：处理每个字符时按这个顺序问每个 `Branch` 要不要接手。

原 C# 是 `Root.GeneralQueue`（`public static Sequence<Branch<char>> GeneralQueue => new(...)`，
表达式体属性，**每次访问都新建**）。按 M19 本该落成静态属性 + getter，但实测 xl 的打印器不会给
property 输出 `static`——那样会变成实例 getter，调用点就取不到了，所以改成静态方法。

**「每次新建」的语义必须保住**：`Install` 把它交给 `template.BranchTemplate.DefaultValue`，
而每个 `TextContext` 都有自己的 `Template`；共享一份序列对象会让不同模板之间互相串味。

`new Sequence<...>(...)` 的参数要写成**一个数组**：C# 的 `Sequence(params T[] items)` 按 M2
落成 `constructor(items?: Array<T>)`，所以 `new Sequence<Branch>([a, b, …])`。

顺序（决定解析优先级，不能改）：注释 → 预处理指令 → 正则 → 字符串 → 括号 → 泛型 → 软换行 → 符号 → 通用字符。

**泛型必须排在符号之前**：`<` / `>` 同时是符号，`Symbol.AppendIn` 排在前面的话，`<…>` 永远轮不到 `GenericTypeBranch` 判断。排在 `Bracket.JumpIn` 之后则是形状上的就近——两者都是「认下一个字符、挂一个子单元」的单元，且 `( [ {` 与 `<` 不重叠。

```ts
return new Sequence<Branch>([
  AreaAnnotation.JumpIn,
  LineAnnotation.JumpIn,
  PreprocessorDirectives.JumpIn,
  RegexToken.JumpIn,
  StringGuide.JumpIn,
  Bracket.JumpIn,
  GenericType.JumpIn,
  WrapSymbol.AppendIn,
  Symbol.AppendIn,
  Common.AppendIn,
]);
```

## static readonly field GeneralReorganize:Sequence<Reorganization> = new Sequence<Reorganization>([LineAnnotationReorganization.Instance, AreaAnnotationReorganization.Instance, LetReorganization.Instance, KeywordReorganization.Instance, NewReorganization.Instance, MethodReorganization.Instance, NullConditionalOperatorReorganization.Instance, InterfaceReorganization.Instance, JsonObjectReorganization.Instance, JsonArrayReorganization.Instance, ImportReorganization.Instance, LogicalOperatorReorganization.AndInstance, LogicalOperatorReorganization.OrInstance, AsReorganization.Instance, TypeAssignReorganization.Instance, TypeDefineReorganization.Instance, LamdaReorganization.Instance, TernaryOperatorReorganization.Instance, TryReorganization.Instance, IfSetReorganization.Instance, ForReorganization.Instance, ForeachReorganization.Instance, WhileReorganization.Instance, WrapSymbolReorganization.Instance, CompoundAssignmentOperatorReorganization.Instance, NotNullReorganization.Instance])

通用重组队列：单元关闭时按这个顺序把子单元合并成更高层的结构。

原 C# 是 `Root.GeneralReorganize`（`public static Sequence<Reorganization<char>> GeneralReorganize { get; } = new(...)`，
静态只读属性加初值，只求值一次，全体共享）。

**顺序即语义**：注释与软换行先被摘掉，语句级结构（`Let` / `Keyword` / …）再依次尝试，
控制流（`IfSet` / `For` / `Foreach` / `While` / `Try`）最后兜底。改顺序会直接改变 XML。

## static method Install:(template:Template)=>void

把两张通用队列装进一个模板。

原 C# 的装配动作写在 `Root` 的构造器里（设 `BranchTemplate.DefaultValue` → 设
`ReorganizationTemplate.DefaultValue` → 取 `ProcessQueue` → `InitialStatementReorganizationQueue`）。
这里只保留前两步：**模板是调用方的，谁造模板谁装配**，根单元只从装配好的模板上取。

`InitialStatementReorganizationQueue` 的调用点一并挪到根单元的构造器里（它作用于**单元**而不是模板，
所以留在那个时机）——它读的正是 `ReorganizationTemplate.DefaultValue`，放在设完默认值之后，
顺序与原来一致。

`Template.Initialize` 是现成的链式入口（跑一遍回调再返回自身），所以调用方可以直接写
`new Template().Initialize(ParsePipeline.Install)`。

```ts
template.Initialize((self: Template) => {
  self.BranchTemplate.DefaultValue = ParsePipeline.CreateGeneralQueue();
  self.ReorganizationTemplate.DefaultValue = ParsePipeline.GeneralReorganize;
});
```

## static method InitialStatementReorganizationQueue:(unit:Token)=>void

给一个单元装上报废语句用的重组队列。

原 C# 是 `void InitialStatementReorganizationQueue(this Token<char> unit)`（`TextCommonUtil` 里的扩展方法），
体里把默认的重组队列取出来，并在其中**插入**两个语句重组类：

`unit.ReorganizationQueue = unit.Template.ReorganizationTemplate.Get(unit.GetType(), defaultValue => defaultValue?.InsertedBefore<WrapSymbol.Reorganization>(Statement.Reorganization2.Instance, Statement.Reorganization3.Instance))`

`InsertedBefore<T1>` 内部靠 `is T1` 找位置，而 ts 的泛型被擦除（M18），所以改用判定器版本
`InsertedBeforeWhere(items, predicate)`。注意 ts 版的参数顺序是**先元素、后判定器**（M22：函数类型参数必须在最后）。

`unit.GetType()` 按 M17 写成 `unit.constructor`。

**为什么从这里读**：它是对「通用重组队列」的第二次加工，与 `GeneralReorganize` 是同一份契约的两半。
原先 `GeneralReorganize` 在 `Root`、这个扩展方法在 `TextCommonUtil`，读代码时看不出
「语句类是在通用队列里插进去的」这件事。

```ts
unit.ReorganizationQueue = unit.Template.ReorganizationTemplate.Get(
  unit.constructor,
  (defaultValue: any) =>
    defaultValue == null
      ? null
      : defaultValue.InsertedBeforeWhere(
          [StatementReorganization2.Instance, StatementReorganization3.Instance],
          (item: any) => item instanceof WrapSymbolReorganization,
        ),
);
```
