import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api';

let currentUser = null;
let currentToken = null;

function getErrorMessage(payload, fallback) {
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
  if (Array.isArray(payload?.error) && payload.error.length > 0) return payload.error[0]?.message || fallback;
  if (payload?.error?.message) return payload.error.message;
  return fallback;
}

async function parseResponse(response) {
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}));
  }
  const text = await response.text().catch(() => '');
  return { error: text || 'Erro inesperado' };
}

function buildHeaders(includeAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (includeAuth && currentToken) headers.Authorization = `Bearer ${currentToken}`;
  return headers;
}

async function persistSession(token, user) {
  currentToken = token;
  currentUser = user;
  if (typeof window === 'undefined') return;
  await AsyncStorage.setItem('authToken', token);
  await AsyncStorage.setItem('authUser', JSON.stringify(user));
}

async function clearSession() {
  currentToken = null;
  currentUser = null;
  if (typeof window === 'undefined') return;
  await AsyncStorage.removeItem('authToken');
  await AsyncStorage.removeItem('authUser');
}

async function loadSession() {
  if (currentToken && currentUser) return { token: currentToken, user: currentUser };
  if (typeof window === 'undefined') return { token: null, user: null };
  const [token, user] = await Promise.all([
    AsyncStorage.getItem('authToken'),
    AsyncStorage.getItem('authUser'),
  ]);
  if (token) {
    currentToken = token;
    currentUser = user ? JSON.parse(user) : null;
    return { token, user: currentUser };
  }
  return { token: null, user: null };
}

export async function register(email, password, name, birthdate, city = '') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim();
  const body = {
    email: normalizedEmail,
    password,
    name: normalizedName,
    birthdate: birthdate || '',
    city: city || '',
  };
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: buildHeaders(false),
    body: JSON.stringify(body),
  });
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(getErrorMessage(data, 'Erro ao cadastrar usuário'));
  await persistSession(data.token, { id: data.id, email: data.email, name: data.name, role: data.role, birthdate, city });
  return data;
}

export async function login(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: buildHeaders(false),
    body: JSON.stringify({ email: normalizedEmail, password }),
  });
  const data = await parseResponse(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(data, 'Erro ao fazer login'));
  }
  await persistSession(data.token, { id: data.id, email: data.email, name: data.name, role: data.role });
  return data;
}

export async function loginWithGoogleToken() {
  throw new Error('Google login foi removido. Use o fluxo de cadastro/login com e-mail e senha.');
}

export async function logout() {
  await clearSession();
  return true;
}

export async function getCurrentUserData() {
  const session = await loadSession();
  if (!session.token) return null;
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'GET',
    headers: buildHeaders(true),
  });
  if (!response.ok) {
    await clearSession();
    return null;
  }
  const data = await response.json();
  currentUser = data;
  await AsyncStorage.setItem('authUser', JSON.stringify(data));
  return data;
}

export function onAuthStateChange(callback) {
  return {
    unsubscribe: () => {},
    __async: true,
  };
}

export function isAuthenticated() {
  return !!currentToken;
}

export async function getAdminRecordByCnpj(cnpj) {
  return null;
}

export async function signInAdmin(cnpj, password) {
  throw new Error('Admin login não está disponível sem o backend. Use o fluxo de autenticação do servidor.');
}

export async function isAdminUser(uid) {
  return false;
}

export async function updateUserProfile(userId, data) {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PATCH',
    headers: buildHeaders(true),
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Erro ao atualizar perfil');
  const sessionUser = { ...(currentUser || {}), ...(payload || {}), ...data };
  currentUser = sessionUser;
  await AsyncStorage.setItem('authUser', JSON.stringify(sessionUser));
  return payload;
}

export async function sendPasswordReset(email) {
  return true;
}
