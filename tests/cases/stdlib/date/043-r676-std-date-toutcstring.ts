// xl:title Date.toUTCString：UTC 的可读文本
// xl:judge stdout
// xl:want blocked
// xl:why `Date.prototype.toUTCString` 没装：成员表里没有那一格，调用报 cannot call a non-closure value
// xl:end

console.log(new Date(0).toUTCString());
console.log(typeof Date.prototype.toUTCString);
