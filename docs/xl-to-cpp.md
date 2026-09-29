# xl → C++ 移植规范

本文件是 `dist/cpp/**` 的唯一生成契约。`*.xl.md` 是事实来源；C++ 产物由本文件描述的
映射规则直出，**一个 `*.xl.md` 对应 `dist/cpp/` 下按 `xl_plan` 报出的若干个部件**
（`layout = type`：每个类型一个 `.h` + 一个 `.cpp`，模块级成员合并进 `<源基名>_module.{h,cpp}`）。

> **修订说明（与实际实现对齐）。** 本文件早期版本描述的「一个源 = 一个 `.cpp`、内含声明段 +
> `#ifdef CANGJIE_BODIES` 主体段、由 `xl-tree.cpp` 索引包含两遍」的形状**没有采用**：`xl_emit`
> 只接受 `xl_plan`/`xl_context` 报出的路径（越界即 `E2001`），而 `xl_plan` 对本工程报的就是
> `layout = type` 的多文件拆分。凡本文件与下述「实际实现」不一致的地方，**以实际实现为准**；
> 完整的现约定见 `dist/cpp/PORT-CONVENTIONS.md`，交付说明与偏离记录见 `dist/cpp/README.md`。
> 已经落实的两条文档要求是 **§1.1 的 `std::shared_ptr` 所有权**与 **§1.10 的异常继承
> `std::runtime_error`**。

「为什么必须这样」——两遍构建、`shared_ptr` 所有权、`TypeName()` 反射这三条结构性决定的
论证与被证伪的替代方案——见 [cpp-design-notes.md](cpp-design-notes.md)。

生成链路：

```
*.xl.md  --xl build -t cpp-->  dist/cpp/<同路径>.cpp  --CMake-->  build/cpp/cjcli
```

规范正文里的代码块是 **ts**，不是 C++：它描述的是语义，不是目标语法。翻译时必须保持
语义（尤其 XML 产物、解析优先级、重组顺序），但写成地道的 C++17。

- 目录镜像：`dawn/text/tokens/keyword.xl.md` → `dist/cpp/dawn/text/tokens/keyword.cpp`
- 命名空间：所有规范都声明 `# namespace cangjie`，产物统一包在 `namespace cangjie { … }`
- 产物头由 `xl emit` 自动添加，不要自己写

**每个产物是一个文件、两个段**：

| 段 | 内容 | 什么时候被解析 |
| --- | --- | --- |
| 声明段（文件开头，**没有** include guard 之外的条件） | 前向声明、类定义、方法签名；**不许**需要完整类型的代码 | 第 1 遍 |
| 主体段（`#ifdef CANGJIE_BODIES` 内） | 其余所有成员函数体、静态成员定义 | 第 2 遍，**全部** 104 个类定义都已完整之后 |

104 个规范里有 89 个处在同一个依赖环里（`token → branch → syntax-context → token` …），
所以**不存在**任何「按依赖排序包含」的方案。造出来的办法是**两遍编译**：先把全部产物的
声明段解析完（此时每个类都完整），再解析全部产物的主体段——于是任何函数体都可以随便用
任何类型，与文件之间的包含关系无关。细节见 §2.1。

---

## 1. 类型映射

| xl / ts | C++ |
| --- | --- |
| `int` / `number`（整数） | `int` |
| `float` / `double` / `number`（小数） | `double` |
| `bool` / `boolean` | `bool` |
| `string`（普通文本） | `std::string` |
| `string`（单字符：`Value` / `Temp` 元素 / `char`） | `std::string`（长度 0 或 1） |
| `void` | `void` |
| `any` | `std::any` |
| `Array<T>` / `ReadonlyArray<T>` / `T[]` | `std::vector<T>`（`T` 是规范类时写作 `std::vector<std::shared_ptr<T>>`） |
| `Array<any>` | `std::vector<std::any>` |
| `Map<string, any>` | `std::map<std::string, std::any>` |
| `Map<K, V>`（其他键） | `std::map<K, V>` |
| `Set<T>` | `std::set<T>` |
| `T \| null` / `T?`（**规范内声明的类**） | `std::shared_ptr<T>` |
| `T \| null` / `T?`（标量） | `std::optional<T>` |
| `(a:A, b:B)=>R` | `std::function<R(A, B)>` |
| `<T extends Token>` | `template <typename T>`（约束写进注释，不写 `static_assert`） |
| `# type X = {...}` | `struct X { … };`（**值语义**，按值传递） |
| `# enum X` | `enum class X { A = 0, B = 1 };`，用例写 `X::A` |

### 1.1 所有规范内声明的类都是 `shared_ptr`

