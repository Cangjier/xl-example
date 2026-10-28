# namespace cangjie

# method ReplaceAt:<T>(self:Array<T>, index:int, newValue:T)=>Array<T>

```ts
self.splice(index, 1, newValue);
return self;
```

# method ReplaceCountAt:<T>(self:Array<T>, index:int, count:int, newValue:T)=>int

```ts
self.splice(index, count, newValue);
return index;
```

# method ReplaceRangeAt:<T>(self:Array<T>, index:int, count:int, newValues:Array<T>)=>int

```ts
self.splice(index, count, ...newValues);
return index + newValues.length - 1;
```

# method Get:<T>(self:Array<T>, index:int)=>T | null

```ts
if (index >= 0 && index < self.length) {
  return self[index];
}
return null;
```

# method SkipNext:<T>(self:Array<T>, index:int, predicate:(item:T)=>bool)=>int

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

```ts
return Get(self, SkipNext(self, index, predicate));
```

# method GetSkipPrevious:<T>(self:Array<T>, index:int, predicate:(item:T)=>bool)=>T | null

```ts
return Get(self, SkipPrevious(self, index, predicate));
```

# method PreAt:<T>(self:Array<T>, index:int)=>T | null

```ts
return Get(self, index - 1);
```

# method NextAt:<T>(self:Array<T>, index:int)=>T | null

```ts
return Get(self, index + 1);
```

# method SearchFront:<T>(self:Array<T>, index:int, condition:(item:T)=>bool)=>int

```ts
for (let i = index - 1; i >= 0; i--) {
  if (condition(self[i])) {
    return i;
  }
}
return -1;
```

# method SearchBack:<T>(self:Array<T>, index:int, condition:(item:T)=>bool)=>int

```ts
for (let i = index + 1; i < self.length; i++) {
  if (condition(self[i])) {
    return i;
  }
}
return -1;
```

# method SearchBackIndexed:<T>(self:Array<T>, index:int, condition:(index:int, item:T)=>bool)=>int

```ts
for (let i = index + 1; i < self.length; i++) {
  if (condition(i, self[i])) {
    return i;
  }
}
return -1;
```

# method TakeOut:<T>(self:Array<T>, startIndex:int, count?:int)=>Array<T>

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

```ts
const result: T[] = [];
for (let i = 0; i < count; i++) {
  result.push(self[startIndex + i]);
}
return result;
```
