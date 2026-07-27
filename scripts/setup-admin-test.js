/**
 * Script de exemplo para criar um admin de teste via backend PostgreSQL.
 * Uso: node setup-admin-test.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('Este projeto agora usa o backend PostgreSQL para autenticação e administração.');
console.log('Cadastre o usuário/admin pelo endpoint de autenticação do backend e defina a role como admin.');
process.exit(0);
