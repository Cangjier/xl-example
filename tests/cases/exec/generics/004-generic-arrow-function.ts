// xl:title 泛型箭头函数：<T>(x: T) => x
// xl:judge stdout
// xl:end

const id = <T>(x: T): T => x;
console.log(id(1), id("a"), id(true));
