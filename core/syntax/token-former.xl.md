# dependencies
```xl
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

**成形器**：把「解析期该由这套语言补上的那一手」从基类交给**认识语句与关键字的那一层**。

# class TokenFormer

两条时机、两个方法：一个终结符刚落进 `Data` 之后（`FormStatement` ✓），一个单元关闭之前（`UpgradeWords` ✓）。

**为什么要有这一层** ✗：这两件事都必须在 `typescript` 层做（要认识 `Statement` / `Keyword` ✓），
而两个触发点都在 `core` ✗ —— `TryToClose` 在 `core/syntax/token.xl.md` ✓，
两个 appender 在 `typescript/tokens/symbol-token.xl.md` / `line-wrap.xl.md` ✓，
后者**不能** import `statement.xl.md` ✗（`statement` 向上 import 了 `bracket` 等一串，会绕出环 ✓）。

于是 `core` 只留空钩子与这张抽象表 ✓，真正的实现（`TokenFormerImpl.Instance` ✓）由
`ParsePipeline.Install` 装上 ✓ —— 与「模板是调用方的，谁造模板谁装配」同一句话 ✓。

抽象方法写成抛错桩，与 `Reorganization` 那一族一致。

## method FormStatement:(unit:Token, terminator:Token)=>void

在 `unit` 的子单元列表末尾**刚落下** `terminator` 之后调用：要不要收一条语句壳、收哪一段，由实现方决定。

**为什么必须在这个时机** ✗：壳体要把终结符**算进自己的区间** ✓，而终结符在 appender 之前
根本不在 `Data` 里 ✓（第 481–486 轮逐条量穿 ✓，见 `typescript/tokens/statement.xl.md` 的 `FormFrom` ✓）。

```ts
throw new Error("abstract member: FormStatement");
```

## method UpgradeWords:(unit:Token)=>void

在 `unit` 关闭之前调用：把这一层里**该升级成关键字**的标识符换成 `Keyword` 单元。

**为什么是「关闭之前」这个时机** ✓：重组那一趟里关键字升级跑的就是「每个单元关闭时、在它自己的
`Data` 上」✓（通用队列与类型队列都带那条规则 ✓）⇒ 放在 `Token.TryToClose` 里与对照态**同一时机** ✓。
**而解析期那些端口（`LetBranch` 那一族）跑在关闭之前** ✓ ⇒ 它们照旧看得见 `Identifier` 形态的
`let` / `const` / `var` ✓（时机一变就互相踩，第 486 轮记过这条 ✓）。

```ts
throw new Error("abstract member: UpgradeWords");
```
