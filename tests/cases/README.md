# tests/cases —— 五类用例语料

**一条用例 = 一个 `.ts` 文件。** 五类语料在目录树上同一形状：

```
tests/cases/<类别>/<功能域>/<名字>.ts        类别 = token / exec / runtime / stdlib / e2e
```

| 类别 | 尺子 | 谁在量 | 权重 |
| --- | --- | --- | --- |
| `token` | **AST 尺子**：逐节点对 `ts.createSourceFile`（kind / 区间 / 字段名 + 未映射 / 缺 range / 越界） | `cases:tsast`（门）与 `coverage`（百分比） | 15% |
| `exec` | **执行尺子**：`node` 与 `tsrun` 各跑一遍，比 stdout 逐字节 + 退出码 | `coverage` | 25% |
| `runtime` | 同上 | `coverage` | 25% |
| `stdlib` | 同上 | `coverage` | 20% |
| `e2e` | 同上 | `coverage` | 15% |

## 文件头的文法

文件头是若干行 `// xl:<键> <值>`，**以 `// xl:end` 收尾**（覆盖层必须写；token 用例没有），
后面才是正文。**正文一个字节都不动**——跑的就是它。

```
// xl:title 泛型类的静态成员与实例字段
// xl:round 330
// xl:judge stdout
// xl:want blocked
// xl:why 静态成员在这一版还没有自己的格子
// xl:end
class Box<T> { static of<U>(u: U): U { return u; } }
console.log(Box.of(1));
```

| 键 | 属于 | 含义 |
| --- | --- | --- |
| `xl:note` / `xl:title` | 两套 | 这条在测什么的**一句话**（`note` 是 token 语料的旧名，等价） |
| `xl:expect` / `xl:absent` | token | 产物里必须出现 / 一个都不许有的标签（`Tag` 是「至少一个」、`Tag:N` 是「正好 N 个」） |
| `xl:known-gap` | token | 这条是**已知缺口**——差额走另一条账，还得对不上才记 `KNOWN` |
| `xl:ts-invalid` | token | 故意写非法 TS（默认必须合法） |
| `xl:bom` | token | 这份文件显式带 BOM（默认不许带） |
| `xl:want` | 覆盖层 | 台账：`pass`（默认）/ `blocked` / `differ` |
| `xl:skip` | 覆盖层 | **口径外**（不进分母），值写人话理由 |
| `xl:why` | 覆盖层 | `want` 不是 pass、或 `skip` 时的**根因**（人写） |
| `xl:judge` | 覆盖层 | 裁判怎么跑：`stdout`（默认） |
| `xl:args` | 覆盖层 | 裁判的额外实参（`--experimental-transform-types` 那一档） |
| `xl:may-fail` | 覆盖层 | 这一条本来就是「两边都非零退出」，退出码仍要对得上 |
| `xl:weight` | 覆盖层 | 这一条在覆盖度里的权重（默认 1） |
| `xl:round` | 覆盖层 | 哪一轮收编进来的（历史线索，不参与判定） |
| `xl:end` | 两套 | 头结束，后面是正文 |

**指令块允许续行**：`xl:note` 的值可以是多行的，续行是不带 `xl:` 的说明注释
（语料里满是这样写的）。**同名取最后一条**——与迁移前那条逐行扫全文的解析器逐位等价。

**没写在词表里的键一律报错**（`cases:check` 拦）：写错键名是静默的（值被忽略、用例照跑）。
**正文里出现 `xl:` 散文**时把它写成两条斜杠加两个空格（`//  xl:`）——一眼可辨，也不会
被读成指令（`exec` 里抄自 token 语料的那 39 条就是这个形态）。

## 行尾：`\r` 会把**整条指令**吃掉（第 685 轮实测的坑）

`.gitattributes` 是 `* text=auto eol=lf`，所以**库里的文本文件都是 LF**；
只有两条用例是**故意在盘上带 CRLF** 的（`token/lexical/lex-crlf` 与
`lex-crlf-mixed-with-lf`——判据不去断言这一点，见下）。

