// xl:title 把数组 `length` 设成不可写之后 `push`
// xl:round 305
// xl:judge stdout
// xl:end

const xs: any = [1, 2];
Object.defineProperty(xs, "length", { writable: false });
try {
  xs.push(3);
  console.log("pushed", xs.length);
} catch (e) {
  console.log("threw", (e as Error).name);
}
