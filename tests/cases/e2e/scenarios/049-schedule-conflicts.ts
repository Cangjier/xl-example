// xl:title 日程排期：重叠检测与排序输出
// xl:round 331
// xl:judge stdout
// xl:end

type Slot = { name: string; start: number; end: number };
const slots: Slot[] = [
  { name: "standup", start: 9, end: 10 },
  { name: "review", start: 11, end: 12 },
  { name: "design", start: 10, end: 11 },
  { name: "retro", start: 12, end: 13 },
  { name: "overlap", start: 10.5, end: 11.5 },
];
slots.sort((a, b) => a.start - b.start);
const conflicts: string[] = [];
for (let i = 1; i < slots.length; i++) {
  if (slots[i].start < slots[i - 1].end) {
    conflicts.push(slots[i - 1].name + "/" + slots[i].name);
  }
}
console.log(slots.map((s) => s.name).join(","));
console.log(conflicts.join(" "));
console.log(slots.length, conflicts.length);
