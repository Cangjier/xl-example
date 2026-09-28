# dependencies
```xl
import { IOwner } from "./i-owner.xl.md"
import { IReleasable } from "./i-releasable.xl.md"
```

# namespace cangjie

`IOwner` 的默认实现：用一个数组收集资源，`Release` 时逐个释放并清空。

# class Owner implements IOwner, IReleasable

默认资源持有者。

原 C# 侧还实现 `IDisposable`（`Dispose` 转调 `Release`）。xl 的 `implements` 只能列规范内声明的接口——BCL 接口属于目标语言细节，写在这段正文里；`Dispose` 本身仍是规范内的成员，所以行为不丢。

## field Releasables:Array<IReleasable> = []

已登记的资源。原 C# 侧是 `List<IReleasable> Releasables { get; private set; } = new()`。

## method Add:(items:Array<IReleasable>)=>IOwner

把 `items` 追加进 `Releasables`，返回 `this`。

```ts
this.Releasables.push(...items);
return this;
```

## method Release:()=>void

逐个释放已登记的资源，然后清空列表。

释放是顺序进行的，不做异常收敛：任何一个 `Release` 抛出都会中断后续释放，列表也不会被清空。

```ts
for (const item of this.Releasables) {
  item.Release();
}
this.Releasables = [];
```

## method Dispose:()=>void

`Dispose` 是 `Release` 的别名，供 `IDisposable` 调用。

```ts
this.Release();
```