**解析器必须先把行尾归一成 LF**（`case-file.mjs` 的 `parseDirectives` 第一件事就是它）。
不归一的后果不是「少读一条」，而是**一条都读不到**：按 `\n` 切出来的行尾留一个 `\r`，
而 `^//\s*xl:(\S+)\s*(.*)$` 里的 `$` 在 `\r` **之前**不成立、`.` 也不吃 `\r`
⇒ 整条正则失败 ⇒ 文件头被当成正文，`xl:expect` / `xl:known-gap` 全部静默失效。

**这个坑藏了很久**：`cases:tags` 只报「期望与产物不符」，而**读不到的期望不产生断言**——
所以它一路是绿的。修好之后断言数从 **4764 涨到 4778**：那两份 CRLF 用例各贡献 7 条
（`xl:expect` 两行共 7 个标签），是一批**从来没执行过**的期望；其中 **4 条当场报错**——
`Const` / `BlockToken` 这两个标签名在产品里根本不存在（`const` 投成 `Let`、`{` 投成 `Bracket`），
已改成真名。也就是说：**行尾归一这一行代码，决定了另外 14 条断言存不存在**。

**那两份 CRLF 用例钉的是什么**：实测纯 LF / 纯 CRLF / 混合三种行尾下**产物逐标签相同**，
所以它们钉的是「换行风格不改变产物」，**不是**「盘上必须是 CRLF」——
`.gitattributes` 会把它们归一成 LF，这一点写在了那两份用例的 `xl:note` 里。

## 分母里有什么（数字是最近一次全量实测）

语料 **5987** 条（token 1416 / exec 1279 / runtime 796 / stdlib 2250 / e2e 246），判过 **5973** 条。
覆盖度按类算，**每一类的分母是那一类判过的条数**：

| 类 | 判过 | 过 | 缺口（blocked / differ） | 备注 |
| --- | --- | --- | --- | --- |
| `token` | 1403 | **1184** | 219 | 缺的那 219 条**全是** `xl:known-gap`；另有 13 条不进分母 |
| `exec` | 1278 | **1248** | 6 / 24 | 另有 1 条不进分母 |
| `runtime` | 796 | **783** | 1 / 12 | |
| `stdlib` | 2250 | **2173** | 26 / 51 | |
| `e2e` | 246 | **242** | 4 / 0 | |
| **合计** | **5973** | **5630** | 256 / 87 | 加权 **95.7%** |

**第 698 轮再加 85 条**（分母 5888 → **5973**）：第九批原子探针，专问**排序与比较器**、
`ToPrimitive` 三件套（`Symbol.toPrimitive` / `valueOf` / `toString`）、属性描述符的迁移、
解构与默认值、`try/finally` 与标签的控制流、对象字面量的 getter / 展开，以及 `delete` / `in`。
**收掉两处**：

- **`async` 函数的返回值不是一个「真的承诺」**（第 692 轮就登在台账里的
  `runtime/async/probe3-a12` 与第 697 轮新登的四条）：`(async function () { return 1; })()`
  **有** `then`（第 285 轮把三个方法挂在实例上了），但它的原型一直是 `protos.Object` ⇒
  `instanceof Promise` **假**、`Object.prototype.toString` 给 `[object Object]`、
  `.constructor` 干脆**没有**（`p.constructor.name` 抛 `TypeError`）。
  修法：`vm.xl.md` 的 `MakeAsyncPromise` **把原型接上 `protos.Promise`**，
  并且**不再在实例上挂那三个方法**——第 690 轮它们已经在 `Promise.prototype` 上了
  （`Object.getOwnPropertyNames(Promise.prototype)` 与 Node 逐字相同），
  再挂一份就是**第二份账**（症状是 `Object.getOwnPropertyNames(promise)` 多出三格）。
  同一个根的第二处在建库层：`promise.xl.md` 的 `MakePromise` 也照改
  （注释里那句「与 `Map` / `Set` 同一条口径（实例方法）」在第 341 轮就已经过期）。
