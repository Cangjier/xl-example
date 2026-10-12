// xl:title Date 月末溢出与 setDate(0)
// xl:round 647
// xl:judge stdout
// xl:end

const d = new Date(Date.UTC(2020, 0, 31));
const e = new Date(d.getTime());
e.setUTCMonth(1);
console.log(e.toISOString());
const f = new Date(Date.UTC(2020, 2, 1));
f.setUTCDate(0);
console.log(f.toISOString());
