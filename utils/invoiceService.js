import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { CONFIG } from '../constants/Config';

const GAS_URL = CONFIG.GAS_API_URL;

/**
 * Servicio para generar y compartir facturas/tickets desde Google Apps Script
 */
export const generateInvoice = async (orderData, tipo = 'factura') => {
  try {
    console.log(`Generando ${tipo} para la orden: ${orderData.idorden || orderData.ordenId}...`);
    console.log('Payload completo enviado a Google:', JSON.stringify(orderData, null, 2));

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        ...orderData,
        tipo: tipo // 'ticket' o 'factura'
      }),
    });

    const result = await response.json();
    console.log('Respuesta del Servidor Google:', JSON.stringify(result, null, 2));

    if (!result.success) {
      const errorMsg = result.error || 'El servidor de Google devolvió success:false sin mensaje de error.';
      throw new Error(errorMsg);
    }

    const { pdfBase64, fileName } = result;

    if (Platform.OS === 'web') {
      // ✅ Soporte para Web: Abrir en pestaña nueva
      const linkSource = `data:application/pdf;base64,${pdfBase64}`;
      const downloadLink = document.createElement("a");
      downloadLink.href = linkSource;
      downloadLink.download = fileName;
      downloadLink.click();
      return true;
    }

    // ✅ Soporte para Mobile: Guardar y Compartir
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Abrir diálogo de compartir PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Descargar ${tipo}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Error', 'La función de compartir no está disponible en este dispositivo.');
    }

    return true;

  } catch (error) {
    console.error('Error al generar la factura:', error);
    Alert.alert('Error de Facturación', 'No pudimos conectar con el servidor de facturas. Intente nuevamente.');
    return false;
  }
};

export default {
  generateInvoice
};
