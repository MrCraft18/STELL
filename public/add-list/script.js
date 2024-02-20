const URLstring = window.location.origin

function preventDefaults(event) {
    event.preventDefault()
    event.stopPropagation()
}

function PapaParse(file, options) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            ...options,
            complete: results => resolve(results),
            error: error => reject(error)
        })
    })
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

    document.getElementById('setup-container').style.display = 'flex'
    document.getElementById('dynamic-container').style.display = 'flex'

    handleFile(event.dataTransfer.files[0])
}

function uploadFileClick() {
    document.getElementById('file-input').click()
}

function fileInputChange(element) {
    document.getElementById('file-upload').remove()

    document.getElementById('setup-container').style.display = 'flex'
    document.getElementById('dynamic-container').style.display = 'flex'

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

let csvGridElementCache

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
            csvGridElementCache = document.getElementById('csv-grid').outerHTML

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
    let extraInfoContainerElement = document.getElementById('extra-info-container')

    if (event.relatedTarget && event.relatedTarget.classList.contains('extra-info-dropdown-item')) {
        const clickedElement = event.relatedTarget

        extraInfoContainerElement.style.overflowY = 'auto'
        
        extraInfoContainerElement.innerHTML = extraInfoContainerElementHTMLCache

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



function checkRecordsClick() {
    const dynamicContentElement = document.getElementById('dynamic-container')

    const extraInfoHeaders = Array.from(document.querySelectorAll('.added-info-header')).map(addedInfoHeaderElement => addedInfoHeaderElement.innerText)

    PapaParse(importedFile, {
        preview: 100,
        header: true
    }).then(results => {
        const displayRecords = results.data
        .filter(rawParse => {
            return Object.values(selectedHeaders).every(header => rawParse[header] !== "")
        })
        .slice(0, 4)
        .map(rawParse => {
            const phoneNumber = rawParse[selectedHeaders.phoneNumber].replace(/\D/g, '').length > 10 ? rawParse[selectedHeaders.phoneNumber].replace(/\D/g, '').slice(1) : rawParse[selectedHeaders.phoneNumber].replace(/\D/g, '')
            const firstName = rawParse[selectedHeaders.firstName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            const lastName = rawParse[selectedHeaders.lastName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            const streetAddress = rawParse[selectedHeaders.streetAddress].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            const city = rawParse[selectedHeaders.city].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            const state = rawParse[selectedHeaders.state].toUpperCase()
            const zip = rawParse[selectedHeaders.zip]

            return {
                phoneNumber,
                name: `${firstName} ${lastName}`,
                address: `${streetAddress}, ${city}, ${state} ${zip}`,
                info: extraInfoHeaders.map(header => ({[header]: rawParse[header]}))
            }
        })

        console.log(displayRecords)

        dynamicContentElement.innerHTML = `
            <div id="record-display-grid">
                ${displayRecords.map(record => `
                    <div class="record-grid-item">
                        <div class="record-fields-box">
                            <div class="record-field-container">
                                <div class="record-field-key">Name</div>
                                <div class="record-field-value">${record.name}</div>
                            </div>

                            <div class="record-field-container">
                                <div class="record-field-key">Address</div>
                                <div class="record-field-value">${record.address}</div>
                            </div>

                            <div class="record-field-container">
                                <div class="record-field-key">Phone Number</div>
                                <div class="record-field-value">${record.phoneNumber}</div>
                            </div>

                            ${record.info.map(info => `
                                <div class="record-field-container">
                                    <div class="record-field-key">${Object.keys(info)[0]}</div>
                                    <div class="record-field-value">${Object.values(info)[0]}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div id="record-display-footer">
                <div class="display-footer-box">
                    <div id="footer-text">Does everything look good?</div>
                    <div id="back-button" onclick="backClick()">Go Back</div>
                </div>

                <div class="display-footer-box">
                    <input type="text" id="list-name-input" placeholder="List Name">
                    <div id="upload-list-button" onclick="uploadClick()">Upload</div>
                </div>
            </div>
        `
    })
}

function backClick() {
    const dynamicContentElement = document.getElementById('dynamic-container')
    dynamicContentElement.innerHTML = csvGridElementCache
}

function uploadClick() {
    const listName = document.getElementById('list-name-input').value

    if (listName !== '') {
        const extraInfoHeaders = Array.from(document.querySelectorAll('.added-info-header')).map(addedInfoHeaderElement => addedInfoHeaderElement.innerText)

        PapaParse(importedFile, {
            header: true
        }).then(results => {
            console.log(results.data.length)
            const records = results.data
            .filter(rawParse => {
                return Object.values(selectedHeaders).every(header => rawParse[header] !== "")
            })
            .map(rawParse => {
                const phoneNumber = rawParse[selectedHeaders.phoneNumber].replace(/\D/g, '').length > 10 ? rawParse[selectedHeaders.phoneNumber].replace(/\D/g, '').slice(1) : rawParse[selectedHeaders.phoneNumber].replace(/\D/g, '')
                const firstName = rawParse[selectedHeaders.firstName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
                const lastName = rawParse[selectedHeaders.lastName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
                const streetAddress = rawParse[selectedHeaders.streetAddress].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
                const city = rawParse[selectedHeaders.city].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
                const state = rawParse[selectedHeaders.state].toUpperCase()
                const zip = rawParse[selectedHeaders.zip]
    
                return {
                    phoneNumber,
                    name: `${firstName} ${lastName}`,
                    address: `${streetAddress}, ${city}, ${state} ${zip}`,
                    info: extraInfoHeaders.map(header => ({[header]: rawParse[header]}))
                }
            })

            console.log(records.length)
            
            axios.post(`${URLstring}/api/addList`, {
                listName,
                records
            })
            .then(() => {
                const contentElement = document.getElementById('content')

                contentElement.innerHTML = `
                    <div id="success">
                        Uploaded:<br>"${listName}"<br>Successfully
                    </div>
                `
            })
            .catch((error) => {
                console.log(error)

                const uploadButtonElement = document.getElementById('upload-list-button')

                const errorTextElement = document.createElement('divv')

                uploadButtonElement.parentNode.replaceChild(errorTextElement, uploadButtonElement)

                errorTextElement.outerHTML = `
                    <div id="error-text">
                        Error :(
                    </div>
                `
            })
        })
    }
}