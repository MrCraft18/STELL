const URLstring = window.location.origin

var OverlayScrollbars, ScrollbarsHidingPlugin, SizeObserverPlugin, ClickScrollPlugin;

window.onload = () => {
    ({
        OverlayScrollbars,
        ScrollbarsHidingPlugin,
        SizeObserverPlugin,
        ClickScrollPlugin
    } = OverlayScrollbarsGlobal);

    OverlayScrollbars(document.getElementById('conversation-list-container'), {
        scrollbars: {
            autoHide: 'leave',
            autoHideDelay: 500
        }
    })

    //Start page with unread conversations.
    axios.get(`${URLstring}/api/getConversationsForSidebar?${new URLSearchParams({
        category: 'unread',
        limit: 50
    }).toString()}`)
    .then(response => response.data)
    .then(response => {
        addConversationsToSidebar(response.conversations)
    })
    .catch(error => {
        console.log(error)
    })


    // OverlayScrollbars(document.getElementById('chat-window'), {
    //     scrollbars: {
    //         autoHide: 'leave',
    //         autoHideDelay: 500
    //     }
    // })
}



function categoryButtonClick(element) {
    if (!element.classList.contains('selected-category')) {
        console.log(`Requesting conversations for "${element.innerText.toLowerCase()}" category.`)

        axios.get(`${URLstring}/api/getConversationsForSidebar?${new URLSearchParams({
            category: element.innerText.toLowerCase(),
            limit: 50
        }).toString()}`)
        .then(response => response.data)
        .then(response => {
            addConversationsToSidebar(response.conversations)

            const containerElementChildren = [...document.getElementById('conversations-category-container').children]

            containerElementChildren.forEach(childElement => {
                childElement.classList.remove('selected-category')
            })
    
            element.classList.add('selected-category')
        })
        .catch(error => {
            console.log(error)
        })
    } else {
        console.log('Category Already Selected')
    }
}

function addConversationsToSidebar(conversations) {
    console.log(`Recieved ${conversations.length} conversations`)

    const containerElement = document.getElementById('conversation-list-container').querySelector('[data-overlayscrollbars-viewport="scrollbarHidden"]')

    containerElement.innerHTML = ''

    conversations.forEach(conversation => {
        const lastMessageTime = new Date(conversation.lastMessageTime)
        const hoursDifference = (new Date() - lastMessageTime) / (1000 * 60 * 60)

        const date = hoursDifference > 24
        ? lastMessageTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : lastMessageTime.toLocaleTimeString()

        const conversationElement = document.createElement('div')
        containerElement.appendChild(conversationElement)
        conversationElement.outerHTML = `
        <div id="${conversation.phoneNumber}" class="conversation-container" onclick="conversationItemClick(this)">
            <div class="conversation-info-container">
                <div class="conversation-name">${conversation.name}</div>
                <div class="conversation-date">${date}</div>
                <div class="conversation-last-message">${conversation.lastMessage}</div>
                ${conversation.unread === true ?`
                    <div class="unread-container">
                        <div class="mark-read-button" onclick="markReadButtonClick(this, event)"></div>
                        <div class="unread-indicator"></div>
                    </div>
                ` : ''}
            </div>
        </div>
        `
    })
}



