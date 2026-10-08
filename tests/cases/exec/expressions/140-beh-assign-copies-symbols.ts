// xl:title assign / spread 拷不拷 symbol 键与访问器取值
// xl:round 678
// xl:judge stdout
// xl:end

const sym = Symbol("k");
const src: any = { a: 1 };
src[sym] = 2;
Object.defineProperty(src, "g", { get() { return "got"; }, enumerable: true });
const target: any = Object.assign({}, src);
console.log(target.a, target[sym], target.g);
const spread: any = { ...src };
console.log(spread.a, spread[sym], spread.g);
