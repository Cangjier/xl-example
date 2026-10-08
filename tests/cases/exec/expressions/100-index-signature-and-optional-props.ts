// xl:title 索引签名与可选属性：接口只有类型位，运行期就是普通对象
// xl:round 7
// xl:judge stdout
// xl:end

interface Bag { [k: string]: number; fixed: number; opt?: string }
const b: Bag = { fixed: 1, other: 2 };
const c: Bag = { fixed: 3 };
console.log(b.fixed, b.other, b.opt, c.fixed, "opt" in c, "opt" in b);
