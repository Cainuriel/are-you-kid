<!-- ProofGenerator.svelte -->
<script>
  import { zencode_exec } from 'zenroom';
  import { currentIdentity } from '$lib/crypto/stores/identity.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  // Estados del componente
  let userAge = '';
  let generating = false;
  let generatedProof = /** @type {any} */ (null);
  let error = /** @type {string | null} */ (null);
  let showProofDetails = false;

  // Configuración para diferentes tipos de prueba
  let proofType = 'age_verification'; // 'age_verification', 'range_proof', 'selective_disclosure'
  
  // Datos para la demo
  let userData = {
    name: 'Alice',
    age: '',
    country: 'Spain',
    city: 'Madrid'
  };

  $: {
    userData.age = userAge;
  }

  /**
   * Genera una prueba ZK de verificación de edad usando Coconut
   */
  async function generateAgeProof() {
    if (!userAge || parseInt(userAge) < 1 || parseInt(userAge) > 120) {
      error = 'Por favor ingresa una edad válida (1-120)';
      return;
    }

    generating = true;
    error = null;
    
    try {
      // Primero crear el keypair si no existe
      let identity = $currentIdentity;
      if (!identity) {
        identity = await createIdentityKeypair();
      }

      // Script Zencode para generar prueba de edad
      const proofScript = `
        Scenario coconut
        Given that I am known as '${userData.name}'
        and I have my 'credential keypair'
        and I have a 'user_age' equal to '${userAge}'
        and I have a 'age_threshold' equal to '18'
        and I have a 'timestamp' equal to '${Date.now()}'
        When I create the credential proof
        and I prove I am older than 'age_threshold'
        and I create a random 'nonce' of '16' bytes
        Then print the 'age_proof'
        and print the 'verification_key'
        and print the 'nonce'
      `;

      const data = {
        credential_keypair: identity.credential_keypair,
        user_age: parseInt(userAge),
        age_threshold: 18,
        timestamp: Date.now()
      };

      console.log('Generando prueba con datos:', data);
      
      const result = await zencode_exec(proofScript, { data: JSON.stringify(data) });
      const proofData = JSON.parse(result.result);
      
      generatedProof = {
        type: 'age_verification',
        proof: proofData.age_proof,
        verification_key: proofData.verification_key,
        nonce: proofData.nonce,
        timestamp: Date.now(),
        isOver18: parseInt(userAge) >= 18,
        metadata: {
          issuer: userData.name,
          proofType: 'coconut_age_verification',
          ageThreshold: 18
        }
      };

      // Dispatch evento para notificar que se generó la prueba
      dispatch('proofGenerated', generatedProof);
      
    } catch (err) {
      console.error('Error generando prueba:', err);
      error = `Error al generar la prueba: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      generating = false;
    }
  }

  /**
   * Genera prueba de selective disclosure usando BBS+
   */
  async function generateSelectiveDisclosureProof() {
    generating = true;
    error = null;
    
    try {
      const selectiveScript = `
        Scenario bbs
        Given that I am known as '${userData.name}'
        and I have my 'keypair'
        and I have my 'credential_data'
        When I create the bbs signature of 'credential_data'
        and I select attributes 'age_over_18' and 'country'
        and I create the selective disclosure proof
        Then print the 'selective_proof'
        and print the 'disclosed_attributes'
      `;

      const credentialData = {
        name: userData.name,
        age_over_18: parseInt(userAge) >= 18,
        country: userData.country,
        city: userData.city
      };

      // Simular BBS+ keypair (en producción vendría del identity store)
      const bbsKeypair = await generateBBSKeypair();
      
      const data = {
        keypair: bbsKeypair,
        credential_data: credentialData
      };

      const result = await zencode_exec(selectiveScript, { data: JSON.stringify(data) });
      const proofData = JSON.parse(result.result);
      
      generatedProof = {
        type: 'selective_disclosure',
        proof: proofData.selective_proof,
        disclosed_attributes: proofData.disclosed_attributes,
        timestamp: Date.now(),
        metadata: {
          proofType: 'bbs_selective_disclosure',
          revealedFields: ['age_over_18', 'country']
        }
      };

      dispatch('proofGenerated', generatedProof);
      
    } catch (err) {
      console.error('Error en selective disclosure:', err);
      error = `Error al generar prueba selectiva: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      generating = false;
    }
  }

  /**
   * Crea un keypair de identidad usando Coconut
   */
  async function createIdentityKeypair() {
    const keypairScript = `
      Scenario coconut
      Given nothing
      When I create the credential keypair
      and I create a random 'identity_secret' of '32' bytes
      Then print the 'credential keypair'
      and print the 'identity_secret'
    `;

    const result = await zencode_exec(keypairScript);
    const identity = JSON.parse(result.result);
    
    // Guardar en el store
    currentIdentity.set(identity);
    
    return identity;
  }

  /**
   * Genera un keypair BBS+ (simulado para la demo)
   */
  async function generateBBSKeypair() {
    const bbsScript = `
      Scenario bbs
      Given nothing
      When I create the bbs keypair
      Then print the 'keypair'
    `;

    const result = await zencode_exec(bbsScript);
    return JSON.parse(result.result).keypair;
  }

  /**
   * Copia la prueba al clipboard
   */
  async function copyProofToClipboard() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(generatedProof, null, 2));
      // Mostrar feedback visual temporal
      const button = document.querySelector('#copy-button');
      if (button) {
        const originalText = button.textContent;
        button.textContent = '¡Copiado!';
        setTimeout(() => {
          if (button) {
            button.textContent = originalText;
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Error copiando:', err);
    }
  }

  /**
   * Resetea el formulario
   */
  function resetForm() {
    userAge = '';
    generatedProof = null;
    error = null;
    showProofDetails = false;
  }
</script>

<div class="proof-generator">
  <div class="card">
    <div class="card-header">
      <h3>🔐 Generador de Pruebas Zero Knowledge</h3>
      <p class="subtitle">Demuestra que eres mayor de 18 años sin revelar tu edad exacta</p>
    </div>

    <div class="form-section">
      <!-- Selector de tipo de prueba -->
      <div class="field">
        <label for="proof-type">Tipo de Prueba:</label>
        <select id="proof-type" bind:value={proofType}>
          <option value="age_verification">Verificación de Edad (Coconut)</option>
          <option value="selective_disclosure">Divulgación Selectiva (BBS+)</option>
        </select>
      </div>

      <!-- Datos del usuario -->
      <div class="user-data">
        <div class="field">
          <label for="user-name">Nombre:</label>
          <input 
            id="user-name" 
            type="text" 
            bind:value={userData.name}
            placeholder="Tu nombre"
          />
        </div>

        <div class="field">
          <label for="user-age">Tu Edad:</label>
          <input 
            id="user-age" 
            type="number" 
            bind:value={userAge}
            min="1" 
            max="120"
            placeholder="Ejemplo: 25"
            required
          />
        </div>

        {#if proofType === 'selective_disclosure'}
          <div class="field">
            <label for="user-country">País:</label>
            <input 
              id="user-country" 
              type="text" 
              bind:value={userData.country}
              placeholder="Tu país"
            />
          </div>
        {/if}
      </div>

      <!-- Botones de acción -->
      <div class="actions">
        {#if proofType === 'age_verification'}
          <button 
            class="btn btn-primary"
            on:click={generateAgeProof}
            disabled={generating || !userAge}
          >
            {#if generating}
              <span class="spinner"></span>
              Generando Prueba...
            {:else}
              🧮 Generar Prueba de Edad
            {/if}
          </button>
        {:else}
          <button 
            class="btn btn-primary"
            on:click={generateSelectiveDisclosureProof}
            disabled={generating || !userAge}
          >
            {#if generating}
              <span class="spinner"></span>
              Generando Prueba...
            {:else}
              🎯 Generar Divulgación Selectiva
            {/if}
          </button>
        {/if}

        {#if generatedProof}
          <button class="btn btn-secondary" on:click={resetForm}>
            🔄 Nuevo
          </button>
        {/if}
      </div>
    </div>

    <!-- Mostrar errores -->
    {#if error}
      <div class="error-message">
        <span class="error-icon">⚠️</span>
        {error}
      </div>
    {/if}

    <!-- Resultado de la prueba -->
    {#if generatedProof}
      <div class="proof-result">
        <div class="result-header">
          <h4>✅ Prueba Generada Exitosamente</h4>
          <div class="result-badges">
            <span class="badge {generatedProof.isOver18 !== false ? 'badge-success' : 'badge-warning'}">
              {generatedProof.isOver18 !== false ? '✓ Mayor de 18' : '⚠ Menor de 18'}
            </span>
            <span class="badge badge-info">
              {generatedProof.type === 'age_verification' ? 'Coconut' : 'BBS+'}
            </span>
          </div>
        </div>

        <div class="proof-summary">
          <div class="summary-item">
            <strong>Tipo:</strong> {generatedProof.metadata.proofType}
          </div>
          <div class="summary-item">
            <strong>Timestamp:</strong> {new Date(generatedProof.timestamp).toLocaleString()}
          </div>
          {#if generatedProof.disclosed_attributes}
            <div class="summary-item">
              <strong>Atributos Revelados:</strong> 
              {Object.keys(generatedProof.disclosed_attributes).join(', ')}
            </div>
          {/if}
        </div>

        <div class="proof-actions">
          <button 
            id="copy-button"
            class="btn btn-outline" 
            on:click={copyProofToClipboard}
          >
            📋 Copiar Prueba
          </button>
          
          <button 
            class="btn btn-outline"
            on:click={() => showProofDetails = !showProofDetails}
          >
            {showProofDetails ? '📦 Ocultar' : '🔍 Ver'} Detalles
          </button>
        </div>

        {#if showProofDetails}
          <div class="proof-details">
            <h5>Detalles Técnicos de la Prueba:</h5>
            <pre class="json-display">{JSON.stringify(generatedProof, null, 2)}</pre>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Información educativa -->
    <div class="info-section">
      <details>
        <summary>ℹ️ ¿Cómo funciona esta prueba?</summary>
        <div class="info-content">
          {#if proofType === 'age_verification'}
            <p><strong>Prueba Coconut:</strong> Utiliza criptografía threshold para generar una prueba que demuestra que tu edad es mayor a 18 años sin revelar tu edad exacta.</p>
            <p><strong>Ventajas:</strong> Privacidad total, verificación rápida, soporte para múltiples emisores.</p>
          {:else}
            <p><strong>BBS+ Selective Disclosure:</strong> Permite revelar solo los atributos específicos que elijas (como "mayor de 18" y "país") mientras mantiene privado el resto de tu información.</p>
            <p><strong>Ventajas:</strong> Control granular sobre qué información revelar, unlinkability entre transacciones.</p>
          {/if}
        </div>
      </details>
    </div>
  </div>
</div>

<style>
  .proof-generator {
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
  }

  .card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }

  .card-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem;
    text-align: center;
  }

  .card-header h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .subtitle {
    margin: 0;
    opacity: 0.9;
    font-size: 0.9rem;
  }

  .form-section {
    padding: 1.5rem;
  }

  .field {
    margin-bottom: 1rem;
  }

  .field label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  .field input, .field select {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  .field input:focus, .field select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .user-data {
    background: #f9fafb;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 1.5rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
  }

  .btn-outline {
    background: white;
    color: #667eea;
    border: 2px solid #667eea;
  }

  .btn-outline:hover {
    background: #667eea;
    color: white;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-message {
    background: #fef2f2;
    color: #dc2626;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid #fecaca;
  }

  .proof-result {
    margin: 1.5rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    overflow: hidden;
  }

  .result-header {
    background: #dcfce7;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .result-header h4 {
    margin: 0;
    color: #15803d;
  }

  .result-badges {
    display: flex;
    gap: 0.5rem;
  }

  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .badge-success {
    background: #22c55e;
    color: white;
  }

  .badge-warning {
    background: #f59e0b;
    color: white;
  }

  .badge-info {
    background: #3b82f6;
    color: white;
  }

  .proof-summary {
    padding: 1rem;
  }

  .summary-item {
    margin-bottom: 0.5rem;
    color: #374151;
  }

  .proof-actions {
    padding: 1rem;
    border-top: 1px solid #bbf7d0;
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .proof-details {
    border-top: 1px solid #bbf7d0;
    padding: 1rem;
    background: white;
  }

  .proof-details h5 {
    margin: 0 0 1rem 0;
    color: #374151;
  }

  .json-display {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 1rem;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.875rem;
    color: #374151;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .info-section {
    margin: 1.5rem;
    border-top: 1px solid #e5e7eb;
    padding-top: 1rem;
  }

  .info-section details {
    cursor: pointer;
  }

  .info-section summary {
    font-weight: 500;
    color: #374151;
    padding: 0.5rem 0;
  }

  .info-content {
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
    margin-top: 0.5rem;
  }

  .info-content p {
    margin: 0 0 0.75rem 0;
    color: #6b7280;
    line-height: 1.5;
  }

  .info-content p:last-child {
    margin-bottom: 0;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .proof-generator {
      padding: 0.5rem;
    }
    
    .result-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .actions, .proof-actions {
      flex-direction: column;
    }
    
    .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>