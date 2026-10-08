// xl:title symbol 的 description 与 String(symbol)
// xl:round 678
// xl:judge stdout
// xl:end

const s = Symbol("desc");
console.log(s.description, String(s), s.toString());
const bare = Symbol();
console.log(bare.description, String(bare));
