// xl:title 同名类型与值可以并存
// xl:round 371
// xl:judge stdout
// xl:end
interface User { id: number }
const User = { create(n: number): User { return { id: n }; } };
type Status = "ok" | "err";
const Status = { ok: "ok" as Status, err: "err" as Status };
console.log(User.create(1).id, Status.ok, Status.err);
class Node2 { v = 1; }
interface Node2 { extra: string }
const n: Node2 = Object.assign(new Node2(), { extra: "e" });
console.log(n.v, n.extra);