`# class` / `# interface` 一律用 `std::shared_ptr<T>` 持有，理由是它同时解决三件事：

1. **可空**：`T | null` 就是空 `shared_ptr`；
2. **多态**：`shared_ptr<Token>` 指向 `Common`、`Bracket` 等派生类，与 ts 的引用语义一致；
3. **共享**：同一个 `SourceRange` / `Sequence` 对象可能被多处引用，`shared_ptr` 保证它活着。

因此：

- 字段：`std::shared_ptr<Token> Parent = nullptr;`
- 参数：`const std::shared_ptr<Token>& unit`（不转移所有权，也不拷贝）
- 调用点：`unit->Last()`（不是 `unit.Last()`）、`this->Template`

**例外**：`# type` 声明的是纯数据记录（如 `CliOptions`），按值用 `struct`，成员直接是
`std::string` / `bool` / `std::optional<std::string>`。

### 1.2 跨文件接口约定（**最容易写歪，先读这一节**）

产物之间是**编译期耦合**：A 调 `b->Clone()`，返回类型不一致整个工程就链接不上。以下是硬性
约定，不要各自发明。

1. **返回值类型**：凡返回「规范内声明的类」，一律返回 `std::shared_ptr<T>`（可空就用空的
   `shared_ptr`）。**不要**返回裸指针、`T&`、`std::optional<T>`。
   **唯一例外**是 §1.6 列表工具里的 `Get` / `PreAt` / `NextAt` 等模板函数，它们返回 `T*`
   （因为它们对 `T` 一无所知）。
2. **返回自身做链式调用**（ts 的 `return this`）：类继承 `std::enable_shared_from_this<T>`，
   方法里 `return this->shared_from_this();`。**不要**写 `std::shared_ptr<T>(this)`（造出第二个
   控制块，必然 double free），也不要写 `return *this;`。
3. **参数**：对象用 `const std::shared_ptr<T>&`；标量按值；容器 `const std::vector<T>&`。
   「输出参数」用非常量引用：`std::vector<std::shared_ptr<Token>>& units`。
4. **`Equals(x:any)`**：这里的 `any` 表示「任意对象」，但 `AnyValue` 装不下规范内的类
   （没有 Ref 载荷）。已知调用方传的都是同类对象，所以**按具体类型写**：
   `bool Equals(const std::shared_ptr<SourceRange>& other) const;`。参数个数不变。
5. **字段与类型同名**：`Source` 的字段 `Document`、`Token` 的字段 `Template`、异常类的字段
   `SourceRange` 都与类型同名。在类作用域里 `std::shared_ptr<Document>` 会被解析成那个
   **非静态数据成员**，编译器报 `invalid use of non-static data member`。凡是这种位置，写
   **完整限定** `std::shared_ptr<class Document>`（或者 `cangjie::Document`）。
6. **抽象基类**：`Token` / `UnitToken` / `BlockToken` / `Reorganization` / `Document` 等的
   虚方法必须带 `virtual`，派生类覆写带 `override`；基类的抽象成员抛
   `std::runtime_error("abstract member: X")`。基类有虚方法就必须有虚析构。
   `Document` 的成员写成**非 const 虚函数**，`TextDocument` 覆写同一签名。
7. **需要基类的 `this`**（如 `Document::At` 造 `Source`、`TextDocument` 造新单元）：基类继承
   `std::enable_shared_from_this<Base>`，用 `shared_from_this()`，不要用裸 `this`。
8. 不要在产物里 `using namespace std;`，也不要引入规范之外的新类型名。

### 1.3 空值判定

| ts | C++ |
| --- | --- |
| `x === null` / `x == null` / `x === undefined` | `x == nullptr`（对象）或 `!x.has_value()`（`optional`） |
| `x !== null` / `x != null` | `x != nullptr` / `x.has_value()` |
| `x ?? y` | `x != nullptr ? x : y`（对象）／`x.has_value() ? *x : y`（标量） |
| `x!`（非空断言） | `x`（已经是 `shared_ptr` / 裸指针，直接用） |
| `x!.Member` | `x->Member` |
| `x?.Member` | `x != nullptr ? x->Member : nullptr`（复杂点先落成临时变量） |
| `if (x)` / `!!x`（对象） | `if (x != nullptr)` |
| 可选参数 `f(a?:int)` | `f(std::optional<int> a = std::nullopt)` |

`SourceRange.Start` / `End` 这类「可空标量结构」在 ts 里是 `Source | null`，在 C++ 里就是
`shared_ptr<Source>`；`Start!` → `Start`，`Start!.Index` → `Start->Index`。

`Map.get(k)` 在 ts 里可能返回 `undefined`，一律先查存在性：

