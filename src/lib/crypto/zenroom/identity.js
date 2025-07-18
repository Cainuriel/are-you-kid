import { zencode_exec } from 'zenroom';

/**
 * Librería para manejo de identidades digitales usando Zenroom
 * Soporta protocolos Coconut, BBS+, y operaciones criptográficas avanzadas
 */

/**
 * @typedef {Object} PersonalInfo
 * @property {string} name - Nombre completo
 * @property {string} birthDate - Fecha de nacimiento (ISO string)
 * @property {string} nationality - Nacionalidad
 */

/**
 * @typedef {Object} AgeInfo
 * @property {number} age - Edad en años
 * @property {boolean} isAdult - Si es mayor de edad (>=18)
 * @property {string} birthDate - Fecha de nacimiento
 */

/**
 * @typedef {Object} Keypair
 * @property {string} private - Clave privada
 * @property {string} public - Clave pública
 */

/**
 * @typedef {Object} IdentityKeypairs
 * @property {Keypair} coconut - Keypair para credenciales Coconut
 * @property {Keypair} bls - Keypair para firmas BLS
 * @property {Keypair} ecdsa - Keypair para blockchain ECDSA
 */

/**
 * @typedef {Object} PublicKeys
 * @property {string} coconut - Clave pública Coconut
 * @property {string} bls - Clave pública BLS
 * @property {string} ecdsa - Clave pública ECDSA
 */

/**
 * @typedef {Object} IdentityMetadata
 * @property {string} issuer - Emisor de la identidad
 * @property {string} authority - Autoridad verificadora
 * @property {string} curve - Curva criptográfica utilizada
 * @property {number} keySize - Tamaño de las claves
 * @property {boolean} verified - Si la identidad está verificada
 * @property {boolean} revoked - Si la identidad está revocada
 */

/**
 * @typedef {Object} DigitalIdentityData
 * @property {string} id - ID único de la identidad
 * @property {string} version - Versión de la identidad
 * @property {string} created - Fecha de creación (ISO string)
 * @property {string} updated - Fecha de actualización (ISO string)
 * @property {PersonalInfo} personal - Información personal
 * @property {IdentityKeypairs} keypairs - Pares de claves criptográficas
 * @property {PublicKeys} publicKeys - Claves públicas
 * @property {IdentityMetadata} metadata - Metadatos de la identidad
 */

/**
 * @typedef {Object} CredentialRequest
 * @property {string} request - Solicitud de credencial
 * @property {string} keypair - Keypair asociado
 */

/**
 * @typedef {Object} BLSSignature
 * @property {string} signature - Firma BLS
 * @property {string} message - Mensaje firmado
 */

/**
 * @typedef {Object} IdentitySummary
 * @property {string} id - ID de la identidad
 * @property {string} name - Nombre
 * @property {number} age - Edad
 * @property {boolean} isAdult - Si es mayor de edad
 * @property {string} created - Fecha de creación
 * @property {boolean} verified - Si está verificada
 * @property {boolean} revoked - Si está revocada
 */

/**
 * @typedef {Object} IdentityConfig
 * @property {number} [keySize] - Tamaño de las claves
 * @property {string} [curve] - Curva criptográfica
 * @property {string} [hashAlgorithm] - Algoritmo de hash
 * @property {string} [defaultIssuer] - Emisor por defecto
 * @property {string} [defaultAuthority] - Autoridad por defecto
 */

// Configuración por defecto
const DEFAULT_CONFIG = {
  keySize: 256,
  curve: 'bls12381',
  hashAlgorithm: 'sha256',
  defaultIssuer: 'DefaultIssuer',
  defaultAuthority: 'DefaultAuthority'
};

// Claves públicas por defecto para demos
const DEFAULT_KEYS = {
  issuer: {
    public: "BBA6KpjwgGHEr4Q8u5hWk6k2q5K1KxWyAZrAKEHkV4JVFLvqKmNwV8bJdNcPVtjHU4JQX1DdRwK6W8VNvMJGKQ8UX"
  },
  authority: {
    public: "BLKvX1MWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8TNKzZ1NWpjw8H5KOIyIjKd8YK"
  }
};

/**
 * Clase principal para manejo de identidades digitales
 */
