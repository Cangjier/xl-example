// xl:title 数组的洞：`in` / `keys` / 遍历 / `length` 三面
// xl:round 750
// xl:judge stdout
// xl:end
const a: any[] = [1, , 3];
console.log(0 in a, 1 in a, 2 in a, a.length);
console.log(Object.keys(a).join(","), JSON.stringify(a));
console.log(a.map((v) => "m" + v).join(","));
console.log(a.filter(() => true).length, a.forEach ? (() => { let n = 0; a.forEach(() => n++); return n; })() : -1);
console.log(a.join("-"), [...a].length, Array.from(a).length);
console.log([...a].map((v) => String(v)).join(","), Array.from(a).map((v) => String(v)).join(","));
const b = [1, 2, 3];
b.length = 1;
console.log(b.length, JSON.stringify(b), b[1]);
b.length = 3;
console.log(b.length, JSON.stringify(b), 1 in b);
