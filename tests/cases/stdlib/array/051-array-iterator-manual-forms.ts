// xl:title 手动用 keys / values / entries 迭代器
// xl:round 304
// xl:judge stdout
// xl:end

const k = ["a", "b"].keys();
const v = ["a", "b"].values();
const e = ["a", "b"].entries();
console.log(k.next().value, v.next().value, JSON.stringify(e.next().value));
console.log(JSON.stringify([...["x", "y"].entries()]));
