# C# → xl.md 移植细则（执行手册）

这份文件面向**单独执行移植的人**，自包含，不需要看别的对话记录。
规矩的完整依据见 [`cangjie-port.md`](cangjie-port.md)（M1–M32）；本文件只讲**怎么做**。

---

## 1. 任务形态

把 `C:\Users\Admin\Documents\GitHub\cangjie-publish\cangjie` 里的 C# 文件，逐个转写成
`C:\Users\Admin\Documents\GitHub\xl-example` 里同构的 `*.xl.md`。

产物是 ts，但**你不需要写 ts**：`*.xl.md` 的代码块里写的是 ts 形式的函数体，xl 的打印器把它包装成最终文件。

### 目录与文件名

C# 的目录层级照抄，但目录名小写，文件名用 kebab-case：

| C# | xl.md |
| --- | --- |
| `Dawn/Text/Tokens/For/ForBody.cs` | `dawn/text/tokens/for/for-body.xl.md` |
| `Core/Syntax/SymbolTemplate.cs` | `core/syntax/symbol-template.xl.md` |

**一个 C# 文件 = 一个 `*.xl.md`**（`partial` 类与嵌套类除外，见 §5）。

---

## 2. 每个文件的结构

```markdown
# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
```

# namespace cangjie

一句话说明这个文件在解析流程里的位置。

# class Common extends BlockToken

类的用途。

原 C# 侧是 `public class Common : BlockToken<char>`。

## field Temp:Array<string> = []

字段说明（**每个成员都必须有一句散文**，否则报 `W3102`）。

## method Foo:(src:Source<string>)=>bool

方法说明。

```ts
return true;
```
```

要点：

1. **`# namespace cangjie`** 每个文件都要有，且必须带一句说明（否则 `W3103`）。全项目只用这一个 namespace 值。
2. **`# dependencies`** 必须排在最前，`# namespace` 排第二。相对路径按 `*.xl.md` 的真实位置算。**只 import 文件里真正用到的名字**（多 import 会让 ts 报「声明但未使用」）。
3. **每个类/接口成员都要有散文**（`W3102`）。模块级 `# method` 不强制，但也写上。
4. 说明 C# 原签名时用「原 C# 侧是 …」这类句式——它是给人看的，不会进 ts 产物。

### 查 C# 原文件

```powershell
Get-Content "C:\Users\Admin\Documents\GitHub\cangjie-publish\cangjie\Dawn\Text\Tokens\Common.cs"
```

---

## 3. 类型与成员怎么写

### 3.1 基础映射

| C# | xl.md / ts |
| --- | --- |
| `char` | `string`（单字符） |
| `int` / `float` / `double` | `int` / `float` / `double`（xl 会映射成 `number`） |
| `bool` | `bool` |
| `string` | `string` |
| `List<T>` / `IList<T>` | `Array<T>` |
| `Dictionary<K,V>` | `Map<K,V>` |
| `object` | `any` |
| `T?`（可空引用） | `T \| null` |
| `(int a, int b)` 元组 | `Array<int>`（M25） |
| `Func<…>` / `Action<…>` | 见 §3.3 |
| `Token<char>` | `Token<string>` |
| 枚举 | `# enum X` + `- case A` |
| 类型别名 | `# type X = <原文，直接写 ts 语法>` |

### 3.2 修饰符

- `public` 是缺省，不用写；`private` / `protected` 写在 `##` 之后、成员关键字之前。
- `static` 同理：`## static method Foo:(…)=>…`。
- **`abstract` / `virtual` / `override` 在 xl 里不存在**：
  - 抽象成员（`abstract`）→ 写成普通成员，ts 体是 `throw new Error("abstract member: <名字>");`
  - 虚方法且默认空实现（`virtual` 且体为空）→ **不写代码块**（见 §3.4）
  - `override` 照常写成员，**不需要**任何标记；`override` 这个词写进散文

### 3.3 函数类型参数（M21 / M22）

`=>` 会让 xl 的解析器把 `>` 当成泛型收尾符，depth 变负，**它之后的逗号切不开参数表**，直接报 `E1204`。所以：

