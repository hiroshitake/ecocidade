import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C, S } from '../constants/theme';

interface ConfirmationModalProps {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  destructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  visible,
  onDismiss,
  onConfirm,
  destructive = false,
}) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.description}>{description}</Text>
          </View>
          <View style={[styles.footer, { borderTopColor: C.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onDismiss}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: destructive ? C.danger : C.primary },
              ]}
              onPress={() => {
                onConfirm();
                onDismiss();
              }}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: C.surface,
    borderRadius: S.radius.xl,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  description: {
    fontSize: 15,
    color: C.text2,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 8,
    borderRadius: S.radius.md,
  },
  cancelButton: {
    backgroundColor: C.surface2,
  },
  confirmButton: {
    backgroundColor: C.primary,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text3,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
  },
});