// xl:title 泛型箭头带约束：<T extends { length: number }>
// xl:judge stdout
// xl:end

const len = <T extends { length: number }>(x: T): number => x.length;
console.log(len("abc"), len([1, 2]), len({ length: 9 }));