- 函数类型参数**是最后一个参数**时，可以直接写：
  `## method SkipNext:(self:Array<T>, index:int, predicate:(item:T)=>bool)=>int`
- 函数类型参数**后面还要跟参数**时，必须用同文件的 `# type` 别名：
  ```markdown
  # type ValueGetter = (index:number)=>any
  ```
  然后 `## constructor:(owner:IOwner, getValue:ValueGetter, getCount:CountGetter, Parent?:X | null)=>void`
  - 别名**不支持泛型参数**（写 `<T>` 报 `E1101`），泛型实参退化成 `any`
  - 别名的右侧是**原文**，不参与类型映射，所以要直接写 ts 语法（`number` 而不是 `int`）

### 3.4 空实现不要写空代码块（M30）

真正什么都不做的成员（C# 里 `virtual` 且体为空、`override` 体为空），
**不要写 ` ```ts ` 块**——空的代码块报 `W3012`。直接不写代码块，打印器会产出 `{}`。

### 3.5 `Release()` / `Dispose()` 里的置空（M23）

C# 里「把字段逐个置 `null` 交给 GC」的部分**不写**。只保留真正有副作用的清理：

| C# | ts |
| --- | --- |
| `Data?.Clear(); Data = null!;` | `this.Data.length = 0;` |
| `Temp?.Clear(); Temp = null!;` | `this.Temp.length = 0;` |
| `Map.Clear(); Map = null!;` | `this.Map.clear();` |
| 只是 `X = null!`（没有 Clear） | 不写体（§3.4） |

### 3.6 重载（M14）

xl **同一类型内不允许成员重名**（`E1205`），一个类也**至多一个 `## constructor`**（`E1206`）。三种处理：

1. **语义相同的重载合并**：`params T[]` 与 `IEnumerable<T>` 合成一个 `Array<T>` 参数。
   参数个数不同的「可选尾部参数」也可以合并成可选参数（`count?:int`）。
2. **构造器重载 → 静态工厂**：保留参数最全的那个做 `## constructor`，其余写成
   `## static method From<区分词>:(…)=>ClassName<any>`。原签名写进散文。
3. **普通方法重载 → 改名**：保留最常用的用原名，其余加后缀
   （如 `GetRaw` / `GetRawRange`、`SignIn` / `SignInToken`、`SearchBack` / `SearchBackIndexed`）。

### 3.7 泛型

- 类：`# class Foo<T>`；类型参数的约束 `# class Box<T extends object>`
- 方法：`# method Foo:<T>(args)=>ret`
- **泛型基类只能写裸名字**（M29）：`extends Message`，不能写 `extends Message<T>`。
  因此基类的类型参数**必须带默认值**（`# class Message<ValueType = any>`）；
  子类继承来的成员里类型参数会退化成 `any`——行为不受影响，散文标注原本的实参。
- **泛型类的静态成员不能引用类的类型参数**（ts 2302 / M27）：
  静态工厂里一律把类型参数写成 `any`（`SourceRange<any>`、`SyntaxException<any>`）。
- **泛型被擦除**：C# 的 `i is T1` 写不出来（M18）。改成接受判定器参数
  `(predicate:(item:T)=>bool)`，调用点传 `(x) => x instanceof SomeClass`。

### 3.8 BCL 类型与成员（M20）

`Exception` / `Type` / `IDisposable` / `IEnumerable<T>` / `ValueTask` 等**不进** `extends` / `implements`
（那两个位置的目标必须在规范里声明过，否则 `E1104`），也不当类型标注用（ts 里会是未定义标识符）。
类型位置写 `any` 或中立等价物，原 C# 类型写进散文。

- `GetType()` → `this.constructor`；`GetType().Name` → `this.constructor.name`
  （**这就是为什么 token 类名必须与 C# 完全一致**）
