/**
 * Script de exemplo para verificar o estado do admin usando o backend do PostgreSQL.
 * Uso: node check-admin.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('Este projeto agora usa o backend PostgreSQL para autenticação e administração.');
console.log('Configure o endpoint do backend em EXPO_PUBLIC_API_URL e use as rotas do servidor para validar o admin.');
process.exit(0);
