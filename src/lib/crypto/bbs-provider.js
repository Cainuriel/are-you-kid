/**
 * BBS+ Provider Real
 * Implementación real de BBS+ usando @mattrglobal/bbs-signatures
 * Reemplaza las funciones de Zenroom que no funcionan
 */

// @ts-nocheck
import { 
  generateBls12381G2KeyPair, 
  blsSign, 
  blsCreateProof, 
  blsVerifyProof 
} from '@mattrglobal/bbs-signatures';

/**
 * Clase principal para manejo de BBS+
 */
class BBSProvider {
  constructor() {
    this.keyPairs = new Map(); // Cache de keypairs
    this.credentials = new Map(); // Cache de credentials
  }

  /**
   * Generar un nuevo keypair BBS+
   */
  async generateKeyPair() {
    const keyPair = await generateBls12381G2KeyPair();
    const id = Buffer.from(keyPair.publicKey).toString('hex').substring(0, 16);
    
    // Guardar en cache
    this.keyPairs.set(id, keyPair);
    
    return {
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey,
      id,
      publicKeyHex: Buffer.from(keyPair.publicKey).toString('hex'),
      secretKeyHex: Buffer.from(keyPair.secretKey).toString('hex')
    };
  }

  /**
   * Crear una credential firmada (equivalente a issuer firma los atributos)
   */
  async issueCredential({ issuerId, attributes }) {
    const keyPair = this.keyPairs.get(issuerId);
    if (!keyPair) {
      throw new Error(`KeyPair no encontrado para issuer: ${issuerId}`);
    }

    // Convertir atributos a array de mensajes
    const messages = this._attributesToMessages(attributes);
    
    // Crear firma BBS+
    const signature = await blsSign({
      keyPair,
      messages
    });

    const credentialId = this._generateCredentialId(signature);
    
    const credential = {
      signature: Buffer.from(signature).toString('hex'),
      credentialId,
      attributes,
      id: credentialId,
      messages: messages.map(m => Buffer.from(m).toString('hex')),
      issuerId,
      issuerPublicKey: Buffer.from(keyPair.publicKey).toString('hex'),
      timestamp: new Date().toISOString()
    };

    // Guardar en cache
    this.credentials.set(credentialId, credential);

    return credential;
  }

  /**
   * Crear una prueba ZK selectiva
   */
  async createSelectiveProof({ credentialId, revealedIndices, nonce }) {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error(`Credential no encontrada: ${credentialId}`);
    }

    const keyPair = this.keyPairs.get(credential.issuerId);
    if (!keyPair) {
      throw new Error(`KeyPair no encontrado para issuer: ${credential.issuerId}`);
    }

    // Convertir nonce si no se proporciona
    const proofNonce = nonce ? 
      Uint8Array.from(Buffer.from(nonce, 'utf-8')) : 
      Uint8Array.from(Buffer.from(`proof-${Date.now()}`, 'utf-8'));

    // Reconstruir mensajes
    const messages = credential.messages.map(hex => 
      Uint8Array.from(Buffer.from(hex, 'hex'))
    );

    // Crear prueba
    const proof = await blsCreateProof({
      signature: Uint8Array.from(Buffer.from(credential.signature, 'hex')),
      publicKey: keyPair.publicKey,
      messages,
      revealed: revealedIndices,
      nonce: proofNonce
    });

    // Extraer mensajes revelados
    const revealedMessages = revealedIndices.map(index => credential.messages[index]);

    return {
      proof: Buffer.from(proof).toString('hex'),
      revealedMessages,
      revealedIndices,
      nonce: Buffer.from(proofNonce).toString('hex'),
      credentialId,
      issuerPublicKey: credential.issuerPublicKey
    };
  }

  /**
   * Verificar una prueba ZK BBS+
   */
  async verifyProof({ proof, revealedMessages, issuerPublicKey, nonce }) {
    try {
      // Convertir de hex a Uint8Array
      const proofBytes = Uint8Array.from(Buffer.from(proof, 'hex'));
      const publicKeyBytes = Uint8Array.from(Buffer.from(issuerPublicKey, 'hex'));
      const nonceBytes = Uint8Array.from(Buffer.from(nonce, 'hex'));
      const messageBytes = revealedMessages.map(hex => 
        Uint8Array.from(Buffer.from(hex, 'hex'))
      );

      // Verificar prueba
      const result = await blsVerifyProof({
        proof: proofBytes,
        publicKey: publicKeyBytes,
        messages: messageBytes,
        nonce: nonceBytes
      });

      return result.verified === true;
    } catch (error) {
      console.error('Error verificando prueba BBS+:', error);
      return false;
    }
  }

  /**
   * Métodos helper internos
   */

  /**
   * Convertir objeto de atributos a array de mensajes para BBS+
   */
  _attributesToMessages(attributes) {
    // Orden determinista de atributos
    const orderedKeys = Object.keys(attributes).sort();
    return orderedKeys.map(key => 
      Uint8Array.from(Buffer.from(String(attributes[key]), 'utf-8'))
    );
  }

  /**
   * Generar ID único para credential
   */
  _generateCredentialId(signature) {
    return 'cred_' + Buffer.from(signature).toString('hex').substring(0, 16);
  }

  /**
   * Obtener información de una credential
   */
  getCredential(credentialId) {
    return this.credentials.get(credentialId) || null;
  }

  /**
   * Obtener información de un keypair
   */
  getKeyPair(keyPairId) {
    const keyPair = this.keyPairs.get(keyPairId);
    if (!keyPair) return null;
    
    return {
      id: keyPairId,
      publicKey: keyPair.publicKey,
      publicKeyHex: Buffer.from(keyPair.publicKey).toString('hex'),
      hasSecretKey: !!keyPair.secretKey
    };
  }

  /**
   * Limpiar cache
   */
  clearCache() {
    this.keyPairs.clear();
    this.credentials.clear();
  }
}

