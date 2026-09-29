# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

括号单元：`( )` / `{ }` / `[ ]` 三对括号共用这一个类，靠 `StartBracketChar` / `EndBracketChar` 两个字段区分。它只认「配对的结束括号」这一个字符——括号里的内容全靠挂载的子单元自己啃。

按 M33，展平出来的嵌套类 `Bracket.Branch` 写在 `Bracket` **之前**：`Bracket` 的静态字段 `JumpIn` 在类定义时立即 `new BracketBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class BracketBranch extends Branch

原 C# 是嵌套类 `Bracket.Branch`（M32 展平改名）。

它永远不进 `Data`、不进 XML，所以 ts 类名与 C# 的 `Type.Name` 不一致无害（M32）。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只有三种开括号字符才成立。

原 C# 直接 `return value == '(' || value == '{' || value == '[';`——靠 C# 里 `bool` 到 `BranchConditionResult` 的**隐式转换**。ts 没有隐式转换，按同一批 token 的写法展开成「建结果、赋 `Success`」两步，`Message` 保持 `0`（与 `BranchConditionResult.FromBool` 工厂等价）。

```ts
const value = source.Value;
const result = new BranchConditionResult();
result.Success = value === "(" || value === "{" || value === "[";
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下这个开括号：新建一个 `Bracket`、用当前字符配成对应的括号对、挂到 `unit` 上并签入。

原 C# 把整条链写成一句 `unit.AddToMounted(new Bracket(unit.Owner,unit.Template)).Use(source.Value).SignIn(source);`。

```ts
unit.AddToMounted(new Bracket(unit.Owner, unit.Template)).Use(source.Value).SignIn(source);
```

# class Bracket extends UnitToken

括号。

原 C# 侧是 `public class Bracket : UnitToken<char>`。按 M31，C# 的 `char` 在规范里写 `string`（单字符）。

有一处必须照抄的 C# 行为：`Use("{")` **不设** `ReorganizationQueue`，而 `Use("(")` / `Use("[")` 会设——也就是说 `{}` 里的子单元不跑重组，`()` / `[]` 里的才跑。看起来像漏写，但它是原实现的行为。

## static readonly field JumpIn:BracketBranch = new BracketBranch()

把 `BracketBranch` 注册进 `Root` 的通用跳转队列用的实例。

原 C# 是 `public static Branch JumpIn { get; } = new();`——这里的 `Branch` 指的是嵌套的那个 `Branch` 类，按 M19 落成静态只读字段。

## constructor:(owner:IOwner, template:Template)=>void

以负责人与模板创建，并把本类型的跳转队列取出来。

原 C# 是 `public Bracket(IOwner owner,Template<char> template) : base(owner, template)`，体里只有 `ProcessQueue = template.BranchTemplate.Get(GetType());`——`GetType()` 按 M17 写成 `this.constructor`。

```ts
super(owner, template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
```

## field StartBracketChar:string = "("

起始括号字符。原 C# 是 `public char StartBracketChar = '(';`。

## field EndBracketChar:string = ")"

结束括号字符。原 C# 是 `public char EndBracketChar = ')';`。

## method Is:(start:string, end:string)=>bool

判断本括号是不是 `start` / `end` 这一对——只比每对的**第一个字符**。

原 C# 是 `return StartBracketChar == start[0] && EndBracketChar == end[0];`，所以 `Is("(", ")")` 与 `Is("()", ")")` 等价。

```ts
return this.StartBracketChar === start[0] && this.EndBracketChar === end[0];
```

## method Use:(value:string)=>Bracket

按起始字符把本单元配置成对应的括号对，返回自身便于链式调用。

原 C# 是 `public Bracket Use(char value)`，未知字符抛 `Exception("未知括号")`。

注意 `{` 分支里没有 `ReorganizationQueue = ...`（见类正文）——照抄，不要补齐。

```ts
if (value === "(") {
  this.ReorganizationQueue = this.Template.ReorganizationTemplate.Get(this.constructor);
  this.StartBracketChar = "(";
  this.EndBracketChar = ")";
} else if (value === "{") {
  this.StartBracketChar = "{";
  this.EndBracketChar = "}";
} else if (value === "[") {
  this.ReorganizationQueue = this.Template.ReorganizationTemplate.Get(this.constructor);
  this.StartBracketChar = "[";
  this.EndBracketChar = "]";
} else {
  throw new Error("未知括号");
}
return this;
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

原 C# 是 `protected override void Close()`。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理。

原 C# 的覆写是**空的**——括号既不吞字符也不跑跳转，字符全交给挂载的子单元。按 M30 不写 ts 体，打印器产出空方法。

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到配对的结束括号就退出：先签出到该字符，再尝试关闭（关自己并跑重组），然后从父单元卸载自己，返回 `Done`；否则返回 `Undo`，让这一个字符继续往下走。

原 C# 是 `protected override BranchStates ExitOrPre(SyntaxContext<char> context, in Source<char> source)`，注意顺序是 `SignOut` → `TryToClose` → `Quit`。

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

产出 XML：标签名是运行时类型名，**开标签上带 `StartBracketChar` / `EndBracketChar` 两个属性**，内容是子单元的 XML 串接（子单元已经是 XML 串，这里只做拼接，不做转义）。

原 C# 是 `$"<{name} StartBracketChar=\"{StartBracketChar}\" EndBracketChar=\"{EndBracketChar}\">{temp.Join("")}</{name}>"`——用 `GetType().Name` 取标签名（按 M17 换成 `this.constructor.name`），`temp.Join("")` 是 `ListExtension` 的扩展方法，ts 的数组本来就有 `join`（M11）。

这一处直接决定最终 XML，是验收核心，与 C# 逐字对照。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} StartBracketChar="${this.StartBracketChar}" EndBracketChar="${this.EndBracketChar}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

转成字典：`type` 是运行时类型名，外加两个括号字符字段；有子单元时再放 `children`。

原 C# 是 `public override Dictionary<string, object> ToDictionary()`，`result.Add("startBracketChar", StartBracketChar)` 把 `char` 装箱进 `object`；ts 侧就是单字符的 `string`。

注意 C# 里 `Data.Count != 0` 才放 `children`，所以空括号产出的字典里没有 `children` 键。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("startBracketChar", this.StartBracketChar);
result.set("endBracketChar", this.EndBracketChar);
if (this.Data.length !== 0) {
  result.set("children", this.ToList());
}
return result;
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是：`Sign(this)` → 抄两个括号字符 → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。注意 `Sign` 之后才抄字符，且抄的是**字段**而不是 `Use`，所以克隆体不会重跑 `Use` 里的 `ReorganizationQueue` 赋值。`Add` 传的是一批克隆出来的子单元，所以 ts 侧用 `AddRange`（M14(c)：C# 的 `Add<T>(IEnumerable<T>)` 重载改名 `AddRange`）。

```ts
const result = new Bracket(this.Owner, this.Template);
result.Sign(this);
result.StartBracketChar = this.StartBracketChar;
result.EndBracketChar = this.EndBracketChar;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
