// xl:title keys / values / entries 三个迭代器
// xl:round 291
// xl:judge stdout
// xl:end

const xs = ["a", "b"];
console.log([...xs.keys()].join(","), [...xs.values()].join(","));
for (const [i, v] of xs.entries()) console.log(i, v);
