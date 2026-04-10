const url = 'https://script.google.com/macros/s/AKfycbzF4qviFlQbZQvVJV7Gxd3I_LJOfe3ktnIvCC5MoGTRigmjFlOYgUipPBcLA7OLZwv9/exec';

const orderData = {
  action: "ADD",
  sheet: "pedidos",
  data: {
    'ID_Pedido': 'USER-NEW-' + Math.floor(Math.random() * 1000),
    'Cliente': 'Prueba Nueva URL',
    'Total': 2000,
    'Entrada': new Date().toLocaleTimeString(),
    'fecha': new Date().toLocaleDateString(),
    'Pagado?': 'NO'
  }
};

console.log('🚀 Enviando pedido a la dirección enviada por el usuario...');
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify(orderData),
  redirect: 'follow'
})
  .then(res => res.json())
  .then(data => {
    console.log('Resultado del servidor:', JSON.stringify(data, null, 2));
  })
  .catch(err => console.error('Error:', err.message));
