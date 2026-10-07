# dependencies
```xl
import { StatementBranch } from "./tokens/statement.xl.md"
import { LetBranch } from "./tokens/let.xl.md"
import { Branch } from "../core/syntax/branch.xl.md"
import { CloseRule } from "../core/syntax/close-rule.xl.md"
import { Sequence } from "../core/syntax/templates/sequence.xl.md"
import { Token } from "../core/syntax/token.xl.md"
import { Template } from "../core/syntax/templates/template.xl.md"
import { Get } from "../core/extensions/list-extension.xl.md"
import { IsTriviaUnit, SkipPreviousTrivia } from "./text-common-util.xl.md"
import { AreaAnnotation } from "./tokens/area-annotation.xl.md"
import { AsCloseRule } from "./tokens/as.xl.md"
import { FunctionTypeCloseRule } from "./tokens/function-type.xl.md"
import { ConditionalTypeCloseRule } from "./tokens/conditional-type.xl.md"
import { StaticBlockBranch } from "./tokens/class/static-block.xl.md"
import { NamespaceExportCloseRule } from "./tokens/namespace-export.xl.md"
import { TypeUnionCloseRule } from "./tokens/type-union.xl.md"
import { TypeBracketCloseRule } from "./tokens/type-bracket.xl.md"
import { TypePrefixCloseRule } from "./tokens/type-operator.xl.md"
import { LiteralTypeCloseRule } from "./tokens/literal-type.xl.md"
import { ImportTypeCloseRule } from "./tokens/import-type.xl.md"
import { TypeParameterCloseRule } from "./tokens/type-parameter.xl.md"
import { InferTypeCloseRule } from "./tokens/infer-type.xl.md"
import { OptionalCallCloseRule } from "./tokens/optional-call.xl.md"
import { TypePredicateCloseRule } from "./tokens/type-predicate.xl.md"
import { EnumMemberBranch } from "./tokens/enum/enum-member.xl.md"
import { TupleMemberCloseRule } from "./tokens/tuple-member.xl.md"
import { ParenthesizedTypeCloseRule } from "./tokens/parenthesized-type.xl.md"
import { ParameterCloseRule } from "./tokens/parameter.xl.md"
import { BindingElementCloseRule } from "./tokens/binding-element.xl.md"
import { Bracket } from "./tokens/bracket.xl.md"
import { ClassBranch } from "./tokens/class/class.xl.md"
import { Identifier } from "./tokens/identifier.xl.md"
import { CompoundAssignmentOperatorCloseRule } from "./tokens/compound-assignment-operator.xl.md"
import { Decorator, DecoratorCloseRule } from "./tokens/decorator.xl.md"
import { DoWhileCloseRule } from "./tokens/do-while/do-while.xl.md"
import { EnumBranch } from "./tokens/enum/enum.xl.md"
import { FieldCloseRule } from "./tokens/field.xl.md"
import { ForCloseRule } from "./tokens/for/for.xl.md"
import { ForeachCloseRule } from "./tokens/foreach/foreach.xl.md"
import { FunctionCloseRule } from "./tokens/function/function.xl.md"
import { GenericType } from "./tokens/generic-type.xl.md"
import { IfSetBranch } from "./tokens/if/if-set.xl.md"
import { ImportCloseRule } from "./tokens/import.xl.md"
import { ExportCloseRule } from "./tokens/export.xl.md"
import { InterfaceBranch } from "./tokens/interface/interface.xl.md"
import { NamespaceCloseRule } from "./tokens/namespace/namespace.xl.md"
import { JsonArrayCloseRule } from "./tokens/json/array-literal.xl.md"
import { BlockCloseRule, JsonObjectCloseRule } from "./tokens/json/object-literal.xl.md"
import { KeywordCloseRule } from "./tokens/keyword.xl.md"
import { LabelCloseRule } from "./tokens/label.xl.md"
import { LamdaCloseRule } from "./tokens/lamda/lamda.xl.md"
import { LineAnnotation } from "./tokens/line-annotation.xl.md"
import { LogicalOperatorCloseRule } from "./tokens/logical-operator.xl.md"
import { MethodCloseRule } from "./tokens/method.xl.md"
import { MethodDeclarationCloseRule } from "./tokens/function/method-declaration.xl.md"
import { NotNullCloseRule } from "./tokens/not-null.xl.md"
import { UnaryOperatorCloseRule } from "./tokens/unary-operator.xl.md"
import { BinaryOperatorCloseRule } from "./tokens/binary-operator.xl.md"
import { SpreadCloseRule } from "./tokens/spread.xl.md"
import { NullConditionalOperatorCloseRule } from "./tokens/null-conditional-operator.xl.md"
import { NewCloseRule } from "./tokens/new/new.xl.md"
import { PreprocessorDirectives } from "./tokens/preprocessor-directives.xl.md"
import { PropertyAccessCloseRule } from "./tokens/property-access.xl.md"
import { RegexToken } from "./tokens/regex-token.xl.md"
import { SignatureCloseRule } from "./tokens/signature/signature.xl.md"
import { Statement } from "./tokens/statement.xl.md"
import { TokenFormer } from "../core/syntax/token-former.xl.md"
import { StringGuide, StringGuideBranch } from "./tokens/string/string-guide.xl.md"
import { SwitchCloseRule } from "./tokens/switch/switch.xl.md"
import { SymbolToken } from "./tokens/symbol-token.xl.md"
import { TernaryOperatorCloseRule } from "./tokens/ternary-operator/ternary-operator.xl.md"
import { TryCloseRule } from "./tokens/try/try.xl.md"
import { TypeLiteralCloseRule } from "./tokens/type-literal/type-literal.xl.md"
import { TypeAssignCloseRule } from "./tokens/type-assign.xl.md"
import { TypeDefineCloseRule } from "./tokens/type-define.xl.md"
import { WhileCloseRule } from "./tokens/while/while.xl.md"
import { LineWrap, WrapSymbolCloseRule } from "./tokens/line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**解析流水线装配**：整棵 token 树的公共契约——跳转优先级与**收尾规则优先级**——都在这一个文件里，
`TextContext` 在造根单元之前调一次 `ParsePipeline.Install`。

**改名对照**（第 561–563 轮，按用户指示逐步移除 reorg ✓）：这一族从前叫**重组**（reorg），
因为那是「**全局重组那一趟**」的规则——单元关闭之后，在一张平表上按队列把相邻单元合并成高层结构 ✓。
那一趟在第 561 轮整段删掉 ✓（它从第 471 轮起就默认关着 ✓），于是这一族只剩
`Token.ApplyCloseRules` 这一个调用点 ✓ ⇒ 名字一起改掉 ✓：

| 旧名 | 现名 | 时机 |
| --- | --- | --- |
| `Reorganization`（`reorganization.xl.md`） | `CloseRule`（`close-rule.xl.md`） | 规则基类 |
| `Token.ReorganizationQueue` | `Token.CloseRuleQueue` | 某个单元关闭后要跑的那张表 |
| `Template.ReorganizationTemplate` | `Template.CloseRuleTemplate` | 按单元类型给表 |
| `XxxReorganization` | `XxxCloseRule` | 各条规则 |
| `ParsePipeline.GeneralReorganize` | `ParsePipeline.GeneralCloseRule` | 通用那张表 |
| `InitialStatement/KeywordReorganizationQueue` | `InitialStatement/KeywordCloseRuleQueue` | 两张专用表的装配 |

⇒ 于是全仓 `.xl.md` 里**不再有 `Reorganization` 这个词** ✓（只剩说明历史的散文 ✓）。
规则本体一条都没删 ✗ —— `CloseRule` 的 `Previous` / `Process` 与从前逐字相同 ✓，
读数因此一字未动 ✓（见 `docs/member-layer-plan.md` 第 561–563 轮 ✓）；
「**哪几条其实已经没人用**」的清单与逐条删除是下一块 ✓。

把这两张表放在这里而不是摊在各 token 里，有三个好处：

- `Root` 退回纯粹的「语法树顶点」，不必认识每一个 token 类（本文件**不** import `Root`，
  依赖是单向的 `TextContext → ParsePipeline → tokens`）；
- 要知道这个语言的解析优先级，只需读本文件，不必读 `Root`；
- 新增 token 的改动点集中在「本文件的两张表」，位置明确。

# class ParsePipeline

解析流水线的装配表。

它只有静态成员、自身没有实例状态，也不该被实例化——形态与 `core/common-util.xl.md` 的 `CommonUtil`、
`cjcli.xl.md` 的 `CjcliHost` 一致（xl 没有 `static class`，静态容器就是普通 class 加 `## static` 成员）。

