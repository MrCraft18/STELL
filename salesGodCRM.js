(async function () {
const salesGodCRM = require("./salesGodCRM-lib")
const express = require('express')
const axios = require('axios')


await salesGodCRM.login('jacobwalkersolutions@gmail.com', 'Godsgotthis#1')
.then(() => console.log('Logged In Successfully'))


async function forwardSMS(SMS) {
    console.log(SMS)
    console.log('Forwarding SMS to STELL')

    // await axios.post('http://localhost:6100/msg', SMS)
    // .then(() => {
    //     console.log('STELL Processed SMS')
    // })
    // .catch(error => {
    //     console.error(error)
    //     console.log('Error Sending SMS to STELL')
    // })
}

salesGodCRM.onText(async data => {
    await forwardSMS({message: data.text, number: data.contact.phone.substring(2)})
    .then(() => salesGodCRM.markBulkChatMessageRead([contact.id]))
})

const messagingContacts = await salesGodCRM.getContactsForMessaging()

messagingContacts.unread_contacts.forEach(async contact => {
    const contactMessages = await salesGodCRM.fetchContactMessages(contact.id)

    const unreadMessages = contactMessages.items.slice(0, contact.unread)

    const combinedUnreadTexts = unreadMessages.map(obj => obj.text).join('\n\n')

    await forwardSMS({message: combinedUnreadTexts, number: contact.phone.substring(2)})
    .then(() => salesGodCRM.markBulkChatMessageRead([contact.id]))
});
})()