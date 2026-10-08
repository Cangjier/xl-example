// xl:title 数组迭代器与解构、entries 的配合
// xl:round 623
// xl:judge stdout
// xl:end

const [a, b] = [1, 2, 3];
console.log(a, b);
const it = [10, 20][Symbol.iterator]();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
console.log([... [1, 2].entries()].map((e) => e.join(":")).join(","));
