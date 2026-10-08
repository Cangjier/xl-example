// xl:title `Array.from` 认迭代协议、`Array.from` 的类数组那一半
// xl:round 737
// xl:judge stdout
// xl:end
const box: any = { [Symbol.iterator]() { let i = 0; return { next: () => (i < 2 ? { value: "v" + ++i, done: false } : { value: undefined, done: true }) }; } };
console.log(Array.from(box).join(","));
console.log(Array.from("ab").join(","), Array.from(new Set([1, 1, 2])).join(","));
console.log(Array.from({ length: 2, 0: "a" }).join(","));
console.log(Array.from(new Map([[1, 2]])).length, Array.from(new Map([[1, 2]]))[0].join(":"));
