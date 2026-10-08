// xl:title Date.getTimezoneOffset：与 UTC 的分钟差
// xl:judge stdout
// xl:want blocked
// xl:why `Date.prototype.getTimezoneOffset` 没装：成员表里没有那一格，调用报 cannot call a non-closure value
// xl:end

const offset = new Date(0).getTimezoneOffset();
console.log(typeof offset, offset >= -1440 && offset <= 1440);
