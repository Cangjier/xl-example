// xl:title Object.groupBy / Map.groupBy
// xl:round 371
// xl:judge stdout
// xl:end
const xs = [1, 2, 3, 4, 5];
const byParity = Object.groupBy(xs, (v: number) => (v % 2 === 0 ? "even" : "odd"));
console.log(JSON.stringify(byParity));
const m = Map.groupBy(xs, (v: number) => v % 3);
console.log([...m.entries()].map((e) => e[0] + ":" + e[1].join("|")).join(" "));
