# namespace cangjie

# class Sequence<T>

## field Data:Array<T> = []

## constructor:(items?:Array<T>)=>void

```ts
this.Add(items ?? []);
```

## method Add:(items:Array<T>)=>Sequence<T>

```ts
this.Data.push(...items);
return this;
```

## method Contains:(item:T)=>bool

```ts
return this.Data.includes(item);
```

## method Remove:(item:T)=>void

```ts
const index = this.Data.indexOf(item);
if (index >= 0) {
  this.Data.splice(index, 1);
}
```

## method Removed:(items:Array<T>)=>Sequence<T>

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
for (const item of items) {
  result.Remove(item);
}
return result;
```

## method Added:(items:Array<T>)=>Sequence<T>

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
result.Add(items);
return result;
```

## method InsertedBefore:(item:T, items:Array<T>)=>Sequence<T>

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
const index = result.Data.indexOf(item);
result.Data.splice(index, 0, ...items);
return result;
```

## method InsertedBeforeWhere:(items:Array<T>, predicate:(item:T)=>bool)=>Sequence<T>

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

```ts
const result = new Sequence<T>();
result.Data.push(...this.Data);
const index = result.Data.indexOf(item);
result.Data.splice(index + 1, 0, ...items);
return result;
```