- `typeof(X)` → `X`（类对象）
- `x is Foo f` → `x instanceof Foo`
- `List<T>.Add/RemoveAt/Insert/Remove` → `push` / `splice`
- `List<T>.Contains` → `includes`；`IndexOf` → `indexOf`（找不到是 `-1`，不是 `-1` 以外的值）
- `StringBuilder` → 字符串拼接
- `$"{a}{b}"` → `` `${a}${b}` ``
- `string.Empty` → `""`
- `\r\n` 在 ts 模板串里写 `\r\n`（同样的转义）

### 3.9 不要移植的东西

- 依赖 `Core/Steper` / `Dawn/Steper` 的成员（执行层，不在解析路径上）——直接不写，散文里提一句。
- `Console.WriteLine` 之类的调试输出——不移植。但要注意：`Root.Default` 里有
  `Console.WriteLine($"Unknown Branch: ...")`，那种**有观测意义的**输出也不要写（ts 侧不打印），散文里说明。

---

## 4. 嵌套类（M32）

实测 token 层只有两种嵌套类：`Branch` 和 `Reorganization`。

它们在 xl.md 里**展平成顶层 `# class`**，放在外层类**同一个文件**里，名字用
「外层类名 + `Type.Name`」：

| C# | xl.md 里的类名 |
| --- | --- |
| `Common.Branch` | `CommonBranch` |
| `Statement.Reorganization2` | `StatementReorganization2` |
| `WrapSymbol.Reorganization` | `WrapSymbolReorganization` |

**为什么可以改名**：这些类永远不进 `Token.Data`、不进 XML，所以 `constructor.name` 与 C# 不一致无害。
（token 类本身必须严格同名，见 §3.8。）散文里标注原 C# 名字。

嵌套类继承核心类时写 `extends Branch` / `extends Reorganization`（裸名字，M29）。

---

## 5. 核心类的 API 速查

你在 token 文件里最常用的成员（都已移植好，直接用）：

```ts
// core/syntax/token.xl.md —— Token<ValueType = any>
Owner: IOwner                       Template: Template<any>
ProcessQueue: Sequence<Branch<any>> | null
ReorganizationQueue: Sequence<Reorganization<any>> | null
Parent / MountedUnit: Token<any> | null
Data: Array<Token<any>>
SourceRange: SourceRange<any>       LastSource: Source<any> | null
Closed: bool
Last(index?: int)                   // 倒数第 index 个子单元
Add<Item>(item)                     // 加子单元
AddRange<Item>(items)               // 批量（原 Add(IEnumerable<T>)）
AddAndCloseLast<Item>(item)         // 加之前先关掉上一个
AddToMounted<Item>(item)            // 加并设为 MountedUnit
Quit()                              // 卸载自己
TryToClose()                        // 关自己 + 跑重组
Reorganize()
SignIn(source) / SignInToken(token)
SignOut(source) / SignOutToken(token)
Sign(token)                         // 同时签入签出
Undo(source) / IsUndo(source)
WhichUnitRangeContains(source)
Replace<Item>(item) / RemoveSelf()
ToXmlString() / ToDictionary() / ToList()
Clone()                             // 抽象，子类必须实现

// core/syntax/block-token.xl.md —— BlockToken<ValueType = any>
Temp: Array<any>
TempToString()
AppendAndSignOut(source)            // 签出 + 收集字符
AppendValueAndSignOut(value, source)
IsAppend(source)                    // 抽象
ToXmlString()                       // <类名>转义(Temp)</类名>

// core/syntax/branch.xl.md —— Branch<ValueType = any>
Condition(context, unit, source)    // 抽象
Success(context, unit, source, result)
Failed(context, unit, source, result)
Transit(Context, Host, Src): BranchStates

// core/syntax/reorganization.xl.md —— Reorganization<ValueType = any>
Previous(owner, template, units, index): bool        // 抽象
Process(owner, template, units, index): int          // 抽象，原 C# 是 ref int index，改成返回值

// core/extensions/list-extension.xl.md —— 模块级函数（扩展方法）
ReplaceAt(self, index, newValue)
ReplaceCountAt(self, index, count, newValue)
ReplaceRangeAt(self, index, count, newValues)
Get(self, index)                                    // 越界给 null
SkipNext / SkipPrevious(self, index, predicate)
FindNext / FindPrevious(self, index, onContinue)     // 找不到给 -1
GetSkipNext / GetSkipPrevious(self, index, predicate)
PreAt / NextAt(self, index)
SearchFront(self, index, condition)
SearchBack / SearchBackIndexed(self, index, condition)
TakeOut(self, startIndex, count?)                   // 取出并移除
TakeRange(self, startIndex, count)                  // 取出不移除
```

