// xl:title void / typeof / delete 的组合：都读成表达式
// xl:round 7
// xl:judge stdout
// xl:end

let n = 1;
console.log(void 0, typeof void 0, typeof typeof 1);
const o: any = { a: 1 };
console.log(delete o.a, delete o.b, "a" in o);
console.log(typeof undeclaredName, typeof (() => {}));
