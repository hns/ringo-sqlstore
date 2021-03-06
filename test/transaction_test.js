var assert = require("assert");
var Store = require("ringo/storage/sql/store").Store;
var Transaction = require("ringo/storage/sql/transaction").Transaction;
var sqlUtils = require("ringo/storage/sql/util");

var store = null;
var Author = null;

const MAPPING_AUTHOR = {
    "table": "author",
    "id": {
        "column": "author_id"
    },
    "properties": {
        "name": {
            "type": "string",
            "column": "author_name",
            "nullable": false
        }
    }
};

var dbProps = {
    "url": "jdbc:h2:mem:test",
    "driver": "org.h2.Driver"
};

exports.setDbProps = function(props) {
    dbProps = props;
};

exports.setUp = function() {
    store = new Store(dbProps);
    Author = store.defineEntity("Author", MAPPING_AUTHOR);
    return;
};

exports.tearDown = function() {
    var conn = store.getConnection();
    var schemaName = Author.mapping.schemaName || store.dialect.getDefaultSchema(conn);
    if (sqlUtils.tableExists(conn, Author.mapping.tableName, schemaName)) {
        sqlUtils.dropTable(conn, store.dialect, Author.mapping.tableName, schemaName);
        if (Author.mapping.id.hasSequence() && store.dialect.hasSequenceSupport()) {
            sqlUtils.dropSequence(conn, store.dialect, Author.mapping.id.sequence, schemaName);
        }
    }
    store.connectionPool.stopScheduler();
    store.connectionPool.closeConnections();
    store = null;
    Author = null;
    return;
};

exports.testTransaction = function() {
    assert.isNull(store.getTransaction());
    store.beginTransaction();
    var transaction = store.getTransaction();
    assert.isNotNull(transaction);
    assert.isFalse(transaction.isDirty());

    var authors = [];
    // insert some test objects
    for (var i=0; i<5; i+=1) {
        var author = new Author({
            "name": "Author " + (i + 1)
        });
        author.save(transaction);
        authors.push(author);
    }
    assert.strictEqual(transaction.inserted.length, authors.length);
    assert.isTrue(transaction.isDirty());
    assert.strictEqual(Author.all().length, 5);
    store.commitTransaction();
    assert.isNull(store.getTransaction());
    assert.strictEqual(Author.all().length, 5);

    // abort transaction
    store.beginTransaction();
    transaction = store.getTransaction();
    var author = new Author({
        "name": "Author " + (authors.length + 1)
    });
    author.save(transaction);
    assert.isTrue(transaction.isDirty());
    assert.strictEqual(transaction.inserted.length, 1);
    store.abortTransaction();
    assert.isNull(Transaction.getInstance());
    assert.strictEqual(Author.all().length, 5);
    return;
};

//start the test runner if we're called directly from command line
if (require.main == module.id) {
  require('test').run(exports);
}
