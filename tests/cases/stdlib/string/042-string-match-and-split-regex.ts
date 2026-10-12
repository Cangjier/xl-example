// xl:title 字符串方法收正则：match / split(/\s+/)
// xl:judge stdout
// xl:want blocked
// xl:why 收正则的那几个字符串方法（`match` / `search` / `split(正则)`）要 `RegExp`。**必做**。
//        本条卡在**语法层**（正则字面量整份进不了门）；「实参是字符串也要先转 RegExp」那一格
//        是另一条账，见 `212-string-search-string-argument-differ`。
// xl:end

console.log("a1b2".match(/\d/g)?.join(","));
console.log("a  b   c".split(/\s+/).join("|"));
