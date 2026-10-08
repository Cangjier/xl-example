// xl:title 下标调用链当实参
// xl:round 711
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
console.log(typeof o[k]().v);
