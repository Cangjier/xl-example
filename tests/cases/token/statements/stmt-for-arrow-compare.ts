// xl:note 条件段是箭头函数：`for` 头按 `;` 分段时不许把分号吃掉
// xl:expect For,ForInitial,ForCompare,Lamda,ForBody
// `() => 1` 的语句体截断会把结尾的 `;` 一起收走——那个 `;` 是 `for` 头的分隔符，
// 少了它 `ForReorganization` 找不到第二段，抛「(...)中语句不满足格式要求」。
for (; () => 1; ) {}
