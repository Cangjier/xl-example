# dependencies
```xl
import { SourceRange } from "./source-range.xl.md"
```

# namespace cangjie

语法层：单元（token）的字段。

# class TokenField<T>

**一个声明字段：值 + 它在源码里的区间**。

用户口径：像 `class` 那些 meta 信息（名字 / 修饰词 / 继承名单）**只用字段表达、不进 `Data`**，
但**区间不能丢**——区间是**另一个事实**，字段里那个值表达不了它。
于是把两样装在一起：`Value` 说「是什么」、`Range` 说「在哪」。

**为什么不做成两个平行字段**（`name` 配一个 `NameRange`）：那样「同一件事」有两格，
忘了同步其中一格时**编译期不会报错**（区间本来就是可空的），错到产物里才现形。
装进一个类之后，「值换了、区间忘了换」在代码里就是**看得见的两句**。

**为什么不是让字段直接持那个单元**：单元一旦留在 `Data` 里就是个 XML 子节点，
而 meta 信息进 `Data` 正是要避免的那件事。要的是**值 + 区间**这两样事实，不是那个节点本身。

## field Value:T

字段的值。

## field Range:SourceRange | null = null

该值在源码里的区间；还没有对应源码时是 `null`（与 `Token.SourceRange` 同一条口径：
「还没挂上去」这件事原样保留）。

## constructor:(value:T)=>void

以初始值创建；区间留给 `Set`。

```ts
this.Value = value;
```

## method Set:(value:T, range:SourceRange | null)=>TokenField<T>

当场写入值与该值的区间，返回自身（可以连着用）。

```ts
this.Value = value;
this.Range = range;
return this;
```

## method Text:()=>string

值的文本形态——给 XML 属性渲染用。

`Value` 是 `T`，`String(...)` 对这里用到的几种 `T` 都够用：
字符串给字符串本身、布尔给 `true` / `false`、`Array<string>` 给逗号串
（`String(["a","b"])` 就是 `"a,b"`，正是 XML 属性里要的那一种）。
要换别的分隔符时由调用方先拼好再塞进来。

```ts
return String(this.Value);
```

## property IsSet:bool

这一格**到底有没有被填过**。

判据是 `Range !== null`，不是「值不等于初值」：初值可能是 `0` / `""` / `false`
（`Try.CatchWord` 的 `-1` 是恰好挑的，但别的字段没有这种运气），
而 `Set` 一定同时写值与该值的区间 ⇒ **区间在 ⟺ 记过**。

给投影用的：`if (this.TryBrace.IsSet) { … }` 比「拿一个哨兵值与 `Value` 比大小」更难写错——
哨兵值是**第二份约定**，而区间是 `Set` 自己留下的。

### get

```ts
return this.Range !== null;
```

## method File:()=>int

值所在的**起点下标**；没记过时 `-1`。

`Value` 本身就是下标的那些字段（`TryBrace` / `CatchWord` / `Switch.BodyAt` …）
用得上；其它类型的 `T` 用 `IsSet` 判。

```ts
return this.Range === null || this.Range.Start === null ? -1 : this.Range.Start.Index;
```

## method Comment:(value:T, range:SourceRange | null)=>TokenField<T>

**就地重填**，语义与 `Set` 相同——只是名字说清了它的用途：
打包那一刻**手上正好有**更新的位置时，拿这一格去覆盖（`Set` 与它同义，
保留 `Set` 是因为既有调用点已经有一批）。

```ts
return this.Set(value, range);
```

## static method At:(range:SourceRange | null)=>TokenField<int>

从**一段区间**造一格：值取起点下标、区间原样收下；区间为空时给「没记过」那一格。

`TokenField<number>` 的初值是 `-1`（见 `Try` 的四个字段）——这一支把那套写法收成一句。

```ts
const result = new TokenField<number>(-1);
if (range !== null && range.Start !== null) {
  result.Set(range.Start.Index, range);
}
return result;
```
