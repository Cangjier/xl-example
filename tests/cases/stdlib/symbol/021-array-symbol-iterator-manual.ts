// xl:title 数组的 `Symbol.iterator` 是一个真方法（取出来自己走）
// xl:round 308
// xl:judge stdout
// xl:end

const it: any = [10, 20][Symbol.iterator]();
console.log(it.next().value, it.next().value, it.next().done);
const cursor: any = [1, 2, 3][Symbol.iterator]();
console.log([...cursor].join(","));
console.log(typeof [][Symbol.iterator]);
