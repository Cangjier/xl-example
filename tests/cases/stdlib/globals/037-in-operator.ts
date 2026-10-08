// xl:title in：数组下标 / 原型链 / 空位
// xl:round 623
// xl:judge stdout
// xl:end

const a = [1, , 3];
console.log(0 in a, 1 in a, 2 in a, 3 in a, "length" in a, "push" in a);
console.log("toString" in {}, "z" in { z: undefined });
