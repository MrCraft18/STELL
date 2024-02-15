const express = require('express')
const socketIo = require('socket.io')
const axios = require('axios')
const database = require('./mongodb.js')
const fs = require('fs')
const { stellLogic } = require('./stellLogic.js')
const { MongoClient } = require('mongodb')
require('dotenv').config()

const client = new MongoClient(process.env.MONGODB_URI)
const unsentRecordsCollection = client.db('STELL').collection('unsentRecords')
const conversationsCollection = client.db('STELL').collection('conversations')

const app = express()
app.use(express.json())
app.use(express.static(__dirname + '/public'))

const port = 6102
const server = app.listen(port, () => {
    console.log("App listening on port: " + port)
})

const io = socketIo(server)



app.post('/master-conversation', async (req, res) => {
    try {
        await database.deleteConversation({ phoneNumber: req.body.masterNumber })

        await sendSMS(req.body.content, req.body.masterNumber)

        await database.addNewConversation({
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
            }]
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
        let record = await database.getConversation(number)

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

            await database.updateConversation(record)

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

            database.updateConversation(record)
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
                    conversations: await conversationsCollection
                        .find({ unread: true }, { projection: { _id: 0, name: true, phoneNumber: true, lastMessageTime: true, lastMessage: true, unread: true } })
                        .sort({ lastMessageTime: -1 })
                        .limit(limit)
                        .toArray()
                })
                break

            case 'leads':
                res.status(200).send({
                    conversations: await conversationsCollection
                        .find({ stage: 'lead' }, { projection: { _id: 0, name: true, phoneNumber: true, lastMessageTime: true, lastMessage: true, unread: true } })
                        .sort({ lastMessageTime: -1 })
                        .limit(limit)
                        .toArray()
                })
                break

            case 'stell':
                res.status(200).send({
                    conversations: await conversationsCollection
                        .find({ stage: { $gt: 0 } }, { projection: { _id: 0, name: true, phoneNumber: true, lastMessageTime: true, lastMessage: true, unread: true } })
                        .sort({ lastMessageTime: -1 })
                        .limit(limit)
                        .toArray()
                })
                break

            case 'all':
                res.status(200).send({
                    conversations: await conversationsCollection
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
                    conversations: await conversationsCollection
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
                    conversations: await conversationsCollection
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
                    conversations: await conversationsCollection
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
                    conversations: await conversationsCollection
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
            record: await conversationsCollection
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

        await conversationsCollection
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
        await conversationsCollection
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
            unsentRecords: await unsentRecordsCollection
                .find({})
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
        await conversationsCollection.updateOne({phoneNumber: number}, {$set: {stage: 'archived'}})

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
            unsentRecordsAmount: await unsentRecordsCollection
                .countDocuments({})
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

    if (currentlySending) {
        res.status(500).send({
            error: 'Currently busy sending a batch of records.'
        })

        return
    }

    try {
        currentlySending = true

        const unsentRecordsToSend = await unsentRecordsCollection
            .find({})
            .sort({_id: 1})
            .limit(amount)
            .toArray()

        for (i = 0; i < unsentRecordsToSend.length; i++) {
            const record = unsentRecordsToSend[i]

            const openingText = getOpeningText(record)

            const conversationRecord = {
                stage: 0,
                ...record,
                textConversation: [{
                    sender: "STELL",
                    content: openingText,
                    timestamp: new Date()
                }],
                gptMessages: [{
                    role: 'assistant',
                    content: openingText,
                }],
                lastMessage: openingText,
                lastMessageTime: new Date(),
                unread: false
            }

            await sendSMS(openingText, conversationRecord.phoneNumber)

            io.emit('unsentRecordSent', conversationRecord.phoneNumber)

            unsentRecordsCollection.deleteOne({ phoneNumber: record.phoneNumber })

            conversationsCollection.insertOne(conversationRecord)

            if (i !== unsentRecordsToSend.length - 1) {
                await new Promise(resolve =>setTimeout(resolve, 1000))
            }
        }
        currentlySending = false

        io.emit('finishedSendingUnsentRecords', {})

        res.status(200).send()

        console.log(`Client sent out ${amount} Unsent Records`)
    } catch (error) {
        console.log(error)
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