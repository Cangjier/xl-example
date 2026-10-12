// xl:title Date 的老式成员那一族：toUTCString / toGMTString / getYear / setTime / setYear / getTimezoneOffset 的值与形状
// xl:round 702
// xl:judge stdout
// xl:want pass
// xl:end
// toUTCString 那一段是**与时区、区域表都无关**的固定拼法，所以逐字节可对；
// getTimezoneOffset 本仓恒为 0（本地口径就是 UTC），只钉「是个 [-1440,1440] 里的整数」。
const d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5, 6));
console.log(d.toUTCString());
console.log(d.toGMTString() === d.toUTCString());
console.log(d.getYear(), d.getUTCFullYear());
console.log(typeof d.getTimezoneOffset(), d.getTimezoneOffset() >= -1440 && d.getTimezoneOffset() <= 1440);

const t = new Date(0);
console.log(t.setTime(1000), t.getTime());

const y = new Date(Date.UTC(2020, 0, 2, 3, 4, 5, 6));
console.log(y.setYear(99), y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate());
const y2 = new Date(Date.UTC(2020, 0, 2));
console.log(y2.setYear(2021), y2.getUTCFullYear());

const bad = new Date(NaN);
console.log(bad.toUTCString(), bad.getYear());
