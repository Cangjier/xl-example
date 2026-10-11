# dependencies
```xl
import { Template } from "./templates/template.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

一次**收尾规则**的抽象：单元关闭之后，扫描它的子单元列表，把相邻的若干单元合并成更高层的结构（如把 `if` `(` `a` `)` 合成一个 `IfSet`）。

**名字**（第 563 轮）：它从前叫 `Reorganization`（文件名 `reorganization.xl.md`），
因为那时它是「**全局重组那一趟**」的规则 —— 那一趟在第 561 轮删掉之后，
它唯一的调用点是 `Token.ApplyCloseRules` ⇒ 按用户指示改名为 `CloseRule`
（`Close` 指的是「单元关闭」那个时机，不是「收尾那一趟」这个次序）。

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

在 `unit` **自己的子单元列表上**跑一遍这条规则（第 488 轮）。

写给「解析期那一趟」用（`Token.TryToClose` → `TokenFormer.ApplyCloseRules`）：
那时整个单元的子单元都已经在列表里，所以这条规则的判据与收集照旧成立。

**这个循环只有一份**：全局重组那一趟（`Token.Reorganize`，第 561 轮已删）
与这一趟原本共用同一句推进下标的写法 ⇒ 只留下这一份 ——
`Process` 会把多个子单元换成一个，下标必须跟着走。

```ts
const units = unit.Data;
if (Array.isArray(units) === false || units.length === 0) {
  return;
}
// **模板在手上一份**（第 1204 轮，用户口径 1.2「提升 parse 效率」）：`unit.Template` 原来是
// **每一圈**都从 `unit` 上读一次，而整段循环里它一个字都不会变。实测 `typescript.d.ts` 一份上
// `ApplyTo` 被调 **1924766** 次、内层循环共走 **5248548** 圈（`tmp/r1204-count.mjs`）——
// 也就是说这一次hoist 省掉的是 525 万次属性读。**送给 `Previous` / `Process` 的还是同一个模板**，
// 判据与次序一个字没改。
const template = unit.Template;
// **整段循环里那份子单元表只读一次**（第 1226 轮，用户口径 1.2「提升 parse 效率」）：
// 循环条件原来每圈都从 `unit` 上读一次 `units.length`（`unit.Data` 是一次属性读 + 一次
// `.length`），而 `Process` 动的是**同一张表**（`splice` 原地改）⇒ 拿在手上一份与每圈重读
// 是同一张表。实测 `typescript.d.ts` 一份上这一格被调 **1924766** 次、内层循环共走
// **5248548** 圈（`tmp/r1226-count.mjs`）。**判据与次序一个字没改**：
// `Previous` / `Process` 收到的还是同一个 `units`。
for (let i = 0; i < units.length; i++) {
  if (this.Previous(template, units, i)) {
    const replacedAt = i;
    i = this.Process(template, units, i);
    // **换进来的节点当场认父亲**（第 623 轮）：`Process` 走的是 `ReplaceCountAt`，
    // 那是核心的 `splice`、**不设 `Parent`** ⇒ 新节点 `Parent` 为 `null`，
    // 而**同一趟里排在后面的规则**马上就要问「你的容器是谁」
    //（`TupleMemberCloseRule.TupleOf` 读 `current.Parent`）。
    // 实测：`type E = [infer U, ...string[]]` 的第一格是 `InferTypeCloseRule` 换出来的、
    // 它的 `Parent` 是 `null` ⇒ 元组成员那一条认不出容器 ⇒ `...string[]` 只剩裸 `...`。
    //
    // **只扫刚换过的那一段**（不扫整张表）：`Process` 动过的格子就在
    // `[replacedAt, i]` 这一小段里，而整张表逐个扫会让每趟规则都变成 O(n)
    //（大 `.d.ts` 上那是实打实的代价）。`null` 才补：已有父亲的单元是**故意**挂在那儿的。
    //
    // **这一趟不再走 `Get`**（第 1226 轮，同一次读数）：`k` 已经由循环条件
    //（`k < units.length`）保证在界内，而 `Get` 是「越界给 `null`」的兜底
    //（`self.length` 再比一次 + 一个函数调用）——这里那一问是多余的。
    // `item !== null` 那一半照旧留着（`splice` 之后那一段不会出现 `null`，但判据不动）。
    for (let k = replacedAt; k <= i && k < units.length; k++) {
      const item = units[k];
      if (item !== null && item.Parent === null) {
        item.Parent = unit;
      }
    }
  }
}
```
