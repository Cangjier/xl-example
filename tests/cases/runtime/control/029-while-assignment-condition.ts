// xl:title `while ((v = xs.shift()) !== undefined)`：条件里的赋值
// xl:round 305
// xl:judge stdout
// xl:end

const xs = [1, 2, 3];
let total = 0;
let v: number | undefined;
while ((v = xs.shift()) !== undefined) {
  total += v;
}
console.log(total, xs.length);