- **裸块里带 `in` 的数组字面量整份文件进不来**（**实测撞到的**）：
  `{ const r = ["a" in o]; }` 报 `unimplemented: expression TypeParameter`。
  根子：`IsMappedKeyBracket` 判「这个 `[` 是不是映射类型的键」时，容器那一问
  **只问了「父单元是不是一个 `{` 括号」，而块的花括号与类型字面量的花括号是同一个类**
  ⇒ 整个数组被当成映射键、投成 `TypeParameter`。
  修法：花括号那一档**再问一句「本单元是不是它的第一个实义单元」**——
  判据与 `type-literal/type-literal.xl.md` 的 `IsMappedTypeBrace` **同一条**
  （映射类型的键一定是花括号里的第一个；`readonly` / `+` / `-` 前缀要跳过），
  按类名判、不 import（那份文件向上 import 这一个文件，反过来会绕出环）。
  **试过又退回来的一条**：改用括号自己的 `Context === "type"` —— 真映射键那个 `{`
  不是 `"type"`，六条 token 用例（`ty-mapped` / `ty-mapped-as-remap` / `lex-keyword-in-of` …）
  当场判成「缺 16 多 7」，`cases:tsast` 与 `coverage` 同时红，所以那一版没有留下。

**加权仍是 95.7%**（分子 +87：收掉的 5 条 + 新过的 82 条；分母 +85，
另登记 3 条新缺口：计算键是对象时的 `ToPropertyKey`、`Object.defineProperty` 写数组下标、
**计算键写的 `__proto__` 不该改原型**——最后一条是第 697 轮那个访问器带出来的，
根子在「对象字面量的成员走 `[[Set]]`、而 JS 走 `CreateDataProperty`」）。

**第 697 轮再加 159 条**（分母 5729 → **5888**，三批：95 + 50 + 15）：第八批原子探针，专问
`Symbol` 与知名符号、`Error` 家族与 `cause`、`Promise` / `async` 的**形状**、
`Number` 与 `Math` 的格式化边界、`Object` 的冻结那一族与**属性枚举次序**，以及 `for..in`；
后两批**专钉本轮修的那一处**（原型那一格）。**收掉一处、而且它底下压着三小处**：