```cpp
auto it = map.find(key);
if (it != map.end()) { /* it->second */ }
```

### 1.4 反射（`this.constructor`）

> **实际实现**：用 `protected virtual const char* XmlName() const`（基类返回 `"Token"`，每个 Token 族
> 派生类内联覆写成自己的 IR 类名），调用点 `this->XmlName()`；`SequenceTemplate` 的类型键是
> **`std::type_index(typeid(*this))`**，不是字符串。理由：不动结构回读所要求的成员名，且不需要
> 为模板派发引入字符串键。语义与本节等价（`constructor.name` ↔ 运行时类名）。

ts 用 `this.constructor` / `this.constructor.name` 做**类型派发**与 **XML 标签名**（M17）。
C++ 没有这个对象，统一落成一个虚方法：

```cpp
virtual std::string TypeName() const { return "Token"; }   // 每个类覆写成自己的类名
```

- `this.constructor.name` → `this->TypeName()`
- `this.constructor`（当类型键用）→ `this->TypeName()`；`SequenceTemplate::Get` 的第一个形参
  就是 `const std::string& target`
- `x.constructor` / `(item as any).constructor` → `x->TypeName()`

**类名必须与规范一字不差**：它同时是 XML 标签名。

### 1.5 泛型容器 `Sequence<T>` / `SequenceTemplate<T>`

> **实际实现**：`Sequence<T>` 的 `Data` 是 `std::vector<T>`，`T` 由实参侧决定 —— 队列一律实例化成
> `Sequence<std::shared_ptr<Branch>>` / `Sequence<std::shared_ptr<Reorganization>>`（`shared_ptr` 允许
> 被指类型不完整）。持有队列的字段是 `std::shared_ptr<Sequence<…>>`。`SequenceTemplate<T>` 的派发表
> 键是 `std::type_index`，值一律 `std::shared_ptr<Sequence<T>>`。`Get` 保留**两个重载**（单参走默认队列；
> 双参且传空则「不要默认队列」，与 `arguments.length` 的区分一一对应），第二参类型是
> `const DefaultValueResolver<T>&`（`std::function<std::shared_ptr<Sequence<T>>(std::shared_ptr<Sequence<T>>)>`）。

```cpp
template <typename T>
struct Sequence {
  std::vector<T> Data = {};
  explicit Sequence(std::vector<T> items = {});
  Sequence<T>& Add(const std::vector<T>& items);
  bool Contains(const T& item) const;
  void Remove(const T& item);
  std::shared_ptr<Sequence<T>> Removed(const std::vector<T>& items) const;
  std::shared_ptr<Sequence<T>> Added(const std::vector<T>& items) const;
  std::shared_ptr<Sequence<T>> InsertedBefore(const T& item, const std::vector<T>& items) const;
  std::shared_ptr<Sequence<T>> InsertedBeforeWhere(const std::vector<T>& items, const std::function<bool(const T&)>& predicate) const;
  std::shared_ptr<Sequence<T>> InsertedAfter(const T& item, const std::vector<T>& items) const;
};
```

`SequenceTemplate<T>` 用 `std::map<std::string, std::shared_ptr<Sequence<T>>>` 做类型派发表。
`Get(target, onDefaultValue?)` 必须保住「一个实参 vs 两个实参」的区分（显式传 `null` 表示
**不要默认队列**），所以第二个形参是 `std::optional<std::function<…>>`，用
`onDefaultValue.has_value()` 判断。

### 1.6 列表工具（`core/extensions/list-extension.xl.md`）

这些是**模块级 `# method`**，在 C++ 里落成同一命名空间下的**自由函数模板**，必须加 `inline`
（多个翻译单元包含它时不能重复定义）。参数顺序与规范一致：

```cpp
template <typename T>
inline std::vector<T> ReplaceAt(std::vector<T>& self, int index, const T& newValue);
```

判定器参数用 `const std::function<bool(const T&)>&`；`SearchBackIndexed` 的判定器拿
`(int, const T&)`。`Get` / `PreAt` / `NextAt` 返回 `T*`（越界 `nullptr`）。
**调用点不要加命名空间限定，也不要重新实现这些函数。**

### 1.7 数值与字符串

> **实际实现**：**没有** `runtime/any-value.hpp`。手写支撑层是 `dist/cpp/cangjie_support.h`
> （`cangjie::support::` 里的 `inline` 函数：`Join` / `Split` / `Substring` / `Slice` / `CharAt` /
> `IndexOf` / `CharCodeAt` / `FromCharCode` / `ParseInt` / `ParseNumber` / `IsNaN` / `Trim` /
> `ToUpper` / `ToLower` / `StartsWith` / `EndsWith` / `ToString` 重载）。
> 文本拼接用 `support::ToString(x)` 或直接 `+`（`std::string` 与字面量），没有 `JsText`/`JsNumberToString`。
> `any` 一律 `std::any`；字符语义与本节一致（单字符就是长度 1 的 `std::string`，`value.substr(i, 1)`）。

