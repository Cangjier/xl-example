// xl:title 手写可迭代对象 + for..of
// xl:round 291
// xl:judge stdout
// xl:end

const arr = [1, 2, 3];
const it = arr[Symbol.iterator]();
let out = "";
for (const v of { [Symbol.iterator]: () => it } as any) out += v;
console.log(out);