- **`Object.prototype.__proto__` 那个访问器没装**（**静默错值**，第 678 轮就登在台账里）：
  读 `o.__proto__` 给 `undefined`；**写**它更坏——`SetProperty` 对不存在的键造的是**数据属性**
  ⇒ `o.__proto__ = p` 写出一格**叫 `__proto__` 的普通自有属性**、链**一点没变**
  （`o.greet` 是 `undefined`、而 `o.__proto__ === p` 却为**真**——**半对**，最难查的一种）。
  修法：`ObjectProtoGet` / `ObjectProtoSet` 两个号 + `DefineAccessor` 挂到 `protos.Object` 上
  （与 `Map.prototype.size` 第 613 轮**同一条教训**：`SetProperty` 造的是数据属性，
  **造不出访问器**）。取法**与 `Object.getPrototypeOf` 共用 `PrototypeOfValue`**——
  规范里那一格的正身就是一句 `Return ? O.[[GetPrototypeOf]]()`，不写第二份。
  **`null` 那一档`与「原型是数字」不是同一个答案**：`o.__proto__ = null` / `Object.setPrototypeOf(o, null)`
  **真的断开链**（`RtSetProto` 原来把 `null` 与「随便什么非对象」挤在同一句 `return receiver` 里）。
- **写那一侧漏了「宿主可调用」这一档**（**这一轮实测撞到的，也是最要紧的一处**）：
  `SetPropertySearched` 判 setter 能不能调，用的是 `property.Setter.IsCallable()`——
  而**语言层往内建身上挂的 setter 是宿主引用**，`Value.IsCallable()` 看不到它
  ⇒ **继承来的宿主 setter 永远不调**（`o.__proto__ = p` 于是被静默当成「写了个不存在的名字」）。
  **读那一侧第 601 轮就修过了**（`ReadProperty` 用的正是 `IsCallableValue`，
  注释里还写着「实测撞到的」）——**同一个根长在两条路上，只修了一条**；
  这一轮把写那一侧对齐（判据 `exec/decorators-modifiers/051-beh-proto-accessor`）。
  修完当场红了三条 JSON 用例，引出下面那一处。
- **「按数据造对象」不能走 `[[Set]]`**：`JSON.parse('{"__proto__": {…}}')` 在 JS 里造的是
  **一格叫 `__proto__` 的普通自有属性**，而 `[[Set]]` 会**沿原型链调 setter** ⇒ 去**改原型**；
  装库期更响（`SetProperty(…, NeverCall, …)` 真调起来抛
  `unreachable: installing a builtin never calls a function`，**整份文件进不来**）。
  原来那三条用例**只是碰巧过**（setter 恰好被上面那一条挡在门外 ⇒ 静默变成「新建一格」）。
  修法：`props.xl.md` 添一格 `CreateDataProperty`（就是 `SetHiddenProperty` 那一趟 + 三个标志全开），
  `JSON.parse` 与 reviver 两处换成它。

**加权 95.8% → 95.6%**（分子 +148：收掉的 2 条 + 新过的 146 条；分母 +159，
另登记 13 条新缺口：`Error.stack` / `async` 函数那一层壳 / `Object.setPrototypeOf(o, 1)` 该抛
/ 两条 `blocked`——「函数体里的内建基类」与「查不到的名字」）。

**第 696 轮再加 152 条**（分母 5577 → **5729**，两批：102 + 50）：第七批原子探针，专问
**稀疏数组与洞**（`map` / `filter` / `indexOf` / `includes` / `reduce` 五条对洞的口径都不一样）、
`String.prototype` 的替换与切分、`Map` / `Set` 的构造与遍历、迭代协议在
**展开 / `Array.from` / 解构**三处的落法、标签模板的 `raw`，以及类里的访问器与 `super`；
第二批 50 条**专钉本轮修的那一处**（类数组接收者）。**收掉一处**：

- **类数组接收者那一族**（**静默错值 + 整族抛**）：`Array.prototype.map.call({ length: 2, 0: "a", 1: "b" }, f)`
  在 JS 里照跑，本仓报 `this method needs an array receiver`——`slice` / `join` 第 335 / 338 轮
  各有自己的类数组分支，**其余二十来个方法全建在 `HeapArray` 上**。
  修法不是「把每个方法都改成通用的」（那是三十份会漂的判据），而是**先把接收者折成一个真数组**
  （`ArrayLikeSnapshot`：`ToObject` + 逐格 `HasProperty`，`length` 走 `ArrayLikeLength`，
  **在就是值、不在就是洞**——`{ length: 2 }` 折出来是**两个洞**，与 Node 一致），
  再走**下面同一段**。只接**只读那一族**（`IsArrayLikeMethod`：`map` / `filter` / 谓词族 /
  `reduce` 两格 / `indexOf` / `lastIndexOf` / `includes` / `flat` / `flatMap` / `keys` / `values` /
  `entries` / `at` / `toSorted` / `toReversed` / `with` / `toSpliced`）；**会改接收者的那些**
  （`push` / `pop` / `shift` / `unshift` / `reverse` / `sort` / `splice` / `fill` / `copyWithin`）
  要**写回那个对象**，是另一处活，仍然响亮地抛（`probe2-g10` / `g11` / `g14` 的台账还在）。
  **第三个实参是原件**：JS 的回调收的第三个实参是 `O`（接收者对象）——快照**不是**它，
  所以四处回调传的是留下的一份 `receiver`（`probe696-r36` / `r37` / `r38` 钉的就是这一格）。
  **`ToObject` 那一半另有两个洞**：文本接收者（`slice.call("abc")` 原来给 `[]`——
  `ArrayLikeLength` 一句 `if (!receiver.IsObject()) return 0` 把原始值一律当 0，
  第 692 轮登记的 `probe2-g12`）与 `null` / `undefined`（要 `TypeError`，不然会被当成空数组
  **静默给 `[]`**）。**实测**：`probe2-g02` / `g04` / `g08` / `g12` / `g15` 五条台账转绿、已撤，
  `newlyPassing` 5、`regressions` 0。

**加权 95.7% → 95.8%**（分子 +154：收掉的 5 条 + 新过的 149 条；分母 +152）。

**第 695 轮再加 150 条**（分母 5427 → **5577**）：第六批原子探针，专问
**序列化与属性枚举**（访问器 / `toJSON` / 缩进 / 白名单 / 不可枚举）、`Object` 的静态面、
`String` 与 `Number` 的格式化边界、类的访问器与继承。**收掉一处**：

- **`JSON.stringify` 遇到访问器给 `{}`**（**静默错值**）：`JSON.stringify({ get a() { return 1; } })`
  本仓给 `{}`（Node 给 `{"a":1}`）——`JsonText` 那一趟**遇到访问器一律跳过**
  （四处 `PropertyKind.Accessor → continue`），而 `Object.values` / `entries` 第 655 轮
  就已经接上了「有 `call` 通道就**现读**」这条可选服务的纪律。修法：**读值收成一个方法**
  （`JsonMemberValue`：数据属性给 `property.Value`、访问器走 `GetProperty` + `call`、
  读到的值当场 `JsonAnchor` 锚住、**没有通道时给 `null`** 让调用方跳过），四处调用点换成它。
  **还有一处是同一个根的第二个门**：`JsonKeyOrder` 那一趟也把访问器**筛掉了**
  ——不放开它，次序表里根本没有那一格，前一处改得再对也轮不到它
  （实测：只改 `JsonText` 三处仍然给 `{}`）。判据 `probe694-o34` 转绿、撤台账，
  本批 `probe695-j01` … `j17` 与 `k15` / `k17` 把这一族钉住（含缩进、白名单、
  嵌套、`toJSON` 同时在场、`defineProperty` 的两种可枚举性）。

**加权仍是 95.7%**（分子 +151、分母 +150）。**本批 150 条全 pass**：这一族没有别的缺口。

**第 694 轮再加 242 条**（分母 5185 → **5427**）：第五批原子探针，专问**调用链与成员形状**
（谁在左边、谁被调用、`.bind` / `?.` / `new` 的落法、取值与赋值两侧的成员访问）、
**迭代协议与生成器的清理**、类的私有名与静态面，以及 `Object` / `String` / `Array` / `Map`
上还没问过的成员。**收掉一处**：

- **`return o.f?.()` 里那个 `return` 被吃进了被调者链**（第 694 轮，**整份文件进不来**）：
  `?.()` 那一条规则往左走成员访问链找被调者起点时只按**类名**判（`IsChainLink` 认
  `Identifier`），而那一刻 `return` 正是一个 `Identifier`（关键字升级还没轮到它）⇒
  产物里 `Method` 的名字成了 `"return"`、`return` 成了它的第一个孩子 ⇒ 降级期报
  `name is not a local or a capture: return`。`typeof o.f?.()` 同一处（报的是 `typeof`）。
  修法是给链的边界添一张**语句 / 一元关键字表**，并且**只看左边那一格是不是点号**
  ——`o.return?.()` 里的 `return` 是**属性名**（生成器的 `it.return()` 遍地都是），
  `this` / `super` / 字面量也**不进表**（它们可以是链的头）。顺带把第 693 轮登记的那条
  连续可选调用（`o?.f?.()`）也收掉了：`probe693b-e49` 撤掉台账转绿。

另登记 8 条新缺口（`blocked` +5 / `differ` +11，其中 8 条是本轮新登的，另 3 条是把
第 693 轮那批里同根的探针收进来）：**对象字面量里的类**当构造器（`new ns.C()`）、
生成器的 `return(7)` 实参没用上（**静默错值**）、迭代器对象自己没有 `next`、
方法里的**箭头函数用 `super`**、**数组的下标不是自有属性**那一族
（`defineProperty` 抛 / `hasOwnProperty(0)` 答假 / `Object.assign([], [1,2])` 静默给长度 0）、
`JSON.stringify` 遇到**访问器**给 `{}`。

**加权仍是 95.7%**（分子 +235、分母 +242，另收掉第 693 轮那条登记缺口）。

**第 693 轮再加 555 条**（分母 4630 → **5185**）：第四批原子探针（两批：一批问
`Object` 的静态面与键序 / `Array` 的泛用方法 / `Number` 的字符串解析与进制 /
`-0` 与 `NaN` / `String` 的模式替换与码点 / `JSON` / `Map`·`Set` 的 SameValueZero、
另一批问**形状**——语句与标签、ASI、可选链、生成器、解构与展开、`new` 与调用链、
类成员的各种写法）。**收掉三处**：

1. **对象解构写死的键走 `get_prop`**（**静默错值**，两半都是）：
   `const { 0: a } = [7]` 与 `({ 0: b } = [7])` 原来都给 `undefined`（JS 给 `7`）——
   键那一格是 `Identifier "0"`，而 `get_prop` **只认属性表里的字符串键**，
   **数组的下标不在属性表里**。两半一起改成走 `get_index`（与 `arr["0"]` 那条一字不差，
   也与计算键那一支合流）。
2. **引号名的键在投影那一步整个丢掉**（**静默错值**）：`const { "x": a } = o` 的
   `BindingElement` 里键是 `<String><ConstString>x</ConstString></String>`，
   而 `isNameNode` 只认 `Identifier` / `Keyword` ⇒ `propertyName` 没投出来，
   降级层把**绑定的名字**当成了键（`{ "x": a }` 读成 `{ a }`）⇒ 给 `undefined`。
   取法与 `specifierNameOf` 那条**一字不差**（引号名给 `StringLiteral`）。
3. **`break` 的目标只能是「块 / 循环 / `switch`」**：`lbl: if (…) { break lbl; }` 与
   `lbl: try { break lbl; } finally { … }` 都报
   `unknown label \`lbl\` (the parser should have rejected this)`（**整份文件进不来**），
   而**两句都是合法的 JS**。第 234 轮那一支只认裸块、第 692 轮只把它放宽到「标签头」，
   这一轮把判据换成「体**吃不吃**标签」——循环五档 + `switch` 走 `PendingLabels`，
   **其余一律给一层可跳出的上下文**（`BlockLabel`）。判据要**穿过嵌着的标签**看，
   否则 `first: second: for (…)` 的外层会被当成「不吃标签」，`continue first` 当场又断
   （那是第 692 轮刚收掉的一处）。

