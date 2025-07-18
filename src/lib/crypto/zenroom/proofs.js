import { zencode_exec } from 'zenroom';

/**
 * Librería para manejo de pruebas Zero Knowledge usando Zenroom
 * Soporta protocolos Coconut, BBS+, y range proofs para identidad digital
 */

// Configuración por defecto para pruebas
const DEFAULT_PROOF_CONFIG = {
  ageThreshold: 18,
  issuer: 'DefaultIssuer',
  proofType: 'age_verification',
  zkpProtocol: 'coconut',
  hashAlgorithm: 'sha256',
  curve: 'bls12381'
};

// Claves públicas por defecto para verificación
const DEFAULT_ISSUER_KEYS = {
  coconut: "BBA6KpjwgGHEr4Q8u5hWk6k2q5K1KxWyAZrAKEHkV4JVFLvqKmNwV8bJdNcPVtjHU4JQX1DdRwK6W8VNvMJGKQ8UX",
  bbs: "BLKvX1MWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8TNKzZ1NWpjw8H5KOIyIjKd8YK",
  verifier: "BMNuZ1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8TQRtY1NWpjw8H5KOIyIjKd8YK"
};

/**
 * Tipos de predicados soportados
 */
export const PREDICATES = {
  AGE_OVER: 'age_over',
  AGE_UNDER: 'age_under',
  AGE_BETWEEN: 'age_between',
  NATIONALITY: 'nationality',
  IDENTITY_VERIFIED: 'identity_verified',
  CUSTOM: 'custom'
};

/**
 * Protocolos ZK soportados
 */
export const ZK_PROTOCOLS = {
  COCONUT: 'coconut',
  BBS_PLUS: 'bbs',
  LONGFELLOW: 'longfellow'
};

/**
 * Clase principal para manejo de pruebas Zero Knowledge
 */
