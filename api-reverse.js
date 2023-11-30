const axios = require('axios').create({
    withCredentials: true,
    baseURL: 'https://salesgodcrm.net/api/'
  });
  
  axios.get('sanctum/csrf-cookie').then(response => {


    let XRSF_TOKEN, SESSION, COOKIE;

    response.headers['set-cookie'].forEach(cookie => {
      if (cookie.startsWith('XSRF-TOKEN=')) {
        XRSF_TOKEN = cookie.split(';')[0] + '; '
      } else if (cookie.startsWith('salesgod_crm_session=')) {
        SESSION = cookie.split(';')[0] + '; '
      } else {
        COOKIE = cookie.split(';')[0] + ';'
      }
    })

    console.log(XRSF_TOKEN.replace('%3D; ', '='))

    axios.post('auth/login', {"email":"jacobwalkersolutions@gmail.com","password":"Godsgotthis#1"}, {
        headers: {
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": XRSF_TOKEN.replace('XSRF-TOKEN=', '').replace('%3D; ', '='),
            "Cookie": (XRSF_TOKEN + SESSION + COOKIE),
            "Referer": "https://salesgodcrm.net/auth/login",
            "Referrer-Policy": "strict-origin-when-cross-origin"
          }
    })
    .then(response => console.log(response.data))
  })
  .catch(error => {
    console.error('Error fetching CSRF token:', error);
  });