// xl:title String.isWellFormed / toWellFormed：孤立代理项
// xl:round 676
// xl:judge stdout
// xl:end

const lone = "a\uD800b";
console.log(lone.isWellFormed(), "ab".isWellFormed());
console.log(lone.toWellFormed().isWellFormed(), lone.toWellFormed().length);