**扩展方法调用形态变了**：C# 的 `units.SkipNext(i, p)` 在 xl.md 里写成
`SkipNext(units, i, p)`（模块级函数），并 import 该名字。

`Source` 是**不可变**的（`Index` 只在构造时赋值），所以共享引用安全，不需要到处 `Clone()`。

---

## 6. 你的验收：只跑 `xl check`

```text
xl_check  paths=["<你写的文件>"]  targets=["ts"]  cwd="C:\Users\Admin\Documents\GitHub\xl-example"
```

- **不要**跑 `xl_build`、`tsc`、`dotnet`——统一由发起方跑。
- 允许存在**且只允许存在**指向「你本次任务之外、尚未移植的文件」的 `E1006` / `E1104`
  （`# dependencies` 目标不存在）。其余任何 error / warning 都要修掉。
- 收尾时报告：写了哪些文件、`xl check` 每条诊断的原文、以及你对哪几处**语义有疑问**。

### 常见诊断速查

| 码 | 原因 | 修法 |
| --- | --- | --- |
| `E1006` | `# dependencies` 里 import 的名字在目标文件里不存在（含目标文件还没写） | 确认路径与名字；本次任务外的可放过 |
| `E1104` | `extends` / `implements` 目标没声明 | 加 import；或按 §3.7 用裸名字 + 默认类型参数 |
| `E1204` | 类型写法非法 | 多半是 §3.3 的函数类型参数位置问题 |
| `E1205` | 同一类型内成员重名 | 按 §3.6 改名 |
| `E1206` | 一个类多个构造器 | 按 §3.6 转静态工厂 |
| `E1305` | 未知 `###` 子标题 | 只允许 `### get` / `### set`（property 下）或 `### <语言名>` |
| `W3012` | 空代码块 | 按 §3.4 删掉代码块 |
| `W3102` | 成员没有散文 | 补一句说明 |
| `W3103` | `# namespace` 没有说明 | 补一句 |

---

## 7. 已踩过的坑（务必逐条对照）

上一批 65 个文件是并行产出的，集成时发现**成建制的同类错误**。下面每条都真实发生过，且大多
**能通过 `xl_check`**，只有 `tsc` 或运行期才暴露。

### 7.1 依赖路径的锚点表（最高频错误）

`# dependencies` 的相对路径**相对该文件自己的目录**。先确认自己在哪一层，再照下表取前缀：

| 文件位置 | 指向仓库根（`owners/`、`core/`） | 指向 `dawn/text/` | 指向 `dawn/text/tokens/` | 同目录 |
| --- | --- | --- | --- | --- |
| `dawn/text/tokens/<族>/x.xl.md` | `../../../../` | `../../` | `../` | `./` |
| `dawn/text/tokens/x.xl.md` | `../../../` | `../` | `./` | `./` |
| `dawn/text/x.xl.md` | `../../` | `./` | `./tokens/` | `./` |

**不要靠数 `../` 猜**：先写下目标文件的真实路径（从 C# 源树反查：目录名小写、文件名 kebab），
再从自己所在目录算过去。上一批 28 个文件就错在这里。

### 7.2 `.Value` 是可空结构体解包，ts 侧一律去掉（最危险）

C# 的 `SourceRange<T>.Start` / `.End` 是 `Nullable<Source<T>>`：

```csharp
result.SignIn(current.SourceRange.Start!.Value);   // 这个 .Value 解出的是 Source
```

ts 的 `Start` 已经是 `Source<T> | null`，所以写成 **`current.SourceRange.Start!`**。

