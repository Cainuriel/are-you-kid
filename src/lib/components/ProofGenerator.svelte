<script>
  import { onMount } from 'svelte';
  import { writable, get } from 'svelte/store';
  import { createAgeProof } from '$lib/crypto/bbs-provider.js';
  import { createCoconutAgeProof } from '$lib/crypto/coconut-provider.js';
  import { currentIdentity } from '$lib/crypto/stores/identity.js';

  // Props
  /** @type {(proof: any) => void} */
  export let onProofGenerated = (/** @type {any} */ proof) => {};

  // Stores reactivos
  const proofStore = writable(/** @type {any} */ (null));
  const loadingStore = writable(false);
  const errorStore = writable(/** @type {string | null} */ (null));

  // Variables reactivas
  let identity = /** @type {any} */ (null);
  let proof = /** @type {any} */ (null);
  let loading = false;
  let error = /** @type {string | null} */ (null);
  let proofType = 'bbs_plus'; // 'bbs_plus' o 'coconut'
  let ageThreshold = 18;
  let showProofDetails = false;

  // Suscripciones a stores
  currentIdentity.subscribe(value => identity = value);
  proofStore.subscribe(value => proof = value);
  loadingStore.subscribe(value => loading = value);
  errorStore.subscribe(value => error = value);

  // Función para limpiar errores
  function clearError() {
    errorStore.set(null);
  }

  // Función para generar prueba BBS+
  async function generateBBSProof() {
    clearError();
    loadingStore.set(true);

    try {
      if (!identity) {
        throw new Error('No hay identidad disponible. Crea una identidad primero.');
      }

      console.log('🔐 Generando prueba BBS+ para verificación de edad...');
      
      const proofData = await createAgeProof({ 
        credentialId: identity.id, 
        ageThreshold: ageThreshold 
      });

      const generatedProof = {
        id: crypto.randomUUID(),
        type: 'bbs_plus',
        timestamp: new Date().toISOString(),
        threshold: ageThreshold,
        proof: proofData,
        identity_id: identity.id,
        metadata: {
          protocol: 'BBS+ Signatures',
          curve: 'BLS12-381',
          selective_disclosure: true,
          created_by: identity.personal.name
        }
      };

      proofStore.set(generatedProof);
      
      if (typeof onProofGenerated === 'function') {
        onProofGenerated(generatedProof);
      }

      console.log('✅ Prueba BBS+ generada exitosamente');

    } catch (err) {
      console.error('❌ Error generando prueba BBS+:', err);
      errorStore.set(err instanceof Error ? err.message : 'Error al generar la prueba BBS+');
    } finally {
      loadingStore.set(false);
    }
  }

  // Función para generar prueba Coconut
  async function generateCoconutProof() {
    clearError();
    loadingStore.set(true);

    try {
      if (!identity) {
        throw new Error('No hay identidad disponible. Crea una identidad primero.');
      }

      console.log('🥥 Generando prueba Coconut simulada para verificación de edad...');
      
      const proofData = await createCoconutAgeProof(identity, ageThreshold);

      const generatedProof = {
        id: crypto.randomUUID(),
        type: 'coconut',
        timestamp: new Date().toISOString(),
        threshold: ageThreshold,
        proof: proofData,
        identity_id: identity.id,
        metadata: {
          protocol: 'Coconut Credentials',
          curve: 'BLS12-381',
          selective_disclosure: true,
          simulation: true,
          created_by: identity.personal.name
        }
      };

      proofStore.set(generatedProof);
      
      if (typeof onProofGenerated === 'function') {
        onProofGenerated(generatedProof);
      }

      console.log('✅ Prueba Coconut generada exitosamente (simulación inteligente)');

    } catch (err) {
      console.error('❌ Error generando prueba Coconut:', err);
      errorStore.set(err instanceof Error ? err.message : 'Error al generar la prueba Coconut');
    } finally {
      loadingStore.set(false);
    }
  }

  // Función principal para generar prueba
  async function generateProof() {
    if (proofType === 'bbs_plus') {
      await generateBBSProof();
    } else if (proofType === 'coconut') {
      await generateCoconutProof();
    } else {
      errorStore.set('Tipo de prueba no válido');
    }
  }

  // Función para exportar prueba
  function exportProof() {
    if (proof) {
      const exportData = {
        ...proof,
        exported_at: new Date().toISOString(),
        exported_by: identity?.personal?.name || 'Usuario'
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proof-${proof.type}-${proof.id.substring(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  // Función para copiar prueba al portapapeles
  async function copyProof() {
    if (proof) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(proof, null, 2));
        // Mostrar feedback visual
        const button = document.getElementById('copy-proof-btn');
        if (button) {
          button.textContent = '✓ Copiado';
          setTimeout(() => {
            button.textContent = 'Copiar Prueba';
          }, 2000);
        }
      } catch (err) {
        console.error('Error copiando al portapapeles:', err);
      }
    }
  }

  // Función para limpiar la prueba
  function clearProof() {
    proofStore.set(null);
  }
</script>

<div class="proof-generator">
  <div class="header">
    <h2>🔐 Generador de Pruebas ZK</h2>
    <p class="subtitle">Crea pruebas criptográficas para verificación de edad con BLS12-381</p>
  </div>

  {#if error}
    <div class="error-banner">
      <span class="error-icon">⚠️</span>
      <span>{error}</span>
      <button class="error-close" on:click={clearError}>×</button>
    </div>
  {/if}

  {#if !identity}
    <div class="no-identity">
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <h3>No hay identidad disponible</h3>
        <p>Necesitas crear o cargar una identidad antes de generar pruebas.</p>
      </div>
    </div>
  {:else}
    <div class="generator-content">
      <!-- Configuración de la prueba -->
      <div class="proof-config">
        <h3>⚙️ Configuración de la Prueba</h3>
        
        <div class="config-group">
          <label for="proof-type">Tipo de Protocolo:</label>
          <select id="proof-type" bind:value={proofType}>
            <option value="bbs_plus">BBS+ (Real Cryptography)</option>
            <option value="coconut">Coconut (Intelligent Simulation)</option>
          </select>
        </div>

        <div class="config-group">
          <label for="age-threshold">Umbral de Edad:</label>
          <select id="age-threshold" bind:value={ageThreshold}>
            <option value={18}>18+ años</option>
            <option value={21}>21+ años</option>
          </select>
        </div>

        <div class="identity-info">
          <h4>👤 Identidad Actual</h4>
          <div class="identity-details">
            <p><strong>Nombre:</strong> {identity.personal.name}</p>
            <p><strong>Edad:</strong> {identity.personal.age} años</p>
            <p><strong>País:</strong> {identity.personal.country}</p>
            <p><strong>Estado:</strong> 
              <span class="badge {identity.personal.age >= 18 ? 'adult' : 'minor'}">
                {identity.personal.age >= 18 ? '🔞 Mayor de edad' : '🚫 Menor de edad'}
              </span>
            </p>
          </div>
        </div>

        <button 
          class="generate-btn" 
          on:click={generateProof}
          disabled={loading}
        >
          {#if loading}
            <span class="spinner"></span> Generando...
          {:else}
            🔐 Generar Prueba {proofType === 'bbs_plus' ? 'BBS+' : 'Coconut'}
          {/if}
        </button>
      </div>

      <!-- Resultado de la prueba -->
      {#if proof}
        <div class="proof-result">
          <div class="result-header">
            <h3>✅ Prueba Generada Exitosamente</h3>
            <div class="proof-type-badge {proof.type}">
              {proof.type === 'bbs_plus' ? '🔐 BBS+' : '🥥 Coconut'}
            </div>
          </div>

          <div class="proof-summary">
            <div class="summary-item">
              <span class="label">ID:</span>
              <span class="value">{proof.id.substring(0, 8)}...</span>
            </div>
            <div class="summary-item">
              <span class="label">Protocolo:</span>
              <span class="value">{proof.metadata.protocol}</span>
            </div>
            <div class="summary-item">
              <span class="label">Umbral:</span>
              <span class="value">{proof.threshold}+ años</span>
            </div>
            <div class="summary-item">
              <span class="label">Creado:</span>
              <span class="value">{new Date(proof.timestamp).toLocaleString()}</span>
            </div>
            {#if proof.metadata.simulation}
              <div class="summary-item">
                <span class="label">Modo:</span>
                <span class="value simulation">🧠 Simulación Inteligente</span>
              </div>
            {/if}
          </div>

          <div class="proof-actions">
            <button class="action-btn primary" on:click={() => showProofDetails = !showProofDetails}>
              {showProofDetails ? '🔼' : '🔽'} {showProofDetails ? 'Ocultar' : 'Ver'} Detalles
            </button>
            <button class="action-btn" id="copy-proof-btn" on:click={copyProof}>
              📋 Copiar Prueba
            </button>
            <button class="action-btn" on:click={exportProof}>
              💾 Exportar JSON
            </button>
            <button class="action-btn danger" on:click={clearProof}>
              🗑️ Limpiar
            </button>
          </div>

          {#if showProofDetails}
            <div class="proof-details">
              <h4>🔍 Detalles Técnicos</h4>
              <div class="details-content">
                <pre>{JSON.stringify(proof, null, 2)}</pre>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .proof-generator {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 30px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
  }

  .header h2 {
    margin: 0 0 10px 0;
    font-size: 2rem;
  }

  .subtitle {
    margin: 0;
    opacity: 0.9;
    font-size: 1.1rem;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px;
    background-color: #fee2e2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    margin-bottom: 20px;
    color: #dc2626;
  }

  .error-close {
    margin-left: auto;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #dc2626;
  }

  .no-identity {
    text-align: center;
    padding: 60px 20px;
  }

  .empty-state {
    max-width: 400px;
    margin: 0 auto;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 20px;
  }

  .generator-content {
    display: grid;
    gap: 30px;
  }

  .proof-config {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 25px;
  }

  .proof-config h3 {
    margin: 0 0 20px 0;
    color: #374151;
  }

  .config-group {
    margin-bottom: 20px;
  }

  .config-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #374151;
  }

  .config-group select {
    width: 100%;
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
  }

  .identity-info {
    margin-top: 25px;
    padding: 20px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }

  .identity-info h4 {
    margin: 0 0 15px 0;
    color: #374151;
  }

  .identity-details p {
    margin: 8px 0;
    display: flex;
    justify-content: space-between;
  }

  .badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .badge.adult {
    background-color: #dcfce7;
    color: #166534;
  }

  .badge.minor {
    background-color: #fee2e2;
    color: #dc2626;
  }

  .generate-btn {
    width: 100%;
    padding: 15px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 20px;
  }

  .generate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .generate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .proof-result {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 25px;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .result-header h3 {
    margin: 0;
    color: #059669;
  }

  .proof-type-badge {
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .proof-type-badge.bbs_plus {
    background-color: #dbeafe;
    color: #1d4ed8;
  }

  .proof-type-badge.coconut {
    background-color: #fef3c7;
    color: #d97706;
  }

  .proof-summary {
    display: grid;
    gap: 12px;
    margin-bottom: 25px;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    background: #f9fafb;
    border-radius: 6px;
  }

  .summary-item .label {
    font-weight: 600;
    color: #6b7280;
  }

  .summary-item .value {
    color: #374151;
  }

  .summary-item .value.simulation {
    color: #d97706;
    font-weight: 600;
  }

  .proof-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .action-btn {
    padding: 10px 16px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: #f9fafb;
  }

  .action-btn.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .action-btn.primary:hover {
    background: #2563eb;
  }

  .action-btn.danger {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
  }

  .action-btn.danger:hover {
    background: #dc2626;
  }

  .proof-details {
    margin-top: 25px;
    padding: 20px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }

  .proof-details h4 {
    margin: 0 0 15px 0;
    color: #374151;
  }

  .details-content {
    background: #1f2937;
    color: #f9fafb;
    padding: 15px;
    border-radius: 6px;
    overflow-x: auto;
  }

  .details-content pre {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  @media (max-width: 640px) {
    .proof-generator {
      padding: 15px;
    }
    
    .proof-actions {
      flex-direction: column;
    }
    
    .action-btn {
      width: 100%;
    }
  }
</style>
