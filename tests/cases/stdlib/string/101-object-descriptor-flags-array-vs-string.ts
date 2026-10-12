// xl:title 描述符标志：数组元素、length、字符串下标三套不同
// xl:round 371
// xl:judge stdout
// xl:end
const a = [1];
const d = Object.getOwnPropertyDescriptor(a, "0");
console.log(d.writable, d.enumerable, d.configurable);
const dl = Object.getOwnPropertyDescriptor(a, "length");
console.log(dl.writable, dl.enumerable, dl.configurable);
const ds = Object.getOwnPropertyDescriptor("ab", "0");
console.log(ds.writable, ds.enumerable, ds.configurable);
