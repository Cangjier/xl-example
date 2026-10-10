# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CommonUtil } from "../../core/common-util.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceAt } from "../../core/extensions/list-extension.xl.md"
import { RemoveItem } from "../list-extensions.xl.md"
import { GetSkipPreviousWrapSymbol, IsTriviaUnit, NextLineFirstCharAt, NextLineOpensAttributes, SkipNextTrivia, SkipNextWrapSymbol, SkipPreviousTrivia } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { ObjectLiteral } from "./json/object-literal.xl.md"
import { Identifier } from "./identifier.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { ConstString } from "./string/const-string.xl.md"
import { String } from "./string/string.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

导入语句：把 `import { … } from "…"` 整段收成一个 `Import` 单元。

`Import` 与 `String.String` 的 `From` 是加载依赖文件的入口：调用方从 `textContext.Root.Data` 里筛出 `Import` 单元即可。

`ImportCloseRule` 写在 `Import` 之前。

# class ImportCloseRule extends CloseRule

`Previous` 认的是「一个内容恰好等于 `import` 的 `Identifier`」——不是一个关键字 token，而是普通字符块。

## static readonly field Instance:ImportCloseRule = new ImportCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是 `import` 这个词，**而且它是一个导入声明**。

`import` 后面紧跟 `(` 的是**动态导入**——它是调用表达式（`await import("m")` / `import("m").then(…)`），
不是导入声明。少了这一条，`import("m")` 会被收成 `<Import><Bracket>…`，
既挡住调用规则收 `Method`，也让 `xl:absent Import` 的用例失败。

**后面紧跟 `.` 的是元属性 `import.meta`**（不是导入声明）：它是 TypeScript / ESM 里的一个表达式，
收成 `Import` 会把 `import.meta.url` 整段吞进一个假的导入节点里（`expr-call-import-meta` 那条用例）。
合法的导入声明后面跟的是 `{` / `*` / 一个名字 / 一个字符串，不会是 `.`。

**前面紧跟 `.` / `?.` 的是属性名**（`a.import` / `a?.import`）：`import` 是关键字表里的词，
但它在成员位置就是一个普通的名字（TypeScript 的 AST 里那里是 `Identifier`，不是 `ImportKeyword`）。
不排除这一种时，规则的收集循环立刻撞上 `;`，`items` 为空，`items[items.length - 1]` 是 `undefined`
——直接抛 `TypeError`（不是 `SyntaxException`），整个文件解析失败。
判据与 `new.xl.md` 里 `a.new` 那一路同型：**关键字不能只看自己，要看它前面那一格。**

