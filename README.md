# Demo de Identidad Digital ZK - Zenroom + SvelteKit - Are you a kid?

Una demostración completa de aplicación de identidad digital que preserva la privacidad usando **Zero Knowledge Proofs** con Zenroom y SvelteKit.

![Demo Screenshot](https://img.shields.io/badge/Demo-Live-green)

## 🌟 ¿Qué es Zenroom?

**Zenroom** es una máquina virtual criptográfica ultra-compacta (<2MB) diseñada para ejecutar operaciones criptográficas avanzadas de manera segura y determinista. Desarrollada por [Dyne.org](https://dyne.org), Zenroom ejecuta **Zencode** - un lenguaje de dominio específico (DSL) legible como inglés natural para operaciones criptográficas.

### Características principales de Zenroom:

- **🔒 Seguridad total**: Máquina virtual aislada sin acceso a I/O del sistema
- **🎯 Determinismo**: Mismas entradas producen siempre mismas salidas
- **📱 Multiplataforma**: Funciona en browsers, móviles, servidores, IoT
- **🔐 Protocolos avanzados**: Soporte nativo para Coconut, BBS+, Longfellow-ZK
- **⚡ Ultra-compacto**: Menos de 2MB, perfecto para aplicaciones embebidas
- **🌐 Sin dependencias**: No requiere librerías externas

### Protocolos Zero Knowledge soportados:

- **Coconut**: Threshold issuance y selective disclosure credentials
- **BBS+**: Signatures con selective disclosure optimizado para W3C Verifiable Credentials
- **Longfellow-ZK**: Compatibilidad con documentos oficiales (ISO 18013.5.1 mDL)
- **Range Proofs**: Verificación de rangos sin revelar valores exactos
- **Membership Proofs**: Demostrar pertenencia a grupos sin revelar identidad

## 🎯 ¿Qué hace esta aplicación demo?

Esta demo demuestra cómo crear una **aplicación de identidad digital que preserva la privacidad** usando Zero Knowledge Proofs. Permite:

### Funcionalidades principales:

#### 🆔 Gestión de Identidad Digital
- **Crear identidades criptográficas** con múltiples keypairs (Coconut, BLS, ECDSA)
- **Calcular automáticamente la edad** y estado de mayoría de edad
- **Exportar/importar identidades** de forma segura
- **Sistema de backup** con claves públicas/privadas separadas

#### 🔐 Generación de Pruebas Zero Knowledge
- **Pruebas de edad**: Verificar mayoría de edad sin revelar fecha exacta de nacimiento
- **Range proofs**: Demostrar edad en rango (ej: 18-65 años) sin revelar edad exacta
- **Selective disclosure**: Revelar solo atributos específicos (nacionalidad, verificación)
- **Membership proofs**: Demostrar pertenencia a grupos sin revelar identidad

#### 🔍 Verificación Sin Revelar Datos
- **Verificación Coconut**: Para threshold credentials
- **Verificación BBS+**: Para selective disclosure
- **Simulación blockchain**: Verificación on-chain con datos de transacción
- **Historial de verificaciones** con estadísticas

#### ⛓️ Integración Blockchain
- **Preparación para smart contracts** de verificación
- **Simulación de transacciones** on-chain
- **Interfaz Web3** preparada para MetaMask
- **Templates de contratos** Solidity para verificadores ZK

### Casos de uso demostrados:

1. **🔞 Verificación de edad para contenido adulto** - Sin revelar fecha de nacimiento
2. **🎫 Acceso a eventos** - Verificar elegibilidad sin exponer datos personales
3. **🏦 KYC preservando privacidad** - Cumplir regulaciones sin comprometer privacidad
4. **🗳️ Votación anónima** - Verificar elegibilidad manteniendo anonimato
5. **🎓 Credenciales educativas** - Demostrar calificaciones sin revelar notas exactas

## 🚀 Instalación y Configuración

### Prerrequisitos

```bash
Node.js >= 18.0.0
npm >= 8.0.0
```

### Instalación

```bash
# Clonar repositorio

cd zk-identity-demo

# Instalar dependencias
npm install

# Instalar Zenroom
npm install zenroom

# Desarrollo
npm run dev

# Producción
npm run build
npm run preview
```

### Estructura del proyecto

```
src/
├── routes/
│   └── +page.svelte              # Página principal de la demo
├── lib/
│   ├── components/
│   │   └── crypto/
│   │       ├── IdentityManager.svelte    # Gestor de identidades
│   │       ├── ProofGenerator.svelte     # Generador de pruebas ZK
│   │       └── ProofVerifier.svelte      # Verificador de pruebas
│   └── crypto/
│       ├── zenroom/
│       │   ├── identity.js       # Manejo de identidades digitales
│       │   ├── proofs.js         # Operaciones de pruebas ZK
│       │   └── contracts.js      # Contratos Zencode reutilizables
│       └── stores/
│           ├── identity.js       # Store de identidad (Svelte)
│           └── session.js        # Store de sesión criptográfica
└── app.html
```

## 📝 Guía de uso paso a paso

### 1. 🆔 Crear tu Identidad Digital

1. **Abrir la aplicación** en `http://localhost:5173`
2. **Completar el formulario** de identidad:
   - Nombre completo
   - Fecha de nacimiento
   - Nacionalidad
3. **Hacer clic en "Crear Identidad"**
4. **¡Listo!** Tu identidad criptográfica se genera automáticamente

#### ¿Qué sucede internamente?
- Se generan 3 keypairs criptográficos (Coconut, BLS, ECDSA)
- Se calcula tu edad automáticamente
- Se determina si eres mayor de edad (≥18 años)
- Todo se guarda de forma segura en localStorage

### 2. 🔐 Generar Pruebas Zero Knowledge

1. **Navegar a "Generar Prueba"**
2. **Seleccionar tipo de prueba**:
   - **Age Over 18**: Demuestra que eres mayor de edad
   - **Age Range**: Demuestra edad en rango específico
   - **Selective Disclosure**: Revela solo atributos específicos
3. **Configurar parámetros** (umbral de edad, atributos a revelar)
4. **Generar prueba** - ¡Sin revelar datos personales!

#### Ejemplo de prueba de edad:
```json
{
  "type": "age_verification",
  "protocol": "coconut",
  "public": {
    "predicateType": "age_over",
    "threshold": 18,
    "protocol": "coconut"
  }
  // La prueba matemática no revela tu edad exacta
}
```

### 3. 🔍 Verificar Pruebas

1. **Navegar a "Verificar"**
2. **Seleccionar método de verificación**:
   - **Coconut**: Para threshold credentials
   - **BBS+**: Para selective disclosure
   - **Blockchain**: Verificación on-chain simulada
3. **Pegar la prueba ZK** (o usar el ejemplo incluido)
4. **Configurar umbral** de edad (default: 18 años)
5. **Verificar** - ¡Obtén resultado sin acceder a datos personales!

#### Resultado de verificación:
```
✅ Verificación Exitosa
✓ Mayor de 18 años - SIN revelar edad exacta
📅 Verificado el: 2025-01-18 10:30:15
🔐 Protocolo: COCONUT
```

### 4. ⛓️ Simulación Blockchain

1. **Navegar a "Blockchain"**
2. **Explorar integración Web3**:
   - Templates de smart contracts
   - Simulación de verificación on-chain
   - Estadísticas de gas y transacciones

### 5. 📊 Monitorear Estadísticas

La aplicación rastrea automáticamente:
- **Identidades creadas**: Contador de identidades generadas
- **Pruebas generadas**: Número de ZK proofs creados
- **Verificaciones**: Exitosas y fallidas
- **Historial completo**: Todas las operaciones registradas

## 🎯 Cómo adaptar para producción

### ⚠️ Esta es una DEMO educativa

La aplicación actual incluye **datos simulados y claves hardcodeadas** para facilitar las pruebas. Para uso en producción, necesitas implementar:

### 🔐 1. Emisores de Credenciales Reales

**Estado actual (DEMO):**
```javascript
// Claves públicas hardcodeadas para demo
const DEFAULT_ISSUER_KEYS = {
  coconut: "BBA6KpjwgGHEr4Q8u5hWk6k2q5K1KxWyAZrAKEHkV4JVFLvqKmNwV8bJdNcPVtjHU4JQX1DdRwK6W8VNvMJGKQ8UX"
};
```

**Producción requerida:**
```javascript
// Integración con emisores reales
const PRODUCTION_ISSUERS = {
  government: {
    endpoint: "https://id.gov.es/api/credentials",
    publicKey: "REAL_GOVERNMENT_PUBLIC_KEY",
    certificateChain: ["cert1", "cert2", "root"]
  },
  university: {
    endpoint: "https://uni.edu/credentials",
    publicKey: "REAL_UNIVERSITY_PUBLIC_KEY"
  }
};
```

### 🏛️ 2. Autoridades de Certificación

**Implementar:**
- **PKI completa** con certificados X.509
- **Validación de cadenas** de certificados
- **Verificación de revocación** (CRL/OCSP)
- **Rotación de claves** automática

### 🔗 3. Integración Blockchain Real

**Estado actual (DEMO):**
```javascript
// Simulación de verificación on-chain
async function verifyOnBlockchain(proof) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { success: "true", transaction_hash: "0x" + Math.random().toString(16) };
}
```

**Producción requerida:**
```javascript
// Conexión real a smart contracts
import { ethers } from 'ethers';

async function verifyOnBlockchain(proof) {
  const contract = new ethers.Contract(VERIFIER_ADDRESS, ABI, provider);
  const tx = await contract.verifyProof(
    proof.pi_v.c,
    proof.pi_v.rr,
    proof.sigma_prime.h_prime,
    { gasLimit: 500000 }
  );
  return await tx.wait();
}
```

### 🗄️ 4. Base de Datos y Persistencia

**Implementar:**
- **Base de datos criptográfica** (PostgreSQL con extensiones crypto)
- **Esquemas de nullifiers** para prevenir double-spending
- **Índices de verificación** optimizados
- **Backup y recuperación** de datos críticos

### 🛡️ 5. Seguridad Avanzada

**Medidas requeridas:**
- **HSMs** (Hardware Security Modules) para claves críticas
- **Encriptación en tránsito** (TLS 1.3+)
- **Encriptación en reposo** (AES-256)
- **Auditoría completa** de todas las operaciones
- **Rate limiting** y protección DDoS
- **Penetration testing** regular

### 📋 6. Compliance y Regulaciones

**Cumplir con:**
- **GDPR** - Derecho al olvido, minimización de datos
- **eIDAS 2.0** - Regulación europea de identidad digital
- **CCPA** - Regulaciones de privacidad de California
- **SOC 2 Type II** - Controles de seguridad
- **ISO 27001** - Gestión de seguridad de la información

### 🚀 7. Infraestructura de Producción

**Implementar:**
- **Kubernetes** para orquestación
- **Load balancers** con SSL termination
- **CDN global** para baja latencia
- **Monitoring y alertas** (Prometheus + Grafana)
- **Logging centralizado** (ELK Stack)
- **CI/CD pipeline** con tests de seguridad

### 💼 8. APIs y Integraciones

**Desarrollar:**
```javascript
// API REST para verificaciones
POST /api/v1/verify
{
  "proof": "...",
  "predicate": "age_over_18",
  "issuer": "government_id"
}

// Webhook para notificaciones
POST /webhooks/verification-complete
{
  "verification_id": "uuid",
  "result": "success",
  "timestamp": "2025-01-18T10:30:15Z"
}
```

## 🧪 Testing y Desarrollo

### Ejecutar tests

```bash
# Tests unitarios
npm run test

# Tests de integración
npm run test:integration

# Tests de criptografía
npm run test:crypto

# Coverage
npm run test:coverage
```

### Debugging

```bash
# Modo debug con logs detallados
DEBUG=true npm run dev

# Validar contratos Zencode
npm run validate:contracts

# Benchmark de rendimiento
npm run benchmark
```

## 🤝 Contribuir

### Desarrollo

1. **Fork** del repositorio
2. **Crear branch**: `git checkout -b feature/nueva-funcionalidad`
3. **Commit**: `git commit -m 'Add: nueva funcionalidad ZK'`
4. **Push**: `git push origin feature/nueva-funcionalidad`
5. **Pull Request**

### Áreas de contribución

- 🔐 **Nuevos protocolos ZK**: Implementar PLONK, STARK, etc.
- 🌐 **Integraciones blockchain**: Soporte para Polygon, Arbitrum, etc.
- 🎨 **UI/UX mejorado**: Componentes más intuitivos
- 📱 **Mobile**: Aplicación móvil con React Native
- 🔧 **Tooling**: CLIs para desarrolladores
- 📚 **Documentación**: Guías y tutoriales

## 📚 Recursos adicionales

### Documentación técnica
- [Zenroom Documentation](https://zenroom.org)
- [Zencode Language Reference](https://dev.zenroom.org/zencode/)
- [Coconut Whitepaper](https://arxiv.org/abs/1802.07344)
- [BBS+ Signatures Spec](https://identity.foundation/bbs-signature/draft-bbs-signatures.html)



### Papers académicos
- [Coconut: Threshold Issuance Selective Disclosure Credentials](https://arxiv.org/abs/1802.07344)
- [Anonymous Credentials Light](https://eprint.iacr.org/2013/516.pdf)
- [Short Group Signatures](https://crypto.stanford.edu/~dabo/pubs/papers/groupsigs.pdf)


**🔐 Construido con ❤️ usando Zenroom + SvelteKit**

*Esta demo muestra el potencial de Zero Knowledge Proofs para preservar la privacidad en aplicaciones de identidad digital. ¡El futuro es privado por diseño!*