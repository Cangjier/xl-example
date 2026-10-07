# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Branch } from "../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../core/syntax/branch-condition-result.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Keyword } from "./keyword.xl.md"
import { ArrayLiteral } from "./json/array-literal.xl.md"
import { ObjectLiteral } from "./json/object-literal.xl.md"
import { Statement } from "./statement.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`let` / `const` / `var` 声明：把 `let a = 1`、`let [a, b] = arr`、`let {a, b} = obj` 这类整段收成一个 `Let`，并记下被声明的字段名（前面若有 `export`，一并收进来）。

三种形态由同文件的枚举 `LetType` 区分；它只是数据标签，不参与 XML 的标签名。

**声明头在解析期就收**（`LetBranch` ✓，见本文件最后一节 ✓）——
从前还有一个 `LetCloseRule`，它排在 `GeneralCloseRule` 队列第 6 位、又被 `RunCloseRules` 显式跳过 ✗
⇒ 一次都没跑过 ✓（第 564 轮量的账：语料里 `Previous` 调用 **0** 次 ✓）⇒ 整段删掉 ✓。

# enum LetType

`Let` 声明出来的是哪一种东西。它与 `Let` 写在同一个文件里。

- case Field
单个具名变量：`let a = 1`。
- case Array
数组解构：`let [a, b] = arr`。
- case Object
对象解构：`let {a, b} = obj`。

# class Let extends IndependentToken
一条 `let` / `const` / `var` 声明。

单元值类型是单字符的 `string`。

它覆写了 `ToXmlString`，而且**三种形态的 XML 完全不同**——标签名后的属性名随 `LetType` 走，都是自闭合标签。

## method PrintAst:(ctx:any, v:any)=>any

`let` / `const` / `var` 声明 → **TS 的三层**（**从 `ts-ast.xl.md` 的 `projectLet` 整块搬来**，
第 197 轮）。

两个坐标细节（都是实测出来的）：

- `VariableDeclaration`（声明本身）从**名字**开始，不含前面的 `let `/`const `——
  TS 的 `getStart()` 跳过前导 trivia，而本工程的 `Let` 把修饰词包在区间里；
- `VariableDeclarationList` / `VariableStatement`（两层壳）从 `let` 那个词开始。

**`fieldName` / `modifiers` 在本单元的子单元上，不在外层 `Statement` 上**（踩过）：
顶层形态是 `Statement > [Let(const f), SymbolToken(=), 初始化式]`，
而 `Let` 自己的区间只盖到 `const f` 为止、初始化式是它的**平级兄弟**。
早先直接读外层容器的属性，于是 `fieldName` 永远是空——`VariableDeclaration`
的起点一直退到 `const`（实测 505 处对不上），而 `List` 那一层看不出来。

实现在共享层的 `projectLetFrom`（列表版与语句版**共用一份**：`for` / `foreach` 的头部
要的就是它的 `.list`），这里只取 `.statement`。

```ts
  return ctx.LetFrom(ctx.Kids(v), v).statement;
```

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**。

**为什么 `Let` 也需要队列**（第 66 轮第八批）：解构模式现在作为子单元留在 `Let` 里
（见 `Process`），模式里的元素要在**它自己的那一趟**里被 `binding-element.xl.md` 收成
`<BindingElement>` —— 原来 `Let` 没有队列，`TryToClose` 跑的是空队列，
模式元素永远收不出来（实测：`const { a, b: c } = x` 的产物里模式是一串散单元）。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## field LetType:LetType = LetType.Field

本声明属于哪一种形态，默认 `Field`。

## field fieldName:string = ""

`Field` 形态下被声明的字段名。

## field NameStart:int = -1

`Field` 形态下名字在源码里的起点（闭区间下标）；解构形态、或者名字那一格不是普通标识符时是 `-1`。

**为什么让 token 记着**（「token 出字段、投影直读」）：投影合名字节点时只知道 `fieldName` 这个字符串，
位置要回原文 `indexOf(fieldName)` 猜——`const f = 1` 里那个 `f` 是**唯一**的同名字母还好，
`function f` 这种名字的首字母正好也是修饰词里的字母时就得靠「推过修饰词」兜。
而 `LetBranch.Success` 那一刻手里就是名字那一格（`nameUnit.SourceRange`），
记成一对字段之后投影只做一次读取（见 `print-ast-common.xl.md` 的 `synthName`）。

## field NameEnd:int = -1

名字的终点（闭区间下标），与 `NameStart` 同进退。

## field arrayPattern:Array<string> = []

