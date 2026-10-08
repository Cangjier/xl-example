// xl:title 正则字面量用在字符串方法上：replace / search / split（正则那一族）
// xl:judge stdout
// xl:want blocked
// xl:why 正则字面量没进来。**必做**
// xl:end

console.log("abcabc".search(/b/), "abc".search(/z/));
console.log("a1b2c".split(/(\d)/).join("|"));
console.log("a1b2".replace(/\d/g, "#"));
