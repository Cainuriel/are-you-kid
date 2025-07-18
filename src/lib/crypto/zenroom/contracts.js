/**
 * Librería de contratos Zencode para operaciones criptográficas
 * Contiene todos los scripts Zencode reutilizables para identidad digital y ZK proofs
 */

/**
 * Contratos para generación de identidades y keypairs
 */
export const IDENTITY_CONTRACTS = {
  /**
   * Genera un keypair Coconut para credentials
   */
  GENERATE_COCONUT_KEYPAIR: `
    Scenario 'coconut': credential keypair
    Given nothing
    When I create the credential keypair
    Then print the 'credential keypair'
  `,

  /**
   * Genera un keypair BLS para signatures
   */
  GENERATE_BLS_KEYPAIR: `
    Scenario 'bls': keypair
    Given nothing
    When I create the bls keypair
    Then print the 'bls keypair'
  `,

  /**
   * Genera un keypair ECDSA para blockchain
   */
  GENERATE_ECDSA_KEYPAIR: `
    Scenario 'ecdsa': keypair
    Given nothing
    When I create the ecdsa keypair
    Then print the 'ecdsa keypair'
  `,

  /**
   * Genera un keypair Ed25519 para signatures post-quantum
   */
  GENERATE_ED25519_KEYPAIR: `
    Scenario 'ed25519': keypair
    Given nothing
    When I create the ed25519 keypair
    Then print the 'ed25519 keypair'
  `,

  /**
   * Crea un credential request para obtener credenciales
   */
  CREATE_CREDENTIAL_REQUEST: `
    Scenario 'coconut': credential request
    Given that I am known as 'Alice'
    and I have my 'credential keypair'
    When I create the credential request
    Then print the 'credential request'
  `,

  /**
   * Verifica un keypair Coconut
   */
  VERIFY_COCONUT_KEYPAIR: `
    Scenario 'coconut': verify keypair
    Given that I am known as 'Alice'
    and I have my 'credential keypair'
    When I verify the credential keypair
    Then print 'keypair_valid' as 'string'
  `
};

/**
 * Contratos para pruebas Zero Knowledge
 */
export const PROOF_CONTRACTS = {
  /**
   * Genera prueba ZK de edad usando Coconut
   */
  COCONUT_AGE_PROOF: `
    Scenario coconut
    Given that I am known as 'Alice'
    and I have my 'credential keypair'
    and I have a 'age_threshold' inside 'request'
    and I have my 'age' inside 'personal_data'
    and I have a 'issuer_public_key'
    When I create the credential proof
    and I prove I am older than 'age_threshold'
    Then print the 'age_proof'
    and print the 'proof_metadata'
  `,

  /**
   * Genera prueba de rango de edad
   */
  COCONUT_AGE_RANGE_PROOF: `
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
  `,

  /**
   * Genera prueba BBS+ para selective disclosure
   */
  BBS_SELECTIVE_DISCLOSURE: `
    Scenario bbs
    Given that I am known as 'Alice'
    and I have my 'bls keypair'
    and I have a 'attributes' inside 'credential_data'
    and I have a 'disclosed_attributes' inside 'request'
    When I create the selective disclosure proof
    Then print the 'selective_disclosure_proof'
    and print the 'disclosed_attributes'
    and print the 'proof_metadata'
  `,

  /**
   * Genera proof-of-membership usando Coconut
   */
  COCONUT_MEMBERSHIP_PROOF: `
    Scenario coconut
    Given that I am known as 'Alice'
    and I have my 'credential keypair'
    and I have a 'group_id' inside 'membership_data'
    and I have a 'member_list' inside 'group_data'
    When I create the credential proof
    and I prove I am member of 'group_id'
    Then print the 'membership_proof'
    and print the 'group_verification'
  `,

  /**
   * Genera nullifier para prevenir double-spending
   */
  GENERATE_NULLIFIER: `
    Scenario coconut
    Given that I am known as 'Alice'
    and I have my 'credential keypair'
    and I have a 'serial_number' inside 'nullifier_data'
    and I have a 'context' inside 'nullifier_data'
    When I create the nullifier for 'serial_number' in 'context'
    Then print the 'nullifier'
    and print the 'nullifier_proof'
  `,

  /**
   * Genera prueba Longfellow para documentos oficiales
   */
  LONGFELLOW_DOCUMENT_PROOF: `
    Scenario longfellow
    Given that I am known as 'Alice'
    and I have my 'longfellow keypair'
    and I have a 'document_hash' inside 'document_data'
    and I have a 'predicates' inside 'verification_params'
    When I create the longfellow proof for 'document_hash'
    and I apply predicates from 'predicates'
    Then print the 'longfellow_proof'
    and print the 'document_verification'
  `
};

