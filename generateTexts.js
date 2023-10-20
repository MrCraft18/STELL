const template = '{Interchange-1}, {Interchange-2} {Interchange-3} {Interchange-4} Is this still [name]?';

const interchanges1 = ['Hey', 'Hi', 'Hello', 'Greetings', 'Hey There', 'Hi There', 'Hello There'];
const interchanges2 = ['this is', 'I\'m', 'I am'];
const interchanges3 = ['Jacob', 'Jacob Walker'];
const interchanges4 = ['from [city]', 'in [city]', 'from [city],', 'in [city],', 'from [city].', 'in [city].'];

for (let i = 0; i < interchanges1.length; i++) {
  for (let j = 0; j < interchanges2.length; j++) {
    for (let k = 0; k < interchanges3.length; k++) {
      for (let l = 0; l < interchanges4.length; l++) {
        const message = template
          .replace('{Interchange-1}', interchanges1[i])
          .replace('{Interchange-2}', interchanges2[j])
          .replace('{Interchange-3}', interchanges3[k])
          .replace('{Interchange-4}', interchanges4[l])
        console.log(message);
      }
    }
  }
}
