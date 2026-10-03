# dependencies
```xl
import { CapabilityLookup } from "./lowering.xl.md"
```

# namespace cangjie

**`.d.ts` 能力绑定：声明 → 能力号**。

**它解决的问题**：脚本里会写 `print(...)`、`readFile(...)` 这类**模块里没有声明**的名字——
它们由**宿主**提供。JS 里这些名字来自全局对象；这里走**能力白名单**那条路
（`host-abi.xl.md`）：每个能力有一个号（`BuiltinBase` 之上），
调用落成一条 `host_call(号, 参数…)`，**引擎只认号，不认名字**。

**这一层只做「名字 ↔ 号」这一张表**。三件事**不在这里**，各有各的归属：

1. **从 `.d.ts` 里取名字**是**驱动**的事——它手上有源码、有解析器（`typescript/` 那一层）；
   这一层只认「哪些名字是能力」。**把解析塞进来的代价**是这一层要认识语法树，
   而它其实只需要一个名字列表。
2. **宿主函数的注册**是宿主的事（`vm.xl.md` 的 `InstallCapability`）——
   那张表在引擎里，按号索引。
3. **降级层怎么看名字**：它收一个**查号回调**（`lowering.xl.md` 的 `CapabilityOf`），
   于是**降级层不认识这一层**——只认识「给我一个名字，我给你号或者 -1」。

**号从 `BuiltinBase` 起**：能力号与内建号（`Array` 的 1..99、`String` 的 100..199、
全局段 200..）**不重叠**，所以一个调用通道按号段就能分清
「这是脚本调的一个能力」还是「这是内建方法」。

# class Bindings

一张**能力名 → 能力号**的表（两个平行数组，够用；顺序就是登记顺序）。

## field Names:Array<string> = []

能力的名字，按登记顺序。

## field Ids:Array<int> = []

与 `Names` 一一对应的号。

## constructor:(base:int)=>void

**起始号由调用方给**（引擎那边有一个 `BuiltinBase`；这一层不硬编码它，
免得两边各有一份常量，改一处忘一处）。

```ts
this.Next = base;
```

## field Next:int = 0

下一个空出来的号。

## method Register:(name:string)=>int

登记一个能力，返回它的号。

**同一个名字登记两次返回同一个号**（幂等）：`.d.ts` 可能被两份源文件都引用，
重复登记应该是无害的，而不是悄悄占掉两个号、让宿主那边的注册对不上。

```ts
const existing = this.Lookup(name);
if (existing >= 0) return existing;
this.Names.push(name);
this.Ids.push(this.Next);
this.Next = this.Next + 1;
return this.Next - 1;
```

## method Lookup:(name:string)=>int

查号；**没有就给 -1**（调用方拿它当「这不是一个能力」）。

```ts
for (let i = 0; i < this.Names.length; i++) {
  if (this.Names[i] === name) return this.Ids[i];
}
return -1;
```

## method Count:()=>int

登记了几个能力。

```ts
return this.Names.length;
```

# method LookupOf:(bindings:Bindings)=>CapabilityLookup

**把一个 `Bindings` 变成降级层要的那个查号回调**。

**为什么要这一步转换**：降级层的字段是一个函数类型（`(name)=>int`），
而不是这一层的类——这样 `lowering.xl.md` **不必依赖 `bindings.xl.md`**
（只有驱动同时认识它们）。闭包在这儿正好是那条缝。

```ts
return (name) => bindings.Lookup(name);
```
