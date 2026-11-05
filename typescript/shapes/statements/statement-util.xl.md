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

## static method StartIndex:(units:Array<Token>, tokenIndex:int, cache?:PossibleShapeCache)=>int

```ts
if (units.length === 0) {
  return 0;
}
const limit = Math.min(units.length, tokenIndex + 1);
const cached = cache !== undefined ? cache.GetShare<StatementStartCache>("statement-start") : null;
if (cached !== null && StatementUtil.CacheUsable(cached, units, limit)) {
  if (cached.Final) {
    return cached.Value;
  }
  return StatementUtil.ScanStart(units, cached.Value, cached.Prefix, limit, cache);
}
return StatementUtil.ScanStart(units, 0, 0, limit, cache);
```

## private static method CacheUsable:(cached:StatementStartCache, units:Array<Token>, limit:int)=>bool

```ts
if (cached.Prefix <= 0 || cached.Prefix > limit) {
  return false;
}
if (units[cached.Prefix - 1] !== cached.Last) {
  return false;
}
if (cached.Value > 0 && (cached.Value > limit || units[cached.Value - 1] !== cached.Boundary)) {
  return false;
}
return true;
```

## private static method ScanStart:(units:Array<Token>, value:int, from:int, limit:int, cache?:PossibleShapeCache)=>int

```ts
let start = value;
let final = false;
for (let at = from; at < limit; at++) {
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
while (start < limit && units[start].IsTriviaToken) {
  start++;
}
if (cache !== undefined) {
  const entry = new StatementStartCache();
  entry.Value = start;
  entry.Prefix = limit;
  entry.Last = limit > 0 ? units[limit - 1] : null;
  entry.Boundary = start > 0 ? units[start - 1] : null;
  entry.Final = final;
  cache.SetShare<StatementStartCache>("statement-start", entry);
}
return start;
```

## static method NextCode:(units:Array<Token>, from:int, limit?:int)=>int

```ts
const end = limit !== undefined ? Math.min(units.length, limit) : units.length;
let at = from;
while (at < end && units[at].IsTriviaToken) {
  at++;
}
return at < end ? at : -1;
```
