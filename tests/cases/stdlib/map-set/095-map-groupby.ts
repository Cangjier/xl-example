// xl:title Map.groupBy：按数值键分组（分组表是 Map）
// xl:round 676
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4, 5];
const byParity = Map.groupBy(xs, (n: number) => n % 2);
console.log(byParity.get(0)?.join(","), byParity.get(1)?.join(","));
console.log(byParity.size, byParity instanceof Map);
