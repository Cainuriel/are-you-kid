import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { createIdentity, validateIdentity, getIdentitySummary } from '$lib/crypto/zenroom/identity.js';

/**
 * Store de identidad digital usando Svelte stores
 * Maneja el estado global de la identidad del usuario con persistencia automática
 */

// Store principal de identidad
export const currentIdentity = writable(/** @type {any} */ (null));

// Store de estado de carga
export const identityLoading = writable(false);

// Store de errores
export const identityError = writable(/** @type {string | null} */ (null));

// Store de metadatos de identidad
export const identityMetadata = writable({
  lastUpdated: /** @type {string | null} */ (null),
  version: '1.0',
  isNew: false,
  hasBackup: false
});

// Store derivado para información pública de la identidad
export const identityInfo = derived(
  currentIdentity,
  ($currentIdentity) => {
    if (!$currentIdentity) return null;
    
    return {
      id: $currentIdentity.id,
      name: $currentIdentity.personal.name,
      age: $currentIdentity.personal.age,
      isAdult: $currentIdentity.personal.isAdult,
      nationality: $currentIdentity.personal.nationality,
      created: $currentIdentity.created,
      verified: $currentIdentity.metadata.verified,
      revoked: $currentIdentity.metadata.revoked
    };
  }
);

// Store derivado para claves públicas
export const publicKeys = derived(
  currentIdentity,
  ($currentIdentity) => {
    if (!$currentIdentity) return null;
    
    return {
      coconut: $currentIdentity.publicKeys.coconut,
      bls: $currentIdentity.publicKeys.bls,
      ecdsa: $currentIdentity.publicKeys.ecdsa
    };
  }
);

// Store derivado para estado de verificación
export const verificationStatus = derived(
  currentIdentity,
  ($currentIdentity) => {
    if (!$currentIdentity) return {
      hasIdentity: false,
      isVerified: false,
      isRevoked: false,
      canCreateProofs: false
    };
    
    return {
      hasIdentity: true,
      isVerified: $currentIdentity.metadata.verified,
      isRevoked: $currentIdentity.metadata.revoked,
      canCreateProofs: !$currentIdentity.metadata.revoked && $currentIdentity.keypairs
    };
  }
);

// Constantes para localStorage
const STORAGE_KEYS = {
  IDENTITY: 'zenroom-identity',
  METADATA: 'zenroom-identity-metadata',
  BACKUP: 'zenroom-identity-backup'
};

/**
 * Clase para manejo del store de identidad
 */
class IdentityStore {
  constructor() {
    this.digitalIdentity = createIdentity();
    this.initialized = false;
    
    // Inicializar automáticamente en el navegador
    if (browser) {
      this.initialize();
    }
  }

  /**
   * Inicializa el store cargando datos persistidos
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.loadFromStorage();
      this.initialized = true;
    } catch (error) {
      console.error('Error inicializando identity store:', error);
      identityError.set(`Error de inicialización: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Crea una nueva identidad digital
   * @param {any} personalInfo - Información personal del usuario
   * @returns {Promise<any>} Identidad creada
   */
  async createIdentity(personalInfo) {
    identityLoading.set(true);
    identityError.set(null);

    try {
      // Generar nueva identidad
      const identity = await this.digitalIdentity.generateIdentity(personalInfo);
      
      // Actualizar stores
      currentIdentity.set(identity);
      identityMetadata.update(meta => ({
        ...meta,
        lastUpdated: new Date().toISOString(),
        version: (/** @type {any} */ (identity)).version || '1.0',
        isNew: true,
        hasBackup: false
      }));

      // Persistir automáticamente
      await this.saveToStorage();

      return identity;

    } catch (error) {
      const errorMessage = `Error creando identidad: ${error instanceof Error ? error.message : String(error)}`;
      identityError.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      identityLoading.set(false);
    }
  }

  /**
   * Carga una identidad existente
   * @param {any} identityData - Datos de identidad a cargar
   * @returns {Promise<any>} Identidad cargada
   */
  async loadIdentity(identityData) {
    identityLoading.set(true);
    identityError.set(null);

    try {
      // Validar datos de identidad
      if (!validateIdentity(identityData)) {
        throw new Error('Datos de identidad inválidos');
      }

      // Importar identidad
      const identity = this.digitalIdentity.importIdentity(identityData);
      
      // Actualizar stores
      currentIdentity.set(identity);
      identityMetadata.set({
        lastUpdated: new Date().toISOString(),
        version: identity.version,
        isNew: false,
        hasBackup: true
      });

      // Persistir
      await this.saveToStorage();

      return identity;

    } catch (error) {
      const errorMessage = `Error cargando identidad: ${error instanceof Error ? error.message : String(error)}`;
      identityError.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      identityLoading.set(false);
    }
  }

