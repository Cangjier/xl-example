# dependencies
```xl
import { Token } from "../../core/syntax/token.xl.md"
import { PossibleShapeCache } from "../../core/syntax/possible-shape-cache.xl.md"
```

# namespace cangjie

# class ItemUtil

## static method ItemStart:(units:Array<Token>)=>int

```ts
for (let index = units.length - 1; index >= 0; index--) {
  if (!units[index].IsBasicToken) {
    return index + 1;
  }
}
return 0;
```

## static method NextCode:(units:Array<Token>, index:int)=>int

```ts
for (let at = index; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return units.length;
```

## static method PreviousCode:(units:Array<Token>, index:int)=>int

```ts
for (let at = index; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method LastCodeInItem:(units:Array<Token>)=>int

```ts
const start = ItemUtil.ItemStart(units);
for (let at = units.length - 1; at >= start; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method ItemStartCached:(units:Array<Token>, cache:PossibleShapeCache)=>int

```ts
const cached = cache.GetItemStart(units.length);
if (cached >= 0) {
  return cached;
}
const value = ItemUtil.ItemStart(units);
cache.SetItemStart(value, units.length);
return value;
```
