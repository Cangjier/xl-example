// xl:title new Date(y, m, d, h, mi, s)：多实参构造
// xl:judge stdout
// xl:end

const d = new Date(2020, 0, 2, 3, 4, 5);
console.log(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getUTCFullYear());
