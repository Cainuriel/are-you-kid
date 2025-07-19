import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { 
  createIdentity, 
  getCurrentIdentity,
  getAllIdentities as getProviderIdentities,
  exportForStorage,
  importFromStorage,
  updateIdentity,
  validateIdentityIntegrity,
  getIdentityStats as getProviderStats
} from '$lib/crypto/identity-provider.js';

/**
 * @typedef {Object} PersonalInfo
 * @property {string} name - Nombre completo
 * @property {number} age - Edad en años
 * @property {string} country - País de residencia
 * @property {string} [email] - Email opcional
 * @property {string} [phone] - Teléfono opcional
 */

/**
 * @typedef {Object} IdentityMetadata
 * @property {string | null} lastUpdated - Última actualización ISO string
 * @property {string} version - Versión del formato de identidad
 * @property {boolean} isNew - Si es una identidad recién creada
 * @property {boolean} hasBackup - Si tiene backup guardado
 * @property {string} provider - Proveedor criptográfico usado
 */

/**
 * @typedef {Object} KeyPair
 * @property {Object} bbs - Claves BBS+
 * @property {string} bbs.publicKeyHex - Clave pública BBS+ en hex
 * @property {Uint8Array|number[]} bbs.secretKey - Clave privada BBS+
 * @property {string} [bbs.secretKeyHex] - Clave privada BBS+ en hex
 * @property {Object} coconut - Claves Coconut
 * @property {string} coconut.publicKeyHex - Clave pública Coconut en hex
 * @property {Uint8Array|number[]} coconut.privateKey - Clave privada Coconut
 * @property {string} [coconut.privateKeyHex] - Clave privada Coconut en hex
 */

/**
 * @typedef {Object} Identity
 * @property {string} id - ID único de la identidad
 * @property {PersonalInfo} personal - Información personal
 * @property {KeyPair} keyPair - Par de claves criptográficas
 * @property {string} created - Fecha de creación ISO string
 * @property {string} lastModified - Última modificación ISO string
 * @property {string} type - Tipo de identidad
 * @property {string} version - Versión del formato
 * @property {Object} integrity - Datos de integridad
 */

/**
 * @typedef {Object} IdentityInfo
 * @property {string} id - ID de la identidad
 * @property {string} name - Nombre
 * @property {number} age - Edad
 * @property {boolean} isAdult - Si es mayor de edad
 * @property {string} country - País
 * @property {string} created - Fecha de creación
 * @property {string} type - Tipo de identidad
 * @property {string} version - Versión
 */

/**
 * @typedef {Object} PublicKeyInfo
 * @property {Object} bbs - Info de claves BBS+
 * @property {string | null} bbs.publicKey - Clave pública BBS+
 * @property {boolean} bbs.hasPrivateKey - Si tiene clave privada
 * @property {Object} coconut - Info de claves Coconut
 * @property {string | null} coconut.publicKey - Clave pública Coconut
 * @property {boolean} coconut.hasPrivateKey - Si tiene clave privada
 */

/**
 * @typedef {Object} VerificationStatus
 * @property {boolean} hasIdentity - Si tiene identidad cargada
 * @property {boolean} isVerified - Si está verificada
 * @property {boolean} canCreateProofs - Si puede crear pruebas
 * @property {boolean} hasBBSKeys - Si tiene claves BBS+
 * @property {boolean} hasCoconutKeys - Si tiene claves Coconut
 */

/**
 * Store de identidad digital usando Svelte stores
 * Implementación con BLS12-381 y criptografía moderna
 */

// Store principal de identidad
/** @type {import('svelte/store').Writable<Identity | null>} */
export const currentIdentity = writable(/** @type {any} */ (null));

// Store de estado de carga
/** @type {import('svelte/store').Writable<boolean>} */
export const identityLoading = writable(false);

// Store de errores
/** @type {import('svelte/store').Writable<string | null>} */
export const identityError = writable(/** @type {string | null} */ (null));

// Store de metadatos de identidad
/** @type {import('svelte/store').Writable<IdentityMetadata>} */
export const identityMetadata = writable({
  lastUpdated: /** @type {string | null} */ (null),
  version: '2.0',
  isNew: false,
  hasBackup: false,
  provider: 'bls12_381'
});

// Store derivado para información pública de la identidad
/** @type {import('svelte/store').Readable<IdentityInfo | null>} */
export const identityInfo = derived(
  currentIdentity,
  ($currentIdentity) => {
    if (!$currentIdentity) return null;
    
    return {
      id: $currentIdentity.id,
      name: $currentIdentity.personal?.name || 'Unknown',
      age: $currentIdentity.personal?.age || 0,
      isAdult: ($currentIdentity.personal?.age || 0) >= 18,
      country: $currentIdentity.personal?.country || 'Unknown',
      created: $currentIdentity.created,
      type: $currentIdentity.type || 'bls12_381_identity',
      version: $currentIdentity.version || '2.0'
    };
  }
);

