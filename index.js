const express = require('express')
const socketIo = require('socket.io')
const axios = require('axios')
const fs = require('fs')
const { stellLogic } = require('./stellLogic.js')
const { MongoClient, ObjectId } = require('mongodb')
require('dotenv').config()

const client = new MongoClient(process.env.MONGODB_URI)
const listsCollection = client.db('STELL').collection('lists')
const recordsCollection = client.db('STELL').collection('records')

const app = express()
app.use(express.static(__dirname + '/public'))
app.use(express.json({limit: '50mb'}))
app.use(express.urlencoded({limit: '50mb', extended: true}))

const port = 6102
const server = app.listen(port, () => {
    console.log("App listening on port: " + port)
})

const io = socketIo(server)



app.post('/master-conversation', async (req, res) => {
    try {
        await recordsCollection.deleteOne({ phoneNumber: req.body.masterNumber })

        await sendSMS(req.body.content, req.body.masterNumber)

        await recordsCollection.insertOne({
            stage: 0,
            phoneNumber: req.body.masterNumber,
            name: req.body.masterName,
            address: req.body.masterAddress,
            info: [],
            textConversation: [{
                sender: "STELL",
                content: req.body.content,
                timestamp: new Date()
            }],
            gptMessages: [{
                role: 'assistant',
                content: req.body.content,
            }],
            lastMessage: null,
            lastMessageTime: null,
            unread: false,
        })

        res.send({
            ok: true
        })
    } catch (err) {
        console.log(err)

        res.send({
            ok: false
        })
    }
})



app.post('/msg', async (req, res) => {
    const message = req.body.message
    const number = req.body.number

    console.log("Recieved new message: ", { message, number: number })

    try {
        let record = await recordsCollection.findOne({ phoneNumber: number })

        if (record !== undefined) {
            record.textConversation.push({
                sender: number,
                content: message,
                timestamp: new Date()
            })

            record.gptMessages.push({
                role: 'user',
                content: message,
            })

            record.lastMessage = message

            record.lastMessageTime = new Date()

            await recordsCollection.replaceOne({ phoneNumber: record.phoneNumber }, record)

            io.emit('newMessage', ({
                conversation: record.phoneNumber,
                message,
                sender: record.phoneNumber,
                time: record.lastMessageTime
            }))


            console.log('Processing...')

            if (Number.isInteger(record.stage) && record.stage >= 0) {
                const logicResponse = await stellLogic(record)

                const stellResponse = logicResponse.stellResponse

                if (stellResponse) {
                    // TODO: Before SMS and database is updated check and see if new SMS has been recieved during logic processing time. (This is gonna suck)
                    // TODO: Add realistic human typing delay before sending SMS.
                    sendSMS(stellResponse, record.phoneNumber)
                    record = logicResponse.record
                    record.lastMessage = stellResponse
                    record.lastMessageTime = new Date()

                    io.emit('newMessage', ({
                        conversation: record.phoneNumber,
                        message: stellResponse,
                        sender: 'STELL',
                        time: record.lastMessageTime
                    }))
                } else if (record.stage === -1) {
                    console.log(`Moved ${record.phoneNumber} to DNC (-1)`)
                } else {
                    record.unread = true

                    io.emit('updateUnread', {
                        conversation: record.phoneNumber,
                        unread: true
                    })
                }
            }

            recordsCollection.replaceOne({ phoneNumber: record.phoneNumber }, record)
        } else {
            console.log('UNKNOWN NUMBER')
        }

        res.send({
            ok: true
        })

        console.log('Sent Processed Successfully Response to SMS App')
    } catch (error) {
        console.log(error)

        res.send({
            ok: false
        })

        console.log('Sent ERROR Response to SMS App')
    }
})



function sendSMS(message, number) {
    return new Promise((resolve, reject) => {
        axios.post('http://localhost:6103/send', { message, number })
            .then(response => {
                if (response.data.ok) {
                    resolve()
                } else {
                    reject({ error: 'Recieved ERROR Response from SMS App' })
                }
            })
            .catch(error => {
                reject(error)
            })
    })
}



//FRONT END
app.get('/', (req, res) => {
    res.redirect('/conversations')
})

app.get('/conversations', (req, res) => {
    res.sendFile(__dirname + '/public/conversations/index.html')
})

app.get('/send-texts', (req, res) => {
    res.sendFile(__dirname + '/public/send-texts/index.html')
})

app.get('/add-list', (req, res) => {
    res.sendFile(__dirname + '/public/add-list/index.html')
})



