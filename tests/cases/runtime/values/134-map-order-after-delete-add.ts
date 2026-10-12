// xl:title `Map` 删掉再插，迭代顺序是「先来的先出」
// xl:round 305
// xl:judge stdout
// xl:end

const m = new Map([["a", 1], ["b", 2], ["c", 3]]);
m.delete("a");
m.set("d", 4);
console.log([...m.keys()].join(","), m.size);
