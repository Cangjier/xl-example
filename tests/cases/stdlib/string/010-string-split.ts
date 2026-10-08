// xl:title String.split：分隔符、空分隔符、limit、没找到
// xl:judge stdout
// xl:end

console.log("a,b,,c".split(",").join("|"));
console.log("abc".split("").join("-"), "abc".split().length, "".split(",").length);
console.log("a-b-c".split("-", 2).join("|"), "abc".split("z").join("|"));
