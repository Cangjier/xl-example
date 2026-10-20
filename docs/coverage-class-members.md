# class/interface members 覆盖报告（chunk 1）

分支 `cover-class-members-1`，起点 `origin/integration @ebbbacab`。

## 读数（实测）

| 指标 | 基线 | 本块之后 |
| --- | --- | --- |
| ast-json 全量 | 1734 / 1734 | **1782 / 1782**（16 构造） |
| declarations.ts | 108 | **156 / 156**（+48） |
| diff | 全一致 | 1782 全一致，结构差 / 位置差 / 字段差均 0 |
| tsc | 0 error | 0 error |

## 已测量（绿色，base + trivia）

1. class 字段：`x = 1`、`x: number = 1`、`x`、`x = a`、`readonly x = 1`、`static x = 1`、`private/public/protected x ...`、`x; y;`
2. 方法：`m()`、`m(a)`、`m(a: A)`、`m(a: A, b: B)`、`m(): C`、`m(a: A): B { return a; }`、`static/private/public`，
   以及与属性混排、多方法重复形
3. 构造：`constructor()`、`constructor(a: A)`、`constructor(a, b)`、`private constructor()`
4. 访问器：`get x()`、`set x(v)`、get+set 同体、`static get x()`
5. computed 名：`[k] = 1`、`[k]() {}`
6. interface 成员：`a: number`、`a?: number`、`readonly b: string`、`m(): void`、`m(a: A): B`、`[k: string]: A`、
   多成员混排、多行
7. trivia：前导注释、名字/`=`/`;` 前后注释、修饰符后注释、多行函数体、成员间注释

## 实现

- `ClassDeclarationShape.BuildMembers`：类体 `Bracket.Data` 逐成员——修饰符（keyword leaves，`get`/`set` 只作访问器标志
  不进 Data）→ 名字（Identifier 或 `[expr]` ComputedPropertyName）→ 按下一单元分派：`(` 走方法/构造/访问器
  （参数：无类型建 Identifier 叶子、带 `:`/`?:` 走 `TypeBuilder.ParseParameter`；返回类型 `TypeBuilder.ParseType`；
  函数体 `StatementBuilder.BuildStatement`），`:` / `=` / `;` 走属性（类型 `TypeBuilder.ParseType`、
  初始化器 `ExpressionBuilder.ParseAssign`）。`constructor` 不投影名字（TS Constructor 只有参数与函数体）。
- `InterfaceDeclarationShape.BuildMembers`：接口体与类型字面量同口径，直接循环 `TypeBuilder.ParseTypeMember()`
  （PropertySignature / MethodSignature / IndexSignature / CallSignature 全部复用）。
- class/interface 的 possible-shape 不再对非空体 Reject（成员由 shape 建）。
- 成员 Pos = 前一个成员（或 `{`）`End.Index + 1`；成员 end = 函数体 `}` / 属性末尾 `;`，与 TS 一致。

## 暂缓

- class 表达式带成员 `(class { x = 1; });`：需要改 expressions 家族的 `ParseClassExpression`，本块不碰 expressions。
- 装饰器、static block、class overloads、abstract 方法、泛型声明、体前换行（根 ASI 判据，cover-end-1 范围）。

## 踩坑（重要）

- 当前 integration **不含** cover-declarations-3（heritage）：`members/heritage-clause-shape.xl.md` 仍是空壳、
  没有 `BuildClauses`。因此本块的 class/interface shape 按 integration 现状**不含 heritage 代码**；
  heritage（chunk3）需要单独合并后再在此 shape 上恢复 `HeritageClauseShape.BuildClauses` 调用。
- `*.xl.md` 必须 UTF-8 无 BOM + LF；用 PowerShell 5.1 的 `Set-Content -Encoding utf8` 会写 BOM+CRLF，xl_build 直接报 E0005。
- 不要把相对路径交给 .NET 的 `File.ReadAllText`（它用进程 CWD，不是 PowerShell 的 `cd`）——会误改主仓文件。
