// xl:title 非空断言 / as / satisfies 混在调用链里
// xl:round 7
// xl:judge stdout
// xl:end

type Row = { id: number; name?: string };
const rows: Array<Row | null> = [{ id: 1, name: "a" }, null, { id: 3 }];
const named = rows.filter((r): r is Row => r !== null).map((r) => (r.name ?? "?").toUpperCase());
console.log(named.join(","));
const first = rows[0]!;
console.log(first.id);
const widened = { id: 1, name: "x" } as Row;
const checked = { id: 2, name: "y" } satisfies Row;
console.log(widened.id, checked.name, (rows[2] as Row).id);
