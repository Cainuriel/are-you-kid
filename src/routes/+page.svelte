<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import IdentityManager from '$lib/components/IdentityManager.svelte';
  import ProofVerifier from '$lib/components//ProofVerifier.svelte';
  // import ProofGenerator from '$lib/components/crypto/ProofGenerator.svelte';

  // Stores globales
  const currentIdentity = writable(/** @type {any} */ (null));
  const currentProof = writable(/** @type {any} */ (null));
  const verificationResults = writable(/** @type {Array<any>} */ ([]));
  const activeTab = writable('identity');

  // Variables reactivas
  let identity = /** @type {any} */ (null);
  let proof = /** @type {any} */ (null);
  let results = /** @type {Array<any>} */ ([]);
  let activeTabValue = 'identity';
  let showWelcome = true;
  let demoStats = {
    identitiesCreated: 0,
    proofsGenerated: 0,
    verificationsCompleted: 0
  };

  // Suscripciones
  currentIdentity.subscribe(value => identity = value);
  currentProof.subscribe(value => proof = value);
  verificationResults.subscribe(value => results = value);
  activeTab.subscribe(value => activeTabValue = value);

  // Función para manejar creación de identidad
  function handleIdentityCreated(/** @type {any} */ newIdentity) {
    currentIdentity.set(newIdentity);
    demoStats.identitiesCreated++;
    updateStats();
    
    // Auto-navegar a generador de pruebas
    setTimeout(() => {
      activeTab.set('generator');
    }, 1000);
  }

  // Función para manejar carga de identidad
  function handleIdentityLoaded(/** @type {any} */ loadedIdentity) {
    currentIdentity.set(loadedIdentity);
  }

  // Función para manejar generación de pruebas
  function handleProofGenerated(/** @type {any} */ newProof) {
    currentProof.set(newProof);
    demoStats.proofsGenerated++;
    updateStats();
    
    // Auto-navegar a verificador
    setTimeout(() => {
      activeTab.set('verifier');
    }, 1000);
  }

  // Función para manejar verificación completa
  function handleVerificationComplete(/** @type {any} */ result) {
    const newResults = [result, ...results.slice(0, 19)]; // Mantener últimas 20
    verificationResults.set(newResults);
    demoStats.verificationsCompleted++;
    updateStats();
  }

  // Función para actualizar estadísticas
  function updateStats() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo-stats', JSON.stringify(demoStats));
    }
  }

  // Función para cargar estadísticas
  function loadStats() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('demo-stats');
      if (saved) {
        try {
          demoStats = { ...demoStats, ...JSON.parse(saved) };
        } catch (err) {
          console.error('Error cargando estadísticas:', err);
        }
      }
    }
  }

  // Función para cambiar tab
  function changeTab(/** @type {string} */ tab) {
    activeTab.set(tab);
  }

  // Función para resetear demo
  function resetDemo() {
    if (confirm('¿Estás seguro de que quieres resetear toda la demo? Esto eliminará todas las identidades, pruebas y verificaciones.')) {
      currentIdentity.set(null);
      currentProof.set(null);
      verificationResults.set([]);
      demoStats = {
        identitiesCreated: 0,
        proofsGenerated: 0,
        verificationsCompleted: 0
      };
      
      // Limpiar localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zenroom-identity');
        localStorage.removeItem('verification-history');
        localStorage.removeItem('demo-stats');
      }
      
      activeTab.set('identity');
      showWelcome = true;
    }
  }

  // Función para cerrar welcome
  function dismissWelcome() {
    showWelcome = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem('welcome-dismissed', 'true');
    }
  }

  // Cargar datos al montar
  onMount(() => {
    loadStats();
    
    // Verificar si el welcome ya fue cerrado
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('welcome-dismissed');
      if (dismissed === 'true') {
        showWelcome = false;
      }
    }
  });
</script>

<svelte:head>
  <title>Demo ZK Identity - Zenroom + SvelteKit</title>
  <meta name="description" content="Demostración de identidad digital con Zero Knowledge usando Zenroom y SvelteKit" />
</svelte:head>

