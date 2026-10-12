# dependencies
```xl
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./context.xl.md"
import { Template } from "./template.xl.md"
```

# namespace cangjie

# method EscapeXmlText:(text:string)=>string

把正文里那三个字符转义，好让 XML 里只有一个意思。

```ts
return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
```

# class Token

语法树的地基。

## field Template:Template

本单元使用的模板。

## field Parent:Token | null = null

父单元。

## field Data:Array<Token> = []

子单元。

## field MountedUnit:Token | null = null

当前挂载的子单元：非空时本单元把 `Process` 直接转给它（设计 §3 的 C1：字符经向导转给子单元）。

## field Closed:bool = false

本单元是否已关闭。

## field Start:int = -1

起点（含）。

## field End:int = -1

终点（含）；没签过出就是 `-1`。

## field Text:string = ""

本单元自己的那一份正文；词法单元在关闭那一刻写好，容器留空。

## field Tag:string

这一格的标签，**构造时赋好**：`this.constructor.name` 在构造这一刻就是那一页的类名。

```ts
this.constructor.name
```

## constructor:(template:Template)=>void

以模板创建。

```ts
this.Template = template;
```

## method Add:(item:Token)=>Token

收一个子单元并认下父亲。

```ts
item.Parent = this;
this.Data.push(item);
return item;
```

## method AddRange:(items:Array<Token>)=>void

整批收下。

```ts
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  item.Parent = this;
  this.Data.push(item);
}
```

## method AddToMounted:(item:Token)=>Token

挂载一个子单元：从这一刻起，本单元手上的字符全部转给它（C1）。

```ts
item.Parent = this;
this.MountedUnit = item;
return item;
```

## method Quit:()=>void

卸载当前挂载的子单元。

**只清挂载、不动父亲**：挂载进来的单元同时也是本单元的子单元（见 `Mount`），
所以它指着的父亲是树的真父亲，不能因为「字符不再转给它」就改掉。

```ts
this.MountedUnit = null;
```

## method Mount:(item:Token)=>Token

**挂载**（设计 §3 的 C1）：既把它收成子单元，又把字符转给它——两件事一起做才叫挂上去了。

```ts
this.Add(item);
return this.AddToMounted(item);
```

## method RemoveSelf:()=>void

从父亲的子单元表里摘掉自己（设计 §4 exit 的最后一步）。

```ts
const parent = this.Parent;
if (parent === null) return;
const at = parent.Data.indexOf(this);
if (at >= 0) parent.Data.splice(at, 1);
this.Parent = null;
```

## method ReplaceInParent:(next:Token)=>void

让 `next` 顶掉自己在父亲里的位置。

**形状收敛就落在这里**：向导解出唯一形状之后，它的位置由那个形状的 token 接管，向导自己退场。

```ts
const parent = this.Parent;
if (parent === null) return;
const at = parent.Data.indexOf(this);
next.Parent = parent;
if (at >= 0) {
  parent.Data[at] = next;
} else {
  parent.Data.push(next);
}
this.Parent = null;
```

## method MoveDataTo:(target:Token)=>void

把所有子单元搬给 `target`，然后清空自己的（设计 §4 exit）。

```ts
const items = this.Data;
this.Data = [];
target.AddRange(items);
```

## method SignIn:(source:Source)=>void

签入：记下起点。

```ts
this.Start = source.Index;
```

## method SignOut:(source:Source)=>void

签出：记下终点。

```ts
this.End = source.Index;
```

## method TryToClose:(context:SyntaxContext, source:Source)=>void

关闭自己，然后**往上通知**一次（§4 的 converge 触发点）。

```ts
this.Close();
this.NotifyClosed(context, source);
```

## protected method Close:()=>void

基类这一档只把 `Closed` 置真（可见性是 protected：`Close` 是「收自己的尾」，只有 `TryToClose` 这一条路会走到它）；子类覆写它来补自己的收尾（写正文、签出）。

```ts
this.Closed = true;
```

## method NotifyClosed:(context:SyntaxContext, source:Source)=>void

沿 `Parent` 往上走，**第一个答 `true` 的祖先吃掉这次关闭**。

```ts
let owner = this.Parent;
while (owner !== null) {
  if (owner.OnChildClosed(this, context, source)) return;
  owner = owner.Parent;
}
```

## method OnChildClosed:(child:Token, context:SyntaxContext, source:Source)=>bool

「我接手这次关闭」的默认档：**不接手**。

覆写它的只有 catalog guide（`LanguageCatalogGuideToken`）与挂载方（reader）——
基类不接手是有意的：除了它们，别的单元都不该因为「下面关了一个」而改变自己。

```ts
return false;
```

## method ClaimedByAncestor:(source:Source)=>bool

**这个字符是不是我上面某一层的**：是的话我不许吃它。

给挂载链最里面那些单元用：闭符号归外面那一对括号，字符串的收口归字符串自己——
它们每收一个字符都要往上问一遍。

