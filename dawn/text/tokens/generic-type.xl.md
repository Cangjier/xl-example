# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { CommonUtil } from "../../../core/common-util.xl.md"
import { Document } from "../../../core/syntax/document.xl.md"
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
   **例外**：最后一个是 `?` 符号、而它前面是 `Common` 时也算数——TypeScript 的可选成员签名写作
   `m?<T>()`（`?` 在类型参数之前），不放这一条，`<T>` 会退回比较符号，整条签名被三元表达式规则抢走。
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

**名字闸有两支**：宿主最后一个子单元是 `Common`（`Array<T>` 这种），
**或者是一个「操作数起点」**——`=` / `=>` / `:` / `;` / `,` 这些符号，或者一段括号、一个软换行。
第二支是给**泛型箭头函数**与**泛型函数类型**的：`<T>(x: T) => x` / `type X = <T>(x: T) => T`
里 `<` 前面**没有名字**，只有 `=` 或者什么都没有；只认第一支时 `<T>` 退回符号，
`Lamda` / 函数类型都跟着散架（实测 5 条用例）。

放宽的风险由「左侧必须有操作数」这条语义兜住：比较式 `a < b > (c)` 的 `<` 前面**是** `a`（走第一支），
而第二支的位置上按定义还没有操作数，`<…>` 只可能是类型参数段。

```ts
let last = unit.Last();
if (last instanceof Symbol && last.Is("?")) {
  const beforeMark = unit.Data[unit.Data.length - 2];
  if (!(beforeMark instanceof Common)) {
    return false;
  }
  last = beforeMark;
}
const isOperandStart =
  (last instanceof Symbol && (last.Is("=") || last.Is("=>") || last.Is(":") || last.Is(";") || last.Is(","))) ||
  last instanceof Bracket ||
  last instanceof WrapSymbol;
if (!(last instanceof Common) && isOperandStart === false) {
  return false;
}
if (last instanceof Common && (last.IsNumber() || last.IsBool())) {
  return false;
}
const closeIndex = this.ScanArguments(unit, source);
if (closeIndex === -1) {
  return false;
}
return this.IsAllowedFollower(unit, source, closeIndex);
```

## private method NextSignificantIsCloseAngle:(document:Document, count:int, index:int)=>bool

从 `index`（一个换行）往后看，跳过空白与换行，第一个非空字符是不是**类型还在继续**的字符：
`>`（收尾）、`|` / `&`（联合 / 交叉的下一项）、`:` / `?`（条件类型的分支）。

给上面那条换行判定用：`<` 里的换行如果紧接着是这几者之一，那这个换行属于**类型参数表的排版**，
不是语句结束。

`|` / `&` 那一支是给**折行的联合类型实参**的：`interface ParsedUrlQueryInput extends NodeJS.Dict<`
换行 `| string` 换行 `| number` 换行 `| boolean` 换行 `> { }`。
`string` 之后的换行前面是标识符（不是 `,` 也不是 `<`），只看「下一个是不是 `>`」会判否、
整个 `<…>` 退回符号、接口跟着塌（`querystring.d.ts` 的 `ParsedUrlQueryInput` 就是它）。

`:` / `?` 那一支是给**折行的条件类型**的（类型参数的默认值里很常见）：
`ReturnType = F extends (...args: any) => infer T ? T` 换行
`: F extends abstract new(...args: any) => infer T ? T` 换行 `: unknown,`。
换行后面是 `:` / `?`，说明这个条件类型还没写完（`@types/node/test.d.ts` 的
`interface MockFunctionCall<…>` 三个类型参数都是这个形状）。

```ts
let i = index;
while (i < count) {
  const item = document.GetValue(i);
  if (item === " " || item === "\t" || item === "\n" || item === "\r") {
    i = i + 1;
    continue;
  }
  return item === ">" || item === "|" || item === "&" || item === ":" || item === "?";
}
return false;
```

## private method ScanArguments:(unit:Token, source:Source)=>int

从 `<` 之后扫到配对的 `>`，返回那个 `>` 的下标；扫不通返回 `-1`。

扫描器只认「类型实参字母表」：标识符字符、`_`、`.`、`,`、`?`、`=`（类型参数的默认值）、`:`（类型字面量里的键）、
`|` 与 `&`（联合 / 交叉类型）、**成对的字符串字面量**（`Exclude<K, "a">` 这种字面量类型实参），
加上成对的 `< >` / `( )` / `[ ]` / `{ }`，以及 `->`（函数类型）。其余字符一律中止：
`+`、`/`、`%`、`^`、`~`、`!`、`@`、`#`、`$`、`` ` ``、`;`，
以及**括号层级为 0 时**的 `)` / `]` / `}`（它闭合的是 `<` 外面的东西，说明这里根本不是泛型）。

**字符串字面量是必须放进字母表的**：`Exclude<K, "a">` / `Record<"x", T>` 这类写法到处都是，
`"` 在字母表外时扫描在它那里中止、整个 `<…>` 退回符号。
它成对吃掉（含 `\"` 转义），所以不会把 `a < b, "s" > c` 这种比较链读成泛型——
最后还有后继闸：表达式位里 `<…>` 后面必须紧跟 `(` 才算数。

