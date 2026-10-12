// xl:title Object.fromEntries
// xl:judge stdout
// xl:end

console.log(JSON.stringify(Object.fromEntries([["a", 1], ["b", 2]])));
console.log(JSON.stringify(Object.fromEntries(new Map([["k", "v"]]))));
