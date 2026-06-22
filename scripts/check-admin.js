/**
 * Script para verificar estado do admin de teste no Firebase
 * Uso: node check-admin.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TEST_CNPJ = '12345678900';

async function checkAdmin() {
  try {
    console.log('\n🔍 Verificando status do admin de teste...\n');

    // Verificar variáveis de ambiente
    console.log('📋 Configuração Firebase:');
    console.log(`   Projeto: ${firebaseConfig.projectId}`);
    console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);

    // Procurar admin no Firestore
    console.log(`\n🔎 Procurando CNPJ: ${TEST_CNPJ}`);
    const q = query(
      collection(db, 'admin_users'),
      where('cnpj', '==', TEST_CNPJ)
    );
    const snap = await getDocs(q);

    if (snap.docs.length === 0) {
      console.log('\n❌ CNPJ não encontrado na collection admin_users!');
      console.log('\n💡 Para criar um admin de teste, execute:');
      console.log('   npm run setup-admin');
      console.log('\nOu manualmente no Firestore, crie um documento em admin_users com:');
      console.log(`   {
     cnpj: "${TEST_CNPJ}",
     email: "admin@ecocidade.test",
     name: "Admin Teste",
     uid: "<uid do usuário Firebase>",
     status: "active"
   }`);
    } else {
      console.log('\n✅ Admin encontrado!\n');
      const adminData = snap.docs[0].data();
      console.log('📊 Dados do Admin:');
      console.log(`   CNPJ: ${adminData.cnpj}`);
      console.log(`   Email: ${adminData.email}`);
      console.log(`   Nome: ${adminData.name || '(não definido)'}`);
      console.log(`   UID: ${adminData.uid || '(não vinculado)'}`);
      console.log(`   Status: ${adminData.status || 'N/A'}`);
      console.log(`   Role: ${adminData.role || 'N/A'}`);

      if (!adminData.uid) {
        console.log('\n⚠️  Aviso: O admin não tem UID vinculado!');
        console.log('   Execute "npm run setup-admin" para completar a configuração.');
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Erro ao verificar admin:');
    console.error(`   ${error.code || 'ERRO'}: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verifique se o .env está preenchido');
    console.log('   2. Verifique se tem acesso ao Firebase');
    console.log('   3. Verifique se a collection admin_users existe');
    process.exit(1);
  }
}

checkAdmin().then(() => {
  process.exit(0);
});
