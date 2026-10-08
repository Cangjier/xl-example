// xl:title `Map.groupBy` 分出来的是 `Map`（键可以是任意值）
// xl:round 305
// xl:judge stdout
// xl:end

const m = Map.groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? "even" : "odd"));
console.log(m instanceof Map, m.size, JSON.stringify([...m.entries()]));
