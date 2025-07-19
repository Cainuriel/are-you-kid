const { zenroom_exec } = await import('zenroom');

// Contador global de estadísticas
const testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: 0
}

/**
 * Función de ayuda para ejecutar y reportar los resultados de una prueba.
 */
async function runTest(testName, zencode, data = null, keys = null) {
  console.log(`\n🧪 Ejecutando prueba: ${testName}`);
  testStats.total++;
  
  try {
    const config = {};
    if (data) {
        config.data = JSON.stringify(data);
    }
    if (keys) {
        config.keys = JSON.stringify(keys);
    }

    const result = await zenroom_exec(zencode, Object.keys(config).length > 0? config : undefined);
    
    if (!result |

typeof result.result === 'undefined') {
        throw new Error(`La ejecución de Zenroom no devolvió un resultado válido. Logs: ${result.logs}`);
    }
    const output = JSON.parse(result.result);
    
    if ((output.output && output.output.includes("valid")) |

 Object.keys(output).length > 0) {
      console.log(`✅ Éxito: ${testName} se completó y generó la salida esperada.`);
      testStats.passed++;
      return { success: true, output };
    }
    
    console.error(`❌ Fallo: ${testName} se ejecutó pero el resultado no fue el esperado.`);
    console.log('   Salida recibida:', result.result);
    testStats.failed++;

    return { success: false, output: null };

  } catch (error) {
    console.error(`❌ Error catastrófico en ${testName}:`, error);
    testStats.failed++;
    testStats.errors++;

    return { success: false, output: null };
  }
}

// =============================================================================
// DEFINICIÓN DE LAS PRUEBAS (CON SINTAXIS Zencode CORREGIDA)
// =============================================================================

async function testECDH_and_EDDSA() {
  const zencode = `Rule check version 5.0.0
Scenario 'crypto': Intercambio ECDH y firma EDDSA
Given I have a 'alice' keypair from a 'ed25519' curve
AND I have a 'bob' keypair from a 'ed25519' curve
WHEN I create an 'alice' ecdh-secret from 'bob' public key
AND I sign the message 'this is a test' with the 'alice' keypair creating a 'my signature'
AND I verify the message 'this is a test' with the 'alice' public key and 'my signature'
THEN I expect the result to be valid`;
  return runTest("ECDH (intercambio) y EDDSA (firma)", zencode);
}

async function testDilithium() {
  const zencode = `Rule check version 5.0.0
Scenario 'pqc': Firma Post-Cuántica con Dilithium
Given a message 'this is a quantum-resistant signature'
WHEN I create a 'dilithium' keypair
AND I sign the message with my keypair creating a 'pqc signature'
AND I verify the message 'this is a quantum-resistant signature' with my public key and the 'pqc signature'
THEN I expect the result to be valid`;
  return runTest("Dilithium (Post-Quantum)", zencode);
}

async function testBBS_KeyGeneration() {
  const zencode = `Rule check version 5.0.0
Scenario 'bbs': Generación de claves BBS+ (sha y shake)
Given I am 'The Authority'
When I create the bbs key
And I create the bbs public key
And I create the bbs shake key
And I create the bbs shake public key
Then print my 'bbs public key'
And print my 'bbs shake public key'
And print my 'keyring'`;
  return runTest("BBS+ Generación de Claves (sha y shake)", zencode);
}

async function testBBS_ZK_Proof() {
  const zencode = `Rule check version 5.0.0
Scenario 'BBS_proof': Prueba de divulgación selectiva BBS+
Given I have the messages

| username | Alice |
| role | administrator |
WHEN I create a 'BBS' keypair
AND I sign these messages with my keypair creating a 'bbs signature'
AND I create a proof from the 'bbs signature' revealing the message 'username' creating a 'zk proof'
AND I verify the 'zk proof' with my public key and the messages

| username | Alice |
THEN I expect the result to be valid`;
  return runTest("BBS+ ZK (Prueba de Divulgación Selectiva)", zencode);
}

async function testCoconut_FullWorkflow() {
  console.log("\n🧪 Ejecutando prueba de flujo completo: Coconut");
  
  const aliceKeygenZencode = `Rule check version 5.0.0
Scenario 'credential': Coconut - Alice genera su clave
Given I am 'Alice'
When I create the credential key
Then print my 'keyring'`;
  const { success: aliceSuccess, output: aliceOutput } = await runTest(
    "   - Paso 1: Alice genera su clave de credencial", 
    aliceKeygenZencode
  );
  if (!aliceSuccess) {
      console.error("   -> Flujo de Coconut detenido porque el paso 1 falló.");
      return;
  };

  const authoritySignZencode = `Rule check version 5.0.0
Scenario 'credential': Coconut - La Autoridad firma la petición
Given I am 'The Authority'
And I have my 'keyring'
And I have a 'credential request' inside 'Alice'
When I create the credential signature
Then print the 'credential signature'`;
  
  const authorityKeys = {
    keyring: {
      "credential_sk": "c928562726d400051e5336335133604f331616147d177302c893633854b70608"
    }
  };
  const authorityData = {
      Alice: aliceOutput
  };

  await runTest(
    "   - Paso 2: La Autoridad firma la petición de Alice", 
    authoritySignZencode, 
    authorityData,
    authorityKeys
  );
}

// =============================================================================
// EJECUTOR PRINCIPAL
// =============================================================================

async function main() {
  console.log('🚀 Iniciando conjunto de pruebas con Zencode corregido...');
  
  await testECDH_and_EDDSA();
  await testDilithium();
  await testBBS_KeyGeneration();
  await testBBS_ZK_Proof();
  await testCoconut_FullWorkflow();
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 ESTADÍSTICAS FINALES");
  console.log("=".repeat(60));
  console.log(`🧪 Total de pruebas ejecutadas: ${testStats.total}`);
  console.log(`✅ Pruebas exitosas: ${testStats.passed}`);
  console.log(`❌ Pruebas fallidas: ${testStats.failed}`);
  
  if (testStats.errors.length > 0) {
    console.log("\n💥 ERRORES DETALLADOS:");
    testStats.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.test}`);
      console.log(`   Mensaje: ${error.message |

 'Resultado inesperado'}`);
      if (error.output) {
        console.log(`   Salida: ${error.output}`);
      }
    });
  }
  
  console.log("\n🏁 Pruebas finalizadas.");
}

main();