/**
 * Contratos para verificación de pruebas
 */
export const VERIFICATION_CONTRACTS = {
  /**
   * Verifica prueba ZK de edad Coconut
   */
  VERIFY_COCONUT_AGE_PROOF: `
    Scenario coconut
    Given I have a 'age_proof'
    and I have a 'age_threshold' inside 'verification_params'
    and I have a 'issuer_public_key'
    When I verify the credential proof
    and I verify the proof is older than 'age_threshold'
    Then print 'success' as 'string'
    and print 'age_verification' as 'string'
    and print 'verification_timestamp' as 'string'
  `,

  /**
   * Verifica prueba de rango de edad
   */
  VERIFY_COCONUT_AGE_RANGE: `
    Scenario coconut
    Given I have a 'age_range_proof'
    and I have a 'min_age' inside 'range_params'
    and I have a 'max_age' inside 'range_params'
    and I have a 'issuer_public_key'
    When I verify the credential proof
    and I verify the age is between 'min_age' and 'max_age'
    Then print 'success' as 'string'
    and print 'range_verification' as 'string'
    and print 'verification_timestamp' as 'string'
  `,

  /**
   * Verifica prueba BBS+ selective disclosure
   */
  VERIFY_BBS_SELECTIVE_DISCLOSURE: `
    Scenario bbs
    Given I have a 'selective_disclosure_proof'
    and I have a 'public_key'
    and I have a 'disclosed_attributes'
    When I verify the selective disclosure proof
    and I verify the disclosed attributes are valid
    Then print 'success' as 'string'
    and print 'verified_attributes'
    and print 'verification_timestamp' as 'string'
  `,

  /**
   * Verifica membership proof
   */
  VERIFY_MEMBERSHIP_PROOF: `
    Scenario coconut
    Given I have a 'membership_proof'
    and I have a 'group_public_key'
    and I have a 'group_id' inside 'verification_params'
    When I verify the credential proof
    and I verify the membership in 'group_id'
    Then print 'success' as 'string'
    and print 'membership_verified' as 'string'
    and print 'group_verification' as 'string'
  `,

  /**
   * Verifica nullifier y detecta double-spending
   */
  VERIFY_NULLIFIER: `
    Scenario coconut
    Given I have a 'nullifier'
    and I have a 'nullifier_proof'
    and I have a 'nullifier_list' inside 'spent_nullifiers'
    and I have a 'context' inside 'verification_params'
    When I verify the nullifier proof
    and I check if nullifier is in 'nullifier_list'
    Then print 'nullifier_valid' as 'string'
    and print 'already_spent' as 'string'
    and print 'verification_result' as 'string'
  `,

  /**
   * Verifica prueba Longfellow
   */
  VERIFY_LONGFELLOW_PROOF: `
    Scenario longfellow
    Given I have a 'longfellow_proof'
    and I have a 'authority_public_key'
    and I have a 'predicates' inside 'verification_params'
    When I verify the longfellow proof
    and I check all predicates are satisfied
    Then print 'success' as 'string'
    and print 'predicates_verified' as 'string'
    and print 'authority_verification' as 'string'
  `
};

/**
 * Contratos para operaciones de firma digital
 */
export const SIGNATURE_CONTRACTS = {
  /**
   * Firma un mensaje usando BLS
   */
  BLS_SIGN_MESSAGE: `
    Scenario 'bls': sign message
    Given that I am known as 'Alice'
    and I have my 'bls keypair'
    and I have a 'message' named 'msg'
    When I create the bls signature of 'msg'
    Then print the 'bls signature'
  `,

  /**
   * Verifica firma BLS
   */
  BLS_VERIFY_SIGNATURE: `
    Scenario 'bls': verify signature
    Given I have a 'bls public key'
    and I have a 'bls signature'
    and I have a 'message' named 'msg'
    When I verify the 'msg' has a bls signature in 'bls signature' by 'bls public key'
    Then print 'success' as 'string'
  `,

  /**
   * Firma usando ECDSA
   */
  ECDSA_SIGN_MESSAGE: `
    Scenario 'ecdsa': sign message
    Given that I am known as 'Alice'
    and I have my 'ecdsa keypair'
    and I have a 'message' named 'msg'
    When I create the ecdsa signature of 'msg'
    Then print the 'ecdsa signature'
  `,

  /**
   * Verifica firma ECDSA
   */
  ECDSA_VERIFY_SIGNATURE: `
    Scenario 'ecdsa': verify signature
    Given I have a 'ecdsa public key'
    and I have a 'ecdsa signature'
    and I have a 'message' named 'msg'
    When I verify the 'msg' has a ecdsa signature in 'ecdsa signature' by 'ecdsa public key'
    Then print 'success' as 'string'
  `,

  /**
   * Agregación de firmas BLS
   */
  BLS_AGGREGATE_SIGNATURES: `
    Scenario 'bls': aggregate signatures
    Given I have a 'signature_list' inside 'signatures'
    and I have a 'public_key_list' inside 'public_keys'
    When I create the bls aggregate signature from 'signature_list'
    and I create the bls aggregate public key from 'public_key_list'
    Then print the 'bls aggregate signature'
    and print the 'bls aggregate public key'
  `
};

