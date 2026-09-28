# namespace cangjie

模板层：每个单元（token）的跳转与重组规则都从 `Template` 上取。

# class Sequence<T>

序列：一个有序的元素集合。

原 C# 侧的多组成员都成对重载（`params T[]` 与 `IEnumerable<T>`）。xl 同一类型内不允许成员重名（`E1205`），按 M14(a) 每对合并成一个 `Array<T>` 参数的方法——在 ts 里两者本来就是同一种东西。

## field Data:Array<T> = []

序列内容。

## constructor:(items?:Array<T>)=>void

以初始元素创建；不传则为空序列。

原 C# 签名是 `Sequence(params T[] items)`。

```ts
this.Add(items ?? []);
```

## method Add:(items:Array<T>)=>Sequence<T>

追加一个或多个元素，返回自身。

原 C# 是两个重载：`Add(params T[] items)` 与 `Add(IEnumerable<T> items)`。

```ts
this.Data.push(...items);
return this;
```

## method Contains:(item:T)=>bool

是否包含某个元素。按引用比较（C# `List<T>.Contains` 用默认相等比较器，ts `includes` 对对象同样是引用比较）。

```ts
return this.Data.includes(item);
```

## method Remove:(item:T)=>void

移除第一个相等的元素。

```ts
const index = this.Data.indexOf(item);
if (index >= 0) {
  this.Data.splice(index, 1);
}
```

## method Removed:(items:Array<T>)=>Sequence<T>

移除多个元素，返回**新**序列，自身不变。

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
for (const item of items) {
  result.Remove(item);
}
return result;
```

## method Added:(items:Array<T>)=>Sequence<T>

追加多个元素，返回**新**序列，自身不变。

原 C# 是两个重载：`Added(IEnumerable<T>)` 与 `Added(params T[])`。

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
result.Add(items);
return result;
```

## method InsertedBefore:(item:T, items:Array<T>)=>Sequence<T>

在 `item` 之前插入多个元素，返回**新**序列。

原 C# 是两个重载：`InsertedBefore(T item, IEnumerable<T>)` 与 `InsertedBefore(T item, params T[])`。

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
const index = result.Data.indexOf(item);
result.Data.splice(index, 0, ...items);
return result;
```

## method InsertedBeforeWhere:(items:Array<T>, predicate:(item:T)=>bool)=>Sequence<T>

在**第一个满足 `predicate` 的元素**之前插入多个元素，返回新序列。

原 C# 签名是 `InsertedBefore<T1>(IEnumerable<T> items)`，内部用 `Data.FindIndex(i => i is T1)`；另一个重载 `InsertedBefore<T1>(params T[] items)` 与之同类，一并合并。ts 的泛型被擦除，无法写 `i is T1`，按 M18 把「类型测试」换成判定器参数。

参数顺序与 C# 相反（判定器在后），这是 M22 的要求：xl 的解析器把 `=>` 里的 `>` 误当泛型收尾符（M21），参数表里不直接写函数类型。

原 C# 在找不到匹配元素时 `index` 为 `-1`，`InsertRange(-1, …)` 会抛 `ArgumentOutOfRangeException`；ts 的 `splice(-1, …)` 会插到倒数第一个元素之前，语义不同，所以这里显式抛出等价的错误。

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
const index = result.Data.findIndex(predicate);
if (index < 0) {
  throw new Error("InsertedBeforeWhere: no element matched the predicate");
}
result.Data.splice(index, 0, ...items);
return result;
```

## method InsertedAfter:(item:T, items:Array<T>)=>Sequence<T>

在 `item` 之后插入多个元素，返回**新**序列。

原 C# 是两个重载：`InsertedAfter(T item, IEnumerable<T>)` 与 `InsertedAfter(T item, params T[])`。

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
const index = result.Data.indexOf(item);
result.Data.splice(index + 1, 0, ...items);
return result;
```
