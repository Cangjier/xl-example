# 移植计划与进度

目标：把 Cangjie 的 **syntax 层**（`Core/Syntax` + `Dawn/Text`）完整转写成 `*.xl.md`，直出 ts，并让 ts 端口对同一输入产出与 C# 原项目**逐字节一致**的 XML。

事实来源：`C:\Users\Admin\Documents\GitHub\cangjie-publish\cangjie`（C#）。
映射规矩：先读 [`cangjie-port.md`](cangjie-port.md)（M1–M21），再动手。
验收工具：`tools/golden`（C# 侧产出基准）+ `tests/fixtures`（夹具与基准 XML）。

范围**排除**：`Core/Steper/**`、`Dawn/Steper/**`、`Core/NativeOperatorMethods/**`（执行层，不在解析路径上）。

---

## 波次

依赖顺序即波次顺序：同一波次内的文件可以并行，跨波次必须先上后下。

| 波次 | 内容 | 文件数 | 状态 |
| --- | --- | --- | --- |
| W0 | 基础设施：`owners/**`、`core/runtime/**`、golden 工具、夹具、映射文档 | 7 规范 + 工具 | ✅ 完成 |
| W1 | **Core/Syntax 骨架**（解析器的抽象层） | 22 + 3 异常 + 1 工具 | ✅ 完成（26/26） |
| W2 | Dawn/Text 基础设施 + `ListExtension` | 5 | 进行中（4/5） |
| W3 | **token 层本体**（`Dawn/Text/Tokens/**`） | 68 | 进行中（52/68） |
| W4 | 收口：`Root`、`TextContext`、`ListExtensions` + 剩余 15 个 token | 17 | 未开始 |
| W5 | 交付：ts 解析入口（代码 → XML）+ golden 回归脚本 | — | 未开始 |

### 闸门现状（本轮更新）

| 闸门 | 判据 | 状态 |
| --- | --- | --- |
| G0 | `xl check --strict` 零诊断；`tsc -p` 零错误 | ✅ **88 文件 0 诊断 + tsc 0 错误** |
| G1 | 夹具 01–03 的 ts 产出与 golden XML 逐字节一致 | 未达成（缺 `Root`） |
| G2–G4 | 见下 | 未达成 |

> 已类型检查通过的是 **88 个规范文件全部产物**（含 52 个 token）。但 `Root` 尚未落地，
> 所以还**跑不起来**——`TextContext` 的构造器要 `new Root(owner, template)`。
> 剩下 17 个文件是最后一块拼图。

### 剩余文件清单（17）

`dawn/text/list-extensions.xl.md`、`dawn/text/text-context.xl.md`、
`dawn/text/tokens/` 下的 `root`、`temp`、`generic-type`、`not-null`、`as`、`compound-assignment-operator`、
`let`、`keyword`、`type-assign`、`type-define`、`logical-operator`、`preprocessor-directives`、
`regex-token`、`area-annotation`、`line-annotation`。

### 并行移植的教训（下批分发时要写进提示词）

| 现象 | 后果 | 对策 |
| --- | --- | --- |
| 相对路径层级算错（按 `tokens/` 而非 `tokens/<族>/` 算） | 28 个文件 E1006 | 提示词里给出**锚点表**（root = `../../../../`、`dawn/text` = `../../`、`tokens` = `../`），并要求用 C# 源树反查 |
| 一个文件写成 GBK | `E0005` | 提示词里明写「UTF-8 无 BOM」 |
| 漏 `InitialStatementReorganizationQueue(this)`（写时依赖模块还不存在） | 语句级重组链会断 | 提示词里给出**该文件的 C# 构造器原文**，或要求在依赖落地后回补 |
| `SourceRange.Start!.Value` 照抄成 `.Value` | 运行期把**字符**塞进范围字段 | 提示词里单列「`.Value` 是可空结构体解包，ts 侧一律去掉」 |
| 4 参 `ReplaceAt` 未改 `ReplaceCountAt` | tsc arity 错 | 提示词里给出改名清单 |
| 未使用 import | `noUnusedLocals` 报错 | 提示词里要求只 import 真正用到的名字 |

