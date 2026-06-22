import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/theme';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={C.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Política de Privacidade</Text>
      </View>

      <Text style={styles.paragraph}>
        Esta Política de Privacidade descreve como o aplicativo Ecocidade coleta, usa e protege os
        dados dos usuários. Ao usar o app, você concorda com as práticas descritas aqui.
      </Text>

      <Text style={styles.sectionTitle}>1. Dados Coletados</Text>
      <Text style={styles.paragraph}>
        Coletamos informações de cadastro, como nome, e-mail, data de nascimento e cidade. Quando você
        submete uma denúncia, também podemos armazenar detalhes do relatório, localização e fotos.
      </Text>

      <Text style={styles.sectionTitle}>2. Uso dos Dados</Text>
      <Text style={styles.paragraph}>
        Os dados são usados para autenticação, melhora da experiência do usuário, processamento de
        denúncias e comunicação de status. Também podemos usar informações para analisar o uso do app.
      </Text>

      <Text style={styles.sectionTitle}>3. Compartilhamento</Text>
      <Text style={styles.paragraph}>
        Não compartilhamos seus dados com terceiros para fins comerciais. Informações podem ser
        compartilhadas com órgãos públicos quando necessário para atender a denúncias ou obrigações
        legais.
      </Text>

      <Text style={styles.sectionTitle}>4. Segurança</Text>
      <Text style={styles.paragraph}>
        Utilizamos práticas padrão do setor para proteger dados em trânsito e armazenados. No entanto,
        nenhuma transmissão de dados é completamente segura, então não garantimos proteção absoluta.
      </Text>

      <Text style={styles.sectionTitle}>5. Seus Direitos</Text>
      <Text style={styles.paragraph}>
        Você pode solicitar acesso, correção ou exclusão de seus dados. Para isso, entre em contato com
        o responsável pelo aplicativo ou pela equipe de suporte.
      </Text>

      <Text style={styles.sectionTitle}>6. Alterações</Text>
      <Text style={styles.paragraph}>
        Esta política pode ser atualizada a qualquer momento. Avisaremos sobre mudanças significativas
        e mostramos a versão mais recente nesta página.
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
