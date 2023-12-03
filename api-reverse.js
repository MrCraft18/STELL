const { response } = require('express')

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
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    ...cookies,
                    "Referer": "https://salesgodcrm.net/auth/login",
                    "Referrer-Policy": "strict-origin-when-cross-origin"
                  } 
            })
            .then(response => {
                updateSession(response)
            })
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(`Error during login process: ${JSON.stringify(error.response.data)}`)
            } else {
                throw new Error(`Error during login process: ${error}`)
            }
        }
    },
    fetchPhoneNumbers: async () => {
        try {
            return await axios.get('/phoneNumber/fetchPhoneNumbers?limit=10000&sort=is_primary', {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    ...cookies,
                    "Referer": "https://salesgodcrm.net/phone_numbers",
                    "Referrer-Policy": "strict-origin-when-cross-origin"
                }
            })
            .then(response => {
                if (response.data.tableData.last_page < 1) {
                    console.log('Bro you have WAAAAAAAAY to many phone numbers')
                }

                return response.data.tableData.data
            })
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(`Error fetching Phone Numbers: ${JSON.stringify(error.response.data)}`)
            } else {
                throw new Error(`Error fetching Phone Numbers: ${error}`)
            } 
        }
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
    try {
        console.log('Before Login')
        
        await salesGodCRM.login("jacobwalkersolutions@gmail.com", "Godsgotthis#1")

        console.log("Logged Into SalesGodCRM Successfully")
    
        const phoneNumbers = await salesGodCRM.fetchPhoneNumbers()

        console.log(phoneNumbers)
    } catch (error) {
        console.error(error)
    }
})()