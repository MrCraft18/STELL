const fs = require('fs')



// const url = process.env.MONGO_URL || 'mongodb://mongo:glWrr3hBYKaKCdfemdab@containers-us-west-100.railway.app:7091'
// const client = new MongoClient(url);

const UNSENT_RECORDS_PATH = './database/unsentRecords'
const CONVERATIONS_PATH = './database/converations'

if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database')
    fs.mkdirSync(UNSENT_RECORDS_PATH)
    fs.mkdirSync(CONVERATIONS_PATH)
} else {
    if (!fs.existsSync(UNSENT_RECORDS_PATH)) {
        fs.mkdirSync(UNSENT_RECORDS_PATH)
    }

    if (!fs.existsSync(CONVERATIONS_PATH)) {
        fs.mkdirSync(CONVERATIONS_PATH)
    }
}




// const connectDatabase = async () => {
//     await client.connect()
// }

// const closeDatabase = async () => {
//     await client.close()
// }



const addNewRecords = async (records) => {
    // const dataBase = client.db('Main')
    // const collection = dataBase.collection('unsentRecords')

    // await collection.insertMany(records)

    // console.log(records)

    records.forEach(record => {
        fs.writeFileSync(`${UNSENT_RECORDS_PATH}/${record.phoneNumber}.txt`, JSON.stringify(record, null, 4))
    })

    console.log("Added New Records")
}



const getUnsentRecords = async () => {
    // const dataBase = client.db('Main')
    // const collection = dataBase.collection('unsentRecords')

    // const unsentRecords = await collection.find({}).project({ _id: 0 }).toArray()

    const files = fs.readdirSync(UNSENT_RECORDS_PATH)

    const unsentRecords = []

    files.forEach(file => {
        const recordString = fs.readFileSync(`${UNSENT_RECORDS_PATH}/${file}`, 'utf-8')

        unsentRecords.push(JSON.parse(recordString))
    })

    return unsentRecords
}



const removeUnsentRecord = async (record) => {
    // const dataBase = client.db('Main')
    // const collection = dataBase.collection('unsentRecords')

    // await collection.deleteMany({ phoneNumber: record.phoneNumber })

    const file = fs.readdirSync(UNSENT_RECORDS_PATH).find(file => record.phoneNumber === file.slice(0, -4))

    fs.rmSync(`${UNSENT_RECORDS_PATH}/${file}`)
}



const addNewConversation = async (record) => {
    // const dataBase = client.db('Main')
    // const collection = dataBase.collection('conversations')

    // await collection.insertMany([record])

    fs.writeFileSync(`${CONVERATIONS_PATH}/${record.phoneNumber}.txt`, JSON.stringify(record, null, 4))

    console.log(`Created Conversation for ${record.phoneNumber}`)
}



const getConversation = async (from) => {
    // const dataBase = client.db('Main')
    // const collection = dataBase.collection('conversations')

    // const conversation = await collection.find({ phoneNumber: from }).project({ _id: 0 }).toArray()++

    const file = fs.readdirSync(CONVERATIONS_PATH).find(file => from === file.slice(0, -4))

    const conversation = JSON.parse(fs.readFileSync(`${CONVERATIONS_PATH}/${file}`, 'utf-8'))

    return conversation
}



const updateConversation = async (updatedRecord) => {
    // const dataBase = client.db('Main')
    // const collection = dataBase.collection('conversations')

    // await collection.updateOne({ phoneNumber: updatedRecord.phoneNumber }, { $set: { conversation: updatedRecord.conversation, conversationLabel: updatedRecord.conversationLabel, webhook: updatedRecord.webhook } })

    const file = fs.readdirSync(CONVERATIONS_PATH).find(file => updatedRecord.phoneNumber === file.slice(0, -4))

    fs.writeFileSync(`${CONVERATIONS_PATH}/${file}`, JSON.stringify(updatedRecord, null, 4))

    console.log('Updated Conversation')
}



const deleteConversation = async (record) => {
    // const dataBase = client.db('Main')
    // const collection = dataBase.collection('conversations')

    // await collection.deleteMany({ phoneNumber: record.phoneNumber })

    const file = fs.readdirSync(CONVERATIONS_PATH).find(file => record.phoneNumber === file.slice(0, -4))

    if (file) {
    fs.rmSync(`${CONVERATIONS_PATH}/${file}`)
    }
}










module.exports = {
    // connectDatabase,
    // closeDatabase,
    addNewRecords,
    getUnsentRecords,
    removeUnsentRecord,
    addNewConversation,
    getConversation,
    updateConversation,
    deleteConversation
}