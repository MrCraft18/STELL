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

function inputChange(element) {
    document.getElementById('file-upload').remove()

    document.getElementById('setup-container').style.display = 'flex'
    document.getElementById('dynamic-container').style.display = 'block'

    handleFile(element.files[0])
}

let importedFile

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
                <div class='grid-item'>${header}</div>
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
                    <div class="dropdown-item">${field}</div>
                `).join('')
            })
        }
    })
}

function getRandomElements(arr, numElements) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1)); 
        [arr[i], arr[j]] = [arr[j], arr[i]]; 
    }

    return arr.slice(0, numElements);
}



