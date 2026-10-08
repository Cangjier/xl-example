// xl:title for-in 该带继承来的可枚举格
// xl:round 692
// xl:judge stdout
// xl:end

const base = { b: 1 };
const o = Object.create(base);
o.a = 2;
const seen = [];
for (const k in o) seen.push(k);
console.log(seen.sort().join(","));
