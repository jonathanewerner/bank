import figo from 'figo';
import fs from 'fs';
import moment from 'moment';
import app from './server.js';
import _ from 'lodash';
import open from 'open';
import accounting from 'accounting';
import Table from 'cli-table';

import {REFRESH_TOKEN, CLIENT_ID, CLIENT_SECRET, CALLBACK_URL} from '../configuration/constants.js'
const DATABASE_FILE = 'database/transactions.json';
const ALIASES_FILE = 'database/aliases.json';
const CATEGORIES_FILE = 'database/categories.json';
const TIME_TAKEN = 'Time taken';
const RUN_ONLINE = true;

let SUM = 0;

const currencyFormat = {
  thousandSep: ',',
  decimalSep: '.',
  precision: 2,
  format: '%v%s',
  symbol: '€'
}

function formatEuro(euroAmount) {
  const {symbol, precision, thousandSep, decimalSep, format} = currencyFormat;
  return accounting.formatMoney(
      euroAmount, symbol, precision, thousandSep, decimalSep, format);
}

function r(regexString) {
  return new RegExp(regexString, 'i');
}

const aliases = readJson(ALIASES_FILE);

function readJson(f) {
 return JSON.parse(fs.readFileSync(f), 'utf-8');
}

function startup() {
  const args = process.argv.slice(2);
  if (args[0] === 'token') {
    open('http://localhost:3000/logout', 'google-chrome-beta');
    open('http://localhost:3000/page', 'google-chrome-beta');

    const server = app.listen(3000, function() {
      console.log('started server on port ' + server.address().port);
    });

  } else {
      try {
        if (RUN_ONLINE) {
          getSessionToken(main);
        } else {
          main();
        }
      } catch (e) {
        console.error(e);
      }
    }
}

function getSessionToken(cb) {
  const connection = new figo.Connection(CLIENT_ID, CLIENT_SECRET, CALLBACK_URL);

  console.info('Obtaining access token with REFRESH_TOKEN');
  console.time(TIME_TAKEN);
  connection.obtain_access_token(REFRESH_TOKEN, null, (err, result) => {
    console.info('Got an access token');
    console.timeEnd(TIME_TAKEN);
    if (result) {
      cb(result.access_token);
    } else {
      console.log(err);
    }
  });
}

function fetchNewTransactions(transactions, sessionToken) {
  const session = new figo.Session(sessionToken);
  const lastTransactionID = transactions.length ?
    transactions[0].transaction_id : undefined;

  console.info('Getting transactions...');
  console.time(TIME_TAKEN);

  const options = lastTransactionID ? {since: lastTransactionID} : {};

  return new Promise((resolve, reject) => {
    session.get_transactions(options, (err, newTransactions) => {
      if (err) {
        reject(err);
      } else {

        console.info(`Got ${newTransactions.length} new transactions.`);
        console.timeEnd(TIME_TAKEN);
        transactions = [...newTransactions, ...transactions];
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(transactions, null, '\t'));
        resolve(transactions);
      }
    });
  });
}

async function main(sessionToken) {
  try {
    let transactions = fs.existsSync(DATABASE_FILE) ?
      JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8')) : [];

    if (sessionToken) {
      transactions = await fetchNewTransactions(transactions, sessionToken);
    }

    printTransactions(transactions);

  } catch (err) { 
    console.info('[index.js] ', err.stack);
  }
}

function printTransactions(transactions) {
  const ALL = false;

  const categories = readJson(CATEGORIES_FILE);
  const fromThisMonth = transactionsFromThisMonth(transactions);
  const recurringTransactionsFromThisMonth =
    filterWithRegex(fromThisMonth, categories.recurring);

  if (ALL) {
    printTable('All Transactions', fromThisMonth.reverse());
    return;
  }

  // [1] print recurring transactions
  printTable('Recurring Transactions', recurringTransactionsFromThisMonth.reverse());

  console.info('');

  // [2] print summaries
  categories.summarized.forEach(summaryItem => {
    const transactionsForSummaryItem =
      filterWithRegex(fromThisMonth, summaryItem.regex);

    printSummary(summaryItem.title, transactionsForSummaryItem)

  });


  // [3] print rest
  // r(string) creates a case-insensitive regex from the given string
  const restTransactions = fromThisMonth.filter(transaction => {
    return !transaction.name.match(r(categories.recurring)) && 
      !_.any(categories.summarized, summaryItem => 
          transaction.name.match(r(summaryItem.regex)));
  });

  printTable('Rest', restTransactions);

  console.info('OVERALL SUM:', formatEuro(SUM));
}

function filterWithRegex(transactions, regexString, invert=false) {
  const regex = new RegExp(regexString, 'i');
  return transactions.filter(transaction => {
    const result = transaction.name.match(regex);
    return invert ? !result : result;
  });
}

function printSummary(title, transactions) {
  // console.info('');
  const sum = _.sum(transactions.map(t => t.amount));
  const sumFormatted = formatEuro(sum);
  console.info(`${title.toUpperCase()}: ${sumFormatted}`);
}

function printTable(title, transactions, showSum=true) {

  function alias(fullName) {
    const aliasKey = _.find(Object.keys(aliases), namePart =>
        fullName.match(new RegExp(namePart)))
      return aliases[aliasKey];
  }

  const amounts = transactions.map(t => t.amount);
  const sumOfTable = _.sum(amounts);
  SUM += sumOfTable;
  if (showSum) amounts.push(sumOfTable);

  const {symbol, precision, thousandSep, decimalSep, format} = currencyFormat;

  const amountsFormatted =
    accounting.formatColumn(
      amounts, symbol, precision, thousandSep, decimalSep, format);

  const table = new Table({
    chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
    head: ['Date', 'Name', 'Amount'],
    colWidths: [7, 24, 12]
  });

  console.info(`\n${title.toUpperCase()}`);

  const sumRow = {name: 'SUM', booking_date: undefined};
  const rows = showSum ? [...transactions, sumRow] : transactions;
  rows.forEach((t, idx) => {
    const date = t.booking_date ?
      moment(t.booking_date).format('DD.MM') : '';
    // const description = alias(t.name) || t.name + ` (${t.purpose})`;
    const description = alias(t.name) || t.name;
    // const description = t.name + ` (${t.purpose})`;
    table.push([date, description, amountsFormatted[idx]]);
  });
  console.info(table.toString());
}

function printTransaction(transaction) {
  const VERBOSE = false;
  const {booking_date, name, purpose, amount, currency} = transaction;
  const date = moment(booking_date).format('DD.MM');
  console.info(VERBOSE ?
    `${date}: ${amount}€\nNAME:\t\t${name}\nPURPOSE:\t${purpose}\n` :
    `${date}: ${amount}€ - ${name}`);
}


function transactionsFromThisMonth(transactions) {
  const monthOffset = 1;
  const endOfMonth = moment().subtract(monthOffset, 'month').endOf('month');
  const startOfMonth = moment().subtract(monthOffset, 'month').startOf('month');
  return transactions.filter((transaction) => {
    const date = moment(transaction.booking_date);
    const foo = date.isBetween(startOfMonth, endOfMonth, 'minute');
    return foo;
    // console.info('[index.js] ', foo, date.toString());
  });

}

startup();