```ts
const current = Get(units, index);
if (!(current instanceof Identifier) || current.TempToString() !== "import") {
  return false;
}
const previous = GetSkipPreviousWrapSymbol(units, index);
if (previous instanceof SymbolToken && (previous.Is(".") || previous.Is("?."))) {
  return false;
}
// **下一格走 trivia 口径**（第 907 轮）：这两道护栏问的是「`import` 后面**那一个实义单元**
// 是 `(` 还是 `.`」——`import/*c*/.meta.url` 里只跳软换行时 `next` 是那条注释
// ⇒ 两道都不响 ⇒ 整段被收成一条假导入声明（实测缺 `MetaProperty` /
// `PropertyAccessExpression` / `Identifier`，多出 `ImportDeclaration` / `ImportClause`）。
// 注释是 trivia，与换行在这里是同一件事（第 817 轮那条线）。
const next = Get(units, SkipNextTrivia(units, index));
if (next instanceof Bracket && next.startBracket === "(") {
  return false;
}
if (next instanceof SymbolToken && next.Is(".")) {
  return false;
}
return true;
```

## private method FindStringUnit:(items:Array<Token>)=>String | null

在一批单元里找第一个字符串**单元**，找不到给 `null`。

**必须往子单元里递归找**（第 67 轮修）：`import fs = require("fs")` 走到这里时，
`require("fs")` 已经被 `MethodCloseRule` 收成一个 `Method` 单元，
那个 `String` 是它的**子单元**——只看 `items` 的直接成员会漏掉，
`From` 于是留着空串（真实语料 `@types/node` 里这类 import-equals 很多）。

按文档顺序**取第一个**（深度优先、先自己后子单元），与「哪一行离 `import` 更近」一致。

```ts
for (const item of items) {
  if (item instanceof String) {
    return item;
  }
  const nested = this.FindStringUnit(item.Data);
  if (nested !== null) {
    return nested;
  }
}
return null;
```

## method IsRhsChainOpen:(items:Array<Token>)=>bool

`import x = …` 的**右值那一段**是不是停在一条**还没写完的限定名链**上——
末了那个实义单元是点号（`B.`，正等着一个名字）。

**为什么要问这一句**（第 940 轮）：`import A = B` 换行 `.C;` 与 `import A = B.` 换行 `C;`
在 TypeScript 里都是**一条** `ImportEqualsDeclaration`（那个 `=` 右边是 `QualifiedName`，
点号与名字之间、名字与点号之间都可以换行）。而本仓的「这段写完了没有」只问
「有没有路径」或「吃到了 `=` 吗」——`import A = B.` 两者都成立 ⇒ 在换行处收尾
⇒ 收出一个只到 `B.` 的 `Import`，`C;` 另起一条 `ExpressionStatement`
（实测 `importeq2n7` / `importeq2l7` 两条）。

**只判「末了是点号」这一半**：另一半点号在**下一行开头**（`import A = B` 换行 `.C`），
判据要**原始字符**——两个调用方各自都拿得到那一刻的 `Source`
（收尾规则手里是那个 `LineWrap` 单元，语句壳那一侧是当前字符），
所以两边各自调 `NextLineFirstCharAt` 问同一句，这里不另存一份。
**两处必须一致**：一边跨、一边不跨的症状就是「`Import` 只到 `B`」＋「`.C;` 另起一条」。

```ts
let last = items.length - 1;
while (last >= 0 && IsTriviaUnit(Get(items, last))) {
  last = last - 1;
}
if (last < 0) {
  return false;
}
const tail = Get(items, last);
return tail instanceof SymbolToken && (tail.Is(".") || tail.Is("?."));
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

从 `import` 开始往后收集单元，直到遇到 `;` 或软换行，收成一个 `Import`，**返回新的下标**。

要点：

- 遇到 `;`（`SymbolToken.Is(";")`）或 `LineWrap` 就停（那个终止符**不进** `items`）。
- `from` 的取法有两路：先找内容为 `from` 的 `Identifier`，取它**之后**那段里的第一个 `String`；找不到 `from` 就退回到整段里的第一个 `String`（走 `FindStringUnit`，**递归**进子单元——`import fs = require("fs")` 的那个 `String` 装在 `Method` 里）。
- 从 `String` 的子单元里取第一个 `ConstString`，把它的文本当作 `From`。找不到匹配项就抛异常（不能用 `find` 的 `undefined` 蒙混过去）。
- 最后**逐个把吃掉的单元从列表里摘掉**（`RemoveItem`），再把 `result` 放回原来 `import` 那一格，返回 `index`。

**为什么不是 `ReplaceCountAt`**（这是本条规则最容易踩的一处）：`ReplaceCountAt` 假定
「`index` 起连续 `count` 个格子都还是那些旧单元」，而这里 `items` 是**按内容**收集的
（`import { A } \n from "m"` 里的软换行会被跳过），收集范围与「连续下标区间」不是一回事。
留下没摘掉的旧单元时，它们与 `Import` 的子单元是**同一批对象**，产物里就会各渲染一次；
更糟的是它们会让末尾那条语句收尾规则（`StatementCloseRule3`）在旧下标上再收一个 `Statement` 出来，
`<Import>` 旁边于是多出一个内容一模一样的 `<Statement>`——实测在「文件以 `import …` 结尾、
尾随既没有 `;` 也没有换行」时必现。按身份逐个摘干净之后这条路径不再存在。

必须先 `SignOut` / `TryToClose` 再摘：`TryToClose` 要的范围来自那些单元自己的 `SourceRange`，
而 `RemoveItem` 只动列表、不动单元。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const items: Token[] = [];
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    throw new Error("item 为空");
  }
  // **`import` 后面那个换行可以换行写**（第 668 轮）：`import` 换行 `{ a } from "m"`
  // 是合法排法（TS 一样收），而下面那条「遇软换行就停」让**第一格**就 `break` ⇒
  // `items` 空着往下走 ⇒ `items[items.length - 1]` 是 `undefined` ⇒ `TypeError`
  //（不是 `SyntaxException`）——整个文件解析失败，报 `throw by line 0`。
  //
  // **第 829 轮把「跨 trivia」从「第一格」放宽到「路径还没到手」**：注释 / 换行落在
  // `import` 与子句之间、子句与 `from` 之间、`from` 与路径之间，TS 一律照收
  //（导入声明没有 ASI：`;` 之前全归同一条声明）：
  //
  //     import //c ⏎ { a, b as c } from "m";   ← 注释 + 换行在 `import` 之后
  //     import { a, b as c } ⏎ from "m";       ← 换行在子句与 `from` 之间
  //     import { a } from //c ⏎ "m";           ← 注释 + 换行在 `from` 与路径之间
  //
  // 原来只在**一格都没收到**时跨过 `LineWrap`（且注释根本不跨）：上面三种排法都在换行那一格
  // `break`，整条声明断成两截（前截只到 `import` / `}`），实测那四份用例各得一处漂移。
  // 收尾的判据改成**「这条声明已经完整了吗」**——完整 = 找得到模块路径（含
  // `import x = require("m")` 那种嵌在 `Method` 里的，所以走递归的 `FindStringUnit`），
  // 或者已经吃到了 `=`（`import A = B.C` / `import A = require("m")` 的名字引用段）。
  // **只按「有没有 `String`」判是不够的**：`import A = B.C` 一个字符串都没有，
  // 那样会把下一行的语句也吞进来。完整之后照旧：换行 / `;` 都收尾。
  // **「吃到了 `=`」不是「写完了」**（第 881 轮，与 `Statement.IsPendingImportHead`
  // 第 876 轮那条判据问的是同一件事）：`import m =` 换行 `require("m")` 里那个 `=`
  // 的**右操作数还没到手**——`import A = B.C` 那种「`=` 后面已经有东西」才算写完。
  // 两处只有一份答案：末了那个实义单元是不是 `=`（`Statement.LineEndsWithEquals`
  // 的同一句判据，这里按同一个口径写，因为它要的是**这一列 items** 而不是语句的 `Data`）。
  //
  // **少了它会怎样**：这个循环在换行那一格 `break` ⇒ 收出一个区间只到 `=` 的
  // `Import`，`require("m");` 另起一条 `ExpressionStatement`
  //（实测 `token/modules/gap-r869-import-equals-newline-3`：缺 `ExternalModuleReference`、
  //  漂 1、多 4）。
  const lastKeptItem = items.length > 0 ? items[SkipPreviousTrivia(items, items.length)] : null;
  const endsWithEquals = lastKeptItem instanceof SymbolToken && lastKeptItem.Is("=");
  const done = this.FindStringUnit(items) !== null || (endsWithEquals === false && items.some((unit) => unit instanceof SymbolToken && unit.Is("=")));
  // **`=` 右边那条限定名链跨行时也不算写完**（第 940 轮）：`import A = B` 换行 `.C;`
  // 与 `import A = B.` 换行 `C;` 在 TS 那边都是**一条** `ImportEqualsDeclaration`——
  // 判据、实测账见 `IsRhsChainOpen`。**只在换行那一格问它**（`;` 是硬终结符）。
  // **两处必须一致**：一边跨、一边不跨的症状就是「`Import` 只到 `B`」＋「`.C;` 另起一条」，
  // 所以语句壳那一侧问的也是这一格（`Statement.IsPendingImportHead`）。
  //
  // **`done === false` 那一半不能撤**（第 940 轮第一版撤过，当场红了一大片）：
  // `done` 挡的是「`import A = B` 换行 `const x = 1;`」那种**右边已经写完**的排版
  // ——`rhsOpen` 在那里是假、`done` 是真 ⇒ 照旧在换行处收尾；撤掉它之后这个循环
  // 会把下一行整条语句吞进 `Import`（实测 `importeq2n1` / `n2` / `l1` / `l2` 一族
  // 由绿转红：多 5、缺 2）。
  const rhsOpen = item instanceof LineWrap && (this.IsRhsChainOpen(items) || NextLineFirstCharAt(item.SourceRange.Start!) === ".");
  // **属性子句另起一行时也不算写完**（第 941 轮）：`import a from "m"` 换行
  // `with { type: "json" };` 在 TS 那边是**一条** `ImportDeclaration`
  //（`with` 那个子句是 `assertClause`）——判据、实测账见 `NextLineOpensAttributes`。
  // 少了它：这里在换行处收尾 ⇒ `Import` 只到路径（`[0,17)`），`with { … }` 另起一条
  // `WithStatement`（实测 `importattrn6` / `n7` / `l6` / `l7` 一族：缺 `AssertClause` /
  // `AssertEntry` / `StringLiteral` 共 3、漂 1、多 4）。
  //
  // **这一问要走「末了那个实义单元的 `End`」**（第 941 轮第一版写错过）：
  // `item instanceof LineWrap` 只覆盖「换行已经进了 `units`」那种场合，而这条规则的
  // 触发点是 `;`（换行一直是 appender 在管）——判据挂在那个分支上**一次都不响**。
  // `NextLine*` 那一族要的是「换行**之后**那一行」，所以从**最后一个实义单元的末尾**
  // 起扫正是同一件事（软换行不参与 `items` 的语义）。
  const lastEnd = items.length > 0 ? items[items.length - 1].SourceRange.End : current.SourceRange.End;
  const attributesNext = item instanceof LineWrap && lastEnd !== null && NextLineOpensAttributes(lastEnd);
  if (rhsOpen || attributesNext || (IsTriviaUnit(item) && done === false)) {
    if (item instanceof LineWrap) {
      items.push(item);
    }
    continue;
  }
  if ((item instanceof SymbolToken && item.Is(";")) || item instanceof LineWrap) {
    break;
  }
  items.push(item);
}
const result = new Import(template);
result.Parent = current.Parent;
const fromIndex = items.findIndex((item) => item instanceof Identifier && item.Is("from"));
if (fromIndex !== -1) {
  const fromUnits = items.slice(fromIndex + 1, items.length);
  const stringUnit = fromUnits.find((item) => item instanceof String);
  if (stringUnit instanceof String) {
    const constString = stringUnit.Data.find((item) => item instanceof ConstString);
    if (constString === undefined) {
      throw new Error("找不到匹配的子单元");
    }
    result.From = constString.TempToString();
  }
} else {
  const firstString = this.FindStringUnit(items);
  if (firstString !== null) {
    const constString = firstString.Data.find((item) => item instanceof ConstString);
    if (constString === undefined) {
      throw new Error("找不到匹配的子单元");
    }
    result.From = constString.TempToString();
  }
}
// **头一格要先跨过 trivia**（第 984 轮）：`import` 与 `type` 之间换行时，那个软换行是
// **这个循环自己塞进 `items` 的**（上面那条 `IsTriviaUnit(item) && done === false` 里
// `if (item instanceof LineWrap) { items.push(item); }`）⇒ `items[0]` 是 `LineWrap` 而不是
// `type` ⇒ `headIsType` 判否 ⇒ 那个 `type` 词既没被吃掉、也没记成 `typeOnly`
// ⇒ 投影把它当成**导入名**（实测 `import⏎type A = require("m")`：缺 `Identifier A`、
// 多 `Identifier type`，区间还差一格）。判据只有一份：**第一个非 trivia 单元**，
// 它同时交给 `ReadClause`（那一格也按「头一个是 `type`」判 `typeOnly`）。
const headIndex = SkipNextTrivia(items, -1);
result.ReadClause(items, headIndex);
const headItem = Get(items, headIndex);
const headIsType = headItem instanceof Identifier && headItem.Is("type");
const children = headIsType ? items.slice(headIndex + 1) : items;
result.AddRange(children);
result.SignIn(current.SourceRange.Start!);
// **`items` 空着也要收得住**（第 668 轮）：`import` 后面什么都没有（`import;` 那种写坏的行）
// 时终点退回 `import` 自己 —— 少这一句就是 `undefined.SourceRange`。
const lastItem = items.length > 0 ? items[items.length - 1] : current;
result.SignOut(lastItem.SourceRange.End!);
result.TryToClose();
for (const item of items.slice()) {
  RemoveItem(units, item);
}
ReplaceAt(units, index, result);
return index;
```

