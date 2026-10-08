// xl:title 箭头函数返回对象字面量 / 三元 / 数组
// xl:judge stdout
// xl:end

const make = (n: number) => ({ n, doubled: n * 2 });
const pick = (b: boolean) => (b ? { ok: true } : { ok: false });
const list = (n: number) => [n, n + 1];
console.log(make(3).doubled, pick(false).ok, list(5).join(","));
