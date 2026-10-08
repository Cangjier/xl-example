// xl:title 对象键序：整数键升序在前、其余按写入序
// xl:round 330
// xl:judge stdout
// xl:end

const o: { [k: string]: number } = {};
o["b"] = 1;
o["2"] = 2;
o["a"] = 3;
o["1"] = 4;
console.log(Object.keys(o).join(","));
console.log(JSON.stringify(o));
