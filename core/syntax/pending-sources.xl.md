# dependencies
```xl
import { ProcessSource } from "./process-source.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

位置缓冲：一段**还不知道形状**的源码位置，先攒着，等形状定了再决定交给谁。

**它的归属是 `GuideToken.Pending`** ✓（用户口径：`PendingSources` 应该是 `GuideToken` 的字段，
用于当形状不明朗时先缓存）✓——所以任何向导要缓存时都用**继承来的那一个** ✓，
不要各自再手写一份 `Items:Array<Source>` ✗。

它原先就是从这一族向导里那三个手写数组抽出来的（`InterpolationGuide` / `InterpolationExitGuide` /
`RawQuoteExitGuide` 各写了一份）：**攒着 → 定了就提交、没定就交还**。
攒本身没有价值，两个出口才是——`CommitTo` 把手里的位置按序喂给一个单元，
`GiveBackTo` 把它们按序插回位置队列交给另一个处理者。

**两条路都保持原始次序**，而 `GiveBackTo` 是唯一容易写错的地方：往队首插，就得**倒着插**才排得回原序（见那一处的说明）。次序错了不会报错，只会让同一段源码被两个单元各读一半——属于本仓最忌讳的静默错值。

本类不持有「我是谁的缓冲」这类身份信息，也不判断形状：判定归调用它的向导，这里只负责**记位置**与**把位置原样送出去**。

# class PendingSources

位置缓冲。

## field Items:Array<Source> = []

已经攒下的位置，按遇到顺序排列。

## property Data:Array<Source>

缓冲里的位置列表本身。

只读出口，给「按序走一遍」的调用方（`for (const item of pending.Data)`）用。

### get

```ts
return this.Items;
```

## property Count:int

缓冲里有多少个位置。

### get

```ts
return this.Items.length;
```

## property First:Source | null

第一个位置；空缓冲给 `null`。

给「提交时要拿哪一个位置签入」用——那总是**第一个**位置，不是当前这个字符。

### get

```ts
if (this.Items.length === 0) {
  return null;
}
return this.Items[0];
```

## property Last:Source | null

最后一个位置；空缓冲给 `null`。

### get

```ts
if (this.Items.length === 0) {
  return null;
}
return this.Items[this.Items.length - 1];
```

## method Append:(source:Source)=>void

记下一个位置。

```ts
this.Items.push(source);
```

## method Clear:()=>void

清空缓冲。

两个出口都会自己清空，所以这个入口是给「攒了一半又决定整段丢掉」的调用方用的。

```ts
this.Items.length = 0;
```

## method CommitTo:(context:SyntaxContext, unit:Token)=>void

把缓冲**按序**喂给 `unit`，然后清空。

喂的是**已经攒下的位置**，所以调用方必须先保证 `unit` 已经挂好、而且这批位置不会再被自己接走一遍——否则同一段源码会被读两次。

正着走一遍就够了：`Process` 是同步的，喂完第一个才轮得到第二个。

```ts
for (const item of this.Items) {
  unit.Process(context, item);
}
this.Items.length = 0;
```

## method GiveBackTo:(context:SyntaxContext, owner:Token)=>void

把缓冲**按序**交还给 `owner`：逐个插到位置队列的**队首**。

**必须倒着插**：队列是「从队首取」，要让 `s0 s1 s2` 按这个次序被处理，就得按 `s2` → `s1` → `s0` 的顺序插。正着插会得到 `s2 s1 s0`——**这是本类唯一容易写错的地方**，而且它不报错，只是把一段源码的顺序倒过来。

`ReloadMessage` 干的是同一件事，但一件只针对**当前这一个**字符；这里是整段缓冲，所以直接进 `SourceQueue`，不绕消息队列。

```ts
for (let i = this.Items.length - 1; i >= 0; i--) {
  context.SourceQueue.splice(0, 0, new ProcessSource(owner, this.Items[i]));
}
this.Items.length = 0;
```
