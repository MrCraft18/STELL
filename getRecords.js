const fs = require('fs');



function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');

  const headers = lines[0].split(',');

  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const currentLine = lines[i].split(',');

    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentLine[j];
    };

    if (obj.DataZapp_DoNotCall === "N") {
      const address = `${obj.Address}, ${obj.City}, ${obj.State} ${obj.Zip}`;
      const name = `${obj["Owner 1 First Name"]} ${obj["Owner 1 Last Name"]}`;
      const record = { address: address, name: name, estimatedValue: obj["Estimated Value"], taxAmount: obj["Tax Amount"], phoneNumber: obj.DataZapp_Phone };
      data.push(record);
    };
  };
  return data;
};

console.log(parseCSV(fs.readFileSync('input.csv', 'utf-8')))