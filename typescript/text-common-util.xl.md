# dependencies
```xl
import { Token } from "../core/syntax/token.xl.md"
import { Get, GetSkipNext, GetSkipPrevious, SkipNext, SkipPrevious } from "../core/extensions/list-extension.xl.md"
import { Bracket } from "./tokens/bracket.xl.md"
import { Identifier } from "./tokens/identifier.xl.md"
import { Document } from "../core/syntax/document.xl.md"
import { String } from "./tokens/string/string.xl.md"
import { SymbolToken } from "./tokens/symbol-token.xl.md"
import { LineWrap } from "./tokens/line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

文本层专用工具：一组模块级函数，作用于 `Token` / `Array<Token>`。

扩展方法落成**模块级 `# method`**，ts 侧就是模块级函数：
调用形式是 `SkipPreviousWrapSymbol(units, i)`，列表本身作为第一个参数。

这一组函数全是「跳过 `LineWrap`」的变体——软换行在语法结构里不该挡住相邻单元的判断，
所以「上一个 / 下一个**实义**单元」的查找必须跨过它们。

原先这里还有一个 `InitialStatementReorganizationQueue`（给单元装报废语句用的重组队列）。
它读的是 `ReorganizationTemplate.DefaultValue`，也就是**通用重组队列**，属于解析优先级契约的一部分，
已经搬到 `./parse-pipeline.xl.md`，与 `GeneralReorganize` 放在一起。

# method SkipNextWrapSymbol:(units:Array<Token>, index:number)=>int

从 `index + 1` 起向后跳过所有 `LineWrap`，返回第一个非 `LineWrap` 的下标。

转调 `SkipNext` 并固定判定器为 `item is LineWrap`。

```ts
return SkipNext(units, index, (item) => item instanceof LineWrap);
```

# method SkipPreviousWrapSymbol:(units:Array<Token>, index:number)=>int

从 `index - 1` 起向前跳过所有 `LineWrap`，返回第一个非 `LineWrap` 的下标；一路跳到底返回 `-1`。

```ts
return SkipPrevious(units, index, (item) => item instanceof LineWrap);
```

# method GetSkipNextWrapSymbol:(units:Array<Token>, index:number)=>Token | null

`SkipNextWrapSymbol` 之后再取值；越界给 `null`。

```ts
return GetSkipNext(units, index, (item) => item instanceof LineWrap);
```

# method GetSkipPreviousWrapSymbol:(units:Array<Token>, index:number)=>Token | null

`SkipPreviousWrapSymbol` 之后再取值；越界给 `null`。

```ts
return GetSkipPrevious(units, index, (item) => item instanceof LineWrap);
```

# method IsUnicodeEscapeStart:(document:Document, index:number)=>bool

