// xl:title 函数类型标注、可选参数、剩余参数、默认参数一起
// xl:round 371
// xl:judge stdout
// xl:end
type Handler = (event: string, payload?: unknown) => void;
type Reducer = (state: number, action: { type: string }) => number;
const handlers: Handler[] = [];
handlers.push((e, p) => console.log("h1", e, p === undefined));
const reducer: Reducer = (state, action) => state + (action.type === "inc" ? 1 : 0);
function configure(opts: { retries?: number; onError?: Handler } = {}): number { return opts.retries ?? 0; }
handlers[0]("e");
console.log(reducer(reducer(0, { type: "inc" }), { type: "dec" }), configure(), configure({ retries: 3 }));
