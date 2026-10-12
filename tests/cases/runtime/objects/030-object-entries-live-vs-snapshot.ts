// xl:title keys / values / entries 返回的是快照
// xl:round 371
// xl:judge stdout
// xl:end
const o: any = { a: 1, b: 2 };
const keys = Object.keys(o);
o.c = 3;
console.log(keys.join(","), Object.keys(o).join(","));
const vals = Object.values(o);
o.a = 99;
console.log(vals.join(","), Object.values(o).join(","));
const entries = Object.entries(o);
o.d = 4;
console.log(entries.length, Object.entries(o).length);
const frozen = Object.freeze({ ...o });
console.log(Object.keys(frozen).join(","), Object.isFrozen(frozen));