> **为什么 W3 是一整块而不是几波**：`Root` 的静态字段 `GeneralQueue` / `GeneralReorganize` 直接
> `new` 了几乎每一个 token 的 `Branch` / `Reorganization` 实例。也就是说**只要 `Root` 存在，全部
> 68 个 token 类就必须存在**。所以 `Root` 必须放在 token 层全部完成之后（W4），
> 而 G1 也只有到那时才可达。

### W2 明细

| 文件 | 状态 |
| --- | --- |
| `Core/Extensions/ListExtension`（→ `core/extensions/list-extension.xl.md`，17 个模块级函数） | ✅ |
| `Dawn/Text/TextDocument`（→ `dawn/text/text-document.xl.md`） | ✅ |
| `Dawn/Text/TextContext` | 待办（依赖 `Root`，挪到 W4） |
| `Dawn/Text/ListExtensions` | 待办（依赖 `WrapSymbol`/`AreaAnnotation`/`LineAnnotation`） |
| `Dawn/Text/TextCommonUtil` | 待办（依赖 `Statement`） |

### W3 明细

68 个文件按家族推进，每族的产物路径见 [`port-brief.md`](port-brief.md) §1 的目录约定。

| 家族 | 文件数 | 状态 |
| --- | --- | --- |
| `Common`、`Symbol`、`WrapSymbol`（三块字符 + 它们的 Branch/Reorganization） | 3 | ✅ |
| `If/**` | 4 | 已分发 |
| `For/**`、`While/**` | 8 | 已分发 |
| `Foreach/**`、`New/**` | 7 | 已分发 |
| `Try/**`、`TernaryOperator/**` | 9 | 已分发 |
| `Json/**`、`Lamda/**` | 6 | 已分发 |
| `Interface/**`、`Method`、`Bracket` | 3 | 已分发 |
| 字符串族 `String/**`（9，含 `StringGuide`/`ConstString`/插值/原文/逐字） | 9 | 待办 |
| 注释与预处理 `AreaAnnotation`、`LineAnnotation`、`RegexToken`、`PreprocessorDirectives` | 4 | 待办 |
| 其余独立 token：`Temp`、`GenericType`、`NotNull`、`Translate`、`As`、`CompoundAssignmentOperator`、`Let`、`Keyword`、`Import`、`TypeAssign`、`TypeDefine`、`LogicalOperator`、`NullConditionalOperator`、`Statement` | 14 | 待办 |
| `Root` | 1 | 待办（必须最后，见上） |

移植的执行手册见 [`port-brief.md`](port-brief.md)（自包含，供分发使用）。

### W1 明细

| 子波次 | 文件 | 状态 |
| --- | --- | --- |
| W1a | `BranchStates`、`BranchConditionResult`、`Templates/Sequence` | ✅ |
| W1b | `Message`、`ProcessSource`、`Messages/ReloadMessage` | ✅ |
| W1c | `Source`、`SourceRange`、`Document` | ✅ |
| W1d | `Templates/SymbolTemplate`、`KeywordTemplate`、`MethodNameTemplate`、`SequenceTemplate`、`Template` | ✅ |
| W1e | `Branch`、`Reorganization`、`SyntaxContext` | ✅ |
| W1f | `Token`、`UnitToken`、`BlockToken`、`GuideToken`、`IndependentToken` | ✅ |
| W1g | `Core/Exceptions/`：`SourceException`、`SyntaxException`、`RuntimeException` | ✅ |
| W1h | `CommonUtil`（根目录 `CommonUtil.cs`）：`BlockToken.ToXmlString` 依赖的 `XmlDecode` | ✅ |

两处对范围的说明：

- `BaseExtensions.cs` **排除**：它是 `List<Token<T>>` 到 `List<StepParserUnit<T>>` 的扩展方法，依赖 `Core/Steper`，不在解析路径上（M11 的扩展方法规则留到真正需要时再定）。
- `Core/Extensions/ListExtension.cs` 里的 `Join` **不需要移植**：`BlockToken.TempToString` 用的 `Temp.Join("")` 在 ts 里就是原生 `Temp.join("")`（M11）。
- `CommonUtil.cs` 只移植了 `XmlDecode`；同文件的 `PrintJson`（基于 `System.Text.Json`）属于输出层，不在解析路径上。

`Dawn/Text/Tokens/**` 共 **68** 个文件，是 W3–W6 的主体。

---

## 里程碑闸门

只有全部满足才算推进到下一里程碑：

