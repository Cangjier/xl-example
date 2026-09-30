# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Document } from "../../../core/syntax/document.xl.md"
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

`PreprocessorDirectivesBranch` 写在 `PreprocessorDirectives` **之前**：后者的静态字段 `JumpIn` 在类定义时立即 `new PreprocessorDirectivesBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class PreprocessorDirectivesBranch extends Branch

它永远不进 `Data`、不进 XML。

## method IsWordChar:(item:string)=>bool

`item` 是不是标识符字符（字母、数字、`_`、`$`）——读指令名用。

```ts
if (item === "") {
  return false;
}
const code = item.charCodeAt(0);
const isDigit = code >= 48 && code <= 57;
const isUpper = code >= 65 && code <= 90;
const isLower = code >= 97 && code <= 122;
return isDigit || isUpper || isLower || item === "_" || item === "$";
```

## method FollowingWord:(document:Document, index:int)=>string

读 `index`（那个 `#`）后面紧跟的一个词：`#` 之后连续吃掉标识符字符，遇到别的字符就停。

`#!`（shebang）单算：`#` 后面紧跟 `!` 时直接返回 `"!"`。

**它管的是「这个 `#` 到底是不是预处理指令」**。TypeScript 的私有名写作 `#x` / `#m()`，
和 Cangjie 的 `#if` / `#region` 长得一样（都是 `#` 加一个词），唯一的分辨办法就是看那个词
是不是已知的指令名——所以这里要把词读出来交给 `DirectiveNames` 比。

```ts
let text = "";
let i = index + 1;
while (i < document.GetCount()) {
  const item = document.GetValue(i);
  if (item === "!" && text === "") {
    return "!";
  }
  if (this.IsWordChar(item)) {
    text += item;
    i = i + 1;
    continue;
  }
  break;
}
return text;
```

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

两条都成立才算「预处理指令」：

1. **行首的 `#`**：向前跳过空格与制表符之后，要么是换行符，要么已经走到文档开头；
2. **后面跟的是已知指令名**（`#if` / `#endif` / `#region` / `#define` …，见 `DirectiveNames`）。

第 2 条是**后加的**，也是必须的：只有第 1 条时，类体里行首的私有名 `#x = 1` 会被整段吃掉，
产物变成 `<PreprocessorDirectives>x = 1</PreprocessorDirectives>`——成员节点全丢
（实测 5 条用例，`decl-class-private-field` / `lex-private-field` / `lex-private-in` …）。

`Pre` 收一个 `Array<string>`，所以写 `source.Pre([" ", "\t"])`；它返回 `Source | null`，判定里直接用结果。

```ts
const pre = source.Pre([" ", "\t"]);
const result = new BranchConditionResult();
if (!((pre === null || pre.Value === "\n") && source.Value === "#")) {
  result.Success = false;
  return result;
}
const word = this.FollowingWord(source.Document, source.Index);
result.Success = PreprocessorDirectivesBranch.DirectiveNames().includes(word);
return result;
```

## static method DirectiveNames:()=>Array<string>

这套语言认的预处理指令名（`#` 后面那个词）。

它与 `../parse-pipeline.xl.md` 的 `KeyWords` 是一类东西——都属于「这套语言怎么解析」。
放在这里而不是 `ParsePipeline`，是因为它只被这一条分支用、改语言的成本是改一个数组；
真要多语言共用时，按 `KeyWords` 的样子挪到 `ParsePipeline` 里即可。

```ts
return ["if", "else", "elif", "endif", "define", "undef", "include", "region", "endregion", "error", "warning", "pragma", "line", "suppress", "!"];
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下这个 `#`：新建一个 `PreprocessorDirectives`，挂到 `unit` 上并签入。

```ts
unit.AddToMounted(new PreprocessorDirectives(unit.Template)).SignIn(source);
```

# class PreprocessorDirectives extends UnitToken

预处理指令单元。

单元值类型是单字符的 `string`。

它覆写了 `ToXmlString`，所以 XML 不走 `BlockToken` 那套转义：正文原样落在标签里。

## static readonly field JumpIn:PreprocessorDirectivesBranch = new PreprocessorDirectivesBranch()

把 `PreprocessorDirectivesBranch` 注册进 `Root` 的通用跳转队列用的实例。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来；本类没有重组队列。

取运行时类型用 `this.constructor`。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

指令正文（`#` 之后的字符逐个攒进来）。

`Tmp` 写成 `string`：它只被本类读写，没有被别处当容器用，所以拼接与截尾就是 `this.Tmp += c` 与 `this.Tmp.slice(0, this.Tmp.length - 1)`，换成字符串不失语义。

## method IsUndo:(source:Source)=>bool

能不能回退。范围已经签出（`SourceRange.End` 非空）就不能；否则看覆盖该位置的子单元，没有子单元时返回 `true`。

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

标签名取 `this.constructor.name`；内容**不做 XML 转义**——这一处与 `BlockToken.ToXmlString` 的 `CommonUtil.XmlDecode` 不同。

```ts
const name = this.constructor.name;
return `<${name}>${this.Tmp}</${name}>`;
```

## method Undo:(source:Source)=>void

回退一个字符。

判定用的模式是 `UnitToken`，而不是基类 `Token.Undo` 里的 `Token`：覆盖该位置的子单元**是单元（`UnitToken`）**才把回退转交给它，否则从 `Tmp` 末尾删掉一个字符。不要「统一」成基类写法。

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

## protected method Default:(context:SyntaxContext, source:Source)=>void

跳转队列没接手时，把字符并进 `Tmp`。

```ts
this.Tmp += source.Value;
```

## private static method PreSourceIs:(source:Source, onPredicate:(item:Source | null)=>bool)=>bool

判断「`source` 之前那个非空白字符」是否满足 `onPredicate`。

规则是：先取前一个位置，若它是 `\r` 就再往前一个；然后不断跳过空格与制表符；最后把跳到的位置（可能是 `null`）交给判定器。

函数类型参数在本表的**最后一位**，所以可以直接写 `(item:…)=>bool`，不必另立 `# type` 别名。

调用点要注意：静态成员必须限定，所以 `ExitOrPre` 里写成 `PreprocessorDirectives.PreSourceIs(...)`，不能裸调。

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

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到换行就退出——除非这个换行被 `\` 续行。

判定是「当前是换行」且「换行之前那个非空白字符不是反斜杠」。退出时：若前一个字符是 `\r` 先把它回退掉（CRLF 的 `\r` 不该进指令正文），然后签出、关闭自己并跑重组、从父单元卸载，再插一条 `ReloadMessage` 让当前换行重新处理一遍，返回 `Done`；否则一律返回 `Undo`。

插消息走静态工厂 `ReloadMessage.WithoutProcessOwner`。

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
context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
return BranchStates.Done;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Tmp` 追加到自身 → `TryToClose()`。

```ts
const result = new PreprocessorDirectives(this.Template);
result.Sign(this);
result.Tmp += this.Tmp;
result.TryToClose();
return result;
```
