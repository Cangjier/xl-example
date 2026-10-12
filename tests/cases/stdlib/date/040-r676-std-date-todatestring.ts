// xl:title Date.toDateString / toTimeString
// xl:judge stdout
// xl:want blocked
// xl:why `Date.prototype.toDateString` / `toTimeString` 没装：同上一格，本地时区名的渲染还没有那一支
// xl:end

const d = new Date(2020, 0, 2, 3, 4, 5);
console.log(d.toDateString());
console.log(d.toTimeString());
