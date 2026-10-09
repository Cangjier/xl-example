// xl:title 名字逐个取一次：console 的成员（缺 30 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why console 的成员：取到 undefined（node 上是 function/boolean/object）：Console / _ignoreErrors / _stderr / _stderrErrorHandler / _stdout / _stdoutErrorHandler / _times / assert / clear / context / count / countReset / createTask / debug / dir / dirxml / error / group / groupCollapsed / groupEnd / info / profile / profileEnd / table / time / timeEnd / timeLog / timeStamp / trace / warn
// xl:end

const b: any = console;
let v = "";
v = "no";
try {
  v = String(typeof b["Console"]);
} catch (err) {
}
console.log(typeof b, "Console", v);
v = "no";
try {
  v = String(typeof b["_ignoreErrors"]);
} catch (err) {
}
console.log(typeof b, "_ignoreErrors", v);
v = "no";
try {
  v = String(typeof b["_stderr"]);
} catch (err) {
}
console.log(typeof b, "_stderr", v);
v = "no";
try {
  v = String(typeof b["_stderrErrorHandler"]);
} catch (err) {
}
console.log(typeof b, "_stderrErrorHandler", v);
v = "no";
try {
  v = String(typeof b["_stdout"]);
} catch (err) {
}
console.log(typeof b, "_stdout", v);
v = "no";
try {
  v = String(typeof b["_stdoutErrorHandler"]);
} catch (err) {
}
console.log(typeof b, "_stdoutErrorHandler", v);
v = "no";
try {
  v = String(typeof b["_times"]);
} catch (err) {
}
console.log(typeof b, "_times", v);
v = "no";
try {
  v = String(typeof b["assert"]);
} catch (err) {
}
console.log(typeof b, "assert", v);
v = "no";
try {
  v = String(typeof b["clear"]);
} catch (err) {
}
console.log(typeof b, "clear", v);
v = "no";
try {
  v = String(typeof b["context"]);
} catch (err) {
}
console.log(typeof b, "context", v);
v = "no";
try {
  v = String(typeof b["count"]);
} catch (err) {
}
console.log(typeof b, "count", v);
v = "no";
try {
  v = String(typeof b["countReset"]);
} catch (err) {
}
console.log(typeof b, "countReset", v);
v = "no";
try {
  v = String(typeof b["createTask"]);
} catch (err) {
}
console.log(typeof b, "createTask", v);
v = "no";
try {
  v = String(typeof b["debug"]);
} catch (err) {
}
console.log(typeof b, "debug", v);
v = "no";
try {
  v = String(typeof b["dir"]);
} catch (err) {
}
console.log(typeof b, "dir", v);
v = "no";
try {
  v = String(typeof b["dirxml"]);
} catch (err) {
}
console.log(typeof b, "dirxml", v);
v = "no";
try {
  v = String(typeof b["error"]);
} catch (err) {
}
console.log(typeof b, "error", v);
v = "no";
try {
  v = String(typeof b["group"]);
} catch (err) {
}
console.log(typeof b, "group", v);
v = "no";
try {
  v = String(typeof b["groupCollapsed"]);
} catch (err) {
}
console.log(typeof b, "groupCollapsed", v);
v = "no";
try {
  v = String(typeof b["groupEnd"]);
} catch (err) {
}
console.log(typeof b, "groupEnd", v);
v = "no";
try {
  v = String(typeof b["info"]);
} catch (err) {
}
console.log(typeof b, "info", v);
v = "no";
try {
  v = String(typeof b["profile"]);
} catch (err) {
}
console.log(typeof b, "profile", v);
v = "no";
try {
  v = String(typeof b["profileEnd"]);
} catch (err) {
}
console.log(typeof b, "profileEnd", v);
v = "no";
try {
  v = String(typeof b["table"]);
} catch (err) {
}
console.log(typeof b, "table", v);
v = "no";
try {
  v = String(typeof b["time"]);
} catch (err) {
}
console.log(typeof b, "time", v);
v = "no";
try {
  v = String(typeof b["timeEnd"]);
} catch (err) {
}
console.log(typeof b, "timeEnd", v);
v = "no";
try {
  v = String(typeof b["timeLog"]);
} catch (err) {
}
console.log(typeof b, "timeLog", v);
v = "no";
try {
  v = String(typeof b["timeStamp"]);
} catch (err) {
}
console.log(typeof b, "timeStamp", v);
v = "no";
try {
  v = String(typeof b["trace"]);
} catch (err) {
}
console.log(typeof b, "trace", v);
v = "no";
try {
  v = String(typeof b["warn"]);
} catch (err) {
}
console.log(typeof b, "warn", v);
console.log("缺", 30, "个名字");
