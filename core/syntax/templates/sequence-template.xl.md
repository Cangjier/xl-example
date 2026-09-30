# dependencies
```xl
import { Sequence } from "./sequence.xl.md"
```

# namespace cangjie

模板层：每个单元（token）的跳转与重组规则都从 `Template` 上取。

按单元类型给出规则序列，并把「算过一遍」的结果缓存起来。

# type ItemModifier = (item:any)=>void

「就地修改一个模板项」的委托。

# type DefaultValueResolver = (value:any)=>any

「由默认值推出实际序列」的委托。返回值允许是 `null`。

# type SequenceTemplateInitializer = (template:any)=>void

「拿序列模板做初始化」的委托。

# class SequenceTemplate<T>

按单元类型给出的规则序列。

派发以**类的构造器对象**为键：写类型时直接写类名，写实例时用 `x.constructor`。

`Get` 有两种用法：只给单元类型，或者再给一个默认值解析器。

## field DefaultValue:Sequence<T> | null = null

没有专门覆盖时使用的默认序列。`TextContext` 构造时会通过 `ParsePipeline.Install` 把
`BranchTemplate.DefaultValue` 设成通用跳转队列。

## field CoverData:Map<any, Sequence<T> | null> = new Map()

按单元类型的覆盖值。

## field BanedData:Array<T> = []

被禁用的序列项。

## field CompletedData:Map<any, Sequence<T> | null> = new Map()

已完成计算的序列缓存：同一个类型只算一次，且修改器只施加一次。

## field ModifyItem:Map<any, ItemModifier> = new Map()

按单元类型的就地修改器：给 `StringGuide.Branch` 额外加上反引号与单引号两个起始字符就是靠它。

## method Get:(target:any, onDefaultValue?:DefaultValueResolver | null)=>Sequence<T> | null

取某个单元类型对应的序列；算过就直接给缓存。

两种用法合并成一个带可选参数的方法。

**但两种用法不能靠「第二参是否为 `null`」区分**：显式传 `null` 表示「**不要默认队列**」；不传第二参时直接用默认序列，给了解析器则用解析器的返回值。
`String` 的构造器正是这么用的（第二参传 `null` → `ProcessQueue` 为 `null`，字符串内容才会走自己的 `Default` 去建 `ConstString`）。
若把显式 `null` 当成单参用法，`String` 会拿到通用队列，`Identifier` 就会在字符串内部开花。

因此这里用 `arguments.length` 区分「一个实参」与「两个实参」：一个实参走默认值，两个实参且显式传 `null` 就得 `null`。

有一处细微差别：单参用法在禁用表为空时也会走一次 `Removed([])`（产出一份副本），双参用法则直接存原对象。合并后统一走前者。两者的序列内容完全一致，只是对象身份不同，不影响语法树。

```ts
if (!this.CompletedData.has(target)) {
  const twoArg = arguments.length >= 2;
  const isCovered = this.CoverData.has(target);
  const raw = isCovered ? (this.CoverData.get(target) ?? null) : this.DefaultValue;
  const base = isCovered || !twoArg ? raw : (onDefaultValue == null ? null : onDefaultValue(raw));
  this.CompletedData.set(
    target,
    this.BanedData.length === 0 ? base : (base == null ? null : base.Removed(this.BanedData)),
  );
  const cached = this.CompletedData.get(target) ?? null;
  if (cached != null) {
    for (const item of cached.Data) {
      const modify = this.ModifyItem.get((item as any).constructor);
      if (modify !== undefined) {
        modify(item);
      }
    }
  }
}
return this.CompletedData.get(target) ?? null;
```

## method Set:(target:any, value:Sequence<T> | null)=>void

给某个单元类型设一份覆盖序列。

```ts
this.CoverData.set(target, value);
```

## method Ban:(Items:Array<T>)=>void

禁用若干序列项；之后算出的序列都会先移除它们。

注意它**不清空**已完成缓存。

```ts
this.BanedData.push(...Items);
```

## method AddModifyItem:(branchType:any, modify:ItemModifier)=>void

登记某个单元类型的就地修改器。

重复登记同一个类型会抛错：`Map.set` 本是静默覆盖，所以这里显式补上抛错。

```ts
if (this.ModifyItem.has(branchType)) {
  throw new Error("AddModifyItem: the branch type is already registered");
}
this.ModifyItem.set(branchType, modify);
```

## method Initialize:(onInitialize:SequenceTemplateInitializer)=>SequenceTemplate<T>

拿自身跑一遍初始化回调，然后返回自身。

```ts
onInitialize(this);
return this;
```