//API
app.get('/api/getConversationsForSidebar', async (req, res) => {
    try {
        const category = req.query.category
        const limit = parseInt(req.query.limit)

        switch (category) {
            case 'unread':
                res.status(200).send({
                    conversations: await recordsCollection
                        .find({ unread: true }, { projection: { _id: 0, name: true, phoneNumber: true, lastMessageTime: true, lastMessage: true, unread: true } })
                        .sort({ lastMessageTime: -1 })
                        .limit(limit)
                        .toArray()
                })
                break

            case 'leads':
                res.status(200).send({
                    conversations: await recordsCollection
                        .find({ stage: 'lead' }, { projection: { _id: 0, name: true, phoneNumber: true, lastMessageTime: true, lastMessage: true, unread: true } })
                        .sort({ lastMessageTime: -1 })
                        .limit(limit)
                        .toArray()
                })
                break

            case 'stell':
                res.status(200).send({
                    conversations: await recordsCollection
                        .find({ stage: { $gt: 0 } }, { projection: { _id: 0, name: true, phoneNumber: true, lastMessageTime: true, lastMessage: true, unread: true } })
                        .sort({ lastMessageTime: -1 })
                        .limit(limit)
                        .toArray()
                })
                break

            case 'all':
                res.status(200).send({
                    conversations: await recordsCollection
                        .find({ stage: { $ne: 0 } }, { projection: { _id: 0, name: true, phoneNumber: true, lastMessageTime: true, lastMessage: true, unread: true } })
                        .sort({ lastMessageTime: -1 })
                        .limit(limit)
                        .toArray()
                })
                break
        }

        console.log(`Sent "${category}" category to a client with limit: ${limit}`)
    } catch (error) {
        console.log(error)

        res.status(500).send({
            error: "Internal Error (Caden Sucks...)"
        })
    }
})

app.get('/api/searchConversationsForSidebar', async (req, res) => {
    const searchQuery = req.query.searchQuery
    const category = req.query.category
    const limit = parseInt(req.query.limit)

    try {
        switch (category) {
            case 'unread':
                res.status(200).send({
                    conversations: await recordsCollection
                        .find({
                            unread: true,
                            $or: [
                                {
                                    phoneNumber: {
                                        $regex: searchQuery,
                                        $options: 'i'
                                    }
                                },
                                {
                                    name: {
                                        $regex: searchQuery,
                                        $options: 'i'
                                    }
                                }
                            ]
                        },
                            {
                                projection: { _id: 0, name: true, phoneNumber: true, lastMessageTime: true, lastMessage: true, unread: true },
                            })
                        .sort({ lastMessageTime: -1 })
                        .limit(limit)
                        .toArray()
                })
                break

            case 'leads':
                res.status(200).send({
                    conversations: await recordsCollection
                        .find({
                            stage: 'lead',
                            $or: [
                                {
                                    phoneNumber: {
                                        $regex: searchQuery,
                                        $options: 'i'
                                    }
                                },
                                {
                                    name: {
                                        $regex: searchQuery,
                                        $options: 'i'
                                    }
                                }
                            ]
                        },
                            {
                                projection: { _id: 0, name: true, phoneNumber: true, lastMessageTime: true, lastMessage: true, unread: true },
                            })
                        .sort({ lastMessageTime: -1 })
                        .limit(limit)
                        .toArray()
                })
                break

            case 'stell':
                res.status(200).send({
                    conversations: await recordsCollection
                        .find({
                            stage: { $gt: 0 },
                            $or: [
                                {
                                    phoneNumber: {
                                        $regex: searchQuery,
                                        $options: 'i'
                                    }
                                },
                                {
                                    name: {
                                        $regex: searchQuery,
                                        $options: 'i'
                                    }
                                }
                            ],
                        },
                            {
                                projection: { _id: 0, name: true, phoneNumber: true, lastMessageTime: true, lastMessage: true, unread: true },
                            })
                        .sort({ lastMessageTime: -1 })
                        .limit(limit)
                        .toArray()
                })
                break

            case 'all':
                res.status(200).send({
                    conversations: await recordsCollection
                        .find({
                            stage: { $ne: 0 },
                            $or: [
                                {
                                    phoneNumber: {
                                        $regex: searchQuery,
                                        $options: 'i'
                                    }
                                },
                                {
                                    name: {
                                        $regex: searchQuery,
                                        $options: 'i'
                                    }
                                }
                            ]
                        },
                            {
                                projection: { _id: 0, name: true, phoneNumber: true, lastMessageTime: true, lastMessage: true, unread: true },
                            })
                        .sort({ lastMessageTime: -1 })
                        .limit(limit)
                        .toArray()
                })
                break
        }

        console.log(`Sent Search Query "${searchQuery}" conversations to a client with limit: ${limit}`)
    } catch (error) {
        console.log(error)

        res.status(500).send({
            error: "Internal Error (Caden Sucks...)"
        })
    }
})

app.get('/api/getRecord', async (req, res) => {
    try {
        const phoneNumber = req.query.phoneNumber

        res.status(200).send({
            record: await recordsCollection
                .findOne({ phoneNumber }, { projection: { _id: 0, stage: true, name: true, address: true, info: true, textConversation: true } })
        })

        console.log(`Sent "${phoneNumber}" record to a client`)
    } catch (error) {
        console.log(error)

        res.status(500).send({
            error: "Internal Error (Caden Sucks...)"
        })
    }
})

