// xl:title `structuredClone`：对象图、环与几种内建
// xl:round 338
// xl:judge stdout
// xl:end

const team: any = { name: "core", members: ["a", "b"] };
team.self = team;
team.meta = { created: new Date(0), tags: new Set(["x", "y"]), index: new Map([["a", 1]]) };
const copy = structuredClone(team);
copy.members.push("c");
copy.meta.tags.add("z");
copy.meta.index.set("b", 2);
console.log(team.members.length, copy.members.length);
console.log(team.meta.tags.has("z"), copy.meta.tags.has("z"), copy.meta.tags.has("x"));
console.log(copy.meta.index.get("b"), team.meta.index.get("b"));
console.log(copy.self === copy, copy.meta.created.getTime());
const frozen = Object.freeze({ keep: 1 });
const frozenCopy = structuredClone(frozen);
console.log(Object.isFrozen(frozenCopy), frozenCopy.keep);
