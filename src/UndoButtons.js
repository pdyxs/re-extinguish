import React, { Component } from 'react';
import { undo, redo } from './';
import { compose } from "redux";
import { connect } from "react-redux";
import { getContext } from 'recompose';
import PropTypes from 'prop-types';
import { Link, Redirect } from 'react-router-dom';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import faUndo from '@fortawesome/fontawesome-free-solid/faUndo';
import faRedo from '@fortawesome/fontawesome-free-solid/faRedo';

import { connectFirestore, connectStore } from '@pdyxs/re-connect-firebase';
import connectUndo from './connect';

class UndoButtons extends Component {
  constructor() {
    super();
    this.doUndo = this.doUndo.bind(this);
    this.doRedo = this.doRedo.bind(this);
  }

  doUndo() {
    this.props.onUndo();
  }

  doRedo() {
    this.props.onRedo();
  }

  render() {
    return (
      <div className="float-right">
        {
          (this.props.undo == null || this.props.undo.past.length == 0) ?
            <button disabled className="btn btn-outline-primary">
              <FontAwesomeIcon icon={faUndo} />
            </button> :
            <Link
              to={this.props.undo.past[0].context.url}
              onClick={this.doUndo}
              role="button"
              className="btn btn-outline-primary">
              <FontAwesomeIcon icon={faUndo} />
            </Link>
        }
        {
          (this.props.undo == null || this.props.undo.future.length == 0) ?
            <button disabled className="btn btn-outline-primary">
              <FontAwesomeIcon icon={faRedo} />
            </button> :
            <Link
              to={this.props.undo.future[0].context.url}
              onClick={this.doRedo}
              role="button"
              className="btn btn-outline-primary">
                <FontAwesomeIcon icon={faRedo} />
              </Link>
        }
      </div>
    );
  }
}

export default compose(
  connectStore(),
  connectUndo(),
  connectFirestore(),
  connect(
    () => ({}),
    ((dispatch, props) => ({
      onUndo: () => undo(props.store.firestore, props.undo),
      onRedo: () => redo(props.store.firestore, props.undo)
    }))
  )
)(UndoButtons);
