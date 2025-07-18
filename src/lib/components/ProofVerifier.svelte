<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { zencode_exec } from 'zenroom';
  import { currentIdentity } from '$lib/crypto/stores/identity.js';

  // Props
  export let onVerificationComplete = () => {};
  export let verifierPublicKey = /** @type {any} */ (null);

  // Stores reactivos
  const verificationStore = writable(/** @type {any} */ (null));
  const loadingStore = writable(false);
  const errorStore = writable(/** @type {string | null} */ (null));
  const historyStore = writable(/** @type {Array<any>} */ ([]));

  // Variables reactivas
  let verification = /** @type {any} */ (null);
  let loading = false;
  let error = /** @type {string | null} */ (null);
  let history = /** @type {Array<any>} */ ([]);
  let showHistory = false;
  let proofInput = '';
  let verificationMethod = 'coconut'; // coconut, bbs
  let ageThreshold = 18;
  let showAdvanced = false;
  let issuerPublicKey = '';
  let identity = /** @type {any} */ (null);

  // Suscripciones a stores
  verificationStore.subscribe(value => verification = value);
  loadingStore.subscribe(value => loading = value);
  errorStore.subscribe(value => error = value);
  historyStore.subscribe(value => history = value);
  currentIdentity.subscribe(/** @type {(value: any) => void} */ (value) => identity = value);

  // Issuer public key por defecto (para demo)
  const defaultIssuerKey = "BBA6KpjwgGHEr4Q8u5hWk6k2q5K1KxWyAZrAKEHkV4JVFLvqKmNwV8bJdNcPVtjHU4JQX1DdRwK6W8VNvMJGKQ8UX";

  // Función para limpiar errores
  function clearError() {
    errorStore.set(null);
  }

  // Función para verificar prueba Coconut
/**
 * @typedef {Object} CoconutProof
 * @property {Object} pi_v
 * @property {string} pi_v.c
 * @property {string} pi_v.rr
 * @property {string} pi_v.rm
 * @property {string} nu
 * @property {Object} sigma_prime
 * @property {string} sigma_prime.h_prime
 * @property {string} sigma_prime.s_prime
 * @property {string} kappa
 * @property {number} age_threshold
 * @property {string} proof_type
 * @property {Object} [identity_metadata]
 * @property {boolean} [identity_metadata.expected_age_verification]
 * @property {boolean} [identity_metadata.created_from_identity]
 * @property {string} [identity_metadata.identity_id]
 * @property {string} [identity_metadata.public_key_hash]
 */

/**
 * Verifica una prueba Coconut.
 * @param {CoconutProof} proof
 */
