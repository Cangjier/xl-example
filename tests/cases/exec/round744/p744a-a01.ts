// xl:title 一元前缀 + 下标调用链 + 更松的二元（第 744 轮收掉的那一格）
// xl:round 744
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }), s: () => ({ v: "x" }) };
console.log(typeof o["f"]().v + "");
console.log(typeof o["f"]().v === "number");
console.log(!o["f"]().v + "");
console.log(typeof o["s"]().v + "!");
