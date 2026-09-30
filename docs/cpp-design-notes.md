# C++ 目标的三个结构性决定

`docs/xl-to-cpp.md` 写的是「怎么写」；这一份写「为什么只能这么写」。这三条不是风格选择，
而是 C++ 与 ts 之间无法绕开的差异，每一条都先被证伪过别的方案才定下来。

> **这三条决定在当前实现里的状态**（详见 `docs/xl-to-cpp.md` 文首的修订说明）：
> - **第二条（`std::shared_ptr` 所有权）已落实**，全树规范类都用 `std::shared_ptr<T>`。
> - **第一条（两遍构建 + `CANGJIE_BODIES` + `xl-tree.cpp` 索引）没有采用**：实际产物是
>   `xl_plan` 报出的 `.h`/`.cpp` 拆分（`layout = type`）。它要解决的「89 个源同处一个依赖环」
>   由等价手段解决 —— 声明放 `.h`，需要完整类型的体放 `.cpp` 并各自 include，
>   于是每个 `.cpp` 就是一次「类型已完整」的解析。
> - **第三条（`TypeName()` 字符串反射）没有采用**：实际用
>   `protected virtual const char* XmlName() const` + `std::type_index` 作模板键，
>   语义等价且不动结构回读要求的成员名。
> - 文首提到的 `runtime/any-value.hpp` 也没有采用：`any` 一律 `std::any`，手写支撑层是
>   `dist/cpp/cangjie_support.h`。

## 一、构建必须分两遍：声明段 + 主体段

**事实。** 把 104 个规范的 `# dependencies` 抽出来做图，其中 **89 个处在同一个强连通分量**里，
典型的三元环就是：

```
core/syntax/token.xl.md
  → core/syntax/branch.xl.md
    → core/syntax/syntax-context.xl.md
      → core/syntax/token.xl.md
```

另外 `document ⟷ source-range`、`template ⟷ token`、`process-source ⟷ syntax-context` 也各自成环。

**后果。** C++ 的 `#pragma once` 无法表达互相包含：无论谁先被打开，另一方在这一趟里就是
不完整的，于是下面这些**全部**编译不过——而它们在规范里到处都是：

| 写法 | 为什么需要完整类型 |
| --- | --- |
| `std::make_shared<X>(…)` | 要 `sizeof(X)` |
| `dynamic_cast<X*>` / `std::dynamic_pointer_cast<X>` | 要 X 的 vtable |
| `this->shared_from_this()` | `enable_shared_from_this<X>` 是基类 |
| `std::vector<X>`、按值形参/成员 | 要 `sizeof(X)` |
| `class D : public B` 且之后访问 `B` 的成员 | 基类必须完整 |

**被证伪的方案。**

1. *按依赖图排序包含*——图里有环，不存在这种次序。
2. *每个产物自带互相包含 + 两阶段（类内声明、include 之后写体）*——只在环外可用。实测
   `source-range.cpp`（先被打开）× `document.cpp`（后写体）这个方向必炸，因为后者的体在
   前者还没定义完时就被解析了。
3. *全局前向声明 + 单独的「函数体汇总文件」*——可行，但那把成员函数的定义搬出了
   `*.xl.md` 的产物，产物就不再是「一个规范一个文件」的自洽单元，xl 的增量/指纹记账也跟着失效。
4. *`#pragma once` + 条件包含（先只取声明，再取函数体）*——**就是这个方案**。

**采用的方案。** 每个产物是**一个文件两个段**：

```cpp
#pragma once
// 标准库 + runtime/any-value.hpp；不包含任何其它产物
namespace cangjie { class Token; class Source; … }   // 引用到的类型一律前向声明
namespace cangjie { …类定义、方法签名、一行且不需完整类型的体… }
#ifdef CANGJIE_BODIES
namespace cangjie { …其余全部成员体（类外 inline）、自由函数、静态成员定义… }
#endif
```

生成的索引 `dist/cpp/xl-tree.cpp` 把每个产物**包含两遍**：第 1 遍取声明段，第 2 遍
（`CANGJIE_BODIES` 已定义）取主体段。第 1 遍结束时 104 个类定义全部完整，所以第 2 遍里
任何函数体都可以随便用任何类型——**文件之间的包含关系不再影响正确性**，环也就不需要被打破了。

索引里唯一的次序约束是**继承**：声明段的第 1 遍必须先给基类定义。规范里的继承关系是一张
干净的 DAG（`Token` → `UnitToken`/`IndependentToken`/`BlockToken`/`GuideToken` →
各 token，`Reorganization`/`Branch` → 各重组/分支类），6 层深，按「继承层级 + 路径」
排序即可复现。

> `.tools/dep-order.ps1 -WriteIndex` 生成索引，`.tools/cpp-levels.txt` 记录每个规范的
> 继承层级；CMake 会在构建时自动重跑它。

