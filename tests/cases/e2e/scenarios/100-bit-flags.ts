// xl:title 位标志：权限的组合、检查、切换与展示
// xl:round 371
// xl:judge stdout
// xl:end
const PERM = { READ: 1, WRITE: 2, EXEC: 4, DELETE: 8, ADMIN: 16 } as const;
type PermName = keyof typeof PERM;
function grant(mask: number, ...names: PermName[]): number {
  let out = mask;
  for (const n of names) out |= PERM[n];
  return out;
}
function revoke(mask: number, ...names: PermName[]): number {
  let out = mask;
  for (const n of names) out &= ~PERM[n];
  return out;
}
function has(mask: number, name: PermName): boolean { return (mask & PERM[name]) !== 0; }
function describe(mask: number): string {
  const names = Object.keys(PERM).filter((k) => has(mask, k as PermName));
  return names.length === 0 ? "none" : names.join("|");
}
let mask = 0;
mask = grant(mask, "READ", "WRITE");
console.log(mask, describe(mask), has(mask, "EXEC"));
mask = grant(mask, "EXEC", "ADMIN");
console.log(describe(mask), mask.toString(2).padStart(5, "0"));
mask = revoke(mask, "WRITE", "ADMIN");
console.log(describe(mask), (mask & PERM.ADMIN) === 0, mask > 0);
console.log(describe(grant(0, "DELETE")), describe(0));
