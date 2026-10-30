# tts todo 适配计划（先难后易）

`todo/` 的 327 条用例按难度从难到易排成 13 个里程碑，每个里程碑的判据是**某一族用例从 todo/ 移进 success/**，不是"写了一堆 shape"。

计划里的所有数字都由 `node typescript/tools/tts-todo-report.mjs` 现算（口径与 `run.mjs` 相同：节点类型 + pos + end），改一行解析器就重跑一次，不要手写。

## 0 基线

| 目录 | 用例 | 通过 | 仅 end 不同 | 结构缺树 | 直接抛错 |
| --- | --- | --- | --- | --- | --- |
| `success` | 139 | 139 | 0 | 0 | 0 |
| `todo` | 327 | 14 | 1 | 130 | 182 |

| 类别 | 用例 | 通过 | 仅 end | 缺树 | 抛错 | 首缺种类 |
| --- | --- | --- | --- | --- | --- | --- |
| `incremental/types` | 80 | 0 | 0 | 5 | 75 | 4 |
| `incremental/declarations` | 84 | 2 | 0 | 20 | 62 | 15 |
| `incremental/expressions` | 76 | 4 | 0 | 64 | 8 | 32 |
| `incremental/statements` | 43 | 1 | 1 | 18 | 23 | 11 |
| `incremental/lexical` | 38 | 7 | 0 | 23 | 8 | 14 |
| `incremental/composite` | 1 | 0 | 0 | 0 | 1 | 0 |
| `incremental/controls` | 2 | 0 | 0 | 0 | 2 | 0 |
| `throw/composite` | 3 | 0 | 0 | 0 | 3 | 0 |

四条决定排序的读数：

1. **已支持的 AST 节点种类只有 48 种**：语句骨架（`Block`/`IfStatement`/`ForStatement`/`ForInStatement`/`ForOfStatement`/`WhileStatement`/`DoStatement`/`SwitchStatement`/`TryStatement`/`BreakStatement`/`ContinueStatement`/`EmptyStatement`/`ExpressionStatement`/`VariableStatement`）、`switch`/`try` 的内部块（`CaseBlock`/`CaseClause`/`DefaultClause`/`CatchClause`）、`BinaryExpression` 与它的运算符 token 族、`VariableDeclaration(List)`/`Identifier`/`NumericLiteral`/`PostfixUnaryExpression`。**没有**类型节点、成员节点、调用/成员访问，字面量只有数字。`typescript/shapes/` 下也没有 `types/` 目录。
2. **还缺 136 种节点**（token 类 31、形状类 105）。
3. 99 条用例的第一处差异是 `end`，其中**只有 1 条**是纯 end（`statements/while-block-let-close-brace.ts`，`WhileStatement` 21 vs 23）；另外 98 条的 `end` 底下都还压着结构缺口——**看着像收尾问题，其实是表达式/类型没长出来**。所以"先修 end"是错觉。
4. 182 条抛错用例里**有 147 条第一个阻断点是声明关键字**：`type` 38、`const` 28、`function` 18、`class` 17、`interface` 11、`import` 10、`declare` 8、`export` 6、`var` 4、`enum` 4、`namespace` 3。绝大多数用例连语句头都没进去，还没走到各自的语法难点——**入口不打开，任何一层都看不到进度**。

## 1 排序依据

五个因子打分（1–5，越高越难）：

| 维度（权重） | types | expressions | declarations | statements | lexical |
| --- | --- | --- | --- | --- | --- |
| 缺口节点种类（30%） | 77 → 5 | 63 → 4 | 73 → 5 | 38 → 2 | 30 → 2 |
| 歧义/延迟决断深度（30%） | 5 | 5 | 3 | 2 | 1 |
| 现有脚手架缺位（20%） | 5（零） | 3（有二元式，但操作数只认单 token） | 4（只有变量/导入两份声明） | 2 | 1 |
| 是否要改已绿的机制（10%） | 1 | 5（operand 管线重写） | 1 | 2 | 1 |
| 受影响用例（10%） | 5 | 4 | 5 | 2 | 2 |
| **加权** | **4.6** | **4.2** | **3.8** | **2.0** | **1.4** |

一句话：**类型层最宽且零脚手架；表达式层最深、歧义最密，而且要重写已经绿的 operand 管线；声明层面最大，但成本最线性。**

> 若把目标从"先啃硬的"换成"最短时间看到进度"，顺序会变成 declarations → types → expressions：147 条抛错用例卡在声明关键字上，先做声明能让覆盖率表最快动起来。本计划按难度排，不按这个走。

## 2 三个最难的

### 2.1 第一难：类型层（80 条 / 77 种缺口节点）

现状：5 缺树、75 抛错、0 通过；`shapes/` 无类型目录；全仓 74 条用例含 `:` 注解（类型桶 37、声明桶 25、语句桶 4、表达式桶 2、其余 6），25 条含 `as`/`satisfies`（其中类型桶 17 条）。

为什么第一：

- 面积最大（77 种，占总缺口的 57%），且**没有任何脚手架**——`typescript/shapes/` 现有 103 个 `.xl.md` 里没有一个类型节点。
- 是其它三层的公共前置：声明层 25 条带注解、语句层 4 条带注解、表达式层 3 条带 `as`/`satisfies`，全都要等它。
- 歧义集中在 `<`：`f<string>()` 的类型实参、`a < b` 的比较、`<T>y` 的断言、`type A<T = X>` 的类型参数——而规范禁止看 `tokenIndex` 之后，只能靠多候选 `Waiting` + `IsBuildable` 延迟决断。
- 条件类型（`T extends X ? A : B`）、`infer`、映射类型（含 `as` 重映射、`+/-readonly`、`+/-?`）、模板字面量类型是**类型层内部的第二层语法**，每一块都要自己的状态机。

工作分解：

| 组 | 内容 | 对应形状 |
| --- | --- | --- |
| T1 原子与引用 | 关键字类型（number/string/boolean/any/unknown/never/void/object/symbol/bigint/undefined/this）、`TypeReference`、`QualifiedName`、`TypeParameter`（+constant/default）、`ParenthesizedType` | `keyword-type`、`type-reference`、`type-parameter` |
| T2 组合 | `UnionType`、`IntersectionType`、`ArrayType`、`TypeOperator`（keyof/readonly/unique）、`TypeQuery`（typeof）、`IndexedAccessType`、`LiteralType`、`TupleType`（+`NamedTupleMember`/`OptionalType`/`RestType`）、`ImportType` | `union-type`、`intersection-type`、`array-type`、`type-operator`、`type-query`、`indexed-access-type`、`literal-type`、`tuple-type` |
| T3 结构与函数 | `TypeLiteral`（+`PropertySignature`/`MethodSignature`/`IndexSignature`/`CallSignature`/`ConstructSignature`）、`FunctionType`、`ConstructorType`、`TypePredicate`、`AssertsKeyword` | `type-literal`、`signature-*`、`function-type`、`constructor-type`、`type-predicate` |
| T4 高级 | `ConditionalType`（+`InferType`/约束）、`MappedType`、`TemplateLiteralType`（+span）、`ThisType`、`TypeAliasDeclaration` | `conditional-type`、`mapped-type`、`template-literal-type`、`type-alias` |
| T5 接线 | `:` 注解通路（`let`/`var`/`const`、参数、返回、类成员、`for` 初始化、`catch`）、`as`/`satisfies`/`<T>` 断言、泛型实参列表 | `type-annotation-possible`、`as-expression-possible`、`type-argument-possible` |

硬骨头（按风险排）：

- `<` 的四义（类型实参 / 小于 / 断言 / 类型参数）：`angle-assertion`、`generic-call-type-args`、`generic-arrow-typed-param` 三条用例就是它的三个面。
- `(x: T) => R` 与 `(a)`：类型上下文里可以先行决断，但要与表达式层的箭头消歧共用同一个延迟候选，不能各写一套。
- `typeof z`：`z` 是表达式位置而不是类型；`import("m").T` 是类型里的调用形状。
- `MappedType` 的键在 `in` 之后、值在 `]` 之后，`as` 重映射与 `+/-` 修饰符可任意组合。
- `alias-recursive`：类型引用先于类型定义出现，形状层不能假设已定义。

验收：`incremental/types` 80 → 0。其中 38 条 `alias-*` 是主战场；`interface-*`/`class-*`/`function-*` 这些跨层用例随 M6–M8 回归。

### 2.2 第二难：表达式层（76 条 / 63 种缺口节点）

现状：64 缺树、8 抛错、4 通过。首缺节点 top：`PropertyAccessExpression` 9、`StringLiteral` 9、`PrefixUnaryExpression` 9、`ObjectLiteralExpression` 7、`CallExpression` 8（6 条当前是 `Identifier`、2 条当前是 `BinaryExpression`）、`ArrowFunction` 8、`ConditionalExpression` 6、`RegularExpressionLiteral` 5、`NumberKeyword` 5、`ParenthesizedExpression` 4、`TemplateExpression` 4、`ArrayLiteralExpression` 3。

为什么排第二（而不是第一）：

- 面积比类型层小（63 种），但**歧义最密**：`(`（箭头 vs 括号表达式）、`{`（对象字面量 vs 块）、反引号（嵌套插值）、`new`（有无参数）、`?.`、`as`/`satisfies` 后缀、逗号（序列 vs 实参）。
- **它要改已经绿的机制**：`InitializerPossibleShape` 只认"`=` 之后刚刚关闭的那一个 `Common`"，`BinaryExpressionPossibleShape` 的左右操作数也停在同一层 —— 不重写 operand 管线，任何字面量/调用/成员链都长不出来。这一条让它比"纯新增"的声明层更危险：139 条 success 是回归护栏，改坏了立刻全红。
- 类型层的 `(a: T) => a` 又反过来依赖它的箭头消歧，所以两层在 M4 交叉，计划里把箭头放在 M4 第一个做。

工作分解：

| 组 | 内容 |
| --- | --- |
| E1 primary | `StringLiteral`、`NoSubstitutionTemplateLiteral`/`TemplateExpression`（+head/span/middle/tail）、`RegularExpressionLiteral`、`BigIntLiteral`、`true`/`false`/`null`/`this`、`ParenthesizedExpression`、`ArrayLiteralExpression`（+`SpreadElement`）、`ObjectLiteralExpression`（+`PropertyAssignment`/`SpreadAssignment`/`ComputedPropertyName`/简写/方法/存取器）、`ArrowFunction`、`FunctionExpression`、`ClassExpression` |
| E2 postfix | `PropertyAccessExpression`、`ElementAccessExpression`、`CallExpression`（+类型实参）、`TaggedTemplateExpression`、`NonNullExpression`、`PostfixUnaryExpression`、可选链 `QuestionDotToken` |
| E3 prefix 与复合 | `PrefixUnaryExpression`（`-` `+` `!` `~` `typeof` `void` `delete`）、更新表达式、`NewExpression`（+`new.target` 的 `MetaProperty`）、`ConditionalExpression`、逗号序列、`AwaitExpression`、`YieldExpression`、`AsExpression`/`SatisfiesExpression`/`TypeAssertionExpression` |
| E4 管线 | 把 `InitializerPossibleShape` 的"单 `Common` 操作数"换成 `OperandGuide`（primary + postfix 目录），二元式左右操作数都走它；`OperandUtil.FromCommon` 退化成 primary 的一个分支 |

硬骨头：

- 箭头 vs 括号：`(a)`、`(a, b)`、`(a = 1)`、`(a, b) => a`、`((a) => a)` 五条用例共用一条延迟决断路径。
- 对象字面量 vs 块：语句位一律按块（`stmt-object-vs-block`），表达式位一律按对象——判定点必须落在"哪个宿主在要操作数"上。
- 模板插值嵌套（`let-init-template-nested`：模板里再套模板）要求 basic token 层的插值可以嵌套，先验证再动 shape。
- `new A()`/`new A`（无括号）与 `new.target`；`a?.b`、`a?.[x]`、`a?.()` 三种 `?.`。
- `as`/`satisfies`/`!` 都是后缀，且 `satisfies T as U` 可以连用。

验收：`incremental/expressions` 76 → 0；顺带 `lexical` 里 23 条表达式型缺树用例与 `statements/foreach-call.ts`。

### 2.3 第三难：声明层（84 条 / 73 种缺口节点）

现状：62 抛错、20 缺树、2 通过。首个阻断点（62 条）：`class` 11、`import` 9、`interface` 8、`declare` 7、`export` 6、`function` 6、`const` 3、`enum` 3、`namespace` 3、`var` 2、`async` 2、`@` 1、`}` 1。

为什么排第三（而不是按用例数排第一）：

- 面积最大（84 条、73 种），但成本**线性**：8 个声明族，每族都是"容器 + 成员目录 + 修饰符表"的同一种做法，没有新的决断模型；前面两层把 `<`、`(`、`{` 的延迟决断和类型/表达式文法都解决后，这里只是照着表填。
- 真正的非线性部分（注解、泛型、类型实参）已经在前两层拿走。
- 但它有一个别人没有的麻烦：**声明与语句共享同一个语句头**。`class`/`interface`/`enum`/`namespace`/`import`/`export`/`function`/`type`/`declare`/`const`/`var` 十一个关键字要在 `StatementGuide` 里收敛成唯一候选，且容器内部（类体、模块体、枚举体）要复用 `StatementGuide`/成员目录。

工作分解：

| 组 | 内容 |
| --- | --- |
| D1 变量族收口 | `let` 硬编码改集合（`variable-statement-possible-shape` 两处：`ComputeByIndex` 的 head 判定、`IsBuildable` 的 keyword 判定）→ `const`/`var`；多声明符（`let a = 1, b = 2`）；`ObjectBindingPattern`/`ArrayBindingPattern`/`BindingElement`；`!` 定值断言 |
| D2 函数声明 | `FunctionDeclaration`（`async`/生成器/重载签名/参数默认值/rest/`this` 参数/可选参数）、`ReturnStatement` |
| D3 interface 与类型别名 | `InterfaceDeclaration`（+成员签名五件套）、`HeritageClause`、`ExpressionWithTypeArguments`、`TypeAliasDeclaration`（D3 复用 T4 的类型别名形状） |
| D4 class | `ClassDeclaration`（+`PropertyDeclaration`/`MethodDeclaration`/`GetAccessor`/`SetAccessor`/`Constructor`/`ClassStaticBlockDeclaration`/`IndexSignature`；修饰符 `static`/`private`/`readonly`/`declare`/`abstract`；构造参数属性；`Decorator`） |
| D5 enum 与 namespace | `EnumDeclaration`（+`EnumMember`，数字/字符串/计算初值）、`ModuleDeclaration`（+`ModuleBlock`、嵌套、`declare global`、`module "m"`） |
| D6 import/export | `ImportDeclaration`（+`ImportClause`/`NamedImports`/`ImportSpecifier`/`NamespaceImport`/`ImportAttributes`）、`ImportEqualsDeclaration`（+`ExternalModuleReference`）、`ExportDeclaration`（+`NamedExports`/`ExportSpecifier`/`NamespaceExport`）、`ExportAssignment`（`export =`）、`NamespaceExportDeclaration`（`export as namespace`） |
| D7 目录接线 | 新增 `DeclarationGuide`，`StatementGuide` 按语句头关键字把候选收成唯一；类体/模块体/枚举体各自的成员目录 |

硬骨头：

- 修饰符序列没有固定顺序但位置严格（`@dec` 在 `export default` 前、`static readonly` 可换序、`declare` 与 `abstract` 互斥）。
- 类成员内部的 ASI、分号可选、`get`/`set` 与同名属性、`static {}` 静态块。
- `import x = require("m")` 与 `import x = A.B` 两种等号导入，以及 `import type` 的内联 `type` 修饰。
- `export { a } from "m"`、`export * as ns from "m"`、`export = x`、`export as namespace X` 四种导出形状。
- 62 条抛错用例里，多数同时需要注解与类型实参——所以 D 层验收必须在 T 层之后。

验收：`incremental/declarations` 84 → 0。

## 3 其余（难度递减）

### 3.1 第四难：语句层（43 条 / 38 种缺口节点）

18 条缺树、23 条抛错、1 条纯 end、1 条已过（18 + 23 + 1 + 1 = 43）。缺口是三类：

- 缺语句：`ReturnStatement`（2 条）、`ThrowStatement`、`WithStatement`、`LabeledStatement`（3 条当前被当成 `ExpressionStatement`）、嵌套 `FunctionDeclaration`（5 条的首个阻断点）、`await`/`yield` 语句。
- 语句位的表达式：`ClassExpression`、`FunctionExpression`、`ObjectLiteralExpression`、`ArrayLiteralExpression`、`ElementAccessExpression`、`NonNullExpression`——这些在表达式层做完即转绿。
- 收尾：`while-block-let-close-brace.ts` 的 `WhileStatement` end 差 2（纯 end 唯一一条）。

难度低是因为 `if`/`for`/`while`/`do`/`switch`/`try`/`break`/`continue`/`debugger`/空语句/块 的骨架已经在 `success` 里跑通了，这里主要是"补语句类型 + 把表达式接进来"。

### 3.2 第五难：词法层（38 条 / 30 种缺口节点）

7 条已过、8 条抛错、23 条缺树。**真正的词法缺口只有两处**：ASI（`asi-postfix-newline`、`asi-return-newline`、`asi-two-declarations` 等 5 条）与嵌套模板插值（`let-init-template-nested` 缺 9 个节点，单条缺口全仓第二，仅次于 `statements/foreach-call.ts` 的 10）。其余 23 条的首缺全是表达式节点（`StringLiteral` 5、`RegularExpressionLiteral` 3、`TemplateExpression` 2…）——表达式层做完这一层基本自动转绿，只需补 ASI 与模板栈。

### 3.3 最后一关：集成（`composite` 1 条 + `throw/composite` 3 条）

4 条用例横跨全部四层，缺 46 种节点。**按单条用例排，最难的三条就是这里的 `throw/composite/generic-container.ts`、`class-ball.ts`、`expression-zoo.ts`**：泛型接口 + 类 + 成员 + 链式调用 + 展开 + 可选链 + 模板字符串 + 中文标识符，一条用例就要四层全通。它们是收尾验收，不是可拆的任务。

## 4 里程碑

| 里程碑 | 内容 | 转绿判据（族） | 依赖 |
| --- | --- | --- | --- |
| M0 种子 | `let` 硬编码改集合（const/var）；`type` 别名声明头；`:` 注解通路；最小类型集（关键字类型、`TypeReference`、`Union`、`Array`、`ParenthesizedType`） | `controls/*` 2 条；`types/alias-primitive`、`alias-reference`、`alias-union`、`alias-array`、`alias-parenthesized` 5 条 | — |
| M1 类型·原子与组合 | T1+T2 | `types/alias-literal-string`、`alias-intersection`、`alias-keyof`、`alias-typeof-query`、`alias-readonly-array`、`alias-indexed-access`、`alias-tuple*`（4 条：tuple / named / optional / rest） | M0 |
| M2 类型·结构与函数 | T3 | `types/alias-object*`（5 条：object / method / optional-readonly / call-construct / index-readonly）、`alias-fn-type*`（2 条）、`alias-ctor-type-abstract`、`alias-predicate` | M1 |
| M3 类型·高级 | T4 | `types/alias-conditional*`（2 条）、`alias-mapped*`（3 条）、`alias-template*`（2 条）、`alias-recursive`、`alias-generic-args`、`alias-import-type`、`alias-asserts` | M2 |
| M4 表达式·primary | E1（箭头优先） | `expressions/lit-*` 12 条、`arrow-*` 7 条、`arr`、`obj`、`func`、`class`、`paren`、`computed`、`method`、`getter`、`setter`、`spread`（2 条） | M0（类型实参留到 M5） |
| M5 表达式·postfix/prefix/断言 + 管线 | E2+E3+E4 | `expressions/ref-*` 14 条、`unary-*` 10 条、`bin-*` 6 条、`update-*` 4 条、`call`、`seq`、`comma`、`assignment`、`ternary`、`cond`、`angle`、`as`（2 条）、`satisfies`、`await`、`yield` | M4 |
| M6 声明·变量/函数/interface | D1+D2+D3 | `declarations/let-*` 21 条（`let x = <表达式>`，随 M4/M5 转绿）、`function-*` 9 条、`interface-*` 8 条、`const-*` 3 条、`var-*` 2 条；回归 `types/function-*`（4 条）、`types/interface-*`（2 条） | M3 |
| M7 声明·class | D4 | `declarations/class-*` 13 条；回归 `types/class-*` 4 条 | M6 |
| M8 声明·enum/namespace | D5 | `declarations/enum-*` 3 条、`namespace-*` 3 条、`module-*` 1 条；回归 `types/enum-string` | M7 |
| M9 声明·import/export + 目录 | D6+D7 | `declarations/import-*` 9 条、`export-*` 5 条、`declare-*` 7 条；回归 `types/import-inline-type`、`types/declare-unique-symbol` | M8 |
| M10 语句收口 | S | `statements/*` 剩余用例（含唯一纯 end 用例）；语句位的表达式用例随 M4/M5 转绿 | M5 |
| M11 词法收口 | 词法残余（ASI、嵌套模板） | `lexical/asi-*`（3 条）与 `let-init-template-nested` 等词法残余；其余 23 条表达式型用例随 M4/M5 转绿 | M10 |
| M12 集成 | 四层联调 | `composite/control-flow`、`throw/composite/*` 4 条 → todo 清零 | M11 |

完成态：`todo/` 空目录，`success/` 466 条全绿，`index.md` 由 `npm run tts:cases:index` 重写成 `success | 466 | 466 | 0`。

## 5 每个里程碑的固定动作

```bash
node typescript/tools/tts-todo-report.mjs            # 起点数字
xl check                                             # .xl.md 静态检查（typescript/shapes + typescript/ast 共 116 文件，基线 0 error 0 warning）
# xl_build（ts 目标）→ 产出 dist/ts
npm run compile                                      # dist/ts → build/ts（tsc）
node typescript/cases/tts/run.mjs <目标目录或文件>    # 目标用例转绿
node typescript/tools/gen-case-docs.mjs <case.ts>     # 重生成 .md / .ast
# 把用例从 todo/<类别>/ 移到 success/<类别>/
npm run tts:cases:index                              # 重写 index.md 覆盖表
node typescript/cases/tts/run.mjs                    # success 必须全绿，exit 0
node typescript/tools/tts-todo-report.mjs            # 终点数字
```

注意：本机 PATH 上没有 `xl` 可执行文件，`npm run build`（`xl build && tsc`）会在第一步失败；实际用 `xl_build` 工具产 `dist/ts`，再 `npm run compile`。

## 6 风险与红线

1. **pos 语义**：TypeScript 的 `node.pos` 是 full start（含前导 trivia），`end` 不含尾随。实测 `a;\n  b;` 的第二条语句 `pos=2`、`getStart()=5`。shape 的 `Pos`/`SignIn` 必须给 full start，否则整类全红。
2. **只看 `tokenIndex` 之前**（`docs/IMPORTANCE.md` 的 possible 行为规范）：`<` 是类型实参还是小于号不能靠"往后看一位"，只能多候选 + `IsBuildable` 延迟；这条约束直接决定 M0/M2 的形状设计。
3. **禁止 catch 掉异常**：诊断就是信息。但当前 `SyntaxException.Message` 只有行文本、没有 offset，定位只能靠前缀二分（`tts-todo-report` 就是这么做的）——建议在 M0 顺手把 offset 写进 Message，后面每层都能省时间。
4. **shape 的字段在 build 那一刻提取，Close 之后 `Data` 只剩子节点**（`docs/IMPORTANCE.md` 的 shape 转 ast node）。
5. **模板插值嵌套要先验证 basic token**：`let-init-template-nested` 缺 9 个节点，是全仓单条缺口第二（仅次于 `statements/foreach-call.ts` 的 10）；如果插值串不支持嵌套，M4 之前要先补词法层。
6. **回归护栏**：M5 重写 operand 管线会碰二元式，`success` 139 条必须保持全绿；每改一次 `BinaryExpressionPossibleShape` 就跑全量。
7. **不支持 tsx**（`docs/IMPORTANCE.md` 特性说明）：`<T>y` 断言可以直通，不需要 JSX 回退——这是类型层唯一能省下的大坑。
8. **类别不是阶段边界**：`types` 桶里 10 条 `class-*`/`interface-*`/`function-*` 要等 M6–M9 才能绿；`declarations` 桶里 25 条带 `:` 注解的用例要等 M0–M3。排期按"层"，验收按"族"，`index.md` 的类别表在中期会来回跳，属正常。
9. **夹具时效**：改了解析器必须用 `gen-case-docs` 重生成 `.md`/`.ast`，`stale-ast` 同样算失败（`run.mjs` 会查）。

## 7 附：缺口节点清单（136 种）

token 类 31 种（basic token / 关键字表即可，不需要新 shape），形状类 105 种。下面按层分组，层间有重叠（同一个 `StringLiteral` 被几层同时用到），所以各层相加会大于 136。

### 类型层（77：token 17 / 形状 60）

- token：`AbstractKeyword`、`AssertsKeyword`、`AsyncKeyword`、`DeclareKeyword`、`EqualsGreaterThanToken`、`ExclamationToken`、`NeverKeyword`、`NullKeyword`、`NumberKeyword`、`QuestionToken`、`ReadonlyKeyword`、`StaticKeyword`、`StringKeyword`、`SymbolKeyword`、`TrueKeyword`、`UnknownKeyword`、`VoidKeyword`
- 形状：`ArrayBindingPattern`、`ArrayType`、`ArrowFunction`、`AsExpression`、`BindingElement`、`CallExpression`、`CallSignature`、`ClassDeclaration`、`ConditionalType`、`ConstructSignature`、`Constructor`、`ConstructorType`、`EnumDeclaration`、`EnumMember`、`ExpressionWithTypeArguments`、`FunctionDeclaration`、`FunctionExpression`、`FunctionType`、`HeritageClause`、`ImportClause`、`ImportDeclaration`、`ImportSpecifier`、`ImportType`、`IndexSignature`、`IndexedAccessType`、`InferType`、`InterfaceDeclaration`、`IntersectionType`、`LiteralType`、`MappedType`、`MethodSignature`、`NamedImports`、`NamedTupleMember`、`NonNullExpression`、`ObjectBindingPattern`、`OptionalType`、`Parameter`、`ParenthesizedExpression`、`ParenthesizedType`、`PropertyDeclaration`、`PropertySignature`、`QualifiedName`、`RestType`、`ReturnStatement`、`SatisfiesExpression`、`StringLiteral`、`TemplateHead`、`TemplateLiteralType`、`TemplateLiteralTypeSpan`、`TemplateTail`、`TupleType`、`TypeAliasDeclaration`、`TypeAssertionExpression`、`TypeLiteral`、`TypeOperator`、`TypeParameter`、`TypePredicate`、`TypeQuery`、`TypeReference`、`UnionType`

### 声明层（73：token 17 / 形状 56）

- token：`AbstractKeyword`、`AsyncKeyword`、`ColonToken`、`ConstKeyword`、`DeclareKeyword`、`DefaultKeyword`、`DotDotDotToken`、`EqualsGreaterThanToken`、`ExclamationToken`、`ExportKeyword`、`NumberKeyword`、`PrivateKeyword`、`QuestionToken`、`ReadonlyKeyword`、`StaticKeyword`、`StringKeyword`、`VoidKeyword`
- 形状：`ArrayBindingPattern`、`ArrayLiteralExpression`、`ArrayType`、`ArrowFunction`、`BindingElement`、`CallExpression`、`CallSignature`、`ClassDeclaration`、`ClassStaticBlockDeclaration`、`ConditionalExpression`、`ConstructSignature`、`Constructor`、`Decorator`、`EnumDeclaration`、`EnumMember`、`ExportAssignment`、`ExportDeclaration`、`ExportSpecifier`、`ExpressionWithTypeArguments`、`ExternalModuleReference`、`FunctionDeclaration`、`GetAccessor`、`HeritageClause`、`ImportClause`、`ImportDeclaration`、`ImportEqualsDeclaration`、`ImportSpecifier`、`IndexSignature`、`InterfaceDeclaration`、`MethodDeclaration`、`MethodSignature`、`ModuleBlock`、`ModuleDeclaration`、`NamedExports`、`NamedImports`、`NamespaceExport`、`NamespaceExportDeclaration`、`NamespaceImport`、`NoSubstitutionTemplateLiteral`、`ObjectBindingPattern`、`Parameter`、`ParenthesizedExpression`、`PropertyAccessExpression`、`PropertyDeclaration`、`PropertySignature`、`QualifiedName`、`RegularExpressionLiteral`、`ReturnStatement`、`SetAccessor`、`StringLiteral`、`TemplateExpression`、`TemplateHead`、`TemplateSpan`、`TemplateTail`、`TypeParameter`、`TypeReference`

### 表达式层（63：token 16 / 形状 47）

- token：`AsyncKeyword`、`ColonToken`、`CommaToken`、`DotDotDotToken`、`EqualsGreaterThanToken`、`FalseKeyword`、`InKeyword`、`InstanceOfKeyword`、`NullKeyword`、`NumberKeyword`、`QuestionDotToken`、`QuestionToken`、`SlashToken`、`SuperKeyword`、`ThisKeyword`、`TrueKeyword`
- 形状：`ArrayLiteralExpression`、`ArrowFunction`、`AsExpression`、`AwaitExpression`、`BigIntLiteral`、`BindingElement`、`CallExpression`、`ClassDeclaration`、`ClassExpression`、`ComputedPropertyName`、`ConditionalExpression`、`DeleteExpression`、`ElementAccessExpression`、`ExpressionWithTypeArguments`、`FunctionDeclaration`、`FunctionExpression`、`GetAccessor`、`HeritageClause`、`MetaProperty`、`MethodDeclaration`、`NewExpression`、`NoSubstitutionTemplateLiteral`、`NonNullExpression`、`ObjectBindingPattern`、`ObjectLiteralExpression`、`Parameter`、`ParenthesizedExpression`、`PrefixUnaryExpression`、`PropertyAccessExpression`、`PropertyAssignment`、`RegularExpressionLiteral`、`ReturnStatement`、`SatisfiesExpression`、`SetAccessor`、`SpreadAssignment`、`SpreadElement`、`StringLiteral`、`TaggedTemplateExpression`、`TemplateExpression`、`TemplateHead`、`TemplateSpan`、`TemplateTail`、`TypeAssertionExpression`、`TypeOfExpression`、`TypeReference`、`VoidExpression`、`YieldExpression`

### 语句层（38：token 7 / 形状 31）

- token：`AsyncKeyword`、`ColonToken`、`CommaToken`、`EqualsGreaterThanToken`、`NumberKeyword`、`QuestionDotToken`、`QuestionToken`
- 形状：`ArrayLiteralExpression`、`ArrowFunction`、`AwaitExpression`、`BindingElement`、`CallExpression`、`ClassExpression`、`ConditionalExpression`、`ElementAccessExpression`、`FunctionDeclaration`、`FunctionExpression`、`LabeledStatement`、`NewExpression`、`NonNullExpression`、`ObjectBindingPattern`、`ObjectLiteralExpression`、`Parameter`、`ParenthesizedExpression`、`PrefixUnaryExpression`、`PropertyAccessExpression`、`PropertyAssignment`、`RegularExpressionLiteral`、`ReturnStatement`、`SpreadElement`、`StringLiteral`、`TemplateExpression`、`TemplateHead`、`TemplateSpan`、`TemplateTail`、`ThrowStatement`、`WithStatement`、`YieldExpression`

### 词法层（30：token 7 / 形状 23）

- token：`AsyncKeyword`、`ColonToken`、`CommaToken`、`EqualsGreaterThanToken`、`NumberKeyword`、`QuestionDotToken`、`QuestionToken`
- 形状：`ArrayLiteralExpression`、`ArrowFunction`、`BigIntLiteral`、`CallExpression`、`ConditionalExpression`、`FunctionDeclaration`、`NewExpression`、`NoSubstitutionTemplateLiteral`、`ObjectLiteralExpression`、`Parameter`、`ParenthesizedExpression`、`PrefixUnaryExpression`、`PropertyAccessExpression`、`PropertyAssignment`、`RegularExpressionLiteral`、`ReturnStatement`、`StringLiteral`、`TaggedTemplateExpression`、`TemplateExpression`、`TemplateHead`、`TemplateSpan`、`TemplateTail`、`TypeReference`

### 集成（`throw/composite`，四层的并集，不单列）

46 种（token 11 / 形状 35），全部包含在上面各层里。

## 8 附：可穿插的便宜项

不改变上面的排序，任何等待期都能做：

| 项 | 用例数 | 成本 |
| --- | --- | --- |
| `const`/`var`（`variable-statement-possible-shape` 两处 keyword 判定） | 2（`controls/*`）+ 解锁 32 条的语句头 | 极小 |
| 唯一纯 end 用例（`WhileStatement` 收尾） | 1 | 极小 |
| 字面量族：`StringLiteral`、`RegularExpressionLiteral`、`true`/`false`/`null`、`BigInt` | 20 条的首缺 | 小（属 M4，但可先行） |
| `LabeledStatement` | 3（当前被当 `ExpressionStatement`） | 小 |
