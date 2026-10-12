// xl:title Set 的去重与迭代：NaN 只算一个、forEach 的三个实参
// xl:judge stdout
// xl:end

const s = new Set([1, 1, NaN, NaN, 0, -0, "1"]);
console.log(s.size, s.has(NaN), s.has(0), s.has(-0));
const args: string[] = [];
s.forEach((v, k, self) => { args.push(String(v) + "=" + String(k) + "/" + (self === s)); });
console.log(args.join("|"));
console.log([...s].join(","));
