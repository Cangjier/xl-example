// xl:title Array / Object 当函数用与当构造器用
// xl:judge stdout
// xl:end

console.log(Array(3).length, Array(1, 2).length, Object({ a: 1 }).a, new Object(null as any) !== null);
console.log(typeof Array, typeof Object, Array.isArray(Array(1)));
