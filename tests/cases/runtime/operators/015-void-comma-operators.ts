// xl:title `,` 与 `void`：求值次序与结果值
// xl:judge stdout
// xl:end

let a = 0;
const b = (a = 1, a + 1);
console.log(b, a);
const c = (a = 5, a = 6, a);
console.log(c, a, void 0, typeof void 0);
