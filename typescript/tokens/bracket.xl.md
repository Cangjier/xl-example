# dependencies
```xl
import { Branch } from "../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../core/syntax/branch-states.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
import { DecideBracketContext } from "../text-common-util.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

括号单元：`( )` / `{ }` / `[ ]` 三对括号共用这一个类，靠 `startBracket` / `endBracket` 两个字段区分。它只认「配对的结束括号」这一个字符——括号里的内容全靠挂载的子单元自己啃。

`BracketBranch` 写在 `Bracket` **之前**：后者的静态字段 `JumpIn` 在类定义时立即 `new BracketBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class BracketBranch extends Branch

它永远不进 `Data`、不进 XML。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只有三种开括号字符才成立。

判定结果是 `BranchConditionResult` 而不是 `bool`，所以展开成「建结果、赋 `Success`」两步，`Message` 保持 `0`（与 `BranchConditionResult.FromBool` 工厂等价）。

```ts
const value = source.Value;
const result = new BranchConditionResult();
result.Success = value === "(" || value === "{" || value === "[";
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下这个开括号：新建一个 `Bracket`、用当前字符配成对应的括号对、挂到 `unit` 上并签入。

**语句位置的 `{`（块）由 `LabelReorganization` 补语句队列**，这里不补：
`{` 括号一律不设队列是既定设计（对象字面量的内容要保持平铺，函数体 / 分支体的队列由各自的规则
从括号内容另建单元时装），在词法阶段判断「这个 `{` 是不是裸块」既不可靠（那时树还是平的）、
也会让函数体 / `switch` 体被**重复重组**一遍。

```ts
const bracket = new Bracket(unit.Template);
bracket.Context = DecideBracketContext(unit, source.Value);
unit.AddToMounted(bracket).Use(source.Value).SignIn(source);
```

**`Context` 在**开括号这一刻**就算好（方案 A）**：那时 `unit.Data` 里躺着的是**词法阶段的平列表** ——
前文的 `Identifier` / `SymbolToken` 全都就位，没有任何「后来才建出来的节点」，所以这个判定
**不随重组时序变化** ✓。

原来这件事是**事后**做的（`TypeLiteralReorganization` / `BinaryOperatorReorganization` /
`SpreadReorganization` 各自往上找祖先），而规则被询问时树还不是最终的树 ——
实测同一个 `[` 在早期询问时 `Parent` 还指着 `Root`（`ArrayLiteral < Root`），
最终树里却是 `TypeAssign < Statement < Root` ✗。祖先判据因此天然时序相关（第 32、34 轮三版皆败）。

# class Bracket extends UnitToken

括号。

单元值类型是单字符的 `string`。

有一处刻意保留的不对称：`Use("{")` **不设** `ReorganizationQueue`，而 `Use("(")` / `Use("[")` 会设——也就是说 `{}` 里的子单元不跑重组，`()` / `[]` 里的才跑。看起来像漏写，但这是既定行为。

## static readonly field JumpIn:BracketBranch = new BracketBranch()

把 `BracketBranch` 注册进 `Root` 的通用跳转队列用的实例。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来。

取运行时类型用 `this.constructor`。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
```

## field startBracket:string = "("

起始括号字符。

## field endBracket:string = ")"

结束括号字符。

## field Context:string = ""

这个括号是在**类型位**还是**值位**上打开的：`"type"` / `"value"` / `""`（`{` / `[` 之外一律为空）。

**在创建时刻算好**（见 `Success`）：那时前文还是词法阶段的平列表，判定结果与重组时序无关。
`TypeLiteralReorganization` / `BinaryOperatorReorganization` / `SpreadReorganization` 用它的值代替
「往上找祖先」——那条路走不通，因为规则被询问时树还不是最终的树（`Parent` 可能还没更新）。

判定逻辑在 `../text-common-util.xl.md` 的 `DecideBracketContext`。

## method Is:(start:string, end:string)=>bool

判断本括号是不是 `start` / `end` 这一对——只比每对的**第一个字符**。

因为只比首字符，所以 `Is("(", ")")` 与 `Is("()", ")")` 等价。

```ts
return this.startBracket === start[0] && this.endBracket === end[0];
```

## method Use:(value:string)=>Bracket

按起始字符把本单元配置成对应的括号对，返回自身便于链式调用。

未知字符抛 `Exception("未知括号")`。

注意 `{` 分支里没有 `ReorganizationQueue = ...`（见类正文），这是刻意的，不要「顺手」补上——
**唯一的例外**是语句位置的块（标签后面的那个），那一支由 `label.xl.md` 的 `Process` 事后补一条语句队列。

```ts
if (value === "(") {
  this.ReorganizationQueue = this.Template.ReorganizationTemplate.Get(this.constructor);
  this.startBracket = "(";
  this.endBracket = ")";
} else if (value === "{") {
  this.startBracket = "{";
  this.endBracket = "}";
} else if (value === "[") {
  this.ReorganizationQueue = this.Template.ReorganizationTemplate.Get(this.constructor);
  this.startBracket = "[";
  this.endBracket = "]";
} else {
  throw new Error("未知括号");
}
return this;
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理。

**空实现**——括号既不吞字符也不跑跳转，字符全交给挂载的子单元。不写方法体，打印器产出空方法。

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到配对的结束括号就退出：先签出到该字符，再尝试关闭（关自己并跑重组），然后从父单元卸载自己，返回 `Done`；否则返回 `Undo`，让这一个字符继续往下走。

注意顺序是 `SignOut` → `TryToClose` → `Quit`。

```ts
if (source.Value === this.endBracket) {
  this.SignOut(source);
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，**开标签上带 `startBracket` / `endBracket` 两个属性**，内容是子单元的 XML 串接（子单元已经是 XML 串，这里只做拼接，不做转义）。

标签名取 `this.constructor.name`；子单元的 XML 用数组自带的 `join("")` 串接。

这一处直接决定最终 XML。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} startBracket="${this.startBracket}" endBracket="${this.endBracket}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + 两个括号字符 + 子单元。

键名与 XML 属性**同名**（`startBracket` / `endBracket`），值也同源：都是那两个字段。
`Context` 不进 JSON——它也不进 XML，理由相同：那是**解析期的判定结果**，
不是这个节点在树里的形状；把它写进产物会让同一段源码在两次解析里可能出现不同的下游读数。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("startBracket", this.startBracket);
result.set("endBracket", this.endBracket);
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

顺序是：`Sign(this)` → 抄两个括号字符 → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`。注意 `Sign` 之后才抄字符，且抄的是**字段**而不是 `Use`，所以克隆体不会重跑 `Use` 里的 `ReorganizationQueue` 赋值；批量加入用 `AddRange`。

```ts
const result = new Bracket(this.Template);
result.Sign(this);
result.startBracket = this.startBracket;
result.endBracket = this.endBracket;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
