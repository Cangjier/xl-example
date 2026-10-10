# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CommonUtil } from "../../core/common-util.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Get, ReplaceCountAt, SearchBack, TakeRange } from "../../core/extensions/list-extension.xl.md"
import { DeclarationModifierSpans, DeclarationModifiers, DeclarationStart, IsDeclarationBoundary, IsStatementKeyword, ReorganizeDeclarationDecorators } from "./declaration-common.xl.md"
import { IsPendingTypeModifier, SkipNextTrivia, SkipNextWrapSymbol } from "../text-common-util.xl.md"
import { Decorator } from "./decorator.xl.md"
import { Identifier } from "./identifier.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型赋值：把 `type X = …;` 这一整段收成一个 `TypeAssign` 单元，段内的单元原样装进它的 `Data`（它自己不再产出 XML 属性，`ToXmlString` 走基类）。

`TypeAssignCloseRule` 写在 `TypeAssign` **之前**，与同目录其它 token 一致。

# class TypeAssignCloseRule extends CloseRule

`Previous` 认的是「`type` + 名字 + `=` 三个实义单元依次相邻（跨过全部 trivia）」这一串。

`Process` 从 `type`（含它前面的 `export`）一直收到 `;` 为止——**没有** `;` 时就收到列表末尾。
**那个 `;` 只进范围、不进子单元**（第 290 轮）：它是语句终结符，留在列表里给语句切分用
（见 `Process` 里 `dataEnd` 那一段的说明）。

## static readonly field Instance:TypeAssignCloseRule = new TypeAssignCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个类型赋值的开头。

取两个「跨过 trivia 的下一个单元」下标，判定是一句合取：当前是内容为 `type` 的 `Identifier`、第一个下一个是 `Identifier`、第二个下一个是内容为 `=` 的 `SymbolToken`。这里拆成早返回，语义相同。

**注释与软换行一视同仁**（第 661 轮）：`type /* c */ X = number` 里关键词与名字之间夹着注释，
只跳软换行时第一个「下一个」看到的是注释 ⇒ 整条别名不成形（实测 `type/* c */ X` /
`type X/* c */ =` 一族把整条退化成 `ExpressionStatement` + 一条假 `BinaryExpression`，
`type-fn-generic-arg` / `type-lit-string-double` / `type-mapped-template-key` 三族都栽在这里）。

**名字与 `=` 之间允许一段类型参数**（`type Box<T> = …` / `type A<T extends X = Y> = …`）：
不放这一条，泛型别名整条形不成——名字之后跟的是 `GenericType`，判定在「第二个下一个是 `=`」处就断了，
产物里只剩 `<Keyword>type</Keyword>` 加一串散单元（实测 `@types` 里有 112 个泛型别名）。

```ts
const current = Get(units, index);
const nextIndex1 = SkipNextTrivia(units, index);
if (!(current instanceof Identifier) || !current.Is("type")) {
  return false;
}
if (!(Get(units, nextIndex1) instanceof Identifier)) {
  return false;
}
let nextIndex2 = SkipNextTrivia(units, nextIndex1);
if (Get(units, nextIndex2) instanceof GenericType) {
  nextIndex2 = SkipNextTrivia(units, nextIndex2);
}
const nextSymbol = Get(units, nextIndex2);
return nextSymbol instanceof SymbolToken && nextSymbol.Is("=");
```

## private method AliasEnd:(units:Array<Token>, index:int)=>int

别名右端的结尾下标。

两条终止，先到先算：

- `;` —— 显式结尾；
- **软换行 + 下一行的开头是一条声明**——这是 TypeScript 里「一行一个别名」的常见排版，
  不加这一条，`type A = number` 换行 `type B = string` 会被并成**同一个** `TypeAssign`
  （原来的写法是「找不到 `;` 就一路收到列表末尾」，正好踩这个坑）。

**下一行的开头有两种形态**，都要认：

- 还是一个**词**（`type` / `export` / `interface` / `let` …）→ `IsStatementKeyword`；
- 已经**成形的声明单元**（`Interface` / `Class` / `Function` / `Statement` …）→ `IsDeclarationBoundary`。

第二条是必须的：本规则排在 `Interface` / `Class` 等规则**之后**，
轮到它扫描时，后面那条声明往往已经被收成节点了。只认词的话，
`declare namespace N {` 里「对象型别名 → interface → 函数型别名」这一串会把
**interface 与后面那条别名一起吞进第一个别名的右端**
（实测：命名空间体里三条声明只剩第一条成形，这是 `TypeAssign` 差额的来源之一）。
`IsDeclarationBoundary` 正是为这种「列表里已经没有裸 `Identifier`」的情形写的（见 `declaration-common.xl.md`）。

