# namespace cangjie

# class NumberTemplate

## field PlainSuffixes:Array<string> = []

## field BigIntSuffix:string = ""

## field SuffixIgnoreCase:bool = false

## method AddPlainSuffixes:(items:Array<string>)=>NumberTemplate

```ts
for (const item of items) {
  this.PlainSuffixes.push(item);
}
return this;
```

## method MatchPlainSuffix:(text:string)=>string | null

```ts
let matched = "";
for (const item of this.PlainSuffixes) {
  if (item.length === 0 || item.length > text.length || item.length <= matched.length) {
    continue;
  }
  const tail = text.substring(text.length - item.length);
  if (this.SuffixIgnoreCase ? tail.toLowerCase() === item.toLowerCase() : tail === item) {
    matched = item;
  }
}
if (matched.length === 0) {
  return null;
}
return matched;
```

## method MatchBigIntSuffix:(text:string)=>string | null

```ts
if (this.BigIntSuffix.length === 0 || this.BigIntSuffix.length > text.length) {
  return null;
}
const tail = text.substring(text.length - this.BigIntSuffix.length);
if (this.SuffixIgnoreCase ? tail.toLowerCase() === this.BigIntSuffix.toLowerCase() : tail === this.BigIntSuffix) {
  return this.BigIntSuffix;
}
return null;
```
