// xl:title ??= 落在成员位与下标位（只算一次左值）
// xl:round 8
// xl:judge stdout
// xl:end

let calls = 0;
const target = { a: null, b: 0 };
const pick = () => { calls++; return target; };
pick().a ??= 5;
pick().b ??= 5;
const idx = () => { calls++; return "c"; };
target[idx()] ??= 9;
console.log(target.a, target.b, target.c, calls);