| 闸门 | 判据 | 状态 |
| --- | --- | --- |
| G0 | `xl check --strict` 零诊断；`tsc -p tsconfig.json` 零错误 | ✅ |
| G1 | 夹具 `01`–`03` 的 ts 产出与 golden XML 逐字节一致 | 未达成 |
| G2 | 夹具 `01`–`11` 逐字节一致 | 未达成 |
| G3 | 全部夹具逐字节一致 | 未达成 |
| G4 | `dist/` 里有可运行的解析入口，回归脚本一条命令跑完 | 未达成 |

---

## 回归怎么跑

C# 侧（生成/刷新基准，改夹具或升级原项目后跑）：

```powershell
powershell -File tools\golden\build-golden.ps1
# 然后对 tests\fixtures\inputs\*.ts 逐个跑 tools\golden\out\Golden.dll，写进 tests\fixtures\xml\
```

ts 侧（回归，W7 交付）：对同一批输入跑 ts 端口，与 `tests/fixtures/xml/*.xml` 逐字节比对。

> **本机环境坑**：NuGet restore 是坏的——任何**新建**项目都报
> `MSB4181: "RestoreTask" 任务返回了 false`（原 Cangjie 能编译只是因为它的
> `obj/project.assets.json` 早已存在）。所以 `tools/golden/build-golden.ps1`
> 绕开 MSBuild 的 restore，直接用 SDK 自带的 Roslyn `csc` 编译。
> `tools/golden/Golden.csproj` 是正统入口，等 restore 修好后可用。

---

## 已发现的工具缺陷

| 缺陷 | 位置 | 规避 |
| --- | --- | --- |
| `splitTopLevel` 把 `=>` 的 `>` 当泛型收尾符，depth 变负，函数类型参数之后的逗号不再切分，报 `E1204` | dsh-xl `src/core/text.js` `splitTopLevel` / `indexTopLevel` | M21：函数类型参数放参数表最后 |
| 类下没有 `## <lang>` 段（二级标题一律当成员），类级目标语言说明只能写正文 | dsh-xl `src/core/parse.js` | M8 |
| `# namespace` 只接受单个标识符 | dsh-xl `src/core/parse.js` | M6：子命名空间用目录层级 |
| 一个类至多一个 `## constructor` | `E1206` | M14(b)：其余重载转静态工厂 |
| `# type` 不支持泛型参数 | `E1101` | M22：别名里泛型实参退化成 `any` |
| 泛型类的**静态**成员不能引用类类型参数 | ts 2302 | M27：静态工厂一律写 `any` |
| `xl check` **不校验类型名是否存在**，BCL 名（`Exception`）能过检查却是 ts 未定义标识符 | dsh-xl `checkType` | M28：每次 `xl check` 后必须跑 `tsc`，它才是真正的闸门 |

---

## G3 首次回归结果（21/27 逐字节一致）

三个闸门现状：`xl check --strict` **105 文件 0 诊断**、`tsc`（两个配置）**0 错误**、
`node tools/regression.cjs` **21/27 逐字节一致**。

通过的 21 个覆盖了核心链路：标识符 / 赋值 / 算术 / 注释 / let / if / function / interface / 数组 /
for / foreach / while / try / ternary / lamda / new / 逻辑运算 / null 条件 / type 定义 / as / 复合赋值。
**说明 `Root` 的跳转与重组调度、`Statement` 收束、`Common`/`Symbol`/`WrapSymbol` 三块字符都是对的。**

失败的 6 个收敛成 **3 个根因**：

| # | 失败夹具 | 现象 | 定位 |
| --- | --- | --- | --- |
| A | `04-string`、`18-json-object`、`26-interpolation`，并**连带** `09-import` 抛 `Sequence contains no matching element` | 字符串内容产出 `<Common>hello</Common>`，基准是 `<ConstString>hello</ConstString>`；`26` 还多出 `InterpolationCount=0`（基准 1）并冒出 `JsonObject` | `dawn/text/tokens/string/` 的 `String` / `StringGuide` / `ConstString`——`ConstString` 没被创建/挂上，字符掉给了 `Common`。`09-import` 的抛错是**次生**的：`Import` 里 `First(ConstString)` 找不到才抛（端口按 C# 忠实抛错，行为本身正确）；修 A 后 `09` 应自动恢复 |
| B | `24-regex` | ts 产出 `<RegexToken><Common>b</Common><Symbol>+</Symbol>…</RegexToken>`，基准是**空** `<RegexToken></RegexToken>` | `dawn/text/tokens/regex-token.xl.md`——正则正文应吞进 `Temp`（不进 `Data`），ts 侧让它掉给了 `Common` |
| C | `25-area-annotation` | ts 产出**空** `<Statement></Statement>`，基准保留 `let a = 1` | `dawn/text/tokens/area-annotation.xl.md` / `line-annotation.xl.md`——重组把注释**连同后面的语句**一起删了，删多了 |