## static method CreateGeneralQueue:()=>Sequence<Branch>

通用跳转队列：处理每个字符时按这个顺序问每个 `Branch` 要不要接手。

写成**静态方法**而不是静态字段，是为了保住「每次访问都新建一份」的语义：
`Install` 把它交给 `template.BranchTemplate.DefaultValue`，而每个 `TextContext` 都有自己的 `Template`；
共享一份序列对象会让不同模板之间互相串味。

`new Sequence<...>(...)` 的参数要写成**一个数组**：`Sequence` 的构造器收 `Array<T>`，
所以 `new Sequence<Branch>([a, b, …])`。

顺序（决定解析优先级，不能改）：注释 → 预处理指令 → 正则 → 字符串 → **`if` 向导** → **`class` 向导** → 括号 → 泛型 → 软换行 → 符号 → 通用字符。

**泛型必须排在符号之前**：`<` / `>` 同时是符号，`SymbolToken.AppendIn` 排在前面的话，`<…>` 永远轮不到 `GenericTypeBranch` 判断。排在 `Bracket.JumpIn` 之后则是形状上的就近——两者都是「认下一个字符、挂一个子单元」的单元，且 `( [ {` 与 `<` 不重叠。

**`IfSetBranch.JumpIn` 只能紧挨在 `Identifier.AppendIn` 前面**（第 392 轮加）：

- 它认的字符是 `i` ✓，而排在它前面的那些分支**没有一个会接手 `i`** ✓（正则 / 字符串 / 括号 / 泛型 / 软换行 / 符号 ✓），
  所以插在这儿与插在队尾**只差一件事**：它必须在 `Identifier.AppendIn` **之前** ✓——
  否则那个 `Identifier` 先被造出来 ✓、这个分支再也轮不到 ✓（`Identifier.AppendIn` 返回 `Done` ✓）。
- 它自己带三条**位置闸**（前一个实义单元不是 `.` / `?.`、宿主不是类型位、宿主不是成员列表 ✓，
  见 `tokens/if/if-guide.xl.md` ✓），所以放在这么靠前的位置**不会抢走别人认的词** ✓：
  `a.if(x)` 的 `if` 仍然落到 `Identifier` 上 ✓，由 `MethodCloseRule` 收成调用 ✓
  （它排在规则队列第 11 位 ✓，与这一条无关 ✓——**那是重组的位次，这里是跳转的位次** ✗，两张表各管各的 ✓）。

```ts
return new Sequence<Branch>([
  AreaAnnotation.JumpIn,
  LineAnnotation.JumpIn,
  PreprocessorDirectives.JumpIn,
  RegexToken.JumpIn,
  StringGuide.JumpIn,
  IfSetBranch.JumpIn,
  ClassBranch.JumpIn,
  StaticBlockBranch.JumpIn,
  EnumBranch.JumpIn,
  InterfaceBranch.JumpIn,
  Bracket.JumpIn,
  GenericType.JumpIn,
  // **语句壳（软换行那一档）必须排在 `LineWrap.AppendIn` 之前** ✓（第 499 轮 ✓）：
  // 派发循环遇到第一个 `Done` 就 `return` ✓，而 `LineWrap.AppendIn`（`WrapSymbolBranch` ✓）
  // 会把换行吃掉并返回 `Done` ✗ ⇒ 排在它之后的 `StatementBranch.JumpIn` **一次都没被问到** ✗
  // （第 481–497 轮它一直是这样 ✗ —— 实测 `samples/hello.ts` 的 `let answer = 0` 换行那一格
  // **根本没成壳** ✓，`=` 与 `0` 落到 `Root` 上成了平级兄弟 ✗）。这一支的 `Success` 本来就按
  // 「终结符还没进 `Data`」写 ✓，挪到 appender 之前正好 ✓。
  StatementBranch.JumpIn,
  LineWrap.AppendIn,
  // **`Let` 在解析期成形**：认的是 `=` / `:` / `;` / `,` / 换行 这几格 ✓，
  // 所以只要排在 `SymbolToken.AppendIn` 之前就行 ✓（与 `IfSetBranch` 当初的加法同一处表 ✓）。
  LetBranch.JumpIn,
  // **语句壳在解析期成形** ✓（第 481 轮）：位置只有一格可行 ✓ —— **`SymbolToken.AppendIn` 之前** ✓。
  // 派发循环遇到第一个 `Done` 就 `return` ✓（逐下标实测：`;` 在 `i=14 SymbolBranch` 那一格
  // 被接手并返回 `Done` ✓ ⇒ 排在它之后的任何一格**一次都没被问到** ✓——第 478 / 480 两轮
  // 都撞在这上面 ✓），所以壳必须排在 appender **之前** ✓；而那时 `;` 还没进 `Data` ✓，
  // 于是判据与切片都按「终结符尚未入列」写 ✓（见 `tokens/statement.xl.md` 的 `Condition` / `Success` ✓）。
  SymbolToken.AppendIn,
  Identifier.AppendIn,
]);
```

**`IfSetBranch.JumpIn` 排在 `Bracket.JumpIn` 之前** ✗（第 395 轮改，用户口径 ✓）：
它的入口挪到了 **`(`** 那一格 ✓（那时 `if` 已经在宿主的平列表里 ✓，一个向前看的字符都不用读 ✓），
而 `(` 正是 `Bracket.JumpIn` 认的字符 ✓——排在它后面就永远轮不到 ✓。
`(` 照样会被开成一个括号 ✓，只是**晚一步** ✓：由向导的暂存单元照**宿主那条队列**开 ✓
（那条队列里 `Bracket.JumpIn` 好好地在 ✓）。

**`class` 也有自己的分支了** ✓（本轮）：`ClassBranch.JumpIn` 的入口在 **`{`** 那一格 ✓，
与 `IfSetBranch` 同一条铁律 ✓——那时**整个类头都已经读到了** ✓，判据一个字符都不向前看 ✓。
它排在 `Bracket.JumpIn` 之前，原因与 `IfSetBranch` 和 `(` 的关系**一模一样** ✓：
`{` 正是 `Bracket.JumpIn` 认的字符 ✓，排在后面就永远轮不到 ✓。

**`interface` / `enum` 也各有一支了** ✓（第 414 / 415 轮）：`EnumBranch.JumpIn` 与
`InterfaceBranch.JumpIn`，入口同样落在 **`{`** 上 ✓，同样排在 `Bracket.JumpIn` 之前 ✓。
`if` 与 `interface` **首字母相同**那个冲突从来不存在 ✓：两个向导认的是 `(` 与 `{` ✓，不重叠 ✓
——现在的形状下更无从谈起：`interface` 那个词由 `Identifier` 照常吃掉 ✓，
分支在 `{` 那一刻**往回扫已经读到的单元** ✓（`FindInterfaceWord` ✓），根本不抢首字母 ✓。

## static method CreateMemberListQueue:()=>Sequence<Branch>

**成员列表的跳转队列**：通用队列**去掉 `IfSetBranch.JumpIn`**（第 393 轮加）。

**为什么需要第二条队列** ✗：`class` / `interface` / `enum` 的体是一张成员列表 ✓，
而成员位上的 `if(a) { }` 是一个**名叫 `if` 的成员** ✓——与 if 语句**形状一模一样** ✗，
分它们的只有上下文 ✓。第 391 轮用一句词法推断（`Bracket.IsMemberList`）回答了它 ✓，
而那是「这个 `{` 是不是成员列表」的**第二份答案** ✗（第一份在三条规则自己手里 ✓）。

这一条把答案换成**结构** ✓：成员列表里的字符由这条队列处理 ✓，它里面**没有** `IfSetBranch.JumpIn` ✓
⇒ 「成员列表里不认 if 语句」由**队列本身**保证 ✓，`if` 那一侧一个闸都不用加 ✓。

