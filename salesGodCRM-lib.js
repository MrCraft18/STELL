const WebSocket = require('ws')
const puppeteer  = require('puppeteer')
const fs = require('fs')
const FormData = require('form-data')
const axios = require('axios').create({
    withCredentials: true,
    baseURL: 'https://salesgodcrm.net/api/'
})

//FUNCTIONS OBJECT
const salesGodCRM = {
    // login: async (email, password) => {
    //     try {
    //         await axios.get('sanctum/csrf-cookie')
    //         .then(response => {
    //             console.log(response.headers['set-cookie'])
    //             updateSession(response)
    //             console.log(cookies)
    //         })

    //         await axios.post('auth/login', {"email": email,"password": password}, {
    //             headers: {
    //                 ...cookies,
    //                 "referer": "https://salesgodcrm.net/auth/login",
    //               } 
    //         })
    //         .then(response => updateSession(response))
    //     } catch (error) {
    //         if (error.response && error.response.data) {
    //             throw new Error(`Error during login process: ${JSON.stringify(error.response.data.message)}`)
    //         } else {
    //             throw new Error(`Error during login process: ${error}`)
    //         }
    //     }
    // },
    // newLogin: async (lastSessionCookies) => {
    //     try {
    //         await axios.get('auth/user', {
    //             headers: {
    //                 ...lastSessionCookies,
    //                 "referer": "https://salesgodcrm.net/dashboard",
    //               }
    //         })
    //         .then(response => {
    //             updateSession(response)

    //             keepAliveInterval = setInterval(async () => {
    //                 await axios.get('auth/user', {
    //                     headers: {
    //                         ...cookies,
    //                         "referer": "https://salesgodcrm.net/dashboard",
    //                       } 
    //                 })
    //                 .then(response => updateSession(response))
    //             }, (1000*60*60*24))
    //         })
    //     } catch (error) {
    //         if (error.response && error.response.data) {
    //             throw new Error(`Error during login from last session process: ${JSON.stringify(error.response.data.message)}`)
    //         } else {
    //             throw new Error(`Error during login from last session process: ${error}`)
    //         }
    //     }
    // },
    onText: (callback) => {
        let ws
        let heartbeatTimeoutTimer
        const heartbeatTimeout = 20000

        function connectWebsocket() {
            ws = new WebSocket('wss://salesgodcrm.net:3000/socket.io/?EIO=4&transport=websocket', {
                headers: {
                    'Origin': 'https://salesgodcrm.net'
                }
            })

            ws.on('open', ()  => {
                console.log('Websocket Connected')
                ws.send(40)
                resetHeartbeatTimeout()
            })
    
            ws.on('message', (data) => {
                const message = data.toString()
    
                if (message == 2) {
                    ws.send(3)
                    resetHeartbeatTimeout()
                } else if (message.startsWith(40)) {
                    ws.send('42["userConnected",[25,"user"]]')
                } else if (message.startsWith(42)) {
                    const arr = JSON.parse(message.substring(2))
    
                    if (arr[0] === 'message_received:user_25_message') {
                        callback(arr[1].content)
                    }
                }
            })
    
            ws.on('close', () => {
                console.log('Websocket Closed')
                clearTimeout(heartbeatTimeoutTimer)
                reconnectWebsocket()
            })
        }

        function resetHeartbeatTimeout() {
            clearTimeout(heartbeatTimeoutTimer)
            heartbeatTimeoutTimer = setTimeout(() => {
                console.log('Heartbeat Timed Out')
                ws.close()
            }, heartbeatTimeout)
        }

        async function reconnectWebsocket() {
            console.log('Reconnecting Websocket...')

            connectWebsocket()

            //Check for and send missed Messages
            const messagingContacts = await salesGodCRM.getContactsForMessaging()
    
            for (const contact of messagingContacts.unread_contacts) {
                console.log(contact)

                const contactMessages = await salesGodCRM.fetchContactMessages(contact.id)
            
                const unreadMessages = contactMessages.items.slice(0, contact.unread)

                unreadMessages.forEach(unreadMessage => {
                    unreadMessage.contact = contact

                    callback(unreadMessage)
                })
            }
        }

        connectWebsocket()
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

        contacts = [...contacts, ... response.tableData.data]

        if (response.tableData.last_page > 1) {
            for (i = 2; i <= response.tableData.last_page; i++) {
                console.log(i)
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

                contacts = [...contacts, ... response.tableData.data]
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
                if (error.response.data.message === "Unable to send message! Contact is blocked.") {
                    console.log(`Contact ID ${contactID} was blocked.`)
                } else {
                    throw new Error(`Error Sending Message to Contact ID ${contactID}: ${JSON.stringify(error.response.data.message)}`)
                }
            } else {
                throw new Error(`Error Sending Message to Contact ID ${contactID}: ${error}`)
            }
        })
    },
    getContactsForMessaging: async () => {
        const cookies = await getCookies()

        return await axios.post('/contact/getContactsForMessaging', {"unread_count":0,"recent_count":0,"all_count":0,"offset":0,"type":"load"}, {
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

        return await axios.post(`message/fetchChatMessages/${contactID}`, {offset: 0}, {
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

        axios.post('/message/markBulkChatMessageRead', {ids: contactIDs}, {
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

        fs.writeFileSync('./cookies.txt', JSON.stringify({
            expiryDate: response.headers['set-cookie'][0].split(';').find(data => data.trim().startsWith('expires=')).replace('expires=', ''),
            cookies: {
                'X-XSRF-TOKEN': XRSF_TOKEN.replace('XSRF-TOKEN=', '').replace('%3D; ', '='),
                'Cookie': (XRSF_TOKEN + SESSION + COOKIE)
            }
        }, null, 4))
}



async function getCookies() {
    const previousCookies = JSON.parse(fs.readFileSync('./cookies.txt', 'utf-8'))

    if (new Date() > new Date(previousCookies.expiryDate)) {
        console.log('Getting new cookies')
        return await getNewCookies()
    } else {
        return previousCookies.cookies
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
    });

    page = await browser.newPage()
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
    

    await page.goto('https://salesgodcrm.net', {waitUntil: 'networkidle0', timeout: 30000})

    inboundInitialUrl = page.url()

    if (page.url() === "https://salesgodcrm.net/") {
        //Pretty self explainatory
        await page.waitForSelector('#email')
        await page.click('#email')
        await page.type('#email', 'jacobwalkersolutions@gmail.com')
        await page.click('#password')
        await page.type('#password', 'Godsgotthis#1')
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

        // fs.writeFileSync('./cookies.txt', JSON.stringify({
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
