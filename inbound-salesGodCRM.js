puppeteer  = require('puppeteer')
axios = require('axios')



;(async () => {
    const inboundBrowser = await puppeteer.launch({
        headless: 'new',
        timeout: 0,
        defaultViewport: null,
        args: [
            '--start-maximized',
        ],
        protocolTimeout: 250000,
        userDataDir: './inbound-browser'
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
    async function loop() {
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

            console.log(`Forwarding SMS...\nMessage: ${message}\nFrom: ${number}`)

            axios.post('http://localhost:6101/msg', { message, number })
                .then(response => {
                    if (response.data.ok) {
                        console.log(`Recieved Ok Responss from STELL`)
                    } else {
                        console.error(`Recieved NOT Ok Response from STELL`)
                    }
                })
                .catch(err => {
                    console.error(err)
                    console.log("Axios Error")
                })
                .finally(() => {
                    setTimeout(loop, 2000);
                })
        } else {
            setTimeout(loop, 2000)
        }
    }
    loop()
}



function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}