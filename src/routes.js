
import figo from 'figo';
import express from 'express';
const router = express.Router(); // eslint-disable new-cap
import {CLIENT_ID, CLIENT_SECRET, CALLBACK_URL} from '../configuration/constants.js';

const PORT = 3000;

const connection = new figo.Connection(CLIENT_ID, CLIENT_SECRET, CALLBACK_URL);

const DUMMY_SAFEGUARD = 'qweqwe';


// router.param('account_id', function(req, res, next, id) {
//   req.account_id = id;
//   next();
// });


router.get('/logout', function(req, res) {
  req.session = null;
  res.redirect('/page');
});


// router.get('/:account_id', function(req, res, next) {
//   if (!req.session.figo_token) {
//     res.redirect(connection.login_url(DUMMY_SAFEGUARD, 'accounts=ro transactions=ro balance=ro user=ro'));
//   } else {
//     const session = new figo.Session(req.session.figo_token);
//     // session.get_user((err, user) => {
//     //   session.get_accounts((err, accounts) => {
//     //     session.get_account(req.account_id, (err, account) => {
//     //       account.get_transactions(null, (err, transactions) =>{
//     //         console.info('[routes.js] ', transactions);
//     //         res.end();
//     //         // res.render('index', { accounts: accounts, user: user, transactions: transactions, current_account: account });
//     //       });
//     //     });
//     //   });
//     // });
//   }
// });


// router.get('/callback', (req, res) => {
//   console.info('[routes.js callback] ', req.query.code);
//   connection.obtain_access_token(req.query.code, null, (err, result) => {
//     if (result) {
//       req.session.figo_token = result.access_token;
//     } else {
//       console.log(err);
//     }
//     res.redirect('/page');
//   })


router.get('/page', (req, res) => {
  // if user isn't logged in, start oauth flow
  if (!req.session.figo_token) {
    console.info('[routes.js] ', 'we don\'t have a figo token; starting login process');
    res.redirect(connection.login_url(DUMMY_SAFEGUARD, 'accounts=ro transactions=ro balance=ro user=ro'));
  } else {
    console.info('[routes.js] ', 'we have a figo session going');
    const session = new figo.Session(req.session.figo_token);
    res.write(req.session.figo_token);
    res.end();
    // session.get_user((err, user) => {
    //   if (err) {
    //     next(err);
    //   }
    //   res.write(user); res.end();
    // });
  }

      // session.get_accounts(function(err, accounts) {
      //   session.get_transactions(null, function(err, transactions){
      //     res.write('foo');
      //     res.end();
          // res.render('index', { accounts: accounts, user: user, transactions: transactions });
        // });
      // });
    // });
  // }
});

// callback url : root
router.get('/', (req, res) => {

  if (req.query.state != DUMMY_SAFEGUARD) {
    throw "Invalid state";
  }

  console.info('[routes.js] ', 'obtaining access token ...');
  connection.obtain_access_token(req.query.code, null, (err, result) => {
    if (result) {
      req.session.figo_token = result.access_token;
    } else {
      console.log(err);
    }
    res.redirect('/page');
  });
});

export default router;

// function startLogin() {
//   // Open web browser to kick of the login process.
//   open(connection.login_url("qweqwe"));
// }

// function processRedirect(authorization_code, state) {
//   // Handle the redirect URL invocation from the initial startLogin call.

//   // Ignore bogus redirects.
//   if (state !== "qweqwe") {
//     return;
//   }

//   // Trade in authorization code for access token.
//   const token = connection.obtain_access_token(authorization_code, null, function(error, token) {
//     if (!error) {

//       // Start session.
//       var session = new figo.Session(token.access_token);

//       // Print out list of account numbers.
//       session.get_accounts(function(error, accounts) {
//         if (!error) {
//           accounts.forEach(function(account) {
//             console.log(account.account_number);
//           })
//         }
//       });
//     }
//   });
// };

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
