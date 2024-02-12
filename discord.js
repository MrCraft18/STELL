const { Client, GatewayIntentBits } = require("discord.js")
const fs = require('fs')
const csv = require('csv-parser')
const { Readable } = require('stream')
const express = require('express')
const axios = require('axios')
const database = require('./database-lib')
const gpt = require('./gpt-lib.js')
const { resolve } = require("path")







//Discord Token
const TOKEN = "MTA5NTUwMDk0OTU0NTU1MzkyMA.GRBm3S.WJo5XNDF2JzpvVPtphXmvEY-PPQu6LZ8wZ_VDM"



//Initiate Express
const app = express()
app.use(express.json())


function dualLog(message) {
    console.log(message)

    try {
        if (message) {
            discordClient.channels.cache.get('1117979636685623416').send(message.toString())
        }
    } catch (err) {
        console.log(err)
    }
}

//Guild
const guildID = '1095498826757972080'

//Channels
const devID = "1095504592487333888"
const uploadID = "1095499113174405182"
const textID = "1095499160813326336"

//Categorys
const leadsID = '1095499249157935144'
const stellConversationsID = '1095499425100603402'
const stellDroppedConversationsID = '1117204980600942701'
const overridenConversationsCategoryID = '1118329950794170510'



//Seller Avatar URL
const avatarURL = 'https://static.vecteezy.com/system/resources/previews/000/355/795/original/house-vector-icon.jpg'



//INIT
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

discordClient.login(TOKEN)



discordClient.on('ready', async () => {
    // await database.connectDatabase()

    dualLog(`${discordClient.user.tag} has logged in and is ready.`)

    app.listen(6100)

    //Create Guild Object
    guild = discordClient.guilds.cache.get(guildID)

    //Initialize Channel Functions
    devChannel = discordClient.channels.cache.get(devID)
    uploadChannel = discordClient.channels.cache.get(uploadID)
    textChannel = discordClient.channels.cache.get(textID)

    //Initialize Category Functions
    leadsCategory = discordClient.channels.cache.get(leadsID)
    stellConversationsCategory = discordClient.channels.cache.get(stellConversationsID)
    stellDroppedConversationsCategory = discordClient.channels.cache.get(stellDroppedConversationsID)
    overridenConversationsCategory = discordClient.channels.cache.get(overridenConversationsCategoryID)

    // let fetchedMessages = await textChannel.messages.fetch()
    // fetchedMessages.forEach(async message => {
    //     await message.delete()
    // })

    //discordClient.channels.cache.get('1117513660600950914').send("Hello, I hope you're doing well. I'm interested in the property at 106 Lakecrest Ct. Would it be okay if I ask you a few questions about it? And also, would it be okay if I made an offer on it?")

    //uploadChannel.send("Upload your DataZapp .csv file here and I'll add the usable records to the text queue list!~\n\nSome rules as I don't have much error handling (If you break me Master will be very angry!!!)\n- Only upload a single .csv file at a time.\n- Don't send any messages in this channel without a .csv attatchment.\n- Only upload .csv files from DataZapp\n- Also note the max file size for Discord is 25MB if you have a larger file please seek Master for assistance.\n\nThat's all for now! Master promised he would make me super smart soon, so please be patient with me!~")
    //textChannel.send(`Let me know how many records you'd like to send texts to and I'll send them out!\n\nJust type the number of texts you'd like to send out for example "300".\n\nIf you request a number greater than the available unsent records then I'll let you know how many available records you have.\n\n(Just a reminder I don't have much error handling. So don't break me!!!)`)
    //discordClient.channels.cache.get('1096464445137494016').send(`Hi there, I'm STELL!\nShort for:\n\nSwift\nText-based\nEfficient\nLead\nLocator.\n\nI'll be your assistant in generating deals to wholesale. My functionality is very basic at the moment as I have only just been developed. But my Master has promised to make me super smart and advanced one day!\n\nRight now I can sort through and upload records from a csv file, then send any number of texts to the records you have available. If you get a response from any of those texts I'll pull up the entire conversation and sort it respectively for you. You can then manually send texts to any of those conversations by just sending the message you'd like to send to that conversation channel!\n\nAlso again, since I was only just developed, its very easy to break me since I don't have much error handling. So please try to stick to the rules as much as possible!\n\nMaster is currently working on me to being able to respond to messages automatically so please be patient for that functionality!`)
})
//END INIT



//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA



