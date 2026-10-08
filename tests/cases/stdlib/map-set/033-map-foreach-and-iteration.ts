// xl:title Map.forEach 三个实参与 for..of 解构
// xl:round 291
// xl:judge stdout
// xl:end

const m = new Map([["a", 1], ["b", 2]]);
m.forEach((v, k, self) => console.log(k, v, self.size));
for (const [k, v] of m) console.log(k + "=" + v);
console.log([...m.entries()].length, [...m.values()].join(","));
