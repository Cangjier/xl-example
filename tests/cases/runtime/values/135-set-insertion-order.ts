// xl:title `Set` 按插入序迭代，重复项不占新位置
// xl:round 305
// xl:judge stdout
// xl:end

const s = new Set([3, 1, 3, 2]);
s.add(1);
console.log([...s].join(","), s.size);
