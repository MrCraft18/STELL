const express = require('express');
const mongodb = require('./mongodb-lib');



//Express Things
const app = express();
app.use(express.json());
app.use(express.static(__dirname + '/Front End/Upload Raw List'));



//Get Handlers
app.get('/upload', (req, res) => {
  res.status(200).sendFile(__dirname + '/Front End/Upload Raw List/index.html');
});



//Post Handlers
app.post('/newRecords', async (req, res) => {
  console.log('New Records Recieved')
  const newRecords = req.body
  try {
    await mongodb.addNewRecords(newRecords)
    console.log('Response Sent')
    res.status(200).send('Hoshi yotsu oideeee')
  } catch (err) {
    console.log(err)
    res.status(500).send("There was an error")
  }
});



//Start Server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