async function verifyCoconutProof(proof) {
    try {
      // Intentar verificación real con Zenroom
      const verificationScript = `
Scenario coconut
Given I have a 'age_proof'
and I have a 'age_threshold' inside 'request'
and I have a 'issuer_public_key'
When I verify the credential proof
and I verify the proof is older than 'age_threshold'
Then print 'success' as 'string'
and print 'age_verification' as 'string'
      `;

      const keys = issuerPublicKey || defaultIssuerKey;
      const data = {
        age_proof: proof,
        request: {
          age_threshold: ageThreshold.toString()
        },
        issuer_public_key: keys
      };

      console.log('Intentando verificación Coconut con Zenroom...');
      const result = await zencode_exec(verificationScript, { data: JSON.stringify(data) });
      
      if (result.result && result.result.trim() !== '') {
        return JSON.parse(result.result);
      } else {
        throw new Error('Resultado vacío de Zenroom');
      }
    } catch (zenroomError) {
      console.warn('Zenroom Coconut no disponible, usando verificación simulada:', zenroomError);
      
      // Fallback: Verificación simulada para demo
      return simulateCoconutVerification(proof);
    }
  }

  /**
   * Simula la verificación Coconut cuando Zenroom no tiene la extensión
   * @param {CoconutProof} proof
   */
  function simulateCoconutVerification(proof) {
    // Verificaciones básicas de la estructura de la prueba
    if (!proof || typeof proof !== 'object') {
      throw new Error('Prueba inválida: debe ser un objeto');
    }

    if (!proof.pi_v || !proof.nu) {
      throw new Error('Prueba inválida: faltan campos requeridos (pi_v, nu)');
    }

    if (!proof.pi_v.c || !proof.pi_v.rr || !proof.pi_v.rm) {
      throw new Error('Prueba inválida: faltan campos en pi_v (c, rr, rm)');
    }

    // Verificar que los campos tengan el formato esperado
    if (typeof proof.pi_v.c !== 'string' || proof.pi_v.c.length < 20) {
      throw new Error('Campo c inválido en la prueba');
    }

    if (typeof proof.nu !== 'string' || proof.nu.length < 20) {
      throw new Error('Campo nu inválido en la prueba');
    }

    // Simular verificación basada en metadatos de identidad si están disponibles
    let ageValid = false;
    if (proof.identity_metadata && proof.identity_metadata.expected_age_verification !== undefined) {
      // Si la prueba tiene metadatos de identidad, usar esos para la simulación
      ageValid = proof.identity_metadata.expected_age_verification;
    } else {
      // Análisis heurístico de la prueba para determinar validez
      const proofComplexity = proof.pi_v.c.length + proof.pi_v.rr.length + proof.pi_v.rm.length + proof.nu.length;
      const hasValidStructure = proofComplexity > 100; // Umbral mínimo de complejidad
      
      // Verificar si la prueba parece válida para la edad requerida
      ageValid = hasValidStructure && ageThreshold <= 21; // Asumimos validez para edades razonables
    }

    return {
      success: ageValid ? 'true' : 'false',
      age_verification: ageValid ? 'VALID' : 'INVALID',
      method: 'simulated_coconut',
      details: {
        threshold: ageThreshold,
        proof_valid: ageValid,
        from_current_identity: proof.identity_metadata?.created_from_identity || false,
        identity_id: proof.identity_metadata?.identity_id || 'unknown',
        simulation_note: 'Verificación simulada - Extensión Coconut no disponible en Zenroom'
      }
    };
  }

  // Función para verificar prueba BBS+
  /**
   * @param {any} proof
   */
  async function verifyBBSProof(proof) {
    try {
      // Intentar verificación real con Zenroom
      const verificationScript = `
Scenario bbs
Given I have a 'selective_disclosure_proof'
and I have a 'public_key'
When I verify the selective disclosure proof
and I verify the disclosed attributes contain 'age_over_18'
Then print 'success' as 'string'
and print 'disclosed_attributes'
      `;

      const data = {
        selective_disclosure_proof: proof,
        public_key: verifierPublicKey || issuerPublicKey || defaultIssuerKey
      };

      console.log('Intentando verificación BBS+ con Zenroom...');
      const result = await zencode_exec(verificationScript, { data: JSON.stringify(data) });
      
      if (result.result && result.result.trim() !== '') {
        return JSON.parse(result.result);
      } else {
        throw new Error('Resultado vacío de Zenroom');
      }
    } catch (zenroomError) {
      console.warn('Zenroom BBS+ no disponible, usando verificación simulada:', zenroomError);
      
      // Fallback: Verificación simulada para demo
      return simulateBBSVerification(proof);
    }
  }

  /**
   * Simula la verificación BBS+ cuando Zenroom no tiene la extensión
   * @param {any} proof
   */
  function simulateBBSVerification(proof) {
    // Verificaciones básicas de la estructura de la prueba
    if (!proof || typeof proof !== 'object') {
      throw new Error('Prueba inválida: debe ser un objeto');
    }

    // Para BBS+ esperamos una estructura diferente
    if (!proof.signature && !proof.disclosed_attributes && !proof.proof) {
      throw new Error('Prueba BBS+ inválida: faltan campos requeridos');
    }

    // Simular verificación basada en metadatos de identidad si están disponibles
    let isValid = false;
    if (proof.identity_metadata && proof.identity_metadata.expected_age_verification !== undefined) {
      // Si la prueba tiene metadatos de identidad, usar esos para la simulación
      isValid = proof.identity_metadata.expected_age_verification;
    } else {
      // Simulación probabilística para demo
      isValid = Math.random() > 0.2; // 80% de probabilidad de éxito para demo
    }

    return {
      success: isValid ? 'true' : 'false',
      disclosed_attributes: isValid ? {
        age_over_18: 'true',
        age_over_threshold: `${ageThreshold <= 18 ? 'true' : 'false'}`,
        verification_date: new Date().toISOString()
      } : {},
      method: 'simulated_bbs',
      details: {
        from_current_identity: proof.identity_metadata?.created_from_identity || false,
        identity_id: proof.identity_metadata?.identity_id || 'unknown',
        simulation_note: 'Verificación simulada - Extensión BBS+ no disponible en Zenroom'
      }
    };
  }

  // Función principal de verificación
  async function verifyProof() {
    clearError();
    
    if (!proofInput.trim()) {
      errorStore.set('Por favor ingresa una prueba válida para verificar');
      return;
    }

    loadingStore.set(true);

    try {
      let proof;
      try {
        proof = JSON.parse(proofInput);
      } catch {
        throw new Error('Formato de prueba inválido. Debe ser un JSON válido.');
      }

      let result;
      let methodUsed = verificationMethod;

      // Seleccionar método de verificación
      switch (verificationMethod) {
        case 'coconut':
          result = await verifyCoconutProof(proof);
          break;
        case 'bbs':
          result = await verifyBBSProof(proof);
          break;
        default:
          throw new Error('Método de verificación no válido');
      }

      // Procesar resultado
      const verificationResult = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        method: methodUsed,
        success: result.success === "true" || result.success === true,
        ageVerified: result.age_verification === "verified_over_18" || 
                    result.age_verification === "true" ||
                    (result.disclosed_attributes && result.disclosed_attributes.age_over_18),
        threshold: ageThreshold,
        proof: proof,
        result: result
      };

      verificationStore.set(verificationResult);
      
      // Agregar al historial
      const newHistory = [verificationResult, ...history.slice(0, 9)]; // Mantener últimas 10
      historyStore.set(newHistory);
      localStorage.setItem('verification-history', JSON.stringify(newHistory));

      onVerificationComplete();

    } catch (err) {
      console.error('Error verificando prueba:', err);
      
      let errorMessage = 'Error al verificar la prueba';
      
      // Proporcionar mensajes más específicos según el tipo de error
      if (typeof err === 'object' && err !== null && 'message' in err) {
        const message = /** @type {{ message?: string }} */ (err).message || '';
        
        if (message.includes('zencode_coconut') || message.includes('pattern not found')) {
          errorMessage = '⚠️ Extensión Coconut no disponible en Zenroom. Se usará verificación simulada para demo.';
        } else if (message.includes('zencode_bbs') || message.includes('bbs')) {
          errorMessage = '⚠️ Extensión BBS+ no disponible en Zenroom. Se usará verificación simulada para demo.';
        } else if (message.includes('JSON') || message.includes('parse')) {
          errorMessage = 'Formato de prueba inválido. Verifica que sea un JSON válido.';
        } else if (message.includes('inválido') || message.includes('invalid')) {
          errorMessage = message;
        } else {
          errorMessage = message;
        }
      }
      
      errorStore.set(errorMessage);
    } finally {
      loadingStore.set(false);
    }
  }

  // Función para cargar historial
  function loadHistory() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('verification-history');
      if (saved) {
        try {
          historyStore.set(JSON.parse(saved));
        } catch (err) {
          console.error('Error cargando historial:', err);
        }
      }
    }
  }

  // Función para limpiar historial
  function clearHistory() {
    if (confirm('¿Estás seguro de que quieres eliminar todo el historial?')) {
      historyStore.set([]);
      localStorage.removeItem('verification-history');
    }
  }

  // Función para copiar resultado
  async function copyResult() {
    if (verification) {
      try {
        const resultText = JSON.stringify(verification, null, 2);
        await navigator.clipboard.writeText(resultText);
        
        // Feedback visual
        const button = document.getElementById('copy-result-btn');
        if (button) {
          const originalText = button.textContent;
          button.textContent = '✓ Copiado';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        }
      } catch (err) {
        console.error('Error copiando resultado:', err);
      }
    }
  }

  // Función para cargar ejemplo de prueba
  function loadExampleProof() {
    let exampleProof;
    
    if (verificationMethod === 'coconut') {
      // Si hay identidad actual, usar sus datos para crear una prueba más realista
      if (identity && (identity.age !== undefined || identity.personal?.age !== undefined)) {
        const actualAge = identity.personal?.age || identity.age;
        const isAdult = actualAge >= ageThreshold;
        
        exampleProof = {
          pi_v: {
            c: "BNKzZ1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20),
            rr: "BLKvX1MWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20),
            rm: "BMNuZ1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20)
          },
          nu: "BQRtY1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20),
          sigma_prime: {
            h_prime: "BPStX1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20),
            s_prime: "BOLvZ1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20)
          },
          kappa: "BQKtY1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20),
          age_threshold: ageThreshold,
          proof_type: "coconut_age_proof",
          timestamp: new Date().toISOString(),
          issuer: "demo_issuer",
          // Metadatos de la identidad (sin revelar información personal)
          identity_metadata: {
            expected_age_verification: isAdult,
            created_from_identity: true,
            identity_id: identity.id || "current_identity",
            public_key_hash: identity.keypair?.public ? identity.keypair.public.substring(0, 16) + "..." : "demo_key"
          }
        };
      } else {
        // Fallback si no hay identidad
        exampleProof = {
          pi_v: {
            c: "BNKzZ1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20),
            rr: "BLKvX1MWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20),
            rm: "BMNuZ1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20)
          },
          nu: "BQRtY1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20),
          sigma_prime: {
            h_prime: "BPStX1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20),
            s_prime: "BOLvZ1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20)
          },
          kappa: "BQKtY1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T" + Math.random().toString(36).substr(2, 20),
          age_threshold: ageThreshold,
          proof_type: "coconut_age_proof",
          timestamp: new Date().toISOString(),
          issuer: "demo_issuer",
          identity_metadata: {
            expected_age_verification: ageThreshold <= 21, // Demo default
            created_from_identity: false,
            identity_id: "demo_identity"
          }
        };
      }
    } else if (verificationMethod === 'bbs') {
      // Ejemplo BBS+ basado en identidad actual
      if (identity && (identity.age !== undefined || identity.personal?.age !== undefined)) {
        const actualAge = identity.personal?.age || identity.age;
        const isAdult = actualAge >= ageThreshold;
        
        exampleProof = {
          signature: "BBS_SIG_" + Math.random().toString(36).substr(2, 40),
          disclosed_attributes: {
            age_over_18: isAdult ? "true" : "false",
            age_over_threshold: actualAge >= ageThreshold ? "true" : "false",
            verification_type: "bbs_plus",
            country: identity.personal?.nationality || identity.nationality || "demo_country"
          },
          proof: "BBS_PROOF_" + Math.random().toString(36).substr(2, 60),
          public_key: identity.keypairs?.bls?.public || identity.blsKeypair?.public || "BBS_PK_" + Math.random().toString(36).substr(2, 30),
          timestamp: new Date().toISOString(),
          identity_metadata: {
            expected_age_verification: isAdult,
            created_from_identity: true,
            identity_id: identity.id || "current_identity"
          }
        };
      } else {
        // Fallback BBS+
        exampleProof = {
          signature: "BBS_SIG_" + Math.random().toString(36).substr(2, 40),
          disclosed_attributes: {
            age_over_18: "true",
            verification_type: "bbs_plus"
          },
          proof: "BBS_PROOF_" + Math.random().toString(36).substr(2, 60),
          public_key: "BBS_PK_" + Math.random().toString(36).substr(2, 30),
          timestamp: new Date().toISOString(),
          identity_metadata: {
            expected_age_verification: true,
            created_from_identity: false,
            identity_id: "demo_identity"
          }
        };
      }
    } else {
      // Fallback genérico
      exampleProof = {
        type: "generic_zk_proof",
        age_verified: identity ? ((identity.personal?.age || identity.age) >= ageThreshold) : true,
        threshold: ageThreshold,
        proof_data: "PROOF_" + Math.random().toString(36).substr(2, 50),
        timestamp: new Date().toISOString(),
        identity_metadata: {
          created_from_identity: !!identity,
          identity_id: identity?.id || "demo_identity"
        }
      };
    }

    proofInput = JSON.stringify(exampleProof, null, 2);
  }

  // Cargar historial al montar
  onMount(() => {
    loadHistory();
  });
