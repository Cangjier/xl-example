// xl:title Date 的数值化：相减、比较、Number()
// xl:round 291
// xl:judge stdout
// xl:end

const a = new Date(1000);
const b = new Date(2000);
console.log(b.getTime() - a.getTime(), a < b, +a, a.getTime() === 1000);
console.log(new Date(1500).getTime(), Number(new Date(500)));
