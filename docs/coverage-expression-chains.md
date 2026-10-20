# expression chain / call 覆盖记录（cover-chain-cases-1）

本块只新增两个用例 stem 与本文档；**没有改 `expression-builder.xl.md` / `expression.ts` /
`expression-statement-possible-shape`**（那两个文件正被 operator / lex-end-audit 的成员使用）。
没有新增/修改任何 shape：现有 builder 已能建这些形态，`?.` 用的 `QuestionDotTokenShape` 也已存在。

## 读数

```
expression-chains   36 / 36      # 成员/索引链 6 + 可选链 7 + 非空 7 + 链+运算 5 + trivia 11
call-forms          35 / 35      # 调用 17 + new 10 + trivia 8
全量               1763 / 1763   # 18 个构造；结构差 0 / 位置差 0 / 字段差 0
tsc exit 0；xl_check 0 error
```

## 已收形态（base + trivia，全部经 `ts.createSourceFile` 先验证）

`expression-chains.ts`

- 成员/索引链：`a.b.c;`、`a["b"]["c"];`、`a[b][c];`、`a.b[c].d;`、`(a).b;`、`f().b;`、`a.b().c;`；
- 可选链：`a?.b;`、`a?.[b];`、`a?.();`、`a?.b?.c;`、`a?.b[c]?.d;`、`a?.().b;`；
- 非空：`a!;`、`a!.b;`、`a!();`、`a!.b!.c;`；
- 链 + 运算：`a.b + c.d;`、`a?.b ?? c;`、`-a.b;`、`typeof a.b;`；
- trivia：`. `两侧注释 / 换行、索引内空白与换行、`?.` 两侧注释、`!` 两侧注释与换行、运算符两侧注释。

`call-forms.ts`

- 调用：`f();`、`f(a, b);`、`a.b(c);`、`a[b](c);`、`f()();`、`(f())(a);`、`a?.b(c);`、`a?.();`；
- new：`new C();`、`new C(a, b);`、`new C;`、`new a.b();`、`new (f())();`、`new a.b(c);`；
- trivia：实参前后注释、多行实参、callee 与括号间换行、`new` 与 callee 间注释、点两侧注释。

## AST 口径（TS 实测）

| 构造 | TS children |
| --- | --- |
| `a?.b;` | `PropertyAccessExpression[0,4)` → `Identifier[0,1)`、`QuestionDotToken[1,3)`、`Identifier[3,4)` |
| `a?.[b];` | `ElementAccessExpression` → `Identifier`、`QuestionDotToken`、`Identifier b` |
| `a?.();` | `CallExpression` → `Identifier a`、`QuestionDotToken`（无实参节点） |
| `a?.b?.c;` | 外层 `PropertyAccessExpression` 的第二个 child 是第二颗 `QuestionDotToken` |
| `a!.b;` | `PropertyAccessExpression` → `NonNullExpression[0,2)`、`Identifier b`；`!` 本身不是节点 |
| `f(...a);` | `CallExpression` → `Identifier f`、`SpreadElement[2,6)`→`Identifier[5,6)`（区间从 `...` 起） |
| `new C(a, b);` | `NewExpression[0,11)` → `Identifier[3,5)`、两个 `Identifier` 实参（`new` 不是节点） |
| `new C<T>();` | `NewExpression` → `Identifier C`、`TypeReference T` |

## 暂缓（附原因；本块不能改 builder）

- **spread 实参**：`f(...a);` / `f(a, ...b, c);` / `f(... /* c */ a);` / `new C(...a);` ——
  `ParseBracketArguments` 只按 `,` 切表达式，遇到 `...` 抛 `不支持的表达式起点`；
  需要 expressions 家族在实参分派里建 `SpreadElementShape`（`...` 只进区间、表达式是 child）；
- **泛型 new**：`new C<T>();` —— `ParseNew` 不读类型实参；
  TS 的 `NewExpression` children 是 callee + `TypeReference` + arguments，和泛型调用（CallExpression）不同；
- 其余表达式族暂缓项（`<T>a`、import.meta、await/yield、类表达式成员等）见 `docs/coverage-expressions.md`。

## 下一块建议

1. 在 `ParseBracketArguments` 里补 `...` 分派（消费已存在的 `SpreadElementShape`），一次可解锁本块 4 条 spread 目标；
2. `ParseNew` 补「callee 后若 `<` 扫到配对 `>`」的 TypeBuilder 实参读取（与泛型调用同一套前瞻）；
3. 本块两个 stem 可作为后续 operator / lex-end-audit 改动的回归哨兵（纯 postfix 链，不依赖 operator 用例集）。
