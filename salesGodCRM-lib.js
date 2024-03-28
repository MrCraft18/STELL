const io = require('socket.io-client')
const puppeteer = require('puppeteer')
const fs = require('fs')
const FormData = require('form-data')
const axios = require('axios').create({
    withCredentials: true,
    baseURL: 'https://salesgodcrm.net/api/'
})

let email
let password

//FUNCTIONS OBJECT
const salesGodCRM = {
    setEmail: (input) => {
        email = input
    },
    setPassword: (input) => {
        password = input
    },
    onText: (callback) => {
        const socket = io('wss://salesgodcrm.net:3000', {
            path: '/socket.io/',
            extraHeaders: {
                'Origin': 'https://salesgodcrm.net'
            },
            transports: ['websocket'],
            reconnectionDelayMax: 60000,
            reconnectionAttempts: Infinity
        })

        socket.on('connect', async () => {
            console.log('Socket.IO Connected')
            socket.emit('userConnected', [25, "user"])

            //Check for and send missed Messages
            const messagingContacts = await salesGodCRM.getContactsForMessaging()

            for (const contact of messagingContacts.unread_contacts) {
                const contactMessages = await salesGodCRM.fetchContactMessages(contact.id)

                const unreadMessages = contactMessages.items.slice(0, contact.unread).reverse()

                unreadMessages.forEach(unreadMessage => {
                    unreadMessage.contact = contact

                    callback(unreadMessage)
                })
            }
        })

        // Listen for custom events, e.g., message_received
        socket.on('message_received:user_25_message', (data) => {
            callback(data.content)
        })

        socket.on('disconnect', (reason) => {
            console.log(`Socket.IO Disconnected: ${reason}`)
        })

        socket.on('reconnect', async (attemptNumber) => {
            console.log(`Socket.IO Reconnected after ${attemptNumber} attempts`)
        })

        socket.on('connect_error', (error) => {
            console.log(`Connection Error: ${error.message}`)
        })
    },
    fetchPhoneNumbers: async () => {
        const cookies = await getCookies()

        try {
            return await axios.get('/phoneNumber/fetchPhoneNumbers?limit=10000&sort=is_primary', {
                headers: {
                    "Cookie": cookies["Cookie"],
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    ...cookies,
                    "Referer": "https://salesgodcrm.net/phone_numbers",
                    "Referrer-Policy": "strict-origin-when-cross-origin"
                }
            })
                .then(response => {
                    updateSession(response)

                    if (response.data.tableData.last_page < 1) {
                        console.log('Bro you have WAAAAAAAAY to many phone numbers')
                    }

                    return response.data.tableData.data
                })
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(`Error Fetching Phone Numbers: ${JSON.stringify(error.response.data)}`)
            } else {
                throw new Error(`Error Fetching Phone Numbers: ${error}`)
            }
        }
    },
    fetchContacts: async (filter) => {
        const cookies = await getCookies()

        let contacts = []

        let filterQuery

        if (filter) {
            filterQuery = `&filter=${filter}`
        } else {
            filterQuery = ''
        }

        const response = await axios.get(`/contact/fetchContacts?limit=10000&page=1${filterQuery}`, {
            headers: {
                ...cookies,
                "Referer": "https://salesgodcrm.net/contacts",
            }
        })
            .then(response => {
                updateSession(response)
                return response.data
            })
            .catch(error => {
                if (error.response && error.response.data) {
                    throw new Error(`Error Fetching Contacts: ${JSON.stringify(error.response.data.message)}`)
                } else {
                    throw new Error(`Error Fetching Contacts: ${error}`)
                }
            })

        contacts = [...contacts, ...response.tableData.data]

        if (response.tableData.last_page > 1) {
            for (i = 2; i <= response.tableData.last_page; i++) {
                console.log('bruh')
                const response = await axios.get(`/contact/fetchContacts?limit=10000&page=${i}${filterQuery}`, {
                    headers: {
                        ...cookies,
                        "Referer": "https://salesgodcrm.net/contacts",
                    }
                })
                    .then(response => {
                        updateSession(response)
                        return response.data
                    })
                    .catch(error => {
                        if (error.response && error.response.data) {
                            throw new Error(`Error Fetching Contacts: ${JSON.stringify(error.response.data.message)}`)
                        } else {
                            throw new Error(`Error Fetching Contacts: ${error}`)
                        }
                    })

                contacts = [...contacts, ...response.tableData.data]
            }
        }

        return contacts
    },
    addContact: async (contactData) => {
        const cookies = await getCookies()

        const formData = new FormData()

        const fields = [
            'first_name', 'last_name', 'phone', 'email', 'type',
            'country', 'state', 'city', 'address', 'postal_code'
        ]

        fields.forEach(field => {
            if (contactData.hasOwnProperty(field)) {
                formData.append(field, contactData[field])
            } else if (field === 'type') {
                formData.append(field, 'personal')
            }
        })

        formData.append('del_image', '0')

        await axios.post('/contact/addContact', formData, {
            headers: {
                ...formData.getHeaders(),
                ...cookies,
                "Referer": "https://salesgodcrm.net/contact",
            }
        })
            .then(response => {
                updateSession(response)
            })
            .catch(error => {
                if (error.response && error.response.data) {
                    throw new Error(`Error Adding Contact: ${JSON.stringify(error.response.data.message)}`)
                } else {
                    throw new Error(`Error Adding Contact: ${error}`)
                }
            })
    },
    sendChatMessage: async (contactID, text) => {
        const cookies = await getCookies()

        const formData = new FormData()

        formData.append('text', text)
        formData.append('from', 'last_used')

        await axios.post(`/message/sendChatMessage/${contactID}`, formData, {
            headers: {
                "Accept": "application/json",
                ...formData.getHeaders(),
                ...cookies,
                "Referer": "https://salesgodcrm.net/contacts",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            }
        })
            .then(response => updateSession(response))
            .catch(error => {
                if (error.response && error.response.data) {
                    throw new Error(`Error Sending Message: ${JSON.stringify(error.response.data.message)}`)
                } else {
                    throw new Error(`Error Sending Message: ${error}`)
                }
            })
    },
    getContactsForMessaging: async () => {
        const cookies = await getCookies()

        return await axios.post('/contact/getContactsForMessaging', { "unread_count": 0, "recent_count": 0, "all_count": 0, "offset": 0, "type": "load" }, {
            headers: {
                "Accept": "application/json",
                ...cookies,
                "Referer": "https://salesgodcrm.net/messenger",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            }
        })
            .then(response => {
                updateSession(response)

                return response.data
            })
            .catch(error => {
                if (error.response && error.response.data) {
                    throw new Error(`Error Getting Contacts for Messaging: ${JSON.stringify(error.response.data.message)}`)
                } else {
                    throw new Error(`Error Getting Contacts for Messaging: ${error}`)
                }
            })
    },
    fetchContactMessages: async (contactID) => {
        const cookies = await getCookies()

        return await axios.post(`message/fetchChatMessages/${contactID}`, { offset: 0 }, {
            headers: {
                "Accept": "application/json",
                ...cookies,
                "Referer": "https://salesgodcrm.net/messenger",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            }
        })
            .then(response => {
                updateSession(response)

                return response.data
            })
            .catch(error => {
                if (error.response && error.response.data) {
                    throw new Error(`Error Fetching Contact Messages: ${JSON.stringify(error.response.data.message)}`)
                } else {
                    throw new Error(`Error Fetching Contact Messages: ${error}`)
                }
            })
    },
    markBulkChatMessageRead: async (contactIDs) => {
        const cookies = await getCookies()

        axios.post('/message/markBulkChatMessageRead', { ids: contactIDs }, {
            headers: {
                "Accept": "application/json",
                ...cookies,
                "Referer": "https://salesgodcrm.net/messenger",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            }
        })
            .then(response => {
                updateSession(response)

                return response.data
            })
            .catch(error => {
                if (error.response && error.response.data) {
                    throw new Error(`Error Marking Chat Messages as Read: ${JSON.stringify(error.response.data.message)}`)
                } else {
                    throw new Error(`Error Marking Chat Messages as Read: ${error}`)
                }
            })
    }
}



