// xl:title 可选链出现在被调用者、实参与 new 的类型位
// xl:round 8
// xl:judge stdout
// xl:end

const o = { m() { return { n: () => 7 }; } };
console.log(o?.m()?.n?.());
const arr = [1, 2, 3];
console.log(arr?.map((x) => x * 2)?.join("-"));
class Box { constructor(v) { this.v = v; } }
const B = Box;
console.log(new B(3).v);
