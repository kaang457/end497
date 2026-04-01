import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from "react-native";
import { useRouter } from "expo-router";

export default function FormScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku: "78446",
    vardiya: "8",
    demand: "400"
  });

  const hesapla = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://YOUR_LOCAL_IP:8000/api/plani-hesapla",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        }
      );
      const resData = await response.json();

      if (resData.status === "success") {
        // Navigate to result screen and pass the data
        router.push({
          pathname: "/result",
          params: {
            data: JSON.stringify(resData),
            formData: JSON.stringify(formData)
          }
        });
      } else {
        Alert.alert("Backend Hatası", resData.message);
      }
    } catch (err) {
      Alert.alert(
        "Sistem Hatası",
        "Backende bağlanılamadı. IP adresinizi kontrol edin."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>🏭 Üretim Planlama</Text>

        <Text style={styles.label}>SKU Seçimi:</Text>
        <TextInput
          style={styles.input}
          value={formData.sku}
          onChangeText={(t) => setFormData({ ...formData, sku: t })}
          placeholderTextColor="#8b949e"
        />

        <Text style={styles.label}>Vardiya (Saat):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.vardiya}
          onChangeText={(t) => setFormData({ ...formData, vardiya: t })}
        />

        <Text style={styles.label}>Hedef Talep:</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.demand}
          onChangeText={(t) => setFormData({ ...formData, demand: t })}
        />

        <TouchableOpacity
          style={styles.mainBtn}
          onPress={hesapla}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>HESAPLA</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0d1117"
  },
  card: {
    backgroundColor: "#161b22",
    padding: 30,
    borderRadius: 16,
    width: "90%",
    borderWidth: 1,
    borderColor: "#30363d"
  },
  title: {
    color: "#4CAF50",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25
  },
  label: { color: "#8b949e", marginBottom: 8, fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: "#0d1117",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWith: 1,
    borderColor: "#30363d",
    marginBottom: 20
  },
  mainBtn: {
    backgroundColor: "#238636",
    padding: 15,
    borderRadius: 8,
    alignItems: "center"
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 }
});
