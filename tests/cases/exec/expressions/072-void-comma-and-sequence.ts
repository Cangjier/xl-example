// xl:title void / 逗号运算符 / 序列表达式
// xl:round 371
// xl:judge stdout
// xl:end
let n = 0;
const r = (n = 1, n = 2, n + 1);
console.log(r, n);
console.log(void 0, void "x", typeof void 0);
for (let i = 0, j = 3; i < j; i++, j--) { }
console.log((1, 2), (n = 5, n * 2), n);
const f = () => (n = 7, n); 
console.log(f(), n);
