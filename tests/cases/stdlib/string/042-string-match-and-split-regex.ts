// xl:title 字符串方法收正则：match / split(/\s+/)
// xl:judge stdout
// xl:want blocked
// xl:why 收正则的那几个字符串方法（`match` / `search` / `split(正则)`）要 `RegExp`。**必做**
// xl:end

console.log("a1b2".match(/\d/g)?.join(","));
console.log("a  b   c".split(/\s+/).join("|"));
