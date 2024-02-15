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

    document.getElementById('setup-container').style.display = 'block'
    document.getElementById('dynamic-container').style.display = 'block'

    handleFile(element.files[0])
}

function handleFile(file) {
    let records = []

    Papa.parse(file, {
        header: true,
        complete: (results, file) => {
            console.log(results.data.length)

            console.log(getRandomElements(results.data, 5))
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