/**
 * Test Suite para Librerías Criptográficas
 * Verificar que BBS+ y primitivas para Coconut funcionan correctamente
 */

// Importaciones
import { 
  generateBls12381G2KeyPair, 
  blsSign, 
  blsCreateProof, 
  blsVerifyProof 
} from '@mattrglobal/bbs-signatures';

import { bls12_381 } from '@noble/curves/bls12-381';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@stablelib/random';

// Contador de estadísticas
const testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Función helper para ejecutar tests
 */
async function runTest(testName, testFunction) {
  console.log(`\n🧪 Ejecutando: ${testName}`);
  testStats.total++;
  
  try {
    const result = await testFunction();
    if (result) {
      console.log(`✅ ${testName} - EXITOSO`);
      testStats.passed++;
      return true;
    } else {
      console.log(`❌ ${testName} - FALLIDO`);
      testStats.failed++;
      testStats.errors.push({
        test: testName,
        type: 'Resultado falso',
        message: 'La función retornó false'
      });
      return false;
    }
  } catch (error) {
    console.error(`💥 ${testName} - ERROR:`, error.message);
    testStats.failed++;
    testStats.errors.push({
      test: testName,
      type: 'Excepción',
      message: error.message,
      stack: error.stack
    });
    return false;
  }
}

// =============================================================================
// TESTS BBS+ REALES
// =============================================================================

/**
 * Test 1: Generar keypair BBS+
 */
async function testBBSKeyGeneration() {
  const keyPair = await generateBls12381G2KeyPair();
  
  // Verificar que las claves se generaron correctamente
  const hasPublicKey = keyPair.publicKey && keyPair.publicKey.length > 0;
  const hasSecretKey = keyPair.secretKey && keyPair.secretKey.length > 0;
  
  console.log(`   📋 Clave pública: ${Buffer.from(keyPair.publicKey).toString('hex').substring(0, 20)}...`);
  console.log(`   📋 Clave privada: ${Buffer.from(keyPair.secretKey).toString('hex').substring(0, 20)}...`);
  
  return hasPublicKey && hasSecretKey;
}

/**
 * Test 2: Crear credential/firma BBS+
 */
async function testBBSCredentialSigning() {
  const keyPair = await generateBls12381G2KeyPair();
  
  // Mensajes que representan atributos de identidad
  const messages = [
    Uint8Array.from(Buffer.from("Alice Smith", "utf-8")), // Nombre
    Uint8Array.from(Buffer.from("25", "utf-8")),          // Edad
    Uint8Array.from(Buffer.from("ES", "utf-8")),          // País
    Uint8Array.from(Buffer.from("Engineer", "utf-8"))     // Profesión
  ];
  
  const signature = await blsSign({
    keyPair,
    messages
  });
  
  console.log(`   📋 Firma creada: ${Buffer.from(signature).toString('hex').substring(0, 40)}...`);
  
  return signature && signature.length > 0;
}

/**
 * Test 3: Crear prueba ZK selectiva (revelar solo algunos atributos)
 */
async function testBBSSelectiveDisclosure() {
  const keyPair = await generateBls12381G2KeyPair();
  
  const messages = [
    Uint8Array.from(Buffer.from("Alice Smith", "utf-8")), // 0: Nombre
    Uint8Array.from(Buffer.from("25", "utf-8")),          // 1: Edad
    Uint8Array.from(Buffer.from("ES", "utf-8")),          // 2: País
    Uint8Array.from(Buffer.from("Engineer", "utf-8"))     // 3: Profesión
  ];
  
  const signature = await blsSign({
    keyPair,
    messages
  });
  
  // Crear prueba ZK revelando solo país y profesión (índices 2 y 3)
  const nonce = Uint8Array.from(Buffer.from("test-nonce-12345", "utf-8"));
  
  const proof = await blsCreateProof({
    signature,
    publicKey: keyPair.publicKey,
    messages,
    revealed: [2, 3], // Solo revelar país y profesión
    nonce
  });
  
  console.log(`   📋 Prueba ZK creada: ${Buffer.from(proof).toString('hex').substring(0, 40)}...`);
  console.log(`   📋 Atributos revelados: País=ES, Profesión=Engineer`);
  console.log(`   📋 Atributos ocultos: Nombre, Edad`);
  
  return proof && proof.length > 0;
}

