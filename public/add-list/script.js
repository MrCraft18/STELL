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
            console.log(exampleRecord)
        }
    })
}



function inputChange(element) {
    console.log(element.value)

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



let selectedHeaders = {
    firstName: null,
    lastName: null,
    streetAddress: null,
    city: null,
    state: null,
    zip: null,
    phoneNumber: null
}

function dropDownItemClick(element) {
    const headerName = element.innerText

    const inputElement = element.parentNode.parentNode.querySelector('.input')

    switch (inputElement.id) {
        case 'first-name':
            inputElement.value = exampleRecord[headerName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            selectedHeaders.firstName = headerName
            break

        case 'last-name':
            inputElement.value = exampleRecord[headerName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            selectedHeaders.lastName = headerName
            break

        case 'street-address':
            inputElement.value = exampleRecord[headerName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            selectedHeaders.streetAddress = headerName
            break

        case 'city':
            inputElement.value = exampleRecord[headerName].split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            selectedHeaders.city = headerName
            break

        case 'state':
            inputElement.value = exampleRecord[headerName].toUpperCase()
            selectedHeaders.state = headerName
            break

        case 'zip':
            inputElement.value = exampleRecord[headerName]
            selectedHeaders.zip = headerName
            break

        case 'phone-number':
            const numberDigits = exampleRecord[headerName].replace(/\D/g, '')
            inputElement.value = numberDigits.length > 10 ? numberDigits.slice(1) : numberDigits
            selectedHeaders.phoneNumber = headerName
            break
    }
}