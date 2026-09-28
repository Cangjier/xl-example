# namespace cangjie

列表工具：原 C# 的 `Core/Extensions/ListExtension.cs`，一组挂在 `IList<T>` 上的扩展方法。

按 M11，扩展方法在 xl.md 里落成**模块级 `# method`**，ts 侧就是模块级函数：C# 的 `units.SkipNext(i, pred)` 在 ts 里写成 `SkipNext(units, i, pred)`。

这些函数被 `Dawn/Text` 的 token 大量使用——重组逻辑基本全靠「向前/向后跳过包装符号」这一组操作。

`Get` 在 C# 里返回 `default(T)`：对 token 这种引用类型就是 `null`，ts 侧统一返回 `null`。

# method ReplaceAt:<T>(self:Array<T>, index:int, newValue:T)=>Array<T>

把 `index` 处的元素换成 `newValue`，返回同一个列表。

原 C# 用 `RemoveAt` + `Insert` 实现，ts 侧用 `splice(index, 1, newValue)`。

```ts
self.splice(index, 1, newValue);
return self;
```

# method ReplaceCountAt:<T>(self:Array<T>, index:int, count:int, newValue:T)=>int

删掉 `index` 起的 `count` 个元素，再在原位插入一个 `newValue`，返回 `index`。

原 C# 是两个重载之一：`ReplaceAt<T>(IList<T> self, int index, int count, T newValue)`。它与单元素版参数个数不同，按 M14(c) 改名。

```ts
self.splice(index, count, newValue);
return index;
```

# method ReplaceRangeAt:<T>(self:Array<T>, index:int, count:int, newValues:Array<T>)=>int

删掉 `index` 起的 `count` 个元素，再在原位逐个插入 `newValues`，返回**最后一个插入位置**。

原 C# 是 `ReplaceRangeAt<T>(IList<T> self, int index, int count, IEnumerable<T> newValues)`，返回 `index - 1`（`index` 在循环里已经加过）。

```ts
self.splice(index, count, ...newValues);
return index + newValues.length - 1;
```

# method Get:<T>(self:Array<T>, index:int)=>T | null

越界安全的取值。

原 C# 签名是 `T? Get<T>(this IList<T> self, int index)`，越界返回 `default`。

```ts
if (index >= 0 && index < self.length) {
  return self[index];
}
return null;
```

# method SkipNext:<T>(self:Array<T>, index:int, predicate:(item:T)=>bool)=>int

从 `index + 1` 起向后走，跳过所有满足 `predicate` 的元素，返回第一个**不满足**的下标。

原 C# 一直走到末尾也没遇到不满足的就返回 `self.Count`（越界值，调用方靠 `Get` 兜住）。

```ts
let i = index + 1;
for (; i < self.length; i++) {
  if (predicate(self[i])) {
    continue;
  }
  break;
}
return i;
```

# method SkipPrevious:<T>(self:Array<T>, index:int, predicate:(item:T)=>bool)=>int

从 `index - 1` 起向前走，跳过所有满足 `predicate` 的元素，返回第一个**不满足**的下标。

原 C# 一路走到开头也没遇到就返回 `-1`。

```ts
let i = index - 1;
for (; i >= 0; i--) {
  if (predicate(self[i])) {
    continue;
  }
  break;
}
return i;
```

# method FindNext:<T>(self:Array<T>, index:int, onContinue:(item:T)=>bool)=>int

从 `index + 1` 起向后找第一个**不满足** `onContinue` 的元素，返回它的下标；找不到返回 `-1`。

与 `SkipNext` 的差别：`SkipNext` 返回「走到的位置」（可能是末尾），`FindNext` 找不到就明确给 `-1`。

```ts
let i = index + 1;
for (; i < self.length; i++) {
  if (onContinue(self[i])) {
    continue;
  }
  return i;
}
return -1;
```

# method FindPrevious:<T>(self:Array<T>, index:int, onContinue:(item:T)=>bool)=>int

从 `index - 1` 起向前找第一个**不满足** `onContinue` 的元素，返回它的下标；找不到返回 `-1`。

```ts
let i = index - 1;
for (; i >= 0; i--) {
  if (onContinue(self[i])) {
    continue;
  }
  return i;
}
return -1;
```

# method GetSkipNext:<T>(self:Array<T>, index:int, predicate:(item:T)=>bool)=>T | null

`SkipNext` 之后再取值；跳到的位置越界则给 `null`。

```ts
return Get(self, SkipNext(self, index, predicate));
```

# method GetSkipPrevious:<T>(self:Array<T>, index:int, predicate:(item:T)=>bool)=>T | null

`SkipPrevious` 之后再取值；跳到的位置越界则给 `null`。

```ts
return Get(self, SkipPrevious(self, index, predicate));
```

# method PreAt:<T>(self:Array<T>, index:int)=>T | null

取前一个元素，越界给 `null`。

```ts
return Get(self, index - 1);
```

# method NextAt:<T>(self:Array<T>, index:int)=>T | null

取后一个元素，越界给 `null`。

```ts
return Get(self, index + 1);
```

# method SearchFront:<T>(self:Array<T>, index:int, condition:(item:T)=>bool)=>int

从 `index - 1` 起向前找第一个满足 `condition` 的元素，返回下标；找不到返回 `-1`。

```ts
for (let i = index - 1; i >= 0; i--) {
  if (condition(self[i])) {
    return i;
  }
}
return -1;
```

# method SearchBack:<T>(self:Array<T>, index:int, condition:(item:T)=>bool)=>int

从 `index + 1` 起向后找第一个满足 `condition` 的元素，返回下标；找不到返回 `-1`。

原 C# 是两个重载之一：`SearchBack<T>(IList<T> self, int index, Func<T, bool> condition)`。另一个把下标一起传给判定器，按 M14(c) 改名 `SearchBackIndexed`。

```ts
for (let i = index + 1; i < self.length; i++) {
  if (condition(self[i])) {
    return i;
  }
}
return -1;
```

# method SearchBackIndexed:<T>(self:Array<T>, index:int, condition:(index:int, item:T)=>bool)=>int

同上，但判定器同时拿到下标。

原 C# 签名是 `SearchBack<T>(IList<T> self, int index, Func<int, T, bool> condition)`。

```ts
for (let i = index + 1; i < self.length; i++) {
  if (condition(i, self[i])) {
    return i;
  }
}
return -1;
```

# method TakeOut:<T>(self:Array<T>, startIndex:int, count?:int)=>Array<T>

从 `startIndex` 起**取出并移除** `count` 个元素；`count` 省略时取到末尾。

原 C# 是两个重载：`TakeOut<T>(IList<T> self, int startIndex, int count)` 与 `TakeOut<T>(IList<T> self, int startIndex)`（后者先把 `count` 算成 `self.Count - startIndex` 再转调前者）。按 M14(a) 合并成可选参数。

```ts
const total = count ?? (self.length - startIndex);
const result: T[] = [];
for (let i = 0; i < total; i++) {
  result.push(self[startIndex]);
  self.splice(startIndex, 1);
}
return result;
```

# method TakeRange:<T>(self:Array<T>, startIndex:int, count:int)=>Array<T>

取 `[startIndex, startIndex + count)` 这一段，**不移除**原元素。

与 `TakeOut` 的差别就在这一点：`TakeRange` 不动原列表。

```ts
const result: T[] = [];
for (let i = 0; i < count; i++) {
  result.push(self[startIndex + i]);
}
return result;
```
