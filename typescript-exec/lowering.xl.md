# dependencies
```xl
import { Value } from "../runtime/value.xl.md"
import { Program, Instruction, Op, RtOp, Constant, FunctionInfo, Handler } from "../runtime/ir.xl.md"
import { IdTable } from "../runtime/ir-verify.xl.md"
import { Access, EnvChain, EnvScope, EnvRef, CapturedNames, CollectDeclaredNames, Contains } from "./scope.xl.md"
import { CollectFunctionNames, CollectHoistedVars, HasNestedFunction, HasArrowFunction, WalkChildren, IsFunctionNode } from "./scope.xl.md"
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
| **`finally` 三种路径**（正常 / 接住 / 没接住也跑完再重抛） | **`finally` 的代码发两遍**（共享要子过程跳转）、**带 `finally` 的 `try` 里不许 `return`/`break`/`continue`**（降级期报错） |
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

把字面量文字变成数值。**自己走一遍，不用宿主的 `parseFloat`**（理由同 `UnitsOf` 那条）。

只收十进制整数与「整数.小数」。指数、十六进制、下划线分隔符一律**抛**。

```ts
let i = 0;
let sign = 1.0;
if (text.length > 0 && text[0] === "-") {
  sign = -1.0;
  i = 1;
} else if (text.length > 0 && text[0] === "+") {
  i = 1;
}
let whole = 0.0;
let seenDigit = false;
while (i < text.length && text[i] >= "0" && text[i] <= "9") {
  whole = whole * 10.0 + (text.charCodeAt(i) - 48);
  seenDigit = true;
  i = i + 1;
}
if (!seenDigit) throw new Error("unimplemented: numeric literal " + text);
if (i === text.length) return sign * whole;
if (text[i] !== ".") throw new Error("unimplemented: numeric literal " + text);
i = i + 1;
let scale = 1.0;
let fraction = 0.0;
while (i < text.length && text[i] >= "0" && text[i] <= "9") {
  fraction = fraction * 10.0 + (text.charCodeAt(i) - 48);
  scale = scale * 10.0;
  i = i + 1;
}
if (i !== text.length) throw new Error("unimplemented: numeric literal " + text);
return sign * (whole + fraction / scale);
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
throw new Error("unimplemented: binary operator " + operatorText);
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

```ts
if (NodeKind(body) === "CallExpression") {
  const callee = OptionalChild(body, "expression");
  if (callee !== null && NodeKind(callee) === "SuperKeyword") return true;
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

## field SuperName:string = ""

**这个函数体里 `super(...)` 该去哪找父类构造函数**（派生类的构造函数才有；空串 = 没有）。

**为什么带的是名字而不是一格槽**：`super(...)` 在**子类的帧**里执行，
而父类构造函数是**外层作用域里的一个名字**——跨帧只能用**环境**这条通道，
所以这里存名字，降级 `super` 时照常 `ResolveAccess`（链上找、深度算，一行都不用新写）。

## constructor:(name:string, body:AstNode, params:Array<string>, patch:int)=>void

登记一个待降级的函数体。

```ts
this.Name = name;
this.Body = body;
this.Params = params;
this.ParamCount = params.length;
this.Patch = patch;
```

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

## field ModuleStatements:Array<AstNode> = []

**这一份模块的顶层语句**（`LowerModule` 存一份）。

**为什么类需要它**：`class B extends A` 要看**父类有没有构造函数**——
没有构造函数才敢做（`super(...)` 还没实现，见下）。而父类就在同一份模块的语句里，
所以这份名单得留着。

## method FindParentHasConstructor:(name:string)=>bool

这份模块里叫 `name` 的类**有没有显式构造函数**。

**找不到这个类也返回「有」**：那样调用方会抛——**「查不清」要按最坏情况算**，
否则就是拿准确性换方便。

```ts
for (let i = 0; i < this.ModuleStatements.length; i++) {
  const statement = this.ModuleStatements[i];
  if (NodeKind(statement) !== "ClassDeclaration") continue;
  const nameNode = OptionalChild(statement, "name");
  if (nameNode === null || TextOf(nameNode) !== name) continue;
  const members = ListOf(statement, "members");
  for (let j = 0; j < members.length; j++) {
    if (NodeKind(members[j]) === "Constructor") return true;
  }
  return false;
}
return true;
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

## field FinallyDepth:int = 0

当前处在几层「带 `finally` 的 `try`」里面。

**它只为一件事存在**：`return`（以及 `break` / `continue`）写在这样的 `try` 里时
**要在降级期报错**。JS 的语义是「先跑 `finally` 再走」，而这一轮没有那段改写——
**让它们静默跳过 `finally`** 是「静默给错值」那一类，宁可报出来。