`Array` 形态下解构出来的字段名。

## field objectPattern:Array<string> = []

`Object` 形态下解构出来的字段名。

## field modifiers:string = ""

修饰词串，逗号分隔、按源码顺序（`export` / `declare` / `default` 之外还包括 `const` / `let` / `var` 自己）。

同样是因为本单元是**收尾规则建出来的**：它把整段声明折成一个节点之后，
外层那一趟不会再回来收这些词，不在这里记下就彻底丢了。

## method ToXmlString:()=>string

产出 XML：自闭合标签，属性名由 `LetType` 决定，另带 `modifiers`。

三种形态各拼一个自闭合标签：属性名分别是 `fieldName` / `arrayPattern` / `objectPattern`，标签名都是运行时类型名；三种形态都带上 `modifiers`（`export declare const` 这样的修饰词串）。

`modifiers` 是**信息补全**：不记的话 `export const a = 1` 与 `const a = 1` 的产物一模一样（见 `早期的缺口台账` 的 `_notes.variable-modifiers`）。

三个 `if` 加末尾抛错，属性值用 `Array.join(",")` 拼出来。

```ts
const name = this.constructor.name;
if (this.LetType === LetType.Field) {
  return `<${name} fieldName="${this.fieldName}" modifiers="${this.modifiers}" />`;
}
// **解构模式带子单元**（第 66 轮第八批）：模式括号与里面的单元现在留在树上
// （`binding-element.xl.md` 会把每个元素收成 `<BindingElement>`），所以这两种形态
// 不再是自闭合标签——属性照旧，后面接子单元的 XML。属性里那两组名字是**信息补全**
// （给人读的递归收集结果），节点里的结构才是权威。
const children = this.Data.map((item) => item.ToXmlString()).join("");
if (this.LetType === LetType.Array) {
  return `<${name} arrayPattern="${this.arrayPattern.join(",")}" modifiers="${this.modifiers}">${children}</${name}>`;
}
if (this.LetType === LetType.Object) {
  return `<${name} objectPattern="${this.objectPattern.join(",")}" modifiers="${this.modifiers}">${children}</${name}>`;
}
throw new Error("形态不成立");
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + 由 `LetType` 决定的那个属性键 + `modifiers`，解构形态另带子单元。

**分支与 XML 那处是同一套判据**：同一个 `if` 链、同样的三个属性名、`Array<string>` 同样用
`","` 拼；末尾的 `throw new Error("形态不成立")` 也照抄一份。两份拼串各自独立，
所以「哪些形态成立」这件事必须在两处都说同一句话——漏掉一条分支不会报错，
只会让 JSON 那边少一个键（当时那把 AST JSON 尺子就是钉这一条的尺子）。

`children` 按基类同一条规则：`Data` 非空才写。`Field` 形态**没有**子单元，
所以它出来的 JSON 只有 `type` / `fieldName` / `modifiers` 三个键——与自闭合标签同一件事。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
// **名字的位置**（见 `NameStart` / `NameEnd`）：投影合名字节点时直读，
// 不再回原文 `indexOf(fieldName)` 猜。三种形态都写——解构形态给的是 `-1`。
result.set("nameStart", this.NameStart);
result.set("nameEnd", this.NameEnd);
if (this.LetType === LetType.Field) {
  result.set("fieldName", this.fieldName);
  result.set("modifiers", this.modifiers);
  return result;
}
if (this.LetType === LetType.Array) {
  result.set("arrayPattern", this.arrayPattern.join(","));
  result.set("modifiers", this.modifiers);
} else if (this.LetType === LetType.Object) {
  result.set("objectPattern", this.objectPattern.join(","));
  result.set("modifiers", this.modifiers);
} else {
  throw new Error("形态不成立");
}
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 抄 `fieldName` / `NameStart` / `NameEnd` / `modifiers` → `TryToClose()`。注意它**不抄 `LetType` 与两组解构名**（`LetType` 回到默认的 `Field`）——这是既定行为，保持一致。

```ts
const result = new Let(this.Template);
result.Sign(this);
result.fieldName = this.fieldName;
result.NameStart = this.NameStart;
result.NameEnd = this.NameEnd;
result.modifiers = this.modifiers;
result.TryToClose();
return result;
```

# class LetBranch extends Branch

**解析期的 `let` / `const` / `var` 头部**（第 471 轮，reorg 关掉之后按清单重建的第一块）。

进门条件：当前字符是头部结束的那几种之一（`=` / `:` / `;` / `,` / 软换行 ✓），
而且往回走得到「修饰词 + `let`/`const`/`var` + 名字」这个形状 ✓。

进门之后：把这一整段收成一个 `Let` ✓（`modifiers` 记 `export,declare,let` 这种 ✓，`fieldName` 记名字 ✓），
再把这**当前这一格**喂给它 ✓（与字段那一支同一套做法 ✓）。

## static readonly field JumpIn:LetBranch = new LetBranch()

## private method NameIndex:(data:Array<Token>)=>int

**声明名字那一格的下标** ✓：跳过尾部的软换行 ✓，再跳过一个**明确赋值断言** `!` ✓。

两处（`Condition` 与 `Success`）问的是同一个下标 ✗ ⇒ **只写一份** ✓ —— 各写一份就会漂 ✗
（`WordOf` 那一处就是为同一件事抽出来的 ✓，第 531 轮）。

**为什么允许那个 `!`** ✓（第 559 轮 ✓）：`let a!: number` 是 TS 的**明确赋值断言** ✓
（`VariableDeclaration` 上的 `exclamationToken` ✓），而 `LetBranch` 进门那一刻
（尾巴字符 `:` / `=` / `;` / `,` / 换行 ✓）`data` 的最后一格**正是那个 `!`** ✗
⇒ 名字那一问看到的是 `!`、不是 `a` ✓ ⇒ 整条声明不成形 ✓
（实测 `vars-definite.ts` / `decl-var-definite-assignment.ts` 各缺 4 / 多 3 ✓
——产物是 `<Statement><Keyword>let</Keyword><Identifier>a</Identifier>…` 加一条假的
`BinaryExpression` ✗）。

**只跳一格、只跳 `!`** ✓（不是「跳过所有符号」✗）：与重组那棵树**同形** ✓ ——
对照态（`DSH_XL_REORG=1`）的产物是 `Let(fieldName=a)` ＋ `!` **平级兄弟** ＋ `TypeDefine` ✓，
所以那个 `!` **留在 `Let` 右边** ✓（`Success` 的替换区间到名字那一格为止 ✓）。

```ts
let index = data.length - 1;
while (index >= 0) {
  const probe = Get(data, index);
  if (probe instanceof LineWrap) {
    index = index - 1;
    continue;
  }
  break;
}
if (index >= 1) {
  const probe = Get(data, index);
  if (probe instanceof SymbolToken && probe.Is("!")) {
    index = index - 1;
    while (index >= 0) {
      const inner = Get(data, index);
      if (inner instanceof LineWrap) {
        index = index - 1;
        continue;
      }
      break;
    }
  }
}
return index;
```

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

```ts
const result = new BranchConditionResult();
result.Success = false;
const value = source.Value;
const isTail = value === "=" || value === ":" || value === ";" || value === "," || value === "\n";
if (isTail === false) {
  return result;
}
const data = unit.Data;
// 名字是最后一个实义单元——**它右边还可能有一个明确赋值断言的 `!`** ✓（见 `NameIndex` ✓）。
const nameIndex = this.NameIndex(data);
if (nameIndex < 1) {
  return result;
}
const nameUnit = Get(data, nameIndex);
// **名字那一格可以是一对解构括号**（第 533 轮 ✓）：解构那个 `[` / `{` 在这一刻**还是 `Bracket`**
// ✓ —— `JsonArrayCloseRule` / `JsonObjectCloseRule` 会把它收成 `ArrayLiteral` /
// `ObjectLiteral` ✓，但那一趟是在**括号自己的 `TryToClose` 里**跑的 ✓，而 `LetBranch` 问这一格时
// 括号刚关完、命名还没换 ✓。判据与同文件 `LetCloseRule.Previous` 那一句
//「`Identifier`，或者 `Is("[", "]")` / `Is("{", "}")` 的 `Bracket`」**一字不差** ✓
//（第 532 轮错在**照搬了重组那一趟看到的名字** ✗ —— 那一趟看到的是 `ArrayLiteral` ✓，
//  于是 `instanceof ArrayLiteral` 永远为假 ✗，白试一轮 ✓）。
const isPatternUnit = nameUnit instanceof Bracket && (nameUnit.Is("[", "]") || nameUnit.Is("{", "}"));
if (!(nameUnit instanceof Identifier) && isPatternUnit === false) {
  return result;
}
// 关键词那一格必须是 let / const / var —— 第 531 轮起它可能**已经升成 `Keyword`** ✓
// （`StatementBranch.Success` 末尾那次 `TryToClose` ✓），所以两种身份都要认 ✓。
const keywordUnit = Get(data, nameIndex - 1);
if (!(keywordUnit instanceof Identifier) && !(keywordUnit instanceof Keyword)) {
  return result;
}
const word = this.WordOf(keywordUnit);
// **`using` 也算声明词**（第 538 轮 ✓）：显式资源管理声明 `using res = open()` 与
// `await using res = openAsync()` 在 TS 那边同样是 `VariableDeclaration` ✓
//（`VariableDeclarationList` 上带 `Using` 标志 ✓），形态与 `const` 一模一样 ✓。
// 重组那条（`LetCloseRule.Previous`）**早就认 `using`** ✓
//（`let.xl.md` 那一处写着「`using` 是显式资源管理声明……所以它该有自己的 `Let` 节点」✓），
// 解析期这一支漏了它 ✗ ⇒ `await using res = openAsync()` 整条退化成
// `Keyword(await) + Keyword(using) + Identifier(res) + = + Method` ✗
//（实测 `decl-await-using-basic.ts` 一族 **31 份**文件 ✓：缺 `VariableStatement` /
//  `VariableDeclarationList` / `VariableDeclaration` / `Identifier` ✓、多出
//  `ExpressionStatement` / `AwaitExpression` / `BinaryExpression` / `Identifier(using)` ✓）。
if (word !== "let" && word !== "const" && word !== "var" && word !== "using") {
  return result;
}
result.Success = true;
return result;
```

## method WordOf:(unit:Token)=>string

`Identifier` / `Keyword` 两种身份取文本——**一处答案** ✓（`Condition` 与 `Success` 都要用 ✓）。

两种身份的文本在**不同的字段**上 ✗：`Identifier` 是 `BlockToken` 的子类、文本在 `Temp` 数组里 ✓
（`TempToString()` ✓）；`Keyword` 是 `IndependentToken` 的子类、文本在 `Value` 上 ✓
（`keyword.xl.md` 的 `FromIdentifier` ✓），而它的 `TempToString()` 是空串 ✗ ——
第 533 轮实测：只认 `Identifier` 那一支时，**已经升成 `Keyword` 的 `const`**
会让整条 `Condition` 判否 ✓（`const [a] = …` 于是永远不成形 ✗）。

`constructor.name` 就是 XML 标签名 ✓，判它等价于判类型 ✓（与 `property-access.xl.md`
的 `IsChainBase` 同一做法 ✓）。

```ts
const view = unit as any;
if (unit.constructor.name === "Keyword") {
  return String(view.Value ?? "");
}
return String(view.TempToString === undefined ? "" : view.TempToString());
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

