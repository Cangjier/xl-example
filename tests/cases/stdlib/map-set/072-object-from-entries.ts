// xl:title Object.fromEntries / Object.entries 往返
// xl:round 623
// xl:judge stdout
// xl:end

const o = Object.fromEntries([["a", 1], ["b", 2]]);
console.log(JSON.stringify(o));
console.log(Object.entries({ x: 1, y: 2 }).map(([k, v]) => k + v).join(","));
