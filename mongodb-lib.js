const MongoClient = require('mongodb').MongoClient;



const url = process.env.MONGO_URL || 'mongodb://mongo:glWrr3hBYKaKCdfemdab@containers-us-west-100.railway.app:7091'
const client = new MongoClient(url);



const connectDatabase = async () => {
  await client.connect()
}

const closeDatabase = async () => {
  await client.close()
}



const addNewRecords = async (records) => {
  const dataBase = client.db('Main')
  const collection = dataBase.collection('unsentRecords')

  await collection.insertMany(records)
  console.log("Added New Records")
}



const getUnsentRecords = async () => {
  const dataBase = client.db('Main')
  const collection = dataBase.collection('unsentRecords')

  const unsentRecords = await collection.find({}).project({ _id: 0 }).toArray()

  return unsentRecords
}



const removeUnsentRecord = async (record) => {
  const dataBase = client.db('Main')
  const collection = dataBase.collection('unsentRecords')

  await collection.deleteMany({ phoneNumber: record.phoneNumber})
}



const addNewConversation = async (record) => {
  const dataBase = client.db('Main')
  const collection = dataBase.collection('conversations')

  await collection.insertMany([record])
  console.log(`Created Conversation for ${record.phoneNumber}`)
}



const getConversation = async (from) => {
  const dataBase = client.db('Main')
  const collection = dataBase.collection('conversations')

  const conversation = await collection.find({ phoneNumber : from }).project({ _id: 0 }).toArray()

  return conversation[0]
}



const updateConversation = async (updatedRecord) => {
  const dataBase = client.db('Main')
  const collection = dataBase.collection('conversations')

  await collection.updateOne({ phoneNumber: updatedRecord.phoneNumber }, { $set: { conversation: updatedRecord.conversation, conversationLabel: updatedRecord.conversationLabel, webhook: updatedRecord.webhook } })
  console.log('Updated Conversation')
}



const deleteConversation = async (record) => {
  const dataBase = client.db('Main')
  const collection = dataBase.collection('conversations')

  await collection.deleteMany({ phoneNumber: record.phoneNumber})
}










module.exports = {
  connectDatabase,
  closeDatabase,
  addNewRecords,
  getUnsentRecords,
  removeUnsentRecord,
  addNewConversation,
  getConversation,
  updateConversation,
  deleteConversation
}