// Store derivado para claves públicas
export const publicKeys = derived(
  currentIdentity,
  ($currentIdentity) => {
    if (!$currentIdentity || !$currentIdentity.keyPair) return null;
    
    return {
      bbs: {
        publicKey: $currentIdentity.keyPair.bbs?.publicKeyHex || null,
        hasPrivateKey: !!$currentIdentity.keyPair.bbs?.secretKey
      },
      coconut: {
        publicKey: $currentIdentity.keyPair.coconut?.publicKeyHex || null,
        hasPrivateKey: !!$currentIdentity.keyPair.coconut?.privateKey
      }
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
      canCreateProofs: false,
      hasBBSKeys: false,
      hasCoconutKeys: false
    };
    
    const hasBBSKeys = !!$currentIdentity.keyPair?.bbs?.secretKey;
    const hasCoconutKeys = !!$currentIdentity.keyPair?.coconut?.privateKey;
    
    return {
      hasIdentity: true,
      isVerified: true, // BLS12-381 identities are self-verified
      canCreateProofs: hasBBSKeys || hasCoconutKeys,
      hasBBSKeys,
      hasCoconutKeys
    };
  }
);

// Constantes para localStorage
const STORAGE_KEYS = {
  IDENTITY: 'bls12381-identity',
  METADATA: 'bls12381-identity-metadata',
  PRIVATE_KEYS: 'bls12381-private-keys'
};

/**
 * Clase para manejo del store de identidad
 */