<div class="app">
  <!-- Header -->
  <header class="main-header">
    <div class="header-content">
      <div class="logo-section">
        <h1>Are you a Kid?</h1>
        <p>Identidad Digital con Zero Knowledge</p>
      </div>
      <div class="header-actions">
        <div class="stats-display">
          <div class="stat-item">
            <span class="stat-number">{demoStats.identitiesCreated}</span>
            <span class="stat-label">Identidades</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{demoStats.proofsGenerated}</span>
            <span class="stat-label">Pruebas</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{demoStats.verificationsCompleted}</span>
            <span class="stat-label">Verificaciones</span>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" on:click={resetDemo}>
          🔄 Reset Demo
        </button>
      </div>
    </div>
  </header>

  <!-- Welcome Banner -->
  {#if showWelcome}
    <div class="welcome-banner">
      <div class="welcome-content">
        <h2>🎉 Bienvenido a la Demo de Identidad Digital ZK</h2>
        <p>
          Esta demostración muestra cómo usar <strong>Zenroom</strong> con <strong>SvelteKit</strong> 
          para crear aplicaciones de identidad digital que preservan la privacidad.
        </p>
        <div class="welcome-features">
          <div class="feature">
            <span class="feature-icon">🔐</span>
            <span>Verifica edad sin revelar información personal</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🌐</span>
            <span>Integración blockchain para verificaciones on-chain</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🚀</span>
            <span>Protocolos ZK avanzados (Coconut, BBS+)</span>
          </div>
        </div>
        <div class="welcome-actions">
          <button class="btn btn-primary" on:click={() => changeTab('identity')}>
            🚀 Comenzar Demo
          </button>
          <button class="btn btn-link" on:click={dismissWelcome}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Navigation Tabs -->
  <nav class="tab-navigation">
    <button 
      class="tab-button {activeTabValue === 'identity' ? 'active' : ''}"
      on:click={() => changeTab('identity')}
    >
      <span class="tab-icon">👤</span>
      <span class="tab-label">Identidad</span>
      {#if identity}
        <span class="tab-badge">✓</span>
      {/if}
    </button>

    <button 
      class="tab-button {activeTabValue === 'generator' ? 'active' : ''}"
      on:click={() => changeTab('generator')}
      disabled={!identity}
    >
      <span class="tab-icon">🔐</span>
      <span class="tab-label">Generar Prueba</span>
      {#if proof}
        <span class="tab-badge">✓</span>
      {/if}
    </button>

    <button 
      class="tab-button {activeTabValue === 'verifier' ? 'active' : ''}"
      on:click={() => changeTab('verifier')}
    >
      <span class="tab-icon">🔍</span>
      <span class="tab-label">Verificar</span>
      {#if results.length > 0}
        <span class="tab-badge">{results.length}</span>
      {/if}
    </button>

    <button 
      class="tab-button {activeTabValue === 'blockchain' ? 'active' : ''}"
      on:click={() => changeTab('blockchain')}
    >
      <span class="tab-icon">⛓️</span>
      <span class="tab-label">Blockchain</span>
    </button>
  </nav>

  <!-- Main Content -->
  <main class="main-content">
    <!-- Identity Tab -->
    {#if activeTabValue === 'identity'}
      <div class="tab-content">
        <div class="tab-header">
          <h2>👤 Gestión de Identidad</h2>
          <p>Crea o importa tu identidad digital criptográfica</p>
        </div>
        
        <IdentityManager 
          onIdentityCreated={handleIdentityCreated}
          onIdentityLoaded={handleIdentityLoaded}
        />
        
        {#if identity}
          <div class="next-step">
            <p>✅ Identidad creada exitosamente</p>
            <button class="btn btn-primary" on:click={() => changeTab('generator')}>
              Siguiente: Generar Prueba ZK →
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Proof Generator Tab -->
    {#if activeTabValue === 'generator'}
      <div class="tab-content">
        <div class="tab-header">
          <h2>🔐 Generador de Pruebas ZK</h2>
          <p>Crea pruebas de edad sin revelar información personal</p>
        </div>
        
        {#if !identity}
          <div class="requirement-message">
            <span class="requirement-icon">⚠️</span>
            <div>
              <h3>Identidad Requerida</h3>
              <p>Primero necesitas crear una identidad digital</p>
              <button class="btn btn-primary" on:click={() => changeTab('identity')}>
                Crear Identidad
              </button>
            </div>
          </div>
        {:else}
          <!-- Aquí iría el componente ProofGenerator cuando esté disponible -->
          <div class="placeholder-component">
            <div class="placeholder-content">
              <h3>🚧 Generador de Pruebas ZK</h3>
              <p>Componente en construcción...</p>
              <div class="placeholder-features">
                <div class="feature-preview">
                  <span class="feature-icon">🥥</span>
                  <span>Pruebas Coconut para threshold credentials</span>
                </div>
                <div class="feature-preview">
                  <span class="feature-icon">🔐</span>
                  <span>Pruebas BBS+ para selective disclosure</span>
                </div>
                <div class="feature-preview">
                  <span class="feature-icon">📅</span>
                  <span>Verificación de edad sin revelar fecha exacta</span>
                </div>
              </div>
              <p class="placeholder-note">
                Mientras tanto, puedes usar el verificador con pruebas de ejemplo
              </p>
              <button class="btn btn-primary" on:click={() => changeTab('verifier')}>
                Ir al Verificador
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Proof Verifier Tab -->
    {#if activeTabValue === 'verifier'}
      <div class="tab-content">
        <div class="tab-header">
          <h2>🔍 Verificador de Pruebas ZK</h2>
          <p>Verifica edad sin acceder a información personal</p>
        </div>
        
        <ProofVerifier 
          onVerificationComplete={handleVerificationComplete}
          allowBlockchainVerification={true}
        />
      </div>
    {/if}

    <!-- Blockchain Tab -->
    {#if activeTabValue === 'blockchain'}
      <div class="tab-content">
        <div class="tab-header">
          <h2>⛓️ Integración Blockchain</h2>
          <p>Verificación on-chain y smart contracts</p>
        </div>
        
        <div class="blockchain-section">
          <div class="blockchain-card">
            <h3>🔗 Conexión Web3</h3>
            <p>Conecta tu wallet para verificaciones on-chain</p>
            <button class="btn btn-primary" disabled>
              🦊 Conectar MetaMask
            </button>
            <p class="note">Funcionalidad en desarrollo</p>
          </div>

          <div class="blockchain-card">
            <h3>📜 Smart Contracts</h3>
            <p>Contratos inteligentes para verificación ZK</p>
            <div class="contract-list">
              <div class="contract-item">
                <span class="contract-name">AgeVerifier.sol</span>
                <span class="contract-status">📋 Plantilla</span>
              </div>
              <div class="contract-item">
                <span class="contract-name">CoconutVerifier.sol</span>
                <span class="contract-status">📋 Plantilla</span>
              </div>
              <div class="contract-item">
                <span class="contract-name">BBSVerifier.sol</span>
                <span class="contract-status">📋 Plantilla</span>
              </div>
            </div>
          </div>

          <div class="blockchain-card">
            <h3>📊 Estadísticas On-Chain</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-value">0</span>
                <span class="stat-label">Verificaciones</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">0</span>
                <span class="stat-label">Gas Usado</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">0</span>
                <span class="stat-label">Contratos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="main-footer">
    <div class="footer-content">
      <div class="footer-section">
        <h4>🔐 Zenroom</h4>
        <p>Máquina virtual criptográfica para Zero Knowledge</p>
        <a href="https://zenroom.org" target="_blank" rel="noopener">
          Documentación →
        </a>
      </div>
      <div class="footer-section">
        <h4>🚀 SvelteKit</h4>
        <p>Framework web moderno y reactivo</p>
        <a href="https://kit.svelte.dev" target="_blank" rel="noopener">
          Aprende más →
        </a>
      </div>
      <div class="footer-section">
        <h4>🌐 Blockchain</h4>
        <p>Integración con redes descentralizadas</p>
        <a href="https://ethereum.org" target="_blank" rel="noopener">
          Ethereum →
        </a>
      </div>
    </div>
    <div class="footer-bottom">
      <p>Demo de Identidad Digital ZK - Construido con ❤️ por fernando lopez</p>
    </div>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main-header {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding: 1rem 0;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .logo-section h1 {
    font-size: 2rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }

  .logo-section p {
    color: #666;
    margin: 0.25rem 0 0 0;
    font-size: 0.9rem;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .stats-display {
    display: flex;
    gap: 1rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: 700;
    color: #667eea;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #666;
    text-transform: uppercase;
    font-weight: 600;
  }

  .welcome-banner {
    background: linear-gradient(135deg, #f8f9ff, #e6f3ff);
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    padding: 2rem 0;
    margin-bottom: 2rem;
  }

  .welcome-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 2rem;
    text-align: center;
  }

  .welcome-content h2 {
    color: #2d3748;
    margin-bottom: 1rem;
    font-size: 2rem;
  }

  .welcome-content p {
    color: #4a5568;
    font-size: 1.1rem;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .welcome-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: white;
    padding: 1rem;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }

  .feature-icon {
    font-size: 1.5rem;
  }

  .welcome-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .tab-navigation {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    padding: 1rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .tab-navigation {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 2rem;
    flex-wrap: wrap;
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 600;
    color: #4a5568;
    text-decoration: none;
    position: relative;
  }

  .tab-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e0;
  }

  .tab-button.active {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-color: #667eea;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }

  .tab-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .tab-icon {
    font-size: 1.2rem;
  }

  .tab-badge {
    background: #48bb78;
    color: white;
    font-size: 0.7rem;
    padding: 0.125rem 0.375rem;
    border-radius: 8px;
    font-weight: 700;
  }

  .tab-button.active .tab-badge {
    background: rgba(255, 255, 255, 0.3);
  }

  .main-content {
    flex: 1;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    width: 100%;
  }

  .tab-content {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .tab-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .tab-header h2 {
    color: #2d3748;
    margin-bottom: 0.5rem;
    font-size: 2rem;
  }

  .tab-header p {
    color: #666;
    font-size: 1.1rem;
  }

  .next-step {
    text-align: center;
    margin-top: 2rem;
    padding: 2rem;
    background: linear-gradient(135deg, #f0fff4, #e6fffa);
    border-radius: 16px;
    border: 1px solid #9ae6b4;
  }

  .next-step p {
    color: #2f855a;
    font-weight: 600;
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .requirement-message {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: linear-gradient(135deg, #fef5e7, #fed7aa);
    border: 1px solid #fbbf24;
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
  }

  .requirement-icon {
    font-size: 3rem;
  }

  .requirement-message h3 {
    color: #92400e;
    margin-bottom: 0.5rem;
  }

  .requirement-message p {
    color: #a16207;
    margin-bottom: 1rem;
  }

  .placeholder-component {
    text-align: center;
    padding: 3rem;
    background: linear-gradient(135deg, #f8f9ff, #e6f3ff);
    border-radius: 20px;
    border: 2px dashed #cbd5e0;
  }

  .placeholder-content h3 {
    color: #2d3748;
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  .placeholder-content p {
    color: #666;
    margin-bottom: 2rem;
  }

  .placeholder-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .feature-preview {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: white;
    padding: 1rem;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }

  .placeholder-note {
    color: #667eea;
    font-style: italic;
    margin-bottom: 1rem;
  }

  .blockchain-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }

  .blockchain-card {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
  }

  .blockchain-card h3 {
    color: #2d3748;
    margin-bottom: 1rem;
  }

  .blockchain-card p {
    color: #666;
    margin-bottom: 1.5rem;
  }

  .contract-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .contract-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .contract-name {
    font-family: 'Fira Code', monospace;
    font-weight: 600;
    color: #2d3748;
  }

  .contract-status {
    font-size: 0.875rem;
    color: #666;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .stat-card {
    text-align: center;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .stat-value {
    display: block;
    font-size: 2rem;
    font-weight: 700;
    color: #667eea;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
    font-weight: 600;
  }

  .note {
    color: #a0aec0;
    font-size: 0.875rem;
    margin-top: 0.5rem;
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

  .main-footer {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    padding: 3rem 0 1rem;
    margin-top: 4rem;
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
  }

  .footer-section h4 {
    color: #2d3748;
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .footer-section p {
    color: #666;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .footer-section a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
  }

  .footer-section a:hover {
    color: #764ba2;
    text-decoration: underline;
  }

  .footer-bottom {
    text-align: center;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #e2e8f0;
    color: #666;
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      text-align: center;
    }

    .stats-display {
      flex-wrap: wrap;
      justify-content: center;
    }

    .main-content {
      padding: 1rem;
    }

    .tab-content {
      padding: 1rem;
    }

    .welcome-content {
      padding: 0 1rem;
    }

    .welcome-features {
      grid-template-columns: 1fr;
    }

    .blockchain-section {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .footer-content {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .requirement-message {
      flex-direction: column;
      text-align: center;
    }
  }
</style>
