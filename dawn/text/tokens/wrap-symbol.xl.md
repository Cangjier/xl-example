# dependencies
```xl
import { BlockToken } from "../../../core/syntax/block-token.xl.md"
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

软换行符号：源码里每一个 `\n` 都先变成一个独立的 `WrapSymbol`，随后在重组阶段被**整个摘掉**。它的 XML 是自闭合的 `<WrapSymbol />`，不带任何文本。

按 M33，展平出来的嵌套类 `WrapSymbol.Branch` / `WrapSymbol.Reorganization` 写在 `WrapSymbol` **之前**——`WrapSymbol` 的静态字段 `AppendIn` 会在类定义时立即 `new` 一个 `WrapSymbolBranch`，写反了会命中 ts 的暂时性死区。

# class WrapSymbolBranch extends Branch

原 C# 是嵌套类 `WrapSymbol.Branch`（M32 展平改名）。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只有换行符才认。

原 C# 的 `Success` 直接由 `source.Value == '\n'` 决定，`Message` 保持 `0`。

```ts
const result = new BranchConditionResult();
result.Success = source.Value === "\n";
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下这个换行：新建一个 `WrapSymbol`，签入签出后立刻关掉。

原 C# 把整条链写成一句：`AddAndCloseLast` 返回新单元，`AppendAndSignOut` 收字符，`SignIn` 签入，最后 `TryToClose`。

```ts
unit.AddAndCloseLast(new WrapSymbol(unit.Template)).AppendAndSignOut(source).SignIn(source).TryToClose();
```

# class WrapSymbolReorganization extends Reorganization

原 C# 是嵌套类 `WrapSymbol.Reorganization`（M32 展平改名）。

它做的事就是**把 `WrapSymbol` 从单元列表里删掉**——软换行不参与语法结构。

## static readonly field Instance:WrapSymbolReorganization = new WrapSymbolReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 M19 落成静态只读字段，调用点形态不变。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个 `WrapSymbol`。

原 C# 用 `units.Get(index) is WrapSymbol`；`Get` 是 `ListExtension` 的扩展方法，ts 侧写成模块级函数（M11）。

```ts
return Get(units, index) instanceof WrapSymbol;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `index` 处的 `WrapSymbol` 删掉，**返回新的下标**。

原 C# 是 `void Process(…, ref int index)`：删一个元素后 `index--`，让外层 `for` 的自增抵消掉，从而不跳过下一个单元。按 M15 改成返回值。

```ts
units.splice(index, 1);
return index - 1;
```

# class WrapSymbol extends BlockToken

软换行符号。

原 C# 侧是 `public class WrapSymbol : BlockToken<char>`。按 M31，`char` 在规范里写 `string`。

## static readonly field AppendIn:WrapSymbolBranch = new WrapSymbolBranch()

把 `WrapSymbolBranch` 注册进通用跳转队列用的实例。原 C# 是 `public static Branch AppendIn { get; } = new();`——这里的 `Branch` 指的是嵌套的那个 `Branch` 类。

## constructor:(Template:Template)=>void

原 C# 只是转调基类构造器。

```ts
super(Template);
```

## method IsAppend:(Src:Source)=>bool

软换行永远不把字符并进自己——每个 `\n` 都是独立的一个单元。

原 C# 是 `public override bool IsAppend(Source<char> Src) => false;`。

```ts
return false;
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## method ToXmlString:()=>string

产出**自闭合**标签，不带文本。

原 C# 是 `public override string ToXmlString() { string Name = GetType().Name; return $"<{Name} />"; }`——注意与基类的 `<Name>…</Name>` 不同，这里是 `<Name />`。这一处直接决定 XML 产物，是验收核心。

```ts
const name = this.constructor.name;
return `<${name} />`;
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是：`Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `Temp.AddRange(Temp)` → `TryToClose()`。注意 `Add` 传的是**一批克隆出来的子单元**，所以 ts 侧用 `AddRange`（M14(c)：C# 的 `Add<T>(IEnumerable<T>)` 重载改名 `AddRange`）。

```ts
const result = new WrapSymbol(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.Temp.push(...this.Temp);
result.TryToClose();
return result;
```
