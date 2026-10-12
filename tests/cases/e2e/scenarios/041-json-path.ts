// xl:title 按路径取值：点号路径 + 缺省 + 数组下标
// xl:round 330
// xl:judge stdout
// xl:end

const data = {
  user: { name: "ada", tags: ["math", "code"], address: { city: "london" } },
  items: [{ id: 1 }, { id: 2 }],
};
function pick(root: unknown, path: string, fallback: unknown): unknown {
  let current: any = root;
  for (const step of path.split(".")) {
    if (current === null || current === undefined) return fallback;
    current = current[step];
  }
  return current === undefined ? fallback : current;
}
console.log(pick(data, "user.name", "-"));
console.log(pick(data, "user.address.city", "-"));
console.log(pick(data, "user.missing.deep", "none"));
console.log(pick(data, "items.1.id", -1));
console.log(pick(data, "user.tags.0", "-"));
