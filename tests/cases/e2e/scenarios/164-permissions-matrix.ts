// xl:title 权限矩阵：角色 × 资源 × 动作 + 审计
// xl:round 371
// xl:judge stdout
// xl:end
type Role = "admin" | "editor" | "viewer";
type Action2 = "read" | "write" | "delete";
const rules: Record<Role, Record<Action2, boolean>> = {
  admin: { read: true, write: true, delete: true },
  editor: { read: true, write: true, delete: false },
  viewer: { read: true, write: false, delete: false },
};
const overrides: Record<string, Partial<Record<Action2, boolean>>> = {
  "editor:secret": { read: false },
  "viewer:public": { write: true },
};
function can(role: Role, resource: string, action: Action2): boolean {
  const key = role + ":" + resource;
  const override = overrides[key];
  if (override && override[action] !== undefined) return override[action] as boolean;
  return rules[role][action];
}
const audit: string[] = [];
function attempt(role: Role, resource: string, action: Action2): string {
  const allowed = can(role, resource, action);
  audit.push(role + "/" + resource + "/" + action + "=" + (allowed ? "y" : "n"));
  return allowed ? "ok" : "denied";
}
const cases: [Role, string, Action2][] = [
  ["admin", "secret", "delete"],
  ["editor", "secret", "read"],
  ["editor", "doc", "write"],
  ["viewer", "public", "write"],
  ["viewer", "doc", "delete"],
];
for (const [role, resource, action] of cases) console.log(role, resource, action, attempt(role, resource, action));
console.log(audit.length, audit.filter((a) => a.endsWith("y")).length);
const matrix: string[] = [];
for (const role of ["admin", "editor", "viewer"] as Role[]) {
  matrix.push(role + ":" + (["read", "write", "delete"] as Action2[]).map((a) => (rules[role][a] ? "1" : "0")).join(""));
}
console.log(matrix.join(" "));
