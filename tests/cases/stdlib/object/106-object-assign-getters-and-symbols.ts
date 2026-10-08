// xl:title Object.assign：读的是取值器（不是描述符）、Symbol 键也搬
// xl:judge stdout
// xl:end

const s = Symbol("s");
const src: any = { get g() { return "got"; } };
src[s] = 1;
const dst = Object.assign({}, src);
console.log(dst.g, dst[s], Object.getOwnPropertyDescriptor(dst, "g").get === undefined);
const d2 = Object.getOwnPropertyDescriptor(dst, "g");
console.log(d2.writable, d2.enumerable);
