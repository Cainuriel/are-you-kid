/**
 * Test rápido del BBS Provider
 */

// @ts-nocheck
import { 
  createIdentityIssuer, 
  issueIdentityCredential, 
  createAgeProof, 
  verifyAgeProof 
} from './src/lib/crypto/bbs-provider.js';

async function testBBSProvider() {
  console.log('🧪 Testando BBS Provider...');
  
  try {
    // 1. Crear issuer
    console.log('\n1️⃣ Creando issuer...');
    const issuer = await createIdentityIssuer();
    console.log('✅ Issuer creado:', issuer.issuerId);
    
    // 2. Crear identidad de usuario
    const userIdentity = {
      personal: {
        id: 'user_123',
        name: 'Alice',
        age: 25,
        country: 'ES'
      }
    };
    
    // 3. Emitir credential
    console.log('\n2️⃣ Emitiendo credential...');
    const credential = await issueIdentityCredential({ 
      issuerId: issuer.issuerId, 
      userIdentity 
    });
    console.log('✅ Credential emitida:', credential.credentialId);
    
    // 4. Crear prueba de mayoría de edad
    console.log('\n3️⃣ Creando prueba de edad...');
    const ageProof = await createAgeProof({ 
      credentialId: credential.credentialId, 
      ageThreshold: 18 
    });
    console.log('✅ Prueba creada');
    
    // 5. Verificar prueba
    console.log('\n4️⃣ Verificando prueba...');
    const verification = await verifyAgeProof({ 
      proof: ageProof, 
      expectedThreshold: 18 
    });
    console.log('✅ Verificación:', verification.isValid ? 'VÁLIDA' : 'INVÁLIDA');
    
    if (verification.isValid) {
      console.log('🎉 ¡BBS Provider funciona correctamente!');
    } else {
      console.log('❌ Error en verificación:', verification.details);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

testBBSProvider();