/**
 * Contratos para operaciones blockchain
 */
export const BLOCKCHAIN_CONTRACTS = {
  /**
   * Prepara datos para smart contract
   */
  PREPARE_BLOCKCHAIN_DATA: `
    Scenario 'ethereum': prepare transaction
    Given I have a 'proof_data' inside 'zk_proof'
    and I have a 'contract_address' inside 'blockchain_params'
    and I have a 'function_selector' inside 'blockchain_params'
    When I format the proof for ethereum
    and I prepare the transaction data
    Then print the 'transaction_data'
    and print the 'proof_parameters'
  `,

  /**
   * Verifica proof on-chain (simulado)
   */
  SIMULATE_ONCHAIN_VERIFICATION: `
    Scenario 'ethereum': verify on-chain
    Given I have a 'proof_data' inside 'verification_request'
    and I have a 'verifier_contract' inside 'blockchain_params'
    and I have a 'gas_limit' inside 'transaction_params'
    When I simulate the on-chain verification
    and I calculate the gas consumption
    Then print 'verification_result' as 'string'
    and print 'gas_used' as 'string'
    and print 'transaction_hash' as 'string'
  `,

  /**
   * Crea hash commitment para blockchain
   */
  CREATE_COMMITMENT: `
    Scenario 'commitment': create hash
    Given I have a 'secret_value' inside 'commitment_data'
    and I have a 'randomness' inside 'commitment_data'
    When I create the hash commitment of 'secret_value' and 'randomness'
    Then print the 'commitment'
    and print the 'commitment_metadata'
  `,

  /**
   * Revela commitment
   */
  REVEAL_COMMITMENT: `
    Scenario 'commitment': reveal
    Given I have a 'commitment'
    and I have a 'secret_value' inside 'reveal_data'
    and I have a 'randomness' inside 'reveal_data'
    When I verify the commitment matches 'secret_value' and 'randomness'
    Then print 'commitment_valid' as 'string'
    and print 'revealed_value' as 'string'
  `
};

/**
 * Contratos para operaciones avanzadas
 */
export const ADVANCED_CONTRACTS = {
  /**
   * Threshold signatures con múltiples firmantes
   */
  THRESHOLD_SIGNATURE: `
    Scenario 'threshold': create signature
    Given I have a 'message' named 'msg'
    and I have a 'threshold' inside 'threshold_params'
    and I have a 'participant_keys' inside 'threshold_params'
    and I have a 'signature_shares' inside 'shares'
    When I aggregate the signature shares
    and I verify the threshold is met
    Then print the 'threshold_signature'
    and print the 'participants_verified'
  `,

  /**
   * Ring signatures para anonimato
   */
  RING_SIGNATURE: `
    Scenario 'ring': create signature
    Given that I am known as 'Alice'
    and I have my 'ring keypair'
    and I have a 'message' named 'msg'
    and I have a 'ring_members' inside 'ring_data'
    When I create the ring signature of 'msg' with 'ring_members'
    Then print the 'ring signature'
    and print the 'ring_proof'
  `,

  /**
   * Zero-knowledge set membership
   */
  ZK_SET_MEMBERSHIP: `
    Scenario 'membership': prove membership
    Given that I am known as 'Alice'
    and I have my 'membership keypair'
    and I have a 'element' inside 'membership_data'
    and I have a 'set_commitment' inside 'set_data'
    When I prove 'element' is in the committed set
    Then print the 'membership_proof'
    and print the 'set_verification'
  `,

  /**
   * Homomorphic encryption operations
   */
  HOMOMORPHIC_ENCRYPTION: `
    Scenario 'homomorphic': encrypt and compute
    Given I have a 'plaintext_value' inside 'encryption_data'
    and I have a 'public_key' inside 'encryption_params'
    and I have a 'operation' inside 'computation_params'
    When I encrypt 'plaintext_value' with 'public_key'
    and I perform homomorphic 'operation'
    Then print the 'encrypted_result'
    and print the 'computation_proof'
  `
};