另登记 15 条新缺口（`blocked` +5 / `differ` +10）：函数自己的 `arguments` / `caller`、
`Object.keys.call.bind(Object.keys)`、`Array.isArray(arguments)`、`localeCompare`、
`search` / `match` 的字符串实参、`case` 后面的**裸块**、**块里的函数声明**（Annex B 提升）、
连续两次可选调用（`o?.f?.()`）、`class A extends Array`、`super.toString`、
`Map` 迭代器交回来的**条目数组**按下标读、`new Function`、函数体开头的 `"use strict"`、
`function () { }.bind(null)`（**函数表达式后面直接跟 `.`** 被投成了声明）。

**加权仍是 95.7%**（分母 4630 → 5185：新收的 540 条通过是分子，15 条登记缺口也是分母，
两个数在同一位上）。

**第 692 轮（其三）再加 103 条**（分母 4527 → **4630**）：第三批原子探针，
专问**闭包与作用域**（提升、TDZ、`var` / `let` 在循环里的闭包）、`this` 绑定
（`call` / `apply` / `bind` 与原始值）、承诺与 `async`、`Map` / `Set` 的成员面、
异常的流转、字符串与模板的边角。**收掉一处**：

- **`new Array(-1)` 抛的是普通 `Error`**（JS 抛 `RangeError: Invalid array length`），
  而同一支里 `new Array(1.5)` **根本不进「一个数是长度」那条路** ⇒
  **静默给 `[1.5]`**（Node 抛）。判据改成「是不是 `0..2^32-2` 的整数」，
  两档一起收：`new Array(NaN)` / `new Array(Infinity)` / `new Array(2 ** 32 - 1)`
  也都对上了。

