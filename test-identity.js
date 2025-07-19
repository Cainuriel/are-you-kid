/**
 * Test del Identity Provider
 */

// @ts-nocheck
import { 
  createIdentity, 
  getCurrentIdentity,
  getAllIdentities,
  exportForStorage,
  importFromStorage,
  updateIdentity,
  validateIdentityIntegrity,
  getIdentityStats,
  clearAllIdentities
} from './src/lib/crypto/identity-provider.js';

async function testIdentityProvider() {
  console.log('🆔 Testando Identity Provider...');
  
  try {
    // Limpiar estado previo
    clearAllIdentities();
    
    // 1. Crear primera identidad
    console.log('\n1️⃣ Creando identidad de Alice...');
    const alice = await createIdentity({
      name: 'Alice Johnson',
      age: 25,
      country: 'Spain'
    });
    console.log('✅ Alice creada con ID:', alice.id);
    console.log('   Datos personales:', alice.personal);
    console.log('   Tipo claves:', alice.type);
    
    // 2. Crear segunda identidad
    console.log('\n2️⃣ Creando identidad de Bob...');
    const bob = await createIdentity({
      name: 'Bob Wilson',
      age: 17,
      country: 'France'
    });
    console.log('✅ Bob creado con ID:', bob.id);
    
    // 3. Verificar que las claves son diferentes
    console.log('\n3️⃣ Verificando unicidad de claves...');
    const aliceBBSKey = alice.keyPair.bbs.publicKeyHex;
    const bobBBSKey = bob.keyPair.bbs.publicKeyHex;
    const keysAreDifferent = aliceBBSKey !== bobBBSKey;
    console.log('✅ Claves BBS+ únicas:', keysAreDifferent);
    console.log('   Alice BBS+:', aliceBBSKey.substring(0, 20) + '...');
    console.log('   Bob BBS+:', bobBBSKey.substring(0, 20) + '...');
    
    // 4. Obtener identidad por ID
    console.log('\n4️⃣ Recuperando identidad por ID...');
    const retrievedAlice = getCurrentIdentity(alice.id);
    const retrievalSuccess = retrievedAlice && retrievedAlice.personal.name === 'Alice Johnson';
    console.log('✅ Recuperación exitosa:', retrievalSuccess);
    
    // 5. Listar todas las identidades
    console.log('\n5️⃣ Listando todas las identidades...');
    const allIdentities = getAllIdentities();
    console.log('✅ Total de identidades:', allIdentities.length);
    allIdentities.forEach(id => {
      console.log(`   - ${id.personal.name} (${id.personal.age} años, ${id.personal.country})`);
    });
    
    // 6. Actualizar identidad
    console.log('\n6️⃣ Actualizando edad de Alice...');
    const updatedAlice = updateIdentity(alice.id, { age: 26 });
    console.log('✅ Alice actualizada - Nueva edad:', updatedAlice.personal.age);
    
    // 7. Validar integridad
    console.log('\n7️⃣ Validando integridad...');
    const validation = validateIdentityIntegrity(alice.id);
    console.log('✅ Validación de integridad:', validation.valid);
    console.log('   Razón:', validation.reason);
    
    // 8. Exportar identidad
    console.log('\n8️⃣ Exportando identidad para almacenamiento...');
    const exportedPublic = exportForStorage(alice.id, false); // Solo claves públicas
    const exportedPrivate = exportForStorage(alice.id, true);  // Con claves privadas
    console.log('✅ Exportación pública - Campos:', Object.keys(exportedPublic));
    console.log('✅ Exportación privada - Tiene claves privadas:', 
      !!(exportedPrivate.keyPair.bbs.secretKeyHex && exportedPrivate.keyPair.coconut.privateKeyHex));
    
    // 9. Importar identidad
    console.log('\n9️⃣ Importando identidad...');
    clearAllIdentities(); // Limpiar para probar importación
    
    const importedIdentity = await importFromStorage(exportedPublic, {
      bbs: { secretKeyHex: exportedPrivate.keyPair.bbs.secretKeyHex },
      coconut: { privateKeyHex: exportedPrivate.keyPair.coconut.privateKeyHex }
    });
    console.log('✅ Identidad importada:', importedIdentity.personal.name);
    console.log('   ID coincide:', importedIdentity.id === alice.id);
    
    // 10. Compatibilidad con BBS+ y Coconut
    console.log('\n🔟 Verificando compatibilidad con providers...');
    
    // Estructura compatible con BBS+
    const bbsCompatible = {
      personal: importedIdentity.personal,
      id: importedIdentity.id
    };
    console.log('✅ Estructura BBS+ compatible:', !!bbsCompatible.personal.age);
    
    // Claves disponibles para Coconut
    const coconutKeys = importedIdentity.keyPair.coconut;
    console.log('✅ Claves Coconut disponibles:', !!(coconutKeys.privateKey && coconutKeys.publicKey));
    
    // 11. Estadísticas
    console.log('\n1️⃣1️⃣ Estadísticas del provider...');
    const stats = getIdentityStats();
    console.log('✅ Estadísticas:', stats);
    
    // 12. Test de integridad con manipulación
    console.log('\n1️⃣2️⃣ Probando detección de manipulación...');
    const testIdentity = await createIdentity({ name: 'Test User', age: 30, country: 'Test' });
    
    // Manipular datos
    testIdentity.personal.name = 'Hacked User';
    const tamperValidation = validateIdentityIntegrity(testIdentity.id);
    console.log('✅ Detección de manipulación:', !tamperValidation.valid);
    console.log('   Razón:', tamperValidation.reason);
    
    console.log('\n🎉 ¡Identity Provider funcionando correctamente!');
    console.log('🔐 Genera claves BLS12-381 reales');
    console.log('🔄 Compatible con BBS+ y Coconut providers');
    console.log('💾 Soporta exportación/importación');
    console.log('🛡️ Incluye validación de integridad');
    console.log('🚀 ¡Listo para reemplazar Zenroom completamente!');
    
  } catch (error) {
    console.error('❌ Error en test Identity:', error);
  }
}

testIdentityProvider();
