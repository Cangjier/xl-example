# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ShapePosition

## static method PosAt:(host:Token, units:Array<Token>, index:int)=>int

```ts
if (index < 0 || index > units.length) {
  return ShapePosition.HostStart(host);
}
for (let at = index - 1; at >= 0; at--) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  const end = unit.SourceRange.End;
  if (end >= 0) {
    return end;
  }
}
return ShapePosition.HostStart(host);
```

## static method HostStart:(host:Token)=>int

```ts
if (host instanceof Bracket) {
  const start = host.SourceRange.Start;
  if (start >= 0) {
    return start + 1;
  }
  return 0;
}
const start = host.SourceRange.Start;
if (start >= 0) {
  return start;
}
return 0;
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