**这一条队列里不需要摘掉任何东西** ✓：成员位由**队列**保证 ✓，而不是靠某个分支自己让路 ✓。
嵌套的成员列表（类里再写一个类 ✓）也走同一条路 ✓——里面那个体的括号同样由
`tokens/bracket.xl.md` 问一次 `IsMemberListHead` 再换 ✓。

**谁用它**（两处）：
- `tokens/bracket.xl.md`：`{` 开出来之后，问 `IsMemberListHead` ✓，是成员列表就换这条队列 ✓；
- `tokens/if/if-guide.xl.md`：`if` 的收集器用它 ✓（暂存期间嵌套的 `if` 不该另起向导 ✓）。

**第 393–394 轮之间它还多一个用户**（`tokens/member-list-guide.xl.md` ✓）：那一版是「向导收下整个类头、
认出体括号、把队列换掉、再交还」✗。第 394 轮按用户的口径把它删了 ✓——
`class` 本来就由 `Identifier` 照常吃掉 ✓，向导用不着去抢首字母 ✓，
`{` 那一刻**回头看已经读到的单元**就够了 ✓（见 `IsMemberListHead` 那一节 ✓）。
那一版还留着一笔账：`if` 与 `interface` **首字母都是 `i`** ✓，两个向导抢同一个字符，
只能靠**向前看**区分 ✗——而向前看在不完整的输入上会**静默判错** ✓（`Document.GetValue` 越界给 `undefined` ✓，
判据于是悄悄成假 ✓）。现在的形状根本没有这个入口 ✓。

与 `CreateGeneralQueue` **同一条语义** ✓：每次访问都新建一份 ✓，模板之间不串味 ✓
（所以三处各拿一份、互不影响 ✓；`Removed` 本身也是产出副本 ✓）。

```ts
return ParsePipeline.CreateGeneralQueue().Removed([IfSetBranch.JumpIn]);
```

## static method IsMemberListHead:(template:Template, units:Array<Token>)=>bool

`units` 的**最后一个单元**是不是一张刚刚打开的成员列表的体。

**它回答的是「这个 `{` 是不是成员列表」这个问题，而答案是「问那几条规则自己」** ✗——
`InterfaceCloseRule` / `EnumCloseRule` 各自都有一份**自己的**头判据（`Previous` ✓），
这里是唯一的调用点 ✓。
**不另写一份「这是不是接口头」** ✗：第 391 轮那版就是这么走偏的（`Bracket.IsMemberList` 用一句词法推断
去猜同一件事 ✓，等于同一个问题两份答案 ✓），第 393 轮把它换成了「向导收头 + 问那三条规则」✓，
这一轮再简化一步：**连头都不用收** ✗。

**`class` 已经不在这一问里了** ✓（本轮 ✓）：类体现在由 `ClassBranch` 在 `{` 那一刻**自己认领** ✓，
那个括号根本走不到 `Bracket.JumpIn` ✓ ⇒ 这里再留一份「这是不是类头」就是**第二份答案** ✗。
于是「是不是成员列表」这个问题只剩两个答案：接口 / 枚举各一条自己的 `Previous` ✓。

**为什么可以只看已经读到的单元** ✓（用户口径 ✓）：`interface` 那个词早就由 `Identifier` 照常吃掉了 ✓，
它此刻就躺在**宿主自己的平列表**里 ✓；而这个 `{` 是**刚刚**由 `BracketBranch.Success` 挂上去的 ✓
（调用点就在 `AddToMounted` 之后 ✓），所以那一刻**体括号已经在表里** ✓——
那两条规则的 `Previous` 要的正是「头 + 体括号都在」这个形状 ✓。
⇒ 不向前看一个字符 ✓、不开暂存单元 ✓、不交还 ✓、也不用抢首字母（`interface` 与 `if` 不再撞车 ✓）。

往回扫的边界（只看已经读到的 ✓）：

- `;` ⇒ 停（上一句已经完了 ✓）；
- 另一个**花括号** ⇒ 停（换了一张表 ✓——`interface I { }` 换行 `if (x) { }` 里那个 `{`
  往回扫会撞上前一个接口体 ✓，不该认成成员列表 ✓）；
- **圆括号 / 方括号透明** ✓（类型参数段、继承表达式 ✓，与 `DecideMemberList` 当初那条实测同款 ✓）；
- 名字 / `.` / `extends` / 修饰词 / 装饰器 ⇒ 继续往前 ✓；
- 撞上 `interface` / `enum` ⇒ 就是它，交给对应那条规则 ✓；
- 扫到头 ⇒ 不是成员列表 ✓。

**类型字面量那一支用 `Context`，不要用 `TypeLiteralCloseRule.Previous`** ✗——
这一条是量出来的 ✓，第一版就是复用了它、当场判宽 ✓：

- `TypeLiteralCloseRule.IsTypePosition` 是**事后**判据 ✓，它自己文件里写着
  「老走法能对，是因为它跑的时候 `LabelCloseRule` 已经把冒号收走了」✓
  ——拿到**开括号那一刻**来问，宿主那张表还是词法阶段的平列表 ✓，
  `outer: { … }` 那种标签冒号与类型标注的冒号还分不开 ✓（那正是 `DecideBracketContext` 记过的三次失败 ✓）；
- 后果是**整块**的 ✓：普通 `{` 块被判成成员列表 ⇒ 块里的 `if` 拿不到向导 ⇒ 而兜底规则已经删了 ✗
  ⇒ 整条 `if` 子树连同它的条件与体一起从产物里消失 ✓
  （实测**缺 118599 个节点** ✓，而「多出来」只有 5660 ✓——比例正好是「一条 if 换一个 ExpressionStatement」✓）。

`Context` 那一支是**开括号那一刻**算好的 ✓，与重组时序无关 ✓；
它原先有一处判宽（`): A | B {` 被判成类型位 ✓），第 394 轮已经在
`../text-common-util.xl.md` 的 `DecideBracketContext` 里修掉了 ✓（`|` / `&` 在 `{` 上继续往前扫 ✓）。
修完之后全语料 **1451 / 1451** ✓——所以这一格是有判据守着的 ✓，不是「顺手换个写法」✓。

