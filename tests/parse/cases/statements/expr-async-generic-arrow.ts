// xl:note `async` 泛型箭头函数（类型参数紧跟 `async`）
// xl:known-gap `async<T>(x) => x` 那一段不成形（缺 7）：`async` 与泛型段谁先认领没有定义（r663 探针池 c-async-generic-lamda）
// xl:expect Lamda
const h = async<T>(x) => x;
