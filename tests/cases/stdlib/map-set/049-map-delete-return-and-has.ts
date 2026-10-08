// xl:title `Map.delete` 的返回值与删不存在的键
// xl:round 305
// xl:judge stdout
// xl:end

const m = new Map([["a", 1]]);
console.log(m.delete("a"), m.delete("a"), m.has("a"), m.size);
