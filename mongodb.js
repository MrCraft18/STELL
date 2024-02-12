const { MongoClient } = require('mongodb')
require('dotenv').config()

const client = new MongoClient(process.env.MONGODB_URI)



const unsentRecords = client.db('STELL').collection('unsentRecords')
const conversations = client.db('STELL').collection('conversations')



async function connect() {
    await client.connect()
}

async function close() {
    await client.close()
}



async function addUnsentRecords(records) {
    await unsentRecords.insertMany(records)
}

async function shiftUnsentRecords() {
    return unsentRecords.findOneAndDelete({}, {sort: {_id: 1}}).then(result => {
        delete result._id
        return result
    })
}

async function addNewConversation(record) {
    await conversations.insertMany([record])
}

async function getConversation(phoneNumber) { 
    return await conversations.findOne({phoneNumber}, {projection: {_id: 0}})
}

async function updateConversation(updatedRecord) {
    conversations.replaceOne({phoneNumber: updatedRecord.phoneNumber}, updatedRecord)
}

async function deleteConversation(record) {
    await conversations.deleteMany({phoneNumber: record.phoneNumber})
}



module.exports = {
    connect,
    close,
    addUnsentRecords,
    shiftUnsentRecords,
    addNewConversation,
    getConversation,
    updateConversation,
    deleteConversation,
}