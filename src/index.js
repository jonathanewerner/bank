import figo from 'figo';
import fs from 'fs';
import moment from 'moment';
import app from './server.js';

const args = process.argv.slice(2);

import {SESSION_TOKEN} from '../configuration/constants.js';
const DATABASE_FILE = 'database/transactions.json';
try {
  var transactions = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
} catch (e) {
  var transactions = [];
}


if (args[0] === 'get-token') {
  console.info('1) Open localhost:3000/page \n2) copy your token into configuration/constants.js -> SESSION_TOKEN\n\n');
  const server = app.listen(3000, function() {
    console.log('started server on port ' + server.address().port);
  });
}

if (!SESSION_TOKEN) {
  console.error('You need to generate a session token by calling this thing with like `this-thing.js get-token` and following the instructions.');
  process.exit(1);
}


const session = new figo.Session(SESSION_TOKEN);
const lastTransactionID = transactions.length ?
  transactions[0].transaction_id : undefined;

console.info('Getting transactions...');
console.time('Time taken');

const options = lastTransactionID ? {since: lastTransactionID} : {};
session.get_transactions(options, (err, newTransactions) => {
  if (err) {
    console.info('[index.js] ', err);
  } else {

    console.info(`Got ${newTransactions.length} new transactions.`);
    console.timeEnd('Time taken');
    transactions = [...newTransactions, ...transactions];
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(transactions, null, '\t'));
    const fromThisMonth = transactionsFromThisMonth(transactions);
    // console.info('[index.js] ', fromThisMonth);
    fromThisMonth.forEach((transaction) => {
      const {booking_date, name, purpose, amount, currency} = transaction;
      const dateRelative = moment(booking_date).fromNow();
      console.info(`${dateRelative}: ${amount}EU from ${name.split(' ').slice(0,2)}`);
    })

  }
});

function transactionsFromThisMonth(transactions) {
  return transactions.filter((transaction) => {
    const date = moment(transaction.booking_date);
    const now = moment();
    const startOfMonth = moment().startOf('month');
    return date.isBetween(startOfMonth, now, 'day');
  });
  
}

// async function getUser() {
//   return await session.get_user();
// }



