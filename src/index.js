import uuidv1 from 'uuid';
import { buildUndoableContext } from './context';
import UndoButtons from './UndoButtons';
import _connectUndo from './connect';
import combiner from './combiner';
import _ from 'lodash';

export { buildUndoableContext, UndoButtons };

function undoables() {
  return combiner(_undoables);
}

var _undoables = [];
var _owner = null;

export default function Extinguish({owner, specs}) {
  if (owner) _owner = owner;
  if (specs) _undoables = _.concat(_undoables, specs);
}

export let connectUndo = () => _connectUndo(_owner);

const MAX_HISTORY = 20;

let newHistory = (owner, id) => {
  var obj = {
    past: [],
    future: []
  };
  obj[owner] = id;
  return obj;
}

let asyncIds = [];
let currentlyRunning = null;

async function waitToRun(func, firestore, undo) {
  var id = uuidv1();
  asyncIds.push({
    id,
    active: true,
    isUndo: func === _undo
  });
  while (asyncIds[0].id !== id) {
    await currentlyRunning;
  }
  currentlyRunning = checkRun(func, firestore, undo).then(() => {asyncIds.shift()});
}

async function checkRun(func, firestore, undo) {
  if (!asyncIds[0].active) {
    return;
  }
  for (let i = 1; i < asyncIds.length; ++i) {
    if (asyncIds[0].isUndo != asyncIds[i].isUndo) {
      asyncIds[0].active = false;
      asyncIds[i].active = false;
      return;
    }
  }
  return func(firestore, undo);
}

async function _undo(firestore, undo) {
  let object = undo.past.shift()

  return undoables()[object.action.type].undo(firestore, object.action)
    .then((newAction) => {
      var o = getNewObject(newAction, object);
      undo.future.unshift(o);
      return updateHistory(firestore, undo);
    });
}

async function _redo(firestore, undo) {
  let object = undo.future.shift();
  let func = undoables()[object.action.type].redo
  if (func === undefined) {
    func = undoables()[object.action.type].do;
  }

  return func(firestore, object.action)
    .then((newAction) => {
      var o = getNewObject(newAction, object);
      undo.past.unshift(o);
      return updateHistory(firestore, undo);
    });
}

async function updateHistory (firestore, undo) {
  return firestore.update(
    `history/${undo.id}`,
    {
      past: undo.past,
      future: undo.future
    }
  );
}

function getObject(action, context) {
  return {
    action,
    context
  };
}

function getNewObject(newAction, oldObject) {
  if (newAction) {
    newAction.type = oldObject.action.type;
    return getObject(newAction, oldObject.context);
  }
  return oldObject;
}

export function undo(firestore, undo) {
  if (undo && undo.past.length > 0) {
    waitToRun(_undo, firestore, undo);
  }
}

export function redo(firestore, undo) {
  if (undo && undo.future.length > 0) {
    waitToRun(_redo, firestore, undo);
  }
}

export function registerUndoable(
  undo,
  firestore,
  action,
  context
)
{
  let addNew = false;
  if (_.isString(undo)) {
    addNew = true;
    undo = newHistory(_owner, undo);
  }

  let o = getObject(action, context);

  return undoables()[action.type].do(firestore, action).then(
    (newAction) => {
      var object = getNewObject(newAction, o);

      //clear the future
      for (var i = 0; i != undo.future.length; ++i) {
        let o = undo.future[i];
        if (undoables()[o.action.type].undoFinal) {
          undoables()[o.action.type].undoFinal(firestore, o.action);
        }
      }
      undo.future = [];

      //add new action
      undo.past.unshift(object);

      //if greater than max history, pop until it's the right size
      while (undo.past.length > MAX_HISTORY) {
        let o = undo.past.pop();
        if (undoables()[o.action.type].doFinal) {
          undoables()[o.action.type].doFinal(firestore, o.action);
        }
      }

      return newAction;
      if (addNew) {
        firestore.add(
          'history',
          undo
        );
      } else {
        updateHistory(firestore, undo);
      }
    });
}