```cpp
#include "runtime/any-value.hpp"

std::to_string(index)        // int → string
JsNumberToString(value)      // double → string，等价 JS 的 Number.toString()
JsText(a, "/", b)            // 模板字面量 `${a}/${b}`
JsTextOf(x)                  // 单个值转文本（bool → "true"/"false"，null → "null"）
```

`${…}` 插值一律用 `JsText(...)`；不要用 `+` 把 `int` 直接拼进 `std::string`。

字符：ts 里 `value[0]`、`value[i]`、`Temp[i]`、`source.Value` 都是**单字符字符串**，
C++ 里用 `value.substr(i, 1)`。`ch === "x"` 写 `ch == "x"`；`ch` 取成 `std::string` 而非
`char` 才能直接比较。遍历 `for (const auto& ch : value)` 时 `ch` 是 `char`，比较写 `ch == 'x'`。

### 1.8 数组 / 映射 / 正则

| ts | C++ |
| --- | --- |
| `arr.push(x)` | `arr.push_back(x)` |
| `arr.push(...other)` | `arr.insert(arr.end(), other.begin(), other.end())` |
| `arr.length = 0` | `arr.clear()` |
| `arr.splice(i, 1)` | `arr.erase(arr.begin() + i)` |
| `arr.splice(i, 0, x)` | `arr.insert(arr.begin() + i, x)` |
| `arr.indexOf(x)` | `std::find`，未命中得到 `arr.size()`（ts 是 `-1`，必须显式转换） |
| `arr.includes(x)` | `std::find(arr.begin(), arr.end(), x) != arr.end()` |
| `arr.map` / `filter` / `findIndex` | 显式 `for` 循环 |
| `arr.join("")` | 见下面的 `Join` |
| `arr.slice(a, b)` | `std::vector<T>(arr.begin() + a, arr.begin() + b)` |
| `map.set(k,v)` / `map.get(k)` / `map.has(k)` | `map[k] = v` / 先 `find` 再 `it->second` / `map.count(k) != 0` |

`join` 在产物里出现得很多（XML 拼接），写成同文件内的静态小函数：

```cpp
/** 用分隔符连接字符串（ts 的 Array.join）。 */
static std::string Join(const std::vector<std::string>& items, const std::string& separator) {
  std::string result;
  for (std::size_t index = 0; index < items.size(); index += 1) {
    if (index != 0) result += separator;
    result += items[index];
  }
  return result;
}
```

`indexOf` 未命中在 ts 里是 `-1`，C++ 的 `std::find` 得到 `end()`；调用点必须显式区分：

```cpp
int index = static_cast<int>(std::find(this->Data.begin(), this->Data.end(), self) - this->Data.begin());
if (index == static_cast<int>(this->Data.size())) { /* 等价 ts 的 -1 */ }
```

### 1.9 正则

`std::regex` + `std::regex_match` / `std::regex_search` / `std::regex_replace` / `std::sregex_iterator`。
ts 的 `RegExp.test(s)` 对应 `std::regex_search(s, m, re)`；正则字面量 `/…/g` 的 `g` 去掉。

### 1.10 异常

规范里的异常类继承 `std::runtime_error`，并保留规范的 `Message` 字段：

```cpp
class SourceException : public std::runtime_error {
 public:
  explicit SourceException(const std::string& Msg) : std::runtime_error(Msg), Message(Msg) {}
  std::string Message = "";
  inline static std::shared_ptr<SourceException> SourceRangeContainsNull =
      std::make_shared<SourceException>("SourceRange.Start == null || SourceRange.End == null");
};
```

- 静态字段的初值**不能写在类体内**（类还没完成），用 `inline static` 在类内声明并初始化，
  或在类后 `inline` 定义。**必须 `inline`**：产物会被多个翻译单元包含。
- `throw new Error("…")` → `throw std::runtime_error("…")`
- `throw SourceException.SourceRangeStartIsNull` → `throw SourceException::SourceRangeStartIsNull;`
- `catch (e)` → `catch (const std::exception& e)`；重新抛出用 `throw;`
- 构造后又被工厂改写 `Message` 时，覆写 `what()` 返回 `Message.c_str()`，让诊断文本与字段一致。

---

## 2. 声明映射

### 2.1 文件骨架：声明段 + 主体段（**必须照做**）