  /**
   * Actualiza metadatos de la identidad
   * @param {any} updates - Actualizaciones a aplicar
   */
  async updateIdentityMetadata(updates) {
    const identity = get(currentIdentity);
    if (!identity) {
      throw new Error('No hay identidad para actualizar');
    }

    try {
      this.digitalIdentity.updateMetadata(updates);
      const updatedIdentity = this.digitalIdentity.getCurrentIdentity();
      
      currentIdentity.set(updatedIdentity);
      identityMetadata.update(metadata => ({
        ...metadata,
        lastUpdated: new Date().toISOString()
      }));

      await this.saveToStorage();

    } catch (error) {
      identityError.set(`Error actualizando metadatos: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Verifica la identidad actual
   */
  async verifyIdentity() {
    const identity = get(currentIdentity);
    if (!identity) {
      throw new Error('No hay identidad para verificar');
    }

    try {
      await this.updateIdentityMetadata({ verified: true });
    } catch (error) {
      identityError.set(`Error verificando identidad: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Revoca la identidad actual
   */
  async revokeIdentity() {
    const identity = get(currentIdentity);
    if (!identity) {
      throw new Error('No hay identidad para revocar');
    }

    try {
      this.digitalIdentity.revokeIdentity();
      const revokedIdentity = this.digitalIdentity.getCurrentIdentity();
      
      currentIdentity.set(revokedIdentity);
      identityMetadata.update(metadata => ({
        ...metadata,
        lastUpdated: new Date().toISOString()
      }));

      await this.saveToStorage();

    } catch (error) {
      identityError.set(`Error revocando identidad: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Exporta la identidad para backup
   * @param {boolean} includePrivateKeys - Si incluir claves privadas
   * @returns {Object} Identidad exportada
   */
  exportIdentity(includePrivateKeys = false) {
    const identity = get(currentIdentity);
    if (!identity) {
      throw new Error('No hay identidad para exportar');
    }

    try {
      return this.digitalIdentity.exportIdentity(includePrivateKeys);
    } catch (error) {
      identityError.set(`Error exportando identidad: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Crea un backup de la identidad
   */
  async createBackup() {
    const identity = get(currentIdentity);
    if (!identity) {
      throw new Error('No hay identidad para respaldar');
    }

    try {
      const backup = this.exportIdentity(true);
      const backupData = {
        identity: backup,
        metadata: get(identityMetadata),
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      if (browser) {
        localStorage.setItem(STORAGE_KEYS.BACKUP, JSON.stringify(backupData));
      }

      identityMetadata.update(metadata => ({
        ...metadata,
        hasBackup: true,
        lastUpdated: new Date().toISOString()
      }));

      return backupData;

    } catch (error) {
      identityError.set(`Error creando backup: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Restaura desde backup
   */
  async restoreFromBackup() {
    if (!browser) {
      throw new Error('Backup solo disponible en navegador');
    }

    try {
      const backupData = localStorage.getItem(STORAGE_KEYS.BACKUP);
      if (!backupData) {
        throw new Error('No se encontró backup');
      }

      const backup = JSON.parse(backupData);
      await this.loadIdentity(backup.identity);

      return backup;

    } catch (error) {
      identityError.set(`Error restaurando backup: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Elimina la identidad actual
   */
  async deleteIdentity() {
    try {
      // Limpiar stores
      currentIdentity.set(null);
      identityMetadata.set({
        lastUpdated: null,
        version: '1.0',
        isNew: false,
        hasBackup: false
      });
      identityError.set(null);

      // Limpiar storage
      if (browser) {
        localStorage.removeItem(STORAGE_KEYS.IDENTITY);
        localStorage.removeItem(STORAGE_KEYS.METADATA);
      }

      // Reinicializar instancia
      this.digitalIdentity = createIdentity();

    } catch (error) {
      identityError.set(`Error eliminando identidad: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Guarda en localStorage
   */
  async saveToStorage() {
    if (!browser) return;

    try {
      const identity = get(currentIdentity);
      const metadata = get(identityMetadata);

      if (identity) {
        localStorage.setItem(STORAGE_KEYS.IDENTITY, JSON.stringify(identity));
      }
      
      if (metadata) {
        localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
      }

    } catch (error) {
      console.error('Error guardando en storage:', error);
      throw new Error('Error persistiendo datos');
    }
  }

  /**
   * Carga desde localStorage
   */
  async loadFromStorage() {
    if (!browser) return;

    try {
      // Cargar identidad
      const identityData = localStorage.getItem(STORAGE_KEYS.IDENTITY);
      if (identityData) {
        const identity = JSON.parse(identityData);
        if (validateIdentity(identity)) {
          this.digitalIdentity.importIdentity(identity);
          currentIdentity.set(identity);
        }
      }

      // Cargar metadatos
      const metadataData = localStorage.getItem(STORAGE_KEYS.METADATA);
      if (metadataData) {
        const metadata = JSON.parse(metadataData);
        identityMetadata.set(metadata);
      }

    } catch (error) {
      console.error('Error cargando desde storage:', error);
      // No lanzar error para permitir funcionamiento sin datos guardados
    }
  }

  /**
   * Limpia todos los errores
   */
  clearErrors() {
    identityError.set(null);
  }

  /**
   * Obtiene resumen de la identidad actual
   * @returns {Object|null} Resumen de identidad
   */
  getIdentitySummary() {
    const identity = get(currentIdentity);
    return identity ? getIdentitySummary(identity) : null;
  }

  /**
   * Verifica si hay una identidad cargada
   * @returns {boolean} Tiene identidad
   */
  hasIdentity() {
    return get(currentIdentity) !== null;
  }

  /**
   * Verifica si la identidad está verificada
   * @returns {boolean} Está verificada
   */
  isVerified() {
    const status = get(verificationStatus);
    return status.isVerified;
  }

  /**
   * Verifica si la identidad está revocada
   * @returns {boolean} Está revocada
   */
  isRevoked() {
    const status = get(verificationStatus);
    return status.isRevoked;
  }

  /**
   * Obtiene estadísticas de la identidad
   * @returns {Object} Estadísticas
   */
  getStats() {
    const identity = get(currentIdentity);
    const metadata = get(identityMetadata);
    
    if (!identity) {
      return {
        hasIdentity: false,
        daysSinceCreation: 0,
        isAdult: false,
        verified: false,
        revoked: false
      };
    }

    const created = new Date(identity.created);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    return {
      hasIdentity: true,
      daysSinceCreation,
      isAdult: identity.personal.isAdult,
      verified: identity.metadata.verified,
      revoked: identity.metadata.revoked,
      hasBackup: metadata.hasBackup,
      version: identity.version
    };
  }
}

// Instancia singleton del store
const identityStoreInstance = new IdentityStore();

/**
 * Funciones utilitarias exportadas
 */

/**
 * Crea una nueva identidad
 * @param {any} personalInfo - Información personal
 * @returns {Promise<any>} Identidad creada
 */
export const createNewIdentity = (personalInfo) => {
  return identityStoreInstance.createIdentity(personalInfo);
};

/**
 * Carga una identidad existente
 * @param {any} identityData - Datos de identidad
 * @returns {Promise<any>} Identidad cargada
 */
export const loadExistingIdentity = (identityData) => {
  return identityStoreInstance.loadIdentity(identityData);
};

/**
 * Exporta la identidad actual
 * @param {boolean} includePrivateKeys - Incluir claves privadas
 * @returns {any} Identidad exportada
 */
export const exportCurrentIdentity = (includePrivateKeys = false) => {
  return identityStoreInstance.exportIdentity(includePrivateKeys);
};

/**
 * Verifica la identidad actual
 * @returns {Promise<void>}
 */
export const verifyCurrentIdentity = () => {
  return identityStoreInstance.verifyIdentity();
};

/**
 * Revoca la identidad actual
 * @returns {Promise<void>}
 */
export const revokeCurrentIdentity = () => {
  return identityStoreInstance.revokeIdentity();
};

/**
 * Elimina la identidad actual
 * @returns {Promise<void>}
 */
export const deleteCurrentIdentity = () => {
  return identityStoreInstance.deleteIdentity();
};

/**
 * Crea backup de la identidad
 * @returns {Promise<any>} Datos del backup
 */
export const createIdentityBackup = () => {
  return identityStoreInstance.createBackup();
};

/**
 * Restaura desde backup
 * @returns {Promise<any>} Identidad restaurada
 */
export const restoreIdentityFromBackup = () => {
  return identityStoreInstance.restoreFromBackup();
};

/**
 * Limpia errores del store
 */
export const clearIdentityErrors = () => {
  identityStoreInstance.clearErrors();
};

/**
 * Obtiene resumen de identidad
 * @returns {any|null} Resumen
 */
export const getIdentityInfo = () => {
  return identityStoreInstance.getIdentitySummary();
};

/**
 * Obtiene estadísticas de identidad
 * @returns {any} Estadísticas
 */
export const getIdentityStats = () => {
  return identityStoreInstance.getStats();
};

/**
 * Actualiza metadatos de identidad
 * @param {any} updates - Actualizaciones
 * @returns {Promise<void>}
 */
export const updateIdentityInfo = (updates) => {
  return identityStoreInstance.updateIdentityMetadata(updates);
};

// Exportar la instancia para uso avanzado
export const identityStore = identityStoreInstance;

// Auto-inicializar en el navegador
if (browser) {
  identityStoreInstance.initialize();
}