// xl:title keys / values / entries 与 fromEntries 的往返
// xl:round 323
// xl:judge stdout
// xl:end

const o = { a: 1, b: 2 };
console.log(Object.keys(o).join(","), Object.values(o).join(","));
console.log(Object.entries(o).map(([k, v]) => k + "=" + v).join("&"));
console.log(JSON.stringify(Object.fromEntries(Object.entries(o))));
