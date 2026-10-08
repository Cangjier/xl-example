// xl:title Set.forEach 的三个实参与展开
// xl:round 291
// xl:judge stdout
// xl:end

const s = new Set([1, 2]);
s.forEach((v, v2, self) => console.log(v, v2, self.size));
console.log([...s].join(","), Array.from(s).join(","));
console.log(new Set([...s, 3]).size);