> **实际实现（形状不同，理由见文首修订说明）**：采用 `xl_plan` 报出的 `layout = type` 多文件拆分，
> **不使用** `CANGJIE_BODIES` 两段式单文件，也**没有** `dist/cpp/xl-tree.cpp` 索引。具体形状：
> - 每个类型一个 `<snake_case>.h`（类定义、方法签名、内联的字段访问器与一行体）+ 一个同名 `.cpp`
>   （类外定义，`.cpp` 第一行 `#include` 自己的头）；模块级 `# type`/`# const`/`# method`/`# statement`
>   合并进 `<源基名>_module.{h,cpp}`（模块文件保留源基名的连字符）。
> - 头文件保护用 `#ifndef <产物相对 dist/cpp 的完整路径大写>_H`；`#include` 路径 = 目标产物相对
>   `dist/cpp/` 的路径；前向声明用于只以指针/`shared_ptr` 出现、且只声明不访问成员的位置。
> - 需要完整类型的地方（`make_shared`、`dynamic_pointer_cast`、`shared_from_this()`、访问成员）
>   一律写在 `.cpp` 里，靠 `.cpp` 各自 include 打破 89 个规范之间的依赖环 —— 这与本节「两遍解析」
>   的效果等价，只是把「第 2 遍」落到了每个 `.cpp` 翻译单元上。
> - 产物头由 `xl_emit` 追加；`@generated` 行不要手写。

**为什么。** 104 个规范里有 **89 个处在同一个依赖环**里（`token → branch → syntax-context
→ token`、`document ⟷ source-range`、`template ⟷ token` …），所以：

- 无法给文件排出一个「先依赖、后自己」的包含次序；
- `#pragma once` 无法表达互相包含——谁先被打开，另一方的类定义就还没出现；
- 于是 `make_shared<T>`、`dynamic_cast<T*>`、`shared_from_this()`、按值成员、甚至
  `class X : public Base` 全都会编译不过。

**做法：一个产物 = 一个文件 = 两段，构建时分两遍解析全部产物。**

```
dist/cpp/xl-tree.cpp          ← .tools/dep-order.ps1 生成
  #include "每一个产物"          ← 第 1 遍：只取声明段
  #define CANGJIE_BODIES 1
  #include "每一个产物"          ← 第 2 遍：取主体段
```

第 1 遍结束时 **104 个类定义全部完整**，所以第 2 遍里任何函数体都可以随便用任何类型——
文件的包含关系完全不影响正确性。声明段内**不要**包含其它产物（也不要互相包含），
一个产物引用到的其它类型，在声明段里统一写前向声明。

**骨架**（照抄这个形状）：

```cpp
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <functional>
#include <stdexcept>
#include <algorithm>
#include <map>

#include "runtime/any-value.hpp"     // 唯一允许的 #include 依赖（手写支撑层，不是产物）

// —— 声明段：只前向声明，绝不包含其它产物 ——
namespace cangjie {
class Token;
class Source;
class Bracket;
class Symbol;
class Template;
}

namespace cangjie {

// ===== 声明段：类定义 / 方法签名 / 一行能写完且不需要完整类型的体 =====
class Frame : public Token {
 public:
  explicit Frame(const std::shared_ptr<Template>& template_);
  virtual ~Frame() = default;
  std::string TypeName() const override { return "Frame"; }
  std::string Value = "";
  std::shared_ptr<Token> Clone() override;                 // 主体段定义
  bool IsFrame(const std::shared_ptr<Source>& source);     // 主体段定义
  static std::shared_ptr<Frame> Instance;                  // 主体段定义
};

}  // namespace cangjie

// ===== 主体段：其余所有成员函数体、静态成员定义 =====
#ifdef CANGJIE_BODIES

namespace cangjie {

inline Frame::Frame(const std::shared_ptr<Template>& template_) : Token(template_) {}

inline std::shared_ptr<Token> Frame::Clone() {
  auto result = std::make_shared<Frame>(this->Template);            // 完整类型，合法
  result->Sign(this->shared_from_this());
  return result;
}

inline bool Frame::IsFrame(const std::shared_ptr<Source>& source) {
  auto bracket = std::dynamic_pointer_cast<Bracket>(this->Last());  // 完整类型，合法
  return bracket != nullptr && bracket->StartBracketChar == source->Value();
}

inline std::shared_ptr<Frame> Frame::Instance = std::make_shared<Frame>(nullptr);

}  // namespace cangjie

#endif  // CANGJIE_BODIES
```

**声明段里不能出现的东西**（这些一律搬到主体段）：

