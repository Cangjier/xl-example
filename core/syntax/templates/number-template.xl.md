# namespace cangjie

模板层：数字字面量的**语言配置**。

`Template` 是语言无关的规则表；`NumberTemplate` 只描述这门语言的数字字面量末尾允许出现什么后缀。TS 的数字字面量没有普通后缀（只有 BigInt 的 `n`），C# 一类语言才有 `d` / `f` / `m` / `l` / `u` 这些。

后缀只声明「哪些合法」；后缀**代表什么类型**不在这里定义——那是目标语言的 shape 层的事（例如 C# 的 `1.5f` 是 float 字面量），core 不建语义表。

# class NumberTemplate

数字字面量的后缀配置。

## field PlainSuffixes:Array<string> = []

允许出现在数字字面量末尾、不改变节点种类的后缀。默认空数组 = 这门语言没有这类后缀（TS）。

## field BigIntSuffix:string = ""

改变节点种类的后缀（TS 的 `n`：`1n` 要落成 BigIntLiteral）。空串 = 这门语言没有 BigInt 字面量后缀（C#）。

## field SuffixIgnoreCase:bool = false

后缀匹配是否忽略大小写。C# 的后缀大小写不敏感（`1D` 与 `1d` 同义），TS 的后缀只认小写。

## method AddPlainSuffixes:(items:Array<string>)=>NumberTemplate

追加若干普通后缀，返回自身便于链式调用。

```ts
for (const item of items) {
  this.PlainSuffixes.push(item);
}
return this;
```

## method MatchPlainSuffix:(text:string)=>string | null

从文本尾部匹配一个已配置的普通后缀：**长后缀优先**（将来 C# 有 `ul` / `lu` 这种两字符后缀）；匹配不到返回 `null`。

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

从文本尾部匹配 BigInt 后缀；没配置或匹配不到返回 `null`。正文至少要留一个字符，由调用方（`Common.IsBigInt`）校验。

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
