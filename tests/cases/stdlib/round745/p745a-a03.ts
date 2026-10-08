// xl:title 巨值 `repeat` / `padStart`：码元总数越过 `int` 那一格该抛 `RangeError`
// xl:round 745
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok len=" + v.length;
  } catch (e) {
    return "throw " + (e as Error).constructor.name;
  }
};
console.log(show(() => "abcd".repeat(2 ** 29)));
console.log(show(() => "a".repeat(2 ** 30)));
console.log(show(() => "ab".padStart(2 ** 31 + 2, "0")));
console.log(show(() => "ab".padEnd(2 ** 32 - 1, "x")));
console.log(show(() => "ab".repeat(3)), show(() => "ab".padStart(4, "0")));
