const puppeteer = require('puppeteer')
const express = require('express')
const axios = require('axios')
const fs = require('fs')


//Initiate Express
const app = express()
app.use(express.json())
app.listen(4000)



const smsBackupStream = fs.createWriteStream('./APP-sms-backups.txt', { flags: 'a' })




//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA



;(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        timeout: 0,
        defaultViewport: null,
        args: ['--start-maximized'],
        protocolTimeout: 250000,
        userDataDir: './puppeteer'
    });

    mainPage = await browser.newPage()
    watcherPage = await browser.newPage()

    mainPageLogin(mainPage)
        .then(async () => {
            await dismissStupidCrap(mainPage)

            watcherPageLogin(watcherPage)
                .then(async () => {
                    await dismissStupidCrap(watcherPage)

                    loggedInConfirmation(mainPage)

                    watcherLoop()
                })
                .catch(err => {
                    console.log(`Watcher Page Error:\n${err}`)
                })
        })
        .catch(err => console.log(`Main Page Error:\n${err}`))
})()



//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA



taskStatus = 'none'



app.post('/send', async (req, res) => {
    console.log('Recieved Send SMS Request')
    const message = req.body.message
    const number = req.body.number

    taskStatus = 'waiting'
    console.log('Waiting')

    await waitForReady()
    console.log('Ready')

    try {
        await mainPage.bringToFront()

        const contactsElement = await mainPage.$('#sb_contacts')

        await contactsElement.scrollIntoView()
        await contactsElement.click()
        await mainPage.waitForSelector('.hl-text-input')
        await delay(1500)
        await mainPage.$eval('.hl-text-input', el => el.value = '')
        await delay(1500)
        await mainPage.type('.hl-text-input', number)
        await delay(1500)
        const childNodes = await mainPage.$$eval('tbody[data-v-b2a079d4] > *', nodes => nodes.map(node => node.outerHTML))
    
        if (childNodes.length === 0) {
            await mainPage.click('button[data-original-title="Add"]')
            await mainPage.waitForSelector('input[placeholder="Phone 1"]')
            await mainPage.type('input[placeholder="Phone 1"]', number)
            await mainPage.click('button[type="Submit"]')
            await mainPage.waitForSelector('a[id="sms-tab"]')
            await mainPage.click('a[id="sms-tab"]')
            await mainPage.waitForSelector('#text-message')
            await mainPage.type('#text-message', message)
            await mainPage.waitForSelector('#send-sms')
            await mainPage.focus('#send-sms')
            await mainPage.keyboard.press('Enter')
            await mainPage.click('a.back')

            await textCounter()
        } else {
            await mainPage.waitForSelector('td[data-title="Phone"]')
            await mainPage.click('td[data-title="Phone"]')
            await mainPage.waitForSelector('a[id="sms-tab"]')
            await mainPage.click('a[id="sms-tab"]')
            await mainPage.waitForSelector('#text-message')
            await mainPage.type('#text-message', message)
            await mainPage.waitForSelector('#send-sms')
            await mainPage.focus('#send-sms')
            await mainPage.keyboard.press('Enter')
            await mainPage.click('a.back')
        }
        
        res.send(`Sent SMS "${message}" to ${number}`)
        console.log(`Sent SMS "${message}" to ${number}`)
    } catch (err) {
        console.log(err)

        res.send('Error')
    } finally {
        watcherLoop()
    }
})



//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA



let lastMessages

