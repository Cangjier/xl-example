// xl:title 键顺序在 Object.keys 与 JSON 上一致
// xl:round 291
// xl:judge stdout
// xl:end

const o: any = { z: 1, 10: 2, a: 3, 2: 4 };
console.log(Object.keys(o).join(","));
console.log(JSON.stringify(o));
