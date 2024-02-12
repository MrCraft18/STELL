const { MongoClient } = require('mongodb')
require('dotenv').config()

const client = new MongoClient(process.env.MONGODB_URI)

const unsentRecords = client.db('STELL').collection('unsentRecords')
const conversationsCollection = client.db('STELL').collection('conversations')


async function main() {
    await conversationsCollection.updateMany({stage: -1}, {$set: {stage: 'dropped'}})
}
main()