## field Loops:Array<LoopContext> = []

可以被 `break` / `continue` 跳出去的上下文栈（栈顶是最近的那一层）。

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
this.FinallyDepth = 0;
this.Loops = [];
```

## method EnterFunctionBody:(body:AstNode, params:Array<string>)=>void

**每个函数体的开场**：算出这一层要捕获哪些名字，需要就开一个环境。

**为什么必须在这里一次算完**：环境的格数在 `EnvNew` 那一刻就定了（引擎不会扩容），
而「哪些名字要进环境」要**看整个函数体**才知道（内层函数引用到谁）。
所以在**发第一条语句之前**先走一遍树。

**含内层函数就开环境**（哪怕一个变量也不捕获）：环境值是**靠槽往下传的**
（闭包的环境参数是一个 `Value`），中间那一层手上没有这个值，更内层就拿不到祖父的环境
（`scope.xl.md` 里那条口径）。

```ts
const declared: string[] = [];
for (let i = 0; i < params.length; i++) declared.push(params[i]);
CollectDeclaredNames(body, declared);
for (let i = 0; i < this.ExtraDeclared.length; i++) declared.push(this.ExtraDeclared[i]);
this.ExtraDeclared = [];
this.DeclaredNames = declared;
const functions: string[] = [];
CollectFunctionNames(body, functions);
const captured = CapturedNames(body, declared);
const needsThis = HasArrowFunction(body);
if (captured.length === 0 && !HasNestedFunction(body, 0) && !needsThis) return;
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

整数字面量进常量池。

**只收整数**：v1 的线形态**不带浮点载荷**（`runtime/ir-verify.xl.md` 那条），
所以非整数的数字字面量在这里就抛——比编出一个装不下的常量再被拒要好。

```ts
if (Math.floor(value) !== value) {
  throw new Error("unimplemented: only integer literals (the wire form has no float payload)");
}
return this.Program().AddConst(Constant.OfInt(value));
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
this.ModuleStatements = ListOf(source, "statements");
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
this.EnterFunctionBody(source, []);
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
this.InGenerator = item.IsGenerator;
this.InAsync = item.IsAsync;
this.InSuperName = item.SuperName;
// **环境要在声明参数之前开**：参数里也有被捕获的（内层函数引用外层函数的参数），
// 而那些名字必须一上来就住进环境格——`DeclareLocal` 是照着环境格认的。
this.EnterFunctionBody(body, item.Params);
for (let i = 0; i < item.Params.length; i++) {
  this.DeclareLocal(item.Params[i], i);
}
this.Hoist(body);
if (item.IsExpressionBody) {
  // 箭头函数的表达式体：值就是返回值（**不是**「跑完给 undefined」）。
  const value = this.LowerExpression(body);
  this.Emit(Op.Return, value, -1, -1, -1);
} else if (NodeKind(body) === "Block") {
  this.LowerStatementsOf(body);
} else {
  this.LowerStatement(body);
}
this.Emit(Op.Return, -1, -1, -1, -1);
item.SlotCount = this.Peak;
this.PopScope();
this.InGenerator = outerInGenerator;
this.InAsync = outerInAsync;
this.InSuperName = outerSuperName;
```

## method LowerStatementsOf:(block:AstNode)=>void

降级一个块里的语句序列（**不自己开作用域**——开不开由调用方决定）。

```ts
const statements = ListOf(block, "statements");
for (let i = 0; i < statements.length; i++) {
  this.LowerStatement(statements[i]);
}
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
if (kind === "VariableStatement") {
  this.LowerDeclarationList(Child(node, "declarationList"));
  return;
}
if (kind === "ExpressionStatement") {
  this.LowerExpression(Child(node, "expression"));
  return;
}
if (kind === "ReturnStatement") {
  if (this.FinallyDepth > 0) {
    throw new Error("unimplemented: return inside a try with finally (it would skip the finally)");
  }
  const expression = OptionalChild(node, "expression");
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
if (kind === "EmptyStatement") return;
throw new Error("unimplemented: statement " + kind);
```

## method StringUnits:(node:AstNode)=>Array<int>

字符串字面量 → 码元。

**空字符串要拒绝**：投影对**空**字面量给的是**带引号的原文**（`""` 两个字符），
而其他字面量给的是**值**（`"b"` → `b`）。这两件事在投影里**分不开**——
`""` 既可能是空串，也可能是「值就是两个引号」的串。**分不开就不要猜**：
报出来，记在 [docs/typescript-parsing-gaps.md](../docs/typescript-parsing-gaps.md)。

