// xl:title 可选调用在**条件 / 三元 / 实参 / 模板**里
// xl:round 741
// xl:judge stdout
// xl:end
const o: any = { m: () => true };
const n: any = null;
if (o?.m?.()) console.log("yes");
console.log(n?.m?.() ? "T" : "F");
console.log([o?.m?.(), n?.m?.()].join("|"));
console.log(`a=${o?.m?.()}`);
