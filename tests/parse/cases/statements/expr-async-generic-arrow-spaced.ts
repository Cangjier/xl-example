// xl:note `async` 泛型箭头函数（`async` 与 `<` 之间留空格）
// xl:known-gap 同上一族（`async <T>(x: T) => x`，缺 9）（r663 探针池 c-async-generic-lamda2）
// xl:expect Lamda
const h = async <T>(x: T) => x;
