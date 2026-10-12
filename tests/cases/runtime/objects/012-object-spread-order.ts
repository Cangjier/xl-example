// xl:title 对象展开的覆盖次序：后写的赢
// xl:judge stdout
// xl:end

const base = { a: 1, b: 2 };
const over: any = { ...base, b: 3, c: 4 };
console.log(JSON.stringify(over), Object.keys(over).join(","));
const back: any = { b: 3, ...base };
console.log(JSON.stringify(back));
const copy: any = { ...base };
console.log(copy !== base, copy.a);