//Functionality Handler
discordClient.on('messageCreate', async (message) => {
    if (message.channel.id === uploadID && message.attachments.size > 0) {
        uploadChannel.send(`Got it! Uploading Records...`)

        const promiseArray = []
        message.attachments.forEach(attachment => {
            promiseArray.push(
                requestTextFile(attachment.url)
                    .then(async csvString => {
                        const parseData = await parseCSV(csvString)

                        try {
                            await database.addNewRecords(parseData.usableRecords)

                            uploadChannel.send(`Ok! I uploaded ${parseData.usableRecords.length} usable records out of ${parseData.totalRecords} total records.\n\nDon't add this file again or you will send duplicate texts!`)
                        } catch (err) {
                            dualLog(err)
                            uploadChannel.send(`Sorry but there was an error uploading the records! Please let Master know!!!`)
                        }
                    })
                    .catch(err => {
                        dualLog(`HTTP Error: ${err.message}`)
                        uploadChannel.send(`Sorry but there was an error with the HTTP request! Please let Master know!!!`)
                    })
            )
        })
        await Promise.all(promiseArray)



    } else if (message.channel.id === textID && message.author.username !== 'STELL - Chan') {
        textChannel.send(`Okay! Sending texts...`)

        const unsentRecords = await database.getUnsentRecords()

        const sendNumber = parseInt(message.content)

        if (sendNumber > unsentRecords.length) {
            textChannel.send(`Sorry that number is too big!\n\nThe available number of records you have in the system is: ${unsentRecords.length}`)
        } else {
            for (let i = 0; i < sendNumber; i++) {

                let record = unsentRecords[i]
                const message = getOpeningText(record)

                try {
                    await sendSMS(message, record.phoneNumber)

                    record.conversationLabel = "noResponse"

                    record.conversation = [{
                        sender: "STELL",
                        content: message,
                        timestamp: timestamp()
                    }]

                    await database.addNewConversation(record)

                    await database.removeUnsentRecord(record)

                    if (i === sendNumber - 1) {
                        textChannel.send(`Sent all ${sendNumber} texts!~`)
                    } else {
                        await new Promise(resolve =>setTimeout(resolve, 3000))
                    }
                } catch (err) {
                    textChannel.send('It seems there was an error sending the texts :(\nPlease let master know!!! ')
                    break
                }
            }
        }



    } else if (message.channel.parent && !message.author.bot && message.content.charAt(0) !== '!') {
        const phoneNumber = message.channel.topic

        const record = await database.getConversation(phoneNumber)

        if (record.conversationLabel !== 'DNC') {
            record.conversation.push({
                sender: message.author.username,
                content: message.content,
                timestamp: timestamp()
            })

            try {
                await sendSMS(message.content, record.phoneNumber)

                await database.updateConversation(record)
            } catch (err) {
                message.channel.send('This message did not send!\nPlease let Master know!!!')
            }
        }



    } else if (message.channel == devChannel && !message.author.bot) {
        switch (message.content) {
            case '!test':
                dualLog("Sending test SMS...")
                await sendSMS("This is a test text from STELL!~ Please do not respond!", '8176737349')
                    .then(() => {
                        message.channel.send('Sent test SMS!')
                    })
                    .catch(() => {
                        message.channel.send('I had an issue sending the test SMS! :(')
                    })
                break

            case '!masterConversation':
                try {
                    const masterNumber = '8176737349'
                    const masterName = 'Caden Edwards'
                    const masterAddress = '1304 Shalimar Dr, Fort Worth, TX 76134'

                    await database.deleteConversation({ phoneNumber: masterNumber })

                    const oldChannel = guild.channels.cache.find(channel => channel.topic === masterNumber)

                    if (oldChannel) {
                        await oldChannel.delete().then(() => dualLog("Deleted Old Master Channel"))
                    }

                    const content = 'Hello There, I am Jacob in Fort Worth. Is this still Caden?'

                    await sendSMS(content, masterNumber)

                    await database.addNewConversation({
                        address: masterAddress,
                        name: masterName,
                        phoneNumber: masterNumber,
                        conversationLabel: 'noResponse',
                        conversation: [{
                            sender: "STELL",
                            content,
                            timestamp: timestamp()
                        }]
                    })

                    message.channel.send('Sent a test Conversation to Master!')
                } catch (err) {
                    dualLog(err)
                    message.channel.send('I had an issue sending a conversation to you Master :(')
                }
                break

            case '!crash':
                message.channel.send(`Fine then I'll kill myself ;-;`).then(() => { throw new Error('Crashing the script intentionally.') })
                break
        }



    } else if (message.channel.parent && !message.author.bot && message.content.charAt(0) === '!') {
        switch (message.content) {
            case '!override':
                try {
                    const phoneNumber = message.channel.topic

                    const record = await database.getConversation(phoneNumber)

                    record.conversationLabel = 'override'

                    await database.updateConversation(record)

                    message.channel.setParent(overridenConversationsCategory).then(() => { dualLog(`Moved ${phoneNumber} to overriden category`) })

                    message.channel.send('Conversation Overriden!')
                } catch (err) {
                    dualLog(err)
                    message.channel.send('Error overriding conversation!!!')
                }
        }
    }
})



