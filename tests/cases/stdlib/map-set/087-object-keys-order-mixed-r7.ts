// xl:title Object.keys 的顺序：整数键在前、其余按写入序
// xl:round 7
// xl:judge stdout
// xl:end

const o: any = {};
o.b = 1;
o["2"] = 2;
o.a = 3;
o["1"] = 4;
o["01"] = 5;
console.log(Object.keys(o).join(","));
console.log(Object.values(o).join(","));
console.log(Object.entries(o).map(([k]) => k).join("-"));
