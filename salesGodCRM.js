puppeteer  = require('puppeteer');
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
    });

    outboundPage = await outboundBrowser.newPage()

    await outboundPage.goto('https://salesgodcrm.net', {waitUntil: 'networkidle0', timeout: 30000})

    outboundInitialUrl = outboundPage.url()
    console.log(initialUrl)

    if (outboundPage.url() === "https://salesgodcrm.net/") {
        //Pretty self explainatory
        await outboundPage.waitForSelector('#email')
        await outboundPage.click('#email')
        await outboundPage.type('#email', 'jacobwalkersolutions@gmail.com')
        await outboundPage.click('#password')
        await outboundPage.type('#password', 'Godsgotthis#1')
        await outboundPage.click('.btn-md.btn-primary.w-100')
        //Wait for URL change
        await outboundPage.waitForFunction(initial => window.location.href !== initial, {}, initialUrl)
    }

    console.log(outboundPage.url())

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
        const searchResult = await outboundPage.$$eval("#data-table > table > tbody", tbody => tbody.some(el => el.querySelector('tr') !== null));
    
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
    console.log(initialUrl)

    if (inboundPage.url() === "https://salesgodcrm.net/") {
        //Pretty self explainatory
        await inboundPage.waitForSelector('#email')
        await inboundPage.click('#email')
        await inboundPage.type('#email', 'jacobwalkersolutions@gmail.com')
        await inboundPage.click('#password')
        await inboundPage.type('#password', 'Godsgotthis#1')
        await inboundPage.click('.btn-md.btn-primary.w-100')
        //Wait for URL change
        await inboundPage.waitForFunction(initial => window.location.href !== initial, {}, initialUrl)
    }

    console.log(inboundPage.url())

    if (inboundPage.url() === "https://salesgodcrm.net/dashboard") {
        console.log("Starting Loop")
    } else {
        console.log("Not Starting Loop")
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
        //Get all messages elements
        const messages = await watcherPage.$$eval('li.pt-2.pb-2.chat_contacts.d-flex.align-items-center.position-absolute.w-100', elements => elements.map(element => {
            const numberElement = element.querySelector('p.text-truncate.text-capitalize.fw-600.text-dark.mb-0')
            const messageElement = element.querySelector('span.text-truncate.text-muted')
        
            const number = numberElement ? numberElement.innerText.replace(/\D/g, '') : null
            const message = messageElement ? messageElement.innerText : null
        
            return { message, number }
        }))

        //If messageElements is greater than 0 do stuff
        if (messageElements.length !== 0) {
            //MARK MESSAGES AS READ IN BROWSER
        }
    }, 3000);
}



function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}