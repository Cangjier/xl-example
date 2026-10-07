# dependencies
```xl
import { Template } from "./templates/template.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

一次**收尾规则**的抽象：单元关闭之后，扫描它的子单元列表，把相邻的若干单元合并成更高层的结构（如把 `if` `(` `a` `)` 合成一个 `IfSet`）。

**名字**（第 563 轮 ✓）：它从前叫 `Reorganization`（文件名 `reorganization.xl.md` ✓），
因为那时它是「**全局重组那一趟**」的规则 ✓ —— 那一趟在第 561 轮删掉之后 ✓，
它唯一的调用点是 `Token.ApplyCloseRules` ✓ ⇒ 按用户指示改名为 `CloseRule` ✓
（`Close` 指的是「单元关闭」那个时机 ✓，不是「收尾那一趟」这个次序 ✓）。

# class CloseRule

一次收尾规则的尝试。

两个方法都是抽象方法，写成抛错桩。

`Process` 用返回值推进下标——调用点写成 `i = item.Process(..., i)`。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

下标 `index` 处是不是本次规则的起点。

```ts
throw new Error("abstract member: Previous");
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行这条规则，**返回新的下标**。

`Process` 既改写 `units`，又推进外层循环的下标——ts 传不了引用的 `int`，所以下标走返回值。

```ts
throw new Error("abstract member: Process");
```

## method ApplyTo:(unit:Token)=>void

在 `unit` **自己的子单元列表上**跑一遍这条规则（第 488 轮 ✓）。

写给「解析期那一趟」用 ✓（`Token.TryToClose` → `TokenFormer.ApplyCloseRules` ✓）：
那时整个单元的子单元都已经在列表里 ✓，所以这条规则的判据与收集照旧成立 ✓。

**这个循环只有一份** ✓：全局重组那一趟（`Token.Reorganize` ✗，第 561 轮已删 ✓）
与这一趟原本共用同一句推进下标的写法 ✓ ⇒ 只留下这一份 ✓ ——
`Process` 会把多个子单元换成一个 ✓，下标必须跟着走 ✓。

```ts
const units = unit.Data;
if (Array.isArray(units) === false || units.length === 0) {
  return;
}
for (let i = 0; i < units.length; i++) {
  if (this.Previous(unit.Template, units, i)) {
    i = this.Process(unit.Template, units, i);
  }
}
```
