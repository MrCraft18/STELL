const axios = require('axios')
const database = require('./mongodb')
const fs = require('fs')


const amountToSend = 100

async function main() {
    for (i = 0; i < amountToSend; i++) {
        const unsentRecord = await database.shiftUnsentRecords()
    
        console.log(unsentRecord)
    
        try {
            const openingText = getOpeningText(unsentRecord)
    
            const conversationRecord = {
                stage: 0,
                ...unsentRecord,
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
    
            sendSMS(openingText, conversationRecord.phoneNumber)
    
            database.addNewConversation(conversationRecord)
        } catch (error) {
            console.log(error)
        
            database.addUnsentRecords([unsentRecord])
        }
    
        if (i === amountToSend - 1) {
            console.log(`Sent all ${amountToSend} texts!~`)
        } else {
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

    }
}
main()











function sendSMS(message, number) {
    return new Promise((resolve, reject) => {
        axios.post('http://localhost:6103/send', {message, number})
        .then(response => {
            if (response.data.ok) {
                resolve()
            } else {
                reject({error: 'Recieved ERROR Response from SMS App'})
            }
        })
        .catch(error => {
            reject(error)
        })
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