# class Import extends IndependentToken

导入语句。

## method PrintAst:(ctx:any, v:any)=>any

`import` 声明 → TS 的形状（**从 `ts-ast.xl.md` 的 `projectImport` 整块搬来**，第 194 轮）。

产物把它摊成**一个节点 + 一串平级单元**：

~~~
import { A as B, C } from "m"
  ⇒ Import(imported="B,C") + Bracket{ A, as, B, `,`, C } + Identifier(from) + String("m")
~~~

而 TS 是三层：`ImportDeclaration > ImportClause > (NamedImports > ImportSpecifier…)`，
其中那个 `from` **不是节点**。真实语料里这三层各缺一千多（第 34 轮）。

几条实测口径：

- `ImportDeclaration` **含尾随分号**（`import d from "m";` 的 TS 是 `[0,18)`，产物到 `"m"` 就停了）；
- `ImportClause` 从子句第一个词开始、到最后一个子句单元结束。**`type` 也算在里面**
  （`import type { A } from "m"` 的 TS 是 `ImportClause[7,17)`），而产物**没把 `type` 记成单元**，
  所以那个起点只能从 `import` 之后的第一个非空白字符量；
- `NamedImports` / `ImportSpecifier` 的区间与名字**从 token 子单元直读**（`ctx.NamedSpecifiers`）：
  花括号有时是 `Bracket`、有时（带别名时）是 `ObjectLiteral`，按标签分会漏一半，
  所以那一支两种都认；括号里每一项是独立的带区间单元，没有再回原文切一遍；
- **导入属性 `with { … }` / `assert { … }`**（第 136 轮）：产物把那一对
  `[Identifier(with), Bracket({…})]` 平铺在**模块说明符之后**，而 TS 那边是
  `ImportDeclaration.assertClause`——不摘出来的话 `ImportClause` 的区间会一路撑到 `}`；
- `import x = require("m")` 在 TS 那边是**另一个 kind**（`ImportEqualsDeclaration`），
  `import x = A.B.C` 的 `moduleReference` 是 `QualifiedName`（第 95 轮）；