async function watcherLoop() {
    console.log("Loop Start")

    await watcherPage.bringToFront()

    await watcherPage.click('#sb_conversations')

    const intervalID = setInterval(async () => {
        const messages = await watcherPage.$$eval('li.messages-list--item-v2', elements => elements.map(element => {
            const numberElement = element.querySelector('p span')
            const messageElement = element.querySelector('div.flex.content-center p')
        
            const number = numberElement ? numberElement.innerText.replace(/\D/g, '') : null
            const message = messageElement ? messageElement.innerText : null
        
            return { message, number }
          }))

          //console.log(messages)

          if (messages.length !== 0 && messages !== lastMessages) {
            await watcherPage.click('#allCheckbox')
            await watcherPage.waitForSelector('div.dropright.--no-caret')
            await watcherPage.click('div.dropright.--no-caret')
            await watcherPage.waitForSelector('div.dropright.--no-caret')
            await watcherPage.evaluate(() => {
              const elements = document.querySelectorAll('span.sort-option-item')
              for (let element of elements) {
                if (element.innerText === 'Mark As Read') {
                  element.click()
                  break
                }
              }
            })

            for (const SMS of messages) {
                console.log(`Sending ${JSON.stringify(SMS)} to STELL`)

                try {
                    const response = await axios.post('http://localhost:3000/msg', SMS)
                    console.log(response.data)

                    if (response.data.code !== 200) {
                        smsBackupStream.write(`${JSON.stringify(SMS)}\n`)
                    }
                } catch (err) {
                    console.log(`Error Transmitting SMS to STELL:\n${err}`)
    
                    smsBackupStream.write(`${JSON.stringify(SMS)}\n`)
                }
              }  
          } else if (messages === lastMessages) {
            await page.reload()
          }

        if (taskStatus === 'waiting') {
            clearInterval(intervalID)
            taskStatus = 'ready'
        }
    }, 5000);
}



//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA



//Functions
function requireOTP(page) {
    return new Promise(async (resolve) => {
        try {
            await page.waitForFunction(() => {
                let currentTitle = document.title
    
                if (currentTitle === 'LoginOTP') {
                    return currentTitle;
                }
            }, { timeout: 10000 })
    
            resolve(true)
        } catch (err) {
            resolve(false)
        }
    })
}



function requestOTPcode(wrong) {
    return new Promise((resolve, reject) => {
        if (wrong === "wrong") {
            console.log('Wrong OTP Code. Sending Another Request')
            var body = {message: "Need OTP Code", wrong: true}
        } else {
            console.log('Sending Request for OTP Code')
            var body = {message: "Need OTP Code", wrong: false}
        }

        axios.post('http://localhost:3000', body)
            .then(response => {
                resolve(response.data)
            })
            .catch(err => {
                console.log(err.cause)
                reject()
            })
    })
}



async function wrongOTPHandler(page) {
    let continueLoop = true

    while (continueLoop) {
        const code = await requestOTPcode("wrong")
        console.log(`Recived Code: ${code}`)

        await page.type('.otp-input', code.toString())
        await page.click('.hl-btn')

        await delay(1000)

        try {
            await page.waitForFunction(() => {
                let currentTitle = document.title
    
                if (currentTitle === 'REI Reply') {
                    return currentTitle;
                }
            }, { timeout: 5000 })
    
            loggedInConfirmation(page)

            continueLoop = false
        } catch {

        }
    }
}



async function loggedInConfirmation() {
    console.log('Logged In')

    axios.post('http://localhost:3000', {message: "Logged In"})
    .then(() => {
        console.log(`STELL Processed "Logged In" Confrimation`)
    })
    .catch(err => {
        console.log(err.cause)
    })
}



function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}



function mainPageLogin(page) {
    return new Promise(async (resolve, reject) => {
        await page.setViewport({ 
            width: 1920, 
            height: 900, 
            deviceScaleFactor: 1.6667 
        });

        await page.bringToFront()

        await page.goto('https://app.reireply.com', { waitUntil: 'networkidle2', timeout: 120000 })

        let title = await page.title()
        
        if (title === 'Login') {
            console.log('Logging into REIreply...')
    
            await page.waitForSelector('#email')
            await page.click('#email')
            await page.type('#email', 'aaragondispo@gmail.com')
            await page.click('#password')
            await page.type('#password', '#ReiReply2020')
            await page.click('.hl-btn')
    
            if (await requireOTP(page)) {
                console.log('Reached OTP page')
    
                await page.click('#otp-for-email')
                await page.click('.hl-btn')
    
    
    
                requestOTPcode()
                    .then(async code => {
                        console.log(`Recived Code: ${code}`)
    
                        await page.type('.otp-input', code.toString())
    
                        await page.click('.hl-btn')
    
                        await delay(500)
    
                        const hasErrorElement = await page.$$eval('.error', (elements) => {
                            return elements.some(el => el.textContent.trim() === "The security code is not correct or has been used. Try with a new code.")
                        })
                    
                        if (hasErrorElement) {
                            wrongOTPHandler(page);
                        } else {
                            resolve()
                        }
                    })
                    .catch((err) => {
                        reject(err)
                    })
            } else {
                reject('Did not reach LoginOTP page after 10 seconds. What the heck.')
            }
        } else {
            await delay(5000)

            const titles = await page.$$('title')
            const titleTexts = await Promise.all(titles.map(async title => {
                return await page.evaluate(element => element.textContent, title)
            }))

            if (titleTexts.includes('REI Reply')) {
                resolve()
            } else {
                reject('Weird Login Event')
            }
        }
    })
}



