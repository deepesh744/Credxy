#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔍 Backend Status Check...\n');

// Check if node_modules exists
console.log('📦 Dependencies Check:');
const nodeModulesExists = fs.existsSync('node_modules');
console.log(`${nodeModulesExists ? '✅' : '❌'} node_modules directory`);

if (nodeModulesExists) {
    // Check for specific problematic modules
    const modules = ['express', 'qs', 'cors', 'dotenv', 'stripe', 'zod'];
    modules.forEach(module => {
        const exists = fs.existsSync(`node_modules/${module}`);
        console.log(`${exists ? '✅' : '❌'} ${module}`);
    });
}

// Check package.json
console.log('\n📋 Package.json Check:');
if (fs.existsSync('package.json')) {
    const pkg = require('./package.json');
    console.log(`✅ package.json exists`);
    console.log(`Express version: ${pkg.dependencies?.express || 'Not found'}`);
    console.log(`QS module: ${pkg.dependencies?.qs || 'Not found'}`);
    
    // Check for problematic Express v5
    if (pkg.dependencies?.express?.includes('5.')) {
        console.log('⚠️  Express v5 detected - this version is unstable!');
        console.log('   Recommendation: Downgrade to Express v4.18.2');
    }
} else {
    console.log('❌ package.json missing');
}

// Check environment file
console.log('\n🔧 Environment Check:');
const envExists = fs.existsSync('.env');
console.log(`${envExists ? '✅' : '❌'} .env file`);

// Check key files
console.log('\n📁 Source Files Check:');
const files = ['server.ts', 'api/payments.ts', 'lib/supabase.ts'];
files.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n🚀 Quick Fix Commands:');
console.log('If any issues found:');
console.log('1. rm -rf node_modules package-lock.json');
console.log('2. npm install express@^4.18.2 qs@^6.11.0');
console.log('3. npm install');
console.log('4. npm run dev');

console.log('\n💡 For environment setup:');
console.log('1. Copy .env.example to .env');
console.log('2. Fill in your Supabase and Stripe keys');
console.log('3. Run: npm run check-env');