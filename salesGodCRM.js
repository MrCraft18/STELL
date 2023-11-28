puppeteer  = require('puppeteer')
express = require('express')
axios = require('axios')

app = express()
app.use(express.json())
port = process.env.PORT || 6100


//OUTBOUND FUNCTIONALITY
;(async () => {
    const outboundBrowser = await puppeteer.launch({
        headless: true,
        timeout: 0,
        defaultViewport: null,
        args: [
            '--start-maximized',
        ],
        protocolTimeout: 250000,
        userDataDir: './puppeteer'
    })

    outboundPage = await outboundBrowser.newPage()

    await outboundPage.goto('https://salesgodcrm.net', {waitUntil: 'networkidle0', timeout: 30000})

    outboundInitialUrl = outboundPage.url()

    if (outboundPage.url() === "https://salesgodcrm.net/") {
        //Pretty self explainatory
        await outboundPage.waitForSelector('#email')
        await outboundPage.click('#email')
        await outboundPage.type('#email', 'jacobwalkersolutions@gmail.com')
        await outboundPage.click('#password')
        await outboundPage.type('#password', 'Godsgotthis#1')
        await outboundPage.click('.btn-md.btn-primary.w-100')
        //Wait for URL change
        await outboundPage.waitForFunction(initial => window.location.href !== initial, {}, outboundInitialUrl)
    }

    if (outboundPage.url() === "https://salesgodcrm.net/dashboard") {
        console.log("Starting Server...")
        app.listen(port, () => {
            console.log("App listening on Port: " + port)
        })
    } else {
        console.log("Not Starting Server")
    }
})()



app.post("/send", async (req, res) => {
    try {
        console.log('Recieved Send SMS Request')
        const message = req.body.message
        const number = req.body.number
    
        //Click Contacts
        await outboundPage.click("#navbar-nav > li:nth-child(4)")
        //Wait for search input
        await outboundPage.waitForSelector('#dt_main_search')
        //Clear search input
        await outboundPage.$eval('#dt_main_search', el => el.value = '')
        //Type number into search box
        await outboundPage.type('#dt_main_search', number)
        //See if there is a search result for the number
        await delay(1500)
        const searchResult = await outboundPage.$$eval("#data-table > table > tbody", tbody => tbody.some(el => el.querySelector('tr') !== null))
    
        //Add contact if it doesnt show up
        if (!searchResult) {
            console.log("Adding Contact for: " + number)
    
            //Click Add Contact button
            await outboundPage.click('a[title="Add Contact"]')
            //Wait for first name input
            await outboundPage.waitForSelector('#first_name')
            //Type number in first name field
            await outboundPage.type('#first_name', number)
            //Type number in number field
            await outboundPage.type('#phone', number)
            //Click Add Contact button
            await delay(500)
            await outboundPage.click(".btn.btn-success")
            //See if Created Successfully close button exists
            await delay(500)
            const successBoxButton = await outboundPage.$(".Vue-Toastification__close-button")
            //If it exists close it
            if (successBoxButton) {
                console.log("Found Bad button")
                await successBoxButton.click()
            }
        }
        //Click the contact name to bring up text message box
        await outboundPage.click('.cursor-pointer.text-primary.fs-14.fw-medium.h-underline')
        //Wait for textarea element
        await outboundPage.waitForSelector('textarea')
        //Input text message into text field
        await outboundPage.type('textarea', message)
        //Click Send button
        await outboundPage.click('a[data-original-title="Send"]')
        //Click logo button to reset everything
        await outboundPage.reload()

        console.log(`Sent: ${message}\nTo: ${number}`)
        
        res.send({ok: true})
        console.log("Sent Ok Response to STELL")
    } catch (err) {
        console.log(err)
        res.send({ok: false})
        console.log("Sent Error Response to STELL")
    }
})



//AAAÁAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
//INBOUND FUNCTIONALITY



;(async () => {
    const inboundBrowser = await puppeteer.launch({
        headless: true,
        timeout: 0,
        defaultViewport: null,
        args: [
            '--start-maximized',
        ],
        protocolTimeout: 250000,
        userDataDir: './puppeteer'
    });

    inboundPage = await inboundBrowser.newPage()

    await inboundPage.goto('https://salesgodcrm.net', {waitUntil: 'networkidle0', timeout: 30000})

    inboundInitialUrl = inboundPage.url()

    if (inboundPage.url() === "https://salesgodcrm.net/") {
        //Pretty self explainatory
        await inboundPage.waitForSelector('#email')
        await inboundPage.click('#email')
        await inboundPage.type('#email', 'jacobwalkersolutions@gmail.com')
        await inboundPage.click('#password')
        await inboundPage.type('#password', 'Godsgotthis#1')
        await inboundPage.click('.btn-md.btn-primary.w-100')
        //Wait for URL change
        await inboundPage.waitForFunction(initial => window.location.href !== initial, {}, inboundInitialUrl)
    }

    if (inboundPage.url() === "https://salesgodcrm.net/dashboard") {
        console.log("Starting Watcher Loop")
        startWatcherLoop(inboundPage)
    } else {
        console.log("Not Starting Watcher Loop")
    }
})()



function startWatcherLoop(inboundPage) {
    setInterval(async () => {
        //Click Messenger button
        await inboundPage.click('#navbar-nav > li:nth-child(3) > a')
        //Click Unread button
        await inboundPage.evaluate(() => {
            const elements = document.querySelectorAll('btn.btn-outline-primary.btn-sm.mb-0')
            for (let element of elements) {
                if (element.innerText === 'Unread') {
                    element.click()
                    break
                }
            }
        })
        //Get existing chatElement
        const chatElement = await inboundPage.$('li.pt-2.pb-2.chat_contacts.d-flex.align-items-center.position-absolute.w-100')

        //If chatElement exists then do stuff
        if (chatElement) {
            console.log("Found Message")
            //Click the chat element
            await chatElement.click()

            await inboundPage.waitForSelector("#users-conversation")
            
            //Get Number
            const number = await chatElement.$eval('p.text-truncate.text-capitalize.fw-600.text-dark.mb-0', numberElement => {
                //Pare inner text from number element
                const number = numberElement ? numberElement.innerText.replace(/\D/g, '') : null
            
                return number
              })
            //Get Message
            const message = await inboundPage.$eval("#users-conversation", conversationElement => {
                //Get last message child from conversation element
                const lastMessageElement = conversationElement.lastElementChild

                //Extract text from text content element
                const message = lastMessageElement.querySelector('p.mb-0.ctext-content').textContent

                return message
            })

            //Select message in chat element
            await chatElement.evaluate((element) => {
                const input = element.querySelector('input.form-check-input.me-1.fs-14');
                if (input) {
                    input.click();
                }
            });
            //Click Mark Read
            await inboundPage.evaluate(() => {
                const elements = document.querySelectorAll('label.btn.btn-outline-dark.btn-sm.mb-0')
                for (let element of elements) {
                    if (element.innerText === 'Mark Read') {
                        element.click()
                        break
                    }
                }
            })

            axios.post('http://localhost:6101/msg', { message, number })
                .then(response => {
                    if (response.data.ok) {
                        console.log(`Successfully Forwarded: ${message}\nFrom: ${number}`)
                    } else {
                        console.error(`Recieved Not Ok Response from STELL`)
                    }
                })
                .catch(err => {
                    console.error(err)
                    console.log("Axios Error")
                })
        }
    }, 3000)
}



function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}