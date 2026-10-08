// xl:title `assign` 拷不拷符号键、拷不拷不可枚举
// xl:round 691
// xl:judge stdout
// xl:end
const s: any = Symbol("s");
const src: any = { a: 1 };
src[s] = 2;
Object.defineProperty(src, "h", { value: 3, enumerable: false });
const t: any = Object.assign({}, src);
console.log(t.a, t[s], t.h, Object.keys(t).length);
