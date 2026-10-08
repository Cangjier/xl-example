// xl:title 下标调用链当**二元左操作数**（第 743 轮收掉的那一格）
// xl:round 743
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
console.log(o["f"]().v + 1);
console.log(o[k]().v + 1);
console.log(o["f"]().v * 2 + 1);
console.log(o["f"]().v + "");
