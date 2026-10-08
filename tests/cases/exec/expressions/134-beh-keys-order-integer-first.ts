// xl:title Object.keys 的次序：整数键在前、其余按插入序
// xl:round 678
// xl:judge stdout
// xl:end

const o: any = {};
o.b = 1;
o["2"] = 1;
o.a = 1;
o["1"] = 1;
console.log(Object.keys(o).join(","));
console.log(Object.getOwnPropertyNames(o).join(","));