**只看「换行后是不是声明开头」而不是「遇到换行就停」**：类型表达式经常折行
（`type X =` 换行 `| A` 换行 `| B`），见到换行就停会把联合类型截断。

一路没遇到终止就返回列表末尾。

```ts
let i = index;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && item.Is(";")) {
    return i;
  }
  if (item instanceof LineWrap) {
    // **类型词还没等到操作数 ⇒ 这一行没写完**（第 873 轮）：`type T = abstract` 换行
    // `new () => X` 里下一行以 `new` 开头，而 `new` 在声明头的词表里 ⇒ 原来在这里收尾
    // ⇒ 右端只剩一个 `abstract`（实测 `gap-r869-abstract-construct-newline-4`：
    // `TypeAliasDeclaration` 区间漂、`ConstructorType` / `AbstractKeyword` 一起缺）。
    // 判据与解析期那一问**同一份实现**（`IsPendingTypeModifier`）：`=` 右边一定是类型。
    if (IsPendingTypeModifier(units, i)) {
      i = i + 1;
      continue;
    }
    const next = Get(units, SkipNextWrapSymbol(units, i));
    if (next === null || IsStatementKeyword(next) || IsDeclarationBoundary(next)) {
      return i - 1 >= index ? i - 1 : i;
    }
  }
  i = i + 1;
}
return units.length - 1;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整段类型赋值收成一个 `TypeAssign`，**返回新的下标**。

要点：

- `startIndex` 由 `DeclarationStart` 从 `type` 那个词往前吃**全部修饰词与装饰器**（`export` / `declare` /
  `@dec`），它们折进 `modifiers` / `ModifierSpans` 两个字段；装饰器是**带子树的节点**，
  与 `Class` 同一条口径：照旧搬进 `Data`，只有「能被字段完整表达」的修饰词不进。
- 别名进 `alias` 属性；`type` 这个词与名字本身**不再作为子单元**（与 `Class` / `Interface` 的处理一致：
  关键字与名字都进属性，子单元里只剩类型参数、`=` 与右端）。
- `endIndex` 由 `AliasEnd` 给出（`;` 或「换行 + 下一条声明」），不再一路收到列表末尾。
- 段内单元用 `TakeRange(units, startIndex, count)` 取（**取出不移除**），随后由 `ReplaceCountAt` 一次性替换掉原区间。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
// **装饰器先收成单元**（与 `ClassBranch.Success` / `InterfaceBranch.Success` 同一件工具）：
// 走到这一刻它们可能还是散的 `@` / 名字 / 实参括号，而 `DeclarationStart` 往回走会停在实参括号上。
const keywordIndex = ReorganizeDeclarationDecorators(template, units, index);
const nameIndex = SkipNextTrivia(units, keywordIndex);
const name = Get(units, nameIndex);
if (!(name instanceof Identifier)) {
  throw new Error("type 语句不满足格式要求：type Name = ...");
}
// **头从第一个修饰词 / 装饰器起**：TS 那边 `@dec type T = number` 的 `TypeAliasDeclaration`
// 从 `@` 起、`Decorator` 在 `modifiers` 里；早先这里只往回吃**一个**修饰词，
// 装饰器留在外面成了平级兄弟——实测整条退化成 `ExpressionStatement`
// （缺 `TypeAliasDeclaration` / `Identifier` / `NumberKeyword`，多出 `ExpressionStatement`）。
const startIndex = DeclarationStart(units, keywordIndex);
const modifiers = DeclarationModifiers(units, startIndex, keywordIndex);
const endIndex = this.AliasEnd(units, keywordIndex);
// **结尾那个 `;` 不装进本单元**（第 290 轮）：它是**语句终结符**，
// 而语句切分那一趟（`statement.xl.md` 的 `StatementCloseRule`）**只看列表里的单元**
// ——`;` 一旦被装进 `TypeAssign`，`type A = number; let x: A = 1;` 这一行就**再也断不开**：
// 实测产物是 `<Statement><TypeAssign …/><Let …/><TypeDefine>…</TypeDefine><SymbolToken>=</SymbolToken>
// <Identifier>1</Identifier></Statement>`，投影于是给出
// `BinaryExpression(TypeAliasDeclaration, =, 1)`，降级层报
// `unimplemented: assignment to a non-identifier`（`type A = number; console.log(1)` 同理）。
// **换行版的同一条形状一直是好的**（换行自己就是边界）——所以这个坑只在
// **一行写两条**时露头（`type X = …;` 与后续语句同一行）。
//
// **区间仍然算到 `;` 的末尾**：TS 的 `TypeAliasDeclaration` 就包含那个 `;`
// （实测 `ts.createSourceFile`：`type A = number;\nlet x …` 的别名节点是 `[0,16)`，
//  含 `;`）——所以只把**数据**少收一格，`SignOut` 照旧问 `endIndex`。
const tail = Get(units, endIndex);
const dataEnd = tail instanceof SymbolToken && tail.Is(";") && endIndex > startIndex ? endIndex - 1 : endIndex;
const result = new TypeAssign(template);
result.Parent = current.Parent;
result.alias = name.TempToString();
// **别名的位置当场记进字段**（见 `NameStart`）：这一刻 `name` 自己的 `SourceRange` 就是答案。
const nameStart = name.SourceRange.Start;
const nameEnd = name.SourceRange.End;
if (nameStart !== null && nameEnd !== null) {
  result.NameStart = nameStart.Index;
  result.NameEnd = nameEnd.Index;
}
result.modifiers = modifiers.join(",");
// **修饰词各自的位置**（见 `ModifierSpans`）：它们不进 `Data`，位置要在这一趟记下来。
result.ModifierSpans = DeclarationModifierSpans(units, startIndex, keywordIndex).join(",");
// **装饰器照旧进 `Data`**（第 610 轮）：它是带子树的节点，字段表达不了那个表达式子树；
// 与 `Class` 的分工逐字相同——能被字段表达的不进、带子树的进。顺序在源码位置上，
// 所以在 `type` 之后那一批之前先搬。
for (let i = startIndex; i < keywordIndex; i++) {
  const item = Get(units, i);
  if (item instanceof Decorator) {
    result.AddAndCloseLast(item);
  }
}
for (let i = keywordIndex; i <= dataEnd; i++) {
  const item = Get(units, i);
  if (i === keywordIndex || i === nameIndex) {
    continue;
  }
  if (item !== null) {
    result.AddAndCloseLast(item);
  }
}
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, startIndex, dataEnd - startIndex + 1, result);
```

# class TypeAssign extends IndependentToken
一条类型赋值（`type X = …;`）整段。

单元值类型是单字符的 `string`。

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **第 993 轮**：`ctx.TextOf` → `ctx.ValueOf` —— 只读那一格**自己记的**值，
  // 不回原文兜底（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。
  const kids = ctx
    .Kids(v)
    .filter((k: any) => !(k.Tag() === "SymbolToken" && ctx.ValueOf(k) === ";"));
  const eqIndex = kids.findIndex(
    (k: any) => k.Tag() === "SymbolToken" && ctx.ValueOf(k) === "=",
  );
  const rawAlias = v.alias;
  const aliasText = typeof rawAlias === "string" ? rawAlias : "";
  const lhs = eqIndex >= 0 ? kids.slice(0, eqIndex) : kids;
  const rhs = eqIndex >= 0 ? kids.slice(eqIndex + 1) : [];
  const nameNode = lhs.find((k: any) => k.Tag() === "Identifier");
  const nameText = nameNode === undefined ? aliasText : ctx.ValueOf(nameNode);
  const generic = lhs.find((k: any) => k.Tag() === "GenericType");
  const props: any = {
    name: nameNode === undefined ? ctx.SynthName(nameText, v) : ctx.Project(nameNode),
    type: ctx.TypeOf(rhs),
  };
  if (generic !== undefined) {
    const params = ctx.UnwrapNodes(generic).filter((k: any) => k.Tag() === "TypeParameter");
    if (params.length > 0) props.typeParameters = ctx.ProjectEach(params);
  }
  const baseStart = ctx.baseStart;
  ctx.AddModifiers(v, props, baseStart);
  // **装饰器也进 `modifiers`**（第 610 轮）：它与关键字修饰词同住 TS 的 `modifiers` 一列，
  // 而 `Decorator` 是带子树的**子单元**——`AddModifiers` 只看文本字段，看不见它。
  // 与通用支共用同一份实现（`print-ast-common.xl.md` 的 `addDecorators`）。
  ctx.Decorators(v, props);
  // **这一条不能走 `ctx.Node`**：`pos` 要用外层递进来的 `baseStart`（`ctx.Node` 只会用 `v.start`）。
  return {
    kind: "TypeAliasDeclaration",
    pos: baseStart === undefined ? v.start : baseStart,
    end: ctx.StmtEndOf(v),
    ...props,
  };
```