**`;` 只在括号组里放行**（`groupDepth > 0`）：类型实参里的类型字面量成员用 `;` 分隔，
`Promise<{` 换行 `publicKey: string;` 换行 `privateKey: string;` 换行 `}>` 是最常见的写法之一，
`;` 一律中止的话这些类型实参整段认不出来（`crypto.d.ts` 一处就有几十个）。
组外的 `;` 仍然是语句边界，照样中止 ✓。

**`|` 与 `&` 是必须放进字母表的**：TypeScript 的类型实参到处是联合与交叉——
`Array<string | number>`、`<I extends null | Writable, O extends null | Readable>`。
它们在字母表外时，扫描在第一个 `|` 处中止、整个 `<…>` 退回符号，
于是**类型参数段认不出来、整条声明跟着塌掉**（实测 `@types/node/child_process.d.ts` 的
`interface ChildProcessByStdio<I extends null | Writable, …>` 就是这样丢的：接口与它的成员一起消失）。
放进来的风险由最后一道闸门兜住：表达式位里 `<…>` 后面必须紧跟 `(` 才算数，
`a < b | c > d` 这种写法的 `>` 后面不是 `(`，照样被挡回去。

**`=` / `:` / `{ }` 三个字符是「类型参数段」需要的**：`<T = unknown>`、`<T extends object = {}>`、
`<T = { a: number }>` 这些写法里它们必然出现，而 TypeScript 的类型位到处是它们。
放开这三个字符不会把表达式里的 `<` 误读成泛型——最后一道闸门是 `IsAllowedFollower`：
表达式位里 `<…>` 后面必须紧跟 `(` 才算数（`a<b, c=d>e` 这类写法在那一关被挡回去）。

换行的取舍：泛型实参表允许折行，但折行不能是「语句结束」。所以只有**嵌套未归零**（`angleDepth > 1` 或 `groupDepth > 0`）、
**上一个非空字符是 `,` / `<`**（明显的续行信号）、或**下一个非空字符是这个表的收尾 `>`** 时才跨过换行，否则判否——
`let n = a<b` 后面另起一行 `foo(bar) > x` 这种跨语句误吞就是这样挡掉的。

**「下一个非空字符是 `>`」这一条是必须的**：真实的声明几乎总是把类型参数表折成多行，而收尾的 `>` 常常独占一行——
`interface ChildProcessByStdio<` 换行 `I extends null | Writable,` 换行 `O extends null | Readable` 换行
`> extends ChildProcess { … }`。
`O extends null | Readable` 之后的那个换行前面是标识符 `Readable`（不是 `,` 也不是 `<`），
没有这一条就会判否、整个 `<…>` 退回符号，接口规则再也认不出类型参数段，**整条接口连同它的成员一起消失**
（实测 `@types/node/child_process.d.ts` 两个接口、若干成员就是这么丢的）。

`lastSignificant` 也要把 `|` / `&` 认成续行信号：折行的联合类型实参写法里，
一行以 `|` 结尾是常见排版。

注释按「透明」处理：`//` 吃到行尾、`/* … */` 吃到配对处，都不改变扫描状态——否则 `let m: HashMap<String, // 键` 换行后接 `Int64> = …` 这种写法里的 `//` 会把这次试读打断（`/` 不在字母表里）。

`->` 里的 `>` 必须当成箭头的一部分吞掉、**不能**参与尖括号计数，否则 `(A) -> B>` 会被算少一层。

