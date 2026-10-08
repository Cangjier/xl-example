// xl:title AggregateError：名字、消息、内层数组
// xl:judge stdout
// xl:end

const e = new AggregateError([new Error("a")], "many");
console.log(e.name, e.message, e.errors.length, e instanceof Error);
