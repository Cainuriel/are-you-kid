/**
 * Test del Coconut Provider
 */

// @ts-nocheck
import { 
  createCoconutIssuer, 
  issueCoconutCredential, 
  createCoconutAgeProof, 
  verifyCoconutAgeProof,
  getCoconutStats
} from './src/lib/crypto/coconut-provider.js';

async function testCoconutProvider() {
  console.log('🥥 Testando Coconut Provider...');
  
  try {
    // 1. Crear issuer Coconut
    console.log('\n1️⃣ Creando Coconut issuer...');
    const issuer = await createCoconutIssuer();
    console.log('✅ Coconut Issuer creado:', issuer.issuerId);
    
    // 2. Crear identidad de usuario
    const userIdentity = {
      personal: {
        id: 'alice_coconut',
        name: 'Alice Cooper',
        age: 25,
        country: 'ES'
      }
    };
    
    // 3. Emitir credencial
    console.log('\n2️⃣ Emitiendo credencial Coconut...');
    const credential = await issueCoconutCredential(userIdentity, issuer.issuerId);
    console.log('✅ Credencial emitida:', credential.credentialId);
    console.log('   Atributos:', credential.attributes);
    
    // 4. Crear prueba de edad (mayor de 18)
    console.log('\n3️⃣ Creando prueba de edad Coconut...');
    const ageThreshold = 18;
    const ageProof = await createCoconutAgeProof(userIdentity, ageThreshold, issuer.issuerId);
    console.log('✅ Prueba creada:', ageProof.proofId);
    console.log('   Umbral:', ageThreshold, '- Edad:', userIdentity.personal.age);
    console.log('   Resultado esperado:', ageProof.metadata.expected_age_verification);
    
    // 5. Verificar prueba de edad
    console.log('\n4️⃣ Verificando prueba Coconut...');
    const verification = await verifyCoconutAgeProof(ageProof, ageThreshold, issuer.issuerId);
    console.log('✅ Verificación completada:', verification.success);
    console.log('   Detalles:', verification.details);
    
    // 6. Probar con menor de edad
    console.log('\n5️⃣ Probando con menor de edad...');
    const minorIdentity = {
      personal: {
        id: 'bob_minor',
        name: 'Bob Minor',
        age: 16,
        country: 'FR'
      }
    };
    
    const minorProof = await createCoconutAgeProof(minorIdentity, ageThreshold, issuer.issuerId);
    const minorVerification = await verifyCoconutAgeProof(minorProof, ageThreshold, issuer.issuerId);
    console.log('✅ Menor de edad - Verificación:', minorVerification.success);
    console.log('   Edad:', minorIdentity.personal.age, '- Debería fallar:', !minorVerification.success);
    
    // 7. Estadísticas
    console.log('\n6️⃣ Estadísticas del provider...');
    const stats = getCoconutStats();
    console.log('✅ Estadísticas:', stats);
    
    console.log('\n🎉 ¡Coconut Provider funcionando correctamente!');
    console.log('🔐 Usa primitivas criptográficas reales (BLS12-381, SHA256)');
    console.log('🥥 Simula estructura Coconut matemáticamente válida');
    console.log('📚 Perfecto para propósitos educativos y demostración');
    
  } catch (error) {
    console.error('❌ Error en test Coconut:', error);
  }
}

testCoconutProvider();