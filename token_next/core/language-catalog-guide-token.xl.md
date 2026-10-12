# dependencies
```xl
import { ConvergenceException } from "./convergence-exception.xl.md"
import { LanguageShapeToken } from "./language-shape-token.xl.md"
import { MountFor } from "./lexeme.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./context.xl.md"
import { Template } from "./template.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

**catalog guide**（设计 §3）：状态是一格**可能形状池**，输入是它自己 data 里积压的**已关闭 token**，
输出是**收敛成唯一形状**。

§3 那六条契约逐条落在哪一格：

| # | 契约 | 落在哪 |
| --- | --- | --- |
| C1 | 挂载在树里 | 它是真单元：被 reader 挂载，字符经它转给子单元（`ProcessChar` → `MountFor`） |
| C2 | 池的初始值由挂它的那个 shape 声明 | 构造器收一个 `pool`；算它的是 `LanguageToken.DeclareShape`，调用方是挂载方 |
| C3 | 只读自己那一部分 | `Converge` 只吃「刚关掉的那一格」与自己的 `Pool` / `Data` / `Events`；一次都不回原文读没读到的字符 |
| C4 | 收敛是纯的 | `Converge` 只返回一个新池：不改树、不建单元、不关别人 |
| C5 | 池单调不增 | 池只有一个改写点（`OnChildClosed`），且只由 `Converge` 的返回值覆盖 |
| C6 | 不进产物 | `InProduct` 答 `false`（**显式声明**），而且它一次都不进 `Data`——只被挂载 |

**它不是识别器，是排除器**（§3.1）：识别是排除到只剩一个之后的副产品，
单调性因此是构造出来的。

# class LanguageCatalogGuideToken extends Token

## field Pool:Array<string> = []

**可能形状池**：这一步还说不死它是哪一种形状。

初始值是**最保守的完全集合**（C5）——由挂载方声明（C2），不是这里猜的。

## field Shape:LanguageShapeToken | null = null

收敛到的那一格（§4 的 resolve **建出**它）。

建出来 ≠ 已经搬完：搬运是 exit 那一步（见 `LanguageShapeToken.FinishConstruct`）。

## field Events:Array<string> = []

每一次收敛各收掉了什么——**它是证据**，池 = 0 时整条一起报出去（§5 第一种失败）。

## field Reader:LanguageShapeToken | null = null

挂我的那一格 reader（有括号那一对时我的父亲是括号，所以另存一份——`GuideResolved` 要叫到它）。

## field Owner:string = ""

挂我的那一格 reader 的标签（只给证据用，`Tag` 在这里是类名，看不出是谁的向导）。

## field Ended:bool = false

构造结束事件来过没有。

## field Unresolved:bool = false

**构造结束仍 > 1**（§5 第二种失败）：池太宽，或缺一条判别事件。

## constructor:(template:Template, pool:Array<string>)=>void

以模板与挂载方声明的池创建。

```ts
super(template);
this.Pool = pool;
```

## method ClosesAtEnd:()=>bool

形状与向导不由「收口那一趟」关掉（见 `Token.ClosesAtEnd`）。

```ts
return false;
```
## method InProduct:()=>bool

**C6 的显式声明**：向导不进产物。

```ts
return false;
```

## method MountContent:(context:SyntaxContext, source:Source)=>bool

**我这一格的内容挂什么**：默认按 `MountFor`（里面还能再开形状）。

值那一族覆写它——它的内容只是一段正文（见 `MountLexeme`）。

```ts
return MountFor(this, context, source);
```

## method Converge:(closed:Token, source:Source)=>Array<string>

**收敛形状函数**（§3.1）：`converge(guide, 可能形状池) -> 可能形状池`。

输入是「刚关上的那一格 + 当前池」，输出是缩小（或不变）之后的池。

**必须纯**（C4）：不许改树、不许建单元、不许关别人。基类给恒等——排除器由语言层实现。

```ts
return this.Pool;
```

## method ConvergeEnd:()=>Array<string>

**结束事件那一次收敛**：有些格只有「构造结束」才能判——§5 第二种失败那一句「需要『构造结束』事件才能判」
说的就是这一格。

默认给恒等，由语言层覆写；它与 `Converge` 一样必须是纯的（C4）。

```ts
return this.Pool;
```

## method Exclude:(name:string)=>Array<string>

排除器用的一格小机件：从池里去掉一个名字。

去掉之后可能是**空池**——那一档由调用点当场报证据（§5 第一种失败），这里不替它兜底。

```ts
const next: string[] = [];
for (let i = 0; i < this.Pool.length; i++) {
  if (this.Pool[i] !== name) next.push(this.Pool[i]);
}
return next;
```

## method OnChildClosed:(child:Token, context:SyntaxContext, source:Source)=>bool

**关闭触发收敛**（§4 的 converge）：这是池**唯一**的改写点。

三件事，次序就是设计里的次序：先收敛、再看要不要 resolve、最后把这一次记成证据。
清空到 0 的那一档当场抛证据（§5 第一种失败）。

```ts
if (this.MountedUnit === child) this.Quit();
if (this.Ended) return true;
const before = this.Pool;
const after = this.Converge(child, source);
this.Pool = after;
this.Events.push(this.Describe(child, before, after));
if (after.length === 0) throw ConvergenceException.PoolEmptied(before, child, this.Events);
if (after.length === 1 && this.Shape === null) this.Resolve();
if (this.Shape !== null && this.Reader !== null) this.Reader.GuideResolved(context, source);
return true;
```

## method Describe:(child:Token, before:Array<string>, after:Array<string>)=>string

一次收敛的证据行。

```ts
return "关闭 " + child.Tag + " ⇒ 池 [" + before.join(",") + "] → [" + after.join(",") + "]";
```

## method Resolve:()=>void

**池 == 1 → 建出那个形状的 token**（§4 的 resolve）。

```ts
const name = this.Pool[0];
const language = this.Template.Language;
if (language === null) return;
this.Shape = language.BuildShape(name, this.Template);
```

## method Finish:(context:SyntaxContext, source:Source)=>void

**构造结束事件**（§5 第二种失败）沿挂载链传到这里：判一次自己这一格。

```ts
this.Judge(context, source);
```

## method Judge:(context:SyntaxContext, source:Source)=>void

结束事件本体：池已经收敛的就什么都不用做；**还 > 1** 的记一笔带证据的账，并留下
「产物里这一格没有收敛」这个事实（不猜、也不挑一个看起来顺眼的）。

```ts
if (this.Ended) return;
this.Ended = true;
const after = this.ConvergeEnd();
if (after.length === 0) throw ConvergenceException.PoolEmptied(this.Pool, this, this.Events);
this.Pool = after;
if (this.Shape === null && this.Pool.length === 1) this.Resolve();
if (this.Shape !== null) {
  if (this.Reader !== null) this.Reader.GuideResolved(context, source);
  return;
}
if (this.Pool.length <= 1) return;
this.Unresolved = true;
const history = this.Events.length === 0 ? "(一次收敛都没有)" : this.Events.join(" / ");
context.Note(
  "构造结束仍 > 1（池太宽，或缺一条判别事件）—— 挂我的形状=" + this.Owner +
  "; 池=[" + this.Pool.join(",") + "]; 收敛事件=" + history
);
```

## method ProcessChar:(context:SyntaxContext, source:Source)=>bool

**字符经它转给子单元**（C1）：把字符交给 `MountFor`。

「这个字符是不是我上面某一层的」（闭符号归上面那一对括号）这一问在 `MountFor` 的第一句里，
这里不再自己问一遍——两处各问一次就是两处会漂的判据。

```ts
if (this.Closed) return false;
return this.MountContent(context, source);
```
