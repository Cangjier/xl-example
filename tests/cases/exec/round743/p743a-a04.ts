// xl:title 下标调用链**再往后接后缀**（第 743 轮一并收掉）
// xl:round 743
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1, w: { z: 9 } }) };
console.log(o["f"]().v.toString() + "");
console.log(typeof o["f"]().v);
console.log(o["f"]().w.z + 1);
console.log(o["f"]().v + 0);
