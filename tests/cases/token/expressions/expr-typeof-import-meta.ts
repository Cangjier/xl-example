// xl:note `typeof` 的作用范围是整个 `import.meta`（MetaProperty），不能被 `typeof` 只吃掉 `import`
// xl:expect UnaryOperator,Keyword
const a = typeof import.meta;
const b = typeof import.meta.url;
console.log(a, b);
