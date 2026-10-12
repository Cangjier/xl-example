// xl:title 泛型的约束 / 默认 / 多重约束全部擦掉
// xl:round 623
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

function f<T extends { a: number }, U = string>(x: T, y?: U): number { return x.a; }
class Box<T extends object = {}> { constructor(public v: T) {} }
console.log(f({ a: 1 }), new Box({ z: 2 }).v.z);
