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

function handleFile(file) {
    Papa.parse(file, {
        header: true,
        complete: (results) => {
            const recordsArray = results.data

            console.log(recordsArray.length)

            const rowAmount = 8

            const csvGridElement = document.getElementById('csv-grid')
            csvGridElement.style.gridTemplateColumns = `repeat(${Object.keys(recordsArray[0]).length}, 1fr)`

            Object.keys(recordsArray[0]).forEach(header => {
                const headerCellElement = document.createElement('div')
                headerCellElement.classList.add('grid-item')
                headerCellElement.offsetHeight = `calc(${csvGridElement.offsetHeight}px / ${rowAmount})`
                headerCellElement.innerText = header
                csvGridElement.appendChild(headerCellElement)
            })

            recordsArray.slice(0, rowAmount - 1).forEach(row => {
                Object.values(row).forEach(value => {
                    const cellElement = document.createElement('div')
                    cellElement.classList.add('grid-item')
                    cellElement.offsetHeight = `calc(${csvGridElement.offsetHeight}px / ${rowAmount})`
                    cellElement.innerText = value
                    csvGridElement.appendChild(cellElement)
                })
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