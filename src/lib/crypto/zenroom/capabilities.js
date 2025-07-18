import { zencode_exec } from 'zenroom';

/**
 * Verifica las capacidades y extensiones disponibles en Zenroom
 */
export class ZenroomCapabilities {
  constructor() {
    this.capabilities = {
      basic: false,
      ecdh: false,
      eddsa: false,
      bls: false,
      coconut: false,
      bbs: false,
      /** @type {string[]} */
      available_scenarios: []
    };
    this.version = null;
    this.checked = false;
  }

  /**
   * Ejecuta diagnóstico completo de Zenroom
   */
  async checkAllCapabilities() {
    console.log('🔍 Iniciando diagnóstico sistemático de Zenroom...');
    
    try {
      // 1. Verificar operaciones básicas sin escenarios
      await this.checkBasicOperations();
      
      // 2. Solo probar escenarios si las operaciones básicas funcionan
      if (this.capabilities.basic) {
        await this.checkScenarios();
      } else {
        console.log('⚠️ Saltando test de escenarios debido a limitaciones básicas');
      }
      
      // 3. Obtener información de versión
      await this.getVersionInfo();
      
      this.checked = true;
      this.printCapabilitiesReport();
      
      return this.capabilities;
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      throw error;
    }
  }

  /**
   * Verifica operaciones básicas de Zenroom (sin escenarios)
   */
  async checkBasicOperations() {
    console.log('\n🔧 Probando operaciones básicas...');
    
    const basicTests = [
      {
        name: 'Random generation',
        script: `
          Given nothing
          When I create the random object of '32' bytes
          Then print the 'random object' as 'hex'
        `
      },
      {
        name: 'Hash operation', 
        script: `
          Given nothing
          When I write string 'hello world' in 'message'
          and I create the hash of 'message'
          Then print the 'hash' as 'hex'
        `
      },
      {
        name: 'JSON manipulation',
        script: `
          Given nothing
          When I write string 'test' in 'data'
          Then print the 'data'
        `
      }
    ];

    for (const test of basicTests) {
      try {
        const result = await zencode_exec(test.script, {});
        if (result.result) {
          console.log(`✅ ${test.name}: OK`);
          this.capabilities.basic = true;
        }
      } catch (error) {
        console.log(`❌ ${test.name}: FAIL -`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  /**
   * Prueba diferentes escenarios disponibles
   */
  async checkScenarios() {
    console.log('\n🎭 Probando escenarios disponibles...');
    
    const scenarios = [
      { name: 'ecdh', type: 'ecdh' },
      { name: 'eddsa', type: 'eddsa' }, 
      { name: 'bls381', type: 'bls' },
      { name: 'coconut', type: 'coconut' },
      { name: 'bbs', type: 'bbs' },
      { name: 'reflow', type: 'reflow' },
      { name: 'schnorr', type: 'schnorr' }
    ];

    for (const scenario of scenarios) {
      await this.testScenario(scenario.name, scenario.type);
    }
  }

  /**
   * Prueba un escenario específico
   * @param {string} scenarioName - Nombre del escenario a probar
   * @param {string} type - Tipo de capacidad a verificar
   */
  async testScenario(scenarioName, type) {
    const tests = {
      ecdh: [
        `Scenario '${scenarioName}': keypair
         Given nothing  
         When I create the keypair
         Then print my 'keyring'`,
        
        `Scenario '${scenarioName}': create keys
         Given nothing
         When I create the ecdh key
         Then print my 'ecdh public key'`
      ],
      
      eddsa: [
        `Scenario '${scenarioName}': create keys
         Given nothing
         When I create the eddsa key  
         Then print my 'eddsa public key'`
      ],
      
      bls: [
        `Scenario '${scenarioName}': create keys
         Given nothing
         When I create the bls key
         Then print my 'bls public key'`,
         
        `Given nothing
         When I create the bls key
         Then print my 'bls public key'`
      ],
      
      coconut: [
        `Scenario '${scenarioName}': create issuer keypair
         Given nothing
         When I create the issuer key
         Then print my 'issuer public key'`,
         
        `Scenario '${scenarioName}': keypair  
         Given nothing
         When I create the coconut keypair
         Then print my 'coconut public key'`,
         
        `Given nothing
         When I create the coconut keypair  
         Then print my 'coconut public key'`
      ],
      
      bbs: [
        `Scenario '${scenarioName}': create keys
         Given nothing  
         When I create the bbs key
         Then print my 'bbs public key'`
      ],
      
      reflow: [
        `Scenario '${scenarioName}': create keys
         Given nothing
         When I create the reflow keypair
         Then print my 'reflow public key'`
      ],
      
      schnorr: [
        `Scenario '${scenarioName}': create keys
         Given nothing
         When I create the schnorr keypair
         Then print my 'schnorr public key'`
      ]
    };

    const scenarioTests = /** @type {any} */ (tests)[type] || [];
    let success = false;
    
    for (const script of scenarioTests) {
      try {
        const result = await zencode_exec(script, {});
        if (result.result) {
          console.log(`✅ ${scenarioName}: OK`);
          /** @type {any} */ (this.capabilities)[type] = true;
          this.capabilities.available_scenarios.push(scenarioName);
          success = true;
          break; // Si uno funciona, marcamos como exitoso
        }
      } catch (error) {
        // Continuar probando otras variantes
      }
    }
    
    if (!success) {
      console.log(`❌ ${scenarioName}: No disponible`);
    }
  }

  /**
   * Obtiene información de la versión
   */
  async getVersionInfo() {
    try {
      const script = `
        Given nothing
        When I create the random object of '8' bytes
        Then print the 'random object' as 'hex'
      `;
      
      const result = await zencode_exec(script, {});
      
      if (result.logs) {
        const versionMatch = result.logs.match(/Release version: (v[\d.]+)/);
        if (versionMatch) {
          this.version = versionMatch[1];
          console.log(`📦 Versión Zenroom: ${this.version}`);
        }
      }
    } catch (error) {
      console.log('❌ No se pudo obtener versión');
    }
  }

  /**
   * Muestra reporte completo de capacidades
   */
  printCapabilitiesReport() {
    console.log('\n📋 REPORTE DE CAPACIDADES ZENROOM');
    console.log('=====================================');
    
    if (this.version) {
      console.log(`📦 Versión: ${this.version}`);
    }
    
    console.log('\n🔧 Operaciones Básicas:');
    console.log(`  • Hash/Random/JSON: ${this.capabilities.basic ? '✅' : '❌'}`);
    
    console.log('\n🔐 Escenarios Criptográficos:');
    console.log(`  • ECDH: ${this.capabilities.ecdh ? '✅' : '❌'}`);
    console.log(`  • EDDSA: ${this.capabilities.eddsa ? '✅' : '❌'}`);
    console.log(`  • BLS: ${this.capabilities.bls ? '✅' : '❌'}`);
    
    console.log('\n🔮 Zero Knowledge:');
    console.log(`  • Coconut: ${this.capabilities.coconut ? '✅' : '❌'}`);
    console.log(`  • BBS+: ${this.capabilities.bbs ? '✅' : '❌'}`);
    
    console.log('\n🎭 Escenarios Disponibles:');
    if (this.capabilities.available_scenarios.length > 0) {
      this.capabilities.available_scenarios.forEach(scenario => {
        console.log(`  • ${scenario}`);
      });
    } else {
      console.log('  • Ninguno detectado');
    }
    
    console.log('\n💡 Estado:');
    if (this.capabilities.coconut || this.capabilities.bbs) {
      console.log('  🎉 ¡ZK disponible! Puedes hacer verificación real');
    } else if (this.capabilities.ecdh || this.capabilities.eddsa) {
      console.log('  🔧 Criptografía básica disponible, ZK limitado');
    } else if (this.capabilities.basic) {
      console.log('  ⚠️ Solo operaciones básicas, usar modo demo para ZK');
    } else {
      console.log('  ❌ Zenroom no funcional');
    }
    
    console.log('\n=====================================\n');
  }

  /**
   * Test específico para flujo Coconut si está disponible
   */
  async testCoconutFlow() {
    if (!this.capabilities.coconut) {
      throw new Error('Coconut no disponible');
    }

    try {
      console.log('🥥 Probando flujo Coconut completo...');

      // Test 1: Crear issuer keypair
      const issuerScript = `
        Scenario 'coconut': create issuer keypair
        Given nothing
        When I create the issuer key
        Then print my 'issuer public key'
      `;

      const issuerResult = await zencode_exec(issuerScript, {});
      console.log('✅ Issuer keypair creado');

      // Test 2: Crear credential request
      const requestScript = `
        Scenario 'coconut': create credential request
        Given nothing
        When I create the credential request
        Then print my 'credential request'
      `;

      const requestResult = await zencode_exec(requestScript, {});
      console.log('✅ Credential request creado');

      return {
        success: true,
        message: 'Flujo Coconut funcional - verificación real posible',
        issuer: JSON.parse(issuerResult.result),
        request: JSON.parse(requestResult.result)
      };

    } catch (error) {
      console.error('❌ Error en flujo Coconut:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Flujo Coconut no funcional'
      };
    }
  }

  /**
   * Verifica si una extensión específica está disponible
   * @param {string} extension - Nombre de la extensión
   * @returns {boolean} true si está disponible
   */
  isAvailable(extension) {
    return /** @type {any} */ (this.capabilities)[extension] || false;
  }

  /**
   * Obtiene lista de extensiones disponibles
   * @returns {string[]} Array de extensiones disponibles
   */
  getAvailableExtensions() {
    return Object.keys(this.capabilities).filter(key => 
      key !== 'available_scenarios' && /** @type {any} */ (this.capabilities)[key] === true
    );
  }
}

export const zenroomCapabilities = new ZenroomCapabilities();

export async function checkZenroomCapabilities() {
  return await zenroomCapabilities.checkAllCapabilities();
}

export async function checkCoconutAvailability() {
  try {
    await zenroomCapabilities.checkScenarios();
    
    if (zenroomCapabilities.capabilities.coconut) {
      return await zenroomCapabilities.testCoconutFlow();
    } else {
      return {
        success: false,
        message: 'Extensión Coconut no encontrada',
        recommendation: 'Usar modo demo o buscar versión de Zenroom con Coconut'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Error verificando Coconut'
    };
  }
}