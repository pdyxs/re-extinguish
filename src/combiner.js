let COMBINED = null;

export default function combiner(undoables){
  if (COMBINED == null) {
    COMBINED = {};
    for (let i = 0; i != undoables.length; ++i) {
      COMBINED[undoables[i].name] = undoables[i];
    }
  }
  return COMBINED;
}