function conversationItemClick(element) {
    const phoneNumber = element.id

    axios.get(`${URLstring}/api/getRecord?${new URLSearchParams({
        phoneNumber: element.id,
    }).toString()}`)
    .then(response => response.data)
    .then(response => {
        const recordContainerElement = document.getElementById('record-conversation-container')
        recordContainerElement.innerHTML = ''

        //Create the chat element
        const chatElement = document.createElement('div')
        chatElement.id = 'chat'

        const chatHeaderElement = document.createElement('div')
        chatHeaderElement.id = 'chat-header'
        chatHeaderElement.innerHTML = `
            <div id="conversation-stage">
                ${headerConversationStage(response.record.stage)}
            </div>

            <div id="header-info-container">
                <div id="header-name">
                    ${response.record.name}
                </div>

                <div id="header-phone-number">
                    ${`(${phoneNumber.slice(0, 3)}) - ${phoneNumber.slice(3, 6)} - ${phoneNumber.slice(6)}`}
                </div>
            </div>

            <div id="header-buttons-container">
                <div id="archive-button" onclick="archiveButtonClick()"></div>
            </div>
        `

        function headerConversationStage(stage) {
            if (typeof stage === 'string') {
                return stage.charAt(0).toUpperCase() + stage.slice(1)
            } else {
                if (stage === -1) {
                    return 'Dropped'
                } else {
                    return `Stage: ${stage}`
                }
            }
        }

        const chatWindowElement = document.createElement('div')
        chatWindowElement.id = 'chat-window'
        chatWindowElement.innerHTML = response.record.textConversation.map(message => `
            <div class="${message.sender === phoneNumber ? "left" : "right"} message-container">
                <div class="${message.sender === phoneNumber ? "recieved" : "sent"} message">
                    ${message.content}
                </div>

                <div class="message-timestamp">
                    ${new Date(message.timestamp).toLocaleString()}
                </div>
            </div>
        `).join('')

        sendMessageContainerElement = document.createElement('div')
        sendMessageContainerElement.id = 'send-message-container'
        sendMessageContainerElement.innerHTML = `
            <div id="send-message-left-box"></div>
            <textarea name="message-content" id="message-input" placeholder="Type Message Here" onkeydown="messageKeyDown(event)"></textarea>
            <div id="send-message-right-box">
                <div id="send-button" onclick="sendButtonClick(this)"></div>
            </div>
        `

        chatElement.appendChild(chatHeaderElement)
        chatElement.appendChild(chatWindowElement)
        chatElement.appendChild(sendMessageContainerElement)

        const infobarElement = document.createElement('div')
        infobarElement.id = 'infobar'
        infobarElement.innerHTML = `
            <div id="information-title">
                Information
            </div>

            <div class="main-info">
                ${response.record.name}
            </div>

            <div class="main-info">
                ${response.record.address}
            </div>

            <div class="main-info">
                ${`(${phoneNumber.slice(0, 3)}) - ${phoneNumber.slice(3, 6)} - ${phoneNumber.slice(6)}`}
            </div>

            <div id="property-info-title">
                Property Info
            </div>

            ${response.record.info.map(info => {
                const [[key, value]] = Object.entries(info)

                return `
                    <div class="property-info-container">
                        <div class="property-info-key">
                            ${key}
                        </div>
                
                        <div class="property-info-value">
                            ${value}
                        </div>
                    </div>
                `
            }).join('')}
        `

        recordContainerElement.appendChild(chatElement)
        recordContainerElement.appendChild(infobarElement)
        
        chatWindowElement.scrollTop = chatWindowElement.scrollHeight

        const containerElementChildren = [...document.getElementById('conversation-list-container').querySelector('[data-overlayscrollbars-viewport="scrollbarHidden"]').children]

        containerElementChildren.forEach(conversationElement => {
            conversationElement.classList.remove('selected-conversation')
        })
    
        element.classList.add('selected-conversation')
    })
    .catch(error => {
        console.log(error)
    })
}



function sendButtonClick() {
    const textAreaElement = document.getElementById('message-input')

    textAreaElement.value = ''

    if (textAreaElement.value.trim() !== '') {
        axios.post(`${URLstring}/api/sendMessage`, {
            message: textAreaElement.value.trim(),
            number: document.querySelector('.selected-conversation').id
        })
        .then(() => {
            const chatWindowElement = document.getElementById('chat-window')

            const sentMessageElement = document.createElement('div')
            chatWindowElement.appendChild(sentMessageElement)
            sentMessageElement.outerHTML = `
                <div class="right message-container">
                    <div class="sent message">
                        ${textAreaElement.value.trim()}
                    </div>

                    <div class="message-timestamp">
                        ${new Date().toLocaleString()}
                    </div>
                </div>
            `
        })
        .catch(error => {
            console.log('Error Sending Message', error)
        })
    } else {
        console.log('There is not a message')
    }
}

