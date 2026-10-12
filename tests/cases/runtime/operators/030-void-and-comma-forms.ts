// xl:title void 与逗号运算符的返回值
// xl:round 304
// xl:judge stdout
// xl:end

let n = 0;
const r = (n += 1, n += 2, n);
console.log(r, n);
console.log(void 0, void "x", typeof void 0);
const f = () => void console.log("side");
console.log(f());
