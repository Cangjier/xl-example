// xl:title 逗号表达式与 `void`
// xl:round 691
// xl:judge stdout
// xl:end
let a = 1;
const r = (a = 2, a + 1);
console.log(r, a);
console.log(void 0, typeof void 0);
