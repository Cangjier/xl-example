// xl:title 键顺序在增删之后仍然稳定
// xl:round 371
// xl:judge stdout
// xl:end
const o: any = { c: 1, a: 2, 2: 3, 1: 4, b: 5 };
console.log(Object.keys(o).join(","));
delete o.a;
o.a = 6;
console.log(Object.keys(o).join(","));
o["10"] = 7;
o["3"] = 8;
console.log(Object.keys(o).join(","));
console.log(Object.values(o).join(","));
const m = new Map<string, number>();
m.set("z", 1); m.set("a", 2); m.set("z", 3);
console.log([...m.keys()].join(","));
