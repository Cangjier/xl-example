// xl:title 事件溯源：reducer、回放与快照
// xl:round 371
// xl:judge stdout
// xl:end
type State = { count: number; items: string[]; log: string[] };
type Action = { type: "add"; item: string } | { type: "remove"; item: string } | { type: "reset" } | { type: "inc" };
const initial: State = { count: 0, items: [], log: [] };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      if (state.items.includes(action.item)) return { ...state, log: state.log.concat("dup:" + action.item) };
      return { ...state, items: state.items.concat(action.item), log: state.log.concat("add:" + action.item) };
    case "remove":
      return { ...state, items: state.items.filter((i) => i !== action.item), log: state.log.concat("rm:" + action.item) };
    case "inc":
      return { ...state, count: state.count + 1, log: state.log.concat("inc") };
    case "reset":
      return { ...initial, log: state.log.concat("reset") };
  }
}
const actions: Action[] = [{ type: "add", item: "a" }, { type: "inc" }, { type: "add", item: "a" }, { type: "add", item: "b" }, { type: "remove", item: "a" }, { type: "inc" }];
let state = initial;
for (const a of actions) state = reducer(state, a);
console.log(JSON.stringify(state.items), state.count, state.log.length);
const replayed = actions.reduce(reducer, initial);
console.log(JSON.stringify(replayed) === JSON.stringify(state));
state = reducer(state, { type: "reset" });
console.log(state.count, state.items.length, state.log.length, JSON.stringify(replayed.items));
const snapshot = JSON.parse(JSON.stringify(replayed)) as State;
console.log(snapshot.log.join(",").length, reducer(snapshot, { type: "inc" }).count);
