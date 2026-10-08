// xl:title 下标调用链当**二元右操作数**（第 743 轮收掉的那一格）
// xl:round 743
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }), g: (n: number) => ({ v: n }) };
const k = "f";
console.log(1 + o["f"]().v);
console.log(1 + o[k]().v);
console.log(o["g"](5).v + 2);
console.log(10 - o["f"]().v);
