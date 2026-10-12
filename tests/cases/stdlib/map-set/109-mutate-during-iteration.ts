// xl:title 遍历中改集合：`forEach` 每一步现读一次（删掉的跳过、新加的看得见）
// xl:round 687
// xl:judge stdout
// xl:end

// Map：删掉后面那一格之后不能留一个空洞给下一次回调（旧读数给 "a,b," —— 尾巴上那个空键）
const m = new Map<string, number>();
m.set("a", 1);
m.set("b", 2);
m.set("c", 3);
const seen: string[] = [];
m.forEach((v, k) => {
  seen.push(k);
  if (k === "a") m.delete("b");
});
console.log("map-delete-future", seen.join(","), m.size);

// Map：遍历中新增的键要看得见
const grown = new Map<string, number>();
grown.set("a", 1);
grown.set("b", 2);
const viaForEach: string[] = [];
grown.forEach((v, k) => {
  viaForEach.push(k);
  if (k === "a") grown.set("c", 3);
});
console.log("map-foreach-add", viaForEach.join(","));


// Set：删掉后面那一格同样不能留空洞，新增的同样要看得见
const s = new Set<number>([1, 2, 3]);
const setSeen: number[] = [];
s.forEach((v) => {
  setSeen.push(v);
  if (v === 1) s.delete(3);
});
console.log("set-delete-future", setSeen.join(","), s.size);

const grown2 = new Set<number>([1, 2]);
const setGrown: number[] = [];
grown2.forEach((v) => {
  setGrown.push(v);
  if (v === 1) grown2.add(9);
});
console.log("set-foreach-add", setGrown.join(","), grown2.size);