// =============================================================================
// FUNCIONES DE CONVENIENCIA PARA LA APLICACIÓN
// =============================================================================

// Instancia singleton
const bbsProvider = new BBSProvider();

/**
 * Crear un issuer de identidades (equivalente a autoridad de certificación)
 */
export async function createIdentityIssuer() {
  const keyPair = await bbsProvider.generateKeyPair();
  
  return {
    issuerId: keyPair.id,
    publicKey: keyPair.publicKeyHex,
    secretKey: keyPair.secretKeyHex // Solo para demo, en producción esto sería secreto
  };
}

/**
 * Emitir credential de identidad para un usuario
 */
export async function issueIdentityCredential({ issuerId, userIdentity }) {
  // Preparar atributos en formato estándar
  const attributes = {
    user_id: userIdentity?.personal?.id || userIdentity?.id || 'unknown',
    name: userIdentity?.personal?.name || userIdentity?.name || 'unknown', 
    age: String(userIdentity?.personal?.age || userIdentity?.age || 0),
    country: userIdentity?.personal?.country || userIdentity?.country || 'unknown',
    over_18: String((userIdentity?.personal?.age || userIdentity?.age || 0) >= 18),
    over_21: String((userIdentity?.personal?.age || userIdentity?.age || 0) >= 21),
    timestamp: new Date().toISOString()
  };

  return await bbsProvider.issueCredential({ issuerId, attributes });
}

/**
 * Crear prueba de mayoría de edad (sin revelar edad exacta)
 */
export async function createAgeProof({ credentialId, ageThreshold = 18 }) {
  // Determinar qué atributo revelar según el umbral
  const attributeMapping = {
    'user_id': 0,
    'name': 1, 
    'age': 2,
    'country': 3,
    'over_18': 4,
    'over_21': 5,
    'timestamp': 6
  };

  let revealedIndices;
  if (ageThreshold === 18) {
    revealedIndices = [attributeMapping.over_18]; // Solo revelar que es mayor de 18
  } else if (ageThreshold === 21) {
    revealedIndices = [attributeMapping.over_18, attributeMapping.over_21]; // Revelar ambos
  } else {
    throw new Error(`Umbral de edad no soportado: ${ageThreshold}`);
  }

  const proof = await bbsProvider.createSelectiveProof({
    credentialId,
    revealedIndices,
    nonce: `age-verification-${ageThreshold}-${Date.now()}`
  });

  return {
    ...proof,
    ageThreshold,
    proofType: 'bbs_age_verification'
  };
}

/**
 * Verificar prueba de mayoría de edad
 */
export async function verifyAgeProof({ proof, expectedThreshold = 18 }) {
  try {
    // Verificar la prueba criptográfica
    const isValid = await bbsProvider.verifyProof({
      proof: proof.proof,
      revealedMessages: proof.revealedMessages,
      issuerPublicKey: proof.issuerPublicKey,
      nonce: proof.nonce
    });

    if (!isValid) {
      return { isValid: false, details: { error: 'Prueba criptográfica inválida' } };
    }

    // Verificar el contenido lógico
    const revealedValues = proof.revealedMessages.map(hex => 
      Buffer.from(hex, 'hex').toString('utf-8')
    );

    let meetsThreshold = false;
    if (expectedThreshold === 18) {
      // Debe mostrar over_18 = "true"
      meetsThreshold = revealedValues.includes('true');
    } else if (expectedThreshold === 21) {
      // Debe mostrar over_18 = "true" Y over_21 = "true"
      const hasOver18 = revealedValues.includes('true');
      const hasOver21 = revealedValues.filter(v => v === 'true').length >= 2;
      meetsThreshold = hasOver18 && hasOver21;
    }

    return {
      isValid: isValid && meetsThreshold,
      details: {
        cryptographicProof: isValid,
        ageRequirement: meetsThreshold,
        threshold: expectedThreshold,
        revealedValues,
        proofType: proof.proofType || 'bbs_age_verification'
      }
    };

  } catch (error) {
    return {
      isValid: false,
      details: { error: error.message }
    };
  }
}

/**
 * Función helper para testing y debugging
 */
export function getBBSProviderInstance() {
  return bbsProvider;
}

/**
 * Función para limpiar el estado (útil para tests)
 */
export function resetBBSProvider() {
  bbsProvider.clearCache();
}

// Exportar también la clase para uso avanzado
export { BBSProvider };
