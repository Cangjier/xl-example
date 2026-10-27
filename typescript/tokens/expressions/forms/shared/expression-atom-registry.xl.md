# dependencies
```xl
import { Token } from "../../../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ExpressionAtomRegistry

**表达式括号里「已经逐字建好的原子 / 成员」的登记表（B4）。**

括号里的字符归括号自己，父层的候选看不见它们（`_reports/BRACKET-A2.md` §0 第 2 条）。
B3b 给控制流头 `(` 建出的原子开了一条「legacy 收口时直接消费」的路
（`ControlHeadPossibleShape.IsAtom` → `ExpressionBuilder.ParsePrimary` 的分支）。
本类把那条路推广成**独立的一份登记表**，供对象 / 数组 / 调用实参 / 分组括号四种角色共用：

| 表 | 谁写 | 谁读 |
|---|---|---|
| `Atoms` | `ExpressionBracketPossibleShape.BuildByIndex` 建出的 `IdentifierShape` / `NumericLiteralShape` | `ExpressionBuilder.ParsePrimary`（值位）、`ParseName`（对象字面量的属性名位） |
| `Members` | 同上，把「名 + `:` + 值」拼成的 `PropertyAssignmentShape` / 短写 / 展开成员 | `ExpressionBuilder.ParseObjectLiteral`（成员循环） |
| `Containers` | `ContainerShapeCatalog` 在**括号关闭格**建出并顶替括号的四个容器形状 | `ExpressionBuilder.ParsePrimary`（表达式起点）、`VariableDeclarationShape.TryBuildTypedInitializer`、`TypeCatalogFactory.StartsTypedInitializer` |

**为什么必须是独立的一份**：`ControlHeadPossibleShape.Atoms` 的语义是「控制流头里的原子」，
把它当全局表用会让 `IsAtom` 在两种完全不同的 site 上互相污染；分开之后，
关掉 B4 的开关（`StatementRouteUtil.EnableExprBracketCatalog = false`）时本表恒空，
两处 `Has` / `HasMember` 恒为 `false`，legacy 收口逐字节回到 B4 之前。

**清理点**：与 `ControlHeadPossibleShape.ResetAtoms` 同一个地方（`SourceFileShape` 构造器，每文件一次）。
登记表只存**身份**，不持有树：形状被丢弃时不回写任何节点。

## static field Atoms:Set<any> = new Set()

本进程内由表达式括号目录建出的原子（标识符 / 数字字面量）。

## static field Members:Set<any> = new Set()

本进程内由表达式括号目录建出的成员形状（对象字面量的 `a: 1` / `a` / `...a`）。

## static field Containers:Set<any> = new Set()

[B4e] 本进程内由 `ContainerShapeCatalog` 在**括号关闭格**建出、并顶替掉括号的容器形状
（`ObjectLiteralExpressionShape` / `ArrayLiteralExpressionShape` / `CallExpressionShape` /
`ParenthesizedExpressionShape`）。它只登记「这一个形状是本机制建的」这一件事实，
收口路径据此**消费**而不是重建——这是 K1 的所有权切换表。

## static field Nodes:Set<any> = new Set()

[R15] 本进程内由**增量主候选**（不是括号目录）建出、而收口格可能还要在其后接续的表达式根形状。
写入点两处：`TaggedTemplatePrimaryPossibleShape.BuildByIndex`（标签模板链）、
`NumericLiteralPossibleShape.BuildByIndex`（[T9] 声明初始化器的数字字面量原子）。

为什么要单独一张表、而不是并进 `Containers`：`Containers` 的读者里有两处是**类型面**
（`VariableDeclarationShape.TryBuildTypedInitializer` / `TypeCatalogFactory.StartsTypedInitializer`），
它们用「初始化器里已有本机制的容器根」判断要不要让位给类型面。标签模板 / 数字字面量不是括号容器，
登记进去会改变那两处的让位判据。`Nodes` 只被 `ExpressionBuilder.ParsePrimary`（值位消费）与
`VariableDeclarationShape.FinishIncremental`（收口格 + `VariableDeclarationEndPossibleShape`
的 `HasAtomInitializer`）读，写域与读域都只有这一族。

[T9] 数字字面量为什么要登记：`const a = 1 .toString()` / `1..toString()` / `1 .toString[0]` 的 `1`
在数字格就已经建成 `NumericLiteralShape`，而 `.` / `?.` / `(` / `[` 是它的**后缀**——不是「未支持的续接」。
登记之后 `ParsePrimary` 用 `HasNode` 把这个已建原子当操作数收下（不重建、不重算 `Pos`），
后缀交给 `ExpressionBuilder.ParsePostfixSuffix`，与 A1 标识符 / A4 容器 / R15 标签模板同一条 postfix 路。

## static method RegisterNode:(unit:Token)=>void

```ts
if (unit === null) {
  return;
}
ExpressionAtomRegistry.Nodes.add(unit);
```

## static method HasNode:(unit:Token)=>bool

`unit` 是不是增量主候选建出、收口格可**直接消费**（不重建）的表达式根。

```ts
if (unit === null) {
  return false;
}
return ExpressionAtomRegistry.Nodes.has(unit);
```

## static method Register:(unit:Token)=>void

```ts
if (unit === null) {
  return;
}
ExpressionAtomRegistry.Atoms.add(unit);
```

## static method RegisterMember:(unit:Token)=>void

```ts
if (unit === null) {
  return;
}
ExpressionAtomRegistry.Members.add(unit);
```

## static method Has:(unit:Token)=>bool

```ts
if (unit === null) {
  return false;
}
return ExpressionAtomRegistry.Atoms.has(unit);
```

## static method HasMember:(unit:Token)=>bool

```ts
if (unit === null) {
  return false;
}
return ExpressionAtomRegistry.Members.has(unit);
```

## static method RegisterContainer:(unit:Token)=>void

```ts
if (unit === null) {
  return;
}
ExpressionAtomRegistry.Containers.add(unit);
```

## static method HasContainer:(unit:Token)=>bool

`unit` 是不是本机制在关闭格建出的容器形状（**唯一**的容器所有权判据；不认任意 `ShapeToken`）。

```ts
if (unit === null) {
  return false;
}
return ExpressionAtomRegistry.Containers.has(unit);
```

## static method Reset:()=>void

只清身份表，不动任何树的节点（`SourceFileShape` 构造器每文件调一次）。

```ts
ExpressionAtomRegistry.Atoms = new Set();
ExpressionAtomRegistry.Members = new Set();
ExpressionAtomRegistry.Containers = new Set();
ExpressionAtomRegistry.Nodes = new Set();
```