//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA



//Handle Incoming Text Messages
app.post('/msg', async (req, res) => {
    const message = req.body.message
    const from = req.body.number

    dualLog(`Recieved new text from: ${req.body.number} Content: ${req.body.message}`)

    try {
        let record = await database.getConversation(from)

        if (record === undefined) {
            dualLog('THIS IS AN UNKNOWN NUMBER')

            res.send({
                code: 200,
                content: 'STELL PROCESSED SMS'
            })
            dualLog('Sent Processed Successfully Response to SMS App')

            return
        }

        record.conversation.push({
            sender: from,
            content: message,
            timestamp: timestamp()
        })



        if (record.conversationLabel === 'noResponse') {
            if (message.toLowerCase().match(/\b(nah|no|wrong|stop|nope|negative|never)\b|message blocking is active/)) {
                record.conversationLabel = "DNC"

                await database.updateConversation(record)

                dualLog(`Marked ${record.phoneNumber} as DNC`)
            } else {
                dualLog(`Creating new channel for: ${from}`)

                const channel = await guild.channels.create({
                    name: record.name,
                    parent: stellConversationsID,
                    topic: record.phoneNumber
                })

                webhook = await channel.createWebhook({
                    name: record.name,
                    avatar: avatarURL,
                })

                record.webhook = webhook.url

                record.conversationLabel = 'stellConversation'

                await initiateChannel(channel, record)

                dualLog('Sent Info to Channel')

                const stellText = await gpt.generateConversation(record)

                await sendSMS(stellText, record.phoneNumber)

                channel.send(stellText)

                record.conversation.push({
                    sender: 'STELL',
                    content: stellText,
                    timestamp: timestamp()
                })
            }



        } else if (record.conversationLabel === 'stellConversation') {
            await sellerMessage(message, record.webhook)

            const isQuestionResponse = await gpt.generateisQuestion(record)

            dualLog(isQuestionResponse)

            const channel = await getChannelObj(record)

            channel.send(`*[${removeIdentifier(isQuestionResponse).trim()}]*`)

            if (isQuestionResponse.includes('YES')) {
                const isColdLeadResponse = await gpt.generateisColdLead(record)

                dualLog(isColdLeadResponse)

                channel.send(`*[${removeIdentifier(isColdLeadResponse).trim()}]*`)

                if (isColdLeadResponse.includes('DROP')) {
                    record.conversationLabel = 'DNC'

                    channel.setParent(stellDroppedConversationsCategory).then(() => { dualLog(`Moved ${record.phoneNumber} to STELL dropped conversations category`) })
                } else if (isColdLeadResponse.includes('CONTINUE')) {
                    const stellText = await gpt.generateConversation(record)

                    await sendSMS(stellText, record.phoneNumber)

                    channel.send(stellText)

                    record.conversation.push({
                        sender: 'STELL',
                        content: stellText,
                        timestamp: timestamp()
                    })
                } else if (isColdLeadResponse.includes('TRUE')) {
                    record.conversationLabel = 'coldLead'

                    const stellText = await gpt.generateConversation(record)

                    await sendSMS(stellText, record.phoneNumber)

                    channel.send(stellText)

                    record.conversation.push({
                        sender: 'STELL',
                        content: stellText,
                        timestamp: timestamp()
                    })
                }
            } else {
                const stellText = await gpt.generateConversation(record)

                await sendSMS(stellText, record.phoneNumber)

                channel.send(stellText)

                record.conversation.push({
                    sender: 'STELL',
                    content: stellText,
                    timestamp: timestamp()
                })
            }



        } else if (record.conversationLabel === 'coldLead') {
            await sellerMessage(message, record.webhook)

            const isClearAnswerResponse = await gpt.generateisClearAnswer(record)

            dualLog(isClearAnswerResponse)

            const channel = await getChannelObj(record)

            channel.send(`*[${removeIdentifier(isClearAnswerResponse).trim()}]*`)

            if (isClearAnswerResponse.includes('YES')) {
                const stellText = "Ok thanks for the info. While I run my numbers do you have an ideal price you'd want for the property?"

                sendSMS(stellText, record.phoneNumber)

                channel.send(stellText)

                record.conversationLabel = "awaitingLeadConfirmation"

                record.conversation.push({
                    sender: 'STELL',
                    content: stellText,
                    timestamp: timestamp()
                })
            } else {
                const stellText = await gpt.generateConversation(record)

                await sendSMS(stellText, record.phoneNumber)

                channel.send(stellText)

                record.conversation.push({
                    sender: 'STELL',
                    content: stellText,
                    timestamp: timestamp()
                })
            }



        } else if (record.conversationLabel === 'awaitingLeadConfirmation') {
            await sellerMessage(message, record.webhook)

            record.conversationLabel = "lead"

            const channel = await getChannelObj(record)

            channel.setParent(leadsCategory).then(() => { dualLog(`Moved ${record.phoneNumber} to leads category`) })

            sendSMS(`Yipeee!!!\n\nI got you a lead:\n${record.name}`, '8176923635')



        } else {
            await sellerMessage(message, record.webhook)
        }

        await database.updateConversation(record)


        res.send({
            ok: true
        })
        dualLog('Sent Processed Successfully Response to SMS App')
    } catch (err) {
        dualLog(err)

        res.send({
            ok: false
        })
        dualLog('Sent ERROR Response to SMS App')
    }
})



