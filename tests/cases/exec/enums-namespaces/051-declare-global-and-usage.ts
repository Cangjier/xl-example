// xl:title declare global 里的东西不产生运行期绑定
// xl:round 371
// xl:judge stdout
// xl:end
declare global { interface Window { custom: number } }
const local = 1;
function use(x: number): number { return x + local; }
console.log(use(1), typeof globalThis, local);
const arr = [1, 2, 3];
console.log(arr.map((v) => use(v)).join(","));