class IdentityStore {
  constructor() {
    this.initialized = false;
    this.currentIdentityId = null;
    
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
   */
  /**
   * Crea una nueva identidad digital
   * @param {PersonalInfo} personalInfo
   * @returns {Promise<Identity>}
   */
  async createNewIdentity(personalInfo) {
    identityLoading.set(true);
    identityError.set(null);

    try {
      // Crear nueva identidad usando el provider
      const identity = await createIdentity(personalInfo);

      // Asegurar que bbs.secretKey es Uint8Array
      if (
        identity.keyPair?.bbs?.secretKey &&
        Array.isArray(identity.keyPair.bbs.secretKey) &&
        !(identity.keyPair.bbs.secretKey instanceof Uint8Array)
      ) {
        // Convertir array a Uint8Array de manera segura
        const secretKeyArray = identity.keyPair.bbs.secretKey;
        (/** @type {any} */ (identity.keyPair.bbs)).secretKey = new Uint8Array(secretKeyArray);
      }

      // Actualizar stores
      currentIdentity.set(/** @type {any} */ (identity));
      this.currentIdentityId = identity.id;

      identityMetadata.update(meta => ({
        ...meta,
        lastUpdated: new Date().toISOString(),
        version: identity.version || '2.0',
        isNew: true,
        hasBackup: false
      }));

      // Persistir automáticamente
      await this.saveToStorage();

      console.log('✅ Nueva identidad creada y guardada:', identity.personal.name);
      return /** @type {any} */ (identity);

    } catch (error) {
      const errorMessage = `Error creando identidad: ${error instanceof Error ? error.message : String(error)}`;
      identityError.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      identityLoading.set(false);
    }
  }

  /**
   * Cargar identidad existente por ID
   * @param {string} identityId - ID de la identidad a cargar
   * @returns {Promise<Identity>}
   */
  async loadIdentityById(identityId) {
    identityLoading.set(true);
    identityError.set(null);

    try {
      const identity = getCurrentIdentity(identityId);
      if (!identity) {
        throw new Error(`Identidad ${identityId} no encontrada`);
      }

      // Verifica que la identidad tenga todas las propiedades requeridas
      if (!identity.keyPair || !identity.integrity) {
        throw new Error('La identidad cargada no tiene keyPair o integrity');
      }

      // Convertir secretKey a Uint8Array si es necesario
      if (
        identity.keyPair?.bbs?.secretKey &&
        Array.isArray(identity.keyPair.bbs.secretKey) &&
        !(identity.keyPair.bbs.secretKey instanceof Uint8Array)
      ) {
        (/** @type {any} */ (identity.keyPair.bbs)).secretKey = new Uint8Array(identity.keyPair.bbs.secretKey);
      }

      // Convertir coconut.privateKey a Uint8Array si es necesario
      if (
        identity.keyPair?.coconut?.privateKey &&
        Array.isArray(identity.keyPair.coconut.privateKey) &&
        !(identity.keyPair.coconut.privateKey instanceof Uint8Array)
      ) {
        (/** @type {any} */ (identity.keyPair.coconut)).privateKey = new Uint8Array(identity.keyPair.coconut.privateKey);
      }

      // Convertir bbs.publicKey a Uint8Array si es necesario
      if (
        identity.keyPair?.bbs?.publicKey &&
        Array.isArray(identity.keyPair.bbs.publicKey) &&
        !(identity.keyPair.bbs.publicKey instanceof Uint8Array)
      ) {
        (/** @type {any} */ (identity.keyPair.bbs)).publicKey = new Uint8Array(identity.keyPair.bbs.publicKey);
      }

      // Asegurar que bbs.secretKey es Uint8Array
      if (
        identity.keyPair?.bbs?.secretKey &&
        !(identity.keyPair.bbs.secretKey instanceof Uint8Array)
      ) {
        (/** @type {any} */ (identity.keyPair.bbs)).secretKey = new Uint8Array(identity.keyPair.bbs.secretKey);
      }

      // Actualizar stores
      currentIdentity.set(/** @type {any} */ (identity));
      this.currentIdentityId = identityId;
      
      identityMetadata.set({
        lastUpdated: new Date().toISOString(),
        version: identity.version || '2.0',
        isNew: false,
        hasBackup: true,
        provider: 'bls12_381'
      });

      return /** @type {any} */ (identity);

    } catch (error) {
      const errorMessage = `Error cargando identidad: ${error instanceof Error ? error.message : String(error)}`;
      identityError.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      identityLoading.set(false);
    }
  }

  /**
   * Actualizar datos de la identidad actual
   * @param {Partial<PersonalInfo>} updates - Actualizaciones a aplicar
   * @returns {Promise<Identity>}
   */
  async updateCurrentIdentity(updates) {
    const identity = get(currentIdentity);
    if (!identity) {
      throw new Error('No hay identidad cargada para actualizar');
    }

    try {
      const updatedIdentity = updateIdentity(identity.id, updates);
      
      currentIdentity.set(updatedIdentity);
      identityMetadata.update(meta => ({
        ...meta,
        lastUpdated: new Date().toISOString()
      }));

      await this.saveToStorage();
      return updatedIdentity;

    } catch (error) {
      const errorMessage = `Error actualizando identidad: ${error instanceof Error ? error.message : String(error)}`;
      identityError.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Validar integridad de la identidad actual
   */
  validateCurrentIdentity() {
    const identity = get(currentIdentity);
    if (!identity) {
      return { valid: false, reason: 'No hay identidad cargada' };
    }

    return validateIdentityIntegrity(identity.id);
  }

  /**
   * Exportar identidad actual
   */
  exportCurrentIdentity(includePrivateKeys = false) {
    const identity = get(currentIdentity);
    if (!identity) {
      throw new Error('No hay identidad para exportar');
    }

    return exportForStorage(identity.id, includePrivateKeys);
  }

  /**
   * Importar identidad desde datos exportados
   * @param {Object} exportedData - Datos exportados de identidad
   * @param {Object|null} privateKeys - Claves privadas opcionales
   * @returns {Promise<Identity>}
   */
  async importIdentity(exportedData, privateKeys = null) {
    identityLoading.set(true);
    identityError.set(null);

    try {
      const identity = await importFromStorage(exportedData, /** @type {any} */ (privateKeys));
      
      currentIdentity.set(/** @type {any} */ (identity));
      this.currentIdentityId = identity.id;
      
      identityMetadata.set({
        lastUpdated: new Date().toISOString(),
        version: identity.version || '2.0',
        isNew: false,
        hasBackup: true,
        provider: 'bls12_381'
      });

      await this.saveToStorage();
      return /** @type {any} */ (identity);

    } catch (error) {
      const errorMessage = `Error importando identidad: ${error instanceof Error ? error.message : String(error)}`;
      identityError.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      identityLoading.set(false);
    }
  }

  /**
   * Guardar en localStorage
   */
  async saveToStorage() {
    if (!browser) return;

    try {
      const identity = get(currentIdentity);
      const metadata = get(identityMetadata);

      if (identity) {
        // Guardar datos públicos
        const publicData = exportForStorage(identity.id, false);
        localStorage.setItem(STORAGE_KEYS.IDENTITY, JSON.stringify(publicData));
        
        // Guardar claves privadas por separado
        const privateData = exportForStorage(identity.id, true);
        const privateDataAny = /** @type {any} */ (privateData);
        localStorage.setItem(STORAGE_KEYS.PRIVATE_KEYS, JSON.stringify({
          bbs: privateDataAny.keyPair?.bbs?.secretKeyHex,
          coconut: privateDataAny.keyPair?.coconut?.privateKeyHex
        }));
        
        // Guardar metadatos
        localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
        
        console.log('✅ Identidad guardada en localStorage');
      }
    } catch (error) {
      console.error('❌ Error guardando en localStorage:', error);
    }
  }

  /**
   * Cargar desde localStorage
   */
  async loadFromStorage() {
    if (!browser) return;

    try {
      const identityData = localStorage.getItem(STORAGE_KEYS.IDENTITY);
      const privateKeysData = localStorage.getItem(STORAGE_KEYS.PRIVATE_KEYS);
      const metadataData = localStorage.getItem(STORAGE_KEYS.METADATA);

      if (identityData) {
        const publicData = JSON.parse(identityData);
        const privateKeys = privateKeysData ? JSON.parse(privateKeysData) : null;
        
        // Reconstruir claves privadas si existen
        let privateKeyData = null;
        if (privateKeys && privateKeys.bbs && privateKeys.coconut) {
          privateKeyData = {
            bbs: { secretKeyHex: privateKeys.bbs },
            coconut: { privateKeyHex: privateKeys.coconut }
          };
        }

        const identity = await importFromStorage(publicData, /** @type {any} */ (privateKeyData));
        
        currentIdentity.set(/** @type {any} */ (identity));
        this.currentIdentityId = identity.id;

        if (metadataData) {
          identityMetadata.set(JSON.parse(metadataData));
        }

        console.log('✅ Identidad cargada desde localStorage:', identity.personal?.name);
      }
    } catch (error) {
      console.error('❌ Error cargando desde localStorage:', error);
    }
  }

  /**
   * Limpiar identidad actual
   */
  clearCurrentIdentity() {
    currentIdentity.set(null);
    this.currentIdentityId = null;
    identityMetadata.set({
      lastUpdated: null,
      version: '2.0',
      isNew: false,
      hasBackup: false,
      provider: 'bls12_381'
    });
    
    if (browser) {
      localStorage.removeItem(STORAGE_KEYS.IDENTITY);
      localStorage.removeItem(STORAGE_KEYS.PRIVATE_KEYS);
      localStorage.removeItem(STORAGE_KEYS.METADATA);
    }
    
    console.log('✅ Identidad limpiada');
  }

  /**
   * Listar todas las identidades disponibles
   */
  getAllAvailableIdentities() {
    return getProviderIdentities();
  }

  /**
   * Obtener estadísticas del provider
   */
  getStats() {
    return getProviderStats();
  }
}

// Instancia singleton del store
const identityStore = new IdentityStore();

// =============================================================================
// FUNCIONES PÚBLICAS DEL STORE
// =============================================================================

/**
 * Crear nueva identidad
 * @param {PersonalInfo} personalInfo - Información personal de la identidad
 * @returns {Promise<Identity>}
 */
export async function createNewIdentity(personalInfo) {
  return await identityStore.createNewIdentity(personalInfo);
}

/**
 * Cargar identidad por ID
 * @param {string} identityId - ID de la identidad a cargar
 * @returns {Promise<Identity>}
 */
export async function loadIdentity(identityId) {
  return await identityStore.loadIdentityById(identityId);
}

/**
 * Actualizar identidad actual
 * @param {Partial<PersonalInfo>} updates - Actualizaciones a aplicar
 * @returns {Promise<Identity>}
 */
export async function updateCurrentIdentity(updates) {
  return await identityStore.updateCurrentIdentity(updates);
}

/**
 * Validar integridad
 */
export function validateCurrentIdentity() {
  return identityStore.validateCurrentIdentity();
}

/**
 * Exportar identidad
 */
export function exportCurrentIdentity(includePrivateKeys = false) {
  return identityStore.exportCurrentIdentity(includePrivateKeys);
}

/**
 * Importar identidad
 * @param {Object} data - Datos de identidad exportados
 * @param {Object|null} privateKeys - Claves privadas opcionales
 * @returns {Promise<Identity>}
 */
export async function importIdentity(data, privateKeys = null) {
  return await identityStore.importIdentity(data, privateKeys);
}

/**
 * Limpiar identidad actual
 */
export function clearIdentity() {
  identityStore.clearCurrentIdentity();
}

/**
 * Obtener todas las identidades
 */
export function getAllIdentities() {
  return identityStore.getAllAvailableIdentities();
}

/**
 * Obtener estadísticas
 */
export function getIdentityStoreStats() {
  return identityStore.getStats();
}

/**
 * Inicializar manualmente el store
 */
export async function initializeIdentityStore() {
  return await identityStore.initialize();
}

// Exportar instancia para casos avanzados
export { identityStore };
