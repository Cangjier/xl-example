// xl:title 同一个数只有一种标签：整的收成 Int、否则 Float
// xl:judge stdout
// xl:end

const a = 4 / 2;
const b = 5 / 2;
console.log(a, b, a === 2, b === 2.5);
console.log(Math.floor(b), Math.ceil(b), b - 0.5);
