# dependencies
```xl
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

语句成形器：把「终结符已经落进 `Data` 之后收一条语句壳」这件事，从基类交给**认识语句的那一层**。

# class StatementFormer

一次「终结符已经入列」的机会。

**为什么要有这一层** ✗：语句壳必须在 `;` / 软换行**真正进了 `Data` 之后**才收（第 486 轮量穿的三条硬约束，
见 `typescript/tokens/statement.xl.md` 的 `FormFrom` ✓）——而那两个 appender 在 `typescript` 层，
它们**不能** import `statement.xl.md` ✗（`statement` 向上 import 了 `bracket` 等一串，直接写会绕出环 ✓，
`symbol-token.xl.md` / `line-wrap.xl.md` 里都记着这一笔 ✓）。

于是 `core` 只留一个空钩子 `Token.FormStatement` 与这张抽象表 ✓，真正的实现
（`StatementFormerImpl.Instance` ✓）由 `ParsePipeline.Install` 装上 ✓ ——
与「模板是调用方的，谁造模板谁装配」同一句话 ✓。

抽象方法写成抛错桩，与 `Reorganization` 那一族一致。

## method Form:(unit:Token, terminator:Token)=>void

在 `unit` 的子单元列表末尾**刚落下** `terminator` 之后调用：要不要收、收哪一段，由实现方决定。

```ts
throw new Error("abstract member: Form");
```
