import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../supabase";
import { styles } from "../../styles/screens/signupStyles";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup() {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "customer" } }, // correct place for metadata
      });
  
      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned from signup.");
  
      // Insert into profiles table
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: authData.user.id,
          role: "customer",
          email: email,
          full_name: email.split("@")[0] // Use email prefix as default name
        }
      ]);
  
      if (profileError) throw profileError;
  
      Alert.alert("Success", "Account created successfully!");
      router.push("/auth/login");
  
    } catch (error: any) {
      Alert.alert("Signup Error", error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        value={email}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry
        onChangeText={setPassword}
        value={password}
      />

      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/auth/login")}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}
