const URLstring = window.location.origin

window.onload = () => {
    const {
        OverlayScrollbars,
        ScrollbarsHidingPlugin,
        SizeObserverPlugin,
        ClickScrollPlugin
    } = OverlayScrollbarsGlobal;

    OverlayScrollbars(document.getElementById('unsent-list-container'), {
        scrollbars: {
            autoHide: 'leave',
            autoHideDelay: 500
        }
    })

    axios.get(`${URLstring}/api/getUnsentRecords`)
    .then(response => response.data)
    .then(response => {
        const containerElement = document.querySelector('[data-overlayscrollbars-viewport="scrollbarHidden"]')
        containerElement.innerHTML = response.unsentRecords.map(record => `
            <div id ="${record.phoneNumber}" class="record-container">
                <div class="name">
                    ${record.name}
                </div>

                <div class="phone-number">
                    ${`(${record.phoneNumber.slice(0, 3)}) - ${record.phoneNumber.slice(3, 6)} - ${record.phoneNumber.slice(6)}`}
                </div>

                <div class="address">
                    ${record.address}
                </div>
            </div>
        `).join('')
    })
    .catch(error => {
        console.log(error)
    })

    axios.get(`${URLstring}/api/unsentRecordsSendingStatus`)
    .then(response => response.data)
    .then(response => {
        if (response.currentlySending === false) {
            axios.get(`${URLstring}/api/unsentRecordsAmount`)
            .then(response => response.data)
            .then(response => {
                availableRecordsCountElement = document.getElementById('available-records-count')
                availableRecordsCountElement.innerText = `Available Records: ${response.unsentRecordsAmount}`
            })
            .catch(error => {
                console.log(error)
            })
        } else {
            availableRecordsCountElement = document.getElementById('available-records-count')
            availableRecordsCountElement.innerText = `Sending Texts...`
        }
    })
    .catch(error => {
        console.log(error)
    })
}



function sendButtonClick() {
    const amountInputElement = document.getElementById('amount-input')

    availableRecordsCountElement = document.getElementById('available-records-count')
    availableRecordsCountElement.innerText = `Sending Texts...`

    axios.post(`${URLstring}/api/sendUnsentRecords`, {
        amount: parseInt(amountInputElement.value.trim())
    })
    .then(() => {
        console.log('')
    })
    .catch(error => {
        console.log(error)
    })
}

function amountKeyDown(event) {
    if (event.key === 'Enter') {
        event.preventDefault()
        sendButtonClick()
    }
}



const socket = io()

socket.on('unsentRecordSent', (number) => {
    document.getElementById(number).remove()
})

socket.on('finishedSendingUnsentRecords', () => {
    axios.get(`${URLstring}/api/unsentRecordsAmount`)
    .then(response => response.data)
    .then(response => {
        availableRecordsCountElement = document.getElementById('available-records-count')
        availableRecordsCountElement.innerText = `Available Records: ${response.unsentRecordsAmount}`
    })
    .catch(error => {
        console.log(error)
    })
})