**照抄 `.Value` 会把字符塞进范围字段**，`StartIndex` / `IsInRange` / `ToDictionary` 全部失效——
而 `tsc` 抓不到（token 的类型参数退化成 `any`）。**只有 golden 回归能抓到。**

同理 `Source<ValueType>? Pre()` 返回「可空结构体」：

| C# | ts |
| --- | --- |
| `source.Pre()!.Value`（传给 `SignIn` / `SignOut` / `ForceExit`） | `source.Pre()!` |
| `source.Pre()?.Value == '$'`（这里的 `.Value` 是**字符**） | `source.Pre()?.Value === "$"`（**保留**） |

判据：`.Value` 前面若是 `.Start!` / `.End!` / `.Pre()!` 这类**可空结构体**，去掉；若前面是 **`Source` 变量**，那是字符，保留。

### 7.3 重载改名清单（M14(c)）

| C# | ts | 说明 |
| --- | --- | --- |
| `ReplaceAt(self, index, count, newValue)` | `ReplaceCountAt(self, index, count, newValue)` | **4 参版**，返回 `int`；3 参版仍叫 `ReplaceAt` |
| `Add(IEnumerable<T>)` | `AddRange(items)` | 单元素版仍叫 `Add` |
| `Token.SignIn(Token)` | `SignInToken(token)` | 传 **Token** 用这个；传 `Source` 仍叫 `SignIn` |
| `Token.SignOut(Token)` | `SignOutToken(token)` | 同上 |
| `Is(params string[])` | `IsAny(items)` | 单参版仍叫 `Is` |
| `Is(string, string[])` | `IsValueOrAny(value, items)` | |

**改名的同时必须改 import 行**（`import { ReplaceAt }` → `import { ReplaceCountAt }`），上一批漏了 3 处。

### 7.4 构造器里的 `InitialStatementReorganizationQueue(this)`

`Root` / `ForBody` / `ForeachBody` / `IfStatement` / `LamdaBody` / `CatchBody` / `FinallyBody` / `TryBody` / `WhileBody`
的 C# 构造器里都有这一行。**漏掉会让语句级重组链静默断掉。**

ts 写法（模块级函数，从 `dawn/text/text-common-util.xl.md` import）：

```ts
super(owner, template);
InitialStatementReorganizationQueue(this);
```

### 7.5 只 import 真正用到的名字

`tsconfig.json` 开了 `noUnusedLocals`，多 import 一个就报 TS6133。写完自查：每个 import 进来的名字都出现过吗？

### 7.6 UTF-8 无 BOM + LF

上一批有一个文件被写成 GBK，报 `E0005`。

### 7.7 静态 / 实例调用要分清

C# 嵌套类里可以直接裸调同类方法。ts 展平后是**独立顶层类**，必须限定：

| C# 写法 | ts 写法 |
| --- | --- |
| 同类**实例**方法裸调 `IsArrayAt(...)` | `this.IsArrayAt(...)` |
| 同类**静态**方法裸调 `IsMethod(...)` | `OuterReorganization.IsMethod(...)` |
| 别的类的实例方法 `JsonObject.Reorganization.IsObject(x)` | `JsonObjectReorganization.Instance.IsObject(x)` |

### 7.8 布尔值进 XML 必须是大写

C# 的 `$"...{SomeBool}..."` 走 `bool.ToString()`，产出 **`True` / `False`**；
ts 模板串原生是 `true` / `false`，**验收会挂**。凡把 bool 拼进 `ToXmlString` 的地方显式写：

```ts
`<X Flag="${this.Flag ? "True" : "False"}">`
```

### 7.9 收尾自查清单

1. `xl_check paths=["<你的文件>"] targets=["ts"] strict=true` → 0 error / 0 warning
2. 每条 import 的相对层级都按 §7.1 锚点表核对过
3. 全文搜 `.Start!.Value` / `.End!.Value` / `.Pre()!.Value` → 应为 0 处
4. 全文搜 `ReplaceAt(` → 只应是 3 参形态
5. 每个 import 的名字都真的用到了
6. 文件是 UTF-8 无 BOM + LF
7. 嵌套类展平后排在**外层类之前**（M33）
