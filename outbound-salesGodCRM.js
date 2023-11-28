puppeteer  = require('puppeteer')
express = require('express')

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



function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}