## 二、规范内声明的类一律用 `std::shared_ptr` 持有

规范里每个 token 都通过 `Parent` / `Data` / `MountedUnit` / `SourceRange` 互相引用，而且
**同一个对象常被多处引用**（`SourceRange.Start` 引用一个 `Source`，`Source.Document` 又引用
文档；`Token.Data` 里的单元被重组替换时还要求旧对象「交给 GC」）。ts 的引用语义天然成立，
C++ 必须选一个所有权模型。

| 候选 | 为什么不行 |
| --- | --- |
| 裸指针 + 手工 `delete` | 规范里根本没有所有权信息可以照着写；`Replace`/`MoveDataTo`/重组会把单元从一处搬到另一处，谁该删说不清 |
| `std::unique_ptr` | 树里到处是共享引用，`Source` 被多个 `SourceRange` 指着，独占所有权直接表达不了 |
| 值语义（`Token` 按值，`Clone` 复制） | 与规范冲突：`Parent`/`MountedUnit` 是**反向**指针，值语义会复制出两棵树；而且 `Token` 是多态基类，按值会切片 |
| **`std::shared_ptr`** | 一个对象一个控制块，引用到哪都活着；`T | null` 就是空 `shared_ptr`；多态（`shared_ptr<Token>` 指向 `Common`）成立 |

**配套约定**（`docs/xl-to-cpp.md` §1.1/§1.2）：

- 参数 `const std::shared_ptr<T>&`（不转移所有权也不拷贝）；
- 返回值 `std::shared_ptr<T>`；**唯一例外**是 `Get`/`PreAt`/`NextAt` 这几个模板工具，
  它们对 `T` 一无所知，返回 `T*`；
- `# type` 声明的是纯数据记录，按值 `struct`（`CliOptions` 这种），不进 `shared_ptr`；
- 需要「返回自身」做链式调用时，类继承 `std::enable_shared_from_this<T>` 并返回
  `shared_from_this()`——**不能**写 `std::shared_ptr<T>(this)`，那会为同一个对象造出第二个
  控制块，必然 double free。

## 三、反射只能靠一个虚方法 `TypeName()`

ts 用 `this.constructor.name` 取运行时类名，用在两处，而且**两处都进 XML**：

- `Token::ToXmlString()` 的标签名（`<Keyword>…</Keyword>`）；
- `SequenceTemplate` 的类型派发表（`Get(GetType())`）。

C++ 没有可移植的「取对象运行时类名」手段（`typeid(x).name()` 是实现定义的名字，GCC 出来是
`N7cangjie7KeywordE` 这种修饰名，直接进 XML 就废了）。规范里给出的答案是 **M17：把
`GetType()` 写成 `this.constructor`**，`SequenceTemplate` 也以「类的构造器对象」为键——
生成到 C++，就是把「构造器对象」落成一个**字符串类型名**，由每个类自己回答：

```cpp
virtual std::string TypeName() const { return "Token"; }              // 基类
std::string TypeName() const override { return "Keyword"; }           // 每个派生类
```

调用点：

| ts | C++ |
| --- | --- |
| `this.constructor.name` | `this->TypeName()` |
| `unit.constructor`（当类型键） | `unit->TypeName()` |
| `SequenceTemplate.Get(GetType())` | `Get(this->TypeName())`，键是 `std::string` |
| `ModifyItem` / `CoverData` / `CompletedData` 的 `Map<any, …>` | `std::map<std::string, …>` |

代价是**类名不能改**：`TypeName()` 的返回值直接出现在验收 XML 里（`samples/*.expected.xml`）。
这也是为什么展平的嵌套类（`KeywordReorganization`）可以随便改名——它们不进 XML——而
`Keyword` / `Bracket` / `String` 这些本体必须与规范里的类名一字不差。

## 附：这三条决定带出来的两处实现选择

1. **`runtime/any-value.hpp` 是手写的。** `ToDictionary()` / `ToList()` 返回
   `Map<string, any>` / `Array<any>`，`RuntimeObject.Type` / `.Value` 也是 `any`；ts 里一个
   `any` 能同时装字符串、数字、布尔、嵌套 map 和数组，C++ 需要一个具体的可递归载荷类型。
   这是唯一一处规范无法直译的形状，所以单独放在 `runtime/`，不进 `dist/cpp/`。
2. **`main` 不在产物里。** `cjcli.xl.md` 的 `# statement` 落成 `cangjie::Main` +
   `cangjie::CjcliExitCode()`（都在产物里），但 C++ 的 `main` 必须由构建层提供一行胶水
   （`xxd` 那种做法在这里没有意义）。ts 侧同样的理由是 **shebang**：`tsc` 只认文件第 1 行的
   `#!`，而产物第 1 行永远是 xl 的产物头，所以 `bin/cjcli.js` 才存在。两者是同一个约束在两个
   目标语言上的两个落点。