```ts
const bodyIndex = units.length - 1;
const body = Get(units, bodyIndex);
if (!(body instanceof Bracket) || body.startBracket !== "{") {
  return false;
}
// **标签的块不是成员列表** ✗（第 396 轮，从 XML 查出来的 ✓）：`outer: { … }` 里那个 `{`
// 的 `Context` 也会是 `"type"` ✓——`DecideBracketContext` 自己在文件里写着，
// 词法阶段「分不出 `outer: { … }` 这种**标签的冒号**与 `x: { … }` 这种**类型标注的冒号**」✓；
// 那个区分正是 `LabelCloseRule` 带来的 ✓，所以这里问它一句 ✓。
//
// **必须问在 `Context` 之前** ✗：第一版把它塞在下面那个循环里 ✓，
// 可 `Context` 那一句**在循环之前就返回了** ✗ ⇒ 永远到不了 ✗（改了等于没改 ✓，XML 一打就现形 ✓）。
//
// 症状（实测 `ex-labeled-block` / `rt-label-break-out-of-block` 等 8 条 ✓）：
// 标签块的队列被换成了成员列表队列 ✓ ⇒ 块里的 `if` 拿不到向导 ✓
// ⇒ 产物里是一个**裸的 `<Keyword>if</Keyword>`** ✓ ⇒ 降级层报
// `name is not a local or a capture: if` ✓（它把 `if` 当成一个标识符去解析 ✓）。
//
// **`let x: { a: 1 }` 不会误伤** ✓：那种写法过不了 `Previous` 里的 `IsStatementStart` ✓
// （它要求冒号前那个名字处在**语句开头** ✓）——这正是那条闸当初加的理由 ✓。
const colonIndex = SkipPreviousTrivia(units, bodyIndex);
const colon = Get(units, colonIndex);
if (colon instanceof SymbolToken && colon.Is(":")) {
  const nameIndex = SkipPreviousTrivia(units, colonIndex);
  const labelName = Get(units, nameIndex);
  if (labelName instanceof Identifier && LabelCloseRule.Instance.Previous(template, units, nameIndex)) {
    return false;
  }
}
if (body.Context === "type") {
  return true;
}
// **这里原来还有一支「撞上 `interface` 就问它的 `Previous`」** ✗（第 415 轮删掉）：
// `class` / `enum` / `interface` 三族的体现在都由各自的解析期分支在 `{` 那一刻认领 ✓
// ⇒ 那三个体的括号**根本走不到 `Bracket.JumpIn`** ✓ ⇒ 再留一份「这是不是接口头」就是**第二份答案** ✗
// （同一个问题两份答案，正是这一节开头在讲的毛病 ✓）。
// 剩下这一支与上面那个 `Context === "type"` 才是这一问真正还要答的东西 ✓：
// 类型字面量与标签块的 `{` 仍然由 `Bracket` 开 ✓，它们才需要成员列表队列 ✓。
return false;
```

## static method CreateEnumMemberQueue:()=>Sequence<Branch>

**枚举体专属的跳转队列**（第 421 轮）：成员列表队列 + `EnumMemberBranch.JumpIn`。

**插在哪儿就是全部的理由**：

- **`StringGuide.JumpIn` 之前** —— 枚举成员的名字可以是字符串（`"k" = "v"`），
  排在字符串向导后面的话那一格先被字符串吃掉，成员就没了开头；
- 而注释那几条（`AreaAnnotation` / `LineAnnotation` / `PreprocessorDirectives` / `RegexToken`）
  **本来就在更前面** ⇒ `/** doc */` 的第二格由注释分支先认下，
  成员分支不必也不能去问「前一格那个 `/` 还在不在」；
- **`LineWrap` / `SymbolToken` / `Identifier` 之后**（它们是队列里的通配那几条）：
  `,` 必须落到 `SymbolToken.AppendIn` 上（逗号属于枚举声明那一级，留在成员外面），
  空白则由成员分支**吞掉**（枚举体下不放软换行单元，与改动前后的形状一致）。

```ts
return ParsePipeline.CreateMemberListQueue().InsertedBefore(StringGuide.JumpIn, [EnumMemberBranch.JumpIn]);
```

## static readonly field GeneralCloseRule:Sequence<CloseRule> = new Sequence<CloseRule>([DecoratorCloseRule.Instance, FunctionCloseRule.Instance, SignatureCloseRule.Instance, MethodDeclarationCloseRule.Instance, LabelCloseRule.Instance, FieldCloseRule.Instance, NewCloseRule.Instance, MethodCloseRule.Instance, NullConditionalOperatorCloseRule.Instance, NamespaceCloseRule.Instance, TypeLiteralCloseRule.Instance, BlockCloseRule.Instance, JsonObjectCloseRule.Instance, TypeBracketCloseRule.Instance, ImportTypeCloseRule.Instance, TypePrefixCloseRule.Instance, LiteralTypeCloseRule.Instance, JsonArrayCloseRule.Instance, InferTypeCloseRule.Instance, TypeParameterCloseRule.Instance, TypePredicateCloseRule.Instance, TupleMemberCloseRule.Instance, ParenthesizedTypeCloseRule.Instance, ParameterCloseRule.Instance, BindingElementCloseRule.Instance, ImportCloseRule.Instance, ExportCloseRule.Instance, NamespaceExportCloseRule.Instance, TypeUnionCloseRule.Instance, AsCloseRule.Instance, FunctionTypeCloseRule.Instance, ConditionalTypeCloseRule.Instance, TypeAssignCloseRule.Instance, LamdaCloseRule.Instance, TypeDefineCloseRule.Instance, TernaryOperatorCloseRule.Instance, TryCloseRule.Instance, SwitchCloseRule.Instance, ForCloseRule.Instance, ForeachCloseRule.Instance, DoWhileCloseRule.Instance, WhileCloseRule.Instance, WrapSymbolCloseRule.Instance, PropertyAccessCloseRule.Instance, CompoundAssignmentOperatorCloseRule.Instance, NotNullCloseRule.Instance, OptionalCallCloseRule.Instance, UnaryOperatorCloseRule.Instance, BinaryOperatorCloseRule.PowerInstance, BinaryOperatorCloseRule.MultiplicativeInstance, BinaryOperatorCloseRule.AdditiveInstance, BinaryOperatorCloseRule.ShiftInstance, BinaryOperatorCloseRule.RelationalInstance, BinaryOperatorCloseRule.InInstance, BinaryOperatorCloseRule.InstanceofInstance, BinaryOperatorCloseRule.EqualityInstance, BinaryOperatorCloseRule.LogicalAssignmentInstance, BinaryOperatorCloseRule.BitwiseInstance, BinaryOperatorCloseRule.NullishInstance, LogicalOperatorCloseRule.AndInstance, LogicalOperatorCloseRule.OrInstance, SpreadCloseRule.Instance, BinaryOperatorCloseRule.CommaInstance, KeywordCloseRule.Instance])

通用规则队列：单元关闭时按这个顺序把子单元合并成更高层的结构。
静态只读字段，只求值一次，全体共享。

**注释不在这里被摘掉**：跳转队列把行注释与区域注释解析成独立单元（见 `CreateGeneralQueue`），
而规则队列里没有摘除它们的规则，所以它们会以 `<LineAnnotation>…</LineAnnotation>` /
`<AreaAnnotation>…</AreaAnnotation>` 的形式出现在 XML 里。要让注释不进产物，就在这张表的前面加两条
「把注释从父单元 `Data` 里删掉」的规则（`tokens/line-annotation.xl.md` / `tokens/area-annotation.xl.md`
各写一个 `CloseRule` 子类即可）。

**队首这段的顺序本身就是语义**（每一条各自的理由见对应文件）：

| 位置 | 规则 | 为什么必须在这里 |
| --- | --- | --- |
| 1 | `Decorator` | `@Component({...})` 里的 `Component({...})` 长着调用形状，`Method` 先跑就再也凑不出「`@` + 名字」 |
| 2 | `Function` | `function f(x) {}` 的 `f(x)` 一旦先变成 `Method`，`function` 就配不上名字了 |
| 3 | `Enum` | 枚举体那对 `{ }` 要在被当成 Json 对象之前先认领 |
| 4 | `MethodDeclaration` | 与 `Function` 同理：`name(...) { }` 要在 `Method` 之前认出「后面跟花括号」 |
| 5 | `Label` | `name:` 要在 `TypeDefine` 之前认领冒号，否则 `outer: while (...) {...}` 会被当成一个类型标注 |
| 6 | `Field` | 字段没有关键字，只能在**成员位置**靠父单元认出（`ClassBody` / `InterfaceBody`）；排在 `Let` 之后（`let x` 仍旧归 `Let`）、`TypeDefine` 之前（要先把整条成员圈起来，否则 `TypeDefine` 会跨过换行吞掉后面几个字段） |
| 7 | `Lamda` | 带返回类型标注的箭头函数（`(a): T => body`）也要在 `TypeDefine` 之前认领那个 `:`，否则 `TypeDefine` 会连函数体一起吞掉 |
| 7.5 | `FunctionType` | 类型的 `(a: A) => B` 必须**排在 `Lamda` 前面**：两者判的都是 `=>`，`FunctionType` 认的是「左边不是形参表」那一半（`FindParameters` 给 `-1`），留给 `Lamda` 的才是真箭头函数 |
| … | 其余按既有顺序 | `TypeDefine` / `Ternary` / … / `NotNull`，`Switch` 插在 `Try` 与 `For` 之间 |
| 末 | `Keyword` | 它是「在任意上下文都是关键字」的**兜底身份**；语句级结构先各自认领，剩下的散词才升级 |

`Keyword` 排在最后是必须的：它是「在任意上下文都成立」的兜底身份，而 `for` / `while` / `try` /
`class` / `extends` 这些词全靠**上下文**成形。排在前面时它们会先被升级成 `Keyword`，
各自的语句规则（判的是 `Identifier` 的文本）就再也没机会认领了。

**顺序即语义**：语句级结构（`Let` / `Keyword` / …）先依次尝试，
控制流（`For` / `Foreach` / `While` / `Try`）最后兜底。改顺序会直接改变 XML。

**`IfSetCloseRule` 已经不在队里了** ✗（第 394 轮删掉 ✓）：`if` 现在由**解析期向导**
（`tokens/if/if-set.xl.md` ✓）在读的时候造 ✓，它压根到不了这一趟 ✓。
`if` 原来的位次（`Switch` 与 `For` 之间 ✓）从此空着 ✓。

**`ClassCloseRule` 也不在队里了** ✗（本轮删掉 ✓）：`class` 现在由**解析期分支**
（`tokens/class/class.xl.md` 的 `ClassBranch` ✓）在 `{` 那一刻造 ✓。
它原来的位次（队首第 2 位、`Decorator` 之后 ✓）从此空着 ✓——
**一条一条把语句级结构从这张表里搬出去** ✓，这就是这条路在走的方向 ✓
（下一批是 `Function` / `Enum` / `MethodDeclaration` ✓）。

**`StaticBlockCloseRule` 也不在队里了** ✗（本轮删掉 ✓）：类静态块现在由**解析期分支**
（`tokens/class/static-block.xl.md` 的 `StaticBlockBranch` ✓）在 **`{`** 那一刻造 ✓
——入口落在 `{` 上 ✓、那一刻 `static` 那个词与「宿主是 `ClassBody`」两样都已经读到 ✓，
判据一个字符都不向前看 ✓。它原来那位（`Field` 之后 ✓）从此空着 ✓。
**这一条是「成员层」的第一格** ✓：`Class` 在 `{` 那一刻把整个类头收下 ✓，
`ClassBody` 自己吃 `{ … }` ✓，它下面的成员再一个一个搬 ✓（下一格是 `Field` / `MethodDeclaration` ✓）。

**`EnumCloseRule` 也不在队里了** ✗（本轮删掉 ✓）：枚举声明现在由**解析期分支**
（`tokens/enum/enum.xl.md` 的 `EnumBranch` ✓）在 **`{`** 那一刻造 ✓（入口落在 `{` 上、
那一刻 `enum` 那个词与名字都已经读到 ✓），`Enum` / `EnumBody` 与 `Class` / `ClassBody` 逐条对齐 ✓。
`IsMemberListHead` 里的 `enum` 一支同时删掉 ✓——那个问题从此只剩接口一个答案 ✓。
**类与枚举的「头」共用一份准备机件** ✓：`declaration-common` 的 `ReorganizeDeclarationDecorators` ✓
（装饰器必须在算 `DeclarationStart` **之前**成形 ✓，这条次序两处都要 ✓）。

**已搬走的那一支还欠哪些 reorg**（第 415 轮量出来的清单）：

`class` / `enum` / `interface` 的**声明本身**已经一处 reorg 都不挂了 ✓，但它们下面**还欠**这些
（逐个用「摘掉队列 → 跑全语料」量过 ✓，不是猜的 ✓）：

| 还欠在哪 | 摘掉会怎样（实测） | 要等哪一层搬完 |
| --- | --- | --- |
| `ClassBody` / `EnumBody` / `InterfaceBody` / `StaticBlock` 的**语句队列** | 成员（`Field` / `MethodDeclaration` / `EnumMember` / `Statement`）全部不成形 | 成员层——**最大的一处**，四个体都靠它 |
| `ExpressionWithTypeArguments` 的通用队列 | `extends mixin(B)` / `extends (Base)` 掉 `CallExpression` 与 `Identifier`（2 个文件） | 「调用表达式 / 成员访问」那一层 |
| `Decorator` 的通用队列 | 装饰器的实参括号不成形 | 装饰器那一层（现在由 `ReorganizeDeclarationDecorators` **显式**调用 ✓） |
| `GenericType` 的通用队列 | 类型参数段 / 类型实参段不成形 | 类型层 |

**已经摘干净的两处**：`HeritageClause` 自己那一趟（子句词改由 `Keyword.FromIdentifier` 在
`Take` 里当场升成 `<Keyword>` ✓，实测摘掉队列会让 `<Keyword>extends</Keyword>` 退回
`<Identifier>extends</Identifier>`——补上这一句之后全语料一处不掉 ✓）；
以及 `Class` / `Enum` / `Interface` 三个引导单元各自的兜底队列 ✓。

## static method KeyWords:()=>Array<string>

这套语言配置里的关键字表：`Keyword` 单元只在文本命中这张表时才产生。

表里收 TypeScript 的保留字与上下文关键字，于是 `async` / `await` / `return` / `throw` / `readonly`
这类词在 XML 里有了自己的标签。要换一套语言，改这张表就够了——它和两张队列一样，
属于「这套语言怎么解析」，所以和它们装在同一个 `Install` 里。

表里**不收**字面量（`true` / `false` / `null`）：它们是 `Identifier` 的值语义（`IsBool` 等判定挂在 `Identifier` 上），
不是上下文关键字。

表里**收** `in` 与 `of`（第 25 轮接上）：

- `of` 在 TypeScript 里不是保留字，但它是**上下文关键字**，`for (x of y)` 里的它就是关键字；
- `in` 是保留字，三种用法（`for (x in y)`、`k in o`、映射类型的 `[K in keyof T]`）都该有 `Keyword` 标签；
- **代价是两条既有规则要跟着改**：`ForCloseRule` / `ForeachCloseRule` 判定「括号里有没有 `in` / `of`」
  原来靠 `item instanceof Identifier && item.Is("in")`，而那个括号（`(` 开的括号）**有自己的规则队列**，
  里面的 `in` / `of` 在括号关闭时就跑过一次升级了——升级成 `Keyword` 之后两条规则都认不出它，
  `for (var name in all)` 会被 `ForCloseRule` 接走并抛「`(...)`中语句不满足格式要求」
  （这是真出现过的回归，`typescript.js` 就是在这儿炸的）。

  所以本轮把四个调用点一起换成 `declaration-common.xl.md` 的 **`IsWordUnit`**（`Identifier` 或 `Keyword` 都认）：
  `For`、`Foreach` 的两处、以及 `field.xl.md` 里 `BracketNameText` 认 `[K in T]` 的那一处。

```ts
return [
  "abstract",
  "accessor",
  "as",
  "asserts",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "finally",
  "for",
  "foreach",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "infer",
  "instanceof",
  "interface",
  "is",
  "keyof",
  "let",
  "module",
  "namespace",
  "new",
  "of",
  "override",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "satisfies",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "type",
  "typeof",
  "unique",
  "using",
  "var",
  "void",
  "while",
  "with",
  "yield",
];
```

## static method BanedMethodNames:()=>Array<string>

不能当方法名的词：`MethodNameTemplate` 拿它挡掉「看着像调用、其实是语法结构」的那批词。

`MethodNameTemplate` 的初值已经挡掉了 `if` / `for` / `while` / `catch` 这一批；这里再补上 TypeScript 里
会被误认成调用的关键字——`switch (x)` / `function (x)` / `typeof (x)` / `void (0)` / `yield (x)` /
`throw (x)` 全都长着「名字 + 括号」的样子，`Method` 与 `MethodDeclaration` 两条规则都会先被它们骗到。

```ts
return [
  "switch",
  "function",
  "class",
  "enum",
  "typeof",
  "void",
  "delete",
  "yield",
  "throw",
  "do",
  "case",
  "default",
  "finally",
  "in",
  "of",
  "instanceof",
  "keyof",
  "new",
  "with",
  "extends",
  "infer",
  "readonly",
  "unique",
];
```

**`readonly` / `unique` 是第 66 轮补的**：它们是**只出现在类型位的修饰词**（`IsTypeModifier` 里有它们，
`keyof` / `infer` / `new` / `typeof` 早就在这张表里）。漏掉 `readonly` 的代价实测很重：
`type A = readonly (B | undefined)[]` 里 `readonly` 后面紧跟一个括号，`MethodCloseRule`
把它当成一次**调用**，产物是 `<Method name="readonly">B | undefined</Method>`——真正的结构
（修饰词 + 数组类型 + 括号类型 + 联合）整段塌掉，`TypeAssign` 里只剩这一层假调用
（真实语料 `typescript.d.ts` 4 处：`readonly (ResolvedProjectReference | undefined)[]` 等）。
`unique` 同理（`unique symbol` 虽然不带括号，但它与 `readonly` 是一对，一起补上没有额外风险）。

**`extends` / `infer` 是第 54 轮补的**：`T extends (this: infer U, …) => any ? U : never`
（`lib.es5.d.ts` 的 `ThisParameterType`）里那个括号被当成 `extends(...)` 的一次**调用**，
收出一个 `<Method name="extends">`——函数类型于是整段散掉（`FunctionType` 也认不出来，
它要求 `=>` 左边是一个括号单元，而括号已经被 `Method` 吞了）。这两个词都是保留字，
不可能当方法名，加进禁用表没有风险。

**`import` 不在这里**（试过、退回来了）：把 `import` 加进禁用表能挡住
`typeof import("assert")` 被收成 `MethodDeclaration name="import"`，
但**连带**挡住了动态 `import("m")` 的 `Method`（调用）节点——那张表是「能不能当方法名」的**唯一**判据，
调用规则与声明规则共用它。所以两处改成各自精确地拒一次：
`MethodDeclarationCloseRule.Previous` 拒 `import`（见 `tokens/function/method-declaration.xl.md`），
`ImportCloseRule.Previous` 拒 `import` 后面紧跟 `(` 的情形（动态 `import` 是调用、不是导入声明）。

## static method Install:(template:Template)=>void

把两张通用队列**与这套语言的关键字配置**装进一个模板。

**模板是调用方的，谁造模板谁装配**：`Install` 只负责往模板上写东西，根单元只从装配好的模板上读。
`TextContext` 的调用方因此只需要 `new Template().Initialize(ParsePipeline.Install)`。

`InitialCloseRuleQueue` 的调用点不在这里，而在根单元的构造器里（它作用于**单元**而不是模板，
所以留在那个时机）——它读的正是这里设下的 `CloseRuleTemplate.DefaultValue`，顺序天然成立。

关键字表与禁用方法名表一并在这一步装上：它们和两张队列一样，是「这套语言怎么解析」的一部分。
三样东西装完之后，模板上「这套语言怎么解析」就没有别的地方要配了（见 `tokens/root.xl.md` 的契约检查）。

`Template.Initialize` 是现成的链式入口（跑一遍回调再返回自身）。

```ts
template.Initialize((self: Template) => {
  // **成形器**（第 486–488 轮）：把 `Token.FormStatement` / `Token.ApplyCloseRules` 落到
  // `typescript` 层那一份实现上（`token-former-impl.xl.md` ✓）。
  // 它是**进程级的一份**（`Token` 上的静态字段 ✓），装一次就够 ✓——装在这里是因为
  // 「装配是调用方的责任」这条口径只有这一个入口 ✓。
  Token.Former = TokenFormerImpl.Instance;
  self.BranchTemplate.DefaultValue = ParsePipeline.CreateGeneralQueue();
  self.CloseRuleTemplate.DefaultValue = ParsePipeline.GeneralCloseRule;
  self.KeywordTemplate.Allow(ParsePipeline.KeyWords());
  self.MethodNameTemplate.Ban(ParsePipeline.BanedMethodNames());
  self.BranchTemplate.AddModifyItem(StringGuideBranch, ParsePipeline.ExtendStringStarts);
});
```

## static method InitialKeywordCloseRuleQueue:(unit:Token)=>void

给一个**装类型文本**的单元装上报废类型用的规则队列：`KeywordCloseRule` 与 `WrapSymbolCloseRule` 两条。

与 `InitialCloseRuleQueue` 是同一个思路的两半：那一条装「语句队列」，
这一条装「类型队列」。

**为什么不是通用队列**：`TypeDefine` / `TypeAssign` 的内容是类型，通用队列里的
`TernaryOperatorCloseRule` 会把**条件类型** `T extends U ? A : B` 收成表达式三元
（`type X = T extends Array<infer U> ? U : never` 于是长出一个 `TernaryOperator` 节点），
那是错的——类型位的 `? :` 是条件类型，不是三元表达式。
类型位要的只是「把 `keyof` / `typeof` / `readonly` / `is` / `asserts` / `interface` 这些词升级成 `Keyword`」，
所以就装这一条。

```ts
unit.CloseRuleQueue = new Sequence<CloseRule>([ImportTypeCloseRule.Instance, TypeBracketCloseRule.Instance, TypePrefixCloseRule.Instance, LiteralTypeCloseRule.Instance, InferTypeCloseRule.Instance, TypePredicateCloseRule.Instance, TupleMemberCloseRule.Instance, ParenthesizedTypeCloseRule.Instance, ParameterCloseRule.Instance, BindingElementCloseRule.Instance, TypeUnionCloseRule.Instance, ConditionalTypeCloseRule.Instance, KeywordCloseRule.Instance, WrapSymbolCloseRule.Instance]);
```

**七条规则、不是一条**：`ImportTypeCloseRule` 把 `[typeof] import("m")[.A.B]` 收成
`ImportType`；`TypeBracketCloseRule` 把类型位的方括号收成
`ArrayType` / `TupleType` / `IndexedAccessType`；`TypePrefixCloseRule` 把
`keyof` / `typeof` / `readonly` / `unique` 连同它们的操作数收成 `TypeOperator` / `TypeQuery`；
`LiteralTypeCloseRule` 把类型位的字面量包成 `LiteralType`；
`InferTypeCloseRule` 把条件类型里的 `infer X` 收成 `InferType`（里面配一个 `TypeParameter`）；
`TypeUnionCloseRule` 收联合 / 交叉；`ConditionalTypeCloseRule` 收条件类型
`T extends U ? A : B`（**排在联合之后**：回扫那个 `extends` 时，`|` / `&` 会先被联合收成一个
单元，否则回扫在第一个 `|` 上就停下了——见下面「条件类型必须跟在联合后面」）；
`KeywordCloseRule` 把类型位的关键词升级成 `Keyword`；
`WrapSymbolCloseRule` 把类型文本里的**软换行**摘掉——类型可以折行排版，
那些换行是版面而不是内容（`Array<String,` 换行 `Int64>` 里那个换行不该留在产物里）。
其余的一律不要（见上）。

**条件类型必须跟在联合后面**（第 123 轮补的这一条）：`type X = A extends B | C ? D : E;`
的整段文本是**在 `TypeAssign` 自己的队列里**重组的（语句那一层 `|` 的父单元是 `Root`，
不是类型容器，联合规则根本不会在那一层命中）。条件类型规则回扫 `?` 前面的 `extends` 时
**遇到符号就停**，`|` 正是符号——所以联合先收成 `UnionType`（它的 `TryToClose` 会跑自己那一趟，
把成员定下来）之后，条件类型才看得见那个 `extends`：

    收联合之前： [A, extends, B, «|», C, «?», D, :, E]   ← 回扫在 «|» 上停，FindExtendsIndex = -1
    收联合之后： [A, extends, «UnionType(B|C)», «?», D, :, E]  ← UnionType 是透明的，找到 extends ✓

少了这一条，`lib.es5.d.ts` 的 `Awaited` 一整个类型别名、`typescript.d.ts` 的二十多条
`… extends X | Y ? A : B` 全部落空（投影侧表现为「缺 `ConditionalType` + 缺它整个子树」）。

**顺序即语义，几条前哨的先后不能换**：

- **导入类型排最前**：`typeof import("m")` 里的 `typeof` 要先被它吸收——
  否则类型运算符那一趟会先把 `typeof X` 收成 `TypeQuery`，导入类型只能拿到半截，
  产物与 TS 的 `ImportType`（`typeof` 是它自己的标志位）就对不上了；
- 方括号排在运算符前面（`readonly A[]` 是 `readonly (A[])`、不是 `(readonly A)[]`）；
- 字面量排在运算符**后面**（`-1` 里的 `-` 是字面量的一部分，先让运算符那一趟跑完
  才不会把 `-` 当成前缀运算符去收操作数——实测 `type X = -1` 的 `UnaryOperator` 在
  运算符那一趟就成形了，本规则只负责在外面套一层）；
- 字面量排在联合**前面**，`A | "b"` 里的 `"b"` 因此是已经包好的 `LiteralType`，
  联合收集时不用再管它。

**为什么这几条能安全地装在这张共享队列里**：`BinaryOperator` / `UnaryOperator` / `Export` /
`Foreach` 也用这张队列，而它们的 `Data` 里装的是**值**（`a[b]`、`let v = typeof x`、`const s = "a"`）。
所以每条规则的第一道闸都是**父亲必须是纯类型容器**——值位的父亲（`Statement` / `ObjectLiteral` /
`BinaryOperator` …）全都不在白名单里，一个都不会被误收（值位的 `await import("m")` 仍是调用节点）。

## static method ExtendStringStarts:(branch:any)=>void

把**单引号**加进「字符串起点」集合（见 `../typescript/tokens/string/string-guide.xl.md` 的 `AddStringChar`）。

`StringGuideBranch.StringChars` 的初值只有双引号，单引号与反引号要靠这条就地修改器补上——
机制早就写好了（`SequenceTemplate.AddModifyItem`），但**调用点一直缺失**：没有它，
`'abc'` 不被当成字符串，里面的每个字符都退化成 `SymbolToken` / `Identifier`。

**为什么这条比看上去重要**：TypeScript 的模块说明符常用单引号（`import … from './x'`），
说明符里的 `/` 会被正则词法接手，把**同一文件后面的内容整段吞掉**——
实测 `@types/node` 的 undici 系文件（`fetch.d.ts` / `dispatcher.d.ts` / `webidl.d.ts` …）
因此丢掉全部 interface / class / function / type alias 节点。

反引号与单引号一次加齐。**模板字符串的内插不需要额外改动**：
`string.xl.md` 的 `Default` 第 6 条分支（三个开关全关，正是反引号串走的那条）早就写好了——
`{` 且前一个字符是 `$`、`StringChar` 是反引号时，置 `interpolationCount = 1`、
把那个 `$` 从单元上 `Undo` 掉、挂 `InterpolationString`。
缺的只是「反引号被当成字符串起点」这一步，和当初单引号那处一模一样。

引号字符本身由 `StringGuide` 记着（`new StringGuide(unit.Template, source.Value)`），
退出向导按同一个字符收尾，反引号不需要额外的退出规则。

```ts
branch.AddStringChar("'");
branch.AddStringChar("`");
```

## static method InitialCloseRuleQueue:(unit:Token)=>void

给一个单元装上它的收尾规则队列：取**该单元类型**那一份（模板上没有专门注册就是通用规则队列 ✓）。

**第 564 轮起这里只有这一句** ✓：从前它还要往队列里**插**两条语句规则
（`StatementCloseRule2` / `StatementCloseRule3` ✓，插在 `WrapSymbolCloseRule` 之前 ✓），
而那两条规则在 `RunCloseRules` 里是**显式跳过**的 ✗ ⇒ 插进去从来没被跑到过 ✓
（第 564 轮量的账：全语料 `Previous` 调用 **0** 次 ✓）⇒ 插入连同那两条规则一起删掉 ✓。

**名字**（第 565 轮 ✓）：它从前叫 `InitialStatementCloseRuleQueue` ——
名字里那半截指的是**插进去的两条语句规则** ✗，而那两条规则已经删掉 ✓（见上 ✓）⇒
它现在装的**不是**「语句规则」✓，就是**这一族**通用的那一份 ✓ ⇒ 改名为 `InitialCloseRuleQueue` ✓
（与基类 `CloseRule` ✓、字段 `CloseRuleQueue` ✓、模板 `CloseRuleTemplate` ✓ 同一族命名 ✓，
**48 处**替换 ✓、27 个文件 ✓）。

**这条装配线本身留着** ✓：它现在与各单元构造器里那句
`template.CloseRuleTemplate.Get(this.constructor)` **完全等价** ✓，本可以整体并掉 ✓ ——
但那样会有 **22 份**「队列从哪来」的解释散到 22 个构造器里 ✗，而这里一份就说明白 ✓。
它是**装配**（`ParsePipeline` 的口径 ✓：装默认队列、关键字表、两种队列 ✓），不是「重组」的残骸 ✓。

**`Get` 用一个实参** ✓：单参用法取的就是 `CloseRuleTemplate.DefaultValue` ✓（`Install` 装的是
`GeneralCloseRule` ✓），与从前那个「两个实参 + 原样返回默认值」的回调**内容完全一致** ✓ ——
队列里的内容没变，只是少了一次插入 ✓。

```ts
unit.CloseRuleQueue = unit.Template.CloseRuleTemplate.Get(unit.constructor);
```

# class TokenFormerImpl extends TokenFormer

`Token` 那两条钩子的落地实现（第 486–488 轮 ✓）：装配时被装进 `Token.Former` ✓（见本文件 `Install` ✓）。

**为什么放在这一份文件里** ✗：它要同时用到 `Statement` 与四条规则（`Function` / `Parameter` /
`TypeDefine` / 关键字 ✓），而 `type-define.xl.md` **反过来 import 本文件** ✗ ⇒
把实现放进 `type-define` 那条链上的任何一份都会绕出环 ✗。
放在这里刚合适 ✓：这四条规则本来就在这里 import ✓（`Install` 也在这里 ✓ ——
「谁装配谁就有那一份实现」✓）。

## static readonly field Instance:TokenFormerImpl = new TokenFormerImpl()

唯一实例。

## static field Depth:int = 0

**这一趟当前的递归深度**（第 496 轮 ✓，第 497 轮**留着** ✗）。

第 497 轮补上收敛环之后**试过撤掉它** ✗：实测**撤不掉** ✓ —— 撤掉之后 294 份语料当场炸 ✓
（78 处栈溢出 ✓ + 216 处 `SourceException` 那一族 ✓，见 `tmp/recon/r497-final-off.txt` ✓）。
⇒ 收敛环管的是「**一个单元内部**跑到不动为止」✓，管不住「单元造出来又往下钻」那条链 ✗ ——
后者要的是「每个单元只在自己那一趟里收」那一道 ✓（第 495 轮记的第二条护栏 ✗，还没补 ✓）。

所以这道深度界**暂时留着** ✓：`Depth >= 8` 就跳过这一层 ✓（深层那几条规则不跑 ✓，
形状与对照态因此不同 ✗ —— 这笔账还挂着 ✓）。

## method FormStatement:(unit:Token, terminator:Token)=>void

转发给 `Statement.FormFrom`——判据、切片、区间只有那一份实现 ✓。

```ts
Statement.FormFrom(unit, terminator);
```

## method ApplyCloseRules:(unit:Token)=>void

**关闭之后那一趟**：按**规则队列的次序**跑**已经搬进解析期的那些规则** ✓。

**第 561 轮起它是唯一那一趟** ✓：全局重组那一趟已经删掉 ✓（见 `core/syntax/token.xl.md` 的
`TryToClose` ✓），所以这里不再有「对照态里别跑」那一道 ✓ ——`unit.CloseRuleQueue === null`
仍是它的第一句 ✓（有些类**本来就没有队列** ✗，例如 `FunctionType` 那一族 ✓）。

**名字的现状** ✓（第 562 轮 ✓）：容器那一侧已经摘掉「重组」✓ ——
`Token.CloseRuleQueue` ✓、`Template.CloseRuleTemplate` ✓；
**规则本体那一侧还叫 `CloseRule`** ✗（基类 `core/syntax/close-rule.xl.md` ✓、
`Sequence<CloseRule>` 那个类型名 ✓、各条 `XxxCloseRule` 类 ✓），
按用户指示逐步搬 ✓，最后一块见 `docs/member-layer-plan.md` 的迁移账 ✓。
所以下面这些注释、以及本文件里「队列」两个字，说的都是**这一趟**的规则表 ✓，
与那条已经删掉的全局重组那一趟无关 ✓。

次序是硬的 ✗（两条都是实测出来的）：

- **关键字升级必须最后** ✗：`function` 那个词一旦升成 `Keyword` ✓，
  `FunctionCloseRule.Previous` 的 `current instanceof Identifier && current.Is("function")` 就再也认不出它 ✗
  （规则队列里 `KeywordCloseRule` 也确实排在 `TypeDefineCloseRule` 之后 ✓）；
- **`TypeDefine` 必须在 `Function` 之后** ✗：返回类型那个 `:` 少了 `Function` 先成形 ✓，
  会一路吞到函数体里去 ✗ —— 实测 `tmp/recon/i42.ts`：只搬 `TypeDefine` 时 `Block` 与 `ReturnStatement`
  当场从 OK 变 MISS ✗，与 `Function` 一起搬就是**四个方向全零** ✓。
- **`TypeAssign`（第 35）排在 `TypeDefine`（第 37）之前** ✓（第 489 轮接上的 ✓）：
  `type X = …` 的整段先收成别名 ✓，那条声明里的类型标注才轮到 `TypeDefine` ✓。
- **`Let`（队列第 6）跳过** ✗（第 490 轮 ✓）：解析期已经有 `LetBranch` ✓，
  再跑 `LetCloseRule` 会**两次成形** ✗ —— 那一格从此由解析期独占 ✓。
- **成员那一簇照队列次序接上** ✓（第 490 轮 ✓）：`Decorator`(1) → `Function`(2) → `Signature`(3)
  → `MethodDeclaration`(4) → `Label`(5) → `Field`(7) ✓；实测这一簇（连 `Decorator` ✓）
  把读数从 221 推到 **290 / 1037** ✓。
- **下游那一簇接在 `Field` 之后** ✓（第 491 轮 ✓）：`New`(8) → `Method`(9) →
  `NullConditionalOperator`(10) → `Namespace`(11) → `TypeLiteral`(12) → `Block`(13) →
  `JsonObject`(14) → `TypeBracket`(15) ✓ —— 两次量的账：`New`/`Method`/`NullConditional`/`Namespace`
  值 290 → **327** ✓，再加字面量与类型括号那四条值 → **349 / 1037** ✓。
- **类型下半段接在 `TypeBracket` 之后** ✓（第 492 轮 ✓）：`ImportType`(16) → `TypePrefix`(17) →
  `LiteralType`(18) → `JsonArray`(19) → `InferType`(20) → `TypeParameter`(21) → `TypePredicate`(22) →
  `TupleMember`(23) → `ParenthesizedType`(24) ✓ —— 两次量的账：前四条值 349 → **381** ✓，
  九条全上值 → **424 / 1037** ✓（**字段名那一栏从 115 掉回 26** ✓）。
- **后半段接在 `ParenthesizedType` 之后** ✓（第 493 轮 ✓）：`HeritageClause`(26) → `BindingElement`(27)
  → `Import`(28) → `Export`(29) → `NamespaceExport`(30) → `TypeUnion`(31) → `As`(32) ✓
  —— 值 424 → **464 / 1037** ✓。

**每条规则还是它自己那一份实现** ✓：`XxxCloseRule.Instance.ApplyTo(unit)` ✓
（那个循环只有一份 ✓，见 `core/syntax/close-rule.xl.md` ✓）——
这一轮搬的是**调用时机** ✓，规则本体的逐条内联留到后面一块一块做 ✓。

```ts
// **收敛环**（第 497 轮 ✓）：与当初全局重组那一趟**同款** ✓ ——
// 「扫到列表不再变化为止，硬上界 16 趟」✓（第 127 轮的护栏 ✓）。
// 少了它会怎样 ✗（第 494/495 轮实测）：这一趟只是「每条规则各扫一遍」✓，
// 半成形的东西直接往下一层钻 ✓ ⇒ 两副面孔一起出现：**栈溢出**（99 处 ✓）与**堆爆**（4 GB / 91 秒 ✓）。
// 有了它，一个单元内部就不会再自我触发 ✓；但**单元造出来又往下钻那条链它管不住** ✗ ——
// 第 497 轮实测撤掉深度界：294 份语料当场炸 ✓（78 处栈溢出 + 216 处 `SourceException` ✓），
// 所以第 496 轮那道临时的深度硬上界**暂时留着** ✗（要补的是「每个单元只在自己那一趟里收」那一道 ✓）。
// **没有规则队列的单元不进这一趟** ✓（第 508 轮 ✓）：有些类**本来就没有队列** ✗
// （`FunctionType` 那一族 ✓），它们的内容不该被再收一遍 ✓。
// 少了这一句，规则造出来的单元**自己也会关一次** ✓ ⇒ 又跑整串规则 ✗ ⇒
// 「自己套自己」那一族就是这么来的 ✓（第 502 / 507 轮各修了一处 ✓，这一句一次收掉其余 ✓）。
if (unit.CloseRuleQueue === null) {
  return;
}
if (TokenFormerImpl.Depth >= 8) {
  return;
}
TokenFormerImpl.Depth = TokenFormerImpl.Depth + 1;
try {
const maxPasses = Math.min(16, unit.Data.length + 2);
for (let pass = 0; pass < maxPasses; pass++) {
  const snapshot = unit.Data.slice();
  this.RunCloseRules(unit);
  if (unit.Data.length === snapshot.length && unit.Data.every((item, at) => item === snapshot[at])) {
    break;
  }
}
} finally {
  TokenFormerImpl.Depth = TokenFormerImpl.Depth - 1;
}
```

## method RunCloseRules:(unit:Token)=>void

**那一串规则**（次序照规则队列 ✓，一条不多一条不少 ✓）——由收敛环反复调用 ✓。

次序是硬的 ✗（三条都是实测出来的）：

- **关键字升级必须最后** ✗：`function` 那个词一旦升成 `Keyword` ✓，
  `FunctionCloseRule.Previous` 的 `current instanceof Identifier && current.Is("function")` 就再也认不出它 ✗
  （规则队列里 `KeywordCloseRule` 也确实排在 `TypeDefineCloseRule` 之后 ✓）；
- **`TypeDefine` 必须在 `Function` 之后** ✗：返回类型那个 `:` 少了 `Function` 先成形 ✓，
  会一路吞到函数体里去 ✗ —— 实测 `tmp/recon/i42.ts`：只搬 `TypeDefine` 时 `Block` 与 `ReturnStatement`
  当场从 OK 变 MISS ✗，与 `Function` 一起搬就是**四个方向全零** ✓；
- **`BinaryOperator` 那一族必须排在 `WrapSymbol` 之后** ✗（第 496 轮 ✓）：它们在对照态的队列里排得很靠后 ✓，
  前面那几十条规则先把形状收拢 ✓。

```ts
// **照着单元自己的队列跑** ✓（第 555 轮 ✓）：次序由队列给 ✓（那里本来就是
// 「顺序即语义」的唯一定义 ✓），这一趟不再手抄第二份名单 ✗。
//
// **为什么必须照队列** ✗：单元的队列**不一定是**通用那一份 ✓ ——
// `PropertyAccess` / `TypeDefine` / `BinaryOperator` 那一族装的是**类型队列**
//（`InitialKeywordCloseRuleQueue` ✓），对照态里它们**只跑那 15 条** ✓。
// 手抄名单对谁都跑整串 ✗ ⇒ `PropertyAccessCloseRule` 在 `PropertyAccess` **自己**的
// `Data` 上又匹配一次 ✗ ⇒ 一层套一层、直到深度界 ✓
//（实测 `a.b.c` 在产物里是**八层同区间**的 `PropertyAccess` ✓，投影只看得见最里面那一格 ✗）。
//
// 解析期独有的两处偏差留在这里 ✓（原来散在名单里 ✓，第 564 轮从三处变两处 ✓）：
// · `Export` 那一格上不跑导出 / `as` / 二元那一族 ✗（第 549 轮 ✓）、
//   `{` 括号那一格上不跑 `Label` ✗（第 507 轮 ✓）。
//
// **从前还有两处「跳过」** ✗（第 564 轮删掉 ✓）：`Let`（第 490 轮 ✓）与两条语句规则 ✓ ——
// 它们跳过的对象**已经在队列里不存在了** ✓（三个规则类随本轮一起删掉 ✓）⇒ 判断本身也没有对象 ✓。
const queue = unit.CloseRuleQueue;
if (queue === null) {
  return;
}
const isExportUnit = unit.constructor.name === "Export";
const isBraceBracket = unit.constructor.name === "Bracket" && (unit as Bracket).startBracket === "{";
for (const rule of queue.Data) {
  if (isBraceBracket && rule instanceof LabelCloseRule) {
    continue;
  }
  if (
    isExportUnit &&
    (rule instanceof ExportCloseRule ||
      rule instanceof AsCloseRule ||
      rule instanceof BinaryOperatorCloseRule ||
      rule instanceof LogicalOperatorCloseRule ||
      rule instanceof SpreadCloseRule)
  ) {
    continue;
  }
  rule.ApplyTo(unit);
}
// **容器末尾那一条语句**（第 544 轮 ✓）：`\n` 与 `;` 两档都不响时（内容直接顶到 `}` / EOF ✓）
// 由这一句补壳 ✓ —— 判据、白名单、切片都在 `Statement.FormTail` 那一份实现里 ✓
//（排在最后 ✓：前面那几十条规则先把表达式收拢 ✓，壳里装的就是收拢后的形状 ✓）。
Statement.FormTail(unit);
```
