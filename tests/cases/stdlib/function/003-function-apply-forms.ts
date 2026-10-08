// xl:title apply 的实参数组与 this
// xl:round 304
// xl:judge stdout
// xl:end

function add(a: number, b: number) { return a + b + (this?.base ?? 0); }
console.log(add.apply({ base: 100 }, [1, 2]), add.apply(null, [3, 4]));
console.log(Math.max.apply(null, [3, 9, 4]));
