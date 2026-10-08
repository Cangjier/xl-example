// xl:title copyWithin 的三格实参与负下标
// xl:judge stdout
// xl:end

const a = [1, 2, 3, 4, 5];
console.log(a.copyWithin(0, 3).join(","));
const b = [1, 2, 3, 4, 5];
console.log(b.copyWithin(1, 0, 2).join(","));
const c = [1, 2, 3, 4, 5];
console.log(c.copyWithin(-2, 0).join(","), c.length);
