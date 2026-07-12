fetch('https://api-aloshipp-demo.vercel.app/api/alofood/restaurants')
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.log(err));
