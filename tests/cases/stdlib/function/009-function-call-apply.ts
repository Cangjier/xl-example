// xl:title call / apply 的 this 与类数组实参
// xl:round 371
// xl:judge stdout
// xl:end
function describe(this: any, a: number, b: number) { return this.tag + ":" + a + ":" + b; }
console.log(describe.call({ tag: "c" }, 1, 2));
console.log(describe.apply({ tag: "a" }, [3, 4]));
console.log(Math.max.apply(null, [1, 5, 3] as any));
const args = { length: 2, 0: "x", 1: "y" };
console.log(describe.apply({ tag: "like" }, args as any));
