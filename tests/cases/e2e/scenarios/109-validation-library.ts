// xl:title 校验库：错误累积与路径报告
// xl:round 371
// xl:judge stdout
// xl:end
type Issue = { path: string; message: string };
type Rule<T> = (value: unknown, path: string) => Issue[];
function isString(value: unknown, path: string): Issue[] {
  return typeof value === "string" ? [] : [{ path, message: "expected string" }];
}
function minLength(n: number): Rule<unknown> {
  return (value, path) => (typeof value === "string" && value.length < n ? [{ path, message: "min " + n }] : []);
}
function objectShape(shape: Record<string, Rule<unknown>[]>): Rule<unknown> {
  return (value, path) => {
    if (typeof value !== "object" || value === null) return [{ path, message: "expected object" }];
    const issues: Issue[] = [];
    for (const key of Object.keys(shape)) {
      const child = (value as Record<string, unknown>)[key];
      for (const rule of shape[key]) issues.push(...rule(child, path === "" ? key : path + "." + key));
    }
    return issues;
  };
}
function arrayOf(rule: Rule<unknown>): Rule<unknown> {
  return (value, path) => {
    if (!Array.isArray(value)) return [{ path, message: "expected array" }];
    const issues: Issue[] = [];
    value.forEach((item, index) => { for (const r of [rule]) issues.push(...r(item, path + "[" + index + "]")); });
    return issues;
  };
}
const userSchema = objectShape({
  name: [isString, minLength(3)],
  tags: [arrayOf(isString)],
});
const cases: unknown[] = [
  { name: "ann", tags: ["a"] },
  { name: "bo", tags: ["a", 2] },
  { name: 5, tags: "not-array" },
  null,
];
for (const value of cases) {
  const issues = userSchema(value, "");
  console.log(issues.length, issues.map((i) => i.path + ":" + i.message).join("|"));
}
