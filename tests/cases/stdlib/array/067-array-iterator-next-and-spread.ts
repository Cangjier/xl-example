// xl:title 数组迭代器：`next()` 与展开是同一个来源
// xl:round 331
// xl:judge stdout
// xl:end

const xs = [10, 20, 30];
const it = xs.values();
console.log(it.next().value, it.next().value, it.next().value, it.next().done);
console.log([...xs.keys()].join(","), [...xs.entries()].map((p) => p.join(":")).join(" "));
console.log(Array.from(xs.values()).length);
