// xl:title Object.fromEntries 吃 Map 与键值对数组
// xl:round 291
// xl:judge stdout
// xl:end

const m = new Map([["a", 1], ["b", 2]]);
console.log(JSON.stringify(Object.fromEntries(m)));
console.log(JSON.stringify(Object.fromEntries([["x", 1], ["y", 2]])));
console.log(Object.entries({ a: 1 })[0][1]);
