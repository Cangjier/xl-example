// xl:title 对象展开与剩余：符号键、访问器、原型属性
// xl:round 371
// xl:judge stdout
// xl:end
const sym = Symbol("s");
const proto = { inherited: 1 };
const src: any = Object.create(proto);
src.own = 2;
src[sym] = 3;
const copy = { ...src };
console.log(JSON.stringify(copy), Object.getOwnPropertySymbols(copy).length, (copy as any).inherited);
const { own, ...rest } = src;
console.log(own, JSON.stringify(rest), Object.getOwnPropertySymbols(rest).length);
let reads = 0;
const withGetter: any = {};
Object.defineProperty(withGetter, "g", { get() { reads += 1; return reads; }, enumerable: true });
const spread = { ...withGetter };
console.log(spread.g, reads);
