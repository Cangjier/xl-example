# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

预处理指令：源码里行首那个 `#` 起、一直吃到行尾的一段（`#region` / `#if` 之类）。它整段攒进 `Tmp`，遇到**没有被 `\` 续行**的换行就退出。

按 M33，展平出来的嵌套类 `PreprocessorDirectives.Branch` 写在 `PreprocessorDirectives` **之前**——外层类的静态字段 `JumpIn` 在类定义时立即 `new PreprocessorDirectivesBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class PreprocessorDirectivesBranch extends Branch

原 C# 是嵌套类 `PreprocessorDirectives.Branch`（M32 展平改名）。它永远不进 `Data`、不进 XML，所以 ts 类名与 C# 的 `Type.Name` 不一致无害。

## method Condition:(context:SyntaxContext<string>, unit:Token<string>, source:Source<string>)=>BranchConditionResult

只有「行首的 `#`」才成立：向前跳过空格与制表符之后，要么是换行符，要么已经走到文档开头。

原 C# 是 `var Pre = source.Pre(' ', '\t'); return (Pre is { Value: '\n' } || Pre is null) && source.Value == '#';`。C# 的 `Pre(params ValueType[] skipChars)` 是可变形参，ts 侧 `Pre` 收一个 `Array<ValueType>`，所以写成 `source.Pre([" ", "\t"])`（M2）。`Pre` 在 C# 里是 `Source<char>?`，ts 已是 `Source<string> | null`，`Pre.Value` 那层可空解包不再需要。

```ts
const pre = source.Pre([" ", "\t"]);
const result = new BranchConditionResult();
result.Success = (pre === null || pre.Value === "\n") && source.Value === "#";
return result;
```

## method Success:(context:SyntaxContext<string>, unit:Token<string>, source:Source<string>, result:BranchConditionResult)=>void

认下这个 `#`：新建一个 `PreprocessorDirectives`，挂到 `unit` 上并签入。

原 C# 把整条链写成一句 `unit.AddToMounted(new PreprocessorDirectives(unit.Owner, unit.Template)).SignIn(source);`。

```ts
unit.AddToMounted(new PreprocessorDirectives(unit.Owner, unit.Template)).SignIn(source);
```

# class PreprocessorDirectives extends UnitToken

预处理指令单元。

原 C# 侧是 `public class PreprocessorDirectives : UnitToken<char>`。按 M31，C# 的 `char` 在规范里写 `string`（单字符）。

它覆写了 `ToXmlString`，所以 XML 不走 `BlockToken` 那套转义：正文原样落在标签里。

## static readonly field JumpIn:PreprocessorDirectivesBranch = new PreprocessorDirectivesBranch()

把 `PreprocessorDirectivesBranch` 注册进 `Root` 的通用跳转队列用的实例。

原 C# 是 `public static Branch JumpIn { get; } = new();`——这里的 `Branch` 指的是嵌套的那个 `Branch` 类，按 M19 落成静态只读字段。

## constructor:(owner:IOwner, template:Template<string>)=>void

以负责人与模板创建，并把本类型的跳转队列取出来；本类没有重组队列。

原 C# 是 `public PreprocessorDirectives(IOwner owner, Template<char> template) : base(owner, template)`，体里只有 `ProcessQueue = template.BranchTemplate.Get(GetType(), null);`——`GetType()` 按 M17 写成 `this.constructor`。

```ts
super(owner, template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

指令正文（`#` 之后的字符逐个攒进来）。

原 C# 是 `public StringBuilder Tmp = new();`。按 §3.8，`StringBuilder` 在 ts 侧退化成字符串拼接，所以这里写成 `string`：`Tmp.Append(c)` → `this.Tmp += c`，`Tmp.Remove(Tmp.Length - 1, 1)` → `this.Tmp.slice(0, this.Tmp.length - 1)`。它只被本类读写，没有被别处当容器用，换成字符串不失语义。

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

## method ToXmlString:()=>string

产出 XML：`<PreprocessorDirectives>指令正文</PreprocessorDirectives>`。

