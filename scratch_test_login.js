fetch('https://api-aloshipp-demo.vercel.app/api/auth/customer/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '0765120777', password: '123' })
})
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.log(err));
