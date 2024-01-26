(async function () {
const salesGodCRM = require("./salesGodCRM-lib")
const express = require('express')
const axios = require('axios')


// await salesGodCRM.login('jacobwalkersolutions@gmail.com', 'Godsgotthis#1')
// .then(() => console.log('Logged In Successfully'))



//INIT EXPRESS
const app = express()
app.use(express.json())

const port = 6101
app.listen(port, async () => {
    console.log('App listening on: ' + port)

    salesGodCRM.onText(async data => {
        await forwardSMS({message: data.text, number: data.contact.phone.substring(2)})
        .then(() => salesGodCRM.markBulkChatMessageRead([data.contact.id]))
        .catch(() => {})
    })
    
    const messagingContacts = await salesGodCRM.getContactsForMessaging()
    
    for (const contact of messagingContacts.unread_contacts) {
        const contactMessages = await salesGodCRM.fetchContactMessages(contact.id)
    
        const unreadMessages = contactMessages.items.slice(0, contact.unread)
    
        const combinedUnreadTexts = unreadMessages.map(obj => obj.text).join('\n\n')
    
        await forwardSMS({message: combinedUnreadTexts, number: contact.phone.substring(2)})
        .then(() => salesGodCRM.markBulkChatMessageRead([contact.id]))
        .catch(() => {})
    }
})



//FORWARD RECIEVED TEXTS
async function forwardSMS(SMS) {
    return new Promise(async (resolve, reject) => {
        console.log(SMS)
        console.log('Forwarding SMS to STELL')
    
        await axios.post('http://localhost:6100/msg', SMS)
        .then((response) => {
            if (response.data.ok) {
                console.log('STELL Processed SMS')
                resolve()
            } else {
                console.log('Recieved ERROR from STELL')
                reject()
            }
        })
        .catch(error => {
            console.error(error)
            console.log('Error Sending SMS to STELL')
            reject()
        })
    })
}





//SEND TEXTS




app.post('/send', async (req, res) => {
    try {
        console.log('Recieved Send SMS Request')
        const message = req.body.message
        const number = req.body.number

        const contacts = await salesGodCRM.fetchContacts(number)

        if (contacts.length === 1) {
            await salesGodCRM.sendChatMessage(contacts[0].id, message)
        } else if (contacts.length > 1) {
            console.log('Found too many contacts from number')
            return
        } else if (contacts.length < 1) {
            await salesGodCRM.addContact({
                first_name: number,
                phone: number
            })
    
            const contacts = await salesGodCRM.fetchContacts(number)
    
            await salesGodCRM.sendChatMessage(contacts[0].id, message)
        }

        res.send({ok: true})
        console.log('Sent OK Response to STELL')
    } catch (error) {
        console.error(error)
        res.send({ok: false})
        console.log('Sent NOT OK Response to STELL')
    }
})
})()