另登记 5 条新缺口（`differ` +5）：`typeof` 一个**还没初始化**的 `let`（TDZ，该抛
`ReferenceError`，本仓给 `"undefined"`）、松散模式 `call` / `apply` / `bind` 的原始值
接收者**没有装箱**（3 条，与 `exec/functions/094` 同一条根）、`async` 函数的返回值
**不是一个承诺**。

**第 692 轮（其二）再加 150 条**（分母 4377 → **4527**）：第二批原子探针，
专问**属性描述符与访问器**、`Array.prototype` 的**泛用**写法（类数组接收者）、
**数字格式化**（`toPrecision` / `toExponential` 的缺省与 `undefined`）、`Math` 的边角、
类的 `super` 与私有名、解构 / 展开、装箱与 `ToPrimitive`、控制流
（`finally` 覆盖 `return`、带标签的跳出）。这一批**收掉五处**：

1. **带标签的语句后面那一截被壳吞掉**（**静默错值**，最响的一处）：
   token 层把 `outer: for (…) { … }` 与**它后面那条语句**收进**同一个** `Statement` 壳
   （`SplitShell` 遇到 `Label` 开头时一律让开），而投影的标签那一支只吃
   「标签 + 被标的语句」⇒ 壳里剩下的整段丢掉。顶层是「循环后面的语句一句都不跑」，
   **函数体里更响**：`function f() { lbl: { …; break lbl; } return out; }` 的 `return`
   也在壳里 ⇒ **函数返回 `undefined`**。修法：头是「一串连续标签 + 被它们标的那一格」
   （语句级单元，或者裸块 `lbl: { … }`），尾巴另收一条壳。
