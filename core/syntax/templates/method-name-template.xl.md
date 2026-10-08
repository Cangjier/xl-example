# namespace cangjie

模板层：每个单元（token）的跳转与收尾规则都从 `Template` 上取。

# class MethodNameTemplate

方法名模板：判定一个标识符能不能当方法名。

默认把语言关键字挡在外面，用来区分「`if` 这样的控制流关键字」和「真的叫 `if` 的方法」。

## field BanedNames:Array<string> = ["if", "for", "foreach", "while", "catch", "async", "return", "as", "await", "satisfies"]

被禁用的名称。初值就是这 **10** 个。

**`satisfies` 是第 290 轮补的**：它与 `as` **完全同类**（同优先级、同结合性的类型运算，
见 `typescript/tokens/satisfies.xl.md`），可那张禁用表里**只有 `as`**。
于是「类型运算词 + 一对括号」被读成了**一次调用**：
`(() => 1) satisfies (() => number)` 的产物是
`<Bracket>…</Bracket><Method name="satisfies">…</Method>`——
`AsCloseRule` 轮不到它，投影里少了一个 `SatisfiesExpression`，
降级层拿到一个**裸 `Bracket`** 报 `unimplemented: expression Bracket`（整份文件进不来）。
实测三种写法都红：`(() => 1) satisfies (() => number)`、
`((x: number) => x) satisfies (x: number) => number`、`f satisfies ((n: number) => number) === f`；
把 `satisfies` 换成 `as` 三条全绿（那一格早就在表里）。
**`satisfies` 不是 JS 的保留字**（写一个叫 `satisfies` 的函数再调它是合法的），
所以这一条是**取舍**——与 `as` 那一格同一个取舍：类型运算词优先。

## field AllowedNames:Array<string> = []

允许的名称。初值为空。

## method Ban:(items:Array<string>)=>MethodNameTemplate

追加若干禁用名称，返回自身便于链式调用。

```ts
this.BanedNames.push(...items);
return this;
```

## method Allow:(items:Array<string>)=>MethodNameTemplate

追加若干允许名称，返回自身便于链式调用。

```ts
this.AllowedNames.push(...items);
return this;
```

## method IsMethodName:(name:string)=>bool

是不是方法名：允许表命中即是，否则禁用表命中即否，都不命中也算。

注意判定顺序——允许表优先于禁用表。

```ts
if (this.AllowedNames.includes(name)) {
  return true;
}
if (this.BanedNames.includes(name)) {
  return false;
}
return true;
```
