import { StyleSheet } from "react-native"

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  appName: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    fontWeight: "400",
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 28,
    fontWeight: "400",
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  loginButton: {
    borderRadius: 10,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  linksContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  link: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  linkAccent: {
    fontWeight: "600",
  },
  applyLink: {
    marginTop: 8,
  },
  linkAlt: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
})
