import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions
} from "react-native";
import { useRouter } from "expo-router";
import { getStyles } from "../styles/dynamicStyles";
import { colors } from "../styles/theme";
import { GlobalStore } from "../constants/store.js"; // Yolun doğruluğundan emin olun

export default function FormScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const styles = getStyles(width); // Dinamik stilleri enjekte et

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku: "78446",
    vardiya: "8",
    demand: "400"
  });

  const hesapla = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/plani-hesapla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const resData = await response.json();

      if (resData.status === "success") {
        // Backend'den gelen 'data' objesini (tüm stageleri) doğrudan store'a yaz
        GlobalStore.planData = resData.data;
        GlobalStore.formData = formData;
        router.push("/results");
      } else {
        Alert.alert(
          "Backend Hatası",
          resData.message || "Bilinmeyen bir hata oluştu."
        );
      }
    } catch (err) {
      Alert.alert(
        "Sistem Hatası",
        "Backende bağlanılamadı. IP adresinizi kontrol edin veya sunucunun çalıştığından emin olun."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.formScrollContainer}>
      <View style={styles.card}>
        <Text style={styles.title}>Üretim Planlama</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>SKU Seçimi</Text>
          <TextInput
            style={styles.input}
            value={formData.sku}
            onChangeText={(t) => setFormData({ ...formData, sku: t })}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vardiya (Saat)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={formData.vardiya}
            onChangeText={(t) => setFormData({ ...formData, vardiya: t })}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hedef Talep</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={formData.demand}
            onChangeText={(t) => setFormData({ ...formData, demand: t })}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={styles.mainBtn}
          onPress={hesapla}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.btnText}>HESAPLA</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