**`=>` 同理，而且更常见**：类型位的函数类型写作 `(args) => R`，
`type Parameters<T extends (...args: any) => any> = …` / `interface ClassDecoratorContext<Class extends abstract new (...args: any) => any>` 都是这个形状。
不吞的话那个 `>` 会被当成**类型参数表的收尾**，`<…>` 提前结束、整条声明跟着塌
（`lib.es5.d.ts` 的 `Parameters` / `ReturnType` / `InstanceType`、`lib.decorators.d.ts` 的两个
`…DecoratorContext`、`typescript.d.ts` 的 `visitNodes` —— 实测正是这几处）。

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
  if (item === "=" && index + 1 < count && document.GetValue(index + 1) === ">") {
    seenArgument = true;
    lastSignificant = ">";
    index += 2;
    continue;
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
  if (item === "|" || item === "&") {
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  if (item === ";" && groupDepth > 0) {
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  if (item === "\"" || item === "'") {
    const next = index + 1 < count ? document.GetValue(index + 1) : "";
    const closer = item;
    if (next === closer) {
      return -1;
    }
    index++;
    while (index < count) {
      const inner = document.GetValue(index);
      if (inner === "\\") {
        index += 2;
        continue;
      }
      if (inner === closer) {
        break;
      }
      index++;
    }
    if (index >= count) {
      return -1;
    }
    seenArgument = true;
    lastSignificant = closer;
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
    if (
      groupDepth === 0 &&
      angleDepth === 1 &&
      lastSignificant !== "," &&
      lastSignificant !== "<" &&
      lastSignificant !== "|" &&
      lastSignificant !== "&"
    ) {
      if (this.NextSignificantIsCloseAngle(document, count, index) === false) {
        return -1;
      }
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
- `.` 与 `,` 是**透明**的：限定名 `a.b.C<T>` 的点、以及参数表 / 父接口列表里的逗号，都不改变类型位判定——继续往前找真正的边界。TypeScript 里带类型实参的名字几乎总是出现在这两种位置（`extends a.b.Base<T>`、`function f(a: A, b: B<T>)`），把它们当边界会让这些写法整条退回比较运算符。
- 最近的边界是 `=` → 记下「跨过赋值」继续往前找：再遇到 `type` 就是类型位（`type X = Array<Int64>` 的右端是类型），遇到 `let` / `var` / `const` 则是表达式位（`let x = Array<Int64>(3)` 的右端是值）。两个 `=` 之间没有结论也算表达式位。
- 最近的边界是括号单元或 `;` / 其它符号 → 表达式位（实参、下标、语句边界都不保证期望类型）。
  **例外**：括号前面是 `import` 时继续往前——那是**导入类型** `import("./m").A<T>`，
  括号（模块说明符）只是类型引用的一部分，不该把它当表达式位的边界
  （`type-import-generic` 那条用例的 `<T>` 就是在这儿被挡掉的）。
- 最近的实义单元是 `Common`：是 `class` / `interface` / `struct` / `enum` / `extend` / `extends` / `func` / `type` / `where` / `new` / `as` / `satisfies` / `is` 就判类型位；是普通标识符就继续往前找（限定名 `a.b.C<T>` 要跨过中间的名字）。
  `satisfies` 是必须的：`x satisfies Record<string, number>` 里 `<…>` 的右端是语句结尾、不是 `(`，
  不判类型位就过不了后继闸（`type-op-satisfies` 那条用例就是它）。
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
    if (text === "." || text === ",") {
      continue;
    }
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
    const beforeBracket = i - 1 >= 0 ? unit.Data[i - 1] : null;
    if (beforeBracket instanceof Common && beforeBracket.Is("import")) {
      i = i - 1;
      continue;
    }
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
      case "satisfies":
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

重组队列取默认值（通用重组队列）——与 `Bracket.Use("(")` 那一支同款：
泛型实参段里能出现**各种类型形状**（类型字面量 `Array<{ a: 1 }>`、元组、嵌套泛型），
通用队列里那几条类型规则都要在；好处还有表内的软换行会被正常摘掉
（注释则不再被摘掉，见 `../parse-pipeline.xl.md` 的 `GeneralReorganize`）；
`Statement` 那两条只挂在 `Root` 上，所以泛型内部不会长出语句节点。

**两条表达式规则要单独挡在泛型实参段外面**（就地拒，而不是换队列）：
`LetReorganization`（`<const T>` 的 `const T` 会被当成变量声明）与
`TernaryOperatorReorganization`（`Wrap<T extends U ? A : B>` 的 `? :` 是**条件类型**，不是三元表达式）。
换队列的做法试过、退回来了：通用队列里同时带着类型字面量等**类型**规则，
一刀切掉会伤到 `Array<{ a: 1 }>` / `<T extends X = {}>` 这些完全正常的写法。

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
  const previous = source.Pre();
  const isArrow =
    previous !== null && (previous.Value === "=" || previous.Value === "-");
  if (isArrow === false) {
    this.SignOut(source);
    this.TryToClose();
    this.Quit();
    return BranchStates.Done;
  }
}
return BranchStates.Undo;
```

**`=>` / `->` 里的 `>` 不是收尾**（这一条与 `ScanArguments` 里那两处是对称的，
三处少一处都不行）：`interface X<T extends (a: any) => any> { … }` 里
那个 `>` 属于箭头，`ExitOrPre` 一退出，`GenericType` 就停在 `=` 后面，
`any>` 掉到外面、**整条声明跟着塌**。
`ScanArguments` 那边（内容闸）早已经把 `=>` 吞掉了，但 `ExitOrPre` 是**另一条路**——
字符级配对时它先跑（`UnitToken.Process` 的「先问退出条件」），
所以两处必须都认这个形状。

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
