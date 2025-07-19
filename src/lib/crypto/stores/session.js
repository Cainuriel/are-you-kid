import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// Constantes de protocolos ZK actualizadas
export const ZK_PROTOCOLS = {
  BBS_PLUS: 'bbs_plus',
  COCONUT: 'coconut_simulation'
};

export const PREDICATES = {
  AGE_OVER: 'age_over',
  AGE_UNDER: 'age_under',
  COUNTRY_IS: 'country_is',
  CUSTOM: 'custom'
};

/**
 * Store de sesión criptográfica usando Svelte stores
 * Maneja configuración global, preferencias y estado de la aplicación
 */

// Store principal de configuración de sesión
export const sessionConfig = writable({
  initialized: false,
  version: '1.0',
  theme: 'light',
  language: 'es',
  autoSave: true,
  debugMode: false
});

// Store de estado de conexión
export const connectionStatus = writable({
  online: true,
  lastSync: null,
  syncEnabled: true,
  serverConnected: false
});

// Store de configuración de protocolos ZK
export const zkConfig = writable({
  defaultProtocol: ZK_PROTOCOLS.BBS_PLUS, // Cambiar a BBS+ como predeterminado
  ageThreshold: 18,
  enableBatchVerification: false, // Deshabilitado para simplicidad
  maxProofAge: 3600000, // 1 hora en ms
  trustedIssuers: /** @type {Array<any>} */ ([]),
  verificationEndpoints: /** @type {Array<any>} */ ([]),
  cryptoProvider: 'bls12_381' // Nuevo campo
});

// Store de configuración blockchain (deshabilitado)
export const blockchainConfig = writable({
  enabled: false, // Deshabilitado completamente
  network: 'none',
  rpcUrl: null,
  chainId: null,
  gasLimit: 0,
  contracts: {
    verifier: null,
    registry: null
  }
});

// Store de preferencias de usuario
export const userPreferences = writable({
  notifications: {
    enabled: true,
    sound: false,
    desktop: true,
    verificationAlerts: true,
    errorAlerts: true
  },
  privacy: {
    autoDeleteProofs: false,
    proofRetentionDays: 30,
    shareAnalytics: false,
    minimizeDataExposure: true
  },
  ui: {
    showAdvancedOptions: false,
    compactMode: false,
    showTechnicalDetails: false,
    animationsEnabled: true
  }
});

// Store de historial de operaciones
export const operationHistory = writable(/** @type {Array<any>} */ ([]));

// Store de estadísticas de sesión
export const sessionStats = writable({
  startTime: /** @type {string | null} */ (null),
  totalOperations: 0,
  successfulVerifications: 0,
  failedVerifications: 0,
  proofsGenerated: 0,
  identitiesCreated: 0,
  errors: 0
});

// Store de errores globales
export const globalErrors = writable(/** @type {Array<any>} */ ([]));

// Store de notificaciones
export const notifications = writable(/** @type {Array<any>} */ ([]));

// Store derivado para estado de la aplicación
export const appState = derived(
  [sessionConfig, connectionStatus, zkConfig],
  ([$sessionConfig, $connectionStatus, $zkConfig]) => ({
    ready: $sessionConfig.initialized && $connectionStatus.online,
    canCreateProofs: $sessionConfig.initialized && $zkConfig.defaultProtocol,
    canVerifyProofs: $sessionConfig.initialized,
    debugMode: $sessionConfig.debugMode,
    version: $sessionConfig.version
  })
);

// Store derivado para configuración completa
export const fullConfig = derived(
  [sessionConfig, zkConfig, blockchainConfig, userPreferences],
  ([$sessionConfig, $zkConfig, $blockchainConfig, $userPreferences]) => ({
    session: $sessionConfig,
    zk: $zkConfig,
    blockchain: $blockchainConfig,
    user: $userPreferences
  })
);

// Constantes para localStorage
const STORAGE_KEYS = {
  SESSION: 'zkapp-session-config',
  ZK_CONFIG: 'zkapp-zk-config',
  BLOCKCHAIN_CONFIG: 'zkapp-blockchain-config',
  USER_PREFS: 'zkapp-user-preferences',
  OPERATION_HISTORY: 'zkapp-operation-history',
  SESSION_STATS: 'zkapp-session-stats'
};

