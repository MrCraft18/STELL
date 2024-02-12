const readline = require('readline')
const axios = require('axios')
const express = require('express')

const app = express()
app.use(express.json())


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})


const masterName = 'Caden Edwards'
const masterNumber = '8176737349'
const masterAddress = '1304 Shalimar Dr'
const content = `Hello There, I am Jacob in Fort Worth. Is this still ${masterName.split(' ')[0]}?`



const port = 6103
app.listen(port, async () => {
    console.log('App listening on port: ' + port)

    await axios.post('http://localhost:6102/master-conversation', {
        masterName,
        masterNumber,
        masterAddress,
        content
    })
})



app.post('/send', (req, res) => {
    try {
        const message = req.body.message
        const number = req.body.number
    
        if (number === masterNumber) {
            rl.question('<STELL> ' + message + '\n<USER> ', input => {
                axios.post('http://localhost:6102/msg', {message: input, number})
            })
        }

        res.send({ok: true})
        // console.log('Sent OK Response to STELL')
    } catch (error) {
        console.error(error)
        res.send({ok: false})
        console.log('Sent NOT OK Response to STELL')
    }
})