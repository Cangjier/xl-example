// xl:title `isWellFormed`：落单代理给假、正常串给真
// xl:round 330
// xl:judge stdout
// xl:end

console.log("abc".isWellFormed(), "\uD800".isWellFormed(), "\uD83D\uDE00".isWellFormed());
console.log("a\uDFFFb".isWellFormed());
