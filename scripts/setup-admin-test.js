/**
 * Script para configurar usuário admin de teste no Firebase
 * Uso: node setup-admin-test.js
 * 
 * Verifica se existe um admin com CNPJ "12345678900" e cria se necessário
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut 
} = require('firebase/auth');
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  Timestamp,
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
const auth = getAuth(app);
const db = getFirestore(app);

const TEST_CNPJ = '12345678900';
const TEST_EMAIL = 'admin@ecocidade.test';
const TEST_PASSWORD = '123456';
const TEST_ADMIN_NAME = 'Admin Teste';

async function setupAdminTest() {
  try {
    console.log('📋 Verificando configuração do admin de teste...\n');

    // 1. Verificar se admin já existe no Firestore
    console.log(`🔍 Procurando admin com CNPJ: ${TEST_CNPJ}`);
    const q = query(
      collection(db, 'admin_users'),
      where('cnpj', '==', TEST_CNPJ)
    );
    const snap = await getDocs(q);

    if (snap.docs.length > 0) {
      const adminData = snap.docs[0].data();
      console.log('✅ Admin já existe no Firestore:');
      console.log(`   - CNPJ: ${adminData.cnpj}`);
      console.log(`   - Email: ${adminData.email}`);
      console.log(`   - Nome: ${adminData.name || 'N/A'}`);
      console.log(`   - UID: ${adminData.uid || 'N/A'}`);
      
      // Se tem UID, significa que já está vinculado ao auth
      if (adminData.uid) {
        console.log('\n✅ Usuário já está configurado no Firebase Auth');
        console.log('\n📝 Credenciais de teste:');
        console.log(`   CNPJ: ${TEST_CNPJ}`);
        console.log(`   Email: ${TEST_EMAIL}`);
        console.log(`   Senha: ${TEST_PASSWORD}`);
        return;
      }
    }

    // 2. Se não existe, criar usuário no Firebase Auth
    console.log(`\n🔓 Criando usuário no Firebase Auth...`);
    let userUid;
    
    try {
      // Tenta criar novo usuário
      const userCredential = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      userUid = userCredential.user.uid;
      console.log(`✅ Usuário criado: ${TEST_EMAIL}`);
    } catch (authError) {
      if (authError.code === 'auth/email-already-in-use') {
        console.log(`⚠️  Email já existe no Auth, obtendo UID...`);
        // Email já existe, fazer login para pegar o UID
        try {
          const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
          userUid = userCredential.user.uid;
          console.log(`✅ Conectado com email existente: ${TEST_EMAIL}`);
        } catch (loginError) {
          console.error(`❌ Erro ao fazer login: ${loginError.message}`);
          console.log('\n💡 Dica: Verifique se a senha está correta ou reset a senha manualmente.');
          return;
        }
      } else {
        throw authError;
      }
    }

    // 3. Criar documento no Firestore
    console.log(`\n📝 Criando registro em admin_users...`);
    const adminDocRef = doc(collection(db, 'admin_users'));
    
    const adminData = {
      cnpj: TEST_CNPJ,
      email: TEST_EMAIL,
      name: TEST_ADMIN_NAME,
      uid: userUid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active',
      role: 'admin',
    };

    await setDoc(adminDocRef, adminData);
    console.log(`✅ Documento criado em admin_users`);

    // 4. Fazer logout do usuário temporário
    await signOut(auth);
    console.log(`\n✅ Logout realizado`);

    // 5. Exibir resumo
    console.log('\n' + '='.repeat(50));
    console.log('🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(50));
    console.log('\n📝 Credenciais de Teste Admin:');
    console.log(`   CNPJ: ${TEST_CNPJ}`);
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Senha: ${TEST_PASSWORD}`);
    console.log(`   UID: ${userUid}`);
    console.log('\n💡 Use estas credenciais para fazer login na área administrativa.');
    console.log('   Acesse: /admin-login');

  } catch (error) {
    console.error('\n❌ Erro ao configurar admin de teste:');
    console.error(`   ${error.code}: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verifique se o arquivo .env está preenchido corretamente');
    console.log('   2. Verifique se o projeto Firebase está acessível');
    console.log('   3. Verifique se a collection "admin_users" existe no Firestore');
    process.exit(1);
  }
}

setupAdminTest().then(() => {
  process.exit(0);
});
