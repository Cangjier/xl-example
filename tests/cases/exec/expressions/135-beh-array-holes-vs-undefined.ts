// xl:title 数组的洞与显式 undefined 在 keys / in / forEach 上的差别
// xl:round 678
// xl:judge stdout
// xl:end

const hole: any[] = [1, , 3];
const filled: any[] = [1, undefined, 3];
console.log(Object.keys(hole).join(","), Object.keys(filled).join(","));
console.log(1 in hole, 1 in filled);
let seen = 0;
hole.forEach(() => { seen += 1; });
console.log(seen, hole.length);
console.log(hole.join("-"), filled.join("-"));
