# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

区域注释 `/* … */`：从 `/*` 吃到 `*/`，正文攒进 `Tmp`。注释最终**不产出 XML**——它的 `Reorganization` 会把自己从父单元的 `Data` 里整个摘掉，所以夹具 `05-comment.xml` 里的 `<Root><Statement></Statement></Root>` 看不到任何注释内容。

按 M33，展平出来的嵌套类 `AreaAnnotation.Branch` / `AreaAnnotation.Reorganization` 写在 `AreaAnnotation` **之前**——外层类的静态字段 `JumpIn` 会在类定义时立即 `new AreaAnnotationBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class AreaAnnotationBranch extends Branch

原 C# 是嵌套类 `AreaAnnotation.Branch`（M32 展平改名）。它永远不进 `Data`、不进 XML，所以 ts 类名与 C# 的 `Type.Name` 不一致无害。

## method Condition:(context:SyntaxContext<string>, unit:Token<string>, source:Source<string>)=>BranchConditionResult

判据：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符是 `*`——也就是 `/*` 的开头。

原 C# 是 `var Pre = source.Pre(); return Pre is { Value: '/' } && unit.IsUndo(Pre.Value) && source.Value == '*';`。这里的 `Pre` 是 `Source<char>?`，所以 `unit.IsUndo(Pre.Value)` 那个 `.Value` 是**可空结构体解包**（解出来的是前一个 `Source` 本身，不是字符），ts 侧 `Pre()` 已经是 `Source<string> | null`，直接传 `pre`。C# 的 `return …` 靠 `bool` 到 `BranchConditionResult` 的隐式转换，ts 里展开成「建结果、赋 `Success`」。

```ts
const pre = source.Pre();
const result = new BranchConditionResult();
result.Success = pre !== null && pre.Value === "/" && unit.IsUndo(pre) && source.Value === "*";
return result;
```

## method Success:(context:SyntaxContext<string>, unit:Token<string>, source:Source<string>, result:BranchConditionResult)=>void

认下 `/*`：先回退已吃掉的那个 `/`（它归本单元所有），再挂一个新的 `AreaAnnotation` 并用同一个 `/` 签入。

原 C# 是 `unit.Undo(source.Pre()!.Value); unit.AddToMounted(new AreaAnnotation(unit.Owner,unit.Template)).SignIn(source.Pre()!.Value);`——两处 `source.Pre()!.Value` 都是可空结构体解包（§7.2），ts 里写成 `source.Pre()!`。

```ts
unit.Undo(source.Pre()!);
unit.AddToMounted(new AreaAnnotation(unit.Owner, unit.Template)).SignIn(source.Pre()!);
```

# class AreaAnnotationReorganization extends Reorganization

原 C# 是嵌套类 `AreaAnnotation.Reorganization`（M32 展平改名）。

它做的事就是**把 `AreaAnnotation` 从单元列表里删掉**——注释不参与语法结构，也不该出现在 XML 里。`Root.GeneralReorganize` 把它排在 `LineAnnotation.Reorganization` 之后、其余语法重组之前。

夹具 `25-area-annotation.xml` 里两行注释都被摘掉、只剩 `let a = 1` 的结构，就是这一步的效果。

## static readonly field Instance:AreaAnnotationReorganization = new AreaAnnotationReorganization()

唯一的实例。

原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 M19 落成静态只读字段，调用点形态不变。

## method Previous:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>bool

`index` 处是不是一个 `AreaAnnotation`。

原 C# 用 `units.Get(index) is AreaAnnotation`；`Get` 是 `ListExtension` 的扩展方法，ts 侧写成模块级函数（M11）。

```ts
return Get(units, index) instanceof AreaAnnotation;
```

## method Process:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>int

把 `index` 处的 `AreaAnnotation` 删掉，**返回新的下标**。

原 C# 是 `void Process(…, ref int index)`：`RemoveAt(index)` 之后 `index--`，让外层 `for` 的自增抵消掉，从而不跳过下一个单元。按 M15 改成返回值，`RemoveAt` → `splice(index, 1)`。

```ts
units.splice(index, 1);
return index - 1;
```

# class AreaAnnotation extends UnitToken

区域注释单元。

原 C# 侧是 `public class AreaAnnotation : UnitToken<char>`。按 M31，C# 的 `char` 在规范里写 `string`（单字符）。

它覆写了 `ToXmlString`（`<AreaAnnotation>正文</AreaAnnotation>`，**不转义**），但正如文件开头所说，这个单元在产出 XML 之前就被自己的 `Reorganization` 摘掉了，所以实际夹具里看不到它。

## static readonly field JumpIn:AreaAnnotationBranch = new AreaAnnotationBranch()

把 `AreaAnnotationBranch` 注册进 `Root` 的通用跳转队列用的实例。

原 C# 是 `public static Branch JumpIn { get; } = new();`——这里的 `Branch` 指的是嵌套的那个 `Branch` 类，按 M19 落成静态只读字段。

## constructor:(owner:IOwner, template:Template<string>)=>void

以负责人与模板创建，并把本类型的跳转队列取出来；本类不设重组队列（摘除动作由 `Root` 的通用重组队列驱动）。

原 C# 是 `public AreaAnnotation(IOwner owner,Template<char> template) : base(owner,template)`，体里只有 `ProcessQueue = template.BranchTemplate.Get(GetType(), null);`——`GetType()` 按 M17 写成 `this.constructor`。

```ts
super(owner, template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

注释正文。两个 `*` 都不在内：开头的 `*` 由 `Branch.Success` 消费掉却不回填（`Success` 只签入），结尾的 `*` 由 `ExitOrPre` 里的 `Undo` 从末尾删掉。反正本单元会被重组摘掉，`Tmp` 不进 XML。

原 C# 是 `public StringBuilder Tmp = new();`。按 §3.8 写成 `string`：`Tmp.Append(c)` → `this.Tmp += c`，`Tmp.Remove(Tmp.Length - 1, 1)` → `this.Tmp.slice(0, this.Tmp.length - 1)`。它只被本类读写，没有被别处当容器用，换成字符串不失语义。

## method Undo:(source:Source<string>)=>void

回退一个字符。

原 C# 是 `public override void Undo(Source<char> Src)`：覆盖该位置的子单元非空就转交给它，否则从 `Tmp` 末尾删掉一个字符。注意这里的模式是 `Token<char>`（基类同款），与 `PreprocessorDirectives.Undo` 的 `UnitToken<char>` 不同——照抄各自的写法，不要「统一」。

```ts
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  undoUnit.Undo(source);
} else {
  this.Tmp = this.Tmp.slice(0, this.Tmp.length - 1);
}
```

## method IsUndo:(source:Source<string>)=>bool

能不能回退。范围已经签出（`SourceRange.End` 非空）就不能；否则看覆盖该位置的子单元，没有子单元时返回 `true`。

原 C# 是 `public override bool IsUndo(Source<char> Src)`。

```ts
if (this.SourceRange.End !== null) {
  return false;
}
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  return undoUnit.IsUndo(source);
}
return true;
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext<string>, source:Source<string>)=>void

跳转队列没接手时，把字符并进 `Tmp`。

原 C# 是 `protected override void Default(SyntaxContext<char> context,in Source<char> source)`。

```ts
this.Tmp += source.Value;
```

## protected method ExitOrPre:(context:SyntaxContext<string>, source:Source<string>)=>BranchStates

遇到 `*/` 就退出：前一个字符是 `*` 且当前字符是 `/` 时，签出到当前字符、把那个 `*` 回退掉（`*` 是结束标记，不该进正文）、关闭自己并跑重组、从父单元卸载，返回 `Done`；否则返回 `Undo`。

与 `LineAnnotation.ExitOrPre` 有一处**刻意的不对称**：这里**不插 `ReloadMessage`**——结束的 `/` 已经被吃掉且不再重处理。照抄原实现。

原 C# 是 `if (source.Pre() is { Value: '*' } Pre && source is { Value: '/' })`；`Pre` 是模式变量、类型是 `Source<char>`（模式已经把可空解开了），ts 里写成普通的 `pre !== null && pre.Value === "*"`。

```ts
const pre = source.Pre();
if (pre !== null && pre.Value === "*" && source.Value === "/") {
  this.SignOut(source);
  this.Undo(pre);
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method ToXmlString:()=>string

产出 XML：`<AreaAnnotation>注释正文</AreaAnnotation>`。

原 C# 是 `$"<{Name}>{Tmp}</{Name}>"`，标签名用 `GetType().Name`（按 M17 换成 `this.constructor.name`），内容**不做 XML 转义**（与 `BlockToken` 不同）。

```ts
const name = this.constructor.name;
return `<${name}>${this.Tmp}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

转成字典：只记类型名与注释正文，**没有** `children`。

原 C# 覆写了基类版本，返回 `{ ["type"] = GetType().Name, ["value"] = Tmp.ToString() }`。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("value", this.Tmp);
return result;
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Tmp.Append(Tmp)` → `TryToClose()`。

```ts
const result = new AreaAnnotation(this.Owner, this.Template);
result.Sign(this);
result.Tmp += this.Tmp;
result.TryToClose();
return result;
```
