# dependencies
```xl
import { Token } from "../../core/syntax/token.xl.md"
import { Get, GetSkipNext, GetSkipPrevious, SkipNext, SkipPrevious } from "../../core/extensions/list-extension.xl.md"
import { Bracket } from "./tokens/bracket.xl.md"
import { Common } from "./tokens/common.xl.md"
import { Document } from "../../core/syntax/document.xl.md"
import { String } from "./tokens/string/string.xl.md"
import { Symbol } from "./tokens/symbol.xl.md"
import { WrapSymbol } from "./tokens/wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

文本层专用工具：一组模块级函数，作用于 `Token` / `Array<Token>`。

扩展方法落成**模块级 `# method`**，ts 侧就是模块级函数：
调用形式是 `SkipPreviousWrapSymbol(units, i)`，列表本身作为第一个参数。

这一组函数全是「跳过 `WrapSymbol`」的变体——软换行在语法结构里不该挡住相邻单元的判断，
所以「上一个 / 下一个**实义**单元」的查找必须跨过它们。

原先这里还有一个 `InitialStatementReorganizationQueue`（给单元装报废语句用的重组队列）。
它读的是 `ReorganizationTemplate.DefaultValue`，也就是**通用重组队列**，属于解析优先级契约的一部分，
已经搬到 `./parse-pipeline.xl.md`，与 `GeneralReorganize` 放在一起。

# method SkipNextWrapSymbol:(units:Array<Token>, index:number)=>int

从 `index + 1` 起向后跳过所有 `WrapSymbol`，返回第一个非 `WrapSymbol` 的下标。

转调 `SkipNext` 并固定判定器为 `item is WrapSymbol`。

```ts
return SkipNext(units, index, (item) => item instanceof WrapSymbol);
```

# method SkipPreviousWrapSymbol:(units:Array<Token>, index:number)=>int

从 `index - 1` 起向前跳过所有 `WrapSymbol`，返回第一个非 `WrapSymbol` 的下标；一路跳到底返回 `-1`。

```ts
return SkipPrevious(units, index, (item) => item instanceof WrapSymbol);
```

# method GetSkipNextWrapSymbol:(units:Array<Token>, index:number)=>Token | null

`SkipNextWrapSymbol` 之后再取值；越界给 `null`。

```ts
return GetSkipNext(units, index, (item) => item instanceof WrapSymbol);
```

# method GetSkipPreviousWrapSymbol:(units:Array<Token>, index:number)=>Token | null

`SkipPreviousWrapSymbol` 之后再取值；越界给 `null`。

```ts
return GetSkipPrevious(units, index, (item) => item instanceof WrapSymbol);
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
所以 `.5` 会被切成 `<Symbol>.</Symbol><Common>5</Common>`——
数字字面量被拆成两半（探索性差分实测 49 处组合上下文）。
`Common` 那边还要认它一次（同一个判据），因为 `=` 后面直接跟 `.5` 时没有可续写的 `Common`，
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

**为什么要它（方案 A）**：原来这件事是**事后**做的 —— `TypeLiteralReorganization` / `BinaryOperatorReorganization` /
`SpreadReorganization` 各自在自己的位次上「往上找祖先」或「往前扫同层单元」来猜。
可是**规则被询问的时刻，树还不是最终的树**：实测同一个 `[` 在早期询问时 `Parent` 还指着 `Root`
（`JsonArray < Root`），而最终树里是 `TypeAssign < Statement < Root` —— 祖先判据因此天然时序相关
（第 32、34 轮连试三版都失败）。

**改成在开括号那一刻判**：那时前文（同层的 `Common` / `Symbol`）**全都就位**，判定结果记在括号的
`Context` 字段上，之后**不随时序变化** ✓。

**前文可能不在宿主自己的 `Data` 里**：`type M<T> = { [K in keyof T]: T[K] }` 里那个 `[` 是在外层 `{`
这个括号单元里开的，它自己的 `Data` 还是空的 —— 要看的是**外层 `{` 之前**那几个词。所以本方法会
**往上爬**：`Data` 里扫不到信号就爬到父单元，从「自己所在的位置」继续往前扫。

**爬在这里是安全的**（而「往上找祖先」那类判据不安全）：词法阶段单元是**自上而下**挂上去的，
父指针在被处理之前就已设好；而且这里爬上去**只读那些平铺的前文词**，不做任何「这是不是类型节点」
的分类 —— 后者才是随重组时序变化的。

判定按「最近的一个信号」下结论：

- 前一个是 `:` / `?:` → 类型位（**三元表达式的 `:` 除外**：它前面隔着 `?`）；
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
let node:Token | null = host;
let units:Array<Token> = node.Data;
let index:number = units.length;
for (let hop = 0; hop < 4 && node !== null; hop++) {
  let i = index - 1;
  while (i >= 0) {
    const item = Get(units, i);
    if (item instanceof WrapSymbol) {
      i = i - 1;
      continue;
    }
    if (item instanceof Bracket) {
      if (item.Closed) {
        return "value";
      }
      i = i - 1;
      continue;
    }
    if (item instanceof Symbol) {
      const text = item.TempToString();
      if (text === ":" || text === "?:") {
        const beforeColon = GetSkipPrevious(units, i, (x) => x instanceof WrapSymbol);
        const isTernary = beforeColon instanceof Symbol && beforeColon.Is("?");
        return isTernary ? "value" : "type";
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
    if (item instanceof Common) {
      const text = item.TempToString();
      if (text === "type") {
        const beforeType = GetSkipPrevious(units, i, (x) => x instanceof WrapSymbol);
        const afterType = GetSkipNext(units, i, (x) => x instanceof WrapSymbol);
        if (
          beforeType instanceof Common &&
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
}
return "value";
```
# method IsStatementStart:(units:Array<Token>, index:number)=>bool

`index` 处的单元是不是**一条语句的第一个实义单元**。

判据只看「前一个实义单元是什么」，不需要认识任何语句类：

- 前面没有实义单元 → 是（列表开头就是一条语句的开头）；
- 前面是 `;` 符号 → 是；
- 前面是 `Common` → **不是**——`let x: T` 里 `x` 前面是 `let`，
  `a ? b : c` 里 `b` 前面是 `?` 的另一侧，它们都在同一条语句内部；
- 其余（已经成形的语句单元、括号、其它 token）→ 是。

**它区分的是「标签」与「类型标注」这对同形写法**：`outer: { … }`（标签 + 块）
与 `let x: T`（声明 + 类型标注）在词法上都是「名字 + 冒号」，区别只在前者处在语句开头。
`LabelReorganization` 与 `JsonObjectReorganization` 都靠它：
前者只认语句开头的「名字 + 冒号」，后者靠它把语句位置的 `{` 判成**块**而不是对象字面量。

**三条件**：父单元必须是**语句列表**（根、各种语句体、块括号），处在一对非 `{` 的括号里或泛型实参段里一律不是；
前一个实义单元不能是 `Common` 或 `String`（`let x: T` 里 `x` 前面是 `let`，`declare module "x" {` 的 `{` 前面是 `"x"`）；
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
      if (parent.StartBracketChar !== "{") {
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
const previous = GetSkipPrevious(units, index, (item) => item instanceof WrapSymbol);
if (previous === null) {
  return true;
}
if (previous instanceof Common || previous instanceof String) {
  return false;
}
if (previous instanceof Bracket) {
  return previous.StartBracketChar === "}";
}
if (previous instanceof Symbol) {
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