//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA



//FUNCTIONS
function requestTextFile(url) {
    return axios.get(url)
        .then(response => {
            return response.data;
        })
        .catch(err => {
            throw err;
        })
}



function parseCSV(csvString) {
    return new Promise((resolve, reject) => {
        const usableRecords = []
        let totalRecords = 0

        const stream = Readable.from(csvString)
        stream.pipe(csv())
        .on('data', obj => {
            totalRecords++

            if (obj['Owner MOBILE 1']) {
                dualLog(obj)
                const record = {
                    address: `${obj['Property Address']}, ${obj['Property City']}, ${obj['Property State']} ${obj['Property Zip']}`,
                    name: `${obj["First Name"]} ${obj["Last Name"]}`,
                    phoneNumber: obj['Owner MOBILE 1'],
                    info : [
                        'Land Acreage',
                        'Land Square Footage',
                        'Land Value',
                        'Tax Assessed Value'
                    ]
                    .map(header => {
                        return { [header]: obj[header] }
                    })
                }
                usableRecords.push(record)
            }
        })
        .on('end', () => {
            resolve({ usableRecords: usableRecords, totalRecords: totalRecords })
        })
        .on('error', reject)
    })
}



function getOpeningText(record) {
    const data = fs.readFileSync('openingTexts.txt', 'utf-8')
    const lines = data.split('\n')
    const topLine = lines.shift()
    const newContent = lines.join('\n') + '\n' + topLine

    fs.writeFileSync('openingTexts.txt', newContent)

    const name = record.name.split(' ')[0];
    const city = record.address.split(',')[1].trim()

    const message = topLine
        .replace('[name]', name)
        .replace('[city]', city)

    return message
}



function timestamp() {
    const now = new Date();
    const dateInCentralTimezone = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago', timeZoneName: 'short' }))
    const formattedDate = dateInCentralTimezone.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true, timeZoneName: 'short', timeZone: 'America/Chicago', newLine: '\n' })
    return formattedDate
}



function sellerMessage(content, url) {
    return new Promise(resolve => {
        axios.post(url, { "content": content })
            .then(resolve())
            .catch(err => dualLog(err))
    })
}



async function initiateChannel(channel, record) {
    await channel.send(`-Seller Information-\n\nName: ${record.name}\nAddress: ${record.address}\nPhone Number: ${record.phoneNumber}\nEstimated Value: ${record.estimatedValue}\nTax Amount: ${record.taxAmount}\n\n--------------------`)

    for (const text of record.conversation) {
        if (text.sender === 'STELL') {
            await channel.send(text.content)
        } else {
            await sellerMessage(text.content, record.webhook)
        }
    }

    return
}



async function getChannelObj(record) {
    await guild.channels.fetch()

    const channel = guild.channels.cache.find(ch => ch.topic === record.phoneNumber)

    return channel
}



const smsBackupStream = fs.createWriteStream('./STELL-sms-backups.txt', { flags: 'a' })
function sendSMS(message, number) {
    return new Promise((resolve, reject) => {
        axios.post('http://localhost:6101/send', { message, number })
            .then(response => {
                if (!response.data.ok) {
                    dualLog('Recieved Error Response from SMS API')

                    smsBackupStream.write(`${JSON.stringify({ message, number })}\n`)

                    reject()
                } else {
                    dualLog("Recieved OK Response from SMS API")
                    resolve()
                }
            })
            .catch(err => {
                dualLog(err)

                smsBackupStream.write(`${JSON.stringify({ message, number })}\n`)

                reject()
            })
    })
}



function removeIdentifier(inputString) {
    const identifiers = /\[(YES|NO|DROP|DROPPED|LEAD|CONTINUE|TRUE)\]/g

    const result = inputString.replace(identifiers, '').trim()

    return result
}