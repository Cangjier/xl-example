// xl:title 对象展开读的是值、不是描述符；getter 被求值一次
// xl:round 371
// xl:judge stdout
// xl:end
let reads = 0;
const src: any = {};
Object.defineProperty(src, "g", { get() { reads = reads + 1; return reads; }, enumerable: true });
const copy = { ...src };
console.log(copy.g, reads, Object.getOwnPropertyDescriptor(copy, "g").get);
const merged = { a: 1, ...{ a: 2, b: 3 }, b: 4 };
console.log(JSON.stringify(merged));
