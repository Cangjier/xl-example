// xl:title Array.from 吃下各种可迭代对象
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Array.from(new Map([["a", 1]])).length, JSON.stringify(Array.from(new Map([["a", 1]]))));
console.log(Array.from(new Set("abc")).join("-"));
function* gen() { yield 1; yield 2; }
console.log(Array.from(gen()).join(","));
const custom = { [Symbol.iterator]() { let i = 0; return { next: () => (i < 2 ? { value: i++, done: false } : { value: undefined, done: true }) }; } };
console.log(Array.from(custom as any).join(","));
