// Usa el host y puerto de las variables de entorno, o valores por defecto.
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 8080;

const cors_anywhere = require('cors-anywhere');

cors_anywhere.createServer({
    originWhitelist: [], // Permitir todos los orígenes
    requireHeader: ['origin', 'x-requested-with'],
    removeHeaders: ['cookie', 'cookie2']
}).listen(port, host, function() {
    console.log('CORS Anywhere se está ejecutando en ' + host + ':' + port);
    console.log('Para usarlo, haz tus peticiones fetch a: http://localhost:' + port + '/<URL_DESTINO>');
    console.log('Ejemplo: fetch("http://localhost:' + port + '/https://script.google.com/macros/s/.../exec")');
});
