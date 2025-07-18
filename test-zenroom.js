// 🔍 SPECIFIC VERSION TEST FOR COCONUT AND BBS+
// To confirm if the new version works

import { zenroom_exec, zencode_exec } from 'zenroom';

console.log('🔍 ZENROOM VERSION TEST');
console.log('='.repeat(40));

// Check version
console.log('Node.js:', process.version);
console.log('Zenroom version: (checking...)');

// Specific test for advanced features
async function testAdvancedFeatures() {
    console.log('\n📋 TESTING ADVANCED FEATURES');
    console.log('-'.repeat(40));

    const tests = [
        // Coconut tests
        {
            name: 'Coconut - Issuer Keypair',
            script: `Scenario 'coconut': "Generate issuer keypair"
Given that I am known as 'issuer'
When I create my new issuer keypair
Then print all data`,
            critical: true
        },
        {
            name: 'Coconut - Credential Keypair', 
            script: `Scenario 'coconut': "Generate credential keypair"
Given that I am known as 'citizen'
When I create my new credential keypair
Then print all data`,
            critical: true
        },
        // BBS+ tests
        {
            name: 'BBS+ - Keypair',
            script: `Scenario 'bbs': "Generate BBS keypair"
Given nothing
When I create the bbs key
Then print my 'bbs public key'`,
            critical: true
        },
        {
            name: 'BLS - Basic key',
            script: `Given nothing
When I create the bls key
Then print my 'bls public key'`,
            critical: true
        },
        // Working alternatives
        {
            name: 'ECDH - Reference (should work)',
            script: `Scenario 'ecdh': "Generate ECDH keypair"
Given that I am known as 'alice'
When I create the ecdh key
Then print my 'keyring'`,
            critical: false
        },
        {
            name: 'Random - Reference (should work)',
            script: `Given nothing
When I create the random of '32' bytes
Then print the 'random' as 'hex'`,
            critical: false
        }
    ];

    const results = { critical: 0, total: 0, working: 0 };

    for (const test of tests) {
        console.log(`\n🧪 ${test.name}`);
        try {
            const result = await zencode_exec(test.script);
            
            if (result.result) {
                console.log(`✅ SUCCESS: ${test.name}`);
                results.working++;
                if (test.critical) results.critical++;
            } else {
                console.log(`❌ FAIL: ${test.name}`);
                console.log(`   Logs: ${result.logs || 'No logs'}`);
            }
        } catch (error) {
            console.log(`❌ ERROR: ${test.name}`);
            console.log(`   Error: ${error.message}`);
        }
        
        results.total++;
    }

    return results;
}

// Memory and compatibility test
async function testCompatibility() {
    console.log('\n📋 COMPATIBILITY TEST');
    console.log('-'.repeat(40));

    const memBefore = process.memoryUsage();
    console.log('Memory before:', memBefore.heapUsed);

    try {
        // Simple test that should work
        const result = await zencode_exec(`Given nothing
When I create the random of '16' bytes
Then print the 'random' as 'hex'`);
        
        const memAfter = process.memoryUsage();
        console.log('Memory after:', memAfter.heapUsed);
        console.log('Memory diff:', memAfter.heapUsed - memBefore.heapUsed);
        
        if (result.result) {
            console.log('✅ Basic compatibility: OK');
            return true;
        } else {
            console.log('❌ Basic compatibility: FAIL');
            return false;
        }
    } catch (error) {
        console.log('❌ Compatibility error:', error.message);
        return false;
    }
}

// Run tests
async function runVersionTest() {
    console.log('🚀 Starting version test...\n');
    
    const compatible = await testCompatibility();
    if (!compatible) {
        console.log('\n💥 FATAL: Basic compatibility failed');
        console.log('🔧 Try different version or clean install');
        return;
    }
    
    const results = await testAdvancedFeatures();
    
    console.log('\n🎯 FINAL RESULTS');
    console.log('='.repeat(40));
    console.log(`Working tests: ${results.working}/${results.total}`);
    console.log(`Critical features: ${results.critical}/4`);
    
    if (results.critical >= 2) {
        console.log('\n🎉 SUCCESS: Zenroom has advanced crypto features!');
        console.log('✅ You can use Coconut and/or BBS+');
        console.log('📝 Use the syntax that showed SUCCESS above');
    } else if (results.critical >= 1) {
        console.log('\n🟡 PARTIAL: Some advanced features work');
        console.log('🔧 Use only the features that work');
        console.log('📝 Consider reporting partial functionality');
    } else {
        console.log('\n❌ FAIL: No advanced crypto features');
        console.log('🔧 RECOMMENDATIONS:');
        console.log('   1. Try zenroom@5.18.0 or @latest');
        console.log('   2. Use APIRoom.net for development');
        console.log('   3. Use alternative libraries:');
        console.log('      - @mattrglobal/bbs-signatures');
        console.log('      - @stablelib/bls12-381');
        console.log('   4. Use Zenroom CLI instead of npm');
    }
    
    console.log('\n📋 NEXT STEPS:');
    if (results.critical === 0) {
        console.log('🔧 The npm package appears to be incomplete');
        console.log('🌐 Try APIRoom.net to confirm Zenroom works');
        console.log('📦 Consider using dedicated BBS+/Coconut libraries');
    } else {
        console.log('🎯 Build your app with the working features');
        console.log('📚 Check Zenroom documentation for more examples');
    }
}

runVersionTest().catch(console.error);

//  VERSIONING NOTES:
/*
 ZENROOM VERSIONS:
- 5.10.0: Basic crypto, no advanced features
- 5.15.0: More stable, might have more features
- 5.18.0: Recent stable, best chance for full features
- 5.19.2: Latest, might have bugs but most features

 EXPECTED RESULTS:
- If 0 critical features: npm package incomplete
- If 1-2 critical features: partial implementation
- If 3-4 critical features: full implementation

*/