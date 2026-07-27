import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api';

function buildHeaders(includeAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  return headers;
}

async function getAuthToken() {
  return AsyncStorage.getItem('authToken');
}

async function authHeaders() {
  const token = await getAuthToken();
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

function normalizeReport(report) {
  if (!report) return null;
  return {
    ...report,
    id: report.id,
    category: report.category || report.title || 'outro',
    status: report.status || 'pending',
    createdAt: report.created_at || report.createdAt,
    updatedAt: report.updated_at || report.updatedAt,
    protocol: report.id?.slice(0, 8).toUpperCase() || '#ECO',
    location: report.location || {
      latitude: report.latitude,
      longitude: report.longitude,
      address: 'Localização registrada',
    },
  };
}

export async function createReport(userId, { category, description, location, photoPath }) {
  const payload = {
    title: category,
    description,
    latitude: location?.latitude,
    longitude: location?.longitude,
    category,
    severity: 'medium',
    image_url: null,
  };

  let response;

  if (photoPath) {
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));

    const filename = photoPath.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', { uri: photoPath, name: filename, type });

    const headers = await authHeaders();
    const headersObject = new Headers(headers);
    headersObject.delete('Content-Type');

    response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: headersObject,
      body: formData,
    });
  } else {
    response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Erro ao criar denúncia');
  return data.id;
}

export async function getUserReports(userId) {
  const response = await fetch(`${API_BASE_URL}/reports/my-reports`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data.error || 'Erro ao buscar denúncias');
  return (Array.isArray(data) ? data : []).map(normalizeReport).filter(Boolean);
}

export async function getAllReports() {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data.error || 'Erro ao buscar denúncias');
  return (Array.isArray(data) ? data : []).map(normalizeReport).filter(Boolean);
}

export async function deleteReport(reportId) {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Erro ao deletar denúncia');
  return true;
}

export async function updateReportStatus(reportId, newStatus) {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ status: newStatus }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Erro ao atualizar denúncia');
  return data;
}

export async function createDangerZone({ latitude, longitude, radius, name, description, severity }) {
  return { id: `${Date.now()}`, latitude, longitude, radius, name, description, severity };
}

export async function getDangerZones() {
  return [];
}

export async function deleteDangerZone(zoneId) {
  return true;
}

export async function getReportsByCategory(category) {
  const reports = await getAllReports();
  return reports.filter((report) => report.category === category);
}

export async function getReportTimeline(reportId) {
  return [];
}

export async function createSecurityReport({ category, description, location, photoURL }) {
  const normalizedCategory = ['pollution', 'waste', 'deforestation', 'water', 'energy', 'other'].includes(category)
    ? category
    : 'other';

  const payload = {
    title: 'Denúncia de segurança',
    description: `[${category || 'outro'}] ${description}`.trim(),
    latitude: typeof location?.latitude === 'number' ? location.latitude : -23.55052,
    longitude: typeof location?.longitude === 'number' ? location.longitude : -46.633308,
    category: normalizedCategory,
    severity: 'high',
  };

  const response = await fetch(`${API_BASE_URL}/reports/anonymous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Erro ao enviar denúncia anônima');
  return data.id;
}