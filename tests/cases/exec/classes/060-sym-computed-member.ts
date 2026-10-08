// xl:title 计算成员名：读写一个 symbol 键的属性
// xl:round 678
// xl:judge stdout
// xl:end

const s = Symbol("k");
const o: any = {};
o[s] = 1;
console.log(o[s], typeof s);
const o2: any = { [s]: 2 };
console.log(o2[s]);
