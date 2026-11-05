# dependencies
```xl
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class StatementStartCache

## field Value:int = 0

## field Prefix:int = 0

## field Last:Token | null = null

## field Boundary:Token | null = null

## field Final:bool = false

# class StatementUtil

## static method StartIndex:(units:Array<Token>, cache?:PossibleShapeCache)=>int

```ts
if (units.length === 0) {
  return 0;
}
const cached = cache !== undefined ? cache.GetShare<StatementStartCache>("statement-start") : null;
if (cached !== null && StatementUtil.CacheUsable(cached, units)) {
  if (cached.Final) {
    return cached.Value;
  }
  return StatementUtil.ScanStart(units, cached.Value, cached.Prefix, cache);
}
return StatementUtil.ScanStart(units, 0, 0, cache);
```

## private static method CacheUsable:(cached:StatementStartCache, units:Array<Token>)=>bool

```ts
if (cached.Prefix <= 0 || cached.Prefix > units.length) {
  return false;
}
if (units[cached.Prefix - 1] !== cached.Last) {
  return false;
}
if (cached.Value > 0 && (cached.Value > units.length || units[cached.Value - 1] !== cached.Boundary)) {
  return false;
}
return true;
```

## private static method ScanStart:(units:Array<Token>, value:int, from:int, cache?:PossibleShapeCache)=>int

```ts
let start = value;
let final = false;
for (let at = from; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!unit.IsBasicToken) {
    start = at + 1;
    continue;
  }
  final = true;
  break;
}
while (start < units.length && units[start].IsTriviaToken) {
  start++;
}
if (cache !== undefined) {
  const entry = new StatementStartCache();
  entry.Value = start;
  entry.Prefix = units.length;
  entry.Last = units[units.length - 1];
  entry.Boundary = start > 0 ? units[start - 1] : null;
  entry.Final = final;
  cache.SetShare<StatementStartCache>("statement-start", entry);
}
return start;
```

## static method NextCode:(units:Array<Token>, from:int)=>int

```ts
let at = from;
while (at < units.length && units[at].IsTriviaToken) {
  at++;
}
return at < units.length ? at : -1;
```
