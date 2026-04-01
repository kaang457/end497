import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function ResultScreen() {
  const { data, formData } = useLocalSearchParams();
  const router = useRouter();

  const parsedData = JSON.parse(data);
  const parsedForm = JSON.parse(formData);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#3b82f6" }}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>SKU: {parsedForm.sku}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.uLayout}>
        <Text style={{ color: "#fff" }}>Buraya U-Shape çizimi gelecek.</Text>
        {/* You will map your StationBox components here using View instead of div */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  topBar: {
    height: 60,
    backgroundColor: "#161b22",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    justifyContent: "space-between"
  },
  headerText: { color: "#fff", fontWeight: "bold" },
  uLayout: { padding: 50, alignItems: "center" }
});