## constructor:(template:Template)=>void

转调基类构造器，**并且把自己的规则队列装上**。

理由与 `type-define.xl.md` 的同名构造器相同：本单元是收尾规则建出来的，
`KeywordCloseRule` 排在通用队列最后、轮不到它里面的词——
`type X = keyof T` 的 `keyof`、`type X = typeof y` 的 `typeof` 于是停在 `Identifier` 上。
装的是**类型队列**（只有 `KeywordCloseRule` 一条，见 `../parse-pipeline.xl.md` 的
`InitialKeywordCloseRuleQueue`），不是通用队列：通用队列里的 `TernaryOperatorCloseRule`
会把条件类型 `T extends U ? A : B` 收成表达式三元。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
```

## field alias:string = ""

别名（`type` 后面那个名字）。

## field NameStart:int = -1

别名在源码里的起点（闭区间下标）。

**为什么让 token 记着**（「token 出字段、投影直读」）：别名本身**不进 `Data`**，
投影手里只有 `alias` 这个字符串，位置要回原文 `indexOf` 猜——而 `type` 那个词、
修饰词、乃至右值里都可能先出现同样的字母。
`TypeAssignCloseRule.Process` 那一刻手里就是名字那一格（`name.SourceRange`），记下来给投影直读
（见 `print-ast-common.xl.md` 的 `synthName`）。

## field NameEnd:int = -1

别名的终点（闭区间下标），与 `NameStart` 同进退。

## field modifiers:string = ""

别名前面的修饰词（`export` / `declare`），按源码顺序用 `,` 连接；没有时是空串。

## field ModifierSpans:string = ""

每个修饰词自己的区间，`"起:止"` 用 `,` 连接（闭区间），与 `modifiers` **同序同长**；没有修饰词时空串。
来由与 `Class.ModifierSpans` 同一条：修饰词不进 `Data`，位置只有认下声明那一刻知道。

## method ToXmlString:()=>string

产出 XML：开标签上带 `alias` / `modifiers` / 别名的两个下标 / 修饰词的位置，内容是类型参数、`=` 与右端的 XML。

与 `Field` / `Interface` 同一口径：名字进属性、不进子单元，属性值过一遍 `CommonUtil.XmlDecode`。

**第 987 轮五补齐三处**（`nameStart` / `nameEnd` / `modifierSpans`）：这三个键 `ToDictionary`
一直在写、投影也一直在读（注释就写着「投影直读，不再回原文 `indexOf` 猜」），而 XML 从前没印。
条件与 JSON 那侧**逐字相同**：两个下标无条件写，`modifierSpans` 只在非空时写
——两级出口对同一件事给出同一套键，`cases:astjson` 那一门才核得动
（**那一门第 1016 轮随命令行的 `--ast-json` 一起删了**：这条「逐字相同」今天靠的是口径，不再有判据）。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
const spans = this.ModifierSpans === "" ? "" : ` modifierSpans="${CommonUtil.XmlDecode(this.ModifierSpans)}"`;
return `<${name} range="${this.RangeOf()}" alias="${CommonUtil.XmlDecode(this.alias)}" modifiers="${CommonUtil.XmlDecode(this.modifiers)}" nameStart="${this.NameStart}" nameEnd="${this.NameEnd}"${spans}>${temp.join("")}</${name}>`;
```