```ts
const text = TextOf(node);
if (text === "\"\"" || text === "''") {
  throw new Error("unimplemented: an empty string literal is reported in quoted form (see parsing-gaps)");
}
return UnitsOf(text);
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
  // **右边只求值一次**（`const {a} = f()` 里 `f()` 只跑一遍），所以先落到一格再拆。
  const source = this.Reserve(1);
  if (initializer === null) {
    this.Emit(Op.Const, source, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
  } else {
    this.LowerInto(source, initializer);
  }
  this.Destructure(name, source, isVar);
  this.Release(source + 1);
  return;
}
if (nameKind !== "Identifier") {
  throw new Error("unimplemented: declaration name " + nameKind);
}
const text = TextOf(name);
const value = this.Reserve(1);
if (initializer === null) {
  this.Emit(Op.Const, value, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
} else {
  this.LowerInto(value, initializer);
}
// **不要在这里退水位**：`BindName` 可能刚在 `value` 上面留了一格给变量，
// 退下去就会让**下一次分配覆盖那个变量**（判据报的是「算术遇到了非数值」——
// 变量的值被别的东西换掉了）。
this.BindName(text, value, isVar);
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

## method Destructure:(pattern:AstNode, source:int, isVar:bool)=>void

**把一个值拆进绑定模式**（`{a, b: c}` / `[x, , y]`，可嵌套）。

**默认值与剩余参数抛**：默认值只在 `undefined` 时生效（**不是 `null`**）——
那需要一个专门的判据；剩余要造新对象或新数组。两样都是各自的语义，
混进来会**悄悄按别的规则算**。

```ts
const kind = NodeKind(pattern);
if (kind !== "ObjectBindingPattern" && kind !== "ArrayBindingPattern") {
  throw new Error("unimplemented: binding pattern " + kind);
}
const elements = ListOf(pattern, "elements");
for (let i = 0; i < elements.length; i++) {
  const element = elements[i];
  if (NodeKind(element) === "OmittedExpression") continue;
  if (NodeKind(element) !== "BindingElement") {
    throw new Error("unimplemented: binding element " + NodeKind(element));
  }
  if (OptionalChild(element, "initializer") !== null) {
    throw new Error("unimplemented: default value in a binding pattern");
  }
  if (OptionalChild(element, "dotDotDotToken") !== null) {
    throw new Error("unimplemented: rest element in a binding pattern");
  }
  let value = -1;
  if (kind === "ObjectBindingPattern") {
    const property = OptionalChild(element, "propertyName");
    const keyNode = property === null ? Child(element, "name") : property;
    const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(keyNode)));
    value = this.RtCall2(RtOp.GetProp, source, key);
  } else {
    const index = this.Program().AddConst(Constant.OfInt(i));
    value = this.RtCall2(RtOp.GetIndex, source, index);
  }
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
const isVar = list["flags"] === "Var";
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
  && initializer["flags"] !== "Var"
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
const iterableSlot = this.Reserve(1);
this.LowerInto(iterableSlot, Child(node, "expression"));
this.LowerIterationLoop(iterableSlot, node);
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
  if (NodeKind(name) !== "Identifier") {
    throw new Error("unimplemented: destructuring in for..of");
  }
  const text = TextOf(name);
  const cell = this.CellOf(text);
  if (cell >= 0) {
    this.Emit(Op.EnvSet, value, 0, cell, -1);
    return;
  }
  if (initializer["flags"] === "Var") {
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
- **带 `finally` 的 `try` 里不许 `return`**（降级期抛，见 `FinallyDepth`）。

```ts
const tryBlock = Child(node, "tryBlock");
const catchClause = OptionalChild(node, "catchClause");
const finallyBlock = OptionalChild(node, "finallyBlock");
const hasCatch = catchClause !== null;
const hasFinally = finallyBlock !== null;
const rethrowIndex = hasFinally ? this.AddHandler() : -1;
const catchIndex = hasCatch ? this.AddHandler() : -1;
if (hasFinally) this.FinallyDepth = this.FinallyDepth + 1;
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
this.FinallyDepth = this.FinallyDepth - 1;
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

## method BindCatch:(catchClause:AstNode)=>void

**绑定 `catch` 的参数**：先从「在飞的异常」取出来，再按普通变量声明那三条路走。

**`Caught` 是唯一能把异常值取进槽的指令**（`ir.xl.md` 的 `caught`）：展开把 `Pc`
跳到处理点之后，异常值只在 `Vm.Pending` 里。没有它，`catch` 能接住却拿不到那个值。

```ts
const declaration = OptionalChild(catchClause, "variableDeclaration");
if (declaration === null) return;
const name = Child(declaration, "name");
if (NodeKind(name) !== "Identifier") {
  throw new Error("unimplemented: destructuring catch binding");
}
const text = TextOf(name);
const slot = this.Reserve(1);
this.Emit(Op.Caught, slot, -1, -1, -1);
this.DeclareLocal(text, slot);
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
  if (NodeKind(name) !== "Identifier") {
    throw new Error("unimplemented: private or computed property name");
  }
  const key = this.Program().AddConst(Constant.OfString(UnitsOf(TextOf(name))));
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
const receiver = this.LowerExpression(Child(callee, "expression"));
const optional = this.ChainHasOptional(call);
let skip = -1;
if (optional) skip = this.JumpIfNullish(receiver);
const name = Child(callee, "name");
if (NodeKind(name) !== "Identifier") {
  throw new Error("unimplemented: method call with a computed name");
}
const key = this.Program().AddConst(Constant.OfString(UnitsOf(TextOf(name))));
const args = ListOf(call, "arguments");
const count = args.length;
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

```ts
if (this.FinallyDepth > 0) {
  throw new Error("unimplemented: break inside a try with finally (it would skip the finally)");
}
if (OptionalChild(node, "label") !== null) {
  throw new Error("unimplemented: labeled break");
}
if (this.Loops.length === 0) {
  throw new Error("break outside a loop or switch (the parser should have rejected this)");
}
const index = this.Here();
this.Emit(Op.Jump, -1, 0, -1, -1);
this.Loops[this.Loops.length - 1].AddBreak(index);
```

## method LowerContinue:(node:AstNode)=>void

`continue`：跳到**最近的那一层循环**的「下一轮开始」。

**必须穿过 `switch`**：`switch` 也是可跳出的上下文，但它不是循环——
`IsLoop` 这一位就是为这一步存在的（少了它，`continue` 会跳去 `switch` 的出口，静默跳错）。

```ts
if (this.FinallyDepth > 0) {
  throw new Error("unimplemented: continue inside a try with finally (it would skip the finally)");
}
if (OptionalChild(node, "label") !== null) {
  throw new Error("unimplemented: labeled continue");
}
let index = this.Loops.length - 1;
while (index >= 0 && !this.Loops[index].IsLoop) {
  index = index - 1;
}
if (index < 0) {
  throw new Error("continue outside a loop (the parser should have rejected this)");
}
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

**只收简单名**：解构参数、默认值、剩余参数一律抛——它们是各自的语法，
混在这里会让「参数就是前几格」这条约定（`FunctionInfo.ParamCount` 与调用约定都靠它）
悄悄不成立。

```ts
const parameters = ListOf(node, "parameters");
const params: string[] = [];
for (let i = 0; i < parameters.length; i++) {
  const parameter = parameters[i];
  const name = OptionalChild(parameter, "name");
  if (name === null || NodeKind(name) !== "Identifier") {
    throw new Error("unimplemented: parameter without a simple name");
  }
  if (OptionalChild(parameter, "initializer") !== null
    || OptionalChild(parameter, "dotDotDotToken") !== null
    || OptionalChild(parameter, "questionToken") !== null) {
    throw new Error("unimplemented: default / rest / optional parameter");
  }
  params.push(TextOf(name));
}
return params;
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

**箭头函数的 `this` 是一个已知缺口**：JS 里箭头没有自己的 `this`（它取外面的），
而这里每个闭包都有自己的帧、`this` 由调用方给——写在文首那张表里，**不假装它对**。

```ts
const params = this.FunctionParams(node);
const body = Child(node, "body");
const patch = this.Program().AddConst(Constant.OfInt(0));
const window = this.Reserve(2);
const enclosing = this.Env.Last();
if (enclosing === null) {
  this.Emit(Op.Const, window, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
} else {
  this.Emit(Op.Move, window, enclosing.Slot, -1, -1);
}
this.Emit(Op.Const, window + 1, patch, -1, -1);
const slot = this.Reserve(1);
this.EmitRt(RtOp.NewClosure, slot, window, 2);
// **退到闭包之上，不是退到窗口**：窗口是先预留的，`Release(window)` 会把**闭包格**
// 一起退掉——下一个分配就盖在它上面（表现是「调用了非闭包的值」）。
this.Release(slot + 1);
// **函数表达式自带 `prototype`**（箭头与对象方法不——它们不可构造）。
if (NodeKind(node) === "FunctionExpression") {
  this.AttachPrototype(slot);
}
const item = new PendingFunction(name, body, params, patch);
item.IsExpressionBody = NodeKind(body) !== "Block";
// **`*` 要看原始字段**：它在投影里是一枚 token，`OptionalChild` 只认「带 kind 的节点」，
// 于是会把它判成「没有」——生成器函数于是被当成普通函数（判据报的是
// `suspend outside a generator`：体里那对 suspend/resume 落在了一个普通帧上）。
item.IsGenerator = node["asteriskToken"] !== undefined && node["asteriskToken"] !== null;
item.IsAsync = this.NodeIsAsync(node);
item.Envs = this.Env.Clone();
this.Pending.push(item);
return slot;
```

## method LowerArrayLiteral:(node:AstNode)=>int

**数组字面量**：先造空数组，再逐格写。

**洞要保留**：`[1, , 3]` 里的空位是 `OmittedExpression`——**跳过它**（不写任何东西），
后面那一格的下标照旧是 2，于是数组在 0..1 之间留下洞（`SetAt` 会补洞）。
写一个显式的 `undefined` 进去就**变成另一个语义**了（`1 in a` 会从假变真）。

```ts
const array = this.Reserve(1);
this.EmitRt(RtOp.NewArray, array, array, 0);
const elements = ListOf(node, "elements");
for (let i = 0; i < elements.length; i++) {
  if (NodeKind(elements[i]) === "OmittedExpression") continue;
  const value = this.LowerExpression(elements[i]);
  const window = this.Reserve(3);
  this.Emit(Op.Move, window, array, -1, -1);
  this.Emit(Op.Const, window + 1, this.IntConst(i), -1, -1);
  this.Emit(Op.Move, window + 2, value, -1, -1);
  this.EmitRt(RtOp.SetIndex, window, window, 3);
  this.Release(window);
}
this.Release(array + 1);
return array;
```

## method LowerObjectLiteral:(node:AstNode)=>int

**对象字面量**：先造普通对象（原型取 `Protos.Object`），再逐条 `set_prop`。

四种成员都收：`a: 1`、`{a}`、方法、以及**计算键**（`{ [k]: 1 }`——键是一个**值**，
所以走 `set_prop` 的「键也能是值」那条路）。展开（`{...o}`）抛。

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
    value = this.LowerFunctionValue(property, TextOf(name));
    keyConst = this.Program().AddConst(Constant.OfString(UnitsOf(TextOf(name))));
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

**构造目标只认标识符与属性访问**：`new (f())()` 这种要先求值再构造，
形状不同、语义也不同（`new.target` 那一套），这一轮抛。

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
  throw new Error("unimplemented: new with a " + calleeKind + " target");
}
const args = ListOf(node, "arguments");
const count = args.length;
// 结果落在参数基址上，所以 `argc = 0` 时基址仍要占一格（与 `LowerCall` 同一条规则）。
const base = this.Reserve(count > 0 ? count : 1);
for (let i = 0; i < count; i++) {
  this.LowerInto(base + i, args[i]);
}
this.Emit(Op.New, ctor, base, count, -1);
this.Release(ctor);
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