function watcherPageLogin(page) {
    return new Promise(async (resolve, reject) => {
        try {
            await page.setViewport({ 
                width: 1920, 
                height: 900, 
                deviceScaleFactor: 1.6667 
            })

            await page.bringToFront()
        
            await page.goto('https://app.reireply.com', { waitUntil: 'networkidle2', timeout: 120000 })

            resolve()
        } catch (err) {
            reject(err)
        }
    })
}



function dismissStupidCrap(page) {
    return new Promise(async (resolve) => {
        await page.bringToFront()

        await delay(5000)

        const dismissWelcome = await page.$('button[data-uf-button="close"]')

        if (dismissWelcome) {
            await dismissWelcome.click()
        }
    
        await delay(5000)

        const dismissUrgrentNotice = await page.$('div#true.modal-close-icon')
    
        if (dismissUrgrentNotice) {
            await dismissUrgrentNotice.click()
        }

        await delay(5000)
    
        const dismissBilling = await page.$('div[title="Dismiss"]')
    
        if (dismissBilling) {
            await dismissBilling.click()
        }

        resolve()
    })
}



async function waitForReady() {
    return new Promise(async (resolve) => {
        while (taskStatus !== 'ready') {
            await new Promise(r => setTimeout(r, 1000))
        }
        resolve()
    })
}



function textCounter() {
    return new Promise(async (resolve) => {

        let textCount = fs.readFileSync('./textCount.txt', 'utf8')

        textCount++
        // console.log(textCount)
    
        if (textCount >= 500) {
            axios.post('http://localhost:3000', {message: "Change Number"})
            .then(() => {
                console.log(`STELL Recieved Change Number Message`)
            })
            .catch(err => {
                console.log(err.cause)
            })

            // await mainPage.click('#sb_settings')
            // await mainPage.waitForSelector('#sb_phone-number')
            // await mainPage.click('#sb_phone-number')
            // await mainPage.waitForSelector('#btn-add-number')
            // await delay(1500)
            // await mainPage.click('#btn-add-number')
            // await mainPage.waitForFunction(
            //     text => !!Array.from(document.querySelectorAll('div.hl-text-sm-medium')).find(el => el.textContent.trim() === text),
            //     {},
            //     'Add Phone Number'
            // )
            // await mainPage.evaluate(() => {
            //     const elements = document.querySelectorAll('div.hl-text-sm-medium')
            //     for (let element of elements) {
            //         if (element.innerText === 'Add Phone Number') {
            //         element.click()
            //         break
            //         }
            //     }
            // })
            // const annoyingThing = await mainPage.$('#pendo-close-guide-5abccf69')
            // if (annoyingThing) {
            //     await annoyingThing.click()
            // }
            // await mainPage.waitForSelector('#PendoButton.FILTER')
            // await mainPage.click('#PendoButton.FILTER')
            // await mainPage.waitForSelector('#btn-select-all')
            // await mainPage.click('#btn-select-all')
            // await mainPage.waitForSelector('#local')
            // await mainPage.click('#local')
            // await mainPage.waitForSelector('#mobile')
            // await mainPage.click('#mobile')
            // await mainPage.evaluate(() => {
            //     const elements = document.querySelectorAll('div.hl-text-sm-medium')
            //     for (let element of elements) {
            //         if (element.innerText === 'Apply') {
            //         element.click()
            //         break
            //         }
            //     }
            // })
            // await delay(3000)
            // await mainPage.click('input.n-radio-input')
            // //Click Buy Button
            // await mainPage.waitForSelector('[data-v-d8289eaa].h-5.w-5.cursor-pointer.text-gray-500.hover\\:text-gray-900')
            // await mainPage.click('[data-v-d8289eaa].h-5.w-5.cursor-pointer.text-gray-500.hover\\:text-gray-900')
    
            textCount = 0
        }
    
        fs.writeFileSync('./textCount.txt', textCount.toString(), 'utf8')

        resolve()
    })
}