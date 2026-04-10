const url = 'https://script.google.com/macros/s/AKfycbzF4qviFlQbZQvVJV7Gxd3I_LJOfe3ktnIvCC5MoGTRigmjFlOYgUipPBcLA7OLZwv9/exec?sheet=pedidos';

console.log('🔍 Buscando pestaña [pedidos] en la NUEVA URL...');
fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log('Respuesta del servidor:', JSON.stringify(data, null, 2));
  })
  .catch(err => console.error('Error:', err.message));
