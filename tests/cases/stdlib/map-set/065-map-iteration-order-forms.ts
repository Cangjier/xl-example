// xl:title Map 的迭代：插入序、删后重加排到末尾、forEach 三实参
// xl:round 371
// xl:judge stdout
// xl:end
const m = new Map([["a", 1], ["b", 2], ["c", 3]]);
m.delete("a");
m.set("a", 9);
console.log([...m.keys()].join(","), [...m.values()].join(","));
const rows: string[] = [];
m.forEach((v, k, self) => rows.push(k + "=" + v + "/" + (self === m)));
console.log(rows.join(" "));
console.log([...m].map((e) => e.join(":")).join(" "), m.size);