export class ZKProofManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_PROOF_CONFIG, ...config };
    /** @type {Array<any>} */
    this.proofs = [];
    /** @type {Array<any>} */
    this.verifications = [];
  }

  /**
   * Genera una prueba ZK de verificación de edad usando Coconut
   * @param {any} identity - Identidad digital
   * @param {number} ageThreshold - Umbral de edad (default: 18)
   * @param {any} issuerPublicKey - Clave pública del emisor
   * @returns {Promise<any>} Prueba ZK generada
   */
  async generateAgeProofCoconut(identity, ageThreshold = 18, issuerPublicKey = null) {
    if (!identity || !identity.keypairs || !identity.keypairs.coconut) {
      throw new Error('Identidad inválida o sin keypair Coconut');
    }

    try {
      // Script Zencode para generar prueba de edad
      const script = `
        Scenario coconut
        Given that I am known as 'Alice'
        and I have my 'credential keypair'
        and I have a 'age_threshold' inside 'request'
        and I have my 'age' inside 'personal_data'
        When I create the credential proof
        and I prove I am older than 'age_threshold'
        Then print the 'age_proof'
        and print the 'proof_metadata'
      `;

      const keys = {
        Alice: {
          'credential keypair': identity.keypairs.coconut
        }
      };

      const data = {
        request: {
          age_threshold: ageThreshold.toString()
        },
        personal_data: {
          age: identity.personal.age.toString()
        }
      };

      const result = await zencode_exec(script, { 
        keys: JSON.stringify(keys), 
        data: JSON.stringify(data) 
      });
      const parsed = JSON.parse(result.result);

      // Crear estructura de prueba completa
      const proof = {
        id: this.generateProofId(),
        type: 'age_verification',
        protocol: 'coconut',
        version: '1.0',
        created: new Date().toISOString(),
        
        // Datos de la prueba
        proof: parsed.age_proof,
        metadata: {
          ageThreshold: ageThreshold,
          issuer: issuerPublicKey || DEFAULT_ISSUER_KEYS.coconut,
          prover: identity.id,
          verified: false
        },

        // Información pública (no sensible)
        public: {
          predicateType: PREDICATES.AGE_OVER,
          threshold: ageThreshold,
          protocol: ZK_PROTOCOLS.COCONUT,
          curve: this.config.curve
        }
      };

      this.proofs.push(proof);
      return proof;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error generando prueba Coconut: ${errorMessage}`);
    }
  }

  /**
   * Genera una prueba BBS+ para selective disclosure
   * @param {any} identity - Identidad digital
   * @param {Array<string>} attributesToReveal - Atributos a revelar
   * @param {any} issuerPublicKey - Clave pública del emisor
   * @returns {Promise<any>} Prueba BBS+ generada
   */
  async generateSelectiveDisclosureProof(identity, attributesToReveal = ['age_over_18'], issuerPublicKey = null) {
    if (!identity || !identity.keypairs || !identity.keypairs.bls) {
      throw new Error('Identidad inválida o sin keypair BLS');
    }

    try {
      const script = `
        Scenario bbs
        Given that I am known as 'Alice'
        and I have my 'bls keypair'
        and I have a 'attributes' inside 'credential_data'
        and I have a 'disclosed_attributes' inside 'request'
        When I create the selective disclosure proof
        Then print the 'selective_disclosure_proof'
        and print the 'disclosed_attributes'
      `;

      const keys = {
        Alice: {
          'bls keypair': identity.keypairs.bls
        }
      };

      // Preparar atributos de la credencial
      const credentialAttributes = {
        name: identity.personal.name,
        age: identity.personal.age.toString(),
        age_over_18: identity.personal.isAdult ? "true" : "false",
        nationality: identity.personal.nationality,
        verified: identity.metadata.verified ? "true" : "false"
      };

      const data = {
        credential_data: {
          attributes: credentialAttributes
        },
        request: {
          disclosed_attributes: attributesToReveal
        }
      };

      const result = await zencode_exec(script, { 
        keys: JSON.stringify(keys), 
        data: JSON.stringify(data) 
      });
      const parsed = JSON.parse(result.result);

      const proof = {
        id: this.generateProofId(),
        type: 'selective_disclosure',
        protocol: 'bbs',
        version: '1.0',
        created: new Date().toISOString(),
        
        proof: parsed.selective_disclosure_proof,
        disclosed: parsed.disclosed_attributes,
        
        metadata: {
          attributesRevealed: attributesToReveal,
          issuer: issuerPublicKey || DEFAULT_ISSUER_KEYS.bbs,
          prover: identity.id,
          verified: false
        },

        public: {
          predicateType: PREDICATES.CUSTOM,
          revealedCount: attributesToReveal.length,
          protocol: ZK_PROTOCOLS.BBS_PLUS,
          curve: this.config.curve
        }
      };

      this.proofs.push(proof);
      return proof;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error generando prueba BBS+: ${errorMessage}`);
    }
  }

  /**
   * Genera una prueba de rango de edad (ej: entre 18 y 65 años)
   * @param {any} identity - Identidad digital
   * @param {number} minAge - Edad mínima
   * @param {number} maxAge - Edad máxima
   * @returns {Promise<any>} Prueba de rango generada
   */
  async generateAgeRangeProof(identity, minAge = 18, maxAge = 65) {
    if (!identity || !identity.keypairs || !identity.keypairs.coconut) {
      throw new Error('Identidad inválida o sin keypair Coconut');
    }

    try {
      const script = `
        Scenario coconut
        Given that I am known as 'Alice'
        and I have my 'credential keypair'
        and I have a 'min_age' inside 'range'
        and I have a 'max_age' inside 'range'
        and I have my 'age' inside 'personal_data'
        When I create the credential proof
        and I prove my age is between 'min_age' and 'max_age'
        Then print the 'age_range_proof'
        and print the 'range_metadata'
      `;

      const keys = {
        Alice: {
          'credential keypair': identity.keypairs.coconut
        }
      };

      const data = {
        range: {
          min_age: minAge.toString(),
          max_age: maxAge.toString()
        },
        personal_data: {
          age: identity.personal.age.toString()
        }
      };

      const result = await zencode_exec(script, { 
        keys: JSON.stringify(keys), 
        data: JSON.stringify(data) 
      });
      const parsed = JSON.parse(result.result);

      const proof = {
        id: this.generateProofId(),
        type: 'age_range',
        protocol: 'coconut',
        version: '1.0',
        created: new Date().toISOString(),
        
        proof: parsed.age_range_proof,
        
        metadata: {
          minAge: minAge,
          maxAge: maxAge,
          prover: identity.id,
          verified: false
        },

        public: {
          predicateType: PREDICATES.AGE_BETWEEN,
          minThreshold: minAge,
          maxThreshold: maxAge,
          protocol: ZK_PROTOCOLS.COCONUT,
          curve: this.config.curve
        }
      };

      this.proofs.push(proof);
      return proof;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error generando prueba de rango: ${errorMessage}`);
    }
  }

  /**
   * Verifica una prueba ZK usando Coconut
   * @param {any} proof - Prueba a verificar
   * @param {any} issuerPublicKey - Clave pública del emisor
   * @returns {Promise<any>} Resultado de verificación
   */
  async verifyCoconutProof(proof, issuerPublicKey = null) {
    try {
      const script = `
        Scenario coconut
        Given I have a 'age_proof'
        and I have a 'age_threshold' inside 'verification_params'
        and I have a 'issuer_public_key'
        When I verify the credential proof
        and I verify the proof is older than 'age_threshold'
        Then print 'success' as 'string'
        and print 'age_verification' as 'string'
        and print 'verification_timestamp' as 'string'
      `;

      const data = {
        age_proof: proof.proof,
        verification_params: {
          age_threshold: proof.metadata.ageThreshold?.toString() || "18"
        },
        issuer_public_key: issuerPublicKey || proof.metadata.issuer || DEFAULT_ISSUER_KEYS.coconut
      };

      const result = await zencode_exec(script, { data: JSON.stringify(data) });
      const parsed = JSON.parse(result.result);

      const verification = {
        id: this.generateVerificationId(),
        proofId: proof.id,
        timestamp: new Date().toISOString(),
        success: parsed.success === "true",
        ageVerified: parsed.age_verification === "verified_over_threshold" || parsed.age_verification === "true",
        protocol: 'coconut',
        issuer: issuerPublicKey || proof.metadata.issuer,
        threshold: proof.metadata.ageThreshold || 18
      };

      this.verifications.push(verification);
      return verification;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        id: this.generateVerificationId(),
        proofId: proof.id,
        timestamp: new Date().toISOString(),
        success: false,
        ageVerified: false,
        error: errorMessage,
        protocol: 'coconut'
      };
    }
  }

  /**
   * Verifica una prueba BBS+ de selective disclosure
   * @param {any} proof - Prueba a verificar
   * @param {any} issuerPublicKey - Clave pública del emisor
   * @returns {Promise<any>} Resultado de verificación
   */
  async verifyBBSProof(proof, issuerPublicKey = null) {
    try {
      const script = `
        Scenario bbs
        Given I have a 'selective_disclosure_proof'
        and I have a 'public_key'
        and I have a 'disclosed_attributes'
        When I verify the selective disclosure proof
        and I verify the disclosed attributes are valid
        Then print 'success' as 'string'
        and print 'verified_attributes'
        and print 'verification_timestamp' as 'string'
      `;

      const data = {
        selective_disclosure_proof: proof.proof,
        public_key: issuerPublicKey || proof.metadata.issuer || DEFAULT_ISSUER_KEYS.bbs,
        disclosed_attributes: proof.disclosed
      };

      const result = await zencode_exec(script, { data: JSON.stringify(data) });
      const parsed = JSON.parse(result.result);

      const verification = {
        id: this.generateVerificationId(),
        proofId: proof.id,
        timestamp: new Date().toISOString(),
        success: parsed.success === "true",
        verifiedAttributes: parsed.verified_attributes,
        attributesRevealed: proof.metadata.attributesRevealed,
        protocol: 'bbs',
        issuer: issuerPublicKey || proof.metadata.issuer
      };

      this.verifications.push(verification);
      return verification;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        id: this.generateVerificationId(),
        proofId: proof.id,
        timestamp: new Date().toISOString(),
        success: false,
        error: errorMessage,
        protocol: 'bbs'
      };
    }
  }

  /**
   * Crea una prueba de ejemplo para testing
   * @param {string} type - Tipo de prueba (age_over, selective_disclosure, etc.)
   * @param {any} params - Parámetros adicionales
   * @returns {any} Prueba de ejemplo
   */
  createExampleProof(type = 'age_over', params = {}) {
    const baseProof = {
      id: this.generateProofId(),
      version: '1.0',
      created: new Date().toISOString(),
      metadata: {
        prover: 'example-identity-' + Math.random().toString(36).substr(2, 9),
        verified: false
      }
    };

    switch (type) {
      case 'age_over':
        return {
          ...baseProof,
          type: 'age_verification',
          protocol: 'coconut',
          proof: {
            pi_v: {
              c: "BNKzZ1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T",
              rr: "BLKvX1MWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T",
              rm: "BMNuZ1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T"
            },
            nu: "BQRtY1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T",
            sigma_prime: {
              h_prime: "BPStX1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T",
              s_prime: "BOLvZ1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T"
            },
            kappa: "BQKtY1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T"
          },
          metadata: {
            ...baseProof.metadata,
            ageThreshold: params.ageThreshold || 18,
            issuer: DEFAULT_ISSUER_KEYS.coconut
          },
          public: {
            predicateType: PREDICATES.AGE_OVER,
            threshold: params.ageThreshold || 18,
            protocol: ZK_PROTOCOLS.COCONUT,
            curve: 'bls12381'
          }
        };

      case 'selective_disclosure':
        return {
          ...baseProof,
          type: 'selective_disclosure',
          protocol: 'bbs',
          proof: {
            proof_value: "BQKtY1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T",
            disclosed_indexes: [0, 2],
            commitment: "BPStX1NWpjw8H5KOIyIjKd8YKjNm8vPCJzM2Y6X9JyY8F2L5K9N3V7R1Q4W2E8T"
          },
          disclosed: {
            age_over_18: "true",
            nationality: params.nationality || "ES"
          },
          metadata: {
            ...baseProof.metadata,
            attributesRevealed: params.attributes || ['age_over_18', 'nationality'],
            issuer: DEFAULT_ISSUER_KEYS.bbs
          },
          public: {
            predicateType: PREDICATES.CUSTOM,
            revealedCount: params.attributes?.length || 2,
            protocol: ZK_PROTOCOLS.BBS_PLUS,
            curve: 'bls12381'
          }
        };

      default:
        throw new Error(`Tipo de prueba no soportado: ${type}`);
    }
  }

  /**
   * Serializa una prueba para almacenamiento o transmisión
   * @param {any} proof - Prueba a serializar
   * @returns {string} Prueba serializada en JSON
   */
  serializeProof(proof) {
    return JSON.stringify(proof, null, 2);
  }

  /**
   * Deserializa una prueba desde JSON
   * @param {string} serializedProof - Prueba serializada
   * @returns {any} Prueba deserializada
   */
  deserializeProof(serializedProof) {
    try {
      const proof = JSON.parse(serializedProof);
      this.validateProofStructure(proof);
      return proof;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error deserializando prueba: ${errorMessage}`);
    }
  }

  /**
   * Valida la estructura de una prueba
   * @param {any} proof - Prueba a validar
   * @returns {boolean} Es válida
   */
  validateProofStructure(proof) {
    const required = ['id', 'type', 'protocol', 'version', 'created', 'proof', 'metadata', 'public'];
    
    for (const field of required) {
      if (!proof.hasOwnProperty(field)) {
        throw new Error(`Campo requerido faltante: ${field}`);
      }
    }

    if (!Object.values(ZK_PROTOCOLS).includes(proof.protocol)) {
      throw new Error(`Protocolo no soportado: ${proof.protocol}`);
    }

    return true;
  }

  /**
   * Genera un ID único para pruebas
   * @returns {string} ID de prueba
   */
  generateProofId() {
    return 'proof_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Genera un ID único para verificaciones
   * @returns {string} ID de verificación
   */
  generateVerificationId() {
    return 'verify_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Obtiene todas las pruebas generadas
   * @returns {Array<any>} Lista de pruebas
   */
  getAllProofs() {
    return [...this.proofs];
  }

  /**
   * Obtiene todas las verificaciones realizadas
   * @returns {Array<any>} Lista de verificaciones
   */
  getAllVerifications() {
    return [...this.verifications];
  }

  /**
   * Limpia el historial de pruebas y verificaciones
   */
  clearHistory() {
    this.proofs = [];
    this.verifications = [];
  }
}

/**
 * Funciones utilitarias para manejo de pruebas
 */

/**
 * Crea una nueva instancia de ZKProofManager
 * @param {any} config - Configuración
 * @returns {ZKProofManager} Nueva instancia
 */
export function createProofManager(config = {}) {
  return new ZKProofManager(config);
}

/**
 * Verifica si una prueba es válida según su estructura
 * @param {any} proof - Prueba a verificar
 * @returns {boolean} Es estructuralmente válida
 */
export function isValidProof(proof) {
  try {
    const manager = new ZKProofManager();
    manager.validateProofStructure(proof);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extrae metadatos públicos de una prueba (información no sensible)
 * @param {any} proof - Prueba
 * @returns {any} Metadatos públicos
 */
export function getProofMetadata(proof) {
  return {
    id: proof.id,
    type: proof.type,
    protocol: proof.protocol,
    created: proof.created,
    public: proof.public,
    issuer: proof.metadata?.issuer
  };
}

/**
 * Compara dos pruebas para detectar duplicados
 * @param {any} proof1 - Primera prueba
 * @param {any} proof2 - Segunda prueba
 * @returns {boolean} Son iguales
 */
export function compareProofs(proof1, proof2) {
  return proof1.id === proof2.id && 
         proof1.type === proof2.type &&
         proof1.protocol === proof2.protocol &&
         JSON.stringify(proof1.proof) === JSON.stringify(proof2.proof);
}

/**
 * Formatea una prueba para mostrar en UI
 * @param {any} proof - Prueba
 * @returns {any} Información formateada
 */
export function formatProofForDisplay(proof) {
  return {
    id: proof.id,
    type: proof.type,
    protocol: proof.protocol.toUpperCase(),
    created: new Date(proof.created).toLocaleString(),
    predicateType: proof.public?.predicateType || 'unknown',
    threshold: proof.public?.threshold || proof.metadata?.ageThreshold || 'N/A',
    verified: proof.metadata?.verified || false
  };
}

// Exportar constantes
export { DEFAULT_PROOF_CONFIG, DEFAULT_ISSUER_KEYS };