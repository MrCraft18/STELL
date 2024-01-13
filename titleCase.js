const fs = require('fs')

fs.readdirSync('./database/unsentRecords').forEach(file => {
    const record = JSON.parse(fs.readFileSync(`./database/unsentRecords/${file}`, 'utf-8'))

    record.name = toTitleCase(record.name)
    record.address = toTitleCase(record.address)

    fs.writeFileSync(`./database/unsentRecords/${file}`, JSON.stringify(record, null, 4))
})



function toTitleCase(str) {
    return str.toLowerCase().split(' ').map(word => {
        // Keep "TX" in uppercase
        if (word.toUpperCase() === "TX") {
            return "TX";
        }
        // Convert other words to title case
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}