function updateSession(response) {
    let XRSF_TOKEN, SESSION, COOKIE

    response.headers['set-cookie'].forEach(cookie => {

        if (cookie.startsWith('XSRF-TOKEN=')) {
            XRSF_TOKEN = cookie.split(';')[0] + '; '
        } else if (cookie.startsWith('salesgod_crm_session=')) {
            SESSION = cookie.split(';')[0] + '; '
        } else {
            COOKIE = cookie.split(';')[0] + ';'
        }
    })

    fs.writeFileSync('./salesGodCRM-cookies.txt', JSON.stringify({
        expiryDate: response.headers['set-cookie'][0].split(';').find(data => data.trim().startsWith('expires=')).replace('expires=', ''),
        cookies: {
            'X-XSRF-TOKEN': XRSF_TOKEN.replace('XSRF-TOKEN=', '').replace('%3D; ', '='),
            'Cookie': (XRSF_TOKEN + SESSION + COOKIE)
        }
    }, null, 4))
}



async function getCookies() {
    if (fs.existsSync('./salesGodCRM-cookies.txt')) {
        const previousCookies = JSON.parse(fs.readFileSync('./salesGodCRM-cookies.txt', 'utf-8'))

        if (new Date() > new Date(previousCookies.expiryDate)) {
            console.log('Getting new cookies')
            return await getNewCookies()
        } else {
            return previousCookies.cookies
        }
    } else {
        console.log('Getting new cookies')
        return await getNewCookies()
    }
}