/**
 * Templates para contratos personalizados
 */
export const CONTRACT_TEMPLATES = {
  /**
   * Template básico para nuevos escenarios
   */
  BASIC_TEMPLATE: `
    Scenario '{scenario_name}': {operation_description}
    Given that I am known as '{participant_name}'
    and I have my '{keypair_type} keypair'
    and I have a '{input_data}' inside '{data_container}'
    When I {operation_verb} the {operation_target}
    Then print the '{output_result}'
  `,

  /**
   * Template para verificación
   */
  VERIFICATION_TEMPLATE: `
    Scenario '{scenario_name}': verify {proof_type}
    Given I have a '{proof_name}'
    and I have a '{public_key_name}'
    and I have a '{verification_params}' inside 'verification_data'
    When I verify the {proof_type} proof
    and I check {verification_condition}
    Then print 'success' as 'string'
    and print '{verification_result}' as 'string'
  `,

  /**
   * Template para agregación
   */
  AGGREGATION_TEMPLATE: `
    Scenario '{scenario_name}': aggregate {items_type}
    Given I have a '{items_list}' inside '{container_name}'
    and I have a '{aggregation_params}' inside 'params'
    When I aggregate all {items_type} from '{items_list}'
    and I verify the aggregation is valid
    Then print the '{aggregated_result}'
    and print the '{aggregation_proof}'
  `
};

/**
 * Utilidades para manejo de contratos
 */
export class ContractManager {
  constructor() {
    this.customContracts = new Map();
    /**
     * Historial de ejecuciones de contratos.
     * @type {Array<{contract: string, success: boolean, timestamp: string, metadata: Object}>}
     */
    this.contractHistory = [];
  }

  /**
   * Registra un contrato personalizado
   * @param {string} name - Nombre del contrato
   * @param {string} contract - Código Zencode
   * @param {any} metadata - Metadatos del contrato
   */
  registerCustomContract(name, contract, metadata = {}) {
    this.customContracts.set(name, {
      contract,
      metadata: {
        ...metadata,
        created: new Date().toISOString(),
        version: (metadata && metadata.version) ? metadata.version : '1.0'
      }
    });
  }

  /**
   * Obtiene un contrato por nombre
   * @param {string} name - Nombre del contrato
   * @returns {string} Código Zencode
   */
  getContract(name) {
    // Buscar en contratos estándar
    /** @type {any} */
    const standardContracts = {
      ...IDENTITY_CONTRACTS,
      ...PROOF_CONTRACTS,
      ...VERIFICATION_CONTRACTS,
      ...SIGNATURE_CONTRACTS,
      ...BLOCKCHAIN_CONTRACTS,
      ...ADVANCED_CONTRACTS
    };

    if (standardContracts[name]) {
      return standardContracts[name];
    }

    // Buscar en contratos personalizados
    const custom = this.customContracts.get(name);
    if (custom) {
      return custom.contract;
    }

    throw new Error(`Contrato no encontrado: ${name}`);
  }

  /**
   * Lista todos los contratos disponibles
   * @returns {any} Lista de nombres de contratos
   */
  listContracts() {
    const standard = Object.keys({
      ...IDENTITY_CONTRACTS,
      ...PROOF_CONTRACTS,
      ...VERIFICATION_CONTRACTS,
      ...SIGNATURE_CONTRACTS,
      ...BLOCKCHAIN_CONTRACTS,
      ...ADVANCED_CONTRACTS
    });

    const custom = Array.from(this.customContracts.keys());

    return {
      standard,
      custom,
      total: standard.length + custom.length
    };
  }

