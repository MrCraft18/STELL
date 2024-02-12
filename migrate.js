const fs = require('fs')
const { MongoClient } = require('mongodb')


const client = new MongoClient("mongodb+srv://admin:qA01qHcqjL2e3Id0@serverlessinstance0.pn5xh8w.mongodb.net/?retryWrites=true&w=majority")
const unsentRecords = client.db('STELL').collection('unsentRecords')


async function main() {
    await client.connect()

    const array = fs.readdirSync('./database/unsentRecords').map(file => JSON.parse(fs.readFileSync('./database/unsentRecords/' + file, 'utf-8')))

    console.log(array)

    await unsentRecords.insertMany(array)

    await client.close()
}
main()