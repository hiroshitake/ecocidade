import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from './db';

// ── Gerar protocolo único ──
function generateProtocol() {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `#ECO-${year}-${num}`;
}

// ── Criar denúncia urbana ──
export async function createReport(userId, { category, description, location, photoURL }) {
  const docData = {
    userId,
    category,
    description,
    location,
    protocol: generateProtocol(),
    status: 'Aguardando',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Só adiciona photoURL se existir, evita erro de tipo
  if (photoURL) docData.photoURL = photoURL;

  const ref = await addDoc(collection(db, 'reports'), docData);

  // Adiciona o primeiro evento no histórico
  await addDoc(collection(db, 'report_timeline'), {
    reportId: ref.id,
    event: 'Denúncia recebida',
    department: null,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

// ── Buscar denúncias do usuário logado ──
export async function getUserReports(userId) {
  const q = query(
    collection(db, 'reports'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const aCreated = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const bCreated = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return bCreated - aCreated;
    });
}

// ── Buscar todas as denúncias (para o mapa) ──
export async function getAllReports() {
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteReport(reportId) {
  await deleteDoc(doc(db, 'reports', reportId));
}

export async function updateReportStatus(reportId, newStatus) {
  await updateDoc(doc(db, 'reports', reportId), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}

export async function createDangerZone({ latitude, longitude, radius, name, description, severity }) {
  const docData = {
    latitude,
    longitude,
    radius,
    name,
    description,
    severity,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'danger_zones'), docData);
  return { id: ref.id, ...docData };
}

export async function getDangerZones() {
  const q = query(collection(db, 'danger_zones'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteDangerZone(zoneId) {
  await deleteDoc(doc(db, 'danger_zones', zoneId));
}

// ── Buscar denúncias por categoria ──
export async function getReportsByCategory(category) {
  const q = query(
    collection(db, 'reports'),
    where('category', '==', category)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const aCreated = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const bCreated = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return bCreated - aCreated;
    });
}

// ── Buscar histórico de uma denúncia ──
export async function getReportTimeline(reportId) {
  const q = query(
    collection(db, 'report_timeline'),
    where('reportId', '==', reportId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const aCreated = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const bCreated = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return bCreated - aCreated;
    });
}

// ── Criar denúncia de segurança (anônima, sem userId) ──
export async function createSecurityReport({ category, description, location, photoURL }) {
  const docData = {
    category,
    description,
    location,
    createdAt: serverTimestamp(),
  };

  // Só adiciona photoURL se existir, evita erro de tipo
  if (photoURL) docData.photoURL = photoURL;

  const ref = await addDoc(collection(db, 'security_reports'), docData);
  return ref.id;
}