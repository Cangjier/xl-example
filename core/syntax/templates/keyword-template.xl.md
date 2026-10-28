# namespace cangjie

# class KeywordTemplate

## field BanedKeywords:Array<string> = []

## field AllowedKeywords:Array<string> = []

## method Ban:(items:Array<string>)=>KeywordTemplate

```ts
this.BanedKeywords.push(...items);
return this;
```

## method Allow:(items:Array<string>)=>KeywordTemplate

```ts
this.AllowedKeywords.push(...items);
return this;
```

## method IsKeyword:(item:string)=>bool

```ts
if (this.BanedKeywords.includes(item)) {
  return false;
}
return this.AllowedKeywords.includes(item);
```
