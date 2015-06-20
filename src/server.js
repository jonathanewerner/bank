import figo from 'figo';
import async from 'async';
import express from 'express';
import bodyParser from 'body-parser';
import cookieSession from 'cookie-session';

import routes from './routes.js';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({keys: ['key1', 'key2']}));
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
// if (app.get('env') === 'development') {
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    console.info('[index.js] ', err, err.stack);
    res.end();
    // res.write('error', {

    //     message: err.message,
    //     error: err
    // });
});
// }

// // production error handler
// // no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error', {
//         message: err.message,
//         error: {}
//     });
// });

export default app;

process.on('uncaughtException', function(err) {
  console.log('uncaught exception', err, err.stack);
  process.exit();
});
