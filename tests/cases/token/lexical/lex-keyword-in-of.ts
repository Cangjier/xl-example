// xl:note `in` / `of` 现在是关键字：`in` 是保留字、`of` 是上下文关键字，
// 三种用法（for-in、`k in o`、映射类型的 `[K in keyof T]`）都该有 Keyword 标签。
// 代价是 For / Foreach 的判定要改成「Identifier 或 Keyword 都认」（IsWordUnit）
// xl:expect Keyword,Foreach,MappedType
const obj = { a: 1 };
for (const k in obj) {
  console.log(k);
}
for (const v of [1, 2]) {
  console.log(v);
}
const has = "a" in obj;
type Mapped<T> = { [K in keyof T]: T[K] };
