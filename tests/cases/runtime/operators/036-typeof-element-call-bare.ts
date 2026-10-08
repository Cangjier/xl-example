// xl:title `typeof` 后面直接跟「下标调用」（没有外层括号）
// xl:round 307
// xl:judge stdout
// xl:end

const o: any = { m: () => ({ a: 1 }) };
console.log(typeof o["m"](), typeof o.m());
