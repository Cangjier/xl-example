# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { CommonUtil } from "../../../core/common-util.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
import { Symbol } from "./symbol.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

泛型实参段：`Array<Int64>` 里的 `<Int64>`、`Map<String, Int64>` 里的 `<String, Int64>`。

**这个特性完全由本文件定义**——`GenericType` 的形状与 XML 产出格式都以这里为准（XML 形状见 `GenericType.ToXmlString`）。

难度只有一个：`<` 与 `>` 同时是比较运算符（`SymbolTemplate.CompareSymbols` 里就有 `>` `<` `>=` `<=`），而词法层拿不到「这里期望一个类型」这种语法上下文。判定因此按**先试读、读不通就退回比较运算符**来组织，口径参考 TypeScript 的泛型实参消解：**不看空白**，看能不能凑出一个合法的类型实参表，以及 `>` 后面跟着什么。

四道闸门，任一不过就返回失败，`<` 继续由 `Symbol` 接手当比较运算符：

1. **名字闸**：宿主单元最后一个子单元必须是 `Common`，且不是数字 / 布尔字面量。`3 < 4`、`true < false`、行首的 `<`、`(` 后面的 `<` 都直接判否。
2. **内容闸**（`ScanArguments`）：从 `<` 之后按「类型实参字母表」扫到配对的 `>`，带尖括号 / 圆括号 / 方括号嵌套；换行只在嵌套未归零、或上一个非空字符是 `,` / `<` 时才续扫，否则视为语句到此为止。
3. **位置闸**（`IsTypePosition`）：从宿主单元的 `Data` 往前找最近的边界，判定 `<` 处在**类型位**还是**表达式位**——最近的 `:` / `->` 是类型位，最近的 `=` / 括号 / 语句边界是表达式位，声明关键字按「`class`/`func`/`type`/`new`/`as`/`is`/`where` 给类型位，`let`/`var`/`const` 跨过 `=` 之后算表达式位」处理。
4. **后继闸**（`IsAllowedFollower`）：类型位允许名字 / `) ] } , ; > < . = ( : { ?` / 行尾（含行尾注释）或文件尾；表达式位**只**允许 `(`——这就是 TypeScript 的「泛型调用」形状。数字、引号、算术与逻辑运算符一律判否。

按这四道闸门：

- 判成泛型：`let a: Array<Int64>`、`new Array<Int64>(3)`、`HashMap<String, Int64>`、`Array<Array<Int64>>`、`func f<T, U>(x: T)`、`x as Array<Int64>`、`where T <: Comparable<T> {` 里的 `Comparable<T>`（`T <:` 本身仍然是符号——`:` 不在字母表里）；
- 退回比较符号：`a < b`、`i <= 10`、`answer > 50`、`a < b && c > d`、`f(a<b, c>d)`、`if (a<b) {}`、`for (let i = 0; i<n; i++)`、`let x = a < b > c`。

残余误判都被样本钉住（见 `samples/generic.cj` 与 README）：**类型位**里写出来的零空格比较链（如 Json 对象里的 `{a: b<c>d}`）仍会被读成泛型。要根治得引入整句语法上下文，本层不做。

`GenericTypeBranch` 写在 `GenericType` **之前**：后者的静态字段 `JumpIn` 在类定义时立即 `new GenericTypeBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class GenericTypeBranch extends Branch

泛型实参段的跳转判定。

它比 `Symbol` 早一步被问到（见 `../parse-pipeline.xl.md` 的通用跳转队列），所以「这个 `<` 到底是不是泛型开头」这件事只能在它这里回答。判定成立就挂载一个 `GenericType` 子单元——挂载是必须的：`UnitToken.Process` 先问挂载单元再问跳转队列，只有挂起来的单元才能让配对的 `>` 抢在 `Symbol` 前面被吃掉（否则 `>` 会先和后面的 `=` 组成 `>=`）。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只有当前字符是 `<`、且四道闸门都过才成立。`Message` 保持 `0`（新建单元）。

```ts
const result = new BranchConditionResult();
result.Success = source.Value === "<" && this.IsGenericStart(unit, source);
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下这个 `<`：新建一个 `GenericType` 挂到宿主上，并用 `<` 签入。

结构与 `BracketBranch.Success` 一致——`<` 这个字符本身不进 `Temp`、不进 `Data`，它由 `GenericType.StartBracketChar` 记着；后续字符由挂载单元自己啃。

```ts
unit.AddToMounted(new GenericType(unit.Template)).SignIn(source);
```

