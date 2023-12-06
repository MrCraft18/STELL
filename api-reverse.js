const WebSocket = require('ws')
const FormData = require('form-data')
const axios = require('axios').create({
    withCredentials: true,
    baseURL: 'https://salesgodcrm.net/api/'
})

const cookies = {}

const salesGodCRM = {
    login: async (email, password) => {
        try {
            await axios.get('sanctum/csrf-cookie')
            .then(response => {
                updateSession(response)
            })

            await axios.post('auth/login', {"email": email,"password": password}, {
                headers: {
                    ...cookies,
                    "referer": "https://salesgodcrm.net/auth/login",
                  } 
            })
            .then(response => {
                updateSession(response)
            })
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(`Error during login process: ${JSON.stringify(error.response.data.message)}`)
            } else {
                throw new Error(`Error during login process: ${error}`)
            }
        }
    },
    onText: (callback) => {
        const ws = new WebSocket('wss://salesgodcrm.net:3000/socket.io/?EIO=4&transport=websocket', {
            headers: {
                'Origin': 'https://salesgodcrm.net'
            }
        })

        ws.on('open', ()  => {
            console.log('connected ws')

            ws.send(40)
        })

        ws.on('message', (data) => {
            const message = data.toString()

            if (message == 2) {
                ws.send(3)
            } else if (message.startsWith(40)) {
                ws.send('42["userConnected",[25,"user"]]')
            } else if (message.startsWith(42)) {
                const arr = JSON.parse(message.substring(2))

                console.log(arr[0])

                if (arr[0] === 'message_received:user_25_message') {
                    console.log(arr[1].content)
                }
            } else {
                console.log(message)
            }
        })
    },
    fetchPhoneNumbers: async () => {
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
        let contacts = []

        let filterQuery

        if (filter) {
            filterQuery = `&filter=${filter}`
        } else {
            filterQuery = ''
        }

        const response = await axios.get(`/contact/fetchContacts?limit=100&page=1${filterQuery}`, {
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
                const response = await axios.get(`/contact/fetchContacts?limit=100&page=${i}${filterQuery}`, {
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
    }, sendChatMessage: async (contactID, text) => {
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

        cookies['X-XSRF-TOKEN'] = XRSF_TOKEN.replace('XSRF-TOKEN=', '').replace('%3D; ', '=')
        cookies['Cookie'] = (XRSF_TOKEN + SESSION + COOKIE)
}











(async function () {
    await salesGodCRM.login("jacobwalkersolutions@gmail.com", "Godsgotthis#1")
    .then(() => console.log("Logged Into SalesGodCRM Successfully"))

        

    // await salesGodCRM.addContact({
    //     first_name: 'Caden',
    //     phone: '8176737349'
    // })
    // .then(() => {
    //     console.log("added contact successfully")
    // })
    // .catch(error => {
    //     console.log(error)
    // })

    // const contacts = await salesGodCRM.fetchContacts(8176737349)
    // .catch(error => {
    //     console.log(error)
    // })

    // console.log(contacts.length)

    await salesGodCRM.sendChatMessage(2014247, "Work Now")

    // salesGodCRM.onText((text) => {
        
    // })

    // const phoneNumbers = await salesGodCRM.fetchPhoneNumbers()
    // console.log(phoneNumbers)
})()













