const axios = require('axios')

const masterName = 'David Zulejkic'
const masterNumber = '8176737349'
const masterAddress = '1 Lasater Rd'
const content = `Hello There, I am Jacob in Fort Worth. Is this still ${masterName.split(' ')[0]}?`

axios.post('http://localhost:6102/debugConversation', {
    masterName,
    masterNumber,
    masterAddress,
    content
})