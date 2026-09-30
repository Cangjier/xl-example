# namespace cangjie

模板层：每个单元（token）的跳转与重组规则都从 `Template` 上取。

# class KeywordTemplate

关键字模板：判定一个标识符是不是当前语言的关键字。

判定是「白名单优先、黑名单否决」的两张表，`Dawn/Text` 的 `Keyword` token 用它。

## field BanedKeywords:Array<string> = []

被禁用的关键字。

## field AllowedKeywords:Array<string> = []

允许的关键字。

## method Ban:(items:Array<string>)=>KeywordTemplate

追加若干禁用关键字，返回自身便于链式调用。

```ts
this.BanedKeywords.push(...items);
return this;
```

## method Allow:(items:Array<string>)=>KeywordTemplate

追加若干允许关键字，返回自身便于链式调用。

```ts
this.AllowedKeywords.push(...items);
return this;
```

## method IsKeyword:(item:string)=>bool

是不是关键字：禁用表命中即否，否则看允许表。

由使用方自行覆盖。

```ts
if (this.BanedKeywords.includes(item)) {
  return false;
}
return this.AllowedKeywords.includes(item);
```
