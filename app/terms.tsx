import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/theme';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={C.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Termos de Uso</Text>
      </View>

      <Text style={styles.paragraph}>
        Bem-vindo ao Ecocidade. Estes Termos de Uso regem o acesso e uso do aplicativo Ecocidade,
        incluindo relatórios de problemas urbanos, visualização de áreas de risco e recursos de
        segurança. Ao utilizar o aplicativo, você concorda com estes termos.
      </Text>

      <Text style={styles.sectionTitle}>1. Uso do Aplicativo</Text>
      <Text style={styles.paragraph}>
        O Ecocidade é uma plataforma para registrar denúncias, acompanhar soluções e consultar
        informações de segurança urbana. Você deve utilizar o app de forma responsável e verdadeira.
      </Text>

      <Text style={styles.sectionTitle}>2. Cadastro e Conta</Text>
      <Text style={styles.paragraph}>
        Usuários devem fornecer informações verdadeiras ao criar uma conta. O uso não autorizado de
        contas de terceiros é proibido. O Ecocidade pode suspender ou encerrar contas que violem
        estes termos.
      </Text>

      <Text style={styles.sectionTitle}>3. Conteúdo e Atividades</Text>
      <Text style={styles.paragraph}>
        As denúncias enviadas devem refletir situações reais. É proibido publicar conteúdo falso,
        difamatório, ofensivo ou que viole direitos de terceiros. O app não se responsabiliza por
        conteúdo enviado por usuários.
      </Text>

      <Text style={styles.sectionTitle}>4. Responsabilidades</Text>
      <Text style={styles.paragraph}>
        O Ecocidade fornece informações e recursos de reporte, mas não substitui órgãos públicos.
        A responsabilidade pelo uso das informações e decisões baseadas no app é do usuário.
      </Text>

      <Text style={styles.sectionTitle}>5. Atualizações dos Termos</Text>
      <Text style={styles.paragraph}>
        Estes termos podem ser atualizados periodicamente. Recomendamos que você revise
        esta página com regularidade. O uso continuado do aplicativo após alterações significa
        aceitação das novas condições.
      </Text>

      <Text style={styles.sectionTitle}>6. Contato</Text>
      <Text style={styles.paragraph}>
        Em caso de dúvidas, entre em contato com o responsável pelo aplicativo. As informações de
        contato estão disponíveis na documentação do projeto ou junto à equipe de desenvolvimento.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 32,
    backgroundColor: C.bg,
    minHeight: '100%',
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    marginLeft: 6,
    color: C.primary,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: C.text3,
    lineHeight: 22,
  },
});
