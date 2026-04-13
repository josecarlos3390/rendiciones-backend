/**
 * Script para probar migración MD5 → Bcrypt
 * 
 * Uso: node scripts/probar-migracion-md5.js
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const preguntar = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

/**
 * Detecta si es MD5
 */
function isMD5Hash(hash) {
  return /^[a-f0-9]{32}$/i.test(hash);
}

/**
 * Genera MD5
 */
function md5Hash(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

/**
 * Simula el proceso de login con migración
 */
async function simularMigracion() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   PRUEBA DE MIGRACIÓN MD5 → BCRYPT                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 1. Pedir datos
  const usuario = await preguntar('Usuario (login): ');
  const password = await preguntar('Contraseña: ');
  const hashEnBD = await preguntar('Hash actual en BD (copia el valor de U_Pass): ');

  console.log('\n--- ANÁLISIS ---\n');

  // 2. Analizar tipo de hash
  const esMD5 = isMD5Hash(hashEnBD);
  const esBcrypt = hashEnBD.startsWith('$2');

  console.log(`Usuario: ${usuario}`);
  console.log(`Hash en BD: ${hashEnBD}`);
  console.log(`Tipo detectado: ${esMD5 ? 'MD5 ⚠️' : esBcrypt ? 'BCRYPT ✅' : 'DESCONOCIDO ❓'}`);

  // 3. Verificar contraseña
  let passwordValido = false;
  
  if (esMD5) {
    const md5Calculado = md5Hash(password);
    console.log(`\nMD5 de la contraseña ingresada: ${md5Calculado}`);
    console.log(`MD5 almacenado en BD:         ${hashEnBD.toLowerCase()}`);
    
    passwordValido = md5Calculado.toLowerCase() === hashEnBD.toLowerCase();
    
    if (passwordValido) {
      console.log('\n✅ CONTRASEÑA CORRECTA (MD5)');
      
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
      console.log('Los hashes MD5 no coinciden');
    }
    
  } else if (esBcrypt) {
    passwordValido = await bcrypt.compare(password, hashEnBD);
    
    if (passwordValido) {
      console.log('\n✅ CONTRASEÑA CORRECTA (BCRYPT)');
      console.log('El usuario ya está migrado, no se requiere acción.');
    } else {
      console.log('\n❌ CONTRASEÑA INCORRECTA');
    }
    
  } else {
    console.log('\n❌ TIPO DE HASH DESCONOCIDO');
    console.log('No se puede verificar. El hash debe ser MD5 (32 hex) o Bcrypt ($2...)');
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
  
  if (esMD5 && passwordValido) {
    console.log('📋 RESUMEN:');
    console.log('1. El usuario tiene hash MD5');
    console.log('2. La contraseña es correcta');
    console.log('3. Se generó el nuevo hash bcrypt');
    console.log('4. Ejecuta el SQL de arriba para migrar manualmente');
    console.log('\n💡 O simplemente haz login en la aplicación y la migración será automática.');
  }

  rl.close();
}

// Ejecutar
simularMigracion().catch(err => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
});
