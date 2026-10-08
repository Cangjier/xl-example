// xl:title Map 展开成键值对
// xl:round 692
// xl:judge stdout
// xl:end

console.log([...new Map([["a", 1], ["b", 2]])].map((p) => p[0] + p[1]).join(","));
