// xl:title `Array` 构造的单实参非法长度：`-1` / `2.5` / `2³²`
// xl:round 745
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    return "ok " + JSON.stringify(f());
  } catch (e) {
    return "throw " + (e as Error).constructor.name;
  }
};
console.log(show(() => Array(-1)));
console.log(show(() => Array(2.5)));
console.log(show(() => Array(0x100000000)));
console.log(show(() => new Array(-1)));
console.log(show(() => Array(2)), show(() => Array(-0)));
