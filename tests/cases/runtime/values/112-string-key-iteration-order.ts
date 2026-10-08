// xl:title for..in 与 Object.keys 在同一个对象上同序
// xl:round 304
// xl:judge stdout
// xl:end

const o: any = { z: 1, 10: "ten", a: 2, 2: "two" };
const viaForIn: string[] = [];
for (const k in o) viaForIn.push(k);
console.log(viaForIn.join(","));
console.log(Object.keys(o).join(","));
