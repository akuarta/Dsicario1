import React from 'react';
import { 
  Modal, 
  SafeAreaView, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  Platform 
} from 'react-native';
import { CameraView } from 'expo-camera';
import { FontAwesome5 } from '@expo/vector-icons';

const ScannerModal = ({ 
  visible, 
  onClose, 
  onScan, 
  scanned, 
  isProcessing, 
  colors 
}) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.scannerContainer}>
        <View style={styles.scannerHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeScannerBtn}>
            <FontAwesome5 name="times" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>ESCANEAR PARA CONFIRMAR</Text>
        </View>
        
        <CameraView
          onBarcodeScanned={scanned ? undefined : onScan}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.scannerOverlay}>
          <View style={[styles.scannerFrame, { borderColor: colors?.primary || '#00E676' }]} />
          <Text style={styles.scannerHint}>Enfoca el código QR del repartidor</Text>
        </View>
        
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={colors?.primary || '#00E676'} />
            <Text style={styles.processingText}>Confirmando entrega...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerHeader: { 
    position: 'absolute', 
    top: 40, 
    left: 0, 
    right: 0, 
    zIndex: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },
  closeScannerBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  scannerTitle: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 20,
    ...Platform.select({
      web: {
        textShadow: '1px 1px 5px rgba(0,0,0,0.75)'
      },
      default: {
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 5
      }
    })
  },
  scannerOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 10 
  },
  scannerFrame: { 
    width: 250, 
    height: 250, 
    borderWidth: 4, 
    borderRadius: 30,
    backgroundColor: 'transparent'
  },
  scannerHint: { 
    color: '#FFF', 
    marginTop: 30, 
    fontSize: 14, 
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30
  },
  processingText: { color: '#FFF', marginTop: 20, fontSize: 18, fontWeight: 'bold' }
});

export default ScannerModal;
