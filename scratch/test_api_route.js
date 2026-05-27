
const CONFIG = {
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbx79iwqx2PSJjBnw1olD2hsMlL4fi-dZkqGYhmNnbpeHccWHLE7W7KY7VCPu5gmsBje/exec',
  GOOGLE_MAPS_API_KEY: 'AIzaSyAHlSOFsyfIUNPeECflWwpdHcSZqxgVp3U'
};

async function testRoute() {
  const origin = "18.486052,-69.931215";
  const destination = "18.487,-69.932";
  
  console.log("Testing POST GET_ROUTE...");
  try {
    const res = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'GET_ROUTE',
        data: { origin, destination, key: CONFIG.GOOGLE_MAPS_API_KEY }
      })
    });
    const data = await res.json();
    console.log("POST Response:", JSON.stringify(data, null, 2).substring(0, 500));
  } catch (e) {
    console.error("POST Error:", e);
  }

  console.log("\nTesting GET GET_ROUTE...");
  try {
    const url = `${CONFIG.GAS_API_URL}?action=GET_ROUTE&origin=${origin}&destination=${destination}&key=${CONFIG.GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log("GET Response:", JSON.stringify(data, null, 2).substring(0, 500));
  } catch (e) {
    console.error("GET Error:", e);
  }
}

testRoute();
