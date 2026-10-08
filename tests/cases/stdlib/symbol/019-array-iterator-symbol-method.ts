// xl:title 数组的 `Symbol.iterator` 是一个可调用的方法
// xl:round 305
// xl:judge stdout
// xl:end

const xs = [1, 2];
const it = (xs as any)[Symbol.iterator]();
console.log(typeof (xs as any)[Symbol.iterator], JSON.stringify(it.next()), JSON.stringify(it.next()));