**模板串**：从左到右拼——头段、每个内插（`ToString` 之后）、每段字面量。

**为什么这么短**：`rt_call add` **一边是字符串就会把另一边 `ToString` 再拼**
（`rt.xl.md` 的 `RtAdd` 三条路之一）。所以 `` `n=${n}!` `` 就是
`"n=" + n + "!"`——**不需要新算子，也不需要显式转换**。

**投影保证两件事**（这一轮刚补上）：三个模板段的 `text` 都在（**不含分隔符**），
所以这里直接取文本即可，不必回头去扫源码。

```ts
const headText = this.Program().AddConst(Constant.OfString(UnitsOf(TextOf(Child(node, "head")))));
const result = this.Reserve(1);
this.Emit(Op.Const, result, headText, -1, -1);
const spans = ListOf(node, "templateSpans");
for (let i = 0; i < spans.length; i++) {
  const value = this.LowerExpression(Child(spans[i], "expression"));
  const joined = this.RtCallValues(RtOp.Add, result, value);
  const literal = Child(spans[i], "literal");
  const literalText = this.Program().AddConst(Constant.OfString(UnitsOf(TextOf(literal))));
  const tail = this.RtCall2(RtOp.Add, joined, literalText);
  this.Emit(Op.Move, result, tail, -1, -1);
}
return result;
```

