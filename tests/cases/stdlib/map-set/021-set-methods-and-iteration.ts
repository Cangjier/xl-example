// xl:title Set：add / has / delete / size / 迭代 / forEach
// xl:judge stdout
// xl:end

const s = new Set<number>();
console.log(s.size, s.has(1), s.delete(1));
s.add(1).add(2).add(2);
console.log(s.size, s.has(2), [...s].join(","));
s.forEach((v, k, self) => console.log(v, k === v, self.size));
console.log(JSON.stringify([...s.entries()]));
