// xl:title Map.groupBy：按键分组成 Map
// xl:round 323
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4, 5];
const m = Map.groupBy(xs, (n) => (n % 2 === 0 ? "even" : "odd"));
console.log(m instanceof Map, m.get("odd").join(","), m.get("even").join(","));