## private method IsGenericStart:(unit:Token, source:Source)=>bool

四道闸门的入口，按「便宜的先问」排序：名字闸（只看宿主最后一个子单元）→ 内容闸（纯文本前瞻）→ 后继闸（要位置闸的结论）。

```ts
const last = unit.Last();
if (!(last instanceof Common)) {
  return false;
}
if (last.IsNumber() || last.IsBool()) {
  return false;
}
const closeIndex = this.ScanArguments(unit, source);
if (closeIndex === -1) {
  return false;
}
return this.IsAllowedFollower(unit, source, closeIndex);
```

## private method ScanArguments:(unit:Token, source:Source)=>int

从 `<` 之后扫到配对的 `>`，返回那个 `>` 的下标；扫不通返回 `-1`。

扫描器只认「类型实参字母表」：标识符字符、`_`、`.`、`,`、`?`、`=`（类型参数的默认值）、`:`（类型字面量里的键），
加上成对的 `< >` / `( )` / `[ ]` / `{ }`，以及 `->`（函数类型）。其余字符一律中止：
`+`、`/`、`%`、`&`、`|`、`^`、`~`、`!`、`@`、`#`、`$`、`"`、`'`、`` ` ``、`;`，
以及**括号层级为 0 时**的 `)` / `]` / `}`（它闭合的是 `<` 外面的东西，说明这里根本不是泛型）。

**`=` / `:` / `{ }` 三个字符是「类型参数段」需要的**：`<T = unknown>`、`<T extends object = {}>`、
`<T = { a: number }>` 这些写法里它们必然出现，而 TypeScript 的类型位到处是它们。
放开这三个字符不会把表达式里的 `<` 误读成泛型——最后一道闸门是 `IsAllowedFollower`：
表达式位里 `<…>` 后面必须紧跟 `(` 才算数（`a<b, c=d>e` 这类写法在那一关被挡回去）。

换行的取舍：泛型实参表允许折行，但折行不能是「语句结束」。所以只有**嵌套未归零**（`angleDepth > 1` 或 `groupDepth > 0`）、或**上一个非空字符是 `,` / `<`**（明显的续行信号）时才跨过换行，否则判否——`let n = a<b` 后面另起一行 `foo(bar) > x` 这种跨语句误吞就是这样挡掉的。

注释按「透明」处理：`//` 吃到行尾、`/* … */` 吃到配对处，都不改变扫描状态——否则 `let m: HashMap<String, // 键` 换行后接 `Int64> = …` 这种写法里的 `//` 会把这次试读打断（`/` 不在字母表里）。

`->` 里的 `>` 必须当成箭头的一部分吞掉、**不能**参与尖括号计数，否则 `(A) -> B>` 会被算少一层。

`seenArgument` 保证 `<>`、`< >` 这类空实参表不成立。

```ts
const document = source.Document;
const count = document.GetCount();
let angleDepth = 1;
let groupDepth = 0;
let seenArgument = false;
let lastSignificant = "<";
let index = source.Index + 1;
while (index < count) {
  const item = document.GetValue(index);
  if (item === "<") {
    angleDepth++;
    seenArgument = true;
    lastSignificant = "<";
    index++;
    continue;
  }
  if (item === ">") {
    angleDepth--;
    if (angleDepth === 0) {
      return seenArgument ? index : -1;
    }
    lastSignificant = ">";
    index++;
    continue;
  }
  if (item === "-") {
    if (index + 1 < count && document.GetValue(index + 1) === ">") {
      seenArgument = true;
      lastSignificant = ">";
      index += 2;
      continue;
    }
    return -1;
  }
  if (item === "(" || item === "[" || item === "{") {
    groupDepth++;
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  if (item === ")" || item === "]" || item === "}") {
    if (groupDepth === 0) {
      return -1;
    }
    groupDepth--;
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  if (item === "=" || item === ":") {
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  if (item === "/") {
    const next = index + 1 < count ? document.GetValue(index + 1) : "";
    if (next === "/") {
      index += 2;
      while (index < count && document.GetValue(index) !== "\n") {
        index++;
      }
      continue;
    }
    if (next === "*") {
      index += 2;
      while (index + 1 < count && (document.GetValue(index) !== "*" || document.GetValue(index + 1) !== "/")) {
        index++;
      }
      index += 2;
      continue;
    }
    return -1;
  }
  if (item === "\n" || item === "\r") {
    if (groupDepth === 0 && angleDepth === 1 && lastSignificant !== "," && lastSignificant !== "<") {
      return -1;
    }
    index++;
    continue;
  }
  if (item === " " || item === "\t") {
    index++;
    continue;
  }
  if (this.IsArgumentChar(unit, item)) {
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  return -1;
}
return -1;
```

## private method IsArgumentChar:(unit:Token, item:string)=>bool

类型实参表里允许出现哪些普通字符。

字母与数字借符号模板判定（`IsLetterOrNumber` 只认 ASCII），`_` / `.` / `,` / `?` 单独放行——`.` 给限定名，`,` 给多实参，`?` 给可空类型后缀。

```ts
if (item === "_" || item === "." || item === "," || item === "?") {
  return true;
}
return unit.Template.SymbolTemplate.IsLetterOrNumber(item);
```

## private method IsTypePosition:(unit:Token)=>bool

从宿主单元的 `Data` **往前**找最近的边界，判定当前处在类型位还是表达式位。

规则：

- 宿主自己就是 `GenericType` → 类型位（嵌套 `Array<Array<T>>`、`Map<String, Int64>` 的内层直接成立）。
- 最近的边界是 `:` 或 `->` → 类型位（类型标注、返回类型、`<:` 约束）。
- 最近的边界是 `=` → 记下「跨过赋值」继续往前找：再遇到 `type` 就是类型位（`type X = Array<Int64>` 的右端是类型），遇到 `let` / `var` / `const` 则是表达式位（`let x = Array<Int64>(3)` 的右端是值）。两个 `=` 之间没有结论也算表达式位。
- 最近的边界是括号单元或 `;` / 其它符号 → 表达式位（实参、下标、语句边界都不保证期望类型）。
- 最近的实义单元是 `Common`：是 `class` / `interface` / `struct` / `enum` / `extend` / `extends` / `func` / `type` / `where` / `new` / `as` / `is` 就判类型位；是普通标识符就继续往前找（限定名 `a.b.C<T>` 要跨过中间的名字）。
- `WrapSymbol` 与 `GenericType` 都是透明的，直接跳过（软换行不该挡住判定；已经收起来的泛型实参属于名字的一部分）。
- 一路找到头没有边界 → 表达式位（保守：`Array<Int64>` 这种裸类型表达式在 Cangjie 里不是合法语句）。

```ts
if (unit instanceof GenericType) {
  return true;
}
let crossedAssignment = false;
for (let i = unit.Data.length - 1; i >= 0; i--) {
  const item = unit.Data[i];
  if (item instanceof WrapSymbol || item instanceof GenericType) {
    continue;
  }
  if (item instanceof Symbol) {
    const text = item.TempToString();
    if (text === ":" || text === "->") {
      return true;
    }
    if (text === "=" && !crossedAssignment) {
      crossedAssignment = true;
      continue;
    }
    return false;
  }
  if (item instanceof Bracket) {
    return false;
  }
  if (item instanceof Common) {
    const text = item.TempToString();
    switch (text) {
      case "class":
      case "interface":
      case "struct":
      case "enum":
      case "extend":
      case "extends":
      case "func":
      case "type":
      case "where":
      case "new":
      case "as":
      case "is":
        return true;
      case "let":
      case "var":
      case "const":
        return !crossedAssignment;
      default:
        break;
    }
    continue;
  }
  return false;
}
return false;
```

## private method IsAllowedFollower:(unit:Token, source:Source, closeIndex:int)=>bool

配对 `>` 之后跟着什么，决定这次试读算不算数。

类型位给的是「名字或类型收尾」这一档：标识符字符、`) ] } , ; > < . = ( : { ?`、行尾或文件尾。表达式位只给 `(`——TypeScript 的泛型调用形状（`f<Int64>(x)`）：在表达式里，`<…>` 后面不接 `(` 的写法一律按比较运算符读，这样 `f(a<b, c>d)`、`a<b>c` 都会退回 `Symbol`。

**只看同一行**：跳过空格与制表符之后，遇到换行 / `\r` / 文件尾 / 注释开头（`//`、`/*`）就算这一行到此为止，直接返回「是不是类型位」。不跨行看，是因为越过换行之后看到的多半是**下一条语句**的开头，把它当成后继字符只会误判——`type Pair = Array<Int64>` 后面跟一句注释或 `let`，泛型必须照样成立。

数字刻意不在类型位的白名单里：`foo(bar) > 3` 这种被误当成泛型的收尾，最后会被这一条挡掉。

```ts
const document = source.Document;
let index = closeIndex + 1;
while (index < document.GetCount()) {
  const item = document.GetValue(index);
  if (item === " " || item === "\t") {
    index++;
    continue;
  }
  break;
}
const isTypePosition = this.IsTypePosition(unit);
if (index >= document.GetCount()) {
  return isTypePosition;
}
const item = document.GetValue(index);
if (item === "\n" || item === "\r") {
  return isTypePosition;
}
if (item === "/" && index + 1 < document.GetCount() && (document.GetValue(index + 1) === "/" || document.GetValue(index + 1) === "*")) {
  return isTypePosition;
}
if (!isTypePosition) {
  return item === "(";
}
if (unit.Template.SymbolTemplate.IsLetter(item) || item === "_") {
  return true;
}
switch (item) {
  case ")":
  case "]":
  case "}":
  case ",":
  case ";":
  case ">":
  case "<":
  case ".":
  case "=":
  case "(":
  case ":":
  case "{":
  case "?":
    return true;
  default:
    return false;
}
```

# class GenericType extends UnitToken

泛型实参段。

`UnitToken` 的调度把「先问退出条件、再跑跳转队列」固定下来，这正是它要的：**`ExitOrPre` 抢在 `Symbol` 前面**处理配对的 `>`，`>=` 因此没有机会被拼出来（`Array<Int64>=x` 里那个 `>` 仍然是收尾，后面的 `=` 才轮到 `Symbol`）。

它覆写了 `ToXmlString`，形状对齐 `Bracket`：尖括号本身做属性（`StartBracketChar` / `EndBracketChar`），子单元照常串在标签里。属性值必须过一遍 `CommonUtil.XmlDecode`——`<` 直接写进属性会破坏 XML，而 `Bracket` 的 `(` / `)` 没有这个问题，所以那边没有这一步。

## static readonly field JumpIn:GenericTypeBranch = new GenericTypeBranch()

把 `GenericTypeBranch` 注册进通用跳转队列用的实例（`../parse-pipeline.xl.md` 里插在 `Bracket.JumpIn` 之后、`Symbol.AppendIn` 之前）。

## constructor:(template:Template)=>void

取本类型的跳转队列与重组队列。

跳转队列取默认值就是**通用跳转队列**：泛型实参表里要能长出 `Common` / `Symbol` / 嵌套 `GenericType`，靠的正是它。

重组队列也取默认值（通用重组队列）——与 `Bracket.Use("(")` 那一支同款，好处是表内的软换行会被正常摘掉（注释则不再被摘掉，见 `../parse-pipeline.xl.md` 的 `GeneralReorganize`）；`Statement` 那两条只挂在 `Root` 上，所以泛型内部不会长出语句节点。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## field StartBracketChar:string = "<"

起始括号字符。与 `Bracket` 同形，只为产物形状服务。

## field EndBracketChar:string = ">"

结束括号字符。`ExitOrPre` 就是拿它配对的。

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理。

与 `Bracket` 一样是**空的**：泛型实参表里的空白由调用方忽略，其余字符都能在通用跳转队列里找到接手的人。不写方法体，打印器产出空方法。

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到配对的 `>` 就退出：签出、关闭并跑重组、从父单元卸载，返回 `Done`；否则返回 `Undo`，让这个字符继续走跳转队列。

顺序与 `Bracket.ExitOrPre` 一致（`SignOut` → `TryToClose` → `Quit`）。

嵌套泛型（`Array<Array<Int64>>`）不需要 `Depth` 字段：内层的 `<` 会由同一个分支在**内层宿主**上再挂一个 `GenericType`，`UnitToken.Process` 先转给挂载单元，所以内层的 `>` 由内层收，收完 `Quit` 把宿主的 `MountedUnit` 清空，外层的 `>` 才轮到外层。

```ts
if (source.Value === this.EndBracketChar) {
  this.SignOut(source);
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带转义过的尖括号属性，内容是子单元的 XML 串接。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} StartBracketChar="${CommonUtil.XmlDecode(this.StartBracketChar)}" EndBracketChar="${CommonUtil.XmlDecode(this.EndBracketChar)}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

顺序与 `Bracket.Clone` 一致：`Sign` → 抄两个字段 → 整批加入克隆出来的子单元 → `TryToClose`。

```ts
const result = new GenericType(this.Template);
result.Sign(this);
result.StartBracketChar = this.StartBracketChar;
result.EndBracketChar = this.EndBracketChar;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
