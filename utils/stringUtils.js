// Función de distancia de Levenshtein para sugerencias de texto
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // sustitución
          matrix[i][j - 1] + 1,     // inserción
          matrix[i - 1][j] + 1      // eliminación
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Encuentra el producto más parecido por nombre
export function findClosestProduct(products, term) {
  if (!term || !products.length) return null;
  let minDist = Infinity;
  let closest = null;
  const lowerTerm = term.toLowerCase();
  for (const product of products) {
    const name = (product.nombre || '').toLowerCase();
    const dist = levenshtein(lowerTerm, name);
    if (dist < minDist) {
      minDist = dist;
      closest = product;
    }
  }
  return closest;
}
