// xl:title Map 的迭代顺序、forEach 三个实参、展开
// xl:judge stdout
// xl:end

const m = new Map([["b", 2], ["a", 1]]);
console.log([...m.keys()].join(","), [...m.values()].join(","));
console.log(JSON.stringify([...m]));
m.forEach((v, k, self) => console.log(k, v, self.size, self === m));
