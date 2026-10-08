// xl:note 箭头函数的类型参数段里带 `const` 修饰：`const T` 与变量声明的头部同形，
// `,` 那一刻如果让 `LetBranch` 抢先，整个类型参数会被收成一个 `<Let>` ⇒
// `TypeParameter` 缺 `ConstKeyword`（`function f<const T>()` 的分隔符是 `>`，不触发）
// xl:expect GenericType,TypeParameter,Keyword,Lamda
const f = <const T,>(x: T) => x
