// xl:title 互相引用的对象：照样回收得掉（mark-sweep）
// xl:judge stdout
// xl:end

for (let i = 0; i < 5000; i++) {
  const a: any = { name: "a" + i };
  const b: any = { name: "b" + i, peer: a };
  a.peer = b;
}
const survivor = { name: "alive" };
console.log(survivor.name);
