// xl:title isWellFormed / toWellFormed
// xl:round 651
// xl:judge stdout
// xl:end

const lone = "a\uD800b";
console.log(lone.isWellFormed(), "abc".isWellFormed(), lone.toWellFormed().length, "abc".toWellFormed());
