// xl:title Date：getTime / UTC 取值 / 本地与 UTC 的同一时刻
// xl:judge stdout
// xl:end

const d = new Date(0);
console.log(d.getTime(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const e = new Date(2020, 0, 2, 3, 4, 5);
console.log(e.getFullYear(), e.getMonth(), e.getDate(), typeof e.getHours());
console.log(new Date(1000).getUTCSeconds(), Date.UTC(1970, 0, 1));