app.post('/api/sendMessage', async (req, res) => {
    const message = req.body.message
    const number = req.body.number

    try {
        await sendSMS(message, number)

        await recordsCollection
            .updateOne({ phoneNumber: number }, {
                $push: {
                    textConversation: {
                        sender: 'client',
                        content: message,
                        timestamp: new Date()
                    },
                    gptMessages: {
                        role: 'assistant',
                        content: req.body.content,
                    }
                },
                $set: {
                    lastMessageTime: new Date(),
                    unread: false
                }
            })

        res.status(200).send()
        console.log('Client sent message:', { message, number })
    } catch (error) {
        console.log(error)

        res.status(500).send({
            error: "Internal Error (Caden Sucks...)"
        })
    }
})

app.post('/api/markRead', async (req, res) => {
    number = req.body.number

    try {
        await recordsCollection
            .updateOne({ phoneNumber: number }, {
                $set: {
                    unread: false
                }
            })
        
        res.status(200).send()

        console.log(`Client marked "${number}" as read`)
    } catch (error) {
        console.log(error)

        res.status(500).send({
            error: "Internal Error (Caden Sucks...)"
        })
    }
})

app.get('/api/getUnsentRecords', async (req, res) => {
    try {
        res.status(200).send({
            unsentRecords: await recordsCollection
                .find({stage: 'unsent'})
                .sort({_id: 1})
                .limit(100)
                .toArray()
        })
    } catch (error) {
        console.log(error)

        res.status(500).send({
            error: "Internal Error (Caden Sucks...)"
        })
    }
})

app.post('/api/archiveConversation', async (req, res) => {
    const number = req.body.number

    try {
        await recordsCollection.updateOne({phoneNumber: number}, {$set: {stage: 'archived'}})

        res.status(200).send()

        console.log(`Client Archived "${number}" Conversation`)
    } catch (error) {
        console.log(error)

        res.status(500).send({
            error: "Internal Error (Caden Sucks...)"
        })
    }
})

app.get('/api/unsentRecordsAmount', async (req, res) => {
    try {
        res.status(200).send({
            unsentRecordsAmount: await recordsCollection
                .countDocuments({stage: 'unsent'})
        })
    } catch (error) {
        console.log(error)

        res.status(500).send({
            error: "Internal Error (Caden Sucks...)"
        })
    }
})

let currentlySending = false
app.get('/api/unsentRecordsSendingStatus', async (req, res) => {
    try {
        res.status(200).send({
            currentlySending
        })
    } catch (error) {
        console.log(error)

        res.status(500).send({
            error: "Internal Error (Caden Sucks...)"
        })
    }
})

app.post('/api/sendUnsentRecords', async (req, res) => {
    const amount = req.body.amount

    console.log(`Client Requested to Send ${amount} Texts`)

    if (currentlySending) {
        res.status(500).send({
            error: 'Currently busy sending a batch of records.'
        })

        return
    }

    try {
        currentlySending = true

        const unsentRecordsToSend = await recordsCollection
            .find({stage: 'unsent'})
            .sort({_id: 1})
            .limit(amount)
            .toArray()

        for (i = 0; i < unsentRecordsToSend.length; i++) {
            const record = unsentRecordsToSend[i]

            const openingText = getOpeningText(record)

            record.stage = 0
            record.textConversation.push({
                sender: "STELL",
                content: openingText,
                timestamp: new Date()
            })
            record.gptMessages.push({
                role: 'assistant',
                content: openingText,
            })
            record.lastMessage = openingText
            record.lastMessageTime = new Date()
            record.unread = false

            await sendSMS(openingText, record.phoneNumber)

            io.emit('unsentRecordSent', record.phoneNumber)

            recordsCollection.replaceOne({ phoneNumber: record.phoneNumber }, record)

            if (i !== unsentRecordsToSend.length - 1) {
                await new Promise(resolve =>setTimeout(resolve, 1000))
            }
        }
        currentlySending = false

        io.emit('finishedSendingUnsentRecords', {})

        res.status(200).send()

        console.log(`Client sent out ${unsentRecordsToSend.length} Unsent Records`)
    } catch (error) {
        console.log(error)

        res.status(500).send({
            error: "Internal Error (Caden Sucks...)"
        })
    }



    function getOpeningText(record) {
        const lines = fs.readFileSync('openingTexts.txt', 'utf-8').split('\n')
        const topLine = lines.shift()

        fs.writeFileSync('openingTexts.txt', lines.join('\n') + '\n' + lines.shift())

        const name = record.name.split(' ')[0];
        const city = record.address.split(',')[1].trim()

        const message = topLine
            .replace('[name]', name)
            .replace('[city]', city)

        return message
    }
})

app.post('/api/addList', (req, res) => {
    const listName = req.body.listName
    const records = req.body.records

    console.log(records.length)

    const listId = new ObjectId()

    try {
        listsCollection.insertOne({
            _id: listId,
            listName,
            uploadDate: new Date()
        })

        recordsCollection.insertMany(records.map(record => ({
            stage: 'unsent',
            ...record,
            textConversation: [],
            gptMessages: [],
            lastMessage: null,
            lastMessageTime: null,
            unread: false,
            listId
        })))

        res.sendStatus(200)

        console.log(`Client Added list named ${listName} with ${records.length} records`)
    } catch (error) {
        console.log(error)

        res.status(500).send({
            error: "Internal Error (Caden Sucks...)"
        })
    }
})