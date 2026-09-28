# namespace cangjie

模板层：每个单元（token）的跳转与重组规则都从 `Template` 上取。

# class MethodNameTemplate

方法名模板：判定一个标识符能不能当方法名。

默认把语言关键字挡在外面，用来区分「`if` 这样的控制流关键字」和「真的叫 `if` 的方法」。

## field BanedNames:Array<string> = ["if", "for", "foreach", "while", "catch", "async", "return", "as", "await"]

被禁用的名称。原 C# 侧的初值就是这 9 个。

## field AllowedNames:Array<string> = []

允许的名称。原 C# 侧初值为空。

## method Ban:(items:Array<string>)=>MethodNameTemplate

追加若干禁用名称，返回自身便于链式调用。

原 C# 签名是 `MethodNameTemplate Ban(params string[] items)`。

```ts
this.BanedNames.push(...items);
return this;
```

## method Allow:(items:Array<string>)=>MethodNameTemplate

追加若干允许名称，返回自身便于链式调用。

原 C# 签名是 `MethodNameTemplate Allow(params string[] items)`。

```ts
this.AllowedNames.push(...items);
return this;
```

## method IsMethodName:(name:string)=>bool

是不是方法名：允许表命中即是，否则禁用表命中即否，都不命中也算。

原 C# 是普通方法，无 `virtual`。注意判定顺序——允许表优先于禁用表。

```ts
if (this.AllowedNames.includes(name)) {
  return true;
}
if (this.BanedNames.includes(name)) {
  return false;
}
return true;
```