`index` 处是不是一个**标识符里的 Unicode 转义**的开头：`\` + `u` + 四个十六进制数字
（或 `\u{…}` 那种带花括号的写法）。

TypeScript 允许标识符写成转义形式（`const \u0061bc = 1` 里的名字就是 `abc`）。
`\` 本身是符号，所以**两条分支都要让路**：
`SymbolBranch.Condition` 见到这种形状要判否（不然它把 `\` 吃成符号），
`CommonBranch.Condition` 要判是（不然它同样因为「`\` 是符号」而拒收这一块）。

`u` 后面必须是十六进制，否则 `\` 还是普通符号——`"\\" + "u"` 这样的写法不会被误判。

```ts
if (document.GetValue(index) !== "\\") {
  return false;
}
if (index + 1 >= document.GetCount() || document.GetValue(index + 1) !== "u") {
  return false;
}
if (index + 2 < document.GetCount() && document.GetValue(index + 2) === "{") {
  let k = index + 3;
  let hexDigits = 0;
  while (k < document.GetCount() && document.GetValue(k) !== "}") {
    const item = document.GetValue(k);
    const isHex = (item >= "0" && item <= "9") || (item >= "a" && item <= "f") || (item >= "A" && item <= "F");
    if (isHex === false) {
      return false;
    }
    hexDigits = hexDigits + 1;
    k = k + 1;
  }
  return hexDigits > 0 && k < document.GetCount();
}
for (let k = index + 2; k < index + 6; k++) {
  if (k >= document.GetCount()) {
    return false;
  }
  const item = document.GetValue(k);
  const isHex = (item >= "0" && item <= "9") || (item >= "a" && item <= "f") || (item >= "A" && item <= "F");
  if (isHex === false) {
    return false;
  }
}
return true;
```

# method IsLeadingDotNumber:(document:Document, index:number)=>bool

`index` 处的 `.` 是不是**小数点开头的小数**（`.5` / `.5e3`）：当前字符是 `.`，且后一个字符是数字。

**为什么需要它**：`SymbolBranch` 排在 `CommonBranch` 之前，`.` 又是符号，
所以 `.5` 会被切成 `<SymbolToken>.</SymbolToken><Identifier>5</Identifier>`——
数字字面量被拆成两半（探索性差分实测 49 处组合上下文）。
`Identifier` 那边还要认它一次（同一个判据），因为 `=` 后面直接跟 `.5` 时没有可续写的 `Identifier`，
必须**新开**一个。

**`...` 的排除不在这里**：`..` 与 `...` 都是组合符号（见 `core/syntax/templates/symbol-template.xl.md`），
`......` 那样的点串里「第几个点还算 `...`」要看**上一个单元能不能续写**——
只有 `SymbolBranch` 拿得到上一个单元，所以那一条判据放在它那里（`IsAppend` 为真就不让路）。

```ts
if (document.GetValue(index) !== ".") {
  return false;
}
if (index + 1 >= document.GetCount()) {
  return false;
}
const next = document.GetValue(index + 1);
return next >= "0" && next <= "9";
```

# method DecideBracketContext:(host:Token, openChar:string)=>string

`host` 这个单元里正在打开一个 `{` 或 `[`（`openChar`），它在**类型位**还是**值位**上？返回 `"type"` / `"value"` / `""`。

**`(` 不在判定范围内**（第 57 轮试过、退回来了）：把 `(` 也纳进来之后，
`for (; i < n; i++)` 这类**循环头**的括号被判成了类型位（前文扫到了更远处的 `:` / `readonly`
一类的类型位信号），`i++` / `-1` 这些真正的一元运算当场少了 17 个
（`cases:dashboard` 报「一元/更新 真缺 17」）。根因是这里「往上爬 4 跳」的扫描对**括号**来说
前文太远、信号太杂；`{` / `[` 之所以能用，是因为它们的前文紧邻（`:` / `=` / `[`）。
所以括号类型里的 `typeof`（`(WindowProxy & typeof globalThis)`，全语料 1 处）
仍按一元运算收，登记在 `tests/parse/align.mjs` 的口径里。

**为什么要它（方案 A）**：原来这件事是**事后**做的 —— `TypeLiteralReorganization` / `BinaryOperatorReorganization` /
`SpreadReorganization` 各自在自己的位次上「往上找祖先」或「往前扫同层单元」来猜。
可是**规则被询问的时刻，树还不是最终的树**：实测同一个 `[` 在早期询问时 `Parent` 还指着 `Root`
（`ArrayLiteral < Root`），而最终树里是 `TypeAssign < Statement < Root` —— 祖先判据因此天然时序相关
（第 32、34 轮连试三版都失败）。

**改成在开括号那一刻判**：那时前文（同层的 `Identifier` / `SymbolToken`）**全都就位**，判定结果记在括号的
`Context` 字段上，之后**不随时序变化** ✓。

**前文可能不在宿主自己的 `Data` 里**：`type M<T> = { [K in keyof T]: T[K] }` 里那个 `[` 是在外层 `{`
这个括号单元里开的，它自己的 `Data` 还是空的 —— 要看的是**外层 `{` 之前**那几个词。所以本方法会
**往上爬**：`Data` 里扫不到信号就爬到父单元，从「自己所在的位置」继续往前扫。

**爬在这里是安全的**（而「往上找祖先」那类判据不安全）：词法阶段单元是**自上而下**挂上去的，
父指针在被处理之前就已设好；而且这里爬上去**只读那些平铺的前文词**，不做任何「这是不是类型节点」
的分类 —— 后者才是随重组时序变化的。

判定按「最近的一个信号」下结论：

- 前一个是 `:` / `?:` → 类型位，**但函数 / 方法的体是例外**：冒号前面是形参表（已关闭的 `(`）、
  且冒号与花括号之间已经有了返回类型文本时，这个 `{` 是**体**（值位）——
  `export function f(): string { … }` 的 `Context` 判错会把函数体里返回的数组字面量
  当成元组类型（第 66 轮实测 36 处）。**三元表达式的 `:` 除外**：它前面隔着 `?`；
- 前一个是 `?` → 值位；`|` / `&` → 类型位；
- 前一个是 `=` → 记下「跨过赋值」继续往前：再遇到 `type` 是类型位，遇到 `let` / `const` / `var` 是值位；
- `import` / `export` 后面的 `type`、且它后面**没有别的单元**（开括号紧跟其后）→ 值位（导入 / 导出列表）；
- 类型位关键字（`type` / `as` / `satisfies` / `extends` / `implements` / `readonly` / `keyof` / `typeof` / `infer` / `new` / `declare` / `asserts` / `is`）→ 类型位；
- **普通标识符继续往前扫**（不急着下结论）：`const o = { … }` 要跨过 `o` 才看得见 `const`；
- 其它符号 / 收尾括号 / 字符串 → 值位；
- 扫到头（含爬到顶）没有信号 → 值位（保守，与原来的默认一致）。

**`bracket.Closed` 那一支是实测补的**：往上扫时会遇到**外层那个还没关闭的括号**，
它不是操作数（只有**已关闭**的 `)` / `]` / `}` 才是），早期版本把它当成操作数直接判值位 ✗，
于是映射类型 `{ [K in keyof T]: T[K] }` 里那个 `[` 被判成了值位。

```ts
if (openChar !== "{" && openChar !== "[") {
  return "";
}
let crossedAssignment = false;
let sawUnit = false;
let node:Token | null = host;
let units:Array<Token> = node.Data;
let index:number = units.length;
for (let hop = 0; hop < 4 && node !== null; hop++) {
  let i = index - 1;
  while (i >= 0) {
    const item = Get(units, i);
    if (item instanceof LineWrap) {
      i = i - 1;
      continue;
    }
    if (item instanceof Bracket) {
      if (item.Closed) {
        return "value";
      }
      sawUnit = true;
      i = i - 1;
      continue;
    }
    if (item instanceof SymbolToken) {
      const text = item.TempToString();
      if (text === ":" || text === "?:") {
        const beforeColon = GetSkipPrevious(units, i, (x) => x instanceof LineWrap);
        const isTernary = beforeColon instanceof SymbolToken && beforeColon.Is("?");
        if (isTernary) {
          return "value";
        }
        // **函数 / 方法的「体」不是类型字面量**（第 66 轮补，只在 `{` 上问）：
        // `export function f(): string {` 里那个 `{` 往前扫会先经过返回类型 `string`、
        // 再撞上冒号——冒号前面是**形参表**（一个已关闭的 `(` 括号），
        // 说明这个花括号是**函数体**（值位），不是返回类型的类型字面量。
        // 三条缺一不可：扫描中**已经过实义单元**（`string` 就是返回类型文本）、
        // 冒号前面是已关闭的 `(`、当前开括号是 `{`。
        // 少了这一条，函数体的 `Context` 是 `"type"`，里面返回的数组字面量就被当成
        // 元组类型、字符串被包成 `LiteralType`（`cases:align` 实测 36 处）；
        // 而 `const f = (a): { b: 1 } => y` 的 `{` 紧跟在冒号后面（sawUnit 为假）⇒ 类型 ✓。
        if (openChar === "{" && sawUnit && beforeColon instanceof Bracket && beforeColon.Closed && beforeColon.startBracket === "(") {
          return "value";
        }
        // **冒号是不是「类型标注」的，要先看自己是不是在花括号容器里**（第 76 轮）：
        // `const o = { a: kids[i + 1] }` 里那个 `[` 往前扫，**先撞上的**是 `a` 后面那个
        // **属性分隔冒号**，于是被判成类型位——结果是同一个 `kids[i + 1]` 在语句位置折出
        // `<BinaryOperator op="+">`、在对象字面量里却是一串平铺的 `Identifier` / `SymbolToken`
        // （实测 `cases:align` 的「缺节点」方向报出 2 处 `BinaryExpression`，
        // 而这两处只在**本工程自己的产物**里出现——那个文件 1900 行、里面全是对象字面量）。
        //
        // 判据是**外层那个 `{` 自己处在哪**（它的 `Context` 在它开括号那一刻就算好了，
        // 与上面「爬出花括号之前先停」用的是同一个依据）：
        //
        //     const o = { a: kids[i + 1] }      → `{` 是值位（对象字面量）⇒ 值位 ✓
        //     let x: { a: A[K] }                → `{` 是类型位（类型字面量）⇒ 类型位 ✓
        //
        // 类型位关键字（`as` / `satisfies` / `keyof` / `readonly`…）在扫描里**先于**冒号出现
        // （`{ a: b as C[D] }` 撞上的是 `as`），所以真的类型写法到不了这一支。
        const holder = EnclosingBraceContext(host);
        if (holder !== "") {
          return holder;
        }
        return "type";
      }
      if (text === "?") {
        return "value";
      }
      if (text === "|" || text === "&") {
        return "type";
      }
      if (text === "=" && crossedAssignment === false) {
        crossedAssignment = true;
        i = i - 1;
        continue;
      }
      return "value";
    }
    if (item instanceof Identifier) {
      sawUnit = true;
      const text = item.TempToString();
      if (text === "type") {
        const beforeType = GetSkipPrevious(units, i, (x) => x instanceof LineWrap);
        const afterType = GetSkipNext(units, i, (x) => x instanceof LineWrap);
        if (
          beforeType instanceof Identifier &&
          (beforeType.Is("import") || beforeType.Is("export")) &&
          afterType === null
        ) {
          return "value";
        }
        return "type";
      }
      if (
        text === "as" ||
        text === "satisfies" ||
        text === "extends" ||
        text === "implements" ||
        text === "readonly" ||
        text === "keyof" ||
        text === "typeof" ||
        text === "infer" ||
        text === "new" ||
        text === "declare" ||
        text === "asserts" ||
        text === "is"
      ) {
        return "type";
      }
      if (text === "let" || text === "var" || text === "const") {
        return crossedAssignment ? "value" : "type";
      }
      i = i - 1;
      continue;
    }
    return "value";
  }
  // **爬出花括号之前先停**（第 66 轮补）：宿主是一个 `{` 括号时，答案就是**它自己处在哪**
  // （它的 `Context` 在它开括号那一刻就算好了）。再往外爬是**另一层**了：
  // `export function CjcliUsage(): string { return [ "a" ] }` 里那个 `[` 往前扫会爬到
  // 函数头，撞上**返回类型标注**的 `:` ⇒ 误判成类型位，于是返回值的数组字面量被当成
  // 元组类型、里面的字符串被包成 `LiteralType`（`cases:align` 实测 36 处）。
  // 花括号里的东西只由花括号自己的位置决定：值位的块 / 函数体 / 对象字面量 ⇒ 值位；
  // 类型位的类型字面量 / 映射类型 ⇒ 类型位（`type M = { [K in T]: X }` 里那个 `[` 正是靠这一条）。
  if (node instanceof Bracket && node.startBracket === "{") {
    return node.Context === "type" ? "type" : "value";
  }
  const parent:Token | null = node.Parent;
  if (parent === null) {
    return "value";
  }
  const at:number = parent.Data.indexOf(node);
  if (at < 0) {
    return "value";
  }
  node = parent;
  units = parent.Data;
  index = at;
  sawUnit = false;
}
return "value";
```
# method EnclosingBraceToken:(host:Token)=>Token | null

**包着 `host` 的那个 `{` 括号本身**（没有就返回 `null`）。

与 `EnclosingBraceContext` 是同一趟上溯的两个视图：一个要「它处在类型位还是值位」，
一个要「**它是不是对象字面量**」——后者要把括号交给对象字面量规则自己的判据
（`JsonObjectReorganization.IsObject`），所以得拿到括号本身。

从 `host` **自己**开始往上找（调用方传进来的 host 常常就是外层那个单元：
`bracket.xl.md` 的 `Success` 是在 `AddToMounted` **之前**调 `DecideBracketContext` 的，
那时新括号还没进树）。`(` / `[` 括号跳过，只认 `{`。

```ts
let node:Token | null = host;
for (let hop = 0; hop < 8 && node !== null; hop++) {
  if (node instanceof Bracket && node.startBracket === "{") {
    return node;
  }
  node = node.Parent;
}
return null;
```

# method BraceInExpression:(brace:Token)=>bool

**这个 `{` 括号自己是不是出现在表达式里**（对象字面量 / 块），还是**声明头后面的体**。

第 77 轮补的一条守卫。`Context` 只有「类型位 / 值位」两档，而**值位这一档里混着两类东西**：

- **表达式里的 `{`**：对象字面量（`const o = { … }`、`f({ … })`、`{ a: { b: 1 } }` 的内层…）
  ——它里面的冒号是**属性分隔符**；
- **声明头后面的 `{`**：类体 / 接口体 / 枚举体 / 命名空间体 / 类型字面量
  ——它们里面的冒号是**类型标注**（`interface I { m: { a: number } }` 的内层 `{` 是**类型字面量**）。

判据只看这个 `{` **前面那一格**（跳过软换行）：是符号（`=` / `(` / `,` / `:` / `[` / `;` …）
或者 `return` / `typeof` 两个词 ⇒ 它在表达式里；是名字（类名 / 接口名 / 模块名字符串）⇒ 它在声明头后面。
命名空间体前面是**字符串**、类体与接口体前面是**标识符**，都落在后一类 ✓。

```ts
if (brace.Parent === null) {
  return false;
}
const units:Array<Token> = brace.Parent.Data;
const at = units.indexOf(brace);
if (at < 0) {
  return false;
}
const before = GetSkipPrevious(units, at, (item) => item instanceof LineWrap);
if (before instanceof SymbolToken) {
  return true;
}
return before instanceof Identifier && before.IsAny(["return", "typeof"]);
```

# method EnclosingBraceContext:(host:Token)=>string

**包着 `host` 的那个 `{` 括号处在类型位还是值位**（没有、或者它其实是个声明体就返回 `""`）。

给 `DecideBracketContext` 的冒号那一支用：撞上冒号时先问「我在哪个花括号里」——
对象字面量（值位 `{`）里的冒号是**属性分隔符**，类型字面量（类型位 `{`）里的才是类型标注。

- 第一个 `startBracket === "{"` 且 `Context` **非空**的括号就是答案；
- `Context` 为空串的括号跳过——那是**正在算自己**的那一个（它还没定，问了也没用），
  或者 `(` / `[` 括号（它们的 `Context` 与「花括号容器」不是一回事）；
- **它还得是「表达式里的 `{`」**（`BraceInExpression`，第 77 轮补）：类体 / 接口体 / 命名空间体的
  `Context` 也是值位，可它们里面的冒号是类型标注——不筛掉的话
  `interface String { replace(searchValue: { [Symbol.replace](…): string }): string }`
  里那个**类型字面量**会被当成对象字面量，里面的 `(substring: string, …) => string` 会从
  函数类型变成箭头函数（实测 `lib.es2015.symbol.wellknown.d.ts` 1 处）。

```ts
let node:Token | null = host;
for (let hop = 0; hop < 8 && node !== null; hop++) {
  if (node instanceof Bracket && node.startBracket === "{" && node.Context !== "") {
    return BraceInExpression(node) ? node.Context : "";
  }
  node = node.Parent;
}
return "";
```

# method IsStatementStart:(units:Array<Token>, index:number)=>bool

`index` 处的单元是不是**一条语句的第一个实义单元**。

判据只看「前一个实义单元是什么」，不需要认识任何语句类：

- 前面没有实义单元 → 是（列表开头就是一条语句的开头）；
- 前面是 `;` 符号 → 是；
- 前面是 `Identifier` → **不是**——`let x: T` 里 `x` 前面是 `let`，
  `a ? b : c` 里 `b` 前面是 `?` 的另一侧，它们都在同一条语句内部；
- 其余（已经成形的语句单元、括号、其它 token）→ 是。

**它区分的是「标签」与「类型标注」这对同形写法**：`outer: { … }`（标签 + 块）
与 `let x: T`（声明 + 类型标注）在词法上都是「名字 + 冒号」，区别只在前者处在语句开头。
`LabelReorganization` 与 `JsonObjectReorganization` 都靠它：
前者只认语句开头的「名字 + 冒号」，后者靠它把语句位置的 `{` 判成**块**而不是对象字面量。

**三条件**：父单元必须是**语句列表**（根、各种语句体、块括号），处在一对非 `{` 的括号里或泛型实参段里一律不是；
前一个实义单元不能是 `Identifier` 或 `String`（`let x: T` 里 `x` 前面是 `let`，`declare module "x" {` 的 `{` 前面是 `"x"`）；
前面没有实义单元、或者前一个是 `;` 或一条已成形的语句单元时成立。

父单元用**类名白名单**判（`Root` / `FunctionBody` / `MethodBody` / `IfStatement` / `ForBody` / …）：
这里在 `text-common-util` 这一层，向上 import 那些语句类会绕出一圈循环依赖，
而「哪些单元是语句列表」本身就是这张白名单。`{` 括号按字符判（块括号是语句列表，`(` / `[` 不是）。

```ts
const current = Get(units, index);
if (current !== null) {
  const parent = current.Parent;
  if (parent !== null) {
    if (parent instanceof Bracket) {
      if (parent.startBracket !== "{") {
        return false;
      }
    } else if (IsStatementList(parent) === false) {
      return false;
    }
  }
}
const previousIndex = SkipPreviousWrapSymbol(units, index);
if (previousIndex < 0) {
  return true;
}
const previous = GetSkipPrevious(units, index, (item) => item instanceof LineWrap);
if (previous === null) {
  return true;
}
if (previous instanceof Identifier || previous instanceof String) {
  return false;
}
if (previous instanceof Bracket) {
  return previous.startBracket === "}";
}
if (previous instanceof SymbolToken) {
  return previous.Is(";");
}
return true;
```

**`Bracket` 那一支是给控制结构让路的**：`switch (x) {` / `while (x) {` / `function f() {` 里
`{` 前面正好是那个 `(…)` 括号——它是**上面那个头的体**，不是一条新语句。
少了这一支，这些体括号会被当成裸块、被本判定补上语句队列并当场跑一遍重组，
于是整个 `switch` / 函数体被**重复重组**一遍（实测 `switch` 的六个用例与样例夹具当场变形）。
只有接在 `}` 之后才算新语句（`{ … } { … }`）。

# method IsStatementList:(unit:Token)=>bool

`unit` 是不是一个**语句列表**（它的 `Data` 里装的是语句而不是表达式 / 类型）。

按类名白名单判，理由见 `IsStatementStart`。
`{` 括号由调用方按字符单独处理，这里只管各种语句体与根。

```ts
const name = unit.constructor.name;
return (
  name === "Root" ||
  name === "Statement" ||
  name === "FunctionBody" ||
  name === "MethodBody" ||
  name === "IfStatement" ||
  name === "IfSegment" ||
  name === "ForBody" ||
  name === "ForeachBody" ||
  name === "WhileBody" ||
  name === "DoWhileBody" ||
  name === "SwitchCase" ||
  name === "TryBody" ||
  name === "CatchBody" ||
  name === "FinallyBody" ||
  name === "NamespaceBody"
);
```

**`Statement` 必须在白名单里**——这一条是**实测抓出来的**：`{ let y = 2; }` 这条块语句，
第一趟问 `IsObjectAt` 时括号的父亲还是 `Root`、`IsStatementStart` 给 `true`（判断正确 ✓），
可 `StatementReorganization` 排在很后面，它把这对方括号收进一个 `Statement` 之后，
**同一个问题会被再问一次**（重组是「每条规则扫一遍所有下标」，后面的规则造出新单元又会引起来回扫），
这一回父亲成了 `Statement`；它不在白名单里，`IsStatementStart` 于是给 `false`，
那个 `{` 就被 `JsonObjectReorganization` 抢走收成了对象 ✗（调试输出：
`index=0 IsStatementStart=true parent=Root` 紧跟着 `index=0 IsStatementStart=false parent=Statement`）。

加上 `Statement` 之后两条都对：块保持 `Bracket` ✓，
`let o = { a: 1 }` 里那个 `{` 的前一个实义单元是 `=`（符号、不是 `;`）→ 仍是对象 ✓。

# method IsTypeModifier:(item:Token | null)=>bool

这个标识符是不是**只可能出现在类型位**的修饰词。

值位没有对应写法（`new` 在值位是构造调用，但那是 `new X(...)` 的形态，
这里的用法是 `new (…) => R` 那种类型位构造签名）。`readonly` / `keyof` 严格说不是保留字，
所以「见到就算类型位」只在**它自己前面也是类型位**时才成立——见 `IsTypeBracketPosition`。

**`Keyword` 也要认**（第 66 轮补）：`readonly` / `keyof` / `typeof` / `infer` / `unique` / `asserts` / `new` / `abstract`
全都在 `parse-pipeline.xl.md` 的关键字表里，所以同一个词在不同时刻可能是 `Identifier`、也可能已经被
`KeywordReorganization` 升级成 `Keyword`。只认 `Identifier` 的那一版实测漏判：
`type A = readonly (B | undefined)[]` 里的括号类型问到时 `readonly` 已经是 `Keyword`，
判定当场给否，括号里的联合于是不成形（`IsTypeBracketPosition` 与 `DecideBracketContext` 两条路都受影响）。

两种单元的文本取法不同（`Identifier.TempToString()` / `Keyword.Value`），所以这里分开取。

```ts
let text = "";
if (item instanceof Identifier) {
  text = item.TempToString();
} else if (item !== null && item.constructor.name === "Keyword") {
  text = (item as any).Value;
} else {
  return false;
}
return (
  text === "readonly" ||
  text === "keyof" ||
  text === "infer" ||
  text === "unique" ||
  text === "asserts" ||
  text === "typeof" ||
  text === "new" ||
  text === "abstract"
);
```

# method IsTypeAliasAssignment:(units:Array<Token>, from:number)=>bool

从 `from` 往左走，判断这个 `=` 是**类型别名的等号**（左边有 `type`）还是**变量声明的等号**
（左边有 `let` / `var` / `const`）。

软换行与已经收好的 `GenericType` 透明跳过；遇到别的单元就判否（保守）。
用来回答「`=` 右边是类型还是值」——`(A | B)[]` / `A<B>` 这些写法在两种地方都出现。

```ts
for (let i = from; i >= 0; i--) {
  const item = Get(units, i);
  if (item === null) {
    return false;
  }
  if (item instanceof LineWrap || item.constructor.name === "GenericType") {
    continue;
  }
  if (item instanceof Identifier) {
    const name = item.TempToString();
    if (name === "type") {
      return true;
    }
    if (name === "let" || name === "var" || name === "const") {
      return false;
    }
    continue;
  }
  return false;
}
return false;
```

# method IsTypeBracketPosition:(owner:Token, unit:Token)=>bool

`unit`（括号，或模板字面量那种**内容先重组、父单元还没挂上**的单元）**在它自己那一层**
是不是类型位：看它前面那个实义单元。

- `:` / `?:` / `|` / `&` / `=>` / `<` / `,` / `(` ⇒ 类型位（类型标注、联合 / 交叉的一项、
  函数类型的返回段、类型实参、参数表）；
- 类型位修饰词（`readonly` / `keyof` / …）⇒ 还要**再看它前面一格**：
  `readonly (A | B)[]` 是类型位，而值位可以有个叫 `readonly` 的函数（`readonly (a | b)` 是一次调用），
  所以修饰词自己前面必须是 `:` / `?:` / `<` / `,` / `|` / `&` / `(`，或者 `=` 而更左边是 `type`；
- `=` ⇒ 再往左找 `type`（类型别名右值）还是 `let` / `var` / `const`（值）；
- 别的（名字、方法、列表开头、另一个括号）⇒ 值位。

**为什么需要它**：括号的内容是在**括号关闭那一刻**重组的，那时外层的
`Statement` / `TypeDefine` 还没成形，「往上找类型容器」这条路是断的——只能看括号前文
（实测插桩：`let x: (A | B) & C` 里那个 `|` 被问到时 `parent=Bracket grand=Root`）。
两处调用方：`type-union.xl.md` 的 `IsTypeContext`（括号类型里的联合 / 交叉）
与 `generic-type.xl.md` 的 `IsTypePosition`（括号类型里的 `A<B>`——
`(TransformerFactory<SourceFile> | CustomTransformerFactory)[]` 里的 `<` 不认的话，
整个类型退化成散单元，那个联合也跟着没了）。

```ts
const at = owner.Data.indexOf(unit);
if (at <= 0) {
  return false;
}
const before = Get(owner.Data, SkipPreviousWrapSymbol(owner.Data, at));
if (IsTypeModifier(before)) {
  const modifierIndex = SkipPreviousWrapSymbol(owner.Data, at);
  const beforeModifierIndex = SkipPreviousWrapSymbol(owner.Data, modifierIndex);
  const beforeModifier = Get(owner.Data, beforeModifierIndex);
  if (beforeModifier instanceof SymbolToken) {
    const modifierText = beforeModifier.TempToString();
    if (
      modifierText === ":" ||
      modifierText === "?:" ||
      modifierText === "<" ||
      modifierText === "," ||
      modifierText === "|" ||
      modifierText === "&" ||
      modifierText === "("
    ) {
      return true;
    }
    if (modifierText === "=") {
      return IsTypeAliasAssignment(owner.Data, beforeModifierIndex - 1);
    }
  }
  return false;
}
if (before !== null && (before instanceof Identifier || before.constructor.name === "Keyword")) {
  // **引出类型的词后面一定是类型**（第 66 轮补）：`as` / `satisfies` / `is` / `extends` 右边
  // 在 TypeScript 里只能是类型，所以「紧跟在它后面的括号 / 模板字面量」处在类型位。
  // 少了这一条，映射类型的键重映射子句 `` type M = { [K in T as `get${K & string}`]: 1 } ``
  // 里的插值段被判成值位，`K & string` 不成形（实测 `@types/node/util.d.ts` 与两条用例）。
  //
  // **只加这四个词**：`readonly` / `keyof` / `typeof` / `infer` / `unique` 这些修饰词
  // 由上面的 `IsTypeModifier` 那一支管（它们还要看**自己前面**是不是类型位——
  // 值位可以有个叫 `readonly` 的函数），直接放行会把 `readonly (a | b)` 这种调用判成类型。
  const word = WordText(before);
  if (word === "as" || word === "satisfies" || word === "is" || word === "extends") {
    return true;
  }
  return false;
}
if (!(before instanceof SymbolToken)) {
  return false;
}
const text = before.TempToString();
if (
  text === ":" ||
  text === "?:" ||
  text === "|" ||
  text === "&" ||
  text === "=>" ||
  text === "<" ||
  text === "," ||
  text === "("
) {
  return true;
}
if (text !== "=") {
  return false;
}
return IsTypeAliasAssignment(owner.Data, at - 2);
```

**修饰词那一支曾经差一格**（第 66 轮修）：`IsTypeAliasAssignment(units, from)` 的约定是
「从 `from` 往左找」，所以传进去的必须是 **`=` 左边那一格**；原来写的是 `modifierIndex - 1`，
而那正是 `=` 自己的下标——`IsTypeAliasAssignment` 扫到的第一个单元就是 `=`（符号），
当场 `return false`，于是 `type A = readonly (B | undefined)[]` 里那个括号永远判不出类型位。
现在先取 `beforeModifierIndex`（`=` 自己的下标）再传 `beforeModifierIndex - 1`，
与文件末尾那一支（`at - 2`）是同一个约定。

# method WordText:(item:Token)=>string

取一个**词**单元的文本：`Identifier` 走 `TempToString()`，`Keyword` 走它自己的 `Value`。

两种单元的文本入口不一样（`Keyword` 是 `IndependentToken` 的子类、没有 `TempToString`），
而「同一个词在不同时刻可能是这两种之一」——`KeywordReorganization` 什么时候跑过它，
取决于它在哪张队列里。所以凡是按文本认词的地方都要走这一个入口。

```ts
if (item instanceof Identifier) {
  return item.TempToString();
}
return (item as any).Value ?? "";
```

# method IsTypeIntroducerWord:(item:Token | null)=>bool

**引出类型**的词：它们后面跟的是一个**类型**，而它们自己**不是**被操作的类型。

- `extends`：条件类型的约束（`T extends [infer A, infer B] ? …`）、泛型约束；
- `is`：类型谓词（`x is [A, B]`）；
- `as` / `satisfies`：类型运算（`x as [A, B]`）；
- `in`：映射类型的标记（`{ [K in [A, B]]: X }`）；
- 各种声明头（`type` / `interface` / `class` … 后面那个 `[` 是成员名或计算属性名）。

少了这一条实测会凭空多出节点：`T extends [infer A, infer B] ? [B, A] : never` 里
`extends` 被当成被操作的类型，产物是 `<IndexedAccessType><Keyword>extends</Keyword>…`——
`cases:align` 的「产物有标签、源码没构造」当场多出一类（第 66 轮）。

`readonly` / `keyof` / `typeof` / `infer` / `unique` / `asserts` / `new` / `abstract` 不在这个名单里，
它们由 `IsTypeModifier` 挡；两处判据合起来才是「不能当操作数的词」。

```ts
if (item === null) {
  return false;
}
if (item instanceof Identifier === false && item.constructor.name !== "Keyword") {
  return false;
}
const text = WordText(item);
return (
  text === "extends" ||
  text === "is" ||
  text === "as" ||
  text === "satisfies" ||
  text === "in" ||
  text === "of" ||
  text === "type" ||
  text === "declare" ||
  text === "export" ||
  text === "import" ||
  text === "default" ||
  text === "interface" ||
  text === "class" ||
  text === "enum" ||
  text === "namespace" ||
  text === "module" ||
  text === "const" ||
  text === "let" ||
  text === "var" ||
  text === "function" ||
  text === "return" ||
  text === "case" ||
  text === "implements" ||
  text === "instanceof"
);
```

# method IsTypeOperandUnit:(item:Token | null)=>bool

能不能当**类型运算的操作数**（数组化的元素、下标访问的被操作者、类型运算符后面的类型）。

符号一律不算（`=` / `:` / `|` / `&` / `(` … 都划边界），类型修饰词与引出类型的词也不算。
软换行不算内容、也不划边界。

**三处调用方共用这一个答案**：`type-bracket.xl.md`（方括号的三种类型构造）与
`type-operator.xl.md`（`keyof` / `typeof` / `readonly` / `unique`）——
各写一份近似就会出现「一边认、另一边不认」的错位（`type-union.xl.md` 里那条
「`Previous` 与 `Process` 共用一份 `FindExtendsIndex`」记过同一个教训）。

```ts
if (item === null) {
  return false;
}
if (item instanceof LineWrap) {
  return false;
}
if (item instanceof SymbolToken) {
  return false;
}
if (IsTypeModifier(item) || IsTypeIntroducerWord(item)) {
  return false;
}
return true;
```

# method IsMappedKeyBracket:(unit:Token)=>bool

`unit` 是不是**映射类型的键括号**（`{ [K in T]: X }` 里那个 `[K in T]`）。

判据是「里面有一个 `in` 标记」——与 `type-literal/type-literal.xl.md` 的 `IsMappedTypeBrace`
同一族（映射类型的键**一定**写成 `[K in T]`）。三种形态都要认：`in` 还是 `Identifier`、
已经升成 `Keyword`、已经被折成 `BinaryOperator(op="in")`（`[K in keyof T]` 就是最后一种）。

**为什么需要它**（第 66 轮）：映射类型的键括号会被 `JsonArrayReorganization` 收成 `ArrayLiteral`，
于是**键里嵌套的类型**（`[K in keyof any[]]` 里的 `any[]`、`[L in keyof T["options"]]` 里的
`T["options"]`）的父亲就是这个 `ArrayLiteral`。要让那些嵌套类型成形，就得让 `ArrayLiteral`
被认成类型容器——可值位的数组字面量绝不能认（`new Foo(["**"])` 的 `"**"` 会被包成字面量类型）。

一开始用 `ArrayLiteral.Context === "type"` 区分，**实测不可靠**：`DecideBracketContext` 的
「往左看」在值位也会被误答成类型位（字段初始化式 `public static readonly X: T = new Foo([…])`
里，`[` 往前扫会跨过 `=` 撞上标注的 `:` —— 实测 `cases:align` 27 处误包）。
改成看**内容里有没有 `in`**：与「这个括号是不是映射类型的键」是同一件事，时序无关 ✓。

```ts
const isBracket = unit instanceof Bracket && unit.startBracket === "[";
if (isBracket === false && unit.constructor.name !== "ArrayLiteral") {
  return false;
}
for (const item of unit.Data) {
  const name = item.constructor.name;
  if (item instanceof Identifier && item.Is("in")) {
    return true;
  }
  if (name === "Keyword" && (item as any).Value === "in") {
    return true;
  }
  if (name === "BinaryOperator" && (item as any).op === "in") {
    return true;
  }
  for (const sub of item.Data) {
    if (sub.constructor.name === "Keyword" && (sub as any).Value === "in") {
      return true;
    }
    if (sub.constructor.name === "BinaryOperator" && (sub as any).op === "in") {
      return true;
    }
  }
}
return false;
```

# method IsTypeContainerUnit:(parent:Token | null)=>bool

父单元是不是一个**只会装类型文本**的容器。

类型位的 `[` 与值位的 `[` 形状完全一样（`T[]` 与 `a[i]`、`[A, B]` 与 `[1, 2]`），
`keyof T` 与值位的 `typeof x` 也一样，区别只在**容器**。所以类型层那几条规则
（方括号、类型运算符）唯一的上下文判据就是这一条——它是**时序无关**的
（问的是「我的父亲是哪一类节点」，不是「祖先里有没有类型节点」，
后者在规则被询问时树还不是最终的树，`DecideBracketContext` 那一节记过三次失败的尝试）。

名单里刻意**没有** `Statement` / `Root` / `ObjectLiteral` / `BinaryOperator` / `UnaryOperator` /
`ClassBody` / `Field` / `Export` / `Foreach`：这些位置上的括号与 `typeof` 都是**值位**的
（`{ a: b[0] }` 的 `b[0]`、复合赋值展开出来的克隆体 `a[b]`、`let v = typeof x`）。
把值表达式判成类型会把它们当场拆坏——差分账上表现为整片 `真多`。

`TypeDefine` 是覆盖面最广的那个：每个类型标注、形参类型、字段类型、返回类型都会先被
`TypeDefineReorganization` 收成一个 `TypeDefine`（它挂的是类型队列，两条规则都在队列里）。

用**类名**判定而非 `instanceof`：`text-common-util` 属于底层，import 那些 token 会绕出环
（与 `IsStatementList` 同一个理由）。

**`TypeParameter` 是第 66 轮补的**：映射类型的键收成 `TypeParameter` 之后
（见 `tokens/type-parameter.xl.md`），键里的**约束**也在它里面——
`{ [K in keyof any[]]: 1 }` 的 `keyof` 与 `any[]`、`{ [K in keyof T]: "a" }` 的字面量
都靠这一条才成形。少了它，那几类节点整片消失（实测 `TypeOperator` +22、`ArrayType` +3、
`IndexedAccessType` +3、`LiteralType` +6——`cases:align` 当场报出来）。

**`ArrayLiteral` 是有条件的一个**：它必须是**映射类型的键括号**（`IsMappedKeyBracket`，
内容里有 `in`）时，里面的内容才是类型文本：

    { [K in keyof any[]]?: boolean }            // 外层 [ ] 是映射类型的键，内核是 any[]

外层那个 `[` 先被 `JsonArrayReorganization` 收成 `ArrayLiteral`，于是内核 `any[]` 的父亲是它。
不加这一条，`keyof any[]` 里的数组类型永远不成形（真实语料 `lib.es2015.symbol.wellknown.d.ts` 2 处）。
**值位的 `ArrayLiteral` 不算**：`const a = [b[0]]` / `new Foo(["**"])` 里那些内容是值，
放进来会把下标访问折成 `IndexedAccessType`、把字符串包成 `LiteralType`
（第 66 轮实测 27 处）。

**`Bracket` 那一支（第 67 轮补）是「括号类型的内容」**：`(keyof T)` / `([A, B])` / `(C["k"])` /
`("a")` / `(infer U)` / `(typeof x)` 这些写在**圆括号类型**里的写法，第 66 轮之前全都散着不成形
（真实语料里就有：`lib.es2015.collection.d.ts` 的 `readonly (readonly [K, V])[] | null` 里，
内层那对括号里的 `readonly` 与 `[K, V]` 一个节点都没有）。

根因是**时序**：括号的内容在**括号关闭那一刻**就重组完了，那一刻它的父单元还是语句列表
（实测插桩：`type D<T> = T extends (infer U)[] ? …` 里 `infer` 被问到时是 `parent=Bracket grand=Root`），
而括号**被认成类型**这件事发生在**之后**（`ParenthesizedTypeReorganization` 在它前面那一格
看到 `:` / `=` → `type` 时才接手）。所以判据只能是**事后信号**：括号的父单元变成了
`ParenthesizedType`，就说明它是括号类型。`ParenthesizedTypeReorganization.Process` 因此在换父之后
**重跑一遍括号自己的队列**，这一条负责放行那一趟；括号**关闭时那一趟**照旧判否（那一趟本来也判不出来）。

**为什么不用 `IsTypeBracketPosition`（试过，退回来了）**：那个判据把 `,` 与 `(`
也算类型位信号——类型实参表与形参表需要它们。可值位实参里的 `,` 与 `(` 一模一样：
`f(a, ([x]))`、多行调用的 `bar,` 换行 `[1, 2],` 会被判成类型位，数组字面量当场变成元组
（第 67 轮实测）。而「父单元是 `ParenthesizedType`」这个信号**只在括号真的被认成类型时**才出现，
值位一个字都不会命中。

```ts
if (parent === null) {
  return false;
}
const name = parent.constructor.name;
if (name === "Bracket") {
  // **括号类型的内容**：`(keyof T)` / `([A, B])` / `(infer U)` 里的那些类型文本。
  //
  // 括号的内容是在**括号关闭那一刻**重组的，那一刻括号的父单元还是语句列表
  // （实测插桩：`type D<T> = T extends (infer U)[] ? …` 里 `infer` 被问到时
  // `parent=Bracket grand=Root`），所以「括号自己那一格是不是类型位」这一刻问不出来。
  // 真正可靠的信号是**事后**：括号被 `parenthesized-type.xl.md` 收成 `ParenthesizedType`
  // 之后，它的父亲就是 `ParenthesizedType`——那是「这个括号是括号类型」的确定结论。
  // `ParenthesizedTypeReorganization.Process` 因此会在换父之后**重跑一遍括号自己的队列**，
  // 这一条就是那一趟的入口。
  //
  // **不能写成「括号自己那一格按前文判」**（`IsTypeBracketPosition`）：那个判据把 `,` 与
  // `(` 也算类型位信号（类型实参表 / 形参表需要它们），于是值位实参里的
  // `f(a, ([x]))` / 多行调用的 `[1, 2],` 会被判成类型位，数组字面量当场变成元组
  // （第 67 轮实测：那是我退回来的第一版）。
  return parent.Parent !== null && parent.Parent.constructor.name === "ParenthesizedType";
}
if (name === "ArrayLiteral") {
  if (IsMappedKeyBracket(parent)) {
    return true;
  }
  return parent.Parent !== null && parent.Parent.constructor.name === "MappedType";
}
if (name === "InterpolationString") {
  // **模板字面量类型**：插值段的内容是类型文本，判据见 IsTemplateTypeContent
  // （它问的是外层那个 `String` 在它自己那一格前面是什么）。
  return IsTemplateTypeContent(parent);
}
return (
  name === "TypeDefine" ||
  name === "TypeAssign" ||
  name === "ReturnType" ||
  name === "GenericType" ||
  name === "UnionType" ||
  name === "IntersectionType" ||
  name === "FunctionType" ||
  name === "ConditionalType" ||
  name === "As" ||
  name === "Satisfies" ||
  name === "MappedType" ||
  name === "TypeLiteralBody" ||
  name === "InterfaceBody" ||
  name === "ArrayType" ||
  name === "TupleType" ||
  name === "IndexedAccessType" ||
  name === "TypeOperator" ||
  name === "TypeParameter" ||
  name === "TypeQuery"
);
```

# method IsTypeMemberStart:(unit:Token)=>bool

`unit` 是不是**成员列表里一个成员的开头**（而不是某个类型的中间）。

成员位与类型位同形：索引签名 `[key: string]: T`、映射类型 `[K in T]: X`、
类里的计算属性名 `[Symbol.iterator]()`、成员修饰词 `readonly a: T`——
它们的开头都长着类型位的样子。判据是「左边只剩修饰词 / 成员分隔符」：

- `{ a: [A, B] }` 里 `[` 左边是 `:` ⇒ **不是**成员开头（是属性类型 ✓）；
- `{ readonly [K in T]: X }` 里 `[` 左边只有修饰词 ⇒ 是成员开头（不动它 ✓）；
- `{ a: 1; [k: string]: T }` 里 `[` 左边先遇到 `;` ⇒ 是成员开头 ✓；
- `interface I { readonly a: T }` 里的 `readonly` 是成员开头（是修饰词，不是类型运算符 ✓）。

成员列表按类名认（`{` 括号 / `InterfaceBody` / `TypeLiteralBody` / `ClassBody` / `MappedType` /
`ObjectLiteral`）；别的父亲一律不是成员列表。`-readonly` / `+readonly` / `?` 这些映射类型修饰
已经成了单元时，按 `UnaryOperator` 或符号跳过。

```ts
const parent = unit.Parent;
if (parent === null) {
  return false;
}
const name = parent.constructor.name;
const braceParent = parent instanceof Bracket && parent.startBracket === "{";
const memberList =
  braceParent ||
  name === "InterfaceBody" ||
  name === "TypeLiteralBody" ||
  name === "ClassBody" ||
  name === "MappedType" ||
  name === "ObjectLiteral";
if (memberList === false) {
  return false;
}
const at = parent.Data.indexOf(unit);
if (at < 0) {
  return false;
}
for (let i = at - 1; i >= 0; i--) {
  const item = Get(parent.Data, i);
  if (item === null || item instanceof LineWrap) {
    continue;
  }
  if (item instanceof SymbolToken) {
    const text = item.TempToString();
    if (text === ";" || text === ",") {
      return true;
    }
    if (text === "+" || text === "-" || text === "?") {
      continue;
    }
    return false;
  }
  if (IsTypeModifier(item) || item.constructor.name === "UnaryOperator") {
    continue;
  }
  return false;
}
return true;
```

# method IsEmptyContentUnit:(unit:Token)=>bool

被包装的那个单元里**没有实义内容**（只有软换行，或者本来就是空的）。

`T[]` 的 `[]` 与 `[A, B]` 的区别就在这一条：
**空的**且左边有操作数时是数组类型（`Dirent<X>[]`），**非空的**是元组类型或下标访问，
**空的但左边没有操作数**时是**空元组**（`[]`——它自己就是一个元组类型，见 `type-bracket.xl.md`）。

```ts
for (const item of unit.Data) {
  if (!(item instanceof LineWrap)) {
    return false;
  }
}
return true;
```

# method IsTemplateTypeContent:(parent:Token | null)=>bool

`parent` 是一个**模板字面量插值段**（`InterpolationString`）时，它里面的内容是不是**类型文本**。

**为什么需要它**：模板字面量类型（`` type X = `a${"x" | "y"}b` ``）的插值段内容
是在**字符串收尾之前**重组的（见 `string/interpolation-string.xl.md`），
那一刻它往上找不到类型容器——可它的**外面那层 `String` 已经在父列表里了**，
所以「这个 `String` 在它自己那一格前面是什么」问得出来（与括号、与
`type-union.xl.md` 的 `IsTypeParen` 是同一个问法）：

- `` type X = `a${"x" | "y"}b` ``：`String` 前面是 `=`，再往左是 `type` ⇒ **类型位** ✓；
- `` const v = `${a | b}` ``：再往左是 `const` ⇒ **值位** ✓（值位的 `${a | b}` 不许变成联合，
  这是第 62 轮明确记下的取舍）。

少了这一条，模板字面量类型里的联合 / 交叉永远不成形（`cases:align` 一直挂着
`UnionType` 1 处 / `IntersectionType` 2 处）。

```ts
if (parent === null || parent.constructor.name !== "InterpolationString") {
  return false;
}
const stringUnit = parent.Parent;
if (stringUnit === null || stringUnit.Parent === null) {
  return false;
}
return IsTypeBracketPosition(stringUnit.Parent, stringUnit);
```

# method IsOwnContentRange:(units:Array<Token>, startIndex:int, endIndex:int)=>bool

`[startIndex, endIndex]` 这一段是不是**父节点内容的全部分**（两端只剩软换行）。

递归守卫：方括号与类型运算符那两条规则都挂在**类型队列**上，而队列里有它们自己——
新节点造出来之后，它们的那一趟会在同一段上**再看到同一个方括号 / 同一个 `keyof`**。
不挡就是无限递归（`type X = T[]` 实测会一路套到爆栈）。

判据与 `type-union.xl.md` 里那条同一个思路：**这一段覆盖了整个父亲就不许再包**。
`[[A], B]` 里的内层元组只覆盖父亲的一格、`keyof keyof T` 里的内层只覆盖两格，
都不属于这一条，照常成形 ✓。

```ts
for (let i = 0; i < startIndex; i++) {
  if (!(Get(units, i) instanceof LineWrap)) {
    return false;
  }
}
for (let i = endIndex + 1; i < units.length; i++) {
  if (!(Get(units, i) instanceof LineWrap)) {
    return false;
  }
}
return true;
```
