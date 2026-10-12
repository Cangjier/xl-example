// xl:title ToPrimitive 先 valueOf 后 toString，以及 Date 反过来
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why `String(new Date(0))` 打的是 **UTC** 墙上时间（`Thu Jan 01 1970 00:00:00 GMT+0000 (Coordinated Universal Time)`），`node` 打的是**宿主本地时区**（`GMT+0800 (中国标准时间)`）——与 `Date` 那一族（`gap-r676-std-date-local-time` / `r676-std-date-iso`）**同一个根**：本地分量与本地时区名都还没有，所以这一条是那一族的**第三个出口**（前两个是 `getTime` 与 `toISOString`）
// xl:end

const o: any = {
  valueOf() { return "v"; },
  toString() { return "t"; },
};
console.log(`${o}`, o + "");
const d: any = new Date(0);
console.log(typeof (d as any) + (d as any), typeof d.toString());
