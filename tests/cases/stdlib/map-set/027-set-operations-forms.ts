// xl:title Set 与数组互转、去重、size 与 delete
// xl:judge stdout
// xl:end

const s = new Set([1, 1, 2, 3]);
console.log(s.size, [...s].join(","), s.delete(2), s.has(2));
console.log([...new Set("aabbc")].join(""));
