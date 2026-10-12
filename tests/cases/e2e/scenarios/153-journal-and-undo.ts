// xl:title 编辑器模型：命令、撤销栈、重做
// xl:round 371
// xl:judge stdout
// xl:end
type Command = { name: string; apply: (doc: string) => string; revert: (doc: string) => string };
class Editor {
  private doc = "";
  private undoStack: { cmd: Command; before: string }[] = [];
  private redoStack: { cmd: Command; before: string }[] = [];
  get text(): string { return this.doc; }
  run(cmd: Command): void {
    const before = this.doc;
    this.doc = cmd.apply(this.doc);
    this.undoStack.push({ cmd, before });
    this.redoStack = [];
  }
  undo(): boolean {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    this.redoStack.push(entry);
    this.doc = entry.before;
    return true;
  }
  redo(): boolean {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    this.undoStack.push(entry);
    this.doc = entry.cmd.apply(entry.before);
    return true;
  }
  get depth(): [number, number] { return [this.undoStack.length, this.redoStack.length]; }
}
const insert = (text: string): Command => ({
  name: "insert:" + text,
  apply: (doc) => doc + text,
  revert: (doc) => doc.slice(0, doc.length - text.length),
});
const editor = new Editor();
editor.run(insert("hello"));
editor.run(insert(" world"));
editor.run({ name: "upper", apply: (d) => d.toUpperCase(), revert: (d) => d.toLowerCase() });
console.log(editor.text, editor.depth.join("/"));
console.log(editor.undo(), editor.text);
console.log(editor.undo(), editor.text);
console.log(editor.redo(), editor.text);
editor.run(insert("!"));
console.log(editor.text, editor.depth.join("/"), editor.redo());
console.log(editor.undo(), editor.undo(), editor.undo(), editor.undo(), editor.text);
