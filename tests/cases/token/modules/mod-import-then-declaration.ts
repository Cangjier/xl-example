// xl:note side-effect import followed by a declaration (does the import swallow the next statement)
// xl:expect Import,Let,Statement
import "./side";
const x = 1;