修 A 时请留意诊断栈指向 `build/dawn/text/tokens/import.js:48`，那正是我写的抛错点。

### 首次集成时修掉的缺陷（已修）

| 缺陷 | 定位 | 修法 |
| --- | --- | --- |
| 5 个 token 的外层类漏了 `extends IndependentToken`（import 在、类声明没写） | `let`/`keyword`/`type-assign`/`type-define`/`logical-operator` | 补 `extends` |
| `## static property` 的 `static` **被打印器丢弃**，落成实例 getter | `root.xl.md` 的 `GeneralQueue` | 改成 `## static method CreateGeneralQueue`，构造器显式调用 |
| `Sequence` 构造器是**数组**参数（M2），却按 `params` 传了 9 / 26 个参数 | `root.xl.md` | 参数包成 `[...]` |
| 构造器缺 `super()` | `logical-operator.xl.md` 的 `LogicalOperatorReorganization` | 补 `super();` |
| **漏 import `Symbol`**，`Symbol` 落到 JS 全局类型，`instanceof` 收窄成 `Token<string> & Symbol` | `not-null.xl.md` | 补 import（M28：`xl check` 看不见这类错） |
| 未使用的 import | `as.xl.md` | 删 |

---

## ✅ 完成（G3 = 27/27）

四个检查全部通过：

| 检查 | 结果 |
| --- | --- |
| `xl check --strict` | **105 文件 0 error / 0 warning** |
| `tsc -p tsconfig.json`（类型闸门） | **0 错误** |
| `tsc -p tsconfig.build.json`（编出 JS） | **0 错误** |
| `node tools/regression.cjs`（语义闸门） | **27/27 逐字节一致** |

产物：105 个 `*.xl.md` → 105 个 `dist/*.ts` → 105 个 `build/*.js`；27 个夹具 + 27 份 C# 基准。

### 决定性的一处修复

G3 从 21/27 到 **27/27** 只改了一处：`core/syntax/templates/sequence-template.xl.md` 的 `Get`。

C# 的 `SequenceTemplate<T>.Get` 有两个重载：

```csharp
Get(Type target)                                  // 用 DefaultValue
Get(Type target, Func<Sequence<T>?,Sequence<T>?>? onDefaultValue)
```

我按 M14(a) 把它们合并成了一个带可选参数的方法，并认为「第二参省略 = 传 `null`」。**这个假设是错的**：
显式传 `null` 时 C# 求值 `onDefaultValue?.Invoke(DefaultValue)`，结果是 **`null`**——语义是「**不要默认队列**」。

`String` 的构造器正是这么用的：`ProcessQueue = template.BranchTemplate.Get(GetType(), null)`。
合并后它拿到了通用队列（含 `Common.AppendIn`），于是字符串内容被 `Common` 吃掉，而不是走 `String.Default` 建 `ConstString`。
同一个根因还波及 `RegexToken` 与两个注释类（它们的构造器用了同样的写法），所以**一处错，6 个夹具挂**。

修法：用 `arguments.length` 区分「一个实参」与「两个实参」。

这条是「能过 `xl check`、能过 `tsc`、只有逐字节比对能发现」的典型——M14(a) 的重载合并**必须核对每个重载的全部调用形态**，
不能只核对「参数省略」这一种。

### 交付物

```sh
tsc -p tsconfig.json                        # 类型检查
tsc -p tsconfig.build.json                  # dist/*.ts → build/*.js
node tools/parse.cjs <输入文件> [输出文件]     # 解析入口：源码 → XML
node tools/regression.cjs [过滤词…]           # golden 回归
```

基准由 C# 侧生成（`tools/golden/`），重跑方式见 README §4.4。
