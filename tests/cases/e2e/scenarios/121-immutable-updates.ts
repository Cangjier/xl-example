// xl:title 不可变更新：嵌套路径 set / update 与结构共享
// xl:round 371
// xl:judge stdout
// xl:end
type J = Record<string, unknown>;
function getPath(obj: J, path: string[]): unknown {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as J)[p];
  }
  return cur;
}
function setPath(obj: J, path: string[], value: unknown): J {
  if (path.length === 0) return value as J;
  const [head, ...rest] = path;
  const child = (obj[head] as J) ?? {};
  return { ...obj, [head]: setPath(child, rest, value) };
}
function updatePath(obj: J, path: string[], fn: (v: unknown) => unknown): J {
  return setPath(obj, path, fn(getPath(obj, path)));
}
const state: J = { user: { name: "ann", prefs: { theme: "dark" } }, count: 0 };
const next = setPath(state, ["user", "prefs", "theme"], "light");
const bumped = updatePath(next, ["count"], (v) => (v as number) + 1);
console.log(JSON.stringify(next.user));
console.log(JSON.stringify(state.user), JSON.stringify(bumped.count), state.count);
console.log((state.user as J).prefs === (next.user as J).prefs, state.user === next.user);
console.log(getPath(bumped, ["user", "prefs", "theme"]), getPath(bumped, ["nope", "deep"]));
console.log(JSON.stringify(setPath(state, [], "replaced")));
