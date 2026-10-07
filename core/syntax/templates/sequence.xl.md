# namespace cangjie

模板层：每个单元（token）的跳转与收尾规则都从 `Template` 上取。

# class Sequence<T>

序列：一个有序的元素集合。

xl 同一类型内不允许成员重名（`E1205`），所以成对的「多个元素」入口合并成一个 `Array<T>` 参数的方法——在 ts 里两者本来就是同一种东西。

## field Data:Array<T> = []

序列内容。

## constructor:(items?:Array<T>)=>void

以初始元素创建；不传则为空序列。

```ts
this.Add(items ?? []);
```

## method Add:(items:Array<T>)=>Sequence<T>

追加一个或多个元素，返回自身。

```ts
this.Data.push(...items);
return this;
```

## method Contains:(item:T)=>bool

是否包含某个元素。按引用比较（`includes` 对对象就是引用比较）。

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

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
result.Add(items);
return result;
```

## method InsertedBefore:(item:T, items:Array<T>)=>Sequence<T>

在 `item` 之前插入多个元素，返回**新**序列。

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
const index = result.Data.indexOf(item);
result.Data.splice(index, 0, ...items);
return result;
```

## method InsertedBeforeWhere:(items:Array<T>, predicate:(item:T)=>bool)=>Sequence<T>

在**第一个满足 `predicate` 的元素**之前插入多个元素，返回新序列。

判定「插在哪里」交给调用方：ts 的泛型被擦除，写不出按类型测试的谓词，所以这里收一个判定器参数。

判定器参数放在最后——xl 的解析器把 `=>` 里的 `>` 误当泛型收尾符，参数表里不直接写函数类型。

找不到匹配元素时 `index` 为 `-1`；`splice(-1, …)` 会插到倒数第一个元素之前，所以这里显式抛出错误。

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

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
const index = result.Data.indexOf(item);
result.Data.splice(index + 1, 0, ...items);
return result;
```
