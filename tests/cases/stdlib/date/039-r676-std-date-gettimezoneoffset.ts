// xl:title Date.getTimezoneOffset：与 UTC 的分钟差
// xl:round 702
// xl:judge stdout
// xl:end

const offset = new Date(0).getTimezoneOffset();
console.log(typeof offset, offset >= -1440 && offset <= 1440);
