/* global process */

var fs = require('fs');
var ndjson = require('ndjson');
var level = require('level');
var Sublevel = require('level-sublevel');
var through2 = require('through2');
var queue = require('d3-queue').queue;

if (process.argv.length < 4) {
  console.log(
    'Usage: node tools/build-word-index-db.js <line-delimited JSON file path> <Output db path>'
  );
  process.exit();
}

const vectorJSONPath = process.argv[2];
const dbPath = process.argv[3];

var db = Sublevel(level(dbPath));
var indexesForWords = db.sublevel('indexes');
var wordsForIndexes = db.sublevel('words');

var vectorCount = 0;

fs
  .createReadStream(vectorJSONPath)
  .pipe(ndjson.parse({ strict: false }))
  .pipe(through2({ objectMode: true }, addToDb))
  .on('end', closeDb);

function addToDb(wordVectorPair, enc, done) {
  var q = queue();
  q.defer(indexesForWords.put, wordVectorPair.word, vectorCount);
  q.defer(wordsForIndexes.put, vectorCount, wordVectorPair.word);
  q.await(incrementCount);

  function incrementCount(error) {
    if (error) {
      throw error;
    } else {
      vectorCount += 1;
      done();
    }
  }
}

function closeDb() {
  db.close(logDone);

  function logDone(error) {
    if (error) {
      console.error(error);
    } else {
      console.log('Done building db.');
    }
  }
}