/**
 * Clase para manejo del store de sesión
 */
class SessionStore {
  constructor() {
    this.initialized = false;
    this.startTime = Date.now();
    
    // Inicializar automáticamente en el navegador
    if (browser) {
      this.initialize();
    }
  }

  /**
   * Inicializa la sesión cargando configuración guardada
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.loadFromStorage();
      this.setupEventListeners();
      this.startSession();
      this.initialized = true;

    } catch (error) {
      console.error('Error inicializando sesión:', error);
      this.addError('session_init', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Inicia una nueva sesión
   */
  startSession() {
    const now = new Date().toISOString();
    
    sessionStats.update(stats => ({
      ...stats,
      startTime: now
    }));

    sessionConfig.update(config => ({
      ...config,
      initialized: true
    }));

    this.addNotification('success', 'Sesión iniciada correctamente', {
      timestamp: now,
      autoHide: true
    });
  }

  /**
   * Configura listeners de eventos
   */
  setupEventListeners() {
    if (!browser) return;

    // Listener para cambios de conexión
    window.addEventListener('online', () => {
      connectionStatus.update(status => ({ ...status, online: true }));
      this.addNotification('info', 'Conexión restaurada');
    });

    window.addEventListener('offline', () => {
      connectionStatus.update(status => ({ ...status, online: false }));
      this.addNotification('warning', 'Sin conexión a internet');
    });

    // Listener para antes de cerrar
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });

    // Auto-save periódico
    setInterval(() => {
      const config = get(sessionConfig);
      if (config.autoSave) {
        this.saveToStorage();
      }
    }, 30000); // Cada 30 segundos
  }

  /**
   * Actualiza configuración de protocolo ZK
   * @param {any} updates - Actualizaciones de configuración
   */
  updateZKConfig(updates) {
    zkConfig.update(config => ({
      ...config,
      ...updates
    }));

    this.logOperation('config_update', 'ZK configuration updated', { updates });
    this.saveToStorage();
  }

  /**
   * Actualiza configuración blockchain
   * @param {any} updates - Actualizaciones de configuración
   */
  updateBlockchainConfig(updates) {
    blockchainConfig.update(config => ({
      ...config,
      ...updates
    }));

    this.logOperation('config_update', 'Blockchain configuration updated', { updates });
    this.saveToStorage();
  }

  /**
   * Actualiza preferencias de usuario
   * @param {any} updates - Actualizaciones de preferencias
   */
  updateUserPreferences(updates) {
    userPreferences.update(prefs => ({
      ...prefs,
      ...updates
    }));

    this.saveToStorage();
  }

  /**
   * Agrega un emisor confiable
   * @param {any} issuer - Datos del emisor
   */
  addTrustedIssuer(issuer) {
    if (!issuer.id || !issuer.publicKey) {
      throw new Error('Datos de emisor inválidos');
    }

    zkConfig.update(config => ({
      ...config,
      trustedIssuers: [...config.trustedIssuers, {
        ...issuer,
        addedAt: new Date().toISOString()
      }]
    }));

    this.logOperation('issuer_add', 'Trusted issuer added', { issuerId: issuer.id });
    this.addNotification('success', `Emisor ${issuer.name} agregado`);
    this.saveToStorage();
  }

  /**
   * Remueve un emisor confiable
   * @param {string} issuerId - ID del emisor
   */
  removeTrustedIssuer(issuerId) {
    zkConfig.update(config => ({
      ...config,
      trustedIssuers: config.trustedIssuers.filter(issuer => issuer.id !== issuerId)
    }));

    this.logOperation('issuer_remove', 'Trusted issuer removed', { issuerId });
    this.addNotification('info', 'Emisor removido');
    this.saveToStorage();
  }

  /**
   * Registra una operación en el historial
   * @param {string} type - Tipo de operación
   * @param {string} description - Descripción
   * @param {any} metadata - Metadatos adicionales
   */
  logOperation(type, description, metadata = {}) {
    const operation = {
      id: this.generateOperationId(),
      type,
      description,
      timestamp: new Date().toISOString(),
      metadata,
      sessionId: this.getSessionId()
    };

    operationHistory.update(history => {
      const newHistory = [operation, ...history];
      // Mantener solo las últimas 100 operaciones
      return newHistory.slice(0, 100);
    });

    // Actualizar estadísticas
    sessionStats.update(stats => ({
      ...stats,
      totalOperations: stats.totalOperations + 1
    }));
  }

  /**
   * Incrementa contador de verificaciones exitosas
   */
  incrementSuccessfulVerifications() {
    sessionStats.update(stats => ({
      ...stats,
      successfulVerifications: stats.successfulVerifications + 1
    }));
  }

  /**
   * Incrementa contador de verificaciones fallidas
   */
  incrementFailedVerifications() {
    sessionStats.update(stats => ({
      ...stats,
      failedVerifications: stats.failedVerifications + 1
    }));
  }

  /**
   * Incrementa contador de pruebas generadas
   */
  incrementProofsGenerated() {
    sessionStats.update(stats => ({
      ...stats,
      proofsGenerated: stats.proofsGenerated + 1
    }));
  }

  /**
   * Incrementa contador de identidades creadas
   */
  incrementIdentitiesCreated() {
    sessionStats.update(stats => ({
      ...stats,
      identitiesCreated: stats.identitiesCreated + 1
    }));
  }

  /**
   * Agrega un error global
   * @param {string} type - Tipo de error
   * @param {string} message - Mensaje de error
   * @param {any} metadata - Metadatos adicionales
   */
  addError(type, message, metadata = {}) {
    const error = {
      id: this.generateErrorId(),
      type,
      message,
      timestamp: new Date().toISOString(),
      metadata,
      resolved: false
    };

    globalErrors.update(errors => [error, ...errors.slice(0, 49)]); // Máximo 50 errores

    sessionStats.update(stats => ({
      ...stats,
      errors: stats.errors + 1
    }));

    // Mostrar notificación si está habilitada
    const prefs = get(userPreferences);
    if (prefs.notifications.errorAlerts) {
      this.addNotification('error', message);
    }
  }

  /**
   * Resuelve un error
   * @param {string} errorId - ID del error
   */
  resolveError(errorId) {
    globalErrors.update(errors => 
      errors.map(error => 
        error.id === errorId ? { ...error, resolved: true } : error
      )
    );
  }

  /**
   * Limpia todos los errores
   */
  clearErrors() {
    globalErrors.set([]);
  }

  /**
   * Agrega una notificación
   * @param {string} type - Tipo (success, error, warning, info)
   * @param {string} message - Mensaje
   * @param {any} options - Opciones adicionales
   */
  addNotification(type, message, options = {}) {
    const notification = {
      id: this.generateNotificationId(),
      type,
      message,
      timestamp: new Date().toISOString(),
      autoHide: options.autoHide || false,
      duration: options.duration || 5000,
      action: options.action || null
    };

    notifications.update(notifications => [notification, ...notifications.slice(0, 19)]); // Máximo 20

    // Auto-hide si está configurado
    if (notification.autoHide) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.duration);
    }
  }

  /**
   * Remueve una notificación
   * @param {string} notificationId - ID de la notificación
   */
  removeNotification(notificationId) {
    notifications.update(notifications => 
      notifications.filter(notification => notification.id !== notificationId)
    );
  }

  /**
   * Limpia todas las notificaciones
   */
  clearNotifications() {
    notifications.set([]);
  }

  /**
   * Obtiene estadísticas de la sesión actual
   * @returns {any} Estadísticas
   */
  getSessionStatistics() {
    const stats = get(sessionStats);
    const history = get(operationHistory);
    const errors = get(globalErrors);
    const config = get(sessionConfig);

    const now = Date.now();
    const sessionDuration = stats.startTime ? now - new Date(stats.startTime).getTime() : 0;

    return {
      ...stats,
      sessionDuration,
      sessionDurationFormatted: this.formatDuration(sessionDuration),
      recentOperations: history.slice(0, 10),
      activeErrors: errors.filter(error => !error.resolved).length,
      totalErrors: errors.length,
      debugMode: config.debugMode,
      operationsPerMinute: sessionDuration > 0 ? (stats.totalOperations / (sessionDuration / 60000)).toFixed(2) : 0
    };
  }

  /**
   * Exporta configuración completa
   * @returns {any} Configuración exportada
   */
  exportConfiguration() {
    return {
      session: get(sessionConfig),
      zk: get(zkConfig),
      blockchain: get(blockchainConfig),
      user: get(userPreferences),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Importa configuración
   * @param {any} config - Configuración a importar
   */
  importConfiguration(config) {
    if (!config.version) {
      throw new Error('Configuración inválida: falta versión');
    }

    if (config.session) {
      sessionConfig.set({ ...get(sessionConfig), ...config.session });
    }

    if (config.zk) {
      zkConfig.set({ ...get(zkConfig), ...config.zk });
    }

    if (config.blockchain) {
      blockchainConfig.set({ ...get(blockchainConfig), ...config.blockchain });
    }

    if (config.user) {
      userPreferences.set({ ...get(userPreferences), ...config.user });
    }

    this.saveToStorage();
    this.addNotification('success', 'Configuración importada correctamente');
  }

  /**
   * Reset completo de la sesión
   */
  resetSession() {
    // Limpiar stores
    sessionConfig.set({
      initialized: false,
      version: '1.0',
      theme: 'light',
      language: 'es',
      autoSave: true,
      debugMode: false
    });

    zkConfig.set({
      defaultProtocol: ZK_PROTOCOLS.BBS_PLUS,
      ageThreshold: 18,
      enableBatchVerification: false,
      maxProofAge: 3600000,
      trustedIssuers: [],
      verificationEndpoints: [],
      cryptoProvider: 'bls12_381'
    });

    blockchainConfig.set({
      enabled: false,
      network: 'none',
      rpcUrl: null,
      chainId: null,
      gasLimit: 0,
      contracts: { verifier: null, registry: null }
    });

    userPreferences.set({
      notifications: {
        enabled: true,
        sound: false,
        desktop: true,
        verificationAlerts: true,
        errorAlerts: true
      },
      privacy: {
        autoDeleteProofs: false,
        proofRetentionDays: 30,
        shareAnalytics: false,
        minimizeDataExposure: true
      },
      ui: {
        showAdvancedOptions: false,
        compactMode: false,
        showTechnicalDetails: false,
        animationsEnabled: true
      }
    });

    operationHistory.set([]);
    sessionStats.set({
      startTime: null,
      totalOperations: 0,
      successfulVerifications: 0,
      failedVerifications: 0,
      proofsGenerated: 0,
      identitiesCreated: 0,
      errors: 0
    });

    globalErrors.set([]);
    notifications.set([]);

    // Limpiar storage
    this.clearStorage();

    this.addNotification('info', 'Sesión reiniciada');
  }

  /**
   * Guarda configuración en localStorage
   */
  async saveToStorage() {
    if (!browser) return;

    try {
      const stores = {
        [STORAGE_KEYS.SESSION]: get(sessionConfig),
        [STORAGE_KEYS.ZK_CONFIG]: get(zkConfig),
        [STORAGE_KEYS.BLOCKCHAIN_CONFIG]: get(blockchainConfig),
        [STORAGE_KEYS.USER_PREFS]: get(userPreferences),
        [STORAGE_KEYS.OPERATION_HISTORY]: get(operationHistory),
        [STORAGE_KEYS.SESSION_STATS]: get(sessionStats)
      };

      Object.entries(stores).forEach(([key, data]) => {
        localStorage.setItem(key, JSON.stringify(data));
      });

    } catch (error) {
      console.error('Error guardando configuración:', error);
      this.addError('storage_save', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Carga configuración desde localStorage
   */
  async loadFromStorage() {
    if (!browser) return;

    try {
      const loaders = [
        { key: STORAGE_KEYS.SESSION, store: sessionConfig },
        { key: STORAGE_KEYS.ZK_CONFIG, store: zkConfig },
        { key: STORAGE_KEYS.BLOCKCHAIN_CONFIG, store: blockchainConfig },
        { key: STORAGE_KEYS.USER_PREFS, store: userPreferences },
        { key: STORAGE_KEYS.OPERATION_HISTORY, store: operationHistory },
        { key: STORAGE_KEYS.SESSION_STATS, store: sessionStats }
      ];

      loaders.forEach(({ key, store }) => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            store.set(parsed);
          } catch (error) {
            console.warn(`Error parseando ${key}:`, error);
          }
        }
      });

    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  }

  /**
   * Limpia el storage
   */
  clearStorage() {
    if (!browser) return;

    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Utilidades de generación de IDs
   */
  generateOperationId() {
    return 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateErrorId() {
    return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateNotificationId() {
    return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getSessionId() {
    return 'session_' + this.startTime;
  }

  /**
   * Utilidades de formateo
   * @param {number} ms - Milisegundos
   * @returns {string} Duración formateada
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Instancia singleton del store
const sessionStoreInstance = new SessionStore();

/**
 * Funciones utilitarias exportadas
 */

/**
 * Actualiza configuración ZK
 * @param {any} updates - Actualizaciones
 */
export const updateZKConfiguration = (updates) => {
  sessionStoreInstance.updateZKConfig(updates);
};

/**
 * Actualiza configuración blockchain
 * @param {any} updates - Actualizaciones
 */
export const updateBlockchainConfiguration = (updates) => {
  sessionStoreInstance.updateBlockchainConfig(updates);
};

/**
 * Actualiza preferencias de usuario
 * @param {any} updates - Actualizaciones
 */
export const updatePreferences = (updates) => {
  sessionStoreInstance.updateUserPreferences(updates);
};

/**
 * Agrega emisor confiable
 * @param {any} issuer - Emisor
 */
export const addTrustedIssuer = (issuer) => {
  sessionStoreInstance.addTrustedIssuer(issuer);
};

/**
 * Remueve emisor confiable
 * @param {string} issuerId - ID del emisor
 */
export const removeTrustedIssuer = (issuerId) => {
  sessionStoreInstance.removeTrustedIssuer(issuerId);
};

/**
 * Registra operación
 * @param {string} type - Tipo
 * @param {string} description - Descripción
 * @param {any} metadata - Metadatos
 */
export const logOperation = (type, description, metadata) => {
  sessionStoreInstance.logOperation(type, description, metadata);
};

/**
 * Contadores de estadísticas
 */
export const incrementVerificationSuccess = () => {
  sessionStoreInstance.incrementSuccessfulVerifications();
};

export const incrementVerificationFailure = () => {
  sessionStoreInstance.incrementFailedVerifications();
};

export const incrementProofGeneration = () => {
  sessionStoreInstance.incrementProofsGenerated();
};

export const incrementIdentityCreation = () => {
  sessionStoreInstance.incrementIdentitiesCreated();
};

/**
 * Manejo de errores y notificaciones
 */
export const addGlobalError = (/** @type {string} */ type, /** @type {string} */ message, /** @type {any} */ metadata) => {
  sessionStoreInstance.addError(type, message, metadata);
};

export const resolveGlobalError = (/** @type {string} */ errorId) => {
  sessionStoreInstance.resolveError(errorId);
};

export const clearAllErrors = () => {
  sessionStoreInstance.clearErrors();
};

export const addNotification = (/** @type {string} */ type, /** @type {string} */ message, /** @type {any} */ options) => {
  sessionStoreInstance.addNotification(type, message, options);
};

export const removeNotification = (/** @type {string} */ notificationId) => {
  sessionStoreInstance.removeNotification(notificationId);
};

export const clearAllNotifications = () => {
  sessionStoreInstance.clearNotifications();
};

/**
 * Utilidades de configuración
 */
export const exportSessionConfiguration = () => {
  return sessionStoreInstance.exportConfiguration();
};

export const importSessionConfiguration = (/** @type {any} */ config) => {
  sessionStoreInstance.importConfiguration(config);
};

export const getSessionStats = () => {
  return sessionStoreInstance.getSessionStatistics();
};

export const resetCompleteSession = () => {
  sessionStoreInstance.resetSession();
};

// Exportar la instancia para uso avanzado
export const sessionStore = sessionStoreInstance;

// Auto-inicializar en el navegador
if (browser) {
  sessionStoreInstance.initialize();
}