- **`import d, * as ns from "m"` 的默认名**（第 174 轮）与 **`defer` 是标志不是默认名**（第 176 轮）。

```ts
  const kids = ctx.Kids(v);
  const props: any = {};
  const moduleNode = kids.find((k: any) => k.get("type") === "String" || k.get("type") === "ConstString");
  if (moduleNode !== undefined) props.moduleSpecifier = ctx.Project(moduleNode);
  const assertUnits: any[] = [];
  const moduleAt = kids.indexOf(moduleNode);
  if (moduleNode !== undefined && moduleAt >= 0) {
    const after = kids.slice(moduleAt + 1).filter((k: any) => !ctx.Invisible.has(k.get("type")));
    const braceAt = after.findIndex(
      (k: any) => k.get("type") === "Bracket" && k.get("startBracket") === "{",
    );
    const word = braceAt > 0 ? after[braceAt - 1] : undefined;
    if (
      word !== undefined &&
      word.get("type") === "Identifier" &&
      ["with", "assert"].includes(ctx.TextOf(word))
    ) {
      const brace = after[braceAt];
      const elements = [];
      for (const part of ctx.Split(ctx.Kids(brace), ",")) {
        const colonAt = part.findIndex(
          (k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === ":",
        );
        if (colonAt < 0) continue;
        const nameUnit = part.slice(0, colonAt).find((k: any) => ctx.IsNameNode(k));
        if (nameUnit === undefined) continue;
        const valueUnit = part
          .slice(colonAt + 1)
          .find((k: any) => k.get("type") === "String" || k.get("type") === "ConstString");
        elements.push({
          kind: "AssertEntry",
          name: ctx.NameOf(nameUnit),
          value: valueUnit === undefined ? undefined : ctx.Project(valueUnit),
          pos: ctx.StartOf(nameUnit),
          end: valueUnit === undefined ? ctx.EndOf(nameUnit) : ctx.EndOf(valueUnit),
        });
      }
      props.assertClause = {
        kind: "AssertClause",
        elements,
        pos: ctx.StartOf(word),
        end: ctx.EndOf(brace),
      };
      assertUnits.push(word, brace);
    }
  }
  let end = ctx.StmtEndOf(v);
  // **`;` 前面夹着注释也照样算终结符**（第 829 轮）：`import { a } from "m"/*c*/;` 的 TS 终点
  // 是那个 `;` **之后**（节点区间含中间的 trivia），而 `stmtEndOf` 把尾部注释剪掉之后
  // `source[end]` 读到的正是注释的首字符 `/`——于是原来那句 `=== ";"` 永远为假，实测漂移 1。
  // 先跳过空白与注释，再看那一个字符是不是 `;`。
  const semiAt = ctx.SkipSourceTrivia(ctx.source, end);
  if (ctx.source[semiAt] === ";") end = semiAt + 1;

  const fromNode = kids.find((k: any) => k.get("type") === "Identifier" && ctx.TextOf(k) === "from");
  const equals = kids.find((k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "=");
  if (equals !== undefined) {
    const nameNode = kids.find((k: any) => k.get("type") === "Identifier" && k !== fromNode);
    const callNode = kids.find((k: any) => k.get("type") === "Method");
    const innerString =
      moduleNode ??
      (callNode === undefined
        ? undefined
        : ctx.Kids(callNode).find((k: any) => k.get("type") === "String" || k.get("type") === "ConstString"));
    const equalsProps: any = {};
    if (nameNode !== undefined) equalsProps.name = ctx.Project(nameNode);
    if (callNode !== undefined) {
      equalsProps.moduleReference = {
        kind: "ExternalModuleReference",
        expression: innerString === undefined ? undefined : ctx.Project(innerString),
        pos: ctx.StartOf(callNode),
        end: ctx.EndOf(callNode),
      };
    } else {
      const names = kids.filter(
        (k: any) => k.get("type") === "Identifier" && k !== nameNode && k !== fromNode,
      );
      if (names.length > 0) equalsProps.moduleReference = ctx.QualifiedNameFrom(names);
    }
    return { kind: "ImportEqualsDeclaration", pos: v.start, end, ...equalsProps };
  }

  const clause = kids.filter(
    (k: any) =>
      k !== moduleNode && k !== fromNode && !assertUnits.includes(k) && !ctx.Invisible.has(k.get("type")),
  );
  if (clause.length === 0) return { kind: "ImportDeclaration", pos: v.start, end, ...props };

  const source = ctx.source;
  // **`typeOnly` 在产物里是布尔值**（踩过）：原实现写的是 `String(… ?? "false") === "true"`，
  // 搬到 token 文件后我按「一定是字符串」写，于是 `import type { … }` 的 `ImportClause`
  // 起点从 `type` 退到了 `{`（实测 undici-types 一族：缺 10 + 多出 10）。
  // 两种都认，不再依赖 `String`（本文件里它没被遮蔽，但别的 token 文件里会）。
  const typeOnly = v.attrs.get("typeOnly");
  // **`ImportClause` 的起点读字段**（`TypeWordAt`，`ReadClause` 认出那个 `type` 词时当场记的）：
  // 原来这句是 `ctx.FirstCodeAfter(source, v.start + "import".length)` **回原文里跳空白**——
  // `import /*c*/ type { A } from "m"` 里它先命中注释 ⇒ 区间从 `/*c*/` 起
  // （实测多一个 `[7,23)` 的 `ImportClause`，TS 是 `[13,23)`）。
  // 与 `NamedBraceAt` 同一条：**位置答案只有一份，就在字段里**；字段缺失才退回原文找。
  const rawTypeWordAt = ctx.Attr(v, "typeWordAt");
  const typeWordAt = typeof rawTypeWordAt === "number" && rawTypeWordAt >= 0 ? rawTypeWordAt : -1;
  const clauseStart =
    typeOnly === true || typeOnly === "true"
      ? (typeWordAt >= 0 ? typeWordAt : ctx.FirstCodeAfter(source, v.start + "import".length))
      : ctx.StartOf(clause[0]);
  const clauseEnd = ctx.EndOf(clause[clause.length - 1]);
  const clauseProps: any = {};

  // **`{` 的位置读字段**（`NamedBraceAt`，`ReadClause` 认下命名导入子句时当场记的）：
  // 原来这句是 `source.indexOf("{", clauseStart)` **回原文里找**——`import /* { */ { A } from "m"`
  // 会先命中注释里那个假括号。字段缺失（非命名导入子句）时才退回原文找。
  const rawBraceAt = ctx.Attr(v, "namedBraceAt");
  const rawBrace = typeof rawBraceAt === "number" && rawBraceAt >= 0 ? rawBraceAt : -1;
  const braceOpen = rawBrace >= 0 ? rawBrace : source.indexOf("{", clauseStart);
  const braceClose = braceOpen >= 0 && braceOpen < clauseEnd ? ctx.MatchBrace(source, braceOpen) : -1;
  const star = kids.find((k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "*");
  const names = clause.filter((k: any) => k.get("type") === "Identifier" && ctx.TextOf(k) !== "as");

  if (star !== undefined) {
    const nsName = names[names.length - 1];
    clauseProps.namedBindings = {
      kind: "NamespaceImport",
      name: nsName === undefined ? undefined : ctx.Project(nsName),
      pos: ctx.StartOf(star),
      end: clauseEnd,
    };
    const defaultName = names.find(
      (k: any) => ctx.StartOf(k) < ctx.StartOf(star) && ctx.TextOf(k) !== "defer",
    );
    if (defaultName !== undefined) clauseProps.name = ctx.Project(defaultName);
  } else if (braceClose >= 0) {
    const defaultName = names.find((k: any) => ctx.StartOf(k) < braceOpen);
    if (defaultName !== undefined) clauseProps.name = ctx.Project(defaultName);
    // **每一项的名字与区间从 token 子单元直读**（`ctx.NamedSpecifiers`，见
    // `print-ast-common.xl.md` 的 `namedSpecifiersOf`）：具名子句那个括号单位就在 `kids` 里，
    // 括号里每一项的起止 / `as` 的两侧 / 字符串名在树上各是带区间的单元——
    // 不再回原文按正则重新切一遍（`import { a /* c */ as b }` 与 `import { "a-b" as c }`
    // 照原文切都会给错答案）。
    // **括号的标签有两种**：`import { … }` 是 `Bracket`，而 `import d, { … }` 里那个
    // `{ … }` 被收成了 `ObjectLiteral`（没有 `startBracket` 属性）——所以只按**位置**认：
    // `NamedBraceAt` 就是那个 `{` 的下标，落在它上面的那个单元才是具名子句。
    const namedBrace = braceOpen < 0
      ? undefined
      : kids.find(
          (k: any) =>
            (k.get("type") === "Bracket" || k.get("type") === "ObjectLiteral")
            && ctx.StartOf(k) === braceOpen,
        );
    clauseProps.namedBindings = {
      kind: "NamedImports",
      elements: namedBrace === undefined ? [] : ctx.NamedSpecifiers(namedBrace, "ImportSpecifier"),
      pos: braceOpen,
      end: braceClose + 1,
    };
  } else if (names.length > 0) {
    clauseProps.name = ctx.Project(names[0]);
  }

  props.importClause = { kind: "ImportClause", pos: clauseStart, end: clauseEnd, ...clauseProps };
  return { kind: "ImportDeclaration", pos: v.start, end, ...props };
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 999 轮）：与上面的 `PrintAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

上面那一份里有**四处回原文查**，直出版逐处换成 token 上已经记过的那一格：

| `PrintAst` 里的那一句 | 直出版读哪一格 |
| --- | --- |
| `ctx.TextOf(word)` / `ctx.TextOf(k)`（`with` / `assert` / `:` / `from` / `=` / `as` / `*`） | `ctx.ValueOf(...)`——只读那一格自己记的 `value` |
| `ctx.FirstCodeAfter(source, v.start + "import".length)` | `TypeWordAt`（`ReadClause` 认出 `type` 那一刻记的） |
| `source.indexOf("{", clauseStart)` | `NamedBraceAt`（同一处记的具名子句左花括号下标） |
| `ctx.MatchBrace(source, braceOpen)` | 那个括号**单元自己的终点**（`EndOf(namedBrace) - 1`） |

尾分号那一趟换成 `ctx.SemicolonEndOf`——它与 `PrintAst` 里「跳空白与注释再看一个字符」
**同一份实现**（第 838 / 840 轮那条口径，`Namespace` 的直出版也是这么写的）。

**让开的三档**（都发生在**投出第一个节点之前**，否则 `cases:direct` 的 `count` 记账会多记）：
`type-only` 却没记过 `TypeWordAt`、位置在却没认出那个括号单元。答 `undefined` 交回 `PrintAst`。

```ts
  const kids = ctx.Kids(v);
  // —— 先只读、不投：所有「让开」都在这一趟里判掉（第 998 轮的记账教训）——
  const typeOnly = v.typeOnly;
  const isTypeOnly = typeOnly === true || typeOnly === "true";
  const rawTypeWordAt = ctx.Attr(v, "typeWordAt");
  const typeWordAt = typeof rawTypeWordAt === "number" && rawTypeWordAt >= 0 ? rawTypeWordAt : -1;
  if (isTypeOnly && typeWordAt < 0) return undefined;
  const fromNode = kids.find((k: any) => k.Tag() === "Identifier" && ctx.ValueOf(k) === "from");
  const equals = kids.find((k: any) => k.Tag() === "SymbolToken" && ctx.ValueOf(k) === "=");
  const rawBraceAt = ctx.Attr(v, "namedBraceAt");
  const braceOpen = typeof rawBraceAt === "number" && rawBraceAt >= 0 ? rawBraceAt : -1;
  const namedBrace = braceOpen < 0 || equals !== undefined
    ? undefined
    : kids.find(
        (k: any) =>
          (k.Tag() === "Bracket" || k.Tag() === "ObjectLiteral")
          && ctx.StartOf(k) === braceOpen,
      );
  if (braceOpen >= 0 && equals === undefined && namedBrace === undefined) return undefined;
  const braceClose = namedBrace === undefined ? -1 : ctx.EndOf(namedBrace) - 1;
  const end = ctx.SemicolonEndOf(ctx.StmtEndOf(v));
  // —— 从这里起才投节点 ——
  const props: any = {};
  const moduleNode = kids.find((k: any) => k.Tag() === "String" || k.Tag() === "ConstString");
  if (moduleNode !== undefined) props.moduleSpecifier = ctx.Project(moduleNode);
  const assertUnits: any[] = [];
  const moduleAt = kids.indexOf(moduleNode);
  if (moduleNode !== undefined && moduleAt >= 0) {
    const after = kids.slice(moduleAt + 1).filter((k: any) => !ctx.Invisible.has(k.Tag()));
    const braceAt = after.findIndex(
      (k: any) => k.Tag() === "Bracket" && k.startBracket === "{",
    );
    const word = braceAt > 0 ? after[braceAt - 1] : undefined;
    if (
      word !== undefined &&
      word.Tag() === "Identifier" &&
      ["with", "assert"].includes(ctx.ValueOf(word))
    ) {
      const brace = after[braceAt];
      const elements = [];
      for (const part of ctx.Split(ctx.Kids(brace), ",")) {
        const colonAt = part.findIndex(
          (k: any) => k.Tag() === "SymbolToken" && ctx.ValueOf(k) === ":",
        );
        if (colonAt < 0) continue;
        const nameUnit = part.slice(0, colonAt).find((k: any) => ctx.IsNameNode(k));
        if (nameUnit === undefined) continue;
        const valueUnit = part
          .slice(colonAt + 1)
          .find((k: any) => k.Tag() === "String" || k.Tag() === "ConstString");
        elements.push({
          kind: "AssertEntry",
          name: ctx.NameOf(nameUnit),
          value: valueUnit === undefined ? undefined : ctx.Project(valueUnit),
          pos: ctx.StartOf(nameUnit),
          end: valueUnit === undefined ? ctx.EndOf(nameUnit) : ctx.EndOf(valueUnit),
        });
      }
      props.assertClause = {
        kind: "AssertClause",
        elements,
        pos: ctx.StartOf(word),
        end: ctx.EndOf(brace),
      };
      assertUnits.push(word, brace);
    }
  }
  if (equals !== undefined) {
    const nameNode = kids.find((k: any) => k.Tag() === "Identifier" && k !== fromNode);
    const callNode = kids.find((k: any) => k.Tag() === "Method");
    const innerString =
      moduleNode ??
      (callNode === undefined
        ? undefined
        : ctx.Kids(callNode).find((k: any) => k.Tag() === "String" || k.Tag() === "ConstString"));
    const equalsProps: any = {};
    if (nameNode !== undefined) equalsProps.name = ctx.Project(nameNode);
    if (callNode !== undefined) {
      equalsProps.moduleReference = {
        kind: "ExternalModuleReference",
        expression: innerString === undefined ? undefined : ctx.Project(innerString),
        pos: ctx.StartOf(callNode),
        end: ctx.EndOf(callNode),
      };
    } else {
      const names = kids.filter(
        (k: any) => k.Tag() === "Identifier" && k !== nameNode && k !== fromNode,
      );
      if (names.length > 0) equalsProps.moduleReference = ctx.QualifiedNameFrom(names);
    }
    return { kind: "ImportEqualsDeclaration", pos: v.start, end, ...equalsProps };
  }
  const clause = kids.filter(
    (k: any) =>
      k !== moduleNode && k !== fromNode && !assertUnits.includes(k) && !ctx.Invisible.has(k.Tag()),
  );
  if (clause.length === 0) return { kind: "ImportDeclaration", pos: v.start, end, ...props };
  // **`ImportClause` 的起点**：type-only 读 `TypeWordAt`（上面已经确认它记过），
  // 其余读子句第一格的起点——与 `PrintAst` 同一份判据，只是不再回原文跳空白。
  const clauseStart = isTypeOnly ? typeWordAt : ctx.StartOf(clause[0]);
  const clauseEnd = ctx.EndOf(clause[clause.length - 1]);
  const clauseProps: any = {};
  const star = kids.find((k: any) => k.Tag() === "SymbolToken" && ctx.ValueOf(k) === "*");
  const names = clause.filter((k: any) => k.Tag() === "Identifier" && ctx.ValueOf(k) !== "as");
  if (star !== undefined) {
    const nsName = names[names.length - 1];
    clauseProps.namedBindings = {
      kind: "NamespaceImport",
      name: nsName === undefined ? undefined : ctx.Project(nsName),
      pos: ctx.StartOf(star),
      end: clauseEnd,
    };
    const defaultName = names.find(
      (k: any) => ctx.StartOf(k) < ctx.StartOf(star) && ctx.ValueOf(k) !== "defer",
    );
    if (defaultName !== undefined) clauseProps.name = ctx.Project(defaultName);
  } else if (braceClose >= 0) {
    const defaultName = names.find((k: any) => ctx.StartOf(k) < braceOpen);
    if (defaultName !== undefined) clauseProps.name = ctx.Project(defaultName);
    clauseProps.namedBindings = {
      kind: "NamedImports",
      elements: ctx.NamedSpecifiers(namedBrace, "ImportSpecifier"),
      pos: braceOpen,
      end: braceClose + 1,
    };
  } else if (names.length > 0) {
    clauseProps.name = ctx.Project(names[0]);
  }
  props.importClause = { kind: "ImportClause", pos: clauseStart, end: clauseEnd, ...clauseProps };
  return { kind: "ImportDeclaration", pos: v.start, end, ...props };
```

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## field From:string | null = null

被导入的路径。

加载依赖文件时用它；为空表示这条导入没有可解析的目标。

## field typeOnly:boolean = false

`import type …` 的 type-only 导入。

**判据是收集到的第一个单元就是内容为 `type` 的 `Identifier`**：`import type { A } from "m"`；
`import { type A } from "m"`（逐项 type 修饰）不算整条 type-only。

那个 `type` 词**不进产物**（第 56 轮修的）：它已经由 `typeOnly="true"` 表达，
再以一个 `<Identifier>type</Identifier>` 留在 `Import` 里是纯冗余。
`import type { A } from "m"` 与
`import { A } from "m"` 的差别只在属性上，这正是下游需要的形状。

## field defaultImport:string = ""

默认导入的本地名（`import Default from "m"` → `Default`）。

## field namespace:string = ""

命名空间导入的本地名（`import * as ns from "m"` → `ns`）。

## field imported:Array<string> = []

具名导入的**本地名**列表（`import { A, B as C } from "m"` → `A,C`）。

取的是每一项的**最后一个 `Identifier`**：`A` 取 `A`、`B as C` 取 `C`、`type B` 取 `B`。
空列表表示这条导入没有具名子句（`import "m"` / 默认导入 / 命名空间导入）。

## field NamedBraceAt:int = -1

**具名导入子句那个 `{` 的下标**；没有具名子句时是 `-1`。

**为什么要有这一格**（用户口径：token 出字段、投影直读）：投影要拿它当 `NamedImports`
的起点、并借它把默认名（`{` 之前那个）分出来。原来用 `source.indexOf("{", clauseStart)`
**回原文里找**——那是**第二份位置答案**：`import /* { */ { A } from "m"` 会先命中注释里
那个假括号。而 `ReadClause` 认下具名子句那一刻括号单元（`Bracket` 或带别名时的
`ObjectLiteral`）就在手上，当场记下来即可。

**记的是「`from` 之前那一格 `{`」**（第 999 轮）：量位置的判据收在 `BraceInClause` 一处，
`ReadClause` 进三种子句分支**之前**先记一次——原来只有「头一格就是 `Bracket`」那一支记，
于是 `import d, { A } from "m"`（默认导入 + 具名子句）这一格**一直是 `-1`**，
投影的兜底于是永远在回原文找。**这一格现在也进字典**（`ToDictionary`，`questionAt` 同款：
`>= 0` 时才写），`PrintDirectAst` 读的就是它。

**为什么这些属性值得加**：原来 `Import` 只带 `From`，两条形状完全不同的导入只能靠子单元去分辨；
而且 `From` **根本没有进 XML**（`Import` 没有覆写 `ToXmlString`）——下游拿不到路径。
现在这些信息都成了属性，`ToXmlString` 一并渲染。

## field TypeWordAt:int = -1

**`import type …` 里那个 `type` 词的下标**；不是 type-only 导入时是 `-1`。

投影拿它当 `ImportClause` 的起点（TS 那边 `import type { A } from "m"` 的 `ImportClause`
是从 `type` 开始的）。与 `NamedBraceAt` 同一条理由：**认下这一格的那一刻记下来**，
不回原文找第二份位置答案——`import /*c*/ type { A }` 里回原文找会先命中注释
（第 875 轮实测：多出一个 `[7,23)` 的 `ImportClause`，TS 是 `[13,23)`）。

## method ReadClause:(items:Array<Token>, headIndex:int)=>void

从子句里读出 `typeOnly` / `defaultImport` / `namespace` / `imported`。

`Process` 在把 `items` 装进 `Data` **之前**调用它（那时这些单元还没被关闭，读起来最方便）。

**`headIndex` 是「第一个实义单元」的下标**（第 984 轮）：`items` 的头几格可能是
`Process` 的收集循环自己塞进来的 trivia（`import` 与子句之间那个换行）——
按 `items[0]` 判会把 `import` 换行 `type A = …` 里的 `type` 读漏
（`typeOnly` 判否 + 那个 `type` 词又当成导入名，实测）。

三种子句的形态互斥、按顺序判：

- 头一个是 `type` → `typeOnly`，后面按「剩下的部分」继续判；
- 紧跟 `*`：命名空间导入，`as` 之后的那个 `Identifier` 是本地名；
- 头一个是 `Identifier`（不是 `from`）：默认导入；
- 有 `{` 括号：具名导入，括号里按 `,` 分段、每段取最后一个 `Identifier`。

**`import defer` 是相位修饰词，不是默认导入名**（TS 5.9 的延迟导入，第 67 轮补）：
`import defer * as ns from "m"` 里 `defer` 修饰的是那个命名空间导入。
判据必须带上**后面紧跟 `*`** 这半条——`import defer from "./defer.js"` 是**合法的默认导入**，
名字就叫 `defer`，无条件跳过会把它读丢（实测）。

**`TypeWordAt` 在认出 `type` 那一刻当场记下**（第 875 轮）：投影要拿它当 `ImportClause`
的起点（TS 的 `import type { A } from "m"` 里 `ImportClause` 是从 `type` 那个词开始的）。
原来那一格是**回原文里找**——`FirstCodeAfter(import + 6)` 只跳空白，遇到
`import /*c*/ type { A }` 就先命中注释 ⇒ 区间从 `/*c*/` 起（多出一个 `[7,23)` 的
`ImportClause`，与 TS 的 `[13,23)` 对不上）。判据与 `NamedBraceAt` 同一条：
**认下这一格的那一刻就把它记下来，不再回原文找第二份位置答案**。
`type` 是 `items` 里第一个实义单元（`Process` 的收集循环跨过 trivia，头一格的下标由
`headIndex` 递进来），所以它的下标就是 `SourceRange.Start`。

```ts
let start = headIndex;
// **具名子句那个左花括号的位置先量一次**（第 999 轮）：`ReadClause` 的三种子句分支里
// 原来只有「头一格就是 `Bracket`」那一支记了 `NamedBraceAt`，于是
// `import d, { A } from "m"`（默认导入 + 具名子句）**这一格一直是 `-1`**，
// 而投影那一侧的兜底是 `source.indexOf("{", clauseStart)`——正是这一格要消掉的第二份位置答案。
// 判据只有一份、位置只量一次：**`from` 之前那一格 `{`**。
this.NamedBraceAt = this.BraceInClause(items);
const typeWord = Get(items, start);
if (typeWord instanceof Identifier && typeWord.Is("type")) {
  this.typeOnly = true;
  this.TypeWordAt = typeWord.SourceRange.Start === null ? -1 : typeWord.SourceRange.Start.Index;
  start = start + 1;
}
if (
  start + 1 < items.length &&
  items[start] instanceof Identifier &&
  (items[start] as Identifier).Is("defer") &&
  items[start + 1] instanceof SymbolToken &&
  (items[start + 1] as SymbolToken).Is("*")
) {
  start = start + 1;
}
if (start >= items.length) {
  return;
}
if (
  start + 1 < items.length &&
  items[start + 1] instanceof SymbolToken &&
  (items[start + 1] as SymbolToken).Is("=")
) {
  // **import-equals**（`import A = B.C` / `import A = require("m")` / `export import A = B`）：
  // 等号左边是**本地别名**，不是默认导入——TS 那边 `ImportEqualsDeclaration` 里根本没有
  // 「default import」这个位置。不挡这一条，`defaultImport` 会被填成那个别名，
  // 而 `From`（require 那一支）又指向真实路径，下游按「默认导入 + 路径」读就会读歪（第 67 轮修）。
  return;
}
const head = items[start];
if (head instanceof SymbolToken && head.Is("*")) {
  const asIndex = items.findIndex((item) => item instanceof Identifier && (item as Identifier).Is("as"));
  if (asIndex !== -1 && asIndex + 1 < items.length && items[asIndex + 1] instanceof Identifier) {
    this.namespace = (items[asIndex + 1] as Identifier).TempToString();
  }
  return;
}
if (head instanceof Identifier && head.Is("from") === false) {
  this.defaultImport = head.TempToString();
  return;
}
if (head instanceof Bracket && head.startBracket === "{") {
  const names: string[] = [];
  let lastCommon: Identifier | null = null;
  for (const item of head.Data) {
    if (item instanceof Identifier) {
      lastCommon = item;
      continue;
    }
    if (item instanceof SymbolToken && item.Is(",")) {
      if (lastCommon !== null) {
        names.push(lastCommon.TempToString());
        lastCommon = null;
      }
    }
  }
  if (lastCommon !== null) {
    names.push(lastCommon.TempToString());
  }
  this.imported = names;
}
```

## method BraceInClause:(items:Array<Token>)=>int

`items` 里那个**具名子句的左花括号**的下标；没有具名子句时是 `-1`。

**判据只有一份：`from` 之前那一格 `{`**。为什么必须卡在 `from` 前面——
`import a from "m" with { type: "json" }` 里**也有一个** `{`（那一格是 `assertClause`，
不是具名子句），照「整段里第一个 `{`」找会把它认成具名子句的括号。

**为什么 `ObjectLiteral` 也算**（第 999 轮）：`import d, { A } from "m"` 里那一对花括号
不在 `ReadClause` 的 `Bracket` 分支上（头一格是默认名，那一支当场 `return`），
而它被值位的对象字面量规则收成了 `ObjectLiteral`（没有 `startBracket` 属性）——
按标签分会漏掉这一种，所以两种都认（与 `PrintAst` 找 `namedBrace` 那一句同一份判据）。

**位置从哪来**：括号单元自己的 `SourceRange.Start`——它就在手上，不必回原文 `indexOf`。

```ts
const fromAt = items.findIndex((item) => item instanceof Identifier && (item as Identifier).Is("from"));
const limit = fromAt === -1 ? items.length : fromAt;
for (let i = 0; i < limit; i++) {
  const item = Get(items, i);
  if (item === null) {
    continue;
  }
  const isBrace = item instanceof ObjectLiteral
    || (item instanceof Bracket && (item as Bracket).startBracket === "{");
  if (isBrace) {
    return item.SourceRange.Start === null ? -1 : item.SourceRange.Start.Index;
  }
}
return -1;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带 `From` / `typeOnly` / `defaultImport` / `namespace` / `imported`。

`From` 要过一遍 `CommonUtil.XmlDecode`（路径里可能有 `&` 这类字符）。

`typeOnly` 写成 `true` / `false`——与 `Interface` 的 `export` 同款。

```ts
const name = this.constructor.name;
let body = "";
for (const item of this.Data) {
  body = body + item.ToXmlString();
}
const from = this.From === null ? "" : CommonUtil.XmlDecode(this.From);
const isTypeOnly = this.typeOnly ? "true" : "false";
 const typeWord = this.TypeWordAt < 0 ? "" : ` typeWordAt="${this.TypeWordAt}"`;
return `<${name} range="${this.RangeOf()}" From="${from}" typeOnly="${isTypeOnly}" defaultImport="${this.defaultImport}" namespace="${this.namespace}" imported="${this.imported.join(",")}"${typeWord}>${body}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `From` / `typeOnly` / `defaultImport` / `namespace` / `imported` 五个字段，
外加只给投影用的 `typeWordAt` / `namedBraceAt`（都**不进 XML**）与子单元。

键名与 `ToXmlString` 开标签上的五个属性同名（连顺序也一致）、值同源：
`From` 的兜底照抄 XML 那处——`this.From === null` 时写空字符串，否则写字段本身
（XML 那次 `CommonUtil.XmlDecode` 只是属性转义，JSON 不需要）；
`typeOnly` 是 `bool`，这里写真布尔，而不是 XML 属性里插值出来的文本；
`imported` 是 `Array<string>`，按 `join(",")` 拼成字符串。
子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
const from = this.From === null ? "" : this.From;
result.set("From", from);
result.set("typeOnly", this.typeOnly);
result.set("defaultImport", this.defaultImport);
result.set("namespace", this.namespace);
result.set("imported", this.imported.join(","));
// **`typeWordAt` 只给投影用**（`ReadClause` 认下那个 `type` 词时当场记的位置，
// 见 `TypeWordAt` 那一节）：它不进 XML（`ToXmlString` 那五个属性照旧），
// 但投影是从**字典**读属性的，所以这里必须写上——少了它 `ImportClause`
// 的起点又退回「回原文跳空白」，`import /*c*/ type { A }` 会从注释起（第 875 轮）。
result.set("typeWordAt", this.TypeWordAt);
// **`namedBraceAt` 同理**（第 999 轮）：`NamedBraceAt` 一直是 token 上的一个字段，
// 但**从来没进过字典** ⇒ 投影那一句 `ctx.Attr(v, "namedBraceAt")` 永远读到 `undefined`，
// 兜底永远走「回原文 `indexOf("{")`」。直出版要读的就是这一格，所以在这里补上。
// 没有具名子句时**不写这一格**（`-1` 与「没有」是同一件事，与 `questionAt` 同一条口径）。
if (this.NamedBraceAt >= 0) {
  result.set("namedBraceAt", this.NamedBraceAt);
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

顺序是 `Sign(this)` → 抄五个字段 → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new Import(this.Template);
result.Sign(this);
result.From = this.From;
result.typeOnly = this.typeOnly;
result.defaultImport = this.defaultImport;
result.namespace = this.namespace;
result.imported = this.imported.slice();
result.NamedBraceAt = this.NamedBraceAt;
result.TypeWordAt = this.TypeWordAt;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