- `std::make_shared<X>(…)` / `new X(…)`——包括**字段初始化器**和**静态成员的初值**；
  字段先写 `= nullptr`，初值在主体段用 `inline X::Field = std::make_shared<X>(…)` 给。
- `dynamic_cast` / `dynamic_pointer_cast` / `static_pointer_cast`。
- `this->shared_from_this()`。
- 访问另一个类的成员（`x->Field`）、调用另一个类的方法。
- 按值使用其它规范类（`Sequence<Branch>` 这种按值模板实参也不行——写成
  `std::shared_ptr<Sequence<std::shared_ptr<Branch>>>`）。
- 依赖**枚举成员**的默认值（如 `RuntimeScopeType Type = RuntimeScopeType::Common;`）：
  `enum class` 的前向声明里没有成员，所以这种初始化器必须搬到主体段
  （声明段写 `RuntimeScopeType Type = RuntimeScopeType::Common;` 会失败 → 改成
  `RuntimeScopeType Type;` 并在构造函数里赋值，构造函数本体在主体段）。

**声明段里可以做**：

- `class X : public Base { … }`——基类只要在本产物的**前向声明**里出现过就行（C++ 允许
  不完整基类，成员访问推迟到函数体）。`Base` 必须也是规范里的类（或 `std::runtime_error`
  / `std::enable_shared_from_this<X>` 这类标准库类型，需要 `#include <stdexcept>` 等）。
- 成员函数签名、`virtual`/`override`、`static`、字段声明、`std::shared_ptr<T>` 字段、
  `std::vector<std::shared_ptr<T>>` 字段。
- 一行、只用到返回值/字面量/自身成员的方法体（如 `TypeName()`、`IsNumber()` 里只比较
  自身字段的简单判断）——**前提**是它不接触任何不完整类型。
- `virtual std::string TypeName() const override { return "X"; }`（§1.4 要求每个类都有）。

**主体段里**：

- 所有需要完整类型的成员函数体，类外定义并写 `inline`。
- 静态成员的定义（`inline std::shared_ptr<X> X::Instance = …;`）。
- 自由函数（模块级 `# method`）也放主体段，模板函数写 `inline`。

**其它必须遵守的**：

- 本文件**不要**包含任何其它产物的 `.cpp`——两遍机制已经保证类型完整，包含只会制造环。
- 声明段与主体段都在 `namespace cangjie` 里；`#ifdef CANGJIE_BODIES` 不能嵌套在类体内。
- 三段顺序固定：`#pragma once` → 标准库/运行时 `#include` → 声明段 → `#ifdef` 主体段。

### 2.2 `# class` / `# interface`

```cpp
class Keyword : public IndependentToken {
 public:
  explicit Keyword(const std::shared_ptr<Template>& template_) : IndependentToken(template_) {}
  virtual ~Keyword() = default;
  std::string TypeName() const override { return "Keyword"; }

  std::string Value = "";                        // field
  std::string ToXmlString() override { /* … */ } // method
  std::shared_ptr<Token> Clone() override { /* … */ }
};
```

- **修饰符**：`protected` / `private` 照规范写；没有修饰符即 `public`。
  `static readonly field` → `inline static` 成员（同 §1.10 的注意事项）。
- **`extends`** → `class Derived : public Base`；**`implements`** 里的 BCL 接口不写，
  规范内声明的接口才写进基类列表。
- **构造器**：参数表与规范一字不差；转调基类写初始化列表（规范里的 `super(x)`）。
- **抽象成员**：基类写虚方法并抛 `std::runtime_error("abstract member: X")`，派生类覆写。
- **属性**（`## property` + `### get`/`### set`）：**访问器名必须用属性名本身**
  （`std::string Value() const`，不是 `GetValue()`）——结构校验按名字逐个查，写成 `GetValue`
  会报「member "Value" is absent」。需要 `GetX()` 风格时再加一个同义的别名方法。

### 2.3 `# type`

```cpp
struct CliOptions {
  std::string Input = "";
  std::string Output = "";
  bool Help = false;
  bool Version = false;
  std::optional<std::string> Error = std::nullopt;
};
```

`# type X = (a:A)=>R` 写成 `using X = std::function<R(A)>;`。

### 2.4 `# enum`

case 的值取 **`xl_context` 结构契约里 `cases` 数组的顺序**（0 起）。`# enum` 的 case 在规范
正文里常写成 `- case Undo` 这样的**列表项**（不是 `## case` 标题），所以**不要凭标题判断
顺序**——以契约的 `cases` 为准，并与 `dist/ts/<同名>.ts` 的枚举顺序交叉核对。

```cpp
// core/syntax/branch-states.xl.md：契约的 cases 是 ["Undo", "Done"]
enum class BranchStates { Undo = 0, Done = 1 };
```