## method LowerYield:(node:AstNode)=>int

**`yield`**：落成 `suspend` / `resume` 一对。

**为什么是两条**：`suspend` 把帧冻住、控制权回到推它的人（`DoIterNext`）；
下一次 `next(v)` 恢复时**接着跑的是 `suspend` 的下一条**——也就是这里放的 `resume`，
它把 `v` 写进一格。**那一格就是整个 `yield` 表达式的值**，于是 `const got = yield 1` 成立。

**`yield *` 抛**：委托迭代要转发 `next` / `throw` / `return` 三个方向，是另一件事。

**不在生成器里就抛**：`yield` 写在内层普通函数里是**语法错误**（JS 就是这么定的）——
让它跑到运行期，会变成一条把**普通帧**冻住的 `suspend`（帧不在栈上、没人推它，静默挂死）。

**这里不退水位**：`resume` 写进去的那一格要在后面一直活着，
退到它下面就等于把刚接到的值交给下一次分配覆盖（第 24 轮那条教训）。

```ts
if (!this.InGenerator) {
  throw new Error("unimplemented: yield outside a generator function");
}
if (node["asteriskToken"] !== undefined && node["asteriskToken"] !== null) {
  throw new Error("unimplemented: yield* (delegating iteration)");
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

**先做不做**（都抛，写进文首那张表）：`extends`、字段初始化、`static`、
getter / setter、计算键方法、生成器方法与 async 方法。

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
let baseName = "";
const heritage = node["heritageClauses"];
if (heritage !== undefined && heritage !== null) {
  const clauses = heritage as AstNode[];
  // **按「第一段就是 `extends`」处理**：投影里 `HeritageClause` **没有关键字那个字段**
  // （只有 `types`），所以分不出 `extends` 与 `implements`。TypeScript 的语法保证
  // `extends` 排在 `implements` 之前，于是「第一段」就是它。
  //
  // **取舍写在明处**：`class C implements I {}` 会被当成 `extends I`，然后在解析
  // `I` 时报「未知名字」——**响亮**，不是静默错值（而且这一支以前整段拒掉，没有更差）。
  // 要真正分开，得让投影带上从句的关键字（台账里记着这一类「孤立 token 被丢」）。
  if (clauses.length > 0) {
    const types = clauses[0]["types"] as AstNode[];
    const base = types[0]["expression"] as AstNode;
    if (NodeKind(base) !== "Identifier") {
      throw new Error("unimplemented: extends an expression (only a simple name is supported)");
    }
    baseName = TextOf(base);
  }
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
if (baseName !== "" && this.FindParentHasConstructor(baseName)) {
  // **父类带构造函数时，派生类必须自己写构造函数、并且调用 `super(...)`**。
  // 少了任何一样，「父类设的字段在子类实例上不存在」——那是**静默错值**。
  // （JS 在这里是运行期报 ReferenceError；我们在降级期就报，更早也更响。）
  if (explicitCtor === null) {
    throw new Error("unimplemented: a derived class must declare a constructor that calls super(...) (its parent has one)");
  }
  if (!HasSuperCall(explicitCtor)) {
    throw new Error("unimplemented: this derived constructor must call super(...) (its parent has one)");
  }
}
if (ctorNode === null) {
  // **默认构造函数**：JS 会给一个空的（`new C()` 于是合法）。
  ctorNode = { kind: "Constructor", parameters: [], body: { kind: "Block", statements: [] } };
}
const ctor = this.LowerFunctionValue(ctorNode, name);
// **构造函数那一项就是刚推进去的最后一项**（`LowerFunctionValue` 只推一项）。
// 把基类名记在它身上：`super(...)` 只允许出现在这一层，判定靠它。
if (baseName !== "" && this.Pending.length > 0) {
  this.Pending[this.Pending.length - 1].SuperName = baseName;
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
  if (kind !== "MethodDeclaration") {
    throw new Error("unimplemented: class member " + kind);
  }
  if (this.HasModifier(member, "StaticKeyword")) {
    throw new Error("unimplemented: static class member");
  }
  if (member["asteriskToken"] !== undefined && member["asteriskToken"] !== null) {
    throw new Error("unimplemented: generator method in a class");
  }
  if (this.NodeIsAsync(member)) {
    throw new Error("unimplemented: async method in a class");
  }
  const memberName = Child(member, "name");
  if (NodeKind(memberName) !== "Identifier" && NodeKind(memberName) !== "StringLiteral") {
    throw new Error("unimplemented: computed or numeric class member name");
  }
  const closure = this.LowerFunctionValue(member, name + "." + TextOf(memberName));
  const key = this.Program().AddConst(Constant.OfString(this.KeyUnitsOf(memberName)));
  this.SetPropertyConst(proto, key, closure);
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
const parameters = ListOf(node, "parameters");
const params: string[] = [];
for (let i = 0; i < parameters.length; i++) {
  const parameter = parameters[i] as AstNode;
  const parameterName = OptionalChild(parameter, "name");
  if (parameterName === null || NodeKind(parameterName) !== "Identifier") {
    throw new Error("unimplemented: parameter without a simple name");
  }
  params.push(TextOf(parameterName));
}
const slot = this.Reserve(1);
const patch = this.Program().AddConst(Constant.OfInt(0));
const window = this.Reserve(2);
const enclosing = this.Env.Last();
if (enclosing === null) {
  this.Emit(Op.Const, window, this.Program().AddConst(Constant.OfUndefined()), -1, -1);
} else {
  this.Emit(Op.Move, window, enclosing.Slot, -1, -1);
}
this.Emit(Op.Const, window + 1, patch, -1, -1);
this.EmitRt(RtOp.NewClosure, slot, window, 2);
// **退到闭包之上，不是退到窗口**（理由见 `LowerFunctionValue` 那一处）。
this.Release(slot + 1);
// **函数声明也自带 `prototype`**（`new F()` 靠它把方法落到实例上）。
this.AttachPrototype(slot);
// **声明放在造闭包之后**：这个名字可能被内层捕获，那样 `DeclareLocal` 会把这一格的
// 值搬进环境格——搬早了搬的就是一个空槽（判据报的是几十条指令之外的「调用了非闭包」）。
this.DeclareLocal(TextOf(name), slot);
const item = new PendingFunction(TextOf(name), Child(node, "body"), params, patch);
item.Slot = slot;
item.IsGenerator = node["asteriskToken"] !== undefined && node["asteriskToken"] !== null;
item.IsAsync = this.NodeIsAsync(node);
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
if (kind === "NumericLiteral") {
  const slot = this.Reserve(1);
  this.Emit(Op.Const, slot, this.IntConst(NumberFromText(TextOf(node))), -1, -1);
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
  const captured = this.Env.Resolve("this");
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
  const value = this.LowerExpression(Child(node, "expression"));
  return this.RtCall1(RtOp.Typeof, value);
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
    if (nameKind !== "Identifier" && nameKind !== "StringLiteral" && nameKind !== "NumericLiteral") {
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
    // 只支持标识符左值：属性/下标左值要「求值一次接收者」，那条路与复合赋值的限制同源。
    if (NodeKind(operand) !== "Identifier") {
      throw new Error("unimplemented: update expression on a non-identifier");
    }
    const access = this.ResolveAccess(TextOf(operand));
    const read = this.Reserve(1);
    if (access.InEnv) {
      this.Emit(Op.EnvGet, read, access.Depth, access.Cell, -1);
    } else {
      this.Emit(Op.Move, read, access.Slot, -1, -1);
    }
    const result = this.Reserve(1);
    // **先把旧值抄进结果格**：后缀要的就是它；前缀随后用新值覆盖。
    this.Emit(Op.Move, result, read, -1, -1);
    const one = this.Reserve(1);
    this.Emit(Op.Const, one, this.Program().AddConst(Constant.OfInt(1)), -1, -1);
    const updated = this.RtCallValues(operator === "++" ? RtOp.Add : RtOp.Sub, read, one);
    if (access.InEnv) {
      this.Emit(Op.EnvSet, updated, access.Depth, access.Cell, -1);
    } else {
      this.Emit(Op.Move, access.Slot, updated, -1, -1);
    }
    if (!isPostfix) {
      this.Emit(Op.Move, result, updated, -1, -1);
    }
    return result;
  }
  const value = this.LowerExpression(operand);
  if (operator === "-") return this.RtCall1(RtOp.Neg, value);
  if (operator === "!") return this.RtCall1(RtOp.Not, value);
  // **没做的照旧抛**（不静默给近似值）：`+x` 要 Number 转换、`~x` 要按位取反。
  throw new Error("unimplemented: unary operator `" + operator + "` (only -, !, ++ and -- are implemented)");
}
throw new Error("unimplemented: expression " + kind);
```

