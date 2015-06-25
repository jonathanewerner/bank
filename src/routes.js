
import figo from 'figo';
import express from 'express';
const router = express.Router(); // eslint-disable new-cap
import {CLIENT_ID, CLIENT_SECRET, CALLBACK_URL} from '../configuration/constants.js'

const PORT = 3000;

const connection = new figo.Connection(CLIENT_ID, CLIENT_SECRET, CALLBACK_URL);

const DUMMY_SAFEGUARD = 'qweqwe';

router.get('/logout', function(req, res) {
  req.session = null;
  res.redirect('/page');
});

router.get('/page', (req, res) => {
  // if user isn't logged in, start oauth flow
  if (!req.session.figo_token) {
    console.info('[routes.js] ', 'we don\'t have a figo token; starting login process');
    res.redirect(connection.login_url(DUMMY_SAFEGUARD, 'accounts=ro transactions=ro balance=ro user=ro offline'));
  } else {
    console.info('[routes.js] ', 'we have a figo session going');
    const session = new figo.Session(req.session.figo_token);
    res.write(req.session.figo_token);
    res.end();
  }
});

// callback url : root
router.get('/', (req, res) => {

  if (req.query.state != DUMMY_SAFEGUARD) {
    throw "Invalid state";
  }

  console.info('[routes.js] ', 'obtaining access token ...');
  connection.obtain_access_token(req.query.code, null, (err, result) => {
    console.info('[routes.js result:] ', result);
    if (result) {
      req.session.figo_token = result.access_token;
    } else {
      console.log(err);
    }
    res.redirect('/page');
  });
});

export default router;


/**
  OAUTH Terms:
  Client: app that wants to access users info
  Resource Server: API Server used to access users info
  Resource Owner: the user

  Flow:
  - login link with client id / redirect-url
  - user sees 'do you want to give permission'
  - if yes: service redirects to your site with an auth code
  - my server takes this auth code, returns access token
  */