原 C# 是 `$"<{Name}>{Tmp}</{Name}>"`，标签名用 `GetType().Name`（按 M17 换成 `this.constructor.name`），内容**不做 XML 转义**——这一处与 `BlockToken.ToXmlString` 的 `CommonUtil.XmlDecode` 不同，照抄即可。

```ts
const name = this.constructor.name;
return `<${name}>${this.Tmp}</${name}>`;
```

## method Undo:(source:Source<string>)=>void

回退一个字符。

原 C# 的判定用的是 `UnitToken<char>` 模式，而不是基类 `Token.Undo` 里的 `Token<char>`：覆盖该位置的子单元**是单元（`UnitToken`）**才把回退转交给它，否则从 `Tmp` 末尾删掉一个字符。照抄，不要「统一」成基类写法。

```ts
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit instanceof UnitToken) {
  undoUnit.Undo(source);
} else {
  this.Tmp = this.Tmp.slice(0, this.Tmp.length - 1);
}
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext<string>, source:Source<string>)=>void

跳转队列没接手时，把字符并进 `Tmp`。

原 C# 是 `protected override void Default(SyntaxContext<char> context, in Source<char> source)`。

```ts
this.Tmp += source.Value;
```

## private static method PreSourceIs:(source:Source<string>, onPredicate:(item:Source<string> | null)=>bool)=>bool

判断「`source` 之前那个非空白字符」是否满足 `onPredicate`。

规则照抄：先取前一个位置，若它是 `\r` 就再往前一个；然后不断跳过空格与制表符；最后把跳到的位置（可能是 `null`）交给判定器。

原 C# 是 `private static bool PreSourceIs(Source<char> source, Func<Source<char>?, bool> onPredicate)`。函数类型参数在本表的**最后一位**，所以按 M22 可以直接写 `(item:…)=>bool`，不必另立 `# type` 别名。

调用点是关键差别（§7.7 的同类规则）：C# 从实例方法里可以**裸调**同类静态方法 `PreSourceIs(...)`，ts 的静态成员必须限定，所以 `ExitOrPre` 里写成 `PreprocessorDirectives.PreSourceIs(...)`。

```ts
let pre = source.Pre();
if (pre !== null && pre.Value === "\r") {
  pre = pre.Pre();
}
while (pre !== null && (pre.Value === " " || pre.Value === "\t")) {
  pre = pre.Pre();
}
return onPredicate(pre);
```

## protected method ExitOrPre:(context:SyntaxContext<string>, source:Source<string>)=>BranchStates

遇到换行就退出——除非这个换行被 `\` 续行。

原 C# 的判定是 `source is { Value: '\n' } && PreSourceIs(source, item => item is { Value: '\\' }) == false`，即「当前是换行」且「换行之前那个非空白字符不是反斜杠」。退出时：若前一个字符是 `\r` 先把它回退掉（CRLF 的 `\r` 不该进指令正文），然后签出、关闭自己并跑重组、从父单元卸载，再插一条 `ReloadMessage` 让当前换行重新处理一遍，返回 `Done`；否则一律返回 `Undo`。

C# 的三参构造器 `new ReloadMessage<char>(Owner, this, source)` 按 M14(b) 走静态工厂 `ReloadMessage.WithoutProcessOwner`。

```ts
if (source.Value !== "\n") {
  return BranchStates.Undo;
}
if (PreprocessorDirectives.PreSourceIs(source, (item) => item !== null && item.Value === "\\")) {
  return BranchStates.Undo;
}
const pre = source.Pre();
if (pre !== null && pre.Value === "\r") {
  this.Undo(pre);
}
this.SignOut(source);
this.TryToClose();
this.Quit();
context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
return BranchStates.Done;
```

## method ToDictionary:()=>Map<string, any>

转成字典：只记类型名与指令正文，**没有** `children`。

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
const result = new PreprocessorDirectives(this.Owner, this.Template);
result.Sign(this);
result.Tmp += this.Tmp;
result.TryToClose();
return result;
```