2. **多标签的循环**（`first: second: for (…)` + `break first`）：`PendingLabel` 只存
   **一个**名字，内层标签写的时候把外层**顶掉** ⇒ 那个名字谁也没吃、
   `break first` 报 `unknown label`（**整份脚本进不来**）。改成一摞
   （`PendingLabels` / `LoopContext.Labels`），`break` / `continue` 两个判据一起认。
3. **`(0.1).toPrecision()` 抛 `RangeError`**：规范对 `toFixed` / `toPrecision` /
   `toExponential` **各有一套缺省口径**，而且「不给实参」与「显式 `undefined`」是
   **同一档**（先问是不是 `undefined`，再做 `ToIntegerOrInfinity`）。原来把
   「不给实参」与「给 `NaN`」混成一档 ⇒ `toPrecision()` 抛、`(5).toString(undefined)`
   也抛。现在三格各写各的缺省（那一张实测表就在 `globals.xl.md` 里）。
4. **`Object.getOwnPropertyDescriptor(对象, 数字键)` 响亮地抛**：
   `Object.getOwnPropertyDescriptor([1], 0)` 与 `(…, "0")` 在 JS 里问的是**同一格**，
   而那一支只收字符串 / 符号键（`Object.hasOwn([1], 0)` 第 691 轮就收数字了）。
   现在键先过一趟 `ToPropertyKey`。
5. **`Array.prototype.map.call(null, f)` 给的是普通 `Error`**（JS 给 `TypeError`）：
   `catch (e) { if (e instanceof TypeError) … }` 那种写法在这里分不出来。
   `null` / `undefined` 与 JS 对齐；**其余非数组仍然响亮地抛**——
   「`Array.prototype.*.call(类数组)` 该照类数组跑」是**待做项**（下面那 10 条缺口）。

另登记 10 条新缺口（`differ` +10）：**类数组接收者**那一族（`map` / `indexOf` /
`filter` / `push` / `reverse` / `sort` / `every` / `slice(字符串)` 共 8 条，
其中 `slice.call("abc")` 是**不抛、给错值**）、函数自己的 `arguments` / `caller` 两格、
**计算键成员**（`class A { [1 + 1]() { … } }`，降级层明写不做）。

**第 692 轮（其一）再加 385 条**（分母 3992 → **4377**）：两批一次性的**角落普查**——
① 手写的 81 条（属性枚举次序 / 数组的洞 / 字符串与数字格式化 / 位运算 / `Map`-`Set`
的键 / `JSON` / 类与访问器）；② **原子探针 299 条**（`probe-*`：一条只问一个表达式，
期望值由**真 `node` 现给**，打印口径钉成 `typeof:值`，免得把控制台渲染那一族的
已知缺口混进来）。这一批**加宽本身收掉四处**：