async function getNewCookies() {
    const browser = await puppeteer.launch({
        headless: 'new',
        timeout: 0,
        defaultViewport: null,
        args: [
            '--start-maximized',
        ],
        protocolTimeout: 250000,
    })

    page = await browser.newPage()

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36')


    await page.goto('https://salesgodcrm.net', { waitUntil: 'networkidle0', timeout: 30000 })

    inboundInitialUrl = page.url()

    if (page.url() === "https://salesgodcrm.net/") {
        //Pretty self explainatory
        await page.waitForSelector('#email')
        await page.click('#email')
        await page.type('#email', email)
        await page.click('#password')
        await page.type('#password', password)
        await page.click('.btn-md.btn-primary.w-100')
        //Wait for URL change
        await page.waitForFunction(initial => window.location.href !== initial, {}, inboundInitialUrl)
    }

    if (page.url() === "https://salesgodcrm.net/dashboard") {
        console.log("Got New Cookies")

        const cookies = await page.cookies()

        browser.close()

        return {
            'X-XSRF-TOKEN': decodeURIComponent(cookies.find(cookie => cookie.name === 'XSRF-TOKEN').value),
            'Cookie': `XSRF-TOKEN=${cookies.find(cookie => cookie.name === 'XSRF-TOKEN').value}; salesgod_crm_session=${cookies.find(cookie => cookie.name === 'salesgod_crm_session').value}; ${cookies.find(cookie => cookie.name !== 'salesgod_crm_session' && cookie.name !== 'XSRF-TOKEN').name}=${cookies.find(cookie => cookie.name !== 'salesgod_crm_session' && cookie.name !== 'XSRF-TOKEN').value}`
        }
        // expiryDate: Math.round((cookies[0].expires * 1000) - 60 * 1000),

        // fs.writeFileSync('./salesGodCRM-cookies.txt', JSON.stringify({
        //     expiryDate: Math.round((cookies[0].expires * 1000) - 60 * 1000),
        //     cookies: {
        //         'X-XSRF-TOKEN': decodeURIComponent(cookies.find(cookie => cookie.name === 'XSRF-TOKEN').value),
        //         'Cookie': `XSRF-TOKEN=${cookies.find(cookie => cookie.name === 'XSRF-TOKEN').value}; salesgod_crm_session=${cookies.find(cookie => cookie.name === 'salesgod_crm_session').value}; ${cookies.find(cookie => cookie.name !== 'salesgod_crm_session' && cookie.name !== 'XSRF-TOKEN').name}=${cookies.find(cookie => cookie.name !== 'salesgod_crm_session' && cookie.name !== 'XSRF-TOKEN').value}`
        //     }
        // }, null, 4))
    } else {
        console.log("Not Logged In from Puppeteer")
    }
}






module.exports = salesGodCRM