  /**
   * Crea un contrato desde template
   * @param {string} templateName - Nombre del template
   * @param {any} parameters - Parámetros para llenar el template
   * @returns {string} Contrato generado
   */
  createFromTemplate(templateName, parameters) {
    /** @type {any} */
    const templates = CONTRACT_TEMPLATES;
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template no encontrado: ${templateName}`);
    }

    let contract = template;
    
    // Reemplazar parámetros en el template
    Object.entries(parameters).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      contract = contract.replace(regex, value);
    });

    return contract;
  }

  /**
   * Valida la sintaxis de un contrato Zencode
   * @param {string} contract - Código Zencode
   * @returns {Object} Resultado de validación
   */
  validateContract(contract) {
    const errors = [];
    const warnings = [];

    // Validaciones básicas de sintaxis Zencode
    if (!contract.includes('Scenario')) {
      errors.push('Falta declaración de Scenario');
    }

    if (!contract.includes('Given')) {
      warnings.push('No hay declaraciones Given');
    }

    if (!contract.includes('When')) {
      errors.push('Falta declaración When');
    }

    if (!contract.includes('Then')) {
      errors.push('Falta declaración Then');
    }

    // Verificar paréntesis y comillas balanceadas
    const openParens = (contract.match(/\(/g) || []).length;
    const closeParens = (contract.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Paréntesis no balanceados');
    }

    const singleQuotes = (contract.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      errors.push('Comillas simples no balanceadas');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, 100 - (errors.length * 25) - (warnings.length * 10))
    };
  }

  /**
   * Obtiene estadísticas de uso de contratos
   * @returns {Object} Estadísticas
   */
  getUsageStats() {
    const usage = new Map();
    
    this.contractHistory.forEach(entry => {
      const count = usage.get(entry.contract) || 0;
      usage.set(entry.contract, count + 1);
    });

    return {
      totalExecutions: this.contractHistory.length,
      uniqueContracts: usage.size,
      mostUsed: Array.from(usage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      recentExecutions: this.contractHistory
        .slice(-10)
        .map(entry => ({
          contract: entry.contract,
          timestamp: entry.timestamp,
          success: entry.success
        }))
    };
  }

  /**
   * Registra la ejecución de un contrato
   * @param {string} contractName - Nombre del contrato
   * @param {boolean} success - Si la ejecución fue exitosa
   * @param {Object} metadata - Metadatos adicionales
   */
  logExecution(contractName, success, metadata = {}) {
    this.contractHistory.push({
      contract: contractName,
      success,
      timestamp: new Date().toISOString(),
      metadata
    });

    // Mantener solo los últimos 1000 registros
    if (this.contractHistory.length > 1000) {
      this.contractHistory = this.contractHistory.slice(-1000);
    }
  }

  /**
   * Exporta todos los contratos personalizados
   * @returns {any} Contratos exportados
   */
  exportCustomContracts() {
    /** @type {any} */
    const exported = {};
    this.customContracts.forEach((value, key) => {
      exported[key] = value;
    });
    return exported;
  }

  /**
   * Importa contratos personalizados
   * @param {Object} contracts - Contratos a importar
   */
  importCustomContracts(contracts) {
    Object.entries(contracts).forEach(([name, data]) => {
      this.customContracts.set(name, data);
    });
  }

  /**
   * Limpia el historial de ejecuciones
   */
  clearHistory() {
    this.contractHistory = [];
  }
}

/**
 * Funciones utilitarias
 */

/**
 * Crea una nueva instancia de ContractManager
 * @returns {ContractManager} Nueva instancia
 */
export function createContractManager() {
  return new ContractManager();
}

/**
 * Obtiene un contrato específico por categoría y nombre
 * @param {string} category - Categoría del contrato
 * @param {string} name - Nombre del contrato
 * @returns {string} Código Zencode
 */
export function getContractByCategory(category, name) {
  /** @type {any} */
  const categories = {
    identity: IDENTITY_CONTRACTS,
    proof: PROOF_CONTRACTS,
    verification: VERIFICATION_CONTRACTS,
    signature: SIGNATURE_CONTRACTS,
    blockchain: BLOCKCHAIN_CONTRACTS,
    advanced: ADVANCED_CONTRACTS
  };

  const categoryContracts = categories[category.toLowerCase()];
  if (!categoryContracts) {
    throw new Error(`Categoría no encontrada: ${category}`);
  }

  const contract = categoryContracts[name];
  if (!contract) {
    throw new Error(`Contrato no encontrado: ${name} en categoría ${category}`);
  }

  return contract;
}

/**
 * Lista contratos por categoría
 * @param {string} category - Categoría
 * @returns {Array<string>} Lista de contratos
 */
export function listContractsByCategory(category) {
  /** @type {any} */
  const categories = {
    identity: IDENTITY_CONTRACTS,
    proof: PROOF_CONTRACTS,
    verification: VERIFICATION_CONTRACTS,
    signature: SIGNATURE_CONTRACTS,
    blockchain: BLOCKCHAIN_CONTRACTS,
    advanced: ADVANCED_CONTRACTS
  };

  const categoryContracts = categories[category.toLowerCase()];
  if (!categoryContracts) {
    return [];
  }

  return Object.keys(categoryContracts);
}

/**
 * Obtiene todas las categorías disponibles
 * @returns {Array<string>} Lista de categorías
 */
export function getAvailableCategories() {
  return ['identity', 'proof', 'verification', 'signature', 'blockchain', 'advanced'];
}

// Instancia global del contract manager
export const globalContractManager = createContractManager();