## property nameStart:any

`ToDictionary` 的 `nameStart` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.NameStart;
```

## property nameEnd:any

`ToDictionary` 的 `nameEnd` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.NameEnd;
```

## property modifierSpans:any

`ToDictionary` 的 `modifierSpans` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.ModifierSpans;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `alias` / `modifiers` 两个字段，外加子单元。

键名与 `ToXmlString` 开标签上的两个属性同名、值同源。
XML 那两次 `CommonUtil.XmlDecode` 是属性转义，JSON 的字符串不需要，所以直接写字段。
`type` 词与别名本身不进 `children`——理由与 XML 一致：它们已经由这两个键表达。
子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.Tag());
result.set("alias", this.alias);
result.set("modifiers", this.modifiers);
// **别名的位置**（见 `NameStart` / `NameEnd`）：投影直读，不再回原文 `indexOf` 猜。
result.set("nameStart", this.nameStart);
result.set("nameEnd", this.nameEnd);
// **修饰词各自的位置**（见 `ModifierSpans`）：投影直读，不再回原文 `indexOf` 猜。
if (this.ModifierSpans !== "") {
  result.set("modifierSpans", this.modifierSpans);
}
if (this.Data.length !== 0) {

  result.set("children", this.children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

四个声明字段都要抄。

```ts
const result = new TypeAssign(this.Template);
result.Sign(this);
result.alias = this.alias;
result.NameStart = this.NameStart;
result.NameEnd = this.NameEnd;
result.modifiers = this.modifiers;
result.ModifierSpans = this.ModifierSpans;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