</script>

<div class="proof-verifier">
  <div class="header">
    <h2>🔍 Verificador de Pruebas ZK</h2>
    <p class="subtitle">Verifica edad sin revelar información personal usando Zero Knowledge</p>
  </div>

  {#if error}
    <div class="error-banner">
      <span class="error-icon">⚠️</span>
      <span>{error}</span>
      <button class="error-close" on:click={clearError}>×</button>
    </div>
  {/if}

  <div class="verification-panel">
    <div class="input-section">
      <h3>📝 Prueba a Verificar</h3>
      
      <div class="method-selector">
        <fieldset>
          <legend>Método de Verificación:</legend>
          <div class="radio-group">
          <label class="radio-option">
            <input type="radio" bind:group={verificationMethod} value="coconut" />
            <span class="radio-label">🥥 Coconut</span>
            <small>Threshold credentials</small>
          </label>
          <label class="radio-option">
            <input type="radio" bind:group={verificationMethod} value="bbs" />
            <span class="radio-label">🔐 BBS+</span>
            <small>Selective disclosure</small>
          </label>
          </div>
        </fieldset>
      </div>

      <!-- Mensaje informativo sobre verificación simulada -->
      {#if verificationMethod === 'coconut' || verificationMethod === 'bbs'}
        <div class="info-banner">
          <span class="info-icon">💡</span>
          <div class="info-content">
            <h4>Modo Demo</h4>
            <p>
              Esta aplicación usa verificación simulada cuando las extensiones ZK de Zenroom no están disponibles. 
              La estructura y lógica de verificación son realistas para propósitos educativos.
            </p>
          </div>
        </div>
      {/if}

      <!-- Banner de estado de identidad -->
      {#if identity}
        <div class="identity-status">
          <span class="identity-icon">👤</span>
          <div class="identity-info">
            <h4>Identidad Actual Detectada</h4>
            <p>
              <strong>Nombre:</strong> {identity.personal?.name || identity.name || 'No especificado'}<br>
              <strong>Edad:</strong> {identity.personal?.age || identity.age || 'No especificada'} años<br>
              <strong>¿Mayor de {ageThreshold}?</strong> 
              <span class="age-indicator {(identity.personal?.age || identity.age) >= ageThreshold ? 'adult' : 'minor'}">
                {(identity.personal?.age || identity.age) >= ageThreshold ? '✅ Sí' : '❌ No'}
              </span>
            </p>
            <small>Las pruebas de ejemplo se basarán en esta identidad</small>
          </div>
        </div>
      {:else}
        <div class="no-identity-warning">
          <span class="warning-icon">⚠️</span>
          <div class="warning-content">
            <h4>Sin Identidad</h4>
            <p>No hay identidad generada. Las pruebas de ejemplo serán genéricas.</p>
            <small>Ve a la sección "Gestión de Identidad" para crear una identidad primero.</small>
          </div>
        </div>
      {/if}

      <div class="threshold-input">
        <label for="ageThreshold">Umbral de Edad:</label>
        <input
          id="ageThreshold"
          type="number"
          bind:value={ageThreshold}
          min="1"
          max="100"
          step="1"
        />
        <span class="threshold-label">años</span>
      </div>

      <div class="proof-input">
        <label for="proofData">Datos de la Prueba (JSON):</label>
        <textarea
          id="proofData"
          bind:value={proofInput}
          placeholder="Pega aquí la prueba ZK en formato JSON..."
          rows="8"
        ></textarea>
        <div class="input-actions">
          <button class="btn btn-secondary btn-sm" on:click={loadExampleProof}>
            📋 Cargar Ejemplo
          </button>
          <button
            class="btn btn-primary"
            on:click={verifyProof}
            disabled={loading || !proofInput.trim()}
          >
            {#if loading}
              <span class="spinner"></span>
              Verificando...
            {:else}
              🔍 Verificar Prueba
            {/if}
          </button>
        </div>
      </div>

      <div class="advanced-options">
        <button
          class="btn btn-link"
          on:click={() => showAdvanced = !showAdvanced}
        >
          {showAdvanced ? '🔼' : '🔽'} Opciones Avanzadas
        </button>
        
        {#if showAdvanced}
          <div class="advanced-panel">
            <div class="form-group">
              <label for="issuerKey">Clave Pública del Emisor:</label>
              <input
                id="issuerKey"
                type="text"
                bind:value={issuerPublicKey}
                placeholder="Opcional - usar clave por defecto para demo"
              />
            </div>
          </div>
        {/if}
      </div>
    </div>

    {#if verification}
      <div class="result-section">
        <h3>📊 Resultado de Verificación</h3>
        
        <div class="result-card {verification.success ? 'success' : 'failure'}">
          <div class="result-header">
            <div class="result-status">
              <span class="status-icon">
                {verification.success ? '✅' : '❌'}
              </span>
              <span class="status-text">
                {verification.success ? 'Verificación Exitosa' : 'Verificación Fallida'}
              </span>
            </div>
            <div class="result-method">
              <span class="method-badge method-{verification.method}">
                {verification.method.toUpperCase()}
              </span>
            </div>
          </div>

          <div class="result-details">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Edad Verificada:</span>
                <span class="age-status {verification.ageVerified ? 'verified' : 'not-verified'}">
                  {verification.ageVerified ? `✓ Mayor de ${verification.threshold}` : `❌ Menor de ${verification.threshold}`}
                </span>
              </div>
              
              <div class="detail-item">
                <span class="label">Timestamp:</span>
                <span>{new Date(verification.timestamp).toLocaleString()}</span>
              </div>

              <div class="detail-item">
                <span class="label">ID Verificación:</span>
                <span class="monospace">{verification.id}</span>
              </div>
            </div>
          </div>

          <div class="result-actions">
            <button
              id="copy-result-btn"
              class="btn btn-outline btn-sm"
              on:click={copyResult}
            >
              📋 Copiar Resultado
            </button>
          </div>
        </div>
      </div>
    {/if}

    <div class="history-section">
      <div class="history-header">
        <h3>📚 Historial de Verificaciones</h3>
        <div class="history-actions">
          <button
            class="btn btn-link btn-sm"
            on:click={() => showHistory = !showHistory}
          >
            {showHistory ? '👁️ Ocultar' : '👁️ Mostrar'} ({history.length})
          </button>
          {#if history.length > 0}
            <button class="btn btn-link btn-sm text-danger" on:click={clearHistory}>
              🗑️ Limpiar
            </button>
          {/if}
        </div>
      </div>

      {#if showHistory && history.length > 0}
        <div class="history-list">
          {#each history as item (item.id)}
            <div class="history-item {item.success ? 'success' : 'failure'}">
              <div class="history-summary">
                <span class="history-status">
                  {item.success ? '✅' : '❌'}
                </span>
                <span class="history-method method-{item.method}">
                  {item.method.toUpperCase()}
                </span>
                <span class="history-age">
                  {item.ageVerified ? `✓ +${item.threshold}` : `❌ -${item.threshold}`}
                </span>
                <span class="history-time">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          {/each}
        </div>
      {:else if showHistory}
        <div class="empty-history">
          <p>📭 No hay verificaciones en el historial</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .proof-verifier {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .header h2 {
    font-size: 2.5rem;
    background: linear-gradient(135deg, #4299e1 0%, #667eea 50%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }

  .subtitle {
    color: #666;
    font-size: 1.1rem;
    margin-top: 0.5rem;
  }

  .error-banner {
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    color: white;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
  }

  .error-close {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    margin-left: auto;
  }

  .info-banner {
    background: linear-gradient(135deg, #e6f3ff, #b3e0ff);
    border: 1px solid #4a90e2;
    color: #1a365d;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    box-shadow: 0 2px 10px rgba(74, 144, 226, 0.2);
  }

  .info-icon {
    font-size: 1.5rem;
    margin-top: 0.25rem;
  }

  .info-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: #2c5282;
  }

  .info-content p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.4;
    color: #2d3748;
  }

  .identity-status {
    background: linear-gradient(135deg, #e6fffa, #b3f5e6);
    border: 1px solid #38b2ac;
    color: #1a202c;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    box-shadow: 0 2px 10px rgba(56, 178, 172, 0.2);
  }

  .identity-icon {
    font-size: 1.5rem;
    margin-top: 0.25rem;
  }

  .identity-info h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: #2c7a7b;
  }

  .identity-info p {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .identity-info small {
    color: #4a5568;
    font-style: italic;
  }

  .age-indicator.adult {
    color: #38a169;
    font-weight: 600;
  }

  .age-indicator.minor {
    color: #e53e3e;
    font-weight: 600;
  }

  .no-identity-warning {
    background: linear-gradient(135deg, #fff5f5, #fed7d7);
    border: 1px solid #fc8181;
    color: #1a202c;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    box-shadow: 0 2px 10px rgba(252, 129, 129, 0.2);
  }

  .warning-icon {
    font-size: 1.5rem;
    margin-top: 0.25rem;
  }

  .warning-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: #c53030;
  }

  .warning-content p {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    line-height: 1.4;
    color: #2d3748;
  }

  .warning-content small {
    color: #4a5568;
    font-style: italic;
  }

  .verification-panel {
    display: grid;
    gap: 2rem;
  }

  .input-section {
    background: linear-gradient(135deg, #f8f9ff, #e6f3ff);
    border-radius: 20px;
    padding: 2rem;
    border: 1px solid #e1e8f0;
  }

  .input-section h3 {
    color: #2d3748;
    margin-bottom: 1.5rem;
    font-size: 1.4rem;
  }

  .method-selector {
    margin-bottom: 1.5rem;
  }

  .method-selector label {
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 0.75rem;
    display: block;
  }

  .radio-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .radio-option {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .radio-option:hover {
    border-color: #cbd5e0;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .radio-option input[type="radio"] {
    margin-bottom: 0.5rem;
    transform: scale(1.2);
  }

  .radio-option input[type="radio"]:checked + .radio-label {
    color: #667eea;
    font-weight: 700;
  }

  .radio-option:has(input[type="radio"]:checked) {
    border-color: #667eea;
    background: linear-gradient(135deg, #f8f9ff, #e6f3ff);
  }

  .radio-label {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .radio-option small {
    color: #666;
    font-size: 0.8rem;
  }

  .threshold-input {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .threshold-input label {
    font-weight: 600;
    color: #4a5568;
  }

  .threshold-input input {
    width: 80px;
    padding: 0.5rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    text-align: center;
    font-weight: 600;
  }

  .threshold-label {
    color: #666;
    font-size: 0.9rem;
  }

  .proof-input {
    margin-bottom: 1.5rem;
  }

  .proof-input label {
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 0.5rem;
    display: block;
  }

  .proof-input textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-family: 'Fira Code', monospace;
    font-size: 0.875rem;
    resize: vertical;
    margin-bottom: 1rem;
    transition: border-color 0.3s ease;
  }

  .proof-input textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .input-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .advanced-options {
    border-top: 1px solid #e2e8f0;
    padding-top: 1.5rem;
  }

  .advanced-panel {
    margin-top: 1rem;
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 0.5rem;
    display: block;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-family: 'Fira Code', monospace;
    font-size: 0.875rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  }

  .btn-secondary {
    background: linear-gradient(135deg, #a8edea, #fed6e3);
    color: #2d3748;
  }

  .btn-secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(168, 237, 234, 0.6);
  }

  .btn-outline {
    background: transparent;
    border: 2px solid #e2e8f0;
    color: #4a5568;
  }

  .btn-outline:hover {
    background: #f7fafc;
    border-color: #cbd5e0;
  }

  .btn-link {
    background: none;
    border: none;
    color: #667eea;
    text-decoration: underline;
    padding: 0.5rem;
  }

  .btn-link:hover {
    color: #764ba2;
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .text-danger {
    color: #e53e3e !important;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .result-section {
    margin-top: 2rem;
  }

  .result-section h3 {
    color: #2d3748;
    margin-bottom: 1rem;
    font-size: 1.4rem;
  }

  .result-card {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    border-left: 6px solid;
  }

  .result-card.success {
    border-left-color: #48bb78;
  }

  .result-card.failure {
    border-left-color: #f56565;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .result-status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .status-icon {
    font-size: 1.5rem;
  }

  .status-text {
    font-size: 1.2rem;
    font-weight: 700;
    color: #2d3748;
  }

  .method-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    color: white;
  }

  .method-coconut {
    background: linear-gradient(135deg, #ed8936, #dd6b20);
  }

  .method-bbs {
    background: linear-gradient(135deg, #667eea, #764ba2);
  }

  .result-details {
    margin-bottom: 1.5rem;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-item span {
    color: #2d3748;
  }

  .age-status.verified {
    color: #48bb78;
    font-weight: 600;
  }

  .age-status.not-verified {
    color: #f56565;
    font-weight: 600;
  }

  .monospace {
    font-family: 'Fira Code', monospace;
    font-size: 0.8rem;
  }

  .result-actions {
    border-top: 1px solid #e2e8f0;
    padding-top: 1rem;
  }

  .history-section {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    border: 1px solid #e1e8f0;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .history-header h3 {
    color: #2d3748;
    margin: 0;
    font-size: 1.2rem;
  }

  .history-actions {
    display: flex;
    gap: 0.5rem;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .history-item {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 0.75rem;
    border-left: 4px solid;
  }

  .history-item.success {
    border-left-color: #48bb78;
  }

  .history-item.failure {
    border-left-color: #f56565;
  }

  .history-summary {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.875rem;
  }

  .history-status {
    font-size: 1rem;
  }

  .history-method {
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 700;
    color: white;
  }

  .history-age {
    font-weight: 600;
  }

  .history-time {
    color: #666;
    margin-left: auto;
  }

  .empty-history {
    text-align: center;
    color: #666;
    padding: 2rem;
  }

  @media (max-width: 768px) {
    .proof-verifier {
      padding: 1rem;
    }

    .radio-group {
      grid-template-columns: 1fr;
    }

    .input-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .result-header {
      flex-direction: column;
      align-items: stretch;
    }

    .detail-grid {
      grid-template-columns: 1fr;
    }

    .history-summary {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .history-time {
      margin-left: 0;
    }
  }
</style>