```ts
let owner = this.Parent;
while (owner !== null) {
  if (owner.Owns(source)) return true;
  owner = owner.Parent;
}
return false;
```

## method ClosesAtEnd:()=>bool

**输入结束时，我这一格该不该被收口**：词法单元（正在攒正文的那几格）答真——
最后一个字符吃完之后没有人再来关它们，所以收口那一趟（`CloseChain`）必须把它们关掉，
否则它们攒的那一段正文既不会落地、也不会触发收敛。

形状与向导答假：它们的收口走的是构造结束事件（`Finish`），不是被当成词法单元关掉。

```ts
return true;
```

## method TakeLeading:(item:Token)=>void

**这一格构造带走的那一格**（左邻）：默认就当子单元收下。

形状 reader 覆写它——被带走的那一格要排在**内容之前**（调用的被调用者、下标的被下标者），
而判别事件那一格排在**内容之后**，两者都不该跟内容混在一张表里排队。

```ts
this.Add(item);
```

## method InProduct:()=>bool

**我这一格进不进产物**（设计 §3 的 C6：不进产物的单元**必须显式声明**这一点）。

基类给真；`LanguageCatalogGuideToken` 覆写成假——于是「向导没有产物节点」这句话
在类型与代码里都找得到，而不是靠读者记得。

```ts
return true;
```

## method GuideResolved:(context:SyntaxContext, source:Source)=>void

**形状收敛出来了**（向导 resolve 之后掉过头来叫这一声）。

没有括号那一对的 reader（「值」那一族）就是靠这一声当场搬完、把位置让给形状；
有括号那一对的 reader 要等括号关上（那一趟走 OnChildClosed）。

## method Process:(context:SyntaxContext, source:Source)=>bool

处理一个字符：有挂载单元就转给它；**它没吃**（多半是它刚关掉自己）就卸下来，
我自己接着问这个字符。

返回值见类正文第 1 条。

```ts
const unit = this.MountedUnit;
if (unit !== null) {
  if (unit.Process(context, source)) return true;
  if (unit.Closed) this.Quit();
}
return this.ProcessChar(context, source);
```

## method ProcessChar:(context:SyntaxContext, source:Source)=>bool

「我自己怎么处理这个字符」的默认档：**不认**。

```ts
return false;
```

## method Owns:(source:Source)=>bool

这个字符是不是归我。基类恒假。

**它是给「挂在别人下面」的单元用的**：一个容器一旦把字符转给挂载单元，自己就看不见字符了，
所以挂载单元每收一个字符都要往上问一遍「这个字符是不是你的」——归上面的，就当场让开。

```ts
return false;
```

## method Finish:(context:SyntaxContext, source:Source)=>void

**构造结束事件**：沿挂载链往下传一趟。

输入结束时由驱动方调一次；还开着、池还 > 1 的向导在这一趟里判自己那一格（§5 第二种失败）。

```ts
const unit = this.MountedUnit;
if (unit !== null) unit.Finish(context, source);
```

## method Attrs:()=>string

本单元开标签上的**额外**属性（`range` 不算，那一格由 `ToXmlString` 统一给）；默认没有。

```ts
return "";
```

## method ToXmlString:()=>string

产出 XML：标签是运行时类型名，开标签上带 `range` 与子类自己的属性，内容是子单元的 XML
串接；一个子单元都没有时，正文就是 `Text`（词法单元走这一档）。

```ts
const range = " range=\"[" + this.Start + "," + this.End + "]\"";
const attrs = this.Attrs();
const head = attrs === "" ? this.Tag + range : this.Tag + range + " " + attrs;
const kids = this.Data;
if (kids.length === 0) {
  if (this.Text === "") return "<" + head + " />";
  return "<" + head + ">" + EscapeXmlText(this.Text) + "</" + this.Tag + ">";
}
const parts: string[] = [];
for (let i = 0; i < kids.length; i++) parts.push(kids[i].ToXmlString());
return "<" + head + ">" + parts.join("") + "</" + this.Tag + ">";
```

## method FormatXml:()=>string

**缩进形态**：每个元素一行、按嵌套缩进两格，只有正文没有子元素的叶子留在同一行。

它只动标签之间的空白，不改标签与属性值。

```ts
const lines: string[] = [];
FormatInto(this, 0, lines);
return lines.join("\n");
```

# method FormatInto:(unit:Token, depth:int, lines:Array<string>)=>void

把一个单元写进 `lines`：有子单元就自己占一行、子单元缩进两格；没有子单元就整格占一行。

```ts
const pad = "  ".repeat(depth);
const xml = unit.ToXmlString();
if (unit.Data.length === 0) {
  lines.push(pad + xml);
  return;
}
const open = xml.indexOf(">");
lines.push(pad + xml.substring(0, open + 1));
for (let i = 0; i < unit.Data.length; i++) {
  FormatInto(unit.Data[i], depth + 1, lines);
}
lines.push(pad + "</" + unit.Tag + ">");
```
