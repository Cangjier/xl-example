// bindings 用例集：array / object binding pattern 与 binding element。
// 空文件是有意的：binding pattern 只能出现在变量声明 / for-of / for-in / catch 子句 / 形参里，
// 这些语句形态属于 statements / declarations 家族，cover-members-1 这一块还没有可测量的入口，
// 所以这里只登记目标与依赖，不造红用例（见 docs/coverage-members.md）。
// 形状与 possible 已在本块实现：
//   typescript/tokens/bindings/array-binding-pattern-{shape,possible-shape}.xl.md
//   typescript/tokens/bindings/object-binding-pattern-{shape,possible-shape}.xl.md
//   typescript/tokens/bindings/binding-element-{shape,possible-shape}.xl.md
//
// 依赖 cover-statements-1（变量语句 / for-of 的 possible + shape 接进来之后，逐条取消注释并跑对拍）：
//
// ===== array binding pattern =====
// let [a] = x;
// let [a, b] = x;
// let [a, b, c] = x;
// let [a, , b] = x;                 <- OmittedExpression 需要 expressions 家族的 OmittedExpressionShape，见 doc
// let [...rest] = x;
// let [a, ...rest] = x;
// let [[a], [b]] = x;               <- 嵌套 pattern
// let [a = 1] = x;                  <- Initializer
// let [a, b = 1] = x;
// const [a] = x;
// var [a] = x;
// for (const [a, b] of xs) {}
// for (const [a] of xs) {}
// for (const [a, , b] of xs) {}     <- 同 OmittedExpression 依赖
// let [a] = x, [b] = y;             <- 一条声明里两个 declarator
//
// ===== object binding pattern =====
// let { a } = x;
// let { a, b } = x;
// let { a, b, c } = x;
// let { a: b } = x;                 <- PropertyName + BindingName
// let { a: b, c: d } = x;
// let { a = 1 } = x;                <- Initializer
// let { a: b = 1 } = x;
// let { ...rest } = x;              <- RestElement
// let { a, ...rest } = x;
// let { a: { b } } = x;             <- 嵌套 pattern
// let { "s": a } = x;               <- 字面量名：依赖 ParseName 认字面量（同 members 的缺口）
// let { [k]: a } = x;               <- computed name：依赖 ComputedPropertyNameShape（types 家族）
// for (const { a } of xs) {}
// for (const { a: b } of xs) {}
// let { a } = x, { b } = y;
//
// ===== 嵌套与重复形（可与 trivia 叠加，行内 \n 由 ast-json.mjs 还原）=====
// let { a: [b, c] } = x;
// let [{ a }, { b }] = xs;
// let [/* c */ a, /* d */ b] = x;
// let { /* c */ a, /* d */ b } = x;
// let [a, b] = x, [c] = y;
// let {\na,\nb\n} = x;
