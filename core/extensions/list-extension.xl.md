# namespace cangjie

列表工具：一组围绕列表的模块级辅助函数。

这些操作在 xl.md 里落成**模块级 `# method`**，ts 侧就是模块级函数，列表作为第一个参数传入：`SkipNext(units, i, pred)`。

这些函数被 `typescript/tokens` 的 token 大量使用——重组逻辑基本全靠「向前/向后跳过包装符号」这一组操作。

`Get` 越界时统一返回 `null`；对 token 这类引用类型元素，`null` 就是「没有」。

# method ReplaceAt:<T>(self:Array<T>, index:int, newValue:T)=>Array<T>

把 `index` 处的元素换成 `newValue`，返回同一个列表。

ts 侧用 `splice(index, 1, newValue)` 一步完成。

```ts
self.splice(index, 1, newValue);
return self;
```

# method ReplaceCountAt:<T>(self:Array<T>, index:int, count:int, newValue:T)=>int

删掉 `index` 起的 `count` 个元素，再在原位插入一个 `newValue`，返回 `index`。

它与单元素版参数个数不同，因此用不同的名字（`ReplaceCountAt`）区分。

```ts
self.splice(index, count, newValue);
return index;
```

# method ReplaceRangeAt:<T>(self:Array<T>, index:int, count:int, newValues:Array<T>)=>int

删掉 `index` 起的 `count` 个元素，再在原位逐个插入 `newValues`，返回**最后一个插入位置**。

```ts
self.splice(index, count, ...newValues);
return index + newValues.length - 1;
```

# method Get:<T>(self:Array<T>, index:int)=>T | null

越界安全的取值。

越界返回 `null`。

```ts
if (index >= 0 && index < self.length) {
  return self[index];
}
return null;
```

# method SkipNext:<T>(self:Array<T>, index:int, predicate:(item:T)=>bool)=>int

从 `index + 1` 起向后走，跳过所有满足 `predicate` 的元素，返回第一个**不满足**的下标。

一直走到末尾也没遇到不满足的就返回越界的下标（调用方靠 `Get` 兜住）。

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

一路走到开头也没遇到就返回 `-1`。

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

另一个同名操作把下标一起传给判定器，因此叫 `SearchBackIndexed`。

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

```ts
for (let i = index + 1; i < self.length; i++) {
  if (condition(i, self[i])) {
    return i;
  }
}
return -1;
```

# method SearchFrontIndexed:<T>(self:Array<T>, index:int, condition:(index:int, item:T)=>bool)=>int

同 `SearchFront`，但判定器同时拿到下标。

`Statement` 的语句边界判定要这个：判断一个 `Function` / `Class` 单元是不是语句开头，
得看它**前面**那个实义单元是什么（`const v = function () {}` 里的函数是表达式，不是声明）。

```ts
for (let i = index - 1; i >= 0; i--) {
  if (condition(i, self[i])) {
    return i;
  }
}
return -1;
```

# method TakeOut:<T>(self:Array<T>, startIndex:int, count?:int)=>Array<T>

从 `startIndex` 起**取出并移除** `count` 个元素；`count` 省略时取到末尾。

把 `count` 补成 `self.length - startIndex` 后走同一条路径。

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