export class DigitalIdentity {
  /**
   * @param {IdentityConfig} config - Configuración opcional
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    /** @type {any} */
    this.identity = null;
    /** @type {Array<any>} */
    this.credentials = [];
    /** @type {Array<any>} */
    this.proofs = [];
  }

  /**
   * Genera una nueva identidad digital completa
   * @param {PersonalInfo} personalInfo - Información personal del usuario
   * @returns {Promise<DigitalIdentityData>} Identidad generada
   */
  async generateIdentity(personalInfo) {
    try {
      // Validar información personal
      this.validatePersonalInfo(personalInfo);

      // Generar keypair principal (Coconut)
      const coconutKeypair = await this.generateCoconutKeypair();
      
      // Generar keypair BLS para signatures
      const blsKeypair = await this.generateBLSKeypair();
      
      // Generar keypair ECDSA para blockchain
      const ecdsaKeypair = await this.generateECDSAKeypair();

      // Calcular edad y mayoría
      const ageInfo = this.calculateAge(personalInfo.birthDate);

      // Crear identidad completa
      const identity = {
        id: this.generateUUID(),
        version: '1.0',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        
        // Información personal (solo lo mínimo necesario)
        personal: {
          name: personalInfo.name,
          birthDate: personalInfo.birthDate,
          nationality: personalInfo.nationality,
          age: ageInfo.age,
          isAdult: ageInfo.isAdult
        },

        // Claves criptográficas
        keypairs: {
          coconut: coconutKeypair,
          bls: blsKeypair,
          ecdsa: ecdsaKeypair
        },

        // Claves públicas para verificación
        publicKeys: {
          coconut: coconutKeypair.public,
          bls: blsKeypair.public,
          ecdsa: ecdsaKeypair.public
        },

        // Metadatos
        metadata: {
          issuer: this.config.defaultIssuer,
          authority: this.config.defaultAuthority,
          curve: this.config.curve,
          keySize: this.config.keySize,
          verified: false,
          revoked: false
        }
      };

      this.identity = identity;
      return identity;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error generando identidad: ${error.message}`);
      } else {
        throw new Error(`Error generando identidad: ${String(error)}`);
      }
    }
  }

  /**
   * Genera un keypair Coconut para credentials
   * @returns {Promise<any>} Keypair Coconut
   */
  async generateCoconutKeypair() {
    const script = `
      Scenario 'coconut': credential keypair
      Given nothing
      When I create the credential keypair
      Then print the 'credential keypair'
    `;

    const result = await zencode_exec(script);
    return JSON.parse(result.result)['credential keypair'];
  }

  /**
   * Genera un keypair BLS para signatures
   * @returns {Promise<any>} Keypair BLS
   */
  async generateBLSKeypair() {
    const script = `
      Scenario 'bls': keypair
      Given nothing
      When I create the bls keypair
      Then print the 'bls keypair'
    `;

    const result = await zencode_exec(script);
    return JSON.parse(result.result)['bls keypair'];
  }

  /**
   * Genera un keypair ECDSA para blockchain
   * @returns {Promise<any>} Keypair ECDSA
   */
  async generateECDSAKeypair() {
    const script = `
      Scenario 'ecdsa': keypair
      Given nothing
      When I create the ecdsa keypair
      Then print the 'ecdsa keypair'
    `;

    const result = await zencode_exec(script);
    return JSON.parse(result.result)['ecdsa keypair'];
  }

  /**
   * Crea un credential request para obtener credenciales
   * @param {Array<string>} attributes - Atributos solicitados
   * @returns {Promise<any>} Credential request
   */
  async createCredentialRequest(attributes = []) {
    if (!this.identity) {
      throw new Error('No hay identidad creada');
    }

    const script = `
      Scenario 'coconut': credential request
      Given that I am known as 'Alice'
      and I have my 'credential keypair'
      When I create the credential request
      Then print the 'credential request'
    `;

    const keys = {
      Alice: {
        'credential keypair': this.identity.keypairs.coconut
      }
    };

    const result = await zencode_exec(script, { 
      keys: JSON.stringify(keys) 
    });
    return JSON.parse(result.result)['credential request'];
  }

  /**
   * Verifica una credencial usando Coconut
   * @param {any} credential - Credencial a verificar
   * @param {any} issuerPublicKey - Clave pública del emisor
   * @returns {Promise<boolean>} Resultado de la verificación
   */
  async verifyCredential(credential, issuerPublicKey = null) {
    const script = `
      Scenario 'coconut': verify credential
      Given I have a 'credential'
      and I have a 'issuer public key'
      When I verify the credential
      Then print 'success' as 'string'
    `;

    const data = {
      credential: credential,
      'issuer public key': issuerPublicKey || DEFAULT_KEYS.issuer.public
    };

    try {
      const result = await zencode_exec(script, { 
        data: JSON.stringify(data) 
      });
      return JSON.parse(result.result).success === "true";
    } catch (error) {
      return false;
    }
  }

  /**
   * Firma un mensaje usando BLS
   * @param {string} message - Mensaje a firmar
   * @returns {Promise<any>} Signature
   */
  async signMessage(message) {
    if (!this.identity) {
      throw new Error('No hay identidad creada');
    }

    const script = `
      Scenario 'bls': sign message
      Given that I am known as 'Alice'
      and I have my 'bls keypair'
      and I have a 'message' named 'msg'
      When I create the bls signature of 'msg'
      Then print the 'bls signature'
    `;

    const keys = {
      Alice: {
        'bls keypair': this.identity.keypairs.bls
      }
    };

    const data = {
      msg: message
    };

    const result = await zencode_exec(script, { 
      keys: JSON.stringify(keys),
      data: JSON.stringify(data)
    });
    return JSON.parse(result.result)['bls signature'];
  }

  /**
   * Verifica una firma BLS
   * @param {string} message - Mensaje original
   * @param {any} signature - Firma a verificar
   * @param {any} publicKey - Clave pública del firmante
   * @returns {Promise<boolean>} Resultado de la verificación
   */
  async verifySignature(message, signature, publicKey = null) {
    const script = `
      Scenario 'bls': verify signature
      Given I have a 'bls public key'
      and I have a 'bls signature'
      and I have a 'message' named 'msg'
      When I verify the 'msg' has a bls signature in 'bls signature' by 'bls public key'
      Then print 'success' as 'string'
    `;

    const data = {
      'bls public key': publicKey || (this.identity ? this.identity.publicKeys.bls : null),
      'bls signature': signature,
      msg: message
    };

    try {
      const result = await zencode_exec(script, { 
        data: JSON.stringify(data) 
      });
      return JSON.parse(result.result).success === "true";
    } catch (error) {
      return false;
    }
  }

  /**
   * Exporta la identidad para almacenamiento o transferencia
   * @param {boolean} includePrivateKeys - Si incluir claves privadas
   * @returns {any} Identidad exportada
   */
  exportIdentity(includePrivateKeys = false) {
    if (!this.identity) {
      throw new Error('No hay identidad para exportar');
    }

    /** @type {any} */
    const exported = {
      id: this.identity.id,
      version: this.identity.version,
      created: this.identity.created,
      updated: this.identity.updated,
      personal: { ...this.identity.personal },
      publicKeys: { ...this.identity.publicKeys },
      metadata: { ...this.identity.metadata }
    };

    if (includePrivateKeys) {
      const identityWithKeypairs = /** @type {any} */ (this.identity);
      if (identityWithKeypairs.keypairs) {
        exported.keypairs = { ...identityWithKeypairs.keypairs };
      }
    }

    return exported;
  }

  /**
   * Importa una identidad desde datos exportados
   * @param {any} identityData - Datos de identidad
   * @returns {any} Identidad importada
   */
  importIdentity(identityData) {
    // Validar estructura básica
    if (!identityData?.id || !identityData?.publicKeys) {
      throw new Error('Datos de identidad inválidos');
    }

    this.identity = {
      ...identityData,
      updated: new Date().toISOString()
    };

    return this.identity;
  }

  /**
   * Valida información personal
   * @param {PersonalInfo} personalInfo - Información a validar
   */
  validatePersonalInfo(personalInfo) {
    if (!personalInfo.name || personalInfo.name.trim().length === 0) {
      throw new Error('El nombre es requerido');
    }

    if (!personalInfo.birthDate) {
      throw new Error('La fecha de nacimiento es requerida');
    }

    const birthDate = new Date(personalInfo.birthDate);
    const today = new Date();

    if (birthDate > today) {
      throw new Error('La fecha de nacimiento no puede ser futura');
    }

    const age = today.getFullYear() - birthDate.getFullYear();
    if (age > 150) {
      throw new Error('La edad no puede ser mayor a 150 años');
    }
  }

  /**
   * Calcula edad y mayoría de edad
   * @param {string} birthDate - Fecha de nacimiento
   * @returns {AgeInfo} Información de edad
   */
  calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return {
      age: age,
      isAdult: age >= 18,
      birthDate: birthDate
    };
  }

  /**
   * Genera un UUID v4
   * @returns {string} UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Obtiene información de la identidad actual
   * @returns {Object|null} Identidad actual
   */
  getCurrentIdentity() {
    return this.identity;
  }

  /**
   * Revoca la identidad actual
   */
  revokeIdentity() {
    if (this.identity) {
      this.identity.metadata.revoked = true;
      this.identity.updated = new Date().toISOString();
    }
  }

  /**
   * Verifica si la identidad está revocada
   * @returns {boolean} Estado de revocación
   */
  isRevoked() {
    return this.identity ? this.identity.metadata.revoked : false;
  }

  /**
   * Actualiza metadatos de la identidad
   * @param {Object} updates - Actualizaciones
   */
  updateMetadata(updates) {
    if (this.identity) {
      this.identity.metadata = { ...this.identity.metadata, ...updates };
      this.identity.updated = new Date().toISOString();
    }
  }
}

/**
 * Funciones utilitarias para manejo de identidades
 */

/**
 * Crea una nueva instancia de DigitalIdentity
 * @param {Object} config - Configuración
 * @returns {DigitalIdentity} Nueva instancia
 */
export function createIdentity(config = {}) {
  return new DigitalIdentity(config);
}

/**
 * Valida una identidad digital
 * @param {any} identity - Identidad a validar
 * @returns {boolean} Es válida
 */
export function validateIdentity(identity) {
  if (!identity || typeof identity !== 'object') {
    return false;
  }

  const required = ['id', 'version', 'created', 'personal', 'publicKeys', 'metadata'];
  return required.every(field => identity.hasOwnProperty(field));
}

/**
 * Compara dos identidades
 * @param {any} identity1 - Primera identidad
 * @param {any} identity2 - Segunda identidad
 * @returns {boolean} Son iguales
 */
export function compareIdentities(identity1, identity2) {
  if (!identity1 || !identity2) {
    return false;
  }

  return identity1.id === identity2.id && 
         identity1.version === identity2.version &&
         identity1.publicKeys.coconut === identity2.publicKeys.coconut;
}

/**
 * Obtiene información resumida de una identidad
 * @param {any} identity - Identidad
 * @returns {IdentitySummary | null} Resumen
 */
export function getIdentitySummary(identity) {
  if (!identity) {
    return null;
  }

  return {
    id: identity.id,
    name: identity.personal.name,
    age: identity.personal.age,
    isAdult: identity.personal.isAdult,
    created: identity.created,
    verified: identity.metadata.verified,
    revoked: identity.metadata.revoked
  };
}

/**
 * Formatea una clave pública para mostrar
 * @param {string} publicKey - Clave pública
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Clave formateada
 */
export function formatPublicKey(publicKey, maxLength = 20) {
  if (!publicKey) return '';
  
  if (publicKey.length <= maxLength) {
    return publicKey;
  }

  const start = publicKey.substring(0, maxLength / 2);
  const end = publicKey.substring(publicKey.length - maxLength / 2);
  return `${start}...${end}`;
}

/**
 * Constantes exportadas
 */
export const IDENTITY_VERSIONS = {
  V1_0: '1.0'
};

export const KEY_TYPES = {
  COCONUT: 'coconut',
  BLS: 'bls',
  ECDSA: 'ecdsa'
};

export const CURVES = {
  BLS12_381: 'bls12381',
  SECP256K1: 'secp256k1',
  ED25519: 'ed25519'
};

export { DEFAULT_CONFIG, DEFAULT_KEYS };