function messageKeyDown(event) {
    if (event.key === 'Enter') {
        event.preventDefault()
        sendButtonClick()
    }
}



function markReadButtonClick(element, event) {
    event.stopPropagation()

    const number = element.closest('.conversation-container').id

    axios.post(`${URLstring}/api/markRead`, {
        number
    })
    .then(() => {
        const conversationInfoContainerElement = element.closest('.conversation-info-container')
        const unreadContainerElement = element.closest('.unread-container')
        conversationInfoContainerElement.removeChild(unreadContainerElement)
    })
    .catch(error => {
        console.log(error)
    })
}



let searchTimer = null
function searchKeyDown(event) {
    if (searchTimer) {
        clearTimeout(searchTimer)
    }

    searchTimer = setTimeout(() => {
        axios.get(`${URLstring}/api/searchConversationsForSidebar?${new URLSearchParams({
            searchQuery: event.target.value,
            category: document.querySelector('.selected-category').innerText.toLowerCase(),
            limit: 50
        }).toString()}`)
        .then(response => response.data)
        .then(response => {
            addConversationsToSidebar(response.conversations)
        })
    }, 300)
}



function archiveButtonClick() {
    const selectedConversationElement = document.querySelector('.selected-conversation')
    const number = selectedConversationElement.id

    axios.post(`${URLstring}/api/archiveConversation`, {
        number
    })
    .then(response => response.data)
    .then(() => {
        const conversationStageElement = document.getElementById('conversation-stage')
        conversationStageElement.innerText = 'Archived'

        const selectedCategoryElement = document.querySelector('.selected-category')
        if (selectedCategoryElement.innerText.toLowerCase() !== 'all') {
            selectedConversationElement.remove()
        }
    })
    .catch(error => {
        console.log(error)
    })
}



const socket = io()

socket.on('newMessage', (body) => {
    const conversationContainerElement = document.getElementById(body.conversation)

    if (conversationContainerElement) {
        conversationContainerElement.querySelector('.conversation-last-message').innerText = body.message
        conversationContainerElement.querySelector('.conversation-date').innerText = new Date(body.time).toLocaleTimeString()

        const conversationListElement = conversationContainerElement.parentNode
        conversationListElement.insertBefore(conversationContainerElement, conversationListElement.firstChild)

        if (conversationContainerElement.classList.contains('selected-conversation')) {
            const chatWindowElement = document.getElementById('chat-window')

            const recievedMessageElement = document.createElement('div')
            chatWindowElement.appendChild(recievedMessageElement)
            recievedMessageElement.outerHTML = `
                <div class="${body.sender === body.conversation ? "left" : "right"} message-container">
                    <div class="${body.sender === body.conversation ? "recieved" : "sent"} message">
                        ${body.message}
                    </div>

                    <div class="message-timestamp">
                        ${new Date(body.time).toLocaleString()}
                    </div>
                </div>
            `

            chatWindowElement.scrollTop = chatWindowElement.scrollHeight
        }
    }
})

socket.on('updateUnread', (body) => {
    const conversationContainerElement = document.getElementById(body.conversation)

    if (conversationContainerElement) {
        const unreadContainerElement = document.createElement('div')
        conversationContainerElement.querySelector('.conversation-info-container').appendChild(unreadContainerElement)
        unreadContainerElement.outerHTML = `
            <div class="unread-container">
                <div class="mark-read-button" onclick="markReadButtonClick(this, event)"></div>
                <div class="unread-indicator"></div>
            </div>
        `
    }
})