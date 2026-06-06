/**
 * DSicario Global Configuration
 */

export const CONFIG = {
  // Google Apps Script Master URL
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbxA9bONvXZZ033rkXK5_fgpsgDYTdjZngfMaexIxMQaHBZ3zpxCvsoIUUxMSB-o00fo/exec',
  
  // App settings
  APP_NAME: 'DSicarioApp',
  COMPANY_NAME: 'DSicario',
  
  // API settings
  API_TIMEOUT: 30000,

  // Owner configuration (para admin/owner detection)
  OWNER_EMAIL: 'hairoman28@gmail.com',
  OWNER_RIDER_ID: 'DS01',
  
  // VAPID Keys para Web Push Notifications
  VAPID_PUBLIC_KEY: 'BH5kWZBL9T2ZzA5SLF6SgxX_dAkfXZCKQvJhdUBNV3BKH5yZAviSBXS4YVwUyz6qmtwrJ99L-5sxpTfkcYNePxo',
  VAPID_PRIVATE_KEY: 'b3JqjGvxvmMPSWLLItD_gv_ltZpnbFWglf1Zgms3KXE', // Solo se usa en servidor/Code.gs

  // GOOGLE MAPS API KEY (Necesaria para rutas y mapas reales)
  GOOGLE_MAPS_API_KEY: 'AIzaSyBTOwNNoRVgVpDmnGvWOZNCSLbJPCV9mZw', 

  // UBICACIÓN DEL LOCAL (Punto de partida de todos los deliveries)
  STORE_LOCATION: {
    latitude: 18.486052,
    longitude: -69.931215,
    address: 'Calle diagonal 1ra. no. 29, Santo Tomas De Aquino, DN'
  }
};
