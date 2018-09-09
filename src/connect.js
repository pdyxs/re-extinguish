import { compose } from "redux";
import { connect } from "react-redux";
import { getContext, withContext } from 'recompose';
import PropTypes from 'prop-types';
import {
  checkIfPropsOrContextContains,
  checkIfOrdered,
  connectRouter
} from '@pdyxs/re-connect';
import { connectFirestore } from '@pdyxs/re-connect-firebase';
import { withName } from 'reramble';

export default function connectUndo(owner) {
  return checkIfPropsOrContextContains(
    {
      name: 'undo',
      type: PropTypes.object
    },
    checkIfOrdered({name: 'history'},
      compose(
        connectRouter(),
        connectFirestore((props) => {
          var ownerid = null;
          if (owner == 'user') {
            ownerid = props.profile.email;
          } else {
            if (props[owner]) ownerid = props[owner].id;
            else if (props[`${owner}id`]) ownerid = props[`${owner}id`];
            else if (props.match.params[`${owner}id`]) ownerid = props.match.params[`${owner}id`];
          }

          return [{
            collection: 'history',
            where: [owner, '==', ownerid || '']
          }];
        })
      ),
      ({firestore: {ordered}}) => ({
        undo: ordered.history && ordered.history[0]
      })
    )
  );
}
