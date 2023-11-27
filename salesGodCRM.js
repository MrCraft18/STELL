const puppeteer  = require('puppeteer');
express = require('express')
axios = require('axios')

app = express()
app.use(express.json())
port = process.env.PORT || 6100

let browser
;(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        timeout: 0,
        defaultViewport: null,
        args: [
            '--start-maximized',
        ],
        protocolTimeout: 250000,
        userDataDir: './puppeteer'
    });

    mainPage = await browser.newPage()

    await mainPage.goto('https://salesgodcrm.net', {waitUntil: 'networkidle0', timeout: 30000})

    initialUrl = mainPage.url()
    console.log(initialUrl)

    if (mainPage.url() === "https://salesgodcrm.net/") {
        //Pretty self explainatory
        await mainPage.waitForSelector('#email')
        await mainPage.click('#email')
        await mainPage.type('#email', 'jacobwalkersolutions@gmail.com')
        await mainPage.click('#password')
        await mainPage.type('#password', 'Godsgotthis#1')
        await mainPage.click('.btn-md.btn-primary.w-100')
        //Wait for URL change
        await mainPage.waitForFunction(initial => window.location.href !== initial, {}, initialUrl)
    }

    console.log(mainPage.url())

    if (mainPage.url() === "https://salesgodcrm.net/dashboard") {
        console.log("Starting Server...")
        app.listen(port, () => {
            console.log("App listening on Port: " + port)
        })
    } else {
        console.log("Not Starting Server")
    }
})()



// process.on('SIGINT', async () => {
//     console.log('SIGINT signal received: closing browser');
//     await browser.close();
//     process.exit(0);
// });



app.post("/send", async (req, res) => {
    try {
        console.log('Recieved Send SMS Request')
        const message = req.body.message
        const number = req.body.number
    
        //Click Contacts
        await mainPage.click("#navbar-nav > li:nth-child(4)")
        //Wait for search input
        await mainPage.waitForSelector('#dt_main_search')
        //Clear search input
        await mainPage.$eval('#dt_main_search', el => el.value = '')
        //Type number into search box
        await mainPage.type('#dt_main_search', number)
        //See if there is a search result for the number
        await delay(1500)
        const searchResult = await mainPage.$$eval("#data-table > table > tbody", tbody => tbody.some(el => el.querySelector('tr') !== null));
    
        //Add contact if it doesnt show up
        if (!searchResult) {
            console.log("Adding Contact for: " + number)
    
            //Click Add Contact button
            await mainPage.click('a[title="Add Contact"]')
            //Wait for first name input
            await mainPage.waitForSelector('#first_name')
            //Type number in first name field
            await mainPage.type('#first_name', number)
            //Type number in number field
            await mainPage.type('#phone', number)
            //Click Add Contact button
            await delay(500)
            await mainPage.click(".btn.btn-success")
            //See if Created Successfully close button exists
            await delay(500)
            const successBoxButton = await mainPage.$(".Vue-Toastification__close-button")
            //If it exists close it
            if (successBoxButton) {
                console.log("Found Bad button")
                await successBoxButton.click()
            }
        }
        //Click the contact name to bring up text message box
        await mainPage.click('.cursor-pointer.text-primary.fs-14.fw-medium.h-underline')
        //Wait for textarea element
        await mainPage.waitForSelector('textarea')
        //Input text message into text field
        await mainPage.type('textarea', message)
        //Click Send button
        await mainPage.click('a[data-original-title="Send"]')
        //Click logo button to reset everything
        await mainPage.reload()
        
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