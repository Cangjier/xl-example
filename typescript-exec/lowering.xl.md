# dependencies
```xl
import { Value } from "../runtime/value.xl.md"
import { Program, Instruction, Op, RtOp, Constant, FunctionInfo, Handler } from "../runtime/ir.xl.md"
import { IdTable } from "../runtime/ir-verify.xl.md"
import { NumberToHostText, NumberFromHostText } from "../runtime/host-text.xl.md"
import { Access, EnvChain, EnvScope, EnvRef, CapturedNames, CollectDeclaredNames, Contains, CollectPatternNames } from "./scope.xl.md"
import { CollectFunctionNames, CollectHoistedVars, HasNestedFunction, HasArrowFunction, WalkChildren, IsFunctionNode, IsVarList } from "./scope.xl.md"
import { DefineAccessorId, GetIteratorId, SpreadIntoId, NewApplyId, IterDrainId, ArrayRestId, RestObjectId, SetHiddenId } from "./builtins/install.xl.md"
import { StringConcat, ObjectAssign, PowId } from "./builtins/globals.xl.md"
```

# namespace cangjie

**降级层**：把 TS 形状的树（`typescript/` 的第三出口）变成不可变 IR（`runtime/ir.xl.md`）。

**输入的形状**是 `Token.PrintAst` 的 JSON 投影——与 `ts.createSourceFile` **逐节点一致**
（语料 1413 份全绿）。它按 TS 的划分出节点、纯数据、有文档：

```
{"kind":"BinaryExpression",
 "left":{"kind":"NumericLiteral","text":"1","pos":8,"end":9},
 "operatorToken":{"kind":"PlusToken","text":"+","pos":10,"end":11},
 "right":{"kind":"NumericLiteral","text":"2","pos":12,"end":13},
 "pos":8,"end":13}
```

三条读法，写这一层必须先记住：

1. **`kind` 是字符串**（TS 的 `SyntaxKind` 名），**子节点挂在命名字段上**
   （`left` / `right` / `statements` / `initializer` …），所以这里用
   `Record<string, any>` 接住它——**输入本来就是 JSON，不是强类型的树**；
2. **运算符取 `operatorToken.text`**（`"+"` / `"*"` / `"="`…）：一个 token 节点，取原文最省事；
3. **数字与字符串字面量的值在 `text` 里，而且是字符串**——`"1"` 不是 `1`。
   所以这一层要自己把文字转成数值（`NumberFromText`），**不许用宿主的 `parseFloat`**；
4. **空的序列整个不出现**：`function f() {}` 的节点里**没有** `parameters`，
   `{}` 的块里**没有** `statements`。所以取序列一律走 `ListOf`（缺 = 空），
   而 `VariableDeclarationList.declarations` 那种**不可能为空**的序列仍然走 `Child` 严格查
   ——「可能是空的」与「不该是空的」是两件事，**用同一个函数接会丢掉这个区别**。

**这一层产出的调用约定**（`runtime/ir.xl.md` 定死的）：

- **槽**：函数的参数占前面的槽（0 起），局部变量与临时值排在后面；
- **调用**：`call A(闭包槽), B(参数基址), C(参数个数)`，**结果落回 `B`**；
- **rt_call**：`A(算子 id), B(结果槽), C(参数基址), D(参数个数)`。

**两条口径**（与 [README](README.md) 一致）：

1. **类型位一律擦除**：不做类型检查，`let x: number = "s"` 照跑；
2. **语言专有的糖在降级期展开，不进 id 表**：id 表是多语言共用的契约。

**这一轮的范围**（最小构造集，够跑起 P0 的形状）：

| 收了 | 还没收（各自的下一次） |
| --- | --- |
| 变量声明（`let`/`const` 按块作用域、`var` 按函数作用域）、表达式语句、`return`、`throw`、`if`/`else`、`while`、`for(;;)`、**`for..of`（迭代协议）**、**`try`/`catch`/`finally`**、**`switch`/`break`/`continue`**、块、函数声明 | `for..in`、标签 |
| 数字 / 字符串 / `true` / `false` / `null` / `this` / 标识符 / 括号 / 二元（算术 + 比较 + **`in`**）/ 赋值 / **复合赋值** / 调用 / **方法调用（`call_method`）** / 属性与下标（含 **`?.`**）/ **`??`** / **对象字面量** / **数组字面量（含洞）** / **箭头函数** / **函数表达式** / **`new`** / **`typeof`** | 一元运算符（等投影）、**模板串**（等投影带段文本）、解构默认值与剩余、`instanceof`、`for..in`、生成器函数 |
| **提升**（函数声明与 `var` 名字提到函数顶）、**闭包捕获**（环境记录） | **TDZ**（见下）、块里的函数声明、**`for (let …)` 每次迭代新建绑定**（会静默给错值） |
| **`finally` 三种路径**（正常 / 接住 / 没接住也跑完再重抛） | **`finally` 的代码发两遍**（共享要子过程跳转）；**带 `finally` 的 `try` 里 `return` / `break` / `continue` 要先把在册的 `finally` 各发一遍**（第 201 轮 ✓，见 `EmitPendingFinalies`） |
| **`for (let …)` 每次迭代新建绑定**（体里有函数值时走「每轮一个新环境 + 格值拷贝」） | 循环体里**没有**函数值时仍走槽（快路径）——这是**保守判据**：多建环境只是慢，少建一次就是错值 |
| **箭头函数的 `this`**（含箭头的那一层留一格装接收者，箭头体里按普通捕获读） | **块里的函数声明**、`catch` 参数的块作用域之外，作用域这块还剩 TDZ |
| **`await`**（挂起当前帧 + 恢复时接兑现值，算子早就在引擎里） | **async 的语义差**（见下）：调用者不等承诺、返回值不包承诺、`await` 非承诺抛 |
| **`import` 的名字从环境对象取**（与全局名同一套机关；`import` / `export { … }` 语句是**空操作**——导出表本来就装着这份文件的每个函数） | **真正的跨模块链接**：把模块 A 的导出**值**交给 B 需要一个**共享的堆**（跨机器搬 `Value` 不行——`Ref` 是各自表里的下标）；`import * as ns` 与 `export default` 抛 |
| **`for..in`**（`Object.keys` + 迭代协议拼出来的，**没有新算子**；要求全局名里有 `Object`，否则明确报出来并指出修法） | **只遍历自有键**（`Object.keys` 的口径；JS 还会走原型链上的可枚举键）；**整数样式的键不按 JS 的「升序优先」**——这里一律按插入顺序 |
| **计算成员访问**（`o[k]` 读/写：数组走真下标，**非数组对象由引擎把键字符串化之后落成属性读/写**；`o[k]()` 用值键 + `Op.Call` 的 `this` 槽，**没有新算子**） | **字符串接收者**仍然是那块已知差（`"abc"[0]` 在 JS 里是 `"a"`，这里给 `undefined`）；计算成员**写入**在原始值接收者上**抛** |
| **`class`**（构造函数 + `prototype` 对象 + 方法挂上去；拼的是「函数值 + `prototype` 属性 + 方法调用」三样既有东西） | **字段初始化**、`static`、getter/setter、计算键方法、类里的生成器 / async 方法——一律**降级期抛**；`prototype.constructor` 的回指与 `instanceof` 一起做 |
| **`extends`**（一条 `set_proto` 把子类 prototype 的原型接到父类 prototype 上；方法沿链找到） | **从句关键字投影没带**，所以「第一段就是 `extends`」——`class C implements I {}` 会在解析 `I` 时报未知名字（**响亮**，不是静默错值） |
| **`super(...)`**（`Op.Call` 的 `D` 操作数带 `this` 槽；父类构造函数经**环境**进子类构造函数的帧） | **父类带构造函数时**，派生类必须自己写构造函数**并调用 `super(...)`**——两样缺一样都**降级期抛**（默认构造函数没法转发 `...args`，静默少跑父类初始化更坏） |
| **`instanceof`**（沿原型链找 `C.prototype`；「原型挂在哪一格」用的是 `new` 的那个**同一个旋钮**，引擎不认识 `prototype` 这七个字） | 右侧不是对象**抛**（JS 是 `TypeError`——**不许静默给假**）；宿主没声明原型键也**抛**；`Symbol.hasInstance` 与自定义 `instanceof` 不做 |

**`async` 的三条语义差（都写在明处，不假装是 JS）**：

1. **脚本里的调用者会等下去**：JS 里 `f()` 立刻拿到一个承诺、调用者继续跑；
   这里 `await` 挂的是**当前帧**，而调用者的帧还在它下面——于是整条链停在承诺上。
   **宿主是那个事件循环**：`Host` 会把这解释成 `Parked`（在等承诺），
   宿主结清之后再排空微任务，结果就绪。**这是宿主驱动模型下的正确形状**，
   但它**不是**「async 函数立刻返回承诺」那条 JS 语义。
2. **返回值不包承诺**：`return v` 给出来的是 `v` 本身（宿主结清后从 `Result` 取），
   JS 给的是「已兑现为 `v` 的承诺」。
3. **`await` 非承诺要抛**（引擎的规矩 ✓）；JS 会把它当成已经兑现的值。
   这一条与第 2 条同源：**没有「把任意值包成承诺」这一步**。

**箭头函数的 `this` 已经修好**：它没有自己的 `this`（取外层那个），所以降级器在
**含箭头的那一层**的环境里多留一格，开场把接收者存进去；箭头体里的 `this` 于是与
**普通捕获**走同一条路（链上找、深度算），深度那套东西一行没改。
判据里有一对**对照**：同一个对象上挂一个箭头与一个函数表达式，箭头看到外层、
函数看到接收者——**两者不同才是对的**。

**第 119 轮补上的另一半：这条环境路只许箭头走**。原来 `ThisKeyword` **不问当前这一层是
什么函数**，一律先在环境链上找——于是「模块里恰好有一个箭头」（于是模块那一层开了
`this` 格）时，**构造函数 / 方法 / 函数表达式**的 `this` 都会读到**模块**那一格，
症状是 `this.v = v` 报 `assigning a property on a primitive receiver`。
判据里那条「默认参数 + 类 + 箭头」的合成形状就是撞上它才红的
（`PendingFunction.IsArrow` / `InArrow` 那两段是修法）。

**TDZ 的缺口写清楚**：**未捕获**的 `let`/`const` 用在声明之前会报
`name used before its declaration`（因为那时它既不在槽里也不在环境里）；
**已捕获**的**读不到这个错**——环境格从函数一开始就存在，读到的是 `undefined`。
两者的差别来自「格数是 `EnvNew` 那一刻定死的」，**不假装它报了**。
做到「两种都报」要一张声明清单加运行期的状态位（`let` 的未初始化态），下一次。

**函数声明的提升只做这一层的直接语句**：嵌套块里的函数声明按块作用域处理
（严格模式语义），这一轮原地降级、不进提升名单。

**两处「必须报错」的地方，写清楚为什么：**

- **闭包捕获**：这一轮变量只住在槽里，所以内层函数引用外层变量**必须报错**，
  不能悄悄读到一个错的值。捕获要的是环境记录（`runtime/heap.xl.md` 的 `HeapEnv` 已经就位，
  `EnvNew`/`EnvGet`/`EnvSet` 三步都有判据跑过），缺的是「哪些变量该进环境」那步分析
  （下一次 `scope.xl.md`）。
- **一元运算符**：投影**没带** `PrefixUnaryExpression` 的运算符（TS 的 `operator` 是
  `SyntaxKind` 数字，投影只留了节点型字段），所以 `-1` 与 `!x` 在投影里**分不出来**。
  这一条记在 [docs/typescript-parsing-gaps.md](../docs/typescript-parsing-gaps.md)，
  在投影补上之前，这里**抛**。

# type AstNode = Record<string, any>

树上的一个节点。

**右侧是原文**（`# type` 的规矩）：这里写的是宿主的类型写法——输入是 JSON，
用 `any` 接住它是**如实的**，不是偷懒。**所以每次访问字段前先看 `kind`**
（`NodeKind` / `Child` / `OptionalChild` 就是为它准备的）。

# type CapabilityLookup = (name:string)=>number

**「这个名字是宿主能力吗？是的话号是多少」**（不是就给 -1）。

降级层收的是**回调**而不是一张表：于是它**不必认识 `bindings.xl.md`**
（只有驱动同时认识两者）。这条缝让「能力从哪来」可以换实现，
而降级层只认一个函数。

# method NodeKind:(node:AstNode)=>string

节点的种类名。

**它替掉一大串 `node.kind` 直读**：读的地方只有一处，将来投影要换字段名也只有一个地方改。

```ts
const kind = node["kind"];
if (typeof kind !== "string") throw new Error("ast node without a kind");
return kind;
```

# method Child:(node:AstNode, key:string)=>AstNode

取一个子节点；**不是节点就抛**（形状不符是**上游的 bug**，不许当成 `undefined` 混过去）。

```ts
const value = node[key];
if (value === null || value === undefined || typeof value !== "object") {
  throw new Error("ast node " + NodeKind(node) + " has no child " + key);
}
return value as AstNode;
```

# method OptionalChild:(node:AstNode, key:string)=>AstNode | null

取一个可有可无的子节点（例如没有 `else` 的 `if`）。

```ts
const value = node[key];
if (value === null || value === undefined) return null;
if (typeof value !== "object") return null;
return value as AstNode;
```

# method ListOf:(node:AstNode, key:string)=>Array<AstNode>

取一个**序列**子节点；**缺 = 空**（投影把空序列省略了，见文首第 4 条）。

```ts
const value = node[key];
if (value === null || value === undefined) return [];
if (typeof value !== "object") {
  throw new Error("ast node " + NodeKind(node) + " has a non-list " + key);
}
return value as AstNode[];
```

# method TextOf:(node:AstNode)=>string

节点的 `text`（标识符名、字面量原文、token 原文都走它）。

```ts
const text = node["text"];
if (typeof text !== "string") throw new Error("ast node " + NodeKind(node) + " has no text");
return text;
```

# method UnitsOf:(text:string)=>Array<int>

宿主字符串 → **码元数组**（`runtime/value.xl.md` 里字符串就是码元）。

**这一步用宿主的字符 API 是应该的**：它读的是**宿主解析出来的字符串**。
「引擎侧不许用宿主库」那条规矩管的是 `runtime/`——为了四个目标给出同样的结果，
引擎里不许出现 `charCodeAt` 这类东西；这里不同，它本来就是宿主侧的一次转写。

```ts
const units: number[] = [];
for (let i = 0; i < text.length; i++) {
  units.push(text.charCodeAt(i));
}
return units;
```

# method NumberFromText:(text:string)=>float

把数字字面量的**原文**变成数值（第 129 轮重写）。

**认这五种形态**（TS 的 `NumericLiteral` 会给什么，它就认什么 ✓）：

| 形态 | 例 | 口径 |
| --- | --- | --- |
| 十进制整数 / 小数 | `42` `3.14` `.5` `42.` | 十进制 ✓ |
| 十进制指数 | `1e3` `1.5E-3` `2e+10` | 指数段必须全是指数（`e` 后面不许再有点 ✗）|
| 十六 / 八 / 二进制 | `0x1F` `0o17` `0b1010` | **不接小数点与指数** ✗（TS 也不接 ✓）|
| 数字分隔符 | `1_000` `0xFF_FF` `1_0.5` | 下划线只许**夹在两个数字之间** ✓（与 TS 同口径 ✓）|
| **`BigInt`**（`123n`） | `123n` | **响亮地抛** ✓——它是 v1 的明确非目标 ✓（`docs/runtime-architecture.md` §15 ✓），静默当 `123` 是最坏的一种 ✓ |

**两件事分开做，这是这一轮的核心** ✓：

1. **形态自己扫**（`ScanNumber`）✓——它决定**收不收** ✓，于是「不认的形态」是**响亮的一句**
   ✓（`unimplemented: numeric literal 1n`）✓，而不是一个悄悄算错的数 ✗；
2. **十进制 → 双精度的舍入交给宿主** ✓（`NumberFromHostText`，唯一的宿主借用，写在
   `runtime/host-text.xl.md` ✓）。

**为什么第 2 步不再自己算** ✗：老版本是 `sign * (whole + fraction / scale)` ✓，
它**静默给错值** ✗——实测 20 万个「整.小数」里 **2 个**差 1 ulp ✓
（`43.695449` 自算给 `43.695448999999996` ✓）。两次舍入（先除再加）不是一次舍入 ✗；
把它改成一次除法只是在**一部分**字面量上对 ✓（`mantissa` 超过 2^53 就又不成立了 ✗）。
正确舍入是 IEEE 754 的活儿 ✓——这一条与 `builtins/text.xl.md` 第 124 轮
「浮点 → 文本借宿主」是**同一句理由** ✓，两个方向现在收在同一个文件里 ✓。

```ts
const shape = ScanNumber(text);
return NumberFromHostText(shape);
```

# method ScanNumber:(text:string)=>string

**形态扫描器**：收一个数字字面量的原文，返回它的**规范十进制文本**
（去掉下划线分隔符 ✓、把十六 / 八 / 二进制翻成十进制 ✓、小数与指数原样留着给宿主 ✓）。

**分两段写**（自己算的进制 / 交给宿主的十进制）是刻意的 ✓：*收不收* 是这一层的语义 ✓，
*舍入* 是宿主的活儿 ✓，中间那根线就是「返回值是一段十进制文本」✓。

**抛就是拒绝** ✓：消息以 `unimplemented: ` 开头 ✓，且**带上原文** ✓——
用户看见的是 `unimplemented: numeric literal 10n`，不是「某个地方出错了」✓。

**分隔符那一段是三个循环里最容易被写歪的一格** ✗：下划线只许夹在**两个数字之间** ✓，
而「数字」要看**当前进制** ✓（`0xF_F` 对 ✓，`1_e3` 不对 ✗——`e` 在十六进制里是数字 ✓、
在十进制里不是 ✓）。所以每个循环都带一个「上一个消费掉的是不是数字」的标记 ✓，
「下一个是不是这一进制的数字」也要问一遍 ✓——两次都问，`1__0` 与 `1_e3` 才都拒得掉 ✓。

```ts
let i = 0;
let sign = "";
if (text.length > 0 && (text[0] === "-" || text[0] === "+")) {
  sign = text[0];
  i = 1;
}
if (i >= text.length) throw new Error("unimplemented: numeric literal " + text);
// **进制前缀** ✓：`0x` / `0o` / `0b` 三种各一个号 ✓，其余仍走十进制 ✓
//（`0x1.5` / `0x1e3` 在 TS 里也不是数 ✗，这里靠「收集完必须正好到末尾」跟着拒 ✓）。
let radix = 10;
if (i + 1 < text.length && text[i] === "0") {
  const marker = text[i + 1];
  if (marker === "x" || marker === "X") radix = 16;
  if (marker === "o" || marker === "O") radix = 8;
  if (marker === "b" || marker === "B") radix = 2;
  if (radix !== 10) i = i + 2;
}
if (radix !== 10) {
  let value = 0.0;
  let seen = false;
  let lastDigit = false;
  while (i < text.length) {
    const unit = text.charCodeAt(i);
    if (unit === 95) {
      if (!lastDigit || i + 1 >= text.length) throw new Error("unimplemented: numeric literal " + text);
      const next = DigitValue(text.charCodeAt(i + 1));
      if (next < 0 || next >= radix) throw new Error("unimplemented: numeric literal " + text);
      lastDigit = false;
      i = i + 1;
      continue;
    }
    const digit = DigitValue(unit);
    if (digit < 0 || digit >= radix) break;
    // **精确范围之外响亮地拒** ✓：`value * radix` 是精确的（radix 是 2 的幂 ✓），
    // 但「加上一位」在 `value` 超过 2^53 之后会**静默舍入** ✗。再长的整数字面量要
    // 多精度才转得对 ✓，那是 P2 类型层的事 ✓——这里给一句能读的话 ✓，不给一个近似的数 ✗。
    if (value > (9007199254740991 - digit) / radix) {
      throw new Error("unimplemented: integer literal beyond the exact range needs the type layer: " + text);
    }
    value = value * radix + digit;
    seen = true;
    lastDigit = true;
    i = i + 1;
  }
  if (!seen) throw new Error("unimplemented: numeric literal " + text);
  if (i < text.length && text[i] === "n") {
    throw new Error("unimplemented: BigInt literal (v1 out of scope): " + text);
  }
  if (i !== text.length) throw new Error("unimplemented: numeric literal " + text);
  // **按十进制文本交出去** ✓：进制已经在上面算完了 ✓，宿主那一头只认十进制 ✓
  //（`NumberToHostText` 对整数给的就是那几位数字本身 ✓，没有舍入 ✓）。
  return sign + NumberToHostText(value);
}
// **十进制**：整数段 → 小数段 → 指数段，三段各一个循环 ✓，谁都不许跳回来 ✓
//（`1.2.3` / `1e2e3` / `1e2.5` 都在这三条上被拒 ✓）。
let whole = "";
let lastDigit = false;
while (i < text.length) {
  const unit = text.charCodeAt(i);
  if (unit === 95) {
    if (!lastDigit || i + 1 >= text.length) throw new Error("unimplemented: numeric literal " + text);
    const next = text.charCodeAt(i + 1);
    if (next < 48 || next > 57) throw new Error("unimplemented: numeric literal " + text);
    lastDigit = false;
    i = i + 1;
    continue;
  }
  if (unit < 48 || unit > 57) break;
  whole = whole + text[i];
  lastDigit = true;
  i = i + 1;
}
let fraction = "";
if (i < text.length && text[i] === ".") {
  i = i + 1;
  lastDigit = false;
  while (i < text.length) {
    const unit = text.charCodeAt(i);
    if (unit === 95) {
      if (!lastDigit || i + 1 >= text.length) throw new Error("unimplemented: numeric literal " + text);
      const next = text.charCodeAt(i + 1);
      if (next < 48 || next > 57) throw new Error("unimplemented: numeric literal " + text);
      lastDigit = false;
      i = i + 1;
      continue;
    }
    if (unit < 48 || unit > 57) break;
    fraction = fraction + text[i];
    lastDigit = true;
    i = i + 1;
  }
}
if (whole.length === 0 && fraction.length === 0) {
  throw new Error("unimplemented: numeric literal " + text);
}
let exponent = "";
if (i < text.length && (text[i] === "e" || text[i] === "E")) {
  i = i + 1;
  if (i < text.length && (text[i] === "+" || text[i] === "-")) {
    exponent = text[i];
    i = i + 1;
  }
  let digits = "";
  lastDigit = false;
  while (i < text.length) {
    const unit = text.charCodeAt(i);
    if (unit === 95) {
      if (!lastDigit || i + 1 >= text.length) throw new Error("unimplemented: numeric literal " + text);
      const next = text.charCodeAt(i + 1);
      if (next < 48 || next > 57) throw new Error("unimplemented: numeric literal " + text);
      lastDigit = false;
      i = i + 1;
      continue;
    }
    if (unit < 48 || unit > 57) break;
    digits = digits + text[i];
    lastDigit = true;
    i = i + 1;
  }
  if (digits.length === 0) throw new Error("unimplemented: numeric literal " + text);
  exponent = exponent + digits;
}
// **`n` 后缀是 `BigInt`** ✓：它走到这里说明前面是一段合法的十进制数字 ✓，那就指名道姓地拒 ✓
//（不指名的话，用户看到的是「数字字面量不认」✗，而他要的信息是「`BigInt` 不支持」✓）。
if (i < text.length && text[i] === "n") {
  throw new Error("unimplemented: BigInt literal (v1 out of scope): " + text);
}
if (i !== text.length) throw new Error("unimplemented: numeric literal " + text);
if (whole.length === 0) whole = "0";
// **交给宿主的是「规范十进制」** ✓：`42` → `"42.0e0"`、`3.14` → `"3.14e0"`、
// `.5` → `"0.5e0"`、`1e-3` → `"1.e-3"` ✓——这几种写法宿主都认 ✓，
// 而它们**没有经过任何算术** ✓，所以舍入是**一次**、由宿主做 ✓。
return sign + whole + "." + fraction + "e" + (exponent === "" ? "0" : exponent);
```

# method DigitValue:(unit:int)=>int

一个码元的数值：`0`-`9` / `a`-`f` / `A`-`F` 各给 `0`-`15`，其余给 `-1`。

**为什么不借宿主的进制转换** ✗：那是**几条比较** ✓，不是 IEEE 754 的活儿 ✗——
`host-text.xl.md` 借的是「正确舍入的十进制 ↔ 双精度」✓，不是「`parseInt`」✓。
这一层自己扫，`0x1F` / `0o17` / `0b1010` 走到哪一位停下也才是我们说了算 ✓。

```ts
if (unit >= 48 && unit <= 57) return unit - 48;
if (unit >= 97 && unit <= 102) return unit - 87;
if (unit >= 65 && unit <= 70) return unit - 55;
return -1;
```

# method BinaryOpOf:(operatorText:string)=>int

二元运算符文字 → `RtOp` 的 id。

**比较也在里面**：它们本来就是 id 表的成员（`cmp_lt` 那些），所以「糖不进 id 表」
这条口径不适用于它们。

```ts
if (operatorText === "+") return RtOp.Add;
if (operatorText === "-") return RtOp.Sub;
if (operatorText === "*") return RtOp.Mul;
if (operatorText === "/") return RtOp.Div;
if (operatorText === "%") return RtOp.Mod;
// **七条位运算**（第 147 轮）：它们的语义在引擎那一侧（`rt.xl.md` 的 `ToInt32Of` 那一段 ✓）——
// 降级层只负责「这个文字对应哪一号」 ✓。
if (operatorText === "&") return RtOp.BitAnd;
if (operatorText === "|") return RtOp.BitOr;
if (operatorText === "^") return RtOp.BitXor;
if (operatorText === "<<") return RtOp.Shl;
if (operatorText === ">>") return RtOp.Shr;
if (operatorText === ">>>") return RtOp.UShr;
if (operatorText === "<") return RtOp.CmpLt;
if (operatorText === "<=") return RtOp.CmpLe;
if (operatorText === ">") return RtOp.CmpGt;
if (operatorText === ">=") return RtOp.CmpGe;
if (operatorText === "===") return RtOp.CmpEqStrict;
if (operatorText === "!==") return RtOp.CmpEqStrict;
if (operatorText === "==") return RtOp.CmpEqLoose;
if (operatorText === "!=") return RtOp.CmpEqLoose;
if (operatorText === "in") return RtOp.In;
if (operatorText === "instanceof") return RtOp.Instanceof;
// **`**` 落在这里是故意的** ✓：它**没有**走通用算子表 ✗——`pow` 的舍入
// **没有标准定死** ✗（IEEE 754 没规定正确舍入 ✓，各目标的 `pow` 可能差最后一位 ✓），
// 所以它属于**语言建库**那一层（与 `StringConcat` 同一条路 ✓），单独立一轮 ✓。
// 在此之前**响亮地抛** ✓（不许静默给一个近似值 ✗）。
throw new Error("unimplemented: binary operator " + operatorText);
```

# method CompoundBaseOf:(operatorText:string)=>string

**复合赋值的「底」是哪个运算符**（第 147 轮）：`+=` 给 `"+"` ✓、`>>>=` 给 `">>>"` ✓、
不是复合赋值给**空串** ✓。

**为什么要一个函数、而不是 `operatorText.slice(0, 1)`** ✗：那个写法对 `+=` / `&=` 恰好对 ✓，
但对 `<<=` / `>>=` / `>>>=` **当场错** ✗（切出来是 `"<"` / `">"` ✓，
而它们不是二元运算符 ✓）——症状是「两个字符的运算符被当成一个字符的」✓，
报出来还停在 `unimplemented: binary operator <` ✓（离现场很远 ✗）。

**不在这张表里的照旧不走复合那条路** ✓：`&&=` / `||=` / `??=` 是**逻辑赋值**
（右边可能不求值 ✓），语义与这一族不同 ✗，所以它们落进通用二元那条路**响亮地抛** ✓。

```ts
if (operatorText === "+=") return "+";
if (operatorText === "-=") return "-";
if (operatorText === "*=") return "*";
if (operatorText === "/=") return "/";
if (operatorText === "%=") return "%";
if (operatorText === "&=") return "&";
if (operatorText === "|=") return "|";
if (operatorText === "^=") return "^";
if (operatorText === "<<=") return "<<";
if (operatorText === ">>=") return ">>";
if (operatorText === ">>>=") return ">>>";
// **`**=` 也在表里**（第 149 轮）✓：它的「算」那一步走**内建**那条 ✓
//（见 `CombineValues` ✓），但**底运算符**照样是这里给的 ✓——两件事分开写 ✓。
if (operatorText === "**=") return "**";
return "";
```

# method IsNegated:(operatorText:string)=>bool

`!==` / `!=` 是「取反版本」：先算相等，再取反。

```ts
return operatorText === "!==" || operatorText === "!=";
```

# method HasSuperCall:(body:AstNode)=>bool

**这个函数体里有没有 `super(...)` 调用**（只找**本层**，不进内层函数）。

**为什么要查**：父类带构造函数时，派生类的构造函数里**必须**有 `super(...)`。
不查的话，「忘了写」会变成**静默少跑父类的初始化**——那种错要到很久以后才显形。

**两个节点要分开看**（第 128 轮）：调用点给的可能是**构造函数节点**（`Constructor`），
也可能是它的**体**（`Block`）✓。而 `IsFunctionNode` 现在把 `Constructor` 也算内层 ✓
（捕获分析要它 ✓）——直接问它，构造函数会被误判成「已经进了内层」✗，
于是派生类被判成「没调 `super(...)`」✗（`05-classes.ts` 当场红 ✓）。
所以 `Constructor` 要**先落回它的体**再往下走 ✓。

```ts
if (NodeKind(body) === "CallExpression") {
  const callee = OptionalChild(body, "expression");
  if (callee !== null && NodeKind(callee) === "SuperKeyword") return true;
}
// **`Constructor` 先落回它的体**（第 128 轮，理由见上）。
if (NodeKind(body) === "Constructor") {
  return HasSuperCall(Child(body, "body"));
}
if (IsFunctionNode(body)) return false;
let found = false;
WalkChildren(body, (child) => {
  if (HasSuperCall(child)) found = true;
});
return found;
```

# class FunctionEntry

**一个具名函数在函数表里的下标**。

有了它，宿主才能「按名字调一个函数」——P0 的判据就是这么调 `sumTo(5)` 的。

## field Name:string = ""

函数名。

## field Index:int = 0

在 `Program.Functions` 里的下标。

## constructor:(name:string, index:int)=>void

记一条。

```ts
this.Name = name;
this.Index = index;
```

# class LoweredModule

**降级一份模块的产物**：程序本体 + 「名字 → 函数下标」的表。

## field Program:Program = new Program()

产物程序。

## field Entries:Array<FunctionEntry> = []

具名函数的下标表。

## constructor:(program:Program)=>void

接住产物程序；函数表随后由 `AddEntry` 填。

```ts
this.Program = program;
```

## method AddEntry:(name:string, index:int)=>void

登记一个具名函数。

```ts
this.Entries.push(new FunctionEntry(name, index));
```

## method EntryOf:(name:string)=>int

按名字找**函数表下标**；找不到给 `-1`。

**它是给 `Vm.Start` 用的**（按函数表下标开帧）——那种帧**没有环境**，
所以它只对「不引用模块作用域」的函数成立。要调一般的导出，走 `ExportOf` + `CallExport`。

```ts
for (let i = 0; i < this.Entries.length; i++) {
  if (this.Entries[i].Name === name) return this.Entries[i].Index;
}
return -1;
```

## method ExportOf:(name:string)=>int

按名字找**导出数组下标**（0 起）；找不到给 `-1`。

**它是给 `Host.CallExport` 用的**：导出表按登记顺序排，所以它就是位置。
两个下标差一位（函数表下标 0 是入口函数），**混用就会调到别的函数**——
判据当场报的是「`a() + a()` 期望 3，实际 11」（那正是下一条导出的答案）。

```ts
for (let i = 0; i < this.Entries.length; i++) {
  if (this.Entries[i].Name === name) return i;
}
return -1;
```

# class LocalScope

**一层词法作用域里的名字 → 槽**。

这一轮的名字全住在**帧的槽**里（没有环境记录），所以它只回答两件事：
这个名字在第几格、这个名字是不是这一层声明的。

## field Names:Array<string> = []

这一层声明的名字（与 `Slots` 一一对应）。

## field Slots:Array<int> = []

每个名字占的槽号。

## field FirstSlot:int = 0

这一层从哪一格开始——**退作用域时把它之后的槽都还回去**（槽是所有层共用的一条水道）。

## constructor:(firstSlot:int)=>void

记下这一层的水位起点。

```ts
this.FirstSlot = firstSlot;
```

## method Declare:(name:string, slot:int)=>void

把一对名字 / 槽记进来（同名重复在**同一个作用域里**是上游的语法错误，这里不管）。

```ts
this.Names.push(name);
this.Slots.push(slot);
```

## method Resolve:(name:string)=>int

这一层有没有这个名字；`-1` 表示没有。

```ts
for (let i = this.Names.length - 1; i >= 0; i--) {
  if (this.Names[i] === name) return this.Slots[i];
}
return -1;
```

# class PendingFunction

**排队等着降级的一个函数体**。

**为什么要排队**：指令流必须**连续**——一个函数的指令之间不能夹着另一个函数的指令
（pc 的归属是按 `FunctionInfo.Entry` 划分的）。所以遇到函数声明时只**登记**它、
发出造闭包的那几条，函数体一律**排在当前函数之后**再降级。
这也是 `Functions` 天然按 `Entry` 升序的原因。

## field Name:string = ""

函数名（进 `LoweredModule.Entries`）。

## field ParamCount:int = 0

参数个数（等于 `Params.length`）。

## field Params:Array<string> = []

参数名（按位置对应前几格）。

## field DefaultAt:Array<int> = []

**有默认值的参数是第几个**（与 `Defaults` 一一对应，**按下标升序**）。

**为什么存位置、不存槽号**：槽号就是参数下标（参数占前几格），但这里要紧的是
**求值顺序跟着参数顺序**——那是语义（`function f(a = 1, b = a + 1)` 里 `b` 看得见 `a`）。
存成一个「有默认值的参数集合」就把顺序丢了。

## field Defaults:Array<AstNode> = []

**参数默认值的初始化式**（没有默认值的参数不进这里）。

**为什么登记时就要带走**：默认值是**函数体开场**的一段代码（`LowerParamDefault`），
而函数体是**外层降级完之后**才降级的——那时候这一层的作用域上下文早没了。
所以和 `Envs` 同一条理由：**登记那一刻把要用的东西抄下来**。

## field Body:AstNode | null = null

函数体。

## field Patch:int = 0

**要回填的那个常量下标**：造闭包时 `code` 参数先写 0，函数体降级时才把入口填进去
（不然就是「先有鸡还是先有蛋」）。

## field Slot:int = 0

**这个闭包住在降级它的那一层的哪一格**——入口函数结尾要把它们装进导出数组
（宿主拿到的就是那个数组）。

## field Entry:int = 0

函数体开始的那个 pc。

## field Envs:EnvChain = new EnvChain()

**登记那一刻可见的环境链**（抄一份带走）。

内层函数体是在外层降级**完之后**才降级的，那时候外层的链早退栈了——
所以链必须在**登记时**抄下来，而不是等到降级时再去问（`scope.xl.md` 的 `Clone`）。

## field IsExpressionBody:bool = false

体是**一个表达式**而不是块——箭头函数 `a => a + 1` 就是这种。

降级时它是「把表达式的值返回出去」，而不是「跑完这一段再给 `undefined`」。
两种体**共用同一个排队结构**，因为除此以外它们一模一样。

## field IsArrow:bool = false

**这个函数体是箭头函数**（`NodeKind(node) === "ArrowFunction"`）。

**它决定 `this` 往哪找**（第 119 轮实测抓到的缺口）：箭头**没有自己的 `this`**——
它取的是「造它那一刻外层的接收者」，所以它的 `this` 必须走**环境**那条路
（`EnterFunctionBody` 里那格隐藏捕获 `scope.Declare("this", …)`）。

**其余每一种函数体**（函数声明 / 函数表达式 / 方法 / 构造函数）都**有自己的 `this`**，
必须发 `load_this`，**不许**在环境链上找：外层要是恰好也有一个 `this` 格
（**模块里只要有箭头就会有**），找过去就是**读错接收者**。

实测症状：`this.v = v` 报 `assigning a property on a primitive receiver`——
`this` 读成了模块那一格（宿主给入口的接收者，通常是 `undefined`）。
**它只在「模块里恰好有箭头」时才出现**，所以最初几条判据全绿也发现不了。

## field IsGenerator:bool = false

这是一个**生成器函数**（`function*` / `function* () {}` / `{ *m() {} }`）。

**它只影响一件大事**：调用它**不跑体**，只造一个生成器对象（引擎的 `DoCallValue`
看到 `FunctionInfo.IsGenerator` 就这么做）。体是**被 `next` 推着走**的——
所以体内每个 `yield` 都要落成 `suspend` / `resume` 一对（见 `LowerYield`）。

## field SlotCount:int = 0

这一帧要几格（降级完才知道）。

## field IsAsync:bool = false

这是一个 **`async` 函数**。

**它今天只影响一件事**：这一层里的 `await` 合法（`await` 写在普通函数里是**语法错误**，
降级期就该报出来）。**它不影响调用方式**——这一点与生成器**恰好相反**，
差别写在文首那张表里（那是这一轮最要紧的一条已知语义差）。

## field HasRest:bool = false

**最后一个形参是不是剩余参数**（第 133 轮）——原样递给函数表那一位 ✓
（`FunctionInfo.HasRest` ✓，理由见 `ir.xl.md` 那一段：**开帧的人**才知道「这次传了几个」✓）。

## field PatternAt:Array<int> = []

**哪几个形参是解构模式**（第 134 轮）——下标升序 ✓。

## field Patterns:Array<AstNode> = []

与 `PatternAt` 一一对应的那些模式 ✓。

## field FieldDefaults:Array<AstNode> = []

**这个构造函数开局要跑的实例字段初始化式**（第 128 轮补；只有构造函数非空）。

**为什么挂在函数体上、而不是「就在类那一处发指令」**：字段初始化式跑在
**构造函数自己的帧**里（它要写 `this` ✓），而类那一处的帧是**外层**的 ✗——
在那里发 `set_prop` 会往**模块的 this** 上写（那多半是 `undefined`，报的是
「assigning a property on a primitive receiver」，离现场很远 ✓）。

**顺序**：JS 的规矩是「字段初始化在**构造函数体之前**、参数默认值之后」✓；
派生类里它跟在 **`super(...)` 之后**（`this` 在 `super()` 返回前不存在 ✓）——
后者靠 `FieldInitDeferred` 那一位分开 ✓。

## field FieldInitRan:bool = false

这一帧的字段初始化**已经发过了**（第 128 轮）。发两遍就是**跑两遍初始化式**（副作用两遍），
所以派生类那条「跟在 `super(...)` 之后」的路要用它保证只有一次。

## field FieldInitDeferred:bool = false

**字段初始化要让位给 `super(...)`**（派生类的构造函数 = 真）。

**为什么不能只看「有没有基类」**：`super(...)` 在体里可能**不在第一条语句**
（`constructor(x) { this.check(x); super(x); }`）——按「体之前」发指令就会在
`this` 还不存在时写它 ✗。所以派生类一律**推迟到 `super(...)` 那条语句之后**发 ✓。

## field SuperName:string = ""

**这个函数体里 `super(...)` 该去哪找父类构造函数**（派生类的构造函数才有；空串 = 没有）。

**为什么带的是名字而不是一格槽**：`super(...)` 在**子类的帧**里执行，
而父类构造函数是**外层作用域里的一个名字**——跨帧只能用**环境**这条通道，
所以这里存名字，降级 `super` 时照常 `ResolveAccess`（链上找、深度算，一行都不用新写）。

## constructor:(name:string, body:AstNode, params:Array<string>, patch:int, defaultAt:Array<int>, defaults:Array<AstNode>, patternAt:Array<int>, patterns:Array<AstNode>)=>void

登记一个待降级的函数体。

**`patternAt` / `patterns` 是两份平行数组**（第 134 轮）：第几个形参是**解构模式**、
以及那个模式本身 ✓——形状与 `defaultAt` / `defaults` 一字不差 ✓（理由也一样：
「第几个」与「那棵树」是两件事 ✓）。

```ts
this.Name = name;
this.Body = body;
this.Params = params;
this.ParamCount = params.length;
this.Patch = patch;
this.DefaultAt = defaultAt;
this.Defaults = defaults;
this.PatternAt = patternAt;
this.Patterns = patterns;
```

# class BlockLabelContext

**「标签 + 一个块」那一层**（第 234 轮 ✓）——`outer: { … break outer; … }` 要它 ✓。

**为什么不能拿 `LoopContext` 顶替** ✗：那个类带着 `Continues` / `IsLoop` / 环境那几格 ✓，
它们全都**只对循环有意义** ✓（`continue` 的目标必须是循环 ✓、每轮新建绑定也是 ✓）。
借它来装一个块，就是让后面每一个读 `Loops` 的地方都要多问一句「这一层是不是假的」✓
（**那种「多问一句」迟早会漏一处** ✗）。

**它只有两格** ✓：名字（给 `break` 认出「是不是我这一层」✓）与那一摞还没回填的跳转 ✓。

## constructor:(label:string)=>void

建一层「标签 + 块」的上下文 ✓（**跳转那一摞从空开始** ✓——见 `Breaks` 那一格 ✓）。

```ts
this.Label = label;
```

## field Label:string = ""

带标签的块那一层叫什么 ✓（`break` 那一头按名字找 ✓）。

## field Breaks:Array<int> = []

**块里每一条 `break 这个标签` 发的那条 `Jump` 的指令下标** ✓——
块跑完之后由 `LabeledStatement` **一次性回填到块之后** ✓。

**为什么不先占一条 `Jump` 当目标** ✗：那少了一条 ✓——块**正常走到尾**时会紧挨着
`break` 那条跳 ✓，于是**正常路径也跳走** ✓（实测：`log` 少了 `break` 前那一句的效果 ✓，
**静默错值** ✓）。记一摞下标就没有这个形状 ✓。**与 `LeaveLoop` 的 `Breaks` 同一个写法** ✓。

# class LoopContext

**一层可以被 `break` / `continue` 跳出去的上下文**。
**`switch` 也算一层**，但它只收 `break`：`continue` 必须穿过它去找**最近的循环**——
少了 `IsLoop` 这个位，`switch` 里的 `continue` 会跳到 `switch` 的出口（**静默跳错**）。

**跳转回填**：`break` / `continue` 都写在前面、落点在后头，所以先发一条目标为 0 的跳转、
把它的下标记在这里，出去的时候统一回填。

## field IsLoop:bool = true

真 = 循环（收 `continue`）；假 = `switch`（只收 `break`）。

## field ContinueTarget:int = 0

`continue` 跳到哪：`while` 是条件、**`for` 是更新那一段**（JS 语义：`continue` 会跑更新）、
`for..of` 是下一次 `iter_next`。

## field Label:string = ""

这一层的**标签**（`outer: for (…)`）；空串表示没有标签。

**为什么是字段而不是构造器参数**：它由 `LabeledStatement` 在**外层**写好、
`EnterLoop` 再吃进去，而给构造器加一个参数要动**六个调用点**——
改签名换来的只是「少一个可变字段」，不划算（`ContinueTarget` 也是可变字段，同一条账）。

## field Breaks:Array<int> = []

这一层里 `break` 那些跳转的下标（出去时统一回填）。

## field Continues:Array<int> = []

这一层里 `continue` 那些跳转的下标（回填到 `ContinueTarget`）。

## constructor:(isLoop:bool, continueTarget:int)=>void

建一层上下文。

```ts
this.IsLoop = isLoop;
this.ContinueTarget = continueTarget;
```

## method AddBreak:(index:int)=>void

记一条待回填的 `break`。

```ts
this.Breaks.push(index);
```

## method AddContinue:(index:int)=>void

记一条待回填的 `continue`。

```ts
this.Continues.push(index);
```

# class SwitchClause

**`switch` 里的一支**：它的测试跳转与它的体从哪开始。

**为什么要把「测试」和「体」分两趟**：测试全排在前面（JS 语义：按顺序比较，
**第一个命中的就跳进它的体**），而体按书写顺序**落穿**；
`default` 又可能写在中间，所以「全不中」要跳到哪，得等体发完才知道。

## field Tests:Array<int> = []

这一支的测试跳转（命中就跳进 `BodyPc`）。

## field BodyPc:int = 0

这一支的体从哪开始。

## field IsDefault:bool = false

这一支是不是 `default`（它没有测试）。

## constructor:(isDefault:bool)=>void

建一支的记录。

```ts
this.IsDefault = isDefault;
```

# class Lowering

**降级器本体**：一份模块 → 一个 `LoweredModule`。

## field Module:LoweredModule = new LoweredModule(new Program())

产物（`LowerModule` 会把它换成一个新的）。

## method SuperClassNameOf:(node:AstNode)=>string

这个类声明 `extends` 的是哪个名字；没有（或不是简单名）给空串 ✓。

**抽出来是因为它有两个用处** ✓（第 141 轮抽出，第 203 轮起只剩一处 ✓）：
`LowerClass` 自己要用它认 `super` 的父类 ✓（原来 `FindParentHasConstructor` 递归时也要用它 ✓——
第 203 轮把那个「父类有没有构造函数」的代理判据撤掉了 ✓，见 `LowerClass` 那一支 ✓）。

```ts
const clauses = ListOf(node, "heritageClauses");
for (let i = 0; i < clauses.length; i++) {
  const types = ListOf(clauses[i], "types");
  for (let j = 0; j < types.length; j++) {
    const base = Child(types[j], "expression");
    if (base === null) continue;
    if (NodeKind(base) !== "Identifier") return "";
    return TextOf(base);
  }
}
return "";
```

## field Scope:Array<LocalScope> = []

作用域栈，栈顶是当前这一层。

## field NextFree:int = 0

**下一条空槽**。槽的分配是一条水道：进作用域时记住水位，退出去时**把水位退回去**
——于是兄弟块可以复用同一批槽（这正是「寄存器 + 槽」这种操作数模型想要的效果）。

## field Peak:int = 0

当前函数用到过的最高水位——**它就是这一帧的 `SlotCount`**（帧开多大由它定）。

## field Pending:Array<PendingFunction> = []

排队的函数体（见 `PendingFunction`）。

## field EntrySlots:int = 0

**入口函数要几格**。它也要进函数表（下标 0）——`Start` 是按 `FunctionInfo` 开帧的，
入口自己不在表里就开不出帧来。

## field Env:EnvChain = new EnvChain()

**当前可见的环境链**（链尾是当前帧的环境）。内层函数体的链是登记时抄下来的那一份
（见 `scope.xl.md` 的 `EnvChain` 与 `PendingFunction`）。

## field EnvSlot:int = -1

当前帧的环境值在哪一格；`-1` 表示这一层没有环境（那也就不必往下传）。

## field DeclaredNames:Array<string> = []

**这一层声明出来的全部名字**（`EnterFunctionBody` 算环境时顺手留下）。

它只有一个用处，但很值：`ResolveAccess` 找不到名字时能分清两种错——
「**用到声明之前**（TDZ / 提升没接上）」与「**根本没这个名字**（写错了）」。
分不清的话，两种错报同一句话，查的人得从头看一遍。

## field Hoisted:Array<AstNode> = []

**已经提升过的那些声明节点**（同一份 AST 里对象是唯一的，所以按对象认就够）。

语句流走到它们时**跳过**——不然会造第二个闭包、开第二个槽，而且提升就白做了。

## field VarNames:Array<string> = []

**这一层提升上来的 `var` 名字**（函数作用域）。

## field VarSlots:Array<int> = []

每个 `var` 名字占的槽（在**函数最外层**那个作用域里声明，所以整个函数都看得见）。

## field FinallyBlocks:Array<AstNode> = []

**当前在册的 `finally` 块**（栈，**最外层在前** ✓，第 201 轮 ✓）。

**它为什么是一摞块、不是一个计数** ✗：`return` / `break` / `continue` 写在带 `finally` 的
`try` 里时，JS 的语义是「**先把这些 `finally` 从里到外跑完，再走**」✓——
所以这一层手里得**有那些块**才发得出那段代码 ✓（原来只有一个 `FinallyDepth` 计数 ✓，
于是只能报错 ✗：「`return` 会跳过 `finally`」✓）。

**它只收「还没跑过的」那些** ✓：正在被发的那个 `finally` 自己**不在册** ✗——
JS 里 `finally` 自己 `return` 会**接管**这次完成 ✓，不会把同一层再跑一遍 ✗
（`try { return 1 } finally { return 2 }` 给 `2` ✓）。见 `EmitPendingFinalies` ✓。

**为什么不是「跳进一个共享的收尾段」** ✗：本仓已经选了「**`finally` 的代码发多遍**」那条路 ✓
（见 `LowerTry` 的取舍 ✓）——所以「返回前跑一遍」也只是**再发一遍** ✓，
与造一条新指令或子过程跳转相比，`finally` 通常很短 ✓。

## field Loops:Array<LoopContext> = []

可以被 `break` / `continue` 跳出去的上下文栈（栈顶是最近的那一层）。

## field BlockLabels:Array<BlockLabelContext> = []

**「标签 + 一个块」那一层**（第 234 轮 ✓）——**一摞** ✓，栈顶是最近的 ✓。

**为什么必须是摞而不是一格** ✗：**嵌套的标签块**是普通写法 ✓——
实测 `two: { … inner: { … break two; … } … }` ✓：`inner` 那一层一进 ✓，
`two` 那一格就被顶掉了 ✓，`break two` 于是报 `unknown label \`two\`` ✓
（**而它是合法的 JS** ✓）。这与 `Loops` 那边「从里往外扫」是同一个形状 ✓。

**为什么它们不进 `Loops`** ✗：那一摞还管着两件事 ✓——`continue` 要找到**一个循环** ✓
（JS 的规矩：块上的 `continue` 非法 ✓）、以及「循环体每轮新建绑定」✓。
把块混进去会让块里的 `continue` 找到一层不是循环的东西 ✓（**静默错值** ✗）。

## field FunctionNameHint:string = ""

**「下一个函数值该叫什么」**（第 238 轮 ✓）——空串表示「没有提示」✓。

**为什么需要它** ✗：`const arrow = () => 2` 里那个箭头**没有自己的名字** ✓
（箭头不是具名函数 ✓，树上一个名字都没有 ✓），而 Node 给 `[Function: arrow]` ✓——
名字**来自绑定的那一刻** ✓。同一条也管**匿名函数表达式** ✓
（`const f = function () {}` ✓——Node 给 `[Function: f]` ✓）。
**`HeapClosure.Name` 一直没人填** ✗ ⇒ 从前**每一个脚本函数**都是
`[Function (anonymous)]` ✓（实测 ✓），而 Node 输出里到处是这个名字 ✓。

**它由谁写、由谁读、什么时候清** ✓：
- **写**：`LowerVariable` 的**简单名**那一支 ✓（`const <名> = <初始化式>` ✓）——
  就在降初始化式**之前**置上 ✓；
- **读**：`LowerFunctionValue` 一处 ✓（**唯一**读它的地方 ✓）——
  提示不是空串就**优先用它** ✓（压过 `"<arrow>"` / `"<function>"` 那两个占位符 ✓）；
- **清**：同一个调用里**用完就还原** ✓（存一份、置一份、再存回来 ✓）——
  不清的话「下一个函数值」会白继承上一个名字 ✗
  （`const a = () => 1; const b = () => 2;` 两个都叫 `a` ✓，而那是**静默错值** ✗）。

**已知差** ✗：**对象字面量的方法名**（`{ run() {} }` ✓）与**类的方法名** ✓
这一轮**不带提示** ✓——它们各自那一处的名字来源不同 ✓（挂在属性上 ✓），
缺口写在台账里 ✓。

## field PendingLabel:string = ""
**下一个 `EnterLoop` 要吃进去的标签**（`outer: for (…)` 里那个 `outer`）。

**为什么用「待用字段」而不是给 `EnterLoop` 加参数**：标签写在循环**外面**
（`LabeledStatement` 包着循环），而 `EnterLoop` 是**循环自己**调的——
中间隔着好几层语句分派。待用字段让「谁写标签」与「谁消费标签」解耦，
而**消费方吃完就清**（这一点是关键：不清的话下一个没有标签的循环会**继承**上一个标签，
于是 `break outer` 会跳到毫不相干的循环去）。

## field Globals:Array<string> = []

**宿主给这一份模块的全局名**（`Math` / `console` 那些），由调用方在降级**之前**声明。

**它们是「模块作用域里的名字」，不是原型方法**——所以不能靠原型链找到，
只能像普通变量一样被声明、被捕获。而**值从哪来**：宿主把「环境对象」当
**入口函数的第 0 个参数**交给模块，`LowerModule` 在入口的开头逐个取出来。

**为什么把名字交进来、而不是写死在降级器里**：`Math` / `console` / `JSON` 是
**这门语言**的建库层决定的（`builtins/globals.xl.md` 给出那张名单）。
降级器只认识「有一批全局名」，不认识它们是谁——**换一门语言，名单换掉，降级器不动**。

## field ExtraDeclared:Array<string> = []

`EnterFunctionBody` 算「本层声明了哪些名字」时要**额外算进来**的名字（全局名走这里）。

**它只对入口函数有意义**，用完即清——否则内层函数会以为自己的层里也声明了 `Math`。

## field InGenerator:bool = false

**当前正在降级的这个函数体是不是生成器**。

`yield` 只允许出现在**它自己那一层**：写在内层普通函数里是**语法错误**
（JS 就是这么定的）。有了这个字段，降级时就能当场报出来，而不是让它跑到运行期
变成一条把**普通帧**冻住的 `suspend`。

**为什么「当前」这一个字段就够**：函数体是**从队列里一个一个降级的**
（`PendingFunction` 那一段），所以同一时刻只有一层在降级——进去设、出来恢复即可。

## field InArrow:bool = false

**当前正在降级的这个函数体是不是箭头函数**（与 `InGenerator` / `InAsync` 同一套用法：
进一层设、出一层恢复）。

`ThisKeyword` 靠它分流：真 = 在环境链上找那一格隐藏捕获；假 = 直接发 `load_this`。
**这一条判据不能省**：省略之后，普通函数（构造函数 / 方法 / 函数表达式）会去**外层**的
`this` 格里读接收者——模块里有箭头时那一格存在，于是读到的是模块的接收者
（判据报的是 `assigning a property on a primitive receiver`，离现场很远）。

## field InAsync:bool = false

**当前正在降级的这个函数体是不是 `async`**（与 `InGenerator` 同一套用法）。

它管的是 `await` 的**合法性**：`await` 写在普通函数里是语法错误，
**降级期就要报**——放到运行期去，它会把一个普通帧挂到承诺上，
而那个帧的调用者还在下面等着，于是**整条调用链静默停住**。

## field InSuperName:string = ""

**当前正在降级的这个函数体里，`super(...)` 该去找哪个名字**（空串 = 没有）。

与 `InGenerator` / `InAsync` 同一套用法（进一层设、出一层恢复）。
**它存的是名字**：父类构造函数在外层作用域里，跨帧只走**环境**这条通道——
降级 `super` 时照常 `ResolveAccess`（链上找、深度算，一行新代码都不欠）。

## field DeferredItem:PendingFunction | null = null

**那个「字段初始化还欠着」的构造函数**（第 128 轮）——派生类才有，`null` 表示没有。

**为什么是个字段而不是「每条语句去问当前函数」**：`LowerFunctionBody` 是**一层一层**
降级的 ✓，而「这一层就是那个构造函数的体」这件事**只对它自己那个块成立** ✗——
内层块（`if` 体、循环体）里的语句也会走 `LowerStatementsOf` ✓，
拿「当前函数」当判据会在内层块里就把字段初始化发出来 ✗（`constructor() { if (x) { super(1) } }`）。

所以进入那个块之前挂上、出来就摘掉（`LowerFunctionBody` 那一段写着）✓：
它按**块**限定，不按函数限定 ✓。

## field CapabilityOf:CapabilityLookup | null = null

**宿主能力查号回调**（见 `# type CapabilityLookup`）；没装就是 `null`。

装了之后，`LowerCall` 遇到一个**模块里没声明过**的名字时会先问它：
答得出号，这条调用就落成 `host_call(号, 参数…)`；答不出，才按「未知名字」报错。
**这一条就是 `.d.ts` 绑定的落点**：声明里的名字不必出现在源码里，
它们由宿主提供、由号来指认。

## method DeclareCapabilities:(lookup:CapabilityLookup)=>void

装上查号回调（由驱动把它和 `bindings.xl.md` 接起来）。

```ts
this.CapabilityOf = lookup;
```

## method DeclareGlobals:(names:Array<string>)=>void

声明这一份模块能看见的全局名。

```ts
this.Globals = [];
for (let i = 0; i < names.length; i++) {
  this.Globals.push(names[i]);
}
```

## constructor:()=>void

一开始是一份空产物、空作用域栈、空队列。

```ts
this.Module = new LoweredModule(new Program());
this.Scope = [];
this.Pending = [];
```

## method Program:()=>Program

产物程序。

```ts
return this.Module.Program;
```

## method Emit:(op:int, a:int, b:int, c:int, d:int)=>void

发一条指令。**四个操作数都显式给**（`-1` 表示不用）——「不给」与「给 0」是两件不同的事。

```ts
this.Program().Emit(new Instruction(op, a, b, c, d));
```

## method EmitRt:(id:int, dst:int, base:int, argc:int)=>void

发一条 `rt_call`。

```ts
this.Emit(Op.RtCall, id, dst, base, argc);
```

## method Here:()=>int

**下一条指令的 pc**——跳转目标要先问它。

```ts
return this.Program().Instrs.length;
```

## method PatchTarget:(instrIndex:int, target:int)=>void

回填一条跳转的目标（`Jump` / `JumpIfFalse` 的目标在 **B** 操作数上）。

```ts
this.Program().Instrs[instrIndex].B = target;
```

## method Reserve:(count:int)=>int

要 `count` 条连续的空槽，返回第一条的编号。

```ts
const first = this.NextFree;
this.NextFree = this.NextFree + count;
if (this.NextFree > this.Peak) this.Peak = this.NextFree;
return first;
```

## method Release:(level:int)=>void

**退水位**：`NextFree` 回到 `level`（这一格及以上都可以再分配）。

**只有一种安全的写法：退到你确定是「最后一个死格之后」的地方。不确定就别退。**

这条规矩是被咬了三次换来的（每次都表现为「值被别的东西换掉」，报错离现场很远）：
`BindName` 之后退（第 24 轮）、`RtCall` 把结果格退掉（第 38 轮）、
**窗口是先预留的、闭包格在窗口之上，`Release(window)` 于是把闭包一起退了**（第 40 轮）。
**槽是从低到高分配的**，所以「先预留的东西」永远在下面——退到它那儿，
等于把**后来预留的活格**全部交出去。

```ts
this.NextFree = level;
```

## method BeginFunction:(paramCount:int)=>void

开始降级一个函数体：参数占前几格，作用域栈清空，环境链**由调用方先摆好**
（排队函数用它自己那份抄下来的链，见 `LowerFunctionBody`）。

```ts
this.NextFree = paramCount;
this.Peak = paramCount;
this.Scope = [];
this.EnvSlot = -1;
this.Hoisted = [];
this.VarNames = [];
this.VarSlots = [];
this.DeclaredNames = [];
this.FinallyBlocks = [];
this.Loops = [];
```

## method EnterFunctionBody:(body:AstNode, params:Array<string>, extras:Array<AstNode>)=>void

**每个函数体的开场**：算出这一层要捕获哪些名字，需要就开一个环境。

**为什么必须在这里一次算完**：环境的格数在 `EnvNew` 那一刻就定了（引擎不会扩容），
而「哪些名字要进环境」要**看整个函数体**才知道（内层函数引用到谁）。
所以在**发第一条语句之前**先走一遍树。

**含内层函数就开环境**（哪怕一个变量也不捕获）：环境值是**靠槽往下传的**
（闭包的环境参数是一个 `Value`），中间那一层手上没有这个值，更内层就拿不到祖父的环境
（`scope.xl.md` 里那条口径）。

**`extras` 是「不在 `body` 里、却属于这一层」的节点**（第 119 轮起：参数的默认值初始化式）。
它们是**函数开场就要跑的一段代码**，所以要和外层捕获、`this` 格、内层函数三件事一起算：
- 默认值里引用外层的局部名 → 那是**内层函数里的引用**（`CollectInsideFunctions` 会走进
  嵌套函数的 `parameters`），所以外层那一格**已经会**被捕获；
- 默认值里含箭头函数 → 这一层**必须开环境**、并且**要有一个 `this` 格**
  （箭头没有自己的 `this`）。少扫这一处，症状是 `new_closure needs an environment or undefined`
  或者箭头里读到的是**外层**的接收者。

```ts
const declared: string[] = [];
for (let i = 0; i < params.length; i++) declared.push(params[i]);
CollectDeclaredNames(body, declared);
// **默认值里的声明也算进这一层**（保守）：初始化式里不会有函数声明或 `var`，
// 但「多收一个」只会多开一格，「少收一个」是把本层变量当成未知名字。
for (let e = 0; e < extras.length; e++) CollectDeclaredNames(extras[e], declared);
for (let i = 0; i < this.ExtraDeclared.length; i++) declared.push(this.ExtraDeclared[i]);
this.ExtraDeclared = [];
// **全局名在这一层也看得见**（第 128 轮修）。
//
// **为什么必须在这里补**：全局名（`Math` / `console` / `JSON`…）是**模块作用域的名字** ✓，
// 而它们是**绑定出来的局部槽** ✓——所以 `ResolveAccess` 只在
// 「这一层的 `DeclaredNames`」或「环境链」上找得到它们 ✗。两个地方都得有：
//   - **入口那一层**：`ExtraDeclared` 撑着（`LowerModule` 设的）✓；
//   - **内层函数**：以前**两处都没有** ✗——于是 `class A { constructor() { console.log(1) } }`
//     在**降级期**就报 `name is not a local or a capture: console` ✓
//     （内层函数用 `Math` 也是同一个形状 ✓，只是此前每一条判据都恰好只在**方法**里用过它——
//     方法有内层函数时环境是自己那份，所以侥幸没露 ✗）。
//
// **为什么不是「在 `ExtraDeclared` 里一直留着」**：那个字段的语义是「**入口这一层**额外的名字」✗，
// 留着会让内层函数以为自己也**声明**了 `Math`（`ResolveAccess` 的那句 TDZ 报错就再也报不出来了 ✗）。
// 所以走**显式传参**这条：`Globals` 是「这份模块看得见的名字」，与「这一层声明了什么」是两件事 ✓。
//
// **必须在「算捕获」之前补进来**（第 128 轮第二个实测教训）：`captured` 是拿 `declared`
// 去 `referenced` 里筛出来的 ✓——补晚了，`Math` 就进不了 `captured` ✗，
// 于是这一层**不开环境** ✗（`captured.length === 0 && !hasNested && !needsThis` 那条早退 ✓），
// 内层函数也就没有这一层可捕获 ✗。**现场就是这一条**：`class A { constructor() { Math… } }`
// 一路报到 `name is not a local or a capture: Math` ✓。
const globals = this.Globals;
for (let i = 0; i < globals.length; i++) declared.push(globals[i]);
this.DeclaredNames = declared;
const functions: string[] = [];
CollectFunctionNames(body, functions);
const captured = CapturedNames(body, declared);
let needsThis = HasArrowFunction(body);
let hasNested = HasNestedFunction(body, 0);
for (let e = 0; e < extras.length; e++) {
  const more = CapturedNames(extras[e], declared);
  for (let i = 0; i < more.length; i++) {
    if (!Contains(captured, more[i])) captured.push(more[i]);
  }
  if (HasArrowFunction(extras[e])) needsThis = true;
  if (HasNestedFunction(extras[e], 0)) hasNested = true;
}
if (captured.length === 0 && !hasNested && !needsThis) return;
const cellCount = captured.length + (needsThis ? 1 : 0);
const slot = this.Reserve(1);
this.Emit(Op.EnvNew, slot, cellCount, -1, -1);
const scope = new EnvScope(slot);
for (let i = 0; i < captured.length; i++) scope.Declare(captured[i], i);
if (needsThis) {
  // **箭头要的是这一格**：它没有自己的 `this`，取的是造它那一刻外层的接收者。
  // 把 `this` 当成**一个隐藏的捕获绑定**——于是箭头体里的 `this` 与普通捕获走同一条路
  // （链上找、深度算），深度那套东西一行都不用改。
  scope.Declare("this", captured.length);
  const scratch = this.Reserve(1);
  this.Emit(Op.LoadThis, scratch, -1, -1, -1);
  this.Emit(Op.EnvSet, scratch, 0, captured.length, -1);
  this.Release(scratch);
}
this.Env.Push(scope);
this.EnvSlot = slot;
```

## method PushScope:()=>void

进一层作用域。

```ts
this.Scope.push(new LocalScope(this.NextFree));
```

## method PopScope:()=>void

退一层作用域：**把水位退回这一层的起点**。

```ts
const scope = this.Scope[this.Scope.length - 1];
this.Scope.pop();
this.Release(scope.FirstSlot);
```

## method CellOf:(name:string)=>int

这个名字是不是**当前这一层环境**里的一格；`-1` 表示不是。

**只看链尾**（当前函数的环境）：外层环境里的同名变量与本层的局部变量是两回事，
把两者混起来会把「本层的新变量」错写进外层那一格。

```ts
const scope = this.Env.Last();
if (scope === null) return -1;
return scope.Resolve(name);
```

## method DeclareLocal:(name:string, slot:int)=>void

在自己这一层声明一个名字。

**被捕获的名字不在这里声明**：它**只住在环境里**（声明的那一刻把刚算出来的值搬进那一格，
之后本层也走 `EnvGet`/`EnvSet`）。

**这一条是判据抓出来的**：原来本层继续用槽、环境格永远空着——于是内层函数从环境里
读到的是 `undefined`，报的是「调用了一个不是闭包的值」，**错在几十条指令之外**。
一份状态只能有一处存放，否则就有两个版本，「哪个是真的」迟早会问错。

```ts
const cell = this.CellOf(name);
if (cell >= 0) {
  this.Emit(Op.EnvSet, slot, 0, cell, -1);
  return;
}
if (this.Scope.length === 0) throw new Error("declare outside a scope");
this.Scope[this.Scope.length - 1].Declare(name, slot);
```

## method VarSlotOf:(name:string)=>int

这个 `var` 名字提到的那一格；`-1` 表示没提过（那说明上游的收集漏了它——**要报出来**）。

```ts
for (let i = 0; i < this.VarNames.length; i++) {
  if (this.VarNames[i] === name) return this.VarSlots[i];
}
return -1;
```

## method IsHoisted:(node:AstNode)=>bool

这个声明节点是不是**已经提过了**。

**按对象认**（同一份 AST 里节点对象唯一）：语句流走到它时跳过——
不跳会造第二个闭包、开第二个槽，提升也就白做了。

```ts
for (let i = 0; i < this.Hoisted.length; i++) {
  if (this.Hoisted[i] === node) return true;
}
return false;
```

## method Hoist:(body:AstNode)=>void

**把该提到函数顶的东西提上来**：函数声明（造闭包）与 `var` 的名字（占槽）。

**为什么必须提前**：`f(); function f() {}` 在 JS 里合法（调用写在声明之前）。
不提前的话，那句话会去找一个还不存在的名字——**报错还是轻的，读到别的值才是重的**。

**只提这一层的函数声明**（嵌套块里的按块作用域处理，严格模式语义，这一轮不做）；
**`var` 名字则要连嵌套块一起提**（`var` 属于函数，见 `scope.xl.md` 的 `CollectHoistedVars`）。

```ts
const varNames: string[] = [];
CollectHoistedVars(body, varNames);
for (let i = 0; i < varNames.length; i++) {
  if (this.VarSlotOf(varNames[i]) >= 0) continue;
  const slot = this.Reserve(1);
  this.VarNames.push(varNames[i]);
  this.VarSlots.push(slot);
  this.DeclareLocal(varNames[i], slot);
}
const statements = ListOf(body, "statements");
for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  if (NodeKind(statement) !== "FunctionDeclaration") continue;
  // **没有体的函数声明不是函数**（第 148 轮）✗：两条来源都合法、而且都常见——
  //   · `declare function f(x: number): void;` ✓（环境声明，「外面已经有它」✓）；
  //   · **重载签名** ✓：`function f(a: string): void;` 后面跟一个带体的实现 ✓
  //     （TS 的重载就是这一形状 ✓，普通项目里到处都有 ✓）。
  // 两者都**没有体** ✓，所以判据就是「有没有体」✓——比看 `declare` 修饰词更宽 ✓
  //（重载签名没有那个修饰词 ✗）。少了这一条，`Hoist` 会在**降级期**报
  // `ast node FunctionDeclaration has no child body` ✗——离现场很远 ✓。
  if (OptionalChild(statement, "body") === null) continue;
  this.Hoisted.push(statement);
  this.LowerFunctionDeclaration(statement);
}
```

## method ResolveAccess:(name:string)=>Access

**一个名字怎么访问**：先在槽里找，再沿环境链找；两处都没有就抛。

**「两处都没有」的报错要分清两种错**（这也是 `DeclaredNames` 唯一的用处）：

- 名字**在声明名单里** → 是**用在声明之前**（`let`/`const` 的 TDZ，或者提升没接上）；
- 不在名单里 → **根本没这个名字**（写错了，或者是我们还不支持的捕获）。

两种错合成一句话，查的人就得从头看一遍——**分开说，省的是别人的时间**。

**已捕获的名字不报 TDZ**：环境格从函数一开始就存在（格数是 `EnvNew` 那一刻定死的），
所以捕获的 `let` 用在声明之前会读到 `undefined`——这是 TDZ 那一项**已知的缺口**，
写在文首那张表里，**不假装它报了**。

```ts
const slot = this.FindLocal(name);
if (slot >= 0) return Access.Local(slot);
const captured = this.Env.Resolve(name);
if (captured !== null) return Access.Captured(captured.Depth, captured.Cell);
if (Contains(this.DeclaredNames, name)) {
  throw new Error("name used before its declaration: " + name);
}
throw new Error("name is not a local or a capture: " + name);
```

## method FindLocal:(name:string)=>int

从里往外找槽里的名字；`-1` 表示这一层没有（**不抛**——`ResolveAccess` 接着去环境里找）。

```ts
for (let i = this.Scope.length - 1; i >= 0; i--) {
  const slot = this.Scope[i].Resolve(name);
  if (slot >= 0) return slot;
}
return -1;
```

## method ResolveLocal:(name:string)=>int

从里往外找这个名字，**只认槽**。

```ts
const slot = this.FindLocal(name);
if (slot >= 0) return slot;
throw new Error("unimplemented: name is not a local (captures need env records): " + name);
```

## method IntConst:(value:float)=>int

**内部整数**进常量池：算子号、内建号、函数入口 pc、索引……

**只收整数** ✓，非整数**抛** ✓——这个函数今天所有的调用点喂的都是编译期算出来的整数 ✓，
不是用户写的字面量 ✓（字面量走 `NumberConst` ✓）。非整数的数字走到这里就是**降级期写错了** ✓，
比编出一个装不下的常量再被拒要好 ✓。

```ts
if (Math.floor(value) !== value) {
  throw new Error("internal: IntConst got a non-integer: " + value);
}
return this.Program().AddConst(Constant.OfInt(value));
```

## method NumberConst:(value:float)=>int

**数字字面量**进常量池（第 129 轮）。

**两档按「最小的表示」挑** ✓，与引擎的 `MakeNumber`（`runtime/rt.xl.md`）**同一条口径** ✓：
恰好是整数且落在 `±2147483647` 之内 ⇒ `Int32` ✓（四个目标都装得下 ✓），
否则 ⇒ `Float64` ✓。

**为什么界限是 `±2147483647` 而不是「是整数就行」** ✗：`1e10` 是整数 ✓，
但它**不在** `int` 交集里 ✗——存成 `Int32` 会让 C++ 侧溢出、ts 侧正常，
于是同一个程序在两个目标上算出不同的值 ✗，而这是本工程要消灭的东西 ✓。

**为什么 `-0` 不走 `Int32`** ✗：它在 JS 里是**一个独立的值** ✓
（`Object.is(-0, 0)` 为假 ✓、`1 / -0` 是 `-Infinity` ✓），
收成 `Int32` 就把它和 `0` 合并了 ✗——**静默换了一个值** ✗。

```ts
if (value === value && value <= 2147483647 && value >= -2147483647) {
  const rounded = value - value % 1;
  // **负零自己判**：`-0 % 1` 是 `-0`、`value - (-0)` 是 `0` ✓，所以下面这条会把它收成整数 ✗。
  // 只有 `-0` 需要这一格：`value < 0` 对它为假 ✗，用一次除法看符号位 ✓。
  const negativeZero = value === 0 && 1 / value < 0;
  if (rounded === value && !negativeZero) return this.Program().AddConst(Constant.OfInt(value));
}
return this.Program().AddConst(Constant.OfDouble(value));
```

## method LowerModule:(source:AstNode, ids:IdTable)=>LoweredModule

**入口**：把一份源文件降级成一个模块。

顺序是三段，顺序本身是语义：

1. **入口函数（下标 0）**：顶层语句都进它，最后补 `halt`；
2. **排队的函数体**：每个都排在**前一个函数之后**（指令必须连续），
   登记顺序天然就是 `Entry` 升序；
3. **收尾**：这时 `SlotCount` 才知道，所以函数表在这时候填。

```ts
this.Module = new LoweredModule(new Program());
this.Pending = [];
this.BeginFunction(1);
this.PushScope();
// **导入的名字与全局名走同一套机关**：它们都是「模块作用域里的名字，值从环境对象取」
// （`import { f } from "./a"` 与 `Math` 的区别只在**谁提供**，不在**怎么来**）。
// 所以这里把它们并进 `Globals`，后面的 `BindGlobals` 一起绑。
const prelude = ListOf(source, "statements");
for (let i = 0; i < prelude.length; i++) {
  this.CollectImports(prelude[i]);
}
this.ExtraDeclared = this.Globals;
this.EnterFunctionBody(source, [], []);
this.Hoist(source);
this.BindGlobals();
const statements = ListOf(source, "statements");
for (let i = 0; i < statements.length; i++) {
  this.LowerStatement(statements[i]);
}
// **入口函数返回「导出闭包数组」**（宿主拿它按名字调用，见 `host-abi.xl.md`）。
// 为什么不是 `halt`：`halt` 之后机器只是停下，宿主手上没有任何**值**可以调——
// 而按函数表下标开出来的帧**没有环境**，凡是引用了模块作用域变量的函数都跑不起来。
// 交出一条闭包（它带着模块环境出生）才是能用的那一条。
const exportsSlot = this.Reserve(1);
this.EmitRt(RtOp.NewArray, exportsSlot, exportsSlot, 0);
for (let i = 0; i < this.Pending.length; i++) {
  const item = this.Pending[i];
  const window = this.Reserve(3);
  this.Emit(Op.Move, window, exportsSlot, -1, -1);
  this.Emit(Op.Const, window + 1, this.IntConst(i), -1, -1);
  this.Emit(Op.Move, window + 2, item.Slot, -1, -1);
  // **结果写进窗口，不写 exportsSlot**：`rt_call` 的结果落在 B 操作数上，
  // 拿数组那一格当结果槽就会把数组本身覆盖掉——第二次循环就写不动了。
  this.EmitRt(RtOp.SetIndex, window, window, 3);
  this.Release(window);
}
this.Emit(Op.Return, exportsSlot, -1, -1, -1);
this.EntrySlots = this.Peak;
this.Program().IdTableHash = ids.Hash;
let next = 0;
while (next < this.Pending.length) {
  const item = this.Pending[next];
  next = next + 1;
  this.LowerFunctionBody(item);
}
this.Program().Functions.push(new FunctionInfo(0, this.EntrySlots, 0));
for (let i = 0; i < this.Pending.length; i++) {
  const item = this.Pending[i];
  const info = new FunctionInfo(item.Entry, item.SlotCount, item.ParamCount);
  // **生成器函数**：调用它**只造对象、不跑体**（引擎的 `DoCallValue` 那条分支）。
  info.IsGenerator = item.IsGenerator;
  info.IsAsync = item.IsAsync;
  // **剩余参数**（第 133 轮）：这一位交给**开帧的人** ✓——它在那一刻手上才有
  // 「这次实际传了几个」✓，而被调方自己的帧里**没有格子**放多出来的实参 ✓
  //（`ir.xl.md` 的 `FunctionInfo.HasRest` 那一段写着为什么 ✓）。
  info.HasRest = item.HasRest;
  this.Program().Functions.push(info);
  // **这个常量的值是「函数入口 pc」**——链接时要跟着基址挪（`ir.xl.md` 的
  // `EntryConstants`）：不声明的话，链接器只能靠「值相等」去猜，
  // 而脚本里的字面量整数也在常量池里，猜错就是**静默改掉一个数字**。
  this.Program().EntryConstants.push(item.Patch);
  this.Module.AddEntry(item.Name, i + 1);
}
return this.Module;
```

**`i + 1` 里那个 1 是入口函数**：它占着函数表的下标 0，所以排队序号与函数表下标差一位。
**这一位错了就等于「按名字调到了别的函数」**——判据当场报的是「`add(2, 3)` 给了 0」，
因为下标 0 是入口函数，它跑完只留下一条 `halt`。

## method LowerFunctionBody:(item:PendingFunction)=>void

降级一个排队的函数体。

**隐式返回**：函数跑完没有 `return` 时给 `undefined`（`return` 的操作数是 `-1`）
——JS 的语义就是它，所以这里必须补一条，而不是「掉到函数末尾」。

```ts
const body = item.Body;
if (body === null) throw new Error("pending function without a body");
item.Entry = this.Here();
this.Program().Consts[item.Patch] = Constant.OfInt(item.Entry);
this.Env = item.Envs.Clone();
this.BeginFunction(item.ParamCount);
this.PushScope();
// **`yield` 与 `await` 归哪一层**：进这一层时设、出去时恢复（一层一层降级，一个字段够）。
const outerInGenerator = this.InGenerator;
const outerInAsync = this.InAsync;
const outerSuperName = this.InSuperName;
const outerInArrow = this.InArrow;
this.InGenerator = item.IsGenerator;
this.InAsync = item.IsAsync;
this.InSuperName = item.SuperName;
this.InArrow = item.IsArrow;
// **解构形参里的名字也要进「这一层声明了什么」**（第 134 轮）✗：`CollectDeclaredNames`
// 扫的是**函数体** ✓，而模式里的名字**只出现在形参表上** ✗——漏了它们，
// 「本层变量」会被当成「未知名字」✓（症状与 `scope.xl.md` 那条注释写的一字不差 ✓），
// 而且**被内层函数引用到时不会被算成捕获** ✗（那是**静默错值** ✗）。
// 走 `ExtraDeclared` 这条既有通道 ✓——`EnterFunctionBody` 一进来就把它并进 `declared` ✓。
const patternNames: string[] = [];
for (let p = 0; p < item.Patterns.length; p++) {
  CollectPatternNames(item.Patterns[p], patternNames);
}
this.ExtraDeclared = patternNames;
// **环境要在声明参数之前开**：参数里也有被捕获的（内层函数引用外层函数的参数），
// 而那些名字必须一上来就住进环境格——`DeclareLocal` 是照着环境格认的。
//
// **「额外那几段」要连着字段初始化式一起递进去** ✓（第 212 轮 ✓）：
// `EnterFunctionBody` 拿 `extras` 去算三件事 ✓——**捕获** ✓、`needsThis` ✓、`hasNested` ✓
//（它那一段注释里写着为什么三件都要 ✓）。而**实例字段的初始化式**（`item.FieldDefaults` ✓）
// 也是**跑在构造函数这一帧里**的代码 ✓，此前**只递了参数默认值** ✗——
// 于是 `function make(k) { return class { v = k; }; }` 报
// `name is not a local or a capture: k` ✓（判据 `ex-class-expr-field-capture` 现场红的 ✓）：
// `k` 既不在这一层声明里 ✓、也没被算成捕获 ✗ ⇒ 外层那一层**压根不开环境** ✗。
// **静态字段不受影响** ✓（它在**类声明那一处**求值 ✓，本来就在外层的体里 ✓）——
// 所以这个缺口只在**类表达式 + 实例字段**这一格上现形 ✓（实测：`static v = k` 一直是好的 ✓）。
const captureDefaults: AstNode[] = [];
for (let i = 0; i < item.Defaults.length; i++) captureDefaults.push(item.Defaults[i]);
for (let i = 0; i < item.FieldDefaults.length; i++) captureDefaults.push(item.FieldDefaults[i]);
// **实例字段的初始化式也要递进来** ✓（第 212 轮 ✓）：它们跑在**这一帧**里 ✓
//（`EmitFieldDefaults` 就在构造函数体里发 ✓），可它们**不在 `body` 里** ✗
//（`body` 是构造函数体 ✓，字段初始化式挂在 `item.FieldDefaults` 上 ✓）。
// **少递的后果有两档** ✗：
//   · `k` 不进捕获名单 ✓ ⇒ `name is not a local or a capture: k` ✓（c1 那一档 ✓）；
//   · **`needsThis` / `hasNested` 算不出来** ✓ ⇒ 构造函数这一帧**压根不开环境** ✗，
//     而字段初始化式里的箭头**要往这一帧捕获 `this`** ✓ ⇒ 报
//     `new_closure needs an environment or undefined` ✓（`f = () => this.v` 那一档 ✓，
//     **在模块顶层也是红的** ✓——它是**既有缺口** ✓，这一轮顺着同一条路一起修掉 ✓）。
// **另一半在 `scope.xl.md`** ✓：`CollectInsideFunctions` 要把字段初始化式当**内层代码**走 ✓，
// 否则**外层**（`make`）算不出「有人在引用 `k`」✓、也就不开环境 ✗。
this.EnterFunctionBody(body, item.Params, captureDefaults);
for (let i = 0; i < item.Params.length; i++) {
  this.DeclareLocal(item.Params[i], i);
}
// **参数那一段按「从左到右」走一趟**（第 134 轮把默认值与解构合到一处）✗：
// 两样都是**被调方的开场代码** ✓（`LowerParamDefault` 那一段写着为什么 ✓），
// 而 JS 的规矩是**按参数顺序**求值 ✓——`function f({a}, b = a)` 里 `b` 看得见 `a` ✓。
// 分成两趟（先所有默认值、再所有解构）会让上面那一句**读到还没拆的那个槽** ✗。
//
// **默认值在解构之前** ✓：`function f({a} = {})` 是「先补默认值、再拆」✓
// （不传的时候拆的是 `{}` ✓，而不是 `undefined` ✗）。
for (let i = 0; i < item.Params.length; i++) {
  let hasDefault = false;
  for (let d = 0; d < item.DefaultAt.length; d++) {
    if (item.DefaultAt[d] !== i) continue;
    this.LowerParamDefault(item.Params[i], item.Defaults[d]);
    hasDefault = true;
  }
  for (let p = 0; p < item.PatternAt.length; p++) {
    if (item.PatternAt[p] !== i) continue;
    // **解构读的是那一格的值**：`ResolveAccess` 两个方向各只有一处 ✓
    //（被捕获的形参只住在环境格里 ✓——与 `LowerParamDefault` 同一条路 ✓）。
    this.Destructure(item.Patterns[p], this.ParamValue(item.Params[i]), false);
  }
}
this.Hoist(body);
// **实例字段的初始化式**（第 128 轮）：非派生类在**构造函数体之前**、参数默认值之后 ✓。
// 派生类**不在这一处**——`this` 要等 `super(...)` 返回才存在（见下面 `DeferredItem` 那段）。
//
// **放在参数声明之后不是风格**：字段初始化式要用临时槽 ✓，而在参数还没声明时
// 水位恰好压在**第一个参数**那一格上 ✗（第 128 轮实测：`id` 被写成了接收者对象，
// 症状是两步之外的 `arithmetic on a non-numeric operand`）✓。
if (item.FieldDefaults.length > 0 && !item.FieldInitDeferred) {
  this.EmitFieldDefaults(item);
  item.FieldInitRan = true;
}
const outerDeferred = this.DeferredItem;
if (item.FieldInitDeferred && item.FieldDefaults.length > 0) {
  // **只对「这个函数的体」这一层挂**（内层块不欠它，理由见 `DeferredItem`）✓。
  this.DeferredItem = item;
}
if (item.IsExpressionBody) {
  // 箭头函数的表达式体：值就是返回值（**不是**「跑完给 undefined」）。
  const value = this.LowerExpression(body);
  this.Emit(Op.Return, value, -1, -1, -1);
} else if (NodeKind(body) === "Block") {
  this.LowerStatementsOf(body);
} else {
  this.LowerStatement(body);
}
this.DeferredItem = outerDeferred;
this.Emit(Op.Return, -1, -1, -1, -1);
item.SlotCount = this.Peak;
this.PopScope();
this.InGenerator = outerInGenerator;
this.InAsync = outerInAsync;
this.InSuperName = outerSuperName;
this.InArrow = outerInArrow;
```

## method LowerStatementsOf:(block:AstNode)=>void

降级一个块里的语句序列（**不自己开作用域**——开不开由调用方决定）。

```ts
const statements = ListOf(block, "statements");
for (let i = 0; i < statements.length; i++) {
  this.LowerStatement(statements[i]);
}
```

## method FieldInitDue:()=>void

**该发派生类的字段初始化了吗**（第 128 轮）——已经是「只发一次」的。

**判定两条**：这一层就是那个构造函数的体（`DeferredItem` 挂着它 ✓）、**还没发过** ✓。
非派生类在 `LowerFunctionBody` 里早就发完了（`FieldInitRan` 已置真 ✓），走不到这里 ✓。

**它不是主路**：真正的触发点在 `LowerStatement` 的 `super(...)` 那一支（见那里）✓——
`super` **可能嵌在别的语句里**（`const d = id * 2; super(d);` 的第二句还是一条表达式语句 ✓，
但 `const p = super0()` 那种形状迟早会有），所以在**调用点**接住比在语句循环里猜准得多 ✓。
留这一层是**兜底**：万一将来有哪条路把 `super` 降级在别处，字段初始化也不会静默丢掉 ✓。

```ts
const item = this.DeferredItem;
if (item === null) return;
if (item.FieldInitRan) return;
this.EmitFieldDefaults(item);
item.FieldInitRan = true;
```

## method EmitFieldDefaults:(item:PendingFunction)=>void

**把一批实例字段的初始化式发出来**（第 128 轮）：逐条写 `this.<名字> = <初始化式>`。

**为什么是 `set_prop` 而不是「新建一格属性」**：JS 的类字段走 `[[DefineOwnProperty]]` ✓，
而这一层的对象模型只有「赋值」这条路 ✓——两者的差别落在**原型上有同名 setter** 时
（JS 不调它、赋值会调 ✓）。这是**写在明处的已知差异** ✓，记在 `typescript-exec/README.md`。

```ts
for (let i = 0; i < item.FieldDefaults.length; i++) {
  this.EmitFieldInit(-1, item.FieldDefaults[i]);
}
```

## method EmitFieldInit:(target:int, field:AstNode)=>void

**一条字段初始化式**（第 128 轮）：`<target>.<名字> = <初始化式>`。

**实例字段与静态字段共用它** ✓——区别只是 `target` 是谁：**静态字段给构造函数那一格** ✓，
**实例字段给 `-1`**（那时目标**就地**发一条 `load_this` ✓，见下面那条实测教训）✓。
**没有初始化式的字段也要写一次 `undefined`** ✓：JS 里 `class C { x }` 之后
`"x" in new C()` 是**真** ✓——不写的话属性根本不存在，而那是一个**能被脚本看见**的差别 ✓。

**算键只认标识符 / 字符串 / 数字**（与类方法同一条口径 ✓）：计算键要「先算键再赋值」，
那是另一条路（`SetPropertyValue` 就在手边，缺的只是判据）。

**为什么 `this` 要就地发、不能先占一格**（第 128 轮实测抓到的）：先占的那一格会**压在参数槽上** ✗。
现场是 `constructor(id: number) { … this.id = id }` 加一条 `extra = this.id * 10`：
`EmitFieldDefaults` 先占了第 1 格当 `this`（参数只占第 0 格、水位是 1），
紧接着构造函数体把**参数 1 号**（`id`）绑到同一格 ✗——于是体里读到的 `id` 是**接收者对象** ✗，
`this.id = id` 把对象写进了 `id` 字段，最后在 `this.id * 10` 上报
`arithmetic on a non-numeric operand` ✓（离现场两步远）。
**就地发就没有这一格** ✓：窗口是现占的，参数与变量全在它下面 ✓。

```ts
if (this.HasModifier(field, "DeclareKeyword")) return;
const nameNode = OptionalChild(field, "name");
if (nameNode === null) {
  throw new Error("unimplemented: class field without a name");
}
const nameKind = NodeKind(nameNode);
// **私有字段名也是字段名**（第 195 轮 ✓）：`#n = 1` 的 kind 是 `PrivateIdentifier` ✓——
// 与私有**方法**（同轮补 ✓）以及三个方法的取值路（`KeyUnitsOf` ✓）**同一个键** ✓。
// 原来这里只认三种 ✗，于是带私有字段的类也进不来 ✗（实测报的就是这一句 ✓）。
if (nameKind !== "Identifier" && nameKind !== "StringLiteral" && nameKind !== "NumericLiteral"
    && nameKind !== "PrivateIdentifier") {
  throw new Error("unimplemented: computed class field name");
}
// **私有字段要藏起来** ✓（第 210 轮 ✓）：JS 里 `#n` **不是一个属性** ✓——
// `Object.keys(new C())` 看不见它 ✓、`JSON.stringify` 也看不见 ✓。
// 本仓把私有字段存在**属性表**里 ✓（`props.xl.md` 的模型 ✓，值本身找得到 ✓），
// 但那一格必须是**不可枚举**的 ✓，否则 `Object.keys` 会把它数出来 ✓（**静默错值** ✗，
// 判据 `cls-private` 现场红的 ✓）。
// **判定放在降级层是对的** ✓：`#` 是**这门语言的语法** ✓——引擎不该认识它 ✗
//（认识它就要在 `heap` / `props` 里散布「以 `#` 开头的键特殊」这种规矩 ✗）。
const isPrivateField = nameKind === "PrivateIdentifier";
const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(nameNode)));
const initializer = OptionalChild(field, "initializer");
// **值先算出来** ✓（两种落点、两种挂法共用 ✓）：没有初始化式就写 `undefined` ✓——
// JS 里 `class C { x }` 之后 `"x" in new C()` 是**真** ✓，不写的话属性根本不存在 ✓
//（那是**能被脚本看见**的差别 ✓）。
let fieldValue = -1;
if (initializer === null) {
  fieldValue = this.Reserve(1);
  this.Emit(Op.Const, fieldValue, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
} else {
  fieldValue = this.LowerExpression(initializer);
}
// **私有字段落成 `set_hidden`** ✓（第 210 轮 ✓）：`set_hidden(接收者, 键, 值)` ——
// 接收者是 `this`（实例字段 ✓）或构造函数那一格（静态字段 ✓），与下面那两条 SetProp 同源 ✓。
if (isPrivateField) {
  const hiddenSelf = this.Reserve(1);
  if (target < 0) {
    this.Emit(Op.LoadThis, hiddenSelf, -1, -1, -1);
  } else {
    this.Emit(Op.Move, hiddenSelf, target, -1, -1);
  }
  this.EmitHiddenSet(hiddenSelf, key, fieldValue);
  this.Release(hiddenSelf);
  return;
}
if (target < 0) {
  const window = this.Reserve(3);
  this.Emit(Op.LoadThis, window, -1, -1, -1);
  this.Emit(Op.Const, window + 1, key, -1, -1);
  this.Emit(Op.Move, window + 2, fieldValue, -1, -1);
  this.EmitRt(RtOp.SetProp, window, window, 3);
  this.Release(window);
  return;
}
this.SetPropertyConst(target, key, fieldValue);
```

## method EmitHiddenSet:(target:int, key:int, value:int)=>void

**一条 `set_hidden(对象, 键, 值)` 内部调用** ✓（第 210 轮 ✓）——窗口形状与
`ConcatValues` / `PowValues` **同一个** ✓（`[号, 参数…]` + 一条 `host_call` ✓）。

**窗口自己占、自己退** ✓（与那两条一样 ✓），差别是**结果不看** ✓：
`set_hidden` 给的是 `undefined` ✓，调用方要的是「写完」这件事本身 ✓。

```ts
const window = this.Reserve(4);
this.Emit(Op.Const, window, this.IntConst(SetHiddenId), -1, -1);
this.Emit(Op.Move, window + 1, target, -1, -1);
this.Emit(Op.Const, window + 2, key, -1, -1);
this.Emit(Op.Move, window + 3, value, -1, -1);
this.EmitRt(RtOp.HostCall, window, window, 4);
this.Release(window);
```

## method LowerStatement:(node:AstNode)=>void

语句分派。

```ts
const kind = NodeKind(node);
// **模块层面的三条声明在这里没有运行期效果**：导入的名字与全局名一起从环境对象取
// （`CollectImports` + `BindGlobals` 已经办完），导出表里本来就装着这份文件的所有函数
// （入口返回的就是它）。所以 `import` 与 `export { … }` 都是**空操作**。
if (kind === "ImportDeclaration") return;
if (kind === "ExportDeclaration") return;
if (kind === "ExportAssignment") {
  throw new Error("unimplemented: `export default` (the export table has no default slot)");
}
// ---- 类型位的声明：**一个运行期指令都不产生**（第 148 轮）----
//
// 第 147 轮量出来的**那一档最大的拦路虎** ✓：`type X = …` 报
// `unimplemented: expression TypeAliasDeclaration` ✓、`interface I { … }` 报
// `unimplemented: statement InterfaceDeclaration` ✓——**不是在运行期失败，
// 而是整份文件根本降级不出来** ✗。而这两样在真实的 `.ts` 里几乎无处不在 ✓
//（本仓自己 `dist/ts/**` 的每一份产物都带 `interface` ✓）。
//
// **做法就是「什么都不做」** ✓：文末那条口径是「**类型位一律擦除**」✓——
// 类型别名与接口**不产生任何运行期东西** ✓（JS 里也没有它们 ✓）：
// 它们只描述形状 ✓，而本仓不做类型检查 ✓。所以整条跳过 ✓，不查名字、不查成员 ✓——
// **查了反而错** ✗：接口成员的类型文本里可以有这一层不认识的东西 ✓，
// 而它们**本来就不该影响运行** ✓。
if (kind === "TypeAliasDeclaration") return;
if (kind === "InterfaceDeclaration") return;
// **`declare` 那一族**（`declare function` / `declare const` / `declare class` /
// `declare module "x" {}` / `declare global {}` ✓）：环境声明说的是「外面已经有这个东西」✓，
// 运行期**什么也不是** ✗——所以整条跳过 ✓。
//
// **它不是「值位的声明」** ✗：`declare const x: number;` 之后**运行时没有 `x`** ✓，
// 用到它的地方照旧报 `name is not a local or a capture` ✓——响亮 ✓，
// 而且与「那份文件真跑起来会 ReferenceError」是同一件事 ✓（不静默给个 `undefined` ✗）。
if (this.HasModifier(node, "DeclareKeyword")) return;
if (kind === "VariableStatement") {
  this.LowerDeclarationList(Child(node, "declarationList"));
  return;
}
if (kind === "ExpressionStatement") {
  this.LowerExpression(Child(node, "expression"));
  return;
}
if (kind === "ReturnStatement") {
  const expression = OptionalChild(node, "expression");
  // **带 `finally` 的 `try` 里 `return` 要先跑那些 `finally`** ✓（第 201 轮 ✓）。
  // 修之前这一格是**降级期就抛** ✗（「`return` 会跳过 `finally`」✓）——
  // 那一抛本身是对的 ✓（静默跳过 `finally` 是**静默错值** ✗），但 `try { … } finally { … }`
  // 加 `return` 是**普通 `.ts` 里最常见的一条** ✓，所以这一轮把那段改写补上了 ✓。
  if (this.FinallyBlocks.length > 0) {
    // **返回值先落到一格** ✓：跑 `finally` 会用到临时格 ✗，而它是**往上分配**的 ✓
    //（`Reserve` ✓），所以这一格不会被盖掉 ✓——`finally` 里那些 `Release` 退到的是
    // **它自己那一段的基址** ✓，在返回值这一格**之上** ✓。
    let value = -1;
    if (expression !== null) value = this.LowerExpression(expression);
    this.EmitPendingFinalies();
    this.Emit(Op.Return, value, -1, -1, -1);
    return;
  }
  if (expression === null) {
    this.Emit(Op.Return, -1, -1, -1, -1);
    return;
  }
  const slot = this.LowerExpression(expression);
  this.Emit(Op.Return, slot, -1, -1, -1);
  return;
}
if (kind === "ThrowStatement") {
  const value = this.LowerExpression(Child(node, "expression"));
  this.Emit(Op.Throw, value, -1, -1, -1);
  return;
}
if (kind === "IfStatement") {
  this.LowerIf(node);
  return;
}
if (kind === "WhileStatement") {
  this.LowerWhile(node);
  return;
}
if (kind === "DoStatement") {
  this.LowerDo(node);
  return;
}
if (kind === "LabeledStatement") {
  // **带标签的语句**（第 234 轮补上了**体不是循环**那一支 ✓）。
  //
  // 两支分开 ✗，因为它们的落法**完全不同**：
  //
  // ① **体是一个循环**（`outer: for (…) { … }` ✓）：标签写进「待用字段」✓，
  //   由**紧跟着的那个循环**（`EnterLoop` ✓）吃进去 ✓——
  //   `break outer` / `continue outer` 就是靠它找到那一层 ✓。
  //   这就是原来那条路 ✓（`PendingLabel` ✓）。
  //
  // ② **体不是循环**（`outer: { … }` ✓，第 234 轮 ✓）：**没有任何东西会来消费这个标签** ✗
  //   （`EnterLoop` 只有循环调 ✓），于是原来那句「无论体是什么都要清」✓
  //   把标签**当场扔掉** ✗——`break outer` 随后报
  //   `unknown label \`outer\` (the parser should have rejected this)` ✓
  //   （那句话把责任推给语法层 ✗，而**它是合法的 JS** ✓：判据 `ex-labeled-block` ✓）。
  //
  // **②怎么落** ✓：**给整个块当一层可跳出的东西** ✓——块的**末尾留一个跳转目标** ✓，
  // `break outer` 就是「跳到这里」✓（**没有新算子** ✓：与循环出口那条路一字不差 ✓）。
  // 它**不进 `Loops`** ✗：`Loops` 那一摞还管着 `continue` ✓ 与「循环体每轮新建绑定」✓，
  // 而那些对块毫无意义 ✗——混进去会让块里的 `continue` 找到一层不是循环的东西 ✓。
  // 所以它**单独一格** ✓（`BlockLabel` / `BlockLabelExit` ✓），判据在 `LowerBreak` 里 ✓。
  if (NodeKind(Child(node, "statement")) === "Block") {
    // **`break` 的跳转先记下来、块跑完一起回填** ✓——**与 `LeaveLoop` 同一个写法** ✓
    //（那一处的理由一字不差地适用 ✓：`break` 的落点永远是「这一层之后」✓，
    //  让每一处 `break` 自己算，迟早有人算成「这一层之前」✗）。
    //
    // **第一次写的是「块前占一条 `Jump` 当目标」** ✗——那少了一条 ✓：
    // 块**正常走到尾**时会紧挨着那条 `break` 的跳 ✓，于是**正常路径也跳走** ✓，
    // 实测 `log` 少了最后那个 `"b"` ✓（**静默错值** ✓：判据 `ex-labeled-block`
    // 期望 `"a"` ✓，而 `break` 前面那一句 `log += "b"` 得跑不到才对 ✓）。
    // 记一摞下标就没有这个形状 ✓：块里一条 `break outer` ⇒ 一摞里一条 ✓；
    // 一条都没有 ⇒ 什么都不用回填 ✓（**正常走完就是走完** ✓）。
    //
    // **没量到 `continue outer` 那一半** ✗：块上的 `continue` 需要一个**循环**做目标 ✓
    //（JS 的规矩 ✓）——判据只有 `break` ✓，**没量到就不做** ✗（缺口写在台账里 ✓）。
    const saved = this.BlockLabels.length;
    this.BlockLabels.push(new BlockLabelContext(TextOf(Child(node, "label"))));
    this.LowerStatement(Child(node, "statement"));
    const target = this.Here();
    // **退到进来时那一层** ✓（块里还嵌着别的标签块的话 ✓，它们早该在出去时退掉了 ✓）。
    const mine = this.BlockLabels[this.BlockLabels.length - 1];
    this.BlockLabels.length = saved;
    for (let i = 0; i < mine.Breaks.length; i++) {
      this.PatchTarget(mine.Breaks[i], target);
    }
    return;
  }
  // **无论体是什么都要清**：①那一支里若体不是循环（不该发生 ✓），
  // 留着标签就会让**后面第一个**循环白白继承它 ✓。
  this.PendingLabel = TextOf(Child(node, "label"));
  this.LowerStatement(Child(node, "statement"));
  this.PendingLabel = "";
  return;
}
if (kind === "ForStatement") {
  this.LowerFor(node);
  return;
}
if (kind === "ForOfStatement") {
  this.LowerForOf(node);
  return;
}
if (kind === "ForInStatement") {
  this.LowerForIn(node);
  return;
}
if (kind === "TryStatement") {
  this.LowerTry(node);
  return;
}
if (kind === "SwitchStatement") {
  this.LowerSwitch(node);
  return;
}
if (kind === "BreakStatement") {
  this.LowerBreak(node);
  return;
}
if (kind === "ContinueStatement") {
  this.LowerContinue(node);
  return;
}
if (kind === "Block") {
  this.PushScope();
  this.LowerStatementsOf(node);
  this.PopScope();
  return;
}
if (kind === "FunctionDeclaration") {
  // **没有体的函数声明不是函数**（第 148 轮）：两条来源都合法、都常见——
  //   · `declare function f(x: number): void;` ✓（环境声明 ✓，上面那条 `declare` 已经拦过 ✓）；
  //   · **重载签名** ✓：`function f(a: string): void;` 后面跟一个带体的实现 ✓
  //     （TS 的重载就是这一形状 ✓，普通项目里到处都有 ✓）。
  // 两者都不产生运行期东西 ✓（重载的语义在**那条带体的实现**里 ✓）。
  // **`Hoist` 那一侧也要同一条判据** ✗（否则签名会先在那里炸 ✓，
  // 而这里会让它落到 `LowerFunctionDeclaration` 上再炸一次 ✓——插桩把两处都点出来了 ✓）。
  if (OptionalChild(node, "body") === null) return;
  if (this.IsHoisted(node)) return;
  this.LowerFunctionDeclaration(node);
  return;
}
if (kind === "ClassDeclaration") {
  // **类声明不进提升**：它像 `let`（块作用域、声明之前读到的是 TDZ），
  // 所以按书写位置降级，不走 `Hoist` 那条路。
  this.LowerClass(node, false);
  return;
}
if (kind === "EnumDeclaration") {
  this.LowerEnum(node);
  return;
}
if (kind === "EmptyStatement") return;
throw new Error("unimplemented: statement " + kind);
```

## method StringUnits:(node:AstNode)=>Array<int>

字符串字面量 → 码元。

**空串现在是普通值**（第 119 轮）：投影对字符串字面量**一律给值**——
空串就给空串（`stringText` 那一节的修法），所以 `""` 到这里就是一个**空的 `text`**，
`UnitsOf("")` 给空数组 ✓。**原来在降级层拒绝它**✗（`unimplemented: an empty string literal …`），
理由是「投影分不开空串与『值是一对引号』」——那是**投影的锅**，修在投影上才对；
在降级层拒绝等于把一条遍地都是的写法挡在门外（`let s = ""` 就是它）。

**反向的那一半也顺带对了**：`'""'`（值就是两个双引号的串）现在给的是**值** `""`，
不再与空串撞车——**模板串那里早就是这么给的**（内插模板的空段就是一个空值的 `ConstString`）。

```ts
return UnitsOf(TextOf(node));
```

## method LowerVariable:(declaration:AstNode, isVar:bool)=>void

一条变量声明。**`var` 与 `let`/`const` 走不同的两条路**：

- **捕获的名字（两者都可能）**：**只写环境格**，本层不声明槽——
  一份状态只能有一处存放（这条是上一轮判据抓出来的，见 `DeclareLocal`）；
- **`var`**：用**提升时占好的那一格**（函数作用域，整个函数都看得见），
  没找到说明收集漏了它 → **报出来，不新建一个**（新建会让提升白做，而且两个名字两个值）；
- **`let`/`const`**：现在才占槽、现在才声明名字——于是「用在声明之前」找不到它，
  报的是 `name used before its declaration`（`ResolveAccess` 那一节）。

**先算右边再声明名字**：`let x = x` 在 JS 里是 TDZ 错误，
而「先声明」会让它静默读到一个 `undefined`——**宁可报错**。

```ts
const name = Child(declaration, "name");
const initializer = OptionalChild(declaration, "initializer");
const nameKind = NodeKind(name);
if (nameKind === "ObjectBindingPattern" || nameKind === "ArrayBindingPattern") {
  // **`var {a};` 也是空操作** ✓（理由与下面简单名那一支一字不差 ✓，见那条注释 ✓）——
  // 它源码上非法 ✓，但真到了这里也**不该**去拆一个 `undefined` ✓（那会改写已有的名字 ✓）。
  if (initializer === null && isVar) return;
  // **右边只求值一次**（`const {a} = f()` 里 `f()` 只跑一遍），所以先落到一格再拆。
  const source = this.Reserve(1);
  if (initializer === null) {
    this.Emit(Op.Const, source, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
  } else {
    this.LowerInto(source, initializer);
  }
  this.Destructure(name, source, isVar);
  // **不要在这里退水位**（第 119 轮修掉的 bug）：`Destructure` 里的每一格绑定都会
  // 在 `source` **上面**占一格变量（`BindName` → `Reserve(1)`），
  // `Release(source + 1)` 把它们**全退掉**✗——下一个声明于是盖在同一个槽上，
  // 症状是几条语句之后读到**别人的值**（判据现场：`const {x} = p; const [a,,b] = arr;`
  // 之后 `console.log("all", x, …)` 打出 `all all 2 all`；调 `ToString` 的那种直接
  // 报 `unimplemented: ToString of this kind of value`，离现场很远）。
  // 与上面简单名字那条同一个理由（那里也**不退**）：**退水位退掉的可能是刚绑好的变量**。
  return;
}
if (nameKind !== "Identifier") {
  throw new Error("unimplemented: declaration name " + nameKind);
}
const text = TextOf(name);
if (initializer === null && isVar) {
  // **`var x;` 是空操作** ✗：它只**声明** ✓——而声明那一步**提升时已经做完了** ✓
  //（`Hoist` 把名字收进 `VarNames` 并 `DeclareLocal` 占好槽 ✓）。
  // **赋一个 `undefined` 进去会把之前写过的值擦掉** ✗：
  // `inside = 5; if (true) { var inside; } return inside;` 该给 **5** ✓，原来给 `undefined` ✗
  //（判据现场：`var-hoist` 那一行少了开头那个 5 ✓）。
  // **`let x;` / `const x;` 恰好相反** ✓：它们就是「初始化成 `undefined`」✓
  //（TDZ 到此结束 ✓），所以下面那一条只对**非 `var`** 生效 ✓。
  return;
}
const value = this.Reserve(1);
if (initializer === null) {
  this.Emit(Op.Const, value, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
} else {
  // **把「这个名字」当成函数名的提示递下去** ✓（第 238 轮 ✓）：
  // `const arrow = () => 2` 里那个箭头**没有自己的名字** ✗（箭头不是具名函数 ✓），
  // 而 Node 给 `[Function: arrow]` ✓——名字**来自绑定的那一刻** ✓，
  // 而那一刻**正好就是这里** ✓（左边那个标识符 ✓、右边那个函数值 ✓）。
  //
  // **只在右边是一个函数值时才留下痕迹** ✓：`const x = 1` 也走这一句 ✓，
  // 而 `LowerFunctionValue` 是**唯一读它的人** ✓——所以别的形状一点影响都没有 ✓
  //（读不到就读不到 ✓，见 `FunctionNameHint` 那一格 ✓）。
  // **用完就清** ✓：不清的话「下一个函数值」会白继承上一个名字 ✗
  //（`const a = () => 1; const b = () => 2;` 两个都叫 `a` ✓，而那是**静默错值** ✗）。
  const savedHint = this.FunctionNameHint;
  this.FunctionNameHint = text;
  this.LowerInto(value, initializer);
  this.FunctionNameHint = savedHint;
}
// **不要在这里退水位**：`BindName` 可能刚在 `value` 上面留了一格给变量，
// 退下去就会让**下一次分配覆盖那个变量**（判据报的是「算术遇到了非数值」——
// 变量的值被别的东西换掉了）。
this.BindName(text, value, isVar);
```

## method LowerEnum:(node:AstNode)=>void

**`enum`**（第 230 轮 ✓）：造一个**普通对象** ✓，然后按下面的规矩往它上面挂键 ✓。

**为什么它有运行期语义** ✓（而 `type` / `interface` 是纯类型位、整条跳过 ✓）：
`enum Color { Red }` 之后**运行期真的有一个 `Color`** ✓（`Color.Red` 是 `0` ✓）——
TS 编译器做的是**变换**（`--experimental-transform-types` ✓），不是擦除 ✓。
判据 `ex-enum-numeric` / `ex-enum-string` / `ex-enum-const` 三条量的就是它 ✓。

**它拼的是「一个对象 + 一堆属性」** ✓——`NewObject` 与 `set_prop` **都是现成的** ✓
（与 `LowerObjectLiteral` 那条**同一个写法** ✓，**没有新算子** ✓）。

**数值成员要挂两格，字符串成员只挂一格** ✓（这是 `enum` 最特别的一条 ✓，实测过 ✓）：

| 写法 | 正向 | 反向 |
| --- | --- | --- |
| `enum C { Red, Green = 5, Blue }` | `C.Red = 0` / `C.Green = 5` / `C.Blue = 6` ✓ | `C[0] = "Red"` / `C[5] = "Green"` / `C[6] = "Blue"` ✓ |
| `enum S { A = "a" }` | `S.A = "a"` ✓ | **没有** ✗（`S["a"]` 是 `undefined` ✓，实测 ✓） |
| `enum M { X = 1, Y = "why", Z = 3 }` | `M.X = 1` / `M.Y = "why"` / `M.Z = 3` ✓ | `M[1] = "X"` / `M[3] = "Z"` ✓（`"why"` 那一格没有 ✓） |

**自动累加的两条规矩** ✓（与 Node 的变换逐值对过 ✓）：
- **没有初始化式的成员** = **上一个成员的数值 + 1** ✓（一个都没有就是 `0` ✓）；
- **字符串成员不参与累加** ✗：`enum M { X = 1, Y = "why", Z = 3 }` 里 `Z` 是**显式写的** `3` ✓；
  而 `enum E { A = "x", B }` 在 TS 里**直接报错**（「下一个成员必须有初始化式」✓），
  所以「上一个不是数值」那一档要**响亮地抛** ✓（不猜一个 `0` 或 `NaN` ✗）。

**`const enum` 照普通 `enum` 做** ✓（**与 TS 的一处已知差** ✗）：真正的 `const enum` 是
**编译期内联**（用法处直接换成字面量 ✓，而且 `--experimental-transform-types` 也会
把对象删掉 ✓），本仓**造对象** ✓、用法处读属性 ✓。**结果值完全一样** ✓
（判据 `ex-enum-const` 比的就是值 ✓），差的是「有没有那个对象」✓——
而 `.js` 产物与 `preserveConstEnums` 那一档是同一个形状 ✓，写在明处 ✓。

**成员名也是「值键」** ✓：`set_prop` 有一条收值的键 ✓（`SetPropertyValue` ✓）——
于是**反向映射那两格**与正向那一格走**同一个写法** ✓（只是键一个是名字、一个是数值 ✓）。

```ts
const nameNode = OptionalChild(node, "name");
if (nameNode === null || NodeKind(nameNode) !== "Identifier") {
  throw new Error("unimplemented: enum declaration without a name");
}
// **先造那个对象** ✓（与对象字面量同一处口径 ✓）。
const object = this.Reserve(1);
this.EmitRt(RtOp.NewObject, object, object, 0);
const members = ListOf(node, "members");
// **上一个数值成员的数值** ✓（`-1` 表示「还没有」✓）：见上面自动累加那两条 ✓。
let previous = -1;
for (let i = 0; i < members.length; i++) {
  const member = members[i];
  const memberName = OptionalChild(member, "name");
  if (memberName === null) throw new Error("unimplemented: enum member without a name");
  const initializer = OptionalChild(member, "initializer");
  // **值那一格** ✓：有初始化式就求它 ✓，否则按累加那条规矩给一个常数 ✓。
  //
  // **`previous` 是那个「上一个数值成员的数值」** ✓（`-1` 表示「还没有」✓）——
  // 两个地方要写它 ✗：**没有初始化式的成员**推进它 ✓（值 = 上一个 + 1 ✓）、
  // **初始化式是一个数值字面量**时要按它的值重设 ✓。**少了后一处**就是这一轮
  // 实测踩到的那个坑 ✓：`enum Color { Red, Green = 5, Blue }` 里 `Blue` 该是 **`6`** ✓
  // （按 `Green` 的 `5` 累加 ✓），而只推前一处的写法算的是 `Red + 1` ⇒ **`1`** ✗
  //（**静默错值** ✓：三格都"有值"、`Color[1]` 也查得到 ✓，只是它是错的 ✓）。
  let value = -1;
  if (initializer !== null) {
    value = this.LowerExpression(initializer);
    // **数值字面量就把 `previous` 重设成它** ✓（`NumericLiteral` 的 `text` 是原文 ✓，
    // 十六进制 / 二进制那几种写法也走这一格 ✓——`EnumLiteralValue` 认得它们 ✓）。
    if (NodeKind(initializer) === "NumericLiteral") {
      previous = this.EnumLiteralValue(TextOf(initializer));
    } else {
      // **其余初始化式：`previous` 作废** ✓（`-1` ✓）——见下面那句抛的理由 ✓。
      // **字符串那一档不算错** ✗（`enum S { A = "a", B = "b" }` 里 `B` 有初始化式 ✓）。
      previous = -1;
    }
  } else {
    // **没有初始化式**：第一个给 `0` ✓，其余是「上一个数值 + 1」✓
    //（「上一个不是数值」那一档在 TS 里本来就不合法 ✓，这里**响亮地抛** ✓，
    //  不猜一个 `0` 或 `NaN` ✗）。**判「是不是第一个」要看下标** ✗（第 230 轮实测 ✓）：
    // 拿 `previous < 0` 当判据会把**第一个**成员也一起抛掉 ✓——
    // 而 `previous` 为 `-1` 有两种来源 ✓（「还没有」✓ 与「上一个不是数值」✗），
    // 一个变量扛两种含义就是**那个坑** ✓。
    if (i === 0) {
      const zero = this.Reserve(1);
      this.Emit(Op.Const, zero, this.IntConst(0), -1, -1);
      value = zero;
      previous = 0;
    } else {
      if (previous < 0) {
        throw new Error("unimplemented: an enum member after a non-numeric member needs an initializer");
      }
      const next = this.Reserve(1);
      this.Emit(Op.Const, next, this.IntConst(previous + 1), -1, -1);
      value = next;
      previous = previous + 1;
    }
  }
  // **正向那一格** ✓：键是成员名 ✓（与对象字面量同一条路 ✓）。
  const nameKey = this.Reserve(1);
  this.Emit(Op.Const, nameKey, this.Program().AddConst(Constant.OfString(UnitsOf(TextOf(memberName)))), -1, -1);
  this.SetPropertyValue(object, nameKey, value);
  // **反向那一格** ✓：只在「值是一个数值」时挂 ✓（字符串成员**不挂** ✓，见上面那张表 ✓）。
  // **判据在编译期问一次** ✗：`IsNumericInitializer` 只认「没有初始化式」与
  // 「初始化式是数值字面量」两档 ✓——`A = 1 + 1` 那种**算出来的数**这一轮**不做** ✗
  // （它要在运行期才知道是不是数 ✓，而 `set_prop` 的值键那条路**不区分** ✓，
  //  真要做就得先问一次 `typeof` ✓——记在台账里 ✓，不静默挂错一格 ✗）。
  if (this.IsNumericInitializer(initializer)) {
    // **数值那一格**：键先**字符串化**再挂 ✓（`RtOp.ToString` ✓）。
    // **这一步不能省** ✗：`set_prop` 的键只认字符串 / 符号 ✓（`props.xl.md` 的 `KeyMatches` ✓，
    // 它见到别的就抛 `property keys must be strings or symbols` ✓）——
    // 而 `set_index` 那条路**会**帮忙字符串化 ✓（`vm.xl.md` 的 `RtOp.SetIndex` ✓，
    // 非数组接收者那一支走的就是 `RtToString` ✓），所以 `o[5] = v` 一直是好的 ✓，
    // 只有**这里**（拿数值当键、直接走 `set_prop`）需要自己转 ✓。
    // 少了它，`enum Color { Red }` 会在 `Color[0] = "Red"` 那一句上抛 ✓
    //（那句话听起来像「属性名的类型不对」✗，其实是**反向映射那一格少了一步** ✓）。
    const reverseKey = this.RtCall1(RtOp.ToString, value);
    this.SetPropertyValue(object, reverseKey, nameKey);
  }
  this.Release(nameKey);
}
// **绑定这个名字** ✓（与类声明走同一条路 ✓：`let` 那样的块作用域 ✓，不进 `Entries` ✗——
// 导出表装的是**函数** ✓，而 `enum` 是一个对象 ✓。它与 `const` 走同一条 ✓）。
this.BindName(TextOf(nameNode), object, false);
```

## method EnumLiteralValue:(text:string)=>int

**一个数值字面量的值**（第 230 轮 ✓）——`enum` 的自动累加要它 ✓。

**为什么要自己解一遍** ✗：`previous + 1` 要在**编译期**算出来 ✓（`IntConst(previous + 1)` ✓），
所以拿到的必须是**宿主侧的数** ✓，而不是一格要跑起来才知道的值 ✓。
而 `NumberFromText`（`text.xl.md` 那一族 ✓）是**降级层自己的** ✓——
它就是 `LowerExpression` 解数字字面量用的那一处 ✓（`text` 是源码原文 ✓）。

**十六进制 / 二进制 / 八进制 / 分隔符那几种都走它** ✓（`0x10` ✓、`0b101` ✓）——
**不在这里各写一遍** ✗：那是第二份会走偏的解析 ✓。

```ts
return NumberFromText(text);
```

## method IsNumericInitializer:(initializer:AstNode | null)=>bool

**这一格成员的值是不是一个数值**（第 230 轮 ✓）——**反向映射要不要挂**靠它 ✓。

**只认能证的两档** ✓（不猜 ✗）：
- **没有初始化式** ✓ ⇒ 一定是数值 ✓（自动累加那条路 ✓）；
- **初始化式是数值字面量** ✓（`NumericLiteral` ✓，含 `0x10` 那几种写法 ✓——
  投影把它们都投成 `NumericLiteral` ✓，`text` 里是原文 ✓）。

**其余一律给假** ✗：`A = 1 + 1` ✓、`A = other` ✓、字符串字面量 ✓——
**假的意思是「不挂反向那一格」** ✓，而 `enum { X = 1 + 1 }` 在 JS 里**是挂的** ✗
（那一格是 `C[2] = "X"` ✓）——所以这是一处**已知差** ✓，记在台账里 ✓。
**为什么不静默按「字符串」或「数值」猜一个** ✗：猜错了挂出来的是**一个错的键** ✓
（`C["2"]` 找不到 ✓），而那种错**不报错** ✗——「少挂一格」至少是**缺**，不是**错** ✓。

```ts
if (initializer === null) return true;
return NodeKind(initializer) === "NumericLiteral";
```

## method BindName:(name:string, value:int, isVar:bool)=>void

**把一个已经算好的值绑到一个名字上**——三条路（与 `LowerVariable` 同一套规则，
变量声明与解构都走它，**于是这条规则只有一处**）：

- **被捕获的名字**：只写环境格（一份状态一处存放）；
- **`var`**：用提升时占好的那一格（没找到说明收集漏了它 → 报出来）；
- **`let`/`const`**：现在占槽、现在声明名字。

```ts
const cell = this.CellOf(name);
if (cell >= 0) {
  this.Emit(Op.EnvSet, value, 0, cell, -1);
  return;
}
if (isVar) {
  const hoisted = this.VarSlotOf(name);
  if (hoisted < 0) throw new Error("internal: hoisted var was not collected: " + name);
  this.Emit(Op.Move, hoisted, value, -1, -1);
  return;
}
const slot = this.Reserve(1);
this.Emit(Op.Move, slot, value, -1, -1);
this.DeclareLocal(name, slot);
```

## method DestructureDefault:(initializer:AstNode, value:int)=>void

**解构元素上的默认值**：读出来的那一格**严格等于 `undefined`** 就用默认值 ✓。

**第 146 轮从 `Destructure` 里提出来的** ✓：声明那一半与赋值那一半（`DestructureAssign` ✓）
用的是**同一条规矩** ✓——留在两处就是两处会走偏 ✗，而这一条恰好有两处最容易写歪：

- **必须是严格相等，不能用 `is_nullish`** ✗：JS 的规矩是**只有 `undefined`** 触发默认值 ✓，
  `const {a = 7} = {a: null}` 里 `a` 是 **`null`** ✓（`??` 会把两者都算进去，那是另一个口径 ✗）。
  这一条与参数默认值（`LowerParamDefault`）**同一条理由** ✓，只是那里读的是参数格、
  这里读的是解构出来的格 ✓。
- **默认值是懒的** ✓（JS 的规矩 ✓）：只在**真的缺**的时候求 ✓，
  所以 `const [a = 1, b = a + 1] = []` 里 `b` 看得见 `a` ✓——它就在语句顺序里 ✓。

**它只写 `value` 那一格** ✓（`GetIndex` / `GetProp` / 剩下那两条内建给的都是一次性的临时格 ✓）：
调用方拿着的还是同一个槽号 ✓，不必关心「有没有被默认值换过」✓。

```ts
const undef = this.Reserve(1);
this.Emit(Op.Const, undef, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
const missing = this.RtCallValues(RtOp.CmpEqStrict, value, undef);
const skipDefault = this.Here();
this.Emit(Op.JumpIfFalse, missing, 0, -1, -1);
const fallback = this.LowerExpression(initializer);
this.Emit(Op.Move, value, fallback, -1, -1);
this.Release(fallback);
this.PatchTarget(skipDefault, this.Here());
this.Release(undef);
```

## method PropertyKeyNodeOf:(element:AstNode)=>AstNode | null

**一个成员位置上「拿走的键」是哪个节点**——对象的剩余元素要一份**排除名单** ✓
（`const {a, ...r} = o` 里的 `r` 不该带 `a` ✓），名单就是**前面那些成员拿走的键** ✓。

**为什么要一个共用函数**（第 146 轮）✓：**声明**那一半（`BindingElement` ✓）与**赋值**那一半
（`PropertyAssignment` / `ShorthandPropertyAssignment` / 带默认值的 `BinaryExpression` ✓）
形状不同 ✗，但取键的规矩**是同一条**：**键从模式上取、不从绑定的名字上取** ✓——
`{a: b, ...r}` 拿走的是 **`a`** ✓（不是 `b` ✗），`{a: b = 1, ...r}` 拿走的也是 `a` ✓。
两处各写一遍就是两处会走偏 ✗：走偏的症状是「剩余对象里**多出一个已经拆走的键**」✓，
而它看起来只是一个普通的对象 ✓（**静默错值** ✓）。

```ts
const kind = NodeKind(element);
if (kind === "BindingElement") {
  const property = OptionalChild(element, "propertyName");
  return property === null ? Child(element, "name") : property;
}
if (kind === "PropertyAssignment") return Child(element, "name");
if (kind === "ShorthandPropertyAssignment") return Child(element, "name");
if (kind === "BinaryExpression") return Child(element, "left");
return null;
```

## method StaticKeyNodeOf:(keyNode:AstNode)=>AstNode | null

**名单里能用的那个键节点**（第 146 轮）——`Identifier` ✓、字面量 ✓、**常量的计算键** ✓
（`["a"]` / `[1]` 投影成 `ComputedPropertyName` ✓，但里面是字面量 ✓，编译期就知道是哪个键 ✓）
都给得出 ✓；**运行期才求值的**（`[k]` / `[keyOf()]` ✓）给 `null` ✓。

**它只服务一件事**：对象的剩余元素要一份**排除名单** ✓，而那份名单是编译期的常量表 ✓。
常量与运行期两档分不清的代价是**静默漏键** ✗（剩余对象里多出一个已经拆走的键 ✓），
所以这一档必须显式判 ✓。

```ts
if (NodeKind(keyNode) === "ComputedPropertyName") {
  const inner = Child(keyNode, "expression");
  const innerKind = NodeKind(inner);
  if (innerKind === "StringLiteral" || innerKind === "NumericLiteral") return inner;
  return null;
}
return keyNode;
```

## method MaterializeIterable:(source:int)=>int

**把「一个可迭代的东西」变成按位置读的数组**（第 151 轮；**生成器第 199 轮** ✓）——
走 `GetIterator` + `IterDrain` 两条**既有的**语言内建调用 ✓
（`for..of` 的第一步就是前者 ✓，展开的第二步也是后者那一族 ✓）。

**它给什么** ✓（`install.xl.md` 的 `GetIterator` / `IterDrain` 两节是权威 ✓）：
`Map` → `[键, 值]` 对的数组 ✓、`Set` → 值的数组 ✓、**生成器 → 走完它、收成数组** ✓、
数组 → 原样（不拷贝 ✓）、字符串 → 逐码元的数组 ✓、
其余非可迭代物 → **响亮地抛** ✓（JS 在解构不可迭代物时也是 `TypeError` ✓）。

**为什么数组模式要过它** ✗：`const [a, b] = new Set([1, 2])` 原来在 Set 对象上
`get_index` ✓ → **静默**给两个 `undefined` ✗（JS 给 `1, 2` ✓）。
**静默错值**是本仓排序里最靠前的一档 ✗，而修法只是「接上早就有的那一条口径」✓。

**第二步（`IterDrain`）是第 199 轮补的** ✓：第 151 轮只做到 `GetIterator` ✓，
而它对**生成器原样返回** ✗（那是 `for..of` 那条**惰性**路要的形状 ✓）——
于是 `const [a, b] = g()` 按位置读一个生成器 ✗，**静默给 `undefined undefined`** ✗
（JS 给产出的头两个 ✓）。两步各管一半 ✓：`Map` / `Set` 是语言的事 ✓、
生成器是引擎的事 ✓（`IterDrain` 把引擎那张 `drain` 借出来 ✓）。

```ts
const window = this.Reserve(2);
this.Emit(Op.Const, window, this.IntConst(GetIteratorId), -1, -1);
this.Emit(Op.Move, window + 1, source, -1, -1);
this.EmitRt(RtOp.HostCall, window, window, 2);
// **第二趟在同一个窗口里做**（第 199 轮 ✓）——**这是水位那一条规矩逼出来的写法** ✗：
// 先预留第二个窗口、再 `Release(window)` 会把**第二趟的结果格一起退掉** ✓
//（「退到先预留的东西那儿，等于把后来预留的活格全部交出去」✓，第 40 轮那条注释 ✓）。
// 所以：把上一趟的结果**挪到第二格** ✓、把新号写进第一格 ✓——窗口还是那两格 ✓，
// 退水位只退到 `window + 1` ✓（结果在 `window` ✓ 保住 ✓，与 `RtCall1` 最后那一句同款 ✓）。
this.Emit(Op.Move, window + 1, window, -1, -1);
this.Emit(Op.Const, window, this.IntConst(IterDrainId), -1, -1);
this.EmitRt(RtOp.HostCall, window, window, 2);
// 结果落在窗口第一格；参数那一格可以还回去了 ✓。
this.Release(window + 1);
return window;
```

## method Destructure:(pattern:AstNode, source:int, isVar:bool)=>void

**把一个值拆进绑定模式**（`{a, b: c}` / `[x, , y]`，可嵌套）。

**默认值（第 132 轮）**：`const [x = 9] = []` / `const {a = 7} = {}` ✓——
落成「读出来的那一格**严格等于 `undefined`** 就用默认值」✓，**那一条的规矩现在在
`DestructureDefault` 里** ✓（第 146 轮提出去与赋值那一半共用 ✓）。

**数组剩余（第 132 轮）**：`const [a, ...r] = xs` ✓——落成 `ArrayRestId` 那条内建调用 ✓
（**不走 `Array.prototype.slice`** ✗：解构是**语法**，不该依赖某个方法装没装 ✓）。

**对象剩余（第 135 轮）**：`const {a, ...r} = o` ✓——要「把剩下的键抄到新对象里」✓，
而那需要**一份排除名单**（已经拆走的那些键 ✓）。名单由 `PropertyKeyNodeOf` 从**模式**上取 ✓
（第 146 轮起那个取键规则也归它 ✓），落成 `RestObjectId` 那条内建调用 ✓。

```ts
const kind = NodeKind(pattern);
if (kind !== "ObjectBindingPattern" && kind !== "ArrayBindingPattern") {
  throw new Error("unimplemented: binding pattern " + kind);
}
const elements = ListOf(pattern, "elements");
// **数组模式先过迭代协议**（第 151 轮）✓：`GetIterator` 把 `Set` / `Map` / 字符串
// 变成**按位置读的数组** ✓（数组原样返回 ✓；生成器原样返回 ✗——那一档要引擎发
// `iter_next` ✓，是**另一轮**的事 ✓，本轮的判据把它钉在明处 ✓）。
//
// **为什么必须换** ✗：数组模式原来一路 `get_index(source, i)` ✓——
// `const [a, b] = new Set([1, 2])` 在 Set 对象上读不到东西 ✓，
// 于是**静默**给两个 `undefined` ✗（JS 给 `1, 2` ✓）。**静默错值**是本仓排最前的档 ✗。
// 而这条规矩**早就有** ✓（`for..of` 与 `[...xs]` 都先过 `GetIterator` ✓）——
// 「一串值从哪来」只有这一处口径 ✓，数组模式接上去就是了 ✓。
const items = kind === "ArrayBindingPattern" ? this.MaterializeIterable(source) : source;
for (let i = 0; i < elements.length; i++) {
  const element = elements[i];
  if (NodeKind(element) === "OmittedExpression") continue;
  if (NodeKind(element) !== "BindingElement") {
    throw new Error("unimplemented: binding element " + NodeKind(element));
  }
  // **剩余元素**：数组那一种给新数组 ✓，对象那一种给**去掉已拆键的新对象** ✓（第 135 轮）。
  if (OptionalChild(element, "dotDotDotToken") !== null) {
    const restTarget = Child(element, "name");
    if (NodeKind(restTarget) !== "Identifier") {
      throw new Error("unimplemented: binding name " + NodeKind(restTarget));
    }
    const restWindow = this.Reserve(3);
    if (kind === "ArrayBindingPattern") {
      this.Emit(Op.Const, restWindow, this.IntConst(ArrayRestId), -1, -1);
      this.Emit(Op.Move, restWindow + 1, items, -1, -1);
      this.Emit(Op.Const, restWindow + 2, this.IntConst(i), -1, -1);
      this.EmitRt(RtOp.HostCall, restWindow, restWindow, 3);
      this.BindName(TextOf(restTarget), restWindow, isVar);
      // **剩余是最后一个** ✓（语法规定的 ✓）：绑定完就没有下一项了 ✓。
      // **这里不退水位** ✗——与上面那条「不退」是同一条纪律 ✓：`BindName` 可能刚在
      // `restWindow` 上面留了变量格 ✓，退过去会把那个变量格交出去 ✗
      //（症状是「几条语句之后读到别人的值」✗，而现场离得很远 ✗）。
      return;
    }
    // **对象剩余**：名单是**前面那些成员拆走的键** ✓（编译期算好 ✓）——
    // 造一个小数组把键放进去 ✓，再交给 `rest_object` ✓（与 `SpreadIntoId` 同一个写法 ✓）。
    // **键从模式上取、不从绑定的名字上取** ✗：`{a: b, ...r}` 拿走的是 `a` ✓（不是 `b` ✗）——
    // 与下面读值那一段用的是**同一个取键规则** ✓（`propertyName` 优先 ✓）。
    const excluded = this.Reserve(1);
    this.EmitRt(RtOp.NewArray, excluded, excluded, 0);
    for (let e = 0; e < i; e++) {
      const earlier = elements[e];
      if (NodeKind(earlier) === "OmittedExpression") continue;
      const keyNode = this.PropertyKeyNodeOf(earlier);
      // **取不到键的（`...rest` 那一条）跳过** ✓：它本来就不是「拆走的键」✓。
      if (keyNode === null) continue;
      const at = this.RtCall2(RtOp.GetProp, excluded,
        this.Program().AddConst(Constant.OfString(UnitsOf("length"))));
      const put = this.Reserve(3);
      this.Emit(Op.Move, put, excluded, -1, -1);
      this.Emit(Op.Move, put + 1, at, -1, -1);
      this.Emit(Op.Const, put + 2,
        this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(keyNode))), -1, -1);
      this.EmitRt(RtOp.SetIndex, put, put, 3);
      this.Release(put);
      this.Release(at);
    }
    this.Emit(Op.Const, restWindow, this.IntConst(RestObjectId), -1, -1);
    this.Emit(Op.Move, restWindow + 1, source, -1, -1);
    this.Emit(Op.Move, restWindow + 2, excluded, -1, -1);
    this.EmitRt(RtOp.HostCall, restWindow, restWindow, 3);
    this.BindName(TextOf(restTarget), restWindow, isVar);
    return;
  }
  // **数组模式先过迭代协议**（第 151 轮）✓：`GetIterator` 把 `Set` / `Map` / 字符串
  // 变成**按位置读的数组** ✓（数组原样返回 ✓；生成器原样返回 ✗——那一档要引擎发
  // `iter_next` ✓，是**另一轮**的事 ✓，本轮的判据把它钉在明处 ✓）。
  //
  // **为什么必须换** ✗：数组模式原来一路 `get_index(source, i)` ✓——
  // `const [a, b] = new Set([1, 2])` 在 Set 对象上读不到东西 ✓，
  // 于是**静默**给两个 `undefined` ✗（JS 给 `1, 2` ✓）。**静默错值**是本仓排最前的档 ✗。
  // 而这条规矩**早就有** ✓（`for..of` 与 `[...xs]` 都先过 `GetIterator` ✓）——
  // 「一串值从哪来」只有这一处口径 ✓，数组模式接上去就是了 ✓。
  let value = -1;
  if (kind === "ObjectBindingPattern") {
    const keyNode = this.PropertyKeyNodeOf(element);
    if (keyNode === null) throw new Error("unimplemented: object binding member");
    const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(keyNode)));
    value = this.RtCall2(RtOp.GetProp, source, key);
  } else {
    const index = this.Program().AddConst(Constant.OfInt(i));
    value = this.RtCall2(RtOp.GetIndex, items, index);
  }
  // **默认值**（第 132 轮；第 146 轮起那一段在 `DestructureDefault` 里 ✓，与赋值那一半共用 ✓）。
  const initializer = OptionalChild(element, "initializer");
  if (initializer !== null) this.DestructureDefault(initializer, value);
  const target = Child(element, "name");
  const targetKind = NodeKind(target);
  if (targetKind === "ObjectBindingPattern" || targetKind === "ArrayBindingPattern") {
    this.Destructure(target, value, isVar);
    continue;
  }
  if (targetKind !== "Identifier") {
    throw new Error("unimplemented: binding name " + targetKind);
  }
  // 同样**不退水位**（`BindName` 可能刚在 `value` 上面留了变量格）。
  this.BindName(TextOf(target), value, isVar);
}
```

## method DestructureAssign:(pattern:AstNode, source:int)=>void

**把一个值拆进赋值目标**（`[a, b] = [b, a]` / `({a, b: o.x} = src)`，可嵌套）——第 146 轮。

**它与 `Destructure`（声明那一半）是同一条规矩的两种落点** ✓：读法**一个字都不差** ✓
（对象按属性名 ✓、数组按下标 ✓、剩余走那两个内建 ✓、默认值只在**严格 `undefined`** 时求 ✓
——最后那一条现在两半共用 `DestructureDefault` ✓）；差别只在**写进去那一步** ✗：

| | 声明那一半（`Destructure`） | 赋值这一半（本方法） |
| --- | --- | --- |
| 左边是什么 | **绑定模式**（`ObjectBindingPattern` / `ArrayBindingPattern` ✓） | **值位的那两个字面量节点**（`ObjectLiteralExpression` / `ArrayLiteralExpression` ✓）——投影给的就是这个形状 ✓（TS 的 AST 就是这么定的 ✓） |
| 目标 | `Identifier`（**新声明**一个名字 ✓） | `Identifier`（**已经存在**的名字 ✓）、`o.x` ✓、`o[k]` ✓、再嵌一层模式 ✓ |
| 写 | `BindName`（可能在**当前水位之上**留一格 ✓） | `StoreAssignTarget`（只写已存在的槽 / 属性 ✓，**不留新格** ✓） |

**为什么值得单独一个方法、而不是给 `Destructure` 加两个开关** ✗：两边「临时量能不能退水位」
是**相反**的 ✓——声明那一半因为 `BindName` 会占新格，所以**一律不退** ✓（退了就把变量格
交出去 ✗）；赋值这一半**一格格都不声明** ✓，临时量该退就退 ✓。
用一个布尔开关表达这件事，等于**两套水位纪律挤进一个函数** ✗——
那是这个文件里最容易出错的一类形状 ✓（「几条语句之后读到别人的值」✓，现场离得很远 ✓）。

**求值顺序照 JS** ✓：右边**先算完** ✓（调用方算的 ✓），然后目标**从左到右**一个个写 ✓；
`o.x` 的接收者 `o` 在**轮到它的时候**才求值 ✓（`[o.a, o.b] = …` 里两次读 `o` ✓）。
**先读、后写接收者** ✓（`({a: o.x} = src)` 的顺序是「算 `src` → 取 `src.a` → 求 `o` → 写」✓）。

**一个名字都没声明** ✓：赋值左边那个名字必须**已经存在** ✓——`ResolveAccess` 找不到就抛
「name is not a local or a capture」✓，与模块里的严格模式同一条口径 ✓
（**不静默造一个全局** ✗，那正是「静默错值」的形状 ✓）。

```ts
const kind = NodeKind(pattern);
if (kind === "ArrayLiteralExpression") {
  const elements = ListOf(pattern, "elements");
  // **赋值那一半与声明那一半同一条口径** ✓（第 151 轮）：先过 `GetIterator` ✓，
  // 于是 `[a, b] = new Set([1, 2])` 给 `1, 2` ✓（原来**静默**给两个 `undefined` ✗）。
  const items = this.MaterializeIterable(source);
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const elementKind = NodeKind(element);
    // **跳过位**（`[a, , b] = xs` ✓）：它不读也不写 ✓（JS 的口径 ✓）。
    if (elementKind === "OmittedExpression") continue;
    if (elementKind === "SpreadElement") {
      // **剩余是最后一个** ✓（语法规定的 ✓），落成与声明那一半**同一个**内建 ✓
      //（`ArrayRestId` ✓）——「剩下的怎么算」只有一份实现 ✓。
      const restWindow = this.Reserve(3);
      this.Emit(Op.Const, restWindow, this.IntConst(ArrayRestId), -1, -1);
      this.Emit(Op.Move, restWindow + 1, items, -1, -1);
      this.Emit(Op.Const, restWindow + 2, this.IntConst(i), -1, -1);
      this.EmitRt(RtOp.HostCall, restWindow, restWindow, 3);
      this.StoreAssignTarget(Child(element, "expression"), restWindow);
      this.Release(restWindow);
      return;
    }
    const index = this.Program().AddConst(Constant.OfInt(i));
    const read = this.RtCall2(RtOp.GetIndex, items, index);
    // **默认值先于目标认领** ✓：`[a = 1] = []` 的元素节点是 `a = 1`（一个 `BinaryExpression` ✓），
    // 「谁是目标、谁默认值」由 `DestructureTarget` 认 ✓（与对象那一半同一个函数 ✓）。
    const target = this.DestructureTarget(element, read);
    this.StoreAssignTarget(target, read);
    this.Release(read);
  }
  return;
}
if (kind === "ObjectLiteralExpression") {
  const properties = ListOf(pattern, "properties");
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const propertyKind = NodeKind(property);
    if (propertyKind === "SpreadAssignment") {
      // **对象剩余**：名单是**前面那些成员拆走的键** ✓（与声明那一半同一条取键规则 ✓）。
      const excluded = this.Reserve(1);
      this.EmitRt(RtOp.NewArray, excluded, excluded, 0);
      for (let e = 0; e < i; e++) {
        const keyNode = this.PropertyKeyNodeOf(properties[e]);
        if (keyNode === null) continue;
        // **计算键与剩余不能一起用** ✗——但要分清两种计算键 ✓：
        //   · **常量**（`["a"]` / `[1]` ✓）：编译期就知道是哪个键 ✓，名单照样放得进去 ✓；
        //   · **运行期才求值的**（`[k]` / `[keyOf()]` ✓）：名单是**编译期的常量表** ✗——
        //     要支持它就得「把键值一路留着」✗ 或者「到这儿再重算一遍」✗，
        //     而后者会让那个表达式的**副作用跑两遍** ✓（那是静默错值 ✗）。
        //     所以**响亮地抛** ✓，绝不静默漏掉一个键 ✗——
        //     漏掉的症状只是「剩余对象里多出一个已经拆走的键」✓，看起来是一个完全正常的对象 ✓。
        const staticKey = this.StaticKeyNodeOf(keyNode);
        if (staticKey === null) throw new Error("unimplemented: object rest after a computed key");
        const at = this.RtCall2(RtOp.GetProp, excluded,
          this.Program().AddConst(Constant.OfString(UnitsOf("length"))));
        const put = this.Reserve(3);
        this.Emit(Op.Move, put, excluded, -1, -1);
        this.Emit(Op.Move, put + 1, at, -1, -1);
        this.Emit(Op.Const, put + 2,
          this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(staticKey))), -1, -1);
        this.EmitRt(RtOp.SetIndex, put, put, 3);
        this.Release(put);
        this.Release(at);
      }
      const restWindow = this.Reserve(3);
      this.Emit(Op.Const, restWindow, this.IntConst(RestObjectId), -1, -1);
      this.Emit(Op.Move, restWindow + 1, source, -1, -1);
      this.Emit(Op.Move, restWindow + 2, excluded, -1, -1);
      this.EmitRt(RtOp.HostCall, restWindow, restWindow, 3);
      this.StoreAssignTarget(Child(property, "expression"), restWindow);
      this.Release(restWindow);
      return;
    }
    // **三种成员形状**（投影给的就是这三种 ✓，见 `PropertyKeyNodeOf` 那一段 ✓）：
    //   · `{a: target}`  → `PropertyAssignment`（`initializer` 是**目标**，不是默认值 ✗）
    //   · `{a}`          → `ShorthandPropertyAssignment`（键与目标同一个名字 ✓）
    //   · `{a = 1}`      → `BinaryExpression`（左边目标、右边默认值 ✓）
    // 键那一格还可能是**计算键**（`{[k]: v}` → `ComputedPropertyName` ✓，第 146 轮收下 ✓）：
    // 那就把键**当表达式求一次** ✓（`GetProp` 有一条收值形式的键 ✓，与 `o[k]` 那条同路 ✓）。
    const keyNode = this.PropertyKeyNodeOf(property);
    if (keyNode === null) throw new Error("unimplemented: object assignment member " + propertyKind);
    const computed = NodeKind(keyNode) === "ComputedPropertyName";
    if (!computed && NodeKind(keyNode) !== "Identifier" && NodeKind(keyNode) !== "StringLiteral"
      && NodeKind(keyNode) !== "NumericLiteral") {
      throw new Error("unimplemented: destructuring assignment with this key: " + NodeKind(keyNode));
    }
    let read = -1;
    if (computed) {
      // **键当值用** ✓：走 `get_index` 那条（与 `o[k]` 同一条 ✓）——
      // **不能走 `get_prop`** ✗：那条只收字符串 / 符号的键 ✓，
      // 而 `({[1]: n} = …)` 的键是一个**数** ✓（JS 会把它 `ToPropertyKey` 成 `"1"` ✓，
      // 引擎的 `get_index` 正是「非数组接收者就把键字符串化之后走属性」那一条 ✓）。
      const keyValue = this.LowerExpression(Child(keyNode, "expression"));
      read = this.RtCallValues(RtOp.GetIndex, source, keyValue);
      this.Release(keyValue);
    } else {
      const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(keyNode)));
      read = this.RtCall2(RtOp.GetProp, source, key);
    }
    // **`{a: target}` 的 `initializer` 是目标** ✓、**`{a}` 的键就是目标** ✓——
    // 两者都先过 `DestructureTarget` ✓：它只对「带默认值的 `BinaryExpression`」动手 ✓，
    // 其余原样返回 ✓（于是三种形状在这里收成一条路 ✓）。
    let target: AstNode = property;
    if (propertyKind === "ShorthandPropertyAssignment") target = Child(property, "name");
    if (propertyKind === "PropertyAssignment") target = Child(property, "initializer");
    target = this.DestructureTarget(target, read);
    this.StoreAssignTarget(target, read);
    this.Release(read);
  }
  return;
}
throw new Error("unimplemented: assignment pattern " + kind);
```

## method DestructureTarget:(element:AstNode, value:int)=>AstNode

**元素位置上「目标 + 可选默认值」那一段**（第 146 轮）——认出「带默认值的元素」并把默认值
按 `DestructureDefault` 那条规矩接上 ✓，返回**真正的目标** ✓。

**为什么要有它** ✓：带默认值的元素在投影里是**一个 `BinaryExpression`** ✓
（`[a = 1]` ✓、`{a = 1}` ✓、`({a: {b} = {}}` 里的 `{b} = {}` ✓），
而「左边是目标、右边是默认值」这条判据在**数组元素**与**对象成员**两处都要用 ✓——
两处各写一遍就是两处会走偏 ✗（写反了是把默认值当目标写进去 ✓，而**写进去也不报错** ✗）。

```ts
if (NodeKind(element) !== "BinaryExpression") return element;
const operator = Child(element, "operatorToken");
if (TextOf(operator) !== "=") {
  throw new Error("unimplemented: destructuring element with " + TextOf(operator));
}
this.DestructureDefault(Child(element, "right"), value);
return Child(element, "left");
```

## method StoreAssignTarget:(target:AstNode, value:int)=>void

**把一格值写进一个赋值目标**（第 146 轮）——四种目标：**已存在的名字** ✓、`o.x` ✓、
`o[k]` ✓、**再嵌一层模式** ✓（`[a, [b]] = xs` ✓）。

**它一个变量都不声明** ✗：名字走 `ResolveAccess` ✓（找不到就抛 ✓），
所以临时量**可以**照常退水位 ✓——这正是它与声明那一半的 `BindName` 的差别 ✓
（那一半退水位会把刚声明的变量格交出去 ✗）。

**属性那一支照 `=` 的老路** ✓（`SetPropertyConst` ✓）：求值顺序（接收者 → 键 → 值 ✓）
与那个分支一字不差 ✓——两处都是「写一个属性」✓，不必有第二种写法 ✓。

```ts
const kind = NodeKind(target);
if (kind === "Identifier") {
  const access = this.ResolveAccess(TextOf(target));
  if (access.InEnv) {
    this.Emit(Op.EnvSet, value, access.Depth, access.Cell, -1);
    return;
  }
  this.Emit(Op.Move, access.Slot, value, -1, -1);
  return;
}
if (kind === "PropertyAccessExpression") {
  const receiver = this.LowerExpression(Child(target, "expression"));
  const name = Child(target, "name");
  const nameKind = NodeKind(name);
  if (nameKind !== "Identifier" && nameKind !== "StringLiteral" && nameKind !== "NumericLiteral"
    && nameKind !== "PrivateIdentifier") {
    throw new Error("unimplemented: destructuring assignment to a computed property name");
  }
  const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(name)));
  this.SetPropertyConst(receiver, key, value);
  this.Release(receiver);
  return;
}
if (kind === "ElementAccessExpression") {
  const receiver = this.LowerExpression(Child(target, "expression"));
  const index = this.LowerExpression(Child(target, "argumentExpression"));
  const window = this.Reserve(3);
  this.Emit(Op.Move, window, receiver, -1, -1);
  this.Emit(Op.Move, window + 1, index, -1, -1);
  this.Emit(Op.Move, window + 2, value, -1, -1);
  this.EmitRt(RtOp.SetIndex, window, window, 3);
  this.Release(window);
  this.Release(receiver);
  return;
}
// **再嵌一层模式**（`[a, [b]] = xs` ✓ / `({a: {b}} = o)` ✓）：递归 ✓。
if (kind === "ArrayLiteralExpression" || kind === "ObjectLiteralExpression") {
  this.DestructureAssign(target, value);
  return;
}
throw new Error("unimplemented: assignment target " + kind);
```

## method LowerIf:(node:AstNode)=>void

`if`：条件 → 假则跳走 → 真分支 → （有 `else` 时）跳过假分支 → 假分支。

**回填**：「跳走」的目标要等那一段发完才知道，所以先发一条目标为 0 的，
记下它的下标，段落结束时回填——这是所有前向跳转的通用做法。

```ts
const condition = this.LowerExpression(Child(node, "expression"));
const skipIndex = this.Here();
this.Emit(Op.JumpIfFalse, condition, 0, -1, -1);
this.Release(condition + 1);
this.LowerStatement(Child(node, "thenStatement"));
const elseStatement = OptionalChild(node, "elseStatement");
if (elseStatement === null) {
  this.PatchTarget(skipIndex, this.Here());
  return;
}
const endIndex = this.Here();
this.Emit(Op.Jump, -1, 0, -1, -1);
this.PatchTarget(skipIndex, this.Here());
this.LowerStatement(elseStatement);
this.PatchTarget(endIndex, this.Here());
```

## method LowerWhile:(node:AstNode)=>void

`while`：回到条件那一条的 pc，假则跳出。

```ts
const start = this.Here();
const context = this.EnterLoop(true, start);
const condition = this.LowerExpression(Child(node, "expression"));
const exitIndex = this.Here();
this.Emit(Op.JumpIfFalse, condition, 0, -1, -1);
this.Release(condition + 1);
this.LowerStatement(Child(node, "statement"));
this.Emit(Op.Jump, -1, start, -1, -1);
this.PatchTarget(exitIndex, this.Here());
this.LeaveLoop(context);
```

## method LowerDo:(node:AstNode)=>void

`do { … } while (cond)`（第 93 轮补）：**先跑一遍体、再看条件**（条件在**底**）——
这是它与 `while` 的唯一区别，而这个区别是语义（体至少执行一次）。

**`continue` 的目标在底部**（测试那一条），所以它**不能在 `EnterLoop` 时给**：
先进上下文（先给 `start` 占位）、跑完体之后再 `context.ContinueTarget = this.Here()`——
`for` 的**更新那一段**也是这么补的（同一个字段，见 `LowerFor`）。

**`continue` 不能直接跳到 `start`**：那样会把体**再跑一遍**（`while` 的 `continue` 跳的是条件，
而这里的体已经在条件前面了）。这一条是 `do..while` 最容易写错的地方。

```ts
const start = this.Here();
const context = this.EnterLoop(true, start);
this.LowerStatement(Child(node, "statement"));
context.ContinueTarget = this.Here();
const condition = this.LowerExpression(Child(node, "expression"));
const negated = this.RtCall1(RtOp.Not, condition);
this.Emit(Op.JumpIfFalse, negated, start, -1, -1);
this.Release(negated + 1);
this.LeaveLoop(context);
```

## method RtCall2:(id:int, first:int, secondConst:int)=>int

用「**一格现成的值 + 一个常量**」拼出两格参数窗口，发一条 `rt_call`，返回结果格。

**为什么要这个小工具**：`get_index(x, 1)`、`iter_next(it, undefined)` 这类形状在
`for..of` 的降级里出现四次。**四次手写窗口，就有四次把槽算错的机会**——
而算错槽的表现是「值悄悄换成别的」，不是崩溃。

```ts
const window = this.Reserve(2);
this.Emit(Op.Move, window, first, -1, -1);
this.Emit(Op.Const, window + 1, secondConst, -1, -1);
const result = this.Reserve(1);
this.EmitRt(id, result, window, 2);
// **别退到结果格以下**：它就是这次调用的产物，退了，下一次分配就会盖掉它
// （`for..in` 那条路上正是这么翻车的：取到的 `Object.keys` 被下一个临时格覆盖，
// 报出来的却是「调用了非闭包的值」）。
this.Release(result + 1);
return result;
```

## method RtCall1:(id:int, first:int)=>int

一格现成的值 + 一条 `rt_call`，返回结果格（见 `RtCall2` 的理由）。

```ts
const window = this.Reserve(1);
this.Emit(Op.Move, window, first, -1, -1);
const result = this.Reserve(1);
this.EmitRt(id, result, window, 1);
// **别退到结果格以下**：它就是这次调用的产物，退了，下一次分配就会盖掉它
// （`for..in` 那条路上正是这么翻车的：取到的 `Object.keys` 被下一个临时格覆盖，
// 报出来的却是「调用了非闭包的值」）。
this.Release(result + 1);
return result;
```

## method LowerDeclarationList:(list:AstNode)=>void

一个声明列表（`let a = 1, b = 2`）：逐个走 `LowerVariable`，**`var` 的标志从列表上读**。

**它与 `VariableStatement` 是两个节点**：语句里包一个列表，
而 `for (let i = 0; …)` 的初始化**直接就是列表**（没有那层 `VariableStatement`）。
把两者当成一个，`for` 的初始化就会掉进表达式那条路——报的是
`unimplemented: expression VariableDeclarationList`。

```ts
const isVar = IsVarList(list);
const declarations = ListOf(list, "declarations");
for (let i = 0; i < declarations.length; i++) {
  this.LowerVariable(declarations[i], isVar);
}
```

## method LowerFor:(node:AstNode)=>void

`for(;;)`：初始化 → 条件 → 体 → 更新 → 回到条件。**全是跳转**，不需要新指令。

**`for (let i = …)` 每次迭代新建绑定**：每个闭包捕到**自己那一轮**的 `i`。

做法是**每轮一个新环境**（父链是上一轮那个）：

    PushScope
    EnvNew(envSlot, n)          ; 第 1 轮的环境
    [把循环变量声明成这一层的环境格]
    初始化（写进格，只跑一次）
    start:
      条件 → 假则跳出口
      体
      EnvNew(envSlot, n)        ; 下一轮的环境（父链 = 当前）
      每一格：EnvGet(临时, 1, c) → EnvSet(临时, 0, c)   ; 从上一轮拷进新一轮
      更新（**在新环境里跑**，JS 语义）
      Jump start
    出口:

**拷贝那一小段用的是显式深度**（读 depth 1 = 上一轮、写 depth 0 = 这一轮），
因为**名字解析在这里帮不上忙**：它只知道「这个名字在哪一层」，而这一次我们要的是
「同一个格号，在两个相邻的层之间搬」。每一轮的环境**格数相同、含义相同**，所以
格号直接照抄。

**什么时候才走这条路**：初始化是 `let`/`const`（不是 `var`）**并且体里有函数值**。
这是一个**保守但便宜**的判据——多建几个环境只是慢一点，**少建一次就是错值**。
体里没有函数值时（最常见的那种循环）走原来那条路：循环变量住槽里，一步不多。

```ts
this.PushScope();
const initializer = OptionalChild(node, "initializer");
const perIteration = initializer !== null
  && NodeKind(initializer) === "VariableDeclarationList"
  && !IsVarList(initializer)
  && HasNestedFunction(Child(node, "statement"), 0);
let envSlot = -1;
let scratch = -1;
let cells = 0;
let names: string[] = [];
if (perIteration) {
  const declarations = ListOf(initializer as AstNode, "declarations");
  for (let i = 0; i < declarations.length; i++) {
    const name = Child(declarations[i], "name");
    if (NodeKind(name) !== "Identifier") {
      throw new Error("unimplemented: per-iteration binding with a pattern");
    }
    names.push(TextOf(name));
  }
  cells = names.length;
  envSlot = this.Reserve(1);
  scratch = this.Reserve(1);
  this.Emit(Op.EnvNew, envSlot, cells, -1, -1);
  const scope = new EnvScope(envSlot);
  for (let i = 0; i < names.length; i++) scope.Declare(names[i], i);
  this.Env.Push(scope);
}
if (initializer !== null) {
  if (NodeKind(initializer) === "VariableDeclarationList") {
    this.LowerDeclarationList(initializer);
  } else {
    this.LowerExpression(initializer);
  }
}
const start = this.Here();
const context = this.EnterLoop(true, 0);
const condition = OptionalChild(node, "condition");
let exitIndex = -1;
if (condition !== null) {
  const value = this.LowerExpression(condition);
  exitIndex = this.Here();
  this.Emit(Op.JumpIfFalse, value, 0, -1, -1);
  this.Release(value + 1);
}
this.LowerStatement(Child(node, "statement"));
// `continue` 在这里落点：每轮的新环境也要建（否则 `continue` 就绕过了它）。
context.ContinueTarget = this.Here();
if (perIteration) {
  this.Emit(Op.EnvNew, envSlot, cells, -1, -1);
  for (let i = 0; i < cells; i++) {
    this.Emit(Op.EnvGet, scratch, 1, i, -1);
    this.Emit(Op.EnvSet, scratch, 0, i, -1);
  }
}
const incrementor = OptionalChild(node, "incrementor");
if (incrementor !== null) {
  this.LowerExpression(incrementor);
}
this.Emit(Op.Jump, -1, start, -1, -1);
if (exitIndex >= 0) {
  this.PatchTarget(exitIndex, this.Here());
}
this.LeaveLoop(context);
if (perIteration) this.Env.Pop();
this.PopScope();
```

## method LowerForOf:(node:AstNode)=>void

`for..of`：走**迭代协议**（`iter_new` / `iter_next`）。

**分派在引擎内部按载荷做**（数组给游标、生成器给生成器自己，见 `vm.xl.md` 的
`DoIterNext`），所以这里**不必先判断被迭代者是什么**——IR 里也没有这种指令。

**`iter_next` 收两个参数**（迭代器与「送进去的值」）：`for..of` 不送值，
所以送 `undefined`（常量池里那一个）。**`done` 是布尔**，所以 `JumpIfFalse` 直接可用。

```ts
this.PushScope();
// **先把「要被迭代的值」交给语言层过一遍**（`get_iterator`，号段 700..799，第 111 轮补）：
// 引擎只认**数组与生成器**，而 `Map`/`Set` 是语言层的对象——让引擎认识它们就反了分层 ✗。
// 语言层这一步对数组与生成器**原样返回** ✓，对 `Map` 给 `[键, 值]` 对的数组 ✓（正是 JS 的形状），
// 对 `Set` 给值的数组 ✓。**一个引擎算子都不用加**，`iter_next` 那边一行也不改 ✓。
// 形状与「宿主能力调用」完全一样：`[号, 参数…]` 窗口 + 一条 `host_call`。
// **宿主不必知道它**：格数由 `BuiltinSlots()` 公布、登记由 `InstallBuiltins` 包掉（第 111 轮）。
const iterableSource = this.Reserve(1);
this.LowerInto(iterableSource, Child(node, "expression"));
const iterableWindow = this.Reserve(2);
this.Emit(Op.Const, iterableWindow, this.IntConst(GetIteratorId), -1, -1);
this.Emit(Op.Move, iterableWindow + 1, iterableSource, -1, -1);
this.EmitRt(RtOp.HostCall, iterableWindow, iterableWindow, 2);
// 结果落在窗口第一格；退到它「之上」（参数那一格可以还回去了）。
this.Release(iterableWindow + 1);
this.LowerIterationLoop(iterableWindow, node);
```

## method LowerIterationLoop:(iterableSlot:int, node:AstNode)=>void

**`for..of` 与 `for..in` 共用的循环尾**：拿到一个「可迭代的东西」之后，剩下的完全一样。

**抽出来是因为它有一处易错的极性**（下面那条注释）——**两处各写一遍就会漂一次**。

```ts
const iteratorSlot = this.Reserve(1);
this.EmitRt(RtOp.IterNew, iteratorSlot, iterableSlot, 1);
const undefinedConst = this.Program().AddConst(Constant.OfUndefined());
const start = this.Here();
const context = this.EnterLoop(true, start);
const pair = this.RtCall2(RtOp.IterNext, iteratorSlot, undefinedConst);
const done = this.RtCall2(RtOp.GetIndex, pair, this.IntConst(1));
// **极性**：`jump_if_false` 在条件为假时跳走。`done` 为真才该出去，
// 所以要跳的是「非 done」——少了这个 `not`，循环会一直跑下去、越界读出 `undefined`，
// 而报错出现在几十条指令之外（`0 + undefined`），**不是**在跳转那里。
const running = this.RtCall1(RtOp.Not, done);
const exitIndex = this.Here();
this.Emit(Op.JumpIfFalse, running, 0, -1, -1);
const value = this.RtCall2(RtOp.GetIndex, pair, this.IntConst(0));
this.BindForOfTarget(Child(node, "initializer"), value);
this.LowerStatement(Child(node, "statement"));
this.Emit(Op.Jump, -1, start, -1, -1);
this.PatchTarget(exitIndex, this.Here());
this.LeaveLoop(context);
this.PopScope();
```

## method LowerForIn:(node:AstNode)=>void

**`for..in`**：遍历一个对象的**键**。

**做法是「把键取成数组，再走 `for..of` 那条路」**：`Object.keys` 已经在标准库里
（`builtins/globals.xl.md`），迭代协议也已经在引擎里——**这一条语法不需要任何新东西**，
拼起来就是它。

**它要求全局名里有 `Object`**：`Object.keys` 这个名字来自环境对象
（`Object` 是全局名之一，见 `GlobalNames`）。没有就**明确报出来**并指出修法——
含糊地报「未知名字」会让人以为是拼写问题。

**只遍历自有键**（`Object.keys` 的口径）：JS 的 `for..in` 还会走**原型链上的可枚举键**。
今天对象的原型只有 `Protos.Object`（上面没挂可枚举东西），所以差别看不见；
**这条写在这里**，等原型真的会被挂东西时再回来补。

```ts
this.PushScope();
// **问模块级的那张名单，不是当前层的声明名单**：`Object` 是全局名（模块级），
// 内层函数里当然不会「声明」它——按层问会把正常的用法误判成缺全局名。
if (!Contains(this.Globals, "Object")) {
  throw new Error("unimplemented: for..in needs the `Object` global (declare globals with GlobalNames())");
}
const access = this.ResolveAccess("Object");
const objectSlot = this.Reserve(1);
if (access.InEnv) {
  this.Emit(Op.EnvGet, objectSlot, access.Depth, access.Cell, -1);
} else {
  this.Emit(Op.Move, objectSlot, access.Slot, -1, -1);
}
const keysName = this.Program().AddConst(Constant.OfString(UnitsOf("keys")));
const keysFn = this.RtCall2(RtOp.GetProp, objectSlot, keysName);
// **结果落回参数基址**（调用约定）：所以参数放哪一格，键数组就出现在哪一格。
const target = this.Reserve(1);
this.LowerInto(target, Child(node, "expression"));
this.Emit(Op.Call, keysFn, target, 1, -1);
this.LowerIterationLoop(target, node);
```

## method BindForOfTarget:(initializer:AstNode, value:int)=>void

把这一次迭代拿到的值**绑到循环变量**上（`for (const x of …)` 的那个 `x`）。

三条路与 `LowerVariable` 一样（捕获的名字只写环境格、`var` 用提升的槽、
`let`/`const` 现在占槽并声明）。**区别是它每轮都执行一次**——所以这里只做「写」，
不做「声明」（声明在第一次就完成了；每轮重新声明会把槽越开越多）。

```ts
const kind = NodeKind(initializer);
if (kind === "VariableDeclarationList") {
  const declarations = ListOf(initializer, "declarations");
  if (declarations.length !== 1) {
    throw new Error("unimplemented: for..of with several declarations");
  }
  const name = Child(declarations[0], "name");
  const nameKind = NodeKind(name);
  if (nameKind === "ObjectBindingPattern" || nameKind === "ArrayBindingPattern") {
    // **`for (const [k, v] of …)` / `for (const {a} of …)`**（第 135 轮）：
    // 把绑定模式那一路**原样接进来** ✓——默认值、数组剩余、嵌套都在 `Destructure` 里 ✓
    //（第 132 / 134 轮做的 ✓），这一处**一行新语义都没有** ✓。
    //
    // **它与上面那条「只写、不声明」并不矛盾** ✗：`Destructure` → `BindName` 里那次
    // `Reserve` + `DeclareLocal` 是**编译期**发的**一次**代码 ✓，运行时每个迭代只是
    // 往**同一格**写 ✓——「每轮重新声明会把槽越开越多」说的是**运行时**不能重复声明 ✓，
    // 而这里根本没有运行时声明这回事 ✓。
    //
    // **`var` 那一位照传** ✓：`for (var [a] of …)` 的绑定走提升时占好的槽 ✓
    //（与上面那条 `VarSlotOf` 分支同一条规矩 ✓）。
    this.Destructure(name, value, IsVarList(initializer));
    return;
  }
  if (nameKind !== "Identifier") {
    throw new Error("unimplemented: binding name " + nameKind);
  }
  const text = TextOf(name);
  const cell = this.CellOf(text);
  if (cell >= 0) {
    this.Emit(Op.EnvSet, value, 0, cell, -1);
    return;
  }
  if (IsVarList(initializer)) {
    const hoisted = this.VarSlotOf(text);
    if (hoisted < 0) throw new Error("internal: hoisted var was not collected: " + text);
    this.Emit(Op.Move, hoisted, value, -1, -1);
    return;
  }
  if (this.FindLocal(text) >= 0) {
    this.Emit(Op.Move, this.FindLocal(text), value, -1, -1);
    return;
  }
  const slot = this.Reserve(1);
  this.Emit(Op.Move, slot, value, -1, -1);
  this.DeclareLocal(text, slot);
  return;
}
throw new Error("unimplemented: for..of without a declaration");
```

## method AddHandler:()=>int

**登记一个处理点**，返回它在异常表里的下标（`try_push` 的操作数就是它）。

**处理点表是静态的**（`ir.xl.md` 的 `Handler`：受保护区间的指令下标 + 出事跳到哪条），
而**运行期在册的那一份是句柄**（`vm.xl.md` 的 `HandlerEntry`：帧句柄 + 目标 pc）——
因为同一段代码在递归里每一层的帧深度都不同，**静态值算不出「退到哪一层」**。
`HandlerPc` 此刻还不知道（要等处理点那段发出来），所以先写 0，稍后回填。

```ts
const index = this.Program().Handlers.length;
this.Program().Handlers.push(new Handler(this.Here(), this.Here(), 0, 0));
return index;
```

## method PatchHandlerTarget:(index:int, pc:int)=>void

回填一个处理点的目标 pc。

```ts
this.Program().Handlers[index].HandlerPc = pc;
```

## method PatchHandlerEnd:(index:int)=>void

回填受保护区间的终点（**给人和工具看的**：运行期用的是在册句柄，不是这段区间）。

```ts
this.Program().Handlers[index].TryEnd = this.Here();
```

## method LowerTry:(node:AstNode)=>void

`try` / `catch` / `finally` 的展开。

**三条路都要铺**（这是它比 `if` 麻烦的全部原因）：

1. **正常走完** → 跑 `finally`（如果有）；
2. **抛出被接住** → 绑定 `catch` 参数 → 跑 `catch` 体 → 跑 `finally`；
3. **抛出没被接住**（或者 `catch` 体自己抛）→ **也要跑 `finally`**，再把异常**重抛**出去。

**处理点是两张、不是一张**：一张给 `catch`（只保护 `try` 体），一张给「`finally` 之后重抛」
（保护 `try` 体与 `catch` 体）。少铺第二张，`catch` 体里抛出的异常就**跳过了 `finally`**
——那是最容易被漏掉的一条路。

**`finally` 之前要把在册的处理点撤掉**：不撤的话，`finally` 自己抛出的异常会被那张
「重抛」的网接住，于是 `finally` 再跑一遍……**这不是崩溃，是绕圈**。

**两处取舍**（都写进文首那张表）：

- **`finally` 的代码发两遍**（正常路径一遍、重抛路径一遍）。共享一份要一条子过程跳转，
  下一次；`finally` 通常很短，**重复比造一条新指令便宜**。
- **带 `finally` 的 `try` 里 `return` / `break` / `continue`**：**第 201 轮补上了** ✓——
  先把在册的 `finally` 从里到外**各发一遍** ✓（`EmitPendingFinalies` ✓），再走 ✓。
  原来这里是**降级期就抛** ✗（「会跳过 `finally`」✓）：那一抛本身是对的 ✓
  （静默跳过 `finally` 是**静默错值** ✗），但 `try { … } finally { … }` 里 `return`
  是**普通 `.ts` 里最常见的一条** ✓。

```ts
const tryBlock = Child(node, "tryBlock");
const catchClause = OptionalChild(node, "catchClause");
const finallyBlock = OptionalChild(node, "finallyBlock");
const hasCatch = catchClause !== null;
const hasFinally = finallyBlock !== null;
const rethrowIndex = hasFinally ? this.AddHandler() : -1;
const catchIndex = hasCatch ? this.AddHandler() : -1;
if (hasFinally) this.FinallyBlocks.push(finallyBlock as AstNode);
if (rethrowIndex >= 0) this.Emit(Op.TryPush, rethrowIndex, -1, -1, -1);
if (catchIndex >= 0) this.Emit(Op.TryPush, catchIndex, -1, -1, -1);
this.LowerStatement(tryBlock);
if (catchIndex >= 0) {
  this.Emit(Op.TryPop, -1, -1, -1, -1);
  this.PatchHandlerEnd(catchIndex);
}
if (rethrowIndex >= 0) {
  this.Emit(Op.TryPop, -1, -1, -1, -1);
  if (!hasCatch) this.PatchHandlerEnd(rethrowIndex);
}
const tryExit = this.Here();
this.Emit(Op.Jump, -1, 0, -1, -1);
let catchExit = -1;
if (hasCatch) {
  this.PatchHandlerTarget(catchIndex, this.Here());
  this.PushScope();
  this.BindCatch(catchClause as AstNode);
  this.LowerStatement(Child(catchClause as AstNode, "block"));
  if (rethrowIndex >= 0) {
    this.Emit(Op.TryPop, -1, -1, -1, -1);
    this.PatchHandlerEnd(rethrowIndex);
  }
  catchExit = this.Here();
  this.Emit(Op.Jump, -1, 0, -1, -1);
  this.PopScope();
}
const finallyStart = this.Here();
this.PatchTarget(tryExit, finallyStart);
if (catchExit >= 0) this.PatchTarget(catchExit, finallyStart);
// **发 `finally` 之前先把它自己从「在册」里摘掉** ✓（第 201 轮 ✓）：JS 里 `finally` 自己
// `return` 会**接管**这次完成 ✓、不会再跑一遍同一层 ✗
// （`try { return 1 } finally { return 2 }` 给 `2` ✓）。摘早了也不行 ✗——
// `try` 体与 `catch` 体里那三样（`return` / `break` / `continue`）正需要它**在册** ✓。
if (hasFinally) this.FinallyBlocks.pop();
if (hasFinally) this.LowerFinally(finallyBlock as AstNode);
const toEnd = this.Here();
this.Emit(Op.Jump, -1, 0, -1, -1);
if (rethrowIndex >= 0) {
  this.PatchHandlerTarget(rethrowIndex, this.Here());
  const saved = this.Reserve(1);
  this.Emit(Op.Caught, saved, -1, -1, -1);
  this.LowerFinally(finallyBlock as AstNode);
  this.Emit(Op.Throw, saved, -1, -1, -1);
}
this.PatchTarget(toEnd, this.Here());
```

**版式就是语义**：`try` 路径的出口、`catch` 路径的出口**都指向 `finally` 的开头**
（两个占位跳转回填到同一个 pc），`finally` 之后才跳出口，而**重抛那张网的目标落在
`finally` 之后**——先是 `caught saved`、再发一遍 `finally`、最后 `throw saved`。
上一版把第一个出口直接指向了「`finally` 之后」，于是正常路径**跳过了 `finally`**
（判据报的是「`withFinally(1)` 期望 102，实际 0」）。

## method LowerFinally:(block:AstNode)=>void

`finally` 的那一段：**它会被发两遍**（正常路径与重抛路径），所以这里只是一个小封装
——**没有「只发一次」的状态**，发几遍都得到同样的指令序列。

```ts
this.LowerStatement(block);
```

## method EmitPendingFinalies:()=>void

**把当前在册的 `finally` 从里到外发一遍**（第 201 轮 ✓）。

**它服务三样东西** ✓：`return` ✓、`break` ✓、`continue` ✓——
JS 的语义是「**先把这些 `finally` 跑完，再走**」✓（AbruptCompletion 那一条 ✓），
而 `throw` 不必它管 ✗（异常本来就走那张「重抛」的网 ✓，`finally` 由那条路跑 ✓）。

**发每一层时，把它自己与它**里头**那几层都摘下来** ✓：里头那几层**已经发过了** ✓
（我们是**从里往外**发的 ✓），而它**自己**不算「待跑」✗——
JS 里 `finally` 自己 `return` 会**接管**这次完成 ✓，不会把同一层再跑一遍 ✗。
`this.FinallyBlocks = outer` 这一行就是那个「摘」✓。

**发完要把它恢复回去** ✓：这段代码是**内联**在 `try` 体中间的 ✓，
而后面还要接着发**同一段的其余语句** ✓（那些语句是**死代码** ✓，但布局仍在走 ✓）——
不恢复的话，外面那一层的 `finally` 就丢了 ✗（症状离现场很远 ✗：
后面某个 `return` **静默少跑一层 `finally`** ✓）。

```ts
const saved: AstNode[] = [];
for (let i = 0; i < this.FinallyBlocks.length; i++) saved.push(this.FinallyBlocks[i]);
// **从里往外** ✓（`saved` 里最外层在前 ✓）。
for (let i = saved.length - 1; i >= 0; i--) {
  // 发这一层时，「还待跑」的只剩**外面**那些 ✓。
  const outer: AstNode[] = [];
  for (let j = 0; j < i; j++) outer.push(saved[j]);
  this.FinallyBlocks = outer;
  this.LowerStatement(saved[i]);
}
// **恢复**：见上面那一段（后面还有同一段的死代码要发 ✓）。
this.FinallyBlocks = saved;
```

## method BindCatch:(catchClause:AstNode)=>void

**绑定 `catch` 的参数**：先从「在飞的异常」取出来，再按普通变量声明那三条路走。

**`Caught` 是唯一能把异常值取进槽的指令**（`ir.xl.md` 的 `caught`）：展开把 `Pc`
跳到处理点之后，异常值只在 `Vm.Pending` 里。没有它，`catch` 能接住却拿不到那个值。

```ts
const declaration = OptionalChild(catchClause, "variableDeclaration");
if (declaration === null) return;
const name = Child(declaration, "name");
const kind = NodeKind(name);
const slot = this.Reserve(1);
this.Emit(Op.Caught, slot, -1, -1, -1);
if (kind === "Identifier") {
  this.DeclareLocal(TextOf(name), slot);
  return;
}
// **`catch ({ message })` 也是解构**（第 119 轮补）：投影给的形状与变量声明的
// `ObjectBindingPattern` **完全一样**，所以走路也应该是同一条（`Destructure`）——
// 原来这里直接抛 `unimplemented: destructuring catch binding` ✗，
// 而「接住异常、只取 message」是脚本里最常见的写法之一。
// **`isVar` 给假**：`catch` 参数是块作用域，不是 `var`。
if (kind === "ObjectBindingPattern" || kind === "ArrayBindingPattern") {
  this.Destructure(name, slot, false);
  return;
}
throw new Error("unimplemented: catch binding " + kind);
```

## method JumpIfNullish:(value:int)=>int

**空值就跳走**：返回那条跳转指令的下标（目标稍后回填）。

`jump_if_false` 在条件为**假**时跳，所以这里先取反——**极性只写在这一处**。

**为什么值得单开一个函数**：这个极性我写反过两次（`for..of` 的 `done`、可选链的守卫），
两次的表现都不是「跳错地方」，而是**几十条指令之外的怪值**（越界读出的 `undefined`、
本该读到的属性变成 `undefined`）。收进一处，就只可能错一次。

```ts
const nullish = this.RtCall1(RtOp.IsNullish, value);
const notNullish = this.RtCall1(RtOp.Not, nullish);
const index = this.Here();
this.Emit(Op.JumpIfFalse, notNullish, 0, -1, -1);
return index;
```

## method RtCallValues:(id:int, first:int, second:int)=>int

**两格现成的值**拼出参数窗口，发一条 `rt_call`，返回结果格。

与 `RtCall2` 的区别只有第二个操作数的来源（一个是常量、一个是算出来的值）——
**分开两个函数，是因为调用点一眼就能看出「这里有没有额外求值」**。

```ts
const window = this.Reserve(2);
this.Emit(Op.Move, window, first, -1, -1);
this.Emit(Op.Move, window + 1, second, -1, -1);
const result = this.Reserve(1);
this.EmitRt(id, result, window, 2);
// **别退到结果格以下**：它就是这次调用的产物，退了，下一次分配就会盖掉它
// （`for..in` 那条路上正是这么翻车的：取到的 `Object.keys` 被下一个临时格覆盖，
// 报出来的却是「调用了非闭包的值」）。
this.Release(result + 1);
return result;
```

## method ChainHasOptional:(node:AstNode)=>bool

**这条访问链上有没有 `?.`**（沿着 `expression` 一路往下看）。

**为什么要看整条链、而不只看当前这一层**：`a?.b.c` 的 `?.` 在内层，
但它要求**整条链短路**（`a` 是空值时整个表达式给 `undefined`，而不是去读 `undefined.c`）。
所以链上只要出现过一次 `?.`，**每一层都守一道**——多守的那几道只是多几条指令，
而漏守一道就是**语义错**。

```ts
let current = node;
let guard = 0;
while (guard < 64) {
  guard = guard + 1;
  const kind = NodeKind(current);
  if (kind !== "PropertyAccessExpression" && kind !== "ElementAccessExpression"
    && kind !== "CallExpression") {
    return false;
  }
  if (OptionalChild(current, "questionDotToken") !== null) return true;
  const next = OptionalChild(current, "expression");
  if (next === null) return false;
  current = next;
}
throw new Error("optional chain is too deep (or it is a cycle)");
```

## method LowerAccess:(node:AstNode)=>int

**读一个属性 / 下标**，带可选链的守卫。

版式是三段：**算接收者 → （可选链时）守一道 → 求值 → 跳过「给 `undefined`」那一小段**。
「给 `undefined`」的落点写在**结果格**上——于是整条链短路时，外层看到的是 `undefined`，
它的守卫接着把它短路下去。

```ts
const receiver = this.LowerExpression(Child(node, "expression"));
const optional = this.ChainHasOptional(node);
let skip = -1;
if (optional) skip = this.JumpIfNullish(receiver);
let result = -1;
if (NodeKind(node) === "PropertyAccessExpression") {
  const name = Child(node, "name");
  // **私有名也是属性名**（第 195 轮 ✓）：`this.#n` 与字段那一格同键 ✓（`KeyUnitsOf` ✓）。
  if (NodeKind(name) !== "Identifier" && NodeKind(name) !== "PrivateIdentifier") {
    throw new Error("unimplemented: private or computed property name");
  }
  const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(name)));
  result = this.RtCall2(RtOp.GetProp, receiver, key);
} else {
  const index = this.LowerExpression(Child(node, "argumentExpression"));
  result = this.RtCallValues(RtOp.GetIndex, receiver, index);
}
if (optional) {
  const done = this.Here();
  this.Emit(Op.Jump, -1, 0, -1, -1);
  this.PatchTarget(skip, this.Here());
  this.Emit(Op.Const, result, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
  this.PatchTarget(done, this.Here());
}
return result;
```

## method LowerMethodCall:(call:AstNode, callee:AstNode)=>int

**`obj.m(args)`**：接收者求一次 → （可选链时）守一道 → `call_method` → 结果落回参数基址。

**参数窗口的第一格是接收者**（`call_method` 的 `A` 是「`this` 在哪一格」），
实参从下一格起、**连续**——所以窗口一次要 `argc + 1` 格。

```ts
if (NodeKind(Child(callee, "expression")) === "SuperKeyword") {
  // **`super.m(args)`**（第 104 轮补）：在**父类原型**上找方法，但 `this` 仍是**当前实例**——
  // 这两件事必须**分开**，所以用不了 `call_method`（它把「在谁身上找」和「谁是 `this`」
  // 当成同一格）。形状与 `o[k]()` 那条分支完全一样：`get_prop` 两次 + `Op.Call` 的 `D` 操作数。
  //
  // **父类怎么找到**：`super` 的父类名由 `InSuperName` 指认（类降级时写进排队函数，
  // 见 `LowerClass` 里盖章那一行），然后**照常 `ResolveAccess`**——它在环境里还是在槽里，
  // 这里一行都不用管。`super(...)` 那条分支就是这么做的。
  if (this.InSuperName === "") {
    throw new Error("unimplemented: super.m(...) outside a derived class method");
  }
  const parentAccess = this.ResolveAccess(this.InSuperName);
  const parent = this.Reserve(1);
  if (parentAccess.InEnv) {
    this.Emit(Op.EnvGet, parent, parentAccess.Depth, parentAccess.Cell, -1);
  } else {
    this.Emit(Op.Move, parent, parentAccess.Slot, -1, -1);
  }
  const prototypeKey = this.Program().AddConst(Constant.OfString(UnitsOf("prototype")));
  const proto = this.RtCall2(RtOp.GetProp, parent, prototypeKey);
  const name = Child(callee, "name");
  if (NodeKind(name) !== "Identifier") {
    throw new Error("unimplemented: super call with a computed name");
  }
  const fnKey = this.Reserve(1);
  this.Emit(Op.Const, fnKey, this.Program().AddConst(Constant.OfString(UnitsOf(TextOf(name)))), -1, -1);
  const fn = this.RtCallValues(RtOp.GetProp, proto, fnKey);
  // **`this` 从当前帧取一格递给被调方**（`Op.Call` 的 `D` 操作数）：父类那个方法要拿
  // **当前这个实例**当 `this`——这正是「重写里的 `super`」的全部意思。
  const selfSlot = this.Reserve(1);
  this.Emit(Op.LoadThis, selfSlot, -1, -1, -1);
  const superArgs = ListOf(call, "arguments");
  // **`super.m(...xs)`**（第 158 轮）：这一支本来就用不了 `call_method` ✓
  //（「在谁身上找」与「谁是 `this`」要分开 ✓），所以展开要另配一条形状 ✓——
  // 而那条形状**本来就写在同一个方法里** ✓：`o.m(...xs)` 用的是
  // 「先把方法当值取出来 + `call_array`」✓（`BuildArgsArray` + `EmitCallArray` ✓），
  // 而这一支**前面已经把方法取成值了** ✓（`fn` ✓）——差的只是把实参收成数组 ✓。
  // 少了这一条，`super.m(...xs)` 报 `unimplemented: spreading into super.m(...)` ✗
  //（整份文件进不来 ✗）；而它在「子类透传实参」那种写法里很常见 ✓。
  if (this.HasSpread(superArgs)) {
    const spreadArray = this.BuildArgsArray(superArgs);
    const spreadDest = this.EmitCallArray(fn, spreadArray, selfSlot);
    // **「水位」这条线索已经证伪两次** ✗（第 159 轮在大例子上试过 ✓、第 160 轮在最小反例上又试过 ✓）：
    // 这里补一句 `Release(spreadDest + 1)` ✓（与下面固定实参那支同一条纪律 ✓）
    // **都没有修好** ✗——所以它**没有留下** ✗（不留一处没验证过的改动 ✓）。
    //
    // **第 160 轮把反例缩到了三行** ✓（这才是有用的产出 ✓）：
    //   `const a = c.sumSpread([1,2,3]); const b = c.describeSpread(['a','b']);`
    //   报 `calling a non-closure value` ✗；而**把两条语句对调就对** ✓
    //（`console.log(c.sumSpread(...), c.describeSpread(...))` 同样错 ✗ ✓）。
    // **顺序敏感** + **每种形状单独都对** ✓——下一轮从这里查 ✓，
    // 别再猜「Release」（两次都白猜 ✓），去比这两份 IR 的**差别**（`Program.Dump()` ✓）。
    return spreadDest;
  }
  const superCount = superArgs.length;
  const superBase = this.Reserve(superCount > 0 ? superCount : 1);
  for (let i = 0; i < superCount; i++) {
    this.LowerInto(superBase + i, superArgs[i]);
  }
  this.Emit(Op.Call, fn, superBase, superCount, selfSlot);
  // **退到结果「之上」**（`fn` / `selfSlot` / `proto` / `parent` 都在下面；
  // 退到结果「上」会把活着的产物交出去——`LowerMethodCall` 末尾那条注释说的就是这个陷阱）。
  this.Release(superBase + 1);
  return superBase;
}
const receiver = this.LowerExpression(Child(callee, "expression"));
const optional = this.ChainHasOptional(call);
let skip = -1;
if (optional) skip = this.JumpIfNullish(receiver);
const name = Child(callee, "name");
// **私有名也能当被调用的名字**（第 195 轮 ✓）：`this.#m()` 的 kind 是 `PrivateIdentifier` ✓，
// 键与类里挂上去的那一格**同一个**（`#m` ✓）——两处都用 `KeyUnitsOf` ✓，
// 于是「挂」与「取」不可能走偏 ✓。
if (NodeKind(name) !== "Identifier" && NodeKind(name) !== "PrivateIdentifier") {
  throw new Error("unimplemented: method call with a computed name");
}
const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(name)));
const args = ListOf(call, "arguments");
const count = args.length;
// **`?.` 有两种，守的东西不一样** ✗（第 152 轮量准的 ✓）：
//
// | 写法 | `?.` 在哪 | 空值是谁 | 该守谁 |
// | --- | --- | --- | --- |
// | `o?.n?.()` | 形参那一层（`o?.n` ✓） | `o` ✓ | 接收者 ✓ |
// | `o.n?.()` | **调用那一层**（`?.()` ✓） | **取出来的方法** ✓ | **方法值** ✓ |
//
// 原来只有「守接收者」那一条 ✓（判据是 `ChainHasOptional(call)` ✓，而它**分不出这两层** ✗），
// 于是 `o.n?.()` 在 `n` 是 `null` 时**照样去调** ✗ → 报
// `unimplemented: calling a non-closure value` ✓（JS 给 `undefined` ✓，**不调** ✓）。
//
// **两种都要守，缺一种就是错** ✓：
//   · 守接收者：不做的话 `o?.n?.()`（`o` 为空 ✓）会去读空值的属性 ✗；
//   · 守方法值：不做的话 `o.n?.()`（方法为空 ✓）会去调它 ✗。
// **多守的那一道只是多几条指令** ✓（与 `ChainHasOptional` 那条注释同一个道理 ✓）。
const callOptional = OptionalChild(call, "questionDotToken") !== null;
// **只有「调用那一层带 `?.`」才守方法值** ✗（不能拿 `optional` 顶替 ✓）：
// `o?.m()`（`o.m` 不存在 ✓）在 JS 里是 **TypeError** ✓——拿 `optional` 顶替就是
// 把它**静默**变成 `undefined` ✗，而静默错值比响亮地抛更糟 ✓。
if (callOptional && !this.HasSpread(args)) {
  // **换一条形状** ✓：`call_method` 内部自己取方法 ✗，取不到就没机会守 ✓——
  // 所以先把方法当值取出来 ✓，守一道 ✓，再用 `Op.Call` 带着 `this` 调 ✓。
  // 这条形状**本来就有** ✓（下面展开那条与 `super.m(...)` 那条都是它 ✓）。
  const methodFn = this.RtCall2(RtOp.GetProp, receiver, key);
  // **取完方法再守** ✓（守的是它 ✓，不是接收者 ✗）。
  const methodSkip = this.JumpIfNullish(methodFn);
  const methodSelf = this.Reserve(1);
  this.Emit(Op.Move, methodSelf, receiver, -1, -1);
  const callArgs = this.Reserve(count > 0 ? count : 1);
  for (let i = 0; i < count; i++) {
    this.LowerInto(callArgs + i, args[i]);
  }
  // **结果落在参数基址** ✓（与 `call_method` 同一条约定 ✓）。
  this.Emit(Op.Call, methodFn, callArgs, count, methodSelf);
  const doneOptional = this.Here();
  this.Emit(Op.Jump, -1, 0, -1, -1);
  // **两条短路都落到同一处** ✓：接收者那条（若也守了 ✓）与方法值这条 ✓——
  // 结果格都写 `undefined` ✓。
  this.PatchTarget(methodSkip, this.Here());
  if (optional) this.PatchTarget(skip, this.Here());
  this.Emit(Op.Const, callArgs, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
  this.PatchTarget(doneOptional, this.Here());
  return callArgs;
}
if (this.HasSpread(args)) {
  // **`o.m(...xs)`**（第 133 轮）：**不用 `call_method`** ✗——它收的是「键 + 定长窗口」✓，
  // 而展开的个数只有运行期才知道 ✗。改成「先把方法当值取出来 + `call_array`」✓：
  // 形状与上面那条 `o[k](...)` 一字不差 ✓（`this` 用 `D` 操作数递过去 ✓）。
  const methodFn = this.RtCall2(RtOp.GetProp, receiver, key);
  const methodSelf = this.Reserve(1);
  this.Emit(Op.Move, methodSelf, receiver, -1, -1);
  const spreadArray = this.BuildArgsArray(args);
  const spreadDest = this.EmitCallArray(methodFn, spreadArray, methodSelf);
  if (optional) {
    // **可选链那条短路照旧** ✓：接收者为空时跳过整段，结果格写 `undefined` ✓。
    const spreadDone = this.Here();
    this.Emit(Op.Jump, -1, 0, -1, -1);
    this.PatchTarget(skip, this.Here());
    this.Emit(Op.Const, spreadDest, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
    this.PatchTarget(spreadDone, this.Here());
  }
  return spreadDest;
}
// **至少留两格**（接收者 + 结果）：`argc = 0` 时参数基址仍然必须是一格有效的槽
// ——结果就落在那里。少留一格，验证层当场报 `argument window out of range`
// （与 `LowerCall` 里那句 `count > 0 ? count : 1` 是同一条道理）。
const span = count + 1 > 2 ? count + 1 : 2;
const window = this.Reserve(span);
this.Emit(Op.Move, window, receiver, -1, -1);
for (let i = 0; i < count; i++) {
  this.LowerInto(window + 1 + i, args[i]);
}
this.Emit(Op.CallMethod, window, key, window + 1, count);
// **退到结果「之上」，不是退到结果「上」**：结果落在 `window + 1`，所以这里要 `+2`。
// 写成 `Release(window + 1)` 会把**活着的**结果格交出去——调用方（比如数组字面量）
// 紧接着 `Reserve` 就复用了它，于是那一格装的是别的东西。
// **这是同一个陷阱的第四次**（前三次：第 24 / 38 / 40 轮），这次是判据抓到的：
// 症状是「数组字面量里直接写方法调用，那一格拿到的是**接收者**」。
this.Release(window + 2);
if (optional) {
  const done = this.Here();
  this.Emit(Op.Jump, -1, 0, -1, -1);
  this.PatchTarget(skip, this.Here());
  this.Emit(Op.Const, window + 1, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
  this.PatchTarget(done, this.Here());
}
return window + 1;
```

## method EnterLoop:(isLoop:bool, continueTarget:int)=>LoopContext

进一层可跳出的上下文。

```ts
const context = new LoopContext(isLoop, continueTarget);
// **吃掉待用标签**（`outer: for (…)`）：消费方负责清空——不清的话，下一个没有标签的循环
// 会继承上一个标签（`break outer` 于是跳到毫不相干的循环去）。
context.Label = this.PendingLabel;
this.PendingLabel = "";
this.Loops.push(context);
return context;
```

## method LeaveLoop:(context:LoopContext)=>void

出去，并把这一层里所有 `break` / `continue` 的跳转**回填到当前 pc**。

**回填的是「当前 pc」而不是某个参数**：`break` 的落点永远是「这一层之后」——
让调用方自己算，迟早有人算成「这一层之前」。

```ts
this.Loops.pop();
const target = this.Here();
for (let i = 0; i < context.Breaks.length; i++) {
  this.PatchTarget(context.Breaks[i], target);
}
for (let i = 0; i < context.Continues.length; i++) {
  this.PatchTarget(context.Continues[i], context.ContinueTarget);
}
```

## method LowerBreak:(node:AstNode)=>void

`break`：跳到**最近一层**可跳出的上下文之后。

**它不区分循环与 `switch`**——`switch` 里的 `break` 跳出的正是 `switch`（那才是最近的）。

**它还认「标签 + 一个块」那一层** ✓（第 234 轮 ✓）：`outer: { … break outer; … }` 里
那个 `outer` **不在 `Loops` 里** ✓（块不是循环 ✓），而在 `BlockLabel` 那一格 ✓——
所以这里要在扫 `Loops` **之前**先问它一句 ✓（`outer: { … }` 里没有循环 ✓，
扫 `Loops` 只会扫空 ✓、然后报 `unknown label` ✗，而**那是合法的 JS** ✓）。

```ts
const labelNode = OptionalChild(node, "label");
// **先问「标签 + 块」那一层** ✓（第 234 轮 ✓）：它不在 `Loops` 里 ✓，
// 而它是最内层的可能性**最大** ✓——先扫 `Loops` 就会漏掉它 ✗。
// **从里往外扫** ✓（与下面 `Loops` 那一趟同一个形状 ✓）：嵌套的标签块很普通 ✓
//（实测 `two: { … inner: { … break two; … } … }` ✓——只看栈顶的话这一句会报「未知标签」✗）。
if (labelNode !== null) {
  const wanted = TextOf(labelNode);
  for (let b = this.BlockLabels.length - 1; b >= 0; b--) {
    if (this.BlockLabels[b].Label !== wanted) continue;
    // **`finally` 那一段照旧先跑** ✓（与下面那条路同一条纪律 ✓，见那几行注释 ✓）。
    this.EmitPendingFinalies();
    const blockAt = this.Here();
    this.Emit(Op.Jump, -1, 0, -1, -1);
    this.BlockLabels[b].Breaks.push(blockAt);
    return;
  }
}
let index = this.Loops.length - 1;
if (labelNode !== null) {
  // **带标签的 `break`**：从里往外找**同名**那一层。它可以是循环，也可以是 `switch`
  // （标签就是给「跳出某一层」用的，是什么语句无关）。
  const label = TextOf(labelNode);
  while (index >= 0 && this.Loops[index].Label !== label) {
    index = index - 1;
  }
  if (index < 0) {
    throw new Error("unknown label `" + label + "` (the parser should have rejected this)");
  }
} else if (this.Loops.length === 0) {
  throw new Error("break outside a loop or switch (the parser should have rejected this)");
}
// **带 `finally` 的 `try` 里 `break` 要先跑那些 `finally`** ✓（第 201 轮 ✓）——
// 与 `return` 那一条**同一个方法** ✓（修之前这里也是降级期就抛 ✗）。
// **`at` 必须取在 `Jump` 上** ✗（不是取在 `finally` 那一段的开头 ✓）：
// `PatchTarget` 回填的是「跳出去之后落哪」✓，而 `finally` 的那几段是**跳之前**要跑的 ✓。
this.EmitPendingFinalies();
const at = this.Here();
this.Emit(Op.Jump, -1, 0, -1, -1);
this.Loops[index].AddBreak(at);
```

## method LowerContinue:(node:AstNode)=>void

`continue`：跳到**最近的那一层循环**的「下一轮开始」。

**必须穿过 `switch`**：`switch` 也是可跳出的上下文，但它不是循环——
`IsLoop` 这一位就是为这一步存在的（少了它，`continue` 会跳去 `switch` 的出口，静默跳错）。

```ts
const labelNode = OptionalChild(node, "label");
let index = this.Loops.length - 1;
if (labelNode !== null) {
  // **带标签的 `continue` 只认循环**：`switch` 也能带标签，但它不是循环——
  // 对它 `continue` 在 JS 里是语法错误，所以这里必须同时看 `IsLoop`。
  const label = TextOf(labelNode);
  while (index >= 0 && !(this.Loops[index].IsLoop && this.Loops[index].Label === label)) {
    index = index - 1;
  }
  if (index < 0) {
    throw new Error("unknown loop label `" + label + "` (the parser should have rejected this)");
  }
} else {
  while (index >= 0 && !this.Loops[index].IsLoop) {
    index = index - 1;
  }
  if (index < 0) {
    throw new Error("continue outside a loop (the parser should have rejected this)");
  }
}
// **带 `finally` 的 `try` 里 `continue` 也要先跑那些 `finally`** ✓（第 201 轮 ✓）——
// 与 `return` / `break` **同一个方法** ✓（修之前这里也是降级期就抛 ✗）。
// **顺序是语义** ✓：先跑 `finally` ✓，再跳去「下一轮开始」✓——
// 而 `continue` 要跳的那个点（`for` 的更新式 ✓）本来就在循环那一层 ✓，
// 所以这里**不必**对回填做任何特别处理 ✓（`jump` 仍旧取在 `Jump` 上 ✓）。
this.EmitPendingFinalies();
const jump = this.Here();
this.Emit(Op.Jump, -1, 0, -1, -1);
this.Loops[index].AddContinue(jump);
```

## method LowerSwitch:(node:AstNode)=>void

`switch`：**判别式算一次**；各支的测试按书写顺序排在最前（第一个命中的跳进它的体）；
体按书写顺序**落穿**（JS 语义：没有隐式 `break`）；`break` 跳出整个 `switch`。

**测试区与体区分两趟发**，因为两个落点都要等对面：测试要知道体从哪开始，
「全不中」要知道 `default` 的体在哪（它可能写在中间），所以两边都先记下标、事后回填。

```ts
const discriminant = this.LowerExpression(Child(node, "expression"));
const caseBlock = Child(node, "caseBlock");
const clauses = ListOf(caseBlock, "clauses");
const context = this.EnterLoop(false, 0);
const marks: SwitchClause[] = [];
for (let i = 0; i < clauses.length; i++) {
  const clause = clauses[i];
  const mark = new SwitchClause(NodeKind(clause) === "DefaultClause");
  marks.push(mark);
  if (mark.IsDefault) continue;
  const value = this.LowerExpression(Child(clause, "expression"));
  const same = this.RtCallValues(RtOp.CmpEqStrict, discriminant, value);
  const notSame = this.RtCall1(RtOp.Not, same);
  const jump = this.Here();
  this.Emit(Op.JumpIfFalse, notSame, 0, -1, -1);
  mark.Tests.push(jump);
}
const noMatch = this.Here();
this.Emit(Op.Jump, -1, 0, -1, -1);
let defaultPc = -1;
for (let i = 0; i < clauses.length; i++) {
  const mark = marks[i];
  mark.BodyPc = this.Here();
  if (mark.IsDefault) defaultPc = mark.BodyPc;
  for (let j = 0; j < mark.Tests.length; j++) {
    this.PatchTarget(mark.Tests[j], mark.BodyPc);
  }
  this.PushScope();
  const statements = ListOf(clauses[i], "statements");
  for (let j = 0; j < statements.length; j++) {
    this.LowerStatement(statements[j]);
  }
  this.PopScope();
}
this.Release(discriminant + 1);
this.PatchTarget(noMatch, defaultPc >= 0 ? defaultPc : this.Here());
this.LeaveLoop(context);
```

## method RtCall3:(id:int, first:int, second:int, third:int)=>int

三格现成的值拼出参数窗口（`set_prop` / `set_index` 的形状），返回结果格。

```ts
const window = this.Reserve(3);
this.Emit(Op.Move, window, first, -1, -1);
this.Emit(Op.Move, window + 1, second, -1, -1);
this.Emit(Op.Move, window + 2, third, -1, -1);
const result = this.Reserve(1);
this.EmitRt(id, result, window, 3);
// **别退到结果格以下**：它就是这次调用的产物，退了，下一次分配就会盖掉它
// （`for..in` 那条路上正是这么翻车的：取到的 `Object.keys` 被下一个临时格覆盖，
// 报出来的却是「调用了非闭包的值」）。
this.Release(result + 1);
return result;
```

## method FunctionParams:(node:AstNode)=>Array<string>

**一个函数式节点的参数名**（箭头函数 / 函数表达式 / 方法 / 函数声明共用）。

**只收简单名**：解构参数抛——那是绑定模式那一路的语法（**另一条待办** ✓）。
**剩余参数（第 133 轮）收下了** ✓：`function f(a, ...rest)` 的 `params` 是 `["a", "rest"]` ✓
（`ParamCount` 是 2 ✓——剩余参数**确实占最后一个形参格** ✓，
`vm.xl.md` 把收上来的数组放进那一格 ✓）。**收不收得下**由 `HasRestParam` 那一半说 ✓。
默认值与可选参数**照收**（第 119 轮）：

- **可选参数（`a?: T`）是纯类型位**：JS 里没有这个东西，运行期行为与 `a: T` **一模一样**
  （不传就是 `undefined`）——所以**擦掉**，不是「给个默认值」。
- **默认值的求值不在这里做**，只在这里**放行**：真正发那段代码的是 `LowerParamDefault`，
  参数名与默认值是**两份平行的信息**（`FunctionParams` + `CollectDefaults`）。

**为什么名字与默认值不合并成一个返回值**：`Params` 的两条下游（`FunctionInfo.ParamCount`
与 `DeclareLocal` 的槽号）只关心「有几个、叫什么」，把它们和树节点混在一起，
调用点每处都得多拆一次。

```ts
const parameters = ListOf(node, "parameters");
const params: string[] = [];
for (let i = 0; i < parameters.length; i++) {
  const parameter = parameters[i];
  const name = OptionalChild(parameter, "name");
  if (name === null) {
    throw new Error("unimplemented: parameter without a name");
  }
  // **`this` 形参是纯类型位** ✓（第 228 轮 ✓）：`function f(this: any, a: number)` 里的
  // 第一格**不占槽** ✗——TS 的类型剥离把它整格擦掉 ✓（实测：`f.call(o, 1, 2)` 里
  // `a` 拿到的就是 `1` ✓），所以它与 `a?: T` 是同一档 ✓（JS 里没有这个东西 ✓）。
  //
  // **漏了这一格的症状是「所有实参整体错位一格」** ✗：`a` 拿到第 0 个实参、
  // `b` 拿到第 1 个、最后一个永远是 `undefined` ✓（判据现场：`T:NaN` ✓，
  // 而 `this` 本身却是**对的** ✓——所以看起来像「`+` 坏了」✗，其实是形参错位 ✓）。
  // **判据走 `IsThisParameter`** ✓（不是在这里写一句 `TextOf(name) === "this"` ✗）：
  // `CollectDefaults` 与 `CollectPatternParams` 两处**用同一份下标** ✓，
  // 三处各写一遍的话，只要一处漏了，默认值 / 解构就落到**隔壁那一格** ✗（静默错值 ✓）。
  if (this.IsThisParameter(parameter)) continue;
  // **剩余参数只许在最后一位** ✓（语法规定的 ✓）——不在最后那一种是**源码就非法** ✓，
  // 而投影层不做这个检查 ✓，所以这里说一句 ✓（比让它走到别处报一句别的话好 ✓）。
  if (OptionalChild(parameter, "dotDotDotToken") !== null && i !== parameters.length - 1) {
    throw new Error("unimplemented: a rest parameter must be the last one");
  }
  const nameKind = NodeKind(name);
  if (nameKind === "ObjectBindingPattern" || nameKind === "ArrayBindingPattern") {
    // **解构形参**（第 134 轮）：这一格仍然要占 ✓（值就落在它上面 ✓），
    // 所以给它一个**合成的槽名** ✓——它不出现在源码里，所以永远不会被引用 ✓。
    // 真正把值拆开的是 `LowerFunctionBody` 里那一趟 `Destructure` ✓
    //（在**参数顺序**里做，所以 `function f({a}, b = a)` 里 `b` 看得见 `a` ✓）。
    params.push(this.PatternSlotName(i));
    continue;
  }
  if (nameKind !== "Identifier") {
    throw new Error("unimplemented: parameter without a simple name");
  }
  params.push(TextOf(name));
}
return params;
```

## method PatternSlotName:(index:int)=>string

**解构形参的那个合成槽名**（第 134 轮）。

**为什么要有它**：`Params` 的下游两处都按「一个形参一个名字」办事 ✓——
`FunctionInfo.ParamCount` 数个数 ✓、`DeclareLocal(params[i], i)` 占槽 ✓——
而解构形参**也要占一格** ✓（值就落在它上面 ✓）。合成名给了它一个「占位」的身份 ✓。

**名字里那个 `<` 是刻意的** ✗：它**不可能是源码里的标识符** ✓（JS 标识符里没有 `<` ✓），
所以这个槽名永远不会**碰巧**撞上一个真名字 ✓——而撞上的症状是
「两个形参共用一个槽」✗（值悄悄换成别的 ✗，这个工程最贵的一种错 ✓）。

```ts
return "<pattern" + NumberToHostText(index) + ">";
```

## method HasRestParam:(node:AstNode)=>bool

**最后一个形参是不是剩余参数**（第 133 轮）——它决定函数表上那一位（`FunctionInfo.HasRest` ✓），
而**那一位决定开帧的人收不收剩余** ✓。

**与 `FunctionParams` 分成两个方法** ✓：一个报名字、一个报「有没有 `...`」✓——
合并的话，`Params` 那两条下游（`ParamCount` 与槽号）每处都要多拆一层 ✓，
理由与「名字与默认值不合并」一字不差 ✓。

```ts
const parameters = ListOf(node, "parameters");
if (parameters.length === 0) return false;
return OptionalChild(parameters[parameters.length - 1], "dotDotDotToken") !== null;
```

## method CollectDefaults:(node:AstNode, at:Array<int>, defaults:Array<AstNode>)=>void

**参数默认值：位置与初始化式两份平行数组**（第 119 轮）。

**为什么用两个出参而不是返回一个结构**：本仓的方法只返回一个值，而这里天然是**一对**
（第几个参数、那段初始化式）——与 `CollectDeclaredNames` / `CollectHoistedVars`
那几处「往调用方的数组里追加」是同一个写法。

**顺序按参数从左到右**：`at` 是**升序**的，`LowerFunctionBody` 照它顺序发代码，
于是 `function f(a = 1, b = a + 1)` 里 `b` 看得见 `a`（JS 就是这么定的）。

```ts
const parameters = ListOf(node, "parameters");
for (let i = 0; i < parameters.length; i++) {
  // **`this` 那一格不算** ✓（第 228 轮，与 `FunctionParams` 同一条判据 ✓）：
  // 这里推的是**参数下标** ✓，而槽是按 `FunctionParams` 铺的 ✗——
  // 不跳它，`function f(this: any, a = 1)` 的默认值会写到**第 1 格**（`a` 在第 0 格 ✓）✗。
  if (this.IsThisParameter(parameters[i])) continue;
  const initializer = OptionalChild(parameters[i], "initializer");
  if (initializer === null) continue;
  at.push(i);
  defaults.push(initializer);
}
```

## method CollectPatternParams:(node:AstNode, at:Array<int>, patterns:Array<AstNode>)=>void

**解构形参：位置与模式两份平行数组**（第 134 轮）——与 `CollectDefaults` 同一个写法 ✓
（「本仓的方法只返回一个值，而这里天然是一对」✓）。

```ts
const parameters = ListOf(node, "parameters");
for (let i = 0; i < parameters.length; i++) {
  // **`this` 那一格不算** ✓（第 228 轮，与上面那条同一条判据 ✓）：与默认值那一路
  // **一字不差**的理由 ✓——解构形参也要按 `FunctionParams` 的槽号读 ✓。
  if (this.IsThisParameter(parameters[i])) continue;
  const name = OptionalChild(parameters[i], "name");
  if (name === null) continue;
  const kind = NodeKind(name);
  if (kind !== "ObjectBindingPattern" && kind !== "ArrayBindingPattern") continue;
  at.push(i);
  patterns.push(name);
}
```

## method IsThisParameter:(parameter:AstNode)=>bool

**这一格形参是不是那个 `this`**（第 228 轮 ✓）——`function f(this: Foo, a: number)` 的第一格 ✓。

**为什么收成一个方法** ✗：**三处**要用同一条判据 ✓（`FunctionParams` 铺槽 ✓、
`CollectDefaults` 推默认值的位置 ✓、`CollectPatternParams` 推解构的位置 ✓），
而三处用的**必须是同一份下标** ✓——写三遍就是三处会漂 ✗，
症状是「默认值 / 解构落到隔壁那一格」✓（**静默错值** ✗，这个工程最贵的一种 ✓）。

**判据是「参数的名字叫 `this`」** ✓（不是「有没有类型标注」✗——`function f(this)` 也是
`this` 形参 ✓，它在 TS 里同样是类型位 ✓）。投影层把它成形成一个普通的 `Identifier` 名 ✓
（见 [typescript 的 `Parameter` 投影](../typescript/tokens/parameter.xl.md) ✓），
所以这里只要比三个字符 ✓。

```ts
const name = OptionalChild(parameter, "name");
if (name === null) return false;
if (NodeKind(name) !== "Identifier") return false;
return TextOf(name) === "this";
```

## method ParamValue:(name:string)=>int

**一个形参「读出来」落在哪一格**（第 134 轮）——解构形参要用它 ✓。

**为什么不能直接写下标** ✗：被捕获的形参**只住在环境格里** ✓
（`DeclareLocal` 那一条写着为什么 ✓），所以「第 i 个形参」在**槽**里可能是个空壳 ✗。
`ResolveAccess` 两个方向各只有一处 ✓——这里走它 ✓（与 `LowerParamDefault` 同一个形状 ✓）。

```ts
const access = this.ResolveAccess(name);
const slot = this.Reserve(1);
if (access.InEnv) {
  this.Emit(Op.EnvGet, slot, access.Depth, access.Cell, -1);
} else {
  this.Emit(Op.Move, slot, access.Slot, -1, -1);
}
return slot;
```

## method LowerParamDefault:(name:string, initializer:AstNode)=>void

**一个默认参数的那段开场代码**（第 119 轮）：`没有传` 或 `传了 undefined` 时才算它。

**判定必须用严格相等，不能用 `is_nullish`** ✗：JS 的规矩是**只有 `undefined`** 触发默认值，
`f(null)` 里的 `null` **是值、不是缺**（`is_nullish` 会把两者都算进去，那是 `??` 的口径）✗。
所以这里发的是 `cmp_eq_strict(参数, undefined)`。

**为什么这一段必须写在函数体里、而不是调用方**：默认值是**被调方的代码**——
它在本帧的作用域里求值（能看见前面的参数），调用方那边根本没有这些槽。

**参数住在哪就读写哪**（这一条是判据抓出来的 ✗）：**被捕获的参数只住在环境格里**
（`DeclareLocal` 那一条：声明的那一刻把值搬进格，之后本层也走 `EnvGet`/`EnvSet`），
所以默认值**不能只写槽** ✗——写进去没人读，内层函数从环境里读到的是开帧时那个 `undefined`。
症状是「默认值看起来没生效」，而真正错的地方在这里。读写都走 `ResolveAccess`，
槽与环境两条路各只有一处。

```ts
const access = this.ResolveAccess(name);
const current = this.Reserve(1);
if (access.InEnv) {
  this.Emit(Op.EnvGet, current, access.Depth, access.Cell, -1);
} else {
  this.Emit(Op.Move, current, access.Slot, -1, -1);
}
const undefinedConst = this.Program().AddConst(Constant.OfUndefined());
const missing = this.RtCall2(RtOp.CmpEqStrict, current, undefinedConst);
const skip = this.Here();
// 极性：`missing` 为假（传了值）就跳过默认值那一段。
this.Emit(Op.JumpIfFalse, missing, 0, -1, -1);
const value = this.LowerExpression(initializer);
if (access.InEnv) {
  this.Emit(Op.EnvSet, value, access.Depth, access.Cell, -1);
} else {
  this.Emit(Op.Move, access.Slot, value, -1, -1);
}
this.Release(value);
this.PatchTarget(skip, this.Here());
this.Release(current);
```

## method AttachPrototype:(closure:int)=>void

**给一个函数值挂上它的 `prototype` 对象**——JS 里**每个 `function` 都自带一个**
（不是等到有人写 `F.prototype.x = …` 时才现造）。

**不是所有函数值都该有**：箭头函数没有（它不可构造），对象字面量与类里的**方法**也没有
（它们同样不是构造函数）。所以**由调用方决定要不要调这个**——「哪种函数能当构造函数」
是语言层的判断，引擎不必知道。

**`prototype.constructor` 的回指今天不挂**：那个回指是为 `instanceof` 服务的，
要和它一起做；现在挂上去，反而会让人以为 `instanceof` 已经能用。

```ts
const proto = this.Reserve(1);
this.EmitRt(RtOp.NewObject, proto, proto, 0);
const key = this.Program().AddConst(Constant.OfString(UnitsOf("prototype")));
this.SetPropertyConst(closure, key, proto);
// **`prototype.constructor` 回指**：JS 里每个函数的原型都指回函数自己
// （`x.constructor` 那种写法靠它，`instanceof` 的语义也要求这个形状）。
const constructorKey = this.Program().AddConst(Constant.OfString(UnitsOf("constructor")));
this.SetPropertyConst(proto, constructorKey, closure);
```

## method LowerFunctionValue:(node:AstNode, name:string)=>int

**一个函数值**：造闭包（带当前环境）、函数体排队、返回闭包所在的那一格。

箭头函数、函数表达式、对象字面量里的方法都走它——**它们与函数声明的区别只有两点**：
没有名字（不进 `Entries`）、以及结果是**一个值**而不是一格声明。

**箭头函数的 `this`**：它没有自己的接收者，取的是**造它那一刻外层的**那一个——
所以外层那一层会多开一格隐藏捕获（`EnterFunctionBody` 的 `needsThis`），
箭头体里的 `this` 就走环境链（`PendingFunction.IsArrow` + `InArrow` 那两段）。
**这一格只在有箭头时才开**，正是它把「模块里有箭头」这件事变成了别的函数的坑。

```ts
const params = this.FunctionParams(node);
// **默认值一并抄走**（第 119 轮）：它们在函数体开场跑，而体是**后面**才降级的
// （`PendingFunction.Defaults` 那一段写着理由）。
const defaultAt: number[] = [];
const defaults: AstNode[] = [];
this.CollectDefaults(node, defaultAt, defaults);
// **解构形参**（第 134 轮）：与默认值同一个形状的两份平行数组 ✓
//（CollectPatternParams 那一段写着为什么是两份 ✓）。
const patternAt: number[] = [];
const patterns: AstNode[] = [];
this.CollectPatternParams(node, patternAt, patterns);
const body = Child(node, "body");
const patch = this.Program().AddConst(Constant.OfInt(0));
// **函数名那一格**（第 238 轮 ✓）：`HeapClosure.Name` 一直**没人填** ✗，
// 于是**每一个脚本函数**在 `console.log` 里都是 `[Function (anonymous)]` ✓，
// 而 Node 给 `[Function: greet]` ✓ / `[Function: arrow]` ✓——**实测过** ✓
//（`ex-computed-member-call` 那条判据现场红的正是这一处 ✓）。
//
// **名字从哪来**（三档 ✓，次序是语义 ✗）：
// 1. **`FunctionNameHint` 优先** ✓（`const arrow = () => 2` 那一档 ✓，
//    名字来自**绑定的那一刻** ✓，见那一格 ✓）；
// 2. **否则用 `name`** ✓（调用方给的：函数表达式的真名 ✓、或者
//    `"<arrow>"` / `"<function>"` 那两个**占位符** ✓）；
// 3. **占位符要当匿名** ✓——见下面那一句（`<` 开头的不传 ✓，否则
//    `console.log(() => 1)` 会印出 `[Function: <arrow>]` ✓，
//    而 Node 印的是 `[Function (anonymous)]` ✓，**实测踩过** ✓）。
let displayName = this.FunctionNameHint !== "" ? this.FunctionNameHint : name;
if (displayName.length > 0 && displayName.charAt(0) === "<") displayName = "";
const nameConst = displayName === ""
  ? this.Program().AddConst(Constant.OfUndefined())
  : this.Program().AddConst(Constant.OfString(UnitsOf(displayName)));
const window = this.Reserve(3);
const enclosing = this.Env.Last();
if (enclosing === null) {
  this.Emit(Op.Const, window, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
} else {
  this.Emit(Op.Move, window, enclosing.Slot, -1, -1);
}
this.Emit(Op.Const, window + 1, patch, -1, -1);
this.Emit(Op.Const, window + 2, nameConst, -1, -1);
const slot = this.Reserve(1);
this.EmitRt(RtOp.NewClosure, slot, window, 3);
// **退到闭包之上，不是退到窗口**：窗口是先预留的，`Release(window)` 会把**闭包格**
// 一起退掉——下一个分配就盖在它上面（表现是「调用了非闭包的值」）。
this.Release(slot + 1);
// **函数表达式自带 `prototype`**（箭头与对象方法不——它们不可构造）。
if (NodeKind(node) === "FunctionExpression") {
  this.AttachPrototype(slot);
}
const item = new PendingFunction(name, body, params, patch, defaultAt, defaults, patternAt, patterns);
item.IsExpressionBody = NodeKind(body) !== "Block";
// **箭头与其余函数值的区别就在这一格**（第 119 轮）：箭头没有自己的 `this`，
// 于是它的 `this` 去环境链上取（`PendingFunction.IsArrow` 那一段写着理由）。
item.IsArrow = NodeKind(node) === "ArrowFunction";
// **`*` 要看原始字段**：它在投影里是一枚 token，`OptionalChild` 只认「带 kind 的节点」，
// 于是会把它判成「没有」——生成器函数于是被当成普通函数（判据报的是
// `suspend outside a generator`：体里那对 suspend/resume 落在了一个普通帧上）。
item.IsGenerator = node["asteriskToken"] !== undefined && node["asteriskToken"] !== null;
item.IsAsync = this.NodeIsAsync(node);
// **剩余参数那位**（第 133 轮）：与 IsGenerator / IsAsync 一起从树上读一次 ✓，
// 之后由函数表那一格带着走 ✓（开帧的人要用它 ✓）。
item.HasRest = this.HasRestParam(node);
// **这三格以前在每一处各写一遍** ✗（第 229 轮收口 ✓）：函数声明 ✓、函数表达式 ✓，
// 而**类的方法那一处漏了三句** ✗——于是 `class C { *keys() { … } }` 把生成器体
// 当成普通函数降级 ✓，那对 `suspend` / `resume` 落在普通帧上 ✓，
// 报的是 `suspend outside a generator` ✗（离现场很远 ✗）。
// **现在三处共用 `LowerFunctionValue` 到这里为止的那一段** ✓——
// 类那条路只要不再自己抛 ✓，标记就自然对上了 ✓。
item.Envs = this.Env.Clone();
this.Pending.push(item);
return slot;
```

## method LowerArrayLiteral:(node:AstNode)=>int

**数组字面量**：先造空数组，再逐格写。

**洞要保留**：`[1, , 3]` 里的空位是 `OmittedExpression`——**跳过它**（不写任何东西），
后面那一格的下标照旧是 2，于是数组在 0..1 之间留下洞（`SetAt` 会补洞）。
写一个显式的 `undefined` 进去就**变成另一个语义**了（`1 in a` 会从假变真）。

**展开（`[...xs]`，第 132 轮）**：下标从这一刻起**不再是编译期的数** ✓——
`[...a, b]` 里 `b` 落在第几格要看 `a` 有多长 ✓。

**两条路，按「有没有展开」分** ✓（**顺序即语义** ✓）：

- **没有展开**（绝大多数 ✓）：走**静态下标**那条 ✓——一个算数都不做 ✓，
  洞天然保留 ✓（上面的规矩一个字没改 ✓）；
- **有展开**：**展开之前的**元素仍走静态下标 ✓（于是 `[1, , ...xs]` 里那个洞照样保留 ✓），
  **从第一个展开起**改用「接在 `length` 后面」✓（`SetIndex(数组, 数组.length, 值)` ✓，
  一个新算子都没有 ✓）；**这一段的洞响亮地抛** ✗
  （`[...xs, , 3]` 要让「洞」也带上动态下标 ✓，那要求引擎给一个 `set_hole` 算子 ✗——
  宁可说不做 ✓，也不把它悄悄填成 `undefined` ✗：`1 in a` 会从假变真 ✗）。
- **展开本身**走 `SpreadIntoId` 那条**语言内建调用** ✓（与 `get_iterator` 同一个号段 ✓）：
  数组逐项接 ✓、字符串逐码元接 ✓、`Map` / `Set` 先过 `GetIterator` ✓、其余**响亮地抛** ✓。

```ts
const array = this.Reserve(1);
this.EmitRt(RtOp.NewArray, array, array, 0);
const elements = ListOf(node, "elements");
let sawSpread = false;
for (let i = 0; i < elements.length; i++) {
  const element = elements[i];
  if (NodeKind(element) === "OmittedExpression") {
    // **展开之后的洞做不了**（见上面那一条）✗——它要是被静默填成 `undefined`，
    // `1 in arr` 就从假变真 ✗（那是**形状**变了，判据量不出来、用户量得出来 ✗）。
    if (sawSpread) throw new Error("unimplemented: a hole after a spread element in an array literal");
    continue;
  }
  const spread = NodeKind(element) === "SpreadElement";
  if (spread) sawSpread = true;
  const value = spread ? this.LowerExpression(Child(element, "expression")) : this.LowerExpression(element);
  if (spread) {
    const window = this.Reserve(3);
    this.Emit(Op.Const, window, this.IntConst(SpreadIntoId), -1, -1);
    this.Emit(Op.Move, window + 1, array, -1, -1);
    this.Emit(Op.Move, window + 2, value, -1, -1);
    this.EmitRt(RtOp.HostCall, window, window, 3);
    this.Release(window);
    continue;
  }
  // **接在末尾**（有展开之后）✓ / **写在编译期那一格**（还没有展开）✓。
  let at = -1;
  if (sawSpread) {
    // **`arr.length` 是一条 `get_prop`**（`props.xl.md` 的 `IsLengthKey` 认它 ✓）——
    // **不能写成 `EmitRt(RtOp.GetProp, at, array, key)`** ✗：`EmitRt` 的后两个操作数是
    // **窗口基址与格数** ✓，不是「接收者 + 常量下标」✗。那样写出来的是
    // 「窗口从 `array` 开始、只有 `key` 格」——**装载验证当场拒** ✓
    //（报的是 `argument window out of range` ✓，离现场只有半步 ✓）。
    at = this.RtCall2(RtOp.GetProp, array, this.Program().AddConst(Constant.OfString(UnitsOf("length"))));
  } else {
    at = this.Reserve(1);
    this.Emit(Op.Const, at, this.IntConst(i), -1, -1);
  }
  const window = this.Reserve(3);
  this.Emit(Op.Move, window, array, -1, -1);
  this.Emit(Op.Move, window + 1, at, -1, -1);
  this.Emit(Op.Move, window + 2, value, -1, -1);
  this.EmitRt(RtOp.SetIndex, window, window, 3);
  this.Release(window);
  this.Release(at);
}
this.Release(array + 1);
return array;
```

## method EmitDefineAccessor:(target:int, key:int, half:int, isGetter:bool)=>void

**把半边访问器落到 `target` 上**（对象字面量与类共用这一处，第 102 轮抽出来的）。

**为什么要抽出来**：窗口是 `[号, 目标, 键, getter, setter]` 五格，写两遍就是**两次**把槽算错的机会——
而这个工程最贵的错就是算错槽（症状是「值悄悄换成别的」，不是崩溃）。

**调用方负责 `key` 那一格**（键在两种场景下算法不同：对象字面量看 `name` 的 kind，
类里已经判过名了），**并且负责在下面把目标留在活着的槽里**（循环还要用）。

```ts
const window = this.Reserve(5);
this.Emit(Op.Const, window, this.IntConst(DefineAccessorId), -1, -1);
this.Emit(Op.Move, window + 1, target, -1, -1);
this.Emit(Op.Move, window + 2, key, -1, -1);
const missing = this.Program().AddConst(Constant.OfUndefined());
if (isGetter) {
  this.Emit(Op.Move, window + 3, half, -1, -1);
  this.Emit(Op.Const, window + 4, missing, -1, -1);
} else {
  this.Emit(Op.Const, window + 3, missing, -1, -1);
  this.Emit(Op.Move, window + 4, half, -1, -1);
}
this.EmitRt(RtOp.HostCall, window, window, 5);
// **结果不要**（`DefineAccessor` 返回 `true`）：退到 `key`，把键/半边/窗口一起退掉。
// 目标在它们下面，仍然活着——循环还要用它。
this.Release(key);
```

## method LowerObjectLiteral:(node:AstNode)=>int

**对象字面量**：先造普通对象（原型取 `Protos.Object`），再逐条 `set_prop`。

**五种成员都收**：`a: 1`、`{a}`、方法、**计算键**（`{ [k]: 1 }`——键是一个**值**，
所以走 `set_prop` 的「键也能是值」那条路）、以及**访问器**（`get x()` / `set x(v)`，第 99 轮补）。
**展开（`{...o}`）第 132 轮补上** ✓：落成一条 `Object.assign(目标, 来源)` 的**语言内建调用** ✓
（`[号, 目标, 来源…]` + 一条 `host_call` ✓，与 `StringConcat` 同一个写法 ✓）。

**展开的顺序**：JS 里展开与普通成员是**按源码顺序**生效的 ✓——
`{...o, a: 1}` 给 `a: 1` ✓、`{a: 1, ...o}` 由 `o` 覆盖 ✓。
这里就是**顺序发出去** ✓，`Object.assign` 本来也是「后写的覆盖先写的」✓，两边同一条规矩 ✓。

**两处已知差**（都是 `Object.assign` 那条口径带过来的 ✓，记在 `globals.xl.md` 里 ✓）：
**访问器不调 getter** ✗（JS 的对象展开走 `[[Get]]` ✓）、**原始值来源跳过** ✗
（JS 里 `{...'ab'}` 给 `{0:'a',1:'b'}` ✓）。

**访问器不走 `set_prop`**：那条只写**数据属性**。引擎侧早就读得懂访问器（`ReadProperty` 调 getter、
`SetProperty` 调 setter），缺的是「造一个」的路——那条路是 `props.xl.md` 的 `DefineAccessor`，
由语言内建号 `DefineAccessorId`（号段 700..799）暴露出来。

```ts
const object = this.Reserve(1);
this.EmitRt(RtOp.NewObject, object, object, 0);
const properties = ListOf(node, "properties");
for (let i = 0; i < properties.length; i++) {
  const property = properties[i];
  const kind = NodeKind(property);
  let keyConst = -1;
  let value = -1;
  if (kind === "PropertyAssignment") {
    const name = Child(property, "name");
    value = this.LowerExpression(Child(property, "initializer"));
    if (NodeKind(name) === "ComputedPropertyName") {
      const keySlot = this.LowerExpression(Child(name, "expression"));
      this.SetPropertyValue(object, keySlot, value);
      continue;
    }
    keyConst = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(name)));
  } else if (kind === "ShorthandPropertyAssignment") {
    const name = Child(property, "name");
    value = this.LowerExpression(name);
    keyConst = this.Program().AddConst(Constant.OfString(UnitsOf(TextOf(name))));
  } else if (kind === "MethodDeclaration") {
    const name = Child(property, "name");
    // **计算键的方法**（第 183 轮修 ✓）：`{ [k]() { … } }` / `{ [Symbol.iterator]() { … } }` ✓——
    // 名字那一格是 `ComputedPropertyName` ✓（里面装的是**表达式** ✓），
    // 而这一支原来按 `TextOf(name)` 取名字 ✗ → 报
    // `ast node ComputedPropertyName has no text` ✓（**整份文件进不来** ✗）。
    // 做法与上面 `PropertyAssignment` 那条**一字不差** ✓：键算成一格**值** ✓、
    // 走 `set_prop` 的值键那条路（`SetPropertyValue` ✓）。
    // **求值顺序**与上面那条保持一致 ✓（先算值、再算键 ✗）——JS 的规范是**键在前** ✓，
    // 两处的这一格次序都记在台账里 ✗（只有键 / 值里带副作用才看得出来 ✓）。
    if (NodeKind(name) === "ComputedPropertyName") {
      value = this.LowerFunctionValue(property, "<computed>");
      const keySlot = this.LowerExpression(Child(name, "expression"));
      this.SetPropertyValue(object, keySlot, value);
      continue;
    }
    // **方法名要把外面那条提示顶掉** ✓（第 238 轮 ✓，**实测踩过** ✗）：
    // `const o = { run() { … } }` 里，`FunctionNameHint` 还留着**外面那个变量名** `o` ✓
    //（`LowerVariable` 置的 ✓）——不顶掉的话 `console.log(o.run)` 印
    // `[Function: o]` ✓，而 Node 给 `[Function: run]` ✓（**实测** ✓：
    // 判据 `ex-computed-member-call` 就是这么红的 ✓）。
    // **这一处的名字来自树**（`TextOf(name)` ✓），**不是**来自绑定的那一刻 ✓——
    // 所以这里把提示**临时清掉** ✗（清空 ⇒ `LowerFunctionValue` 那一档自然用 `name` ✓）。
    // **计算键那一档不清** ✓：它本来就匿名 ✓（`"<computed>"` 以 `<` 开头 ✓，
    // `LowerFunctionValue` 会把它当匿名 ✓）。
    const savedMethodHint = this.FunctionNameHint;
    this.FunctionNameHint = "";
    value = this.LowerFunctionValue(property, TextOf(name));
    this.FunctionNameHint = savedMethodHint;
    // **键走 `KeyUnitsOf`、不走 `TextOf`**（第 183 轮修 ✓）：`{ "x-y"() { … } }` 的键是
    // **字符串字面量** ✓，而 `TextOf` 取的是**原文**（带引号 ✗）——于是那一格存在 `"x-y"` 上
    // （名字里真的有两个引号 ✓，`Object.keys` 印得出来 ✓），按 `o["x-y"]` 取永远取不到 ✗。
    // 同一个函数里的 `PropertyAssignment` 那条**一直用的是 `KeyUnitsOf`** ✓（它认得字符串键 ✓）。
    keyConst = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(name)));
  } else if (kind === "GetAccessor" || kind === "SetAccessor") {
    // **访问器**：发一条内部调用 `define_accessor(对象, 键, getter, setter)`。
    // `{ get x() {} set x(v) {} }` 是**两条**成员，各自只带一半——**缺的那一半给
    // `undefined`**（`DefineAccessor` 的规矩：`setter = undefined` 就是只读访问器）。
    const name = Child(property, "name");
    const key = this.Reserve(1);
    this.Emit(Op.Const, key, this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(name))), -1, -1);
    const half = this.LowerFunctionValue(property, kind === "GetAccessor" ? "<getter>" : "<setter>");
    this.EmitDefineAccessor(object, key, half, kind === "GetAccessor");
    continue;
  } else if (kind === "SpreadAssignment") {
    // **`{...o}`**（第 132 轮）：一条 `Object.assign(目标, 来源)` 的**语言内建调用** ✓。
    // 窗口是 `[号, 目标, 来源]` ✓（与 `StringConcat` 同一个形状 ✓），结果落在窗口第一格 ✓
    // ——那正是 `object` 自己 ✓，所以**不必把结果搬回去** ✓（`Object.assign` 返回的就是目标 ✓）。
    const source = this.LowerExpression(Child(property, "expression"));
    const spreadWindow = this.Reserve(3);
    this.Emit(Op.Const, spreadWindow, this.IntConst(ObjectAssign), -1, -1);
    this.Emit(Op.Move, spreadWindow + 1, object, -1, -1);
    this.Emit(Op.Move, spreadWindow + 2, source, -1, -1);
    this.EmitRt(RtOp.HostCall, spreadWindow, spreadWindow, 3);
    this.Release(spreadWindow);
    continue;
  } else {
    throw new Error("unimplemented: object literal member " + kind);
  }
  this.SetPropertyConst(object, keyConst, value);
}
this.Release(object + 1);
return object;
```

## method KeyUnitsOf:(name:AstNode)=>Array<int>

**属性名的码元**。

字符串字面量走 `StringUnits`（那里拦着「空字符串在投影里是带引号形式」那条歧义），
标识符与数字直接取 `text`——数字键在 JS 里会被字符串化，而 `text` 本来就是那串数字。

```ts
if (NodeKind(name) === "StringLiteral") return this.StringUnits(name);
return UnitsOf(TextOf(name));
```

## method SetPropertyConst:(object:int, keyConst:int, value:int)=>void

`obj[key] = value`，键来自常量池。

```ts
const window = this.Reserve(3);
this.Emit(Op.Move, window, object, -1, -1);
this.Emit(Op.Const, window + 1, keyConst, -1, -1);
this.Emit(Op.Move, window + 2, value, -1, -1);
this.EmitRt(RtOp.SetProp, window, window, 3);
this.Release(window);
```

## method SetPropertyValue:(object:int, key:int, value:int)=>void

`obj[key] = value`，键是**算出来的值**（计算键）。

```ts
const window = this.Reserve(3);
this.Emit(Op.Move, window, object, -1, -1);
this.Emit(Op.Move, window + 1, key, -1, -1);
this.Emit(Op.Move, window + 2, value, -1, -1);
this.EmitRt(RtOp.SetProp, window, window, 3);
this.Release(window);
```

## method LowerNew:(node:AstNode)=>int

`new C(args)`：造对象 → 拿它当 `this` 调构造函数 → 返回时按 JS 规矩收尾
（收尾在引擎里：`vm.xl.md` 的 `DoNew` 与 `DoReturn`——**构造函数返回了对象就用那个**）。

**原型今天取 `Protos.Object`**：真正的语义要读构造函数的 `prototype` **属性**，
而那个名字属于建库层（`DoNew` 那一节写了为什么）。这一轮给的是一个**明确、可预期**的答案。
**宿主构造函数不走这一支** ✓（`DoNew` 里那条宿主分支排在前面 ✓：`new Map()` 那个实例
是宿主自己造的 ✓）——降级层**不知道也不需要知道**哪个全局名是宿主构造函数 ✓。

**构造目标只认标识符与属性访问**：`new (f())()` 这种要先求值再构造，
形状不同、语义也不同（`new.target` 那一套），这一轮抛。

**第 145 轮删掉了 `Date` 那条特例** ✓：它原来把 `new Date(毫秒)` 直接落成一条
`host_call(DateCtor, …)` ✓，理由是「普通对象不能被 `new`」✗——那一格现在补上了 ✓
（`heap.xl.md` 的 `AttachCallable` ✓），所以这一支走**普通的路** ✓：
取全局槽里的 `Date` ✓ → `Op.New` ✓ → `DoNew` 认出「它带可调用载荷」 ✓ → 宿主造实例 ✓。
**删掉的是降级层对某个全局名的特例** ✓（那是分层上最不该有的一种知识 ✗），
换来的是 `const D = Date; new D(0)` 也对 ✓。

```ts
const callee = Child(node, "expression");
const calleeKind = NodeKind(callee);
let ctor = -1;
if (calleeKind === "Identifier") {
  const access = this.ResolveAccess(TextOf(callee));
  ctor = this.Reserve(1);
  if (access.InEnv) {
    this.Emit(Op.EnvGet, ctor, access.Depth, access.Cell, -1);
  } else {
    this.Emit(Op.Move, ctor, access.Slot, -1, -1);
  }
} else if (calleeKind === "PropertyAccessExpression") {
  ctor = this.LowerAccess(callee);
} else {
  // **一般表达式：先求值、再构造** ✓（第 211 轮 ✓）。
  //
  // **原来这里抛** ✗（`unimplemented: new with a <kind> target` ✓），而落在这儿的正是
  // 那些**形状很普通**的写法 ✓：`new (class { … })()` ✓（类表达式当构造目标 ✓）、
  // `new (make(5))()` ✓（先调一个工厂再构造 ✓）、`new (A)` ✓（括号套一层 ✓）——
  // 判据 `cls-expression` / `ex-new-class-expression` 现场红的 ✓（整份文件进不来 ✗）。
  //
  // **为什么现在敢放行** ✓：`Op.New` 拿的就是**构造函数那一格的值** ✓，
  // 与「标识符」/「属性访问」那两条路**同一个落点** ✓——多出来的活只是「这个值怎么算出来」✓。
  // **`new.target` 那一层顾虑不成立** ✗：JS 在 `new (f())()` 里调 `f` 用的是**普通调用** ✓
  //（`new.target` 是 `undefined` ✓），而 `LowerExpression` 降的就是普通调用 ✓——两边一致 ✓。
  ctor = this.LowerExpression(callee);
}
const args = ListOf(node, "arguments");
const count = args.length;
// **`new C(...xs)`**（第 197 轮 ✓）：引擎的 `Op.New` 只认「从某格开始的**连续**若干格」✗，
// 而带展开的实参个数**只有运行期才知道** ✗——所以先把实参收成一个数组 ✓
//（`BuildArgsArray` ✓，与 `f(...xs)` 那条**完全同一个**铺法 ✓），
// 再走 `NewApplyId` 这条**语言内建调用** ✓：那一侧按数组铺开、并按 JS 的
// `[[Construct]]` 造实例 ✓（读 `prototype` ✓ → 拿它当原型造对象 ✓ → 用它当 `this` 调构造函数 ✓
// → 构造函数返回对象就用它 ✓）。**引擎一行都不用改** ✓。
if (this.HasSpread(args)) {
  const spreadArgs = this.BuildArgsArray(args);
  const window = this.Reserve(3);
  this.Emit(Op.Const, window, this.IntConst(NewApplyId), -1, -1);
  this.Emit(Op.Move, window + 1, ctor, -1, -1);
  this.Emit(Op.Move, window + 2, spreadArgs, -1, -1);
  const produced = this.Reserve(1);
  this.EmitRt(RtOp.HostCall, produced, window, 3);
  this.Release(window);
  this.Release(spreadArgs);
  // **别漏了 `ctor` 那一格**（第 197 轮实测抓到的 ✓）：下面是**早返回** ✗，
  // 而原路末尾有一句 `Release(ctor)` ✓——漏掉它水位就高一格 ✓，
  // 后面所有变量的槽**整体错位** ✓（实测：`runtime:check` 5 条红、`runtime:cli` 4 份不一致 ✓，
  // 症状离现场很远 ✗）。**这就是这条纪律存在的理由** ✓。
  this.Release(ctor);
  return produced;
}
// 结果落在参数基址上，所以 `argc = 0` 时基址仍要占一格（与 `LowerCall` 同一条规则）。
const base = this.Reserve(count > 0 ? count : 1);
for (let i = 0; i < count; i++) {
  this.LowerInto(base + i, args[i]);
}
this.Emit(Op.New, ctor, base, count, -1);
// **别退到结果格以下**（第 132 轮修的一处**潜伏 bug** ✓）：`Op.New` 的结果写在 `base` 上 ✓，
// 而 `base` 在 `ctor` **上面** ✓——原来这里写的是 `Release(ctor)` ✗，水位一下退回了 `ctor`，
// 于是**下一个分配就会盖掉刚造出来的那个对象** ✗。
// **它一直潜伏**，是因为紧接着的一次分配（`const s = new Set(...)` 里的变量格 ✓）
// 恰好就落在同一个格上 ✓——`Move` 到自己是空操作，值反而活了下来 ✓。
// 一旦中间**多一次**分配（`[...new Set([1, 2])]` 那个展开窗口就是 ✓），对象就被换成别的 ✗
// ——判据现场：`[...new Set([1, 2])]` 接出来是**空的** ✓，而 `[...s]`（先存变量）是对的 ✓。
// `LowerCall` 那一条一直是 `Release(base + 1)` ✓，这里照它对齐 ✓。
this.Release(base + 1);
return base;
```

## method BindGlobals:()=>void

**从入口的参数 0 里取出全局名**（宿主给的环境对象），逐个绑进来。

**环境对象缺某个名字时给 `undefined`**：不报错——因为「宿主没提供」与
「这门语言没有它」在这里分不开；而**用**到它的时候（`Math.floor(...)`）自然会报
「调用了不是闭包的值」。**在绑定点报错会更难查**（它离现场更远）。

**绑定走 `BindName`**：被内层函数引用到的全局名会**进环境格**（一份状态一处存放），
没被引用的就只是普通槽——不必为 `Math` 单独发明一套。

```ts
if (this.Globals.length === 0) return;
const source = 0;
for (let i = 0; i < this.Globals.length; i++) {
  const key = this.Program().AddConst(Constant.OfString(UnitsOf(this.Globals[i])));
  const value = this.RtCall2(RtOp.GetProp, source, key);
  this.BindName(this.Globals[i], value, false);
}
```

## method NodeIsAsync:(node:AstNode)=>bool

这个函数式节点是不是带 `async`。

**看 `modifiers` 里有没有 `AsyncKeyword`**：投影把 `async` 放在修饰符数组里
（`[{"kind":"AsyncKeyword","text":"async",...}]`）——与 `*` 是**不同**的存法
（那个是单独的 token 字段）。**两种都探过**，所以这里不是猜的。

```ts
const modifiers = node["modifiers"];
if (modifiers === undefined || modifiers === null) return false;
const items = modifiers as AstNode[];
for (let i = 0; i < items.length; i++) {
  if (NodeKind(items[i]) === "AsyncKeyword") return true;
}
return false;
```

## method LowerAwait:(node:AstNode)=>int

**`await`**：挂起当前帧（`await`）+ 恢复时接住兑现值（`resume`）。

**两条指令的形状就是引擎判据里那份程序**（`vm.xl.md` 的 `await` 一节）：
`Await A(承诺槽)` 把这一帧从栈上摘下来挂到承诺的反应表上，
承诺结清时恢复帧被排进**微任务队列**；恢复后接着跑的那条 `Resume` 把兑现值写进一格，
**那一格就是整个 `await` 表达式的值**。

**不在 `async` 里就抛**：与 `yield` 同一条理由——放到运行期会把普通帧挂住，
而调用者还在下面等，**整条链静默停住**。

**不退水位**：接住兑现值的那一格要在后面一直活着（第 24 轮那条教训）。

```ts
if (!this.InAsync) {
  throw new Error("unimplemented: await outside an async function");
}
const promise = this.LowerExpression(Child(node, "expression"));
this.Emit(Op.Await, promise, -1, -1, -1);
const resolved = this.Reserve(1);
this.Emit(Op.Resume, resolved, -1, -1, -1);
return resolved;
```

## method LowerConditional:(node:AstNode)=>int

**`cond ? a : b`**（第 63 轮补的）。

**两个分支只跑一个**：JS 的规矩是**懒**的——没被选中的那一边**连求值都不发生**
（`x ? f() : g()` 只调一个）。所以这里用**跳转**，而不是「两边都算再挑一个」。
后者看起来更短，但它会在 `cond ? 1 : g()` 里**多调一次 `g`**——副作用多一次，
而且**看不出错在哪**。

**结果先占一格**：两个分支各自算完都 `Move` 进它。那一格在所有临时量**下面**，
所以分支里怎么分配都踩不到它——这正是第 59 轮那个 bug 的**反面**
（那次是结果格被 `Release` 交了出去，这次是让它一直活着）。

**两处 `Release` 都在结果之上**（`Release(条件 + 1)` / `Release(结果 + 1)`）：
既放掉临时量，又留住结果。

```ts
const result = this.Reserve(1);
const condition = this.LowerExpression(Child(node, "condition"));
const skipThen = this.Here();
this.Emit(Op.JumpIfFalse, condition, 0, -1, -1);
this.Release(condition + 1);
const whenTrue = this.LowerExpression(Child(node, "whenTrue"));
this.Emit(Op.Move, result, whenTrue, -1, -1);
this.Release(result + 1);
const skipElse = this.Here();
this.Emit(Op.Jump, -1, 0, -1, -1);
this.PatchTarget(skipThen, this.Here());
const whenFalse = this.LowerExpression(Child(node, "whenFalse"));
this.Emit(Op.Move, result, whenFalse, -1, -1);
this.Release(result + 1);
this.PatchTarget(skipElse, this.Here());
return result;
```

## method LowerTemplate:(node:AstNode)=>int

**模板串**：从左到右拼——头段、每个内插（**渲染成文本**之后）、每段字面量。

**第 125 轮改成走语言内建那条拼接** ✓（`ConcatValues` ✓）：模板串的语义就是
「把每一段 `ToString` 之后接起来」✓，而 **`ToString` 的口径在语言层** ✓
（`text.xl.md` ✓）。原来这里用引擎的 `rt_call add` ✗——它只认自己认识的那几档 ✓，
于是 `` `${obj}` `` / `` `${5 / 2}` `` 会**抛** ✓（判据现场抓到的 ✓），
而这两种写法在真实代码里遍地都是 ✓。

**投影保证两件事**（第 66 轮刚补上）：三个模板段的 `text` 都在（**不含分隔符**），
所以这里直接取文本即可，不必回头去扫源码。

```ts
const headText = this.Program().AddConst(Constant.OfString(UnitsOf(TextOf(Child(node, "head")))));
const result = this.Reserve(1);
this.Emit(Op.Const, result, headText, -1, -1);
const spans = ListOf(node, "templateSpans");
for (let i = 0; i < spans.length; i++) {
  const value = this.LowerExpression(Child(spans[i], "expression"));
  const joined = this.ConcatValues(result, value);
  const literal = Child(spans[i], "literal");
  const literalText = this.Program().AddConst(Constant.OfString(UnitsOf(TextOf(literal))));
  // **常量要先落进一格**：`ConcatValues` 收的是**槽号** ✓（与 `RtCall2` 那条收常量的路不同 ✗）。
  const tailSlot = this.Reserve(1);
  this.Emit(Op.Const, tailSlot, literalText, -1, -1);
  const tail = this.ConcatValues(joined, tailSlot);
  this.Emit(Op.Move, result, tail, -1, -1);
  // **临时量随段落退掉**：不退的话 `Peak` 会随段落数长（这一轮顺手收的 ✓）。
  this.Release(result + 1);
}
return result;
```

## method LowerYield:(node:AstNode)=>int

**`yield`**：落成 `suspend` / `resume` 一对。

**为什么是两条**：`suspend` 把帧冻住、控制权回到推它的人（`DoIterNext`）；
下一次 `next(v)` 恢复时**接着跑的是 `suspend` 的下一条**——也就是这里放的 `resume`，
它把 `v` 写进一格。**那一格就是整个 `yield` 表达式的值**，于是 `const got = yield 1` 成立。

**`yield *` 委托迭代** ✓（第 230 轮 ✓）：转发 `next` 那一半 ✓——见 `LowerYieldDelegation` ✓。
**`throw` / `return` 那两个方向转发不了** ✗（要引擎在「生成器被 `.throw()`」时
把值送进内层 ✓，那是另一件事 ✓），记在台账里 ✓。

**不在生成器里就抛**：`yield` 写在内层普通函数里是**语法错误**（JS 就是这么定的）——
让它跑到运行期，会变成一条把**普通帧**冻住的 `suspend`（帧不在栈上、没人推它，静默挂死）。

**这里不退水位**：`resume` 写进去的那一格要在后面一直活着，
退到它下面就等于把刚接到的值交给下一次分配覆盖（第 24 轮那条教训）。

```ts
if (!this.InGenerator) {
  throw new Error("unimplemented: yield outside a generator function");
}
if (node["asteriskToken"] !== undefined && node["asteriskToken"] !== null) {
  const source = OptionalChild(node, "expression");
  if (source === null) throw new Error("unimplemented: yield* without an expression");
  return this.LowerYieldDelegation(source);
}
const operand = OptionalChild(node, "expression");
const slot = this.Reserve(1);
if (operand === null) {
  this.Emit(Op.Const, slot, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
} else {
  this.LowerInto(slot, operand);
}
this.Emit(Op.Suspend, slot, -1, -1, -1);
const sent = this.Reserve(1);
this.Emit(Op.Resume, sent, -1, -1, -1);
return sent;
```

## method LowerYieldDelegation:(source:AstNode)=>int

**`yield* xs`**（第 230 轮 ✓）——**把内层被迭代的每一项转手 yield 出去** ✓，
最后交出内层的**返回值** ✓。

**它凭什么不用新算子** ✓：JS 的规范把 `yield*` 定义成一段**等价的循环** ✓：
取内层的迭代器 ✓、一轮一轮 `next()` ✓、每一项 `yield` 出去 ✓，
内层 `done` 时把它的 `value` 当**整个 `yield*` 表达式的值** ✓——
而这三样（`GetIterator` ✓ / `IterNew` + `IterNext` ✓ / `Suspend` + `Resume` ✓）
**第 111 / 129 轮就都在了** ✓。

**两处次序是语义** ✗：
- **`GetIterator` 排在 `IterNew` 之前** ✓（与 `for..of` 那条**一字不差** ✓）：
  引擎只认数组与生成器 ✓，`Map` / `Set` / `Symbol.iterator` 那一族要语言层先物化 ✓；
- **每一项都要 `Suspend` 之后再 `Resume`** ✓：`yield*` 的每一项都会**挂起外层生成器** ✓
  （`yield* [1, 2]` 要两次 `next()` 才走完 ✓，判据 `gen-delegating` 钉的就是它 ✓）——
  少了 `Suspend` 就变成「一次收完再一起给」✗（那正是这一格原来那句抛的理由 ✓）。

**已知差** ✗：转发不了 `throw` / `return` 两个方向 ✓（见 `LowerYield` 那一段 ✓）。

```ts
this.PushScope();
const iterableSource = this.Reserve(1);
this.LowerInto(iterableSource, source);
// **先过语言层那一道** ✓（与 `LowerForOf` 的写法一字不差 ✓）。
const iterableWindow = this.Reserve(2);
this.Emit(Op.Const, iterableWindow, this.IntConst(GetIteratorId), -1, -1);
this.Emit(Op.Move, iterableWindow + 1, iterableSource, -1, -1);
this.EmitRt(RtOp.HostCall, iterableWindow, iterableWindow, 2);
this.Release(iterableWindow + 1);
const iteratorSlot = this.Reserve(1);
this.EmitRt(RtOp.IterNew, iteratorSlot, iterableWindow, 1);
const undefinedConst = this.Program().AddConst(Constant.OfUndefined());
// **「最后那一步的 `value`」自己占一格** ✓（它是整个 `yield*` 的值 ✓）：
// **不能等循环出来再补一次 `IterNext`** ✗——那会**多推一次内层** ✓
//（多跑一段别人的代码 ✓、还可能多一次副作用 ✓），而 JS 里没有那一次 ✓。
// **也不能把 `pair` 直接用掉** ✗：`pair` 是新分配的一格 ✓，在**下一次 `RtCall2` 之前**
// 就可能被复用 ✓——所以每一轮都要把值**抄进这一格** ✓（它跨整轮活着 ✓）。
const lastValue = this.Reserve(1);
const start = this.Here();
const context = this.EnterLoop(true, start);
const pair = this.RtCall2(RtOp.IterNext, iteratorSlot, undefinedConst);
const done = this.RtCall2(RtOp.GetIndex, pair, this.IntConst(1));
const running = this.RtCall1(RtOp.Not, done);
const exitIndex = this.Here();
this.Emit(Op.JumpIfFalse, running, 0, -1, -1);
const produced = this.RtCall2(RtOp.GetIndex, pair, this.IntConst(0));
this.Emit(Op.Move, lastValue, produced, -1, -1);
// **每一项：先 `Suspend` 再 `Resume`** ✓（见上面那一段 ✓）。
this.Emit(Op.Suspend, produced, -1, -1, -1);
const sentItem = this.Reserve(1);
this.Emit(Op.Resume, sentItem, -1, -1, -1);
this.Emit(Op.Jump, -1, start, -1, -1);
this.PatchTarget(exitIndex, this.Here());
this.LeaveLoop(context);
this.PopScope();
return lastValue;
```

## method CollectImports:(statement:AstNode)=>void

**把一条 `import` 里的本地名收进全局名单**（值由宿主从**被导入模块的导出表**里取）。

**本地名是 `name`，不是 `propertyName`**：`import { other as alias }` 里
`propertyName` 是 `other`（对方模块里的名字）、`name` 是 `alias`（**这一份文件里用的名字**）。
绑错那个，代码里写 `alias(...)` 就找不到东西——而报错会指向「未知名字」，离现场很远。

**`import * as ns` 抛**：命名空间对象是一个「把对方导出表包起来的对象」，
那是另一件事（要跨模块取**整张**表，而不是几个名字）。

```ts
if (NodeKind(statement) !== "ImportDeclaration") return;
const clause = OptionalChild(statement, "importClause");
if (clause === null) return;
const defaultName = OptionalChild(clause, "name");
if (defaultName !== null && NodeKind(defaultName) === "Identifier") {
  this.Globals.push(TextOf(defaultName));
}
const bindings = OptionalChild(clause, "namedBindings");
if (bindings === null) return;
if (NodeKind(bindings) === "NamespaceImport") {
  throw new Error("unimplemented: `import * as ns` needs a namespace object");
}
const elements = ListOf(bindings, "elements");
for (let i = 0; i < elements.length; i++) {
  const name = OptionalChild(elements[i], "name");
  if (name === null || NodeKind(name) !== "Identifier") {
    throw new Error("unimplemented: import specifier without a simple name");
  }
  this.Globals.push(TextOf(name));
}
```

## method HasModifier:(node:AstNode, kind:string)=>bool

这个节点上有没有某一个修饰符（`export` / `static` / `async` / `declare` …）。

**投影把修饰符放在 `modifiers` 数组里**（`[{"kind":"StaticKeyword",...}]`），
与 `*` 那种「单独一个 token 字段」不同——**两种存法都探过**，这里不是猜的。

```ts
const modifiers = node["modifiers"];
if (modifiers === undefined || modifiers === null) return false;
const items = modifiers as AstNode[];
for (let i = 0; i < items.length; i++) {
  if (NodeKind(items[i]) === kind) return true;
}
return false;
```

## method LowerClass:(node:AstNode, asExpression:bool)=>int

**`class`**：造构造函数 → 给它挂 `prototype` → 每个方法挂到 prototype 上 → 返回构造函数。

**方法为什么这样就能用**：`p.m()` 走 `call_method`（在 `p` 上找 `m`）——
实例自己没有 `m`，于是**顺原型链**找到 prototype 上的闭包 ✓，`this` 仍然是 `p` ✓。
所以「类」在这里**不是新机制**，是「函数值 + 原型链 + 方法调用」三样既有东西的组合。

**类名要先占一格**：方法体里可以引用类名（`class C { m() { return C; } }`），
而闭包的环境是**造它那一刻**抄下来的——名字必须在那之前就在作用域里。

**先做不做**（都抛，写进文首那张表）：生成器方法与 async 方法、计算键成员、
`extends` 一个表达式（只认简单名字）。

**第 128 轮起已收**：**实例字段初始化**（`x = 1` / 光写名字的也落一格 `undefined` ✓，
写的是 `this.<名字>` ✓）、**`static` 字段 / 方法 / 访问器**（落在构造函数自己身上 ✓）、
**`static { … }` 静态块**（造一个无参函数、立刻用构造函数当 `this` 调一次 ✓）。
顺序照 JS：**静态成员在类声明的位置、按源码顺序**求值 ✓；
**实例字段在构造函数体之前**（参数默认值之后）✓，派生类里**跟在 `super(...)` 之后** ✓。

**两处写在明处的差异**：① 字段写入走的是**赋值**（`set_prop`），JS 的类字段走
`[[DefineOwnProperty]]`——原型上有同名 setter 时行为不同（JS 不调它，这里会调）；
② `extends` 一个表达式（`class B extends mixin(A) {}`）仍抛。

```ts
// **`extends` 这一轮仍然抛**（引擎那半 `set_proto` 已经就位、也验证过：空类的
// `class B extends A {}` + `new B()` 是通的；但**方法继承**那条路还有一个没查清的失败，
// 复现写在 `docs/typescript-parsing-gaps.md`）。**查不清就不放行**——
// **`extends`：方法继承就是一条 `set_proto`**（子类 prototype 的原型指向父类 prototype，
// 于是 `b.m()` 沿链先看子类的、没有再往上走到父类的）。
//
// **父类有构造函数仍然抛**：`super(...)` 还没做，而「子类实例上少了父类设的字段」
// 是**静默错值**——宁可不做。**父类查不到（比如 import 进来的）也算查不清，同样抛**。
let superProto = -1;
// **名字的取法收到了 `SuperClassNameOf` 里** ✓（第 141 轮 ✓）：
// 它原来有两个调用点 ✓（`LowerClass` 自己 ✓ 与 `FindParentHasConstructor` 递归时 ✓）——
// **第 203 轮撤掉了后一个** ✓（那条代理判据是错的 ✗，见下面 `baseName !== ""` 那一支 ✓），
// 所以这里现在只剩一处 ✓，但「取法只有一份」这条纪律照旧 ✓。
const baseName = this.SuperClassNameOf(node);
{
  if (baseName !== "") {
    const access = this.ResolveAccess(baseName);
    const baseSlot = this.Reserve(1);
    if (access.InEnv) {
      this.Emit(Op.EnvGet, baseSlot, access.Depth, access.Cell, -1);
    } else {
      this.Emit(Op.Move, baseSlot, access.Slot, -1, -1);
    }
    const baseKey = this.Program().AddConst(Constant.OfString(UnitsOf("prototype")));
    superProto = this.RtCall2(RtOp.GetProp, baseSlot, baseKey);
  }
}
const nameNode = OptionalChild(node, "name");
let name = "<class>";
if (nameNode !== null && NodeKind(nameNode) === "Identifier") name = TextOf(nameNode);
if (!asExpression) {
  if (nameNode === null || NodeKind(nameNode) !== "Identifier") {
    throw new Error("unimplemented: class declaration without a name");
  }
}
const members = ListOf(node, "members");
let ctorNode: AstNode | null = null;
let explicitCtor: AstNode | null = null;
for (let i = 0; i < members.length; i++) {
  if (NodeKind(members[i]) === "Constructor") {
    ctorNode = members[i];
    explicitCtor = members[i];
  }
}
// **派生类的默认构造函数永远要转发** ✓（第 203 轮改 ✓）：
// JS 给的就是 `constructor(...args) { super(...args); }` ✓——**与父类有没有写构造函数无关** ✓。
//
// **原来这里还多问一句「父类有没有构造函数」** ✗（`FindParentHasConstructor` ✓，第 141 轮 ✓）——
// 那是当时的**代理判据** ✓：那一轮 `super(...xs)` 刚做出来 ✓，只敢在「父类确实有构造函数」
// 时才合成 ✓。**那条代理判据是错的** ✗：`class A { value = "A" } class B extends A { value = "B" }`
// 里父类**没有显式构造函数**（但有字段初始化式 ✓），于是 `B` 拿到的是**空的**默认构造函数 ✗——
// `super()` 一次都不调 ✓，结果：**父类的字段初始化没跑** ✓、
// 而 `B` 自己的字段初始化**正等着 `super` 那一点**（`FieldInitDue` ✓）也**永远不会跑** ✗。
// 实测：`new B().read()` 给 `undefined` ✓（JS 给 `"B"` ✓）——**静默错值** ✓，
// 第 203 轮判据现场就是这么红的 ✓。
//
// **撤掉代理判据的代价是零** ✓：转发那条路本来就要走（`super(...args)` ✓），
// 父类有没有构造函数**不影响该不该转发** ✓——只影响转到哪儿 ✓。
if (baseName !== "") {
  // 少了 `super(...)`，「父类设的字段在子类实例上不存在」——那是**静默错值**。
  // （JS 在这里是运行期报 ReferenceError；我们在降级期就报，更早也更响。）
  if (explicitCtor === null) {
    // **默认构造函数要转发参数**（第 141 轮 ✓）：JS 给的是
    // `constructor(...args) { super(...args); }` ✓——少了它，
    // `class MyError extends Error {}`（**最常见的那个写法** ✓）连 `new MyError("x")` 都跑不起来 ✗。
    //
    // **为什么这一轮才敢合成** ✗：它要两样东西，两样都是新近才有的 ✓——
    // **剩余参数**（第 133 轮 ✓）与 **`super(...xs)`**（这一轮 ✓，见上面那一支 ✓）。
    // 合成出来的树就是那两样的**最小组合** ✓：一个带 `...args` 的形参 + 一条 `super(...args)` ✓。
    //
    // **它的形状必须与投影给的一模一样** ✗（这是合成的风险所在 ✓）：
    // `Parameter.dotDotDotToken` 只要**不是 null** 就算剩余 ✓（`FunctionParams` 那条判据 ✓）、
    // `CallExpression.expression.kind === "SuperKeyword"` 才是 `super` ✓（`LowerCall` 那一支 ✓）、
    // 展开的实参是 `SpreadElement` ✓（`HasSpread` ✓）。四处对不上就是「合成了个普通调用」✗。
    const restName = { kind: "Identifier", text: "args" };
    const restParam = {
      kind: "Parameter",
      name: restName,
      dotDotDotToken: { kind: "DotDotDotToken" },
    };
    const forward = {
      kind: "CallExpression",
      expression: { kind: "SuperKeyword" },
      arguments: [{ kind: "SpreadElement", expression: { kind: "Identifier", text: "args" } }],
    };
    ctorNode = {
      kind: "Constructor",
      parameters: [restParam],
      body: { kind: "Block", statements: [{ kind: "ExpressionStatement", expression: forward }] },
    };
  } else if (!HasSuperCall(explicitCtor)) {
    throw new Error("unimplemented: this derived constructor must call super(...)");
  }
}
if (ctorNode === null) {
  // **默认构造函数**：JS 会给一个空的（`new C()` 于是合法）。
  ctorNode = { kind: "Constructor", parameters: [], body: { kind: "Block", statements: [] } };
}
// **实例字段先摘出来**（第 128 轮）：它们的初始化式跑在**构造函数那一帧**里
// （见 `PendingFunction.FieldDefaults` 那一段），不走下面「挂到 prototype 上」那条路。
//
// **只摘实例字段** ✓（第 203 轮）：静态字段与静态块**不预先分类** ✗——
// 它们要**按源码顺序与彼此交错着**发 ✓（见下面那一趟 ✓），
// 先分成两摞再发就会把顺序弄丢 ✗（那是**静默错值** ✓，第 203 轮修的 ✓）。
const instanceFields: AstNode[] = [];
for (let i = 0; i < members.length; i++) {
  if (NodeKind(members[i]) !== "PropertyDeclaration") continue;
  if (this.HasModifier(members[i], "StaticKeyword")) continue;
  instanceFields.push(members[i]);
}
const ctor = this.LowerFunctionValue(ctorNode, name);
// **构造函数那一项就是刚推进去的最后一项**（`LowerFunctionValue` 只推一项）。
// 把基类名记在它身上：`super(...)` 只允许出现在这一层，判定靠它。
if (baseName !== "" && this.Pending.length > 0) {
  this.Pending[this.Pending.length - 1].SuperName = baseName;
}
if (this.Pending.length > 0 && instanceFields.length > 0) {
  // **字段初始化式挂在构造函数上**（第 128 轮）：它们要在那一帧里、`this` 上写属性。
  const ctorItem = this.Pending[this.Pending.length - 1];
  ctorItem.FieldDefaults = instanceFields;
  // **派生类要让位给 `super(...)`**：`this` 在它返回之前不存在，而它可能不在第一条语句。
  ctorItem.FieldInitDeferred = baseName !== "";
}
// **构造函数那一项也要记下自己的槽位**（第 69 轮补的）：函数声明那条路显式设了
// `item.Slot`，类这条路一直**没设**——于是模块的**导出数组**按那个默认槽位取值，
// 取到的是碰巧在那儿的一个**对象**（不是闭包）。表现是跨模块 `new Counter(...)` 报
// 「拿普通对象当构造函数」，而 `ExportOf("Counter")` 看着完全正常（下标对 ✓）。
if (this.Pending.length > 0) {
  this.Pending[this.Pending.length - 1].Slot = ctor;
}
this.AttachPrototype(ctor);
// **绑定放在造闭包之后**（与函数声明同一条规矩）：名字被内层捕获时，
// 绑定在**环境格**里，而 `DeclareLocal` 会把当时那一格（还是空的）搬进格——
// 那样后面写进槽的值根本没人读，表现是「调用了非闭包的值」。
if (!asExpression) {
  this.BindName(name, ctor, false);
}
const prototypeKey = this.Program().AddConst(Constant.OfString(UnitsOf("prototype")));
const proto = this.RtCall2(RtOp.GetProp, ctor, prototypeKey);
if (superProto >= 0) {
  this.RtCallValues(RtOp.SetProto, proto, superProto);
}
for (let i = 0; i < members.length; i++) {
  const member = members[i];
  const kind = NodeKind(member);
  if (kind === "Constructor") continue;
  // **字段不在这里**（第 128 轮）：实例字段挂去了构造函数（`FieldDefaults`），
  // 静态字段与静态块**按源码顺序**在原型循环之后一起发（见下面那一趟）。
  if (kind === "PropertyDeclaration" || kind === "ClassStaticBlockDeclaration") continue;
  if (kind !== "MethodDeclaration" && kind !== "GetAccessor" && kind !== "SetAccessor") {
    throw new Error("unimplemented: class member " + kind);
  }
  // **没有体的成员不是成员**（第 148 轮）：`abstract kind(): string;` ✓、
  // 接口式的成员签名 ✓、**方法重载签名** ✓（`m(a: string): void; m(a: any) { … }` ✓）
  // 都是这一形状 ✓——它们在运行期什么都不产生 ✓（重载的实现在**那条带体的**成员里 ✓）。
  // 少了这一条，`abstract class` 一降级就报 `ast node MethodDeclaration has no child body` ✗
  //（实测 ✓：抽象类 + 抽象方法是很普通的写法 ✓）。
  if (OptionalChild(member, "body") === null) continue;
  // **静态成员的落点是构造函数自己**，不是原型（下面那个 `target` 就是这一条）。
  const isStatic = this.HasModifier(member, "StaticKeyword");
  // **生成器方法与 `async` 方法收下了** ✓（第 229 轮 ✓）：它们与普通方法的区别**只在
  // `PendingFunction` 那三格标记上** ✓（`IsGenerator` / `IsAsync` ✓）——而
  // `LowerFunctionValue` 现在**自己从树上读** ✓（那一段写着为什么 ✓）。
  //
  // 原来这里对两者**响亮地抛** ✗（比静默当成普通方法好 ✓——生成器体里那对
  // `suspend` / `resume` 落在一个普通帧上会**静默挂死** ✗）。可这两条写法在类里很正常 ✓
  //（判据 `e2e-mixed-everything` 就是一个 `*keys()` ✓），而机制**早就有了** ✓：
  // 函数声明与函数表达式那两条路第 129 轮就把 `*` 收下了 ✓，只是**方法与它们差了那三句** ✗
  //（**同一个形状三处各写一遍** ✗）。
  if (this.NodeIsAsync(member)) {
    throw new Error("unimplemented: async method in a class");
  }
  const memberName = Child(member, "name");
  // **私有名也是成员名**（第 195 轮 ✓）：`#m()` 那一格的 kind 是 `PrivateIdentifier` ✓，
  // 与私有**字段**（`#n = 1` ✓，第 128 轮就通了 ✓）走的是同一条路 ✓——
  // 键就是那串文本（`#m` ✓，见 `KeyUnitsOf` ✓）。
  // 原来这里只认 `Identifier` / `StringLiteral` ✗，于是**整个类**都进不来 ✗
  //（`unimplemented: computed or numeric class member name` ✓，实测 ✓）。
  //
  // **计算成员名收下了** ✓（第 229 轮 ✓）：`[Symbol.iterator]() { … }` ✓、
  // `static [Symbol.hasInstance](v) { … }` ✓——名字那一格是 `ComputedPropertyName` ✓
  //（里面装的是**表达式** ✓），做法与对象字面量那一处**一字不差** ✓
  //（`LowerObjectLiteral` 的 `MethodDeclaration` 支 ✓：键算成一格**值** ✓、
  // 走 `SetPropertyValue` ✓）——**同一个形状两处各写一遍就是两处会漂** ✗。
  // 少了它，`[Symbol.iterator]()` 那种写法让**整个类**进不来 ✗
  //（判据 `symbol-hasinstance` / `e2e-linked-list` 卡的就是这一句 ✓）。
  const computedName = NodeKind(memberName) === "ComputedPropertyName";
  if (!computedName && NodeKind(memberName) !== "Identifier" && NodeKind(memberName) !== "StringLiteral"
    && NodeKind(memberName) !== "PrivateIdentifier") {
    throw new Error("unimplemented: computed or numeric class member name");
  }
  const closure = this.LowerFunctionValue(member, computedName ? "<computed>" : name + "." + TextOf(memberName));
  // **给刚排队的方法也盖上父类名**（第 104 轮）：构造函数在它自己那一处盖，
  // 而方法**以前没盖** ✗——于是方法体里的 `super.m(...)` 一降级就报
  // 「outside a derived class method」（`InSuperName` 挂在排队函数上，空串就是不认识 `super`）。
  // **盖在 `LowerFunctionValue` 之后**：它就是 push 那一格，和构造函数那条路同一个手法。
  if (baseName !== "") {
    this.Pending[this.Pending.length - 1].SuperName = baseName;
  }
  const target = isStatic ? ctor : proto;
  // **计算键那一档** ✓：键是一个**值** ✓（`Symbol.iterator` 那类 ✓），
  // 而访问器与普通方法**都要**它 ✓——所以这条判据放在那两路**之前** ✓
  //（放在里面就是两个分支各写一遍 ✗）。
  const computedKey = computedName ? this.LowerExpression(Child(memberName, "expression")) : -1;
  if (kind === "GetAccessor" || kind === "SetAccessor") {
    // **类里的访问器落在 target 上**（JS 就是这样：实例自己不持有它，从原型链上找）——
    // 与对象字面量那一处的唯一区别就是「落在谁身上」，其余全走同一个 `EmitDefineAccessor`。
    let keySlot = computedKey;
    if (keySlot < 0) {
      keySlot = this.Reserve(1);
      this.Emit(Op.Const, keySlot, this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(memberName))), -1, -1);
    }
    this.EmitDefineAccessor(target, keySlot, closure, kind === "GetAccessor");
    if (computedKey < 0) this.Release(keySlot);
    continue;
  }
  if (computedKey >= 0) {
    this.SetPropertyValue(target, computedKey, closure);
    continue;
  }
  const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(memberName)));
  this.SetPropertyConst(target, key, closure);
}
// **静态字段与静态块按源码顺序发** ✓（第 203 轮修 ✓）：两类都在类**声明的位置**求值，
// 而 JS 的规矩是**它们按源码里出现的先后**跑 ✓（写进构造函数自己那一格 ✓）。
//
// **原来是两趟** ✗（先所有静态字段 ✓、再所有静态块 ✓）——那是**静默错值** ✓：
// `class C { static a = 1; static { C.b = 2 } static c = 3 }` 里
// `static { }` 看得见 `a` 与 `c` ✓，而代码块**跑在 `c` 之前** ✓——
// 两趟的写法会让 `c` 先于那个块跑 ✓，块里读 `C.c` 就**读到还没写的值** ✗。
// 实测（第 203 轮判据 `ex-static-block-order` ✓）：node 给 `a,block1,b,block2` ✓，
// 两趟给 `a,b,block1,block2` ✓——**顺序反了** ✓，而两边的每一格都"跑过了" ✗。
//
// **一趟里怎么分开处理**：静态块要**造一个闭包 + 立刻调**（下面那段 ✓），
// 静态字段只要一句 `this.<名> = <式>` ✓——同一条 `members` 扫描里按 kind 分派即可 ✓。
for (let i = 0; i < members.length; i++) {
  const member0 = members[i];
  const kind1 = NodeKind(member0);
  // **实例字段与实例方法已经处理过了**（字段挂去了构造函数 ✓、方法挂去了原型 ✓）：
  // 这一趟只管**静态**的那两类 ✓。`HasModifier` 说的是「这一格是不是静态」✓——
  // 实例字段在这里被跳过 ✓（它在 `instanceFields` 里 ✓）。
  if (kind1 === "PropertyDeclaration") {
    if (!this.HasModifier(member0, "StaticKeyword")) continue;
    this.EmitFieldInit(ctor, member0);
    continue;
  }
  if (kind1 !== "ClassStaticBlockDeclaration") continue;
  // **静态块**（第 128 轮）：`static { … }` 就是「造一个无参函数、立刻用构造函数当 `this` 调一次」——
  // 与 `class` 的其余部分同一条路（函数值 + 调用），没有新机制。
  const synthetic = { kind: "FunctionExpression", parameters: [], body: Child(member0, "body") };
  const closure = this.LowerFunctionValue(synthetic, name + ".<static>");
  const selfSlot = this.Reserve(1);
  this.Emit(Op.Move, selfSlot, ctor, -1, -1);
  const base = this.Reserve(1);
  this.Emit(Op.Call, closure, base, 0, selfSlot);
  this.Release(base + 1);
}
return ctor;
```

## method LowerFunctionDeclaration:(node:AstNode)=>void

函数声明：**名字占一格、造一个闭包放进去、函数体排队**。

**没有捕获时 `env` 是 `undefined`**（`Constant.OfUndefined` 就是为这一条加的）。

```ts
const name = Child(node, "name");
if (NodeKind(name) !== "Identifier") {
  throw new Error("unimplemented: function declaration without a name");
}
// **参数解析与函数表达式共用一处**（第 119 轮顺手收掉一份重复）：
// 这里原来自己抄了一遍「只收简单名、默认值一律抛」，于是**加默认参数要改两个地方**——
// 而且两处的判据还不一样（这边漏了 `questionToken` 那一条）。
const params = this.FunctionParams(node);
const defaultAt: number[] = [];
const defaults: AstNode[] = [];
this.CollectDefaults(node, defaultAt, defaults);
// **解构形参**（第 134 轮）：与默认值同一个形状的两份平行数组 ✓
//（CollectPatternParams 那一段写着为什么是两份 ✓）。
const patternAt: number[] = [];
const patterns: AstNode[] = [];
this.CollectPatternParams(node, patternAt, patterns);
const slot = this.Reserve(1);
const patch = this.Program().AddConst(Constant.OfInt(0));
// **函数名那一格**（第 238 轮 ✓）：见 `LowerFunctionValue` 那一段 ✓
//（函数声明这条路原来一个名字都不带 ✗，于是 `function greet(){}` 也是 `[Function (anonymous)]` ✓）。
const nameConst = this.Program().AddConst(Constant.OfString(UnitsOf(TextOf(name))));
const window = this.Reserve(3);
const enclosing = this.Env.Last();
if (enclosing === null) {
  this.Emit(Op.Const, window, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
} else {
  this.Emit(Op.Move, window, enclosing.Slot, -1, -1);
}
this.Emit(Op.Const, window + 1, patch, -1, -1);
this.Emit(Op.Const, window + 2, nameConst, -1, -1);
this.EmitRt(RtOp.NewClosure, slot, window, 3);
// **退到闭包之上，不是退到窗口**（理由见 `LowerFunctionValue` 那一处）。
this.Release(slot + 1);
// **函数声明也自带 `prototype`**（`new F()` 靠它把方法落到实例上）。
this.AttachPrototype(slot);
// **声明放在造闭包之后**：这个名字可能被内层捕获，那样 `DeclareLocal` 会把这一格的
// 值搬进环境格——搬早了搬的就是一个空槽（判据报的是几十条指令之外的「调用了非闭包」）。
this.DeclareLocal(TextOf(name), slot);
const item = new PendingFunction(TextOf(name), Child(node, "body"), params, patch, defaultAt, defaults, patternAt, patterns);
item.Slot = slot;
item.IsGenerator = node["asteriskToken"] !== undefined && node["asteriskToken"] !== null;
item.IsAsync = this.NodeIsAsync(node);
// **剩余参数那位**（第 133 轮）：与 IsGenerator / IsAsync 一起从树上读一次 ✓，
// 之后由函数表那一格带着走 ✓（开帧的人要用它 ✓）。
item.HasRest = this.HasRestParam(node);
item.Envs = this.Env.Clone();
this.Pending.push(item);
```

**环境从哪来**：链尾那一层的 `Slot`——它是**当前帧**里那一格，所以一条 `Move` 就够
（闭包的环境参数要的是值，不是句柄）。链是空的时候给 `undefined`：这个函数外面
没有任何环境，它也没什么可捕获的（`scope.xl.md` 那条「含内层函数就开环境」保证了
**该有的层一层都不缺**）。

## method LowerExpression:(node:AstNode)=>int

表达式分派：返回**装着这个值的那一格**。

约定：**返回值是临时槽**（调用方用完可以把水位退到它下面）——除非它是变量自己的槽，
而那种情况只在赋值里出现。

```ts
const kind = NodeKind(node);
// **`SpreadElement` 落在裸表达式位上：把它剥掉** ✓（第 234 轮 ✓）。
//
// **它为什么会出现** ✗：`...` 只许写在三种位置 ✓（数组字面量的元素 ✓、调用的实参 ✓、
// 对象字面量的成员 ✓），而那三处的降级都**自己**认 `SpreadElement` ✓
//（`LowerArrayLiteral` ✓、`LowerCall` 的 `HasSpread` ✓、`LowerObjectLiteral` ✓）——
// 它们要的是「**这一格是不是展开**」这个信息 ✓，所以那一格不能先被剥掉 ✗。
//
// 可**投影**还会把它留在别处 ✓：实测 `[...xs.length ? xs : ys]` 的树是
// `ArrayLiteral > ConditionalExpression` ✓，而**三元的那一格「条件」是 `SpreadElement`** ✗
//（实测 `SpreadElement[47,59]` ✓——区间从 `...` 起算 ✓，所以 `...` 绑得比三元还紧 ✓）。
// 于是 `LowerConditional` 去降「条件」时拿到一个 `SpreadElement` ✓，
// 报的是 `unimplemented: expression SpreadElement` ✗——一句话听起来像
// 「`...` 没人支持」✓，其实**别处的 `...` 都是好的** ✗。
//
// **为什么剥掉是对的** ✗：三元 / 二元 / 一元的**操作数**位置上，`...` 没有别的含义 ✓——
// 那种写法在 JS 里**本来就是语法错误** ✓（`...x ? a : b` 单独写出来不合法 ✓），
// 它能出现在这里只是因为**外面那个数组字面量已经认过它了** ✓。
// 剥掉之后跑的是「展开那个三元的结果」✓——正是 JS 的语义 ✓（判据
// `array-spread-conditional` 的第一项就是它 ✓）。
//
// **第二项为什么本来就是好的** ✓：`[...(xs.length ? xs : ys)]` 里括号把三元**包成一个单元** ✓，
// 数组那一层看到的就是「展开那个单元」✓——判据里两条一起放 ✓（**对照** ✓）。
if (kind === "SpreadElement") {
  return this.LowerExpression(Child(node, "expression"));
}
if (kind === "NumericLiteral") {
  const slot = this.Reserve(1);
  // **走 `NumberConst`**：整数收 `Int32`、其余收 `Float64`（第 129 轮）——`IntConst` 只给内部整数用 ✓。
  this.Emit(Op.Const, slot, this.NumberConst(NumberFromText(TextOf(node))), -1, -1);
  return slot;
}
if (kind === "StringLiteral") {
  const slot = this.Reserve(1);
  const index = this.Program().AddConst(Constant.OfString(this.StringUnits(node)));
  this.Emit(Op.Const, slot, index, -1, -1);
  return slot;
}
if (kind === "TrueKeyword" || kind === "FalseKeyword") {
  const slot = this.Reserve(1);
  const index = this.Program().AddConst(Constant.OfBool(kind === "TrueKeyword"));
  this.Emit(Op.Const, slot, index, -1, -1);
  return slot;
}
if (kind === "NullKeyword") {
  const slot = this.Reserve(1);
  this.Emit(Op.Const, slot, this.Program().AddConst(Constant.OfNull()), -1, -1);
  return slot;
}
if (kind === "ThisKeyword") {
  const slot = this.Reserve(1);
  // **只有箭头才在环境链上找 `this`**（`InArrow` 那一段写着为什么）：
  // 普通函数有自己的接收者，环境链上那一格是**外层**的，读它就是读错人。
  const captured = this.InArrow ? this.Env.Resolve("this") : null;
  if (captured !== null) {
    // 这一层（或某一层外层）把接收者存进了环境格——**箭头走的就是这条**。
    this.Emit(Op.EnvGet, slot, captured.Depth, captured.Cell, -1);
  } else {
    this.Emit(Op.LoadThis, slot, -1, -1, -1);
  }
  return slot;
}
if (kind === "Identifier") {
  const access = this.ResolveAccess(TextOf(node));
  const slot = this.Reserve(1);
  if (access.InEnv) {
    this.Emit(Op.EnvGet, slot, access.Depth, access.Cell, -1);
  } else {
    this.Emit(Op.Move, slot, access.Slot, -1, -1);
  }
  return slot;
}
if (kind === "ParenthesizedExpression") {
  return this.LowerExpression(Child(node, "expression"));
}
if (kind === "PropertyAccessExpression" || kind === "ElementAccessExpression") {
  return this.LowerAccess(node);
}
if (kind === "BinaryExpression") {
  return this.LowerBinary(node);
}
if (kind === "CallExpression") {
  return this.LowerCall(node);
}
if (kind === "ArrayLiteralExpression") {
  return this.LowerArrayLiteral(node);
}
if (kind === "ObjectLiteralExpression") {
  return this.LowerObjectLiteral(node);
}
if (kind === "ArrowFunction") {
  return this.LowerFunctionValue(node, "<arrow>");
}
if (kind === "FunctionExpression") {
  const name = OptionalChild(node, "name");
  const label = name === null ? "<function>" : TextOf(name);
  return this.LowerFunctionValue(node, label);
}
if (kind === "ClassExpression") {
  return this.LowerClass(node, true);
}
if (kind === "NewExpression") {
  return this.LowerNew(node);
}
if (kind === "ConditionalExpression") {
  return this.LowerConditional(node);
}
if (kind === "TaggedTemplateExpression") {
  return this.LowerTaggedTemplate(node);
}
if (kind === "TemplateExpression") {
  return this.LowerTemplate(node);
}
if (kind === "NoSubstitutionTemplateLiteral") {
  // **没有内插的模板**。投影对**字面量**的 `text` 一律是「**带引号的原文**」
  // （普通字符串带双引号、模板带反引号）——所以这里要把那对反引号剥掉，
  // 并且**断言**它确实是这种形式（不是就抛，免得把原文当内容拼进去）。
  //
  // 顺带一提：模板这一支**天然没有空串歧义**（`` `` `` 剥完就是空内容），
  // 而普通字符串那边因为「带引号的原文」与「内容就是两个引号」分不开，
  // 才一直是台账里那条缺口。
  // **两种口径都要接住**：实测投影对**空模板**给的是带反引号的原文（`` `` ``），
  // 对**非空**模板给的是裸内容——与其断言一种，不如「有反引号就剥掉」。
  // （这条不一致记在台账里：字面量的 `text` 口径应当统一，现在是两套。）
  let raw = TextOf(node);
  if (raw.length >= 2 && raw[0] === "`" && raw[raw.length - 1] === "`") {
    raw = raw.slice(1, raw.length - 1);
  }
  const slot = this.Reserve(1);
  this.Emit(Op.Const, slot, this.Program().AddConst(Constant.OfString(UnitsOf(raw))), -1, -1);
  return slot;
}
if (kind === "YieldExpression") {
  return this.LowerYield(node);
}
if (kind === "AwaitExpression") {
  return this.LowerAwait(node);
}
if (kind === "TypeOfExpression") {
  const subject = Child(node, "expression");
  // **`typeof` 一个没声明的名字**（第 149 轮）：JS 里这是**唯一不抛**的未声明读法 ✓——
  // `typeof window !== "undefined"` 这种特性检测遍地都是 ✓，而且 Node 跑得动它 ✓
  //（实测：`console.log(typeof window)` 给 `undefined` ✓），本仓原来在**降级期**就抛 ✗
  //（整份文件进不来 ✓）。
  //
  // **结果是字符串 `"undefined"`** ✓——不是 `undefined` 那个值 ✗
  //（这一点最容易写错 ✓：`typeof` 给的一定是字符串 ✓）。
  // **只在这一格成立** ✗：`typeof` 之外读同一个名字照旧抛 ✓（与 JS 一致 ✓）——
  // 所以这里**不往作用域里塞任何东西** ✓，只是把这一处的答案换成常量 ✓。
  //
  // **判据是「这个名字在不在作用域链上」** ✓（本地槽 ✓ + 捕获环境 ✓）：
  // 全局名是**局部槽**（`DeclareGlobals` 声明过 ✓），所以 `typeof console` 照旧走真路 ✓。
  if (NodeKind(subject) === "Identifier" && this.NameIsUnreachable(TextOf(subject))) {
    const missing = this.Reserve(1);
    this.Emit(Op.Const, missing,
      this.Program().AddConst(Constant.OfString(UnitsOf("undefined"))), -1, -1);
    return missing;
  }
  const value = this.LowerExpression(subject);
  return this.RtCall1(RtOp.Typeof, value);
}
if (kind === "AsExpression" || kind === "SatisfiesExpression") {
  // **`x as T` / `x satisfies T` 是类型位的语法**（第 163 轮）：把那一层**擦掉** ✓，值就是 `x` ✓。
  // 与第 148 轮那条口径同源 ✓（**类型位一律擦除** ✓）——`as` 不改变运行期的值 ✓
  //（它只让类型检查器换个看法 ✓），`satisfies` 更是纯检查 ✓。
  //
  // **它俩原来都报 `unimplemented`** ✗（整份文件进不来 ✗），而 `x as T` 在真实 `.ts` 里
  // 到处都是 ✓——量出来的现场：`const s = "abc" as unknown as string;` ✓
  //（`as unknown as T` 那种「双重断言」也很常见 ✓，擦两层与擦一层是同一件事 ✓）。
  return this.LowerExpression(Child(node, "expression"));
}
if (kind === "VoidExpression") {
  // **`void x`**（第 163 轮）：求值 `x` ✓、把结果丢掉 ✓、整句给 `undefined` ✓——JS 就是这么定的 ✓。
  // `void 0` 是「拿一个确定的 `undefined`」那个老写法 ✓（到处都在用 ✓），
  // 而这一层原来报 `unimplemented: expression VoidExpression` ✗（整份文件进不来 ✗）。
  //
  // **操作数照旧求值** ✓：`void f()` 里 `f()` 必须真的跑 ✓——
  // 「`void 0` 这种常量就不求值了」那条优化**不在这一层做** ✗
  //（省一条指令 vs 多一处要判断「有没有副作用」的地方 ✓，不划算 ✓）。
  this.LowerExpression(Child(node, "expression"));
  const voided = this.Reserve(1);
  this.Emit(Op.Const, voided, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
  return voided;
}
if (kind === "DeleteExpression") {
  // **`delete`（第 92 轮补）**：引擎侧早就有它——`RtOp.DelProp` 与 `props.xl.md` 的
  // `DeleteProperty`（只删自有属性、不可配置要抛、本来不存在也算成功）。缺的只是**降级这一支**。
  //
  // **为什么键要落成一格值**：`DelProp` 是 `rt_call`，参数是槽（与 `SetPropertyConst`
  // 那条路不同——那条把键当常量下标用）。所以这里按「接收者 → 键 → 调用」三步走，
  // **顺序与 `=` 的下标写入一致**（副作用的顺序是语义）。
  const operand = Child(node, "expression");
  const operandKind = NodeKind(operand);
  const receiver = this.LowerExpression(Child(operand, "expression"));
  let key = -1;
  if (operandKind === "PropertyAccessExpression") {
    const name = Child(operand, "name");
    const nameKind = NodeKind(name);
    if (nameKind !== "Identifier" && nameKind !== "StringLiteral" && nameKind !== "NumericLiteral"
    && nameKind !== "PrivateIdentifier") {
      throw new Error("unimplemented: delete of a computed property name");
    }
    key = this.Reserve(1);
    this.Emit(Op.Const, key, this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(name))), -1, -1);
  } else if (operandKind === "ElementAccessExpression") {
    key = this.LowerExpression(Child(operand, "argumentExpression"));
  } else {
    throw new Error("unimplemented: delete of " + operandKind);
  }
  return this.RtCallValues(RtOp.DelProp, receiver, key);
}
if (kind === "PrefixUnaryExpression" || kind === "PostfixUnaryExpression") {
  // **一元前缀与后缀**（第 64 轮补的前缀、第 91 轮补的更新表达式）：投影带 `operator`
  // （运算符**文本**）——TS 那边 `operator` 是一个 `SyntaxKind` 数字，投影补的时候用了
  // **同名字段**，所以对拍尺子不会报字段不符（见 `print-ast-common.xl.md`）。
  const rawOperator = node["operator"];
  const operator = rawOperator === undefined || rawOperator === null ? "" : String(rawOperator);
  const operand = Child(node, "operand");
  const isPostfix = kind === "PostfixUnaryExpression";
  if (operator === "++" || operator === "--") {
    // **更新表达式**：读 → 算 → 写回，**左边只求值一次**（与复合赋值同一条规矩）。
    // 表达式自身的值：**前缀给新值、后缀给旧值**——这一条就是 `i++` 与 `++i` 的全部区别，
    // 而 `for (let i = 0; i < 3; i++)` 要的是后缀（值没人用，但语义上必须是旧值）。
    //
    // **左值三种落点**（第 204 轮补的后两种 ✓）：简单名字 ✓ / 属性 ✓ / 下标 ✓。
    // 三种走**同一条规矩** ✓——读与写落在**同一格**、接收者与键**只求值一次** ✓
    //（与上面复合赋值那三条分支同源 ✓，第 119 轮 ✓）。
    //
    // **原来只认标识符** ✗，理由写的是「属性 / 下标左值要『求值一次接收者』，
    // 那条路与复合赋值的限制同源」✓——而复合赋值那条路第 119 轮就修好了 ✓，
    // 这里的限制却留着 ✗：于是 `o.n++` / `xs[0]++` / `++Counter.total` 这些
    // **遍地都是**的写法整份文件都进不来 ✗（`unimplemented: update expression on a non-identifier` ✓，
    // 第 202 轮的判据现场红的 ✓）。
    const operandKind0 = NodeKind(operand);
    if (operandKind0 !== "Identifier" && operandKind0 !== "PropertyAccessExpression"
      && operandKind0 !== "ElementAccessExpression") {
      throw new Error("unimplemented: update expression on " + operandKind0);
    }
    // **结果格先占** ✓（与复合赋值那三条分支同一条纪律 ✓）：临时量都落在它**上面** ✓，
    // 最后 `Release(result + 1)` 只留它那一格活着 ✓——写回要用的接收者 / 键那之前已经用完了 ✓。
    const result = this.Reserve(1);
    const one = this.Reserve(1);
    this.Emit(Op.Const, one, this.Program().AddConst(Constant.OfInt(1)), -1, -1);
    let updated = -1;
    if (operandKind0 === "Identifier") {
      const access = this.ResolveAccess(TextOf(operand));
      const read = this.Reserve(1);
      if (access.InEnv) {
        this.Emit(Op.EnvGet, read, access.Depth, access.Cell, -1);
      } else {
        this.Emit(Op.Move, read, access.Slot, -1, -1);
      }
      // **先把旧值抄进结果格**：后缀要的就是它；前缀随后用新值覆盖。
      this.Emit(Op.Move, result, read, -1, -1);
      updated = this.RtCallValues(operator === "++" ? RtOp.Add : RtOp.Sub, read, one);
      if (access.InEnv) {
        this.Emit(Op.EnvSet, updated, access.Depth, access.Cell, -1);
      } else {
        this.Emit(Op.Move, access.Slot, updated, -1, -1);
      }
    } else if (operandKind0 === "PropertyAccessExpression") {
      // **接收者只求值一次** ✓：`f().n++` 里 `f()` 只调一次 ✓——先算接收者、读它、写回**同一格** ✓
      //（不是「重算一遍左值」✗）。
      const receiver = this.LowerExpression(Child(operand, "expression"));
      const name = Child(operand, "name");
      const nameKind = NodeKind(name);
      if (nameKind !== "Identifier" && nameKind !== "StringLiteral" && nameKind !== "NumericLiteral"
      && nameKind !== "PrivateIdentifier") {
        throw new Error("unimplemented: update expression on a computed property name");
      }
      // **私有名也是成员名** ✓（第 195 轮的口径 ✓）：键就是那串文本（`#count` ✓，见 `KeyUnitsOf` ✓）——
      // 于是 `Account.#count++` 这一格跟着一起通 ✓。
      const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(name)));
      const read = this.RtCall2(RtOp.GetProp, receiver, key);
      this.Emit(Op.Move, result, read, -1, -1);
      updated = this.RtCallValues(operator === "++" ? RtOp.Add : RtOp.Sub, read, one);
      this.SetPropertyConst(receiver, key, updated);
    } else {
      const receiver = this.LowerExpression(Child(operand, "expression"));
      const index = this.LowerExpression(Child(operand, "argumentExpression"));
      const read = this.RtCallValues(RtOp.GetIndex, receiver, index);
      this.Emit(Op.Move, result, read, -1, -1);
      updated = this.RtCallValues(operator === "++" ? RtOp.Add : RtOp.Sub, read, one);
      // **下标写回**：与复合赋值那条分支同一个形状 ✓（`set_index` 的窗口是「接收者, 下标, 值」✓）。
      const window = this.Reserve(3);
      this.Emit(Op.Move, window, receiver, -1, -1);
      this.Emit(Op.Move, window + 1, index, -1, -1);
      this.Emit(Op.Move, window + 2, updated, -1, -1);
      this.EmitRt(RtOp.SetIndex, window, window, 3);
      this.Release(window);
    }
    if (!isPostfix) {
      this.Emit(Op.Move, result, updated, -1, -1);
    }
    this.Release(result + 1);
    return result;
  }
  const value = this.LowerExpression(operand);
  if (operator === "-") return this.RtCall1(RtOp.Neg, value);
  if (operator === "!") return this.RtCall1(RtOp.Not, value);
  // **按位取反**（第 147 轮）：`~` 给整数 ✓（`~5` 是 `-6` ✓）——与 `!` 给布尔不是一回事 ✓。
  if (operator === "~") return this.RtCall1(RtOp.BitNot, value);
  // **一元 `+`**（第 198 轮 ✓）：它就是 `ToNumber` ✓——与 `Number(x)` 那一个内建
  // **同一个落点** ✓（引擎的 `RtOp.ToNumber` ✓，实现是 `rt.xl.md` 的 `ToNumberOf` ✓）。
  // 原来这里报 `unimplemented: unary operator` ✗，而 `+new Date(...)` / `+"3"` 这类
  // 写法在普通 `.ts` 里很常见 ✓（`+` 是 JS 里最短的一次数值转换 ✓）。
  if (operator === "+") return this.RtCall1(RtOp.ToNumber, value);
  // **没做的照旧抛**（不静默给近似值）：`typeof x` 与 `void x` 各自另有落点 ✓。
  throw new Error("unimplemented: unary operator `" + operator + "` (only -, +, !, ~, ++ and -- are implemented)");
}
// **非空断言 `x!` 在运行期什么也不做**（第 179 轮）✓：它只是给类型系统看的一句话 ✓——
// 降级成**它里面那个表达式** ✓（一条指令都不多 ✓，与「类型位一律擦除」同一条口径 ✓）。
// 少了这一条，`map.get(k)!` / `arr[0]!.name` / `n!()` 这些**真实代码里遍地都是**的写法报
// `unimplemented: expression NonNullExpression` ✗（**整份文件进不来** ✗）。
// **断言不是求值**：它不改值、不该有副作用 ✓，所以这里连一个临时格都不占 ✓。
if (kind === "NonNullExpression") {
  return this.LowerExpression(Child(node, "expression"));
}
throw new Error("unimplemented: expression " + kind);
```

## method NameIsUnreachable:(name:string)=>bool

**这个名字在这一层和作用域链上都找不到**（第 149 轮）——`typeof` 那一格要它 ✓。

**与 `ResolveAccess` 的区别只有「找不到怎么办」** ✗：那边**抛** ✓（读一个不存在的名字就是错 ✓），
这边**只是回答一个布尔** ✓（`typeof` 的语义是「告诉我它是什么」✓，
而一个不存在的名字的答案是 `"undefined"` ✓）。

**两处用的是同一份查找顺序** ✓（本地槽 → 捕获环境 ✓）：写成两套的话，
`typeof` 与普通读会在「捕获的名字上」分歧 ✓——那种分歧**不报错** ✓，只给一个错的答案 ✗。

**「找不到」有两种，这里不细分** ✓：`ResolveAccess` 分的 `DeclaredNames` 那两档
（「用在声明之前」与「根本没这个名字」✓）是给**报错**用的 ✓；
`typeof` 两档都给 `"undefined"` ✓（JS 里 TDZ 那一档其实会抛 ✗——
那是本仓**已经记着**的 TDZ 缺口 ✓，不在这一轮改 ✓）。

```ts
if (this.FindLocal(name) >= 0) return false;
if (this.Env.Resolve(name) !== null) return false;
return true;
```

## method LowerInto:(slot:int, node:AstNode)=>void

把一个表达式的值算到**指定的那一格**里。

字面量与变量可以直接落进去；别的先算到临时槽再搬——**这样调用方就不必关心
「哪些表达式能直接落格」**（那属于优化的余量，不属于语义）。

```ts
const kind = NodeKind(node);
if (kind === "NumericLiteral") {
  // **走 `NumberConst`**：整数收 `Int32`、其余收 `Float64`（第 129 轮）——`IntConst` 只给内部整数用 ✓。
  this.Emit(Op.Const, slot, this.NumberConst(NumberFromText(TextOf(node))), -1, -1);
  return;
}
if (kind === "StringLiteral") {
  const index = this.Program().AddConst(Constant.OfString(this.StringUnits(node)));
  this.Emit(Op.Const, slot, index, -1, -1);
  return;
}
if (kind === "TrueKeyword" || kind === "FalseKeyword") {
  const index = this.Program().AddConst(Constant.OfBool(kind === "TrueKeyword"));
  this.Emit(Op.Const, slot, index, -1, -1);
  return;
}
if (kind === "NullKeyword") {
  this.Emit(Op.Const, slot, this.Program().AddConst(Constant.OfNull()), -1, -1);
  return;
}
if (kind === "Identifier") {
  const access = this.ResolveAccess(TextOf(node));
  if (access.InEnv) {
    this.Emit(Op.EnvGet, slot, access.Depth, access.Cell, -1);
  } else {
    this.Emit(Op.Move, slot, access.Slot, -1, -1);
  }
  return;
}
const before = this.NextFree;
const value = this.LowerExpression(node);
this.Emit(Op.Move, slot, value, -1, -1);
// **只在 `value` 是「这一趟算出来的临时量」时才退水位**（第 180 轮修 ✓）。
//
// 原来这里**无条件** `Release(value)` ✗。而**赋值表达式的「值」是左值自己那一格** ✓
//（`a = 1` 的值就是 `a` ✓，见 `LowerBinary` 的赋值那一段 ✓）——那个槽在**表达式开始之前**
// 就活着 ✓（它是框架里的一个局部 ✓）。退到它那里会把**框架里所有活着的槽一起退掉** ✗
//（水位塌进局部区 ✓），于是**下一次 `Reserve` 会把一个还在用的槽发出去** ✓。
//
// 实测（第 180 轮的逗号那一族 ✓）：`a = 1, b = 2, c = 3` 里内层逗号拿到了 **`a` 的槽** ✓，
// 结果 `a` 被写成了 **3** ✓（Node 给 1 ✓）——**静默错值** ✗，而且 `a = 1, b = 2` 那种
// **两段**的写法**看不出问题** ✗（内层结果正好又被外层覆盖 ✓）——最难查的一种 ✓。
if (value >= before) {
  this.Release(value);
}
```

## method LowerBinary:(node:AstNode)=>int

二元表达式，**含赋值**（赋值在树里也是 `BinaryExpression`，只是运算符是 `=`）。

**赋值的值就是被赋的那个值**（JS 语义：`x = 1` 的值是 1），所以算完直接返回左值的槽。

```ts
const operatorText = TextOf(Child(node, "operatorToken"));
const left = Child(node, "left");
if (operatorText === "&&" || operatorText === "||") {
  // **短路是控制流，不是算子**（第 119 轮补；与 `??` 同一条口径：糖进控制流，不进 id 表）。
  //
  // **值不是布尔**：`a && b` 给的是 `a`（`a` 假时）或 `b`——不是 `false`/`true` ✗。
  // 所以这里是「结果格先装左边，需要才覆盖成右边」，不是「算出一个布尔」。
  //
  // **极性只写在这一处**：`jump_if_false` 在**假**时跳（`vm.xl.md` 里就是
  // `!slots[A].AsBool()`），所以
  //   - `&&`：左边假 → 跳过去，留着左边；
  //   - `||`：左边**真** → 也该跳过去，于是先把条件取反（`RtOp.Not` 就是逻辑非）。
  // 少了这一步，`a || b` 会在 `a` 真的时候**照样算右边**（副作用跑两遍、结果还可能被覆盖）✗。
  const slot = this.Reserve(1);
  this.LowerInto(slot, left);
  let condition = slot;
  if (operatorText === "||") condition = this.RtCall1(RtOp.Not, slot);
  const decisive = this.Here();
  this.Emit(Op.JumpIfFalse, condition, 0, -1, -1);
  this.LowerInto(slot, Child(node, "right"));
  this.PatchTarget(decisive, this.Here());
  this.Release(slot + 1);
  return slot;
}
if (operatorText === "??") {
  // **糖进控制流，不进 id 表**：左边算一次，非空就用它，空才算右边。
  // 关键是「右边只在需要时算」——先算再选会多算一次（副作用就跑两遍了）。
  const slot = this.Reserve(1);
  this.LowerInto(slot, left);
  const nullish = this.RtCall1(RtOp.IsNullish, slot);
  const notNullish = this.Here();
  this.Emit(Op.JumpIfFalse, nullish, 0, -1, -1);
  this.LowerInto(slot, Child(node, "right"));
  this.PatchTarget(notNullish, this.Here());
  this.Release(slot + 1);
  return slot;
}
if (operatorText === ",") {
  // **逗号运算符：左边只求值（丢掉），值就是右边**（第 180 轮）✓。
  //
  // 它是**糖** ✓，不进 id 表 ✓（与 `&&` / `||` / `??` 同一条口径 ✓）——
  // 语义只有一句话：**先算左边、再算右边** ✓，两件的**顺序是语义** ✓
  //（`f(), g()` 里 `f()` 必须真的跑一次 ✓，且跑在 `g()` 前面 ✓）。
  // 所以这里不能写成「只投右操作数」✗——那会把左边的副作用整条丢掉 ✓（**静默** ✗）。
  //
  // **投影那一侧不用改** ✓：TS 把 `(1, 2)` 也记成 `BinaryExpression` + `CommaToken` ✓
  //（实测逐节点对拍一致 ✓），所以这一格**只是降级层的缺口** ✓。
  //
  // 它同时关掉三处常见写法 ✓：`const a = (1, 2)` ✓、**`for` 的递增段**
  // `for (; i < n; i++, j--)` ✓（TS 那边那个 `incrementor` 就是一个逗号表达式 ✓——
  // 初始化段 `let i = 0, j = 3` 是**声明表** ✓，那条路早就通了 ✓）、
  // 以及 `i = (k, k + 1)` ✓。
  const slot = this.Reserve(1);
  this.LowerInto(slot, left);
  this.LowerInto(slot, Child(node, "right"));
  this.Release(slot + 1);
  return slot;
}
const compoundBase = CompoundBaseOf(operatorText);
// **逻辑赋值**（第 150 轮）：`a ||= b` / `a &&= b` / `a ??= b` ✓——
// 它们是**糖** ✓：`a ||= b` 就是 `a || (a = b)` ✓（`&&=` / `??=` 同形 ✓），
// 所以**落成控制流** ✓，不进 id 表 ✓（与 `&&` / `||` / `??` 同一条口径 ✓）。
//
// **为什么「合成一棵树再降级」而不是再抄一遍短路那一段** ✓：短路那三条
// （`&&` / `||` / `??` ✓）的槽位纪律与极性**各自只有一份** ✓——
// 在这里重写一遍就是第二份会走偏的实现 ✗（而走偏的症状是「右边多算一次」✓，
// 副作用跑两遍 ✗）。合成树走的是**同一条**路 ✓（`LowerBinary` 那三段 ✓）。
//
// **只做「左边是一个名字」那一档** ✗（与 `=` 那条的边界不同 ✓）：
// 合成树里左边会出现**两次** ✓——名字读两次**没有副作用** ✓（它有槽 / 环境格 ✓），
// 而 `o[f()] ||= 1` 里那个 `f()` 会**跑两遍** ✗（JS 只求值一次 ✓）。
// 所以属性 / 下标那两种**响亮地抛** ✓，单独立一轮 ✓（要做对得先读引用、再写回同一格 ✓，
// 与上面复合赋值那三条一样的活 ✓）。
//
// **第 181 轮把那一档补上了** ✓（见下面第二支 ✓）：
// 成员位上的逻辑赋值**不能合成树** ✗（接收者与键都会各求值两遍 ✓），
// 所以它走的是「**读引用一次 → 判 → 需要才写回同一格**」✓——
// 与上面复合赋值那一支**同一条纪律** ✓（接收者 / 键都只求值一次 ✓）。
if (operatorText === "||=" || operatorText === "&&=" || operatorText === "??=") {
  if (NodeKind(left) === "Identifier") {
    const operator = operatorText === "||=" ? "||" : (operatorText === "&&=" ? "&&" : "??");
    const assign: AstNode = {
      kind: "BinaryExpression",
      left: left,
      operatorToken: { kind: "EqualsToken", text: "=" },
      right: Child(node, "right"),
    };
    const synthetic: AstNode = {
      kind: "BinaryExpression",
      left: left,
      operatorToken: { kind: "EqualsToken", text: operator },
      right: assign,
    };
    return this.LowerBinary(synthetic);
  }
  const logicalLeftKind = NodeKind(left);
  if (logicalLeftKind === "PropertyAccessExpression" || logicalLeftKind === "ElementAccessExpression") {
    // **成员位上的逻辑赋值**（第 181 轮）✓：`o.a ??= 5` / `o[k] ||= 1` / `o.a.b &&= f()` ✓——
    // 语义与「简单名字」那一支**一字不差** ✓（`o.a ??= b` 就是 `o.a ?? (o.a = b)` ✓），
    // 但**不能合成一棵树再降级** ✗：那样左边出现两次 ✓，
    // 接收者（`f().a ??= 1` 里的 `f()` ✓）与键（`o[k()] ??= 1` 里的 `k()` ✓）会**各求值两遍** ✗。
    //
    // **两条规矩**（与上面复合赋值那一支同源 ✓）：
    //   1. **接收者与键都只求值一次** ✓，读与写**用的是同样那两格** ✓；
    //   2. **结果格的活法照 `??`**：先占结果格 ✓，临时量都在它上面 ✓，
    //      最后 `Release(result + 1)` ✓——只留结果那一格活着 ✓。
    //
    // **极性**与 `&&` / `||` / `??` 那三支**同一个写法** ✓（`jump_if_false` 在**假**时跳 ✓）：
    //   · `??=`：**空**才写 ✓ ⇒ 条件是 `IsNullish` ✓；
    //   · `||=`：**假**才写 ✓ ⇒ 条件是 `Not(值)` ✓；
    //   · `&&=`：**真**才写 ✓ ⇒ 条件就是那个值 ✓。
    const logicalResult = this.Reserve(1);
    const logicalReceiver = this.LowerExpression(Child(left, "expression"));
    let logicalKeySlot = -1;
    let logicalKeyConst = -1;
    if (logicalLeftKind === "PropertyAccessExpression") {
      const logicalName = Child(left, "name");
      const logicalNameKind = NodeKind(logicalName);
      if (
        logicalNameKind !== "Identifier" &&
        logicalNameKind !== "StringLiteral" &&
        logicalNameKind !== "NumericLiteral" &&
        logicalNameKind !== "PrivateIdentifier"
      ) {
        throw new Error("unimplemented: logical assignment to a computed property name");
      }
      logicalKeyConst = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(logicalName)));
      const logicalRead = this.RtCall2(RtOp.GetProp, logicalReceiver, logicalKeyConst);
      this.Emit(Op.Move, logicalResult, logicalRead, -1, -1);
    } else {
      logicalKeySlot = this.LowerExpression(Child(left, "argumentExpression"));
      const logicalRead = this.RtCallValues(RtOp.GetIndex, logicalReceiver, logicalKeySlot);
      this.Emit(Op.Move, logicalResult, logicalRead, -1, -1);
    }
    let logicalCondition = logicalResult;
    if (operatorText === "??=") logicalCondition = this.RtCall1(RtOp.IsNullish, logicalResult);
    if (operatorText === "||=") logicalCondition = this.RtCall1(RtOp.Not, logicalResult);
    const logicalDecisive = this.Here();
    this.Emit(Op.JumpIfFalse, logicalCondition, 0, -1, -1);
    const logicalValue = this.LowerExpression(Child(node, "right"));
    this.Emit(Op.Move, logicalResult, logicalValue, -1, -1);
    if (logicalLeftKind === "PropertyAccessExpression") {
      this.SetPropertyConst(logicalReceiver, logicalKeyConst, logicalResult);
    } else {
      const logicalWindow = this.Reserve(3);
      this.Emit(Op.Move, logicalWindow, logicalReceiver, -1, -1);
      this.Emit(Op.Move, logicalWindow + 1, logicalKeySlot, -1, -1);
      this.Emit(Op.Move, logicalWindow + 2, logicalResult, -1, -1);
      this.EmitRt(RtOp.SetIndex, logicalWindow, logicalWindow, 3);
      this.Release(logicalWindow);
    }
    this.PatchTarget(logicalDecisive, this.Here());
    this.Release(logicalResult + 1);
    return logicalResult;
  }
  throw new Error("unimplemented: logical assignment to a non-identifier");
}
if (compoundBase !== "") {
  // **字符串那一半先换路**（第 125 轮）：`s += "x"` 里的右边是**字符串字面量** ✓，
  // 于是结果一定是字符串 ✓（JS 的 `1 += "x"` 也是 `"1x"` ✓）——交给 `StringConcat` ✓。
  // 左边是一个**名字**（下面两条分支各自处理读→算→写 ✓），所以这里只换「算」那一步 ✓。
  const concatRight = compoundBase === "+" && this.IsTextLiteral(Child(node, "right"));
  // **底运算符由 `CompoundBaseOf` 给** ✓（第 147 轮）：`<<=` / `>>=` / `>>>=` 用
  // `slice(0, 1)` 会切出 `"<"` / `">"` ✗——那三个字的运算符当时会被当成一个字的 ✓。
  // **「算」那一步收进 `CombineValues`** ✓（第 149 轮）：`**=` 走的是**内建**那条 ✓，
  // 而它原来写在这个方法的**三个分支里** ✗（加一条分支就要改三处 ✓）。
  //
  // **`**` 没有通用算子号** ✗（它走内建 ✓）：所以这里**不去问 `BinaryOpOf`** ✓——
  // 第一版就是在这儿翻的 ✓：`BinaryOpOf("**")` **在进分支之前**就抛 ✗，
  // 症状是「`2 ** 10` 通了、`acc **= 2` 仍旧报 `unimplemented: binary operator **`」✓
  //（两种形状**同一个运算符**，一个通一个不通 ✓——那是最容易看漏的一种 ✓）。
  // **算子号由 `CombineValues` 现算** ✓：它先判 `**` ✓，其余才去问 `BinaryOpOf` ✓。
  if (NodeKind(left) === "Identifier") {
    // 复合赋值展开成「读 → 算 → 写」，**读一次**（左边只求值一次）。
    const access = this.ResolveAccess(TextOf(left));
    const read = this.Reserve(1);
    if (access.InEnv) {
      this.Emit(Op.EnvGet, read, access.Depth, access.Cell, -1);
    } else {
      this.Emit(Op.Move, read, access.Slot, -1, -1);
    }
    const right = this.LowerExpression(Child(node, "right"));
    // **右边是字符串字面量就换拼接**（第 125 轮）：`s += "x"` 的结果一定是字符串 ✓。
    const sum = concatRight ? this.ConcatValues(read, right) : this.CombineValues(compoundBase, read, right);
    if (access.InEnv) {
      this.Emit(Op.EnvSet, sum, access.Depth, access.Cell, -1);
    } else {
      this.Emit(Op.Move, access.Slot, sum, -1, -1);
    }
    return sum;
  }
  // **左值不是简单名字**（第 119 轮补）：`this.value += by` / `o[k] += 1` 遍地都是，
  // 而原来这里直接抛 `unimplemented: compound assignment to a non-identifier` ✗。
  //
  // **两条规矩与简单名字那条完全一样**：
  //   1. **接收者只求值一次**（`f().x += 1` 里 `f()` 只调一次）——所以先算接收者、
  //      读它、写回**同一格**，不走「重算一遍左值」那条路 ✗；
  //   2. 结果格的活法照 `??` 那一条：**先占结果格**，临时量都在它上面，
  //      最后 `Release(result + 1)` —— 只留结果那一格活着（写回要用的接收者/键
  //      在这之前已经用完了）。
  const result = this.Reserve(1);
  if (NodeKind(left) === "PropertyAccessExpression") {
    const receiver = this.LowerExpression(Child(left, "expression"));
    const name = Child(left, "name");
    const nameKind = NodeKind(name);
    if (nameKind !== "Identifier" && nameKind !== "StringLiteral" && nameKind !== "NumericLiteral"
    && nameKind !== "PrivateIdentifier") {
      throw new Error("unimplemented: compound assignment to a computed property name");
    }
    const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(name)));
    const read = this.RtCall2(RtOp.GetProp, receiver, key);
    const right = this.LowerExpression(Child(node, "right"));
    const sum = concatRight ? this.ConcatValues(read, right) : this.CombineValues(compoundBase, read, right);
    this.Emit(Op.Move, result, sum, -1, -1);
    this.SetPropertyConst(receiver, key, result);
    this.Release(result + 1);
    return result;
  }
  if (NodeKind(left) === "ElementAccessExpression") {
    const receiver = this.LowerExpression(Child(left, "expression"));
    const index = this.LowerExpression(Child(left, "argumentExpression"));
    const read = this.RtCallValues(RtOp.GetIndex, receiver, index);
    const right = this.LowerExpression(Child(node, "right"));
    const sum = concatRight ? this.ConcatValues(read, right) : this.CombineValues(compoundBase, read, right);
    this.Emit(Op.Move, result, sum, -1, -1);
    // **下标写回**：与 `=` 那条分支同一个形状（`set_index` 的窗口是「接收者, 下标, 值」）。
    const window = this.Reserve(3);
    this.Emit(Op.Move, window, receiver, -1, -1);
    this.Emit(Op.Move, window + 1, index, -1, -1);
    this.Emit(Op.Move, window + 2, result, -1, -1);
    this.EmitRt(RtOp.SetIndex, window, window, 3);
    this.Release(result + 1);
    return result;
  }
  throw new Error("unimplemented: compound assignment to a non-identifier");
}
if (operatorText === "=") {
  const leftKind = NodeKind(left);
  if (leftKind === "ArrayLiteralExpression" || leftKind === "ObjectLiteralExpression") {
    // **解构赋值**（第 146 轮）：左边是**模式**，不是值 ✓——所以它绝不能走
    // `LowerExpression` ✗（那会把 `[a, b]` 当成数组字面量**造一个新数组** ✗，
    // 而右边那个数组才是要拆的东西 ✓）。原来这里直接抛
    // `unimplemented: assignment to a non-identifier` ✗。
    //
    // **右边先算完** ✓（JS 的求值顺序 ✓）：整份 RHS 落到一格 ✓，
    // 然后 `DestructureAssign` 拿那一格去拆 ✓——两半（声明 / 赋值）的读法因此是同一套 ✓。
    //
    // **赋值表达式的值就是右边** ✓（JS 的口径 ✓）：把那一格留着返回 ✓，
    // 调用方用完自己退水位 ✓（与 `Identifier` 那一支的约定一字不差 ✓）。
    const rhs = this.Reserve(1);
    this.LowerInto(rhs, Child(node, "right"));
    this.DestructureAssign(left, rhs);
    return rhs;
  }
  if (leftKind === "PropertyAccessExpression" || leftKind === "ElementAccessExpression") {
    // **求值顺序是语义**：接收者 → 下标 → 值（JS 就是这个顺序，副作用按它发生）。
    const receiver = this.LowerExpression(Child(left, "expression"));
    if (leftKind === "PropertyAccessExpression") {
      const name = Child(left, "name");
      const nameKind = NodeKind(name);
      if (nameKind !== "Identifier" && nameKind !== "StringLiteral" && nameKind !== "NumericLiteral"
    && nameKind !== "PrivateIdentifier") {
        throw new Error("unimplemented: assignment to a computed property name");
      }
      const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(name)));
      const value = this.LowerExpression(Child(node, "right"));
      this.SetPropertyConst(receiver, key, value);
      this.Release(receiver + 1);
      return value;
    }
    const index = this.LowerExpression(Child(left, "argumentExpression"));
    const value = this.LowerExpression(Child(node, "right"));
    // **下标读/写都走 `get_index` / `set_index`**：数组走真下标，
    // **非数组的对象由引擎把键字符串化之后落成属性读/写**（`vm.xl.md` 那两条分支）。
    // 所以这里**不必先判断接收者是什么**——IR 里也没有这种指令。
    const window = this.Reserve(3);
    this.Emit(Op.Move, window, receiver, -1, -1);
    this.Emit(Op.Move, window + 1, index, -1, -1);
    this.Emit(Op.Move, window + 2, value, -1, -1);
    const result = this.Reserve(1);
    this.EmitRt(RtOp.SetIndex, result, window, 3);
    this.Release(window);
    return value;
  }
  if (leftKind !== "Identifier") {
    throw new Error("unimplemented: assignment to a non-identifier");
  }
  const access = this.ResolveAccess(TextOf(left));
  const before = this.NextFree;
  if (!access.InEnv) {
    this.LowerInto(access.Slot, Child(node, "right"));
    this.Release(before);
    return access.Slot;
  }
  const slot = this.Reserve(1);
  this.LowerInto(slot, Child(node, "right"));
  this.Emit(Op.EnvSet, slot, access.Depth, access.Cell, -1);
  // 槽留着：赋值表达式的值就是它（调用方用完自己退水位）
  return slot;
}
const base = this.Reserve(2);
this.LowerInto(base, left);
this.LowerInto(base + 1, Child(node, "right"));
// **`+` 里只要有一边是字符串字面量，结果一定是字符串** ✓（JS：ToPrimitive 之后有一边是
// 字符串就做拼接 ✓，而字面量本来就是字符串 ✓）——于是这里**落成一条语言内建调用** ✓
// （`StringConcat`，与 `for..in` 落成 `Object.keys` 同一套做法 ✓——`new Date` 原来也走
// 这一套 ✓，第 145 轮那条特例撤掉了 ✓：值模型补上「对象也能被调用」之后，
// 降级层不必再认识任何一个全局名 ✓）。
//
// **为什么非要落成内建**（第 125 轮）✗：引擎的 `RtOp.Add` 只渲染它认识的那几档 ✓，
// 遇到**对象 / 数组 / 浮点**会**抛** ✓——`"x=" + obj` 这种遍地都是的写法于是跑不起来 ✓。
// 而「对象渲染成什么」是**语言层**的决定 ✓（`text.xl.md` ✓），引擎不认识它 ✗。
//
// **只在这一种形状上换路** ✓：两边都不是字面量字符串时（`a + b`）照旧走引擎 ✓——
// 那条路是热路径 ✓，而且真到运行期才发现「有一边是对象」时**照旧抛** ✓（响亮 ✓，
// 不是静默给错值 ✓）。这条边界写在台账里 ✓。
const stringAdd = operatorText === "+"
  && (this.IsTextLiteral(left) || this.IsTextLiteral(Child(node, "right")));
if (stringAdd) {
  const sum = this.ConcatValues(base, base + 1);
  this.Emit(Op.Move, base, sum, -1, -1);
  this.Release(base + 1);
  return base;
}
// **幂那一格也换路**（第 149 轮）✓：`**` **不进通用算子表** ✗——
// 幂的舍入没有标准定死 ✓（各目标的 `pow` 可能差最后一位 ✓），
// 所以它落成一条**语言内建调用** ✓（与上面 `StringConcat` 同一套做法 ✓、
// 与 `Math.pow` **同一行代码** ✓）。理由写在 `globals.xl.md` 的 `PowId` 那一段 ✓。
if (operatorText === "**") {
  const power = this.PowValues(base, base + 1);
  this.Emit(Op.Move, base, power, -1, -1);
  this.Release(base + 1);
  return base;
}
this.EmitRt(BinaryOpOf(operatorText), base, base, 2);
if (IsNegated(operatorText)) {
  this.EmitRt(RtOp.Not, base, base, 1);
}
this.Release(base + 1);
return base;
```

## method ConcatValues:(first:int, second:int)=>int

**两个值按字符串拼起来** ✓——走 `StringConcat` 那条**语言内建调用** ✓，
窗口形状与别的内部调用一模一样 ✓（`[号, 参数…]` + 一条 `host_call`，结果落在窗口第一格 ✓）。

**调用方负责把结果搬走**（本方法只保证「窗口第一格是结果」✓）——
三处调用点各自把那格搬到自己的结果位上 ✓（`+` 搬到 `base` ✓、复合赋值搬到 `result` ✓）。

```ts
const window = this.Reserve(3);
this.Emit(Op.Const, window, this.IntConst(StringConcat), -1, -1);
this.Emit(Op.Move, window + 1, first, -1, -1);
this.Emit(Op.Move, window + 2, second, -1, -1);
this.EmitRt(RtOp.HostCall, window, window, 3);
this.Release(window + 1);
return window;
```

## method PowValues:(first:int, second:int)=>int

**`a ** b`**（第 149 轮）——走 `PowId` 那条**语言内建调用** ✓，
窗口形状与 `ConcatValues` **一模一样** ✓（`[号, 参数…]` + 一条 `host_call`，结果落在窗口第一格 ✓）。

**为什么与字符串拼接长得一样是好事** ✓：这一层已经有「内部调用」这个现成的形状 ✓
（`StringConcat` / `Object.assign` / `spread_into` / `rest_object` 都是它 ✓）——
再多一条**不引入任何新机制** ✓，只是在 `install.xl.md` 的名单上多一个号 ✓。

**调用方负责把结果搬走** ✓（本方法只保证「窗口第一格是结果」✓）：
二元那条搬到 `base` ✓、复合赋值搬到 `result` ✓。

```ts
const window = this.Reserve(3);
this.Emit(Op.Const, window, this.IntConst(PowId), -1, -1);
this.Emit(Op.Move, window + 1, first, -1, -1);
this.Emit(Op.Move, window + 2, second, -1, -1);
this.EmitRt(RtOp.HostCall, window, window, 3);
this.Release(window + 1);
return window;
```

## method CombineValues:(baseText:string, left:int, right:int)=>int

**复合赋值里「算」那一步**（第 149 轮抽出）——三种情形各走各的路 ✓：

- `+=` 且右边是字符串字面量 ⇒ `ConcatValues` ✓（第 125 轮，不在这里管 ✓）；
- `**=` ⇒ `PowValues` ✓（内建那条 ✓）；
- 其余（算术 / 位运算那十一条 ✓）⇒ `rt_call(BinaryOpOf(底))` ✓。

**抽出来是因为它原来写在三处** ✗（简单名字 ✓、属性 ✓、下标 ✓ 各一份 ✓）——
再往里加一条**内建**分支（`**=` ✓）就是三处都要改 ✓，
而漏一处的症状是「`o.x **= 2` 报 `unimplemented: binary operator **`」✓（离现场很远 ✗）。

```ts
if (baseText === "**") return this.PowValues(left, right);
return this.RtCallValues(BinaryOpOf(baseText), left, right);
```

## method IsTextLiteral:(node:AstNode)=>bool
**这个节点是不是一个「字面量字符串」** ✓——`StringLiteral` ✓、
没有内插的模板 ✓、有内插的模板 ✓（三者都是字符串 ✓）。

**它只用来做一件判断**：`+` 的那条换路（见上一节 ✓）——**不是**类型推断 ✗、
也不假装知道变量的类型 ✗（`let s = "x"; s + obj` 不在换路范围里 ✓，那一条照旧由引擎抛 ✓）。

```ts
const kind = NodeKind(node);
return kind === "StringLiteral" || kind === "NoSubstitutionTemplateLiteral"
  || kind === "TemplateExpression";
```

## method HasSpread:(args:Array<AstNode>)=>bool

**这一串实参里有没有展开**（第 133 轮）——有的话，参数个数**不是编译期的事** ✓。

```ts
for (let i = 0; i < args.length; i++) {
  if (NodeKind(args[i]) === "SpreadElement") return true;
}
return false;
```

## method PushArrayElement:(target:int, value:int)=>void

**把一格值接到数组末尾**（第 171 轮）——`SetIndex(数组, 数组.length, 值)` ✓，
与 `BuildArgsArray` 里那条路同一个写法 ✓（那里是「实参」，这里是「段落」与「实参」两用 ✓）。

抽出来的理由与 `EmitCallArray` 一样 ✓：这段是**五个槽的操作数** ✗，抄第二遍就是第二处会写错的机会 ✓。

```ts
const at = this.RtCall2(RtOp.GetProp, target, this.Program().AddConst(Constant.OfString(UnitsOf("length"))));
const window = this.Reserve(3);
this.Emit(Op.Move, window, target, -1, -1);
this.Emit(Op.Move, window + 1, at, -1, -1);
this.Emit(Op.Move, window + 2, value, -1, -1);
this.EmitRt(RtOp.SetIndex, window, window, 3);
this.Release(window);
this.Release(at);
```

## method TemplatePartText:(node:AstNode)=>string

模板**某一段的正文**（第 171 轮）✓：投影对模板段给的是**带反引号的原文** ✓
（`` `a` `` 给 `` "`a`" `` ✓、`` `c` `` 给 `` "`c`" `` ✓）✓——所以这里把那对反引号剥掉 ✓，
**两种口径都接住** ✓（有反引号才剥 ✓，与 `NoSubstitutionTemplateLiteral` 那一支同一条规矩 ✓）。

```ts
let raw = TextOf(node);
if (raw.length >= 2 && raw[0] === "`" && raw[raw.length - 1] === "`") {
  raw = raw.slice(1, raw.length - 1);
}
return raw;
```

## method LowerTaggedTemplate:(node:AstNode)=>int

**`` tag`a${x}b` ``**（第 171 轮）✓：JS 把它变成**一次普通调用** ✓——`tag(parts, x)` ✓，
其中 `parts` 是**段落数组** ✓（这里是 `["a", "b"]` ✓）。

原来降级期报 `unimplemented: expression TaggedTemplateExpression` ✗（**整份文件进不来** ✗），
而 `` sql`…` `` / `` styled.div`…` `` / `` gql`…` `` 这些写法在真实 `.ts` 里很常见 ✓。

**段落怎么取** ✓（TS 的形状 ✓）：`TemplateExpression` 的 Data 是
`[TemplateHead, TemplateSpan…]` ✓，每个 `TemplateSpan` 是 `[TemplateMiddle|TemplateTail, expression]` ✓
（TS 自己的字段名就是 `literal` 与 `expression` ✓，投影按同一套名字存 ✓）；
**没有内插**时整个模板就是一个 `NoSubstitutionTemplateLiteral` ✓（段落只有一个 ✓、实参没有 ✓）。

**`raw` 这一档先不铺** ✗：那要给段落数组**挂一个 `raw` 属性** ✓，而这一层还没有「挂属性」的那条路 ✗
——所以 `` String.raw`…` `` 仍然不对 ✗（**记在台账里** ✓），其余 tag 照常 ✓。
**同理「同一个调用点共用一个段落数组」那条身份约定** ✗（JS 要求每次求值拿到**同一个**数组对象 ✓）
这里也还没做 ✓：每次求值新建一个 ✓（对绝大多数 tag 无影响 ✓，对拿它当缓存键的库有影响 ✗）✓。

```ts
const callee = this.LowerExpression(Child(node, "tag"));
const template = Child(node, "template");
const args = this.Reserve(1);
this.EmitRt(RtOp.NewArray, args, args, 0);
const parts = this.Reserve(1);
this.EmitRt(RtOp.NewArray, parts, parts, 0);
const texts: Array<string> = [];
const substitutions: Array<AstNode> = [];
if (NodeKind(template) === "NoSubstitutionTemplateLiteral") {
  texts.push(this.TemplatePartText(template));
} else {
  texts.push(this.TemplatePartText(Child(template, "head")));
  for (const span of ListOf(template, "templateSpans")) {
    substitutions.push(Child(span, "expression"));
    texts.push(this.TemplatePartText(Child(span, "literal")));
  }
}
for (let i = 0; i < texts.length; i++) {
  const slot = this.Reserve(1);
  this.Emit(Op.Const, slot, this.Program().AddConst(Constant.OfString(UnitsOf(texts[i]))), -1, -1);
  this.PushArrayElement(parts, slot);
  this.Release(slot);
}
this.PushArrayElement(args, parts);
for (let i = 0; i < substitutions.length; i++) {
  this.PushArrayElement(args, this.LowerExpression(substitutions[i]));
}
// **这一句是第 172 轮加上的，它当时给的理由在第 176 轮被量倒了** ✓（这句留着，理由换了 ✓）：
// 第 172 轮写的是「少了它，`` tag`abc`.length `` 这类『标签模板当接收者』会读到函数本身」✗。
// 第 176 轮把这一句**临时注掉**重跑：`runtime:check` **214/214** ✓、
// `runtime:cli` **54/54** ✓（含新语料 `54-tagged-template-suffix.ts` ✓）——**全是绿的** ✗。
// 也就是说那个症状的根子在**投影**（标签与模板串被拆成两格 ✓，第 176 轮修 ✓），与水位无关 ✓；
// 第 172 轮那次「有效」是在 AST 还错着的时候读的 ✗（第 173 轮已经记过一次同型的错 ✗）。
// **留着它的理由**：`Reserve` / `Release` 是本层**每一处**都守的规矩 ✓（全文件 75 处 `Release` ✓），
// 临时槽（`args` / `parts` / 各段落常量）用完就还 ✓；去掉只是让这一帧的槽数白涨 ✓，不影响语义 ✓。
// **它现在没有判据量着** ✓——这一点如实记在这里 ✓，不假装它有 ✓。
this.Release(args + 1);
const result = this.EmitCallArray(callee, args, -1);
return result;
```

## method BuildArgsArray:(args:Array<AstNode>)=>int

**把一串实参铺成一个数组**（第 133 轮）——`call_array` 要的就是它 ✓。

**为什么必须有这一步** ✗：`call` 的参数是「从某格开始的一段连续槽 + 一个**定长**的个数」✓，
而 `f(1, ...xs, 2)` 的个数**只有运行期才知道** ✗。所以先把实参收进堆里一个数组 ✓，
再让被调方那一侧按数组长度铺开 ✓（`ir.xl.md` 的 `Op.CallArray` ✓）。

**每个实参都接在末尾**（`SetIndex(数组, 数组.length, 值)` ✓）——
**没有「洞」这一档** ✓（实参表里本来就没有洞 ✓），所以这里用不上数组字面量那条
「静态下标 / 动态下标」的分岔 ✓；**展开的实参**走 `spread_into` 那条内建调用 ✓
（与 `[...xs]` 完全同一条路 ✓）。

```ts
const array = this.Reserve(1);
this.EmitRt(RtOp.NewArray, array, array, 0);
for (let i = 0; i < args.length; i++) {
  const spread = NodeKind(args[i]) === "SpreadElement";
  const value = spread
    ? this.LowerExpression(Child(args[i], "expression"))
    : this.LowerExpression(args[i]);
  if (spread) {
    const window = this.Reserve(3);
    this.Emit(Op.Const, window, this.IntConst(SpreadIntoId), -1, -1);
    this.Emit(Op.Move, window + 1, array, -1, -1);
    this.Emit(Op.Move, window + 2, value, -1, -1);
    this.EmitRt(RtOp.HostCall, window, window, 3);
    this.Release(window);
    continue;
  }
  const at = this.RtCall2(RtOp.GetProp, array, this.Program().AddConst(Constant.OfString(UnitsOf("length"))));
  const window = this.Reserve(3);
  this.Emit(Op.Move, window, array, -1, -1);
  this.Emit(Op.Move, window + 1, at, -1, -1);
  this.Emit(Op.Move, window + 2, value, -1, -1);
  this.EmitRt(RtOp.SetIndex, window, window, 3);
  this.Release(window);
  this.Release(at);
}
this.Release(array + 1);
return array;
```

## method EmitCallArray:(callee:int, argsArray:int, self:int)=>int

**发一条 `call_array` 并返回结果格**（第 133 轮）——三处调用点共用 ✓
（通用调用 / 方法调用 / 计算成员调用 ✓）。

**为什么再抽一层**：形状是「四个操作数、其中两个是槽、结果**不在参数基址上**」✓——
写三遍就是**三处会写错操作数**的机会 ✗，而算错槽的症状是「值悄悄换成别的」✗
（这个工程最贵的一种错 ✓）。

```ts
const dest = this.Reserve(1);
this.Emit(Op.CallArray, callee, argsArray, dest, self);
return dest;
```

## method LowerCall:(node:AstNode)=>int

调用：被调方先算成**一个值**（引擎的 `call` 收的就是一格），参数逐个放进从 `base`
开始的连续格，**结果落回 `base`**（调用约定）。

三条路，**区别在 `this`**：

- **`o.m(...)`** → `call_method`（`this` 是接收者，键是**常量**）；
- **`o[k](...)`** → 先按键取值（**`get_index`** ✓，它替我们做 `ToPropertyKey` ✓），
  再用 `Op.Call` 的 **`D` 操作数**把接收者当 `this` 递过去——**`this` 同样是接收者**。
  **不需要 `call_index` 那样的新算子**：值键与 `this` 槽两件都是现成的；
- **别的形状**（标识符、调用结果 `f()()`、括号表达式…）→ 通用那条路：
  先算成值再 `Call`，`D` 给 `-1`（**没有接收者**，`this` 是 `undefined`）——这也是 JS 的语义。

**参数个数为 0 时也要占一格**：结果是写在参数基址上的，没有基址就没地方写。

```ts
const callee = Child(node, "expression");
const calleeKind = NodeKind(callee);
if (calleeKind === "PropertyAccessExpression") {
  return this.LowerMethodCall(node, callee);
}
if (calleeKind === "ElementAccessExpression") {
  // **计算成员调用 `o[k]()`**：先按键取值，再用 `Op.Call` 的 `D` 操作数把**接收者当 `this`**
  // 递过去——这两件都是现成的（值键 + 第 47 轮加的那个 `this` 槽），所以这里一个**新算子都不需要**。
  //
  // **取值走 `get_index`、不走 `get_prop`**（第 178 轮修 ✓）：JS 的 `o[k]` 是
  // `ToPropertyKey(k)` 之后再查 ✓——`get_prop` **只收字符串 / 符号键** ✗，键是**数**
  // 就当场抛「property keys must be strings or symbols」✗。于是
  // **`arr[0](...)` / `handlers[key](...)` 这类「从表里取出一个再调」的写法**
  // 整份文件跑不了 ✗（`o["m"]()` 因为键本来就是字符串 ✓ 所以一直是对的 ✗——
  // 这也是它藏这么久的原因 ✓）。`get_index` 那一支**本来就替我们做完了这件事** ✓
  //（`vm.xl.md`：数组走格子 ✓、其余把键字符串化再走属性查找 ✓、符号键原样 ✓，
  // 与 `o[k] = v` / `k in o` 是同一套口径 ✓）。
  const elementReceiver = this.LowerExpression(Child(callee, "expression"));
  const elementKey = this.LowerExpression(Child(callee, "argumentExpression"));
  const elementFn = this.RtCallValues(RtOp.GetIndex, elementReceiver, elementKey);
  const selfSlot = this.Reserve(1);
  this.Emit(Op.Move, selfSlot, elementReceiver, -1, -1);
  const elementArgs = ListOf(node, "arguments");
  const elementCount = elementArgs.length;
  if (this.HasSpread(elementArgs)) {
    // **`o[k](...xs)`**（第 133 轮）：`elementFn` 已经算成值了 ✓，接收者也在一格上 ✓——
    // 与普通方法调用那条展开分支是同一个形状 ✓（`this` 用 `D` 操作数递过去 ✓，
    // 与上面那条非展开的 `Op.Call` 一字不差 ✓）。
    const spreadArray = this.BuildArgsArray(elementArgs);
    const spreadDest = this.EmitCallArray(elementFn, spreadArray, selfSlot);
    return spreadDest;
  }
  const elementBase = this.Reserve(elementCount > 0 ? elementCount : 1);
  for (let i = 0; i < elementCount; i++) {
    this.LowerInto(elementBase + i, elementArgs[i]);
  }
  this.Emit(Op.Call, elementFn, elementBase, elementCount, selfSlot);
  // **退到结果之上**（接收者那格、`this` 那格都在下面）。
  this.Release(elementBase + 1);
  return elementBase;
}
if (calleeKind === "SuperKeyword") {
  if (this.InSuperName === "") {
    throw new Error("unimplemented: super(...) outside a derived class constructor");
  }
  const access = this.ResolveAccess(this.InSuperName);
  const parent = this.Reserve(1);
  if (access.InEnv) {
    this.Emit(Op.EnvGet, parent, access.Depth, access.Cell, -1);
  } else {
    this.Emit(Op.Move, parent, access.Slot, -1, -1);
  }
  // **`this` 从当前帧取一格递给被调方**（`Op.Call` 的 `D` 操作数）：
  // 父类构造函数要拿**正在造的那个实例**当 `this`，而它就在本帧的 `This` 里。
  const selfSlot = this.Reserve(1);
  this.Emit(Op.LoadThis, selfSlot, -1, -1, -1);
  const superArgs = ListOf(node, "arguments");
  // **`super(...xs)`**（第 141 轮做掉了 ✓）：与 `f(...xs)` 走**同一条** `call_array` ✓——
  // 那一族算子本来就带 `this` 操作数 ✓（`EmitCallArray(callee, argsArray, self)` ✓），
  // 所以「拿当前实例当 `this`、按数组铺参数」**一个字的新算子都不用加** ✓。
  //
  // **上一轮（133）这里抛** ✗（「unimplemented: spreading into super(...)」✓）——
  // 那时 `CallArray` 的 `this` 操作数虽然已经在了 ✓，但没人把它与 `super` 接起来 ✓。
  // 接起来之后，**派生类的默认构造函数**才有办法转发参数 ✓（见 `LowerClass` 那一支 ✓）。
  if (this.HasSpread(superArgs)) {
    const spreadArray = this.BuildArgsArray(superArgs);
    const spreadDest = this.EmitCallArray(parent, spreadArray, selfSlot);
    // **字段初始化跟着走**（与定长那条一字不差 ✓）：`super(...)` 一降级完，`this` 就一定存在 ✓。
    this.FieldInitDue();
    return spreadDest;
  }
  const superCount = superArgs.length;
  const superBase = this.Reserve(superCount > 0 ? superCount : 1);
  for (let i = 0; i < superCount; i++) {
    this.LowerInto(superBase + i, superArgs[i]);
  }
  this.Emit(Op.Call, parent, superBase, superCount, selfSlot);
  // **退到结果之上**（父类构造函数那格、`this` 那格都在下面，退过去就把活格交出去了）。
  this.Release(superBase + 1);
  // **实例字段的初始化式跟着 `super(...)` 走**（第 128 轮）——**就在调用点接住** ✓。
  //
  // **为什么不能靠「语句循环里数语句」**（这一轮实测踩的）：`super(...)` **可能嵌在别的语句里** ✗
  // （`constructor(id) { const doubled = id * 2; super(doubled); }` 里它确实自成一条 ✓，
  // 但 `super(x) ? a : b` / `f(super(x))` 这类形状迟早会有 ✓）。数语句那条路在
  // 「`super` 出现在语句**中部**」时会**提前**发字段初始化 ✗——现场是
  // `load_this` 落在 `super` 的参数格上 ✗，父类构造函数拿到的是**接收者对象**当实参 ✗，
  // 于是 `this.id` 是个对象，`this.id * 10` 报 `arithmetic on a non-numeric operand` ✓
  // （离现场两步远）✓。
  //
  // **调用点接住就没有这个猜的成分**：`super(...)` 一降级完，`this` 就一定存在了 ✓。
  this.FieldInitDue();
  return superBase;
}
let calleeSlot = -1;
if (calleeKind === "Identifier") {
  const text = TextOf(callee);
  // **宿主能力**：模块里没声明过、但登记为能力的名字 → `host_call(号, 参数…)`。
  // 引擎只认号（`host-abi.xl.md` 的白名单），名字到号的翻译在上面的回调里。
  if (!Contains(this.DeclaredNames, text) && this.CapabilityOf !== null) {
    const capability = this.CapabilityOf(text);
    if (capability >= 0) {
      const args0 = ListOf(node, "arguments");
      // **宿主能力调用收的是定长窗口**（形状是 `[号, 参数…]` + `host_call` ✓）——
      // 展开那种「个数只有运行期才知道」进不去 ✗。**响亮地抛** ✓（不做也不装 ✓）。
      if (this.HasSpread(args0)) {
        throw new Error("unimplemented: spreading into a host capability call");
      }
      const count0 = args0.length;
      const base0 = this.Reserve(count0 + 1);
      this.Emit(Op.Const, base0, this.IntConst(capability), -1, -1);
      for (let i = 0; i < count0; i++) {
        this.LowerInto(base0 + i + 1, args0[i]);
      }
      this.EmitRt(RtOp.HostCall, base0, base0, count0 + 1);
      return base0;
    }
  }
  const access = this.ResolveAccess(text);
  calleeSlot = this.Reserve(1);
  if (access.InEnv) {
    this.Emit(Op.EnvGet, calleeSlot, access.Depth, access.Cell, -1);
  } else {
    this.Emit(Op.Move, calleeSlot, access.Slot, -1, -1);
  }
} else {
  calleeSlot = this.LowerExpression(callee);
}
const args = ListOf(node, "arguments");
const count = args.length;
if (this.HasSpread(args)) {
  // **`f(...xs)`**（第 133 轮）：被调方先算成一格 ✓，实参铺成数组 ✓，然后 `call_array` ✓。
  // **`this` 给 `-1`** ✓（普通调用没有接收者 ✓——与上面那条 `Op.Call` 的 `D = -1` 同一条语义 ✓）。
  const spreadArray = this.BuildArgsArray(args);
  const spreadDest = this.EmitCallArray(calleeSlot, spreadArray, -1);
  return spreadDest;
}
const base = this.Reserve(count > 0 ? count : 1);
for (let i = 0; i < count; i++) {
  this.LowerInto(base + i, args[i]);
}
this.Emit(Op.Call, calleeSlot, base, count, -1);
this.Release(base + 1);
return base;
```