## method LowerInto:(slot:int, node:AstNode)=>void

把一个表达式的值算到**指定的那一格**里。

字面量与变量可以直接落进去；别的先算到临时槽再搬——**这样调用方就不必关心
「哪些表达式能直接落格」**（那属于优化的余量，不属于语义）。

```ts
const kind = NodeKind(node);
if (kind === "NumericLiteral") {
  this.Emit(Op.Const, slot, this.IntConst(NumberFromText(TextOf(node))), -1, -1);
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
const value = this.LowerExpression(node);
this.Emit(Op.Move, slot, value, -1, -1);
this.Release(value);
```

## method LowerBinary:(node:AstNode)=>int

二元表达式，**含赋值**（赋值在树里也是 `BinaryExpression`，只是运算符是 `=`）。

**赋值的值就是被赋的那个值**（JS 语义：`x = 1` 的值是 1），所以算完直接返回左值的槽。

```ts
const operatorText = TextOf(Child(node, "operatorToken"));
const left = Child(node, "left");
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
if (operatorText === "+=" || operatorText === "-=" || operatorText === "*="
  || operatorText === "/=" || operatorText === "%=") {
  // 复合赋值展开成「读 → 算 → 写」，**读一次**（左边只求值一次）。
  if (NodeKind(left) !== "Identifier") {
    throw new Error("unimplemented: compound assignment to a non-identifier");
  }
  const access = this.ResolveAccess(TextOf(left));
  const read = this.Reserve(1);
  if (access.InEnv) {
    this.Emit(Op.EnvGet, read, access.Depth, access.Cell, -1);
  } else {
    this.Emit(Op.Move, read, access.Slot, -1, -1);
  }
  const right = this.LowerExpression(Child(node, "right"));
  const sum = this.RtCallValues(BinaryOpOf(operatorText.slice(0, 1)), read, right);
  if (access.InEnv) {
    this.Emit(Op.EnvSet, sum, access.Depth, access.Cell, -1);
  } else {
    this.Emit(Op.Move, access.Slot, sum, -1, -1);
  }
  return sum;
}
if (operatorText === "=") {
  const leftKind = NodeKind(left);
  if (leftKind === "PropertyAccessExpression" || leftKind === "ElementAccessExpression") {
    // **求值顺序是语义**：接收者 → 下标 → 值（JS 就是这个顺序，副作用按它发生）。
    const receiver = this.LowerExpression(Child(left, "expression"));
    if (leftKind === "PropertyAccessExpression") {
      const name = Child(left, "name");
      const nameKind = NodeKind(name);
      if (nameKind !== "Identifier" && nameKind !== "StringLiteral" && nameKind !== "NumericLiteral") {
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
this.EmitRt(BinaryOpOf(operatorText), base, base, 2);
if (IsNegated(operatorText)) {
  this.EmitRt(RtOp.Not, base, base, 1);
}
this.Release(base + 1);
return base;
```

