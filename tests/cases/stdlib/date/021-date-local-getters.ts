// xl:title Date 的本地 getter 与多实参构造
// xl:round 323
// xl:judge stdout
// xl:end

const d = new Date(2020, 0, 2, 3, 4, 5);
console.log(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
console.log(new Date(2020, 5, 31).getMonth(), d.getDay() >= 0);