**保留原 case 名与拼写**。各 token 全部按名字比较，不依赖序数，但顺序仍须与 ts 一致。

### 2.5 `# statement`

> **实际实现**：`cjcli_module.cpp` 的匿名命名空间里保留一个 `[[maybe_unused]] const bool kStatement1`
> 占位对象并注明原因（C++ 既没有加载期执行钩子，加载期也拿不到 `argv`）。真正的进程入口是**手写**的
> `dist/cpp/cjcli_main.cpp`：切掉 `argv[0]` 后调用 `cangjie::Main(args)`。`process.exitCode = 1; return;`
> 一律落成 `std::exit(1);`（源里这些位置的下一句都是 `return`，语义等价），因此不需要 `CjcliExitCode()`。
> 全工程只有一个 `main`，它在 `cjcli_main.cpp` 里（`cjcli_main.cpp` 与 `CMakeLists.txt`、
> `cangjie_support.h` 一样属于**手写文件**，不是 xl 的产物）。

`# statement` 的围栏内容是**模块级执行语句**，在 C++ 里落成入口函数，并在同一个翻译单元里
定义 `main`：

```cpp
int main(int argc, char** argv) {
  std::vector<std::string> args;
  for (int index = 1; index < argc; index += 1) args.push_back(argv[index]);
  cangjie::Main(args);
  return cangjie::CjcliExitCode();
}
```

`process.argv.slice(2)` 对应「跳过程序名」的参数表。ts 用 `process.exitCode = 1`，C++ 里维护
一个模块级 `int` 退出码并在 `main` 返回。**整个工程只能有一个 `main`**，它只能出现在
`dist/cpp/cjcli.cpp` 里。

### 2.6 模块级 `# method` / `# const`

自由函数与常量直接放 `namespace cangjie`；函数要加 `inline`（产物是头文件式单元）。
`# const` → `inline const <type> Name = …;`。

---

## 3. XML 产物：一字不差

`ToXmlString()` 决定验收结果（`samples/*.expected.xml`）。逐字对照规范正文里的模板串：

- 属性之间的空格、`=` 两侧、引号，全部照抄；
- 标签名用 `this->TypeName()`；
- `temp.join("")` 就是用空串连接子单元的 `ToXmlString()`；
- 只有规范明确要求转义的地方才调 `CommonUtil::XmlDecode`（`BlockToken`），
  `Bracket` / `String` 等**不转义**。

---

## 4. 语义红线

1. **解析优先级不能改**：`ParsePipeline::CreateGeneralQueue` 的顺序就是语言定义。
2. **重组顺序不能改**：`ParsePipeline::GeneralReorganize` 的顺序决定 XML。
3. **`Process` 返回新下标**：`i = item->Process(this->Template, this->Data, i);`
4. **类名不能改**：`TypeName()` 直接进 XML。
5. **越界语义不能统一**：`SkipNext` 可以返回 `Data.size()`，`FindNext` 找不到返回 `-1`。
6. **`Bracket::Use("{")` 不设 `ReorganizationQueue`**：看着像漏写，是原实现行为，照抄。
7. **`SequenceTemplate::Get(t, null)` 表示「不要默认队列」**，与单参调用语义不同。

---

## 5. 完成前自查

> **实际实现下的自查项**（替换下面与两段式/无 include 有关的条目）：
> - [ ] 产物是 `xl_plan` 报出的**部件集合**：每个类型 `.h` + `.cpp` 都要交，模块级成员进 `_module.{h,cpp}`；
>       `xl_plan` 对全部 104 个源报 `reusable: yes`。
> - [ ] 头文件保护是「产物相对 `dist/cpp/` 的完整路径大写 + `_H`」；`#include` 路径 = 目标产物相对
>       `dist/cpp/` 的路径（**允许**产物之间 include，这正是打破依赖环的手段）。
> - [ ] 规范内声明的类一律 `std::shared_ptr<T>`；`new X(…)` 已换成 `std::make_shared<X>(…)`；
>       需要 `shared_from_this()` 的层次根继承了 `std::enable_shared_from_this<X>`。
> - [ ] 异常族继承 `std::runtime_error`；`throw X::Static;` 抛副本，可被 `catch (const std::exception&)` 捕获。
> - [ ] 反射用 `XmlName()`（不是 `TypeName()`）；`SequenceTemplate` 键是 `std::type_index`。
> - [ ] `any` 用 `std::any`；支撑层是 `cangjie_support.h`（不是 `runtime/any-value.hpp`）。
> - [ ] 构建文件是 `dist/cpp/CMakeLists.txt`（不是仓库根 CMake + `.tools/`）。
>
> 以下原始条目中，**「产物是两段结构」「产物里没有任何指向其它产物的 include」「`#pragma once` 在
> 产物头之后第一行」三条已不适用**（我们用 `#ifndef` 保护 + `.h`/`.cpp` 拆分 + 产物间 include）；
> 其余条目（成员名/参数个数/`override`/虚析构/无 `using namespace std;`）仍然有效。

