/**
 * Script para probar migración BASE64 → Bcrypt
 * 
 * Uso: node scripts/probar-migracion-base64.js
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const preguntar = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

/**
 * Detecta si es base64
 */
function isBase64(str) {
  return /^[A-Za-z0-9+/]*={0,2}$/.test(str) && str.length % 4 === 0 && str.length > 0;
}

/**
 * Decodifica base64
 */
function decodeBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Detecta si es MD5
 */
function isMD5Hash(hash) {
  return /^[a-f0-9]{32}$/i.test(hash);
}

/**
 * Muestra los caracteres en formato visible para debug
 */
function toVisible(str) {
  return str.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code < 32 || code > 126) return `[${code}]`;
    return c;
  }).join('');
}

/**
 * Simula el proceso de login con migración
 */
async function simularMigracion() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   PRUEBA DE MIGRACIÓN BASE64 → BCRYPT                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 1. Pedir datos
  const usuario = await preguntar('Usuario (login): ');
  const password = await preguntar('Contraseña: ');
  const hashEnBD = await preguntar('Hash actual en BD (copia el valor de U_Pass): ');

  console.log('\n--- ANÁLISIS ---\n');

  console.log(`Usuario: ${usuario}`);
  console.log(`Hash en BD: ${hashEnBD}`);
  console.log(`Longitud hash BD: ${hashEnBD.length}`);
  console.log(`Contraseña ingresada: "${password}"`);
  console.log(`Longitud password: ${password.length}`);

  // 2. Analizar tipo de hash
  const esBase64 = isBase64(hashEnBD);
  const esMD5 = isMD5Hash(hashEnBD);
  const esBcrypt = hashEnBD.startsWith('$2');

  let tipoDetectado = 'DESCONOCIDO ❓';
  if (esBase64) tipoDetectado = 'BASE64 ⚠️';
  else if (esMD5) tipoDetectado = 'MD5 ⚠️';
  else if (esBcrypt) tipoDetectado = 'BCRYPT ✅';

  console.log(`Tipo detectado: ${tipoDetectado}`);

  // 3. Si es base64, decodificar
  if (esBase64) {
    const decodificado = decodeBase64(hashEnBD);
    console.log(`\nContenido decodificado: "${decodificado}"`);
    console.log(`Longitud decodificado: ${decodificado ? decodificado.length : 0}`);
    
    // Debug: mostrar bytes
    if (decodificado) {
      console.log(`Bytes password:     ${toVisible(password)}`);
      console.log(`Bytes decodificado: ${toVisible(decodificado)}`);
      
      // Comparación carácter por carácter
      let iguales = true;
      const maxLen = Math.max(password.length, decodificado.length);
      for (let i = 0; i < maxLen; i++) {
        const p = password[i] || '(fin)';
        const d = decodificado[i] || '(fin)';
        const match = password[i] === decodificado[i];
        if (!match) {
          console.log(`  Pos ${i}: password="${p}" vs decoded="${d}" -> DIFERENTE`);
          iguales = false;
        }
      }
      
      if (decodificado === password || iguales) {
        console.log('\n✅ CONTRASEÑA CORRECTA (BASE64)');
        
        // Simular migración
        console.log('\n--- SIMULANDO MIGRACIÓN ---\n');
        const nuevoHash = await bcrypt.hash(password, 10);
        
        console.log('Nuevo hash Bcrypt generado:');
        console.log(nuevoHash);
        console.log('\n✅ SQL para actualizar en BD:');
        console.log(`UPDATE "REND_U" SET "U_Pass" = '${nuevoHash}' WHERE "U_Login" = '${usuario}';`);
        
        // Verificar que el bcrypt funciona
        const verificacion = await bcrypt.compare(password, nuevoHash);
        console.log(`\nVerificación bcrypt: ${verificacion ? '✅ OK' : '❌ FALLÓ'}`);
        
      } else {
        console.log('\n❌ CONTRASEÑA INCORRECTA');
        console.log(`Contraseñas diferentes a pesar de parecer iguales.`);
        console.log(`Esto puede deberse a caracteres invisibles o encoding.`);
      }
    } else {
      console.log('\n❌ Error decodificando base64');
    }
  }

  // 4. Si es MD5
  else if (esMD5) {
    const crypto = require('crypto');
    const md5Calculado = crypto.createHash('md5').update(password).digest('hex');
    console.log(`\nMD5 de la contraseña ingresada: ${md5Calculado}`);
    console.log(`MD5 almacenado en BD:         ${hashEnBD.toLowerCase()}`);
    
    if (md5Calculado.toLowerCase() === hashEnBD.toLowerCase()) {
      console.log('\n✅ CONTRASEÑA CORRECTA (MD5)');
      const nuevoHash = await bcrypt.hash(password, 10);
      console.log('\nNuevo hash Bcrypt:');
      console.log(nuevoHash);
      console.log(`\nSQL: UPDATE "REND_U" SET "U_Pass" = '${nuevoHash}' WHERE "U_Login" = '${usuario}';`);
    } else {
      console.log('\n❌ CONTRASEÑA INCORRECTA');
    }
  }

  // 5. Si es bcrypt
  else if (esBcrypt) {
    const valido = await bcrypt.compare(password, hashEnBD);
    console.log(valido ? '\n✅ CONTRASEÑA CORRECTA (BCRYPT)' : '\n❌ CONTRASEÑA INCORRECTA');
    if (valido) console.log('El usuario ya está migrado.');
  }

  else {
    console.log('\n❌ TIPO DE HASH DESCONOCIDO');
    console.log('No se pudo identificar el formato del hash.');
  }

  rl.close();
}

// Ejecutar
simularMigracion().catch(err => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
});
