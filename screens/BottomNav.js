import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/theme";
import { TABS } from "../utils/tabs";

export default function BottomNav({ active, onChange }) {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        styles.container,
        theme.shadow,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          shadowOffset: { width: 0, height: -2 },
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.button}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconWrap,
                isActive && { backgroundColor: theme.surfaceAlt },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={24}
                color={isActive ? theme.primary : theme.textSecondary}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  iconWrap: {
    width: 48,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
