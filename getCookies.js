const puppeteer  = require('puppeteer')
const fs = require('fs')



;(async () => {
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
        console.log("Logged In")

        const cookies = await page.cookies()

        console.log(cookies)

        fs.writeFileSync('./cookies.txt', JSON.stringify({
            expiryDate: Math.round((cookies[0].expires * 1000) - 60 * 1000),
            cookies: {
                'X-XSRF-TOKEN': decodeURIComponent(cookies.find(cookie => cookie.name === 'XSRF-TOKEN').value),
                'Cookie': `XSRF-TOKEN=${cookies.find(cookie => cookie.name === 'XSRF-TOKEN').value}; salesgod_crm_session=${cookies.find(cookie => cookie.name === 'salesgod_crm_session').value}; ${cookies.find(cookie => cookie.name !== 'salesgod_crm_session' && cookie.name !== 'XSRF-TOKEN').name}=${cookies.find(cookie => cookie.name !== 'salesgod_crm_session' && cookie.name !== 'XSRF-TOKEN').value}`
            }
        }, null, 4))

        browser.close()
    } else {
        console.log("Not Logged In")
    }
})()