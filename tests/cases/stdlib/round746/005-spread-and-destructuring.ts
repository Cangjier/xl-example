// xl:title 展开与解构：对象 / 字符串 / 数组（含洞）/ 剩余 / 默认值 / 计算键 / 嵌套 / 形参位
// xl:round 746
// xl:judge stdout
// xl:want pass
// xl:end

const base = Object.defineProperty({ a: 1 }, "hidden", { value: 2, enumerable: false });
console.log(JSON.stringify({ ...base }), Object.keys({ ...base }).join(","));
console.log(JSON.stringify({ ..."ab" }));
console.log(JSON.stringify([..."ab"]), JSON.stringify([...new Set([1, 2])]));
const arr = [1, , 3];
console.log(JSON.stringify([...arr]));
const { a = 1, b: c = 2 } = { b: 3 } as any;
console.log(a, c);
const [x, , y = 9] = [1, 2] as any;
console.log(x, y);
const { p, ...rest } = { p: 1, q: 2, r: 3 };
console.log(p, JSON.stringify(rest));
const [h, ...tail] = [1, 2, 3];
console.log(h, JSON.stringify(tail));
const [n1 = 5] = [] as any;
console.log(n1);
const key = "k";
const { [key]: got } = { k: 7 } as any;
console.log(got);
const { m: { n } } = { m: { n: 8 } } as any;
console.log(n);
const f = ({ a }: any, [b]: any) => a + b;
console.log(f({ a: 1 }, [2]));
