// xl:title `JSON.rawJSON` / `JSON.isRawJSON` 在不在
// xl:round 736
// xl:judge stdout
// xl:want differ
// xl:why `JSON.rawJSON` / `JSON.isRawJSON` 两格没装（第 678 轮就登着的账，这一批又问了一次）。
// xl:why 它们要的是**一模一样的另一套序列化**（`rawJSON` 造出一个「原样写进去」的记号，
// xl:why `stringify` 遇到它**不做任何转义/引号**、`isRawJSON` 按那个内部格答）——
// xl:why 本仓 `JsonAnchor` 那一层只认「值 + 它从哪来」，没有「这个值不许动」这一档。
// xl:why **那不是挂两个名字的事**，所以如实登记、不静默近似。
// xl:end
console.log(typeof (JSON as any).rawJSON, typeof (JSON as any).isRawJSON);
const raw: any = (JSON as any).rawJSON ? (JSON as any).rawJSON("1e2") : null;
console.log(raw === null ? "none" : JSON.stringify({ v: raw }));