/**
 * Test 4: Verificar prueba ZK BBS+
 */
async function testBBSProofVerification() {
  const keyPair = await generateBls12381G2KeyPair();
  
  const messages = [
    Uint8Array.from(Buffer.from("Alice Smith", "utf-8")),
    Uint8Array.from(Buffer.from("25", "utf-8")),
    Uint8Array.from(Buffer.from("ES", "utf-8")),
    Uint8Array.from(Buffer.from("Engineer", "utf-8"))
  ];
  
  const signature = await blsSign({
    keyPair,
    messages
  });
  
  const nonce = Uint8Array.from(Buffer.from("test-nonce-12345", "utf-8"));
  
  const proof = await blsCreateProof({
    signature,
    publicKey: keyPair.publicKey,
    messages,
    revealed: [2, 3], // Revelar país y profesión
    nonce
  });
  
  // Verificar la prueba
  const isValid = await blsVerifyProof({
    proof,
    publicKey: keyPair.publicKey,
    messages: [
      Uint8Array.from(Buffer.from("ES", "utf-8")),      // País revelado
      Uint8Array.from(Buffer.from("Engineer", "utf-8")) // Profesión revelada
    ],
    nonce
  });
  
  console.log(`   📋 Verificación: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
  
  return isValid;
}

/**
 * Test 5: Caso específico para verificación de edad (nuestro use case)
 */
async function testBBSAgeVerification() {
  const keyPair = await generateBls12381G2KeyPair();
  
  // Simular atributos de una persona de 25 años
  const messages = [
    Uint8Array.from(Buffer.from("User123", "utf-8")),    // ID usuario
    Uint8Array.from(Buffer.from("25", "utf-8")),         // Edad
    Uint8Array.from(Buffer.from("true", "utf-8")),       // Mayor de 18
    Uint8Array.from(Buffer.from("true", "utf-8")),       // Mayor de 21
    Uint8Array.from(Buffer.from("ES", "utf-8"))          // País
  ];
  
  const signature = await blsSign({
    keyPair,
    messages
  });
  
  const nonce = Uint8Array.from(Buffer.from("age-verification-nonce", "utf-8"));
  
  // Crear prueba revelando solo el hecho de ser mayor de 18 y 21, sin revelar edad exacta
  const proof = await blsCreateProof({
    signature,
    publicKey: keyPair.publicKey,
    messages,
    revealed: [2, 3], // Solo revelar los booleanos de edad
    nonce
  });
  
  // Verificar
  const isValid = await blsVerifyProof({
    proof,
    publicKey: keyPair.publicKey,
    messages: [
      Uint8Array.from(Buffer.from("true", "utf-8")),  // Mayor de 18
      Uint8Array.from(Buffer.from("true", "utf-8"))   // Mayor de 21
    ],
    nonce
  });
  
  console.log(`   📋 Verificación de edad: Usuario es mayor de 18 y 21 sin revelar edad exacta`);
  console.log(`   📋 Resultado: ${isValid ? 'VERIFICADO' : 'RECHAZADO'}`);
  
  return isValid;
}

// =============================================================================
// TESTS PRIMITIVAS CRIPTOGRÁFICAS PARA COCONUT
// =============================================================================

/**
 * Test 6: Generar claves para Coconut usando curvas BLS12-381
 */
async function testCoconutKeyGeneration() {
  // Generar clave privada del issuer
  const issuerPrivateKey = bls12_381.utils.randomPrivateKey();
  
  // Generar clave pública correspondiente
  const issuerPublicKey = bls12_381.G2.ProjectivePoint.fromPrivateKey(issuerPrivateKey);
  
  // Generar clave privada del usuario
  const userPrivateKey = bls12_381.utils.randomPrivateKey();
  const userPublicKey = bls12_381.G1.ProjectivePoint.fromPrivateKey(userPrivateKey);
  
  console.log(`   📋 Issuer privada: ${Buffer.from(issuerPrivateKey).toString('hex').substring(0, 20)}...`);
  console.log(`   📋 Issuer pública: ${issuerPublicKey.toRawBytes().length} bytes`);
  console.log(`   📋 Usuario privada: ${Buffer.from(userPrivateKey).toString('hex').substring(0, 20)}...`);
  console.log(`   📋 Usuario pública: ${userPublicKey.toRawBytes().length} bytes`);
  
  return issuerPrivateKey.length > 0 && userPrivateKey.length > 0;
}

/**
 * Test 7: Hashing para atributos (necesario para Coconut)
 */
async function testCoconutAttributeHashing() {
  const attributes = [
    "Alice Smith",    // Nombre
    "25",            // Edad
    "ES",            // País
    "1990-05-15"     // Fecha nacimiento
  ];
  
  // Hash cada atributo
  const hashedAttributes = attributes.map(attr => {
    const hash = sha256(Buffer.from(attr, 'utf-8'));
    return Buffer.from(hash).toString('hex');
  });
  
  console.log(`   📋 Atributos originales:`, attributes);
  console.log(`   📋 Atributos hasheados:`);
  hashedAttributes.forEach((hash, i) => {
    console.log(`        ${attributes[i]} -> ${hash.substring(0, 20)}...`);
  });
  
  // Verificar que todos los hashes se generaron
  const allHashesValid = hashedAttributes.every(hash => hash.length === 64); // SHA256 = 32 bytes = 64 hex chars
  
  return allHashesValid;
}

/**
 * Test 8: Generar números aleatorios seguros (para nonces y commits)
 */
async function testSecureRandomGeneration() {
  // Generar varios valores aleatorios
  const nonce1 = randomBytes(32);
  const nonce2 = randomBytes(32);
  const commitment = randomBytes(32);
  
  console.log(`   📋 Nonce 1: ${Buffer.from(nonce1).toString('hex').substring(0, 20)}...`);
  console.log(`   📋 Nonce 2: ${Buffer.from(nonce2).toString('hex').substring(0, 20)}...`);
  console.log(`   📋 Commitment: ${Buffer.from(commitment).toString('hex').substring(0, 20)}...`);
  
  // Verificar que son diferentes (muy improbable que sean iguales)
  const areUnique = !Buffer.from(nonce1).equals(Buffer.from(nonce2));
  const correctLength = nonce1.length === 32 && nonce2.length === 32 && commitment.length === 32;
  
  return areUnique && correctLength;
}

/**
 * Test 9: Simulación de estructura Coconut completa
 */
async function testCoconutStructureSimulation() {
  // Simular la estructura que tendría una prueba Coconut real
  const issuerPrivateKey = bls12_381.utils.randomPrivateKey();
  const userAge = 25;
  const ageThreshold = 18;
  
  // Atributos
  const attributes = {
    user_id: "user_12345",
    age: userAge.toString(),
    age_over_18: (userAge >= 18).toString(),
    timestamp: new Date().toISOString()
  };
  
  // Hash de atributos
  const attributeHashes = Object.entries(attributes).map(([key, value]) => ({
    key,
    value,
    hash: Buffer.from(sha256(Buffer.from(value, 'utf-8'))).toString('hex')
  }));
  
  // Simular componentes de prueba Coconut
  const coconutProof = {
    pi_v: {
      c: Buffer.from(randomBytes(32)).toString('hex'),
      rr: Buffer.from(randomBytes(32)).toString('hex'),
      rm: Buffer.from(randomBytes(32)).toString('hex')
    },
    nu: Buffer.from(randomBytes(32)).toString('hex'),
    sigma_prime: {
      h_prime: Buffer.from(randomBytes(48)).toString('hex'), // G1 point
      s_prime: Buffer.from(randomBytes(32)).toString('hex')
    },
    kappa: Buffer.from(randomBytes(32)).toString('hex'),
    age_threshold: ageThreshold,
    proof_type: "coconut_age_proof",
    issuer_public_key: Buffer.from(bls12_381.G2.ProjectivePoint.fromPrivateKey(issuerPrivateKey).toRawBytes()).toString('hex'),
    attribute_hashes: attributeHashes
  };
  
  console.log(`   📋 Estructura Coconut simulada:`);
  console.log(`        pi_v.c: ${coconutProof.pi_v.c.substring(0, 20)}...`);
  console.log(`        nu: ${coconutProof.nu.substring(0, 20)}...`);
  console.log(`        sigma_prime.h_prime: ${coconutProof.sigma_prime.h_prime.substring(0, 20)}...`);
  console.log(`        kappa: ${coconutProof.kappa.substring(0, 20)}...`);
  console.log(`        threshold: ${coconutProof.age_threshold}`);
  console.log(`        atributos: ${attributeHashes.length} hasheados`);
  
  // Verificar estructura
  const hasAllFields = coconutProof.pi_v.c && coconutProof.nu && coconutProof.sigma_prime.h_prime && coconutProof.kappa;
  const correctTypes = typeof coconutProof.age_threshold === 'number' && Array.isArray(coconutProof.attribute_hashes);
  
  return hasAllFields && correctTypes;
}

// =============================================================================
// EJECUTOR PRINCIPAL
// =============================================================================

async function main() {
  console.log('🚀 Iniciando tests de librerías criptográficas');
  console.log('📋 BBS+ Real + Primitivas Coconut');
  console.log('=' + '='.repeat(50));
  
  // Tests BBS+ reales
  console.log('\n🔐 TESTS BBS+ REALES');
  console.log('-'.repeat(30));
  await runTest('Generación de claves BBS+', testBBSKeyGeneration);
  await runTest('Firma de credential BBS+', testBBSCredentialSigning);
  await runTest('Prueba ZK selectiva BBS+', testBBSSelectiveDisclosure);
  await runTest('Verificación de prueba BBS+', testBBSProofVerification);
  await runTest('Verificación de edad BBS+', testBBSAgeVerification);
  
  // Tests primitivas para Coconut
  console.log('\n🥥 TESTS PRIMITIVAS COCONUT');
  console.log('-'.repeat(30));
  await runTest('Generación de claves Coconut', testCoconutKeyGeneration);
  await runTest('Hashing de atributos', testCoconutAttributeHashing);
  await runTest('Generación aleatoria segura', testSecureRandomGeneration);
  await runTest('Estructura Coconut simulada', testCoconutStructureSimulation);
  
  // Estadísticas finales
  console.log('\n' + '='.repeat(60));
  console.log('📊 ESTADÍSTICAS FINALES');
  console.log('='.repeat(60));
  console.log(`🧪 Total de tests: ${testStats.total}`);
  console.log(`✅ Tests exitosos: ${testStats.passed}`);
  console.log(`❌ Tests fallidos: ${testStats.failed}`);
  console.log(`📈 Tasa de éxito: ${testStats.total > 0 ? Math.round((testStats.passed / testStats.total) * 100) : 0}%`);
  
  if (testStats.errors.length > 0) {
    console.log('\n💥 ERRORES DETALLADOS:');
    console.log('-'.repeat(40));
    testStats.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.test}`);
      console.log(`   Tipo: ${error.type}`);
      console.log(`   Mensaje: ${error.message}`);
    });
  }
  
  console.log('\n🎯 CONCLUSIONES:');
  if (testStats.passed === testStats.total) {
    console.log('✅ Todas las librerías funcionan correctamente');
    console.log('✅ BBS+ listo para implementación real');
    console.log('✅ Primitivas Coconut listas para simulación inteligente');
    console.log('🚀 ¡Podemos proceder con la implementación!');
  } else {
    console.log('⚠️ Algunos tests fallaron. Revisar dependencias.');
  }
  
  console.log('\n🏁 Tests finalizados.');
}

// Ejecutar los tests
main().catch(console.error);
