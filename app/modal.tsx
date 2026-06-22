import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';

// Mock report data
const mockReports = {
  '1': { title: 'Poluição no Rio', category: 'Poluição', description: 'O rio está sendo poluído com lixo industrial.', status: 'Pendente', date: '2024-05-10', location: 'Rio Tietê' },
  '2': { title: 'Lixo na Praça', category: 'Lixo', description: 'Acúmulo de lixo na praça central.', status: 'Resolvido', date: '2024-05-08', location: 'Praça da Sé' },
  '3': { title: 'Ruído Excessivo', category: 'Ruído', description: 'Barulho constante de construção noturna.', status: 'Em Análise', date: '2024-05-05', location: 'Rua das Flores' },
};

export default function ModalScreen() {
  const { reportId } = useLocalSearchParams();
  const report = mockReports[reportId as keyof typeof mockReports];

  if (!report) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Denúncia não encontrada</ThemedText>
        <Link href="/reports" style={styles.link}>
          <ThemedText type="link">Voltar</ThemedText>
        </Link>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{report.title}</ThemedText>
      <ThemedView style={styles.details}>
        <ThemedText><ThemedText type="defaultSemiBold">Categoria:</ThemedText> {report.category}</ThemedText>
        <ThemedText><ThemedText type="defaultSemiBold">Status:</ThemedText> {report.status}</ThemedText>
        <ThemedText><ThemedText type="defaultSemiBold">Data:</ThemedText> {report.date}</ThemedText>
        <ThemedText><ThemedText type="defaultSemiBold">Localização:</ThemedText> {report.location}</ThemedText>
        <ThemedText><ThemedText type="defaultSemiBold">Descrição:</ThemedText> {report.description}</ThemedText>
      </ThemedView>
      <Link href="/reports" style={styles.link}>
        <ThemedText type="link">Fechar</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  details: {
    marginVertical: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
