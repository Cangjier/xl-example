// xl:title `Symbol()` 的 `description` / `toString` / `typeof`
// xl:round 736
// xl:judge stdout
// xl:end
const s = Symbol("d");
console.log(typeof s, String(s), s.description);
console.log(Symbol().description, Symbol("").description);
console.log(String(Symbol.for("k")));
