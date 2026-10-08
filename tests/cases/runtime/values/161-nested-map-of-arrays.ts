// xl:title `Map` 装数组：就地追加与嵌套遍历
// xl:round 330
// xl:judge stdout
// xl:end

const groups = new Map<string, number[]>();
for (const n of [1, 2, 3, 4, 5]) {
  const key = n % 2 === 0 ? "even" : "odd";
  const bucket = groups.get(key);
  if (bucket === undefined) groups.set(key, [n]);
  else bucket.push(n);
}
for (const [key, list] of groups) console.log(key, list.join("+"));
console.log(groups.size, groups.get("even")!.length);