1. **`o["f"]().v` 这一族整段丢**（**静默错值**，最响的一处）：token 层把这种写法给成
   **两格**（`PropertyAccess(o["f"])` 与 `PropertyAccess(Bracket(()), ., v)`），
   而投影层的链那一支只看「`kids[1]` 是不是 `.` 或下标」⇒ 整个让开 ⇒ 只投 `kids[0]`：
   `console.log(o["f"]().v)` **打印那个函数自己**（Node 打印 `1`），
   `a["values"]().next().value` / `"ab"[Symbol.iterator]().next().value` 同样。
   修法：链那一支认「第二格**以一次调用开头**」（`isCallFirstUnit`），摊开之后与
   `o["f"]()` 那条既有路一字不差。
2. **`IsOperand` 不认 `Function`**（只认 `Class`，第 328 轮补漏的另一半）：
   `typeof function () {}` 折不起来 ⇒ 投影只吐一个光秃秃的 `TypeOfKeyword`
   （降级层报 `unimplemented: expression TypeOfKeyword`）；`!function () {}` 报
   `ExclamationToken`；`function () {} + 1` 里 `+` 被读成**前缀一元** ⇒ 报
   `FunctionDeclaration`。两份名单（`unary-operator` / `binary-operator`）一起补齐。
3. **补 `Function` 带出来的回归，同一轮当场收掉**：`function f() {} ++n;` 里 `++`
   的前一格成了「操作数」⇒ 被读成**后缀**、把函数声明折进操作数。判据是文法——
   后缀 `++` / `--` 要一个**引用**，字面量给不出来（`Class` 一并排掉）。
4. **`"abc".hasOwnProperty("length")` / `hasOwnProperty(0)` 原来答假**（JS 答真）：
   这一支在 `self.Tag !== Object && !== Array` 上就返回了，而**同一个问题**在
   `Object.hasOwn` 那一支（第 691 轮收下字符串）**早就是真**——两套答案。
   现在字符串走 `getOwnPropertyDescriptor`（越界给 `undefined` ⇒ 假），
   函数自己那两格（`length` / `name`，不住在属性表里）另认一句。

另登记 6 条新缺口（`differ` +5 / `blocked` +1）：`typeof eval` 没有那一格、
**没声明过的名字**在降级期就抛（JS 要到运行期才抛 `ReferenceError`）、
`Error` 的静态成员、生成器对象的内部标签（`[object Generator]`）、
私有名的品牌检查、**类表达式**静态块里类名没绑上。
另外 `token/expressions/expr-function-expression-plus` 这一条**收掉了**
（`xl:known-gap` 撤掉，`xl:expect` 从 `UnaryOperator` 改成 `BinaryOperator`）。

**不进分母的只有两档**（`xl:skip` 1 条 + `.tsx` / `xl:ts-invalid` 13 条 = 14 条）：

| | 条数 | 为什么不进 |
| --- | --- | --- |
| `xl:skip` | **1** | 装饰器：`node` 三种模式都拒收，**裁判给不出来**（没有基准就没法量） |
| `.tsx` / `xl:ts-invalid` | **13** | AST 尺子的裁判对不了（TSX 语法 4 条）；故意写非法 TS（9 条，判据要量的正是**错误处理**） |

**口径外只剩「裁判给不出来」那一档。** 其余一律进分母：`RegExp` 族 7 条、`BigInt` 族 4 条、
多文件导入 1 条、动态 `import()` 1 条、`eval` 1 条、`Error` 的栈 1 条
**都是待做项，记在台账里**（用户口径：这些都要做，`tsrun` 现在的单文件口径是**现状**，不是口径）。
**口径外只剩「裁判给不出来」那一档。** 其余一律进分母：`RegExp` 族、`BigInt` 族、
多文件导入、动态 `import()`、`Error` 的栈**都是待做项，记在台账里**（用户口径：
这些都要做，`tsrun` 的单文件口径是现状不是口径）。

## 跑一次

```bash
npm run cases:tsast     # token：八条全 0 才绿（门）
npm run cases:check     # 用例文件本身合不合格
npm run cases:tags      # xl:expect / xl:absent 对产物核实
npm run cases:shapes    # 形状覆盖
npm run coverage        # 五类 + 两种尺子 + 覆盖度报告
npm run gates           # 上面这几道一次跑完
```
