// xl:title String.split：正则里的捕获组会进结果、limit 与空分隔符
// xl:judge stdout
// xl:want blocked
// xl:why 按正则切分要 `RegExp`。**必做**
// xl:end

console.log("a1b2c".split(/(\d)/).join("|"));
console.log("a,b,c".split(/,/, 2).join("|"), "abc".split("").join("|"), "".split(/,/).length);
