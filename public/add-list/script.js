//Drag and Drop functions
function preventDefaults(event) {
    event.preventDefault()
    event.stopPropagation()
}

function dragEnter(element, event) {
    preventDefaults(event)

    element.classList.remove('file-not-dragging')
    element.classList.add('file-dragging')

    element.innerText = 'Drop File'
}

function dragLeave(element, event) {
    preventDefaults(event)

    element.classList.remove('file-dragging')
    element.classList.add('file-not-dragging')

    element.innerHTML = `
        Drag File to Import or click Upload
        <div id="upload-button">
            Upload
        </div>
    `
}

function fileDrop(event) {
    preventDefaults(event)

    event.target.remove()

    document.getElementById('setup-container').style.display = 'block'
    document.getElementById('dynamic-container').style.display = 'block'

    handleFile(event.dataTransfer.files[0])
}

function uploadClick() {
    document.getElementById('file-input').click()
}

function fileInputChange(element) {
    document.getElementById('file-upload').remove()

    document.getElementById('setup-container').style.display = 'flex'
    document.getElementById('dynamic-container').style.display = 'block'

    handleFile(element.files[0])
}

let importedFile
let exampleRecord

let selectedHeaders = {
    firstName: null,
    lastName: null,
    streetAddress: null,
    city: null,
    state: null,
    zip: null,
    phoneNumber: null
}

function handleFile(file) {
    importedFile = file

    Papa.parse(file, {
        preview: 10,
        complete: (results) => {
            console.log(results)

            const headersArray = results.data.shift()
            const recordsArray = results.data

            fields = headersArray

            const csvGridElement = document.getElementById('csv-grid')
            csvGridElement.style.gridTemplateColumns = `repeat(${headersArray.length}, 250px)`

            const headersString = headersArray.map(header => `
                <div class='grid-item header'>${header}</div>
            `).join('')

            const gridItemsString = recordsArray.map(row => {
                return Object.values(row).map(value => `
                    <div class='grid-item'>${value}</div>
                `).join('')
            }).join('')

            csvGridElement.innerHTML = headersString + gridItemsString

            const dropDownContainerElements = document.querySelectorAll('.dropdown-container')
            dropDownContainerElements.forEach(dropDownContainerElement => {
                dropDownContainerElement.innerHTML = fields.map(field => `
                    <div class="dropdown-item" onclick="dropDownItemClick(this)">${field}</div>
                `).join('')
            })
        }
    })

    Papa.parse(file, {
        preview: 1,
        header: true,
        complete: (results) => {
            exampleRecord = results.data[0]
        }
    })
}



function inputChange(element) {
    const inputContainerElement = element.parentNode

    const dropDownItemElements = inputContainerElement.querySelectorAll('.dropdown-item')
    dropDownItemElements.forEach(dropDownItemElement => {
        if (!dropDownItemElement.innerText.toLowerCase().startsWith(element.value.toLowerCase())) {
            dropDownItemElement.style.display = 'none'
        } else {
            dropDownItemElement.style.display = ''
        }
    })
}

function inputFocus(element) {
    element.value = ''

    switch (element.id) {
        case 'record-first-name':
            selectedHeaders.firstName = null
            break

        case 'record-last-name':
            selectedHeaders.lastName = null
            break

        case 'record-street-address':
            selectedHeaders.streetAddress = null
            break

        case 'record-city':
            selectedHeaders.city = null
            break

        case 'record-state':
            selectedHeaders.state = null
            break

        case 'record-zip':
            selectedHeaders.zip = null
            break

        case 'record-phone-number':
            selectedHeaders.phoneNumber = null
            break
    }

    const inputContainerElement = element.parentNode

    const dropDownItemElements = inputContainerElement.querySelectorAll('.dropdown-item')
    dropDownItemElements.forEach(dropDownItemElement => {
        dropDownItemElement.style.display = ''
    })
    
    const dropDownContainerElement = inputContainerElement.querySelector('.dropdown-container')
    dropDownContainerElement.style.display = 'block'
}

