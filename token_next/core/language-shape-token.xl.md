# dependencies
```xl
import { Bracket } from "./bracket.xl.md"
import { LanguageCatalogGuideToken } from "./language-catalog-guide-token.xl.md"
import { MountFor } from "./lexeme.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./context.xl.md"
import { Template } from "./template.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

**形状 token**（设计 §1 的树里那两格之一；另一格是 catalog guide）。

这一页上有**两种身份**，靠 `Pool` 分：

- **reader**（`Pool` 非空）：一族形状的入口。构造时按挂载方声明的池**创建并挂上向导**，
  自己只管那一对括号（有的话）与最后那一步搬运。
- **形状**（`Pool` 空）：池里的一格，**它出产物**——`Tag` 就是形状名。

§4 那四步落在这里：

| 步 | 落在哪 |
| --- | --- |
| create | 构造器：按池建向导（reader 才有） |
| converge | 见向导（`LanguageCatalogGuideToken.OnChildClosed`） |
| resolve | 见向导（`Resolve` 建出形状） |
| exit | `FinishConstruct`：向导的数据搬给形状、reader 退出树 |

# class LanguageShapeToken extends Token

## field Pool:Array<string> = []

挂载方声明的池（C2）。空池 = 我是池里的一格（形状），不是 reader。

## field Guide:LanguageCatalogGuideToken | null = null

我的向导（reader 才有）。

## field Pair:Bracket | null = null

我那一对括号（reader 且 `Open` 非空时才有）。

**括号自己不进产物**：它是「这一对」这件事本身，内容与左邻才是这个形状的子单元。

## field OpenSymbol:string = ""

开符号；空串表示这一族没有括号那一对（如「值」那一族：它就是一段正文）。

## field CloseSymbol:string = ""

闭符号。**由语言层直接给**，不查配对表——插值洞的 `${` 是多格开符号，表里没有它。

## field Opened:bool = false

开符号认满了没有。

## field Constructed:bool = false

exit 那一步走过没有（走过就不再搬第二遍）。

## field Ended:bool = false

构造收口了没有（闭符号到了，或者输入结束了）。

## constructor:(template:Template, pool:Array<string>)=>void

以模板与挂载方声明的池创建。

```ts
super(template);
this.Pool = pool;
if (pool.length > 0) {
  const guide = this.CreateGuide(template, pool);
  guide.Owner = this.Tag;
  guide.Reader = this;
  this.Guide = guide;
}
```

## method CreateGuide:(template:Template, pool:Array<string>)=>LanguageCatalogGuideToken

**这一族用哪个向导**：默认给基类那个「什么都不排除」的向导；每一族覆写它来交出自己的排除器。

```ts
return new LanguageCatalogGuideToken(template, pool);
```

## method GuideResolved:(context:SyntaxContext, source:Source)=>void

向导收敛出来了（`LanguageCatalogGuideToken` 叫的这一声）。

**没有括号那一对的 reader 在这里收工**：值那一族的构造只有一段正文，正文一关、形状一收敛，
它就当场搬完、把位置让给形状——晚一步，紧跟其后的 `(` 就会被挂进「值」里面去（`f(` 的 `(`）。

有括号那一对的 reader 不在这里收工：它的构造要等括号关上。

```ts
if (this.OpenSymbol === "" || this.Ended) this.FinishConstruct(context, source);
```

## field Leading:Token | null = null

**被这一格构造带走的那一格**（左邻：调用的被调用者、下标的被下标者）。

它不进 `Data`：`Data` 里排的是**内容**，而这一格要排在内容**之前**。

## method TakeLeading:(item:Token)=>void

记下左邻，次序见 `Leading` 那一格。

```ts
item.Parent = this;
this.Leading = item;
```

## method ClosesAtEnd:()=>bool

形状不由「收口那一趟」关掉（见 `Token.ClosesAtEnd`）：它的收口走构造结束事件。

```ts
return false;
```

## method Use:(open:string, close:string)=>LanguageShapeToken

配好这一族的那一对括号。

**没有括号那一对时给两个空串**：那时字符直接进向导，所以顺手把向导挂上。

```ts
this.OpenSymbol = open;
this.CloseSymbol = close;
if (open === "") this.MountGuide(this);
return this;
```

## method MountGuide:(holder:Token)=>void

把向导挂到 `holder` 上。

**只挂载、不收成子单元**——C6：向导不进产物。挂载点决定「谁是我的上面一层」：
有括号时是括号（闭符号先归括号），没括号时是 reader 自己。

```ts
const guide = this.Guide;
if (guide !== null) holder.AddToMounted(guide);
```

## method MountPair:()=>Bracket

造出这一对括号并挂上，同时把向导挂到括号上。

```ts
const pair = new Bracket(this.Template);
pair.Use(this.OpenSymbol);
pair.CloseSymbol = this.CloseSymbol;
pair.Parent = this;
this.Pair = pair;
this.AddToMounted(pair);
this.MountGuide(pair);
return pair;
```

## method ProcessChar:(context:SyntaxContext, source:Source)=>bool

reader 自己的两档：**没有括号那一对的**直接往向导里挂；**有括号那一对的**只认开符号那一格，
开起来之后字符全归挂载链（括号 → 向导）。

```ts
if (this.OpenSymbol === "") {
  if (this.Guide !== null) return false;
  return MountFor(this, context, source);
}
if (this.Ended) return MountFor(this, context, source);
if (this.Opened) return false;
if (source.Value !== this.OpenSymbol.charAt(0)) return false;
this.Opened = true;
this.SignIn(source);
const pair = this.MountPair();
return pair.Process(context, source);
```

## method OnChildClosed:(child:Token, context:SyntaxContext, source:Source)=>bool

**这一格的构造收口了**：闭符号归了括号，括号关掉时通知到 reader 这里。

reader 是挂载方，所以它接手这次关闭（返回 `true`）：对上面那一层来说，整个构造是**一格**。

```ts
if (this.MountedUnit === child) this.Quit();
const guide = this.Guide;
if (child === this.Pair) {
  this.Ended = true;
  this.SignOut(source);
  if (guide !== null && guide.Shape === null && guide.Pool.length > 1) return true;
  this.FinishConstruct(context, source);
  return true;
}
if (this.Ended && guide !== null) {
  guide.OnChildClosed(child, context, source);
  this.FinishConstruct(context, source);
}
return true;
```

## method Finish:(context:SyntaxContext, source:Source)=>void

**输入结束了**（构造结束事件）：还没收口的构造在这里收口（§5 第二种失败就在这一趟里判），
再往下传。

```ts
if ((this.OpenSymbol === "" || this.Opened) && !this.Constructed) this.FinishConstruct(context, source);
const unit = this.MountedUnit;
if (unit !== null) unit.Finish(context, source);
```

## method FinishConstruct:(context:SyntaxContext, source:Source)=>void

**§4 的 exit**：向导判一次结束，把攒下来的单元搬给收敛出来的那一格，自己退出树。

池没收敛（`Shape` 为空）时**什么都不搬**：产物里留下的是未经收敛的那一串单元——
这正是 §5 第三种失败（池 = 1 但是错的）要人去看现场的地方，所以不替它挑一个看起来顺眼的形状。

```ts
if (this.Constructed) return;
this.Constructed = true;
const guide = this.Guide;
if (guide === null) return;
guide.Judge(context, source);
const shape = guide.Shape;
if (shape === null) return;
if (this.Leading !== null) shape.Add(this.Leading);
shape.AddRange(guide.Data);
shape.AddRange(this.Data);
guide.Data = [];
if (this.Start < 0 && shape.Data.length > 0) {
  shape.Start = shape.Data[0].Start;
  shape.End = shape.Data[shape.Data.length - 1].End;
} else {
  shape.Start = this.Start;
  shape.End = this.End;
}
const parent = this.Parent;
if (parent === null) return;
guide.Closed = true;
this.Closed = true;
this.ReplaceInParent(shape);
if (parent.MountedUnit === this) parent.MountedUnit = null;
parent.OnChildClosed(shape, context, source);
```

## method Attrs:()=>string

读者不吐属性（它不进产物）；形状这一档留空，由各形状自己覆写。

```ts
return "";
```