```ts
const data = unit.Data;
// **与 `Condition` 同一份答案** ✓（`NameIndex` ✓，第 559 轮）——它跳过尾部软换行 ✓
// 与那个明确赋值断言的 `!` ✓，所以下面 `ReplaceCountAt` 的右端就是**名字那一格** ✓，
// 那个 `!` 留在 `Let` 右边当平级兄弟 ✓（与对照态同形 ✓）。
const nameIndex = this.NameIndex(data);
const nameUnit = Get(data, nameIndex);
// **名字那一格可以是一对解构括号**（第 533 轮 ✓）：解构那个 `[` / `{` 在这一刻还是 `Bracket` ✓
//（理由见 `Condition` 那一处 ✓）。它与 `Identifier` 那一路的区别只在**怎么填 `Let`** ✓：
// 具名只记 `fieldName` ✓；解构把模式括号搬进 `Let` ✓（与重组那条
// `letUnit.AddAndCloseLast(next)` 同一做法 ✓）。
const isPatternUnit = nameUnit instanceof Bracket && (nameUnit.Is("[", "]") || nameUnit.Is("{", "}"));
if (!(nameUnit instanceof Identifier) && isPatternUnit === false) {
  throw new Error("LetBranch: 进门之后名字那一格又不成立了");
}
// 往前收修饰词与关键词（跨过软换行，但**不跨过语句边界**——与 let.xl.md 同一份口径）。
const modifiers: string[] = [];
let start = nameIndex - 1;
// **文本走 `WordOf`** ✓（第 531 轮起关键词那一格可能已经是 `Keyword` ✓，
// 它的文本在 `Value` 上而不在 `Temp` 上 ✗ —— 见那个方法自己的说明 ✓）。
const keywordUnit = Get(data, start);
if (keywordUnit instanceof Identifier || keywordUnit instanceof Keyword) {
  modifiers.unshift(this.WordOf(keywordUnit));
}
while (start > 0) {
  const previous = Get(data, start - 1);
  if (previous instanceof LineWrap) {
    start = start - 1;
    continue;
  }
  // **`await using` 的 `await` 也是修饰词**（第 538 轮 ✓）：重组那条
  // （`LetCloseRule.Process`）写着「`await using res = open()`：`await` 是显式资源管理
  // 声明的一部分，收进 modifiers 才不会留成一个悬空的关键词」✓ —— 解析期这一支漏了它 ✗
  // ⇒ `await` 留在 `Let` 外面 ✗ ⇒ 投影把它连同后面整段投成 `AwaitExpression` ✗。
  // **两种身份都要认** ✓（`await` 这时通常已经是 `Keyword` ✓，见 `Success` 开头那一句 ✓）。
  if ((previous instanceof Keyword || previous instanceof Identifier) && this.WordOf(previous) === "await") {
    modifiers.unshift("await");
    start = start - 1;
    continue;
  }
  if (previous instanceof Identifier) {
    const text = previous.TempToString();
    if (text === "export" || text === "declare" || text === "default") {
      modifiers.unshift(text);
      start = start - 1;
      continue;
    }
  }
  break;
}
const letUnit = new Let(unit.Template);
// **两种形态两套填法**（第 533 轮 ✓）：具名只记 `fieldName` ✓；
// 解构把模式括号搬进来 ✓ —— 搬进来之后 `binding-element.xl.md` 才有机会在
// **`Let` 自己那一趟**里把元素收成 `BindingElement` ✓（它的宿主判据正是「父亲是 `Let`」✓）。
if (nameUnit instanceof Identifier) {
  letUnit.fieldName = nameUnit.TempToString();
  // **名字的位置当场记进字段**（见 `NameStart`）：这一刻 `nameUnit` 自己的 `SourceRange` 就是它，
  // 投影那边不必再回原文猜（那正是「同一件事的第二份近似」）。
  const nameStart = nameUnit.SourceRange.Start;
  const nameEnd = nameUnit.SourceRange.End;
  if (nameStart !== null && nameEnd !== null) {
    letUnit.NameStart = nameStart.Index;
    letUnit.NameEnd = nameEnd.Index;
  }
} else {
  letUnit.LetType = (nameUnit.Is("{", "}") ? 2 : 1) as any;
  letUnit.AddAndCloseLast(nameUnit);
}
letUnit.modifiers = modifiers.join(",");
// **签名用的锚点要跳过前导 trivia** ✓（第 486 轮）：`start` 往回跨过 `LineWrap` 之后，
// `data[start]` 可能正好是**上一行留下的那个软换行** ✗ ⇒ `Let` 从换行起签 ✗，
// 投影出来的 `VariableStatement` / `List` 整个左移一位 ✗（实测
// `const a = 1;` 换行 `const b = 2;`：产物 `[12,25)` vs TS `[13,25)` ✗，全语料这种漂移 493 处 ✓）。
// 替换范围照旧从 `start` 起算 ✓（那个软换行跟着并进 `Let`，与重组那条的切法一致 ✓）。
let anchorIndex = start;
while (anchorIndex <= nameIndex && data[anchorIndex] instanceof LineWrap) {
  anchorIndex = anchorIndex + 1;
}
const anchor = data[anchorIndex];
if (anchor !== undefined && anchor.SourceRange.Start !== null) {
  letUnit.SignIn(anchor.SourceRange.Start);
}
// **两头都要签**（实测教训）：只签 `SignIn` 的话这个单元是个「半个坐标」✗，
// 后面任何要读坐标的地方都会抛
// `SourceRange.Start == null || SourceRange.End == null` ✗（实测 323 个文件全挂在这上面 ✗）。
const tailUnit = data[nameIndex];
if (tailUnit !== undefined && tailUnit.SourceRange.End !== null) {
  letUnit.SignOut(tailUnit.SourceRange.End);
}
// **原位替换**：截断 `Data` 会让外层派发的下标失效 ✗（实测抛「自身不在父单元的子单元里」✗），
// 对同一批单元再调 `RemoveSelf` 也一样 ✗ —— 用重组同款的 `ReplaceCountAt` ✓，
// 它把这一段换成一个 `Let` 并返回新下标 ✓，外层派发不受影响 ✓。
const nextIndex = ReplaceCountAt(data, start, nameIndex + 1 - start, letUnit);
// **把当前这一格原样补回 `Let` 的右边** ✓（第 482 轮）：进门用的那一格
// （`=` / `:` / `;` / `,`）在重组那棵树里是 `Let` 的**平级兄弟** ✓
// （`Statement > [Let, =, 1, ;]` ✓），投影侧 `projectLetFrom` 正是靠它切
// 「名字 / 初始化式 / 类型标注」✓ —— 少了它整条声明只剩一个 `Let` ✗
//（实测产物 `<Statement><Let fieldName="a"/></Statement>` ✗）。
// 建法照 `SymbolBranch.Success` ✓：新符号单元 + `AppendAndSignOut` + `SignIn` ✓。
const tailSymbol = new SymbolToken(unit.Template);
tailSymbol.AppendAndSignOut(source).SignIn(source);
// **尾巴那一格要插在明确赋值断言 `!` 的右边** ✗（第 559 轮 ✓）：`let a!: number` 里那个
// `!` 在 `Let` 与类型标注**中间** ✓ —— 插在它前面（也就是 `Let` 的紧右边 ✓）之后，
// 收尾那一趟的 `TypeDefine` 会从这个 `:` 开始、把**左边那一格 `!` 也一起收进自己** ✗
// ⇒ 产物是 `<Let/><TypeDefine>! number</TypeDefine>` ✗，而对照态是
// `<Let/><!/><TypeDefine>number</TypeDefine>` ✓（三种形状差一个字段 ✓）。
// 症状：`VariableDeclaration` 少一个 `exclamationToken` ✓、类型里的 `number` 也投不出来 ✗
//（实测 `vars-definite.ts` / `decl-var-definite-assignment.ts` / `stmt-asi-type-annotation-then-class.ts`
//  三份都是「缺 1 + 字段名 1」✓）。
// 往后走的时候**连软换行一起跳过** ✓（`let a` 换行 `!:` 这种排法也照插 ✓）。
let insertAt = nextIndex + 1;
while (true) {
  const probe = Get(data, insertAt);
  if (probe instanceof LineWrap) {
    insertAt = insertAt + 1;
    continue;
  }
  if (probe instanceof SymbolToken && probe.Is("!")) {
    insertAt = insertAt + 1;
    continue;
  }
  break;
}
data.splice(insertAt, 0, tailSymbol);
tailSymbol.Parent = unit;
// **这一格也要问一次宿主** ✓（第 578 轮 ✓）：`SymbolBranch.Success` 里那句
// 「append 完立刻问一次宿主」（`unit.FormStatement` ✓，第 486 轮 ✓）是**解析期造语句壳**的两个入口之一 ✓，
// 而这一格是**这里新建**的 ✗ ⇒ 它从来没走过那一句 ✗ ⇒ 进门那一格就是终结符时
// **壳永远造不出来** ✓ —— 实测 `let r;`（没有初始化式 ✓）：产物是 `<Let/>` + 一个
// **平级的** `<SymbolToken>;</SymbolToken>` ✗（`let x;` / `function f() { let x; }` 两种排版都一样 ✗），
// TS 那边是 `VariableStatement > VariableDeclarationList > VariableDeclaration` ✓
//（`lex-regex-after-assign.ts` 那一份账：漂 `VariableStatement` + 缺 `VariableDeclaration` / `Identifier`
// + 字段名 `declarations` ✓，四条一次收齐 ✓）。
//
// **判据不用在这里重写一遍** ✓：`FormFrom` 自己会问 `IsStatementSymbol` ✓ ——
// `=` / `:` / `,` 三档原样早退 ✓，只有 `;` 这一档真的收壳 ✓（`\n` 那一档同样早退 ✓）。
unit.FormStatement(tailSymbol);
// **让模式括号在 `Let` 自带的那一趟里再收一次**（第 533 轮 ✓）：把 `[a = 1, b = a]` 的元素
// 收成 `BindingElement` 的是 `binding-element.xl.md` ✓，它的宿主判据是
// 「父亲是 `Let` / `BindingElement` / `Parameter` / `CatchDefine`」✓ ——
// 括号这时已经是 `Let` 的子单元 ✓（上面 `AddAndCloseLast` 那一支 ✓），
// 所以要在 **`Let` 自己**这一层跑一遍 ✓（`TryToClose` 已经在上面调过 ✗，
// 那一次跑的时候括号还没挂进来 ✓；`Let` 的队列在构造器里挂着 ✓，见 `let.xl.md` 那一处 ✓）。
if (isPatternUnit) {
  Token.Former.ApplyCloseRules(letUnit);
}
```