function inputBlur(element) {
    const inputContainerElement = element.parentNode
    
    const dropDownContainerElement = inputContainerElement.querySelector('.dropdown-container')
    setTimeout(() => {
        dropDownContainerElement.style.display = 'none'
    }, 100);
}



function dropDownItemClick(element) {
    const headerName = element.innerText

    const inputElement = element.parentNode.parentNode.querySelector('.input')

    switch (inputElement.id) {
        case 'record-first-name':
            inputElement.value = exampleRecord[headerName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            selectedHeaders.firstName = headerName
            break

        case 'record-last-name':
            inputElement.value = exampleRecord[headerName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            selectedHeaders.lastName = headerName
            break

        case 'record-street-address':
            inputElement.value = exampleRecord[headerName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            selectedHeaders.streetAddress = headerName
            break

        case 'record-city':
            inputElement.value = exampleRecord[headerName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            selectedHeaders.city = headerName
            break

        case 'record-state':
            inputElement.value = exampleRecord[headerName].toUpperCase()
            selectedHeaders.state = headerName
            break

        case 'record-zip':
            inputElement.value = exampleRecord[headerName]
            selectedHeaders.zip = headerName
            break

        case 'record-phone-number':
            const numberDigits = exampleRecord[headerName].replace(/\D/g, '')
            inputElement.value = numberDigits.length > 10 ? numberDigits.slice(1) : numberDigits
            selectedHeaders.phoneNumber = headerName
            break
    }
}



let extraInfoContainerElementHTMLCache
function addInfoClick() {
    const extraInfoContainerElement = document.getElementById('extra-info-container')

    extraInfoContainerElementHTMLCache = extraInfoContainerElement.innerHTML

    extraInfoContainerElement.style.overflowY = 'hidden'

    extraInfoContainerElement.innerHTML = `
        <div class="extra-info-input-container">
            <input type="text" class="extra-info-input" autocomplete="do-not-autofill" placeholder="Search Headers" oninput="extraInfoInputChange(this)" onblur="extraInfoInputBlur(event)">
            <div class="extra-info-dropdown-container">
                ${Array.from(document.querySelector('.dropdown-container').children).map(dropDownItemElement => `
                    <div class="extra-info-dropdown-item" tabindex="0">${dropDownItemElement.innerText}</div>
                `).join('')}
            </div>
        </div>
    `
    extraInfoContainerElement.querySelector('input').focus()
}

function extraInfoInputChange(element) {
    const extraInfoInputContainerElement = document.getElementById('extra-info-container')

    const extraInfoDropDownItemElements = extraInfoInputContainerElement.querySelectorAll('.extra-info-dropdown-item')
    extraInfoDropDownItemElements.forEach(extraInfoDropDownItemElement => {
        if (!extraInfoDropDownItemElement.innerText.toLowerCase().startsWith(element.value.toLowerCase())) {
            extraInfoDropDownItemElement.style.display = 'none'
        } else {
            extraInfoDropDownItemElement.style.display = ''
        }
    })
}

function extraInfoInputBlur(event) {
    console.log(event.relatedTarget)

    let extraInfoContainerElement = document.getElementById('extra-info-container')

    if (event.relatedTarget && event.relatedTarget.classList.contains('extra-info-dropdown-item')) {
        const clickedElement = event.relatedTarget

        extraInfoContainerElement.style.overflowY = 'auto'
        
        extraInfoContainerElement.innerHTML = extraInfoContainerElementHTMLCache

        console.log('ayo2')
        const addedInfoContainerElement = document.createElement('div')
    
        extraInfoContainerElement = document.getElementById('extra-info-container')
        extraInfoContainerElement.insertBefore(addedInfoContainerElement, extraInfoContainerElement.firstChild)
        
        addedInfoContainerElement.outerHTML =  `
            <div class="added-info-container">
                <div class="added-info-header">${clickedElement.innerText}</div>
                <div class="remove-added-info-button" onclick="removedAddedInfoClick(this)"></div>
            </div>
        `
    } else {
        extraInfoContainerElement.innerHTML = extraInfoContainerElementHTMLCache
    }
}

function removedAddedInfoClick(element) {
    element.parentNode.remove()
}