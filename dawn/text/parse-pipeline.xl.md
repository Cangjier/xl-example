# dependencies
```xl
import { Branch } from "../../core/syntax/branch.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Sequence } from "../../core/syntax/templates/sequence.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { AreaAnnotation } from "./tokens/area-annotation.xl.md"
import { AsReorganization } from "./tokens/as.xl.md"
import { Bracket } from "./tokens/bracket.xl.md"
import { ClassReorganization } from "./tokens/class/class.xl.md"
import { Common } from "./tokens/common.xl.md"
import { CompoundAssignmentOperatorReorganization } from "./tokens/compound-assignment-operator.xl.md"
import { Decorator, DecoratorReorganization } from "./tokens/decorator.xl.md"
import { DoWhileReorganization } from "./tokens/do-while/do-while.xl.md"
import { EnumReorganization } from "./tokens/enum/enum.xl.md"
import { FieldReorganization } from "./tokens/field.xl.md"
import { ForReorganization } from "./tokens/for/for.xl.md"
import { ForeachReorganization } from "./tokens/foreach/foreach.xl.md"
import { FunctionReorganization } from "./tokens/function/function.xl.md"
import { GenericType } from "./tokens/generic-type.xl.md"
import { IfSetReorganization } from "./tokens/if/if-set.xl.md"
import { ImportReorganization } from "./tokens/import.xl.md"
import { ExportReorganization } from "./tokens/export.xl.md"
import { InterfaceReorganization } from "./tokens/interface/interface.xl.md"
import { NamespaceReorganization } from "./tokens/namespace/namespace.xl.md"
import { JsonArrayReorganization } from "./tokens/json/json-array.xl.md"
import { BlockReorganization, JsonObjectReorganization } from "./tokens/json/json-object.xl.md"
import { KeywordReorganization } from "./tokens/keyword.xl.md"
import { LabelReorganization } from "./tokens/label.xl.md"
import { LamdaReorganization } from "./tokens/lamda/lamda.xl.md"
import { LetReorganization } from "./tokens/let.xl.md"
import { LineAnnotation } from "./tokens/line-annotation.xl.md"
import { LogicalOperatorReorganization } from "./tokens/logical-operator.xl.md"
import { MethodReorganization } from "./tokens/method.xl.md"
import { MethodDeclarationReorganization } from "./tokens/function/method-declaration.xl.md"
import { NotNullReorganization } from "./tokens/not-null.xl.md"
import { UnaryOperatorReorganization } from "./tokens/unary-operator.xl.md"
import { BinaryOperatorReorganization } from "./tokens/binary-operator.xl.md"
import { SpreadReorganization } from "./tokens/spread.xl.md"
import { NullConditionalOperatorReorganization } from "./tokens/null-conditional-operator.xl.md"
import { NewReorganization } from "./tokens/new/new.xl.md"
import { PreprocessorDirectives } from "./tokens/preprocessor-directives.xl.md"
import { RegexToken } from "./tokens/regex-token.xl.md"
import { SignatureReorganization } from "./tokens/signature/signature.xl.md"
import { StatementReorganization2, StatementReorganization3 } from "./tokens/statement.xl.md"
import { StringGuide, StringGuideBranch } from "./tokens/string/string-guide.xl.md"
import { SwitchReorganization } from "./tokens/switch/switch.xl.md"
import { Symbol } from "./tokens/symbol.xl.md"
import { TernaryOperatorReorganization } from "./tokens/ternary-operator/ternary-operator.xl.md"
import { TryReorganization } from "./tokens/try/try.xl.md"
import { TypeLiteralReorganization } from "./tokens/type-literal/type-literal.xl.md"
import { TypeAssignReorganization } from "./tokens/type-assign.xl.md"
import { TypeDefineReorganization } from "./tokens/type-define.xl.md"
import { WhileReorganization } from "./tokens/while/while.xl.md"
import { WrapSymbol, WrapSymbolReorganization } from "./tokens/wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**解析流水线装配**：整棵 token 树的公共契约——跳转优先级与重组优先级——都在这一个文件里，
`TextContext` 在造根单元之前调一次 `ParsePipeline.Install`。

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

## static readonly field GeneralReorganize:Sequence<Reorganization> = new Sequence<Reorganization>([DecoratorReorganization.Instance, ClassReorganization.Instance, FunctionReorganization.Instance, EnumReorganization.Instance, SignatureReorganization.Instance, MethodDeclarationReorganization.Instance, LabelReorganization.Instance, LetReorganization.Instance, FieldReorganization.Instance, NewReorganization.Instance, MethodReorganization.Instance, NullConditionalOperatorReorganization.Instance, InterfaceReorganization.Instance, NamespaceReorganization.Instance, TypeLiteralReorganization.Instance, BlockReorganization.Instance, JsonObjectReorganization.Instance, JsonArrayReorganization.Instance, ImportReorganization.Instance, ExportReorganization.Instance, AsReorganization.Instance, TypeAssignReorganization.Instance, LamdaReorganization.Instance, TypeDefineReorganization.Instance, TernaryOperatorReorganization.Instance, TryReorganization.Instance, SwitchReorganization.Instance, IfSetReorganization.Instance, ForReorganization.Instance, ForeachReorganization.Instance, DoWhileReorganization.Instance, WhileReorganization.Instance, WrapSymbolReorganization.Instance, CompoundAssignmentOperatorReorganization.Instance, NotNullReorganization.Instance, UnaryOperatorReorganization.Instance, BinaryOperatorReorganization.PowerInstance, BinaryOperatorReorganization.MultiplicativeInstance, BinaryOperatorReorganization.AdditiveInstance, BinaryOperatorReorganization.ShiftInstance, BinaryOperatorReorganization.RelationalInstance, BinaryOperatorReorganization.EqualityInstance, BinaryOperatorReorganization.InInstance, BinaryOperatorReorganization.InstanceofInstance, BinaryOperatorReorganization.NullishInstance, LogicalOperatorReorganization.AndInstance, LogicalOperatorReorganization.OrInstance, SpreadReorganization.Instance, KeywordReorganization.Instance])

通用重组队列：单元关闭时按这个顺序把子单元合并成更高层的结构。
静态只读字段，只求值一次，全体共享。

**注释不在这里被摘掉**：跳转队列把行注释与区域注释解析成独立单元（见 `CreateGeneralQueue`），
而重组队列里没有摘除它们的规则，所以它们会以 `<LineAnnotation>…</LineAnnotation>` /
`<AreaAnnotation>…</AreaAnnotation>` 的形式出现在 XML 里。要让注释不进产物，就在这张表的前面加两条
「把注释从父单元 `Data` 里删掉」的规则（`tokens/line-annotation.xl.md` / `tokens/area-annotation.xl.md`
各写一个 `Reorganization` 子类即可）。

**队首这段的顺序本身就是语义**（每一条各自的理由见对应文件）：

| 位置 | 规则 | 为什么必须在这里 |
| --- | --- | --- |
| 1 | `Decorator` | `@Component({...})` 里的 `Component({...})` 长着调用形状，`Method` 先跑就再也凑不出「`@` + 名字」 |
| 2 | `Class` | 类头（名字 / 类型参数 / `extends` / `implements`）必须还没被 `Method` 拆开 |
| 3 | `Function` | 同上：`function f(x) {}` 的 `f(x)` 一旦先变成 `Method`，`function` 就配不上名字了 |
| 4 | `Enum` | 枚举体那对 `{ }` 要在被当成 Json 对象之前先认领 |
| 5 | `MethodDeclaration` | 与 `Function` 同理：`name(...) { }` 要在 `Method` 之前认出「后面跟花括号」 |
| 6 | `Label` | `name:` 要在 `TypeDefine` 之前认领冒号，否则 `outer: while (...) {...}` 会被当成一个类型标注 |
| 7 | `Field` | 字段没有关键字，只能在**成员位置**靠父单元认出（`ClassBody` / `InterfaceBody`）；排在 `Let` 之后（`let x` 仍旧归 `Let`）、`TypeDefine` 之前（要先把整条成员圈起来，否则 `TypeDefine` 会跨过换行吞掉后面几个字段） |
| 8 | `Lamda` | 带返回类型标注的箭头函数（`(a): T => body`）也要在 `TypeDefine` 之前认领那个 `:`，否则 `TypeDefine` 会连函数体一起吞掉 |
| … | 其余按既有顺序 | `TypeDefine` / `Ternary` / … / `NotNull`，`Switch` 插在 `Try` 与 `IfSet` 之间 |
| 末 | `Keyword` | 它是「在任意上下文都是关键字」的**兜底身份**；语句级结构先各自认领，剩下的散词才升级 |

`Keyword` 排在最后是必须的：它是「在任意上下文都成立」的兜底身份，而 `if` / `for` / `while` / `try` /
`class` / `extends` 这些词全靠**上下文**成形。排在前面时它们会先被升级成 `Keyword`，
各自的语句规则（判的是 `Common` 的文本）就再也没机会认领了。

**顺序即语义**：语句级结构（`Let` / `Keyword` / …）先依次尝试，
控制流（`IfSet` / `For` / `Foreach` / `While` / `Try`）最后兜底。改顺序会直接改变 XML。

## static method KeyWords:()=>Array<string>

这套语言配置里的关键字表：`Keyword` 单元只在文本命中这张表时才产生。

表里收 TypeScript 的保留字与上下文关键字，于是 `async` / `await` / `return` / `throw` / `readonly`
这类词在 XML 里有了自己的标签。要换一套语言，改这张表就够了——它和两张队列一样，
属于「这套语言怎么解析」，所以和它们装在同一个 `Install` 里。

表里**不收**字面量（`true` / `false` / `null`）：它们是 `Common` 的值语义（`IsBool` 等判定挂在 `Common` 上），
不是上下文关键字。

表里**收** `in` 与 `of`（第 25 轮接上）：

- `of` 在 TypeScript 里不是保留字，但它是**上下文关键字**，`for (x of y)` 里的它就是关键字；
- `in` 是保留字，三种用法（`for (x in y)`、`k in o`、映射类型的 `[K in keyof T]`）都该有 `Keyword` 标签；
- **代价是两条既有规则要跟着改**：`ForReorganization` / `ForeachReorganization` 判定「括号里有没有 `in` / `of`」
  原来靠 `item instanceof Common && item.Is("in")`，而那个括号（`(` 开的括号）**有自己的重组队列**，
  里面的 `in` / `of` 在括号关闭时就跑过一次升级了——升级成 `Keyword` 之后两条规则都认不出它，
  `for (var name in all)` 会被 `ForReorganization` 接走并抛「`(...)`中语句不满足格式要求」
  （这是真出现过的回归，`typescript.js` 就是在这儿炸的）。

  所以本轮把四个调用点一起换成 `declaration-common.xl.md` 的 **`IsWordUnit`**（`Common` 或 `Keyword` 都认）：
  `For`、`Foreach` 的两处、以及 `field.xl.md` 里 `BracketNameText` 认 `[K in T]` 的那一处。

```ts
return [
  "abstract",
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
];
```

**`import` 不在这里**（试过、退回来了）：把 `import` 加进禁用表能挡住
`typeof import("assert")` 被收成 `MethodDeclaration MethodName="import"`，
但**连带**挡住了动态 `import("m")` 的 `Method`（调用）节点——那张表是「能不能当方法名」的**唯一**判据，
调用规则与声明规则共用它。所以两处改成各自精确地拒一次：
`MethodDeclarationReorganization.Previous` 拒 `import`（见 `tokens/function/method-declaration.xl.md`），
`ImportReorganization.Previous` 拒 `import` 后面紧跟 `(` 的情形（动态 `import` 是调用、不是导入声明）。

## static method Install:(template:Template)=>void

把两张通用队列**与这套语言的关键字配置**装进一个模板。

**模板是调用方的，谁造模板谁装配**：`Install` 只负责往模板上写东西，根单元只从装配好的模板上读。
`TextContext` 的调用方因此只需要 `new Template().Initialize(ParsePipeline.Install)`。

`InitialStatementReorganizationQueue` 的调用点不在这里，而在根单元的构造器里（它作用于**单元**而不是模板，
所以留在那个时机）——它读的正是这里设下的 `ReorganizationTemplate.DefaultValue`，顺序天然成立。

关键字表与禁用方法名表一并在这一步装上：它们和两张队列一样，是「这套语言怎么解析」的一部分。
三样东西装完之后，模板上「这套语言怎么解析」就没有别的地方要配了（见 `tokens/root.xl.md` 的契约检查）。

`Template.Initialize` 是现成的链式入口（跑一遍回调再返回自身）。

```ts
template.Initialize((self: Template) => {
  self.BranchTemplate.DefaultValue = ParsePipeline.CreateGeneralQueue();
  self.ReorganizationTemplate.DefaultValue = ParsePipeline.GeneralReorganize;
  self.KeywordTemplate.Allow(ParsePipeline.KeyWords());
  self.MethodNameTemplate.Ban(ParsePipeline.BanedMethodNames());
  self.BranchTemplate.AddModifyItem(StringGuideBranch, ParsePipeline.ExtendStringStarts);
});
```

## static method InitialKeywordReorganizationQueue:(unit:Token)=>void

给一个**装类型文本**的单元装上报废类型用的重组队列：`KeywordReorganization` 与 `WrapSymbolReorganization` 两条。

与 `InitialStatementReorganizationQueue` 是同一个思路的两半：那一条装「语句队列」，
这一条装「类型队列」。

**为什么不是通用队列**：`TypeDefine` / `TypeAssign` 的内容是类型，通用队列里的
`TernaryOperatorReorganization` 会把**条件类型** `T extends U ? A : B` 收成表达式三元
（`type X = T extends Array<infer U> ? U : never` 于是长出一个 `TernaryOperator` 节点），
那是错的——类型位的 `? :` 是条件类型，不是三元表达式。
类型位要的只是「把 `keyof` / `typeof` / `readonly` / `is` / `asserts` / `interface` 这些词升级成 `Keyword`」，
所以就装这一条。

```ts
unit.ReorganizationQueue = new Sequence<Reorganization>([KeywordReorganization.Instance, WrapSymbolReorganization.Instance]);
```

**两条规则、不是一条**：`KeywordReorganization` 把类型位的关键词升级成 `Keyword`；
`WrapSymbolReorganization` 把类型文本里的**软换行**摘掉——类型可以折行排版，
那些换行是版面而不是内容（`Array<String,` 换行 `Int64>` 里那个换行不该留在产物里）。
通用队列里能做这两件事的就是这两条，其余的一律不要（见上）。

## static method ExtendStringStarts:(branch:any)=>void

把**单引号**加进「字符串起点」集合（见 `../dawn/text/tokens/string/string-guide.xl.md` 的 `AddStringChar`）。

`StringGuideBranch.StringChars` 的初值只有双引号，单引号与反引号要靠这条就地修改器补上——
机制早就写好了（`SequenceTemplate.AddModifyItem`），但**调用点一直缺失**：没有它，
`'abc'` 不被当成字符串，里面的每个字符都退化成 `Symbol` / `Common`。

**为什么这条比看上去重要**：TypeScript 的模块说明符常用单引号（`import … from './x'`），
说明符里的 `/` 会被正则词法接手，把**同一文件后面的内容整段吞掉**——
实测 `@types/node` 的 undici 系文件（`fetch.d.ts` / `dispatcher.d.ts` / `webidl.d.ts` …）
因此丢掉全部 interface / class / function / type alias 节点。

反引号与单引号一次加齐。**模板字符串的内插不需要额外改动**：
`string.xl.md` 的 `Default` 第 6 条分支（三个开关全关，正是反引号串走的那条）早就写好了——
`{` 且前一个字符是 `$`、`StringChar` 是反引号时，置 `InterpolationCount = 1`、
把那个 `$` 从单元上 `Undo` 掉、挂 `InterpolationString`。
缺的只是「反引号被当成字符串起点」这一步，和当初单引号那处一模一样。

引号字符本身由 `StringGuide` 记着（`new StringGuide(unit.Template, source.Value)`），
退出向导按同一个字符收尾，反引号不需要额外的退出规则。

```ts
branch.AddStringChar("'");
branch.AddStringChar("`");
```

## static method InitialStatementReorganizationQueue:(unit:Token)=>void

给一个单元装上报废语句用的重组队列。

做法：取该单元类型的重组队列（模板上没有专门注册就是通用重组队列），在里面**插入**两个语句重组类：

- `StatementReorganization2` 与 `StatementReorganization3` 插在 `WrapSymbolReorganization` **之前**——
  语句要在软换行被摘掉之前成形（判定要靠软换行找边界）。

插入点用**判定器**而不是类型参数来找（`InsertedBeforeWhere(items, predicate)`）：要插入的位置由
「哪个元素是 `WrapSymbolReorganization`」决定，直接给一个判定器比给一个类型更直白。
参数顺序是**先元素、后判定器**——函数类型参数排在最后。

**为什么这个加工放在这里**：它是对「通用重组队列」的第二次加工，与 `GeneralReorganize` 是同一份契约的两半。
放在同一个文件里，读代码时一眼能看出「语句类是在通用队列里插进去的」。

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