## method LowerCall:(node:AstNode)=>int

调用：被调方先算成**一个值**（引擎的 `call` 收的就是一格），参数逐个放进从 `base`
开始的连续格，**结果落回 `base`**（调用约定）。

三条路，**区别在 `this`**：

- **`o.m(...)`** → `call_method`（`this` 是接收者，键是**常量**）；
- **`o[k](...)`** → 先 `get_prop` 按键取值（那一支收的是**值**键），
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
  // **计算成员调用 `o[k]()`**：先按键取值（`get_prop` 收的就是**值**键），
  // 再用 `Op.Call` 的 `D` 操作数把**接收者当 `this`** 递过去——
  // 这两件都是现成的（`get_prop` 的值键 + 第 47 轮加的那个 `this` 槽），
  // 所以这里**一个新算子都不需要**。
  const elementReceiver = this.LowerExpression(Child(callee, "expression"));
  const elementKey = this.LowerExpression(Child(callee, "argumentExpression"));
  const elementFn = this.RtCallValues(RtOp.GetProp, elementReceiver, elementKey);
  const selfSlot = this.Reserve(1);
  this.Emit(Op.Move, selfSlot, elementReceiver, -1, -1);
  const elementArgs = ListOf(node, "arguments");
  const elementCount = elementArgs.length;
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
  const superCount = superArgs.length;
  const superBase = this.Reserve(superCount > 0 ? superCount : 1);
  for (let i = 0; i < superCount; i++) {
    this.LowerInto(superBase + i, superArgs[i]);
  }
  this.Emit(Op.Call, parent, superBase, superCount, selfSlot);
  // **退到结果之上**（父类构造函数那格、`this` 那格都在下面，退过去就把活格交出去了）。
  this.Release(superBase + 1);
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
const base = this.Reserve(count > 0 ? count : 1);
for (let i = 0; i < count; i++) {
  this.LowerInto(base + i, args[i]);
}
this.Emit(Op.Call, calleeSlot, base, count, -1);
this.Release(base + 1);
return base;
```
