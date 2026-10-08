// xl:title Map.keys / values / entries / forEach / 展开
// xl:judge stdout
// xl:end

const m = new Map([["a", 1], ["b", 2]]);
console.log([...m.keys()].join(","), [...m.values()].join(","));
console.log([...m.entries()].map((p) => p[0] + p[1]).join(","));
let s = "";
m.forEach((v, k) => { s += k + "=" + v + ";"; });
console.log(s, [...m].length);
