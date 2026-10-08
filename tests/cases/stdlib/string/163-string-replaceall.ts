// xl:title `replaceAll` 与子串自带的 `$`
// xl:round 691
// xl:judge stdout
// xl:end
console.log("a.b".replaceAll(".", "-"));
console.log("aaa".replaceAll("a", "$$"));
try { "abc".replaceAll("b", "$&"); } catch (e: any) { console.log("catch", e.constructor.name); }
