(async function () {
const salesGodCRM = require("./salesGodCRM-lib")
const express = require('express')
const axios = require('axios')
require('dotenv').config()


salesGodCRM.setEmail(process.env.SALESGODCRM_EMAIL)
salesGodCRM.setPassword(process.env.SALESGODCRM_PASSWORD)



//INIT EXPRESS
const app = express()
app.use(express.json())

const port = 6103
app.listen(port, async () => {
    console.log('App listening on: ' + port)

    salesGodCRM.onText(async data => {
        forwardSMS({message: data.text, number: data.contact.phone.substring(2)})
        .then(() => salesGodCRM.markBulkChatMessageRead([data.contact.id]))
        .catch(() => {})
    })
})



//FORWARD RECIEVED TEXTS
async function forwardSMS(SMS) {
    return new Promise(async (resolve, reject) => {
        console.log('Forwarding SMS to STELL', SMS)

        await axios.post('http://localhost:6102/msg', SMS)
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
        console.log('Recieved Send SMS Request for:', req.body)
        const message = req.body.message
        const number = req.body.number

        //TODO: Have functionality to bypass checking if contact is in salesGodCRM if this is the known first text.
        const contacts = await salesGodCRM.fetchContacts(number)

        if (contacts.length === 1) {
            await salesGodCRM.sendChatMessage(contacts[0].id, message)
        } else if (contacts.length > 1) {
            throw new Error('Found too many contacts from number')
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
