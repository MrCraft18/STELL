const WebSocket = require('ws')

ws = new WebSocket('wss://salesgodcrm.net:3000/socket.io/?EIO=4&transport=websocket', {
                headers: {
                    'Origin': 'https://salesgodcrm.net'
                }
            })

            ws.on('open', ()  => {
                console.log('connected ws')

                ws.send(40)
            })

            ws.on('message', (data) => {
                const message = data.toString()

                console.log(message)

                if (message == 2) {
                    ws.send(3)
                }

                if (message.startsWith(40)) {
                    ws.send('42["userConnected",[1,"user"]]')
                }

                if (message.startsWith(42)) {
                    string = message.substring(2)

                    console.log(JSON.parse(string))
                }
            })