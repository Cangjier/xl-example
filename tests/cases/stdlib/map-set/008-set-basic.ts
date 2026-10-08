// xl:title Set：add / has / delete / size / 去重
// xl:judge stdout
// xl:end

const s = new Set<number>([1, 2, 2, 3]);
console.log(s.size, s.has(2), s.has(9), [...s].join(","));
console.log(s.delete(1), s.delete(1), s.size);
s.add(4).add(4);
console.log([...s].join(","));
