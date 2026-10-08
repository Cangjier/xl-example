// xl:title String.raw 作为标签 + 普通调用两种形态
// xl:judge stdout
// xl:end

console.log(String.raw`a\nb`);
console.log(String.raw({ raw: ["x", "y"] }, 1));
console.log(String.raw`${1}\t${2}`.length);