- [ ] 规范声明的**每一个**类型名、字段名、方法名、property 名、枚举成员名都出现在产物里
      （结构校验按名字逐个查）。
- [ ] 每个方法的**参数个数**与规范一致（校验会数逗号）。
- [ ] 产物是**两段**结构：声明段在前，`#ifdef CANGJIE_BODIES` 主体段在后。
- [ ] 声明段里没有 `make_shared` / `new` 规范类、`dynamic_cast`、`shared_from_this()`、
      访问其它类的成员、按值使用规范类、构造规范类的字段初值、枚举成员的默认初值。
- [ ] 产物里**没有**任何指向其它产物的 `#include`（只有标准库和 `runtime/any-value.hpp`）。
- [ ] 规范声明的每一个类型名、字段名、方法名、property 名、枚举成员名都出现（结构校验逐个查）。
- [ ] 每个方法的参数个数与规范一致。
- [ ] 派生类方法带 `override`，基类有虚析构。
- [ ] `#pragma once` 在产物头之后的第一行；没有 `using namespace std;`。
- [ ] 自查命令能过（见 §6）。

---

## 6. 构建与自查

> **实际实现**：构建只用生成树里那份**手写**的 `dist/cpp/CMakeLists.txt`（`GLOB_RECURSE` 收产物、
> 排除 `.xl/`、`target_include_directories` 指向 `dist/cpp`），外加手写的 `cjcli_main.cpp` 提供 `main`：
>
> ```console
> $ cd dist/cpp && cmake -B build && cmake --build build     # 构建树恒在 dist/cpp/build/
> $ ./build/cjcli samples/hello.cj                           # 与 samples/hello.expected.xml 对照
> ```
>
> 本仓库**没有** `.tools/` 脚本、没有 `dist/cpp/xl-tree.cpp`、也没有 `ctest` 测试目标；下面这套
> 工具链下载/两遍包含/`-DXL_CPP_*` 开关的描述属于早期方案，当前未启用。
> 另：验收可与仓库自带的夹具对照 —— `samples/hello.cj` + `samples/hello.expected.xml`、
> `samples/generic.cj` + `samples/generic.expected.xml`。

工具链（本机没有 cmake / g++ / ninja，脚本会下载免安装版到 `.tools/`，已被 `.gitignore` 忽略）：

```powershell
powershell -File .tools\setup-toolchain.ps1   # 只跑一次：g++ 16.2 / cmake 4.4 / ninja
. .tools\env.ps1                              # 把三个工具放进当前 shell 的 PATH
```

生成产物（每个 `*.xl.md` 一个 `dist/cpp/**` 文件，由本文件的映射规则直出）：

```powershell
xl build -t cpp        # 规划：打印每个源 → 产物的路径与结构契约
                       # 真正的写入由生成方（DSH agent）调用 xl_emit 完成，见 §2.1 的产物形状
```

单文件自查（声明段 + 整棵树一起类型检查，只编译指定产物的主体段）：

```powershell
powershell -File .tools\build-cpp.ps1 -SyntaxOnly -Filter keyword
```

整棵树类型检查 / 链接出 `cjcli`：

```powershell
powershell -File .tools\build-cpp.ps1 -SyntaxOnly
powershell -File .tools\build-cpp.ps1 -Compile
```

CMake（与上面等价，也是本工程的正式构建方式）：

```powershell
. .tools\env.ps1
cmake -S . -B build/cpp -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/cpp
ctest --test-dir build/cpp --output-on-failure
```

常用开关：

| 开关 | 作用 |
| --- | --- |
| `-DXL_CPP_WERROR=ON` | 警告即错误 |
| `-DXL_CPP_ASAN=ON` | 打开 address/undefined sanitizer |
| `-DXL_CPP_ROOT=<dir>` | 换一个生成的产物根目录（默认 `dist/cpp`） |

`dist/cpp/xl-tree.cpp` 是生成的包含索引（`*.cpp` 两遍包含），由 `dep-order.ps1` 写出，
CMake 也会自动重建；它不属于任何一份规范。

`build-cpp.ps1` 会把 `warning: '#pragma once' in main file` 过滤掉——那对每个产物都会出现，
是「产物既是头文件又是翻译单元」的必然结果，不是问题。
